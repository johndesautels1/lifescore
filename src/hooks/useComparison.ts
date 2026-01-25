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
import { ALL_METRICS, CATEGORIES, getMetricsByCategory } from '../shared/metrics';

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
 * FIXED: Excludes missing metrics from calculation instead of defaulting to 50
 */
function calculateCategoryScore(
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

  // Calculate averages only from evaluated metrics
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
 * Calculate total city score from all category scores
 * FIXED: Tracks separate Legal/Lived scores and data completeness
 */
function calculateCityScore(
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

  // Determine overall confidence based on evaluation rate (not just verification)
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
    totalLegalScore: Math.round(totalLegalScore),   // NEW: Separate legal total
    totalLivedScore: Math.round(totalLivedScore),   // NEW: Separate lived total
    normalizedScore: Math.round(totalScore),
    overallConfidence,
    comparisonDate: new Date().toISOString(),
    dataFreshness: 'current',
    dataCompleteness: {                              // NEW: Track data completeness
      evaluatedMetrics: totalEvaluated,
      totalMetrics: totalMetrics,
      percentage: totalMetrics > 0 ? Math.round((totalEvaluated / totalMetrics) * 100) : 0
    }
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
              // FIXED: Store Legal and Lived scores SEPARATELY
              // Do not average here - let user preferences control the weighting
              const city1Legal = score.city1LegalScore;
              const city1Lived = score.city1EnforcementScore;
              const city2Legal = score.city2LegalScore;
              const city2Lived = score.city2EnforcementScore;

              // Check if we have valid data (not undefined/null/NaN)
              const city1HasData = typeof city1Legal === 'number' && !isNaN(city1Legal);
              const city2HasData = typeof city2Legal === 'number' && !isNaN(city2Legal);

              // Calculate normalized score using user's Law/Lived preference
              // TODO: Get lawLivedRatio from user preferences (default 50/50 for now)
              const lawWeight = 50; // Will be replaced with user preference
              const livedWeight = 50;

              const city1NormalizedScore = city1HasData
                ? Math.round((city1Legal * lawWeight + city1Lived * livedWeight) / 100)
                : null;
              const city2NormalizedScore = city2HasData
                ? Math.round((city2Legal * lawWeight + city2Lived * livedWeight) / 100)
                : null;

              // Map confidence string to type
              let confidence: 'high' | 'medium' | 'low' | 'unverified' = 'medium';
              if (score.confidence === 'high') confidence = 'high';
              else if (score.confidence === 'low') confidence = 'low';

              // Derive source display from sources array
              // If we have actual URLs, show the first domain; otherwise fallback
              const sourcesArray = score.sources || [];
              const sourceDisplay = sourcesArray.length > 0
                ? sourcesArray.map(url => {
                    try {
                      return new URL(url).hostname.replace('www.', '');
                    } catch {
                      return url;
                    }
                  }).slice(0, 3).join(', ')
                : 'LLM Evaluation';
              const sourceUrl = sourcesArray.length > 0 ? sourcesArray[0] : undefined;

              // City 1 score - store Legal and Lived separately
              city1MetricScores.push({
                metricId: score.metricId,
                rawValue: score.city1LegalScore,
                normalizedScore: city1NormalizedScore,
                legalScore: city1Legal,      // NEW: Separate legal score
                livedScore: city1Lived,      // NEW: Separate lived score
                confidence,
                source: sourceDisplay,
                sourceUrl: sourceUrl,
                sources: sourcesArray,
                notes: score.reasoning,
                isMissing: !city1HasData     // NEW: Track if data is missing
              });

              // City 2 score - store Legal and Lived separately
              city2MetricScores.push({
                metricId: score.metricId,
                rawValue: score.city2LegalScore,
                normalizedScore: city2NormalizedScore,
                legalScore: city2Legal,      // NEW: Separate legal score
                livedScore: city2Lived,      // NEW: Separate lived score
                confidence,
                source: sourceDisplay,
                sourceUrl: sourceUrl,
                sources: sourcesArray,
                notes: score.reasoning,
                isMissing: !city2HasData     // NEW: Track if data is missing
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
        comparisonId: generateDeterministicId(city1Name, city2Name, 'LIFE-STD'),
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
