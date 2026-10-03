/**
 * LIFE SCORE - one server-side database connection (anti-drift).
 *
 * Until 2026-10-03 twenty-one server files built their own database client from
 * their own chain of setting names; twelve of them fell back to the PUBLIC
 * (anon) key when one name was missing, so writes could fail silently under row
 * security. Every route now uses api/shared/supabaseAdmin.ts. These tests keep
 * it that way.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

const API = sourceFiles('api');

/** Files allowed the PUBLIC key: verifying a user's own sign-in token, and the read-only health pings. */
const PUBLIC_KEY_USERS = new Set(['api/shared/auth.ts', 'api/health.ts', 'api/warmup.ts']);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('server files share one database connection', () => {
  it('no file but api/shared/supabaseAdmin.ts reads the service key', () => {
    const offenders = API.filter(
      (f) =>
        f !== 'api/shared/supabaseAdmin.ts' &&
        /process\.env\.SUPABASE_SERVICE_(ROLE_)?KEY/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('only sign-in checks and health pings read the public key', () => {
    const offenders = API.filter(
      (f) => !PUBLIC_KEY_USERS.has(f) && /process\.env\.(NEXT_PUBLIC_|VITE_)?SUPABASE_ANON_KEY/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no other file creates a database client', () => {
    const offenders = API.filter(
      (f) => f !== 'api/shared/supabaseAdmin.ts' && !PUBLIC_KEY_USERS.has(f) && /\bcreateClient\(/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});

describe('the browser reads only public settings', () => {
  /** Vite copies every import.meta.env.VITE_* the browser code reads into the public JavaScript. */
  const PUBLIC_SETTINGS = new Set([
    'VITE_APP_URL',
    'VITE_AVATAR_PROVIDER',
    'VITE_DEMO_ENABLED',
    'VITE_ERROR_REPORTING_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_URL',
  ]);

  it('no screen reads a VITE_ setting outside the public list (an API key there would be published)', () => {
    const read = new Set<string>();
    for (const f of sourceFiles('src')) {
      for (const m of readFileSync(f, 'utf8').matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) read.add(m[1]);
    }
    expect([...read].filter((name) => !PUBLIC_SETTINGS.has(name))).toEqual([]);
  });
});

describe('the service connection fails closed', () => {
  function clearDatabaseSettings(): void {
    for (const name of [
      'SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_SERVICE_KEY',
    ]) {
      vi.stubEnv(name, '');
    }
  }

  it('without the service key there is no client, even when the public key is set', async () => {
    clearDatabaseSettings();
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'public-anon-key');
    const db = await import('../api/shared/supabaseAdmin');
    expect(db.getServiceClient()).toBeNull();
    expect(() => db.serviceDb.from('profiles')).toThrow(db.DatabaseNotConfiguredError);
  });

  it('with the service key, serviceDb is the shared client', async () => {
    clearDatabaseSettings();
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    const db = await import('../api/shared/supabaseAdmin');
    const client = db.getServiceClient();
    expect(client).not.toBeNull();
    expect(db.getServiceClient()).toBe(client);
    expect(typeof db.serviceDb.from).toBe('function');
    expect(db.serviceDb.from('profiles')).toBeTruthy();
  });
});
