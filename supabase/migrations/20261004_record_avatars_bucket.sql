-- ============================================================================
-- LIFE SCORE - record the "Avatars" storage bucket
-- ============================================================================
-- api/avatar/generate-judge-video.ts uploads the judge's still image to the
-- "Avatars" bucket. It was created by hand in production (public, no size or
-- type limit) and no migration made it, so a fresh database lacked it. This
-- records it as it is live; in production it changes nothing.
--
-- Clues Intelligence LTD
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('Avatars', 'Avatars', true)
ON CONFLICT (id) DO NOTHING;
