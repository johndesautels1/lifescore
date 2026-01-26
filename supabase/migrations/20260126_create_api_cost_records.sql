-- ============================================================================
-- LIFE SCORE - API Cost Tracking
-- Migration: 20260126_create_api_cost_records.sql
-- Date: 2026-01-26
--
-- Tracks API costs per comparison for monitoring and profitability analysis.
-- Stores detailed breakdown of costs by provider (LLMs, TTS, Avatar, etc.)
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- API COST RECORDS TABLE
-- Stores cost breakdown for each comparison run
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_cost_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  comparison_id TEXT NOT NULL,

  -- City information
  city1_name TEXT NOT NULL,
  city2_name TEXT NOT NULL,

  -- Comparison mode
  mode TEXT NOT NULL CHECK (mode IN ('simple', 'enhanced')),

  -- Cost totals by provider (in USD)
  tavily_total DECIMAL(10, 6) DEFAULT 0,
  claude_sonnet_total DECIMAL(10, 6) DEFAULT 0,
  gpt4o_total DECIMAL(10, 6) DEFAULT 0,
  gemini_total DECIMAL(10, 6) DEFAULT 0,
  grok_total DECIMAL(10, 6) DEFAULT 0,
  perplexity_total DECIMAL(10, 6) DEFAULT 0,
  opus_judge_total DECIMAL(10, 6) DEFAULT 0,
  gamma_total DECIMAL(10, 6) DEFAULT 0,
  olivia_total DECIMAL(10, 6) DEFAULT 0,
  tts_total DECIMAL(10, 6) DEFAULT 0,
  avatar_total DECIMAL(10, 6) DEFAULT 0,
  grand_total DECIMAL(10, 6) DEFAULT 0,

  -- Full breakdown JSON for detailed view
  cost_breakdown JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user per comparison
  UNIQUE(user_id, comparison_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.api_cost_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own cost records
CREATE POLICY "Users can view own cost records"
  ON public.api_cost_records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own cost records
CREATE POLICY "Users can insert own cost records"
  ON public.api_cost_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cost records
CREATE POLICY "Users can update own cost records"
  ON public.api_cost_records FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own cost records
CREATE POLICY "Users can delete own cost records"
  ON public.api_cost_records FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all records (for admin/analytics)
CREATE POLICY "Service role can manage all cost records"
  ON public.api_cost_records FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup by user
CREATE INDEX IF NOT EXISTS idx_api_cost_records_user_id
  ON public.api_cost_records(user_id);

-- Lookup by comparison
CREATE INDEX IF NOT EXISTS idx_api_cost_records_comparison
  ON public.api_cost_records(user_id, comparison_id);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_api_cost_records_created
  ON public.api_cost_records(user_id, created_at DESC);

-- Filter by mode
CREATE INDEX IF NOT EXISTS idx_api_cost_records_mode
  ON public.api_cost_records(user_id, mode);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_api_cost_records_updated_at
  BEFORE UPDATE ON public.api_cost_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get cost summary for a user
CREATE OR REPLACE FUNCTION get_user_cost_summary(p_user_id UUID)
RETURNS TABLE (
  total_records BIGINT,
  grand_total DECIMAL,
  tavily_total DECIMAL,
  claude_sonnet_total DECIMAL,
  gpt4o_total DECIMAL,
  gemini_total DECIMAL,
  grok_total DECIMAL,
  perplexity_total DECIMAL,
  opus_judge_total DECIMAL,
  gamma_total DECIMAL,
  olivia_total DECIMAL,
  tts_total DECIMAL,
  avatar_total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_records,
    COALESCE(SUM(acr.grand_total), 0)::DECIMAL as grand_total,
    COALESCE(SUM(acr.tavily_total), 0)::DECIMAL as tavily_total,
    COALESCE(SUM(acr.claude_sonnet_total), 0)::DECIMAL as claude_sonnet_total,
    COALESCE(SUM(acr.gpt4o_total), 0)::DECIMAL as gpt4o_total,
    COALESCE(SUM(acr.gemini_total), 0)::DECIMAL as gemini_total,
    COALESCE(SUM(acr.grok_total), 0)::DECIMAL as grok_total,
    COALESCE(SUM(acr.perplexity_total), 0)::DECIMAL as perplexity_total,
    COALESCE(SUM(acr.opus_judge_total), 0)::DECIMAL as opus_judge_total,
    COALESCE(SUM(acr.gamma_total), 0)::DECIMAL as gamma_total,
    COALESCE(SUM(acr.olivia_total), 0)::DECIMAL as olivia_total,
    COALESCE(SUM(acr.tts_total), 0)::DECIMAL as tts_total,
    COALESCE(SUM(acr.avatar_total), 0)::DECIMAL as avatar_total
  FROM public.api_cost_records acr
  WHERE acr.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get cost summary for a date range
CREATE OR REPLACE FUNCTION get_user_cost_summary_by_date(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_records BIGINT,
  grand_total DECIMAL,
  tavily_total DECIMAL,
  claude_sonnet_total DECIMAL,
  gpt4o_total DECIMAL,
  gemini_total DECIMAL,
  grok_total DECIMAL,
  perplexity_total DECIMAL,
  opus_judge_total DECIMAL,
  gamma_total DECIMAL,
  olivia_total DECIMAL,
  tts_total DECIMAL,
  avatar_total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_records,
    COALESCE(SUM(acr.grand_total), 0)::DECIMAL as grand_total,
    COALESCE(SUM(acr.tavily_total), 0)::DECIMAL as tavily_total,
    COALESCE(SUM(acr.claude_sonnet_total), 0)::DECIMAL as claude_sonnet_total,
    COALESCE(SUM(acr.gpt4o_total), 0)::DECIMAL as gpt4o_total,
    COALESCE(SUM(acr.gemini_total), 0)::DECIMAL as gemini_total,
    COALESCE(SUM(acr.grok_total), 0)::DECIMAL as grok_total,
    COALESCE(SUM(acr.perplexity_total), 0)::DECIMAL as perplexity_total,
    COALESCE(SUM(acr.opus_judge_total), 0)::DECIMAL as opus_judge_total,
    COALESCE(SUM(acr.gamma_total), 0)::DECIMAL as gamma_total,
    COALESCE(SUM(acr.olivia_total), 0)::DECIMAL as olivia_total,
    COALESCE(SUM(acr.tts_total), 0)::DECIMAL as tts_total,
    COALESCE(SUM(acr.avatar_total), 0)::DECIMAL as avatar_total
  FROM public.api_cost_records acr
  WHERE acr.user_id = p_user_id
    AND acr.created_at >= p_start_date
    AND acr.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.api_cost_records IS 'API cost tracking for each comparison - monitors spend by provider';
COMMENT ON COLUMN public.api_cost_records.cost_breakdown IS 'Full JSON breakdown with token counts and detailed cost data';
COMMENT ON FUNCTION get_user_cost_summary IS 'Aggregates total API costs for a user across all providers';
COMMENT ON FUNCTION get_user_cost_summary_by_date IS 'Aggregates API costs for a user within a date range';
