-- ============================================================================
-- LIFE SCORE - User Videos Storage Migration
-- Date: 2026-02-11
--
-- Creates:
-- 1. Storage bucket 'user-videos' (public reads, RLS writes)
-- 2. RLS policies for upload/delete (users own their folder)
--
-- User-uploaded Court Order videos are stored at:
--   user-videos/{userId}/{comparisonId}-{timestamp}.mp4
--
-- The bucket is PUBLIC for reads so <video src="..."> works directly.
-- Writes are restricted by RLS to the user's own folder.
--
-- Run in Supabase SQL Editor or via CLI: supabase db push
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET (if not exists)
-- Note: You may also need to create this manually in Supabase Dashboard → Storage
--       Set "Public bucket" = true
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-videos',
  'user-videos',
  true,  -- Public reads (no RLS for SELECT)
  104857600,  -- 100MB file size limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

-- ============================================================================
-- 2. RLS POLICIES FOR STORAGE
-- ============================================================================

-- Users can upload videos to their own folder: user-videos/{userId}/*
CREATE POLICY "Users can upload own videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update/replace their own videos
CREATE POLICY "Users can update own videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own videos
CREATE POLICY "Users can delete own videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-videos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- 3. ADD video_storage_path COLUMN TO court_orders TABLE (if it exists)
-- This stores the Supabase Storage path for user-uploaded videos,
-- separate from video_url which holds external/generated video URLs.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'court_orders'
  ) THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'court_orders'
        AND column_name = 'video_storage_path'
    ) THEN
      ALTER TABLE public.court_orders
        ADD COLUMN video_storage_path TEXT;

      COMMENT ON COLUMN public.court_orders.video_storage_path IS
        'Supabase Storage path for user-uploaded videos (user-videos/{userId}/{file})';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
--
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify bucket exists in Dashboard → Storage → user-videos
-- 3. Verify "Public bucket" is enabled (for <video src> to work)
-- 4. Test by uploading a video from the Court Order screen
--
-- Created: 2026-02-11
-- ============================================================================
