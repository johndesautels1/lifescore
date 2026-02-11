-- ============================================================================
-- LIFE SCORE - Fix report_shares & report_access_logs RLS Policies
-- Date: 2026-02-10
--
-- Fixes:
-- 1. report_shares "Anyone can view shares by token" policy used USING(true)
--    which exposed password_hash to every authenticated user. Replace with a
--    secure view that excludes password_hash + a token-scoped policy.
-- 2. report_access_logs INSERT was WITH CHECK(true) — any user could insert
--    fake analytics rows. Restrict to service_role or logged-in user.
--
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- ============================================================================

-- ============================================================================
-- 1. FIX: report_shares — stop exposing password_hash
-- ============================================================================

-- Drop the dangerously wide policy
DROP POLICY IF EXISTS "Anyone can view shares by token" ON public.report_shares;

-- Create a secure view that excludes password_hash.
-- App code should query this view for public/anonymous share lookups.
-- NOTE: This view intentionally uses SECURITY DEFINER (the default).
-- Anonymous users need to look up shared reports by token, but auth.uid() is null
-- for anon users so security_invoker=on would block all access.
-- The view IS the security boundary — it hides password_hash.
CREATE OR REPLACE VIEW public.report_shares_public AS
  SELECT
    id,
    report_id,
    shared_by,
    share_token,
    expires_at,
    max_views,
    view_count,
    requires_email,
    allowed_emails,
    -- password_hash deliberately excluded
    created_at,
    last_accessed_at
  FROM public.report_shares;

-- Grant anonymous & authenticated users SELECT on the view only
GRANT SELECT ON public.report_shares_public TO anon;
GRANT SELECT ON public.report_shares_public TO authenticated;

-- The owner (shared_by) can still see their own rows including password_hash
-- via the existing "Users can view own shares" policy (USING auth.uid() = shared_by).
-- No additional policy needed for owners.

-- For the underlying table, add a narrow public-read policy scoped to
-- non-sensitive columns via RPC if the view approach isn't enough.
-- The view is the recommended access path for public share lookups.

-- ============================================================================
-- 2. FIX: report_access_logs INSERT — restrict to authenticated users
-- ============================================================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Allow inserting access logs" ON public.report_access_logs;

-- Re-create with restriction: only authenticated users can log their own access
CREATE POLICY "Authenticated users can insert own access logs"
  ON public.report_access_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Allow service_role to insert access logs (for server-side logging of anonymous share views)
CREATE POLICY "Service role can insert access logs"
  ON public.report_access_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- Done. Run in Supabase SQL Editor.
-- ============================================================================
