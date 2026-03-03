/**
 * LIFE SCORE - Beta Tester Check API
 *
 * Returns whether the authenticated user is an active beta tester
 * and their granular access configuration.
 *
 * GET /api/beta-check
 * Returns: { isBetaTester: boolean, access?: BetaAccessConfig }
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — must be logged in
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    // Service not configured — not a beta tester
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json({ isBetaTester: false });
    return;
  }

  try {
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('beta_testers')
      .select('*')
      .eq('email', auth.email.toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.status(200).json({ isBetaTester: false });
      return;
    }

    // Return full access config for the client
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes
    res.status(200).json({
      isBetaTester: true,
      access: {
        paymentBypass: data.payment_bypass,
        standardComparisonsLimit: data.standard_comparisons_limit,
        enhancedComparisonsLimit: data.enhanced_comparisons_limit,
        reportOrdering: data.report_ordering,
        askEmeiliaCustomerService: data.ask_emeilia_customer_service,
        askEmeiliaOtherCategories: data.ask_emeilia_other_categories,
        askEmeiliaChat: data.ask_emeilia_chat,
        askOliviaChatUnlimited: data.ask_olivia_chat_unlimited,
        askOliviaPageInfoUnlimited: data.ask_olivia_page_info_unlimited,
        visualsVideoPresenter: data.visuals_video_presenter,
        visualsLivePresenter: data.visuals_live_presenter,
        judgesFullAccess: data.judges_full_access,
      },
    });
  } catch (err) {
    console.error('[beta-check] Error:', err);
    // Fail safe — not a beta tester on error
    res.setHeader('Cache-Control', 'private, max-age=60'); // Retry sooner on error
    res.status(200).json({ isBetaTester: false });
  }
}
