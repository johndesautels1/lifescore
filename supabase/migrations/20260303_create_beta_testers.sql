-- ============================================================================
-- LIFE SCORE - Beta Testers Table
-- Migration: 20260303_create_beta_testers.sql
-- Date: 2026-03-03
--
-- Beta testers bypass payment but have granular feature access controls.
-- They are NOT admins — they get a custom access profile between free and paid.
--
-- Access summary:
--   - Payment: bypassed
--   - Simple search: 1/month (can purchase more)
--   - Enhanced search: 1/month (can purchase more)
--   - Report ordering: yes
--   - Ask Emeilia: customer service/manual/help modal only, can chat
--   - Ask Olivia: unlimited (chat + page info video + chat)
--   - Visuals: video presenter + live presenter full access
--   - Judges: full access all features
--   - Admin: NO
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- BETA TESTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.beta_testers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Payment bypass
  payment_bypass BOOLEAN DEFAULT true,

  -- Search limits (per month — uses existing usage_tracking for counting)
  standard_comparisons_limit INTEGER DEFAULT 1,
  enhanced_comparisons_limit INTEGER DEFAULT 1,

  -- Feature access flags
  report_ordering BOOLEAN DEFAULT true,
  ask_emeilia_customer_service BOOLEAN DEFAULT true,
  ask_emeilia_other_categories BOOLEAN DEFAULT false,
  ask_emeilia_chat BOOLEAN DEFAULT true,
  ask_olivia_chat_unlimited BOOLEAN DEFAULT true,
  ask_olivia_page_info_unlimited BOOLEAN DEFAULT true,
  visuals_video_presenter BOOLEAN DEFAULT true,
  visuals_live_presenter BOOLEAN DEFAULT true,
  judges_full_access BOOLEAN DEFAULT true,
  is_admin BOOLEAN DEFAULT false,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;

-- Service role can manage all beta testers (for API endpoint + admin)
CREATE POLICY "Service role can manage beta_testers"
  ON public.beta_testers FOR ALL
  USING (auth.role() = 'service_role');

-- Authenticated users can check their own beta status by email
CREATE POLICY "Users can view own beta status"
  ON public.beta_testers FOR SELECT
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup: email (case-insensitive for fast auth checks)
CREATE UNIQUE INDEX IF NOT EXISTS idx_beta_testers_email_lower
  ON public.beta_testers(lower(email));

-- Active beta testers (filtered index for the common query)
CREATE INDEX IF NOT EXISTS idx_beta_testers_active
  ON public.beta_testers(is_active)
  WHERE is_active = true;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
CREATE TRIGGER update_beta_testers_updated_at
  BEFORE UPDATE ON public.beta_testers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.beta_testers IS 'Beta test users with payment bypass and granular feature access controls';
COMMENT ON COLUMN public.beta_testers.standard_comparisons_limit IS 'Monthly limit for 1-LLM searches (uses usage_tracking counter)';
COMMENT ON COLUMN public.beta_testers.enhanced_comparisons_limit IS 'Monthly limit for 5-LLM searches (uses usage_tracking counter)';
COMMENT ON COLUMN public.beta_testers.ask_emeilia_customer_service IS 'Access to Emeilia customer service/manual/help modal only';
COMMENT ON COLUMN public.beta_testers.ask_emeilia_other_categories IS 'Access to other Emeilia help modal categories (disabled for beta)';
COMMENT ON COLUMN public.beta_testers.ask_emeilia_chat IS 'Can chat with Emeilia';
COMMENT ON COLUMN public.beta_testers.ask_olivia_chat_unlimited IS 'Unlimited Ask Olivia chat access';
COMMENT ON COLUMN public.beta_testers.ask_olivia_page_info_unlimited IS 'Unlimited Ask Olivia page info (video + chat)';
COMMENT ON COLUMN public.beta_testers.visuals_video_presenter IS 'Full access to video presenter on visuals page';
COMMENT ON COLUMN public.beta_testers.visuals_live_presenter IS 'Full access to live presenter on visuals page';
COMMENT ON COLUMN public.beta_testers.judges_full_access IS 'Full access to all features on judges page';
