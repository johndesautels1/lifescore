-- ============================================================================
-- LIFE SCORE - Avatar Videos Cache
-- Migration: 003_avatar_videos.sql
-- Date: 2026-01-24
--
-- Caches generated Christiano judge videos to avoid regenerating.
-- Videos are cached by comparison_id (hash of cities + verdict).
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- AVATAR VIDEOS TABLE
-- Caches Replicate-generated judge videos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.avatar_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Comparison identifier (hash of city1 + city2 + winner)
  comparison_id TEXT UNIQUE NOT NULL,

  -- Video data
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  script TEXT NOT NULL,
  duration_seconds INTEGER,

  -- Replicate tracking
  replicate_prediction_id TEXT,

  -- Metadata
  city1 TEXT NOT NULL,
  city2 TEXT NOT NULL,
  winner TEXT NOT NULL,
  winner_score INTEGER,
  loser_score INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  error TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_avatar_videos_comparison_id
  ON public.avatar_videos(comparison_id);

CREATE INDEX IF NOT EXISTS idx_avatar_videos_status
  ON public.avatar_videos(status)
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_avatar_videos_expires
  ON public.avatar_videos(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.avatar_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read videos (they're public content)
CREATE POLICY "Videos are publicly readable"
  ON public.avatar_videos FOR SELECT
  USING (true);

-- Only service role can insert/update (API routes use service key)
CREATE POLICY "Service role can manage videos"
  ON public.avatar_videos FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to delete expired videos (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_videos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.avatar_videos
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.avatar_videos IS 'Cached Christiano judge videos generated via Replicate';
COMMENT ON COLUMN public.avatar_videos.comparison_id IS 'Hash of city pair + verdict for cache lookup';
COMMENT ON COLUMN public.avatar_videos.expires_at IS 'Videos expire after 30 days to manage storage';
COMMENT ON FUNCTION cleanup_expired_videos IS 'Deletes videos past their expiration date';
