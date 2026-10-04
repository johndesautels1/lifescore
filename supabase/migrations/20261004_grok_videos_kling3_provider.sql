-- ============================================================================
-- LIFE SCORE — grok_videos.provider accepts 'kling3' (2026-10-04)
-- ============================================================================
-- City clips now come from Kling 3 through fal (api/shared/falKling.ts), with
-- Replicate Minimax as the last back-up (John, 4 Oct 2026: "move ... to fully
-- kling 3 setup and keep minimax as last backup"). The provider check allowed
-- only 'grok', 'replicate' and 'kling', so a 'kling3' row would have failed to
-- save. 'grok' and 'kling' stay allowed for the history; on 4 Oct 2026 all 107
-- rows were 'replicate'.
-- ============================================================================

ALTER TABLE public.grok_videos DROP CONSTRAINT IF EXISTS grok_videos_provider_check;

ALTER TABLE public.grok_videos
  ADD CONSTRAINT grok_videos_provider_check
  CHECK (provider IN ('grok', 'replicate', 'kling', 'kling3'));
