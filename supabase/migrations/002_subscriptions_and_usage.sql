-- ============================================================================
-- LIFE SCORE - Subscriptions & Usage Tracking
-- Migration: 002_subscriptions_and_usage.sql
-- Date: 2026-01-24
--
-- Adds Stripe subscription management and feature usage tracking.
-- Does NOT modify existing tables - only adds new tables.
--
-- Clues Intelligence LTD
-- © 2025-2026 All Rights Reserved
-- ============================================================================

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- Tracks Stripe subscription state for each user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Stripe identifiers
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_price_id TEXT NOT NULL,

  -- Subscription status (matches Stripe statuses)
  status TEXT NOT NULL CHECK (status IN (
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid',
    'paused'
  )),

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USAGE TRACKING TABLE
-- Tracks feature usage per billing period for limit enforcement
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Period tracking (monthly reset)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Usage counters
  standard_comparisons INTEGER DEFAULT 0,
  enhanced_comparisons INTEGER DEFAULT 0,
  olivia_messages INTEGER DEFAULT 0,
  judge_videos INTEGER DEFAULT 0,
  gamma_reports INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user per period
  UNIQUE(user_id, period_start)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Usage tracking policies
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all usage (for API endpoints)
CREATE POLICY "Service role can manage usage"
  ON public.usage_tracking FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status_active
  ON public.subscriptions(status)
  WHERE status = 'active';

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_usage_user_period
  ON public.usage_tracking(user_id, period_start);

CREATE INDEX IF NOT EXISTS idx_usage_period_end
  ON public.usage_tracking(period_end);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on usage_tracking
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON public.usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create current usage period for a user
CREATE OR REPLACE FUNCTION get_or_create_usage_period(p_user_id UUID)
RETURNS public.usage_tracking AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_usage public.usage_tracking;
BEGIN
  -- Calculate current period (1st of current month to last day)
  v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Try to get existing record
  SELECT * INTO v_usage
  FROM public.usage_tracking
  WHERE user_id = p_user_id AND period_start = v_period_start;

  -- Create if doesn't exist
  IF v_usage IS NULL THEN
    INSERT INTO public.usage_tracking (user_id, period_start, period_end)
    VALUES (p_user_id, v_period_start, v_period_end)
    RETURNING * INTO v_usage;
  END IF;

  RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS public.usage_tracking AS $$
DECLARE
  v_usage public.usage_tracking;
BEGIN
  -- Get or create current period
  v_usage := get_or_create_usage_period(p_user_id);

  -- Increment the appropriate counter
  EXECUTE format(
    'UPDATE public.usage_tracking SET %I = %I + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    p_feature, p_feature
  ) INTO v_usage USING p_amount, v_usage.id;

  RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.subscriptions IS 'Stripe subscription records for paid users';
COMMENT ON TABLE public.usage_tracking IS 'Monthly feature usage tracking for limit enforcement';
COMMENT ON FUNCTION get_or_create_usage_period IS 'Gets or creates usage record for current billing period';
COMMENT ON FUNCTION increment_usage IS 'Increments a specific usage counter for a user';
