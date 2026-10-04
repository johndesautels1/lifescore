/**
 * LIFE SCORE - the GitHub backup's access key is kept for this visit only (anti-drift).
 *
 * John, 4 Oct 2026 ("Keep for this visit only"): "Connect GitHub" kept the
 * user's GitHub personal access token in localStorage. It now lives in
 * sessionStorage (forgotten when the tab closes); the Gist id stays in
 * localStorage so a later visit updates the same backup; a token an older
 * release stored is removed at start (src/main.tsx).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  GITHUB_GIST_KEY,
  GITHUB_TOKEN_KEY,
  OLD_GITHUB_CONFIG_KEY,
  clearGitHubConfig,
  getGitHubConfig,
  moveStoredGitHubConfig,
  saveGitHubConfig,
  storedGistId,
} from '../src/services/githubToken';

/** The browser's Storage, in memory. */
class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string): string | null { return this.items.has(key) ? (this.items.get(key) as string) : null; }
  setItem(key: string, value: string): void { this.items.set(key, String(value)); }
  removeItem(key: string): void { this.items.delete(key); }
  clear(): void { this.items.clear(); }
  keys(): string[] { return [...this.items.keys()]; }
}

let local: MemoryStorage;
let session: MemoryStorage;

/** Puts a stand-in on globalThis even where Node defines its own Web Storage. */
function install(name: 'localStorage' | 'sessionStorage', value: MemoryStorage | undefined): void {
  if (value) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  else Reflect.deleteProperty(globalThis, name);
}

beforeEach(() => {
  local = new MemoryStorage();
  session = new MemoryStorage();
  install('localStorage', local);
  install('sessionStorage', session);
});

afterEach(() => {
  install('localStorage', undefined);
  install('sessionStorage', undefined);
});

describe('GitHub backup settings', () => {
  it('keeps the token for this visit and the Gist id for later visits', () => {
    saveGitHubConfig({ accessToken: 'ghp_secret', gistId: 'abc123' });
    expect(session.getItem(GITHUB_TOKEN_KEY)).toBe('ghp_secret');
    expect(local.getItem(GITHUB_GIST_KEY)).toBe('abc123');
    expect(local.keys().some((key) => (local.getItem(key) ?? '').includes('ghp_secret'))).toBe(false);
    expect(getGitHubConfig()).toEqual({ accessToken: 'ghp_secret', gistId: 'abc123' });
  });

  it('a new visit has no token but remembers the Gist', () => {
    saveGitHubConfig({ accessToken: 'ghp_secret', gistId: 'abc123' });
    session.clear(); // the tab was closed
    expect(getGitHubConfig()).toBeNull();
    expect(storedGistId()).toBe('abc123');
  });

  it('a config without a Gist id forgets the stored one; disconnect forgets everything', () => {
    saveGitHubConfig({ accessToken: 'ghp_secret', gistId: 'abc123' });
    saveGitHubConfig({ accessToken: 'ghp_secret' });
    expect(storedGistId()).toBeUndefined();
    saveGitHubConfig({ accessToken: 'ghp_secret', gistId: 'abc123' });
    clearGitHubConfig();
    expect(getGitHubConfig()).toBeNull();
    expect(storedGistId()).toBeUndefined();
  });

  it('removes a token an older release stored, keeping its Gist id', () => {
    local.setItem(OLD_GITHUB_CONFIG_KEY, JSON.stringify({ accessToken: 'ghp_old', gistId: 'old456' }));
    moveStoredGitHubConfig();
    expect(local.getItem(OLD_GITHUB_CONFIG_KEY)).toBeNull();
    expect(storedGistId()).toBe('old456');
    expect(getGitHubConfig()).toBeNull();
    local.setItem(OLD_GITHUB_CONFIG_KEY, 'not json');
    moveStoredGitHubConfig();
    expect(local.getItem(OLD_GITHUB_CONFIG_KEY)).toBeNull();
  });

  it('the app uses these, and runs the clean-up at start', () => {
    const saved = readFileSync('src/services/savedComparisons.ts', 'utf8');
    expect(saved.includes("from './githubToken'")).toBe(true);
    expect(saved.includes(OLD_GITHUB_CONFIG_KEY)).toBe(false);
    expect(readFileSync('src/main.tsx', 'utf8').includes('moveStoredGitHubConfig();')).toBe(true);
  });
});
