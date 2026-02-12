-- ============================================================================
-- LIFE SCORE - Contrast Images Storage Migration
-- Date: 2026-02-12
--
-- Problem: Contrast images were cached as Replicate CDN URLs which expire
-- after ~1 hour, but our cache TTL was 30 days. Images would go dead.
--
-- Fix: Download generated images and store them permanently in Supabase
-- Storage. The contrast_image_cache table now stores Supabase public URLs
-- (which never expire) instead of temporary Replicate URLs.
--
-- Creates:
-- 1. Storage bucket 'contrast-images' (public reads, service-role writes)
-- 2. Adds storage_path columns to contrast_image_cache table
--
-- Run in Supabase SQL Editor or via CLI: supabase db push
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contrast-images',
  'contrast-images',
  true,  -- Public reads (so <img src="..."> works directly)
  5242880,  -- 5MB file size limit (webp images are small)
  ARRAY['image/webp', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/png', 'image/jpeg'];

-- ============================================================================
-- 2. RLS POLICIES FOR STORAGE
-- Public reads (bucket is public), service-role only writes
-- ============================================================================

-- Service role can upload contrast images
CREATE POLICY "Service role can upload contrast images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contrast-images'
    AND auth.role() = 'service_role'
  );

-- Service role can update contrast images
CREATE POLICY "Service role can update contrast images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'contrast-images'
    AND auth.role() = 'service_role'
  );

-- Service role can delete contrast images
CREATE POLICY "Service role can delete contrast images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'contrast-images'
    AND auth.role() = 'service_role'
  );

-- ============================================================================
-- 3. ADD STORAGE PATH COLUMNS TO CACHE TABLE
-- These store the Supabase Storage paths so we can generate public URLs
-- and clean up orphaned files if needed.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contrast_image_cache'
      AND column_name = 'city_a_storage_path'
  ) THEN
    ALTER TABLE public.contrast_image_cache
      ADD COLUMN city_a_storage_path TEXT,
      ADD COLUMN city_b_storage_path TEXT;

    COMMENT ON COLUMN public.contrast_image_cache.city_a_storage_path IS
      'Supabase Storage path for city A image (contrast-images/{cache_key}_a.webp)';
    COMMENT ON COLUMN public.contrast_image_cache.city_b_storage_path IS
      'Supabase Storage path for city B image (contrast-images/{cache_key}_b.webp)';
  END IF;
END $$;

-- ============================================================================
-- 4. UPDATE CLEANUP FUNCTION TO ALSO DELETE STORAGE FILES
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_contrast_images()
RETURNS void AS $$
DECLARE
  expired_row RECORD;
BEGIN
  -- Delete storage objects for expired entries
  FOR expired_row IN
    SELECT city_a_storage_path, city_b_storage_path
    FROM contrast_image_cache
    WHERE expires_at < NOW()
      AND (city_a_storage_path IS NOT NULL OR city_b_storage_path IS NOT NULL)
  LOOP
    IF expired_row.city_a_storage_path IS NOT NULL THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'contrast-images'
        AND name = expired_row.city_a_storage_path;
    END IF;
    IF expired_row.city_b_storage_path IS NOT NULL THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'contrast-images'
        AND name = expired_row.city_b_storage_path;
    END IF;
  END LOOP;

  -- Delete the expired cache rows
  DELETE FROM contrast_image_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
--
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify bucket exists in Dashboard -> Storage -> contrast-images
-- 3. Verify "Public bucket" is enabled
-- 4. Deploy updated api/olivia/contrast-images.ts
--
-- Created: 2026-02-12
-- ============================================================================
