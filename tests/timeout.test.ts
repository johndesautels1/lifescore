/**
 * LIFE SCORE - one time-limit helper, not a copy per file (anti-drift; bug audit R5).
 *
 * api/shared/timeout.ts (server, and the browser's evaluator) and
 * withQueryTimeout in src/lib/supabase.ts (the browser's Supabase queries, with
 * retries) replaced eleven pasted withTimeout copies on 4 Oct 2026. A file may
 * keep a one-line local name bound to them, never its own copy.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { timeLimit, withTimeout, withTimeoutOr } from '../api/shared/timeout';

const never = new Promise<string>(() => {});

describe('withTimeout', () => {
  it('gives the result when the work finishes in time', async () => {
    expect(await withTimeout(Promise.resolve('done'), 50)).toBe('done');
  });

  it('rejects, naming the work, once the time passes', async () => {
    let message = '';
    try {
      await withTimeout(never, 10, 'Read subscriptions');
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toBe('Read subscriptions timed out after 10ms');
  });

  it("passes the work's own error on", async () => {
    let message = '';
    try {
      await withTimeout(Promise.reject(new Error('boom')), 50);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toBe('boom');
  });

  it('timeLimit binds a limit and keeps the label optional', async () => {
    const limited = timeLimit(10);
    let message = '';
    try {
      await limited(never);
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    expect(message).toBe('Query timed out after 10ms');
  });
});

describe('withTimeoutOr', () => {
  it('gives the fallback once the time passes, the result when in time', async () => {
    expect(await withTimeoutOr(never, 10, 'fallback')).toBe('fallback');
    expect(await withTimeoutOr(Promise.resolve('done'), 50, 'fallback')).toBe('done');
  });
});

function codeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return codeFiles(path);
    return /\.tsx?$/.test(name) ? [path.replace(/\\/g, '/')] : [];
  });
}

describe('no pasted copies', () => {
  it('only api/shared/timeout.ts defines withTimeout; files bind to the shared helpers', () => {
    const offenders: string[] = [];
    for (const file of [...codeFiles('src'), ...codeFiles('api')]) {
      if (file === 'api/shared/timeout.ts') continue;
      const text = readFileSync(file, 'utf8');
      if (/function withTimeout\b/.test(text)) offenders.push(`${file}: function withTimeout`);
      for (const line of text.split('\n').filter((l) => /const withTimeout\s*=/.test(l))) {
        if (!/timeLimit\(|withQueryTimeout\(/.test(line)) offenders.push(`${file}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
