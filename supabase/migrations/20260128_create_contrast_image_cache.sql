-- ============================================================================
-- Migration: Create contrast_image_cache table
-- Date: 2026-01-28
-- Purpose: Cache Olivia contrast images for city comparisons
-- Used by: api/olivia/contrast-images.ts
-- ============================================================================

-- Create the table
CREATE TABLE IF NOT EXISTS public.contrast_image_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  city_a_url TEXT NOT NULL,
  city_a_caption TEXT,
  city_b_url TEXT NOT NULL,
  city_b_caption TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_contrast_cache_key ON contrast_image_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_contrast_expires ON contrast_image_cache(expires_at);

-- Enable RLS
ALTER TABLE contrast_image_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read cached images (public read for performance)
CREATE POLICY "contrast_image_cache_select" ON contrast_image_cache
  FOR SELECT USING (true);

-- Service role can manage all images
CREATE POLICY "contrast_image_cache_insert" ON contrast_image_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "contrast_image_cache_update" ON contrast_image_cache
  FOR UPDATE USING (true);

CREATE POLICY "contrast_image_cache_delete" ON contrast_image_cache
  FOR DELETE USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON contrast_image_cache TO anon;
GRANT SELECT, INSERT, UPDATE ON contrast_image_cache TO authenticated;
GRANT ALL ON contrast_image_cache TO service_role;

-- Cleanup function for expired images
CREATE OR REPLACE FUNCTION cleanup_expired_contrast_images()
RETURNS void AS $$
BEGIN
  DELETE FROM contrast_image_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE contrast_image_cache IS 'Cache for Olivia contrast images comparing two cities';
