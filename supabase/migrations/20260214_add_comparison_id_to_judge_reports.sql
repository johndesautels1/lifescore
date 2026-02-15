-- ============================================================================
-- LIFE SCORE - Add comparison_id column to judge_reports
--
-- The judge_reports table (created by 20260125) was missing comparison_id.
-- This column links judge reports to their source comparisons, enabling
-- Supabase fallback lookups when localStorage has no matching report.
--
-- Run in Supabase SQL Editor.
-- Clues Intelligence LTD © 2025-2026
-- ============================================================================

-- Add comparison_id column (nullable — existing rows won't have it)
ALTER TABLE public.judge_reports
  ADD COLUMN IF NOT EXISTS comparison_id TEXT;

-- Index for fast lookups by comparison_id
CREATE INDEX IF NOT EXISTS idx_judge_reports_comparison_id
  ON public.judge_reports(comparison_id);

-- Backfill comparison_id from full_report JSONB for existing rows
UPDATE public.judge_reports
  SET comparison_id = full_report->>'comparisonId'
  WHERE comparison_id IS NULL
    AND full_report IS NOT NULL
    AND full_report->>'comparisonId' IS NOT NULL;
