#!/usr/bin/env node
/**
 * Write docs/legal/*.md from src/legal/legalContent.ts (via src/legal/legalMarkdown.ts).
 *
 *   node scripts/build-legal-docs.mjs          write the documents
 *   node scripts/build-legal-docs.mjs --check  exit 1 if any document is stale
 *
 * The four legal source files are compiled in memory with the project's own
 * TypeScript (syntax only), so no build step or extra tool is needed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const legalDir = path.join(root, 'src', 'legal');

/** Load a src/legal module (and its local imports) as CommonJS. */
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const source = readFileSync(path.join(legalDir, `${name}.ts`), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const mod = { exports: {} };
  cache.set(name, mod);
  const localRequire = (spec) => {
    if (spec.startsWith('./')) return load(spec.slice(2).replace(/\.(ts|js)$/, ''));
    return require(spec);
  };
  vm.runInThisContext(`(function (exports, require, module) {${outputText}\n})`)(mod.exports, localRequire, mod);
  return mod.exports;
}

const { LEGAL_DOC_PATHS, legalMarkdown } = load('legalMarkdown');
const check = process.argv.includes('--check');
let stale = 0;
for (const [slug, rel] of Object.entries(LEGAL_DOC_PATHS)) {
  const file = path.join(root, rel);
  const want = legalMarkdown(slug);
  let have = '';
  try {
    have = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  } catch {
    // missing file counts as stale
  }
  if (have === want) continue;
  stale++;
  if (check) console.log(`stale: ${rel}`);
  else {
    writeFileSync(file, want);
    console.log(`wrote: ${rel}`);
  }
}
if (check && stale) process.exit(1);
console.log(check ? 'legal documents are current' : `${stale} document(s) written`);
