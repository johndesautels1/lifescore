/**
 * LIFE SCORE - What every AI vendor connection shares: the result type and one
 * POST-with-retry helper. One connection per vendor lives beside this file
 * (anthropic.ts, openai.ts, gemini.ts, xai.ts, perplexity.ts); routes call those,
 * never a vendor URL. Model ids come from ./models.ts.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmCitation {
  title: string;
  url: string;
  snippet: string;
}

export type LlmFailureKind = 'not-configured' | 'refused' | 'truncated' | 'empty' | 'http' | 'timeout' | 'network';

export interface LlmFailure {
  ok: false;
  kind: LlmFailureKind;
  message: string;
  status?: number;
}

export type LlmResult =
  | { ok: true; text: string; usage: LlmUsage; citations: LlmCitation[]; servedBy: string }
  | LlmFailure;

/** True for failures worth another attempt by the caller (overload, timeout, network, 5xx). */
export function isRetryable(failure: LlmFailure): boolean {
  if (failure.kind === 'timeout' || failure.kind === 'network' || failure.kind === 'empty') return true;
  if (failure.kind === 'http') return failure.status === undefined || failure.status === 429 || failure.status >= 500;
  return false;
}

export function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

/**
 * POST JSON with a whole-call deadline and retries on overload (408/409/429/5xx,
 * honouring retry-after) and network errors. Returns the OK response — whose body
 * is still bound by the same deadline, so call `release()` once it is read — or a
 * typed failure. Never throws.
 */
export async function postWithRetry(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  options: { timeoutMs: number; retries?: number; label: string },
): Promise<{ ok: true; response: Response; release: () => void } | LlmFailure> {
  const deadline = Date.now() + options.timeoutMs;
  const attempts = 1 + (options.retries ?? 2);
  let last: LlmFailure = { ok: false, kind: 'network', message: `${options.label}: no attempt made` };

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { ok: false, kind: 'timeout', message: `${options.label}: timed out after ${options.timeoutMs}ms` };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === 'AbortError') {
        return { ok: false, kind: 'timeout', message: `${options.label}: timed out after ${options.timeoutMs}ms` };
      }
      last = { ok: false, kind: 'network', message: `${options.label}: ${error instanceof Error ? error.message : String(error)}` };
      if (attempt < attempts) await sleep(Math.min(1000 * 2 ** (attempt - 1), Math.max(0, deadline - Date.now())));
      continue;
    }
    if (response.ok) return { ok: true, response, release: () => clearTimeout(timer) };
    clearTimeout(timer);

    const detail = (await response.text().catch(() => '')).slice(0, 500);
    last = { ok: false, kind: 'http', status: response.status, message: `${options.label}: HTTP ${response.status} ${detail}` };
    console.error(`[LLM:${options.label}] attempt ${attempt}/${attempts} failed: ${response.status} ${detail}`);
    if (!retryableStatus(response.status) || attempt === attempts) return last;
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** (attempt - 1);
    await sleep(Math.min(waitMs, Math.max(0, deadline - Date.now())));
  }
  return last;
}

// ============================================================================
// MODEL CHECKS (the weekly vendor check, api/cron/vendor-check.ts)
// ============================================================================

/** Whether a vendor still serves a model id. */
export type ModelCheck =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'not-configured' | 'error'; message: string; status?: number };

/** GET a vendor's model-metadata URL: 200 = served, 404 = gone, anything else = could not tell. */
export async function getModelCheck(url: string, headers: Record<string, string>, timeoutMs = 15_000): Promise<ModelCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    if (response.ok) return { ok: true };
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    if (response.status === 404) return { ok: false, reason: 'missing', status: 404, message: detail || 'not found' };
    return { ok: false, reason: 'error', status: response.status, message: detail || `HTTP ${response.status}` };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError';
    return { ok: false, reason: 'error', message: timedOut ? `no answer in ${timeoutMs} ms` : err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}
