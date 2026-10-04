/**
 * LIFE SCORE - OpenAI: the ONE place this app calls OpenAI's text models.
 *
 * Shape re-verified 2026-10-03 against the questionnaire engine's live GPT seat
 * (src/core/e2/live/gptSeat.ts), itself checked on OpenAI's docs 2026-10-02:
 *   POST https://api.openai.com/v1/responses   (the Responses API — GPT-6.1 is a
 *        reasoning model: no temperature, no `max_tokens`, reasoning shares
 *        `max_output_tokens`)
 *   body  model · input [system, user] as input_text · reasoning {effort, mode} ·
 *         max_output_tokens · store: false
 *   reply status completed | incomplete · output[] message items → output_text
 * The old chat/completions call with temperature 0.3 and max_tokens is gone.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { getModelCheck, postWithRetry, toCount, type LlmFailure, type LlmResult, type ModelCheck } from './llm.js';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';

export interface OpenAIRequest {
  model: string;
  system: string;
  user: string;
  /** Reasoning AND answer share this ceiling. */
  maxOutputTokens: number;
  effort: 'low' | 'medium' | 'high';
  timeoutMs: number;
  retries?: number;
  label: string;
}

interface ResponsesReply {
  status?: unknown;
  model?: unknown;
  output?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown; refusal?: unknown }> }>;
  incomplete_details?: { reason?: unknown };
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
}

/** One Responses API call. Never throws. */
export async function callOpenAI(request: OpenAIRequest): Promise<LlmResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'OPENAI_API_KEY not configured' };

  const sent = await postWithRetry(
    RESPONSES_URL,
    { authorization: `Bearer ${key}` },
    {
      model: request.model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: request.system }] },
        { role: 'user', content: [{ type: 'input_text', text: request.user }] },
      ],
      reasoning: { effort: request.effort, mode: 'standard' },
      max_output_tokens: request.maxOutputTokens,
      store: false,
    },
    { timeoutMs: request.timeoutMs, retries: request.retries, label: request.label },
  );
  if (!sent.ok) return sent;

  let reply: ResponsesReply;
  try {
    reply = (await sent.response.json()) as ResponsesReply;
  } catch (error) {
    return { ok: false, kind: 'timeout', message: `${request.label}: reply not readable (${error instanceof Error ? error.message : String(error)})` };
  } finally {
    sent.release();
  }

  let text = '';
  let refusal: string | null = null;
  for (const item of reply.output ?? []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === 'output_text' && typeof part.text === 'string') text += part.text;
      if (part?.type === 'refusal' && typeof part.refusal === 'string') refusal = part.refusal;
    }
  }

  if (refusal) return { ok: false, kind: 'refused', message: `${request.label}: model refused (${refusal.slice(0, 200)})` };
  if (reply.status === 'incomplete') {
    const reason = typeof reply.incomplete_details?.reason === 'string' ? reply.incomplete_details.reason : 'unknown';
    return { ok: false, kind: 'truncated', message: `${request.label}: reply incomplete (${reason})` };
  }
  if (!text.trim()) return { ok: false, kind: 'empty', message: `${request.label}: no text in reply (status ${String(reply.status)})` };

  return {
    ok: true,
    text,
    usage: { inputTokens: toCount(reply.usage?.input_tokens), outputTokens: toCount(reply.usage?.output_tokens) },
    citations: [],
    servedBy: typeof reply.model === 'string' ? reply.model : request.model,
  };
}

// ============================================================================
// SPEECH — the voice back-up when ElevenLabs fails
// ============================================================================
//
// Checked 2026-10-03 on OpenAI's text-to-speech guide: POST /v1/audio/speech
// with model tts-1 (fast) or tts-1-hd (higher quality) — both current — and the
// voices nova, shimmer and onyx (all supported by both). `pcm` is raw 24 kHz
// 16-bit signed little-endian mono with no header. Before 2026-10-03 five
// routes each carried their own copy of this call.

const SPEECH_URL = 'https://api.openai.com/v1/audio/speech';

/** Each character's back-up voice, fixed so a back-up never changes who is speaking. */
export const BACKUP_VOICES = {
  olivia: 'nova', // warm, conversational female
  emilia: 'shimmer', // softer, expressive female
  cristiano: 'onyx', // deep, authoritative male
} as const;

export type SpeechCharacter = keyof typeof BACKUP_VOICES;

export interface SpeechRequest {
  character: SpeechCharacter;
  text: string;
  /** mp3 for players; pcm = raw 24 kHz 16-bit mono samples. */
  format: 'mp3' | 'pcm';
  /** 'hd' → tts-1-hd (recorded videos); 'standard' → tts-1 (live speech). */
  quality: 'standard' | 'hd';
  speed?: number;
  timeoutMs: number;
  label: string;
}

export type SpeechResult = { ok: true; audio: Buffer; model: string } | LlmFailure;

/** One speech call. Never throws; no retry (a live voice cannot wait for one). */
export async function openaiSpeech(request: SpeechRequest): Promise<SpeechResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'OPENAI_API_KEY not configured for the voice back-up' };

  const model = request.quality === 'hd' ? 'tts-1-hd' : 'tts-1';
  const sent = await postWithRetry(
    SPEECH_URL,
    { authorization: `Bearer ${key}` },
    {
      model,
      voice: BACKUP_VOICES[request.character],
      input: request.text,
      response_format: request.format,
      ...(request.speed !== undefined ? { speed: request.speed } : {}),
    },
    { timeoutMs: request.timeoutMs, retries: 0, label: request.label },
  );
  if (!sent.ok) return sent;

  try {
    const audio = Buffer.from(await sent.response.arrayBuffer());
    if (audio.length === 0) return { ok: false, kind: 'empty', message: `${request.label}: no audio in reply` };
    return { ok: true, audio, model };
  } catch (error) {
    return { ok: false, kind: 'timeout', message: `${request.label}: audio not readable (${error instanceof Error ? error.message : String(error)})` };
  } finally {
    sent.release();
  }
}

/** Whether OpenAI still serves a model id (GET /v1/models/{id}). */
export async function openaiModelCheck(id: string): Promise<ModelCheck> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, reason: 'not-configured', message: 'OPENAI_API_KEY is not set' };
  return getModelCheck(`https://api.openai.com/v1/models/${encodeURIComponent(id)}`, { Authorization: `Bearer ${key}` });
}
