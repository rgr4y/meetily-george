# George — Merge Reference

## What George Is

macOS menu bar app for local meeting/work memory. No dock icon. Captures audio, transcribes on-device, summarizes with LLMs, stores everything locally in SQLite. Privacy-first — nothing leaves the machine unless you configure an external inference provider.

## Core Stack

| Layer | Tech |
|-------|------|
| **Native shell** | Swift 6 / AppKit (Xcode 16+, Apple Silicon) |
| **Web UI** | React 19 + Vite 8 + Tailwind 4, served via WKWebView |
| **Database** | SQLite via GRDB.swift |
| **IPC** | WKWebView message handler + WebSocket fallback (dev) |
| **Audio** | AVAudioEngine + ScreenCaptureKit |
| **ML** | WhisperKit, MLX Swift, Apple Speech (macOS 26+) |

## Feature Map

- **Audio capture** — mic (AVAudioEngine / VoiceProcessingIO / ScreenCaptureKit) + system audio (ScreenCaptureKit). 120s ring buffers, 16kHz Float32.
- **Live transcription** — pluggable STT: WhisperKit (Whisper large-v3-turbo), SpeechAnalyzer (Apple native), Qwen3 (local LLM).
- **Speaker diarization** — MLX-based voice embeddings, distance clustering, 90-day profile retention.
- **Meeting detection** — heuristic scorer system (app bundles, camera, calendar, window titles, browser URLs). State machine with hysteresis: Detecting → Active → Departing.
- **Summarization** — pluggable inference: Claude CLI, OpenAI-compatible, Apple Foundation Models, custom HTTP. Structured output (summary, key points, action items, decisions).
- **Context capture** — accessibility text extraction, screenshots/OCR, clipboard, calendar, window focus, browser URLs.
- **Task/decision extraction** — parses summaries for action items.
- **Daily rollups** — AI-generated day summaries.
- **Full-text search** — FTS on summaries table.
- **Web UI** — three-pane layout: day sidebar → session list → session detail (transcript, notes, info tabs). Live waveform, mute toggles, live transcript streaming.

## Architecture — Key Services

| Service | Role |
|---------|------|
| `CaptureManager` | Owns ring buffers, starts/stops mic + system capture |
| `STTProviderAdapter` | Loads/manages STT backend lifecycle |
| `SummarizeService` | Main orchestrator (~2500 lines) — session windowing, prompt construction, inference calls, result storage |
| `MeetingDetector` | Pluggable scorer state machine, 2.5–5s polling |
| `SessionManager` | Session lifecycle (create, close, merge, split) |
| `DiarizationService` | Speaker attribution via MLX embeddings |
| `ContextualizerService` | Merges activity events into human-readable context |
| `TaskExtractionService` | Action items from summaries |
| `TimelineDataProvider` | Timeline queries for web UI |
| `PermissionsManager` | macOS permissions (mic, screen, calendar, AX) |
| `StateWatchdog` | Restarts capture on silence/failures |

## Project Structure

```
GeorgeApp/
├── George.xcodeproj
├── George/
│   ├── GeorgeApp.swift            # @main entry + AppDelegate
│   ├── Config.swift               # All settings, george.json parsing
│   ├── Audio/                     # Ring buffers, mic/system capture backends
│   ├── Database/                  # SQLite layer (GRDB), migrations, stores
│   ├── Inference/                 # Pluggable LLM providers (Claude, OpenAI, Apple FM)
│   ├── STT/                       # Pluggable speech-to-text (WhisperKit, SpeechAnalyzer, Qwen3)
│   ├── Monitors/                  # Meeting detection, window focus, calendar, AX, clipboard
│   │   └── Scorers/              # Meeting signal scorers (app, camera, calendar, URL, title)
│   ├── Services/                  # Business logic (22 files)
│   ├── Web/                       # WKWebView window, JS↔Swift bridge
│   ├── Views/                     # SwiftUI windows (settings, debug, popover)
│   ├── Logging/                   # Custom logger, dev terminal
│   ├── Models/                    # Data models (events, timeline, audio route)
│   └── Protocols/
├── Web/                           # React/Vite frontend
│   ├── src/
│   │   ├── App.tsx               # Status bar + layout
│   │   ├── bridge.ts             # Type-safe JS↔Swift IPC
│   │   ├── pages/DayView.tsx     # Day timeline, session list
│   │   ├── components/           # SessionList, SessionDetail, Waveform, etc.
│   │   └── hooks/                # useGeorgeState, useAudioWaveform, useLiveTranscript
│   └── package.json              # React 19, react-router-dom 7, Tailwind 4, Vite 8
├── GeorgeTests/                   # 50+ Swift Testing test files
├── GeorgeUITests/
└── MeetingMock/                   # Test fixture app (simulates Zoom/Teams)
```

## SPM Dependencies

| Package | Purpose |
|---------|---------|
| **WhisperKit** | On-device Whisper transcription |
| **mlx-swift + mlx-audio-swift** | ML acceleration, diarization |
| **speech-swift** | Apple Speech framework |
| **GRDB.swift** | SQLite ORM |
| **Inject** | InjectionIII hot-reload (dev only) |

## Web Frontend Dependencies

React 19, react-router-dom 7, Tailwind 4, Vite 8. Zero runtime deps beyond React/router.

## Configuration

`george.json` (project root or `~/.george`). All fields optional with defaults in `Config.swift`.

Sections: `stt`, `inference`, `mic`, `diarization`, `context`, `schedule`, `paths`, `dev`, `transcript`, `summarize`, `vision`.

Provider/role pattern — configure named providers, assign them to roles:

```json
{
  "stt": {
    "providers": {
      "whisperkit": { "type": "whisperkit", "model": "large-v3_turbo" },
      "speech_analyzer": { "type": "speech_analyzer" }
    },
    "roles": {
      "transcription": { "provider": "whisperkit" }
    }
  },
  "inference": {
    "providers": {
      "claude-cli": { "type": "claude_cli", "cli_path": "/usr/local/bin/claude" },
      "apple-foundation": { "type": "apple_foundation", "context_window": 4096 }
    },
    "roles": {
      "summary": { "provider": "claude-cli", "model": "opus" },
      "daily": { "provider": "apple-foundation" }
    }
  }
}
```

## Database Schema (SQLite)

| Table | Purpose |
|-------|---------|
| `sessions` | Recording sessions (start, end, duration, source, audio file) |
| `segments` | Transcript segments (session, timestamp, text, source, speaker, app context) |
| `summaries` | Generated summaries (key points, action items, decisions, activity type) |
| `events` | Activity events (windowFocus, screenCapture, axText, clipboard, audioSource, meetingState, transcript) |
| `dailies` | Daily rollups (date, summary, session count, duration) |
| `meetings` | Meeting metadata (platform, calendar title, times) |
| `annotations` | User notes on sessions |
| `speaker_profiles` | Speaker embeddings (90-day retention) |
| `summaries_fts` | Full-text search index on summaries |

## Bridge API (Swift ↔ Web)

Type-safe RPC via `bridge.ts` ↔ `WebBridge.swift`.

### RPC Calls (~30)

```
getState, getTodayStats, getTimeline, searchSummaries, getActionItems,
promoteTask, demoteTask, dismissTask, startCapture, stopCapture,
setMicMuted, setSystemMuted, getLiveTranscript, getTranscript,
getTranscriptPageBefore, getTranscriptPageAfter,
saveSessionNote, getSessionNote, saveAnnotation, deleteAnnotation,
renameMeeting, reclassifySession, hideSession, resummarizeSession,
openSettings, openLLMChat, getPromptLog
```

### Push Events (~8)

```
stateChange, meetingChange, muteChange, audioLevel,
liveTranscript, transcriptSegmentsCommitted, timelineUpdated
```

## Audio Pipeline

1. **Mic** → `InProcessMicCapture` (AVAudioEngine) → `AudioRingBuffer` (120s, 16kHz, Float32)
   - Alt backends: VoiceProcessingIO (with AEC), ScreenCaptureKit mic
2. **System** → `InProcessSystemCapture` (ScreenCaptureKit) → `AudioRingBuffer`
3. **STT** reads from ring buffers → emits confirmed segments + live partial text
4. **Diarization** analyzes audio → speaker embeddings → clustering → speaker labels
5. **Segments** stored in SQLite with speaker attribution

## Meeting Detection

Pluggable scorer state machine:

- **Scorers**: AppSignalScorer (Zoom/Teams/Meet bundle IDs), CameraScorer, CalendarScorer, WindowTitleScorer, BrowserURLScorer
- **State machine**: Detecting (2.5s) → Active (5s) → Departing (5s) → Detecting
- **Thresholds**: active > 60, inactive < 35 (hysteresis)
- **Flap suppression**: notification if state flaps 3x in 60s

## Summarization Pipeline

1. Session ends → segments finalized
2. `SummarizeService` fetches transcript + activity events from DB
3. Loads prompt templates from files
4. Calls configured inference provider
5. Parses structured JSON: `{ summary, keyPoints[], actionItems[], decisions[] }`
6. Stores `SummaryRecord` in DB
7. **Meeting mode**: windows summaries (5–10 min chunks), rolled up at meeting end

## Tests

50+ test files using Swift Testing framework. Coverage: summarization, STT, meeting detection, database, permissions, diarization, ring buffer, config parsing. Separate `MeetingMock` app for integration testing meeting detection.

## Merge Considerations

### Platform Coupling

Tightly coupled to macOS — ScreenCaptureKit, AVAudioEngine, AppKit, CoreML, Accessibility APIs. No cross-platform path without major refactoring of the native layer.

### Portable Pieces

- **Web UI** — React frontend communicates purely through bridge abstraction. Could be re-bridged to Electron, Tauri, or any webview host.
- **Config system** — provider/role pattern is extensible. Adding new STT or inference backends = implement a protocol.
- **Database schema** — standard SQLite, portable as-is.
- **Summarization prompts** — loaded from files, not hardcoded.

### Known Debt

- `SummarizeService` is a god object (~2500 lines) — does session management + prompt construction + inference + storage. Would benefit from decomposition.
- No migration system yet (prerelease) — direct schema changes.
- Some features experimental (Qwen3 STT, Apple Foundation Models).

### Privacy Model

Audio never leaves device by default. Only transcript text goes to configured inference providers. All storage local SQLite. No telemetry, no cloud sync.

### Permissions Required

Microphone, Screen Recording, Calendar, Accessibility (optional), Notifications.
