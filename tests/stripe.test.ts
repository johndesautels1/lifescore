/**
 * LIFE SCORE - Stripe guards (anti-drift).
 *
 * Until 2026-10-03 each payment route built its own Stripe client on API
 * version 2024-12-18.acacia (21 months behind the SDK), read billing periods
 * from a field Stripe moved in 2025, fell back to the PUBLIC database key, and
 * answered Stripe 200 when a plan update failed. These tests pin the fixes:
 * one Stripe connection on the SDK's own API version, one price → plan map,
 * readers that accept both payload shapes, and no public-key fallback.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import Stripe from 'stripe';
import {
  STRIPE_API_VERSION,
  appBaseUrl,
  bestTier,
  invoiceSubscriptionId,
  isAllowedRedirectUrl,
  isPriceKey,
  priceIdFor,
  stripeId,
  subscriptionPeriod,
  tierForPriceId,
} from '../api/shared/stripe';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

const API = sourceFiles('api');
const PAYMENT_ROUTES = API.filter((f) => f.startsWith('api/stripe/'));

beforeEach(() => {
  vi.stubEnv('STRIPE_PRICE_NAVIGATOR_MONTHLY', 'price_nav_m');
  vi.stubEnv('STRIPE_PRICE_NAVIGATOR_ANNUAL', 'price_nav_a');
  vi.stubEnv('STRIPE_PRICE_SOVEREIGN_MONTHLY', 'price_sov_m');
  vi.stubEnv('STRIPE_PRICE_SOVEREIGN_ANNUAL', 'price_sov_a');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('one Stripe connection on the SDK version', () => {
  it('the API version is the one the installed SDK is built for', () => {
    expect(STRIPE_API_VERSION).toBe(Stripe.API_VERSION);
  });

  it('no file but api/shared/stripe.ts creates a Stripe client or names an API version', () => {
    const offenders = API.filter(
      (f) => f !== 'api/shared/stripe.ts' && /new Stripe\(|apiVersion:\s*['"]20\d\d-/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no file reads the STRIPE_PRICE_* settings but api/shared/stripe.ts and the settings list', () => {
    const allowed = new Set(['api/shared/stripe.ts', 'api/admin/env-check.ts']);
    const offenders = API.filter(
      (f) => !allowed.has(f) && /process\.env\.STRIPE_PRICE_|['"]STRIPE_PRICE_/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('checkout uses allowed_payment_method_types (payment_method_types was removed in 2026-09-30.endive)', () => {
    const offenders = API.filter((f) => /\bpayment_method_types\s*:/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('payment routes use the service database connection only', () => {
  it('no payment route builds its own database client or touches the public key', () => {
    const offenders = PAYMENT_ROUTES.filter((f) => /createClient\(|SUPABASE_ANON_KEY|process\.env\.SUPABASE_/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the shared service connection never falls back to the public key', () => {
    expect(readFileSync('api/shared/supabaseAdmin.ts', 'utf8')).not.toMatch(/ANON_KEY/);
  });

  it('the webhook answers 500 on a failed write so Stripe retries', () => {
    const webhook = readFileSync('api/stripe/webhook.ts', 'utf8');
    expect(webhook).toMatch(/throw new WebhookWriteError/);
    expect(webhook).toMatch(/res\.status\(500\)\.json\(\{\s*error: 'Webhook processing failed'/);
  });

  it('no route that talks to Stripe reads the billing period off the subscription itself', () => {
    const offenders = PAYMENT_ROUTES.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return /from 'stripe'/.test(src) && /subscription\.current_period_(start|end)/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});

describe('prices → plans', () => {
  it('Navigator prices buy pro, Sovereign prices buy enterprise, anything else nothing', () => {
    expect(tierForPriceId('price_nav_m')).toBe('pro');
    expect(tierForPriceId('price_nav_a')).toBe('pro');
    expect(tierForPriceId('price_sov_m')).toBe('enterprise');
    expect(tierForPriceId('price_sov_a')).toBe('enterprise');
    expect(tierForPriceId('price_other')).toBeNull();
    expect(tierForPriceId(null)).toBeNull();
  });

  it('price keys are narrowed and read from their settings', () => {
    expect(isPriceKey('sovereign_annual')).toBe(true);
    expect(isPriceKey('sovereign')).toBe(false);
    expect(isPriceKey(7)).toBe(false);
    expect(priceIdFor('navigator_monthly')).toBe('price_nav_m');
    vi.stubEnv('STRIPE_PRICE_NAVIGATOR_MONTHLY', '');
    expect(priceIdFor('navigator_monthly')).toBeNull();
  });

  it('the best entitling subscription sets the plan; ended ones grant nothing', () => {
    expect(bestTier([])).toBe('free');
    expect(bestTier([{ status: 'active', stripe_price_id: 'price_nav_m' }])).toBe('pro');
    expect(bestTier([{ status: 'past_due', stripe_price_id: 'price_sov_a' }])).toBe('enterprise');
    expect(bestTier([{ status: 'canceled', stripe_price_id: 'price_sov_a' }])).toBe('free');
    expect(bestTier([{ status: 'unpaid', stripe_price_id: 'price_sov_a' }])).toBe('free');
    expect(bestTier([{ status: 'incomplete', stripe_price_id: 'price_sov_a' }])).toBe('free');
    expect(
      bestTier([
        { status: 'canceled', stripe_price_id: 'price_sov_m' },
        { status: 'active', stripe_price_id: 'price_nav_a' },
      ]),
    ).toBe('pro');
  });
});

describe('readers accept both payload shapes', () => {
  it('billing period from the item (basil and later) or the subscription (older)', () => {
    const current = { items: { data: [{ current_period_start: 100, current_period_end: 200 }] } };
    const older = { items: { data: [{}] }, current_period_start: 10, current_period_end: 20 };
    expect(subscriptionPeriod(current as unknown as Stripe.Subscription)).toEqual({ start: 100, end: 200 });
    expect(subscriptionPeriod(older as unknown as Stripe.Subscription)).toEqual({ start: 10, end: 20 });
    expect(subscriptionPeriod({ items: { data: [] } } as unknown as Stripe.Subscription)).toBeNull();
  });

  it("an invoice's subscription from parent.subscription_details (basil and later) or the older field", () => {
    const current = { parent: { subscription_details: { subscription: 'sub_new' } } };
    const expanded = { parent: { subscription_details: { subscription: { id: 'sub_obj' } } } };
    const older = { subscription: 'sub_old' };
    expect(invoiceSubscriptionId(current as unknown as Stripe.Invoice)).toBe('sub_new');
    expect(invoiceSubscriptionId(expanded as unknown as Stripe.Invoice)).toBe('sub_obj');
    expect(invoiceSubscriptionId(older as unknown as Stripe.Invoice)).toBe('sub_old');
    expect(invoiceSubscriptionId({ parent: null } as unknown as Stripe.Invoice)).toBeNull();
  });

  it('a reference may be an id or an expanded object', () => {
    expect(stripeId('cus_1')).toBe('cus_1');
    expect(stripeId({ id: 'cus_2' })).toBe('cus_2');
    expect(stripeId(null)).toBeNull();
    expect(stripeId('')).toBeNull();
  });
});

describe('redirects stay on our sites', () => {
  it('accepts our sites and local development, refuses others', () => {
    expect(isAllowedRedirectUrl(undefined)).toBe(true);
    expect(isAllowedRedirectUrl('https://clueslifescore.com/?checkout=success')).toBe(true);
    expect(isAllowedRedirectUrl('http://localhost:5173/')).toBe(true);
    expect(isAllowedRedirectUrl('https://evil.example/')).toBe(false);
    expect(isAllowedRedirectUrl('not a url')).toBe(false);
    expect(isAllowedRedirectUrl(42)).toBe(false);
  });

  it('returns customers to the site they started on, else the production site', () => {
    vi.stubEnv('VERCEL_URL', 'lifescore-abc123.vercel.app');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'clueslifescore.com');
    vi.stubEnv('PRODUCTION_URL', '');
    expect(appBaseUrl('https://www.clueslifescore.com')).toBe('https://www.clueslifescore.com');
    expect(appBaseUrl('https://evil.example')).toBe('https://clueslifescore.com');
    expect(appBaseUrl('capacitor://localhost')).toBe('https://clueslifescore.com');
    expect(appBaseUrl(undefined)).toBe('https://clueslifescore.com');
  });
});
