/**
 * LIFE SCORE - the Enhanced Gamma report is numbered in the order it is sent (anti-drift).
 *
 * John, 4 Oct 2026 ("Keep order, renumber"): fault GR1 in
 * docs/MASTER_BUG_AUDIT_20260220.md. The prompt told Gamma one section order
 * while its headings ran Section 1, 4, 5, 6, 2, 3, … and its page labels jumped
 * from 8 to 43 and back to 9. Read through the same fact the Gamma Prompts
 * Manual shows (api/shared/manualFacts.ts `gammasections`).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MANUAL_FACTS } from '../api/shared/manualFacts';

const rows = MANUAL_FACTS.gammasections('.')
  .split('\n')
  .filter((line) => /^\| \d+ \|/.test(line))
  .map((line) => line.split('|').map((cell) => cell.trim()));
// cells: ['', sent, writer, heading, pages, '']

describe('the Enhanced report prompt', () => {
  it('sends its sections numbered 1, 2, 3 … in order', () => {
    expect(rows.length >= 12).toBe(true);
    const numbers = rows.map(([, , , heading]) => Number(heading.match(/^SECTION (\d+):/)?.[1]));
    expect(numbers).toEqual(rows.map((_, i) => i + 1));
  });

  it('labels its pages in one run from page 1, with no jump back', () => {
    let next = 1;
    for (const [, , writer, , pages] of rows) {
      if (writer === '`formatSection3CategoryDeepDives`') {
        // five pages per category from pageBase
        const base = Number(readFileSync('src/services/gammaService.ts', 'utf8').match(/const pageBase = (\d+) \+ \(catIndex \* 5\);/)?.[1]);
        expect(base).toBe(next);
        next = base + 6 * 5;
        continue;
      }
      const [first, last] = pages.split('–').map(Number);
      expect(first).toBe(next);
      next = (last || first) + 1;
    }
    expect(next - 1).toBe(82);
  });
});
