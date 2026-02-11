-- ============================================================================
-- LIFE SCORE - InVideo Override Videos
-- Created: 2026-02-10
--
-- Allows admins to upload/link InVideo URLs that override the default
-- Kling AI court order video clips. When an override exists for a comparison
-- (or a city), the full InVideo movie plays instead of the short clip.
--
-- Future: When InVideo launches their API, this table will also store
-- auto-generated videos requested via the API.
-- ============================================================================

-- Create the invideo_overrides table
CREATE TABLE IF NOT EXISTS public.invideo_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Match criteria: either a specific comparison OR a city-level default
  comparison_id TEXT,                -- NULL = city-level default override
  city_name TEXT NOT NULL,           -- Lowercase city name (the winner city)

  -- Video details
  video_url TEXT NOT NULL,           -- InVideo share/embed URL
  video_title TEXT,                  -- Optional title for admin reference
  duration_seconds NUMERIC,          -- Approximate duration (e.g. 600 for 10 min)
  thumbnail_url TEXT,                -- Optional custom thumbnail

  -- Admin tracking
  uploaded_by TEXT NOT NULL,          -- Admin email who uploaded
  is_active BOOLEAN DEFAULT true,    -- Soft delete / disable without removing

  -- Prompt used to generate (for future API integration)
  generation_prompt TEXT,             -- The prompt sent to InVideo (manual or API)
  source TEXT DEFAULT 'manual'        -- 'manual' (admin paste) or 'api' (future)
    CHECK (source IN ('manual', 'api')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup: specific comparison override
CREATE INDEX IF NOT EXISTS idx_invideo_comparison
  ON public.invideo_overrides (comparison_id, is_active)
  WHERE comparison_id IS NOT NULL AND is_active = true;

-- Index for fast lookup: city-level default override
CREATE INDEX IF NOT EXISTS idx_invideo_city
  ON public.invideo_overrides (city_name, is_active)
  WHERE is_active = true;

-- Index for admin management
CREATE INDEX IF NOT EXISTS idx_invideo_admin
  ON public.invideo_overrides (uploaded_by, created_at DESC);

-- ============================================================================
-- LOOKUP FUNCTION: Find the best override for a comparison
-- Priority: comparison-specific > city-level default > NULL (use Kling)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_invideo_override(
  p_comparison_id TEXT,
  p_city_name TEXT
)
RETURNS TABLE (
  id UUID,
  video_url TEXT,
  video_title TEXT,
  duration_seconds NUMERIC,
  thumbnail_url TEXT,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First try comparison-specific override
  RETURN QUERY
    SELECT o.id, o.video_url, o.video_title, o.duration_seconds, o.thumbnail_url, o.source
    FROM public.invideo_overrides o
    WHERE o.comparison_id = p_comparison_id
      AND o.is_active = true
    ORDER BY o.updated_at DESC
    LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Fallback to city-level default
  RETURN QUERY
    SELECT o.id, o.video_url, o.video_title, o.duration_seconds, o.thumbnail_url, o.source
    FROM public.invideo_overrides o
    WHERE o.city_name = LOWER(p_city_name)
      AND o.comparison_id IS NULL
      AND o.is_active = true
    ORDER BY o.updated_at DESC
    LIMIT 1;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.invideo_overrides ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ active overrides (needed for video playback)
CREATE POLICY "Anyone can read active overrides"
  ON public.invideo_overrides
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service role has full access (API endpoints use service key)
CREATE POLICY "Service role full access"
  ON public.invideo_overrides
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_invideo_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER invideo_overrides_updated_at
  BEFORE UPDATE ON public.invideo_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invideo_updated_at();
