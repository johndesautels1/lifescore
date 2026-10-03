-- ============================================================================
-- LIFE SCORE — account deletion must never be blocked (2026-10-03)
-- ============================================================================
-- Four columns pointed at auth.users with ON DELETE NO ACTION, so deleting the
-- account of anyone who had opened or shared a report, or started a Cristiano
-- city film or a Moving Movie, failed — and /api/user/delete still answered
-- "deleted". Now:
--   * report_shares.shared_by          → CASCADE  (a share link belongs to its owner)
--   * report_access_logs.user_id       → SET NULL (the view count stays, the person goes)
--   * cristiano_city_videos.generated_by → SET NULL (a city film is a shared cache)
--   * movie_videos.generated_by        → SET NULL (a city-pair film is a shared cache)
-- All four columns are nullable.
-- ============================================================================

ALTER TABLE public.report_shares
  DROP CONSTRAINT IF EXISTS report_shares_shared_by_fkey,
  ADD CONSTRAINT report_shares_shared_by_fkey
    FOREIGN KEY (shared_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.report_access_logs
  DROP CONSTRAINT IF EXISTS report_access_logs_user_id_fkey,
  ADD CONSTRAINT report_access_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cristiano_city_videos
  DROP CONSTRAINT IF EXISTS cristiano_city_videos_generated_by_fkey,
  ADD CONSTRAINT cristiano_city_videos_generated_by_fkey
    FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.movie_videos
  DROP CONSTRAINT IF EXISTS movie_videos_generated_by_fkey,
  ADD CONSTRAINT movie_videos_generated_by_fkey
    FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
