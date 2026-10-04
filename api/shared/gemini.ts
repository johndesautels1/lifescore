/**
 * LIFE SCORE - Google Gemini: the ONE place this app calls Gemini.
 *
 * Shape re-verified 2026-10-03 against the questionnaire engine's live Gemini
 * seat (src/core/e2/live/geminiSeat.ts and src/config/models.ts):
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *   key   in the x-goog-api-key HEADER (never the query string, where it lands in logs)
 *   body  systemInstruction · contents · generationConfig {maxOutputTokens, temperature}
 *         · tools [{ google_search: {} }] for grounding
 *   reply candidates[0].content.parts — thought parts skipped, text parts joined
 * Gemini 3.1 Pro is served ONLY as `gemini-3.1-pro-preview`; the plain
 * `gemini-3.1-pro` id LifeScore sent from July would have been refused.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { getModelCheck, postWithRetry, toCount, type LlmCitation, type LlmResult, type ModelCheck } from './llm.js';

export interface GeminiRequest {
  model: string;
  system: string;
  user: string;
  /** The answer's ceiling (Gemini's thinking is counted separately). */
  maxOutputTokens: number;
  temperature: number;
  /** Ground the answer in Google Search. */
  googleSearch: boolean;
  timeoutMs: number;
  retries?: number;
  label: string;
}

interface GeminiReply {
  modelVersion?: unknown;
  promptFeedback?: { blockReason?: unknown };
  candidates?: Array<{
    finishReason?: unknown;
    content?: { parts?: Array<{ text?: unknown; thought?: unknown }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: unknown; title?: unknown } }> };
  }>;
  usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown; thoughtsTokenCount?: unknown };
}

/** Topics the freedom metrics must be able to discuss (drugs, weapons, sexuality laws). */
const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
];

/** One generateContent call. Never throws. */
export async function callGemini(request: GeminiRequest): Promise<LlmResult> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'GEMINI_API_KEY not configured' };

  const sent = await postWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
    { 'x-goog-api-key': key },
    {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: { maxOutputTokens: request.maxOutputTokens, temperature: request.temperature },
      safetySettings: SAFETY_SETTINGS,
      ...(request.googleSearch ? { tools: [{ google_search: {} }] } : {}),
    },
    { timeoutMs: request.timeoutMs, retries: request.retries, label: request.label },
  );
  if (!sent.ok) return sent;

  let reply: GeminiReply;
  try {
    reply = (await sent.response.json()) as GeminiReply;
  } catch (error) {
    return { ok: false, kind: 'timeout', message: `${request.label}: reply not readable (${error instanceof Error ? error.message : String(error)})` };
  } finally {
    sent.release();
  }

  if (typeof reply.promptFeedback?.blockReason === 'string') {
    return { ok: false, kind: 'refused', message: `${request.label}: blocked (${reply.promptFeedback.blockReason})` };
  }
  const candidate = reply.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => p.thought !== true && typeof p.text === 'string')
    .map((p) => p.text as string)
    .join('');
  if (candidate?.finishReason === 'MAX_TOKENS' && !text.trim().endsWith('}')) {
    return { ok: false, kind: 'truncated', message: `${request.label}: reply cut off at maxOutputTokens (${request.maxOutputTokens})` };
  }
  if (candidate?.finishReason === 'SAFETY' || candidate?.finishReason === 'PROHIBITED_CONTENT') {
    return { ok: false, kind: 'refused', message: `${request.label}: stopped (${String(candidate.finishReason)})` };
  }
  if (!text.trim()) return { ok: false, kind: 'empty', message: `${request.label}: no text in reply (${String(candidate?.finishReason)})` };

  const citations: LlmCitation[] = [];
  for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
    const url = typeof chunk.web?.uri === 'string' ? chunk.web.uri : '';
    if (url && !citations.some((c) => c.url === url)) {
      citations.push({ url, title: typeof chunk.web?.title === 'string' ? chunk.web.title : url, snippet: '' });
    }
  }

  return {
    ok: true,
    text,
    usage: {
      inputTokens: toCount(reply.usageMetadata?.promptTokenCount),
      // Google bills thinking as output
      outputTokens: toCount(reply.usageMetadata?.candidatesTokenCount) + toCount(reply.usageMetadata?.thoughtsTokenCount),
    },
    citations,
    servedBy: typeof reply.modelVersion === 'string' ? reply.modelVersion : request.model,
  };
}

/** Whether Google still serves a Gemini model id (GET /v1beta/models/{id}). */
export async function geminiModelCheck(id: string): Promise<ModelCheck> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) return { ok: false, reason: 'not-configured', message: 'GEMINI_API_KEY is not set' };
  return getModelCheck(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}`, { 'x-goog-api-key': key });
}
