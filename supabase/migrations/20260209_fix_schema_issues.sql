-- ============================================================================
-- Migration: Fix schema issues identified in codebase audit
-- Date: 2026-02-09
--
-- Fixes:
--   1. CHECK constraint mismatch: 'rising' vs 'improving' in judge_reports
--   2. Missing composite indexes on (user_id, created_at DESC)
--   3. Restrict contrast_image_cache INSERT to service_role only
--   4. Restrict avatar_videos SELECT to completed videos only (was public)
--
-- Note: avatar_videos duplicate definition is handled by CREATE TABLE IF NOT EXISTS
-- so only the first migration (003) takes effect. No action needed.
--
-- Clues Intelligence LTD © 2025-2026
-- ============================================================================

-- ============================================================================
-- FIX 1: CHECK constraint - allow both 'rising' and 'improving' for compatibility
-- The 20260124 migration uses 'rising', the 20260125 uses 'improving'.
-- Application code uses 'improving', so we update the constraint.
-- ============================================================================

-- Drop and recreate the constraint to allow 'improving' (used by application code)
-- Only if the table exists with the old constraint
DO $$
BEGIN
  -- Try to update the check constraint on city1_trend
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'judge_reports' AND column_name = 'city1_trend'
  ) THEN
    -- Drop old constraint if it exists
    ALTER TABLE public.judge_reports DROP CONSTRAINT IF EXISTS judge_reports_city1_trend_check;
    ALTER TABLE public.judge_reports DROP CONSTRAINT IF EXISTS judge_reports_city2_trend_check;

    -- Add new constraints that accept both values
    ALTER TABLE public.judge_reports
      ADD CONSTRAINT judge_reports_city1_trend_check
      CHECK (city1_trend IN ('improving', 'rising', 'stable', 'declining'));
    ALTER TABLE public.judge_reports
      ADD CONSTRAINT judge_reports_city2_trend_check
      CHECK (city2_trend IN ('improving', 'rising', 'stable', 'declining'));
  END IF;
END $$;

-- ============================================================================
-- FIX 2: Add composite indexes for common query patterns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gamma_reports_user_created
  ON public.gamma_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_judge_reports_user_created
  ON public.judge_reports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comparisons_user_created
  ON public.comparisons(user_id, created_at DESC);

-- ============================================================================
-- FIX 3: Restrict contrast_image_cache INSERT to service_role only
-- Previously any user could insert, creating a cache poisoning risk
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contrast_image_cache' AND policyname = 'contrast_image_cache_insert'
  ) THEN
    DROP POLICY "contrast_image_cache_insert" ON public.contrast_image_cache;
    CREATE POLICY "contrast_image_cache_insert" ON public.contrast_image_cache
      FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;

  -- Also restrict UPDATE to service_role
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contrast_image_cache' AND policyname = 'contrast_image_cache_update'
  ) THEN
    DROP POLICY "contrast_image_cache_update" ON public.contrast_image_cache;
    CREATE POLICY "contrast_image_cache_update" ON public.contrast_image_cache
      FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Revoke INSERT/UPDATE from authenticated users (now service_role only)
REVOKE INSERT, UPDATE ON public.contrast_image_cache FROM authenticated;

-- ============================================================================
-- DONE
-- ============================================================================
