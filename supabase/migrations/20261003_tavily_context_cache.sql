-- ============================================================================
-- LIFE SCORE — tavily_context_cache (2026-10-03)
-- ============================================================================
-- One set of Tavily web research per city pair, shared by every evaluation of
-- that pair for 30 minutes (api/shared/tavilyCache.ts). Before this, every
-- category call, and each half of a split category, ran the same 12 searches
-- and research order again: per comparison 72 searches for GPT, 96 for
-- Perplexity and 132 for Claude, where 12 would do.
-- Ruling (John, 3 Oct 2026): search once per comparison, reuse for every category.
--
-- A row is "pending" while the first call searches and "ready" once it has
-- stored the results; later calls wait for a pending row or read a ready one.
-- It holds city names and public web results only: no personal data.
-- Only the server (service role) reads or writes it: RLS on, no policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tavily_context_cache (
  pair_key text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('pending', 'ready')),
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tavily_context_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tavily_context_cache IS
  'Tavily research + searches per city pair, shared by every evaluation for 30 minutes (api/shared/tavilyCache.ts). Server only; no personal data.';
