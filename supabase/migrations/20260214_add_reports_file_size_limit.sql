-- ============================================================================
-- LIFE SCORE - Add File Size Limit to Reports Storage Bucket
-- FIX 2026-02-14: The reports bucket is the only bucket without a file size limit.
--
-- Reports contain 5-LLM consensus data + judge enhanced content + visuals,
-- so the limit is set generously at 200MB (209715200 bytes).
--
-- For reference, other bucket limits:
--   user-videos:        100 MB (104857600)
--   court-order-videos:  50 MB  (52428800)
--   judge-videos:        50 MB  (52428800)
--   contrast-images:      5 MB   (5242880)
--
-- Clues Intelligence LTD
-- ============================================================================

-- Set 200MB file size limit on the reports bucket
UPDATE storage.buckets
SET file_size_limit = 209715200
WHERE id = 'reports';
