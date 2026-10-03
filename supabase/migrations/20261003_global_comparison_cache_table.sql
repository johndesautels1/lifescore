-- ============================================================================
-- LIFE SCORE — global_comparison_cache, written down (2026-10-03)
-- ============================================================================
-- The shared comparison cache existed in the live database but no migration
-- created it, so a fresh database built from these migrations would lack it.
-- This creates it exactly as the live database has it — read from the live
-- catalogue on 2026-10-03 — and is a no-op where it already exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.global_comparison_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  cache_key text NOT NULL UNIQUE,
  city1_normalized text NOT NULL,
  city2_normalized text NOT NULL,
  city1_display text NOT NULL,
  city2_display text NOT NULL,
  comparison_type text NOT NULL CHECK (comparison_type = ANY (ARRAY['single'::text, 'enhanced'::text])),
  llms_used text[] NOT NULL DEFAULT ARRAY['claude-sonnet'::text],
  cached_result jsonb NOT NULL,
  hit_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_accessed_at timestamptz DEFAULT now(),
  schema_version integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_global_cache_key ON public.global_comparison_cache USING btree (cache_key);
CREATE INDEX IF NOT EXISTS idx_global_cache_expires ON public.global_comparison_cache USING btree (expires_at);

ALTER TABLE public.global_comparison_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'global_comparison_cache'
                 AND policyname = 'Global cache is publicly readable') THEN
    CREATE POLICY "Global cache is publicly readable" ON public.global_comparison_cache
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'global_comparison_cache'
                 AND policyname = 'Only service role can insert cache') THEN
    CREATE POLICY "Only service role can insert cache" ON public.global_comparison_cache
      FOR INSERT WITH CHECK (auth.role() = 'service_role'::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'global_comparison_cache'
                 AND policyname = 'Only service role can update cache') THEN
    CREATE POLICY "Only service role can update cache" ON public.global_comparison_cache
      FOR UPDATE USING (auth.role() = 'service_role'::text);
  END IF;
END $$;
