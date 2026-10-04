/**
 * LIFE SCORE - scores read alike from Standard and Enhanced comparisons (anti-drift).
 *
 * John, 4 Oct 2026 ("Fix it"): after an Enhanced comparison the two films got 0
 * for every category, because they read averageScore and Enhanced results call
 * it averageConsensusScore. Holds the reader (src/shared/comparisonView.ts) and
 * that the Judge page hands the films its output, never a raw category list.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { categoryAverages, cityTotal, comparisonConfidence } from '../src/shared/comparisonView';
import type { CityScore, ComparisonResult } from '../src/types/metrics';
import type { CityConsensusScore, EnhancedComparisonResult } from '../src/types/enhancedComparison';

const standardCity = {
  city: 'Austin',
  country: 'USA',
  categories: [
    { categoryId: 'personal_freedom', metrics: [], averageScore: 72, weightedScore: 14, verifiedMetrics: 0, totalMetrics: 15, evaluatedMetrics: 15 },
    { categoryId: 'transportation', metrics: [], averageScore: null, weightedScore: 0, verifiedMetrics: 0, totalMetrics: 15, evaluatedMetrics: 0 },
  ],
  totalScore: 68,
  normalizedScore: 68,
  overallConfidence: 'high',
  comparisonDate: '2026-10-04',
  dataFreshness: 'current',
} as CityScore;

const enhancedCity = {
  city: 'Lisbon',
  country: 'Portugal',
  categories: [
    { categoryId: 'personal_freedom', metrics: [], averageConsensusScore: 81, agreementLevel: 90 },
    { categoryId: 'transportation', metrics: [], averageConsensusScore: null, agreementLevel: null },
  ],
  totalConsensusScore: 77,
  overallAgreement: 88,
} as CityConsensusScore;

describe('cityTotal', () => {
  it('reads both kinds', () => {
    expect(cityTotal(standardCity)).toBe(68);
    expect(cityTotal(enhancedCity)).toBe(77);
  });

  it('is 0 when the city or its total is missing', () => {
    expect(cityTotal(undefined)).toBe(0);
    expect(cityTotal(null)).toBe(0);
    expect(cityTotal({ ...standardCity, totalScore: Number.NaN })).toBe(0);
  });
});

describe('categoryAverages', () => {
  it('gives Enhanced categories their real average, not 0', () => {
    expect(categoryAverages(enhancedCity)).toEqual([
      { categoryId: 'personal_freedom', averageScore: 81 },
      { categoryId: 'transportation', averageScore: null },
    ]);
  });

  it('keeps Standard categories as they are', () => {
    expect(categoryAverages(standardCity)).toEqual([
      { categoryId: 'personal_freedom', averageScore: 72 },
      { categoryId: 'transportation', averageScore: null },
    ]);
  });

  it('is undefined with no city', () => {
    expect(categoryAverages(undefined)).toBeUndefined();
  });
});

describe('comparisonConfidence', () => {
  it('reads the city (Standard) or the consensus (Enhanced)', () => {
    expect(comparisonConfidence({ city1: standardCity, city2: standardCity } as ComparisonResult)).toBe('high');
    expect(comparisonConfidence({ city1: enhancedCity, city2: enhancedCity, overallConsensusConfidence: 'low' } as EnhancedComparisonResult)).toBe('low');
    expect(comparisonConfidence({ city1: enhancedCity, city2: enhancedCity } as EnhancedComparisonResult)).toBe('medium');
  });
});

describe('the screens read scores through comparisonView', () => {
  it('the Judge page hands the films category averages, never a raw category list', () => {
    const judge = readFileSync('src/components/JudgeTab.tsx', 'utf8');
    expect(judge.includes('categoryAverages(')).toBe(true);
    expect(/winnerCategories=\{\s*judgeReport/.test(judge)).toBe(false);
    expect(/\?\.categories\s*\n?\s*[:;]/.test(judge)).toBe(false);
  });

  it('no score reader casts to any', () => {
    for (const file of ['src/components/JudgeTab.tsx', 'src/components/Results.tsx', 'src/components/SavedComparisons.tsx', 'src/components/AskOlivia.tsx']) {
      const text = readFileSync(file, 'utf8');
      expect({ file, casts: (text.match(/as any/g) ?? []).length }).toEqual({ file, casts: 0 });
    }
  });
});
