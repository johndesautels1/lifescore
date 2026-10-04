/**
 * LIFE SCORE™ Scoring Engine — Standard mode's arithmetic.
 *
 * The one copy: src/hooks/useComparison.ts calls these, and
 * tests/scoring.test.ts checks them. (Until 4 Oct 2026 the hook kept its own
 * copy and this file was used only by the tests — fault SC7.)
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type {
  MetricDefinition,
  MetricScore,
  CategoryScore,
  CityScore,
  CategoryId,
  ComparisonResult
} from '../types/metrics';
import { CATEGORIES, METRICS_MAP, getMetricsByCategory } from '../shared/metrics';
import { isScore } from '../shared/lawLived';

/** User-chosen category weights (percent by category id), or null for the defaults. */
export type CategoryWeights = Record<string, number> | null | undefined;

/** A category's weight: the user's, else the default. */
function categoryWeight(categoryId: string, customWeights: CategoryWeights): number {
  return customWeights?.[categoryId] ?? CATEGORIES.find(c => c.id === categoryId)?.weight ?? 0;
}

// ============================================================================
// SCORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Normalize a raw value to a 0-100 score based on metric definition
 */
export function normalizeScore(
  metric: MetricDefinition,
  rawValue: string | number | boolean | null
): number {
  if (rawValue === null || rawValue === undefined) {
    return 0;
  }

  const { scoringCriteria, scoringDirection } = metric;
  let score = 0;

  switch (scoringCriteria.type) {
    case 'boolean': {
      const boolValue = typeof rawValue === 'boolean'
        ? rawValue
        : rawValue === 'true' || rawValue === 'yes' || rawValue === '1';
      // For boolean, true = 100 if higher_is_better, 0 if lower_is_better
      score = boolValue ? 100 : 0;
      break;
    }

    case 'range': {
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
      if (isNaN(numValue)) {
        score = 0;
        break;
      }

      const min = scoringCriteria.minValue ?? 0;
      const max = scoringCriteria.maxValue ?? 100;

      // Clamp value to range
      const clampedValue = Math.max(min, Math.min(max, numValue));

      // Normalize to 0-100
      score = ((clampedValue - min) / (max - min)) * 100;
      break;
    }

    case 'scale': {
      const levels = scoringCriteria.levels ?? [];
      const levelValue = typeof rawValue === 'number' ? rawValue : parseInt(String(rawValue), 10);

      const matchedLevel = levels.find(l => l.level === levelValue);
      score = matchedLevel?.score ?? 0;
      break;
    }

    case 'categorical': {
      const options = scoringCriteria.options ?? [];
      const strValue = String(rawValue).toLowerCase().replace(/\s+/g, '_');

      const matchedOption = options.find(o =>
        o.value.toLowerCase() === strValue ||
        o.label.toLowerCase().replace(/\s+/g, '_') === strValue
      );
      score = matchedOption?.score ?? 0;
      break;
    }
  }

  // Apply scoring direction
  if (scoringDirection === 'lower_is_better') {
    score = 100 - score;
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * A category's score: the weighted average (by metric weight) of the metrics
 * that have a score; a metric with none is left out, never counted as 0 or 50.
 * The law and lived averages are each over the metrics that have that half.
 * `weightedScore` is the category's share of the city total: average × weight / 100.
 */
export function calculateCategoryScore(
  categoryId: CategoryId,
  metricScores: MetricScore[],
  customWeights?: CategoryWeights
): CategoryScore {
  const categoryMetrics = getMetricsByCategory(categoryId);

  let totalWeightedScore = 0;
  let totalLegalScore = 0;
  let totalLivedScore = 0;
  let totalWeight = 0;
  let totalLegalWeight = 0;
  let totalLivedWeight = 0;
  let verifiedCount = 0;
  let evaluatedCount = 0;

  const metricsForCategory: MetricScore[] = [];

  for (const metricDef of categoryMetrics) {
    const metricScore = metricScores.find(ms => ms.metricId === metricDef.id);

    if (metricScore && !metricScore.isMissing && metricScore.normalizedScore !== null) {
      metricsForCategory.push(metricScore);
      totalWeightedScore += metricScore.normalizedScore * metricDef.weight;
      totalWeight += metricDef.weight;
      evaluatedCount++;

      if (isScore(metricScore.legalScore)) {
        totalLegalScore += metricScore.legalScore * metricDef.weight;
        totalLegalWeight += metricDef.weight;
      }
      if (isScore(metricScore.livedScore)) {
        totalLivedScore += metricScore.livedScore * metricDef.weight;
        totalLivedWeight += metricDef.weight;
      }

      if (metricScore.confidence !== 'unverified') {
        verifiedCount++;
      }
    } else {
      // Missing: shown as missing, left out of every average
      metricsForCategory.push({
        metricId: metricDef.id,
        rawValue: null,
        normalizedScore: null,
        legalScore: null,
        livedScore: null,
        confidence: 'unverified',
        isMissing: true
      });
    }
  }

  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : null;
  const averageLegalScore = totalLegalWeight > 0 ? totalLegalScore / totalLegalWeight : null;
  const averageLivedScore = totalLivedWeight > 0 ? totalLivedScore / totalLivedWeight : null;

  const weightedScore = averageScore !== null ? (averageScore * categoryWeight(categoryId, customWeights)) / 100 : 0;

  return {
    categoryId,
    metrics: metricsForCategory,
    averageScore: averageScore !== null ? Math.round(averageScore * 10) / 10 : null,
    averageLegalScore: averageLegalScore !== null ? Math.round(averageLegalScore * 10) / 10 : null,
    averageLivedScore: averageLivedScore !== null ? Math.round(averageLivedScore * 10) / 10 : null,
    weightedScore: Math.round(weightedScore * 10) / 10,
    verifiedMetrics: verifiedCount,
    totalMetrics: categoryMetrics.length,
    evaluatedMetrics: evaluatedCount
  };
}

/**
 * A city's scores: the weighted average (by category weight, the user's or the
 * default) of the categories that have a score. A category with none is left
 * out and the others share its weight (John, 4 Oct 2026); with all six scored
 * the weights add up to 100. The law and lived totals are averaged the same way.
 */
export function calculateCityScore(
  city: string,
  country: string,
  metricScores: MetricScore[],
  region?: string,
  customWeights?: CategoryWeights
): CityScore {
  const categories: CategoryScore[] = [];
  let totalScore = 0;
  let scoredWeight = 0;
  let totalLegalScore = 0;
  let legalWeight = 0;
  let totalLivedScore = 0;
  let livedWeight = 0;
  let totalMetrics = 0;
  let totalEvaluated = 0;

  for (const category of CATEGORIES) {
    const categoryScore = calculateCategoryScore(category.id, metricScores, customWeights);
    categories.push(categoryScore);
    totalMetrics += categoryScore.totalMetrics;
    totalEvaluated += categoryScore.evaluatedMetrics;

    const weight = categoryWeight(category.id, customWeights);
    if (categoryScore.averageScore !== null) {
      totalScore += categoryScore.weightedScore; // averageScore × weight / 100
      scoredWeight += weight;
    }
    if (isScore(categoryScore.averageLegalScore)) {
      totalLegalScore += categoryScore.averageLegalScore * weight;
      legalWeight += weight;
    }
    if (isScore(categoryScore.averageLivedScore)) {
      totalLivedScore += categoryScore.averageLivedScore * weight;
      livedWeight += weight;
    }
  }
  totalScore = scoredWeight > 0 ? (totalScore * 100) / scoredWeight : 0;
  totalLegalScore = legalWeight > 0 ? totalLegalScore / legalWeight : 0;
  totalLivedScore = livedWeight > 0 ? totalLivedScore / livedWeight : 0;

  // Overall confidence from how many metrics returned a score
  const evaluationRate = totalMetrics > 0 ? totalEvaluated / totalMetrics : 0;
  let overallConfidence: 'high' | 'medium' | 'low';
  if (evaluationRate >= 0.8) {
    overallConfidence = 'high';
  } else if (evaluationRate >= 0.5) {
    overallConfidence = 'medium';
  } else {
    overallConfidence = 'low';
  }

  return {
    city,
    country,
    region,
    categories,
    totalScore: Math.round(totalScore),
    totalLegalScore: Math.round(totalLegalScore),
    totalLivedScore: Math.round(totalLivedScore),
    normalizedScore: Math.round(totalScore),
    overallConfidence,
    comparisonDate: new Date().toISOString(),
    dataFreshness: 'current',
    dataCompleteness: {
      evaluatedMetrics: totalEvaluated,
      totalMetrics: totalMetrics,
      percentage: totalMetrics > 0 ? Math.round((totalEvaluated / totalMetrics) * 100) : 0
    }
  };
}

/** Points per category a city leads by more than 5. */
export const CATEGORY_WIN_BONUS = 2;
/** The share of the largest category gap given to the city ahead. */
export const MAX_SPREAD_MULTIPLIER = 0.5;

/**
 * Compare two cities: the differentiation bonuses (so close cities do not blur
 * together), the winner and the category winners. Over the categories both
 * cities have a score for, each city gets CATEGORY_WIN_BONUS per category it
 * leads by more than 5 points, and the city ahead after that gets
 * MAX_SPREAD_MULTIPLIER × the largest gap; totals are capped at 100 and
 * rounded. The cities tie within 1 point; a category ties within 2 points or
 * when either city has no score for it. The two scores' totalScore are updated.
 */
export function createComparison(
  city1Score: CityScore,
  city2Score: CityScore,
  comparisonId: string = generateComparisonId()
): ComparisonResult {
  let city1CategoryWins = 0;
  let city2CategoryWins = 0;
  let maxCategorySpread = 0;

  for (const category of CATEGORIES) {
    const score1 = city1Score.categories.find(c => c.categoryId === category.id)?.averageScore ?? null;
    const score2 = city2Score.categories.find(c => c.categoryId === category.id)?.averageScore ?? null;
    if (score1 === null || score2 === null) continue; // no win and no spread for a category either lacks

    const diff = score1 - score2;
    maxCategorySpread = Math.max(maxCategorySpread, Math.abs(diff));
    if (diff > 5) city1CategoryWins++;
    else if (diff < -5) city2CategoryWins++;
  }

  const city1WinBonus = city1CategoryWins * CATEGORY_WIN_BONUS;
  const city2WinBonus = city2CategoryWins * CATEGORY_WIN_BONUS;
  const city1WithWinBonus = city1Score.totalScore + city1WinBonus;
  const city2WithWinBonus = city2Score.totalScore + city2WinBonus;
  const city1SpreadBonus = city1WithWinBonus > city2WithWinBonus ? maxCategorySpread * MAX_SPREAD_MULTIPLIER : 0;
  const city2SpreadBonus = city2WithWinBonus > city1WithWinBonus ? maxCategorySpread * MAX_SPREAD_MULTIPLIER : 0;

  city1Score.totalScore = Math.round(Math.min(100, city1WithWinBonus + city1SpreadBonus));
  city2Score.totalScore = Math.round(Math.min(100, city2WithWinBonus + city2SpreadBonus));

  const scoreDifference = Math.abs(city1Score.totalScore - city2Score.totalScore);
  let winner: 'city1' | 'city2' | 'tie';
  if (scoreDifference < 1) {
    winner = 'tie';
  } else if (city1Score.totalScore > city2Score.totalScore) {
    winner = 'city1';
  } else {
    winner = 'city2';
  }

  const categoryWinners = {} as Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  for (const category of CATEGORIES) {
    const score1 = city1Score.categories.find(c => c.categoryId === category.id)?.averageScore ?? null;
    const score2 = city2Score.categories.find(c => c.categoryId === category.id)?.averageScore ?? null;
    if (score1 === null || score2 === null || Math.abs(score1 - score2) < 2) {
      categoryWinners[category.id] = 'tie';
    } else {
      categoryWinners[category.id] = score1 > score2 ? 'city1' : 'city2';
    }
  }

  return {
    city1: city1Score,
    city2: city2Score,
    winner,
    scoreDifference: Math.round(scoreDifference),
    categoryWinners,
    comparisonId,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate unique comparison ID
 */
function generateComparisonId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `LIFE-${timestamp}-${random}`.toUpperCase();
}

/**
 * Parse API response into metric scores
 * FIXED: Returns null for unknown/invalid metrics instead of defaulting to 50
 */
export function parseAPIResponse(
  metricId: string,
  apiResponse: {
    value?: string | number | boolean | null;
    confidence?: string;
    source?: string;
    explanation?: string;
  }
): MetricScore {
  const metric = METRICS_MAP[metricId];

  if (!metric) {
    // FIXED: Return null score for unknown metrics - exclude from calculations
    console.warn(`Unknown metric ID: ${metricId}`);
    return {
      metricId,
      rawValue: null,
      normalizedScore: null,  // NULL not 50 - will be excluded
      legalScore: null,
      livedScore: null,
      confidence: 'unverified',
      notes: 'Unknown metric',
      isMissing: true
    };
  }

  const rawValue = apiResponse.value ?? null;
  const normalizedScore = normalizeScore(metric, rawValue);

  let confidence: 'high' | 'medium' | 'low' | 'unverified' = 'unverified';
  if (apiResponse.confidence) {
    const conf = apiResponse.confidence.toLowerCase();
    if (conf === 'high') confidence = 'high';
    else if (conf === 'medium') confidence = 'medium';
    else if (conf === 'low') confidence = 'low';
  }

  return {
    metricId,
    rawValue,
    normalizedScore,
    confidence,
    source: apiResponse.source,
    notes: apiResponse.explanation,
    isMissing: false
  };
}
