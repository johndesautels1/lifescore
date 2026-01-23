-- ============================================================================
-- CONSENT LOGS TABLE
-- GDPR Compliance: Records of user consent for auditing purposes
--
-- Clues Intelligence LTD
-- Created: 2026-01-23
-- ============================================================================

-- Create consent_logs table
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User identification (nullable for anonymous users)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT, -- For users not logged in (fingerprint or session ID)

  -- Consent details
  consent_type TEXT NOT NULL, -- 'cookies', 'marketing', 'analytics', 'terms', 'privacy'
  consent_action TEXT NOT NULL, -- 'granted', 'denied', 'withdrawn'

  -- What was consented to
  consent_categories JSONB DEFAULT '{}', -- e.g., {"essential": true, "functional": true, "analytics": false}

  -- Context
  ip_address INET, -- Hashed or partial for privacy
  user_agent TEXT,
  page_url TEXT, -- Where consent was given

  -- Consent text version (for audit trail)
  policy_version TEXT DEFAULT '1.0',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- When this consent expires (if applicable)

  -- Additional metadata
  metadata JSONB DEFAULT '{}'
);

-- Indexes for common queries
CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX idx_consent_logs_anonymous_id ON consent_logs(anonymous_id);
CREATE INDEX idx_consent_logs_consent_type ON consent_logs(consent_type);
CREATE INDEX idx_consent_logs_created_at ON consent_logs(created_at);

-- Row Level Security
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own consent logs
CREATE POLICY "Users can view own consent logs"
  ON consent_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can insert consent logs
CREATE POLICY "Service role can insert consent logs"
  ON consent_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can read all (for admin/compliance)
CREATE POLICY "Service role full access"
  ON consent_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comment on table
COMMENT ON TABLE consent_logs IS 'GDPR compliance: Audit trail of user consent actions';
COMMENT ON COLUMN consent_logs.consent_type IS 'Type of consent: cookies, marketing, analytics, terms, privacy';
COMMENT ON COLUMN consent_logs.consent_action IS 'Action taken: granted, denied, withdrawn';
COMMENT ON COLUMN consent_logs.consent_categories IS 'Detailed breakdown of what was consented to';
COMMENT ON COLUMN consent_logs.policy_version IS 'Version of the policy document at time of consent';
