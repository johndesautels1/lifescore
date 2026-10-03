/**
 * LIFE SCORE - Stripe Webhook Handler
 *
 * Keeps each customer's plan in step with Stripe. On every subscription event
 * the handler re-reads the subscription from Stripe (so out-of-order or
 * older-shaped payloads cannot store a stale state), stores it, and sets the
 * owner's plan from ALL their subscriptions (api/shared/stripe.ts bestTier).
 *
 * A failed database write answers 500, so Stripe retries the event (it retries
 * for up to three days). Before 2026-10-03 failures were logged and answered
 * 200 — Stripe never retried, and a paying customer could stay on Free.
 * Every step is idempotent, so a retry is always safe.
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)
 *
 * Webhook events handled:
 * - checkout.session.completed
 * - customer.subscription.created / updated / deleted / paused / resumed
 * - invoice.payment_succeeded / invoice.payment_failed
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import { readRawBody } from '../shared/rawBody.js';
import {
  bestTier,
  getStripe,
  invoiceSubscriptionId,
  stripeId,
  subscriptionPeriod,
  unixToIso,
} from '../shared/stripe.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Per database call. Stripe waits up to 20 s for an answer before it counts a failure. */
const DB_TIMEOUT_MS = 8_000;

function dbDeadline(): AbortSignal {
  return AbortSignal.timeout(DB_TIMEOUT_MS);
}

/** A write that must succeed before the event is acknowledged. */
class WebhookWriteError extends Error {
  constructor(step: string, detail: string) {
    super(`[WEBHOOK] ${step} failed: ${detail}`);
    this.name = 'WebhookWriteError';
  }
}

// ============================================================================
// SUBSCRIPTION SYNC
// ============================================================================

/** Which user a subscription belongs to: the checkout's user, its metadata, else our stored row. */
async function ownerOf(
  db: SupabaseClient,
  subscription: Stripe.Subscription,
  userHint: string | null
): Promise<string | null> {
  if (userHint) return userHint;
  const fromMetadata = subscription.metadata?.userId;
  if (fromMetadata) return fromMetadata;

  const { data, error } = await db
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .abortSignal(dbDeadline())
    .maybeSingle();
  if (error) throw new WebhookWriteError('Find subscription owner', error.message);
  return typeof data?.user_id === 'string' ? data.user_id : null;
}

/**
 * Store Stripe's current view of one subscription, then set its owner's plan
 * from every subscription they hold.
 */
async function syncSubscription(
  stripe: Stripe,
  db: SupabaseClient,
  subscriptionId: string,
  userHint: string | null = null
): Promise<void> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = await ownerOf(db, subscription, userHint);
  if (!userId) {
    // Not started from this app (e.g. made by hand in the Stripe dashboard).
    console.warn('[WEBHOOK] Subscription has no LifeScore user; nothing stored:', subscription.id);
    return;
  }

  const customerId = stripeId(subscription.customer);
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const period = subscriptionPeriod(subscription);
  if (!customerId || !priceId || !period) {
    throw new WebhookWriteError(
      'Read subscription',
      `${subscription.id} is missing ${!customerId ? 'customer' : !priceId ? 'price' : 'billing period'}`
    );
  }

  const { error: upsertError } = await db
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        status: subscription.status,
        current_period_start: unixToIso(period.start),
        current_period_end: unixToIso(period.end),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: unixToIso(subscription.canceled_at),
      },
      { onConflict: 'stripe_subscription_id' }
    )
    .abortSignal(dbDeadline());
  if (upsertError) throw new WebhookWriteError('Store subscription', upsertError.message);

  const { data: rows, error: rowsError } = await db
    .from('subscriptions')
    .select('status, stripe_price_id')
    .eq('user_id', userId)
    .abortSignal(dbDeadline());
  if (rowsError) throw new WebhookWriteError('Read user subscriptions', rowsError.message);

  const tier = bestTier(rows ?? []);
  const { error: profileError } = await db
    .from('profiles')
    .update({ tier })
    .eq('id', userId)
    .abortSignal(dbDeadline());
  if (profileError) throw new WebhookWriteError('Set plan', profileError.message);

  console.log('[WEBHOOK] Subscription', subscription.id, subscription.status, '→ plan', tier, 'for', userId);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/** checkout.session.completed — the customer just paid. */
async function onCheckoutCompleted(stripe: Stripe, db: SupabaseClient, session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription') return;
  const subscriptionId = stripeId(session.subscription);
  if (!subscriptionId) {
    console.error('[WEBHOOK] Checkout session has no subscription:', session.id);
    return;
  }
  const userId = session.client_reference_id || session.metadata?.userId || null;
  await syncSubscription(stripe, db, subscriptionId, userId);
}

/** invoice.payment_succeeded / invoice.payment_failed — the subscription's state may have moved. */
async function onInvoice(stripe: Stripe, db: SupabaseClient, invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return; // a one-off invoice, not a plan
  await syncSubscription(stripe, db, subscriptionId);
  // TODO: Send email notification to user about failed payment
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = getServiceClient();
  if (!stripe || !webhookSecret || !db) {
    console.error('[WEBHOOK] Not configured:', { stripe: !!stripe, webhookSecret: !!webhookSecret, database: !!db });
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string' || !signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[WEBHOOK] Signature verification failed:', error);
    res.status(400).json({
      error: 'Webhook signature verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }

  console.log('[WEBHOOK] Received event:', event.type, event.id);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(stripe, db, event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
        await syncSubscription(stripe, db, event.data.object.id);
        break;

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await onInvoice(stripe, db, event.data.object);
        break;

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    // 500 → Stripe retries the event later.
    console.error('[WEBHOOK] Error processing event', event.id, error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
