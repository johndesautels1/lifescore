/**
 * LIFE SCORE - "download my data" and "delete my account" stay complete (anti-drift).
 *
 * Until 2026-10-03 the export covered six tables and the deletion route crashed
 * on every call (a rate limiter called with the wrong arguments) and never
 * cancelled billing. These tests keep the two routes whole as tables are added.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER_TABLES } from '../api/user/export';

/** Tables whose user link is handled another way, each with its reason. */
const HANDLED_ELSEWHERE: Record<string, string> = {
  olivia_conversations: 'exported with their messages as oliviaConversations',
  olivia_messages: 'exported inside oliviaConversations',
  cristiano_city_videos: 'a shared city film; the starter is SET NULL on deletion, nothing personal is kept',
  movie_videos: 'a shared city-pair film; the starter is SET NULL on deletion',
};

/** Every table the migrations create or alter with a column pointing at a user. */
function userLinkedTablesInMigrations(): string[] {
  const dir = 'supabase/migrations';
  const found = new Set<string>();
  for (const name of readdirSync(dir).filter((f) => f.endsWith('.sql'))) {
    const sql = readFileSync(join(dir, name), 'utf8');
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      if (/references\s+(?:auth\.users|(?:public\.)?profiles)\b/i.test(m[2])) found.add(m[1].toLowerCase());
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:only\s+)?(?:public\.)?(\w+)[^;]*?references\s+(?:auth\.users|(?:public\.)?profiles)\b/gi)) {
      found.add(m[1].toLowerCase());
    }
  }
  return [...found].sort();
}

describe('the data export covers every table that holds a user', () => {
  const exported = new Set(USER_TABLES.map((t) => t.table));

  it('each user-linked table in the migrations is exported or handled for a stated reason', () => {
    const missing = userLinkedTablesInMigrations().filter((t) => !exported.has(t) && !HANDLED_ELSEWHERE[t]);
    expect(missing).toEqual([]);
  });

  it('includes the tables made outside the migrations and the main ones by name', () => {
    for (const table of ['profiles', 'comparisons', 'judge_reports', 'court_orders', 'subscriptions', 'consent_logs']) {
      expect(exported.has(table), table).toBe(true);
    }
  });

  it('exports the beta invitation and never a share link password', () => {
    const route = readFileSync('api/user/export.ts', 'utf8');
    expect(route).toContain("from('beta_testers')");
    expect(route).toContain("'password_hash'");
  });
});

describe('account deletion', () => {
  const route = readFileSync('api/user/delete.ts', 'utf8');

  it('calls the rate limiter with its four arguments', () => {
    expect(route).toMatch(/checkRateLimit\(clientIP, 'user\/delete', \{[^}]*\}, res\)/);
  });

  it('stops billing, then removes files and the invitation, then the account — in that order', () => {
    const billing = route.indexOf('await cancelBilling(');
    const files = route.indexOf('await removeUserFiles(');
    const beta = route.indexOf("from('beta_testers').delete()");
    const account = route.indexOf('auth.admin.deleteUser(');
    expect(billing).toBeGreaterThan(0);
    expect(files).toBeGreaterThan(billing);
    expect(beta).toBeGreaterThan(files);
    expect(account).toBeGreaterThan(beta);
  });

  it('never reports success when the account could not be removed', () => {
    expect(route).toMatch(/if \(deleteUserError\) throw new DeletionStepError\('account'/);
  });
});

describe('the doors to both routes', () => {
  it('Settings → Data offers Download My Data and Delete My Account, calling the two routes', () => {
    const settings = readFileSync('src/components/SettingsModal.tsx', 'utf8');
    expect(settings).toContain("fetch('/api/user/export'");
    expect(settings).toContain("fetch('/api/user/delete'");
    expect(settings).toContain("deleteText !== 'DELETE MY ACCOUNT'");
  });
});
