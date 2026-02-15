-- ============================================================================
-- LIFE SCORE - Cristiano "Go To My New City" Video Cache
-- Caches HeyGen Video Agent renders by winning city for reuse across users.
-- One video per city (same Freedom Tour can serve all users comparing that city).
-- ============================================================================

-- Create table
CREATE TABLE IF NOT EXISTS cristiano_city_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name       TEXT NOT NULL,                       -- Winning city (lowercase, trimmed)
  country         TEXT,                                -- Country of the winning city
  region          TEXT,                                -- State/province
  heygen_video_id TEXT,                                -- HeyGen Video Agent job ID
  storyboard      JSONB,                               -- Full 7-scene storyboard JSON
  winner_package  JSONB,                               -- Winner Package input data
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'generating_storyboard', 'storyboard_ready',
                                    'rendering', 'processing', 'completed', 'failed')),
  video_url       TEXT,                                -- Final HeyGen video URL
  thumbnail_url   TEXT,                                -- Video thumbnail
  duration_seconds NUMERIC,                            -- Actual video duration
  scene_count     INTEGER DEFAULT 7,                   -- Should always be 7
  word_count      INTEGER,                             -- Total voiceover word count
  freedom_score   NUMERIC,                             -- Overall freedom score
  error           TEXT,                                -- Error message if failed
  generated_by    UUID REFERENCES auth.users(id),      -- User who triggered generation
  completed_at    TIMESTAMPTZ,                         -- When rendering finished
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'), -- Cache TTL
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast city lookups (the primary cache key)
CREATE INDEX IF NOT EXISTS idx_cristiano_videos_city
  ON cristiano_city_videos (LOWER(city_name), status);

-- Index for user's video history
CREATE INDEX IF NOT EXISTS idx_cristiano_videos_user
  ON cristiano_city_videos (generated_by, created_at DESC);

-- Index for cleanup of expired videos
CREATE INDEX IF NOT EXISTS idx_cristiano_videos_expires
  ON cristiano_city_videos (expires_at)
  WHERE status = 'completed';

-- Index for HeyGen video ID lookups (status polling)
CREATE INDEX IF NOT EXISTS idx_cristiano_videos_heygen_id
  ON cristiano_city_videos (heygen_video_id)
  WHERE heygen_video_id IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cristiano_video_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cristiano_video_updated ON cristiano_city_videos;
CREATE TRIGGER trg_cristiano_video_updated
  BEFORE UPDATE ON cristiano_city_videos
  FOR EACH ROW EXECUTE FUNCTION update_cristiano_video_timestamp();

-- RLS: all authenticated users can read completed videos (cache reuse)
ALTER TABLE cristiano_city_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY cristiano_videos_read_completed
  ON cristiano_city_videos FOR SELECT
  TO authenticated
  USING (status = 'completed');

-- RLS: users can see their own in-progress videos
CREATE POLICY cristiano_videos_read_own
  ON cristiano_city_videos FOR SELECT
  TO authenticated
  USING (generated_by = auth.uid());

-- RLS: service role can do everything (API routes use service key)
CREATE POLICY cristiano_videos_service_all
  ON cristiano_city_videos FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper: find cached video for a city
CREATE OR REPLACE FUNCTION find_cached_cristiano_video(p_city_name TEXT)
RETURNS SETOF cristiano_city_videos AS $$
  SELECT * FROM cristiano_city_videos
  WHERE LOWER(city_name) = LOWER(TRIM(p_city_name))
    AND status = 'completed'
    AND video_url IS NOT NULL
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Helper: check user's monthly cristiano video count
CREATE OR REPLACE FUNCTION get_user_cristiano_video_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM cristiano_city_videos
  WHERE generated_by = p_user_id
    AND created_at >= date_trunc('month', NOW())
    AND status != 'failed';
$$ LANGUAGE sql STABLE;
