//! Scan a recordings folder for meeting subfolders and import any that are
//! missing from the database.
//!
//! Triggered after the user changes their recordings folder, or manually via
//! the "Scan for recordings" button.

use crate::audio::meeting_io;
use crate::state::AppState;
use serde::Serialize;
use sqlx::SqlitePool;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Manager, Runtime};
use tracing::info;

static SCAN_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

// ---------------------------------------------------------------------------
// Result types (serializable for Tauri → frontend)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub total_folders_found: usize,
    pub imported: usize,
    pub already_existed: usize,
    pub skipped_errors: usize,
    pub imported_meetings: Vec<ImportedMeetingInfo>,
    pub errors: Vec<ScanError>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportedMeetingInfo {
    pub meeting_id: String,
    pub title: String,
    pub folder_path: String,
    pub has_transcripts: bool,
    pub has_audio: bool,
    pub segment_count: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanError {
    pub folder_name: String,
    pub reason: String,
}

// ---------------------------------------------------------------------------
// Core scan logic
// ---------------------------------------------------------------------------

/// Scan `recordings_dir` for meeting subfolders and import any that don't
/// already have a matching `folder_path` in the database.
pub async fn scan_and_import_recordings(
    pool: &SqlitePool,
    recordings_dir: &Path,
) -> Result<ScanResult, String> {
    if !recordings_dir.is_dir() {
        return Err(format!(
            "Recordings directory does not exist: {}",
            recordings_dir.display()
        ));
    }

    let entries = std::fs::read_dir(recordings_dir)
        .map_err(|e| format!("Failed to read directory {}: {}", recordings_dir.display(), e))?;

    let mut result = ScanResult {
        total_folders_found: 0,
        imported: 0,
        already_existed: 0,
        skipped_errors: 0,
        imported_meetings: Vec::new(),
        errors: Vec::new(),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue; // Skip files at the root level
        }

        // Skip hidden directories (e.g. .checkpoints at root)
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            if name.starts_with('.') {
                continue;
            }
        }

        result.total_folders_found += 1;

        let folder_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Canonicalize for consistent dedup
        let abs_path = match path.canonicalize() {
            Ok(p) => p,
            Err(e) => {
                result.skipped_errors += 1;
                result.errors.push(ScanError {
                    folder_name,
                    reason: format!("Failed to resolve path: {}", e),
                });
                continue;
            }
        };
        let abs_path_str = abs_path.to_string_lossy().to_string();

        // Check if already in DB
        match meeting_io::folder_exists_in_db(pool, &abs_path_str).await {
            Ok(true) => {
                result.already_existed += 1;
                continue;
            }
            Ok(false) => {} // Proceed to import
            Err(e) => {
                result.skipped_errors += 1;
                result.errors.push(ScanError {
                    folder_name,
                    reason: format!("DB check failed: {}", e),
                });
                continue;
            }
        }

        // Try to import this folder
        match import_meeting_folder(pool, &abs_path).await {
            Ok(meeting_info) => {
                result.imported += 1;
                result.imported_meetings.push(meeting_info);
            }
            Err(reason) => {
                result.skipped_errors += 1;
                result.errors.push(ScanError {
                    folder_name,
                    reason,
                });
            }
        }
    }

    info!(
        "Scan complete: {} found, {} imported, {} existed, {} errors",
        result.total_folders_found,
        result.imported,
        result.already_existed,
        result.skipped_errors,
    );

    Ok(result)
}

/// Import a single meeting folder into the database.
async fn import_meeting_folder(
    pool: &SqlitePool,
    folder: &Path,
) -> Result<ImportedMeetingInfo, String> {
    let folder_path_str = folder.to_string_lossy().to_string();

    // --- Parse metadata (optional) ---
    let metadata = meeting_io::parse_metadata_json(folder).ok();

    // --- Parse transcripts (optional) ---
    let segments = meeting_io::parse_transcripts_json(folder).unwrap_or_default();

    // --- Check we have *something* to import ---
    let has_audio = meeting_io::has_audio_file(folder);
    let has_transcripts = !segments.is_empty();

    if metadata.is_none() && !has_transcripts && !has_audio {
        return Err("No metadata, transcripts, or audio found".to_string());
    }

    // --- Determine title ---
    let title = metadata
        .as_ref()
        .and_then(|m| m.meeting_name.clone())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| meeting_io::title_from_folder_name(folder));

    // --- Determine created_at ---
    let created_at = meeting_io::resolve_created_at(
        metadata.as_ref().and_then(|m| m.created_at.as_deref()),
        folder,
    );

    // --- Insert into DB ---
    let meeting_id = meeting_io::create_meeting(
        pool,
        &title,
        &segments,
        Some(&folder_path_str),
        Some(created_at),
    )
    .await
    .map_err(|e| format!("DB insert failed: {}", e))?;

    Ok(ImportedMeetingInfo {
        meeting_id,
        title,
        folder_path: folder_path_str,
        has_transcripts,
        has_audio,
        segment_count: segments.len(),
    })
}

// ---------------------------------------------------------------------------
// Tauri command
// ---------------------------------------------------------------------------

/// Scan the current recordings folder for meetings not yet in the database.
#[tauri::command]
pub async fn scan_recordings_folder<R: Runtime>(
    app: AppHandle<R>,
) -> Result<ScanResult, String> {
    // Concurrency guard
    if SCAN_IN_PROGRESS
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err("A scan is already in progress".to_string());
    }

    let result = async {
        let state = app
            .try_state::<AppState>()
            .ok_or_else(|| "Database not initialized yet".to_string())?;
        let pool = state.db_manager.pool();

        let prefs =
            crate::audio::recording_preferences::load_recording_preferences(&app)
                .await
                .map_err(|e| format!("Failed to load recording preferences: {}", e))?;

        scan_and_import_recordings(pool, &prefs.save_folder).await
    }
    .await;

    SCAN_IN_PROGRESS.store(false, Ordering::SeqCst);
    result
}
