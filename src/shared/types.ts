/**
 * LIFE SCORE™ - Shared Type Definitions
 * Used by both client and server (api/evaluate.ts)
 *
 * John E. Desautels & Associates
 * © 2025 All Rights Reserved
 */

// Re-export all types from the main types file
export * from '../types/metrics';

// ============================================================================
// CATEGORY SCORING TYPES (NEW - For Category Key Classification)
// ============================================================================

/**
 * Result from categoryToScore() function
 * Distinguishes between success, valid fallbacks, and errors
 */
export interface ScoreResult {
  score: number | null;
  error?: 'INVALID_METRIC' | 'INVALID_CATEGORY';
}

/**
 * Fallback category values that should be added to all metrics
 */
export const FALLBACK_CATEGORY_VALUES = {
  INSUFFICIENT_DATA: 'insufficient_data',
  TRANSITIONAL: 'transitional',
} as const;

/**
 * Fallback options to add to every metric's scoringCriteria
 * Score is null to indicate these need special handling (not 50 default)
 */
export const FALLBACK_OPTIONS = [
  {
    value: 'insufficient_data',
    label: 'Data Not Available',
    score: null as unknown as number  // Will be handled specially
  },
  {
    value: 'transitional',
    label: 'Pending Legislation/Unclear',
    score: null as unknown as number  // Will be handled specially
  }
];

/**
 * Validation result from validateEvaluationResponse()
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    metricId: string;
    issue: 'INVALID_METRIC' | 'INVALID_CATEGORY' | 'MISSING_CITY1' | 'MISSING_CITY2';
    received?: string;
  }>;
  needsRetry: boolean;       // < 30% errors = should retry
  needsHumanReview: boolean; // >= 30% errors OR has insufficient_data
}

/**
 * Enhanced evaluation response with category keys (not letter grades)
 */
export interface CategoryEvaluation {
  metricId: string;
  city1Category: string;
  city2Category: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  city1Evidence: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  city2Evidence: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
}

/**
 * Environment toggle for gradual rollout
 */
export const USE_CATEGORY_SCORING_ENV = 'USE_CATEGORY_SCORING';
