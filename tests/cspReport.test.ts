/**
 * LIFE SCORE - the Content-Security-Policy and its report reader (anti-drift).
 *
 * Item S14 in docs/MASTER_BUG_AUDIT_20260220.md: vercel.json sent the policy
 * report-only on 4 Oct 2026, then enforced it the same day (John: "switch").
 * Browsers report what it blocks to /api/csp-report, and the route logs the
 * blocked site and the page path only.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAX_REPORTS_PER_REQUEST, readCspReports } from '../api/shared/cspReport';

describe('readCspReports', () => {
  it('reads a classic report and keeps only the origin and the path', () => {
    const reports = readCspReports({
      'csp-report': {
        'document-uri': 'https://clueslifescore.com/judge?comparison=LIFE-1&email=a@b.c',
        'violated-directive': 'connect-src',
        'effective-directive': 'connect-src',
        'blocked-uri': 'https://replicate.delivery/xyz/video.mp4?token=secret',
        'source-file': 'https://clueslifescore.com/assets/index-abc.js?v=1',
        'line-number': 12,
      },
    });
    expect(reports).toEqual([
      { directive: 'connect-src', blocked: 'https://replicate.delivery', page: '/judge', source: 'https://clueslifescore.com/assets/index-abc.js', line: 12 },
    ]);
  });

  it('reads the Reporting API format and skips other report types', () => {
    const reports = readCspReports([
      { type: 'csp-violation', body: { documentURL: 'https://clueslifescore.com/', effectiveDirective: 'script-src-elem', blockedURL: 'inline' } },
      { type: 'deprecation', body: {} },
      { type: 'csp-violation', body: { documentURL: 'https://clueslifescore.com/olivia', effectiveDirective: 'connect-src', blockedURL: 'wss://olivia-abc.livekit.cloud/rtc?access_token=secret' } },
    ]);
    expect(reports).toEqual([
      { directive: 'script-src-elem', blocked: 'inline', page: '/' },
      { directive: 'connect-src', blocked: 'wss://olivia-abc.livekit.cloud', page: '/olivia' },
    ]);
  });

  it('names data: and blob: by scheme, and reads no more than the cap', () => {
    const one = { type: 'csp-violation', body: { documentURL: 'https://clueslifescore.com/', effectiveDirective: 'img-src', blockedURL: 'data:image/png;base64,AAAA' } };
    expect(readCspReports([one])[0].blocked).toBe('data');
    expect(readCspReports(Array.from({ length: 50 }, () => one)).length).toBe(MAX_REPORTS_PER_REQUEST);
  });

  it('gives nothing for anything else', () => {
    expect(readCspReports(null)).toEqual([]);
    expect(readCspReports('x')).toEqual([]);
    expect(readCspReports({ other: 1 })).toEqual([]);
  });
});

describe('the header', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const all = vercel.headers.find((rule) => rule.source === '/(.*)');
  const policy = all?.headers.find((h) => h.key === 'Content-Security-Policy')?.value ?? '';

  it('is enforced on every page, reporting to /api/csp-report', () => {
    expect(all?.headers.some((h) => h.key === 'Content-Security-Policy-Report-Only')).toBe(false);
    expect(policy).toContain('report-uri /api/csp-report');
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).toContain("script-src 'self'");
    // scripts only from our own site (and Vercel's toolbar), never inline
    expect(/script-src[^;]*'unsafe-inline'/.test(policy)).toBe(false);
    expect(/script-src[^;]*'unsafe-eval'/.test(policy)).toBe(false);
  });

  it('allows what the app reaches: Supabase, the live faces, Gamma, vendor video downloads', () => {
    for (const source of ['https://*.supabase.co', 'https://api.simli.ai', 'https://*.livekit.cloud', 'https://*.liveavatar.com', 'wss:', 'https://replicate.delivery', 'https://fal.media', 'https://*.heygen.ai', 'https://api.github.com']) {
      expect({ source, listed: policy.includes(source) }).toEqual({ source, listed: true });
    }
    expect(policy).toContain('frame-src \'self\' https://gamma.app');
  });

  it('the report route reads the raw body and logs through the reader', () => {
    const route = readFileSync('api/csp-report.ts', 'utf8');
    expect(route).toContain('bodyParser: false');
    expect(route).toContain('readCspReports(');
  });
});
