/**
 * LIFE SCORE™ - Shared Metrics Module
 *
 * This file is the SINGLE SOURCE OF TRUTH for metric definitions.
 * It is imported by both:
 * - Client code (src/components, src/hooks)
 * - Server code (api/evaluate.ts)
 *
 * IMPORTANT: This replaces src/data/metrics.ts
 * All metric scoring criteria should be defined here.
 *
 * John E. Desautels & Associates
 * © 2025-2026 All Rights Reserved
 */

import type { Category, CategoryId, MetricDefinition, CategoricalOption, ScaleLevel } from '../types/metrics';
import type { ScoreResult } from './types';

// ============================================================================
// FALLBACK OPTIONS (Added to all metrics per LLM consensus)
// ============================================================================

/**
 * Fallback options added to every metric's scoringCriteria
 * These allow LLMs to indicate when data is unavailable or laws are in flux
 * Score is null to trigger special handling (not default to 50)
 */
const FALLBACK_OPTIONS: CategoricalOption[] = [
  {
    value: 'insufficient_data',
    label: 'Data Not Available',
    score: -1  // Marker for null score - handled in categoryToScore()
  },
  {
    value: 'transitional',
    label: 'Pending Legislation/Unclear',
    score: -1  // Marker for null score - handled in categoryToScore()
  }
];

/**
 * Helper to add fallback options to categorical/scale metrics
 */
function addFallbackOptions(options: CategoricalOption[] | undefined): CategoricalOption[] {
  if (!options) return [...FALLBACK_OPTIONS];
  return [...options, ...FALLBACK_OPTIONS];
}

function addFallbackLevels(levels: ScaleLevel[] | undefined): ScaleLevel[] {
  if (!levels) return [];
  // For scale types, we add fallback as options (converted from levels)
  return levels;
}

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

export const CATEGORIES: Category[] = [
  {
    id: 'personal_freedom',
    name: 'Personal Autonomy',
    shortName: 'Personal Autonomy',
    description: 'Laws governing personal choices, bodily autonomy, and individual liberty',
    metricCount: 15,
    weight: 20,
    icon: '🗽'
  },
  {
    id: 'housing_property',
    name: 'Housing, Property & HOA Control',
    shortName: 'Housing & Property',
    description: 'Property rights, ownership restrictions, HOA regulations, and housing freedom',
    metricCount: 20,
    weight: 20,
    icon: '🏠'
  },
  {
    id: 'business_work',
    name: 'Business & Work Regulation',
    shortName: 'Business & Work',
    description: 'Employment laws, licensing requirements, business regulations, and economic freedom',
    metricCount: 25,
    weight: 20,
    icon: '💼'
  },
  {
    id: 'transportation',
    name: 'Transportation & Daily Movement',
    shortName: 'Transportation',
    description: 'Mobility freedom, car dependency, public transit, and movement restrictions',
    metricCount: 15,
    weight: 15,
    icon: '🚇'
  },
  {
    id: 'policing_legal',
    name: 'Policing, Courts & Enforcement',
    shortName: 'Legal System',
    description: 'Law enforcement practices, incarceration rates, legal costs, and justice system',
    metricCount: 15,
    weight: 15,
    icon: '⚖️'
  },
  {
    id: 'speech_lifestyle',
    name: 'Speech, Lifestyle & Culture',
    shortName: 'Speech & Lifestyle',
    description: 'Free expression, cultural norms, privacy rights, and lifestyle autonomy',
    metricCount: 10,
    weight: 10,
    icon: '🎭'
  }
];

export const CATEGORIES_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.id]: cat }),
  {} as Record<CategoryId, Category>
);

// ============================================================================
// RE-EXPORT FROM ORIGINAL METRICS FILE (with fallback options)
// We import the original and enhance it
// ============================================================================

// Import original metrics
import {
  ALL_METRICS as ORIGINAL_ALL_METRICS,
  METRICS_MAP as ORIGINAL_METRICS_MAP,
  getMetricsByCategory as originalGetMetricsByCategory,
  validateMetricCounts
} from '../data/metrics';

// Enhance metrics with fallback options
export const ALL_METRICS: MetricDefinition[] = ORIGINAL_ALL_METRICS.map(metric => {
  const enhanced = { ...metric };

  // Add fallback options to categorical and scale types
  if (enhanced.scoringCriteria.type === 'categorical' && enhanced.scoringCriteria.options) {
    enhanced.scoringCriteria = {
      ...enhanced.scoringCriteria,
      options: addFallbackOptions(enhanced.scoringCriteria.options)
    };
  } else if (enhanced.scoringCriteria.type === 'scale' && enhanced.scoringCriteria.levels) {
    // For scale types, convert levels to include fallback capability
    // Keep original levels but also store as options for lookup
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
    // For boolean, create options
    enhanced.scoringCriteria = {
      ...enhanced.scoringCriteria,
      options: addFallbackOptions([
        { value: 'true', label: 'Yes', score: enhanced.scoringDirection === 'higher_is_better' ? 100 : 0 },
        { value: 'false', label: 'No', score: enhanced.scoringDirection === 'higher_is_better' ? 0 : 100 }
      ])
    };
  } else if (enhanced.scoringCriteria.type === 'range') {
    // For range types, create 5 buckets plus fallbacks
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

// Create enhanced METRICS_MAP
export const METRICS_MAP: Record<string, MetricDefinition> = ALL_METRICS.reduce(
  (acc, metric) => ({ ...acc, [metric.id]: metric }),
  {} as Record<string, MetricDefinition>
);

// ============================================================================
// O(1) SCORE LOOKUP MAP (Sonnet's optimization)
// ============================================================================

/**
 * Pre-built Map for O(1) score lookups
 * Key format: "metricId:categoryValue"
 * Value: score (number) or -1 for fallback categories
 *
 * Built once at module load - avoids O(n) lookups during evaluation
 */
export const METRIC_SCORE_LOOKUP = new Map<string, number>(
  ALL_METRICS.flatMap(metric => {
    const options = metric.scoringCriteria.options || [];
    return options.map(option => [
      `${metric.id}:${option.value}`,
      option.score
    ] as [string, number]);
  })
);

// ============================================================================
// CATEGORY TO SCORE FUNCTION (Replaces letterToScore)
// ============================================================================

/**
 * Convert a category value to its score for a given metric
 *
 * This replaces the old letterToScore() function that used:
 * A=100, B=75, C=50, D=25, E=0
 *
 * Now uses the actual scoringCriteria from metrics.ts for proper
 * non-uniform scoring (e.g., cannabis: 100/60/40/20/0)
 *
 * @param metricId - The metric ID (e.g., 'pf_01_cannabis_legal')
 * @param category - The category value returned by LLM (e.g., 'medical_only')
 * @returns ScoreResult with score or error type
 *
 * Results:
 * - { score: 60 } - Valid category with score
 * - { score: null } - Valid fallback category (insufficient_data/transitional)
 * - { score: null, error: 'INVALID_METRIC' } - Unknown metric ID
 * - { score: null, error: 'INVALID_CATEGORY' } - Category not in metric's options
 */
export function categoryToScore(metricId: string, category: string): ScoreResult {
  // Validate metric exists
  const metric = METRICS_MAP[metricId];
  if (!metric) {
    return { score: null, error: 'INVALID_METRIC' };
  }

  // O(1) lookup using pre-built Map
  const lookupKey = `${metricId}:${category}`;
  const score = METRIC_SCORE_LOOKUP.get(lookupKey);

  if (score === undefined) {
    return { score: null, error: 'INVALID_CATEGORY' };
  }

  // Handle fallback categories (score = -1 marker)
  if (score === -1) {
    return { score: null }; // Valid fallback, but no numeric score
  }

  return { score };
}

/**
 * Get all valid category values for a metric
 * Used for validation and prompt building
 */
export function getValidCategories(metricId: string): string[] {
  const metric = METRICS_MAP[metricId];
  if (!metric || !metric.scoringCriteria.options) {
    return [];
  }
  return metric.scoringCriteria.options.map(o => o.value);
}

/**
 * Get category options with labels for prompt building
 * Returns array of { value, label, score } for including in LLM prompts
 */
export function getCategoryOptionsForPrompt(metricId: string): CategoricalOption[] {
  const metric = METRICS_MAP[metricId];
  if (!metric || !metric.scoringCriteria.options) {
    return [];
  }
  // Filter out fallback options for the prompt (LLM shouldn't pick them by default)
  return metric.scoringCriteria.options.filter(
    o => o.value !== 'insufficient_data' && o.value !== 'transitional'
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get metrics by category
export const getMetricsByCategory = (categoryId: CategoryId): MetricDefinition[] => {
  return ALL_METRICS.filter(m => m.categoryId === categoryId);
};

// Re-export validation
export { validateMetricCounts };

// Confirm total
if (typeof window === 'undefined') {
  // Only log on server
  console.log(`[shared/metrics] Total LIFE SCORE metrics: ${ALL_METRICS.length}`);
  console.log(`[shared/metrics] METRIC_SCORE_LOOKUP entries: ${METRIC_SCORE_LOOKUP.size}`);
}
