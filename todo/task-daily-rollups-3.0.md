# Epic 3: Daily Rollup Summaries

status: pending

## Goal

Auto-generate daily summaries that synthesize all meetings/sessions from a given day into a single digest. Store in a new `dailies` table. Show in the UI as a "Daily Digest" view.

## Why

Users with 3-5 meetings/day need a single view of everything that happened. Cross-meeting intelligence — spotting themes, conflicting decisions, follow-up chains across meetings.

## Current State

- No concept of cross-meeting summaries
- Each meeting has its own isolated summary
- Summary system (`summary/processor.rs`, `summary/llm_client.rs`) works for single meetings

## George Reference

- `GeorgeApp/George/Services/SummarizeService.swift` → `generateDaily(date:)` — production implementation
- `GeorgeApp/George/Prompts/daily-rollup.system.txt` — the actual system prompt. Fireflies-style markdown output: Overview, 🔴 ACTION ITEMS with urgency emojis, 🟢 FYI section, Key Discussions, Decisions Made. Uses `{{hourly_section}}` and `{{activity_section}}` template slots.
- `GeorgeApp/George/Prompts/daily-rollup.user.txt` — user prompt: includes `{{user_name}}`, `{{date}}`, `{{session_count}}`, `{{total_minutes}}`, `{{sessions}}` slots
- `src/storage/schema.sql` — `dailies` table: `date TEXT NOT NULL UNIQUE`, `summary TEXT`, `chunk_count INTEGER`, `total_duration_seconds INTEGER`

George's daily generation:
- Fetches all summaries for the date from DB
- Tags each session `[SYSTEM]` (remote/call audio) or `[MIC]` (local user audio) based on source
- Includes `key_points`, `action_items`, `decisions` from each session summary as extra context lines
- Optionally injects hourly summaries and activity context (from `ContextualizerService`)
- Returns **markdown** (not structured JSON) — daily rollup deliberately produces human-readable output, not structured fields

Key difference from chunk summaries: **dailies output markdown**, not JSON. The LLM assembles a polished digest.

## Sub-tasks

- `task-daily-rollups-3.1.md` — DB table + migration + model
- `task-daily-rollups-3.2.md` — Daily rollup generation service + Tauri command
- `task-daily-rollups-3.3.md` — Frontend daily digest view
