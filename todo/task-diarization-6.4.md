# Task 6.4: speech-swift Sidecar Integration (Sortformer + VAD on Apple Silicon)

status: pending
epic: task-diarization-6.0.md
depends_on: task-diarization-6.2.md

## What

Replace the energy-based heuristic (6.1) on macOS with proper diarization via the **speech-swift CLI** running Sortformer (end-to-end CoreML, Neural Engine). On non-macOS, the 6.1 heuristic remains the fallback.

## Where

- `frontend/src-tauri/src/diarization/` — new `speech_swift_provider.rs`
- `frontend/src-tauri/src/diarization/mod.rs` — provider trait dispatch
- `frontend/src-tauri/Cargo.toml` — no new deps (uses `std::process::Command`)

## George Reference

- `GeorgeApp/George/Services/DiarizationService.swift` — george's architecture:
  - Runs on a `Timer` every `intervalSeconds` (configurable)
  - Accumulates a sliding window of audio (`windowSeconds` configurable, default ~30s)
  - Calls `NativeDiarizationProvider` (MLX pipeline), gets back `[DiarizationSegment]`
  - Maintains `sessionDisplayNames: [String]` ("S1", "S2", ...) per session
  - Cross-session persistence via `speaker_profiles` SQLite table + cosine similarity on embeddings
  - `sessionIsOwner: [Bool]` — first speaker seen during a mic-only window is flagged as owner

- **speech-swift is george's inference layer, open-sourced.** It has the same Pyannote + Sortformer + WeSpeaker stack george uses, available via CLI. We call it from Rust instead of reimplementing.

## speech-swift CLI interface

```bash
# Diarize a WAV file — Sortformer (CoreML, Neural Engine, no Python, no pyannote pipeline)
audio diarize meeting.wav --engine sortformer --json
# → [{"speakerId": "S1", "startTime": 0.0, "endTime": 3.2}, ...]

# VAD pre-filter (Silero streaming, 32ms chunks)
audio vad-stream meeting.wav --json
# → [{"startTime": 0.1, "endTime": 2.8}, ...]

# Speaker embeddings for cross-session identity (WeSpeaker ResNet34, 256-dim)
audio embed-speaker segment.wav --json
# → {"embedding": [0.12, -0.34, ...]}
```

Install: `brew tap soniqo/speech && brew install speech` (Apple Silicon required).
Binary at `/opt/homebrew/bin/audio`.

## Steps

1. **Detect availability** — at startup, check if `audio` binary is on PATH (`which audio` or check `/opt/homebrew/bin/audio`). Store as `speech_swift_available: bool` in app state. If not found, fall back to energy-based heuristic from 6.1.

2. **Provider trait** in `diarization/mod.rs`:
```rust
pub trait DiarizationProvider: Send + Sync {
    fn diarize(&self, wav_path: &Path) -> Result<Vec<SpeakerSegment>, String>;
}

pub struct SpeechSwiftProvider {
    binary_path: PathBuf,  // /opt/homebrew/bin/audio
}

pub struct EnergyFallbackProvider;  // re-exports 6.1 detector
```

3. **`SpeechSwiftProvider::diarize`** — call Sortformer:
```rust
let output = std::process::Command::new(&self.binary_path)
    .args(["diarize", wav_path.to_str().unwrap(),
           "--engine", "sortformer", "--json"])
    .output()?;
let segments: Vec<SsSegment> = serde_json::from_slice(&output.stdout)?;
```
Map `SsSegment { speakerId, startTime, endTime }` → internal `SpeakerSegment { speaker_label, start_time, end_time }`.

4. **VAD pre-filter** — before passing audio to diarizer, strip silence:
```rust
let vad_output = std::process::Command::new(&self.binary_path)
    .args(["vad", wav_path.to_str().unwrap(), "--json"])
    .output()?;
```
Only submit speech segments to the diarizer to reduce processing time.

5. **Cross-session speaker persistence** — add `speaker_profiles` table (matching george's schema):
```sql
CREATE TABLE speaker_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,           -- "S1", "S2", ...
    display_name TEXT NOT NULL,    -- user-editable
    embedding BLOB NOT NULL,       -- 256-dim Float32 LE bytes
    is_owner INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);
```
For each new speaker seen, call `audio embed-speaker` on a representative segment, compare cosine similarity against stored profiles (threshold 0.7). If match → reuse label. If new → insert new profile.

6. **macOS gate** — wrap the entire `SpeechSwiftProvider` in `#[cfg(target_os = "macos")]`. On non-macOS, always dispatch to `EnergyFallbackProvider`.

7. **Timer-based pipeline** — background tokio task: accumulate system audio in a ring buffer, dump to temp WAV every `interval_secs` (configurable, default 30s), run diarize, emit `SpeakerAssignment` events back to the transcription pipeline.

## Done When

- `audio diarize --engine sortformer` called for system audio on macOS; labels mapped to S1/S2
- VAD pre-filtering reduces spurious segments
- `speaker_profiles` table created; cross-session identity works via embedding similarity
- On non-macOS or when `audio` binary absent, falls back cleanly to 6.1 energy heuristic
- `cargo check` passes

    /// Assign speaker to audio segment based on embedding similarity
    pub fn assign_speaker(&mut self, audio: &[f32], sample_rate: u32) -> Result<u32, String>;

    /// Cosine similarity between two embeddings
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32;
}
```

3. **Clustering** — when a new segment arrives:
   - Extract embedding
   - Compare against known speaker embeddings (cosine similarity)
   - If similarity > threshold with existing speaker → same speaker
   - Otherwise → new speaker (add to known embeddings)

4. **Model download** — integrate with existing model download system (same pattern as Whisper model management). Store in `~/.config/Meetily/models/diarization/`.

5. **Feature flag** — put behind a Cargo feature flag `diarization-onnx` so it's optional:
```toml
[features]
diarization-onnx = ["ort"]
```

6. **Wire into pipeline** — replace or augment `SpeakerChangeDetector` from 6.1 when the ONNX model is available. Fall back to energy-based if model not downloaded.

## Done When

- ONNX speaker embedding model loads and runs
- Speaker clustering produces better speaker labels than energy-based heuristic
- Feature-flagged and optional
- Falls back gracefully if model unavailable
- `cargo check` passes with and without feature flag
