# Task 6.2: Store Speaker Labels + Update Transcript Pipeline

status: pending
epic: task-diarization-6.0.md
depends_on: task-diarization-6.1.md

## What

Wire the speaker change detector into the transcription pipeline. Populate the existing `speaker` column in the `transcripts` table.

## Where

- `frontend/src-tauri/src/audio/transcription/` — transcription worker/engine
- `frontend/src-tauri/src/database/repositories/transcript.rs` — update queries
- `frontend/src-tauri/src/database/models.rs` — ensure `speaker` field on `Transcript`

## Steps

1. **Verify `Transcript` model** has `speaker` field — migration `20251110000001_add_speaker_field.sql` added the column. Make sure the Rust model includes it:
```rust
pub speaker: Option<String>,  // "Speaker 1", "You", etc.
```
If missing from the struct, add it.

2. **Update `TranscriptSegment`** (in audio module) to include speaker:
```rust
pub struct TranscriptSegment {
    // ... existing fields ...
    pub speaker: Option<String>,
}
```

3. **Wire into transcription pipeline** — after transcription produces segments, run them through `SpeakerChangeDetector`:
   - Find where segments are created in `audio/transcription/worker.rs` or `engine.rs`
   - After whisper/parakeet/qwen produces segments, call `detector.assign_speakers(&segments)`
   - Merge speaker labels back into segments
   - Store speaker field when saving to database

4. **Update repository** `transcript.rs` — ensure INSERT/UPDATE queries include `speaker` column.

5. **Retroactive labeling** — add a Tauri command to re-run diarization on an existing meeting's segments:
```rust
#[tauri::command]
async fn api_run_diarization(meeting_id: String, pool: State<'_, SqlitePool>) -> Result<(), String>
```
Fetches all segments for the meeting, runs speaker detection, updates speaker field in DB.

6. **Register** new command in `lib.rs`.

## Done When

- New transcriptions automatically get speaker labels
- Existing meetings can be re-processed with diarization
- Speaker field stored in database
- `cargo check` passes
