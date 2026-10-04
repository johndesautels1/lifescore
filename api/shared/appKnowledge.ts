/**
 * LIFE SCORE - the whole app as Olivia's and Emilia's knowledge, line by line.
 *
 * John, 4 Oct 2026: Olivia and Emilia must have "omnipotent omnipresent line by
 * line bit by bit knowledge" of the app, "automatically fully updated" whenever
 * the code changes. Ruling the same day: everyone gets complete, current answers;
 * only admins may see actual code, prompts or security logic.
 *
 * How it stays current without anyone doing anything: the functions that use it
 * ship the app's own files (vercel.json includeFiles: src, api, docs, supabase,
 * scripts, tests and the root config files). On a cold start this module reads
 * those files from the deployment and builds a search index in memory. Every
 * deployment therefore knows exactly its own code — nothing is generated,
 * committed or synced, so nothing can fall behind. tests/appKnowledge.test.ts
 * holds the coverage (every source file indexed) and the admin boundary.
 *
 * Two tools for Claude (api/shared/anthropic.ts):
 *   search_app      — everyone. Ranked passages (BM25). Non-admins search only
 *                     the files already public or customer-facing: the browser
 *                     app (src/, shipped to every visitor anyway), the user and
 *                     customer-service manuals, the legal pages, the plan list.
 *                     Server code, prompts, scripts and admin manuals never
 *                     reach a non-admin's conversation.
 *   read_app_file   — admins only. Exact numbered lines of any indexed file.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { ClaudeTool } from './anthropic.js';

// ============================================================================
// WHAT IS INDEXED
// ============================================================================

/** Folders indexed whole (text files only), from the repository root. */
export const KNOWLEDGE_FOLDERS = ['src', 'api', 'docs', 'supabase', 'scripts', 'tests'] as const;

/** Single files at the root. */
export const KNOWLEDGE_ROOT_FILES = ['vercel.json', 'package.json', 'vite.config.ts', 'index.html', '.env.example'] as const;

/** Text files only: code, styles, SQL, docs, config. */
const TEXT_FILE = /\.(ts|tsx|mts|cts|js|mjs|cjs|css|sql|md|txt|json|html|yml|yaml)$/i;

/** Never indexed, even inside an indexed folder. */
const SKIP = /(^|\/)(node_modules|dist|dev-dist|\.git)(\/|$)|package-lock\.json$/;

/**
 * Who may see a file. Non-admins: what every visitor can already see or is
 * written for customers. Everything else (server code, prompts, security,
 * scripts, migrations, tests, admin manuals) is admins only.
 */
const PUBLIC_FILES: readonly RegExp[] = [
  /^src\//,
  /^docs\/manuals\/USER_MANUAL\.md$/,
  /^docs\/manuals\/CUSTOMER_SERVICE_MANUAL\.md$/,
  /^docs\/legal\//,
  /^api\/shared\/plans\.ts$/,
  /^index\.html$/,
];

/** Lines per passage, and how far consecutive passages overlap. */
const PASSAGE_LINES = 60;
const PASSAGE_OVERLAP = 10;

/** search_app returns at most this many passages, within this many characters. */
const MAX_RESULTS = 6;
const MAX_RESULT_CHARS = 14_000;

/** read_app_file returns at most this many lines per call. */
const MAX_READ_LINES = 250;

// ============================================================================
// TYPES
// ============================================================================

export type Audience = 'everyone' | 'admin';

export interface KnowledgeFileEntry {
  /** Repository-relative path, forward slashes. */
  path: string;
  audience: Audience;
  lines: string[];
  /** First line of the file's header comment, when it has one. */
  summary: string;
}

interface Passage {
  file: KnowledgeFileEntry;
  start: number; // 1-based, inclusive
  end: number; // 1-based, inclusive
  length: number; // tokens
}

export interface AppKnowledgeIndex {
  files: Map<string, KnowledgeFileEntry>;
  passages: Passage[];
  /** token -> [passage index, term frequency] */
  postings: Map<string, Array<[number, number]>>;
  averageLength: number;
  chars: number;
}

// ============================================================================
// READING THE DEPLOYMENT
// ============================================================================

/** Who may see this path. */
export function audienceOf(path: string): Audience {
  return PUBLIC_FILES.some((re) => re.test(path)) ? 'everyone' : 'admin';
}

/** The first line of a file's opening comment, as a one-line summary. */
function summarise(text: string): string {
  const match = text.match(/^\s*(?:\/\*\*?|<!--|#)\s*\n?\s*\*?\s*(.+)/);
  return match ? match[1].replace(/\*\/\s*$/, '').trim().slice(0, 160) : '';
}

/** Every indexable file under a folder, repository-relative. */
function walk(root: string, dir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(join(root, dir));
  } catch {
    return [];
  }
  return names.flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (SKIP.test(rel)) return [];
    let isDir = false;
    try {
      isDir = statSync(join(root, rel)).isDirectory();
    } catch {
      return [];
    }
    if (isDir) return walk(root, rel);
    return TEXT_FILE.test(name) ? [rel] : [];
  });
}

/** Lower-case words, with camelCase and snake_case split, as the index sees them. */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[^A-Za-z0-9]+/)) {
    if (!raw) continue;
    const parts = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(' ');
    if (parts.length > 1) out.push(raw.toLowerCase());
    for (const part of parts) {
      const word = part.toLowerCase();
      if (word.length >= 2) out.push(word);
    }
  }
  return out;
}

/**
 * Build the index from the files under `root` (the deployment's root on Vercel,
 * the repository in tests). Pure apart from reading files.
 */
export function buildAppKnowledge(root: string): AppKnowledgeIndex {
  const paths = [
    ...KNOWLEDGE_FOLDERS.flatMap((folder) => walk(root, folder)),
    ...KNOWLEDGE_ROOT_FILES.filter((file) => {
      try {
        return statSync(join(root, file)).isFile();
      } catch {
        return false;
      }
    }),
  ].sort();

  const files = new Map<string, KnowledgeFileEntry>();
  const passages: Passage[] = [];
  const postings = new Map<string, Array<[number, number]>>();
  let totalLength = 0;
  let chars = 0;

  for (const path of paths) {
    let text: string;
    try {
      text = readFileSync(join(root, path), 'utf8');
    } catch {
      continue;
    }
    chars += text.length;
    const lines = text.split(/\r?\n/);
    const entry: KnowledgeFileEntry = { path, audience: audienceOf(path), lines, summary: summarise(text) };
    files.set(path, entry);

    for (let start = 0; start < lines.length; start += PASSAGE_LINES - PASSAGE_OVERLAP) {
      const end = Math.min(lines.length, start + PASSAGE_LINES);
      const tokens = tokenize(`${path}\n${lines.slice(start, end).join('\n')}`);
      const counts = new Map<string, number>();
      for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
      const index = passages.length;
      passages.push({ file: entry, start: start + 1, end, length: tokens.length });
      totalLength += tokens.length;
      for (const [token, tf] of counts) {
        const list = postings.get(token);
        if (list) list.push([index, tf]);
        else postings.set(token, [[index, tf]]);
      }
      if (end >= lines.length) break;
    }
  }

  return { files, passages, postings, averageLength: passages.length ? totalLength / passages.length : 0, chars };
}

let cached: AppKnowledgeIndex | null = null;

/** The deployment's index, built once per instance on first use. */
export function getAppKnowledge(): AppKnowledgeIndex {
  if (!cached) {
    const started = Date.now();
    cached = buildAppKnowledge(process.cwd());
    console.log(
      `[appKnowledge] indexed ${cached.files.size} files, ${cached.passages.length} passages, ${cached.chars} characters in ${Date.now() - started} ms`,
    );
  }
  return cached;
}

// ============================================================================
// SEARCH AND READ
// ============================================================================

/** BM25 constants. */
const K1 = 1.2;
const B = 0.75;

/** The best passages for a query, within the caller's audience. */
export function searchAppKnowledge(index: AppKnowledgeIndex, query: string, isAdmin: boolean, limit = MAX_RESULTS): Passage[] {
  const terms = [...new Set(tokenize(query))];
  const scores = new Map<number, number>();
  const n = index.passages.length;
  for (const term of terms) {
    const list = index.postings.get(term);
    if (!list) continue;
    const idf = Math.log(1 + (n - list.length + 0.5) / (list.length + 0.5));
    for (const [passage, tf] of list) {
      const p = index.passages[passage];
      if (!isAdmin && p.file.audience !== 'everyone') continue;
      const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + (B * p.length) / (index.averageLength || 1)));
      scores.set(passage, (scores.get(passage) ?? 0) + idf * norm);
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, limit)
    .map(([passage]) => index.passages[passage]);
}

/** Numbered lines of a file, as the tools return them. */
function numbered(entry: KnowledgeFileEntry, start: number, end: number): string {
  return entry.lines
    .slice(start - 1, end)
    .map((line, i) => `${start + i}: ${line}`)
    .join('\n');
}

// ============================================================================
// CLAUDE TOOLS
// ============================================================================

export const SEARCH_APP_TOOL: ClaudeTool = {
  name: 'search_app',
  description:
    'Search the LIFE SCORE app as it is deployed right now — its screens, features, prices and plan limits, scoring, ' +
    'settings, manuals and (for admins) its server code — and get the most relevant passages with their file and line numbers. ' +
    'Use it whenever a question is about how the app works, what something costs, what a screen or setting does, or why ' +
    'something happened, and answer from what it returns rather than from memory. Search again with other words if the first ' +
    'passages do not answer the question.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Words to look for: feature names, labels, function or file names, error text.' },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

export const READ_APP_FILE_TOOL: ClaudeTool = {
  name: 'read_app_file',
  description:
    'Read exact, numbered lines of one file of the deployed app (admins only). Use after search_app to read a whole function ' +
    `or section. At most ${MAX_READ_LINES} lines per call.`,
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Repository-relative path, as search_app printed it (e.g. api/evaluate.ts).' },
      start_line: { type: 'integer', description: 'First line, 1-based. Default 1.' },
      end_line: { type: 'integer', description: `Last line. Default start_line + ${MAX_READ_LINES - 1}.` },
    },
    required: ['path'],
    additionalProperties: false,
  },
};

/** The knowledge tools this person may use. */
export function appKnowledgeTools(isAdmin: boolean): ClaudeTool[] {
  return isAdmin ? [SEARCH_APP_TOOL, READ_APP_FILE_TOOL] : [SEARCH_APP_TOOL];
}

/** Whether a tool call is one of these tools. */
export function isAppKnowledgeTool(name: string): boolean {
  return name === SEARCH_APP_TOOL.name || name === READ_APP_FILE_TOOL.name;
}

/** Narrow an unknown tool input to a plain object. */
function asInput(input: unknown): Record<string, unknown> {
  return typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
}

/** Run one knowledge tool call; the result text goes back to Claude as the tool result. */
export function runAppKnowledgeTool(name: string, input: unknown, isAdmin: boolean, index: AppKnowledgeIndex = getAppKnowledge()): string {
  const args = asInput(input);

  if (name === SEARCH_APP_TOOL.name) {
    const query = typeof args.query === 'string' ? args.query.slice(0, 500) : '';
    if (!query.trim()) return JSON.stringify({ error: 'query is required' });
    const found = searchAppKnowledge(index, query, isAdmin);
    if (found.length === 0) return JSON.stringify({ results: [], note: 'Nothing matched. Try other words.' });
    let budget = MAX_RESULT_CHARS;
    const parts: string[] = [];
    for (const passage of found) {
      const text = numbered(passage.file, passage.start, passage.end);
      const block = `--- ${passage.file.path} lines ${passage.start}-${passage.end}${passage.file.summary ? ` (${passage.file.summary})` : ''}\n${text}`;
      if (block.length > budget) break;
      parts.push(block);
      budget -= block.length;
    }
    return parts.join('\n\n');
  }

  if (name === READ_APP_FILE_TOOL.name) {
    if (!isAdmin) return JSON.stringify({ error: 'Reading files is for admins only.' });
    const path = typeof args.path === 'string' ? args.path.replace(/\\/g, '/').replace(/^\.?\//, '') : '';
    const entry = index.files.get(path);
    if (!entry) return JSON.stringify({ error: `No such file in the deployment: ${path}` });
    const start = Math.max(1, Math.floor(typeof args.start_line === 'number' ? args.start_line : 1));
    const requestedEnd = typeof args.end_line === 'number' ? Math.floor(args.end_line) : start + MAX_READ_LINES - 1;
    const end = Math.min(entry.lines.length, requestedEnd, start + MAX_READ_LINES - 1);
    if (start > entry.lines.length) return JSON.stringify({ error: `${path} has ${entry.lines.length} lines` });
    return `--- ${path} lines ${start}-${end} of ${entry.lines.length}\n${numbered(entry, start, end)}`;
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

/**
 * What the assistant is told about these tools and this person. Goes in the
 * system prompt next to the persona's own instructions.
 */
export function appKnowledgeGuide(isAdmin: boolean): string {
  const who = isAdmin
    ? 'The person you are talking to is an ADMIN of LIFE SCORE. You may quote code, prompts and file paths, and use read_app_file to read exact lines.'
    : 'The person you are talking to is NOT an admin. Never show code, prompts, keys, file paths, line numbers or how security checks work; explain what the app does in plain words.';
  return [
    'APP KNOWLEDGE',
    'You know the whole LIFE SCORE app as deployed today through the search_app tool: every screen, feature, price, plan limit, score rule, setting and manual, read from the app itself, so it is always current. When a question touches how the app works, search first and answer from what you find; never guess, and say so when the app does not do something.',
    who,
  ].join('\n');
}

/** Counts for the admin knowledge check. */
export function appKnowledgeStats(index: AppKnowledgeIndex): { files: number; publicFiles: number; passages: number; characters: number } {
  let publicFiles = 0;
  for (const entry of index.files.values()) if (entry.audience === 'everyone') publicFiles++;
  return { files: index.files.size, publicFiles, passages: index.passages.length, characters: index.chars };
}

/** Repository-relative form of a path (used by tests). */
export function toRepoPath(root: string, absolute: string): string {
  return relative(root, absolute).split(sep).join('/');
}
