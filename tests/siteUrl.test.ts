/**
 * LIFE SCORE - the server's links point to the project's own sites (anti-drift).
 *
 * Found 4 Oct 2026: https://lifescore.vercel.app — named in email links, the CORS
 * fallback and the checkout's allowed return addresses — belongs to someone
 * else. The project's addresses are clueslifescore.com and
 * lifescore-lilac.vercel.app (api/shared/siteUrl.ts).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PUBLIC_SITE, publicSiteUrl } from '../api/shared/siteUrl';
import { isAllowedRedirectUrl } from '../api/shared/stripe';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('publicSiteUrl', () => {
  it('uses the PRODUCTION_URL setting first', () => {
    vi.stubEnv('PRODUCTION_URL', 'https://example-production.test/');
    expect(publicSiteUrl()).toBe('https://example-production.test');
  });

  it("then Vercel's production domain, never a single deployment's URL", () => {
    vi.stubEnv('PRODUCTION_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'clueslifescore.com');
    vi.stubEnv('VERCEL_URL', 'lifescore-abc123.vercel.app');
    expect(publicSiteUrl()).toBe('https://clueslifescore.com');
  });

  it('then the public site', () => {
    vi.stubEnv('PRODUCTION_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    expect(publicSiteUrl()).toBe(PUBLIC_SITE);
    expect(PUBLIC_SITE).toBe('https://clueslifescore.com');
  });
});

describe("the checkout returns only to the project's sites", () => {
  it("refuses someone else's lifescore.vercel.app, accepts the project's own", () => {
    expect(isAllowedRedirectUrl('https://lifescore.vercel.app/?checkout=success')).toBe(false);
    expect(isAllowedRedirectUrl('https://lifescore-lilac.vercel.app/?checkout=success')).toBe(true);
    expect(isAllowedRedirectUrl('https://clueslifescore.com/?checkout=success')).toBe(true);
  });
});

describe('no code names the stranger\'s address', () => {
  it('as a quoted address anywhere in api/ or src/', () => {
    const offenders = [...files('api'), ...files('src')].filter((f) => /['"`]https:\/\/lifescore\.vercel\.app/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
