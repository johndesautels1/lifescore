/**
 * LIFE SCORE - Perplexity: the ONE place this app calls Perplexity.
 *
 * Perplexity switched its Sonar chat/completions endpoint off on 27 September
 * 2026 — LifeScore's evaluator called it until now. Shape re-verified 2026-10-03
 * against the questionnaire engine's live Perplexity seat
 * (src/core/e2/live/sonarSeat.ts, rebuilt 2026-08-16 from Perplexity's live
 * refusals) and Perplexity's pricing page:
 *   POST https://api.perplexity.ai/v1/agent        (the Agent API)
 *   body  preset: "low" (Perplexity's own replacement for Sonar Pro — a PRESET,
 *         not a model; `messages`, `max_tokens` and `web_search_options` are
 *         rejected as unknown fields) · instructions · input ·
 *         tools [{type: "web_search", search_context_size: "medium"}] ·
 *         max_output_tokens · stream: true
 *   reply server-sent events: `*output_text.delta` text deltas (or chat-style
 *         choices[].delta.content), usage and search_results on any frame
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { postWithRetry, toCount, type LlmCitation, type LlmResult } from './llm.js';

const AGENT_URL = 'https://api.perplexity.ai/v1/agent';
const CITATIONS_KEEP = 40;

export interface PerplexityRequest {
  /** The Agent API preset (see AI_MODELS.perplexityEvaluator.id). */
  preset: string;
  instructions: string;
  input: string;
  maxOutputTokens: number;
  timeoutMs: number;
  retries?: number;
  label: string;
}

interface StreamFrame {
  choices?: Array<{ delta?: { content?: unknown } }>;
  type?: unknown;
  delta?: unknown;
  response?: { usage?: unknown; search_results?: unknown; model?: unknown };
  usage?: unknown;
  search_results?: unknown;
  model?: unknown;
}

function readUsage(raw: unknown): { inputTokens: number; outputTokens: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const inputTokens = toCount(u.input_tokens ?? u.prompt_tokens);
  const outputTokens = toCount(u.output_tokens ?? u.completion_tokens);
  return inputTokens > 0 || outputTokens > 0 ? { inputTokens, outputTokens } : null;
}

function readSearchResults(raw: unknown, into: LlmCitation[]): void {
  if (!Array.isArray(raw)) return;
  for (const row of raw as Array<Record<string, unknown>>) {
    if (into.length >= CITATIONS_KEEP) return;
    const url = typeof row?.url === 'string' ? row.url.slice(0, 500) : '';
    if (!url || into.some((c) => c.url === url)) continue;
    into.push({
      url,
      title: (typeof row.title === 'string' ? row.title : url).slice(0, 200),
      snippet: typeof row.snippet === 'string' ? row.snippet.slice(0, 500) : '',
    });
  }
}

/** One Agent API call, streamed and assembled. Never throws. */
export async function callPerplexity(request: PerplexityRequest): Promise<LlmResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'PERPLEXITY_API_KEY not configured' };

  const sent = await postWithRetry(
    AGENT_URL,
    { authorization: `Bearer ${key}` },
    {
      preset: request.preset,
      instructions: request.instructions,
      input: request.input,
      tools: [{ type: 'web_search', search_context_size: 'medium' }],
      max_output_tokens: request.maxOutputTokens,
      stream: true,
    },
    { timeoutMs: request.timeoutMs, retries: request.retries, label: request.label },
  );
  if (!sent.ok) return sent;

  let text = '';
  let usage = { inputTokens: 0, outputTokens: 0 };
  let servedBy = `preset:${request.preset}`;
  const citations: LlmCitation[] = [];

  const consume = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === '[DONE]') return;
    let frame: StreamFrame;
    try {
      frame = JSON.parse(payload) as StreamFrame;
    } catch {
      return; // a torn frame — skip, never guess
    }
    const chatDelta = frame.choices?.[0]?.delta?.content;
    if (typeof chatDelta === 'string') text += chatDelta;
    if (typeof frame.type === 'string' && frame.type.endsWith('output_text.delta') && typeof frame.delta === 'string') {
      text += frame.delta;
    }
    usage = readUsage(frame.usage) ?? readUsage(frame.response?.usage) ?? usage;
    const model = typeof frame.model === 'string' ? frame.model : frame.response?.model;
    if (typeof model === 'string') servedBy = model;
    readSearchResults(frame.search_results, citations);
    readSearchResults(frame.response?.search_results, citations);
  };

  try {
    const reader = sent.response.body?.getReader();
    if (!reader) return { ok: false, kind: 'empty', message: `${request.label}: reply had no body` };
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    buffer += decoder.decode();
    consume(buffer);
  } catch (error) {
    return { ok: false, kind: 'timeout', message: `${request.label}: stream interrupted (${error instanceof Error ? error.message : String(error)})` };
  } finally {
    sent.release();
  }

  if (!text.trim()) return { ok: false, kind: 'empty', message: `${request.label}: no text in reply` };
  return { ok: true, text, usage, citations, servedBy };
}
