# Epic 1: Structured Summary Output

status: pending

## Goal

Replace freeform markdown summaries with structured JSON output: `{ summary, keyPoints[], actionItems[], decisions[] }`. Store each field separately in the database. Display structured sections in the UI.

## Why

Meetily currently generates a single markdown blob. Structured output enables:
- Dedicated action items panel (trackable tasks)
- Decision log
- Key points at a glance
- Future: cross-meeting task tracking, daily rollups (Epic 3 depends on this)

## Current State

- `summary/processor.rs` → `generate_meeting_summary()` returns `(String, TemplateOutput)` — the String is freeform markdown
- `database/models.rs` → `Transcript` model has `summary`, `action_items`, `key_points` fields (Option<String>) — **already in schema but unused by most providers**
- `summary/llm_client.rs` → `generate_summary()` returns `Result<String, String>` — raw text
- Frontend `AISummary/` components render markdown directly

## Approach

1. Add a JSON schema instruction to summary prompts (all providers)
2. Parse structured JSON from LLM response in `processor.rs`
3. Store parsed fields in existing DB columns (`action_items`, `key_points`) + new `decisions` column
4. Add Tauri commands to query structured fields
5. Build UI components for structured display

## Sub-tasks

- `task-structured-summaries-1.1.md` — Prompt engineering + JSON parsing in processor.rs
- `task-structured-summaries-1.2.md` — DB migration for `decisions` column + repository updates
- `task-structured-summaries-1.3.md` — Tauri commands for structured summary data
- `task-structured-summaries-1.4.md` — Frontend UI for structured summary display
