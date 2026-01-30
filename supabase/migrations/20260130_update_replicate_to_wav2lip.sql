-- ============================================================================
-- LIFE SCORE - Update Replicate Provider to Wav2Lip
-- Migration: 20260130_update_replicate_to_wav2lip.sql
-- Date: 2026-01-30
--
-- Updates existing Replicate quota settings to Wav2Lip
-- This is needed because the original migration uses ON CONFLICT DO NOTHING
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- Update the replicate provider to Wav2Lip
-- Wav2Lip: $0.0014/sec, $10 budget, ~6 sec generation
UPDATE public.api_quota_settings
SET
  display_name = 'Replicate Wav2Lip',
  monthly_limit = 10.00,
  notes = 'Judge video - $0.0014/sec (~6 sec generation)',
  updated_at = NOW()
WHERE provider_key = 'replicate';

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Updated replicate provider to Wav2Lip, $10 budget';
END $$;
