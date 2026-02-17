-- Migration: Add storage path columns to gamma_reports for permanent export URLs
-- Date: 2026-02-17
--
-- Problem: Gamma API export URLs (PDF/PPTX) expire after hours/days.
-- The gamma_url (hosted document URL) can also become inaccessible if Gamma
-- deletes the document or changes sharing settings.
--
-- Fix: Download exports immediately on completion and store in Supabase Storage.
-- Store the permanent storage paths so we always have a fallback.

-- Add storage path columns to gamma_reports
ALTER TABLE public.gamma_reports
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pptx_storage_path TEXT;

-- Add comment explaining the purpose
COMMENT ON COLUMN public.gamma_reports.pdf_storage_path IS 'Supabase Storage path for persisted PDF export (permanent, never expires)';
COMMENT ON COLUMN public.gamma_reports.pptx_storage_path IS 'Supabase Storage path for persisted PPTX export (permanent, never expires)';

-- Also add to the reports table (Session 16 enhanced reports)
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS pdf_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS pptx_storage_path TEXT;

COMMENT ON COLUMN public.reports.pdf_storage_path IS 'Supabase Storage path for persisted PDF export (permanent)';
COMMENT ON COLUMN public.reports.pptx_storage_path IS 'Supabase Storage path for persisted PPTX export (permanent)';
