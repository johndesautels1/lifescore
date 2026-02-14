-- ============================================================================
-- LIFE SCORE - Court Order Videos Storage Migration
-- Date: 2026-02-14
--
-- Problem: Court Order videos (grok_videos table) were cached as temporary
-- provider CDN URLs (Kling, Replicate) which expire after hours. When a user
-- revisited the judge page, videos would fail with broken video elements.
-- The same expiring-URL flaw that was fixed for Judge Verdict videos
-- (avatar_videos → judge-videos bucket) also affects Court Order videos.
--
-- Fix: Download generated videos and store them permanently in Supabase
-- Storage. The grok_videos table stores Supabase public URLs (which never
-- expire) instead of temporary provider delivery URLs.
--
-- Creates:
-- 1. Storage bucket 'court-order-videos' (public reads, service-role writes)
-- 2. Adds video_storage_path column to grok_videos for cleanup tracking
--
-- Mirrors: 20260214_create_judge_videos_storage.sql (same pattern)
--
-- Run in Supabase SQL Editor or via CLI: supabase db push
-- ============================================================================

-- ============================================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'court-order-videos',
  'court-order-videos',
  true,  -- Public reads (so <video src="..."> works directly)
  52428800,  -- 50MB file size limit (10s Kling videos are typically 2-8MB)
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
  DROP POLICY IF EXISTS "Service role can upload court order videos" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can update court order videos" ON storage.objects;
  DROP POLICY IF EXISTS "Service role can delete court order videos" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Service role can upload court order videos
CREATE POLICY "Service role can upload court order videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'court-order-videos'
    AND auth.role() = 'service_role'
  );

-- Service role can update court order videos (overwrite)
CREATE POLICY "Service role can update court order videos"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'court-order-videos'
    AND auth.role() = 'service_role'
  );

-- Service role can delete court order videos (cleanup)
CREATE POLICY "Service role can delete court order videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'court-order-videos'
    AND auth.role() = 'service_role'
  );

-- ============================================================================
-- 3. ADD STORAGE PATH COLUMN TO grok_videos
-- Tracks the Supabase Storage path so we can clean up files when rows expire
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.grok_videos
    ADD COLUMN IF NOT EXISTS video_storage_path TEXT;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add video_storage_path column: %', SQLERRM;
END $$;

COMMENT ON COLUMN public.grok_videos.video_storage_path IS
  'Supabase Storage path for permanently persisted video (court-order-videos bucket)';

-- ============================================================================
-- 4. ADD PROVIDER 'kling' TO CHECK CONSTRAINT (if not already present)
-- The original migration only allowed 'grok' and 'replicate', but Kling
-- is now the primary provider.
-- ============================================================================

DO $$ BEGIN
  ALTER TABLE public.grok_videos
    DROP CONSTRAINT IF EXISTS grok_videos_provider_check;
  ALTER TABLE public.grok_videos
    ADD CONSTRAINT grok_videos_provider_check
    CHECK (provider IN ('grok', 'replicate', 'kling'));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update provider constraint: %', SQLERRM;
END $$;
