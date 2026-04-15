# Epic 4: Automatic Meeting Detection

status: pending

## Goal

Detect when the user joins a video call and auto-start recording. Detect when the call ends and auto-stop. Platform-specific signal detection (macOS first, Windows/Linux stubs).

## Why

Meetily requires manual start/stop. Users forget to hit record. Auto-detection removes friction — the app "just works" when you join a Zoom/Teams/Meet call.

## Current State

- Recording is entirely manual (`start_recording` / `stop_recording` Tauri commands)
- No system monitoring for meeting signals
- Audio capture infrastructure exists and works

## Approach (George's proven pattern)

Pluggable scorer system with hysteresis state machine:
- **Scorers** check individual signals (running apps, camera, window titles)
- **Detector** aggregates scores, manages state transitions with thresholds
- **State machine**: Detecting → Active → Departing → Detecting
- Before a meeting - we're looking for meeting SIGNALS
- During a meeting - we're looking for meeting END SIGNALS - Meeting end signals can be looked after less often and entire AX trees 
    don't need to be crawled to do so
- Active threshold: 60, Inactive threshold: 35 (prevents flapping)
- Timer: 2.5s in Detecting, 5.0s in Active/Departing

## George Reference

- `GeorgeApp/George/Monitors/MeetingSignalCatalog.swift` — canonical bundle IDs, URL patterns, window title patterns, and AX call-state keywords. Copy this file's data directly — it encodes years of real-world testing.
- `GeorgeApp/George/Monitors/MeetingDetector.swift` — full state machine with flap protection (3 flaps in 60s → suppression), manual force-active, locked-active and suppressed-until overrides, and separate per-mode timer intervals.
- `GeorgeApp/George/Monitors/Scorers/AppSignalScorer.swift` — window-title check first (score 90), then AX crawl for call-state keywords (`forcedState = true`). Running-app detection alone is not enough — the scorer checks *in-call* state.
- `GeorgeApp/George/Monitors/Scorers/CameraScorer.swift` — `AVCaptureDevice.DiscoverySession` + `isInUseByAnotherApplication`. Score 40 active, score 25 for up to 60s after camera stops (grace window).
- `GeorgeApp/George/Monitors/Scorers/WindowTitleScorer.swift` — generic title patterns (standup, huddle, "in a call", etc.) for apps not in the catalog.

**Phase 1: macOS only.** Do not add any Windows or Linux detection code. Do not remove or break any existing Windows/Linux build paths — all new code must be gated behind `#[cfg(target_os = "macos")]` so the other platforms compile and run identically to today. Windows/Linux will return no signals and stay in `Detecting` mode indefinitely (effectively disabled).

## Sub-tasks

- `task-meeting-detection-4.1.md` — Scorer trait + app bundle scorer (macOS)
- `task-meeting-detection-4.2.md` — Camera scorer + detection state machine
- `task-meeting-detection-4.3.md` — Auto-start/stop recording integration + settings toggle
- `task-meeting-detection-4.4.md` — Frontend meeting detection indicator + settings UI
