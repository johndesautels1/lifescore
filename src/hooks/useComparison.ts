/**
 * LIFE SCORE™ Comparison Hook
 * Manages comparison state and API calls - REAL API MODE ONLY
 *
 * FIX: Now properly uses API response data to calculate real scores
 * instead of random/hardcoded values
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ComparisonState,
  CategoryId,
  ComparisonResult,
  MetricScore,
  CategoryScore,
  CityScore
} from '../types/metrics';
import { ALL_METRICS, CATEGORIES, getMetricsByCategory } from '../data/metrics';

// ============================================================================
// TYPES
// ============================================================================

interface UseComparisonOptions {
  apiEndpoint?: string;  // Custom API endpoint
}

interface UseComparisonReturn {
  state: ComparisonState;
  compare: (city1: string, city2: string) => Promise<void>;
  reset: () => void;
  loadResult: (result: ComparisonResult) => void;
}

interface APIEvaluationScore {
  metricId: string;
  city1LegalScore: number;
  city1EnforcementScore: number;
  city2LegalScore: number;
  city2EnforcementScore: number;
  confidence: string;
  reasoning?: string;
  sources?: string[];
}

interface APIEvaluationResponse {
  provider: string;
  success: boolean;
  scores: APIEvaluationScore[];
  latencyMs: number;
  error?: string;
}

// ============================================================================
// SCORING HELPERS
// ============================================================================

/**
 * Calculate weighted average score for a category
 */
function calculateCategoryScore(
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
      // Create placeholder for missing metric with neutral score
      metricsForCategory.push({
        metricId: metricDef.id,
        rawValue: null,
        normalizedScore: 50, // Neutral score, not 0
        confidence: 'unverified'
      });
      totalWeightedScore += 50 * metricDef.weight;
      totalWeight += metricDef.weight;
    }
  }

  const averageScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;

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
 * Calculate total city score from all category scores
 */
function calculateCityScore(
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
  const verificationRate = totalMetrics > 0 ? totalVerified / totalMetrics : 0;
  let overallConfidence: 'high' | 'medium' | 'low';
  if (verificationRate >= 0.8) {
    overallConfidence = 'high';
  } else if (verificationRate >= 0.5) {
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
    normalizedScore: Math.round(totalScore),
    overallConfidence,
    comparisonDate: new Date().toISOString(),
    dataFreshness: 'current'
  };
}

// ============================================================================
// MAIN HOOK - REAL API MODE ONLY
// ============================================================================

export function useComparison(_options: UseComparisonOptions = {}): UseComparisonReturn {
  const [state, setState] = useState<ComparisonState>({
    status: 'idle'
  });

  // Track current comparison's abort controller for cleanup
  const comparisonControllerRef = useRef<AbortController | null>(null);

  // Cleanup: abort any in-progress comparison when component unmounts
  useEffect(() => {
    return () => {
      comparisonControllerRef.current?.abort();
    };
  }, []);

  /**
   * Run comparison between two cities using real LLM APIs
   * FIX: Now properly collects and uses API response data
   * FIX: Added AbortController cleanup for unmount and new comparison scenarios
   */
  const compare = useCallback(async (city1: string, city2: string) => {
    // Abort any previous comparison in progress (prevents race conditions)
    comparisonControllerRef.current?.abort();

    // Create new abort controller for this comparison
    const currentController = new AbortController();
    comparisonControllerRef.current = currentController;

    // Start loading
    setState({
      status: 'loading',
      progress: {
        currentCategory: 'personal_freedom',
        metricsProcessed: 0,
        totalMetrics: ALL_METRICS.length
      }
    });

    try {
      // Collect all metric scores from API responses
      const city1MetricScores: MetricScore[] = [];
      const city2MetricScores: MetricScore[] = [];
      const failedCategories: string[] = [];

      // Process each category - continue even if one fails
      for (let i = 0; i < CATEGORIES.length; i++) {
        // Check if this comparison was cancelled before starting category
        if (currentController.signal.aborted) {
          return; // Silent return - new comparison taking over or unmounting
        }

        const category = CATEGORIES[i];

        setState(prev => ({
          ...prev,
          progress: {
            currentCategory: category.id as CategoryId,
            metricsProcessed: city1MetricScores.length,
            totalMetrics: ALL_METRICS.length,
            currentMetric: `Evaluating ${category.shortName}...`
          }
        }));

        // Get metrics for this category
        const categoryMetrics = ALL_METRICS
          .filter(m => m.categoryId === category.id)
          .map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            categoryId: m.categoryId,
            scoringDirection: m.scoringDirection
          }));

        // Call API for this category's metrics with 240s timeout (must exceed server 180s)
        const fetchController = new AbortController();
        const timeoutId = setTimeout(() => fetchController.abort(), 240000);

        // Link: if comparison is cancelled, also abort this fetch
        const abortHandler = () => fetchController.abort();
        currentController.signal.addEventListener('abort', abortHandler);

        try {
          const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'claude-sonnet',
              city1,
              city2,
              metrics: categoryMetrics
            }),
            signal: fetchController.signal
          });

          clearTimeout(timeoutId);
          currentController.signal.removeEventListener('abort', abortHandler);

          if (!response.ok) {
            console.warn(`Category ${category.shortName} API error: ${response.status}`);
            failedCategories.push(category.shortName);
            continue; // Continue to next category
          }

          const apiResponse: APIEvaluationResponse = await response.json();

          // Parse and store the scores from API response
          if (apiResponse.success && apiResponse.scores) {
            for (const score of apiResponse.scores) {
              // Calculate normalized score as average of legal and enforcement
              const city1NormalizedScore = Math.round(
                (score.city1LegalScore + score.city1EnforcementScore) / 2
              );
              const city2NormalizedScore = Math.round(
                (score.city2LegalScore + score.city2EnforcementScore) / 2
              );

              // Map confidence string to type
              let confidence: 'high' | 'medium' | 'low' | 'unverified' = 'medium';
              if (score.confidence === 'high') confidence = 'high';
              else if (score.confidence === 'low') confidence = 'low';

              // City 1 score
              city1MetricScores.push({
                metricId: score.metricId,
                rawValue: score.city1LegalScore,
                normalizedScore: city1NormalizedScore,
                confidence,
                source: 'LLM Evaluation',
                notes: score.reasoning
              });

              // City 2 score
              city2MetricScores.push({
                metricId: score.metricId,
                rawValue: score.city2LegalScore,
                normalizedScore: city2NormalizedScore,
                confidence,
                source: 'LLM Evaluation',
                notes: score.reasoning
              });
            }
          } else {
            console.warn(`Category ${category.shortName} returned no scores`);
            failedCategories.push(category.shortName);
          }
        } catch (categoryError) {
          clearTimeout(timeoutId);
          currentController.signal.removeEventListener('abort', abortHandler);

          // If user cancelled, exit completely
          if (currentController.signal.aborted) {
            return;
          }

          // Log error but continue to next category
          const errorMsg = categoryError instanceof Error ? categoryError.message : 'Unknown error';
          console.warn(`Category ${category.shortName} failed: ${errorMsg}`);
          failedCategories.push(category.shortName);
          // Continue to next category instead of throwing
        }
      }

      // Check if we have ANY data to show
      if (city1MetricScores.length === 0) {
        throw new Error(`All categories failed: ${failedCategories.join(', ')}`);
      }

      // Final progress update
      setState(prev => ({
        ...prev,
        progress: {
          currentCategory: 'speech_lifestyle',
          metricsProcessed: ALL_METRICS.length,
          totalMetrics: ALL_METRICS.length,
          currentMetric: 'Building results...'
        }
      }));

      // Parse city names
      const city1Parts = city1.split(',').map(s => s.trim());
      const city2Parts = city2.split(',').map(s => s.trim());

      const city1Name = city1Parts[0];
      const city1Country = city1Parts[city1Parts.length - 1] || 'Unknown';
      const city1Region = city1Parts.length > 2 ? city1Parts[1] : undefined;

      const city2Name = city2Parts[0];
      const city2Country = city2Parts[city2Parts.length - 1] || 'Unknown';
      const city2Region = city2Parts.length > 2 ? city2Parts[1] : undefined;

      // FIX: Calculate real scores from collected API data
      const city1Score = calculateCityScore(city1Name, city1Country, city1MetricScores, city1Region);
      const city2Score = calculateCityScore(city2Name, city2Country, city2MetricScores, city2Region);

      // Determine winner
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

      // Build final result with real scores
      const result: ComparisonResult = {
        city1: city1Score,
        city2: city2Score,
        winner,
        scoreDifference: Math.round(scoreDifference),
        categoryWinners,
        comparisonId: `LIFE-STD-${Date.now().toString(36).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        // Add warning if some categories failed
        ...(failedCategories.length > 0 && {
          warning: `Partial results: ${failedCategories.join(', ')} category(s) failed or timed out. Showing ${city1MetricScores.length}/${ALL_METRICS.length} metrics.`
        })
      };

      // Only update state if this comparison wasn't cancelled
      if (!currentController.signal.aborted) {
        setState({
          status: 'success',
          result
        });
      }
    } catch (error) {
      // Only show error if this comparison wasn't intentionally cancelled
      // (cancelled = user started new comparison or navigated away)
      if (!currentController.signal.aborted) {
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'An unexpected error occurred'
        });
      }
    }
  }, []);

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  /**
   * Load a saved comparison result directly
   */
  const loadResult = useCallback((result: ComparisonResult) => {
    setState({
      status: 'success',
      result
    });
  }, []);

  return {
    state,
    compare,
    reset,
    loadResult
  };
}

export default useComparison;
