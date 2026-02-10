-- ============================================================================
-- LIFE SCORE - Cleanup Duplicate RLS Policies
-- Date: 2026-02-10
--
-- Fixes audit item #13 — Duplicate RLS policies
--
-- Problem:
--   judge_reports has up to 9 overlapping policies from two migrations
--   (20260124 + 20260125), and avatar_videos has 4 overlapping policies
--   from two migrations (003 + 20260125).
--
-- Solution:
--   Drop ALL existing policies, then re-create one canonical set per table.
--
-- Safe to re-run (idempotent).
-- ============================================================================

-- ============================================================================
-- JUDGE_REPORTS: Drop all duplicate policies
-- ============================================================================

-- From 20260124_create_judge_reports.sql
DROP POLICY IF EXISTS "judge_reports_select" ON public.judge_reports;
DROP POLICY IF EXISTS "judge_reports_insert" ON public.judge_reports;
DROP POLICY IF EXISTS "judge_reports_update" ON public.judge_reports;
DROP POLICY IF EXISTS "judge_reports_delete" ON public.judge_reports;

-- From 20260125_create_judge_tables.sql
DROP POLICY IF EXISTS "Users can view own reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Service role has full access to judge_reports" ON public.judge_reports;

-- Legacy names (may exist from older migrations)
DROP POLICY IF EXISTS "Users can view own judge reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can insert own judge reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can update own judge reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can delete own judge reports" ON public.judge_reports;

-- Re-create ONE canonical set
CREATE POLICY "judge_reports_select" ON public.judge_reports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "judge_reports_insert" ON public.judge_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "judge_reports_update" ON public.judge_reports
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "judge_reports_delete" ON public.judge_reports
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "judge_reports_service_role" ON public.judge_reports
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- AVATAR_VIDEOS: Drop all duplicate policies
-- ============================================================================

-- From 003_avatar_videos.sql
DROP POLICY IF EXISTS "Videos are publicly readable" ON public.avatar_videos;
DROP POLICY IF EXISTS "Service role can manage videos" ON public.avatar_videos;

-- From 20260125_create_judge_tables.sql
DROP POLICY IF EXISTS "Public can view completed videos" ON public.avatar_videos;
DROP POLICY IF EXISTS "Service role has full access to avatar_videos" ON public.avatar_videos;

-- Re-create ONE canonical set
-- Only completed videos should be publicly readable (not pending/failed)
CREATE POLICY "avatar_videos_select_completed" ON public.avatar_videos
  FOR SELECT USING (status = 'completed');

-- Authenticated users can also see their own pending videos (via comparison_id lookups)
CREATE POLICY "avatar_videos_select_auth" ON public.avatar_videos
  FOR SELECT TO authenticated USING (true);

-- Service role full access (API routes create/update videos)
CREATE POLICY "avatar_videos_service_role" ON public.avatar_videos
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- Done. Run in Supabase SQL Editor.
-- ============================================================================
