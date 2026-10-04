/**
 * LIFE SCORE - the facts in the manuals, written from the code every time a
 * manual is read.
 *
 * John, 4 Oct 2026: "we need to design the system if code changes then
 * automatically the manuals update". Everything a manual states that the code
 * itself defines — the API routes and who may call them, the settings, plans,
 * prices and allowances, AI models, the 100 metrics, database tables, scheduled
 * jobs, function time limits, components, hooks, services and the anti-drift
 * tests — sits in the manual as a marked block:
 *
 *   <!-- facts:routes -->            (anything here is replaced)
 *   <!-- /facts:routes -->
 *
 * fillManualFacts() replaces each block with a table built from the deployed
 * files and modules, so a manual opened in the admin panel, or read by Emilia,
 * can never state a fact the code no longer has. The written explanations
 * around the blocks are kept current by docs/manuals/coverage.json (each section
 * names the code it describes; tests/manuals.test.ts fails when that code
 * changes until the section is reviewed and stamped).
 *
 * Reads files under the working directory: the deployment root on Vercel (the
 * functions that use this ship the folders in vercel.json includeFiles), the
 * repository in tests.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TIER_LIMITS, TIER_PRICING, USER_TIERS, type TierLimits } from './plans.js';
import { AI_MODELS } from './models.js';
import { ALL_METRICS, CATEGORIES } from './metrics-data.js';

// ============================================================================
// FILE HELPERS
// ============================================================================

function read(root: string, path: string): string | null {
  try {
    return readFileSync(join(root, path), 'utf8');
  } catch {
    return null;
  }
}

/** Files directly in, or under, a folder, repository-relative and sorted. */
function list(root: string, dir: string, pattern: RegExp, recursive: boolean): string[] {
  let names: string[];
  try {
    names = readdirSync(join(root, dir));
  } catch {
    return [];
  }
  return names
    .flatMap((name) => {
      const rel = `${dir}/${name}`;
      let isDir = false;
      try {
        isDir = statSync(join(root, rel)).isDirectory();
      } catch {
        return [];
      }
      if (isDir) return recursive ? list(root, rel, pattern, true) : [];
      return pattern.test(name) ? [rel] : [];
    })
    .sort();
}

/** First meaningful line of a file's opening comment (product prefix removed). */
function summaryOf(text: string): string {
  const head = text.match(/^\s*\/\*\*?([\s\S]*?)\*\//);
  if (!head) return '';
  const line = head[1]
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*\*\s?/, '').trim())
    .find((l) => l.length > 0);
  return (line ?? '').replace(/^LIFE SCORE(™)?\s*[-–—:]\s*/i, '').trim();
}

/** A markdown table. Cells may not contain a bare pipe or a line break. */
function table(head: string[], rows: string[][]): string {
  const cell = (c: string) => c.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  return [
    `| ${head.map(cell).join(' | ')} |`,
    `|${head.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n');
}

const code = (s: string) => `\`${s}\``;

// ============================================================================
// THE FACTS
// ============================================================================

/** Who may call a route, read from its code. */
function routeAccess(text: string): string {
  if (/requireAdmin\(/.test(text)) return 'Admins';
  if (/requireComparisonGrant\(/.test(text)) return 'Signed in + a paid comparison grant';
  const feature = text.match(/requireFeature\([^,]+,[^,]+,\s*['"`]?([A-Za-z]+)/);
  if (feature) return `Signed in + plan feature ${code(feature[1])}`;
  if (/requireFeature\(/.test(text)) return 'Signed in + a plan feature';
  if (/constructEvent\(|verifyReplicateWebhook|verifyWebhook/.test(text)) return 'Signed webhook';
  if (/CRON_SECRET/.test(text)) return 'Scheduled job (CRON_SECRET)';
  if (/requireAuth\(/.test(text)) return 'Signed in';
  return 'No sign-in (checks its own input)';
}

/** HTTP methods a route answers, read from its code. */
function routeMethods(text: string): string {
  const fromCors = text.match(/methods:\s*['"`]([A-Z, ]+)['"`]/);
  const set = new Set<string>();
  if (fromCors) for (const m of fromCors[1].split(',')) if (m.trim() && m.trim() !== 'OPTIONS') set.add(m.trim());
  for (const m of text.matchAll(/req\.method\s*[!=]==\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/g)) set.add(m[1]);
  return set.size ? [...set].sort().join(', ') : 'GET';
}

function factRoutes(root: string): string {
  const files = list(root, 'api', /\.ts$/, true).filter((f) => !f.startsWith('api/shared/'));
  const rows = files.map((file) => {
    const text = read(root, file) ?? '';
    return [code(`/${file.replace(/\.ts$/, '')}`), routeMethods(text), routeAccess(text), summaryOf(text)];
  });
  return table(['Route', 'Methods', 'Who may call it', 'What it does'], rows);
}

function factEnv(root: string): string {
  const text = read(root, '.env.example') ?? '';
  const rows: string[][] = [];
  let section = '';
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const heading = line.match(/^#\s+([A-Z][A-Z0-9 &/().,-]+?)(?:\s+[-–(].*)?$/);
    if (heading && /^#\s*-{10,}/.test(lines[i - 1] ?? '')) section = heading[1].trim();
    const setting = line.match(/^(#\s*)?([A-Z][A-Z0-9_]+)=(.*)$/);
    if (!setting) return;
    const comment = setting[3].includes('#') ? setting[3].slice(setting[3].indexOf('#') + 1).trim() : '';
    rows.push([code(setting[2]), setting[1] ? 'Optional' : 'Set it', comment || section]);
  });
  return table(['Setting', 'Needed', 'What it is for'], rows);
}

/** One row per plan feature, one column per plan. */
function factPlans(): string {
  const show = (v: TierLimits[keyof TierLimits]) => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v === -1 ? 'Unlimited' : String(v));
  const features = Object.keys(TIER_LIMITS.free) as Array<keyof TierLimits>;
  const head = ['', ...USER_TIERS.map((t) => TIER_PRICING[t].name)];
  const rows: string[][] = [
    ['Price per month', ...USER_TIERS.map((t) => `$${TIER_PRICING[t].monthly}`)],
    ['Price per year', ...USER_TIERS.map((t) => `$${TIER_PRICING[t].annual}`)],
    ...features.map((f) => [code(f), ...USER_TIERS.map((t) => show(TIER_LIMITS[t][f]))]),
  ];
  return `${table(head, rows)}\n\nAllowances are per month; -1 in the code means unlimited, 0 means not included. Source: ${code('api/shared/plans.ts')}.`;
}

function factModels(): string {
  const rows = Object.entries(AI_MODELS).map(([job, m]) => [
    code(job),
    m.name,
    code(m.id),
    m.vendor,
    `$${m.inputPerM} in / $${m.outputPerM} out per million tokens`,
  ]);
  return `${table(['Job', 'Model', 'API id', 'Vendor', 'Price'], rows)}\n\nSource: ${code('api/shared/models.ts')} (one place: change a job's model there and every caller follows).`;
}

function factMetrics(): string {
  const parts: string[] = [];
  for (const category of CATEGORIES) {
    const metrics = ALL_METRICS.filter((m) => m.categoryId === category.id);
    parts.push(`**${category.name}** — ${metrics.length} metrics`);
    parts.push(table(['Id', 'Metric', 'What it measures'], metrics.map((m) => [code(m.id), m.name, m.description])));
  }
  return `${ALL_METRICS.length} metrics in ${CATEGORIES.length} categories. Source: ${code('api/shared/metrics-data.ts')}.\n\n${parts.join('\n\n')}`;
}

function factCategories(): string {
  const rows = CATEGORIES.map((c) => [c.name, `${c.weight}%`, String(ALL_METRICS.filter((m) => m.categoryId === c.id).length), c.description]);
  return `${table(['Category', 'Default weight', 'Metrics', 'What it covers'], rows)}\n\nThe default weights add up to ${CATEGORIES.reduce((sum, c) => sum + c.weight, 0)}%. You can change them before a comparison (Customize Priorities).`;
}

function factTables(root: string): string {
  // Migrations in file order: a CREATE TABLE adds a table, a DROP TABLE removes it.
  const created = new Map<string, string>();
  for (const file of list(root, 'supabase/migrations', /\.sql$/, false)) {
    const text = (read(root, file) ?? '').replace(/--.*$/gm, '');
    const events = [
      ...[...text.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)].map((m) => ({ at: m.index ?? 0, name: m[1].toLowerCase(), drop: false })),
      ...[...text.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)].map((m) => ({ at: m.index ?? 0, name: m[1].toLowerCase(), drop: true })),
    ].sort((a, b) => a.at - b.at);
    for (const e of events) {
      if (e.drop) created.delete(e.name);
      else if (!created.has(e.name)) created.set(e.name, file.replace('supabase/migrations/', ''));
    }
  }
  const rows = [...created.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, file]) => [code(name), file]);
  return `${table(['Table', 'Created by migration'], rows)}\n\nFrom ${code('supabase/migrations/')}. Every public table has row-level security.`;
}

/**
 * The columns the app's code is written against: for each table in the
 * `Database` type (src/types/database.ts), the fields of its Row type, found in
 * src/types/database*.ts. Columns the live database adds beyond these are not
 * read by typed code; columns listed here that the live database lacks fail.
 */
export function typedColumns(root: string): Map<string, string[]> {
  const files = list(root, 'src/types', /^database[^/]*\.ts$/, false);
  const text = files.map((file) => read(root, file) ?? '').join('\n');
  const bodies = new Map<string, string>();
  for (const m of text.matchAll(/export\s+interface\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)\n\}/g)) bodies.set(m[1], m[2]);
  const tables = new Map<string, string[]>();
  for (const m of text.matchAll(/^\s+([a-z_][a-z0-9_]*):\s*\{\s*Row:\s*([A-Za-z0-9_]+);/gm)) {
    const body = bodies.get(m[2]) ?? '';
    tables.set(
      m[1],
      [...body.matchAll(/^\s{2}([a-z_][a-z0-9_]*)\??\s*:/gm)].map((f) => f[1]),
    );
  }
  return tables;
}

function factColumns(root: string): string {
  const rows = [...typedColumns(root).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, columns]) => [code(name), columns.join(', ')]);
  return `${table(['Table', 'Columns the code reads and writes'], rows)}\n\nFrom the ${code('Database')} type in ${code('src/types/database.ts')} and the row types in ${code('src/types/database-*.ts')}.`;
}

/** For each table the migrations leave, the code files that name it (as a quoted string). */
function factTableUsage(root: string): string {
  const tables = factTables(root)
    .split('\n')
    .map((line) => line.match(/^\| `([a-z_][a-z0-9_]*)` \|/)?.[1])
    .filter((name): name is string => Boolean(name));
  const files = [...list(root, 'api', /\.ts$/, true), ...list(root, 'src', /\.(ts|tsx)$/, true)];
  const texts = files.map((file) => ({ file, text: read(root, file) ?? '' }));
  const rows = tables.map((name) => {
    const quoted = new RegExp(`['"\`]${name}['"\`]`);
    const users = texts.filter((t) => quoted.test(t.text)).map((t) => code(t.file));
    return [code(name), users.length ? users.join(', ') : '(not named in the code)'];
  });
  return table(['Table', 'Code that reads or writes it'], rows);
}

function factJobs(root: string): string {
  const rows: string[][] = [];
  try {
    const config = JSON.parse(read(root, 'vercel.json') ?? '{}') as { crons?: Array<{ path: string; schedule: string }> };
    for (const c of config.crons ?? []) rows.push(['Vercel cron', code(c.path), code(c.schedule)]);
  } catch {
    /* no crons */
  }
  for (const file of list(root, '.github/workflows', /\.ya?ml$/, false)) {
    const text = read(root, file) ?? '';
    const name = text.match(/^name:\s*(.+)$/m)?.[1].trim() ?? file;
    const when: string[] = [];
    for (const m of text.matchAll(/cron:\s*["']([^"']+)["']/g)) when.push(`schedule ${code(m[1])}`);
    if (/^\s*push:/m.test(text)) when.push('every push');
    if (/^\s*pull_request:/m.test(text)) when.push('pull requests');
    if (/workflow_dispatch:/.test(text)) when.push('on demand');
    rows.push(['GitHub Actions', `${name} (${code(file.replace('.github/workflows/', ''))})`, when.join(', ')]);
  }
  return table(['Runs on', 'Job', 'When'], rows);
}

function factFunctions(root: string): string {
  try {
    const config = JSON.parse(read(root, 'vercel.json') ?? '{}') as {
      functions?: Record<string, { maxDuration?: number; includeFiles?: string }>;
    };
    const rows = Object.entries(config.functions ?? {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fn, c]) => [
        code(fn),
        c.maxDuration ? `${c.maxDuration} s` : 'default',
        !c.includeFiles ? '' : c.includeFiles.includes('src/**') ? 'the whole app (search and manual facts)' : 'shared server code',
      ]);
    return `${table(['Function', 'Time limit', 'Extra files it carries'], rows)}\n\nAny function not listed runs with Vercel's default limit.`;
  } catch {
    return 'vercel.json could not be read.';
  }
}

function factModules(root: string, dir: string, pattern: RegExp): string {
  const rows = list(root, dir, pattern, false).map((file) => [code(file.replace(`${dir}/`, '')), summaryOf(read(root, file) ?? '')]);
  return table(['File', 'What it is'], rows);
}

function factTests(root: string): string {
  const rows = list(root, 'tests', /\.test\.ts$/, false).map((file) => [code(file.replace('tests/', '')), summaryOf(read(root, file) ?? '')]);
  return `${table(['Test', 'What it holds'], rows)}\n\nGitHub runs every one on every push (${code('.github/workflows/ci.yml')}).`;
}

/** The main libraries and the Node version, from package.json. */
function factStack(root: string): string {
  try {
    const pkg = JSON.parse(read(root, 'package.json') ?? '{}') as {
      engines?: { node?: string };
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const rows: string[][] = [['Node.js', pkg.engines?.node ?? 'not set', 'engines']];
    for (const [name, version] of Object.entries(pkg.dependencies ?? {})) rows.push([code(name), version, 'app']);
    for (const [name, version] of Object.entries(pkg.devDependencies ?? {})) rows.push([code(name), version, 'build and test']);
    return `${table(['Package', 'Version range', 'Used for'], rows)}\n\nExact versions are pinned in ${code('package-lock.json')}; CI installs exactly those (${code('npm ci')}).`;
  } catch {
    return 'package.json could not be read.';
  }
}

/** Every fact a manual may embed, by block name. */
export const MANUAL_FACTS: Record<string, (root: string) => string> = {
  routes: factRoutes,
  env: factEnv,
  plans: () => factPlans(),
  models: () => factModels(),
  metrics: () => factMetrics(),
  categories: () => factCategories(),
  tables: factTables,
  tableusage: factTableUsage,
  columns: factColumns,
  jobs: factJobs,
  functions: factFunctions,
  components: (root) => factModules(root, 'src/components', /\.tsx$/),
  hooks: (root) => factModules(root, 'src/hooks', /\.ts$/),
  services: (root) => factModules(root, 'src/services', /\.ts$/),
  shared: (root) => factModules(root, 'api/shared', /\.ts$/),
  stack: factStack,
  tests: factTests,
};

/**
 * The block markers, each on a line of its own, with whatever stands between
 * them. A marker quoted inside a sentence is left alone.
 */
const BLOCK = /^<!-- facts:([a-z]+) -->\r?$[\s\S]*?^<!-- \/facts:\1 -->\r?$/gm;

/** Names of the fact blocks a manual uses. */
export function factBlocksIn(markdown: string): string[] {
  return [...markdown.matchAll(BLOCK)].map((m) => m[1]);
}

/**
 * Replace every fact block with the facts as the code has them now. An unknown
 * block name is left with a visible note (and fails tests/manuals.test.ts).
 */
export function fillManualFacts(markdown: string, root: string = process.cwd()): string {
  return markdown.replace(BLOCK, (_whole, name: string) => {
    const render = MANUAL_FACTS[name];
    const body = render
      ? render(root)
      : `> This manual asks for facts "${name}", which the code does not provide (api/shared/manualFacts.ts).`;
    return `<!-- facts:${name} -->\n${body}\n<!-- /facts:${name} -->`;
  });
}
