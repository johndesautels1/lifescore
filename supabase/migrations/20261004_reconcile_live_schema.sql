-- ============================================================================
-- LIFE SCORE - bring the live database up to what the code expects
-- ============================================================================
-- Three committed migrations were never applied to production, and the report
-- library's storage bucket was created by hand as "Reports" while the code and
-- its storage policies use "reports". Found 4 Oct 2026 by comparing the code's
-- database types and storage names with the live database. Effect in production
-- until now:
--   - gamma_reports inserts failed (pdf_storage_path / pptx_storage_path
--     missing), so Gamma reports stopped saving to accounts after 15 Feb 2026;
--   - PDF / PowerPoint exports could not be kept (no gamma-exports bucket), so
--     users got Gamma's expiring links;
--   - the report library never saved a report (no reports bucket; reports
--     lacked the same two columns);
--   - the Do Not Sell opt-out was not stored (user_preferences.ccpa_dns_optout
--     missing).
--
-- Adds only; changes and removes nothing. Every statement is safe to re-run.
-- Applied to production 4 Oct 2026 with John's approval.
--
-- Clues Intelligence LTD
-- ============================================================================

-- 20260217_add_gamma_export_storage_paths
ALTER TABLE public.gamma_reports
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pptx_storage_path TEXT;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pptx_storage_path TEXT;

-- 20260228_ccpa_dns_optout
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ccpa_dns_optout BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_consent_logs_ccpa_dns
  ON public.consent_logs(consent_type, consent_action)
  WHERE consent_type = 'ccpa_dns';

CREATE OR REPLACE VIEW public.ccpa_dns_optouts AS
SELECT user_id, anonymous_id, consent_action, consent_categories, created_at, ip_address
FROM public.consent_logs
WHERE consent_type = 'ccpa_dns'
ORDER BY created_at DESC;

-- A view runs as its owner unless told otherwise, which would let anyone with
-- the public key read every opt-out's IP address past consent_logs' row-level
-- security. Run it as the caller instead (as report_shares_public does).
ALTER VIEW public.ccpa_dns_optouts SET (security_invoker = true);

-- 20260217_create_gamma_exports_storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gamma-exports',
  'gamma-exports',
  true,
  52428800,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- The report library (src/services/reportStorageService.ts): private, one
-- folder per user; its policies ("Users can upload own reports" etc.) already
-- name bucket 'reports'. 200 MB as 20260214_add_reports_file_size_limit set.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', false, 209715200, ARRAY['text/html'])
ON CONFLICT (id) DO NOTHING;
