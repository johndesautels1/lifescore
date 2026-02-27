/**
 * LIFE SCORE - Stripe Checkout Session API
 *
 * Creates a Stripe Checkout session for subscription purchases.
 * Redirects user to Stripe's hosted checkout page.
 *
 * Required env vars:
 * - STRIPE_SECRET_KEY (must be sk_live_ or sk_test_, NOT rk_)
 * - STRIPE_PRICE_NAVIGATOR_MONTHLY
 * - STRIPE_PRICE_NAVIGATOR_ANNUAL
 * - STRIPE_PRICE_SOVEREIGN_MONTHLY
 * - STRIPE_PRICE_SOVEREIGN_ANNUAL
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Price ID mapping from tier+interval to Stripe price ID
 */
const PRICE_IDS: Record<string, string | undefined> = {
  navigator_monthly: process.env.STRIPE_PRICE_NAVIGATOR_MONTHLY,
  navigator_annual: process.env.STRIPE_PRICE_NAVIGATOR_ANNUAL,
  sovereign_monthly: process.env.STRIPE_PRICE_SOVEREIGN_MONTHLY,
  sovereign_annual: process.env.STRIPE_PRICE_SOVEREIGN_ANNUAL,
};

/**
 * Map price IDs to tier names for database updates
 */
const PRICE_TO_TIER: Record<string, 'pro' | 'enterprise'> = {};

// Build reverse mapping at startup
if (process.env.STRIPE_PRICE_NAVIGATOR_MONTHLY) {
  PRICE_TO_TIER[process.env.STRIPE_PRICE_NAVIGATOR_MONTHLY] = 'pro';
}
if (process.env.STRIPE_PRICE_NAVIGATOR_ANNUAL) {
  PRICE_TO_TIER[process.env.STRIPE_PRICE_NAVIGATOR_ANNUAL] = 'pro';
}
if (process.env.STRIPE_PRICE_SOVEREIGN_MONTHLY) {
  PRICE_TO_TIER[process.env.STRIPE_PRICE_SOVEREIGN_MONTHLY] = 'enterprise';
}
if (process.env.STRIPE_PRICE_SOVEREIGN_ANNUAL) {
  PRICE_TO_TIER[process.env.STRIPE_PRICE_SOVEREIGN_ANNUAL] = 'enterprise';
}

// ============================================================================
// TYPES
// ============================================================================

interface CheckoutRequest {
  priceKey: 'navigator_monthly' | 'navigator_annual' | 'sovereign_monthly' | 'sovereign_annual';
  userId: string;
  userEmail: string;
  successUrl?: string;
  cancelUrl?: string;
}

// FIX X1: Validate redirect URLs to prevent open redirect attacks
function isAllowedRedirectUrl(url: string | undefined): boolean {
  if (!url) return true; // undefined means use default — safe
  try {
    const parsed = new URL(url);
    const allowedOrigins = [
      'https://lifescore.vercel.app',
      'https://www.thelifescore.com',
      'https://thelifescore.com',
      'capacitor://localhost',
    ];
    // Allow the current Vercel deploy URL
    if (process.env.VERCEL_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    // Allow custom production domain from env
    if (process.env.PRODUCTION_URL) {
      allowedOrigins.push(process.env.PRODUCTION_URL);
    }
    // Allow localhost in development
    if (parsed.hostname === 'localhost' && parsed.protocol === 'http:') {
      return true;
    }
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false; // Malformed URL
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - restricted to deployment origin
  if (handleCors(req, res, 'restricted')) return;

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

  // Verify JWT Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const body = req.body as CheckoutRequest;

    // Validate required fields
    if (!body.priceKey) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['priceKey'],
      });
      return;
    }

    // Override userId and userEmail with authenticated values to prevent IDOR
    body.userId = user.id;
    body.userEmail = user.email || body.userEmail;

    // FIX X1: Validate redirect URLs against allowlist
    if (!isAllowedRedirectUrl(body.successUrl) || !isAllowedRedirectUrl(body.cancelUrl)) {
      res.status(400).json({ error: 'Invalid redirect URL' });
      return;
    }

    // Get price ID
    const priceId = PRICE_IDS[body.priceKey];
    if (!priceId) {
      res.status(400).json({
        error: 'Invalid price key or price not configured',
        priceKey: body.priceKey,
        hint: `Set STRIPE_PRICE_${body.priceKey.toUpperCase().replace('_', '_')} environment variable`,
      });
      return;
    }

    console.log('[STRIPE] Creating checkout session:', {
      priceKey: body.priceKey,
      priceId,
      userId: body.userId,
    });

    // Get base URL for redirects
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:5173';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: body.userEmail,
      client_reference_id: body.userId, // For webhook to identify user
      metadata: {
        userId: body.userId,
        priceKey: body.priceKey,
      },
      success_url: body.successUrl || `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl || `${baseUrl}/?checkout=canceled`,
      subscription_data: {
        metadata: {
          userId: body.userId,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Collect billing address for tax
      billing_address_collection: 'required',
    });

    console.log('[STRIPE] Checkout session created:', session.id);

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('[STRIPE] Checkout error:', error);

    if (error instanceof Stripe.errors.StripeError) {
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

// Export price mapping for webhook
export { PRICE_TO_TIER };
