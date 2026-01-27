-- ============================================================================
-- Migration: Add grok_videos column to usage_tracking table
-- Date: 2026-01-27
-- Description: Adds grok_videos usage tracking column for SOVEREIGN tier video feature
-- ============================================================================

-- Add grok_videos column to usage_tracking table
ALTER TABLE usage_tracking
ADD COLUMN IF NOT EXISTS grok_videos INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN usage_tracking.grok_videos IS 'Count of Grok video generations (1 per winner/loser pair, 1 per court order). SOVEREIGN tier only.';

-- Create index for efficient usage queries
CREATE INDEX IF NOT EXISTS idx_usage_tracking_grok_videos
ON usage_tracking (user_id, period_start, grok_videos);

-- ============================================================================
-- USAGE COUNTING RULES:
-- - 1 count for new_life_videos (winner + loser pair together)
-- - 1 count for court_order_video (perfect life video)
-- - Only count non-cached generations (reusing cached videos is free)
-- - SOVEREIGN tier only (free/pro have grok_videos = 0 in tier limits)
-- ============================================================================
