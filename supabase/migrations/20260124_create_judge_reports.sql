-- ============================================================================
-- LIFE SCORE Judge Reports Table
-- Supabase PostgreSQL Migration
--
-- Run this in Supabase SQL Editor or via CLI:
-- supabase db push
--
-- Created: 2026-01-24
-- Updated: 2026-02-08 - Fixed foreign key references and nullable columns
-- Purpose: Store Claude Opus 4.5 Judge verdicts with full analysis
-- ============================================================================

-- ============================================================================
-- JUDGE REPORTS (The Judge's comprehensive verdicts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.judge_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id TEXT NOT NULL UNIQUE,
  city1_name TEXT NOT NULL,
  city2_name TEXT NOT NULL,
  city1_score NUMERIC(5,2),
  city1_trend TEXT CHECK (city1_trend IN ('rising', 'stable', 'declining')),
  city2_score NUMERIC(5,2),
  city2_trend TEXT CHECK (city2_trend IN ('rising', 'stable', 'declining')),
  overall_confidence TEXT CHECK (overall_confidence IN ('high', 'medium', 'low')),
  recommendation TEXT CHECK (recommendation IN ('city1', 'city2', 'tie')),
  rationale TEXT,
  key_factors JSONB DEFAULT '[]'::jsonb,
  future_outlook TEXT,
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  category_analysis JSONB DEFAULT '[]'::jsonb,
  full_report JSONB NOT NULL,
  video_url TEXT,
  video_status TEXT DEFAULT 'pending' CHECK (video_status IN ('pending', 'generating', 'ready', 'error')),
  comparison_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Users can only see their own reports
-- ============================================================================

ALTER TABLE public.judge_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for clean re-runs)
DROP POLICY IF EXISTS "judge_reports_select" ON public.judge_reports;
DROP POLICY IF EXISTS "judge_reports_insert" ON public.judge_reports;
DROP POLICY IF EXISTS "judge_reports_update" ON public.judge_reports;
DROP POLICY IF EXISTS "judge_reports_delete" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can view own judge reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can insert own judge reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can update own judge reports" ON public.judge_reports;
DROP POLICY IF EXISTS "Users can delete own judge reports" ON public.judge_reports;

-- Create RLS policies
CREATE POLICY "judge_reports_select" ON public.judge_reports
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "judge_reports_insert" ON public.judge_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "judge_reports_update" ON public.judge_reports
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "judge_reports_delete" ON public.judge_reports
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- INDEXES (for query performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_judge_reports_user_id ON public.judge_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_judge_reports_report_id ON public.judge_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_judge_reports_created_at ON public.judge_reports(created_at DESC);

-- ============================================================================
-- COMMENTS (documentation)
-- ============================================================================

COMMENT ON TABLE public.judge_reports IS 'Claude Opus 4.5 Judge verdicts with comprehensive freedom analysis';
COMMENT ON COLUMN public.judge_reports.full_report IS 'Complete JudgeReport JSON object - primary data source';
