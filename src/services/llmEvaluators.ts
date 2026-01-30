/**
 * LIFE SCORE™ LLM Evaluators
 * Client-side evaluation via Vercel serverless functions
 *
 * REFACTORED: 2026-01-20
 * - Removed dead client-side direct API call functions (~940 lines)
 * - All LLM calls now go through /api/evaluate serverless function
 * - See "Dead Code" folder for archived functions if restoration needed
 */

import type { LLMProvider, LLMAPIKeys, LLMMetricScore } from '../types/enhancedComparison';
import type { MetricDefinition, CategoryId } from '../types/metrics';
import { CATEGORIES, getMetricsByCategory } from '../shared/metrics';

// ============================================================================
// TIMEOUT CONSTANTS
// ============================================================================

const CLIENT_TIMEOUT_MS = 240000; // 240 seconds for client-side fetch (must exceed server 180s)

// ============================================================================
// TYPES
// ============================================================================

// Token usage tracking for cost calculation
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TavilyUsage {
  researchCredits: number;
  searchCredits: number;
  totalCredits: number;
}

export interface EvaluatorResult {
  provider: LLMProvider;
  success: boolean;
  scores: LLMMetricScore[];
  error?: string;
  latencyMs: number;
  // Cost tracking data (from API response)
  usage?: {
    tokens: TokenUsage;
    tavily?: TavilyUsage;
  };
}

// API response score format (from /api/evaluate)
interface APIMetricScore {
  metricId: string;
  city1LegalScore: number;
  city1EnforcementScore: number;
  city2LegalScore: number;
  city2EnforcementScore: number;
  confidence: string;
  reasoning?: string;
  sources?: string[];
  city1Evidence?: Array<{ title: string; url: string; snippet: string }>;
  city2Evidence?: Array<{ title: string; url: string; snippet: string }>;
}

// ============================================================================
// PHASE 2: CATEGORY BATCH EVALUATION
// Splits 100 metrics into 6 category batches, runs in parallel
// ============================================================================

export interface CategoryBatchProgress {
  categoryId: CategoryId;
  categoryName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metricsCount: number;
}

export interface BatchedEvaluatorResult extends EvaluatorResult {
  categoryResults: Map<CategoryId, {
    success: boolean;
    scores: LLMMetricScore[];
    latencyMs: number;
    error?: string;
    usage?: { tokens: TokenUsage; tavily?: TavilyUsage };
  }>;
}

/**
 * Evaluate a single category's metrics via Vercel API route
 * This calls /api/evaluate which has access to env vars with API keys
 */
async function evaluateCategoryBatch(
  provider: LLMProvider,
  city1: string,
  city2: string,
  categoryId: CategoryId,
  metrics: MetricDefinition[]
): Promise<{ success: boolean; scores: LLMMetricScore[]; latencyMs: number; error?: string; usage?: { tokens: TokenUsage; tavily?: TavilyUsage } }> {
  const startTime = Date.now();

  console.log(`[CLIENT] Starting ${provider} evaluation for category ${categoryId}, ${metrics.length} metrics`);

  // Client-side timeout - 240s per category (must exceed server 180s timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    // Call Vercel serverless function which has access to env vars
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        provider,
        city1,
        city2,
        metrics: metrics.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          categoryId: m.categoryId,
          scoringDirection: m.scoringDirection
        }))
      })
    });

    clearTimeout(timeoutId);

    console.log(`[CLIENT] ${provider}/${categoryId} response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CLIENT] ${provider}/${categoryId} API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        scores: [],
        latencyMs: Date.now() - startTime,
        error: `API error: ${response.status} - ${errorText}`
      };
    }

    const result = await response.json() as {
      success: boolean;
      scores: APIMetricScore[];
      error?: string;
      usage?: { tokens: TokenUsage; tavily?: TavilyUsage };
    };

    console.log(`[CLIENT] ${provider}/${categoryId} result: success=${result.success}, scores=${result.scores?.length || 0}, error=${result.error || 'none'}`);

    // Helper to convert confidence string to proper type
    const parseConfidence = (conf: string): 'high' | 'medium' | 'low' => {
      if (conf === 'high') return 'high';
      if (conf === 'medium') return 'medium';
      return 'low';
    };

    // Convert API response scores to LLMMetricScore format
    const apiScores: APIMetricScore[] = result.scores || [];
    const now = new Date().toISOString();

    const city1Scores: LLMMetricScore[] = apiScores.map((s: APIMetricScore) => ({
      metricId: s.metricId,
      rawValue: null,
      normalizedScore: Math.round((s.city1LegalScore + s.city1EnforcementScore) / 2),
      confidence: parseConfidence(s.confidence),
      llmProvider: provider,
      legalScore: s.city1LegalScore,
      enforcementScore: s.city1EnforcementScore,
      explanation: s.reasoning,
      sources: s.sources,
      evidence: s.city1Evidence?.map(e => ({
        city: city1,
        title: e.title,
        url: e.url,
        snippet: e.snippet,
        retrieved_at: now
      })),
      city: 'city1' as const
    }));

    const city2Scores: LLMMetricScore[] = apiScores.map((s: APIMetricScore) => ({
      metricId: s.metricId,
      rawValue: null,
      normalizedScore: Math.round((s.city2LegalScore + s.city2EnforcementScore) / 2),
      confidence: parseConfidence(s.confidence),
      llmProvider: provider,
      legalScore: s.city2LegalScore,
      enforcementScore: s.city2EnforcementScore,
      explanation: s.reasoning,
      sources: s.sources,
      evidence: s.city2Evidence?.map(e => ({
        city: city2,
        title: e.title,
        url: e.url,
        snippet: e.snippet,
        retrieved_at: now
      })),
      city: 'city2' as const
    }));

    const scores: LLMMetricScore[] = [...city1Scores, ...city2Scores];

    // Log usage if available for debugging
    if (result.usage?.tokens) {
      console.log(`[CLIENT] ${provider}/${categoryId} usage: ${result.usage.tokens.inputTokens} in / ${result.usage.tokens.outputTokens} out`);
    }

    // Only mark as success if we actually have scores
    return {
      success: result.success && scores.length > 0,
      scores,
      latencyMs: Date.now() - startTime,
      error: scores.length === 0 && result.success ? 'No scores returned from API' : result.error,
      usage: result.usage
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Provide clearer error message for timeout
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const errorMsg = isTimeout
      ? `Request timed out after ${CLIENT_TIMEOUT_MS / 1000} seconds for ${provider}/${categoryId}`
      : (error instanceof Error ? error.message : 'Unknown error');

    console.error(`[CLIENT] ${provider}/${categoryId} fetch error:`, errorMsg);

    return {
      success: false,
      scores: [],
      latencyMs: Date.now() - startTime,
      error: errorMsg
    };
  }
}

// Concurrency limit - run only 2 categories at a time to avoid API rate limits
const MAX_CONCURRENT_CATEGORIES = 2;

/**
 * Run a single LLM evaluator with category batching (2 concurrent, 3 waves)
 * This is the main entry point used by LLMSelector component
 */
export async function runSingleEvaluatorBatched(
  provider: LLMProvider,
  city1: string,
  city2: string,
  _apiKeys: LLMAPIKeys & { tavily?: string }, // Keys are in Vercel env vars, not used client-side
  onCategoryProgress?: (progress: CategoryBatchProgress[]) => void
): Promise<BatchedEvaluatorResult> {
  const startTime = Date.now();

  console.log(`[BATCH] Starting ${provider} batched evaluation (max ${MAX_CONCURRENT_CATEGORIES} concurrent)`);

  // NOTE: API keys are stored in Vercel environment variables on the server
  // The /api/evaluate endpoint has access to them, so we don't validate client-side

  // Initialize progress for all 6 categories
  const progressState: CategoryBatchProgress[] = CATEGORIES.map(cat => ({
    categoryId: cat.id as CategoryId,
    categoryName: cat.name,
    status: 'pending',
    metricsCount: cat.metricCount
  }));

  onCategoryProgress?.(progressState);

  // Helper to wrap a promise with timeout
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, timeoutValue: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(timeoutValue), timeoutMs))
    ]);
  };

  // Helper to evaluate a single category
  const evaluateCategory = async (category: typeof CATEGORIES[0]) => {
    const categoryId = category.id as CategoryId;
    const metrics = getMetricsByCategory(categoryId);
    const MAX_RETRIES = 2;

    // Update progress to running
    const idx = progressState.findIndex(p => p.categoryId === categoryId);
    if (idx >= 0) {
      progressState[idx].status = 'running';
      onCategoryProgress?.([...progressState]);
    }

    let result = { success: false, scores: [] as LLMMetricScore[], latencyMs: 0, error: 'Not attempted' };

    // Retry loop for network failures
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Wrap in timeout to prevent hanging (240s per category - must exceed server 180s)
      result = await withTimeout(
        evaluateCategoryBatch(provider, city1, city2, categoryId, metrics),
        CLIENT_TIMEOUT_MS,
        { success: false, scores: [], latencyMs: CLIENT_TIMEOUT_MS, error: `Timeout for ${categoryId}` }
      );

      // If successful or non-retryable error, break
      if (result.success) break;

      // Check if error is retryable (network issues)
      const isRetryable = result.error?.includes('fetch') ||
        result.error?.includes('network') ||
        result.error?.includes('NETWORK') ||
        result.error?.includes('Failed to fetch') ||
        result.error?.includes('Timeout');

      if (!isRetryable || attempt === MAX_RETRIES) break;

      console.log(`[BATCH] ${provider}/${categoryId} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(`[BATCH] ${provider}/${categoryId} done: success=${result.success}, scores=${result.scores.length}`);

    // Update progress to completed/failed
    if (idx >= 0) {
      progressState[idx].status = result.success ? 'completed' : 'failed';
      onCategoryProgress?.([...progressState]);
    }

    return { categoryId, result };
  };

  // Split categories into waves of MAX_CONCURRENT_CATEGORIES
  const allResults: { categoryId: CategoryId; result: { success: boolean; scores: LLMMetricScore[]; latencyMs: number; error?: string; usage?: { tokens: TokenUsage; tavily?: TavilyUsage } } }[] = [];

  for (let i = 0; i < CATEGORIES.length; i += MAX_CONCURRENT_CATEGORIES) {
    const wave = CATEGORIES.slice(i, i + MAX_CONCURRENT_CATEGORIES);
    console.log(`[BATCH] ${provider} wave ${Math.floor(i / MAX_CONCURRENT_CATEGORIES) + 1}: ${wave.map(c => c.id).join(', ')}`);

    // Run this wave in parallel (but only 2 at a time)
    const waveResults = await Promise.all(wave.map(cat => evaluateCategory(cat)));
    allResults.push(...waveResults);

    // Small delay between waves to let API recover
    if (i + MAX_CONCURRENT_CATEGORIES < CATEGORIES.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const results = allResults;

  console.log(`[BATCH] ${provider} all categories done in ${Date.now() - startTime}ms`);

  // Aggregate results
  const categoryResults = new Map<CategoryId, {
    success: boolean;
    scores: LLMMetricScore[];
    latencyMs: number;
    error?: string;
    usage?: { tokens: TokenUsage; tavily?: TavilyUsage };
  }>();

  const allScores: LLMMetricScore[] = [];
  let successCount = 0;
  const errors: string[] = [];

  // Aggregate usage across all categories
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTavilyResearch = 0;
  let totalTavilySearch = 0;

  results.forEach(({ categoryId, result }) => {
    categoryResults.set(categoryId, result);
    allScores.push(...result.scores);
    if (result.success) {
      successCount++;
    } else if (result.error) {
      errors.push(`${categoryId}: ${result.error}`);
    }

    // Aggregate usage
    if (result.usage?.tokens) {
      totalInputTokens += result.usage.tokens.inputTokens;
      totalOutputTokens += result.usage.tokens.outputTokens;
    }
    if (result.usage?.tavily) {
      totalTavilyResearch += result.usage.tavily.researchCredits;
      totalTavilySearch += result.usage.tavily.searchCredits;
    }
  });

  // PARTIAL SUCCESS: Count as success if at least 3/6 categories (50%) have scores
  const hasEnoughScores = allScores.length >= 30; // At least ~30 metrics worth of scores
  const partialSuccess = successCount >= 3 || hasEnoughScores;

  // Build aggregated usage - always include to ensure cost tracking works
  const aggregatedUsage = {
    tokens: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
    tavily: {
      researchCredits: totalTavilyResearch,
      searchCredits: totalTavilySearch,
      totalCredits: totalTavilyResearch + totalTavilySearch
    }
  };

  console.log(`[BATCH] ${provider}: ${successCount}/6 categories succeeded, ${allScores.length} scores, partialSuccess=${partialSuccess}`);
  if (aggregatedUsage) {
    console.log(`[BATCH] ${provider} total usage: ${totalInputTokens} in / ${totalOutputTokens} out tokens, ${totalTavilyResearch + totalTavilySearch} tavily credits`);
  }

  return {
    provider,
    success: partialSuccess,
    scores: allScores,
    latencyMs: Date.now() - startTime,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    categoryResults,
    usage: aggregatedUsage
  };
}
