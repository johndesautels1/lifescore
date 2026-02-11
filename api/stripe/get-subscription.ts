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
  // CORS - restricted to deployment origin
  if (handleCors(req, res, 'restricted', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify JWT Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  const authClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Use the authenticated user's ID — ignore any userId from query params
  const userId = user.id;

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
