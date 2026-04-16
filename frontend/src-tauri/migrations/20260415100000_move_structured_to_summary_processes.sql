-- Move structured summary fields from transcripts to summary_processes
-- These are meeting-level concepts, not per-transcript-segment data

ALTER TABLE summary_processes ADD COLUMN summary_text TEXT;
ALTER TABLE summary_processes ADD COLUMN key_points TEXT;
ALTER TABLE summary_processes ADD COLUMN action_items TEXT;
ALTER TABLE summary_processes ADD COLUMN decisions TEXT;

-- Migrate existing data: pick the first non-null row per meeting
UPDATE summary_processes
SET
    summary_text = (SELECT t.summary FROM transcripts t WHERE t.meeting_id = summary_processes.meeting_id AND t.summary IS NOT NULL LIMIT 1),
    key_points = (SELECT t.key_points FROM transcripts t WHERE t.meeting_id = summary_processes.meeting_id AND t.key_points IS NOT NULL LIMIT 1),
    action_items = (SELECT t.action_items FROM transcripts t WHERE t.meeting_id = summary_processes.meeting_id AND t.action_items IS NOT NULL LIMIT 1),
    decisions = (SELECT t.decisions FROM transcripts t WHERE t.meeting_id = summary_processes.meeting_id AND t.decisions IS NOT NULL LIMIT 1);
