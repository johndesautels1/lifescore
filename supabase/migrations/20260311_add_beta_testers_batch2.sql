-- ============================================================================
-- LIFE SCORE - Add Beta Testers (Batch 2)
-- Migration: 20260311_add_beta_testers_batch2.sql
-- Date: 2026-03-11
--
-- Adds 5 new beta testers to the initial cohort.
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

INSERT INTO public.beta_testers (email, full_name, is_active, payment_bypass, notes)
VALUES
  ('ronjames30@yahoo.com',       'Ron James',      true, true, 'Beta cohort 2'),
  ('stpetebeach290@gmail.com',   'Arnel Parado',   true, true, 'Beta cohort 2'),
  ('fpdp18293@aol.com',          'Dawn Marie',     true, true, 'Beta cohort 2'),
  ('firozdudha@gmail.com',       'Firoz Dudha',    true, true, 'Beta cohort 2'),
  ('dcp1000444@gmail.com',       'Debra Berard',   true, true, 'Beta cohort 2')
ON CONFLICT (email) DO NOTHING;
