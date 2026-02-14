-- ============================================================================
-- LIFE SCORE - Cristiano HeyGen City Videos Cache
-- Migration: 20260214_create_cristiano_city_videos.sql
-- Date: 2026-02-14
--
-- Caches Cristiano "Go To My New City" HeyGen videos by winning city.
-- Videos are reused across users when the same city wins, avoiding
-- expensive re-generation via HeyGen API.
--
-- Rate Limit: Sovereign plan only, 1 video per month per user.
--
-- Clues Intelligence LTD
-- (c) 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- CRISTIANO CITY VIDEOS TABLE
-- Caches HeyGen-generated Cristiano "Go To My New City" videos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cristiano_city_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Cache key: winning city name (lowercase, trimmed)
  -- Same city can win across different comparisons - reuse the video
  city_name TEXT NOT NULL,

  -- HeyGen video tracking
  heygen_video_id TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,

  -- Script & scene metadata
  script TEXT NOT NULL,
  scene_count INTEGER NOT NULL DEFAULT 1,

  -- Context from the comparison that triggered generation
  loser_city TEXT,
  winner_score NUMERIC,
  loser_score NUMERIC,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),

  -- User who triggered generation (for audit)
  generated_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: find cached video by city name
CREATE INDEX IF NOT EXISTS idx_cristiano_city_videos_city
  ON public.cristiano_city_videos(city_name);

-- Find completed videos for cache hits
CREATE INDEX IF NOT EXISTS idx_cristiano_city_videos_city_status
  ON public.cristiano_city_videos(city_name, status)
  WHERE status = 'completed';

-- Processing queue
CREATE INDEX IF NOT EXISTS idx_cristiano_city_videos_status
  ON public.cristiano_city_videos(status)
  WHERE status IN ('pending', 'processing');

-- Expiration cleanup
CREATE INDEX IF NOT EXISTS idx_cristiano_city_videos_expires
  ON public.cristiano_city_videos(expires_at)
  WHERE expires_at IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.cristiano_city_videos ENABLE ROW LEVEL SECURITY;

-- Anyone can read completed videos (they're shared content across users)
CREATE POLICY "Cristiano city videos are publicly readable"
  ON public.cristiano_city_videos FOR SELECT
  USING (true);

-- Only service role can insert/update (API routes use service key)
CREATE POLICY "Service role can manage cristiano city videos"
  ON public.cristiano_city_videos FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- CACHE LOOKUP FUNCTION
-- ============================================================================

-- Find a cached completed video for a city
CREATE OR REPLACE FUNCTION find_cached_cristiano_video(p_city_name TEXT)
RETURNS TABLE (
  id UUID,
  city_name TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  script TEXT,
  scene_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.city_name,
    v.video_url,
    v.thumbnail_url,
    v.duration_seconds,
    v.script,
    v.scene_count,
    v.created_at
  FROM public.cristiano_city_videos v
  WHERE LOWER(TRIM(v.city_name)) = LOWER(TRIM(p_city_name))
    AND v.status = 'completed'
    AND v.video_url IS NOT NULL
    AND (v.expires_at IS NULL OR v.expires_at > NOW())
  ORDER BY v.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USAGE TRACKING
-- Add cristiano_videos column to usage_tracking if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'usage_tracking'
    AND column_name = 'cristiano_videos'
  ) THEN
    ALTER TABLE public.usage_tracking
      ADD COLUMN cristiano_videos INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cristiano_videos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.cristiano_city_videos
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.cristiano_city_videos IS 'Cached Cristiano HeyGen "Go To My New City" videos, keyed by winning city';
COMMENT ON COLUMN public.cristiano_city_videos.city_name IS 'Winning city name for cache lookup (case-insensitive)';
COMMENT ON COLUMN public.cristiano_city_videos.heygen_video_id IS 'HeyGen API video_id for status polling';
COMMENT ON COLUMN public.cristiano_city_videos.expires_at IS 'Videos expire after 90 days to manage storage costs';
COMMENT ON FUNCTION find_cached_cristiano_video IS 'Lookup a cached Cristiano video for a winning city';
COMMENT ON FUNCTION cleanup_expired_cristiano_videos IS 'Deletes Cristiano videos past their expiration date';
