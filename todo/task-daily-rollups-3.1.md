# Task 3.1: Dailies Table + Migration + Model

status: pending
epic: task-daily-rollups-3.0.md
depends_on: none

## What

Create the `dailies` table for storing daily rollup summaries.

## Where

- `frontend/src-tauri/migrations/` — new migration
- `frontend/src-tauri/src/database/models.rs` — new model
- `frontend/src-tauri/src/database/repositories/` — new `daily.rs`

## George Reference

- `src/storage/schema.sql` — george's `dailies` table:
  ```sql
  CREATE TABLE IF NOT EXISTS dailies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,         -- YYYY-MM-DD
    summary TEXT NOT NULL,
    chunk_count INTEGER NOT NULL,
    total_duration_seconds INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
  );
  ```
  Note: george does NOT store `key_themes`, `action_items`, or `decisions` separately on dailies — the daily is markdown prose, not structured JSON. Meetily can add those columns but should understand the daily LLM prompt produces markdown, not JSON.

- `GeorgeApp/George/Services/SummarizeService.swift` → `generateDaily()` — calls `db.summaries(for: date)` and `db.stats(for: date)` (counts + total duration). The `get_meetings_for_date` query must return structured fields (key_points, action_items, decisions) along with summary text so they can be formatted into the session block.


CREATE TABLE IF NOT EXISTS dailies (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    summary TEXT NOT NULL,
    key_themes TEXT,          -- JSON array
    action_items TEXT,        -- JSON array (aggregated across meetings)
    decisions TEXT,           -- JSON array (aggregated across meetings)
    meeting_count INTEGER NOT NULL DEFAULT 0,
    total_duration_seconds REAL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

2. **Model** in `models.rs`:
```rust
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct DailyRollup {
    pub id: String,
    pub date: String,                    // YYYY-MM-DD
    pub summary: String,
    pub key_themes: Option<String>,      // JSON array
    pub action_items: Option<String>,    // JSON array
    pub decisions: Option<String>,       // JSON array
    pub meeting_count: i64,
    pub total_duration_seconds: f64,
    pub created_at: String,
    pub updated_at: String,
}
```

3. **Repository** `daily.rs`:
   - `upsert(pool, rollup)` — INSERT OR REPLACE by date
   - `get_by_date(pool, date: &str)` — fetch single daily
   - `list_recent(pool, limit: i64)` — fetch recent dailies ordered by date DESC
   - `get_meetings_for_date(pool, date: &str)` — fetch all meeting summaries for a given date (used by the rollup generator)

4. **Register module** in `database/mod.rs`.

## Done When

- Migration creates `dailies` table
- `DailyRollup` model exists
- Repository has upsert, get, list, and meeting-fetch methods
- `cargo check` passes
