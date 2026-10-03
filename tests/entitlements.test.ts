/**
 * LIFE SCORE - Plans + entitlements tests.
 * The plan table is the single source for the screens AND the server; the
 * comparison grant is what lets one counted comparison call the AI routes.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  TIER_LIMITS,
  USAGE_COLUMNS,
  ADMIN_LIMITS,
  FOUNDER_ADMIN_EMAILS,
  betaTesterLimits,
  currentPeriodStart,
  featureIncluded,
  isCountedFeature,
  isUserTier,
  requiredTierFor,
  type FeatureKey,
} from '../api/shared/plans';

type Entitlements = typeof import('../api/shared/entitlements');
let ent: Entitlements;

beforeAll(async () => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  ent = await import('../api/shared/entitlements');
});

const USER = '11111111-2222-3333-4444-555555555555';
const NOW = 1_800_000_000;

describe('plans', () => {
  it('every counted feature has a usage column, and only counted ones', () => {
    for (const feature of Object.keys(TIER_LIMITS.free) as FeatureKey[]) {
      if (isCountedFeature(feature)) expect(USAGE_COLUMNS[feature]).toMatch(/^[a-z_]+$/);
    }
    expect(Object.keys(USAGE_COLUMNS).every((f) => isCountedFeature(f as FeatureKey))).toBe(true);
  });

  it('names the cheapest plan that includes each feature', () => {
    expect(requiredTierFor('standardComparisons')).toBe('free');
    expect(requiredTierFor('oliviaMinutesPerMonth')).toBe('pro');
    expect(requiredTierFor('enhancedComparisons')).toBe('enterprise');
    expect(requiredTierFor('movies')).toBe('enterprise');
  });

  it('SOVEREIGN gets one Grok video a month (the server once said unlimited)', () => {
    expect(TIER_LIMITS.enterprise.grokVideos).toBe(1);
    expect(featureIncluded(TIER_LIMITS.pro, 'grokVideos')).toBe(false);
  });

  it('beta testers keep their own comparison limits and unlimited extras', () => {
    const limits = betaTesterLimits({ standardComparisonsLimit: 5, enhancedComparisonsLimit: null });
    expect(limits.standardComparisons).toBe(5);
    expect(limits.enhancedComparisons).toBe(1);
    expect(limits.oliviaMinutesPerMonth).toBe(-1);
  });

  it('admins are unlimited on every counted feature', () => {
    for (const feature of Object.keys(USAGE_COLUMNS) as FeatureKey[]) expect(ADMIN_LIMITS[feature]).toBe(-1);
  });

  it('the usage month is the UTC month', () => {
    expect(currentPeriodStart(new Date('2026-10-31T23:30:00-05:00'))).toBe('2026-11-01');
    expect(currentPeriodStart(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
  });

  it('narrows plan ids and keeps founder emails lower-case', () => {
    expect(isUserTier('enterprise')).toBe(true);
    expect(isUserTier('sovereign')).toBe(false);
    expect(FOUNDER_ADMIN_EMAILS.every((e) => e === e.toLowerCase())).toBe(true);
  });

  it('no other file keeps its own plan table (anti-drift)', () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name) && !path.replace(/\\/g, '/').endsWith('api/shared/plans.ts')) {
          const text = readFileSync(path, 'utf8');
          if (/\bconst\s+TIER_LIMITS\b|HARDCODED_ADMIN_EMAILS|DEV_BYPASS_EMAILS\s*=/.test(text)) offenders.push(path);
        }
      }
    };
    walk('api');
    walk('src');
    expect(offenders).toEqual([]);
  });
});

describe('comparison grants', () => {
  it('a grant opens its own comparison for its own user', () => {
    const grant = ent.signComparisonGrant(USER, 'enhancedComparisons', 'Baltimore, Maryland, USA', 'Bratislava, Slovakia', NOW);
    expect(grant).toBeTypeOf('string');
    const check = ent.verifyComparisonGrant(grant!, USER, 'Baltimore, Maryland, USA', 'Bratislava, Slovakia', ['enhancedComparisons'], 3600, NOW + 60);
    expect(check).toEqual({ ok: true, feature: 'enhancedComparisons' });
  });

  it('matches the parsed city name and either order (the judge report sends "Baltimore")', () => {
    const grant = ent.signComparisonGrant(USER, 'standardComparisons', 'Baltimore, Maryland, USA', 'Bratislava, Slovakia', NOW)!;
    const check = ent.verifyComparisonGrant(grant, USER, 'bratislava', 'Baltimore', ['standardComparisons'], 3600, NOW);
    expect(check.ok).toBe(true);
  });

  it('refuses another user, other cities, a too-old grant and the wrong comparison kind', () => {
    const grant = ent.signComparisonGrant(USER, 'standardComparisons', 'Lisbon', 'Porto', NOW)!;
    expect(ent.verifyComparisonGrant(grant, 'someone-else', 'Lisbon', 'Porto', ['standardComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'wrong-user' });
    expect(ent.verifyComparisonGrant(grant, USER, 'Lisbon', 'Madrid', ['standardComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'wrong-cities' });
    expect(ent.verifyComparisonGrant(grant, USER, 'Lisbon', 'Porto', ['standardComparisons'], 3600, NOW + 3601)).toEqual({ ok: false, reason: 'expired' });
    expect(ent.verifyComparisonGrant(grant, USER, 'Lisbon', 'Porto', ['enhancedComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'wrong-feature' });
  });

  it('refuses a missing, tampered or malformed grant', () => {
    const grant = ent.signComparisonGrant(USER, 'enhancedComparisons', 'Lisbon', 'Porto', NOW)!;
    const [body, mac] = grant.split('.');
    const forged = Buffer.from(JSON.stringify({ v: 1, u: USER, f: 'enhancedComparisons', c: ['lisbon', 'porto'], i: NOW + 10 })).toString('base64url');
    expect(ent.verifyComparisonGrant(undefined, USER, 'Lisbon', 'Porto', ['enhancedComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'missing' });
    expect(ent.verifyComparisonGrant(`${forged}.${mac}`, USER, 'Lisbon', 'Porto', ['enhancedComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(ent.verifyComparisonGrant(`${body}.${mac}x`, USER, 'Lisbon', 'Porto', ['enhancedComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(ent.verifyComparisonGrant(`${body}.${mac}.extra`, USER, 'Lisbon', 'Porto', ['enhancedComparisons'], 3600, NOW)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('keeps the two windows the routes rely on', () => {
    expect(ent.GRANT_WORK_WINDOW_SECONDS).toBe(2 * 60 * 60);
    expect(ent.GRANT_REPORT_WINDOW_SECONDS).toBe(30 * 24 * 60 * 60);
  });
});
