# Task 1.2: DB Migration for Decisions + Repository Updates

status: pending
epic: task-structured-summaries-1.0.md
depends_on: task-structured-summaries-1.1.md

## What

Add `decisions` column to the transcripts table. Update repositories to read/write all structured fields.

## Where

- `frontend/src-tauri/migrations/` — new migration file
- `frontend/src-tauri/src/database/models.rs` — `Transcript` model
- `frontend/src-tauri/src/database/repositories/transcript.rs` — read/write queries
- `backend/app/db.py` — Python schema (keep in sync)

## George Reference

- `src/storage/schema.sql` — george's `summaries` table stores `key_points TEXT`, `action_items TEXT`, `decisions TEXT` as **JSON arrays** (not comma-separated strings). The column type is `TEXT` but the value is always a valid JSON array string like `["point 1", "point 2"]`.
- George separates `chunks` (transcript segments) and `summaries` (LLM output) into distinct tables. Meetily combines them in `transcripts`. When storing, serialize `Vec<String>` → `serde_json::to_string(&vec)` before writing to the TEXT column.

## Steps

1. **Create migration** `frontend/src-tauri/migrations/YYYYMMDD000000_add_decisions_field.sql`:
```sql
ALTER TABLE transcripts ADD COLUMN decisions TEXT;
```

2. **Update `Transcript` model** in `models.rs` — add:
```rust
pub decisions: Option<String>,  // JSON array string, e.g. '["decision 1"]'
```

3. **Serialization helper** — add to the summary processing path (or as a util):
```rust
fn vec_to_json(v: &[String]) -> String {
    serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string())
}
```
Use this when writing `key_points`, `action_items`, `decisions` to the DB. When reading back, parse with `serde_json::from_str::<Vec<String>>(&col).unwrap_or_default()`.

4. **Update `TranscriptRepository`** in `repositories/transcript.rs`:
   - Update INSERT/UPDATE queries that touch `summary`, `action_items`, `key_points` to also handle `decisions`
   - Add or update a method to save all structured fields together:
```rust
pub async fn save_structured_summary(
    pool: &SqlitePool,
    transcript_id: &str,
    summary: &str,
    key_points: &str,    // JSON array string
    action_items: &str,  // JSON array string
    decisions: &str,     // JSON array string
) -> Result<(), sqlx::Error>
```

5. **Update Python backend** `backend/app/db.py` — add `decisions TEXT` to the transcripts CREATE TABLE definition (for new installs) and handle the column in any affected queries.

## Done When

- Migration file exists and is valid SQL
- `Transcript` model has `decisions` field
- Values stored/retrieved as JSON array strings
- Repository can save and retrieve all four structured fields
- `cargo check` passes
- Python backend schema updated
