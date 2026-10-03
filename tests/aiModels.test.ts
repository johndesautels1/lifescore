/**
 * LIFE SCORE - AI model + Claude connection guards (anti-drift).
 *
 * The July 2026 model refresh edited ten files by hand, missed some, and kept a
 * price table that was never true. These tests keep model ids and prices in ONE
 * file (api/shared/models.ts) and each vendor's calls in ONE shared connection
 * (api/shared/anthropic.ts, openai.ts, gemini.ts, xai.ts, perplexity.ts).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AI_MODELS, PANEL_SEATS, modelForSeat, type PanelSeat } from '../api/shared/models';
import { extractJsonObject } from '../api/shared/anthropic';
import { BACKUP_VOICES } from '../api/shared/openai';
import { API_PRICING } from '../src/utils/costCalculator-pricing';
import { calculateModelCost } from '../src/utils/costCalculator-functions';

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

const ALL = [...sourceFiles('api'), ...sourceFiles('src')];

describe('model ids live in one place', () => {
  it('no file but the registry (and the historical price table) names a dated Claude model', () => {
    const allowed = new Set(['api/shared/models.ts', 'src/utils/costCalculator-pricing.ts']);
    const offenders = ALL.filter(
      (f) => !allowed.has(f) && /claude-(opus|sonnet|haiku|fable|mythos)-\d/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no file but the Claude connection calls api.anthropic.com', () => {
    const offenders = ALL.filter(
      (f) => f !== 'api/shared/anthropic.ts' && readFileSync(f, 'utf8').includes('api.anthropic.com'),
    );
    expect(offenders).toEqual([]);
  });

  it('every current model carries its published price, and only the registry states it', () => {
    for (const model of Object.values(AI_MODELS)) {
      expect(model.inputPerM, model.id).toBeGreaterThan(0);
      expect(model.outputPerM, model.id).toBeGreaterThan(0);
      // the historical price table must not restate a current model (two sources would drift)
      expect(Object.keys(API_PRICING), model.id).not.toContain(model.id);
    }
    const judge = calculateModelCost(AI_MODELS.judge, 1_000_000, 1_000_000);
    expect(judge.totalCost).toBeCloseTo(AI_MODELS.judge.inputPerM + AI_MODELS.judge.outputPerM, 6);
  });

  it('every panel seat maps to a registered model', () => {
    for (const seat of Object.keys(PANEL_SEATS) as PanelSeat[]) {
      expect(modelForSeat(seat).id, seat).toBeTruthy();
    }
  });

  it('only the shared connections call the AI vendors (text, and the OpenAI voice back-up)', () => {
    const owners: Array<[RegExp, string]> = [
      [/api\.openai\.com/, 'api/shared/openai.ts'],
      [/generativelanguage\.googleapis\.com/, 'api/shared/gemini.ts'],
      [/api\.x\.ai\/v1\/(responses|chat\/completions)/, 'api/shared/xai.ts'],
      [/api\.perplexity\.ai/, 'api/shared/perplexity.ts'],
    ];
    const offenders: string[] = [];
    for (const f of ALL) {
      const text = readFileSync(f, 'utf8');
      for (const [pattern, owner] of owners) if (f !== owner && pattern.test(text)) offenders.push(`${f} → ${pattern}`);
    }
    expect(offenders).toEqual([]);
  });

  it('each character keeps the same OpenAI back-up voice', () => {
    expect(BACKUP_VOICES).toEqual({ olivia: 'nova', emilia: 'shimmer', cristiano: 'onyx' });
  });
});

describe('extractJsonObject', () => {
  it('reads bare, fenced and wrapped JSON', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
    expect(extractJsonObject('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(extractJsonObject('Here you go: {"a":3} — done')).toEqual({ a: 3 });
  });

  it('returns null when there is no object', () => {
    expect(extractJsonObject('no json here')).toBeNull();
    expect(extractJsonObject('{ broken')).toBeNull();
  });
});
