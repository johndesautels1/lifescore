/**
 * LIFE SCORE - Comparison grants (browser side).
 *
 * A comparison is counted ONCE, on the server, when it starts
 * (POST /api/usage/consume). The server hands back a signed grant for that city
 * pair, which every AI call of the comparison must carry in the x-usage-grant
 * header (/api/evaluate, /api/judge, /api/judge-report). Grants are kept for
 * 30 days in this browser so a judge report can still be written later.
 *
 * Server side: api/shared/entitlements.ts. Plans: api/shared/plans.ts.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { getAuthHeaders } from './supabase';
import { isUserTier, type UserTier } from '../../api/shared/plans';

export type ComparisonKind = 'standardComparisons' | 'enhancedComparisons';

/** Header name the server reads (api/shared/entitlements.ts GRANT_HEADER). */
const GRANT_HEADER = 'x-usage-grant';
const STORE_KEY = 'lifescore_usage_grants';
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20_000;

interface StoredGrant {
  grant: string;
  savedAt: number;
}

/** Same pairing rule as the server: the city name before the first comma, lower-cased, order-free. */
function pairKey(city1: string, city2: string): string {
  const norm = (c: string) => c.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');
  return [norm(city1), norm(city2)].sort().join('|');
}

const memory = new Map<string, StoredGrant>();

function readStore(): Record<string, StoredGrant> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, StoredGrant>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredGrant>): void {
  try {
    const now = Date.now();
    const fresh = Object.fromEntries(Object.entries(store).filter(([, g]) => now - g.savedAt < KEEP_MS));
    localStorage.setItem(STORE_KEY, JSON.stringify(fresh));
  } catch {
    /* storage unavailable (private window) — the in-memory copy still works this session */
  }
}

function saveGrant(city1: string, city2: string, grant: string): void {
  const entry = { grant, savedAt: Date.now() };
  const key = pairKey(city1, city2);
  memory.set(key, entry);
  const store = readStore();
  store[key] = entry;
  writeStore(store);
}

function findGrant(city1: string, city2: string): string | null {
  const key = pairKey(city1, city2);
  const entry = memory.get(key) ?? readStore()[key];
  if (!entry || typeof entry.grant !== 'string' || Date.now() - entry.savedAt >= KEEP_MS) return null;
  return entry.grant;
}

/** The header to send with an AI call for this city pair (empty when there is no grant). */
export function grantHeaders(city1: string, city2: string): Record<string, string> {
  const grant = findGrant(city1, city2);
  return grant ? { [GRANT_HEADER]: grant } : {};
}

export type StartComparisonResult =
  | { ok: true }
  | {
      ok: false;
      /** upgrade_required | limit_reached | signed_out | unavailable */
      code: string;
      message: string;
      requiredTier: UserTier | null;
    };

/**
 * Count one comparison on the server and keep its grant. Call this once,
 * before the first AI call of a comparison.
 */
export async function startComparison(kind: ComparisonKind, city1: string, city2: string): Promise<StartComparisonResult> {
  const authHeaders = await getAuthHeaders();
  if (!authHeaders.Authorization) {
    return { ok: false, code: 'signed_out', message: 'Please sign in to run a comparison.', requiredTier: null };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch('/api/usage/consume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ feature: kind, city1, city2 }),
      signal: controller.signal,
    });
    const body: unknown = await response.json().catch(() => null);
    const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

    if (response.ok && typeof data.grant === 'string') {
      saveGrant(city1, city2, data.grant);
      return { ok: true };
    }
    return {
      ok: false,
      code: typeof data.code === 'string' ? data.code : response.status === 401 ? 'signed_out' : 'unavailable',
      message: typeof data.error === 'string' ? data.error : 'We could not start the comparison. Please try again.',
      requiredTier: isUserTier(data.requiredTier) ? data.requiredTier : null,
    };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    return {
      ok: false,
      code: 'unavailable',
      message: timedOut ? 'The server took too long to answer. Please try again.' : 'We could not reach the server. Please try again.',
      requiredTier: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
