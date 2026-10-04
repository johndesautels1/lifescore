/**
 * LIFE SCORE - read a city's scores the same way from either kind of comparison.
 *
 * A Standard comparison stores a city's total as totalScore and each category's
 * average as averageScore; an Enhanced (multi-AI) comparison stores them as
 * totalConsensusScore and averageConsensusScore. The results screen, the saved
 * list, the Judge page and the two films read them through here.
 *
 * John, 4 Oct 2026 ("Fix it"): the films read averageScore only, so after an
 * Enhanced comparison every category reached them as 0. categoryAverages()
 * hands them one name for both kinds.
 */

import type { CategoryScore, CityScore, ComparisonResult } from '../types/metrics';
import type { CategoryConsensus, CityConsensusScore, EnhancedComparisonResult } from '../types/enhancedComparison';
import { isScore } from './lawLived';

/** A city from either kind of comparison. */
export type ComparedCity = CityScore | CityConsensusScore;

/** Either kind of comparison. */
export type AnyComparison = ComparisonResult | EnhancedComparisonResult;

/** One category's average under one name for both kinds (the films' input shape). */
export interface CategoryAverage {
  categoryId: string;
  averageScore: number | null;
}

/** The city's total score (0-100); 0 when the city or its total is missing. */
export function cityTotal(city: ComparedCity | null | undefined): number {
  if (!city) return 0;
  const total = 'totalConsensusScore' in city ? city.totalConsensusScore : city.totalScore;
  return isScore(total) ? total : 0;
}

/** The city's category averages; undefined when there is no city or no category list. */
export function categoryAverages(city: ComparedCity | null | undefined): CategoryAverage[] | undefined {
  if (!city || !Array.isArray(city.categories)) return undefined;
  const categories: ReadonlyArray<CategoryScore | CategoryConsensus> = city.categories;
  return categories.map((category) => {
    const average = 'averageConsensusScore' in category ? category.averageConsensusScore : category.averageScore;
    return { categoryId: category.categoryId, averageScore: isScore(average) ? average : null };
  });
}

/** How sure the comparison is: the city's confidence (Standard) or the models' consensus (Enhanced). */
export function comparisonConfidence(result: AnyComparison): 'high' | 'medium' | 'low' {
  const fromCity = 'overallConfidence' in result.city1 ? result.city1.overallConfidence : undefined;
  const fromConsensus = 'overallConsensusConfidence' in result ? result.overallConsensusConfidence : undefined;
  return fromCity || fromConsensus || 'medium';
}
