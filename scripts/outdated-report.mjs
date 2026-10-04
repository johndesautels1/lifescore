/**
 * LIFE SCORE - the libraries a weekly update could not take, as a Markdown table.
 *
 * Reads `npm outdated --json` (written before the update) and lists every package
 * whose latest release is a new major version — the ones `npm update` leaves
 * alone because package.json's range does not allow them. Used by
 * .github/workflows/dependency-updates.yml for the pull request's body.
 *
 *   node scripts/outdated-report.mjs outdated.json
 */

import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'outdated.json';
let data = {};
try {
  const text = readFileSync(file, 'utf8').trim();
  data = text ? JSON.parse(text) : {};
} catch {
  data = {};
}

const major = (version) => {
  const m = /^(\d+)/.exec(String(version ?? ''));
  return m ? Number(m[1]) : null;
};

const rows = Object.entries(data)
  .map(([name, info]) => {
    const entry = Array.isArray(info) ? info[0] : info;
    return { name, current: entry?.current ?? '—', wanted: entry?.wanted ?? '—', latest: entry?.latest ?? '—' };
  })
  .filter((r) => major(r.latest) !== null && major(r.wanted) !== null && major(r.latest) > major(r.wanted))
  .sort((a, b) => a.name.localeCompare(b.name));

if (rows.length === 0) {
  console.log('No new major versions waiting.');
} else {
  console.log('New major versions this update did not take (each needs its own upgrade and testing):\n');
  console.log('| Library | In use | Newest allowed | Newest |');
  console.log('|---|---|---|---|');
  for (const r of rows) console.log(`| \`${r.name}\` | ${r.current} | ${r.wanted} | ${r.latest} |`);
}
