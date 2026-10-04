/**
 * LIFE SCORE - Stripe: the one connection to Stripe, the one map from Stripe
 * prices to plans, and the readers that cope with Stripe's changing shapes.
 *
 * 1. getStripe() — every payment route uses it; no route calls `new Stripe()`.
 *    The API version is the one the installed SDK is built for (stripe@23 →
 *    2026-09-30.endive). tests/stripe.test.ts fails the build if the two ever
 *    differ, so an SDK upgrade cannot leave the version behind again (it sat
 *    on 2024-12-18.acacia for 21 months).
 * 2. Prices → plans — the four STRIPE_PRICE_* settings, read in ONE place.
 *    Navigator = 'pro', Sovereign = 'enterprise' (api/shared/plans.ts).
 * 3. Readers — a webhook arrives in the API version of the webhook ENDPOINT
 *    (set in the Stripe dashboard), which can be older than ours. Since
 *    2025-03-31.basil a subscription's billing period lives on its items and an
 *    invoice names its subscription under parent.subscription_details. The
 *    readers accept both shapes; the webhook also re-reads every subscription
 *    through getStripe(), so the row it stores is always the current shape.
 * 4. Redirects — checkout and the billing portal send a customer back only to
 *    our own sites, and by default to the site they started on.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import Stripe from 'stripe';
import { USER_TIERS, type UserTier } from './plans.js';
import { PROJECT_VERCEL_SITE, PUBLIC_SITE } from './siteUrl.js';

// ============================================================================
// CONNECTION
// ============================================================================

/** The Stripe API version this app is written against (= the SDK's pinned version). */
export const STRIPE_API_VERSION = '2026-09-30.endive' as const;

/** How long one Stripe call may take before it is abandoned. */
const STRIPE_TIMEOUT_MS = 20_000;

let stripeClient: Stripe | null = null;

/** The shared Stripe client, or null when STRIPE_SECRET_KEY is not set (callers answer 500). */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      timeout: STRIPE_TIMEOUT_MS,
    });
  }
  return stripeClient;
}

/** True for an error Stripe itself raised (bad request, card declined, network…). */
export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return error instanceof Stripe.errors.StripeError;
}

// ============================================================================
// PRICES → PLANS
// ============================================================================

export type PaidTier = Exclude<UserTier, 'free'>;

export type PriceKey = 'navigator_monthly' | 'navigator_annual' | 'sovereign_monthly' | 'sovereign_annual';

/** Each price the pricing screens sell: the setting that holds its Stripe id, and the plan it buys. */
export const PRICE_CATALOGUE: Readonly<Record<PriceKey, { env: string; tier: PaidTier }>> = {
  navigator_monthly: { env: 'STRIPE_PRICE_NAVIGATOR_MONTHLY', tier: 'pro' },
  navigator_annual: { env: 'STRIPE_PRICE_NAVIGATOR_ANNUAL', tier: 'pro' },
  sovereign_monthly: { env: 'STRIPE_PRICE_SOVEREIGN_MONTHLY', tier: 'enterprise' },
  sovereign_annual: { env: 'STRIPE_PRICE_SOVEREIGN_ANNUAL', tier: 'enterprise' },
};

const PRICE_KEYS = Object.keys(PRICE_CATALOGUE) as PriceKey[];

/** Narrow an untrusted request value to one of the four price keys. */
export function isPriceKey(value: unknown): value is PriceKey {
  return typeof value === 'string' && (PRICE_KEYS as string[]).includes(value);
}

/** The Stripe price id configured for a price key, or null when its setting is empty. */
export function priceIdFor(key: PriceKey): string | null {
  return process.env[PRICE_CATALOGUE[key].env] || null;
}

/** The plan a Stripe price buys, or null for a price this app does not sell. */
export function tierForPriceId(priceId: string | null | undefined): PaidTier | null {
  if (!priceId) return null;
  for (const key of PRICE_KEYS) {
    if (priceIdFor(key) === priceId) return PRICE_CATALOGUE[key].tier;
  }
  return null;
}

/**
 * Subscription states that keep a paid plan. past_due keeps it while Stripe
 * retries the card; canceled, unpaid, paused and incomplete_expired do not.
 * 'incomplete' (first payment still pending) grants nothing yet.
 */
export const ENTITLING_STATUSES: readonly string[] = ['active', 'trialing', 'past_due'];

/** The best plan among a user's subscription rows (free when none entitles). */
export function bestTier(rows: ReadonlyArray<{ status: string | null; stripe_price_id: string | null }>): UserTier {
  let best: UserTier = 'free';
  for (const row of rows) {
    if (!row.status || !ENTITLING_STATUSES.includes(row.status)) continue;
    const tier = tierForPriceId(row.stripe_price_id);
    if (tier && USER_TIERS.indexOf(tier) > USER_TIERS.indexOf(best)) best = tier;
  }
  return best;
}

// ============================================================================
// READERS (both pre- and post-basil shapes)
// ============================================================================

function readNumber(source: unknown, key: string): number | null {
  if (typeof source !== 'object' || source === null) return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** The id of a Stripe reference that may be a bare id or an expanded object. */
export function stripeId(ref: unknown): string | null {
  if (typeof ref === 'string') return ref || null;
  if (typeof ref === 'object' && ref !== null) {
    const id = (ref as Record<string, unknown>).id;
    return typeof id === 'string' && id ? id : null;
  }
  return null;
}

/**
 * The current billing period of a subscription, in Unix seconds. Read from its
 * first item (2025-03-31.basil and later), else from the subscription itself
 * (older payloads). Null when neither carries one.
 */
export function subscriptionPeriod(subscription: Stripe.Subscription): { start: number; end: number } | null {
  for (const item of subscription.items?.data ?? []) {
    const start = readNumber(item, 'current_period_start');
    const end = readNumber(item, 'current_period_end');
    if (start !== null && end !== null) return { start, end };
  }
  const start = readNumber(subscription, 'current_period_start');
  const end = readNumber(subscription, 'current_period_end');
  return start !== null && end !== null ? { start, end } : null;
}

/**
 * The subscription an invoice bills: parent.subscription_details.subscription
 * (2025-03-31.basil and later), else the older top-level `subscription`.
 */
export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = stripeId(invoice.parent?.subscription_details?.subscription);
  if (fromParent) return fromParent;
  return stripeId((invoice as unknown as Record<string, unknown>).subscription);
}

/** Unix seconds → ISO timestamp (null stays null). */
export function unixToIso(seconds: number | null | undefined): string | null {
  return typeof seconds === 'number' && Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : null;
}

// ============================================================================
// REDIRECTS
// ============================================================================

// The project's own addresses only (api/shared/siteUrl.ts). Until 4 Oct 2026 this
// list held https://lifescore.vercel.app, which is someone else's site, so a
// checkout could be sent back there.
const FIXED_ORIGINS: readonly string[] = [
  PROJECT_VERCEL_SITE,
  'https://www.clueslifescore.com',
  PUBLIC_SITE,
  'capacitor://localhost',
];

function allowedOrigins(): string[] {
  const origins = [...FIXED_ORIGINS];
  if (process.env.VERCEL_URL) origins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  if (process.env.PRODUCTION_URL) origins.push(process.env.PRODUCTION_URL.replace(/\/+$/, ''));
  return origins;
}

function isLocalDev(parsed: URL): boolean {
  return parsed.protocol === 'http:' && parsed.hostname === 'localhost';
}

/** True when a redirect target is one of our own sites (an absent target is safe: the default is used). */
export function isAllowedRedirectUrl(url: unknown): boolean {
  if (url === undefined || url === null || url === '') return true;
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return isLocalDev(parsed) || allowedOrigins().includes(parsed.origin);
  } catch {
    return false;
  }
}

/**
 * Where to send a customer back to: the site they started on when it is one of
 * ours (so they stay signed in — a session lives on one site), else the
 * production site. Before 2026-10-03 this was VERCEL_URL, the per-deployment
 * address, so customers came back from paying to a different site, signed out.
 */
export function appBaseUrl(requestOrigin: unknown): string {
  if (typeof requestOrigin === 'string' && requestOrigin) {
    try {
      const parsed = new URL(requestOrigin);
      const webOrigin = parsed.protocol === 'https:' || isLocalDev(parsed);
      if (webOrigin && (isLocalDev(parsed) || allowedOrigins().includes(parsed.origin))) return parsed.origin;
    } catch {
      // not a URL — fall through to the production site
    }
  }
  if (process.env.PRODUCTION_URL) return process.env.PRODUCTION_URL.replace(/\/+$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}
