/**
 * LIFE SCORE - Rate Limiter Unit Tests
 * Tests the in-memory rate limiting logic and IP extraction
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  rateLimiter,
  RATE_LIMIT_PRESETS,
  getClientIP,
} from '../api/shared/rateLimit';
import type { RateLimitConfig } from '../api/shared/rateLimit';

// ============================================================================
// RATE_LIMIT_PRESETS
// ============================================================================

describe('RATE_LIMIT_PRESETS', () => {
  it('has all expected presets', () => {
    expect(RATE_LIMIT_PRESETS).toHaveProperty('heavy');
    expect(RATE_LIMIT_PRESETS).toHaveProperty('standard');
    expect(RATE_LIMIT_PRESETS).toHaveProperty('light');
    expect(RATE_LIMIT_PRESETS).toHaveProperty('health');
  });

  it('heavy preset is most restrictive', () => {
    expect(RATE_LIMIT_PRESETS.heavy.maxRequests).toBeLessThan(RATE_LIMIT_PRESETS.standard.maxRequests);
    expect(RATE_LIMIT_PRESETS.heavy.maxRequests).toBeLessThan(RATE_LIMIT_PRESETS.light.maxRequests);
  });

  it('health preset is most permissive', () => {
    expect(RATE_LIMIT_PRESETS.health.maxRequests).toBeGreaterThan(RATE_LIMIT_PRESETS.heavy.maxRequests);
    expect(RATE_LIMIT_PRESETS.health.maxRequests).toBeGreaterThan(RATE_LIMIT_PRESETS.standard.maxRequests);
  });

  it('all presets have 1-minute windows', () => {
    for (const preset of Object.values(RATE_LIMIT_PRESETS)) {
      expect(preset.windowMs).toBe(60000);
    }
  });
});

// ============================================================================
// rateLimiter.check
// ============================================================================

describe('rateLimiter.check', () => {
  const config: RateLimitConfig = { windowMs: 60000, maxRequests: 3 };

  it('allows first request', () => {
    const result = rateLimiter.check('test-ip-1', 'test-endpoint-1', config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('tracks remaining requests', () => {
    const endpoint = 'test-remaining-' + Date.now();
    const ip = 'ip-remaining-' + Date.now();

    const r1 = rateLimiter.check(ip, endpoint, config);
    expect(r1.remaining).toBe(2);

    const r2 = rateLimiter.check(ip, endpoint, config);
    expect(r2.remaining).toBe(1);

    const r3 = rateLimiter.check(ip, endpoint, config);
    expect(r3.remaining).toBe(0);
  });

  it('blocks after max requests', () => {
    const endpoint = 'test-block-' + Date.now();
    const ip = 'ip-block-' + Date.now();

    rateLimiter.check(ip, endpoint, config);
    rateLimiter.check(ip, endpoint, config);
    rateLimiter.check(ip, endpoint, config);

    const blocked = rateLimiter.check(ip, endpoint, config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks different IPs independently', () => {
    const endpoint = 'test-multi-ip-' + Date.now();

    const r1 = rateLimiter.check('ip-a-' + Date.now(), endpoint, config);
    const r2 = rateLimiter.check('ip-b-' + Date.now(), endpoint, config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(2);
  });

  it('tracks different endpoints independently', () => {
    const ip = 'ip-multi-endpoint-' + Date.now();

    const r1 = rateLimiter.check(ip, 'endpoint-a-' + Date.now(), config);
    const r2 = rateLimiter.check(ip, 'endpoint-b-' + Date.now(), config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it('returns resetIn within window', () => {
    const endpoint = 'test-reset-' + Date.now();
    const result = rateLimiter.check('ip-reset-' + Date.now(), endpoint, config);
    expect(result.resetIn).toBeLessThanOrEqual(config.windowMs);
    expect(result.resetIn).toBeGreaterThan(0);
  });
});

// ============================================================================
// rateLimiter.getStats
// ============================================================================

describe('rateLimiter.getStats', () => {
  it('returns stats object', () => {
    const stats = rateLimiter.getStats();
    expect(stats).toHaveProperty('endpoints');
    expect(stats).toHaveProperty('totalEntries');
    expect(typeof stats.endpoints).toBe('number');
    expect(typeof stats.totalEntries).toBe('number');
  });
});

// ============================================================================
// getClientIP
// ============================================================================

describe('getClientIP', () => {
  it('extracts IP from x-real-ip header', () => {
    const headers = { 'x-real-ip': '1.2.3.4' };
    expect(getClientIP(headers)).toBe('1.2.3.4');
  });

  it('extracts first IP from x-forwarded-for', () => {
    const headers = { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' };
    expect(getClientIP(headers)).toBe('1.2.3.4');
  });

  it('prefers x-real-ip over x-forwarded-for', () => {
    const headers = {
      'x-real-ip': '1.1.1.1',
      'x-forwarded-for': '2.2.2.2',
    };
    expect(getClientIP(headers)).toBe('1.1.1.1');
  });

  it('falls back to x-vercel-forwarded-for', () => {
    const headers = { 'x-vercel-forwarded-for': '3.3.3.3, 4.4.4.4' };
    expect(getClientIP(headers)).toBe('3.3.3.3');
  });

  it('returns unknown when no headers present', () => {
    expect(getClientIP({})).toBe('unknown');
  });

  it('handles array header values', () => {
    const headers = { 'x-real-ip': ['5.5.5.5', '6.6.6.6'] };
    expect(getClientIP(headers)).toBe('5.5.5.5');
  });

  it('works with Headers object', () => {
    const headers = new Headers();
    headers.set('x-real-ip', '7.7.7.7');
    expect(getClientIP(headers)).toBe('7.7.7.7');
  });
});
