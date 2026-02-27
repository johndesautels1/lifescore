-- ============================================================================
-- LIFE SCORE - API Quota Settings & Alerts
-- Migration: 20260130_create_api_quota_settings.sql
-- Date: 2026-01-30
--
-- Admin-configurable monthly quotas for all API providers
-- Tracks usage limits and sends email alerts when approaching limits
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- API QUOTA SETTINGS TABLE
-- Admin-configurable monthly limits for each provider
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_quota_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Provider identification
  provider_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT DEFAULT '📊',

  -- Quota configuration
  quota_type TEXT NOT NULL CHECK (quota_type IN ('dollars', 'tokens', 'characters', 'credits', 'requests', 'seconds')),
  monthly_limit DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Warning thresholds (as percentages 0-1)
  warning_yellow DECIMAL(3, 2) DEFAULT 0.50,  -- 50%
  warning_orange DECIMAL(3, 2) DEFAULT 0.70,  -- 70%
  warning_red DECIMAL(3, 2) DEFAULT 0.85,     -- 85%

  -- Current month usage (updated by triggers/API calls)
  current_usage DECIMAL(12, 2) DEFAULT 0,
  usage_month TEXT DEFAULT to_char(NOW(), 'YYYY-MM'),

  -- Alert settings
  alerts_enabled BOOLEAN DEFAULT true,
  last_alert_level TEXT DEFAULT NULL,  -- 'yellow', 'orange', 'red', 'exceeded'
  last_alert_sent_at TIMESTAMPTZ DEFAULT NULL,

  -- Fallback provider (if this one fails)
  fallback_provider_key TEXT DEFAULT NULL,

  -- Metadata
  notes TEXT DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ALERT EMAIL LOG TABLE
-- Tracks all alert emails sent
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.api_quota_alert_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_key TEXT NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('yellow', 'orange', 'red', 'exceeded')),
  usage_percentage DECIMAL(5, 2) NOT NULL,
  current_usage DECIMAL(12, 2) NOT NULL,
  monthly_limit DECIMAL(12, 2) NOT NULL,
  email_recipients TEXT[] NOT NULL,
  email_sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_status TEXT DEFAULT 'sent'
);

-- ============================================================================
-- INSERT DEFAULT PROVIDERS
-- All 16+ providers from the codebase audit
-- ============================================================================

INSERT INTO public.api_quota_settings (provider_key, display_name, icon, quota_type, monthly_limit, notes) VALUES
  -- LLM Providers
  ('anthropic_sonnet', 'Claude Sonnet 4.5', '🎵', 'dollars', 50.00, 'City evaluator - $3/1M input, $15/1M output'),
  ('anthropic_opus', 'Claude Opus 4.5', '🧠', 'dollars', 100.00, 'Judge - $15/1M input, $75/1M output'),
  ('openai_gpt4o', 'GPT-4o', '🤖', 'dollars', 50.00, 'City evaluator - $2.50/1M input, $10/1M output'),
  ('openai_olivia', 'GPT-4 Turbo (Olivia)', '💬', 'dollars', 30.00, 'Olivia chat - $10/1M input, $30/1M output'),
  ('gemini', 'Gemini 3.1 Pro', '💎', 'dollars', 25.00, 'City evaluator with grounding - $1.25/1M input, $5/1M output'),
  ('grok', 'Grok 4', '🚀', 'dollars', 30.00, 'City evaluator with X search - $3/1M input, $15/1M output'),
  ('perplexity', 'Perplexity Sonar', '🔍', 'dollars', 25.00, 'City evaluator with web search - $1/1M input, $5/1M output'),

  -- Search Providers
  ('tavily', 'Tavily Research', '🔎', 'credits', 5000, 'Web search - ~$0.01/credit'),

  -- TTS Providers
  ('elevenlabs', 'ElevenLabs TTS', '🔊', 'characters', 100000, 'Voice TTS - $0.18/1K chars. Fallback: OpenAI'),
  ('openai_tts', 'OpenAI TTS', '🗣️', 'dollars', 10.00, 'TTS fallback - $0.015/1K chars'),

  -- Avatar Providers
  ('simli', 'Simli Avatar', '🎭', 'seconds', 3600, 'Primary avatar - $0.02/sec'),
  ('d_id', 'D-ID Avatar', '👤', 'credits', 20, 'Avatar fallback - ~$0.025/sec'),
  ('heygen', 'HeyGen Avatar', '🎥', 'seconds', 600, 'Avatar fallback - $0.032/sec'),
  ('replicate', 'Replicate Wav2Lip', '🎬', 'dollars', 10.00, 'Judge video - $0.0014/sec'),

  -- Video & Image Providers
  ('kling', 'Kling AI Video', '🖼️', 'credits', 100, 'Video generation - ~$0.05/image'),

  -- Visual Reports
  ('gamma', 'Gamma Reports', '📊', 'credits', 50, 'Visual reports - ~$0.50/generation')

ON CONFLICT (provider_key) DO NOTHING;

-- Set fallback providers
UPDATE public.api_quota_settings SET fallback_provider_key = 'openai_tts' WHERE provider_key = 'elevenlabs';
UPDATE public.api_quota_settings SET fallback_provider_key = 'd_id' WHERE provider_key = 'simli';
UPDATE public.api_quota_settings SET fallback_provider_key = 'replicate' WHERE provider_key = 'd_id';

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.api_quota_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_quota_alert_log ENABLE ROW LEVEL SECURITY;

-- Only admins (service role) can modify quota settings
CREATE POLICY "Service role manages quota settings"
  ON public.api_quota_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Anyone can read quota settings (for dashboard display)
CREATE POLICY "Anyone can read quota settings"
  ON public.api_quota_settings FOR SELECT
  USING (true);

-- Service role manages alert log
CREATE POLICY "Service role manages alert log"
  ON public.api_quota_alert_log FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quota_settings_provider
  ON public.api_quota_settings(provider_key);

CREATE INDEX IF NOT EXISTS idx_quota_settings_active
  ON public.api_quota_settings(is_active);

CREATE INDEX IF NOT EXISTS idx_alert_log_provider
  ON public.api_quota_alert_log(provider_key, email_sent_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_quota_settings_updated_at
  BEFORE UPDATE ON public.api_quota_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get all quota settings with usage status
CREATE OR REPLACE FUNCTION get_quota_status()
RETURNS TABLE (
  provider_key TEXT,
  display_name TEXT,
  icon TEXT,
  quota_type TEXT,
  monthly_limit DECIMAL,
  current_usage DECIMAL,
  usage_percentage DECIMAL,
  status TEXT,
  fallback_provider TEXT,
  alerts_enabled BOOLEAN,
  last_alert_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    qs.provider_key,
    qs.display_name,
    qs.icon,
    qs.quota_type,
    qs.monthly_limit,
    qs.current_usage,
    CASE
      WHEN qs.monthly_limit > 0 THEN ROUND((qs.current_usage / qs.monthly_limit) * 100, 2)
      ELSE 0
    END as usage_percentage,
    CASE
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= 1 THEN 'exceeded'
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= qs.warning_red THEN 'red'
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= qs.warning_orange THEN 'orange'
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= qs.warning_yellow THEN 'yellow'
      ELSE 'green'
    END as status,
    qs.fallback_provider_key,
    qs.alerts_enabled,
    qs.last_alert_level
  FROM public.api_quota_settings qs
  WHERE qs.is_active = true
  ORDER BY
    CASE
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= 1 THEN 0
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= qs.warning_red THEN 1
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= qs.warning_orange THEN 2
      WHEN qs.monthly_limit > 0 AND (qs.current_usage / qs.monthly_limit) >= qs.warning_yellow THEN 3
      ELSE 4
    END,
    qs.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update usage for a provider
CREATE OR REPLACE FUNCTION update_provider_usage(
  p_provider_key TEXT,
  p_usage_delta DECIMAL
)
RETURNS public.api_quota_settings AS $$
DECLARE
  v_result public.api_quota_settings;
  v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  UPDATE public.api_quota_settings
  SET
    current_usage = CASE
      WHEN usage_month = v_current_month THEN current_usage + p_usage_delta
      ELSE p_usage_delta  -- Reset if new month
    END,
    usage_month = v_current_month,
    updated_at = NOW()
  WHERE provider_key = p_provider_key
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset all usage for new month
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
DECLARE
  v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  UPDATE public.api_quota_settings
  SET
    current_usage = 0,
    usage_month = v_current_month,
    last_alert_level = NULL,
    last_alert_sent_at = NULL,
    updated_at = NOW()
  WHERE usage_month != v_current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.api_quota_settings IS 'Admin-configurable monthly quotas for all API providers';
COMMENT ON TABLE public.api_quota_alert_log IS 'Log of all quota alert emails sent';
COMMENT ON FUNCTION get_quota_status IS 'Returns all providers with calculated usage percentage and status color';
COMMENT ON FUNCTION update_provider_usage IS 'Increments usage for a provider, auto-resets on new month';
