/**
 * LIFE SCORE - Stripe Customer Portal API
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to update payment methods, cancel subscriptions, etc.
 *
 * The portal opens for anyone who has ever been a Stripe customer here. Before
 * 2026-10-03 it opened only for an 'active' subscription, so a customer whose
 * card had just failed (past_due) — the one who most needs to change it — was
 * told they had no subscription.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import { appBaseUrl, getStripe, isAllowedRedirectUrl, isStripeError } from '../shared/stripe.js';

const DB_TIMEOUT_MS = 8_000;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // CORS - restricted to deployment origin
  if (handleCors(req, res, 'restricted')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripe = getStripe();
  if (!stripe) {
    res.status(500).json({
      error: 'Stripe not configured',
      message: 'STRIPE_SECRET_KEY environment variable is not set',
    });
    return;
  }
  const db = getServiceClient();
  if (!db) {
    res.status(500).json({ error: 'Database not configured' });
    return;
  }

  // The signed-in user — the body's userId is never trusted.
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body: Record<string, unknown> =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const returnUrl = typeof body.returnUrl === 'string' && body.returnUrl ? body.returnUrl : undefined;

  // FIX X2: Validate return URL against allowlist
  if (!isAllowedRedirectUrl(returnUrl)) {
    res.status(400).json({ error: 'Invalid redirect URL' });
    return;
  }

  try {
    // The customer of the user's most recent subscription, whatever its state.
    const { data: subscription, error: subError } = await db
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', auth.userId)
      .not('stripe_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS))
      .maybeSingle();

    const customerId = typeof subscription?.stripe_customer_id === 'string' ? subscription.stripe_customer_id : null;
    if (subError || !customerId) {
      if (subError) console.error('[PORTAL] Could not read subscriptions:', subError.message);
      res.status(404).json({
        error: 'No active subscription found',
        message: 'User does not have an active subscription to manage',
      });
      return;
    }

    console.log('[PORTAL] Creating portal session for customer:', customerId);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${appBaseUrl(req.headers.origin)}/?portal=returned`,
    });

    console.log('[PORTAL] Portal session created:', session.id);

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('[PORTAL] Error:', error);

    if (isStripeError(error)) {
      res.status(400).json({
        error: 'Stripe error',
        message: error.message,
        type: error.type,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create portal session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
