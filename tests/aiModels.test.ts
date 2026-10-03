/**
 * LIFE SCORE - AI model + Claude connection guards (anti-drift).
 *
 * The July 2026 model refresh edited ten files by hand, missed some, and kept a
 * price table that was never true. These tests keep model ids in ONE file
 * (api/shared/models.ts) and Claude calls in ONE file (api/shared/anthropic.ts).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { AI_MODELS } from '../api/shared/models';
import { extractJsonObject } from '../api/shared/anthropic';
import { API_PRICING } from '../src/utils/costCalculator-pricing';

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

  it('every current model has a price, read from the registry', () => {
    for (const model of Object.values(AI_MODELS)) {
      const row = (API_PRICING as Record<string, { input?: number; output?: number }>)[model.id];
      expect(row, model.id).toBeDefined();
      expect(row.input).toBe(model.inputPerM);
      expect(row.output).toBe(model.outputPerM);
    }
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
