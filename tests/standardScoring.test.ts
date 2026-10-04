/**
 * LIFE SCORE - Standard mode's arithmetic, run for real (src/api/scoring.ts).
 *
 * SC5 (John, 4 Oct 2026, "Same as Enhanced"): a category with no score is left
 * out, the others share its weight, and it earns no bonus for either city.
 * SC7: the comparison hook uses this one copy, so these tests check the code
 * the app runs.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { calculateCategoryScore, calculateCityScore, createComparison } from '../src/api/scoring';
import { CATEGORIES, getMetricsByCategory } from '../src/shared/metrics';
import type { CategoryId, MetricScore } from '../src/types/metrics';

/** Every metric of the given categories scored `score` (law and lived the same). */
function scores(score: number, categories: readonly CategoryId[] = CATEGORIES.map(c => c.id)): MetricScore[] {
  return categories.flatMap(id =>
    getMetricsByCategory(id).map(m => ({
      metricId: m.id,
      rawValue: score,
      normalizedScore: score,
      legalScore: score,
      livedScore: score,
      confidence: 'high' as const,
      isMissing: false,
    }))
  );
}

const allBut = (missing: CategoryId) => CATEGORIES.map(c => c.id).filter(id => id !== missing);

describe('calculateCategoryScore', () => {
  it('averages the metrics that have a score, by metric weight', () => {
    const cat = calculateCategoryScore('personal_freedom', scores(70, ['personal_freedom']));
    expect(cat.averageScore).toBe(70);
    expect(cat.evaluatedMetrics).toBe(cat.totalMetrics);
  });

  it('leaves out a metric with no score, and a half with no score from that half\'s average', () => {
    const list = scores(70, ['personal_freedom']);
    list[0] = { ...list[0], normalizedScore: null, isMissing: true };
    list[1] = { ...list[1], livedScore: null };
    const cat = calculateCategoryScore('personal_freedom', list);
    expect(cat.averageScore).toBe(70);
    expect(cat.averageLegalScore).toBe(70);
    expect(cat.averageLivedScore).toBe(70);
    expect(cat.evaluatedMetrics).toBe(cat.totalMetrics - 1);
  });

  it('has no score when no metric has one', () => {
    expect(calculateCategoryScore('transportation', []).averageScore).toBe(null);
  });
});

describe('calculateCityScore', () => {
  it('with every category scored, is each category\'s share by its default weight', () => {
    expect(calculateCityScore('A', 'X', scores(60)).totalScore).toBe(60);
  });

  it('leaves out a category with no score instead of counting it as 0', () => {
    const city = calculateCityScore('A', 'X', scores(60, allBut('speech_lifestyle')));
    expect(city.totalScore).toBe(60);
    expect(city.totalLegalScore).toBe(60);
    expect(city.totalLivedScore).toBe(60);
  });

  it('uses the user\'s weights', () => {
    const list = [...scores(100, ['personal_freedom']), ...scores(0, allBut('personal_freedom'))];
    const weights = { personal_freedom: 50, housing_property: 10, business_work: 10, transportation: 10, policing_legal: 10, speech_lifestyle: 10 };
    expect(calculateCityScore('A', 'X', list, undefined, weights).totalScore).toBe(50);
  });
});

describe('createComparison', () => {
  it('gives no win or spread bonus for a category one city lacks', () => {
    const a = calculateCityScore('A', 'X', scores(60));
    const b = calculateCityScore('B', 'Y', scores(60, allBut('personal_freedom')));
    const result = createComparison(a, b, 'LIFE-STD-test');
    expect(result.city1.totalScore).toBe(60);
    expect(result.city2.totalScore).toBe(60);
    expect(result.winner).toBe('tie');
    expect(result.categoryWinners.personal_freedom).toBe('tie');
  });

  it('adds 2 per category won by more than 5 and half the largest gap to the leader', () => {
    const a = calculateCityScore('A', 'X', [...scores(80, ['personal_freedom']), ...scores(50, allBut('personal_freedom'))]);
    const b = calculateCityScore('B', 'Y', scores(50));
    // A: 80×20% + 50×80% = 56; one win (+2); gap 30 → +15  → 73.   B: 50.
    const result = createComparison(a, b, 'LIFE-STD-test');
    expect(result.city1.totalScore).toBe(73);
    expect(result.city2.totalScore).toBe(50);
    expect(result.winner).toBe('city1');
    expect(result.scoreDifference).toBe(23);
    expect(result.comparisonId).toBe('LIFE-STD-test');
  });
});

describe('the comparison hook keeps no copy of its own (SC7)', () => {
  const hook = readFileSync('src/hooks/useComparison.ts', 'utf8');

  it('imports the arithmetic from src/api/scoring.ts', () => {
    expect(hook.includes("import { calculateCityScore, createComparison } from '../api/scoring';")).toBe(true);
  });

  it('defines none of it', () => {
    expect(/function calculate(Category|City)Score\(/.test(hook)).toBe(false);
    expect(/CATEGORY_WIN_BONUS|MAX_SPREAD_MULTIPLIER/.test(hook)).toBe(false);
  });
});
