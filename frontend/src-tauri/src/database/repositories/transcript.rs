use crate::api::{TranscriptSearchResult, TranscriptSegment};
use sqlx::{Error as SqlxError, SqlitePool};
use tracing::info;

/// Serialize a Vec<String> to a JSON array string for storage.
fn vec_to_json(items: &[String]) -> String {
    serde_json::to_string(items).unwrap_or_else(|_| "[]".to_string())
}

pub struct TranscriptsRepository;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct StructuredSummaryRow {
    pub summary: Option<String>,
    pub key_points: Option<String>,
    pub action_items: Option<String>,
    pub decisions: Option<String>,
}

impl TranscriptsRepository {
    /// Saves a new meeting and its associated transcript segments.
    /// Delegates to the shared `meeting_io::create_meeting` implementation.
    pub async fn save_transcript(
        pool: &SqlitePool,
        meeting_title: &str,
        transcripts: &[TranscriptSegment],
        folder_path: Option<String>,
    ) -> Result<String, SqlxError> {
        crate::audio::meeting_io::create_meeting(
            pool,
            meeting_title,
            transcripts,
            folder_path.as_deref(),
            None, // use current time
        )
        .await
        .map_err(|e| SqlxError::Protocol(format!("{}", e)))
    }

    /// Searches for a query string within the transcripts.
    /// It returns a list of matching transcripts with context.
    pub async fn search_transcripts(
        pool: &SqlitePool,
        query: &str,
    ) -> Result<Vec<TranscriptSearchResult>, SqlxError> {
        if query.trim().is_empty() {
            return Ok(Vec::new());
        }

        let search_query = format!("%{}%", query.to_lowercase());

        let rows = sqlx::query_as::<_, (String, String, String, String)>(
            "SELECT m.id, m.title, t.transcript, t.timestamp
             FROM meetings m
             JOIN transcripts t ON m.id = t.meeting_id
             WHERE LOWER(t.transcript) LIKE ?",
        )
        .bind(&search_query)
        .fetch_all(pool)
        .await?;

        let results = rows
            .into_iter()
            .map(|(id, title, transcript, timestamp)| {
                let match_context = Self::get_match_context(&transcript, query);
                TranscriptSearchResult {
                    id,
                    title,
                    match_context,
                    timestamp,
                }
            })
            .collect();

        Ok(results)
    }

    /// Saves structured summary fields (key_points, action_items, decisions) for all
    /// transcripts belonging to a meeting.
    pub async fn save_structured_summary(
        pool: &SqlitePool,
        meeting_id: &str,
        summary: Option<&str>,
        key_points: &[String],
        action_items: &[String],
        decisions: &[String],
    ) -> Result<u64, SqlxError> {
        let key_points_json = vec_to_json(key_points);
        let action_items_json = vec_to_json(action_items);
        let decisions_json = vec_to_json(decisions);

        let result = sqlx::query(
            "UPDATE transcripts SET summary = ?, key_points = ?, action_items = ?, decisions = ? WHERE meeting_id = ?",
        )
        .bind(summary)
        .bind(&key_points_json)
        .bind(&action_items_json)
        .bind(&decisions_json)
        .bind(meeting_id)
        .execute(pool)
        .await?;

        let rows = result.rows_affected();
        info!(
            "Updated structured summary for meeting {} ({} transcript rows)",
            meeting_id, rows
        );
        Ok(rows)
    }

    /// Helper function to extract a snippet of text around the first match of a query.
    fn get_match_context(transcript: &str, query: &str) -> String {
        let transcript_lower = transcript.to_lowercase();
        let query_lower = query.to_lowercase();

        match transcript_lower.find(&query_lower) {
            Some(match_index) => {
                let start_index = match_index.saturating_sub(100);
                let end_index = (match_index + query.len() + 100).min(transcript.len());

                let mut context = String::new();
                if start_index > 0 {
                    context.push_str("...");
                }
                context.push_str(&transcript[start_index..end_index]);
                if end_index < transcript.len() {
                    context.push_str("...");
                }
                context
            }
            None => transcript.chars().take(200).collect(), // Fallback to the start of the transcript
        }
    }


    /// Retrieves structured summary fields from the latest transcript row for a meeting.
    pub async fn get_structured_summary(
        pool: &SqlitePool,
        meeting_id: &str,
    ) -> Result<Option<StructuredSummaryRow>, sqlx::Error> {
        sqlx::query_as::<_, StructuredSummaryRow>(
            r#"
            SELECT summary, key_points, action_items, decisions
            FROM transcripts
            WHERE meeting_id = ?
            ORDER BY COALESCE(audio_start_time, 0) DESC, timestamp DESC
            LIMIT 1
            "#,
        )
        .bind(meeting_id)
        .fetch_optional(pool)
        .await
    }
}
