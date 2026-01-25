/**
 * LIFE SCORE™ Scoring Engine
 * Calculates normalized scores from raw metric values
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
 * FIXED: Excludes missing metrics from calculation instead of defaulting to 50
 */
export function calculateCategoryScore(
  categoryId: CategoryId,
  metricScores: MetricScore[]
): CategoryScore {
  const categoryMetrics = getMetricsByCategory(categoryId);

  let totalWeightedScore = 0;
  let totalLegalScore = 0;
  let totalLivedScore = 0;
  let totalWeight = 0;
  let verifiedCount = 0;
  let evaluatedCount = 0;

  const metricsForCategory: MetricScore[] = [];

  for (const metricDef of categoryMetrics) {
    const metricScore = metricScores.find(ms => ms.metricId === metricDef.id);

    if (metricScore && !metricScore.isMissing && metricScore.normalizedScore !== null) {
      // Valid metric with data - include in calculation
      metricsForCategory.push(metricScore);
      totalWeightedScore += metricScore.normalizedScore * metricDef.weight;
      totalWeight += metricDef.weight;
      evaluatedCount++;

      // Track separate legal and lived averages
      if (metricScore.legalScore !== null && metricScore.legalScore !== undefined) {
        totalLegalScore += metricScore.legalScore * metricDef.weight;
      }
      if (metricScore.livedScore !== null && metricScore.livedScore !== undefined) {
        totalLivedScore += metricScore.livedScore * metricDef.weight;
      }

      if (metricScore.confidence !== 'unverified') {
        verifiedCount++;
      }
    } else {
      // FIXED: Mark as missing, do NOT default to 50
      // Missing metrics are excluded from weighted calculation
      metricsForCategory.push({
        metricId: metricDef.id,
        rawValue: null,
        normalizedScore: null,  // NULL not 50 - excluded from calc
        legalScore: null,
        livedScore: null,
        confidence: 'unverified',
        isMissing: true
      });
      // DO NOT add to totalWeightedScore or totalWeight
    }
  }

  // Calculate averages only from evaluated metrics (null if no data)
  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : null;
  const averageLegalScore = totalWeight > 0 ? totalLegalScore / totalWeight : null;
  const averageLivedScore = totalWeight > 0 ? totalLivedScore / totalWeight : null;

  // Get category weight for contribution to total
  const category = CATEGORIES.find(c => c.id === categoryId);
  const categoryWeight = category?.weight ?? 0;
  const weightedScore = averageScore !== null ? (averageScore * categoryWeight) / 100 : 0;

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
 * Calculate total city score from all metrics
 * FIXED: Tracks separate Legal/Lived scores and data completeness
 */
export function calculateCityScore(
  city: string,
  country: string,
  metricScores: MetricScore[],
  region?: string
): CityScore {
  const categories: CategoryScore[] = [];
  let totalScore = 0;
  let totalLegalScore = 0;
  let totalLivedScore = 0;
  let totalVerified = 0;
  let totalMetrics = 0;
  let totalEvaluated = 0;

  for (const category of CATEGORIES) {
    const categoryScore = calculateCategoryScore(category.id, metricScores);
    categories.push(categoryScore);
    totalScore += categoryScore.weightedScore;
    totalVerified += categoryScore.verifiedMetrics;
    totalMetrics += categoryScore.totalMetrics;
    totalEvaluated += categoryScore.evaluatedMetrics;

    // Track separate legal and lived totals
    const categoryDef = CATEGORIES.find(c => c.id === category.id);
    const catWeight = categoryDef?.weight ?? 0;
    if (categoryScore.averageLegalScore !== null && categoryScore.averageLegalScore !== undefined) {
      totalLegalScore += (categoryScore.averageLegalScore * catWeight) / 100;
    }
    if (categoryScore.averageLivedScore !== null && categoryScore.averageLivedScore !== undefined) {
      totalLivedScore += (categoryScore.averageLivedScore * catWeight) / 100;
    }
  }

  // Determine overall confidence based on evaluation rate
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

