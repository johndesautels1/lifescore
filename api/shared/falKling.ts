/**
 * LIFE SCORE - Kling 3 city clips through fal: the one connection.
 *
 * Ruling (John, 4 Oct 2026): "move ... to fully kling 3 setup and keep minimax
 * as last backup", and sound on, like the engine.
 *
 * The wire shapes are the questionnaire engine's
 * (src/core/e2/live/film/clipVendors.ts: FAL_QUEUE, FAL_ENDPOINT, falAppOf,
 * falDuration, buildFalRequest, falStatusUrl, falResultUrl, falJobIsGone,
 * parseFalSubmit, parseFalStatus, parseFalResult), re-checked on 4 Oct 2026
 * against fal's own page for fal-ai/kling-video/v3/standard/text-to-video:
 * - submit  POST https://queue.fal.run/fal-ai/kling-video/v3/standard/text-to-video
 *           header Authorization: Key <FAL_KEY>   (fal.ai/docs/model-apis/authentication)
 *           body   { prompt, duration "3"…"15", aspect_ratio "16:9", negative_prompt }
 *           → { request_id }
 * - status  GET https://queue.fal.run/fal-ai/kling-video/requests/{id}/status
 * - result  GET https://queue.fal.run/fal-ai/kling-video/requests/{id} → { video: { url } }
 *   Status and result are asked for under the APP (fal-ai/kling-video), never
 *   the full endpoint: the engine found the full path answers 405 for ever.
 * - generate_audio defaults to true (Kling's own sound), as in the engine.
 * - The price lives in the cost table (src/utils/costCalculator-pricing.ts).
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { asRecord, text } from './jsonRead.js';

export const FAL_QUEUE = 'https://queue.fal.run';

/** Kling 3 Standard, text to video: the engine's model. */
export const FAL_ENDPOINT = 'fal-ai/kling-video/v3/standard/text-to-video';

/** The app an endpoint belongs to (`owner/alias`); status and result live under it. */
export function falAppOf(endpoint: string): string {
  return endpoint.split('/').slice(0, 2).join('/');
}

export const FAL_APP = falAppOf(FAL_ENDPOINT);

/** Kling 3 takes any whole number of seconds from 3 to 15. */
export function falDuration(wanted: number): number {
  const asked = Number.isFinite(wanted) ? Math.round(wanted) : 5;
  return Math.min(15, Math.max(3, asked));
}

/** One Kling 3 submission, as sent. */
export interface FalRequest {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: {
    readonly prompt: string;
    readonly duration: string;
    readonly aspect_ratio: '16:9';
    readonly negative_prompt: string;
  };
}

/** Builds one Kling 3 call. Throws RangeError on an empty prompt. */
export function buildFalRequest(prompt: string, seconds: number, key: string, negative: string): FalRequest {
  const said = prompt.trim();
  if (said === '') throw new RangeError('There is no shot to describe.');
  return {
    url: `${FAL_QUEUE}/${FAL_ENDPOINT}`,
    headers: { authorization: `Key ${key}`, 'content-type': 'application/json' },
    body: {
      prompt: said,
      duration: String(falDuration(seconds)),
      aspect_ratio: '16:9',
      negative_prompt: negative.trim() || 'blur, distort, and low quality',
    },
  };
}

export function falStatusUrl(requestId: string): string {
  return `${FAL_QUEUE}/${FAL_APP}/requests/${encodeURIComponent(requestId.trim())}/status`;
}

export function falResultUrl(requestId: string): string {
  return `${FAL_QUEUE}/${FAL_APP}/requests/${encodeURIComponent(requestId.trim())}`;
}

/** A refusal that asking again can never turn into an answer (404, 405, 410). */
export function falJobIsGone(status: number): boolean {
  return status === 404 || status === 405 || status === 410;
}

/** The request id from a submit reply, or null. */
export function parseFalSubmit(body: unknown): string | null {
  return text(asRecord(body).request_id)?.trim() || null;
}

/** A status reply. An unknown status is pending, never failed: a paid job is not thrown away. */
export function parseFalStatus(body: unknown): 'pending' | 'completed' | 'failed' | null {
  const raw = text(asRecord(body).status);
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  if (s === 'COMPLETED') return 'completed';
  if (s === 'FAILED' || s === 'ERROR') return 'failed';
  return 'pending';
}

/** The clip's file address from a result reply (`video.url`, or `data.video.url`). */
export function parseFalResult(body: unknown): string | null {
  const reply = asRecord(body);
  return text(asRecord(reply.video).url)?.trim() || text(asRecord(asRecord(reply.data).video).url)?.trim() || null;
}

const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 15_000;

/** What a submission came to. */
export type KlingSubmit = { ok: true; requestId: string } | { ok: false; error: string };

/** What a status check came to (the caller polls again while pending). */
export interface KlingClipState {
  status: 'processing' | 'completed' | 'failed';
  videoUrl: string | null;
  error: string | null;
  /** True when fal does not know (or no longer holds) the request: 404, 405 or 410. */
  gone?: boolean;
}

/** Submits one Kling 3 clip. Never throws. */
export async function submitKlingClip(prompt: string, seconds: number, negative = ''): Promise<KlingSubmit> {
  const key = process.env.FAL_KEY;
  if (!key) return { ok: false, error: 'Kling 3 is not set up (FAL_KEY is missing)' };
  try {
    const request = buildFalRequest(prompt, seconds, key, negative);
    const response = await fetchWithTimeout(
      request.url,
      { method: 'POST', headers: request.headers, body: JSON.stringify(request.body) },
      SUBMIT_TIMEOUT_MS,
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { ok: false, error: `fal answered ${response.status}: ${errorText.slice(0, 300)}` };
    }
    const requestId = parseFalSubmit(await response.json().catch(() => null));
    return requestId ? { ok: true, requestId } : { ok: false, error: 'fal accepted the clip but sent no request id' };
  } catch (error) {
    return { ok: false, error: `fal could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** Asks fal once how a clip is doing, and collects its file when done. Never throws. */
export async function checkKlingClip(requestId: string): Promise<KlingClipState> {
  const key = process.env.FAL_KEY;
  if (!key) return { status: 'failed', videoUrl: null, error: 'Kling 3 is not set up (FAL_KEY is missing)' };
  const headers = { authorization: `Key ${key}` };
  try {
    const statusResponse = await fetchWithTimeout(falStatusUrl(requestId), { headers }, POLL_TIMEOUT_MS);
    if (!statusResponse.ok) {
      if (falJobIsGone(statusResponse.status)) {
        return { status: 'failed', videoUrl: null, error: `fal no longer knows this clip (${statusResponse.status})`, gone: true };
      }
      return { status: 'processing', videoUrl: null, error: null };
    }
    const state = parseFalStatus(await statusResponse.json().catch(() => null));
    if (state === 'failed') return { status: 'failed', videoUrl: null, error: 'Kling could not make this clip' };
    if (state !== 'completed') return { status: 'processing', videoUrl: null, error: null };

    const resultResponse = await fetchWithTimeout(falResultUrl(requestId), { headers }, POLL_TIMEOUT_MS);
    if (!resultResponse.ok) {
      if (falJobIsGone(resultResponse.status)) {
        return { status: 'failed', videoUrl: null, error: `fal no longer holds this clip (${resultResponse.status})`, gone: true };
      }
      return { status: 'processing', videoUrl: null, error: null };
    }
    const videoUrl = parseFalResult(await resultResponse.json().catch(() => null));
    return videoUrl
      ? { status: 'completed', videoUrl, error: null }
      : { status: 'failed', videoUrl: null, error: 'fal finished the clip but sent no file' };
  } catch (error) {
    console.warn('[KLING3] Status check failed:', error instanceof Error ? error.message : error);
    return { status: 'processing', videoUrl: null, error: null };
  }
}
