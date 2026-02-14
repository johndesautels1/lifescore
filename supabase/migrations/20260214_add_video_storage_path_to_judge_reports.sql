-- Add video_storage_path to judge_reports for permanent Supabase Storage URLs
-- This prevents stale provider CDN URLs (replicate.delivery, klingai.com) from breaking saved reports

ALTER TABLE judge_reports
  ADD COLUMN IF NOT EXISTS video_storage_path TEXT DEFAULT NULL;

-- Index for fast lookups by comparison_id (used by JudgeTab Supabase fallback)
CREATE INDEX IF NOT EXISTS idx_judge_reports_comparison_id
  ON judge_reports (comparison_id);

COMMENT ON COLUMN judge_reports.video_storage_path IS 'Permanent Supabase Storage path for the judge video (replaces ephemeral provider URLs)';
