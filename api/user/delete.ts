/**
 * LIFE SCORE - Delete Account API
 * GDPR Article 17 "Right to Erasure" (and the US state "right to delete").
 *
 * DELETE /api/user/delete   body { confirmation: "DELETE MY ACCOUNT" }
 *
 * The order matters (rewritten 2026-10-03):
 *   1. Stop the billing — cancel every live Stripe subscription. If Stripe
 *      cannot be reached the account is NOT deleted: deleting it while Stripe
 *      keeps charging would leave a customer billed with no account to cancel
 *      from. Stripe keeps its own invoices (financial records, 7 years).
 *   2. Remove the user's own files — `user-videos/{userId}/` (uploaded court
 *      order videos) and `reports/{userId}/` (saved report pages).
 *   3. Remove the beta invitation (keyed by email, so it does not cascade),
 *      then delete the sign-in account. Every table holding the user's data is
 *      linked to it ON DELETE CASCADE — or SET NULL for shared city caches and
 *      consent proofs (migration 20261003_account_deletion_foreign_keys) — so
 *      this one call removes the rest.
 *
 * Before 2026-10-03 the route deleted six tables by hand, never cancelled the
 * Stripe subscription (the customer kept being billed), left judge reports,
 * videos, saved reports, notifications and jobs in place, and answered
 * "deleted" even when the sign-in account could not be removed.
 *
 * Clues Intelligence LTD
 * © 2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import { getStripe } from '../shared/stripe.js';
import { handleCors } from '../shared/cors.js';
import { checkRateLimit } from '../shared/rateLimit.js';

export const config = {
  maxDuration: 60,
};

/** Per step; the whole route stays inside maxDuration. */
const STEP_TIMEOUT_MS = 15_000;

/** Storage folders that belong to one user, named `{userId}/…`. */
const USER_FOLDERS: readonly string[] = ['user-videos', 'reports'];

/** Stripe states that can still charge. */
const BILLABLE_STATUSES: readonly string[] = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'];

/** A step that must finish, with a typed failure the handler maps to a reply. */
class DeletionStepError extends Error {
  constructor(readonly step: 'billing' | 'files' | 'account', detail: string) {
    super(`[DELETE] ${step}: ${detail}`);
    this.name = 'DeletionStepError';
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${STEP_TIMEOUT_MS}ms`)), STEP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Step 1 — cancel every subscription that can still charge. Returns how many were cancelled. */
async function cancelBilling(db: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await withTimeout(
    db.from('subscriptions').select('stripe_customer_id').eq('user_id', userId),
    'Read subscriptions'
  );
  if (error) throw new DeletionStepError('billing', error.message);

  const customers = [...new Set((data ?? []).map((row: { stripe_customer_id: string | null }) => row.stripe_customer_id).filter(
    (id): id is string => typeof id === 'string' && id !== ''
  ))];
  if (customers.length === 0) return 0;

  const stripe = getStripe();
  if (!stripe) throw new DeletionStepError('billing', 'Stripe is not configured, so the subscription cannot be cancelled');

  let cancelled = 0;
  try {
    for (const customer of customers) {
      const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
      for (const subscription of subscriptions.data) {
        if (!BILLABLE_STATUSES.includes(subscription.status)) continue;
        await stripe.subscriptions.cancel(subscription.id);
        cancelled++;
      }
    }
  } catch (err) {
    throw new DeletionStepError('billing', err instanceof Error ? err.message : String(err));
  }
  return cancelled;
}

/** Step 2 — remove every file in the user's own folders. Returns how many were removed. */
async function removeUserFiles(db: SupabaseClient, userId: string): Promise<number> {
  let removed = 0;
  for (const bucket of USER_FOLDERS) {
    // `list` is one page; keep going until the folder is empty.
    for (let page = 0; page < 50; page++) {
      const { data: files, error } = await withTimeout(
        db.storage.from(bucket).list(userId, { limit: 100 }),
        `List ${bucket}`
      );
      if (error) throw new DeletionStepError('files', `${bucket}: ${error.message}`);
      const paths = (files ?? []).map((file) => `${userId}/${file.name}`);
      if (paths.length === 0) break;
      const { error: removeError } = await withTimeout(db.storage.from(bucket).remove(paths), `Remove ${bucket}`);
      if (removeError) throw new DeletionStepError('files', `${bucket}: ${removeError.message}`);
      removed += paths.length;
    }
  }
  return removed;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCors(req, res, 'restricted', { methods: 'DELETE, OPTIONS' })) return;

  // Rate limit (3 per minute per IP). Before 2026-10-03 this called
  // checkRateLimit with two arguments instead of four, so it read an undefined
  // limit and the route failed on every request.
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  if (!checkRateLimit(clientIP, 'user/delete', { windowMs: 60000, maxRequests: 3 }, res)) return;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const body: Record<string, unknown> =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};
  if (body.confirmation !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({
      error: 'CONFIRMATION_MISMATCH',
      message: 'Please type "DELETE MY ACCOUNT" to confirm.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const db = getServiceClient();
  if (!db) {
    console.error('[DELETE] Missing Supabase credentials');
    return res.status(500).json({ error: 'CONFIG_ERROR', message: 'Server configuration error.' });
  }

  // The account is always the caller's own — never an id from the body.
  const { data: { user }, error: authError } = await db.auth.getUser(authHeader.substring(7));
  if (authError || !user) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired authentication token.' });
  }
  const userId = user.id;
  console.log(`[DELETE] Starting account deletion for user: ${userId}`);

  try {
    const subscriptionsCancelled = await cancelBilling(db, userId);
    const filesRemoved = await removeUserFiles(db, userId);

    // The beta invitation is keyed by email, not linked to the account, so it
    // does not cascade. Removed BEFORE the account, so a failure here leaves
    // the account in place and the request can simply be retried.
    if (user.email) {
      const { error: betaError } = await withTimeout(
        db.from('beta_testers').delete().eq('email', user.email.toLowerCase()),
        'Delete beta invitation'
      );
      if (betaError) throw new DeletionStepError('account', `beta invitation: ${betaError.message}`);
    }

    const { error: deleteUserError } = await withTimeout(db.auth.admin.deleteUser(userId), 'Delete account');
    if (deleteUserError) throw new DeletionStepError('account', deleteUserError.message);

    console.log(`[DELETE] Account deleted for user: ${userId}`, { subscriptionsCancelled, filesRemoved });
    return res.status(200).json({
      success: true,
      message: 'Your account and all associated data have been deleted.',
      summary: { subscriptionsCancelled, filesRemoved },
    });
  } catch (error) {
    console.error('[DELETE] Error:', error);
    const step = error instanceof DeletionStepError ? error.step : 'account';
    const message =
      step === 'billing'
        ? 'We could not cancel your subscription, so your account has not been deleted. Please try again or contact support.'
        : 'We could not finish deleting your account. Anything already removed stays removed; please try again or contact support.';
    return res.status(step === 'billing' ? 502 : 500).json({ error: 'DELETION_FAILED', step, message });
  }
}
