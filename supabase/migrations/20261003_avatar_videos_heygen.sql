-- ============================================================================
-- LIFE SCORE — Cristiano's judge video on HeyGen (2026-10-03)
-- ============================================================================
-- The judge video now renders on HeyGen first (the questionnaire engine's
-- judge-page wiring) with the Replicate lip-sync kept as the back-up. A row
-- records which one is rendering: heygen_video_id for HeyGen,
-- replicate_prediction_id (unchanged) for the back-up.
-- ============================================================================

ALTER TABLE public.avatar_videos
  ADD COLUMN IF NOT EXISTS heygen_video_id text;

COMMENT ON COLUMN public.avatar_videos.heygen_video_id IS
  'HeyGen v3 video id when the judge video rendered on HeyGen (primary); null for the Replicate back-up';
