/**
 * LIFE SCORE™ Scoring Engine
 * Calculates normalized scores from raw metric values
 * 
 * John E. Desautels & Associates
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
import { CATEGORIES, METRICS_MAP, getMetricsByCategory } from '../data/metrics';

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
 * Calculate weighted average for a category
 */
export function calculateCategoryScore(
  categoryId: CategoryId,
  metricScores: MetricScore[]
): CategoryScore {
  const categoryMetrics = getMetricsByCategory(categoryId);
  
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let verifiedCount = 0;

  const metricsForCategory: MetricScore[] = [];

  for (const metricDef of categoryMetrics) {
    const metricScore = metricScores.find(ms => ms.metricId === metricDef.id);
    
    if (metricScore) {
      metricsForCategory.push(metricScore);
      totalWeightedScore += metricScore.normalizedScore * metricDef.weight;
      totalWeight += metricDef.weight;
      
      if (metricScore.confidence !== 'unverified') {
        verifiedCount++;
      }
    } else {
      // Create placeholder for missing metric
      metricsForCategory.push({
        metricId: metricDef.id,
        rawValue: null,
        normalizedScore: 0,
        confidence: 'unverified'
      });
    }
  }

  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  
  // Get category weight for contribution to total
  const category = CATEGORIES.find(c => c.id === categoryId);
  const categoryWeight = category?.weight ?? 0;
  const weightedScore = (averageScore * categoryWeight) / 100;

  return {
    categoryId,
    metrics: metricsForCategory,
    averageScore: Math.round(averageScore * 10) / 10,
    weightedScore: Math.round(weightedScore * 10) / 10,
    verifiedMetrics: verifiedCount,
    totalMetrics: categoryMetrics.length
  };
}

/**
 * Calculate total city score from all metrics
 */
export function calculateCityScore(
  city: string,
  country: string,
  metricScores: MetricScore[],
  region?: string
): CityScore {
  const categories: CategoryScore[] = [];
  let totalScore = 0;
  let totalVerified = 0;
  let totalMetrics = 0;

  for (const category of CATEGORIES) {
    const categoryScore = calculateCategoryScore(category.id, metricScores);
    categories.push(categoryScore);
    totalScore += categoryScore.weightedScore;
    totalVerified += categoryScore.verifiedMetrics;
    totalMetrics += categoryScore.totalMetrics;
  }

  // Determine overall confidence
  const verificationRate = totalVerified / totalMetrics;
  let overallConfidence: 'high' | 'medium' | 'low';
  if (verificationRate >= 0.8) {
    overallConfidence = 'high';
  } else if (verificationRate >= 0.5) {
    overallConfidence = 'medium';
  } else {
    overallConfidence = 'low';
  }

  // Calculate normalized score (percentage of theoretical max)
  // Max theoretical score is 100 (all categories at 100%)
  const normalizedScore = Math.round(totalScore);

  return {
    city,
    country,
    region,
    categories,
    totalScore: Math.round(totalScore), // 0-100 percentage score
    normalizedScore,
    overallConfidence,
    comparisonDate: new Date().toISOString(),
    dataFreshness: 'current'
  };
}

/**
 * Compare two cities and determine winner
 */
export function createComparison(
  city1Score: CityScore,
  city2Score: CityScore
): ComparisonResult {
  const scoreDifference = Math.abs(city1Score.totalScore - city2Score.totalScore);
  
  let winner: 'city1' | 'city2' | 'tie';
  if (scoreDifference < 1) {
    winner = 'tie';
  } else if (city1Score.totalScore > city2Score.totalScore) {
    winner = 'city1';
  } else {
    winner = 'city2';
  }

  // Determine category winners
  const categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'> = {} as Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  
  for (const category of CATEGORIES) {
    const cat1 = city1Score.categories.find(c => c.categoryId === category.id);
    const cat2 = city2Score.categories.find(c => c.categoryId === category.id);
    
    const score1 = cat1?.averageScore ?? 0;
    const score2 = cat2?.averageScore ?? 0;
    
    if (Math.abs(score1 - score2) < 2) {
      categoryWinners[category.id] = 'tie';
    } else if (score1 > score2) {
      categoryWinners[category.id] = 'city1';
    } else {
      categoryWinners[category.id] = 'city2';
    }
  }

  return {
    city1: city1Score,
    city2: city2Score,
    winner,
    scoreDifference: Math.round(scoreDifference),
    categoryWinners,
    comparisonId: generateComparisonId(),
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
    return {
      metricId,
      rawValue: null,
      normalizedScore: 0,
      confidence: 'unverified',
      notes: 'Unknown metric'
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
    notes: apiResponse.explanation
  };
}

