/**
 * LIFE SCORE - Scoring Engine Unit Tests
 * Tests score normalization and comparison logic
 */
import { describe, it, expect } from 'vitest';
import { normalizeScore, createComparison } from '../src/api/scoring';
import type { MetricDefinition, CityScore } from '../src/types/metrics';

// ============================================================================
// Helper: create a minimal MetricDefinition for testing
// ============================================================================

function makeMetric(overrides: Partial<MetricDefinition> & { scoringCriteria: MetricDefinition['scoringCriteria'] }): MetricDefinition {
  return {
    id: 'test_metric',
    categoryId: 'personal_freedom',
    name: 'Test Metric',
    shortName: 'Test',
    description: 'A test metric',
    weight: 5,
    scoringDirection: 'higher_is_better',
    dataType: 'boolean',
    searchQueries: [],
    ...overrides,
  };
}

// ============================================================================
// normalizeScore - Boolean metrics
// ============================================================================

describe('normalizeScore - boolean', () => {
  const metric = makeMetric({
    scoringDirection: 'higher_is_better',
    scoringCriteria: { type: 'boolean' },
  });

  it('returns 100 for true (higher_is_better)', () => {
    expect(normalizeScore(metric, true)).toBe(100);
  });

  it('returns 0 for false (higher_is_better)', () => {
    expect(normalizeScore(metric, false)).toBe(0);
  });

  it('parses string "true" as true', () => {
    expect(normalizeScore(metric, 'true')).toBe(100);
  });

  it('parses string "yes" as true', () => {
    expect(normalizeScore(metric, 'yes')).toBe(100);
  });

  it('returns 0 for null', () => {
    expect(normalizeScore(metric, null)).toBe(0);
  });

  it('inverts for lower_is_better', () => {
    const lowerMetric = makeMetric({
      scoringDirection: 'lower_is_better',
      scoringCriteria: { type: 'boolean' },
    });
    expect(normalizeScore(lowerMetric, true)).toBe(0);   // 100 inverted
    expect(normalizeScore(lowerMetric, false)).toBe(100); // 0 inverted
  });
});

// ============================================================================
// normalizeScore - Range metrics
// ============================================================================

describe('normalizeScore - range', () => {
  const metric = makeMetric({
    scoringDirection: 'higher_is_better',
    dataType: 'numeric',
    scoringCriteria: { type: 'range', minValue: 0, maxValue: 100 },
  });

  it('normalizes mid-range value', () => {
    expect(normalizeScore(metric, 50)).toBe(50);
  });

  it('normalizes min value to 0', () => {
    expect(normalizeScore(metric, 0)).toBe(0);
  });

  it('normalizes max value to 100', () => {
    expect(normalizeScore(metric, 100)).toBe(100);
  });

  it('clamps values below min', () => {
    expect(normalizeScore(metric, -50)).toBe(0);
  });

  it('clamps values above max', () => {
    expect(normalizeScore(metric, 200)).toBe(100);
  });

  it('handles string numbers', () => {
    expect(normalizeScore(metric, '75')).toBe(75);
  });

  it('returns 0 for NaN', () => {
    expect(normalizeScore(metric, 'not-a-number')).toBe(0);
  });

  it('handles custom min/max range', () => {
    const customRange = makeMetric({
      scoringDirection: 'higher_is_better',
      dataType: 'numeric',
      scoringCriteria: { type: 'range', minValue: 10, maxValue: 50 },
    });
    // 30 is halfway between 10 and 50
    expect(normalizeScore(customRange, 30)).toBe(50);
  });

  it('inverts for lower_is_better', () => {
    const lowerMetric = makeMetric({
      scoringDirection: 'lower_is_better',
      dataType: 'numeric',
      scoringCriteria: { type: 'range', minValue: 0, maxValue: 100 },
    });
    expect(normalizeScore(lowerMetric, 80)).toBe(20); // 100 - 80
  });
});

// ============================================================================
// normalizeScore - Scale metrics
// ============================================================================

describe('normalizeScore - scale', () => {
  const metric = makeMetric({
    scoringDirection: 'higher_is_better',
    dataType: 'scale',
    scoringCriteria: {
      type: 'scale',
      levels: [
        { level: 1, label: 'Very Low', score: 10 },
        { level: 2, label: 'Low', score: 30 },
        { level: 3, label: 'Medium', score: 50 },
        { level: 4, label: 'High', score: 75 },
        { level: 5, label: 'Very High', score: 100 },
      ],
    },
  });

  it('maps level to correct score', () => {
    expect(normalizeScore(metric, 1)).toBe(10);
    expect(normalizeScore(metric, 3)).toBe(50);
    expect(normalizeScore(metric, 5)).toBe(100);
  });

  it('returns 0 for unmatched level', () => {
    expect(normalizeScore(metric, 99)).toBe(0);
  });

  it('handles string level values', () => {
    expect(normalizeScore(metric, '4')).toBe(75);
  });
});

// ============================================================================
// normalizeScore - Categorical metrics
// ============================================================================

describe('normalizeScore - categorical', () => {
  const metric = makeMetric({
    scoringDirection: 'higher_is_better',
    dataType: 'categorical',
    scoringCriteria: {
      type: 'categorical',
      options: [
        { value: 'fully_legal', label: 'Fully Legal', score: 100 },
        { value: 'decriminalized', label: 'Decriminalized', score: 70 },
        { value: 'medical_only', label: 'Medical Only', score: 40 },
        { value: 'illegal', label: 'Illegal', score: 0 },
      ],
    },
  });

  it('maps category value to score', () => {
    expect(normalizeScore(metric, 'fully_legal')).toBe(100);
    expect(normalizeScore(metric, 'decriminalized')).toBe(70);
    expect(normalizeScore(metric, 'illegal')).toBe(0);
  });

  it('handles case-insensitive matching', () => {
    expect(normalizeScore(metric, 'FULLY_LEGAL')).toBe(100);
    expect(normalizeScore(metric, 'Decriminalized')).toBe(70);
  });

  it('returns 0 for unmatched category', () => {
    expect(normalizeScore(metric, 'unknown_status')).toBe(0);
  });
});

// ============================================================================
// createComparison
// ============================================================================

describe('createComparison', () => {
  function makeCityScore(city: string, totalScore: number, categoryScores?: number[]): CityScore {
    return {
      city,
      country: 'Test',
      categories: [
        { categoryId: 'personal_freedom', metrics: [], averageScore: categoryScores?.[0] ?? 50, averageLegalScore: null, averageLivedScore: null, weightedScore: 10, verifiedMetrics: 0, totalMetrics: 15, evaluatedMetrics: 15 },
        { categoryId: 'housing_property', metrics: [], averageScore: categoryScores?.[1] ?? 50, averageLegalScore: null, averageLivedScore: null, weightedScore: 10, verifiedMetrics: 0, totalMetrics: 20, evaluatedMetrics: 20 },
        { categoryId: 'business_work', metrics: [], averageScore: categoryScores?.[2] ?? 50, averageLegalScore: null, averageLivedScore: null, weightedScore: 10, verifiedMetrics: 0, totalMetrics: 25, evaluatedMetrics: 25 },
        { categoryId: 'transportation', metrics: [], averageScore: categoryScores?.[3] ?? 50, averageLegalScore: null, averageLivedScore: null, weightedScore: 7.5, verifiedMetrics: 0, totalMetrics: 15, evaluatedMetrics: 15 },
        { categoryId: 'policing_legal', metrics: [], averageScore: categoryScores?.[4] ?? 50, averageLegalScore: null, averageLivedScore: null, weightedScore: 7.5, verifiedMetrics: 0, totalMetrics: 15, evaluatedMetrics: 15 },
        { categoryId: 'speech_lifestyle', metrics: [], averageScore: categoryScores?.[5] ?? 50, averageLegalScore: null, averageLivedScore: null, weightedScore: 5, verifiedMetrics: 0, totalMetrics: 10, evaluatedMetrics: 10 },
      ],
      totalScore,
      totalLegalScore: 0,
      totalLivedScore: 0,
      normalizedScore: totalScore,
      overallConfidence: 'high',
      comparisonDate: new Date().toISOString(),
      dataFreshness: 'current',
      dataCompleteness: { evaluatedMetrics: 100, totalMetrics: 100, percentage: 100 },
    };
  }

  it('declares city1 winner when score is higher', () => {
    const result = createComparison(
      makeCityScore('Austin', 75),
      makeCityScore('Berlin', 60),
    );
    expect(result.winner).toBe('city1');
    expect(result.scoreDifference).toBe(15);
  });

  it('declares city2 winner when score is higher', () => {
    const result = createComparison(
      makeCityScore('Austin', 55),
      makeCityScore('Berlin', 70),
    );
    expect(result.winner).toBe('city2');
    expect(result.scoreDifference).toBe(15);
  });

  it('declares tie when difference < 1', () => {
    const result = createComparison(
      makeCityScore('Austin', 65),
      makeCityScore('Berlin', 65),
    );
    expect(result.winner).toBe('tie');
    expect(result.scoreDifference).toBe(0);
  });

  it('generates a comparison ID', () => {
    const result = createComparison(
      makeCityScore('Austin', 75),
      makeCityScore('Berlin', 60),
    );
    expect(result.comparisonId).toMatch(/^LIFE-/);
  });

  it('determines category winners', () => {
    const result = createComparison(
      makeCityScore('Austin', 75, [80, 60, 50, 50, 50, 50]),
      makeCityScore('Berlin', 60, [40, 90, 50, 50, 50, 50]),
    );
    expect(result.categoryWinners.personal_freedom).toBe('city1');
    expect(result.categoryWinners.housing_property).toBe('city2');
    // categories with same score within 2 points = tie
    expect(result.categoryWinners.business_work).toBe('tie');
  });
});
