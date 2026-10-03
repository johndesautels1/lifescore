/**
 * LIFE SCORE - Stripe Checkout Session API
 *
 * Starts a plan purchase on Stripe's hosted pages.
 *
 * - A new subscriber goes to Stripe Checkout.
 * - A customer who already pays for a plan and picks the other one goes to
 *   Stripe's plan-change confirmation page for the subscription they hold.
 *   Before 2026-10-03 they went to Checkout again and ended up with TWO
 *   subscriptions, billed for both.
 * - A returning customer is checked out as their existing Stripe customer, so
 *   their invoices and cards stay in one place.
 *
 * Prices, plans, redirects and the Stripe connection: api/shared/stripe.ts.
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY (must be sk_live_ or sk_test_, NOT rk_)
 * - STRIPE_PRICE_NAVIGATOR_MONTHLY / _ANNUAL, STRIPE_PRICE_SOVEREIGN_MONTHLY / _ANNUAL
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import {
  ENTITLING_STATUSES,
  PRICE_CATALOGUE,
  appBaseUrl,
  getStripe,
  isAllowedRedirectUrl,
  isPriceKey,
  isStripeError,
  priceIdFor,
} from '../shared/stripe.js';

const DB_TIMEOUT_MS = 8_000;

interface SubscriptionRow {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  status: string | null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

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

  // The signed-in user — the body's userId/userEmail are never trusted.
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body: Record<string, unknown> =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const priceKey = body.priceKey;
  const successUrl = optionalString(body.successUrl);
  const cancelUrl = optionalString(body.cancelUrl);

  if (!priceKey) {
    res.status(400).json({ error: 'Missing required fields', required: ['priceKey'] });
    return;
  }
  if (!isPriceKey(priceKey)) {
    res.status(400).json({ error: 'Invalid price key or price not configured', priceKey });
    return;
  }

  // FIX X1: Validate redirect URLs against allowlist
  if (!isAllowedRedirectUrl(successUrl) || !isAllowedRedirectUrl(cancelUrl)) {
    res.status(400).json({ error: 'Invalid redirect URL' });
    return;
  }

  const priceId = priceIdFor(priceKey);
  if (!priceId) {
    res.status(400).json({
      error: 'Invalid price key or price not configured',
      priceKey,
      hint: `Set ${PRICE_CATALOGUE[priceKey].env} environment variable`,
    });
    return;
  }

  const baseUrl = appBaseUrl(req.headers.origin);

  try {
    const { data, error: rowsError } = await db
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, stripe_price_id, status')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
    if (rowsError) {
      console.error('[STRIPE] Could not read subscriptions:', rowsError.message);
      res.status(500).json({ error: 'Failed to create checkout session', message: 'Could not read your plan' });
      return;
    }
    const rows = (data ?? []) as SubscriptionRow[];

    // Already paying: change the plan on the subscription they hold.
    const current = rows.find((row) => row.status !== null && ENTITLING_STATUSES.includes(row.status));
    if (current?.stripe_subscription_id && current.stripe_customer_id) {
      if (current.stripe_price_id === priceId) {
        res.status(409).json({ error: 'Already subscribed to this plan' });
        return;
      }
      const subscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
      const item = subscription.items.data[0];
      if (!item) {
        res.status(409).json({ error: 'Subscription has no plan item; use Manage Subscription' });
        return;
      }
      const portal = await stripe.billingPortal.sessions.create({
        customer: current.stripe_customer_id,
        return_url: cancelUrl || `${baseUrl}/?portal=returned`,
        flow_data: {
          type: 'subscription_update_confirm',
          subscription_update_confirm: {
            subscription: subscription.id,
            items: [{ id: item.id, price: priceId, quantity: 1 }],
          },
          after_completion: {
            type: 'redirect',
            redirect: { return_url: successUrl || `${baseUrl}/?checkout=success` },
          },
        },
      });
      console.log('[STRIPE] Plan change started:', { userId: auth.userId, priceKey, subscription: subscription.id });
      res.status(200).json({ success: true, url: portal.url, planChange: true });
      return;
    }

    console.log('[STRIPE] Creating checkout session:', { priceKey, priceId, userId: auth.userId });

    const knownCustomer = rows.find((row) => row.stripe_customer_id)?.stripe_customer_id ?? null;
    const params = (customer: string | null): Stripe.Checkout.SessionCreateParams => ({
      mode: 'subscription',
      allowed_payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(customer ? { customer } : { customer_email: auth.email || undefined }),
      client_reference_id: auth.userId, // For webhook to identify user
      metadata: { userId: auth.userId, priceKey },
      success_url: successUrl || `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/?checkout=canceled`,
      subscription_data: { metadata: { userId: auth.userId } },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax
      billing_address_collection: 'required',
    });

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create(params(knownCustomer));
    } catch (error) {
      // A customer deleted in the Stripe dashboard: start fresh with their email.
      if (knownCustomer && isStripeError(error) && error.code === 'resource_missing') {
        session = await stripe.checkout.sessions.create(params(null));
      } else {
        throw error;
      }
    }

    console.log('[STRIPE] Checkout session created:', session.id);

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[STRIPE] Checkout error:', error);

    if (isStripeError(error)) {
      res.status(400).json({
        error: 'Stripe error',
        message: error.message,
        type: error.type,
      });
      return;
    }

    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
