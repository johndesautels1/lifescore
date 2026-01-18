/**
 * LIFE SCORE™ Scoring Thresholds
 *
 * Centralized constants for confidence level determination based on
 * standard deviation of LLM scores. Used by both api/judge.ts and
 * src/services/opusJudge.ts.
 *
 * DO NOT CHANGE these values without updating both files that use them.
 */

// Standard deviation thresholds for confidence levels
export const CONFIDENCE_THRESHOLDS = {
  /** StdDev < 5 = unanimous agreement between LLMs */
  UNANIMOUS: 5,

  /** StdDev < 12 = strong agreement between LLMs */
  STRONG: 12,

  /** StdDev < 20 = moderate agreement between LLMs */
  MODERATE: 20,

  /** StdDev >= 20 = flag as disagreement area (aligned with MODERATE threshold) */
  DISAGREEMENT_FLAG: 20,

  /** Default avgStdDev when no data available */
  DEFAULT_AVG_STDDEV: 25
} as const;

// Type for confidence levels
export type ConfidenceLevel = 'unanimous' | 'strong' | 'moderate' | 'split';

/**
 * Determine confidence level from standard deviation
 */
export function getConfidenceLevel(stdDev: number): ConfidenceLevel {
  if (stdDev < CONFIDENCE_THRESHOLDS.UNANIMOUS) {
    return 'unanimous';
  } else if (stdDev < CONFIDENCE_THRESHOLDS.STRONG) {
    return 'strong';
  } else if (stdDev < CONFIDENCE_THRESHOLDS.MODERATE) {
    return 'moderate';
  } else {
    return 'split';
  }
}

/**
 * Check if a metric should be flagged as having LLM disagreement
 */
export function isDisagreementArea(stdDev: number): boolean {
  return stdDev > CONFIDENCE_THRESHOLDS.DISAGREEMENT_FLAG;
}
