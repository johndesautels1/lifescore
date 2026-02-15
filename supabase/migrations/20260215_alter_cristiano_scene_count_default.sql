-- ============================================================================
-- Migration: Update cristiano_city_videos scene_count default from 9 to 7
-- Date: 2026-02-15
-- Author: Claude Opus 4.6
--
-- Purpose:
--   The GoToMyNewCity storyboard prompt was reduced from 9 scenes to 7
--   to simplify HeyGen overlays and hit the 105-120s target duration.
--   This migration updates the column default on the live database.
--
-- Tables affected: cristiano_city_videos
-- Reversible: yes (ALTER COLUMN SET DEFAULT 9)
-- ============================================================================

ALTER TABLE cristiano_city_videos
  ALTER COLUMN scene_count SET DEFAULT 7;

-- Update comment on column for documentation
COMMENT ON COLUMN cristiano_city_videos.scene_count IS 'Number of scenes in storyboard. Default 7 (was 9 before 2026-02-15 prompt optimization).';
