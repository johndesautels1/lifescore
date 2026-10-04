#!/usr/bin/env node
/**
 * Every file the built page loads at start must be in the service worker's
 * precache list, or the installed app cannot start offline.
 *
 * Why: vite.config.ts names the app-shell files by pattern (globPatterns). On
 * 4 Oct 2026 Vite 8's bundler (Rolldown) added a start-up file the patterns did
 * not name (rolldown-runtime-*.js), and nothing failed. This reads the build's
 * own output instead of a hand-kept list, so a new start-up file, from any
 * bundler change, fails here.
 *
 * It also checks the other way: every named bundle in globPatterns (app-data-*,
 * react-vendor-* …) still matches a precached file. And it checks that the start
 * page itself is NOT precached and that page loads go to the network first, so
 * a release can never be shadowed by the previous one's start page.
 *
 * Run from the repository root after `vite build`:
 * `node scripts/check-precache-shell.mjs` (exit 1 on a gap).
 */
import { readFileSync } from 'node:fs';

const DIST = 'dist';

/** @param {string} file @returns {string} */
function read(file) {
  try {
    return readFileSync(`${DIST}/${file}`, 'utf8');
  } catch (error) {
    console.error(`${DIST}/${file} is missing: run \`vite build\` first.`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const html = read('index.html');
const sw = read('sw.js');

// Scripts, module preloads and stylesheets the page names under /assets/.
const startFiles = [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map((m) => m[1]);
if (startFiles.length === 0) {
  console.error('dist/index.html names no /assets/ files; the check cannot run.');
  process.exit(1);
}

// workbox writes each precache entry as {url:"assets/…",revision:…} in sw.js.
const missing = startFiles.filter((file) => !sw.includes(`url:"${file}"`));

if (missing.length > 0) {
  console.error('Loaded at start but not precached (add a pattern to globPatterns in vite.config.ts):');
  for (const file of missing) console.error(`  ${file}`);
  process.exit(1);
}

// The other way round: each named bundle pattern in globPatterns ('**/app-data-*.js')
// must still match a precached file. One that matches nothing means a chunk was
// renamed or merged and the offline copy silently lost it.
const config = readFileSync('vite.config.ts', 'utf8');
const globLine = config.match(/globPatterns:\s*\[([^\]]+)\]/);
if (!globLine) {
  console.error('vite.config.ts: globPatterns not found; the check cannot run.');
  process.exit(1);
}
const stems = [...globLine[1].matchAll(/'\*\*\/([a-z-]+)-\*\.(?:js|css)'/g)].map((m) => m[1]);
const unmatched = stems.filter((stem) => !new RegExp(`url:"assets/${stem}-[A-Za-z0-9_-]+\\.(?:js|css)"`).test(sw));
if (stems.length === 0 || unmatched.length > 0) {
  console.error('globPatterns names bundles the build no longer makes:', unmatched.length > 0 ? unmatched.join(', ') : '(no bundle patterns found)');
  process.exit(1);
}

// The start page itself must NOT be precached, and navigations must go to the
// network first: a stored index.html outlives a release and asks for screen
// files the new release replaced (the judge page crash of 4 Oct 2026).
if (sw.includes('url:"index.html"')) {
  console.error('index.html is precached: after a release the service worker would serve the old page.');
  process.exit(1);
}
if (!/(mode\s*===?\s*["']navigate["']|["']navigate["']\s*===?\s*[\w$]+\.mode)[\s\S]{0,200}NetworkFirst/.test(sw)) {
  console.error('No network-first rule for page navigations in dist/sw.js.');
  process.exit(1);
}

console.log(`All ${startFiles.length} start-up files are precached:`);
for (const file of startFiles) console.log(`  ${file}`);
console.log(`Every named bundle pattern matches a precached file: ${stems.join(', ')}`);
console.log('The start page is not precached; page navigations go to the network first.');
