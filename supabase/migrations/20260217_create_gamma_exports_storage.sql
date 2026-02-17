-- ============================================================================
-- LIFE SCORE - Gamma Exports Storage Bucket
-- Date: 2026-02-17
--
-- Problem: The 'reports' bucket is PRIVATE (RLS-controlled, user-folder scoped).
-- Gamma export files (PDF/PPTX) are uploaded by service_role to
-- 'gamma-exports/{generationId}.{format}' — outside any user folder.
-- getPublicUrl() only works on PUBLIC buckets; private bucket public URLs
-- return 400/403 for unauthenticated access.
--
-- Fix: Create a dedicated PUBLIC bucket 'gamma-exports' (same pattern as
-- judge-videos, court-order-videos, contrast-images). Service role writes,
-- anyone can read via public URL. Content is immutable per generationId.
-- ============================================================================

-- 1. Create the 'gamma-exports' public bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gamma-exports',
  'gamma-exports',
  true,                          -- Public read access (same as judge-videos, etc.)
  52428800,                      -- 50 MB limit (generous for PDF/PPTX reports)
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

-- 2. Storage RLS policies (service_role only for writes — same pattern as court-order-videos)

-- Service role can upload gamma exports
CREATE POLICY "Service role can upload gamma exports" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'gamma-exports' AND
    (SELECT auth.role()) = 'service_role'
  );

-- Service role can update gamma exports (overwrite on re-generation)
CREATE POLICY "Service role can update gamma exports" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'gamma-exports' AND
    (SELECT auth.role()) = 'service_role'
  );

-- Service role can delete gamma exports (cleanup)
CREATE POLICY "Service role can delete gamma exports" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'gamma-exports' AND
    (SELECT auth.role()) = 'service_role'
  );

-- ============================================================================
-- NOTES
-- ============================================================================
-- - Public bucket: getPublicUrl() works for unauthenticated downloads
-- - Service role: SUPABASE_SERVICE_ROLE_KEY bypasses RLS entirely for writes
--   (the policies above are defense-in-depth, not technically required)
-- - Content is immutable: each generationId produces one PDF/PPTX, cached 1 year
-- - File pattern: {generationId}.pdf or {generationId}.pptx
-- ============================================================================
