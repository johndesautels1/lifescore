/**
 * LIFE SCORE - every storage bucket the code uses is one a migration creates (anti-drift).
 *
 * Found 4 Oct 2026: the report library wrote to "reports" while production had
 * only a hand-made "Reports" (so no report was ever saved), and Gamma exports
 * wrote to "gamma-exports", whose migration had never been applied. Bucket
 * names are case-sensitive. Migration 20261004_reconcile_live_schema created
 * both; this keeps every name the code uses tied to a migration that makes it.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string, pattern: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, pattern);
    return pattern.test(name) ? [path] : [];
  });
}

/** Bucket names the code names: `…BUCKET = 'x'`, `storage.from('x')`, account deletion's folder list. */
function bucketsInCode(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const add = (name: string, file: string) => found.set(name, [...(found.get(name) ?? []), file]);
  for (const file of [...files('api', /\.ts$/), ...files('src', /\.tsx?$/)]) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/BUCKET\s*=\s*['"`]([^'"`]+)['"`]/g)) add(m[1], file);
    for (const m of text.matchAll(/storage\s*\.from\(\s*['"`]([^'"`]+)['"`]/g)) add(m[1], file);
  }
  const folders = readFileSync('api/user/delete.ts', 'utf8').match(/USER_FOLDERS[^=]*=\s*\[([^\]]*)\]/);
  for (const m of (folders?.[1] ?? '').matchAll(/['"`]([^'"`]+)['"`]/g)) add(m[1], 'api/user/delete.ts');
  return found;
}

/** Bucket ids created by `INSERT INTO storage.buckets … VALUES ('id', …)` in the migrations. */
function bucketsInMigrations(): Set<string> {
  const ids = new Set<string>();
  for (const file of files('supabase/migrations', /\.sql$/)) {
    const sql = readFileSync(file, 'utf8').replace(/--.*$/gm, '');
    for (const m of sql.matchAll(/insert\s+into\s+storage\.buckets[^;]*?values\s*\(\s*'([^']+)'/gi)) ids.add(m[1]);
  }
  return ids;
}

describe('storage buckets', () => {
  it('finds the buckets the code uses', () => {
    const used = [...bucketsInCode().keys()].sort();
    expect(used.includes('reports')).toBe(true);
    expect(used.includes('gamma-exports')).toBe(true);
    expect(used.includes('user-videos')).toBe(true);
  });

  it('every bucket the code uses is created by a migration (names are case-sensitive)', () => {
    const created = bucketsInMigrations();
    const missing = [...bucketsInCode().entries()]
      .filter(([name]) => !created.has(name))
      .map(([name, where]) => `${name} (${[...new Set(where)].join(', ')})`);
    expect(missing).toEqual([]);
  });

  it('account deletion clears the bucket the report library writes to', () => {
    const library = readFileSync('src/services/reportStorageService.ts', 'utf8').match(/STORAGE_BUCKET\s*=\s*'([^']+)'/)?.[1];
    const folders = readFileSync('api/user/delete.ts', 'utf8').match(/USER_FOLDERS[^=]*=\s*\[([^\]]*)\]/)?.[1] ?? '';
    expect(library).toBe('reports');
    expect(folders.includes(`'${library}'`)).toBe(true);
  });
});
