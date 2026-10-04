/**
 * LIFE SCORE™ Scoring Thresholds — for the browser.
 *
 * The values and rules live once in api/shared/scoringThresholds.ts, which the
 * server's judge (api/judge.ts) also reads; this file keeps the import path the
 * browser code and tests already use.
 */

export {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  isDisagreementArea,
  type ConfidenceLevel,
} from '../../api/shared/scoringThresholds';
