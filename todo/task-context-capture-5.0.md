# Epic 5: Context Capture (Window Focus + App Activity)

status: pending

## Goal

Capture what the user is doing during meetings — focused app, window title — and include this context in summarization prompts. This gives summaries awareness of what was happening alongside the conversation.

## Why

"You were looking at the Figma mockup while discussing the redesign" is vastly more useful than a bare transcript summary. Context capture turns transcription into meeting memory.

## Current State

- No system monitoring during recordings
- Summarization has zero context about user activity
- Transcript is the only input to summary generation

## George Reference

- `GeorgeApp/George/Monitors/WindowFocusMonitor.swift` — **uses `NSWorkspace.didActivateApplicationNotification`, not polling**. Event-driven: fires when user switches apps. Captures `appName`, `bundleID`, `windowTitle` (via AX), and `displayID` (multi-monitor). Caps history at 500 events.
- `GeorgeApp/George/Models/ActivityEvent.swift` — `ActivityEvent` type with `EventType` enum: `windowFocus`, `audioSource`, `meetingState`, `axText`, `clipboard`, `audioRouteContext`. Start with `windowFocus` only.
- `GeorgeApp/George/Services/ContextualizerService.swift` — combines multiple monitors into a unified event stream. Persists to JSONL files (not just SQLite — one file per day). Implements `activitySummaryText(from:to:)` for LLM injection.
- The `activitySummaryText()` format: `"Activity context:\n- HH:mm Switched to {app} ({windowTitle})\n- HH:mm ..."`

Start with window focus tracking (least invasive, most useful). Skip clipboard/screenshots for now — those are privacy-sensitive and lower value.

## Sub-tasks

- `task-context-capture-5.1.md` — Activity events table + model
- `task-context-capture-5.2.md` — Window focus monitor (macOS, with Windows/Linux stubs)
- `task-context-capture-5.3.md` — Inject activity context into summary prompts
