# Task 1.3: Tauri Commands for Structured Summary Data

status: done
completed: 2026-04-15
epic: task-structured-summaries-1.0.md
depends_on: task-structured-summaries-1.2.md

## What

Wire structured summary data through Tauri commands so the frontend can fetch individual fields.

## Where

- `frontend/src-tauri/src/summary/commands.rs` — add/update commands
- `frontend/src-tauri/src/lib.rs` — register commands
- `frontend/src-tauri/src/summary/service.rs` — update `process_transcript_background` to store structured fields

## Steps

1. **Update `process_transcript_background`** in `service.rs` to use the `StructuredSummary` from task 1.1. After `generate_meeting_summary()` returns, save each field via the repository method from task 1.2.

2. **Add Tauri command** `api_get_structured_summary`:
```rust
#[tauri::command]
async fn api_get_structured_summary(
    meeting_id: String,
    pool: State<'_, SqlitePool>,
) -> Result<StructuredSummaryResponse, String>
```
Where `StructuredSummaryResponse` is:
```rust
#[derive(Serialize)]
struct StructuredSummaryResponse {
    summary: String,
    key_points: Vec<String>,
    action_items: Vec<String>,
    decisions: Vec<String>,
}
```
Parse the JSON strings from DB into vecs. Return empty vecs on parse failure.

3. **Register** the new command in `lib.rs` `.invoke_handler(tauri::generate_handler![...])`.

## Done When

- `api_get_structured_summary` command exists and is registered
- `process_transcript_background` stores structured fields in DB
- `cargo check` passes
