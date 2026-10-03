/**
 * LIFE SCORE - Entitlements: the server decides what a signed-in user may use.
 *
 * Before 2026-10-03 only the screens checked plans; every paid route answered
 * anyone with a valid sign-in, and the browser kept its own usage count (which a
 * user could reset). Now:
 *   1. resolveAccess()   — plan, admin and beta status, read on the server.
 *   2. consumeFeature()  — one atomic database call (consume_usage) checks the
 *                          monthly allowance and counts the use in the same step.
 *   3. Comparison grants — a comparison is many server calls (one per category
 *                          per AI model, then the judge). It is counted ONCE, at
 *                          /api/usage/consume, which hands back a signed grant
 *                          for that city pair; /api/evaluate, /api/judge and
 *                          /api/judge-report accept work only with a valid grant.
 *
 * Plans and allowances come from ./plans.ts — never restate them here.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { requireAuth, getAdminEmails, type AuthResult } from './auth.js';
import { getServiceClient, serviceRoleKey } from './supabaseAdmin.js';
import {
  ADMIN_LIMITS,
  TIER_LIMITS,
  TIER_NAMES,
  USAGE_COLUMNS,
  betaTesterLimits,
  featureIncluded,
  isCountedFeature,
  isUserTier,
  requiredTierFor,
  type CountedFeature,
  type FeatureKey,
  type TierLimits,
  type UserTier,
} from './plans.js';

// ============================================================================
// SERVICE CLIENT
// ============================================================================

/** Service-role client, or null when the server is not configured (callers fail closed). */
function getAdminClient(): SupabaseClient | null {
  return getServiceClient();
}

// ============================================================================
// ACCESS
// ============================================================================

export interface Access {
  tier: UserTier;
  isAdmin: boolean;
  isBetaTester: boolean;
  limits: TierLimits;
}

export type AccessResult =
  | { ok: true; access: Access }
  | { ok: false; reason: 'not-configured' | 'lookup-failed' };

/**
 * Read the user's plan on the server. Admin status comes from the JWT email
 * (never from profiles.email, which a user could once edit).
 */
export async function resolveAccess(auth: AuthResult): Promise<AccessResult> {
  const email = auth.email.toLowerCase();
  if (email && getAdminEmails().includes(email)) {
    return { ok: true, access: { tier: 'enterprise', isAdmin: true, isBetaTester: false, limits: ADMIN_LIMITS } };
  }

  const db = getAdminClient();
  if (!db) return { ok: false, reason: 'not-configured' };

  const [profileRes, betaRes] = await Promise.all([
    db.from('profiles').select('tier').eq('id', auth.userId).maybeSingle(),
    email
      ? db
          .from('beta_testers')
          .select('standard_comparisons_limit, enhanced_comparisons_limit')
          .eq('email', email)
          .eq('is_active', true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (profileRes.error) {
    console.error('[entitlements] profile lookup failed:', profileRes.error.message);
    return { ok: false, reason: 'lookup-failed' };
  }

  const rawTier: unknown = profileRes.data?.tier;
  const tier: UserTier = isUserTier(rawTier) ? rawTier : 'free';

  if (betaRes.data && !betaRes.error) {
    const row = betaRes.data as { standard_comparisons_limit: number | null; enhanced_comparisons_limit: number | null };
    return {
      ok: true,
      access: {
        tier,
        isAdmin: false,
        isBetaTester: true,
        limits: betaTesterLimits({
          standardComparisonsLimit: row.standard_comparisons_limit,
          enhancedComparisonsLimit: row.enhanced_comparisons_limit,
        }),
      },
    };
  }

  return { ok: true, access: { tier, isAdmin: false, isBetaTester: false, limits: TIER_LIMITS[tier] } };
}

// ============================================================================
// COUNTING
// ============================================================================

export type ConsumeResult =
  | { ok: true; used: number; limit: number }
  | { ok: false; reason: 'not-included' | 'limit-reached'; used: number; limit: number }
  | { ok: false; reason: 'not-configured' | 'db-error'; used: 0; limit: number };

/**
 * Check the monthly allowance and count one use, atomically. Unlimited
 * features are allowed without a write.
 */
export async function consumeFeature(
  userId: string,
  feature: CountedFeature,
  limits: TierLimits,
  amount = 1,
): Promise<ConsumeResult> {
  const limit = limits[feature];
  if (limit === 0) return { ok: false, reason: 'not-included', used: 0, limit };
  if (limit === -1) return { ok: true, used: 0, limit };

  const db = getAdminClient();
  if (!db) return { ok: false, reason: 'not-configured', used: 0, limit };

  const { data, error } = await db.rpc('consume_usage', {
    p_user_id: userId,
    p_column: USAGE_COLUMNS[feature],
    p_limit: limit,
    p_amount: amount,
  });
  if (error) {
    console.error('[entitlements] consume_usage failed:', error.message);
    return { ok: false, reason: 'db-error', used: 0, limit };
  }

  const row = (Array.isArray(data) ? data[0] : data) as { allowed?: boolean; used_count?: number } | null;
  const used = typeof row?.used_count === 'number' ? row.used_count : 0;
  if (row?.allowed !== true) return { ok: false, reason: 'limit-reached', used, limit };
  return { ok: true, used, limit };
}

/**
 * Give back one use when the paid work failed after it was counted (the vendor
 * refused, timed out, …). Never fails the caller; logs instead.
 */
export async function refundFeature(userId: string, feature: CountedFeature, limits: TierLimits): Promise<void> {
  if (limits[feature] === -1 || limits[feature] === 0) return;
  const db = getAdminClient();
  if (!db) return;
  const { error } = await db.rpc('consume_usage', {
    p_user_id: userId,
    p_column: USAGE_COLUMNS[feature],
    p_limit: -1,
    p_amount: -1,
  });
  if (error) console.error('[entitlements] refund failed:', feature, error.message);
}

// ============================================================================
// ROUTE GUARD
// ============================================================================

export interface Entitled {
  auth: AuthResult;
  access: Access;
}

function sendDenied(
  res: VercelResponse,
  feature: FeatureKey,
  reason: 'not-included' | 'limit-reached',
  used: number,
  limit: number,
): void {
  const requiredTier = requiredTierFor(feature);
  res.status(403).json({
    error:
      reason === 'not-included'
        ? `This feature needs the ${TIER_NAMES[requiredTier]} plan.`
        : `You have used this month's allowance (${used} of ${limit}). It resets on the 1st, or upgrade for more.`,
    code: reason === 'not-included' ? 'upgrade_required' : 'limit_reached',
    feature,
    used,
    limit,
    requiredTier,
  });
}

function sendUnavailable(res: VercelResponse): void {
  res.status(503).json({
    error: 'We could not check your plan just now. Please try again in a minute.',
    code: 'entitlement_unavailable',
  });
}

/**
 * Sign-in + plan check for a route. With `consume`, one use is counted before
 * the work starts (call refundFeature if the work then fails). Sends the 401 /
 * 403 / 503 itself and returns null when the request must stop.
 */
export async function requireFeature(
  req: VercelRequest,
  res: VercelResponse,
  feature: FeatureKey,
  options: { consume?: boolean } = {},
): Promise<Entitled | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const resolved = await resolveAccess(auth);
  if (!resolved.ok) {
    sendUnavailable(res);
    return null;
  }
  const { access } = resolved;

  if (!featureIncluded(access.limits, feature)) {
    sendDenied(res, feature, 'not-included', 0, 0);
    return null;
  }

  const entitled: Entitled = { auth, access };
  if (options.consume && isCountedFeature(feature)) {
    if (!(await consumeOrDeny(res, entitled, feature))) return null;
  }
  return entitled;
}

/**
 * Count one use for a route that only knows mid-way whether it will do paid
 * work (e.g. after a cache miss). Sends the 403/503 itself and returns false
 * when the request must stop.
 */
export async function consumeOrDeny(res: VercelResponse, entitled: Entitled, feature: CountedFeature): Promise<boolean> {
  const result = await consumeFeature(entitled.auth.userId, feature, entitled.access.limits);
  if (result.ok) return true;
  if (result.reason === 'not-configured' || result.reason === 'db-error') {
    sendUnavailable(res);
  } else {
    sendDenied(res, feature, result.reason, result.used, result.limit);
  }
  return false;
}

/** Admin-only routes (diagnostics that spend money on every call). */
export async function requireAdmin(req: VercelRequest, res: VercelResponse): Promise<AuthResult | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  if (!getAdminEmails().includes(auth.email.toLowerCase())) {
    res.status(403).json({ error: 'Admin access required', code: 'admin_required' });
    return null;
  }
  return auth;
}

// ============================================================================
// COMPARISON GRANTS
// ============================================================================

export type ComparisonFeature = Extract<CountedFeature, 'standardComparisons' | 'enhancedComparisons'>;

export function isComparisonFeature(value: unknown): value is ComparisonFeature {
  return value === 'standardComparisons' || value === 'enhancedComparisons';
}

/** How long one counted comparison may keep calling the AI models and the judge (enhanced runs are long). */
export const GRANT_WORK_WINDOW_SECONDS = 2 * 60 * 60;

/** How long the same comparison may still have its judge report written (the grant is saved with the result). */
export const GRANT_REPORT_WINDOW_SECONDS = 30 * 24 * 60 * 60;

/** The header the browser sends the grant in. */
export const GRANT_HEADER = 'x-usage-grant';

interface GrantPayload {
  v: 1;
  u: string; // user id
  f: ComparisonFeature;
  c: [string, string]; // normalised city pair, sorted
  i: number; // issued at, unix seconds
}

/**
 * The city NAME only (text before the first comma), lower-cased. The comparison
 * starts with "Baltimore, Maryland, USA" but the judge report receives the parsed
 * result's `city` field, "Baltimore" — both must match the same grant.
 */
function normaliseCity(city: string): string {
  return city.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
}

function cityPair(city1: string, city2: string): [string, string] {
  const pair = [normaliseCity(city1), normaliseCity(city2)].sort();
  return [pair[0], pair[1]];
}

/** The signing key, derived from the service-role secret so no new secret is needed. */
function grantKey(): Buffer | null {
  const serviceKey = serviceRoleKey();
  if (!serviceKey) return null;
  return createHmac('sha256', serviceKey).update('lifescore-usage-grant-v1').digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/** Sign a grant for one counted comparison. Null when the server has no key. */
export function signComparisonGrant(
  userId: string,
  feature: ComparisonFeature,
  city1: string,
  city2: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): string | null {
  const key = grantKey();
  if (!key) return null;
  const payload: GrantPayload = { v: 1, u: userId, f: feature, c: cityPair(city1, city2), i: nowSeconds };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, key)}`;
}

export type GrantFailure = 'missing' | 'invalid' | 'expired' | 'wrong-user' | 'wrong-cities' | 'wrong-feature';

export type GrantCheck = { ok: true; feature: ComparisonFeature } | { ok: false; reason: GrantFailure };

/**
 * Verify a grant for this user and city pair, no older than `maxAgeSeconds`.
 * `allowed` lists the comparison kinds the route accepts (the judge: enhanced only).
 */
export function verifyComparisonGrant(
  token: string | undefined,
  userId: string,
  city1: string,
  city2: string,
  allowed: readonly ComparisonFeature[],
  maxAgeSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): GrantCheck {
  if (!token) return { ok: false, reason: 'missing' };
  const key = grantKey();
  const [body, mac, extra] = token.split('.');
  if (!key || !body || !mac || extra !== undefined) return { ok: false, reason: 'invalid' };

  const expected = Buffer.from(sign(body, key));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'invalid' };

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (typeof payload !== 'object' || payload === null) return { ok: false, reason: 'invalid' };
  const p = payload as Partial<GrantPayload>;
  if (
    p.v !== 1 ||
    typeof p.u !== 'string' ||
    !isComparisonFeature(p.f) ||
    !Array.isArray(p.c) ||
    p.c.length !== 2 ||
    typeof p.i !== 'number'
  ) {
    return { ok: false, reason: 'invalid' };
  }
  if (p.i > nowSeconds + 60 || nowSeconds - p.i > maxAgeSeconds) return { ok: false, reason: 'expired' };
  if (p.u !== userId) return { ok: false, reason: 'wrong-user' };
  const [a, b] = cityPair(city1, city2);
  if (p.c[0] !== a || p.c[1] !== b) return { ok: false, reason: 'wrong-cities' };
  if (!allowed.includes(p.f)) return { ok: false, reason: 'wrong-feature' };
  return { ok: true, feature: p.f };
}

/** Read the grant header (Node lower-cases header names). */
export function readGrantHeader(req: VercelRequest): string | undefined {
  const value = req.headers[GRANT_HEADER];
  return Array.isArray(value) ? value[0] : value;
}

function sendGrantDenied(res: VercelResponse, reason: GrantFailure): void {
  res.status(403).json({
    error:
      reason === 'expired'
        ? 'This comparison session has expired. Please run the comparison again.'
        : 'Start a comparison from the app to use this.',
    code: `comparison_grant_${reason.replace(/-/g, '_')}`,
  });
}

/**
 * Sign-in + grant check for the AI-model and judge routes. Sends 401/403 itself
 * and returns null when the request must stop.
 */
export async function requireComparisonGrant(
  req: VercelRequest,
  res: VercelResponse,
  city1: string,
  city2: string,
  allowed: readonly ComparisonFeature[],
): Promise<{ auth: AuthResult; feature: ComparisonFeature } | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;
  const check = verifyComparisonGrant(readGrantHeader(req), auth.userId, city1, city2, allowed, GRANT_WORK_WINDOW_SECONDS);
  if (!check.ok) {
    sendGrantDenied(res, check.reason);
    return null;
  }
  return { auth, feature: check.feature };
}

/**
 * Judge reports: allowed for the comparison's own grant (up to 30 days old, it is
 * saved with the result), and for any comparison on a paid plan, as a beta tester
 * or as an admin — they were always included there.
 */
export async function requireJudgeReportAccess(
  req: VercelRequest,
  res: VercelResponse,
  city1: string,
  city2: string,
): Promise<AuthResult | null> {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  const check = verifyComparisonGrant(
    readGrantHeader(req),
    auth.userId,
    city1,
    city2,
    ['standardComparisons', 'enhancedComparisons'],
    GRANT_REPORT_WINDOW_SECONDS,
  );
  if (check.ok) return auth;

  const resolved = await resolveAccess(auth);
  if (!resolved.ok) {
    sendUnavailable(res);
    return null;
  }
  const { access } = resolved;
  if (access.isAdmin || access.isBetaTester || access.tier !== 'free') return auth;

  sendGrantDenied(res, check.reason);
  return null;
}
