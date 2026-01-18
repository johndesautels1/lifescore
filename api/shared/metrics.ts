/**
 * LIFE SCORE - API Shared Metrics Module
 * Standalone version for Vercel serverless functions
 *
 * This file imports from local api/shared/ files only - no src/ dependencies
 */

import type { MetricDefinition, CategoricalOption, CategoryId } from './types.js';
import {
  ALL_METRICS,
  METRICS_MAP as ORIGINAL_METRICS_MAP,
  CATEGORIES,
  CATEGORIES_MAP,
  validateMetricCounts
} from './metrics-data.js';

// Re-export what we need
export { CATEGORIES, CATEGORIES_MAP, validateMetricCounts };
export type { MetricDefinition, CategoricalOption, CategoryId };

// ============================================================================
// SCORE RESULT TYPE
// ============================================================================

export interface ScoreResult {
  score: number | null;
  error?: 'INVALID_METRIC' | 'INVALID_CATEGORY';
}

// ============================================================================
// FALLBACK OPTIONS (Added to all metrics)
// ============================================================================

const FALLBACK_OPTIONS: CategoricalOption[] = [
  {
    value: 'insufficient_data',
    label: 'Data Not Available',
    score: -1  // Marker for null score
  },
  {
    value: 'transitional',
    label: 'Pending Legislation/Unclear',
    score: -1  // Marker for null score
  }
];

function addFallbackOptions(options: CategoricalOption[] | undefined): CategoricalOption[] {
  if (!options) return [...FALLBACK_OPTIONS];
  return [...options, ...FALLBACK_OPTIONS];
}

// ============================================================================
// ENHANCED METRICS WITH FALLBACK OPTIONS
// ============================================================================

const ENHANCED_METRICS: MetricDefinition[] = ALL_METRICS.map(metric => {
  const enhanced = { ...metric };

  if (enhanced.scoringCriteria.type === 'categorical' && enhanced.scoringCriteria.options) {
    enhanced.scoringCriteria = {
      ...enhanced.scoringCriteria,
      options: addFallbackOptions(enhanced.scoringCriteria.options)
    };
  } else if (enhanced.scoringCriteria.type === 'scale' && enhanced.scoringCriteria.levels) {
    const optionsFromLevels: CategoricalOption[] = enhanced.scoringCriteria.levels.map(level => ({
      value: `level_${level.level}`,
      label: level.label,
      score: level.score
    }));
    enhanced.scoringCriteria = {
      ...enhanced.scoringCriteria,
      options: addFallbackOptions(optionsFromLevels)
    };
  } else if (enhanced.scoringCriteria.type === 'boolean') {
    enhanced.scoringCriteria = {
      ...enhanced.scoringCriteria,
      options: addFallbackOptions([
        { value: 'true', label: 'Yes', score: enhanced.scoringDirection === 'higher_is_better' ? 100 : 0 },
        { value: 'false', label: 'No', score: enhanced.scoringDirection === 'higher_is_better' ? 0 : 100 }
      ])
    };
  } else if (enhanced.scoringCriteria.type === 'range') {
    const min = enhanced.scoringCriteria.minValue ?? 0;
    const max = enhanced.scoringCriteria.maxValue ?? 100;
    const isLowerBetter = enhanced.scoringDirection === 'lower_is_better';

    enhanced.scoringCriteria = {
      ...enhanced.scoringCriteria,
      options: addFallbackOptions([
        { value: 'very_low', label: `Very Low (${min}-${min + (max-min)*0.2})`, score: isLowerBetter ? 100 : 20 },
        { value: 'low', label: `Low (${min + (max-min)*0.2}-${min + (max-min)*0.4})`, score: isLowerBetter ? 80 : 40 },
        { value: 'moderate', label: `Moderate (${min + (max-min)*0.4}-${min + (max-min)*0.6})`, score: 60 },
        { value: 'high', label: `High (${min + (max-min)*0.6}-${min + (max-min)*0.8})`, score: isLowerBetter ? 40 : 80 },
        { value: 'very_high', label: `Very High (${min + (max-min)*0.8}-${max})`, score: isLowerBetter ? 20 : 100 }
      ])
    };
  }

  return enhanced;
});

// ============================================================================
// EXPORTS
// ============================================================================

export const METRICS_MAP: Record<string, MetricDefinition> = ENHANCED_METRICS.reduce(
  (acc, metric) => ({ ...acc, [metric.id]: metric }),
  {} as Record<string, MetricDefinition>
);

// O(1) lookup map
const METRIC_SCORE_LOOKUP = new Map<string, number>(
  ENHANCED_METRICS.flatMap(metric => {
    const options = metric.scoringCriteria.options || [];
    return options.map(option => [
      `${metric.id}:${option.value}`,
      option.score
    ] as [string, number]);
  })
);

/**
 * Convert a category value to its score for a given metric
 */
export function categoryToScore(metricId: string, category: string): ScoreResult {
  const metric = METRICS_MAP[metricId];
  if (!metric) {
    return { score: null, error: 'INVALID_METRIC' };
  }

  const lookupKey = `${metricId}:${category}`;
  const score = METRIC_SCORE_LOOKUP.get(lookupKey);

  if (score === undefined) {
    return { score: null, error: 'INVALID_CATEGORY' };
  }

  if (score === -1) {
    return { score: null };
  }

  return { score };
}

/**
 * Get category options for prompt building (excludes fallbacks)
 */
export function getCategoryOptionsForPrompt(metricId: string): CategoricalOption[] {
  const metric = METRICS_MAP[metricId];
  if (!metric || !metric.scoringCriteria.options) {
    return [];
  }
  return metric.scoringCriteria.options.filter(
    o => o.value !== 'insufficient_data' && o.value !== 'transitional'
  );
}

/**
 * Get all valid category values for a metric
 */
export function getValidCategories(metricId: string): string[] {
  const metric = METRICS_MAP[metricId];
  if (!metric || !metric.scoringCriteria.options) {
    return [];
  }
  return metric.scoringCriteria.options.map(o => o.value);
}
