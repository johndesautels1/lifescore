/**
 * LIFE SCORE - Replicate webhook signatures (api/shared/replicateWebhook.ts).
 *
 * The judge-video webhook accepted any caller until 3 Oct 2026: anyone with a
 * prediction id could swap in any video, shown to every user comparing the
 * same two cities. The known-answer vector below is the Standard Webhooks
 * example whose signature Replicate's own docs print
 * ("v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=").
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  REPLICATE_WEBHOOK_TOLERANCE_SECONDS,
  replicateWebhookHeaders,
  verifyReplicateWebhook,
} from '../api/shared/replicateWebhook';

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw';
const ID = 'msg_p5jXN8AQM9LWM0D4loKWxJek';
const TIMESTAMP = 1614265330;
const BODY = Buffer.from('{"test": 2432232314}', 'utf8');
const SIGNATURE = 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=';

const headers = (signature = SIGNATURE, timestamp = String(TIMESTAMP)) => ({ id: ID, timestamp, signature });

describe('verifyReplicateWebhook', () => {
  it('accepts the published known-answer vector', () => {
    expect(verifyReplicateWebhook(headers(), BODY, SECRET, TIMESTAMP)).toEqual({ ok: true });
  });

  it('accepts when any of several signatures matches', () => {
    const many = `v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo= ${SIGNATURE}`;
    expect(verifyReplicateWebhook(headers(many), BODY, SECRET, TIMESTAMP)).toEqual({ ok: true });
  });

  it('refuses a changed body, a wrong secret or a forged signature', () => {
    expect(verifyReplicateWebhook(headers(), Buffer.from('{"test": 1}'), SECRET, TIMESTAMP)).toEqual({ ok: false, reason: 'bad-signature' });
    expect(verifyReplicateWebhook(headers(), BODY, 'whsec_C2FVsBQIhrscChlQIMV+b5sSYspob7oD', TIMESTAMP)).toEqual({ ok: false, reason: 'bad-signature' });
    expect(verifyReplicateWebhook(headers('v1,AAAA'), BODY, SECRET, TIMESTAMP)).toEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses missing headers and a timestamp outside the tolerance', () => {
    expect(verifyReplicateWebhook({ id: ID, timestamp: undefined, signature: SIGNATURE }, BODY, SECRET, TIMESTAMP)).toEqual({ ok: false, reason: 'missing-headers' });
    expect(verifyReplicateWebhook(headers(SIGNATURE, 'soon'), BODY, SECRET, TIMESTAMP)).toEqual({ ok: false, reason: 'bad-timestamp' });
    expect(verifyReplicateWebhook(headers(), BODY, SECRET, TIMESTAMP + REPLICATE_WEBHOOK_TOLERANCE_SECONDS + 1)).toEqual({ ok: false, reason: 'stale' });
    expect(verifyReplicateWebhook(headers(), BODY, SECRET, TIMESTAMP + REPLICATE_WEBHOOK_TOLERANCE_SECONDS)).toEqual({ ok: true });
  });

  it('reads the three headers by their Replicate names', () => {
    expect(replicateWebhookHeaders({ 'webhook-id': 'a', 'webhook-timestamp': '1', 'webhook-signature': 'v1,x', other: 'y' }))
      .toEqual({ id: 'a', timestamp: '1', signature: 'v1,x' });
    expect(replicateWebhookHeaders({ 'webhook-id': ['a', 'b'] }).id).toBeUndefined();
  });
});

describe('the judge-video webhook checks the signature (anti-drift)', () => {
  const route = readFileSync('api/avatar/video-webhook.ts', 'utf8');

  it('reads the raw body and verifies it before using it', () => {
    expect(route).toContain('bodyParser: false');
    expect(route).toContain('verifyReplicateWebhook(');
    expect(route.indexOf('verifyReplicateWebhook(')).toBeLessThan(route.indexOf('readReplicatePrediction(body)'));
    expect(route).not.toContain('req.body');
  });
});
