-- ============================================================================
-- LIFE SCORE - InVideo "Moving Movie" Cache
-- Created: 2026-02-27
--
-- Stores generated 10-minute cinematic movies for city comparisons.
-- Each movie tells the user's full freedom journey:
--   from frustration → discovery → LIFE SCORE → verdict → new life
--
-- Videos are generated via InVideo MCP and cached by city pair for reuse.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.movie_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- City pair (the full comparison, not just winner)
  winner_city       TEXT NOT NULL,             -- Winning city (lowercase, trimmed)
  loser_city        TEXT NOT NULL,             -- Losing city (lowercase, trimmed)
  winner_country    TEXT,
  loser_country     TEXT,
  winner_score      NUMERIC,                  -- Overall freedom score (0-100)
  loser_score       NUMERIC,

  -- Screenplay data
  screenplay        JSONB,                    -- Full 12-scene screenplay JSON
  screenplay_word_count INTEGER,              -- Total voiceover words

  -- InVideo integration
  invideo_video_id  TEXT,                     -- InVideo video ID (from MCP response)
  invideo_edit_url  TEXT,                     -- InVideo editor URL (for admin access)
  generation_prompt TEXT,                     -- The full prompt sent to InVideo

  -- Video result
  video_url         TEXT,                     -- Final video URL (InVideo share/embed)
  thumbnail_url     TEXT,
  duration_seconds  NUMERIC DEFAULT 600,      -- Target: 600s (10 min)

  -- Status tracking
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',
                      'generating_screenplay',
                      'screenplay_ready',
                      'submitting_to_invideo',
                      'rendering',
                      'completed',
                      'failed'
                    )),
  error             TEXT,

  -- User tracking
  generated_by      UUID REFERENCES auth.users(id),
  user_name         TEXT,                     -- User's name for personalized narration

  -- Cache management
  completed_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index: Fast lookup by city pair (primary cache key)
CREATE INDEX IF NOT EXISTS idx_movie_videos_city_pair
  ON public.movie_videos (LOWER(winner_city), LOWER(loser_city), status);

-- Index: User's movie history
CREATE INDEX IF NOT EXISTS idx_movie_videos_user
  ON public.movie_videos (generated_by, created_at DESC);

-- Index: InVideo video ID for status polling
CREATE INDEX IF NOT EXISTS idx_movie_videos_invideo_id
  ON public.movie_videos (invideo_video_id)
  WHERE invideo_video_id IS NOT NULL;

-- Index: Cleanup expired videos
CREATE INDEX IF NOT EXISTS idx_movie_videos_expires
  ON public.movie_videos (expires_at)
  WHERE status = 'completed';

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_movie_video_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_movie_video_updated ON public.movie_videos;
CREATE TRIGGER trg_movie_video_updated
  BEFORE UPDATE ON public.movie_videos
  FOR EACH ROW EXECUTE FUNCTION update_movie_video_timestamp();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.movie_videos ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read completed movies (cache reuse across users)
CREATE POLICY movie_videos_read_completed
  ON public.movie_videos FOR SELECT
  TO authenticated
  USING (status = 'completed');

-- Users can see their own in-progress movies
CREATE POLICY movie_videos_read_own
  ON public.movie_videos FOR SELECT
  TO authenticated
  USING (generated_by = auth.uid());

-- Service role has full access (API routes use service key)
CREATE POLICY movie_videos_service_all
  ON public.movie_videos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Find cached movie for a city pair
CREATE OR REPLACE FUNCTION find_cached_movie(
  p_winner_city TEXT,
  p_loser_city TEXT
)
RETURNS SETOF public.movie_videos AS $$
  SELECT * FROM public.movie_videos
  WHERE LOWER(winner_city) = LOWER(TRIM(p_winner_city))
    AND LOWER(loser_city) = LOWER(TRIM(p_loser_city))
    AND status = 'completed'
    AND video_url IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Check user's monthly movie count (for quota enforcement)
CREATE OR REPLACE FUNCTION get_user_movie_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.movie_videos
  WHERE generated_by = p_user_id
    AND created_at >= date_trunc('month', NOW())
    AND status != 'failed';
$$ LANGUAGE sql STABLE;
