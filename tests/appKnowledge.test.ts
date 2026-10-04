/**
 * LIFE SCORE - Olivia and Emilia know the whole app, and only admins see its code
 * (anti-drift).
 *
 * John, 4 Oct 2026: "omnipotent omnipresent line by line bit by bit knowledge ...
 * any code updates or changes ... automatically fully updated"; ruling the same
 * day: admins only see code. api/shared/appKnowledge.ts indexes the deployed
 * files at cold start, so it is current by construction. These tests hold:
 * - coverage: every source, style, SQL and doc file is in the index;
 * - shipping: the functions that use it carry every indexed folder (vercel.json);
 * - the boundary: a non-admin's search never returns server code, and reading
 *   exact lines is for admins only;
 * - search quality on questions the app must answer.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  KNOWLEDGE_FOLDERS,
  KNOWLEDGE_ROOT_FILES,
  READ_APP_FILE_TOOL,
  SEARCH_APP_TOOL,
  appKnowledgeTools,
  audienceOf,
  buildAppKnowledge,
  runAppKnowledgeTool,
  searchAppKnowledge,
} from '../api/shared/appKnowledge';

const root = process.cwd();
const index = buildAppKnowledge(root);

/** Every file of these kinds under a folder, repository-relative. */
function sourceFiles(dir: string, pattern: RegExp): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) return sourceFiles(rel, pattern);
    return pattern.test(name) ? [rel] : [];
  });
}

describe('app knowledge coverage', () => {
  it('indexes every source, style, SQL, test and doc file', () => {
    const expected = [
      ...sourceFiles('src', /\.(ts|tsx|css)$/),
      ...sourceFiles('api', /\.ts$/),
      ...sourceFiles('docs', /\.md$/),
      ...sourceFiles('supabase', /\.sql$/),
      ...sourceFiles('tests', /\.ts$/),
    ];
    const missing = expected.filter((path) => !index.files.has(path));
    expect(missing).toEqual([]);
    expect(index.files.size).toBeGreaterThan(400);
  });

  it('holds each file line for line', () => {
    const entry = index.files.get('api/shared/appKnowledge.ts');
    expect(entry).not.toBe(undefined);
    expect(entry?.lines.join('\n')).toBe(readFileSync(join(root, 'api/shared/appKnowledge.ts'), 'utf8').replace(/\r\n/g, '\n'));
  });

  it('every function that uses it ships every indexed folder and root file', () => {
    const config = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
      functions: Record<string, { includeFiles?: string }>;
    };
    for (const fn of ['api/olivia/chat.ts', 'api/emilia/message.ts', 'api/admin/knowledge-status.ts']) {
      const include = config.functions[fn]?.includeFiles ?? '';
      for (const folder of KNOWLEDGE_FOLDERS) expect(include, `${fn} ships ${folder}`).toContain(`${folder}/**`);
      for (const file of KNOWLEDGE_ROOT_FILES) expect(include, `${fn} ships ${file}`).toContain(file);
    }
  });

  it('Olivia and Emilia both offer the tools', () => {
    for (const route of ['api/olivia/chat.ts', 'api/emilia/message.ts']) {
      const text = readFileSync(join(root, route), 'utf8');
      expect(text).toContain('appKnowledgeTools(isAdmin)');
      expect(text).toContain('runAppKnowledgeTool(call.name, call.input, isAdmin)');
      expect(text).toContain('appKnowledgeGuide(isAdmin)');
    }
  });
});

describe('admins only see code', () => {
  it('server code, scripts, migrations, tests and admin manuals are admins only', () => {
    for (const path of ['api/evaluate.ts', 'api/shared/entitlements.ts', 'scripts/check-auth-urls.mjs', 'tests/bugAudit.test.ts', 'docs/manuals/TECHNICAL_SUPPORT_MANUAL.md', 'vercel.json']) {
      expect(audienceOf(path), path).toBe('admin');
    }
    for (const path of ['src/App.tsx', 'docs/manuals/USER_MANUAL.md', 'api/shared/plans.ts']) {
      expect(audienceOf(path), path).toBe('everyone');
    }
  });

  it('a non-admin search never returns an admin-only passage', () => {
    for (const query of ['requireComparisonGrant entitlement grant', 'judge prompt system instructions', 'stripe webhook signature', 'evaluate parseResponse']) {
      for (const passage of searchAppKnowledge(index, query, false, 20)) {
        expect(passage.file.audience, `${query} -> ${passage.file.path}`).toBe('everyone');
      }
    }
  });

  it('only admins are offered, and may use, read_app_file', () => {
    expect(appKnowledgeTools(false).map((t) => t.name)).toEqual([SEARCH_APP_TOOL.name]);
    expect(appKnowledgeTools(true).map((t) => t.name)).toEqual([SEARCH_APP_TOOL.name, READ_APP_FILE_TOOL.name]);
    expect(runAppKnowledgeTool(READ_APP_FILE_TOOL.name, { path: 'api/evaluate.ts' }, false, index)).toContain('admins only');
    expect(runAppKnowledgeTool(READ_APP_FILE_TOOL.name, { path: 'api/evaluate.ts', start_line: 1, end_line: 3 }, true, index)).toMatch(/^--- api\/evaluate\.ts lines 1-3 of \d+\n1: /);
  });
});

describe('search finds what the app must answer', () => {
  it('admins find the server code behind a feature', () => {
    const paths = searchAppKnowledge(index, 'Kling fal clip submit', true).map((p) => p.file.path);
    expect(paths).toContain('api/shared/falKling.ts');
  });

  it('everyone finds plans and prices', () => {
    const paths = searchAppKnowledge(index, 'Sovereign Navigator plan price', false).map((p) => p.file.path);
    expect(paths.some((p) => p === 'api/shared/plans.ts' || p.startsWith('src/'))).toBe(true);
  });

  it('results carry file and line numbers', () => {
    const text = runAppKnowledgeTool(SEARCH_APP_TOOL.name, { query: 'weight presets Digital Nomad' }, false, index);
    expect(text).toMatch(/^--- src\/\S+ lines \d+-\d+/);
  });
});
