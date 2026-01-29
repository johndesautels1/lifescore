/**
 * LIFE SCORE - Stripe Customer Portal API
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to update payment methods, cancel subscriptions, etc.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// ============================================================================
// TYPES
// ============================================================================

interface PortalRequest {
  userId: string;
  returnUrl?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check Stripe is configured
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(500).json({
      error: 'Stripe not configured',
      message: 'STRIPE_SECRET_KEY environment variable is not set',
    });
    return;
  }

  try {
    const body = req.body as PortalRequest;

    if (!body.userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Get user's Stripe customer ID from subscription record
    // FIX 2026-01-29: Use maybeSingle() - subscription may not exist
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', body.userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subError || !subscription?.stripe_customer_id) {
      res.status(404).json({
        error: 'No active subscription found',
        message: 'User does not have an active subscription to manage',
      });
      return;
    }

    console.log('[PORTAL] Creating portal session for customer:', subscription.stripe_customer_id);

    // Get base URL for return
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173';

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: body.returnUrl || `${baseUrl}/?portal=returned`,
    });

    console.log('[PORTAL] Portal session created:', session.id);

    res.status(200).json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('[PORTAL] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
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
