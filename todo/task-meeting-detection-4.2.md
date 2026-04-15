# Task 4.2: Camera Scorer + Detection State Machine

status: pending
epic: task-meeting-detection-4.0.md
depends_on: task-meeting-detection-4.1.md

## What

Add a camera-in-use scorer and build the central detection state machine that aggregates scorer outputs.

## Where

- `frontend/src-tauri/src/meeting_detection/camera_scorer.rs`
- `frontend/src-tauri/src/meeting_detection/detector.rs`

## George Reference

- `GeorgeApp/George/Monitors/Scorers/CameraScorer.swift` — uses `AVCaptureDevice.DiscoverySession` with `[.builtInWideAngleCamera, .external]` types. Checks `.isInUseByAnotherApplication`. Score 40 when in use, score 25 for up to 60s after last camera use (grace window, handles brief camera toggle during calls).
- `GeorgeApp/George/Monitors/MeetingDetector.swift` — exact thresholds and timing from george:
  - `activeThreshold = 60`, `inactiveThreshold = 35`
  - `requiredActiveSeconds = 2.0` (must hold above threshold for 2s before declaring active)
  - `requiredInactiveSeconds = 2.0` (must hold below threshold for 2s before departing)
  - Timer: **2.5s** in Detecting, **5.0s** in Active/Departing
  - Flap protection: `flapThreshold = 3` flaps within `flapWindowSeconds = 60` — if flapping, detector suppresses itself
  - No separate "Idle" state — the loop is always running; `Detecting` is the default/idle mode
  - `forcedState` from any scorer can short-circuit score-based logic and hard-lock active

## Steps

> **Phase 1: macOS only.** All implementation in this task is `#[cfg(target_os = "macos")]` only. The non-macOS stub must already compile cleanly — do not modify it. Camera scorer on non-macOS returns `vec![]`. The detector itself is cross-platform (pure Rust logic), but it will have zero scorers on non-macOS and therefore always stay in `Detecting` with score 0.

1. **Camera scorer** in `camera_scorer.rs` (macOS):
   - Use `core_foundation` + `core_media` crates, or `objc` to call `AVCaptureDevice`:
     ```rust
     // Practical approach: call `system_profiler SPCameraDataType -json` or
     // use objc bridge to AVCaptureDevice.DiscoverySession
     // OR: check if any video device is in use via IOKit
     ```
   - Most reliable Rust approach: IOKit `IOServiceGetMatchingServices("IOVideoDevice")` + check `AppleCamera` property for usage. Alternatively, shell to `lsof | grep AppleCamera` (simple, slightly expensive — run only in Detecting mode).
   - Score 40 when in use, 25 within 60s of last use (track `last_active_at: Option<Instant>`).

2. **Detector state machine** in `detector.rs`. Key differences from the original task spec based on george:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum EvalMode {
    Detecting,  // Default — full scorer sweep every 2.5s
    Active,     // Meeting confirmed — only cheap checks every 5.0s
    Departing,  // Score dropped — full sweep every 5.0s
}

pub struct MeetingDetector {
    eval_mode: EvalMode,
    scorers: Vec<Box<dyn MeetingScorer>>,
    active_threshold: i32,         // 60
    inactive_threshold: i32,       // 35
    required_active_secs: f64,     // 2.0
    required_inactive_secs: f64,   // 2.0
    active_candidate_since: Option<Instant>,
    inactive_candidate_since: Option<Instant>,
    flap_timestamps: Vec<Instant>, // flap protection
    flap_threshold: usize,         // 3
    flap_window_secs: f64,         // 60
    is_meeting_active: bool,
    forced_active_until: Option<Instant>,
    suppressed_until: Option<Instant>,
}
```

3. **`tick()` aggregation logic** (faithfully from george):
   - If any scorer returns `forced_state = Some(true)`, immediately go Active (bypasses thresholds)
   - Sum scores from all scorers (cap at 100)
   - `Detecting` + score ≥ 60 → set `active_candidate_since`; if held for `required_active_secs` → go Active, change timer to 5s
   - `Active`: in this mode, only run **cheap** scorers (camera, window title — not AX crawl). If cheap check fails, go Departing.
   - `Departing` + score ≥ 60 → recover to Active; + score < 35 held for `required_inactive_secs` → go Detecting
   - Track flap: each Active→Departing counts. If 3 in 60s, suppress for 5 min.

4. **Timer** — use `tokio::time::interval` with dynamic interval. Reschedule when eval mode changes (Detecting=2.5s vs Active/Departing=5.0s).

## Done When

- Camera scorer compiled and functional on macOS only (`#[cfg(target_os = "macos")]`)
- Detector: exact george thresholds (60/35, 2s required hold, 2.5s/5.0s timer)
- Flap protection implemented
- `forced_state` from any scorer hard-locks Active mode
- Non-macOS builds unchanged — zero scorers registered, detector idles harmlessly
- `cargo check` passes on macOS, Linux, and Windows targets
   - macOS: Check if camera is in use via `AVCaptureDevice` or by checking `CMIOObjectGetPropertyData` (or simpler: check if any process has the camera open via `lsof /dev/video*` equivalent)
   - Simpler approach: use `IOServiceGetMatchingServices` to check `AppleCamera` usage, or shell out to `log stream --predicate 'subsystem == "com.apple.VDCAssistant"'` (but that's too heavy)
   - Pragmatic approach: use CoreMediaIO via the `cidre` crate (already a dependency for ScreenCaptureKit). Check if any camera device is streaming.
   - Score: 30 (camera alone could be photo booth — combined with app scorer hits 70 → active)
   - `is_cheap()` → true

2. **Detector state machine** in `detector.rs`:

```rust
#[derive(Debug, Clone, PartialEq)]
pub enum DetectionState {
    Idle,
    Detecting,  // Signals present, accumulating confidence
    Active,     // Meeting confirmed
    Departing,  // Signals dropping, grace period
}

pub struct MeetingDetector {
    state: DetectionState,
    scorers: Vec<Box<dyn MeetingScorer>>,
    last_score: u32,
    last_platform: Option<String>,
    active_threshold: u32,     // 60
    inactive_threshold: u32,   // 35
    departing_grace_ms: u64,   // 10_000 (10s grace before going idle)
    poll_interval_ms: u64,     // 2500ms in Detecting, 5000ms in Active
}

impl MeetingDetector {
    pub fn new(scorers: Vec<Box<dyn MeetingScorer>>) -> Self;

    /// Run one evaluation cycle. Returns state change if any.
    pub async fn tick(&mut self) -> Option<DetectionStateChange>;

    /// Start the polling loop (spawns tokio task)
    pub fn start(&self, event_sender: mpsc::UnboundedSender<DetectionStateChange>);

    pub fn stop(&self);

    pub fn is_meeting_active(&self) -> bool;
}

pub struct DetectionStateChange {
    pub old_state: DetectionState,
    pub new_state: DetectionState,
    pub score: u32,
    pub platform: Option<String>,
}
```

3. **Aggregation logic** in `tick()`:
   - Run all scorers (or just cheap ones in Active state)
   - Sum scores (cap at 100)
   - State transitions:
     - Idle + score > active_threshold → Detecting
     - Detecting + score > active_threshold for 2+ ticks → Active
     - Active + score < inactive_threshold → Departing
     - Departing + score < inactive_threshold for grace period → Idle
     - Departing + score > inactive_threshold → Active (recovered)

4. **Platform gating** — entire detector works cross-platform, just scorers return None on unsupported platforms (effective score = 0, stays Idle).

## Done When

- Camera scorer detects camera-in-use on macOS
- State machine transitions correctly between all states
- Hysteresis prevents flapping (different active/inactive thresholds)
- Departing grace period prevents premature stop
- `cargo check` passes
