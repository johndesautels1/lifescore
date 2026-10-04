/**
 * LIFE SCORE - an evaluator's number-form reply is read (fault SC6, fixed 4 Oct 2026).
 *
 * With USE_CATEGORY_SCORING off, the evaluators are asked for
 * "city1Legal": 75 (api/evaluate.ts buildBasePrompt). The reader took that
 * field only as a letter grade, so every score was dropped. Tests run with the
 * setting unset, so they exercise exactly that path.
 */

import { describe, expect, it } from 'vitest';
import { parseResponse } from '../api/evaluate';

const reply = (evaluation: Record<string, unknown>) => JSON.stringify({ evaluations: [{ metricId: 'pf_01_cannabis_legal', confidence: 'high', ...evaluation }] });

describe('parseResponse', () => {
  it('reads the numbers the numbers prompt asks for', () => {
    const [score] = parseResponse(reply({ city1Legal: 75, city1Enforcement: 65, city2Legal: 45, city2Enforcement: 40 }), 'claude-sonnet');
    expect(score.city1LegalScore).toBe(75);
    expect(score.city1EnforcementScore).toBe(65);
    expect(score.city2LegalScore).toBe(45);
    expect(score.city2EnforcementScore).toBe(40);
  });

  it('reads numbers written as text, and clamps to 0-100', () => {
    const [score] = parseResponse(reply({ city1Legal: '80', city1Enforcement: 140, city2Legal: -5, city2Enforcement: '30' }), 'claude-sonnet');
    expect(score.city1LegalScore).toBe(80);
    expect(score.city1EnforcementScore).toBe(100);
    expect(score.city2LegalScore).toBe(0);
    expect(score.city2EnforcementScore).toBe(30);
  });

  it('still reads letter grades and the older *Score fields', () => {
    const [letters] = parseResponse(reply({ city1Legal: 'B', city1Enforcement: 'A', city2Legal: 'D', city2Enforcement: 'E' }), 'claude-sonnet');
    expect(letters.city1LegalScore).toBe(75);
    expect(letters.city2EnforcementScore).toBe(0);
    const [named] = parseResponse(reply({ city1LegalScore: 60, city1EnforcementScore: 50, city2LegalScore: 40, city2EnforcementScore: 30 }), 'claude-sonnet');
    expect(named.city1LegalScore).toBe(60);
    expect(named.city2EnforcementScore).toBe(30);
  });

  it('leaves a half it cannot read as null, never 0 or 50', () => {
    const [score] = parseResponse(reply({ city1Legal: 70, city2Legal: 'not a number' }), 'claude-sonnet');
    expect(score.city1LegalScore).toBe(70);
    expect(score.city1EnforcementScore).toBe(null);
    expect(score.city2LegalScore).toBe(null);
  });
});
