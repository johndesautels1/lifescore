/**
 * LIFE SCORE - The Tavily connection (api/shared/tavily.ts) and the cost rows
 * the comparison screen builds from what Tavily reports.
 *
 * Until 3 Oct 2026 the research report was read from the order reply (which
 * never carries it) and search credits from `usage.total_tokens` (Tavily
 * sends `usage.credits`), so the evaluators never saw a report and every
 * credit count was 0. These tests hold the shapes Tavily documents.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  readResearchOrder,
  readResearchStatus,
  readSearchReply,
  tavilyResearch,
  tavilySearch,
} from '../api/shared/tavily';
import { tavilyCostsFromUsage } from '../src/utils/costCalculator-functions';
import { API_PRICING } from '../src/utils/costCalculator-pricing';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** A scripted Tavily: answers each request with the next reply for its path. */
function scriptedTavily(replies: Record<string, Response[]>): string[] {
  const calls: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(url).pathname;
    calls.push(`${init?.method ?? 'GET'} ${path}`);
    const next = replies[path]?.shift();
    if (!next) throw new Error(`no scripted reply for ${path}`);
    return next;
  });
  return calls;
}

describe('Tavily reply readers', () => {
  it('reads search credits from usage.credits, not usage.total_tokens', () => {
    const reply = readSearchReply({
      query: 'q',
      answer: 'A short answer',
      results: [{ title: 'T', url: 'https://a.example', content: 'C', score: 0.9 }],
      usage: { credits: 2 },
      request_id: 'r',
    });
    expect(reply).toEqual({ results: [{ title: 'T', url: 'https://a.example', content: 'C' }], answer: 'A short answer', credits: 2 });
    expect(readSearchReply({ results: [], usage: { total_tokens: 5 } }).credits).toBeNull();
  });

  it('drops empty results and survives a broken body', () => {
    expect(readSearchReply({ results: [{}, null, { url: 'https://b.example' }] }).results).toEqual([
      { title: '', url: 'https://b.example', content: '' },
    ]);
    expect(readSearchReply('nope')).toEqual({ results: [], answer: undefined, credits: null });
  });

  it('reads the order id and every research status', () => {
    expect(readResearchOrder({ request_id: 'abc', status: 'pending' })).toBe('abc');
    expect(readResearchOrder({ status: 'pending' })).toBeUndefined();
    expect(readResearchStatus({ request_id: 'abc', status: 'in_progress', response_time: 3 })).toEqual({
      status: 'in_progress', text: '', sources: [], credits: null,
    });
    expect(readResearchStatus({
      status: 'completed',
      content: 'The report',
      sources: [{ title: 'S', url: 'https://s.example', favicon: 'x' }, { title: 'no url' }],
      usage: { credits: 23 },
    })).toEqual({ status: 'completed', text: 'The report', sources: [{ title: 'S', url: 'https://s.example' }], credits: 23 });
    expect(readResearchStatus({ status: 'completed', content: { a: 1 } }).text).toBe('{"a":1}');
  });
});

describe('tavilyResearch orders the report and collects it', () => {
  beforeEach(() => vi.stubEnv('TAVILY_API_KEY', 'tvly-test'));
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('polls until the report is completed', async () => {
    const calls = scriptedTavily({
      '/research': [json(201, { request_id: 'req-1', status: 'pending' })],
      '/research/req-1': [
        json(202, { request_id: 'req-1', status: 'pending' }),
        json(202, { request_id: 'req-1', status: 'in_progress' }),
        json(200, { request_id: 'req-1', status: 'completed', content: 'Report text', sources: [{ title: 'Law', url: 'https://law.example' }], usage: { credits: 17 } }),
      ],
    });
    const outcome = await tavilyResearch('compare', { deadlineMs: 2000, pollIntervalMs: 5, label: 'test' });
    expect(outcome).toEqual({ report: { text: 'Report text', sources: [{ title: 'Law', url: 'https://law.example' }] }, ordered: true, credits: 17 });
    expect(calls).toEqual(['POST /research', 'GET /research/req-1', 'GET /research/req-1', 'GET /research/req-1']);
  });

  it('stops at the deadline: charged, not collected, credits unknown', async () => {
    const pending = Array.from({ length: 200 }, () => json(202, { status: 'pending' }));
    scriptedTavily({ '/research': [json(201, { request_id: 'slow' })], '/research/slow': pending });
    const outcome = await tavilyResearch('compare', { deadlineMs: 60, pollIntervalMs: 5, label: 'test' });
    expect(outcome).toEqual({ report: null, ordered: true, credits: null });
  });

  it('a failed report is charged and has no text', async () => {
    scriptedTavily({
      '/research': [json(201, { request_id: 'f' })],
      '/research/f': [json(200, { status: 'failed', usage: { credits: 4 } })],
    });
    expect(await tavilyResearch('compare', { deadlineMs: 2000, pollIntervalMs: 5, label: 'test' })).toEqual({ report: null, ordered: true, credits: 4 });
  });

  it('a refused order is not charged', async () => {
    scriptedTavily({ '/research': [json(401, { detail: 'bad key' })] });
    expect(await tavilyResearch('compare', { deadlineMs: 2000, pollIntervalMs: 5, label: 'test' })).toEqual({ report: null, ordered: false, credits: null });
  });

  it('orders nothing without a key', async () => {
    vi.stubEnv('TAVILY_API_KEY', '');
    const calls = scriptedTavily({});
    expect(await tavilyResearch('compare', { deadlineMs: 2000, label: 'test' })).toEqual({ report: null, ordered: false, credits: null });
    expect(calls).toEqual([]);
  });

  it('a search returns the credits Tavily reported', async () => {
    scriptedTavily({ '/search': [json(200, { results: [{ title: 'T', url: 'https://t.example', content: 'C' }], usage: { credits: 2 } })] });
    const reply = await tavilySearch('q', 5, 2000);
    expect(reply.credits).toBe(2);
    expect(reply.results).toEqual([{ title: 'T', url: 'https://t.example', content: 'C' }]);
  });
});

describe('the comparison cost rows use what Tavily reported', () => {
  it('sums reported credits; only an unreported call is priced at the typical figure', () => {
    const rows = tavilyCostsFromUsage(
      [
        { researchCredits: 17, searchCredits: 24, researchUnreported: 0, searchUnreported: 0 },
        { researchCredits: 0, searchCredits: 22, researchUnreported: 1, searchUnreported: 1 },
        { researchCredits: 0, searchCredits: 0 },
      ],
      'Lisbon vs Porto research',
      1000
    );
    const researchCredits = 17 + API_PRICING['tavily-research'].avgCredits;
    expect(rows.research?.creditsUsed).toBe(researchCredits);
    expect(rows.research?.cost).toBeCloseTo(researchCredits * API_PRICING['tavily-research'].perCredit, 6);
    expect(rows.searches.map((s) => s.creditsUsed)).toEqual([24, 22 + API_PRICING['tavily-search'].avgCredits]);
  });

  it('no Tavily use means no Tavily rows (the old screen added a fixed guess regardless)', () => {
    expect(tavilyCostsFromUsage([], 'x', 1)).toEqual({ research: null, searches: [] });
  });

  it('an advanced search is priced at the published 2 credits when Tavily gives no count', () => {
    expect(API_PRICING['tavily-search'].avgCredits).toBe(2);
  });
});

describe('one Tavily connection (anti-drift)', () => {
  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
      else if (/\.(ts|tsx)$/.test(name)) out.push(path.replace(/\\/g, '/'));
    }
    return out;
  }

  it('no file but api/shared/tavily.ts calls api.tavily.com', () => {
    const offenders = [...sourceFiles('api'), ...sourceFiles('src')].filter(
      (f) => f !== 'api/shared/tavily.ts' && readFileSync(f, 'utf8').includes('api.tavily.com'),
    );
    expect(offenders).toEqual([]);
  });

  it('the comparison screen no longer adds a fixed Tavily guess', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app).toContain('tavilyCostsFromUsage(');
    expect(app).not.toMatch(/searchCreditsPerProvider|const researchCredits = 30/);
  });
});
