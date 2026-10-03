-- ============================================================================
-- LIFE SCORE — Entitlements hardening (2026-10-03)
-- ============================================================================
-- The server now decides what a user may use (api/shared/entitlements.ts).
-- This migration removes every path by which a signed-in user could grant
-- themselves a plan, reset their own usage, or read other people's shares:
--
--   1. usage_tracking gains cristiano_videos (the app counted Cristiano films in
--      a column that did not exist, so they were never limited).
--   2. consume_usage(): ONE atomic check-and-count, callable by the server only.
--      increment_usage() / get_or_create_usage_period() are dropped — any signed-in
--      user could call them for any user id with any amount.
--   3. Users can no longer INSERT/UPDATE usage_tracking or subscriptions
--      (only the server, with the service role, writes them).
--   4. profiles: users may edit only their own name, avatar, preferences and phone.
--      tier and email were editable before — a user could set tier = 'enterprise'.
--   5. report_shares_public runs with the reader's rights (it exposed every share
--      token to anyone); increment_share_view_count() is no longer public.
-- ============================================================================

-- 1. Cristiano films are counted like every other video -----------------------
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS cristiano_videos integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.usage_tracking.cristiano_videos IS
  'Count of Cristiano "Go To My New City" HeyGen films this month';

-- 2. Server-only atomic usage counter -------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_usage(
  p_user_id uuid,
  p_column text,
  p_limit integer,
  p_amount integer DEFAULT 1
)
RETURNS TABLE(allowed boolean, used_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start date := date_trunc('month', timezone('utc', now()))::date;
  v_end   date := (date_trunc('month', timezone('utc', now())) + interval '1 month' - interval '1 day')::date;
  v_used  integer;
BEGIN
  IF p_column NOT IN ('standard_comparisons', 'enhanced_comparisons', 'olivia_messages',
                      'judge_videos', 'gamma_reports', 'grok_videos', 'cristiano_videos') THEN
    RAISE EXCEPTION 'consume_usage: unknown usage column %', p_column USING ERRCODE = '22023';
  END IF;
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'consume_usage: amount must not be zero' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.usage_tracking (user_id, period_start, period_end)
  VALUES (p_user_id, v_start, v_end)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  -- Lock this month's row so two requests cannot both pass the limit.
  EXECUTE format('SELECT COALESCE(%I, 0) FROM public.usage_tracking WHERE user_id = $1 AND period_start = $2 FOR UPDATE', p_column)
    INTO v_used USING p_user_id, v_start;

  IF p_amount > 0 AND p_limit >= 0 AND v_used + p_amount > p_limit THEN
    RETURN QUERY SELECT false, v_used;
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE public.usage_tracking SET %1$I = GREATEST(0, COALESCE(%1$I, 0) + $1), updated_at = now() '
    'WHERE user_id = $2 AND period_start = $3 RETURNING %1$I', p_column)
    INTO v_used USING p_amount, p_user_id, v_start;

  RETURN QUERY SELECT true, v_used;
END;
$$;

COMMENT ON FUNCTION public.consume_usage(uuid, text, integer, integer) IS
  'Server-only: checks the monthly allowance (p_limit, -1 = unlimited) and counts p_amount in one locked step; a negative p_amount gives uses back.';

REVOKE ALL ON FUNCTION public.consume_usage(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_usage(uuid, text, integer, integer) TO service_role;

DROP FUNCTION IF EXISTS public.increment_usage(uuid, text, integer);
DROP FUNCTION IF EXISTS public.get_or_create_usage_period(uuid);

-- 3. Only the server writes usage and subscriptions ---------------------------
DROP POLICY IF EXISTS usage_tracking_insert ON public.usage_tracking;
DROP POLICY IF EXISTS usage_tracking_update ON public.usage_tracking;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.usage_tracking FROM anon, authenticated;

DROP POLICY IF EXISTS subscriptions_insert ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_update ON public.subscriptions;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.subscriptions FROM anon, authenticated;

-- 4. Users edit only their own personal fields --------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, TRUNCATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, avatar_url, preferred_currency, preferred_units, email_notifications, phone)
  ON public.profiles TO authenticated;
GRANT INSERT (id, full_name, avatar_url, preferred_currency, preferred_units, email_notifications, phone)
  ON public.profiles TO authenticated;

-- 5. Shares: no public listing, no public counter -----------------------------
ALTER VIEW public.report_shares_public SET (security_invoker = true);
REVOKE SELECT ON public.report_shares_public FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_view_count(uuid) FROM PUBLIC, anon, authenticated;
