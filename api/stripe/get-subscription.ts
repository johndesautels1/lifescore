/**
 * LIFE SCORE - Get Subscription Status API
 *
 * Returns the current subscription status for a user.
 *
 * The usage month is the UTC calendar month that consume_usage counts in
 * (api/shared/plans.ts currentPeriodStart); before 2026-10-03 this route used
 * the server's local month and could read the wrong row near month end.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import { currentPeriodStart } from '../shared/plans.js';

const DB_TIMEOUT_MS = 8_000;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS - restricted to deployment origin
  if (handleCors(req, res, 'restricted', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const db = getServiceClient();
  if (!db) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  // Use the authenticated user's ID — ignore any userId from query params
  const auth = await requireAuth(req, res);
  if (!auth) return;
  const userId = auth.userId;

  try {
    const periodStart = currentPeriodStart();

    const [subscriptionResult, profileResult, usageResult] = await Promise.all([
      db
        .from('subscriptions')
        .select('status, stripe_price_id, current_period_end, cancel_at_period_end')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
        .maybeSingle(),
      db
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
        .maybeSingle(),
      db
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('period_start', periodStart)
        .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
        .maybeSingle(),
    ]);

    const failed = subscriptionResult.error || profileResult.error || usageResult.error;
    if (failed) throw new Error(failed.message);

    const subscription = subscriptionResult.data;
    const profile = profileResult.data;
    const usage = usageResult.data;

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
            periodStart,
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
