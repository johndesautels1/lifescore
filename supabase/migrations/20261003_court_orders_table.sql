-- ============================================================================
-- LIFE SCORE — court_orders, written down (2026-10-03)
-- ============================================================================
-- The table existed in the live database but no migration created it (only
-- 20260211_create_user_videos_storage.sql altered it "if it exists"), so a
-- fresh database built from these migrations would lack it. This creates it
-- exactly as the live database has it — read from the live catalogue on
-- 2026-10-03 — and is a no-op where it already exists.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.court_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  comparison_id text NOT NULL,
  winner_city text NOT NULL,
  winner_score numeric,
  video_url text,
  saved_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  video_storage_path text,
  CONSTRAINT court_orders_user_id_comparison_id_key UNIQUE (user_id, comparison_id)
);

ALTER TABLE public.court_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'court_orders' AND policyname = 'Users can manage own court orders'
  ) THEN
    CREATE POLICY "Users can manage own court orders" ON public.court_orders
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;
