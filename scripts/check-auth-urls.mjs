#!/usr/bin/env node
/**
 * LIFE SCORE - checks (and with --fix, repairs) Supabase Auth's return addresses.
 *
 * 4 Oct 2026: Google sign-in failed with Supabase's
 *   {"code":500,"error_code":"unexpected_failure",...}
 * Its own log said why: parse " https://clueslifescore.com": first path segment
 * in URL cannot contain colon. The project's Site URL had a space before
 * "https", and the app's return address (/auth/callback) was not on the
 * Redirect URLs list, so Supabase fell back to the broken Site URL. Email and
 * password sign-in never uses these addresses, which is why it kept working.
 *
 * These settings live in Supabase's Management API, not the database:
 *   GET   https://api.supabase.com/v1/projects/{ref}/config/auth
 *   PATCH https://api.supabase.com/v1/projects/{ref}/config/auth  { site_url, uri_allow_list }
 * (supabase.com/docs/reference/api/v1-update-auth-service-config)
 *
 * Usage (a personal access token from supabase.com/dashboard/account/tokens):
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-auth-urls.mjs          # report; exit 1 if wrong
 *   SUPABASE_ACCESS_TOKEN=... node scripts/check-auth-urls.mjs --fix    # repair, then report
 */

const PROJECT_REF = 'henghuunttmaowypiyhq';
const SITE_URL = 'https://clueslifescore.com';
const REQUIRED_REDIRECTS = [`${SITE_URL}/auth/callback`];
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is not set (supabase.com/dashboard/account/tokens).');
  process.exit(2);
}
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

/** The redirect list as entries, each trimmed, blanks dropped. */
function redirectEntries(list) {
  return String(list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** What is wrong with a config, in plain words; [] when right. */
function problems(config) {
  const found = [];
  const site = String(config.site_url ?? '');
  if (site !== SITE_URL) found.push(`Site URL is ${JSON.stringify(site)}; it must be exactly ${JSON.stringify(SITE_URL)}`);
  const entries = redirectEntries(config.uri_allow_list);
  for (const url of REQUIRED_REDIRECTS) {
    if (!entries.includes(url)) found.push(`Redirect URLs lack ${url}`);
  }
  if (String(config.uri_allow_list ?? '').split(',').some((s) => s !== s.trim())) {
    found.push('A Redirect URL has a space before or after it');
  }
  return found;
}

async function read() {
  const response = await fetch(API, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Supabase answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.json();
}

const before = await read();
const wrong = problems(before);
if (wrong.length === 0) {
  console.log('Auth return addresses are right.');
  process.exit(0);
}
for (const line of wrong) console.log('WRONG:', line);
if (!process.argv.includes('--fix')) process.exit(1);

const entries = redirectEntries(before.uri_allow_list);
for (const url of REQUIRED_REDIRECTS) if (!entries.includes(url)) entries.push(url);
const response = await fetch(API, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ site_url: SITE_URL, uri_allow_list: entries.join(',') }),
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) {
  console.error(`Repair refused: ${response.status} ${(await response.text()).slice(0, 300)}`);
  process.exit(1);
}
const after = problems(await read());
if (after.length > 0) {
  for (const line of after) console.log('STILL WRONG:', line);
  process.exit(1);
}
console.log('Repaired: Site URL is', SITE_URL, 'and Redirect URLs include', REQUIRED_REDIRECTS.join(', '));
