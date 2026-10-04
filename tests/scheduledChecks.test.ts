/**
 * LIFE SCORE - the scheduled checks stay scheduled and stay safe (anti-drift).
 *
 * John, 4 Oct 2026: scheduled checks for dependency changes (auto-update), key
 * core code, vendors and laws. This holds what runs on a timer and how:
 * - CI reruns weekly on main;
 * - a weekly pull request updates libraries within their ranges;
 * - a quarterly law watch opens a compliance issue;
 * - a weekly Vercel cron checks every AI model id and Google sign-in, refuses
 *   any caller without CRON_SECRET, and emails the admins on a failure.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { plannedModelChecks, failureEmail } from '../api/shared/vendorCheck';
import { AI_MODELS } from '../api/shared/models';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

describe('GitHub schedules', () => {
  it('CI reruns every week on main', () => {
    expect(read('.github/workflows/ci.yml').includes('  schedule:\n    - cron: "0 6 * * 1"')).toBe(true);
  });

  it('library updates arrive as a weekly pull request, proven before it is offered', () => {
    const wf = read('.github/workflows/dependency-updates.yml');
    expect(wf.includes('- cron: "30 5 * * 1"')).toBe(true);
    expect(wf.includes('npm update --package-lock-only')).toBe(true);
    for (const proof of ['npm ci', 'tsc -b', 'tsconfig.api.json', 'npx vitest run', 'npx vite build', 'check-precache-shell.mjs']) {
      expect(wf.includes(proof)).toBe(true);
    }
    expect(wf.includes('git push origin main')).toBe(false); // a pull request, never main
  });

  it('the law watch opens a compliance issue each quarter', () => {
    const wf = read('.github/workflows/law-watch.yml');
    expect(wf.includes('- cron: "0 7 1 1,4,7,10 *"')).toBe(true);
    expect(wf.includes('npx tsx scripts/law-watch.ts')).toBe(true);
    expect(wf.includes('gh issue create')).toBe(true);
    expect(read('scripts/law-watch.ts').includes("type: 'web_search_20260209'")).toBe(true);
  });
});

describe('the weekly vendor check', () => {
  it('is on the Vercel timer', () => {
    const crons = (JSON.parse(read('vercel.json')) as { crons: Array<{ path: string; schedule: string }> }).crons;
    expect(crons.some(c => c.path === '/api/cron/vendor-check' && c.schedule === '0 8 * * 1')).toBe(true);
  });

  it('checks every AI model the app uses once, except Perplexity (no model endpoint)', () => {
    const planned = plannedModelChecks();
    const expected = new Set(
      Object.values(AI_MODELS)
        .filter(m => m.vendor !== 'perplexity')
        .map(m => `${m.vendor}:${m.id}`)
    );
    expect(new Set(planned.map(p => `${p.vendor}:${p.id}`))).toEqual(expected);
    expect(planned.length).toBe(expected.size);
  });

  it('refuses every caller unless CRON_SECRET is set and matches, compared in constant time', () => {
    const route = read('api/cron/vendor-check.ts');
    expect(route.includes("if (!secret) {\n    res.status(503)")).toBe(true);
    expect(route.includes('timingSafeEqual(')).toBe(true);
    expect(route.includes("res.status(401).json({ error: 'Unauthorized' })")).toBe(true);
  });

  it('writes the admins an email that names each failure, safely', () => {
    const mail = failureEmail({
      checkedAt: '2026-10-05T08:00:00.000Z',
      results: [
        { name: 'openai model x', ok: false, detail: 'missing (404): <gone>' },
        { name: 'Google sign-in starts', ok: true, detail: 'redirects to Google' },
      ],
      failures: [{ name: 'openai model x', ok: false, detail: 'missing (404): <gone>' }],
    });
    expect(mail.subject).toBe('LIFE SCORE weekly check: 1 problem');
    expect(mail.text.includes('openai model x: missing (404): <gone>')).toBe(true);
    expect(mail.html.includes('&lt;gone&gt;')).toBe(true);
    expect(mail.html.includes('<gone>')).toBe(false);
  });
});
