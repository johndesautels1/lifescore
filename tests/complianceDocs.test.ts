/**
 * LIFE SCORE - the internal compliance documents stay true to the code (anti-drift).
 *
 * Until 2026-10-03 docs/legal described a deletion queue, nightly purges, a ZIP
 * export and an "Account Settings → Privacy & Data" screen that were never
 * built, and listed 11 suppliers when the code called 19. They were rewritten
 * to the code; these tests fail the build when the code moves and they do not.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { USER_TABLES } from '../api/user/export';
import { SUB_PROCESSORS } from '../src/legal/subProcessors';
import { LEGAL_FACTS } from '../src/legal/legalFacts';

const doc = (name: string): string => readFileSync(`docs/legal/${name}`, 'utf8');

describe('DATA_EXPORT_SPEC.md', () => {
  it('lists every table the export reads', () => {
    const spec = doc('DATA_EXPORT_SPEC.md');
    const missing = USER_TABLES.filter(({ table }) => !spec.includes(`\`${table}\``)).map((t) => t.table);
    expect(missing).toEqual([]);
  });
});

describe('DATA_RETENTION_POLICY.md', () => {
  const policy = doc('DATA_RETENTION_POLICY.md');

  it('gives a retention line for every table that holds a user', () => {
    const missing = USER_TABLES.filter(({ table }) => !policy.includes(`\`${table}\``)).map((t) => t.table);
    expect(missing).toEqual([]);
  });

  it('lists every timed job, and claims no purge unless one exists', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as { crons?: Array<{ path: string }> };
    const crons = vercel.crons ?? [];
    for (const { path } of crons) expect(policy, path).toContain(`\`${path}\``);
    const purging = crons.some(({ path }) => /purge|clean|delete|retention|expire/i.test(path));
    if (!purging) expect(policy).toContain('No automatic deletion job runs today');
    else expect(policy).not.toContain('No automatic deletion job runs today');
  });
});

describe('ACCOUNT_DELETION_SPEC.md', () => {
  const spec = doc('ACCOUNT_DELETION_SPEC.md');
  const route = readFileSync('api/user/delete.ts', 'utf8');

  it('names every subscription state the route cancels', () => {
    const list = /BILLABLE_STATUSES[^=]*=\s*\[([^\]]+)\]/.exec(route)?.[1] ?? '';
    const states = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(states.length).toBeGreaterThan(0);
    for (const state of states) expect(spec, state).toContain(`\`${state}\``);
  });

  it('names the migration that keeps deletion unblocked, and it exists', () => {
    expect(spec).toContain('20261003_account_deletion_foreign_keys');
    expect(existsSync('supabase/migrations/20261003_account_deletion_foreign_keys.sql')).toBe(true);
  });

  it('points at the door that exists', () => {
    expect(spec).toContain('Settings (header) → Data → Delete My Account');
    expect(readFileSync('src/components/SettingsModal.tsx', 'utf8')).toContain('Delete My Account');
  });
});

describe('the supplier documents', () => {
  it('DPA_TRACKER.md has a row for every supplier in the register', () => {
    const tracker = doc('DPA_TRACKER.md');
    const missing = SUB_PROCESSORS.map((p) => p.name.split(/[ (]/)[0]).filter((first) => !tracker.includes(`**${first}`));
    expect(missing).toEqual([]);
  });

  it('SUBPROCESSOR_MANAGEMENT_POLICY.md points at the one register and keeps no second table', () => {
    const policy = doc('SUBPROCESSOR_MANAGEMENT_POLICY.md');
    expect(policy).toContain('src/legal/subProcessors.ts');
    expect(policy).not.toMatch(/^\| (Supabase|Vercel|OpenAI) \|/m);
  });
});

describe('COMPLIANCE_README.md', () => {
  it('names the same privacy contact as the legal pages', () => {
    expect(doc('COMPLIANCE_README.md')).toContain(`**Privacy Contact:** ${LEGAL_FACTS.contact}`);
  });
});
