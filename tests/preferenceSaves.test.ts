/**
 * LIFE SCORE - a saved preference is never overwritten by its default on load
 * (anti-drift).
 *
 * The February bug audit listed ML6 ("save effect overwrites with defaults") as
 * open; on 4 Oct 2026 it was still live in WeightPresets (three preferences)
 * and DealbreakersPanel: the save effect ran on the first render, before the
 * stored choices had loaded, and wrote the defaults to the database before the
 * real values (John's console showed every "saved to database" twice). Every
 * component that saves a preference to the database must wait for its load
 * (`hydrated`) and skip unchanged writes.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/** How far above a save call its effect's opening gate may sit. */
const GATE_WINDOW = 20;

describe('preference saves', () => {
  const savers = sourceFiles('src').filter((file) => {
    const text = readFileSync(file, 'utf8');
    return /saveUserPreferenceToDb\(/.test(text) && !/export (async )?function saveUserPreferenceToDb/.test(text);
  });

  it('at least the known components save preferences', () => {
    const names = savers.map((f) => f.replace(/\\/g, '/'));
    expect(names.some((f) => f.endsWith('WeightPresets.tsx'))).toBe(true);
    expect(names.some((f) => f.endsWith('DealbreakersPanel.tsx'))).toBe(true);
  });

  it('every database save waits for the load and skips unchanged values', () => {
    const ungated: string[] = [];
    for (const file of savers) {
      const lines = readFileSync(file, 'utf8').split(/\r?\n/);
      const text = lines.join('\n');
      if (!/setHydrated\(true\)/.test(text)) ungated.push(`${file}: never sets hydrated`);
      lines.forEach((line, i) => {
        if (!/saveUserPreferenceToDb\(/.test(line)) return;
        const before = lines.slice(Math.max(0, i - GATE_WINDOW), i).join('\n');
        if (!/if \(!hydrated\) return;/.test(before)) ungated.push(`${file}:${i + 1}: no hydrated gate`);
        if (!/lastSavedRef\.current/.test(before)) ungated.push(`${file}:${i + 1}: no unchanged-value check`);
      });
    }
    expect(ungated).toEqual([]);
  });
});
