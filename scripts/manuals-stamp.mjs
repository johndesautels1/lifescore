#!/usr/bin/env node
/**
 * LIFE SCORE - record that the written manual sections were reviewed against
 * their code.
 *
 *   npm run manuals:stamp            stamp every section that changed
 *   npm run manuals:stamp -- --check list what would be stamped, change nothing
 *
 * Run it after bringing a section up to date with the code it names (its
 * `<!-- covers: … -->` marker). It writes docs/manuals/coverage.json: each
 * section's files, their fingerprint now, today's date, and the commit the
 * review was made against. Sections that no longer exist are dropped. The
 * automatic update (scripts/manuals-autoupdate.ts, run by CI) stamps the
 * sections it rewrites the same way. See scripts/manualsCoverage.mjs.
 */

import { execFileSync } from 'node:child_process';
import { stampCoverage, writeCoverage } from './manualsCoverage.mjs';

const root = process.cwd();
const checkOnly = process.argv.includes('--check');
const today = new Date().toISOString().slice(0, 10);
let basis = 'unknown';
try {
  basis = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
} catch {
  /* not a git checkout */
}

const { changed, dropped, coverage } = stampCoverage(root, { basis, today });
for (const key of changed) console.log(`${checkOnly ? 'would stamp' : 'stamped'}: ${key}`);
for (const key of dropped) console.log(`${checkOnly ? 'would drop' : 'dropped'}: ${key}`);
if (changed.length === 0 && dropped.length === 0) console.log('Every covered section is stamped and current.');
if (!checkOnly) writeCoverage(root, coverage);
