-- ============================================================================
-- Migration: Update Cristiano storyboard prompt word count target
-- Date: 2026-03-01
-- Author: Claude Opus 4.6
--
-- Purpose:
--   Lowers voiceover word count target from 220-270 to 200-250 with a hard
--   cap of 300, fixing "word count 327 outside 180-320 range" pre-render
--   validation failures. Updates the live prompt in app_prompts.
--
-- Tables affected: app_prompts
-- Reversible: yes (change '200–250' back to '220–270')
-- ============================================================================

UPDATE public.app_prompts
SET prompt_text = REPLACE(
      prompt_text,
      '- Total voiceover: 220–270 words',
      '- Total voiceover: 200–250 words (HARD CAP: never exceed 300)'
    ),
    updated_at = now()
WHERE prompt_key = 'cristiano_storyboard';
