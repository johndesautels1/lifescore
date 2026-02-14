-- ============================================================================
-- LIFE SCORE - Judge Videos Storage Migration
-- Date: 2026-02-14
--
-- Problem: Judge avatar videos were cached as Replicate CDN URLs which expire
-- after ~1 hour, but our avatar_videos cache has a 30-day TTL. Videos would
-- fail with MEDIA_ELEMENT_ERROR: Format error when loaded from expired URLs.
--
-- Fix: Download generated videos and store them permanently in Supabase
-- Storage. The avatar_videos table stores Supabase public URLs (which never
-- expire) instead of temporary Replicate delivery URLs.
--
-- Creates:
-- 1. Storage bucket 'judge-videos' (public reads, service-role writes)
-- 2. Adds video_storage_path column to avatar_videos for cleanup tracking
--
-- Run in Supabase SQL Editor or via CLI: supabase db push
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'judge-videos',
  'judge-videos',
  true,  -- Public reads (so <video src="..."> works directly)
  52428800,  -- 50MB file size limit (720p ~30s MP4 is typically 2-5MB)
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm'];

-- ============================================================================
-- 2. RLS POLICIES FOR STORAGE
-- Public reads (bucket is public), service-role only writes
-- ============================================================================

-- Drop existing policies if they exist (idempotent)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role can upload judge videos" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can update judge videos" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can delete judge videos" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Service role can upload judge videos
CREATE POLICY "Service role can upload judge videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'judge-videos'
    AND auth.role() = 'service_role'
  );

-- Service role can update judge videos (overwrite)
CREATE POLICY "Service role can update judge videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'judge-videos'
    AND auth.role() = 'service_role'
  );

-- Service role can delete judge videos (cleanup)
CREATE POLICY "Service role can delete judge videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'judge-videos'
    AND auth.role() = 'service_role'
  );

-- ============================================================================
-- 3. ADD STORAGE PATH COLUMN TO avatar_videos
-- Tracks the Supabase Storage path so we can clean up files when rows expire
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.avatar_videos
    ADD COLUMN IF NOT EXISTS video_storage_path TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add video_storage_path column: %', SQLERRM;
END $$;

-- ============================================================================
-- 4. UPDATE CLEANUP FUNCTION TO ALSO DELETE STORAGE OBJECTS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_videos()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
  expired_row RECORD;
BEGIN
  -- First delete storage objects for expired videos
  FOR expired_row IN
    SELECT video_storage_path
    FROM public.avatar_videos
    WHERE expires_at < NOW()
      AND video_storage_path IS NOT NULL
  LOOP
    BEGIN
      DELETE FROM storage.objects
      WHERE bucket_id = 'judge-videos'
        AND name = expired_row.video_storage_path;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail cleanup on individual file errors
      RAISE NOTICE 'Could not delete storage object: %', expired_row.video_storage_path;
    END;
  END LOOP;

  -- Then delete the expired rows
  DELETE FROM public.avatar_videos
  WHERE expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
