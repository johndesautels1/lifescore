-- ============================================================================
-- LIFE SCORE - Add Database Statement Timeout
-- FIX 2026-02-14: Prevent rogue queries from running forever
--
-- Sets a 30-second statement timeout for the authenticated role.
-- Only affects queries via the Supabase client (not service_role).
-- Any query exceeding 30s will be automatically cancelled.
--
-- This is a safety net — well-designed queries complete in <5s.
-- Clues Intelligence LTD
-- ============================================================================

-- Set 30s timeout for authenticated users (app queries via PostgREST)
ALTER ROLE authenticated SET statement_timeout = '30s';

-- Set 30s timeout for anon role (public/shared report views)
ALTER ROLE anon SET statement_timeout = '30s';

-- service_role is intentionally left unlimited — cleanup jobs, migrations, etc.
-- may legitimately need more than 30s.
