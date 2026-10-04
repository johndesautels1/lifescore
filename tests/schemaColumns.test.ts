/**
 * LIFE SCORE - every column the code's database types declare has a migration (anti-drift).
 *
 * Found 4 Oct 2026: the code wrote gamma_reports.pdf_storage_path and
 * user_preferences.ccpa_dns_optout, whose migrations had never been applied to
 * production, so those saves failed. Production is put right by migration
 * 20261004_reconcile_live_schema; this test keeps the other half — a column the
 * code is typed against must be created by a migration that names its table —
 * so a new column cannot reach the code without one.
 *
 * Applying migrations to production is not something a test can see; the
 * comparison with the live database is in docs/manuals/APP_SCHEMA_MANUAL.md.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { typedColumns } from '../api/shared/manualFacts';

const migrations = readdirSync('supabase/migrations')
  .filter((name) => name.endsWith('.sql'))
  .map((name) => readFileSync(join('supabase/migrations', name), 'utf8').replace(/--.*$/gm, '').toLowerCase());

/** True when a migration that names `table` also names `column` as a whole word. */
function hasMigration(table: string, column: string): boolean {
  const tableName = new RegExp(`\\b(public\\.)?${table}\\b`);
  const columnName = new RegExp(`\\b${column}\\b`);
  return migrations.some((sql) => tableName.test(sql) && columnName.test(sql));
}

describe('database columns', () => {
  const tables = typedColumns('.');

  it('reads the code\'s table types', () => {
    expect(tables.size >= 20).toBe(true);
    expect((tables.get('gamma_reports') ?? []).includes('pdf_storage_path')).toBe(true);
    expect((tables.get('user_preferences') ?? []).includes('ccpa_dns_optout')).toBe(true);
  });

  it('every typed column is created by a migration that names its table', () => {
    const missing = [...tables.entries()].flatMap(([table, columns]) =>
      columns.filter((column) => !hasMigration(table, column)).map((column) => `${table}.${column}`),
    );
    expect(missing).toEqual([]);
  });
});
