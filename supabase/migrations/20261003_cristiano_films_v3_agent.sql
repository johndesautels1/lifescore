-- ============================================================================
-- LIFE SCORE — Cristiano's "Go To My New City" film on HeyGen's v3 video agent (2026-10-03)
-- ============================================================================
-- The v3 agent answers a submission with a SESSION; it names the video only once
-- it has planned the film. A row now remembers the session (the handle the screen
-- polls) and fills heygen_video_id when HeyGen names the video. Films made before
-- today keep their v1 video id in heygen_video_id and no session.
-- ============================================================================

ALTER TABLE public.cristiano_city_videos
  ADD COLUMN IF NOT EXISTS heygen_session_id text;

CREATE INDEX IF NOT EXISTS idx_cristiano_city_videos_heygen_session
  ON public.cristiano_city_videos (heygen_session_id);

COMMENT ON COLUMN public.cristiano_city_videos.heygen_session_id IS
  'HeyGen v3 video-agent session id (the handle polled); heygen_video_id is filled once HeyGen names the video';
