-- Add decisions column for structured summary support
-- Stores JSON array of decision strings, matching key_points and action_items pattern
ALTER TABLE transcripts ADD COLUMN decisions TEXT;
