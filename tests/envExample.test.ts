/**
 * LIFE SCORE - .env.example lists exactly the settings the code reads (anti-drift).
 *
 * The February bug audit marked B12 and B34 fixed. On 4 Oct 2026 the template
 * lacked nine settings the code reads (FAL_KEY, LIVEAVATAR_API_KEY,
 * LIVEAVATAR_OLIVIA_AVATAR_ID, INVIDEO_API_KEY, INVIDEO_MCP_URL,
 * PRODUCTION_URL, SUPABASE_ACCESS_TOKEN and two fallback names) and still
 * listed four nothing reads (the retired Kling keys and the OpenAI Assistant
 * ids). Both directions are now held.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Every code file under a folder (no dependencies, no build output). */
function codeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return /node_modules|dist/.test(path) ? [] : codeFiles(path);
    return /\.(ts|tsx|mjs|cjs|js)$/.test(path) ? [path] : [];
  });
}

/** Set by Vercel or Vite themselves, never by us. */
const PLATFORM = new Set([
  'VERCEL', 'VERCEL_URL', 'VERCEL_ENV', 'VERCEL_REGION', 'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_GIT_COMMIT_SHA', 'VERCEL_GIT_COMMIT_MESSAGE', 'NODE_ENV', 'CI',
  'DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR', 'GITHUB_STEP_SUMMARY',
]);

const sources = [...codeFiles('api'), ...codeFiles('src'), ...codeFiles('scripts'), 'vite.config.ts'].map((f) =>
  readFileSync(f, 'utf8'),
);

/** Settings the code reads: process.env.X, import.meta.env.X, process.env['X']. */
const read = new Set<string>();
/** Settings the code names in a string (e.g. the admin settings check lists them). */
const named = new Set<string>();
for (const text of sources) {
  for (const re of [/process\.env\.([A-Z0-9_]+)/g, /import\.meta\.env\.([A-Z0-9_]+)/g, /process\.env\[['"]([A-Z0-9_]+)['"]\]/g]) {
    for (const m of text.matchAll(re)) read.add(m[1]);
  }
  for (const m of text.matchAll(/['"`]([A-Z][A-Z0-9]*_[A-Z0-9_]+)['"`]/g)) named.add(m[1]);
}

const template = readFileSync('.env.example', 'utf8');
const documented = new Set([...template.matchAll(/^#?\s*([A-Z0-9_]+)=/gm)].map((m) => m[1]));

describe('.env.example', () => {
  it('documents every setting the code reads', () => {
    const missing = [...read].filter((name) => !documented.has(name) && !PLATFORM.has(name)).sort();
    expect(missing).toEqual([]);
  });

  it('lists no setting the code no longer reads', () => {
    const stale = [...documented].filter((name) => !read.has(name) && !named.has(name)).sort();
    expect(stale).toEqual([]);
  });
});
