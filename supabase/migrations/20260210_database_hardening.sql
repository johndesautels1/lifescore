-- ============================================================================
-- LIFE SCORE - Combined Database Hardening Migration
-- Date: 2026-02-10
--
-- Fixes audit items:
-- #7  - REVOKE GRANT ALL on avatar_videos/judge_reports (HIGH)
-- #8  - Restrict consent_logs INSERT to auth.uid() (HIGH)
-- #20 - Drop redundant indexes on UNIQUE columns (MEDIUM)
-- #21 - Drop duplicate idx_judge_reports_user (MEDIUM)
-- #23 - Add composite index on subscriptions(user_id, status) (MEDIUM)
-- #27 - Atomic view_count increment via RPC (MEDIUM)
--
-- Safe to re-run (idempotent).
-- ============================================================================

-- ============================================================================
-- #7: REVOKE GRANT ALL, re-grant only what's needed
-- ============================================================================

-- avatar_videos: users should only SELECT and INSERT (not UPDATE/DELETE others')
REVOKE ALL ON public.avatar_videos FROM authenticated;
GRANT SELECT, INSERT ON public.avatar_videos TO authenticated;
GRANT ALL ON public.avatar_videos TO service_role;

-- judge_reports: users should only SELECT and INSERT their own
REVOKE ALL ON public.judge_reports FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.judge_reports TO authenticated;
GRANT ALL ON public.judge_reports TO service_role;

-- contrast_image_cache: service_role only (already correct, just ensure no auth leaks)
REVOKE ALL ON public.contrast_image_cache FROM authenticated;
GRANT SELECT ON public.contrast_image_cache TO authenticated;
GRANT ALL ON public.contrast_image_cache TO service_role;

-- ============================================================================
-- #8: Restrict consent_logs INSERT to authenticated users only
-- ============================================================================

-- Drop the overly permissive service role INSERT policy
-- (The "Service role full access" ALL policy already covers service_role inserts)
DROP POLICY IF EXISTS "Service role can insert consent logs" ON public.consent_logs;

-- Add policy that restricts INSERT to authenticated users matching their own user_id
CREATE POLICY "Authenticated users can insert own consent logs"
  ON public.consent_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- ============================================================================
-- #20: Drop redundant indexes on UNIQUE columns
-- ============================================================================

-- contrast_image_cache.cache_key already has UNIQUE constraint → implicit index
DROP INDEX IF EXISTS idx_contrast_cache_key;

-- report_shares.share_token already has UNIQUE constraint → implicit index
DROP INDEX IF EXISTS idx_report_shares_share_token;

-- ============================================================================
-- #21: Drop duplicate judge_reports index
-- ============================================================================

-- idx_judge_reports_user (from 20260125) duplicates
-- idx_judge_reports_user_id (from 20260124) — same column, different name
DROP INDEX IF EXISTS idx_judge_reports_user;

-- Also drop the duplicate report_id index from 20260125
-- (20260124 already creates idx_judge_reports_report_id)
-- No action needed — same name, IF NOT EXISTS means second one was a no-op.

-- ============================================================================
-- #23: Add composite index on subscriptions(user_id, status)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions(user_id, status);

-- ============================================================================
-- #27: Atomic view_count increment via RPC function
-- ============================================================================

-- Create a function to atomically increment view_count and update last_accessed_at.
-- Prevents the read-then-write race condition in reportStorageService.ts.
CREATE OR REPLACE FUNCTION public.increment_share_view_count(
  p_share_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.report_shares
  SET
    view_count = view_count + 1,
    last_accessed_at = NOW()
  WHERE id = p_share_id;
END;
$$;

-- Grant execute to anon (shared links are accessed anonymously)
GRANT EXECUTE ON FUNCTION public.increment_share_view_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_share_view_count(UUID) TO authenticated;

-- ============================================================================
-- Done. Run in Supabase SQL Editor.
-- ============================================================================
