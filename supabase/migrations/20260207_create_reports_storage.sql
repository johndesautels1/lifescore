-- ============================================================================
-- LIFE SCORE - Reports Storage Migration
-- Session 16: Supabase Database Architecture Upgrade
-- Date: 2026-02-07
--
-- This migration creates:
-- 1. reports table (replaces/upgrades gamma_reports)
-- 2. report_access_logs table (analytics)
-- 3. report_shares table (sharing system)
-- 4. Storage bucket policies for 'reports' bucket
--
-- Run this in Supabase SQL Editor or via CLI:
-- supabase db push
-- ============================================================================

-- ============================================================================
-- 1. REPORTS TABLE (Enhanced storage for Gamma reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Report metadata
  report_type TEXT DEFAULT 'enhanced' CHECK (report_type IN ('standard', 'enhanced')),
  version TEXT DEFAULT 'v4.0',

  -- Cities compared
  city1_name TEXT NOT NULL,
  city1_country TEXT NOT NULL,
  city2_name TEXT NOT NULL,
  city2_country TEXT NOT NULL,

  -- Results
  winner TEXT NOT NULL,
  winner_score INTEGER NOT NULL,
  loser_score INTEGER NOT NULL,
  score_difference INTEGER NOT NULL,

  -- Storage references
  gamma_doc_id TEXT,               -- Gamma's document ID
  gamma_url TEXT,                  -- Public Gamma URL (may expire)
  pdf_url TEXT,                    -- PDF export URL
  html_storage_path TEXT,          -- Path in Supabase Storage (permanent)

  -- Status tracking
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  generation_started_at TIMESTAMPTZ DEFAULT NOW(),
  generation_completed_at TIMESTAMPTZ,
  generation_duration_seconds INTEGER,

  -- Report metrics
  page_count INTEGER,
  total_metrics INTEGER DEFAULT 100,
  llm_consensus_confidence INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'),

  -- Validation
  CONSTRAINT valid_scores CHECK (
    winner_score >= 0 AND winner_score <= 100 AND
    loser_score >= 0 AND loser_score <= 100
  )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_cities ON public.reports(city1_name, city2_name);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON public.reports(report_type);

-- ============================================================================
-- 2. REPORT ACCESS LOGS TABLE (Analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),  -- Can be null for anonymous/shared access

  -- Access details
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_type TEXT CHECK (access_type IN ('view', 'download', 'share', 'embed')),
  ip_address INET,
  user_agent TEXT,

  -- Optional context
  referrer TEXT,
  share_token TEXT  -- If accessed via shared link
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_report_access_logs_report_id ON public.report_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_user_id ON public.report_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_accessed_at ON public.report_access_logs(accessed_at DESC);

-- ============================================================================
-- 3. REPORT SHARES TABLE (Sharing System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.report_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id),

  -- Share settings
  share_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,           -- null = never expires
  max_views INTEGER,                -- null = unlimited views
  view_count INTEGER DEFAULT 0,

  -- Access control
  requires_email BOOLEAN DEFAULT false,
  allowed_emails TEXT[],            -- If requires_email is true
  password_hash TEXT,               -- Optional password protection

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON public.report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_share_token ON public.report_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_shared_by ON public.report_shares(shared_by);

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Reports policies
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON public.reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON public.reports
  FOR DELETE USING (auth.uid() = user_id);

-- Report access logs policies (users can see logs for their own reports)
CREATE POLICY "Users can view own report logs" ON public.report_access_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_access_logs.report_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow inserting access logs" ON public.report_access_logs
  FOR INSERT WITH CHECK (true);  -- Allow all inserts for logging

-- Report shares policies
CREATE POLICY "Users can view own shares" ON public.report_shares
  FOR SELECT USING (auth.uid() = shared_by);

CREATE POLICY "Users can create shares for own reports" ON public.report_shares
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_shares.report_id
      AND reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shares" ON public.report_shares
  FOR UPDATE USING (auth.uid() = shared_by);

CREATE POLICY "Users can delete own shares" ON public.report_shares
  FOR DELETE USING (auth.uid() = shared_by);

-- Allow anonymous users to view shares by token (for shared link access)
CREATE POLICY "Anyone can view shares by token" ON public.report_shares
  FOR SELECT USING (true);

-- ============================================================================
-- 5. STORAGE BUCKET POLICIES
-- Note: Create the 'reports' bucket manually in Supabase Dashboard → Storage
-- Then run these policies in SQL Editor
-- ============================================================================

-- Storage policies for 'reports' bucket
-- Users can upload to their own folder
CREATE POLICY "Users can upload own reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own reports
CREATE POLICY "Users can view own report files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own reports
CREATE POLICY "Users can delete own report files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- 6. HELPER FUNCTION: Update timestamps
-- ============================================================================

-- Auto-update updated_at on reports
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reports_timestamp
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- ============================================================================
-- 7. MIGRATION: Copy existing gamma_reports (if needed)
-- ============================================================================

-- Uncomment this section if you want to migrate existing gamma_reports data
/*
INSERT INTO public.reports (
  user_id,
  report_type,
  gamma_url,
  pdf_url,
  status,
  created_at,
  city1_name,
  city1_country,
  city2_name,
  city2_country,
  winner,
  winner_score,
  loser_score,
  score_difference
)
SELECT
  gr.user_id,
  'standard',  -- Assume old reports are standard
  gr.gamma_url,
  gr.pdf_url,
  'completed',
  gr.created_at,
  -- These need to be populated from comparisons table
  c.city1_name,
  c.city1_country,
  c.city2_name,
  c.city2_country,
  c.winner,
  COALESCE(c.city1_score, 0)::INTEGER,
  COALESCE(c.city2_score, 0)::INTEGER,
  COALESCE(c.score_difference, 0)::INTEGER
FROM public.gamma_reports gr
LEFT JOIN public.comparisons c ON c.comparison_id = gr.comparison_id
WHERE gr.user_id IS NOT NULL;
*/

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
--
-- 1. Run this migration in Supabase SQL Editor
-- 2. Create storage bucket manually:
--    - Go to Storage in Supabase Dashboard
--    - Create new bucket named "reports"
--    - Set to private (RLS controlled)
-- 3. Test by generating a new report
--
-- Created: Session 16 - 2026-02-07
-- ============================================================================
