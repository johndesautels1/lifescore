-- LIFE SCORE - Judge Tables Migration
-- Run this in Supabase SQL Editor to create required tables
--
-- NOTE: The judge_reports table is also defined in 20260124_create_judge_reports.sql
-- Both use CREATE TABLE IF NOT EXISTS so running either or both is safe.
-- This file (20260125) is the canonical version that also creates avatar_videos.
--
-- Tables created:
--   1. avatar_videos - Caches generated judge videos
--   2. judge_reports - Stores saved judge reports
--
-- Clues Intelligence LTD © 2025-2026

-- ============================================================================
-- AVATAR VIDEOS TABLE
-- Stores video generation jobs and cached results
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.avatar_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Comparison identification
  comparison_id TEXT NOT NULL,
  city1 TEXT NOT NULL,
  city2 TEXT NOT NULL,
  winner TEXT NOT NULL,
  winner_score NUMERIC,
  loser_score NUMERIC,

  -- Content
  script TEXT NOT NULL,
  audio_url TEXT,
  video_url TEXT,
  duration_seconds NUMERIC,

  -- Replicate tracking
  replicate_prediction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Indexes for cache lookups
  CONSTRAINT unique_comparison_id UNIQUE (comparison_id)
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_avatar_videos_status ON public.avatar_videos(status);

-- Index for replicate ID lookups (webhook)
CREATE INDEX IF NOT EXISTS idx_avatar_videos_replicate_id ON public.avatar_videos(replicate_prediction_id);

-- Enable RLS
ALTER TABLE public.avatar_videos ENABLE ROW LEVEL SECURITY;

-- Allow public read access for cached videos
CREATE POLICY "Public can view completed videos"
  ON public.avatar_videos
  FOR SELECT
  USING (status = 'completed');

-- Allow service role full access
CREATE POLICY "Service role has full access to avatar_videos"
  ON public.avatar_videos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- JUDGE REPORTS TABLE
-- Stores saved judge analysis reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.judge_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User association
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Report identification
  report_id TEXT NOT NULL,

  -- Cities compared
  city1 TEXT NOT NULL,
  city2 TEXT NOT NULL,

  -- Scores and trends
  city1_score NUMERIC,
  city1_trend TEXT CHECK (city1_trend IN ('improving', 'stable', 'declining')),
  city2_score NUMERIC,
  city2_trend TEXT CHECK (city2_trend IN ('improving', 'stable', 'declining')),

  -- Winner info
  winner TEXT,
  winner_score NUMERIC,
  margin NUMERIC,

  -- Report content (JSON)
  key_findings JSONB,
  category_analysis JSONB,
  verdict TEXT,

  -- Full report data (for offline access)
  full_report JSONB,

  -- Video association
  video_id UUID REFERENCES public.avatar_videos(id) ON DELETE SET NULL,
  video_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate reports
  CONSTRAINT unique_user_report UNIQUE (user_id, report_id)
);

-- Index for user's reports
CREATE INDEX IF NOT EXISTS idx_judge_reports_user ON public.judge_reports(user_id);

-- Index for report lookups
CREATE INDEX IF NOT EXISTS idx_judge_reports_report_id ON public.judge_reports(report_id);

-- Enable RLS
ALTER TABLE public.judge_reports ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reports
CREATE POLICY "Users can view own reports"
  ON public.judge_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
  ON public.judge_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
  ON public.judge_reports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
  ON public.judge_reports
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to judge_reports"
  ON public.judge_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UPDATE TRIGGER for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_judge_reports_updated_at
  BEFORE UPDATE ON public.judge_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.avatar_videos TO authenticated;
GRANT ALL ON public.avatar_videos TO service_role;
GRANT SELECT ON public.avatar_videos TO anon;

GRANT ALL ON public.judge_reports TO authenticated;
GRANT ALL ON public.judge_reports TO service_role;

-- ============================================================================
-- DONE! Tables created successfully.
-- ============================================================================
