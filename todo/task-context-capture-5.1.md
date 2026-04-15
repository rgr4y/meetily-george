# Task 5.1: Activity Events Table + Model

status: pending
epic: task-context-capture-5.0.md
depends_on: none

## What

Create a table for storing activity events captured during recordings.

## Where

- `frontend/src-tauri/migrations/` — new migration
- `frontend/src-tauri/src/database/models.rs` — new model
- `frontend/src-tauri/src/database/repositories/` — new `activity.rs`

## Steps

1. **Migration** `frontend/src-tauri/migrations/YYYYMMDD000000_add_activity_events.sql`:
```sql
CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY,
    meeting_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,    -- 'window_focus', 'app_switch' (extensible for future types)
    app_name TEXT,               -- "Figma", "Slack", "Chrome", etc.
    window_title TEXT,           -- window title at time of capture
    data TEXT,                   -- JSON for extensible metadata
    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
);

CREATE INDEX IF NOT EXISTS idx_activity_events_meeting ON activity_events(meeting_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_timestamp ON activity_events(timestamp);
```

2. **Model** in `models.rs`:
```rust
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ActivityEvent {
    pub id: String,
    pub meeting_id: String,
    pub timestamp: String,
    pub event_type: String,
    pub app_name: Option<String>,
    pub window_title: Option<String>,
    pub data: Option<String>,
}
```

3. **Repository** `activity.rs`:
   - `insert(pool, event: &ActivityEvent)` — store single event
   - `get_for_meeting(pool, meeting_id: &str)` → `Vec<ActivityEvent>` — all events for a meeting
   - `summarize_for_meeting(pool, meeting_id: &str)` → `String` — generate a human-readable activity summary:
     - Group consecutive same-app events
     - Output like: "Focused on Figma (3 min), then Slack (1 min), then Chrome - 'JIRA Board' (5 min)"
     - This summary string gets injected into LLM prompts (task 5.3)

4. **Register** module in `database/mod.rs`.

## Done When

- Migration creates table with indexes
- Model and repository exist
- `summarize_for_meeting()` produces readable activity timeline
- `cargo check` passes
