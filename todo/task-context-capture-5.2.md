# Task 5.2: Window Focus Monitor

status: pending
epic: task-context-capture-5.0.md
depends_on: task-context-capture-5.1.md

## What

Poll the active window every 5 seconds during recording. Store app name + window title as activity events.

## Where

- `frontend/src-tauri/src/` — new `context_capture/` module
- `frontend/src-tauri/src/context_capture/mod.rs`
- `frontend/src-tauri/src/context_capture/window_monitor.rs`

## George Reference

- `GeorgeApp/George/Monitors/WindowFocusMonitor.swift` — **event-driven, not polling**. Key implementation details:
  - Uses `NSWorkspace.didActivateApplicationNotification` (fires on app switch, not on a timer)
  - Records `appName`, `bundleID`, `windowTitle`, `displayID` (for multi-monitor)
  - Window title fetched via AX: `AXUIElementCreateApplication(pid)` → `kAXFocusedWindowAttribute` → `kAXTitleAttribute`. Falls back to `kAXWindowsAttribute[0]`.
  - Thread-safe: uses `NSLock` for a `_eventsSnapshot` mirror of the main-thread `events` array
  - History cap: 500 events
  - Also registers `NSApplication.didChangeScreenParametersNotification` to refresh display info on monitor connect/disconnect

## Steps

1. **Create module** `context_capture/`:
```
context_capture/
├── mod.rs
└── window_monitor.rs
```

2. **Window monitor** in `window_monitor.rs` — **event-driven, not poll-based** (matching george):

```rust
pub struct WindowFocusMonitor {
    meeting_id: String,
    pool: SqlitePool,
    is_running: Arc<AtomicBool>,
    last_app: Arc<Mutex<Option<String>>>,
    // On macOS: register for NSWorkspace notification via objc
}

impl WindowFocusMonitor {
    pub fn new(meeting_id: String, pool: SqlitePool) -> Self;
    pub fn start(&self) -> JoinHandle<()>;
    pub fn stop(&self);
}
```

3. **macOS implementation** — use `objc` crate to observe `NSWorkspace.didActivateApplicationNotification`:
   ```rust
   // NSWorkspace.sharedWorkspace().notificationCenter
   //   .addObserver(forName: NSWorkspace.didActivateApplicationNotification, ...)
   // On fire:
   //   app = userInfo[NSWorkspace.applicationUserInfoKey] as NSRunningApplication
   //   appName = app.localizedName()
   //   bundleID = app.bundleIdentifier()
   //   pid = app.processIdentifier()
   //   windowTitle = AXUIElementCreateApplication(pid) → kAXFocusedWindowAttribute → kAXTitle
   ```
   Window title requires Accessibility permission. Gracefully skip if `AXIsProcessTrusted()` returns false — just store app name without title.

4. **Deduplication** — only store a new event when `appName` changes from the previous event. George deduplicates in the summary generation step (skips consecutive same-app events), but deduplication at insert time reduces DB noise.

5. **Initial capture** — on `start()`, also capture the currently frontmost app (same as george's "capture initial frontmost app on start").

6. **Platform stubs** — `#[cfg(not(target_os = "macos"))]` produces a no-op monitor. Add TODO comments for Windows (`GetForegroundWindow` + `GetWindowText`) and Linux (`xdotool getactivewindow`).

7. **Integration** — in `recording_commands.rs` (or where `start_recording` lives): create `WindowFocusMonitor`, call `start()`, store the handle. On `stop_recording`, call `stop()`.

## Done When

- Monitor captures app switches on macOS via NSWorkspace notification (event-driven, not poll)
- Window title fetched via AX when permission available
- Stores events with app name deduplication
- Starts/stops with recording lifecycle
- No-op on non-macOS
- `cargo check` passes on all platforms
