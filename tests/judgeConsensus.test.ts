/**
 * LIFE SCORE - what the Enhanced-mode judge is shown (anti-drift).
 *
 * John, 4 Oct 2026: the judge sees all 100 metrics ("Show all 100") — fault
 * SC2 in docs/MASTER_BUG_AUDIT_20260220.md; until then the prompt listed only
 * the first 30, so disagreements on the other 70 were never reviewed.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const judge = readFileSync('api/judge.ts', 'utf8');
const prompt = judge.slice(judge.indexOf('function buildOpusPrompt('), judge.indexOf('function parseOpusResponse('));

describe("the judge's prompt", () => {
  it('lists every metric summary, with no cap', () => {
    expect(prompt.length > 0).toBe(true);
    expect(prompt.includes("${summaries.join('\\n')}")).toBe(true);
    expect(/summaries\.slice\(/.test(prompt)).toBe(false);
  });

  it('skips only metrics no model answered for either city', () => {
    expect(prompt.includes('if (c1.llmScores.length === 0 && c2?.llmScores.length === 0) return;')).toBe(true);
  });
});
