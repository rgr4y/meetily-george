//! Shared meeting folder I/O and database helpers.
//!
//! Consolidates duplicated logic for:
//!   - Probing meeting folders for audio/metadata/transcripts
//!   - Creating meeting + transcript rows in SQLite
//!   - Checking whether a folder is already imported
//!
//! Used by: import.rs, retranscription.rs, scanner.rs, TranscriptsRepository

use crate::api::TranscriptSegment;
use crate::audio::constants::AUDIO_EXTENSIONS;
use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use tracing::{info, warn};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Metadata struct (loose, tolerant of missing fields)
// ---------------------------------------------------------------------------

/// Parsed contents of a meeting folder's `metadata.json`.
/// All fields are optional to tolerate partial/corrupt files.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct MeetingFolderMetadata {
    pub version: Option<String>,
    pub meeting_id: Option<String>,
    pub meeting_name: Option<String>,
    pub created_at: Option<String>,
    pub completed_at: Option<String>,
    pub duration_seconds: Option<f64>,
    pub audio_file: Option<String>,
    pub transcript_file: Option<String>,
    pub sample_rate: Option<u32>,
    pub status: Option<String>,
    pub source: Option<String>,
}

// ---------------------------------------------------------------------------
// Folder probing
// ---------------------------------------------------------------------------

/// Find an audio file inside a meeting folder.
///
/// Tries well-known names first (`audio.mp4`, `audio.m4a`, etc.), then falls
/// back to scanning for any file with a recognised audio extension.
pub fn find_audio_file(folder: &Path) -> Result<PathBuf> {
    let candidates = [
        "audio.mp4",
        "audio.m4a",
        "audio.wav",
        "audio.mp3",
        "audio.flac",
        "audio.ogg",
        "recording.mp4",
        "audio.mkv",
        "audio.webm",
        "audio.wma",
    ];

    for name in candidates {
        let path = folder.join(name);
        if path.exists() {
            return Ok(path);
        }
    }

    // Fallback: scan folder for any file with an audio extension
    if let Ok(entries) = std::fs::read_dir(folder) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext = ext.to_string_lossy().to_lowercase();
                    if AUDIO_EXTENSIONS.contains(&ext.as_str()) {
                        return Ok(path);
                    }
                }
            }
        }
    }

    Err(anyhow!("No audio file found in: {}", folder.display()))
}

/// Returns `true` if the folder contains a recognisable audio file.
pub fn has_audio_file(folder: &Path) -> bool {
    find_audio_file(folder).is_ok()
}

/// Parse `metadata.json` from a meeting folder.
pub fn parse_metadata_json(folder: &Path) -> Result<MeetingFolderMetadata> {
    let path = folder.join("metadata.json");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| anyhow!("Failed to read {}: {}", path.display(), e))?;

    // Use serde_json::Value first to be maximally tolerant
    let value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| anyhow!("Invalid JSON in {}: {}", path.display(), e))?;

    Ok(MeetingFolderMetadata {
        version: value.get("version").and_then(|v| v.as_str()).map(String::from),
        meeting_id: value.get("meeting_id").and_then(|v| v.as_str()).map(String::from),
        meeting_name: value
            .get("meeting_name")
            .and_then(|v| v.as_str())
            .map(String::from),
        created_at: value.get("created_at").and_then(|v| v.as_str()).map(String::from),
        completed_at: value
            .get("completed_at")
            .and_then(|v| v.as_str())
            .map(String::from),
        duration_seconds: value.get("duration_seconds").and_then(|v| v.as_f64()),
        audio_file: value.get("audio_file").and_then(|v| v.as_str()).map(String::from),
        transcript_file: value
            .get("transcript_file")
            .and_then(|v| v.as_str())
            .map(String::from),
        sample_rate: value.get("sample_rate").and_then(|v| v.as_u64()).map(|v| v as u32),
        status: value.get("status").and_then(|v| v.as_str()).map(String::from),
        source: value.get("source").and_then(|v| v.as_str()).map(String::from),
    })
}

/// Parse `transcripts.json` from a meeting folder into `TranscriptSegment`s
/// compatible with the database schema.
pub fn parse_transcripts_json(folder: &Path) -> Result<Vec<TranscriptSegment>> {
    let path = folder.join("transcripts.json");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| anyhow!("Failed to read {}: {}", path.display(), e))?;

    let value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| anyhow!("Invalid JSON in {}: {}", path.display(), e))?;

    let segments = value
        .get("segments")
        .and_then(|v| v.as_array())
        .ok_or_else(|| anyhow!("No 'segments' array in {}", path.display()))?;

    let mut result = Vec::with_capacity(segments.len());
    for seg in segments {
        let id = seg
            .get("id")
            .and_then(|v| v.as_str())
            .map(String::from)
            .unwrap_or_else(|| format!("transcript-{}", Uuid::new_v4()));

        let text = seg
            .get("text")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        if text.trim().is_empty() {
            continue; // Skip empty segments
        }

        let timestamp = seg
            .get("timestamp")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        let audio_start_time = seg.get("audio_start_time").and_then(|v| v.as_f64());
        let audio_end_time = seg.get("audio_end_time").and_then(|v| v.as_f64());
        let duration = seg.get("duration").and_then(|v| v.as_f64());

        result.push(TranscriptSegment {
            id,
            text,
            timestamp,
            audio_start_time,
            audio_end_time,
            duration,
        });
    }

    Ok(result)
}

/// Derive a human-readable title from a folder name.
/// Replaces underscores with spaces: `Team_Standup_2026-04-10_09-30` → `Team Standup 2026-04-10 09-30`.
pub fn title_from_folder_name(folder: &Path) -> String {
    folder
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Untitled Meeting")
        .replace('_', " ")
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

/// Create a meeting with transcripts in a single transaction.
///
/// This is the shared implementation used by audio import, transcript save,
/// and folder scanning.  If `segments` is empty a meeting row is still created
/// (audio-only import).
pub async fn create_meeting(
    pool: &SqlitePool,
    title: &str,
    segments: &[TranscriptSegment],
    folder_path: Option<&str>,
    created_at: Option<DateTime<Utc>>,
) -> Result<String> {
    let meeting_id = format!("meeting-{}", Uuid::new_v4());
    let now = created_at.unwrap_or_else(Utc::now);

    let mut conn = pool
        .acquire()
        .await
        .map_err(|e| anyhow!("DB error: {}", e))?;
    let mut tx = sqlx::Connection::begin(&mut *conn)
        .await
        .map_err(|e| anyhow!("Failed to start transaction: {}", e))?;

    // Insert meeting row
    sqlx::query(
        "INSERT INTO meetings (id, title, created_at, updated_at, folder_path)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&meeting_id)
    .bind(title)
    .bind(now)
    .bind(now)
    .bind(folder_path)
    .execute(&mut *tx)
    .await
    .map_err(|e| anyhow!("Failed to create meeting: {}", e))?;

    // Insert transcript rows
    for segment in segments {
        let transcript_id = if segment.id.starts_with("transcript-") {
            segment.id.clone()
        } else {
            format!("transcript-{}", Uuid::new_v4())
        };

        sqlx::query(
            "INSERT INTO transcripts (id, meeting_id, transcript, timestamp, audio_start_time, audio_end_time, duration)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&transcript_id)
        .bind(&meeting_id)
        .bind(&segment.text)
        .bind(&segment.timestamp)
        .bind(segment.audio_start_time)
        .bind(segment.audio_end_time)
        .bind(segment.duration)
        .execute(&mut *tx)
        .await
        .map_err(|e| anyhow!("Failed to insert transcript: {}", e))?;
    }

    tx.commit()
        .await
        .map_err(|e| anyhow!("Failed to commit transaction: {}", e))?;

    info!(
        "Created meeting '{}' ({}) with {} transcripts, folder: {:?}",
        title,
        meeting_id,
        segments.len(),
        folder_path,
    );

    Ok(meeting_id)
}

/// Check whether a meeting with the given `folder_path` already exists in the DB.
pub async fn folder_exists_in_db(pool: &SqlitePool, folder_path: &str) -> Result<bool> {
    let row: (i32,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM meetings WHERE folder_path = ?) AS e",
    )
    .bind(folder_path)
    .fetch_one(pool)
    .await
    .map_err(|e| anyhow!("DB query error: {}", e))?;

    Ok(row.0 != 0)
}

/// Parse `created_at` string (RFC3339 or similar) into a `DateTime<Utc>`.
/// Falls back to file modification time, then `Utc::now()`.
pub fn resolve_created_at(
    metadata_created_at: Option<&str>,
    folder: &Path,
) -> DateTime<Utc> {
    // Try parsing the metadata string
    if let Some(s) = metadata_created_at {
        if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
            return dt.with_timezone(&Utc);
        }
        // Try chrono's flexible parsing
        if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
            return DateTime::from_naive_utc_and_offset(dt, Utc);
        }
    }

    // Fallback: folder modification time
    if let Ok(meta) = std::fs::metadata(folder) {
        if let Ok(modified) = meta.modified() {
            return DateTime::from(modified);
        }
    }

    warn!(
        "Could not determine created_at for {}, using now",
        folder.display()
    );
    Utc::now()
}
