/**
 * LIFE SCORE - every web call the server makes has a time limit (anti-drift).
 *
 * The February bug audit (A13-A16) found server calls with no time limit; on
 * 4 Oct 2026 a sweep found seven still left (two Resend emails, two Replicate
 * creates, a Replicate status check, two Simli setup calls). A call with no
 * limit can hold a function open until Vercel kills it. Every fetch( in api/
 * must now go through fetchWithTimeout or pass its own AbortSignal.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every .ts file under a folder. */
function tsFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

/** The lines after a call, far enough to reach its options object's `signal`. */
const WINDOW = 14;

describe('server time limits', () => {
  it('every fetch( in api/ is timed (fetchWithTimeout or an AbortSignal)', () => {
    const untimed: string[] = [];
    for (const file of tsFiles('api')) {
      if (file.replace(/\\/g, '/').endsWith('shared/fetchWithTimeout.ts')) continue;
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (!/\bfetch\(/.test(line) || /fetchWithTimeout/.test(line)) return;
        if (/^\s*(\/\/|\*)/.test(line)) return; // a comment, not a call
        if (!/signal/.test(lines.slice(i, i + WINDOW).join('\n'))) untimed.push(`${file}:${i + 1}`);
      });
    }
    expect(untimed).toEqual([]);
  });
});
