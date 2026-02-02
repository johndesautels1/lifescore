-- ============================================================================
-- LIFE SCORE - Add Tavily to Quota Settings
-- Migration: 20260202_add_tavily_to_quota_settings.sql
-- Date: 2026-02-02
--
-- Ensures Tavily appears in the Cost Dashboard Quota Status section
-- ============================================================================

-- Insert Tavily if it doesn't exist, or update if it does
INSERT INTO public.api_quota_settings (
  provider_key,
  display_name,
  icon,
  quota_type,
  monthly_limit,
  notes,
  is_active
) VALUES (
  'tavily',
  'Tavily Research',
  '🔎',
  'credits',
  5000,
  'Web search & research - ~$0.01/credit',
  true
)
ON CONFLICT (provider_key) DO UPDATE SET
  display_name = 'Tavily Research',
  icon = '🔎',
  quota_type = 'credits',
  monthly_limit = 5000,
  notes = 'Web search & research - ~$0.01/credit',
  is_active = true,
  updated_at = NOW();

-- Verify Tavily is now in the table
SELECT provider_key, display_name, icon, quota_type, monthly_limit, is_active
FROM public.api_quota_settings
WHERE provider_key = 'tavily';
