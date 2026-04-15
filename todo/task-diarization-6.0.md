# Epic 6: Speaker Diarization

status: pending

## Goal

Attribute transcript segments to individual speakers. "Speaker 1 said X, Speaker 2 said Y." Store speaker labels with segments. Display in transcript UI.

## Why

This is the #1 missing feature in Meetily. Without diarization, transcripts are a wall of text with no indication of who said what. For meeting summaries, action item attribution ("John will handle X") becomes impossible.

## Current State

- `transcripts` table already has a `speaker` column (from migration `20251110000001_add_speaker_field.sql`) — **field exists but is never populated**
- `TranscriptSegment` struct has no speaker field
- No audio embedding or clustering code
- George uses MLX-based diarization (Swift/macOS only) — not directly portable as Rust code
- **speech-swift** (`https://github.com/soniqo/speech-swift`) solves this: it exposes `audio diarize` and `audio vad` as a CLI + HTTP server on macOS/Apple Silicon, running natively on CoreML/Neural Engine. We call it as a sidecar.

## George Reference

- `GeorgeApp/George/Services/DiarizationService.swift` — runs MLX-based diarization on **system audio only**. Mic audio is treated as the local user's path and labeled "Me" directly by the transcription logic — no diarization needed. This is a critical architecture choice: don't burn compute diarizing the mic stream.
- Speaker labels: `S1`, `S2`, ... stored in `speaker_profiles` SQLite table, cross-session persistent via cosine similarity on stored embeddings.
- George's `DiarizationService` runs on a timer (every N seconds), accumulates a sliding window of audio, invokes `NativeDiarizationProvider` (MLX), and calls `onSpeakerAssignment` callback with session-absolute time ranges → speaker labels.

## Backend: speech-swift CLI

Install via Homebrew (`brew tap soniqo/speech && brew install speech`) on Apple Silicon. Binary: `/opt/homebrew/bin/audio`. All inference runs on Neural Engine / Metal — no Python, no pyannote, no ONNX deps.

Full subcommand surface and Meetily use:

| Subcommand | What it does | Meetily use |
|---|---|---|
| `transcribe` | Speech → text (Qwen3-ASR or Parakeet-TDT) | Replace or complement Whisper for on-device STT (task 6.4+) |
| `transcribe-batch` | Batch directory transcription, model loaded once | Retranscription of existing meetings without reloading model |
| `align` | Forced alignment — audio + text → word-level timestamps | Improve transcript timestamp accuracy post-STT |
| `speak` | TTS: Qwen3-TTS or CosyVoice | Future: read-back summaries or action items aloud |
| `kokoro` | TTS: Kokoro-82M (CoreML, ANE, 54 voices) | Lightweight TTS when full Qwen3 is overkill |
| `qwen3-tts-coreml` | TTS: Qwen3-TTS CoreML (Neural Engine) | Fastest TTS path on Apple Silicon |
| `respond` | Full-duplex speech-to-speech (PersonaPlex 7B) | Future: voice Q&A over meeting content |
| `vad` | Voice activity detection (Pyannote offline) | Pre-filter before diarize to strip silence |
| `vad-stream` | Streaming VAD, Silero, 32ms chunks | Live silence gating during active recording |
| `diarize` | Speaker diarization — who spoke when | **Core Epic 6 feature** (task 6.4) |
| `embed-speaker` | Speaker embeddings (WeSpeaker ResNet34, 256-dim) | Cross-session speaker identity persistence |
| `denoise` | Noise suppression via DeepFilterNet3 | Pre-process mic audio before transcription |

All subcommands accept `--json` for machine-readable output. The HTTP server mode (`audio-server --port 8080`) exposes REST endpoints for the same models — usable if we want persistent model loading instead of per-call CLI spawning.

**On non-macOS**: fall back to the energy-based heuristic from 6.1. Don't call speech-swift CLI. Gate all `SpeechSwiftProvider` code behind `#[cfg(target_os = "macos")]`.

The Rust side calls subcommands via `std::process::Command`, parses JSON stdout, maps to internal types.

## Architecture decision: when to diarize the mic stream

George skips mic diarization entirely. That works for remote calls where one person owns the mic. Meetily targets a broader use case:

**Default behavior**: mic = `"Me"` (single local user). System audio clustered → `S1`, `S2`, ...

**Optional — room/office mode**: when the mic is open and picks up multiple people around a table, diarizing the mic stream is useful. This is disabled by default because it adds compute overhead and is wrong in the common solo-remote case.

- **Mic diarization OFF** (default): mic segments → `"Me"`, system segments → `S1`, `S2`, ...
- **Mic diarization ON** (setting): mic segments → `P1`, `P2`, ... (in-room participants), system segments → `S1`, `S2`, ... (remote). Streams diarized independently then merged by timestamp.

Surface as a settings toggle: **"Diarize microphone (multi-speaker room)"** — off by default. Stored in the settings table.

## Sub-tasks

- `task-diarization-6.1.md` — Speaker change detection (energy-based heuristic, non-macOS fallback)
- `task-diarization-6.2.md` — Store speaker labels + update transcript pipeline
- `task-diarization-6.3.md` — Frontend speaker display in transcript
- `task-diarization-6.4.md` — speech-swift sidecar integration (Sortformer diarization + VAD on Apple Silicon)
