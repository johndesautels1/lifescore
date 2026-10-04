/**
 * LIFE SCORE - the manuals can never state what the code no longer does
 * (anti-drift).
 *
 * John, 4 Oct 2026: "design the system if code changes then automatically the
 * manuals update". Three holds:
 * 1. One source. The admin panel serves docs/manuals/ (api/emilia/manuals.ts);
 *    the embedded copies that had drifted are gone and may not return.
 * 2. Code facts are generated. Every `<!-- facts:… -->` block names a fact
 *    api/shared/manualFacts.ts provides, and every function that serves the
 *    manuals carries the files those facts read.
 * 3. Written sections follow their code. Each `<!-- covers: … -->` file exists,
 *    and when one changes after the section's last review
 *    (docs/manuals/coverage.json) this fails until the section is brought up to
 *    date and re-stamped (`npm run manuals:stamp`).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MANUAL_FACTS, factBlocksIn, fillManualFacts } from '../api/shared/manualFacts';
import { MANUALS_DIR, coveredSections, manualFiles, readCoverage, staleSections } from '../scripts/manualsCoverage.mjs';

const root = process.cwd();
const manualsServer = readFileSync(join(root, 'api/emilia/manuals.ts'), 'utf8');
const manuals = manualFiles(root).map((name) => ({ name, text: readFileSync(join(root, MANUALS_DIR, name), 'utf8') }));

describe('one source', () => {
  it('every manual the admin panel serves exists in docs/manuals', () => {
    const block = manualsServer.slice(manualsServer.indexOf('const MANUAL_FILES'), manualsServer.indexOf('};', manualsServer.indexOf('const MANUAL_FILES')));
    const files = [...block.matchAll(/:\s*'([A-Z_]+\.md)'/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThan(6);
    for (const file of files) expect(existsSync(join(root, MANUALS_DIR, file)), file).toBe(true);
  });

  it('the manuals server holds no embedded copy of a manual', () => {
    expect(manualsServer).not.toContain('EMBEDDED_MANUALS');
    expect(/`#\s+[A-Z]/.test(manualsServer)).toBe(false);
  });

  it('the manuals server writes in the code facts and carries the files they read', () => {
    expect(manualsServer).toContain('fillManualFacts(source)');
    const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as { functions: Record<string, { includeFiles?: string }> };
    for (const fn of ['api/emilia/manuals.ts', 'api/emilia/message.ts', 'api/olivia/chat.ts']) {
      const include = config.functions[fn]?.includeFiles ?? '';
      for (const part of ['docs/**', 'api/**', 'src/**', 'supabase/**', 'tests/**', '.github/**', 'vercel.json', '.env.example']) {
        expect(include, `${fn} carries ${part}`).toContain(part);
      }
    }
  });
});

describe('code facts', () => {
  it('every fact block a manual uses is one the code provides', () => {
    const unknown = manuals.flatMap(({ name, text }) => factBlocksIn(text).filter((block) => !(block in MANUAL_FACTS)).map((b) => `${name}: ${b}`));
    expect(unknown).toEqual([]);
  });

  it('every fact renders from the repository', () => {
    for (const [name, render] of Object.entries(MANUAL_FACTS)) {
      const out = render(root);
      expect(out.length, name).toBeGreaterThan(40);
      expect(out, name).not.toContain('could not be read');
    }
  });

  it('filling keeps the markers, so the next fill finds them again', () => {
    const filled = fillManualFacts('a\n<!-- facts:plans -->\nold\n<!-- /facts:plans -->\nb', root);
    expect(filled).toContain('<!-- facts:plans -->');
    expect(filled).toContain('<!-- /facts:plans -->');
    expect(filled).not.toContain('\nold\n');
    expect(fillManualFacts(filled, root)).toBe(filled);
  });
});

describe('written sections follow their code', () => {
  it('every file a section covers exists', () => {
    const missing = manuals.flatMap(({ name, text }) =>
      coveredSections(text, name).flatMap((s) => s.files.filter((f: string) => !existsSync(join(root, f))).map((f: string) => `${s.key}: ${f}`)),
    );
    expect(missing).toEqual([]);
  });

  it('no section describes code that changed after its last review', () => {
    const { stale, orphaned, recorded } = staleSections(root);
    const messages = stale.map((s: { key: string; files: string[] }) => {
      const r = recorded[s.key];
      return r
        ? `${s.key} covers ${s.files.join(', ')}, which changed since its review on ${r.reviewed}: bring the section up to date, then run npm run manuals:stamp`
        : `${s.key} has never been stamped: review it against ${s.files.join(', ')}, then run npm run manuals:stamp`;
    });
    expect([...messages, ...orphaned.map((k: string) => `${k} is in coverage.json but no longer in the manuals: run npm run manuals:stamp`)]).toEqual([]);
  });

  it('the record is readable', () => {
    expect(readCoverage(root).version).toBe(1);
  });
});
