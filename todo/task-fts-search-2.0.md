# Epic 2: Full-Text Search on Summaries & Transcripts

status: pending

## Goal

Add SQLite FTS5 indexes on summaries and transcripts. Expose search via Tauri command. Add search UI to the sidebar.

## Why

Meetily has basic DB queries but no full-text search. Users with 100+ meetings need to find things fast. FTS5 is built into SQLite — near-zero overhead to add.

## Current State

- `database/models.rs` — `Transcript` has `summary`, `action_items`, `key_points`, `transcript` text fields
- `database/repositories/` — standard CRUD, no search
- Frontend sidebar (`components/Sidebar/`) — has meeting list but no search input
- SQLite already in use via `sqlx`

## George Reference

- `src/storage/schema.sql` — george has **two separate FTS5 tables**: `chunks_fts` (on `transcript` text) and `summaries_fts` (on `summary` text), each with a full set of INSERT/UPDATE/DELETE triggers. Meetily combines everything into a single `transcripts_fts` table — that's fine given the different schema, but the trigger pattern is identical.
- George's FTS update trigger uses the special `INSERT INTO fts_table(fts_table, rowid, ...)` idiom for the delete step — this is correct, required FTS5 content-table syntax. The tasks already capture this, but worth knowing it's validated.

- `task-fts-search-2.1.md` — FTS5 migration + trigger to sync content
- `task-fts-search-2.2.md` — Search repository + Tauri command
- `task-fts-search-2.3.md` — Frontend search UI in sidebar
