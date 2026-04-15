# Task 2.1: FTS5 Migration + Sync Triggers

status: pending
epic: task-fts-search-2.0.md
depends_on: none

## What

Create SQLite FTS5 virtual tables for full-text search on transcripts and summaries. Add triggers to keep FTS in sync with source tables.

## Where

- `frontend/src-tauri/migrations/` — new migration file

## Steps

1. **Create migration** `frontend/src-tauri/migrations/YYYYMMDD000000_add_fts_indexes.sql`:

```sql
-- FTS index on transcripts (covers transcript text + summary + action_items + key_points + decisions)
CREATE VIRTUAL TABLE IF NOT EXISTS transcripts_fts USING fts5(
    transcript,
    summary,
    action_items,
    key_points,
    decisions,
    content='transcripts',
    content_rowid='rowid'
);

-- Populate from existing data
INSERT INTO transcripts_fts(rowid, transcript, summary, action_items, key_points, decisions)
    SELECT rowid, COALESCE(transcript,''), COALESCE(summary,''), COALESCE(action_items,''), COALESCE(key_points,''), COALESCE(decisions,'')
    FROM transcripts;

-- Keep in sync: INSERT
CREATE TRIGGER IF NOT EXISTS transcripts_ai AFTER INSERT ON transcripts BEGIN
    INSERT INTO transcripts_fts(rowid, transcript, summary, action_items, key_points, decisions)
    VALUES (new.rowid, COALESCE(new.transcript,''), COALESCE(new.summary,''), COALESCE(new.action_items,''), COALESCE(new.key_points,''), COALESCE(new.decisions,''));
END;

-- Keep in sync: UPDATE
CREATE TRIGGER IF NOT EXISTS transcripts_au AFTER UPDATE ON transcripts BEGIN
    INSERT INTO transcripts_fts(transcripts_fts, rowid, transcript, summary, action_items, key_points, decisions)
    VALUES ('delete', old.rowid, COALESCE(old.transcript,''), COALESCE(old.summary,''), COALESCE(old.action_items,''), COALESCE(old.key_points,''), COALESCE(old.decisions,''));
    INSERT INTO transcripts_fts(rowid, transcript, summary, action_items, key_points, decisions)
    VALUES (new.rowid, COALESCE(new.transcript,''), COALESCE(new.summary,''), COALESCE(new.action_items,''), COALESCE(new.key_points,''), COALESCE(new.decisions,''));
END;

-- Keep in sync: DELETE
CREATE TRIGGER IF NOT EXISTS transcripts_ad AFTER DELETE ON transcripts BEGIN
    INSERT INTO transcripts_fts(transcripts_fts, rowid, transcript, summary, action_items, key_points, decisions)
    VALUES ('delete', old.rowid, COALESCE(old.transcript,''), COALESCE(old.summary,''), COALESCE(old.action_items,''), COALESCE(old.key_points,''), COALESCE(old.decisions,''));
END;
```

Note: FTS5 content-sync triggers use the special `INSERT INTO fts_table(fts_table, ...)` syntax for deletions. This is correct FTS5 behavior, not a typo.

## Done When

- Migration file exists with valid FTS5 SQL
- Handles existing data population
- Triggers keep FTS in sync on INSERT/UPDATE/DELETE
- `cargo check` passes (migration is just SQL, but ensure sqlx doesn't complain)
