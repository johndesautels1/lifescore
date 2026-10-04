/**
 * LIFE SCORE - the report-only Content-Security-Policy and its report reader (anti-drift).
 *
 * Item S14 in docs/MASTER_BUG_AUDIT_20260220.md: vercel.json sends the policy
 * report-only (4 Oct 2026), browsers report what it would block to
 * /api/csp-report, and the route logs the blocked site and the page path only.
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
  const policy = all?.headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value ?? '';

  it('is sent report-only on every page, reporting to /api/csp-report', () => {
    expect(policy).toContain('report-uri /api/csp-report');
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).toContain("script-src 'self'");
  });

  it('the report route reads the raw body and logs through the reader', () => {
    const route = readFileSync('api/csp-report.ts', 'utf8');
    expect(route).toContain('bodyParser: false');
    expect(route).toContain('readCspReports(');
  });
});
