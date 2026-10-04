/**
 * LIFE SCORE - Standard mode leaves a category with no score out (anti-drift).
 *
 * John, 4 Oct 2026 ("Same as Enhanced"): fault SC5 in
 * docs/MASTER_BUG_AUDIT_20260220.md. A category whose results did not come
 * back counted as 0 in the city total, and — when only one city lacked it —
 * gave the other city a category win and the largest-gap bonus. Now it is left
 * out, the others share its weight, and it earns no bonus for either city.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/hooks/useComparison.ts', 'utf8');

describe('Standard mode city totals', () => {
  it('average over the categories that have a score, by their weights', () => {
    expect(source.includes('totalScore = scoredWeight > 0 ? (totalScore * 100) / scoredWeight : 0;')).toBe(true);
    expect(source.includes('totalLegalScore = legalWeight > 0 ? totalLegalScore / legalWeight : 0;')).toBe(true);
    expect(source.includes('totalLivedScore = livedWeight > 0 ? totalLivedScore / livedWeight : 0;')).toBe(true);
  });

  it('never read a missing category average as 0', () => {
    expect(/averageScore \?\? 0/.test(source)).toBe(false);
  });

  it('give no category win, spread or winner for a category one city lacks', () => {
    expect(source.includes('if (score1 !== null && score2 !== null) {')).toBe(true);
    expect(source.includes("if (score1 === null || score2 === null) {\n          categoryWinners[category.id] = 'tie';".replace(/\n/g, source.includes('\r\n') ? '\r\n' : '\n'))).toBe(true);
  });
});
