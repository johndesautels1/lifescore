/**
 * LIFE SCORE - Enhanced Mode shows every model as ready; no API key lives in the browser (anti-drift).
 *
 * John, 4 Oct 2026 ("Show all as ready"): the Enhanced Mode switch read model
 * "API keys" from the browser, found none (the keys are on the server) and
 * greyed every model out as "API key not configured". The browser key store is
 * gone, and src/main.tsx removes any copy an older release left on a device.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path.replace(/\\/g, '/')] : [];
  });
}

describe('Enhanced Mode', () => {
  it('shows every model as ready', () => {
    const toggle = readFileSync('src/components/EnhancedComparison.tsx', 'utf8');
    expect(toggle.includes('API key not configured')).toBe(false);
    expect(toggle.includes("'unavailable'")).toBe(false);
  });

  it('keeps no API key in the browser, and sweeps old copies', () => {
    expect(existsSync('src/services/enhancedComparison.ts')).toBe(false);
    const readers = files('src').filter((file) => file !== 'src/main.tsx' && readFileSync(file, 'utf8').includes('lifescore_api_keys'));
    expect(readers).toEqual([]);
    expect(readFileSync('src/main.tsx', 'utf8').includes("localStorage.removeItem('lifescore_api_keys')")).toBe(true);
  });
});
