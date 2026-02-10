-- ============================================================================
-- ADD MISSING INDEXES FOR NEWER TABLES
-- Safe to run: CREATE INDEX IF NOT EXISTS is idempotent
-- Run on live DB: 2026-02-10
-- ============================================================================

-- consent_logs: RLS policy queries by user_id, compliance queries by date
-- Note: consent_logs table created via SQL Editor on 2026-02-10
CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id
  ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_created_at
  ON consent_logs(created_at DESC);

-- contrast_image_cache: cleanup function filters by expires_at, lookups by cache_key
CREATE INDEX IF NOT EXISTS idx_contrast_image_cache_expires_at
  ON contrast_image_cache(expires_at);
-- cache_key already has UNIQUE constraint (implicit index)

-- app_prompts: API queries filter by category + is_active
CREATE INDEX IF NOT EXISTS idx_app_prompts_category_active
  ON app_prompts(category, is_active);

-- invideo_overrides: lookup function queries by comparison_id and city_name
CREATE INDEX IF NOT EXISTS idx_invideo_overrides_comparison_id
  ON invideo_overrides(comparison_id) WHERE comparison_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invideo_overrides_city_name
  ON invideo_overrides(city_name);

-- api_quota_settings: dashboard queries filter by is_active
CREATE INDEX IF NOT EXISTS idx_api_quota_settings_active
  ON api_quota_settings(is_active) WHERE is_active = true;

-- report_access_logs: analytics queries by report_id and date
CREATE INDEX IF NOT EXISTS idx_report_access_logs_report_date
  ON report_access_logs(report_id, accessed_at DESC);

-- report_shares: lookup by share_token (already UNIQUE), but also by report_id
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id
  ON report_shares(report_id);
