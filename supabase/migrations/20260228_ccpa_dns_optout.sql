-- ============================================================================
-- CCPA "DO NOT SELL OR SHARE" OPT-OUT SUPPORT
-- California Consumer Privacy Act / California Privacy Rights Act
--
-- Clues Intelligence LTD
-- Created: 2026-02-28
-- ============================================================================

-- Add ccpa_dns_optout column to user_preferences for persistent opt-out
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ccpa_dns_optout BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_preferences.ccpa_dns_optout IS 'CCPA Do Not Sell/Share opt-out preference. TRUE = user has opted out.';

-- Update consent_logs table comment to reflect CCPA support
COMMENT ON TABLE consent_logs IS 'GDPR and CCPA compliance: Audit trail of user consent actions including Do Not Sell opt-outs';

-- Update consent_type column comment to include ccpa_dns
COMMENT ON COLUMN consent_logs.consent_type IS 'Type of consent: cookies, marketing, analytics, terms, privacy, ccpa_dns';

-- Add index for CCPA opt-out queries (finding all DNS opt-outs efficiently)
CREATE INDEX IF NOT EXISTS idx_consent_logs_ccpa_dns
  ON consent_logs(consent_type, consent_action)
  WHERE consent_type = 'ccpa_dns';

-- Create a view for quick CCPA compliance reporting
CREATE OR REPLACE VIEW ccpa_dns_optouts AS
SELECT
  user_id,
  anonymous_id,
  consent_action,
  consent_categories,
  created_at,
  ip_address
FROM consent_logs
WHERE consent_type = 'ccpa_dns'
ORDER BY created_at DESC;

-- Comment on the view
COMMENT ON VIEW ccpa_dns_optouts IS 'CCPA compliance view: Lists all Do Not Sell/Share opt-out and opt-in actions for audit purposes';
