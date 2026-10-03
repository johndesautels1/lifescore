/**
 * LIFE SCORE - One set of Tavily research per city pair (api/shared/tavilyCache.ts).
 *
 * Ruling (John, 3 Oct 2026): search once per comparison and reuse the results
 * for every category. Before, each category call (and each half of a split
 * category) searched again: 72 / 96 / 132 searches per model per comparison.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { readContextData, searchKey, tavilyPairKey, worthSharing } from '../api/shared/tavilyCache';

describe('the shared research key', () => {
  it('is the same whichever way round the cities come, and ignores case and spaces', () => {
    expect(tavilyPairKey('Lisbon, Portugal', 'Porto, Portugal')).toBe(tavilyPairKey(' porto, portugal', 'LISBON, PORTUGAL '));
    expect(tavilyPairKey('Lisbon', 'Porto')).not.toBe(tavilyPairKey('Lisbon', 'Madrid'));
  });

  it('finds each search by its query, whatever the case', () => {
    expect(searchKey('Lisbon personal freedom 2026')).toBe(searchKey('  lisbon PERSONAL freedom 2026'));
  });
});

describe('reading a stored row', () => {
  it('keeps the report, the pending order and every search', () => {
    const data = readContextData({
      research: { text: 'Report', sources: [{ title: 'S', url: 'https://s.example' }, 'junk'] },
      researchRequestId: 'req-1',
      searches: { 'q one': { results: [{ title: 'T', url: 'https://t.example', content: 'C' }, 7], answer: 'A' }, 'q two': {} },
    });
    expect(data).toEqual({
      research: { text: 'Report', sources: [{ title: 'S', url: 'https://s.example' }] },
      researchRequestId: 'req-1',
      searches: {
        'q one': { results: [{ title: 'T', url: 'https://t.example', content: 'C' }], answer: 'A' },
        'q two': { results: [], answer: undefined },
      },
    });
  });

  it('reads a broken row as empty, never throws', () => {
    for (const value of [null, 'x', 3, [], { research: 'x', searches: [] }]) {
      expect(readContextData(value)).toEqual({ research: null, researchRequestId: undefined, searches: {} });
    }
  });

  it('a total outage is not shared; any report or result is', () => {
    expect(worthSharing({ research: null, searches: { q: { results: [] } } })).toBe(false);
    expect(worthSharing({ research: null, searches: { q: { results: [], answer: 'A' } } })).toBe(true);
    expect(worthSharing({ research: { text: 'R', sources: [] }, searches: {} })).toBe(true);
  });
});

describe('the scoring route searches once per city pair (anti-drift)', () => {
  const route = readFileSync('api/evaluate.ts', 'utf8');

  it('every evaluation asks the shared copy first', () => {
    expect(route).toContain('claimTavilyContext(key)');
    expect(route.match(/\btavilySearch\(/g)?.length).toBe(1);
    expect(route.match(/\btavilyResearch\(/g)?.length).toBe(1);
    expect(route.match(/gatherTavilyContext\(city1, city2,/g)?.length).toBe(3);
  });

  it('keeps no second, in-memory research cache', () => {
    expect(route).not.toMatch(/tavilyResearchCache|getCachedTavilyResearch|tavilyStats/);
  });

  it('the table it uses is in the migrations', () => {
    expect(existsSync('supabase/migrations/20261003_tavily_context_cache.sql')).toBe(true);
    expect(readFileSync('supabase/migrations/20261003_tavily_context_cache.sql', 'utf8')).toContain('ENABLE ROW LEVEL SECURITY');
  });
});
