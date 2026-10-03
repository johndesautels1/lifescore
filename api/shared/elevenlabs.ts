/**
 * LIFE SCORE - ElevenLabs: the one place this app calls ElevenLabs
 * (spoken audio for Olivia, Emilia and Cristiano, and the account's usage).
 *
 * Checked 2026-10-03 against ElevenLabs' API reference (text-to-speech/convert):
 *   POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=…
 *        (output_format is a QUERY parameter; default mp3_44100_128)
 *   header xi-api-key
 *   body   { text, model_id, voice_settings: { stability, similarity_boost,
 *            style, use_speaker_boost, speed } }
 *   eleven_multilingual_v2 is the documented default model.
 * Before 2026-10-03 five routes each carried their own copy of this call (two
 * with no time limit) and two more read the usage endpoint by hand.
 *
 * Exception: api/shared/oliviaVoiceRequest.ts builds the streaming request for
 * Olivia's LiveAvatar face — a verbatim port of the questionnaire engine's
 * wiring that must stay identical to its source.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { postWithRetry, type LlmFailure } from './llm.js';

const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';

/** The model every LIFE SCORE voice has always used. */
export const ELEVENLABS_DEFAULT_MODEL = 'eleven_multilingual_v2';

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
  speed?: number;
}

export interface ElevenLabsSpeechRequest {
  voiceId: string;
  text: string;
  /** Defaults to ELEVENLABS_DEFAULT_MODEL. */
  modelId?: string;
  voiceSettings: ElevenLabsVoiceSettings;
  /** e.g. 'pcm_16000', 'mp3_44100_128'. Omitted = ElevenLabs' default (mp3). */
  outputFormat?: string;
  /** Optional Accept header (e.g. 'audio/mpeg'). */
  accept?: string;
  timeoutMs: number;
  label: string;
}

export type ElevenLabsSpeechResult = { ok: true; audio: ArrayBuffer } | LlmFailure;

/** True when the API key is set. */
export function elevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/** A voice id is used in the URL path, so only letters, digits, - and _ are accepted. */
export function isValidVoiceId(voiceId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(voiceId);
}

/** The HTTP status of a failed call, when ElevenLabs answered at all. */
export function failureStatus(result: ElevenLabsSpeechResult): number | undefined {
  return result.ok ? undefined : result.status;
}

/** One text-to-speech call. Never throws; no retry (a speaking voice cannot wait for one). */
export async function elevenLabsSpeech(request: ElevenLabsSpeechRequest): Promise<ElevenLabsSpeechResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'ELEVENLABS_API_KEY not configured' };
  if (!isValidVoiceId(request.voiceId)) {
    return { ok: false, kind: 'http', status: 400, message: `${request.label}: invalid voice id` };
  }

  const query = request.outputFormat ? `?output_format=${encodeURIComponent(request.outputFormat)}` : '';
  const sent = await postWithRetry(
    `${ELEVENLABS_API}/text-to-speech/${request.voiceId}${query}`,
    { 'xi-api-key': key, ...(request.accept ? { accept: request.accept } : {}) },
    {
      text: request.text,
      model_id: request.modelId ?? ELEVENLABS_DEFAULT_MODEL,
      voice_settings: request.voiceSettings,
    },
    { timeoutMs: request.timeoutMs, retries: 0, label: request.label },
  );
  if (!sent.ok) return sent;

  try {
    const audio = await sent.response.arrayBuffer();
    if (audio.byteLength === 0) return { ok: false, kind: 'empty', message: `${request.label}: no audio in reply` };
    return { ok: true, audio };
  } catch (error) {
    return { ok: false, kind: 'timeout', message: `${request.label}: audio not readable (${error instanceof Error ? error.message : String(error)})` };
  } finally {
    sent.release();
  }
}

/** The account's character usage (GET /v1/user/subscription), as ElevenLabs reports it. */
export interface ElevenLabsSubscription {
  character_count: number;
  character_limit: number;
  next_character_count_reset_unix: number;
  tier?: string;
  [field: string]: unknown;
}

export type ElevenLabsSubscriptionResult =
  | { ok: true; subscription: ElevenLabsSubscription }
  | { ok: false; status?: number; message: string };

/** Read the account's usage. Never throws. */
export async function elevenLabsSubscription(timeoutMs = 10_000): Promise<ElevenLabsSubscriptionResult> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { ok: false, message: 'ELEVENLABS_API_KEY not configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${ELEVENLABS_API}/user/subscription`, {
      method: 'GET',
      headers: { 'xi-api-key': key },
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      return { ok: false, status: response.status, message: `ElevenLabs usage: HTTP ${response.status} ${detail}` };
    }
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return { ok: false, message: 'ElevenLabs usage: unreadable reply' };
    const b = body as Record<string, unknown>;
    if (typeof b.character_count !== 'number' || typeof b.character_limit !== 'number') {
      return { ok: false, message: 'ElevenLabs usage: reply without character counts' };
    }
    return {
      ok: true,
      subscription: {
        ...b,
        character_count: b.character_count,
        character_limit: b.character_limit,
        next_character_count_reset_unix: typeof b.next_character_count_reset_unix === 'number' ? b.next_character_count_reset_unix : 0,
      },
    };
  } catch (error) {
    return { ok: false, message: `ElevenLabs usage: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    clearTimeout(timer);
  }
}
