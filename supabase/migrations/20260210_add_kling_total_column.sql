-- ============================================================================
-- LIFE SCORE - Add kling_total column to api_cost_records
-- Date: 2026-02-10
--
-- The application sends kling_total in cost record upserts but the column
-- doesn't exist, causing every upsert to fail with HTTP 400.
--
-- Also updates the summary functions to include kling_total.
-- ============================================================================

-- Add the missing column
ALTER TABLE public.api_cost_records
  ADD COLUMN IF NOT EXISTS kling_total DECIMAL(10, 6) DEFAULT 0;

-- ============================================================================
-- Update the summary functions to include kling_total
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_cost_summary(p_user_id UUID)
RETURNS TABLE (
  total_records BIGINT,
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
  avatar_total DECIMAL,
  kling_total DECIMAL,
  grand_total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_records,
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
    COALESCE(SUM(acr.avatar_total), 0)::DECIMAL as avatar_total,
    COALESCE(SUM(acr.kling_total), 0)::DECIMAL as kling_total,
    COALESCE(SUM(acr.grand_total), 0)::DECIMAL as grand_total
  FROM public.api_cost_records acr
  WHERE acr.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_cost_summary_by_date(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_records BIGINT,
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
  avatar_total DECIMAL,
  kling_total DECIMAL,
  grand_total DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_records,
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
    COALESCE(SUM(acr.avatar_total), 0)::DECIMAL as avatar_total,
    COALESCE(SUM(acr.kling_total), 0)::DECIMAL as kling_total,
    COALESCE(SUM(acr.grand_total), 0)::DECIMAL as grand_total
  FROM public.api_cost_records acr
  WHERE acr.user_id = p_user_id
    AND acr.created_at >= p_start_date
    AND acr.created_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Done. Run in Supabase SQL Editor.
-- ============================================================================
