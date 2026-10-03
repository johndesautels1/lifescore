/**
 * LIFE SCORE - Claude: the ONE place this app calls Anthropic.
 *
 * Every Claude request (evaluator, judge, judge report, Olivia, Emilia,
 * storyboard, screenplay, gun-law comparison, diagnostics) goes through
 * callClaude(). It owns the wire shape, the timeout, retries on overload, the
 * refusal fallback and reading the reply — so a model upgrade is one edit in
 * ./models.ts, not ten.
 *
 * Wire shape re-verified 2026-10-03 against Anthropic's current Messages API:
 *   POST https://api.anthropic.com/v1/messages
 *   headers  x-api-key · anthropic-version: 2023-06-01 · content-type
 *            anthropic-beta: server-side-fallback-2026-07-01 (with fallbacks: "default")
 *   body     model · max_tokens · system · messages · output_config.effort · tools
 *
 * Current Claude models (Opus 5.5, Sonnet 5.5) always think, and the thinking
 * block comes FIRST in `content`. The old code read `content[0].text` and would
 * have seen an empty reply on every call; replies are read here by joining every
 * `text` block. There is no `temperature` (Sonnet 5.5 rejects non-default
 * sampling) and no assistant prefill (rejected on every current model).
 *
 * Refusal fallbacks are ON: when Claude's safety classifiers decline, Anthropic
 * re-runs the request on its default fallback model inside the same call.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { ClaudeModelId } from './models.js';

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/** How hard Claude thinks. Opus 5.5 defaults to medium, so every call sets it. */
export type ClaudeEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ClaudeTextBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral'; ttl?: '5m' | '1h' };
}

export interface ClaudeToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: unknown;
}

export interface ClaudeToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** A block returned by the API. Thinking, fallback and other blocks are kept opaque and echoed back unchanged. */
export type ClaudeResponseBlock = ClaudeTextBlock | ClaudeToolUseBlock | { type: string; [key: string]: unknown };

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<ClaudeTextBlock | ClaudeToolResultBlock | ClaudeResponseBlock>;
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  strict?: boolean;
}

export interface ClaudeRequest {
  model: ClaudeModelId;
  maxTokens: number;
  effort: ClaudeEffort;
  /** A plain string, or blocks (use blocks to mark large stable text with cache_control). */
  system?: string | ClaudeTextBlock[];
  messages: ClaudeMessage[];
  tools?: ClaudeTool[];
  /** Whole-request time limit, retries included. */
  timeoutMs: number;
  /** Extra attempts on overload / 5xx / network failure (default 2). */
  retries?: number;
  /** Caller tag for logs, e.g. 'judge'. */
  label: string;
}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export type ClaudeResult =
  | {
      ok: true;
      /** Every text block joined — the answer. */
      text: string;
      /** The full content, to append to the conversation when tools are in play. */
      content: ClaudeResponseBlock[];
      toolUses: ClaudeToolUseBlock[];
      stopReason: string;
      usage: ClaudeUsage;
      /** The model that actually answered (differs when the refusal fallback ran). */
      servedBy: string;
    }
  | {
      ok: false;
      kind: 'not-configured' | 'refused' | 'truncated' | 'empty' | 'http' | 'timeout' | 'network';
      message: string;
      status?: number;
    };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function readUsage(raw: unknown): ClaudeUsage {
  const u = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    inputTokens: n(u.input_tokens),
    outputTokens: n(u.output_tokens),
    cacheReadTokens: n(u.cache_read_input_tokens),
    cacheWriteTokens: n(u.cache_creation_input_tokens),
  };
}

function isTextBlock(block: ClaudeResponseBlock): block is ClaudeTextBlock {
  return block.type === 'text' && typeof (block as ClaudeTextBlock).text === 'string';
}

function isToolUseBlock(block: ClaudeResponseBlock): block is ClaudeToolUseBlock {
  return block.type === 'tool_use' && typeof (block as ClaudeToolUseBlock).name === 'string';
}

/**
 * Call Claude once (with retries on overload). Never throws: every failure is a
 * typed result the caller switches on.
 */
export async function callClaude(request: ClaudeRequest): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, kind: 'not-configured', message: 'ANTHROPIC_API_KEY not configured' };

  const body: Record<string, unknown> = {
    model: request.model,
    max_tokens: request.maxTokens,
    messages: request.messages,
    output_config: { effort: request.effort },
    fallbacks: 'default',
  };
  if (request.system !== undefined) body.system = request.system;
  if (request.tools && request.tools.length > 0) body.tools = request.tools;

  const deadline = Date.now() + request.timeoutMs;
  const attempts = 1 + (request.retries ?? 2);
  let last: ClaudeResult = { ok: false, kind: 'network', message: 'No attempt made' };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { ok: false, kind: 'timeout', message: `${request.label}: timed out after ${request.timeoutMs}ms` };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    let response: Response;
    try {
      response = await fetch(MESSAGES_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-beta': FALLBACK_BETA,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      const aborted = error instanceof Error && error.name === 'AbortError';
      last = aborted
        ? { ok: false, kind: 'timeout', message: `${request.label}: timed out after ${request.timeoutMs}ms` }
        : { ok: false, kind: 'network', message: `${request.label}: ${error instanceof Error ? error.message : String(error)}` };
      if (aborted) return last;
      if (attempt < attempts) await sleep(Math.min(1000 * 2 ** (attempt - 1), Math.max(0, deadline - Date.now())));
      continue;
    }
    clearTimeout(timer);

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 500);
      last = { ok: false, kind: 'http', status: response.status, message: `${request.label}: Anthropic ${response.status} ${detail}` };
      console.error(`[CLAUDE:${request.label}] attempt ${attempt}/${attempts} failed: ${response.status} ${detail}`);
      if (!isRetryableStatus(response.status) || attempt === attempts) return last;
      const retryAfter = Number(response.headers.get('retry-after'));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1);
      await sleep(Math.min(waitMs, Math.max(0, deadline - Date.now())));
      continue;
    }

    const data: unknown = await response.json().catch(() => null);
    const payload = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const content = (Array.isArray(payload.content) ? payload.content : []) as ClaudeResponseBlock[];
    const stopReason = typeof payload.stop_reason === 'string' ? payload.stop_reason : 'unknown';
    const servedBy = typeof payload.model === 'string' ? payload.model : request.model;

    if (stopReason === 'refusal') {
      const details = payload.stop_details as { category?: string | null } | null | undefined;
      return { ok: false, kind: 'refused', message: `${request.label}: Claude declined (${details?.category ?? 'no category'})` };
    }

    const text = content.filter(isTextBlock).map((b) => b.text).join('\n').trim();
    const toolUses = content.filter(isToolUseBlock);

    if (stopReason === 'max_tokens') {
      return { ok: false, kind: 'truncated', message: `${request.label}: reply cut off at max_tokens (${request.maxTokens})` };
    }
    if (!text && toolUses.length === 0) {
      return { ok: false, kind: 'empty', message: `${request.label}: Claude returned no text (stop_reason ${stopReason})` };
    }

    return { ok: true, text, content, toolUses, stopReason, usage: readUsage(payload.usage), servedBy };
  }

  return last;
}

/**
 * The JSON object inside a reply. Claude is asked for bare JSON, but a fenced
 * block or a sentence around it is tolerated. Null when there is no parsable object.
 */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * A conversation sent by the browser, made safe to forward: only user/assistant
 * text turns, the newest `maxTurns`, each cut to `maxChars`, alternating, starting
 * with the user and ending with the assistant (the new message is the next turn).
 * Used by Olivia and Emilia, which keep their conversations in the browser.
 */
export function cleanConversation(raw: unknown, maxTurns: number, maxChars: number): ClaudeMessage[] {
  if (!Array.isArray(raw)) return [];
  const turns: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const item of raw.slice(-maxTurns * 2)) {
    if (typeof item !== 'object' || item === null) continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) continue;
    const text = content.slice(0, maxChars);
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n\n${text}`;
    else turns.push({ role, content: text });
  }
  while (turns.length > 0 && turns[0].role !== 'user') turns.shift();
  while (turns.length > 0 && turns[turns.length - 1].role !== 'assistant') turns.pop();
  return turns.slice(-maxTurns);
}
