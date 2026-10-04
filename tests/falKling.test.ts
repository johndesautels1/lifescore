/**
 * LIFE SCORE - Kling 3 city clips through fal (api/shared/falKling.ts).
 *
 * Ruling (John, 4 Oct 2026): fully the engine's Kling 3 setup, Replicate
 * Minimax as the last back-up, sound on. The wire shapes match the engine's
 * src/core/e2/live/film/clipVendors.ts and fal's page for
 * fal-ai/kling-video/v3/standard/text-to-video (read 4 Oct 2026).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  FAL_APP,
  FAL_ENDPOINT,
  buildFalRequest,
  checkKlingClip,
  falDuration,
  falJobIsGone,
  falResultUrl,
  falStatusUrl,
  parseFalResult,
  parseFalStatus,
  parseFalSubmit,
  submitKlingClip,
} from '../api/shared/falKling';
import { isExpiringClipUrl } from '../api/shared/clipHosts';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('the Kling 3 wire shapes (the engine\'s, re-read on fal\'s page)', () => {
  it('submits to the full endpoint, polls under the app', () => {
    expect(FAL_ENDPOINT).toBe('fal-ai/kling-video/v3/standard/text-to-video');
    expect(FAL_APP).toBe('fal-ai/kling-video');
    expect(falStatusUrl(' req 1 ')).toBe('https://queue.fal.run/fal-ai/kling-video/requests/req%201/status');
    expect(falResultUrl('abc')).toBe('https://queue.fal.run/fal-ai/kling-video/requests/abc');
  });

  it('builds the request: Key auth, whole seconds 3 to 15, 16:9, a negative prompt', () => {
    const r = buildFalRequest('  A sunny harbour  ', 8, 'k1', '');
    expect(r.url).toBe('https://queue.fal.run/fal-ai/kling-video/v3/standard/text-to-video');
    expect(r.headers.authorization).toBe('Key k1');
    expect(r.body).toEqual({ prompt: 'A sunny harbour', duration: '8', aspect_ratio: '16:9', negative_prompt: 'blur, distort, and low quality' });
    expect(falDuration(1)).toBe(3);
    expect(falDuration(30)).toBe(15);
    expect(falDuration(Number.NaN)).toBe(5);
    expect(() => buildFalRequest('   ', 8, 'k', '')).toThrow(RangeError);
  });

  it('reads submit, status and result replies; an unknown status is pending', () => {
    expect(parseFalSubmit({ request_id: ' r1 ' })).toBe('r1');
    expect(parseFalSubmit({})).toBeNull();
    expect(parseFalStatus({ status: 'IN_QUEUE' })).toBe('pending');
    expect(parseFalStatus({ status: 'IN_PROGRESS' })).toBe('pending');
    expect(parseFalStatus({ status: 'COMPLETED' })).toBe('completed');
    expect(parseFalStatus({ status: 'error' })).toBe('failed');
    expect(parseFalStatus({})).toBeNull();
    expect(parseFalResult({ video: { url: 'https://v3.fal.media/files/a.mp4' } })).toBe('https://v3.fal.media/files/a.mp4');
    expect(parseFalResult({ data: { video: { url: 'https://v3.fal.media/files/b.mp4' } } })).toBe('https://v3.fal.media/files/b.mp4');
    expect(parseFalResult({ video: {} })).toBeNull();
    expect(falJobIsGone(404)).toBe(true);
    expect(falJobIsGone(429)).toBe(false);
  });

  it('a fal clip link is one LifeScore copies into its own storage', () => {
    expect(isExpiringClipUrl('https://v3.fal.media/files/a.mp4')).toBe(true);
    expect(isExpiringClipUrl('https://replicate.delivery/x.mp4')).toBe(true);
    expect(isExpiringClipUrl('https://abc.supabase.co/storage/v1/object/public/court-order-videos/x.mp4')).toBe(false);
    expect(isExpiringClipUrl(null)).toBe(false);
  });
});

describe('submitting and checking a clip against a scripted fal', () => {
  beforeEach(() => vi.stubEnv('FAL_KEY', 'fal-test'));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('submits and returns the request id', async () => {
    const seen: Array<{ url: string; auth: string | null; body: string }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      seen.push({ url: String(input), auth: new Headers(init?.headers).get('authorization'), body: String(init?.body) });
      return json(200, { request_id: 'req-9' });
    });
    expect(await submitKlingClip('A harbour at dawn', 10)).toEqual({ ok: true, requestId: 'req-9' });
    expect(seen[0].url).toBe('https://queue.fal.run/fal-ai/kling-video/v3/standard/text-to-video');
    expect(seen[0].auth).toBe('Key fal-test');
    expect(JSON.parse(seen[0].body).duration).toBe('10');
  });

  it('a refusal comes back with fal\'s words, so the back-up can be tried', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(403, { detail: 'Exhausted balance' }));
    const r = await submitKlingClip('A harbour', 8);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('403');
  });

  it('pending, then completed with the file', async () => {
    const replies = [json(202, { status: 'IN_PROGRESS' }), json(200, { status: 'COMPLETED' }), json(200, { video: { url: 'https://v3.fal.media/files/c.mp4' } })];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => replies.shift() as Response);
    expect(await checkKlingClip('r1')).toEqual({ status: 'processing', videoUrl: null, error: null });
    expect(await checkKlingClip('r1')).toEqual({ status: 'completed', videoUrl: 'https://v3.fal.media/files/c.mp4', error: null });
  });

  it('a request fal does not know is gone (the status route then asks the back-up)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json(404, { detail: 'not found' }));
    const r = await checkKlingClip('stranger');
    expect(r.status).toBe('failed');
    expect(r.gone).toBe(true);
  });

  it('without a key nothing is sent', async () => {
    vi.stubEnv('FAL_KEY', '');
    const spy = vi.spyOn(globalThis, 'fetch');
    expect((await submitKlingClip('A harbour', 8)).ok).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('the clip routes use Kling 3 first and Minimax last (anti-drift)', () => {
  const generate = readFileSync('api/video/grok-generate.ts', 'utf8');
  const status = readFileSync('api/video/grok-status.ts', 'utf8');

  it('Kling 3 first, then the Replicate Minimax back-up', () => {
    expect(generate).toContain("let provider = 'kling3';");
    expect(generate.indexOf('generateWithKling3(prompt, durationSec)')).toBeLessThan(generate.indexOf('generateWithReplicate(prompt)'));
    expect(generate).toContain("const REPLICATE_VIDEO_MODEL = 'minimax/video-01';");
  });

  it('nothing calls Kling\'s own service or the old Grok video route any more', () => {
    for (const src of [generate, status]) {
      expect(src).not.toMatch(/klingai\.com\/v1|api-singapore\.klingai|generateKlingJWT|\/videos\/generations|checkGrokStatus/);
    }
    expect(status).toContain("video.provider === 'kling3'");
  });

  it('the shared connection exists and the old Kling keys are not read', () => {
    expect(existsSync('api/shared/falKling.ts')).toBe(true);
    expect(generate + status).not.toMatch(/KLING_VIDEO_API_KEY|KLING_VIDEO_SECRET/);
  });
});
