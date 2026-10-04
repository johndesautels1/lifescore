/**
 * LIFE SCORE - the server reads an outside comparison, and Olivia's context, field by field (anti-drift).
 *
 * Olivia's context, the Judge's report and Olivia's source lookup each read a
 * comparison from outside the server (the request body or a saved row), and
 * Olivia's chat reads back the context the browser sends. Each had its own
 * untyped copy ("any"), so a malformed body crashed the route and a missing
 * field printed "undefined". They now go through api/shared/comparisonInput.ts
 * and api/shared/oliviaContext.ts.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cityTotal, metricScore, readComparison } from '../api/shared/comparisonInput';
import { readLifeScoreContext } from '../api/shared/oliviaContext';

const enhanced = {
  llmsUsed: ['claude-sonnet', 'gpt'],
  winner: 'city2',
  scoreDifference: 4,
  comparisonId: 'LIFE-1',
  city1: {
    city: 'Austin',
    country: 'USA',
    totalConsensusScore: 70,
    categories: [
      {
        categoryId: 'personal_freedom',
        averageConsensusScore: null,
        metrics: [
          { metricId: 'pf_01', consensusScore: 80, llmScores: [{ evidence: [{ url: 'https://a.example', title: 'A', snippet: 'about A' }, { title: 'no link' }], sources: ['https://b.example'] }] },
          { consensusScore: 60 },
        ],
      },
    ],
  },
  city2: { city: 'Lisbon', country: 'Portugal', totalConsensusScore: 74, categories: [] },
};

describe('readComparison', () => {
  it('reads an Enhanced comparison', () => {
    const c = readComparison(enhanced);
    expect(c?.enhanced).toBe(true);
    expect(c?.winner).toBe('city2');
    expect(c?.llmsUsed).toEqual(['claude-sonnet', 'gpt']);
    expect(cityTotal(c!.city1)).toBe(70);
    const metric = c!.city1.categories[0].metrics[0];
    expect(metricScore(metric)).toBe(80);
    expect(metric.llmScores[0].evidence).toEqual([{ url: 'https://a.example', title: 'A', snippet: 'about A' }]);
    expect(metric.llmScores[0].sources).toEqual([{ url: 'https://b.example' }]);
  });

  it('keeps every metric in its place, so city 1 and city 2 still pair up', () => {
    const c = readComparison(enhanced);
    expect(c!.city1.categories[0].metrics.map((m) => m.metricId)).toEqual(['pf_01', '']);
    expect(c!.city1.categories[0].averageConsensusScore).toBeUndefined();
  });

  it('reads a Standard comparison', () => {
    const c = readComparison({
      city1: { city: 'Austin', country: 'USA', totalScore: 61, categories: [{ categoryId: 'transportation', averageScore: 55, metrics: [{ metricId: 'tr_01', normalizedScore: 40, sources: ['https://c.example'] }] }] },
      city2: { city: 'Lisbon', country: 'Portugal', totalScore: 66, categories: [] },
      winner: 'city2',
    });
    expect(c?.enhanced).toBe(false);
    expect(cityTotal(c!.city1)).toBe(61);
    expect(metricScore(c!.city1.categories[0].metrics[0])).toBe(40);
    expect(c!.city1.categories[0].metrics[0].sources).toEqual([{ url: 'https://c.example' }]);
  });

  it('turns away what is not a comparison', () => {
    expect(readComparison(undefined)).toBeNull();
    expect(readComparison('x')).toBeNull();
    expect(readComparison({ city1: { city: 'Austin' } })).toBeNull();
    expect(readComparison({ city1: { city: 'Austin' }, city2: { country: 'Portugal' } })).toBeNull();
  });

  it('defaults an unknown winner to a tie and missing numbers to 0', () => {
    const c = readComparison({ city1: { city: 'A' }, city2: { city: 'B' }, winner: 'nobody' });
    expect(c?.winner).toBe('tie');
    expect(c?.scoreDifference).toBe(0);
    expect(cityTotal(c!.city1)).toBe(0);
  });
});

describe('readLifeScoreContext', () => {
  it('reads the context back', () => {
    const context = readLifeScoreContext({
      comparison: { city1: { name: 'Austin', country: 'USA', totalScore: 70, normalizedScore: 70 }, city2: { name: 'Lisbon' }, winner: 'Lisbon', comparisonId: 'LIFE-1' },
      categories: [{ id: 'personal_freedom', name: 'Personal Autonomy', city1Score: 80, city2Score: 75, winner: 'city1', topMetrics: [] }],
      topMetrics: [{ id: 'pf_01', name: 'Cannabis', city1Score: 80, city2Score: 40, diff: 40, category: 'Personal Autonomy' }],
      evidence: [{ metricId: 'pf_01', metricName: 'Cannabis', city: 'Austin', sources: [{ url: 'https://a.example' }, { title: 'no link' }] }],
      consensus: { llmsUsed: ['gpt'], judgeModel: 'opus', overallConfidence: 'high', topDisagreements: [{ metricName: 'Cannabis', standardDeviation: 12.5, explanation: 'split' }] },
    });
    expect(context?.comparison.comparisonId).toBe('LIFE-1');
    expect(context?.comparison.city2).toEqual({ name: 'Lisbon', country: '', totalScore: 0, normalizedScore: 0 });
    expect(context?.topMetrics[0].diff).toBe(40);
    expect(context?.evidence[0].sources.map((s) => s.url)).toEqual(['https://a.example']);
    expect(context?.consensus?.topDisagreements[0].standardDeviation).toBe(12.5);
  });

  it('turns away what is not a context', () => {
    expect(readLifeScoreContext(null)).toBeNull();
    expect(readLifeScoreContext({ categories: [] })).toBeNull();
  });
});

describe('the server routes read through the two readers', () => {
  it('each route uses its reader and has no "any"', () => {
    const routes: Array<[string, string]> = [
      ['api/olivia/context.ts', 'readComparison('],
      ['api/judge-report.ts', 'readComparison('],
      ['api/shared/fieldEvidence.ts', 'readComparison('],
      ['api/olivia/chat.ts', 'readLifeScoreContext('],
    ];
    for (const [file, reader] of routes) {
      const code = readFileSync(file, 'utf8');
      expect({ file, reader: code.includes(reader) }).toEqual({ file, reader: true });
      expect({ file, anys: (code.match(/:\s*any\b|as any\b|any\[\]/g) ?? []).length }).toEqual({ file, anys: 0 });
    }
  });

});
