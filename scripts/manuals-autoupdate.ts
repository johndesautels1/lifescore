/**
 * LIFE SCORE - bring the written manual sections up to date with the code,
 * automatically.
 *
 *   npx tsx scripts/manuals-autoupdate.ts
 *
 * John, 4 Oct 2026: "design the system if code changes then automatically the
 * manuals update". CI runs this on every push to main, before the tests
 * (.github/workflows/ci.yml). For each written section whose code changed since
 * its last review (scripts/manualsCoverage.mjs), it gives Claude the section,
 * what changed in that code (git diff since the review) and the code as it is
 * now, and asks for the section back with only what the change made untrue or
 * incomplete corrected. A rewrite is accepted only if it keeps the heading, the
 * covers marker and every facts block; the accepted sections are re-stamped. A
 * section it could not update stays unstamped, so tests/manuals.test.ts names it.
 *
 * Without ANTHROPIC_API_KEY it changes nothing and says so; the test then names
 * any stale section for a person to update.
 *
 * Claude is called through the app's one Claude client (api/shared/anthropic.ts).
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { callClaude } from '../api/shared/anthropic.js';
import { AI_MODELS } from '../api/shared/models.js';
import { MANUALS_DIR, coveredSections, readCoverage, staleSections, stampCoverage, writeCoverage } from './manualsCoverage.mjs';

interface StaleSection {
  key: string;
  title: string;
  line: number;
  files: string[];
}

const root = process.cwd();
/** At most this many sections per run (cost guard); the rest stay stale for the next run. */
const MAX_SECTIONS = 25;
/** Code shown per file, and in all, per section. */
const MAX_FILE_CHARS = 40_000;
const MAX_CODE_CHARS = 120_000;
const MAX_DIFF_CHARS = 60_000;

const SYSTEM = [
  'You keep the LIFE SCORE manuals true to the code.',
  'You are given one section of a manual, the code it describes, and what changed in that code since the section was last reviewed.',
  'Return the section with every statement matching the code as it is now.',
  'Rules:',
  '- Keep the first line (the heading) exactly as given.',
  '- Keep the <!-- covers: ... --> line exactly as given.',
  '- Keep every <!-- facts:NAME --> ... <!-- /facts:NAME --> block exactly as given; those are filled from the code automatically.',
  '- Change only what the code change made untrue or incomplete. Keep everything else word for word.',
  '- Write plain English for the manual\'s reader. Never invent a feature, number, price, name or behaviour the code does not show.',
  '- If the change does not affect the section, return it unchanged.',
  'Return only the section\'s markdown, with nothing before or after it.',
].join('\n');

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return '';
  }
}

function summary(line: string): void {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

/** The section's lines: its heading down to the next heading of the same or a higher level. */
function sectionBounds(lines: string[], headingLine: number): { start: number; end: number } {
  const start = headingLine - 1;
  const level = (lines[start].match(/^#+/) ?? ['#'])[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const h = lines[i].match(/^(#{1,6})\s/);
    if (h && h[1].length <= level) {
      end = i;
      break;
    }
  }
  return { start, end };
}

/** A rewrite is accepted only if it kept the heading, the covers line and every facts marker. */
function keepsStructure(original: string, rewritten: string): boolean {
  const lines = original.split('\n');
  if (rewritten.split('\n')[0].trim() !== lines[0].trim()) return false;
  const covers = lines.find((l) => /<!--\s*covers:/.test(l));
  if (covers && !rewritten.includes(covers.trim())) return false;
  for (const marker of original.match(/<!-- \/?facts:[a-z]+ -->/g) ?? []) if (!rewritten.includes(marker)) return false;
  return true;
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    summary('Manuals: no ANTHROPIC_API_KEY, so written sections are not updated automatically. tests/manuals.test.ts names any section whose code changed.');
    return;
  }
  const { stale, recorded } = staleSections(root) as { stale: StaleSection[]; recorded: Record<string, { basis?: string; reviewed?: string }> };
  if (stale.length === 0) {
    summary('Manuals: every written section matches its code.');
    return;
  }

  const head = git(['rev-parse', 'HEAD']).trim() || 'unknown';
  const failed = new Set<string>();
  const updated: string[] = [];

  for (const [i, section] of stale.entries()) {
    if (i >= MAX_SECTIONS) {
      failed.add(section.key);
      continue;
    }
    const manual = section.key.split('#')[0];
    const path = join(root, MANUALS_DIR, manual);
    const text = readFileSync(path, 'utf8');
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text.split(/\r?\n/);
    // Find the section afresh: an earlier rewrite in the same manual may have moved it.
    const here = (coveredSections(text, manual) as StaleSection[]).find((s) => s.key === section.key);
    if (!here) {
      failed.add(section.key);
      continue;
    }
    const { start, end } = sectionBounds(lines, here.line);
    const original = lines.slice(start, end).join('\n').replace(/\s+$/, '');

    const basis = recorded[section.key]?.basis;
    const diff = basis && basis !== 'unknown' ? git(['diff', `${basis}..HEAD`, '--', ...section.files]).slice(0, MAX_DIFF_CHARS) : '';
    let budget = MAX_CODE_CHARS;
    const code: string[] = [];
    for (const file of section.files) {
      let body = '';
      try {
        body = readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n');
      } catch {
        body = '(this file no longer exists)';
      }
      const shown = body.slice(0, Math.min(MAX_FILE_CHARS, budget));
      budget -= shown.length;
      code.push(`--- ${file}${shown.length < body.length ? ' (shortened)' : ''} ---\n${shown}`);
      if (budget <= 0) break;
    }

    const prompt = [
      `MANUAL: ${manual}`,
      'SECTION:',
      '<<<',
      original,
      '>>>',
      '',
      diff
        ? `WHAT CHANGED IN THE CODE SINCE THE LAST REVIEW (${recorded[section.key]?.reviewed ?? 'unknown date'}):\n<<<\n${diff}\n>>>`
        : 'This section has no earlier review to compare with: check every statement against the code below.',
      '',
      'THE CODE AS IT IS NOW:',
      ...code,
    ].join('\n');

    const reply = await callClaude({
      model: AI_MODELS.writer.id,
      maxTokens: 16_000,
      effort: 'medium',
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      timeoutMs: 300_000,
      label: 'manuals-autoupdate',
    });
    if (!reply.ok) {
      failed.add(section.key);
      summary(`- ${section.key}: Claude call failed (${reply.message}); left for a person.`);
      continue;
    }
    const rewritten = reply.text.trim().replace(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/, '$1').trim();
    if (!keepsStructure(original, rewritten)) {
      failed.add(section.key);
      summary(`- ${section.key}: the rewrite dropped the heading, covers line or a facts block; left for a person.`);
      continue;
    }
    if (rewritten !== original) {
      const next = [...lines.slice(0, start), ...rewritten.split('\n'), ...(end < lines.length ? [''] : []), ...lines.slice(end)];
      writeFileSync(path, next.join(eol).replace(new RegExp(`(${eol}){3,}`, 'g'), `${eol}${eol}`));
      updated.push(section.key);
      summary(`- ${section.key}: updated.`);
    } else {
      summary(`- ${section.key}: unaffected by the change; re-stamped.`);
    }
  }

  // Stamp what was reviewed; anything that failed keeps its old record (still stale).
  const { coverage } = stampCoverage(root, { basis: head, today: new Date().toISOString().slice(0, 10) });
  const previous = readCoverage(root).sections;
  for (const key of failed) {
    if (previous[key]) coverage.sections[key] = previous[key];
    else delete coverage.sections[key];
  }
  writeCoverage(root, coverage);
  summary(`Manuals: ${updated.length} section(s) rewritten, ${stale.length - failed.size - updated.length} re-stamped unchanged, ${failed.size} left for a person.`);
}

main().catch((error: unknown) => {
  console.error('[manuals-autoupdate]', error);
  process.exit(1);
});
