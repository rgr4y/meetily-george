# Task 6.1: Speaker Change Detection (Energy-Based Heuristic)

status: pending
epic: task-diarization-6.0.md
depends_on: none

## What

Implement a basic speaker change detector that identifies when a different person starts talking, using audio energy patterns and silence gaps. This is the "good enough" v1 — not perfect, but useful.

## Where

- `frontend/src-tauri/src/` — new `diarization/` module
- `frontend/src-tauri/src/diarization/mod.rs`
- `frontend/src-tauri/src/diarization/energy_detector.rs`

## George Reference

- `GeorgeApp/George/Services/DiarizationService.swift` — runs on system audio only; mic side is labeled "Me" directly. This is the key insight: don't even attempt to diarize the mic stream.
- George's speaker labels: `S1`, `S2`, ... (not "Speaker 1"). Use this format for consistency with george's DB schema.
- `DiarizationService` maintains `sessionDisplayNames: [String]` starting with `"S1"` and incrementing: `nextDisplayIndex: Int = 1`.

## Key insight for Meetily's v1

Default: mic = `"Me"`, system audio diarized → `S1`, `S2`, ...

When **"Diarize microphone"** setting is enabled (off by default): both streams are diarized independently. Mic → `P1`, `P2`, ... (in-room), system → `S1`, `S2`, ... (remote). Read the setting from the settings repository before running the pipeline and branch accordingly.

## Steps

1. **Create module** `diarization/`:
```
diarization/
├── mod.rs
└── energy_detector.rs
```

2. **Energy-based speaker change detection** in `energy_detector.rs`:

```rust
pub struct SpeakerChangeDetector {
    silence_threshold_ms: u64, // 500ms default
    min_speech_duration_ms: u64, // 200ms — ignore tiny blips
    next_speaker_index: u32,   // starts at 1 → "S1", "S2", ...
}

#[derive(Debug, Clone)]
pub struct SpeakerSegment {
    pub speaker_id: u32,
    pub speaker_label: String,  // "Me", "S1", "S2", etc.
    pub start_time: f64,
    pub end_time: f64,
}

impl SpeakerChangeDetector {
    pub fn new() -> Self;

    /// Process transcript segments and assign speaker labels.
    /// `source` field on each segment determines mic ("Me") vs system ("S1", "S2", ...).
    pub fn assign_speakers(
        &mut self,
        segments: &[TranscriptSegment],
    ) -> Vec<SpeakerSegment>;
}
```

3. **Algorithm**:
   - Sort segments by start timestamp
   - Check `diarize_microphone` setting from the settings repository
   - **If setting OFF** (default):
     - Mic segments → `speaker = "Me"`
     - System segments: apply heuristic with independent counter → `S1`, `S2`, ...
   - **If setting ON**:
     - Mic segments: apply heuristic with independent counter → `P1`, `P2`, ...
     - System segments: apply heuristic with independent counter → `S1`, `S2`, ...
   - Merge the two labeled streams sorted by timestamp for final output

4. **Source field** — verify that `TranscriptSegment` has a `source` field indicating `"mic"` vs `"system"`. If not, add it where segments are created in the transcription pipeline. This is essential to separate the two streams.

5. **Settings migration** — add `diarize_microphone` to the settings table:
   ```sql
   ALTER TABLE settings ADD COLUMN diarize_microphone INTEGER DEFAULT 0;
   ```
   Add to the `Setting` model in `models.rs` as `pub diarize_microphone: bool`. Surface in the Settings UI (task 4.4 or a general settings page) as **"Diarize microphone (multi-speaker room)"** with description: "Enable if multiple people share the same microphone (e.g. conference room). Disabled by default for solo usage."

## Done When

- Mic segments labeled `"Me"`, system segments labeled `"S1"`, `"S2"`, etc.
- Uses silence gaps between system audio segments to detect speaker changes
- `SpeakerChangeDetector` is exported from the module
- `cargo check` passes
