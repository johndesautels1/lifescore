/**
 * LIFE SCORE - the browser's calls to Olivia's live face (/api/olivia/avatar/live).
 *
 * Modelled on the questionnaire engine's src/api/oliviaPresenter.ts: no function
 * here throws — each returns something the screen can show — and STOP is sent
 * with `keepalive: true`, because a live session bills per minute and the page
 * closing must not cancel the call that ends it.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { getAuthHeaders } from '../supabase';

/** The room her face arrives in, and the socket her voice goes down. */
export interface LiveSession {
  sessionId: string;
  livekitUrl: string;
  livekitToken: string;
  wsUrl: string;
}

const ROUTE = '/api/olivia/avatar/live';
/** 15s for session calls; her voice is a vendor round trip, so it gets 45 (engine values). */
const READ_TIMEOUT_MS = 15_000;
const SPEAK_TIMEOUT_MS = 45_000;

/** The last authorization header, kept so the page-hide stop can be sent synchronously. */
let lastHeaders: Record<string, string> | null = null;

async function headers(): Promise<Record<string, string> | null> {
  const auth = await getAuthHeaders();
  if (!auth.Authorization) return null;
  lastHeaders = { 'Content-Type': 'application/json', ...auth };
  return lastHeaders;
}

async function post(
  payload: Record<string, unknown>,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const h = await headers();
  if (!h) return { ok: false, status: 401, json: {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const relay = () => controller.abort();
  signal?.addEventListener('abort', relay, { once: true });
  try {
    const res = await fetch(ROUTE, { method: 'POST', headers: h, body: JSON.stringify(payload), signal: controller.signal });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: {} };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', relay);
  }
}

function reason(json: Record<string, unknown>, fallback: string): string {
  return typeof json.error === 'string' && json.error.trim() !== '' ? json.error : fallback;
}

export type SessionOutcome = { kind: 'ready'; session: LiveSession } | { kind: 'error'; message: string };

/** Start her session. THIS SPENDS — the vendor bills while it is open. */
export async function startLiveSession(signal?: AbortSignal): Promise<SessionOutcome> {
  const { ok, json } = await post({ action: 'session' }, READ_TIMEOUT_MS, signal);
  if (!ok) return { kind: 'error', message: reason(json, "Olivia couldn't start just now.") };
  const session: LiveSession = {
    sessionId: typeof json.sessionId === 'string' ? json.sessionId : '',
    livekitUrl: typeof json.livekitUrl === 'string' ? json.livekitUrl : '',
    livekitToken: typeof json.livekitToken === 'string' ? json.livekitToken : '',
    wsUrl: typeof json.wsUrl === 'string' ? json.wsUrl : '',
  };
  if (!session.sessionId || !session.livekitUrl || !session.livekitToken || !session.wsUrl) {
    return { kind: 'error', message: "Olivia connected but her room didn't come back." };
  }
  return { kind: 'ready', session };
}

export type SpeechOutcome = { kind: 'ready'; audioBase64: string } | { kind: 'error'; message: string };

/** Her reply, in her own ElevenLabs voice, as base64 PCM 24 kHz. */
export async function fetchLiveSpeech(text: string, signal?: AbortSignal): Promise<SpeechOutcome> {
  const { ok, json } = await post({ action: 'speak', text }, SPEAK_TIMEOUT_MS, signal);
  if (!ok) return { kind: 'error', message: reason(json, "Olivia couldn't speak just now.") };
  const audio = typeof json.audioBase64 === 'string' ? json.audioBase64 : '';
  if (audio === '') return { kind: 'error', message: "Olivia's voice came back empty." };
  return { kind: 'ready', audioBase64: audio };
}

/** Tell the vendor the session is still wanted. Silent either way. */
export async function keepLiveSessionAlive(sessionId: string): Promise<void> {
  await post({ action: 'keep-alive', sessionId }, READ_TIMEOUT_MS);
}

/**
 * End the session and stop the meter. On the way out (`leaving`), the request is
 * sent synchronously with `keepalive: true` and the last known sign-in, because
 * the browser cancels in-flight work while a page unloads.
 */
export async function stopLiveSession(sessionId: string, leaving = false): Promise<void> {
  if (!sessionId) return;
  if (!leaving) {
    await post({ action: 'stop', sessionId }, READ_TIMEOUT_MS);
    return;
  }
  if (!lastHeaders) return;
  try {
    void fetch(ROUTE, {
      method: 'POST',
      headers: lastHeaders,
      body: JSON.stringify({ action: 'stop', sessionId }),
      keepalive: true,
    });
  } catch {
    /* the page is going away; nothing more can be done */
  }
}
