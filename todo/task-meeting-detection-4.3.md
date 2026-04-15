# Task 4.3: Auto-Start/Stop Recording Integration + Settings

status: pending
epic: task-meeting-detection-4.0.md
depends_on: task-meeting-detection-4.2.md

## What

Wire the meeting detector into the app lifecycle. When detection → Active, auto-start recording. When Active → Idle, auto-stop. Add settings toggle.

## Where

- `frontend/src-tauri/src/lib.rs` — initialize detector on app start
- `frontend/src-tauri/src/audio/recording_commands.rs` — reuse start/stop logic
- `frontend/src-tauri/src/database/models.rs` — add setting
- `frontend/src-tauri/migrations/` — settings migration

## Steps

1. **Settings migration** — add `auto_detect_meetings` boolean to settings:
```sql
ALTER TABLE settings ADD COLUMN auto_detect_meetings INTEGER DEFAULT 0;
```

2. **Update `Setting` model** in `models.rs`:
```rust
pub auto_detect_meetings: bool,
```

> **Phase 1: macOS only.** The detector is initialized on all platforms (it's pure Rust), but scorers are only registered on macOS. On Windows/Linux the detector starts, runs its loop, always gets score 0, and stays idle — no functional change from today. Do not add any platform-specific branches in `lib.rs` beyond what's already there; the `#[cfg]` guards on the scorer implementations handle it automatically.

3. **Initialize detector** in app startup (in `lib.rs` `setup` closure or wherever the app initializes):
   - Read `auto_detect_meetings` from settings
   - If enabled, create `MeetingDetector` with `AppScorer` + `CameraScorer`
   - Start the polling loop
   - Subscribe to `DetectionStateChange` events via channel

4. **Handle state changes**:
   - `Active` entered → call the same recording start logic used by `start_recording` command. Use default devices from settings. Set meeting name to "{Platform} Meeting - {timestamp}" if platform detected.
   - `Idle` entered (from Active/Departing) → call stop recording logic. Trigger transcription + summarization as normal.
   - Emit Tauri events so frontend knows:
     ```rust
     app.emit("meeting-detected", MeetingDetectedPayload { is_active: true, platform });
     app.emit("meeting-detected", MeetingDetectedPayload { is_active: false, platform: None });
     ```

5. **Don't auto-start if already recording** — check `is_recording()` before starting. User might have started manually.

6. **Don't auto-stop if user started manually** — track whether current recording was auto-started. Only auto-stop auto-started recordings.

## Done When

- Setting toggle exists in DB
- Detector starts on app launch when enabled
- Auto-starts recording on meeting detection
- Auto-stops when meeting ends
- Doesn't interfere with manual recordings
- Emits Tauri events for frontend
- Windows/Linux behavior unchanged from before this epic
- `cargo check` passes on all platforms
