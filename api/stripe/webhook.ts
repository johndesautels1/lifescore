/**
 * LIFE SCORE - Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle.
 * Updates user tier and subscription records in Supabase.
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY (for server-side operations)
 *
 * Webhook events handled:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Use service role key for server-side database operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

/**
 * Map Stripe price IDs to user tiers
 */
function getTierFromPriceId(priceId: string): 'pro' | 'enterprise' | null {
  const navigatorPrices = [
    process.env.STRIPE_PRICE_NAVIGATOR_MONTHLY,
    process.env.STRIPE_PRICE_NAVIGATOR_ANNUAL,
  ];
  const sovereignPrices = [
    process.env.STRIPE_PRICE_SOVEREIGN_MONTHLY,
    process.env.STRIPE_PRICE_SOVEREIGN_ANNUAL,
  ];

  if (navigatorPrices.includes(priceId)) return 'pro';
  if (sovereignPrices.includes(priceId)) return 'enterprise';
  return null;
}

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

/**
 * Handle checkout.session.completed
 * User just completed payment
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log('[WEBHOOK] Checkout completed:', session.id);

  const userId = session.client_reference_id || session.metadata?.userId;
  if (!userId) {
    console.error('[WEBHOOK] No userId in session');
    return;
  }

  // Subscription ID will be available
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('[WEBHOOK] No subscription ID in session');
    return;
  }

  // Fetch full subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : null;

  if (!tier) {
    console.error('[WEBHOOK] Could not determine tier from price:', priceId);
    return;
  }

  // Update user tier in profiles
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({ tier })
    .eq('id', userId);

  if (profileError) {
    console.error('[WEBHOOK] Failed to update profile tier:', profileError);
  } else {
    console.log('[WEBHOOK] Updated user tier:', userId, tier);
  }

  // Create/update subscription record
  const { error: subError } = await supabaseAdmin.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: 'stripe_subscription_id' }
  );

  if (subError) {
    console.error('[WEBHOOK] Failed to upsert subscription:', subError);
  } else {
    console.log('[WEBHOOK] Subscription record created/updated');
  }
}

/**
 * Handle subscription updates (upgrades, downgrades, cancellations)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log('[WEBHOOK] Subscription updated:', subscription.id, subscription.status);

  const userId = subscription.metadata?.userId;
  const priceId = subscription.items.data[0]?.price.id;

  // Update subscription record
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      stripe_price_id: priceId,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subError) {
    console.error('[WEBHOOK] Failed to update subscription:', subError);
  }

  // If subscription is active, update tier
  if (subscription.status === 'active' && userId && priceId) {
    const tier = getTierFromPriceId(priceId);
    if (tier) {
      await supabaseAdmin.from('profiles').update({ tier }).eq('id', userId);
      console.log('[WEBHOOK] Updated tier to:', tier);
    }
  }
}

/**
 * Handle subscription deletion (canceled and period ended)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log('[WEBHOOK] Subscription deleted:', subscription.id);

  // Find user from subscription record
  // FIX 2026-01-29: Use maybeSingle() - subscription may not exist
  const { data: subRecord } = await supabaseAdmin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (subRecord?.user_id) {
    // Downgrade user to free tier
    await supabaseAdmin
      .from('profiles')
      .update({ tier: 'free' })
      .eq('id', subRecord.user_id);

    console.log('[WEBHOOK] Downgraded user to free:', subRecord.user_id);
  }

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('stripe_subscription_id', subscription.id);
}

/**
 * Handle payment failures
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('[WEBHOOK] Payment failed:', invoice.id);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  // TODO: Send email notification to user about failed payment
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only POST allowed
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verify configuration
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[WEBHOOK] Stripe not configured');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  // Get raw body for signature verification
  const rawBody = await getRawBody(req);
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('[WEBHOOK] Signature verification failed:', error);
    res.status(400).json({
      error: 'Webhook signature verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }

  console.log('[WEBHOOK] Received event:', event.type);

  try {
    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        // Payment successful - subscription should already be updated
        console.log('[WEBHOOK] Payment succeeded:', (event.data.object as Stripe.Invoice).id);
        break;

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error processing event:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get raw body from request for signature verification
 */
async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
