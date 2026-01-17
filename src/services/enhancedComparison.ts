/**
 * LIFE SCORE™ Enhanced Comparison Service
 * Multi-LLM evaluation with Claude Opus consensus judging
 */

import type {
  LLMProvider,
  LLMAPIKeys,
  EnhancedComparisonResult,
  EnhancedComparisonProgress
} from '../types/enhancedComparison';
import { DEFAULT_ENHANCED_LLMS } from '../types/enhancedComparison';
import type { CategoryId } from '../types/metrics';
import { ALL_METRICS, CATEGORIES } from '../data/metrics';

// Real LLM evaluators and Opus judge
import { runAllEvaluators } from './llmEvaluators';
import { runOpusJudge, buildCategoryConsensuses } from './opusJudge';
import { cache } from './cache';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  API_KEYS: 'lifescore_api_keys',
  ENHANCED_CONFIG: 'lifescore_enhanced_config'
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Get stored API keys
 */
export function getStoredAPIKeys(): LLMAPIKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save API keys to storage
 */
export function saveAPIKeys(keys: LLMAPIKeys): void {
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
}

/**
 * Check which LLMs have valid API keys configured
 */
export function getAvailableLLMs(keys: LLMAPIKeys): LLMProvider[] {
  const available: LLMProvider[] = [];

  if (keys.anthropic) {
    available.push('claude-opus', 'claude-sonnet');
  }
  if (keys.openai) {
    available.push('gpt-4o');
  }
  if (keys.gemini) {
    available.push('gemini-3-pro');
  }
  if (keys.xai) {
    available.push('grok-4');
  }
  if (keys.perplexity) {
    available.push('perplexity');
  }

  return available;
}

// ============================================================================
// MAIN ENHANCED COMPARISON FUNCTION
// ============================================================================

export interface EnhancedComparisonOptions {
  city1: string;
  city2: string;
  llmsToUse?: LLMProvider[];
  apiKeys: LLMAPIKeys;
  onProgress?: (progress: EnhancedComparisonProgress) => void;
}

/**
 * Run enhanced comparison with multiple LLMs
 * Now uses real API calls with web search capabilities
 * Includes aggressive caching to reduce API costs (~$22/comparison)
 */
export async function runEnhancedComparison(
  options: EnhancedComparisonOptions
): Promise<EnhancedComparisonResult> {
  const { city1, city2, apiKeys, onProgress } = options;
  const llmsToUse = options.llmsToUse || DEFAULT_ENHANCED_LLMS;
  const startTime = Date.now();

  // Helper to parse city string
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

  // Initialize progress
  const updateProgress = (progress: Partial<EnhancedComparisonProgress>) => {
    onProgress?.({
      phase: 'initializing',
      llmsCompleted: [],
      metricsProcessed: 0,
      totalMetrics: ALL_METRICS.length,
      ...progress
    } as EnhancedComparisonProgress);
  };

  // =========================================================================
  // CHECK CACHE FIRST - Returns cached result if available (saves ~$22)
  // =========================================================================

  const cacheKey = { city1, city2, llmsUsed: llmsToUse };

  try {
    const cachedResult = await cache.getComparison(cacheKey);

    // VALIDATE cached result before using - never return incomplete data
    if (cachedResult &&
        cachedResult.city1 &&
        cachedResult.city2 &&
        cachedResult.city1.categories &&
        cachedResult.city1.categories.length > 0 &&
        cachedResult.city2.categories &&
        cachedResult.city2.categories.length > 0 &&
        typeof cachedResult.city1.totalConsensusScore === 'number' &&
        typeof cachedResult.city2.totalConsensusScore === 'number') {

      console.log(`[CACHE HIT] Valid cached comparison for ${city1} vs ${city2}`);

      // Update progress to show completion
      updateProgress({
        phase: 'complete',
        llmsCompleted: cachedResult.llmsUsed,
        metricsProcessed: ALL_METRICS.length
      });

      return {
        ...cachedResult,
        // Add cache indicator to the result
        processingStats: {
          ...cachedResult.processingStats,
          fromCache: true,
          cachedAt: cachedResult.generatedAt
        }
      } as EnhancedComparisonResult;
    } else if (cachedResult) {
      // Cached result exists but is invalid - clear it
      console.warn(`[CACHE] Invalid cached result for ${city1} vs ${city2}, fetching fresh data`);
    }
  } catch (cacheError) {
    // Cache error should not block the comparison - just log and continue
    console.warn('[CACHE] Error reading cache, proceeding with fresh data:', cacheError);
  }

  updateProgress({ phase: 'evaluating' });

  const llmsCompleted: LLMProvider[] = [];
  const llmTimings: Record<string, number> = {};

  // =========================================================================
  // PHASE 1: Run all LLM evaluators in parallel
  // =========================================================================

  const evaluatorResults = await runAllEvaluators(
    city1,
    city2,
    ALL_METRICS,
    apiKeys,
    (provider, status) => {
      if (status === 'completed') {
        llmsCompleted.push(provider);
      }
      updateProgress({
        phase: 'evaluating',
        currentLLM: status === 'started' ? provider : undefined,
        llmsCompleted: [...llmsCompleted],
        metricsProcessed: llmsCompleted.length * 20
      });
    }
  );

  // Collect timings
  evaluatorResults.results.forEach(r => {
    llmTimings[r.provider] = r.latencyMs;
    if (r.success && !llmsCompleted.includes(r.provider)) {
      llmsCompleted.push(r.provider);
    }
  });

  // =========================================================================
  // PHASE 2: Claude Opus Judge builds consensus
  // =========================================================================

  updateProgress({
    phase: 'judging',
    llmsCompleted,
    metricsProcessed: ALL_METRICS.length
  });

  const judgeOutput = await runOpusJudge(
    apiKeys.anthropic || '',
    {
      city1,
      city2,
      evaluatorResults: evaluatorResults.results
    }
  );

  llmTimings['claude-opus'] = judgeOutput.judgeLatencyMs;

  // =========================================================================
  // PHASE 3: Build final results
  // =========================================================================

  // Build category consensuses
  const city1Categories = buildCategoryConsensuses(judgeOutput.city1Consensuses);
  const city2Categories = buildCategoryConsensuses(judgeOutput.city2Consensuses);

  // Calculate weighted total scores
  const city1Total = city1Categories.reduce((sum, cat) => {
    const catDef = CATEGORIES.find(c => c.id === cat.categoryId);
    return sum + (cat.averageConsensusScore * (catDef?.weight || 0)) / 100;
  }, 0);

  const city2Total = city2Categories.reduce((sum, cat) => {
    const catDef = CATEGORIES.find(c => c.id === cat.categoryId);
    return sum + (cat.averageConsensusScore * (catDef?.weight || 0)) / 100;
  }, 0);

  // Determine winner - use rounded scores so display matches logic
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
  const categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'> = {} as Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  CATEGORIES.forEach(cat => {
    const c1 = city1Categories.find(c => c.categoryId === cat.id);
    const c2 = city2Categories.find(c => c.categoryId === cat.id);
    const diff = (c1?.averageConsensusScore || 0) - (c2?.averageConsensusScore || 0);
    if (Math.abs(diff) < 5) {
      categoryWinners[cat.id] = 'tie';
    } else if (diff > 0) {
      categoryWinners[cat.id] = 'city1';
    } else {
      categoryWinners[cat.id] = 'city2';
    }
  });

  // Build disagreement summary
  const disagreementSummary = judgeOutput.disagreementAreas.length > 0
    ? `LLMs disagreed most on: ${judgeOutput.disagreementAreas.join(', ')}`
    : 'LLMs showed strong agreement across all metrics';

  // Determine overall confidence
  const overallConfidence: 'high' | 'medium' | 'low' =
    judgeOutput.overallAgreement > 75 ? 'high' :
    judgeOutput.overallAgreement > 50 ? 'medium' : 'low';

  updateProgress({ phase: 'complete', llmsCompleted });

  // Build the final result object
  const result: EnhancedComparisonResult = {
    city1: {
      city: city1Info.city,
      country: city1Info.country,
      region: city1Info.region,
      categories: city1Categories,
      totalConsensusScore: Math.round(city1Total),
      overallAgreement: judgeOutput.overallAgreement
    },
    city2: {
      city: city2Info.city,
      country: city2Info.country,
      region: city2Info.region,
      categories: city2Categories,
      totalConsensusScore: Math.round(city2Total),
      overallAgreement: judgeOutput.overallAgreement
    },
    winner,
    scoreDifference: Math.round(scoreDiff),
    categoryWinners,
    comparisonId: `LIFE-ENH-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    llmsUsed: llmsCompleted,
    judgeModel: 'claude-opus',
    overallConsensusConfidence: overallConfidence,
    disagreementSummary,
    processingStats: {
      totalTimeMs: Date.now() - startTime,
      llmTimings: llmTimings as Record<LLMProvider, number>,
      metricsEvaluated: ALL_METRICS.length
    }
  };

  // =========================================================================
  // CACHE THE RESULT - Only cache valid, complete results
  // =========================================================================

  // Validate result before caching - NEVER cache incomplete/invalid data
  const isValidResult =
    result.city1.categories.length > 0 &&
    result.city2.categories.length > 0 &&
    result.city1.totalConsensusScore > 0 &&
    result.city2.totalConsensusScore > 0 &&
    llmsCompleted.length > 0;

  if (isValidResult) {
    try {
      await cache.setComparison(cacheKey, result);
      console.log(`[CACHE SET] Stored valid comparison for ${city1} vs ${city2}`);
    } catch (cacheError) {
      // Cache write failure should not affect the return
      console.warn('[CACHE] Failed to store result:', cacheError);
    }
  } else {
    console.warn(`[CACHE SKIP] Not caching incomplete result for ${city1} vs ${city2}`);
  }

  return result;
}

