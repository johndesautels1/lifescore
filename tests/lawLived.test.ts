/**
 * LIFE SCORE - a half the evaluator could not rate is left out, never counted as 0.
 *
 * John, 4 Oct 2026 ("Leave it out"): fault SC4 in docs/MASTER_BUG_AUDIT_20260220.md.
 * Holds the rule itself (src/shared/lawLived.ts) and that both modes and the
 * server's consensus still use it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { blendLawLived, isScore } from '../src/shared/lawLived';

describe('blendLawLived', () => {
  it('blends both halves by the Law vs Lived split', () => {
    expect(blendLawLived(40, 100)).toBe(70);
    expect(blendLawLived(40, 100, { law: 80, lived: 20 })).toBe(52);
  });

  it('takes the lower half in Conservative mode', () => {
    expect(blendLawLived(40, 100, { law: 50, lived: 50 }, true)).toBe(40);
  });

  it('scores on the half that was rated when the other is missing', () => {
    expect(blendLawLived(80, null)).toBe(80);
    expect(blendLawLived(null, 60)).toBe(60);
    expect(blendLawLived(undefined, 60, { law: 50, lived: 50 }, true)).toBe(60);
    expect(blendLawLived(Number.NaN, 30)).toBe(30);
  });

  it('gives no score when neither half was rated', () => {
    expect(blendLawLived(null, null)).toBe(null);
    expect(blendLawLived(undefined, Number.NaN)).toBe(null);
  });

  it('counts a rated 0 as a score', () => {
    expect(isScore(0)).toBe(true);
    expect(blendLawLived(0, 100)).toBe(50);
  });
});

describe('every scoring path uses the rule', () => {
  it('Standard mode blends with the user split and leaves a missing half out of the category averages', () => {
    const source = readFileSync('src/hooks/useComparison.ts', 'utf8');
    expect(source.includes('blendLawLived(city1Legal, city1Lived, lawLivedRatio, conservativeMode)')).toBe(true);
    // the category averages live in src/api/scoring.ts (tests/standardScoring.test.ts runs them)
    const scoring = readFileSync('src/api/scoring.ts', 'utf8');
    expect(scoring.includes('totalLegalScore / totalLegalWeight')).toBe(true);
    expect(scoring.includes('totalLivedScore / totalLivedWeight')).toBe(true);
  });

  it("Enhanced mode blends by the user's settings and drops a model answer with neither half", () => {
    const source = readFileSync('src/services/llmEvaluators.ts', 'utf8');
    for (const n of [1, 2]) {
      expect(
        source.includes(`blendLawLived(s.city${n}LegalScore, s.city${n}EnforcementScore, scoring.lawLivedRatio, scoring.conservativeMode)`)
      ).toBe(true);
    }
    expect(/LegalScore \+ s\.city\dEnforcementScore\) \/ 2/.test(source)).toBe(false);
  });

  it('the Enhanced model buttons receive the Law vs Lived and Worst-Case settings (SC3)', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const selector = readFileSync('src/components/EnhancedComparison.tsx', 'utf8');
    expect(app.includes('scoring={{ lawLivedRatio, conservativeMode }}')).toBe(true);
    expect(/runSingleEvaluatorBatched\([\s\S]*?\n\s*scoring\s*\);/.test(selector)).toBe(true);
  });

  it("the server's law and enforcement consensus skips models without that half", () => {
    const source = readFileSync('api/judge.ts', 'utf8');
    expect(source.includes("score[field] ?? score.normalizedScore")).toBe(false);
    expect(source.includes("if (typeof value !== 'number' || !Number.isFinite(value)) continue;")).toBe(true);
  });
});
