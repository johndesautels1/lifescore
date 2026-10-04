/**
 * LIFE SCORE - a time limit for one piece of work (a database query, a step).
 *
 * The one copy (bug audit R5: it had been pasted into each file). Used by the
 * video status and webhook routes, account deletion and export, the judge
 * video's cache look-ups, and the browser's evaluator (src/services/llmEvaluators.ts).
 * The browser's Supabase queries, which also retry, use withQueryTimeout in
 * src/lib/supabase.ts.
 */

/** The work's result, or a rejection naming `label` once `ms` pass. The timer is always cleared. */
export async function withTimeout<T>(work: PromiseLike<T>, ms: number, label = 'Query'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** withTimeout with this file's limit: `const withTimeout = timeLimit(STEP_TIMEOUT_MS)`. */
export function timeLimit(ms: number): <T>(work: PromiseLike<T>, label?: string) => Promise<T> {
  return <T>(work: PromiseLike<T>, label?: string): Promise<T> => withTimeout(work, ms, label);
}

/** The work's result, or `fallback` once `ms` pass (time never rejects; the work's own error does). The timer is always cleared. */
export async function withTimeoutOr<T>(work: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
