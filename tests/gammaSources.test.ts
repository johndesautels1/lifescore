/**
 * LIFE SCORE - the Gamma report prints the real number of sources cited (anti-drift).
 *
 * John, 4 Oct 2026 ("The real count"): every multi-AI report said "Unique
 * Sources Cited: 500+" and "Sources: 500+ citations", a typed-in number.
 * uniqueSourceCount counts the distinct links every model cited, both cities.
 */

import { describe, expect, it } from 'vitest';
import { formatEnhancedReportForGamma, uniqueSourceCount } from '../src/services/gammaService';
import { CATEGORIES, getMetricsByCategory } from '../src/shared/metrics';
import type { CategoryConsensus, EnhancedComparisonResult, MetricConsensus } from '../src/types/enhancedComparison';

/** A city whose first metric carries the given model scores; the rest carry none. */
function city(name: string, firstMetricScores: unknown[]): EnhancedComparisonResult['city1'] {
  let first = true;
  const categories: CategoryConsensus[] = CATEGORIES.map(c => ({
    categoryId: c.id,
    metrics: getMetricsByCategory(c.id).map(m => {
      const llmScores = first ? firstMetricScores : [];
      first = false;
      return { metricId: m.id, llmScores, consensusScore: 60, legalScore: 60, enforcementScore: 60, confidenceLevel: 'strong', standardDeviation: 6, judgeExplanation: '' } as unknown as MetricConsensus;
    }),
    averageConsensusScore: 60,
    agreementLevel: 88,
  }));
  return { city: name, country: 'X', categories, totalConsensusScore: 60, overallAgreement: 88 };
}

function result(): EnhancedComparisonResult {
  return {
    city1: city('Alpha', [
      { evidence: [{ url: 'https://a.example/1' }, { url: 'https://a.example/2' }], sources: ['https://a.example/1', ' https://b.example/x '] },
      { evidence: [{ url: '' }], sources: [] },
    ]),
    city2: city('Beta', [{ evidence: [{ url: 'https://a.example/2' }, { url: 'https://c.example/y' }] }]),
    winner: 'city1',
    scoreDifference: 0,
    categoryWinners: {} as EnhancedComparisonResult['categoryWinners'],
    comparisonId: 'LIFE-ENH-alpha-beta',
    generatedAt: '2026-10-04T12:00:00.000Z',
    llmsUsed: ['claude-sonnet', 'gpt-4o'],
    judgeModel: 'claude-opus',
    overallConsensusConfidence: 'high',
    disagreementSummary: '',
    processingStats: { totalTimeMs: 1, llmTimings: {} as EnhancedComparisonResult['processingStats']['llmTimings'], metricsEvaluated: 100 },
  };
}

describe('sources cited', () => {
  it('counts each distinct link once, across models and both cities', () => {
    // a/1, a/2, b/x (trimmed), c/y; empty links are not counted
    expect(uniqueSourceCount(result())).toBe(4);
  });

  it('the report prints that count, never a fixed "500+"', () => {
    const prompt = formatEnhancedReportForGamma(result());
    expect(prompt.includes('| **Unique Sources Cited** | **4** |')).toBe(true);
    expect(prompt.includes('Sources: 4 distinct links cited')).toBe(true);
    expect(prompt.includes('500+')).toBe(false);
  });
});
