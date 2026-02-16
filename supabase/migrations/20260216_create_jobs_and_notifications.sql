-- ============================================================================
-- LIFE SCORE - Jobs & Notifications System
-- Migration: 20260216_create_jobs_and_notifications.sql
--
-- Creates the fire-and-forget notification infrastructure:
--   1. jobs table        — persistent job queue for long-running tasks
--   2. notifications     — in-app + email notification records
--   3. profiles.phone    — future SMS support
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- 1. JOBS TABLE
-- Tracks long-running tasks (comparison, judge_verdict, court_order, etc.)
-- so users can close their browser and get notified when results are ready.
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                                -- 'comparison', 'judge_verdict', 'court_order', 'gamma_report', 'freedom_tour'
  status TEXT NOT NULL DEFAULT 'queued',             -- 'queued' → 'processing' → 'completed' → 'notified' / 'failed'
  payload JSONB,                                     -- input data (cities, options, etc.)
  result JSONB,                                      -- output data (scores, report IDs, URLs, etc.)
  notify_via TEXT[] DEFAULT ARRAY['in_app']::TEXT[],  -- ['email', 'sms', 'in_app']
  notified_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: fetch user's jobs by status
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);
-- Index: fetch pending/processing jobs for background worker
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status) WHERE status IN ('queued', 'processing');

-- RLS: Users can only see/modify their own jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass for API endpoints that update job status
CREATE POLICY "Service role full access to jobs"
  ON jobs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. NOTIFICATIONS TABLE
-- Stores in-app notifications (bell icon dropdown) and records of sent emails.
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'in_app',               -- 'email', 'sms', 'in_app'
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,                                          -- deep link to results (e.g., /?tab=judge&comparison=xxx)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index: fetch unread notifications for bell icon badge
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
-- Index: fetch all notifications for dropdown (newest first)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- RLS: Users can only see/modify their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (API endpoints create them after job completion)
CREATE POLICY "Service role full access to notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own notifications (client-side in-app)
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. ADD PHONE COLUMN TO PROFILES (for future SMS via Twilio)
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- ============================================================================
-- 4. UPDATED_AT TRIGGER for jobs table
-- Automatically updates the updated_at column on row modification.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();
