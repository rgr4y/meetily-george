# Task: Make VAD Thresholds Configurable

## Summary
All VAD (Voice Activity Detection) thresholds are hardcoded in `frontend/src-tauri/src/audio/vad.rs`. Make them configurable via the app's settings/config system, namespaced with `vad_` prefix on all config keys.

## Current State
Hardcoded values in `vad.rs`:
- `positive_speech_threshold = 0.50` (speech start)
- `negative_speech_threshold = 0.35` (speech end)
- `min_speech_time = 250ms` (minimum segment duration)
- `max_speech_duration_sec = 10` (max segment before forced split)
- `redemption_time_ms` — passed in from callers (400ms live, 2000ms batch)
- RMS/Peak silence filter thresholds (0.03/0.08 in `is_likely_silence`)
- `LARGE_FILE_THRESHOLD = 960_000` samples
- `CHUNK_SIZE = 160_000` samples (10s at 16kHz)

## Config Keys (all `vad_` prefixed)
```
vad_positive_speech_threshold: f32    # default 0.50
vad_negative_speech_threshold: f32    # default 0.35
vad_min_speech_time_ms: u32           # default 250
vad_max_speech_duration_sec: u32      # default 10
vad_redemption_time_live_ms: u32      # default 400
vad_redemption_time_batch_ms: u32     # default 2000
vad_silence_rms_threshold: f32        # default 0.03
vad_silence_peak_threshold: f32       # default 0.08
```

## Scope
- Add config keys to whatever settings system Meetily uses (check `src-tauri/src/config/` or similar)
- Read config in `vad.rs` instead of hardcoding
- Keep current hardcoded values as defaults (zero behavior change if unconfigured)
- George already has these configurable — match that pattern

## Files to Touch
- `frontend/src-tauri/src/audio/vad.rs` — read config instead of hardcoding
- Settings/config module — add `vad_*` keys with defaults
- Pipeline callers that pass `redemption_time_ms` — read from config
- Possibly UI settings panel if we want user-facing controls

## Priority
Low — current defaults work well. Nice-to-have for power users and debugging.
