/**
 * LIFE SCORE - which code each written manual section describes, and whether that
 * code has changed since the section was last reviewed.
 *
 * John, 4 Oct 2026: "if code changes then automatically the manuals update".
 * Facts the code defines are written into the manuals as they are read
 * (api/shared/manualFacts.ts). The written explanations around them carry a marker
 * under their heading naming the code they explain:
 *
 *   ## Comparing two cities
 *   <!-- covers: src/components/CitySelector.tsx, api/evaluate.ts -->
 *
 * docs/manuals/coverage.json records, per section, a fingerprint of those files at
 * the last review. tests/manuals.test.ts fails when the code has changed since, so
 * the section is brought up to date in the same push (by hand, or by the
 * manual-update job), then re-stamped with `npm run manuals:stamp`.
 *
 * One implementation, used by the stamp script and the test.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const MANUALS_DIR = 'docs/manuals';
export const COVERAGE_FILE = 'docs/manuals/coverage.json';

const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
/** A covers marker counts only on a line of its own (one quoted inside a sentence is just text). */
const COVERS = /^\s*<!--\s*covers:\s*([^>]*?)\s*-->\s*$/;

/** A heading as a stable key part: lower case, words joined by hyphens. */
export function slug(text) {
  return text
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The manual files (markdown), sorted. */
export function manualFiles(root) {
  return readdirSync(join(root, MANUALS_DIR))
    .filter((name) => name.endsWith('.md'))
    .sort();
}

/**
 * Every section of a manual that names its code: key, heading, files, line.
 * A covers marker belongs to the nearest heading above it.
 */
export function coveredSections(markdown, manual) {
  const sections = [];
  const seen = new Map();
  let heading = null;
  markdown.split(/\r?\n/).forEach((line, i) => {
    const h = line.match(HEADING);
    if (h) {
      const base = `${manual}#${slug(h[2])}`;
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      heading = { key: count > 1 ? `${base}-${count}` : base, title: h[2], line: i + 1 };
      return;
    }
    const c = line.match(COVERS);
    if (c && heading) {
      const files = c[1]
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      sections.push({ key: heading.key, title: heading.title, line: heading.line, files });
    }
  });
  return sections;
}

/** Fingerprint of files as they are now (line endings normalised, so Windows and Linux agree). */
export function fingerprint(root, files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n');
    } catch {
      text = `\u0000missing:${file}`;
    }
    hash.update(`${file}\n${text}\n`);
  }
  return hash.digest('hex');
}

/** The recorded reviews: { version, sections: { key: { files, hash, reviewed } } }. */
export function readCoverage(root) {
  try {
    const data = JSON.parse(readFileSync(join(root, COVERAGE_FILE), 'utf8'));
    return { version: 1, sections: data.sections ?? {} };
  } catch {
    return { version: 1, sections: {} };
  }
}

/** Every covered section across the manuals, with its current fingerprint. */
export function currentCoverage(root) {
  return manualFiles(root).flatMap((manual) =>
    coveredSections(readFileSync(join(root, MANUALS_DIR, manual), 'utf8'), manual).map((section) => ({
      ...section,
      hash: fingerprint(root, section.files),
    })),
  );
}

/**
 * Sections whose code changed since their last review (or that were never
 * stamped, or whose list of files changed), and recorded sections that no
 * longer exist.
 */
export function staleSections(root) {
  const recorded = readCoverage(root).sections;
  const current = currentCoverage(root);
  const stale = current.filter((s) => {
    const r = recorded[s.key];
    return !r || r.hash !== s.hash || JSON.stringify([...r.files].sort()) !== JSON.stringify([...s.files].sort());
  });
  const keys = new Set(current.map((s) => s.key));
  const orphaned = Object.keys(recorded).filter((key) => !keys.has(key));
  return { stale, orphaned, recorded };
}

/**
 * Record every covered section as reviewed now: its files, their fingerprint,
 * today's date, and `basis` — the commit the review was made against, so the
 * automatic update can show exactly what changed since (git diff basis..HEAD).
 * Unchanged sections keep their record; sections no longer in the manuals drop.
 */
export function stampCoverage(root, { basis, today }) {
  const recorded = readCoverage(root).sections;
  const next = {};
  const changed = [];
  for (const section of currentCoverage(root)) {
    const before = recorded[section.key];
    const same =
      before && before.hash === section.hash && JSON.stringify([...before.files].sort()) === JSON.stringify([...section.files].sort());
    next[section.key] = same ? before : { files: section.files, hash: section.hash, reviewed: today, basis };
    if (!same) changed.push(section.key);
  }
  const dropped = Object.keys(recorded).filter((key) => !(key in next));
  const sections = Object.fromEntries(Object.keys(next).sort().map((key) => [key, next[key]]));
  return { changed, dropped, coverage: { version: 1, sections } };
}

/** Write the record. */
export function writeCoverage(root, coverage) {
  writeFileSync(join(root, COVERAGE_FILE), `${JSON.stringify(coverage, null, 2)}\n`);
}
