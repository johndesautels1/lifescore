/**
 * LIFE SCORE - sign-in settings reach the browser (anti-drift).
 *
 * 3 October 2026: production builds shipped with the Supabase address but a
 * blank public key, so the sign-in screen said "Auth not configured" for
 * everyone. The page now loads the settings from the server when the build
 * left them out, BEFORE the app (and its Supabase client) is imported.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parsePublicConfig } from '../src/lib/publicConfig';

describe("the server's reply is narrowed", () => {
  it('accepts an https address and a key, trimmed', () => {
    expect(parsePublicConfig({ supabaseUrl: 'https://abc.supabase.co\n', supabaseAnonKey: ' key ' })).toEqual({
      url: 'https://abc.supabase.co',
      anonKey: 'key',
    });
  });

  it('refuses anything else', () => {
    expect(parsePublicConfig(null)).toBeNull();
    expect(parsePublicConfig({ supabaseUrl: 'http://abc.supabase.co', supabaseAnonKey: 'key' })).toBeNull();
    expect(parsePublicConfig({ supabaseUrl: 'https://abc.supabase.co', supabaseAnonKey: '' })).toBeNull();
    expect(parsePublicConfig({ supabaseUrl: 42, supabaseAnonKey: 'key' })).toBeNull();
  });
});

describe('start-up order', () => {
  it('main.tsx loads the settings before it imports the app', () => {
    const main = readFileSync('src/main.tsx', 'utf8');
    expect(main).not.toMatch(/^import App from/m);
    const load = main.indexOf('await loadPublicSupabaseSettings()');
    const app = main.indexOf("await import('./App.tsx')");
    expect(load).toBeGreaterThan(0);
    expect(app).toBeGreaterThan(load);
  });

  it('the Supabase client is created from those settings, never straight from the build', () => {
    const client = readFileSync('src/lib/supabase.ts', 'utf8');
    expect(client).toContain('publicSupabaseSettings()');
    expect(client).not.toMatch(/import\.meta\.env\.VITE_SUPABASE_(URL|ANON_KEY)/);
  });

  it('the server route hands out only the public pair', () => {
    const route = readFileSync('api/public-config.ts', 'utf8');
    expect(route).toContain('publicSupabaseSettings()');
    expect(route).not.toMatch(/SERVICE_ROLE|SERVICE_KEY|process\.env/);
  });
});
