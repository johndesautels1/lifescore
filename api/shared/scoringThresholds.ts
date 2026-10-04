/**
 * LIFE SCORE™ Scoring Thresholds — the one copy.
 *
 * How far apart the Enhanced-mode models' scores for a metric may be (their
 * standard deviation, σ) before the agreement level drops, and before the
 * metric is marked for the judge. Read by api/judge.ts on the server and, via
 * src/constants/scoringThresholds.ts, by the browser (src/services/opusJudge.ts).
 *
 * Until 4 Oct 2026 api/judge.ts kept its own copy, which marked disagreement
 * above 15 while this file said 20 (fault SC1 in docs/MASTER_BUG_AUDIT_20260220.md).
 * The server's 15 was what ran, what the judge is told and what the manuals
 * state, so 15 is the value kept.
 */

export const CONFIDENCE_THRESHOLDS = {
  /** σ below 5: the models agree unanimously. */
  UNANIMOUS: 5,

  /** σ below 12: strong agreement. */
  STRONG: 12,

  /** σ below 20: moderate agreement; 20 or more is a split. */
  MODERATE: 20,

  /** σ above 15: the metric is marked "high disagreement" for the judge. */
  DISAGREEMENT_FLAG: 15,

  /** The σ assumed when no metric was answered by two or more models. */
  DEFAULT_AVG_STDDEV: 25,
} as const;

/** Agreement among the models on one metric. */
export type ConfidenceLevel = 'unanimous' | 'strong' | 'moderate' | 'split';

/** The agreement level for a standard deviation of the models' scores. */
export function getConfidenceLevel(stdDev: number): ConfidenceLevel {
  if (stdDev < CONFIDENCE_THRESHOLDS.UNANIMOUS) return 'unanimous';
  if (stdDev < CONFIDENCE_THRESHOLDS.STRONG) return 'strong';
  if (stdDev < CONFIDENCE_THRESHOLDS.MODERATE) return 'moderate';
  return 'split';
}

/** Whether a metric is marked for the judge. A metric with no scores (σ null) never is. */
export function isDisagreementArea(stdDev: number | null): boolean {
  return stdDev !== null && stdDev > CONFIDENCE_THRESHOLDS.DISAGREEMENT_FLAG;
}
