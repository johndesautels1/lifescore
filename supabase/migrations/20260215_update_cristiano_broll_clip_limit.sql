-- ============================================================================
-- Migration: Update Cristiano prompts with B-roll 6-second clip limit
-- Date: 2026-02-15
-- Author: Claude Opus 4.6
--
-- Purpose:
--   HeyGen Video Agent was rendering B-roll scenes as single long clips
--   (16-18s), producing static footage. This updates both Cristiano prompts
--   in app_prompts to include the explicit 6-second max clip duration rule.
--
--   The seed migration (20260215_seed_cristiano_storyboard_prompt.sql) uses
--   ON CONFLICT DO NOTHING, so if records already exist they won't be
--   updated by the seed. This migration explicitly UPDATEs them.
--
-- Tables affected: app_prompts
-- Reversible: yes (revert prompt_text to previous version)
-- ============================================================================

-- Update the storyboard builder prompt (Stage 1)
UPDATE public.app_prompts
SET
  prompt_text = regexp_replace(
    prompt_text,
    'B-ROLL STOCK FOOTAGE RULES:\nUse GENERIC',
    E'B-ROLL STOCK FOOTAGE RULES:\nCRITICAL: Each individual B-roll stock footage clip MUST be 6 seconds or less. If a B-roll scene is longer than 6 seconds, use MULTIPLE clips (e.g. an 18s scene = 3 clips of 6s each, a 16s scene = 2-3 clips). Never use a single clip longer than 6 seconds.\nUse GENERIC'
  ),
  version = version + 1,
  last_edited_by = 'system-migration',
  updated_at = NOW()
WHERE category = 'video'
  AND prompt_key = 'cristiano_storyboard'
  AND prompt_text NOT LIKE '%clip MUST be 6 seconds%';

-- Update the HeyGen render prompt (Stage 2)
UPDATE public.app_prompts
SET
  prompt_text = regexp_replace(
    prompt_text,
    'Footage must feel like the actual city area.\n\nSCENES:',
    E'Footage must feel like the actual city area.\nCRITICAL: Each individual B-roll stock footage clip MUST be 6 seconds or less. Use multiple clips per B-roll scene (e.g. 18s scene = 3 clips, 16s scene = 2-3 clips). Never use a single clip longer than 6 seconds.\n\nSCENES:'
  ),
  version = version + 1,
  last_edited_by = 'system-migration',
  updated_at = NOW()
WHERE category = 'video'
  AND prompt_key = 'cristiano_heygen_render'
  AND prompt_text NOT LIKE '%clip MUST be 6 seconds%';
