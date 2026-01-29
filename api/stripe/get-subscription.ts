/**
 * LIFE SCORE - Get Subscription Status API
 *
 * Returns the current subscription status for a user.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'open', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const userId = req.query.userId as string;

  if (!userId) {
    res.status(400).json({ error: 'userId query parameter is required' });
    return;
  }

  try {
    // Get subscription
    // FIX 2026-01-29: Use maybeSingle() - user may not have subscription
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get user profile for tier
    // FIX 2026-01-29: Use maybeSingle() - profile may not exist
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .maybeSingle();

    // Get current usage
    const periodStart = new Date();
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    // FIX 2026-01-29: Use maybeSingle() - usage record may not exist
    const { data: usage } = await supabaseAdmin
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('period_start', periodStart.toISOString().split('T')[0])
      .maybeSingle();

    res.status(200).json({
      success: true,
      tier: profile?.tier || 'free',
      subscription: subscription
        ? {
            status: subscription.status,
            priceId: subscription.stripe_price_id,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          }
        : null,
      usage: usage
        ? {
            standardComparisons: usage.standard_comparisons,
            enhancedComparisons: usage.enhanced_comparisons,
            oliviaMessages: usage.olivia_messages,
            judgeVideos: usage.judge_videos,
            gammaReports: usage.gamma_reports,
            periodStart: usage.period_start,
            periodEnd: usage.period_end,
          }
        : {
            standardComparisons: 0,
            enhancedComparisons: 0,
            oliviaMessages: 0,
            judgeVideos: 0,
            gammaReports: 0,
            periodStart: periodStart.toISOString().split('T')[0],
            periodEnd: null,
          },
    });
  } catch (error) {
    console.error('[GET-SUBSCRIPTION] Error:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
