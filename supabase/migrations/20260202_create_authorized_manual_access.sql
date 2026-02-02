-- LIFE SCORE - Authorized Manual Access Table
-- Migration: 20260202_create_authorized_manual_access.sql
-- Purpose: Store emails authorized to access restricted manuals (CSM, Tech, Legal)

-- ============================================================================
-- TABLE: authorized_manual_access
-- ============================================================================

CREATE TABLE IF NOT EXISTS authorized_manual_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_authorized_manual_access_email
  ON authorized_manual_access(email);

-- Create index for active status filtering
CREATE INDEX IF NOT EXISTS idx_authorized_manual_access_active
  ON authorized_manual_access(is_active) WHERE is_active = true;

-- ============================================================================
-- INITIAL DATA: Add admin email
-- ============================================================================

INSERT INTO authorized_manual_access (email, role, added_by, notes)
VALUES (
  'cluesnomads@gmail.com',
  'owner',
  'system',
  'Initial owner account - full manual access'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- TRIGGER: Update updated_at on changes
-- ============================================================================

CREATE OR REPLACE FUNCTION update_authorized_manual_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_authorized_manual_access_updated_at ON authorized_manual_access;

CREATE TRIGGER tr_authorized_manual_access_updated_at
  BEFORE UPDATE ON authorized_manual_access
  FOR EACH ROW
  EXECUTE FUNCTION update_authorized_manual_access_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE authorized_manual_access ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (admin operations)
CREATE POLICY "Service role full access" ON authorized_manual_access
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE authorized_manual_access IS 'Stores emails authorized to access restricted documentation (Customer Service Manual, Technical Support Manual, Legal Compliance Manual)';
COMMENT ON COLUMN authorized_manual_access.email IS 'Email address of authorized user (must match Supabase Auth email)';
COMMENT ON COLUMN authorized_manual_access.role IS 'Role type: owner, admin, support';
COMMENT ON COLUMN authorized_manual_access.is_active IS 'Whether access is currently active (soft delete)';
COMMENT ON COLUMN authorized_manual_access.added_by IS 'Email of admin who added this user';
COMMENT ON COLUMN authorized_manual_access.notes IS 'Optional notes about this access grant';

-- ============================================================================
-- DONE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Created authorized_manual_access table with owner email: cluesnomads@gmail.com';
END $$;
