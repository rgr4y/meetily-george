# Task 4.1: Scorer Trait + App Bundle Scorer

status: pending
epic: task-meeting-detection-4.0.md
depends_on: none

## What

Define the `MeetingScorer` trait and implement the first scorer: detecting running meeting apps by process name / bundle ID.

## Where

- `frontend/src-tauri/src/` — new `meeting_detection/` module
- `frontend/src-tauri/src/meeting_detection/mod.rs`
- `frontend/src-tauri/src/meeting_detection/scorer.rs` — trait
- `frontend/src-tauri/src/meeting_detection/app_scorer.rs` — app bundle scorer

## George Reference

- `GeorgeApp/George/Monitors/MeetingSignalCatalog.swift` — copy the bundle IDs, call-state keywords, URL patterns, and window title patterns from this file directly. The data is already validated against real-world usage.
- `GeorgeApp/George/Monitors/Scorers/AppSignalScorer.swift` — scoring strategy: window-title check first (score 90, fast), then AX call-state keyword crawl. App-is-running alone gives no score until in-call state confirmed.
- `GeorgeApp/George/Monitors/MeetingSignalScorer.swift` (swift protocol file, named `AppSignalScorer.swift` in george) — defines `MeetingSignal` struct and `MeetingSignalScorer` protocol including optional `forcedState: Bool?`

## Steps

1. **Create module** `meeting_detection/`:
```
meeting_detection/
├── mod.rs
├── scorer.rs         # Trait + MeetingSignal type
├── catalog.rs        # Known bundle IDs, URL patterns, keywords (PASTE from george's catalog)
├── app_scorer.rs
├── camera_scorer.rs  # (task 4.2)
├── window_title_scorer.rs # (task 4.2 or here)
└── detector.rs       # (task 4.2)
```

2. **Scorer trait** in `scorer.rs`:
```rust
pub struct MeetingSignal {
    pub source: String,           // e.g. "title:us.zoom.xos", "camera", "calendar"
    pub score: i32,               // contribution to total score (0-100)
    pub platform: Option<String>, // "zoom", "teams", "google_meet", etc.
    pub description: String,
}

pub trait MeetingScorer: Send + Sync {
    fn id(&self) -> &str;
    fn evaluate(&self) -> Vec<MeetingSignal>;
    /// Return Some(true) to hard-lock active state (e.g. call-state AX confirmation).
    /// Return None to use score-based logic.
    fn forced_state(&self) -> Option<bool> { None }
}
```

3. **Catalog** in `catalog.rs` — paste in the exact data from `MeetingSignalCatalog.swift`:
```rust
pub const MEETING_APP_BUNDLE_IDS: &[(&str, &str)] = &[
    ("us.zoom.xos",                  "zoom"),
    ("us.zoom.telephony",            "zoom"),
    ("com.microsoft.teams",          "teams"),
    ("com.microsoft.teams2",         "teams"),
    ("com.cisco.webex.meetings",     "webex"),
    ("com.cisco.webex.meeting",      "webex"),
    ("com.ciscospark.webexmeetings", "webex"),
    ("com.hnc.discord",              "discord"),
];

pub const CALL_STATE_KEYWORDS: &[&str] = &[
    "hang up", "end call", "leave call", "leave meeting", "end meeting",
    "leave", "react", "raise hand", "share screen",
    "camera on", "camera off", "turn off camera", "turn on camera",
    "video on", "video off", "end for all", "participants",
    "deafen", "undeafen", "disconnect", "stop sharing",
    "mute", "unmute", "turn off microphone", "turn on microphone",
    "on air",
];

pub const GENERIC_TITLE_PATTERNS: &[&str] = &[
    "meeting", "standup", "stand-up", "huddle", "conference call",
    "video call", "in a call", "in call",
];
```

4. **App scorer** in `app_scorer.rs`:
   - On macOS: use `objc` crate + `NSWorkspace.sharedWorkspace().runningApplications()` to list running apps
   - For each app with a bundle ID matching `MEETING_APP_BUNDLE_IDS`:
     - First: check frontmost window title for `CALL_STATE_KEYWORDS` using AX (`AXIsProcessTrusted()`) → if match, score 90, set `forced_state = true`
     - Also check for `MEETING_WINDOW_TITLE_PATTERNS` (e.g. "Meeting in", "Zoom Meeting") → score 90
     - If app running but no call-state confirmed → score 40
   - `forced_state()` returns `Some(true)` when `last_found_call_state` is true (hard-locks detector active)
   - Requires Accessibility permission (`AXIsProcessTrusted()`). If not granted, skip AX checks and fall back to running-app detection only.

5. **Platform gating** — every macOS-specific import and implementation block must be inside `#[cfg(target_os = "macos")]`. On non-macOS, `evaluate()` must compile and return `vec![]` without any new dependencies or panic paths. **Do not touch any existing Windows/Linux code.** The non-macOS stub is the entire platform story for phase 1.

## Done When

- `MeetingScorer` trait with `forced_state()` defined
- `catalog.rs` contains all bundle IDs, keywords, patterns from george
- `AppScorer` on macOS: checks window titles and AX call-state keywords for known meeting apps
- `forced_state()` returns `Some(true)` when in-call confirmed via AX
- Compiles on all platforms with zero changes to existing Windows/Linux code paths
- `cargo check` passes on macOS, Linux, and Windows targets

```
meeting_detection/
├── mod.rs
├── scorer.rs         # Trait definition
├── app_scorer.rs     # App process detection
├── camera_scorer.rs  # (task 4.2)
└── detector.rs       # (task 4.2)
```

2. **Scorer trait** in `scorer.rs`:
```rust
pub struct MeetingSignal {
    pub score: u32,           // 0-100
    pub platform: Option<String>,  // "zoom", "teams", "google_meet", etc.
    pub source: String,       // scorer name
}

pub trait MeetingScorer: Send + Sync {
    fn name(&self) -> &str;
    async fn evaluate(&self) -> Option<MeetingSignal>;
    fn is_cheap(&self) -> bool;  // cheap scorers run more frequently
}
```

3. **App scorer** in `app_scorer.rs`:
   - On macOS: use `sysctl` or `NSWorkspace.runningApplications` via objc crate (already a dependency) to list running apps
   - Check against known meeting app identifiers:
     - `us.zoom.xos` / "zoom.us" — Zoom
     - `com.microsoft.teams` / "Microsoft Teams" — Teams  
     - `com.google.Chrome` with title containing "Google Meet" — Meet (this is actually a window title scorer concern, skip for now)
     - `com.cisco.webexmeetingsapp` — WebEx
     - `com.hnc.Discord` — Discord (lower score, could be just chat)
   - Return score: 40 for meeting app running (not enough alone to trigger, needs camera or other signal)
   - `is_cheap()` → true (process list is fast)

4. **Platform gating** — wrap macOS-specific code in `#[cfg(target_os = "macos")]`. For other platforms, return `None` (no signal).

5. **Register module** in `lib.rs` or parent mod.

## Done When

- `MeetingScorer` trait defined
- `AppScorer` detects Zoom, Teams, WebEx, Discord on macOS
- Returns scored `MeetingSignal` with platform name
- Compiles on all platforms (stubs for non-macOS)
- `cargo check` passes
