# Task 2.2: Search Repository + Tauri Command

status: pending
epic: task-fts-search-2.0.md
depends_on: task-fts-search-2.1.md

## What

Add a search repository that queries FTS5 and a Tauri command to expose it to the frontend.

## Where

- `frontend/src-tauri/src/database/repositories/` — new `search.rs`
- `frontend/src-tauri/src/database/mod.rs` — register module
- `frontend/src-tauri/src/lib.rs` — register Tauri command

## George Reference

- `src/storage/schema.sql` — george's `summaries_fts` and `chunks_fts` are separate, so searches can be scoped. Meetily's combined `transcripts_fts` means one MATCH query hits both transcript and summary text simultaneously — fine, just be aware of it.
- George's web UI (`src/`) uses a standard HTTP API for search — no direct FTS5 query details in Swift, but the pattern is the same: FTS5 MATCH + `snippet()` + JOIN back to source table.
- The `snippet()` function call: `snippet(transcripts_fts, column_index, '<mark>', '</mark>', '...', 32)` — column_index `-1` returns from any matched column. George doesn't use snippet highlighting in the current UI but it's the standard approach.



```rust
use sqlx::SqlitePool;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub meeting_id: String,
    pub meeting_title: String,
    pub snippet: String,       // FTS5 snippet() highlight
    pub match_field: String,   // which field matched: "transcript", "summary", etc.
    pub rank: f64,             // FTS5 rank score
    pub created_at: String,
}

pub struct SearchRepository;

impl SearchRepository {
    pub async fn search(
        pool: &SqlitePool,
        query: &str,
        limit: i64,
    ) -> Result<Vec<SearchResult>, sqlx::Error> {
        // Use FTS5 MATCH with snippet() for highlighted results
        // JOIN transcripts_fts with transcripts and meetings to get metadata
        // ORDER BY rank
        // LIMIT
    }
}
```

2. **FTS5 query** — use `transcripts_fts MATCH ?` with `snippet(transcripts_fts, -1, '<mark>', '</mark>', '...', 32)` for highlighted results. JOIN with `transcripts` on rowid, then JOIN `meetings` on `meeting_id` for title.

3. **Tauri command**:
```rust
#[tauri::command]
async fn api_search_meetings(
    query: String,
    limit: Option<i64>,
    pool: State<'_, SqlitePool>,
) -> Result<Vec<SearchResult>, String>
```
Default limit: 20. Sanitize query (strip special FTS5 operators if needed, or just pass through for power users).

4. **Register** in `lib.rs`.

## Done When

- `SearchRepository::search()` returns ranked, highlighted results
- Tauri command `api_search_meetings` is registered and callable
- `cargo check` passes
