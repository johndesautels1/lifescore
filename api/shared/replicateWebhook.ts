/**
 * LIFE SCORE - Checking that a webhook call really comes from Replicate.
 *
 * Read 3 Oct 2026 from replicate.com/docs/topics/webhooks/verify-webhook and
 * Replicate's own client (replicate-javascript lib/util.js, validateWebhook):
 * - headers `webhook-id`, `webhook-timestamp` (seconds since epoch) and
 *   `webhook-signature` (space-separated "v1,<base64 signature>" entries);
 * - signed content `${id}.${timestamp}.${raw body}`;
 * - HMAC-SHA256, keyed with the base64-DECODED part of the secret after
 *   `whsec_`, digest in base64;
 * - the secret comes from GET https://api.replicate.com/v1/webhooks/default/secret
 *   (`{ "key": "whsec_…" }`) with the account's API token.
 *
 * Replicate's page asks for a timestamp tolerance against replays without
 * naming one; five minutes is this app's choice.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import { asRecord, text } from './jsonRead.js';

/** How far a webhook's timestamp may be from the server clock, in seconds. */
export const REPLICATE_WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

/** Why a webhook call was refused. */
export type ReplicateWebhookRefusal = 'missing-headers' | 'bad-timestamp' | 'stale' | 'bad-signature';

/** The three signature headers, as the request carried them. */
export interface ReplicateWebhookHeaders {
  id: string | undefined;
  timestamp: string | undefined;
  signature: string | undefined;
}

/**
 * Checks one webhook call. Pure: the caller supplies the secret and the clock.
 * Every signature in the header is tried, in constant time.
 */
export function verifyReplicateWebhook(
  headers: ReplicateWebhookHeaders,
  rawBody: Buffer,
  secret: string,
  nowSeconds: number,
): { ok: true } | { ok: false; reason: ReplicateWebhookRefusal } {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return { ok: false, reason: 'missing-headers' };
  if (!/^\d+$/.test(timestamp)) return { ok: false, reason: 'bad-timestamp' };
  if (Math.abs(nowSeconds - Number(timestamp)) > REPLICATE_WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: 'stale' };

  const key = Buffer.from(secret.split('_').pop() ?? '', 'base64');
  const expected = createHmac('sha256', key)
    .update(Buffer.concat([Buffer.from(`${id}.${timestamp}.`, 'utf8'), rawBody]))
    .digest();

  const matches = signature
    .split(' ')
    .map((entry) => entry.split(',')[1] ?? '')
    .some((candidate) => {
      const given = Buffer.from(candidate, 'base64');
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
  return matches ? { ok: true } : { ok: false, reason: 'bad-signature' };
}

/** Reads the three signature headers from a request's headers. */
export function replicateWebhookHeaders(headers: Record<string, string | string[] | undefined>): ReplicateWebhookHeaders {
  const one = (name: string): string | undefined => {
    const value = headers[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  };
  return { id: one('webhook-id'), timestamp: one('webhook-timestamp'), signature: one('webhook-signature') };
}

let cachedSecret: string | null = null;

/**
 * The account's webhook signing secret, asked of Replicate once per server
 * instance. Null when REPLICATE_API_TOKEN is missing or Replicate cannot answer.
 */
export async function replicateWebhookSecret(): Promise<string | null> {
  if (cachedSecret) return cachedSecret;
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return null;
  try {
    const response = await fetchWithTimeout(
      'https://api.replicate.com/v1/webhooks/default/secret',
      { headers: { Authorization: `Bearer ${token}` } },
      10000,
    );
    if (!response.ok) {
      console.error('[REPLICATE-WEBHOOK] Signing secret request failed:', response.status);
      return null;
    }
    const key = text(asRecord(await response.json()).key);
    if (!key || !key.startsWith('whsec_')) {
      console.error('[REPLICATE-WEBHOOK] Replicate sent no signing secret');
      return null;
    }
    cachedSecret = key;
    return key;
  } catch (error) {
    console.error('[REPLICATE-WEBHOOK] Signing secret request error:', error instanceof Error ? error.message : error);
    return null;
  }
}
