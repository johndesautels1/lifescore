/**
 * LIFE SCORE - partial results keep each model's own law and enforcement scores (anti-drift).
 *
 * John, 4 Oct 2026 ("Fix both"): when the judge did not answer, the partial
 * results filled every metric's enforcement half with the blended score, and a
 * law score of 0 counted as missing. partialJudgeOutput (src/services/opusJudge.ts)
 * keeps the model's own halves; the blended score stands in only for a missing one.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { partialJudgeOutput } from '../src/services/opusJudge';
import type { EvaluatorResult } from '../src/services/llmEvaluators';

function evaluator(provider: string, scores: Array<Record<string, unknown>>, success = true): EvaluatorResult {
  return { provider, success, scores, latencyMs: 0 } as unknown as EvaluatorResult;
}

describe('partialJudgeOutput', () => {
  it("keeps the model's own law and enforcement halves, including a law score of 0", () => {
    const out = partialJudgeOutput([
      evaluator('gpt-5.4', [
        { metricId: 'pf_01', city: 'city1', normalizedScore: 50, legalScore: 0, enforcementScore: 100 },
        { metricId: 'pf_01', city: 'city2', normalizedScore: 30, legalScore: 20, enforcementScore: 40 },
      ]),
    ]);
    const [c1] = out.city1Consensuses;
    const [c2] = out.city2Consensuses;
    expect([c1.metricId, c1.consensusScore, c1.legalScore, c1.enforcementScore]).toEqual(['pf_01', 50, 0, 100]);
    expect([c2.legalScore, c2.enforcementScore]).toEqual([20, 40]);
  });

  it('uses the blended score only for a half the model did not give', () => {
    const out = partialJudgeOutput([evaluator('gemini-3.1-pro', [{ metricId: 'tr_02', city: 'city1', normalizedScore: 65 }])]);
    expect(out.city1Consensuses[0].legalScore).toBe(65);
    expect(out.city1Consensuses[0].enforcementScore).toBe(65);
  });

  it("takes the first model's score for a metric and skips a failed model with no scores", () => {
    const out = partialJudgeOutput([
      evaluator('claude-sonnet', [], false),
      evaluator('gpt-5.4', [{ metricId: 'pf_01', city: 'city1', normalizedScore: 70 }]),
      evaluator('grok-4', [{ metricId: 'pf_01', city: 'city1', normalizedScore: 10 }]),
    ]);
    expect(out.city1Consensuses.length).toBe(1);
    expect(out.city1Consensuses[0].consensusScore).toBe(70);
    expect(out.city1Consensuses[0].judgeExplanation).toBe('Based on gpt-5.4 evaluation (partial - judge unavailable)');
    expect(out.overallAgreement).toBe(50);
  });

  it('App builds partial results with it', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    expect(app.includes('partialJudgeOutput(Array.from(llmResults.values()))')).toBe(true);
    expect(app.includes('enforcementScore: score.normalizedScore')).toBe(false);
  });
});
