/**
 * LIFE SCORE™ Opus Judge Client Helpers
 * Types and utility functions for processing judge output
 *
 * REFACTORED: 2026-01-20
 * - Removed dead code (~350 lines): runOpusJudge(), fetchWithTimeout(),
 *   statistical functions, aggregation, prompt template, parsing
 * - Client now calls /api/judge endpoint directly (EnhancedComparison.tsx:194)
 * - Kept only types and result-building functions needed client-side
 * - See "Dead Code" folder for archived functions if restoration needed
 */

import type { MetricConsensus, CategoryConsensus, EnhancedComparisonResult, CityConsensusScore, LLMProvider } from '../types/enhancedComparison';
import type { CategoryId } from '../types/metrics';
import { ALL_METRICS, CATEGORIES } from '../shared/metrics';
import type { EvaluatorResult } from './llmEvaluators';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a deterministic comparison ID based on city names.
 * Sorted alphabetically so "Austin vs Miami" = "Miami vs Austin"
 */
function generateDeterministicId(city1: string, city2: string, prefix: string): string {
  // Normalize: lowercase, keep only alphanumeric, limit length
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  const c1 = normalize(city1);
  const c2 = normalize(city2);
  // Sort alphabetically for consistency regardless of order
  const [first, second] = [c1, c2].sort();
  return `${prefix}-${first}-${second}`;
}

// ============================================================================
// TYPES (used by EnhancedComparison.tsx)
// ============================================================================

export interface JudgeInput {
  city1: string;
  city2: string;
  evaluatorResults: EvaluatorResult[];
}

export interface JudgeOutput {
  city1Consensuses: MetricConsensus[];
  city2Consensuses: MetricConsensus[];
  overallAgreement: number;
  disagreementAreas: string[];
  judgeLatencyMs: number;
}

// ============================================================================
// BUILD CATEGORY CONSENSUS
// ============================================================================

// Import threshold constant for category consensus calculation
import { CONFIDENCE_THRESHOLDS } from '../constants/scoringThresholds';

export function buildCategoryConsensuses(
  metricConsensuses: MetricConsensus[]
): CategoryConsensus[] {
  return CATEGORIES.map(category => {
    const categoryMetrics = metricConsensuses.filter(m => {
      const metric = ALL_METRICS.find(am => am.id === m.metricId);
      return metric?.categoryId === category.id;
    });

    // Apply metric weights when calculating category average
    // Each metric has a weight (1-10) defined in metrics.ts
    let totalWeightedScore = 0;
    let totalWeight = 0;

    // FIX: Only include metrics with 2+ LLM scores for agreement calculation
    // Single-LLM metrics have stdDev=0 which falsely inflates agreement
    let totalWeightedStdDev = 0;
    let totalStdDevWeight = 0;

    // FIXED: Only include metrics with valid consensusScore (not null/missing)
    // This prevents artificial convergence from missing data
    let evaluatedCount = 0;

    categoryMetrics.forEach(m => {
      // Skip metrics with null consensusScore (missing data)
      if (m.consensusScore === null || m.isMissing) {
        return;
      }

      const metricDef = ALL_METRICS.find(am => am.id === m.metricId);
      const weight = metricDef?.weight || 1;
      totalWeightedScore += m.consensusScore * weight;
      totalWeight += weight;
      evaluatedCount++;

      // Only count stdDev from metrics with 2+ LLM evaluations
      if (m.llmScores && m.llmScores.length >= 2 && m.standardDeviation !== null) {
        totalWeightedStdDev += m.standardDeviation * weight;
        totalStdDevWeight += weight;
      }
    });

    // FIXED: Return null for empty categories instead of 50
    // This excludes the category from total score calculation instead of artificial convergence
    const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : null;
    // Use default stdDev if no metrics have 2+ LLMs (indicates insufficient data, not perfect agreement)
    const avgStdDev = totalStdDevWeight > 0 ? totalWeightedStdDev / totalStdDevWeight : CONFIDENCE_THRESHOLDS.DEFAULT_AVG_STDDEV;

    return {
      categoryId: category.id as CategoryId,
      metrics: categoryMetrics,
      averageConsensusScore: avgScore !== null ? Math.round(avgScore) : null,
      agreementLevel: avgScore !== null ? Math.round(Math.max(0, 100 - avgStdDev * 2)) : null,
      evaluatedMetrics: evaluatedCount,
      totalMetrics: categoryMetrics.length
    };
  });
}

// ============================================================================
// BUILD ENHANCED RESULT FROM JUDGE OUTPUT
// ============================================================================

/**
 * Custom category weights type (from WeightPresets)
 * Maps category ID to weight percentage (should sum to 100)
 */
export type CategoryWeights = Record<string, number> | null;

/**
 * Build a complete EnhancedComparisonResult from LLM evaluator results and judge output.
 * This is called when the judge completes to construct the final result for the UI.
 * Called from App.tsx via dynamic import.
 *
 * @param customWeights - Optional user-defined category weights from persona selection
 *                        If null, uses default weights from CATEGORIES
 */
export function buildEnhancedResultFromJudge(
  city1: string,
  city2: string,
  evaluatorResults: EvaluatorResult[],
  judgeOutput: JudgeOutput,
  customWeights?: CategoryWeights
): EnhancedComparisonResult {
  // Parse city names
  const parseCity = (cityStr: string) => {
    const parts = cityStr.split(',').map(s => s.trim());
    return {
      city: parts[0],
      region: parts.length > 2 ? parts[1] : undefined,
      country: parts[parts.length - 1] || 'Unknown'
    };
  };

  const city1Info = parseCity(city1);
  const city2Info = parseCity(city2);

  // Build category consensuses
  const city1Categories = buildCategoryConsensuses(judgeOutput.city1Consensuses);
  const city2Categories = buildCategoryConsensuses(judgeOutput.city2Consensuses);

  // Helper to get category weight - use custom weights if provided, else default
  const getCategoryWeight = (categoryId: string): number => {
    if (customWeights && customWeights[categoryId] !== undefined) {
      return customWeights[categoryId];
    }
    // Fall back to default weights from CATEGORIES definition
    const catDef = CATEGORIES.find(c => c.id === categoryId);
    return catDef?.weight || 0;
  };

  // Calculate weighted total scores using user's persona weights or defaults
  // FIXED: Only include categories with valid (non-null) scores
  // Redistributes weight among categories that have data
  const calculateCityTotal = (categories: typeof city1Categories): number => {
    let weightedSum = 0;
    let totalWeight = 0;

    categories.forEach(cat => {
      // Skip categories with no valid data (null averageConsensusScore)
      if (cat.averageConsensusScore === null) {
        return;
      }
      const weight = getCategoryWeight(cat.categoryId);
      weightedSum += cat.averageConsensusScore * weight;
      totalWeight += weight;
    });

    // If we have valid weights, calculate weighted average
    // If no valid categories, return 0 (or could return null)
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

  const city1Total = calculateCityTotal(city1Categories);
  const city2Total = calculateCityTotal(city2Categories);

  // Determine winner
  const city1FinalScore = Math.round(city1Total);
  const city2FinalScore = Math.round(city2Total);
  const scoreDiff = Math.abs(city1FinalScore - city2FinalScore);

  let winner: 'city1' | 'city2' | 'tie';
  if (scoreDiff === 0) {
    winner = 'tie';
  } else if (city1FinalScore > city2FinalScore) {
    winner = 'city1';
  } else {
    winner = 'city2';
  }

  // Category winners
  // FIXED: Handle null averageConsensusScore - treat as tie if either is missing
  const categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'> = {} as Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  CATEGORIES.forEach(cat => {
    const c1 = city1Categories.find(c => c.categoryId === cat.id);
    const c2 = city2Categories.find(c => c.categoryId === cat.id);
    const c1Score = c1?.averageConsensusScore;
    const c2Score = c2?.averageConsensusScore;

    // If either score is null/undefined (no data), mark as tie
    if (c1Score == null || c2Score == null) {
      categoryWinners[cat.id] = 'tie';
      return;
    }

    const diff = (c1Score as number) - (c2Score as number);
    if (Math.abs(diff) < 5) {
      categoryWinners[cat.id] = 'tie';
    } else if (diff > 0) {
      categoryWinners[cat.id] = 'city1';
    } else {
      categoryWinners[cat.id] = 'city2';
    }
  });

  // Get LLMs that were used (include partial successes with scores)
  const llmsUsed: LLMProvider[] = evaluatorResults
    .filter(r => r.success || (r.scores && r.scores.length > 0))
    .map(r => r.provider);

  // Build disagreement summary
  const disagreementSummary = judgeOutput.disagreementAreas.length > 0
    ? `LLMs disagreed most on: ${judgeOutput.disagreementAreas.join(', ')}`
    : 'LLMs showed strong agreement across all metrics';

  // Determine overall confidence
  const overallConfidence: 'high' | 'medium' | 'low' =
    judgeOutput.overallAgreement > 75 ? 'high' :
    judgeOutput.overallAgreement > 50 ? 'medium' : 'low';

  // Build city consensus scores
  const city1Result: CityConsensusScore = {
    city: city1Info.city,
    country: city1Info.country,
    region: city1Info.region,
    categories: city1Categories,
    totalConsensusScore: city1FinalScore,
    overallAgreement: judgeOutput.overallAgreement
  };

  const city2Result: CityConsensusScore = {
    city: city2Info.city,
    country: city2Info.country,
    region: city2Info.region,
    categories: city2Categories,
    totalConsensusScore: city2FinalScore,
    overallAgreement: judgeOutput.overallAgreement
  };

  // Build processing stats
  const llmTimings: Record<LLMProvider, number> = {} as Record<LLMProvider, number>;
  evaluatorResults.forEach(r => {
    llmTimings[r.provider] = r.latencyMs;
  });
  llmTimings['claude-opus'] = judgeOutput.judgeLatencyMs;

  return {
    city1: city1Result,
    city2: city2Result,
    winner,
    scoreDifference: scoreDiff,
    categoryWinners,
    comparisonId: generateDeterministicId(city1Info.city, city2Info.city, 'LIFE-ENH'),
    generatedAt: new Date().toISOString(),
    llmsUsed,
    judgeModel: 'claude-opus',
    overallConsensusConfidence: overallConfidence,
    disagreementSummary,
    processingStats: {
      totalTimeMs: evaluatorResults.reduce((sum, r) => sum + r.latencyMs, 0) + judgeOutput.judgeLatencyMs,
      llmTimings,
      metricsEvaluated: ALL_METRICS.length
    }
  };
}
