# Task 5.3: Inject Activity Context into Summary Prompts

status: pending
epic: task-context-capture-5.0.md
depends_on: task-context-capture-5.2.md

## What

When generating a summary, fetch activity events for the meeting and include the activity summary in the LLM prompt.

## Where

- `frontend/src-tauri/src/summary/processor.rs` — `generate_meeting_summary()`
- `frontend/src-tauri/src/summary/service.rs` — `process_transcript_background()`

## George Reference

- `GeorgeApp/George/Services/ContextualizerService.swift` → `activitySummaryText(from:to:)` — the exact formatting george uses for LLM injection:
  ```
  Activity context:
  - 14:30 Switched to Figma (Project Mockups v3)
  - 14:42 Switched to Slack (# design-team)
  - 14:55 Switched to Chrome (JIRA Board - Sprint 12)
  ```
  Deduplicates consecutive same-app events in the summary (not necessarily at the DB level). Includes time in HH:mm format.

- `GeorgeApp/George/Services/SummarizeService.swift` → `generateDaily()` — uses a word-budget cap to prevent activity sections from overwhelming the transcript in the prompt. The daily rollup also has an `activitySectionForSystem` that frames the activity context with specific instructions for when to add "Solo Work" sections.

- George stores events in JSONL files but Meetily already has SQLite — the `summarize_for_meeting()` DB method from task 5.1 is the right approach.

## Steps

1. **Fetch activity summary** in `process_transcript_background()` or `generate_meeting_summary()`:
```rust
let activity_summary = ActivityRepository::summarize_for_meeting(&pool, &meeting_id).await
    .unwrap_or_default();
```

2. **Inject into prompt** — use the george format exactly. Append after the transcript:
```
## Activity Context
During this meeting, the participant's screen activity was:
{activity_summary}

Use this context to enrich your summary — mention relevant documents, tools, or resources
the participant was viewing when specific topics were discussed.
```

3. **`summarize_for_meeting()` format** — implement to produce george-style output:
   - Group events by app (dedup consecutive same-app)
   - Format: `"- HH:mm Switched to {app_name} ({window_title})"` (omit window_title if empty)
   - Prefix the block with `"Activity context:"`
   - Cap total length at ~2000 chars to avoid overloading the prompt context window

4. **Only include if non-empty** — don't add the section header if `activity_summary` is empty.

5. **Daily rollup** — same pattern: when building the `generateDaily()` sessions text, also pass activity events for the full day time range through a similar activity summary and inject as a separate section in the user prompt.

## Done When

- Activity summary injected in george's format with HH:mm timestamps
- Section omitted when no events captured
- Character budget respected (≤2000 chars)
- Daily rollup also uses activity context when available
- `cargo check` passes
```rust
let activity_summary = ActivityRepository::summarize_for_meeting(&pool, &meeting_id).await
    .unwrap_or_default();  // empty string if no events or error
```

2. **Inject into prompt** — add activity context to the user prompt sent to the LLM. Append after the transcript:
```
## Activity Context
During this meeting, the participant's screen activity was:
{activity_summary}

Use this context to enrich your summary — mention relevant documents, tools, or resources
the participant was viewing when specific topics were discussed.
```

3. **Only include if non-empty** — don't add the section if `activity_summary` is empty (no events captured, or non-macOS).

4. **Update prompt** for daily rollups too (if activity data exists) — add a similar section in the daily rollup prompt from Epic 3.

## Done When

- Activity summary fetched during summary generation
- Included in LLM prompt when available
- Gracefully omitted when empty
- Summary output reflects activity context (e.g., "While discussing the redesign, the team referenced Figma mockups")
- `cargo check` passes
