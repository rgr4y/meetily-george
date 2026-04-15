# Task 3.2: Daily Rollup Generation Service + Tauri Commands

status: pending
epic: task-daily-rollups-3.0.md
depends_on: task-daily-rollups-3.1.md

## What

Build the daily rollup generator that collects all meeting summaries for a date, feeds them to an LLM, and stores the result. Expose via Tauri commands.

## Where

- `frontend/src-tauri/src/summary/` — new `daily_rollup.rs`
- `frontend/src-tauri/src/lib.rs` — register commands

## George Reference

- `GeorgeApp/George/Services/SummarizeService.swift` → `generateDaily(date:)` — the full implementation

George's session block format for the user prompt:
```
[SYSTEM @ 2025-01-15 14:30]
Summary text here.
Key points: ["point 1", "point 2"]
Action items: ["Person: task"]
Decisions: ["decision 1"]
---
[MIC @ 2025-01-15 15:45]
...
```
Where `[SYSTEM]` = remote audio (call/speakers) and `[MIC]` = local user's mic. This context helps the LLM understand who said what across sessions.

The daily prompt (`daily-rollup.system.txt`) produces **markdown output**, not JSON. Structure is embedded in the markdown itself (sections with headers). Don't try to JSON-parse the daily rollup response.

George uses a separate, dedicated (potentially different) LLM config for dailies — dailies are higher-value and can use a larger/smarter model. In practice, same provider, possibly different model. Store as `self.dailyInference` separate from chunk `self.inference`.



```rust
pub struct DailyRollupGenerator;

impl DailyRollupGenerator {
    pub async fn generate_for_date(
        pool: &SqlitePool,
        date: &str,  // YYYY-MM-DD
        // LLM config (provider, model, api_key, etc.) — read from settings repo
    ) -> Result<DailyRollup, String> {
        // 1. Fetch all meeting summaries for the date via DailyRepository::get_meetings_for_date()
        // 2. If no meetings, return error "No meetings found for {date}"
        // 3. Concatenate summaries with meeting titles as headers
        // 4. Build prompt:
        //    System: "You are a daily digest generator. Synthesize the following meeting summaries
        //             into a cohesive daily digest. Identify cross-meeting themes, aggregate action
        //             items, and note any conflicting decisions. Respond in JSON."
        //    User: concatenated summaries
        // 5. Call generate_summary() from llm_client.rs
        // 6. Parse structured response (reuse StructuredSummary parsing from Epic 1,
        //    but with key_themes instead of key_points)
        // 7. Upsert into dailies table
        // 8. Return the DailyRollup
    }
}
```

2. **Tauri commands**:
```rust
#[tauri::command]
async fn api_generate_daily_rollup(date: String, pool: State<'_, SqlitePool>) -> Result<DailyRollup, String>

#[tauri::command]
async fn api_get_daily_rollup(date: String, pool: State<'_, SqlitePool>) -> Result<Option<DailyRollup>, String>

#[tauri::command]
async fn api_list_daily_rollups(limit: Option<i64>, pool: State<'_, SqlitePool>) -> Result<Vec<DailyRollup>, String>
```

3. **Register** commands in `lib.rs`.

4. **Read LLM settings** from `SettingsRepository` to get provider/model/api_key — same pattern as existing summary commands.

## Done When

- `DailyRollupGenerator::generate_for_date()` works end-to-end
- Three Tauri commands registered and callable
- Uses existing LLM client (no new provider code needed)
- `cargo check` passes
