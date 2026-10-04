/**
 * LIFE SCORE - one metric's score from its two halves: the law and how it is enforced.
 *
 * John, 4 Oct 2026: when the evaluator cannot rate one half, "leave it out" —
 * score the metric on the half that was rated, and leave the metric out when
 * neither was. Until then a missing half counted as 0, which cut the metric's
 * score in half (Standard mode) or scored a fully missing metric 0 (Enhanced).
 *
 * Used by Standard mode (src/hooks/useComparison.ts) with the user's Law vs
 * Lived split and Conservative mode, and by Enhanced mode
 * (src/services/llmEvaluators.ts) with an even split.
 */

import type { LawLivedRatio } from '../types/metrics';

/** A score that can be used: a finite number. */
export function isScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

const EVEN_SPLIT: LawLivedRatio = { law: 50, lived: 50 };

/**
 * The metric's score, rounded, or null when neither half was rated.
 *
 * - Both halves: `(law × ratio.law + lived × ratio.lived) / 100`, or the lower
 *   of the two in Conservative mode.
 * - One half: that half.
 */
export function blendLawLived(
  law: number | null | undefined,
  lived: number | null | undefined,
  ratio: LawLivedRatio = EVEN_SPLIT,
  conservative = false
): number | null {
  const hasLaw = isScore(law);
  const hasLived = isScore(lived);
  if (hasLaw && hasLived) {
    return conservative
      ? Math.round(Math.min(law, lived))
      : Math.round((law * ratio.law + lived * ratio.lived) / 100);
  }
  if (hasLaw) return Math.round(law);
  if (hasLived) return Math.round(lived);
  return null;
}
