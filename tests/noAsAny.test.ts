/**
 * LIFE SCORE - no "as any" in the app or the server (anti-drift).
 *
 * The 4 Oct 2026 clean-up removed all 39 (docs/MASTER_BUG_AUDIT_20260220.md,
 * row "as any"). A cast to any switches type checking off for that value; a new
 * one needs a typed reader or a narrower type instead.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function codeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return codeFiles(path);
    return /\.tsx?$/.test(name) ? [path.replace(/\\/g, '/')] : [];
  });
}

/** The code without comments (a comment may mention the words). */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('as any', () => {
  it('appears nowhere in src/ or api/', () => {
    const found = [...codeFiles('src'), ...codeFiles('api')].filter((file) => /\bas any\b/.test(withoutComments(readFileSync(file, 'utf8'))));
    expect(found).toEqual([]);
  });
});
