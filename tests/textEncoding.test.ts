/**
 * LIFE SCORE - no garbled text (anti-drift).
 *
 * 3 October 2026: five files had been saved after their UTF-8 text was misread
 * as Windows-1252, so the results screen read "âš¡ LIVE - 100 Freedom Metrics"
 * and 173 other emoji and symbols came out as junk. This fails the build if any
 * such run appears again in the app's code.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Windows-1252 code points outside Latin-1, mapped back to their byte. */
const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
  0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
  0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

const SUSPECT =
  /[Â-ô][\u0080-¿ŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™]+/g;

/** True when a run is UTF-8 that was read as Windows-1252 (its bytes decode cleanly). */
function isGarbled(run: string): boolean {
  const bytes: number[] = [];
  for (const ch of run) {
    const c = ch.codePointAt(0) ?? 0;
    const b = c < 0x100 ? c : CP1252[c];
    if (b === undefined) return false;
    bytes.push(b);
  }
  const text = Buffer.from(bytes).toString('utf8');
  return !text.includes('�') && Buffer.byteLength(text, 'utf8') === bytes.length;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(ts|tsx|css|html)$/.test(name)) out.push(path.replace(/\\/g, '/'));
  }
  return out;
}

describe('no garbled text', () => {
  it('no source file holds UTF-8 that was misread as Windows-1252', () => {
    const offenders: string[] = [];
    for (const f of [...sourceFiles('src'), ...sourceFiles('api'), 'index.html']) {
      const runs = (readFileSync(f, 'utf8').match(SUSPECT) ?? []).filter(isGarbled);
      if (runs.length > 0) offenders.push(`${f}: ${runs.slice(0, 3).join(' ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('the checker recognises garbled text and leaves real accents alone', () => {
    expect(isGarbled('âš¡')).toBe(true);
    expect(isGarbled('â€”')).toBe(true);
    expect(isGarbled('Ã©')).toBe(true);
    expect(isGarbled('é')).toBe(false);
    expect(isGarbled('Ãœ')).toBe(true);
  });
});
