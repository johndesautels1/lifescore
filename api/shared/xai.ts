/**
 * LIFE SCORE - xAI Grok: the ONE place this app calls Grok.
 *
 * Shape re-verified 2026-10-03 against the questionnaire engine's live Grok seat
 * (src/core/e2/live/grokSeat.ts; xAI's own review of 2026-10-02: "Call grok-4.7"):
 *   POST https://api.x.ai/v1/responses
 *   body  model · input [system, user] · reasoning_effort · temperature ·
 *         max_output_tokens · tools [{type: "web_search"}] bounded by
 *         max_tool_calls and max_turns (xAI: "max_turns is the real stop button")
 *   reply status · output[] message items → output_text / text (4.7 also returns
 *         encrypted reasoning, which is never read)
 * The old chat/completions call with an undocumented `search: true` is gone.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { postWithRetry, toCount, type LlmResult } from './llm.js';

const RESPONSES_URL = 'https://api.x.ai/v1/responses';

export interface GrokRequest {
  model: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  effort: 'low' | 'medium' | 'high';
  temperature: number;
  /** Let Grok search the web, with xAI's recommended bounds. */
  webSearch: boolean;
  timeoutMs: number;
  retries?: number;
  label: string;
}

/** xAI's bounds for a searched scoring call (engine grokSeat.ts, 2026-09-13). */
const MAX_TOOL_CALLS = 10;
const MAX_TURNS = 6;

interface GrokReply {
  status?: unknown;
  model?: unknown;
  output?: Array<{ type?: unknown; content?: Array<{ type?: unknown; text?: unknown }> }>;
  incomplete_details?: { reason?: unknown };
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
}

/** One Responses API call to Grok. Never throws. */
export async function callGrok(request: GrokRequest): Promise<LlmResult> {
  const key = process.env.XAI_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'XAI_API_KEY not configured' };

  const body: Record<string, unknown> = {
    model: request.model,
    input: [
      { role: 'system', content: request.system },
      { role: 'user', content: request.user },
    ],
    reasoning_effort: request.effort,
    temperature: request.temperature,
    max_output_tokens: request.maxOutputTokens,
  };
  if (request.webSearch) {
    body.tools = [{ type: 'web_search' }];
    body.max_tool_calls = MAX_TOOL_CALLS;
    body.max_turns = MAX_TURNS;
  }

  const sent = await postWithRetry(RESPONSES_URL, { authorization: `Bearer ${key}` }, body, {
    timeoutMs: request.timeoutMs,
    retries: request.retries,
    label: request.label,
  });
  if (!sent.ok) return sent;

  let reply: GrokReply;
  try {
    reply = (await sent.response.json()) as GrokReply;
  } catch (error) {
    return { ok: false, kind: 'timeout', message: `${request.label}: reply not readable (${error instanceof Error ? error.message : String(error)})` };
  } finally {
    sent.release();
  }

  let text = '';
  for (const item of reply.output ?? []) {
    if (item?.type !== 'message' || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if ((part?.type === 'output_text' || part?.type === 'text') && typeof part.text === 'string') text += part.text;
    }
  }

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
