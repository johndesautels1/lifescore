/**
 * LIFE SCORE - the Enhanced Gamma report names only the models that took part.
 *
 * John, 4 Oct 2026 ("Only those used"): fault GR2 in
 * docs/MASTER_BUG_AUDIT_20260220.md. The prompt listed all five evaluators —
 * and "6 models", "1,200+ data points" — whatever the comparison used. Builds
 * the real prompt for a comparison two models scored.
 */

import { describe, expect, it } from 'vitest';
import { formatEnhancedReportForGamma } from '../src/services/gammaService';
import { modelForSeat } from '../api/shared/models';
import { CATEGORIES, getMetricsByCategory } from '../src/shared/metrics';
import type { CategoryConsensus, EnhancedComparisonResult, LLMProvider, MetricConsensus } from '../src/types/enhancedComparison';

function city(name: string, score: number): EnhancedComparisonResult['city1'] {
  const categories: CategoryConsensus[] = CATEGORIES.map(c => ({
    categoryId: c.id,
    metrics: getMetricsByCategory(c.id).map(m => ({
      metricId: m.id,
      llmScores: [],
      consensusScore: score,
      legalScore: score,
      enforcementScore: score,
      confidenceLevel: 'strong',
      standardDeviation: 6,
      judgeExplanation: '',
    }) as unknown as MetricConsensus),
    averageConsensusScore: score,
    agreementLevel: 88,
  }));
  return { city: name, country: 'X', categories, totalConsensusScore: score, overallAgreement: 88 };
}

function result(llmsUsed: LLMProvider[]): EnhancedComparisonResult {
  return {
    city1: city('Alpha', 70),
    city2: city('Beta', 60),
    winner: 'city1',
    scoreDifference: 10,
    categoryWinners: Object.fromEntries(CATEGORIES.map(c => [c.id, 'city1'])) as EnhancedComparisonResult['categoryWinners'],
    comparisonId: 'LIFE-ENH-alpha-beta',
    generatedAt: '2026-10-04T12:00:00.000Z',
    llmsUsed,
    judgeModel: 'claude-opus',
    overallConsensusConfidence: 'high',
    disagreementSummary: '',
    processingStats: { totalTimeMs: 1, llmTimings: {} as EnhancedComparisonResult['processingStats']['llmTimings'], metricsEvaluated: 100 },
  };
}

describe('the Enhanced report names the models that took part', () => {
  const prompt = formatEnhancedReportForGamma(result(['claude-sonnet', 'gpt-4o']));

  it('lists the two evaluators and none of the others', () => {
    expect(prompt.includes('2 AI models Used for Evaluation (only these took part)')).toBe(true);
    expect(prompt.includes(modelForSeat('claude-sonnet').name)).toBe(true);
    expect(prompt.includes(modelForSeat('gpt-4o').name)).toBe(true);
    for (const seat of ['gemini-3-pro', 'grok-4', 'perplexity'] as const) {
      expect(prompt.includes(modelForSeat(seat).name)).toBe(false);
    }
  });

  it('claims no fixed five or six models, and counts the scores it really has', () => {
    expect(/5 LLMs|all 5 |6 models|1,200/.test(prompt)).toBe(false);
    expect(prompt.includes('800 individual scores')).toBe(true); // 2 halves × 100 metrics × 2 cities × 2 models
  });

  it('with all five, names all five', () => {
    const all = formatEnhancedReportForGamma(result(['claude-sonnet', 'gpt-4o', 'gemini-3-pro', 'grok-4', 'perplexity']));
    expect(all.includes('5 AI models Used for Evaluation')).toBe(true);
    expect(all.includes(modelForSeat('perplexity').name)).toBe(true);
  });
});
