-- ============================================================================
-- LIFE SCORE - Grok Videos Table
-- Migration: 20260127_create_grok_videos.sql
-- Date: 2026-01-27
--
-- Stores Grok Imagine generated videos for "See Your New Life" and
-- "Court Order" features. Supports video reuse across users for same cities.
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- GROK VIDEOS TABLE
-- Caches Grok/Replicate-generated mood and perfect life videos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.grok_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User tracking (REQUIRED - videos cost money)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Comparison context
  comparison_id TEXT NOT NULL,

  -- City and video type
  city_name TEXT NOT NULL,
  video_type TEXT NOT NULL CHECK (video_type IN (
    'winner_mood',   -- Freedom/happy video for winner city
    'loser_mood',    -- Regulation/stressed video for loser city
    'perfect_life'   -- Cinematic perfect life for Court Order
  )),

  -- Generation details
  prompt TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC DEFAULT 8,

  -- Provider tracking (Grok primary, Replicate fallback)
  provider TEXT NOT NULL DEFAULT 'grok' CHECK (provider IN ('grok', 'replicate')),
  prediction_id TEXT,  -- Provider's job ID for status polling

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Unique constraint: One video per city+type (allows reuse)
  -- Different users can have same city/type - we reuse completed videos
  CONSTRAINT unique_city_video UNIQUE (city_name, video_type, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Fast lookup by city name and type (for cache reuse)
CREATE INDEX IF NOT EXISTS idx_grok_videos_city_type
  ON public.grok_videos(city_name, video_type)
  WHERE status = 'completed';

-- Fast lookup for user's videos
CREATE INDEX IF NOT EXISTS idx_grok_videos_user
  ON public.grok_videos(user_id);

-- Fast lookup by comparison
CREATE INDEX IF NOT EXISTS idx_grok_videos_comparison
  ON public.grok_videos(comparison_id);

-- Find processing jobs for polling
CREATE INDEX IF NOT EXISTS idx_grok_videos_processing
  ON public.grok_videos(status)
  WHERE status IN ('pending', 'processing');

-- Provider prediction ID for status updates
CREATE INDEX IF NOT EXISTS idx_grok_videos_prediction
  ON public.grok_videos(prediction_id)
  WHERE prediction_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.grok_videos ENABLE ROW LEVEL SECURITY;

-- Users can see their own videos
CREATE POLICY "Users can view own videos"
  ON public.grok_videos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can also see ANY completed video (for cache reuse)
-- This allows fetching cached videos from other users
CREATE POLICY "Completed videos are reusable"
  ON public.grok_videos FOR SELECT
  TO authenticated
  USING (status = 'completed');

-- Service role has full access (API routes use service key)
CREATE POLICY "Service role full access"
  ON public.grok_videos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to find reusable video for a city
CREATE OR REPLACE FUNCTION find_cached_grok_video(
  p_city_name TEXT,
  p_video_type TEXT
)
RETURNS TABLE (
  id UUID,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gv.id,
    gv.video_url,
    gv.thumbnail_url,
    gv.duration_seconds,
    gv.created_at
  FROM public.grok_videos gv
  WHERE gv.city_name = LOWER(p_city_name)
    AND gv.video_type = p_video_type
    AND gv.status = 'completed'
    AND gv.video_url IS NOT NULL
  ORDER BY gv.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's video generation count this month
CREATE OR REPLACE FUNCTION get_user_grok_video_count(
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  video_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO video_count
  FROM public.grok_videos
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', NOW())
    AND status != 'failed';

  RETURN video_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.grok_videos IS 'Cached Grok Imagine videos for New Life and Court Order features';
COMMENT ON COLUMN public.grok_videos.user_id IS 'User who initiated generation (for cost tracking)';
COMMENT ON COLUMN public.grok_videos.city_name IS 'Lowercase city name for cache key';
COMMENT ON COLUMN public.grok_videos.video_type IS 'winner_mood, loser_mood, or perfect_life';
COMMENT ON COLUMN public.grok_videos.provider IS 'grok (primary) or replicate (fallback)';
COMMENT ON FUNCTION find_cached_grok_video IS 'Find reusable completed video for a city/type';
COMMENT ON FUNCTION get_user_grok_video_count IS 'Count user video generations this month for limits';
