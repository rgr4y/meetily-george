# Task 1.1: Structured Summary Prompt + JSON Parsing

status: done
completed: 2026-04-15
epic: task-structured-summaries-1.0.md
depends_on: none

## What

Modify the summary generation pipeline to request structured JSON from LLMs and parse the response into discrete fields.

## Where

- `frontend/src-tauri/src/summary/processor.rs` — `generate_meeting_summary()`
- `frontend/src-tauri/src/summary/llm_client.rs` — `generate_summary()`

## George Reference

- `GeorgeApp/George/Inference/InferenceJSONSchema.swift` — exact JSON schema used for OpenAI `response_format`
- `GeorgeApp/George/Prompts/catchup-window.system.txt` — uses `<<<GEORGE_JSON_FORMAT>>>` delimiter blocks (not just a comment) to bracket the JSON schema; makes regex/extraction more reliable when LLMs go off-script
- `GeorgeApp/George/Prompts/session-summary-work.system.txt` — full production prompt with `{{user_name}}`, `{{source_hint}}`, `{{timeline_format_hint}}` template slots; shows field-level instructions ("Format each as 'Person: task'")
- `GeorgeApp/George/Services/SummarizeService.swift` → `cleanLLMResponse()` and `bestEffortParse()` — production-hardened parsing

## Steps

1. **Define the output struct** in `processor.rs`:
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct StructuredSummary {
    pub summary: String,
    pub key_points: Vec<String>,
    pub action_items: Vec<String>,
    pub decisions: Vec<String>,
}
```

2. **Add JSON schema instruction** to the system prompt. Use delimiter blocks like george does — they survive LLM instructions better than a plain comment:
```
<<<JSON_FORMAT>>>
Return ONLY valid JSON with this exact structure (no markdown fences, no commentary):
{
  "summary": "2-3 sentence overview of what was discussed",
  "key_points": ["point 1", "point 2"],
  "action_items": ["Person: task (timing)"],
  "decisions": ["decision 1"]
}
<<<END_JSON_FORMAT>>>
```
For OpenAI-compatible providers that support structured output, also set `response_format` to `{ "type": "json_schema", "json_schema": { "name": "meeting_summary", "strict": true, "schema": { ... } } }`. George's schema for this is in `InferenceJSONSchema.swift` — `sessionChunkSummarySchema`. This eliminates parsing failures entirely for models that support it.

3. **Add `clean_llm_response()`** before attempting any parse. George's production version does these in order:
   - Strip `<think>...</think>` blocks (Qwen3 reasoning mode outputs these)
   - Strip leading/trailing whitespace
   - Strip markdown code fences: `^```(?:json)?\s*` from start, `\s*```$` from end
   - Strip prose preamble: if first non-whitespace char is not `{`, skip forward to the first `{`

4. **Parse the LLM response** after cleaning:
   - Try `serde_json::from_str::<StructuredSummary>(&cleaned)`
   - If that fails, try `best_effort_parse()`: use regex to extract `"summary"` string field and `"key_points"`, `"action_items"`, `"decisions"` array items. George's implementation handles escaped quotes and nested brackets — worth doing the same in Rust using the `regex` crate.
   - If still fails, fall back: put entire raw response in `summary`, empty vecs for the rest
   - Log parse failures with `log::warn!("structured parse failed, falling back: {}", e)`

5. **Update return type** of `generate_meeting_summary()` to include the `StructuredSummary`. Don't break existing callers — add it as an additional return value or wrap in a new struct.

## Done When

- `StructuredSummary` struct exists and is public
- System prompt uses `<<<JSON_FORMAT>>>` delimiters
- `clean_llm_response()` handles Qwen3 think blocks, code fences, and prose preambles
- Response parsing handles clean JSON, regex-extracted fallback, and raw-text fallback
- Existing callers still compile
- `cargo check` passes
