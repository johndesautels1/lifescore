/**
 * LIFE SCORE - "search everywhere": a city beyond the built-in world list, from Google.
 *
 * Calls POST /api/places/autocomplete (api/places/autocomplete.ts), which asks
 * Google Places with the server's key. Used by the city picker only when the
 * user asks for it. John, 4 Oct 2026 ("Both").
 */

import type { Metro } from '../data/metros';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { getAuthHeaders } from '../lib/supabase';

const ROUTE = '/api/places/autocomplete';
const TIMEOUT_MS = 12_000;

export type PlacesSearchResult =
  | { ok: true; configured: boolean; cities: Metro[] }
  | { ok: false; message: string };

/** The route's cities as Metros; an entry without a city or country is dropped. */
export function readPlaceCities(value: unknown): Metro[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): Metro[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { city, region, country } = entry as Record<string, unknown>;
    if (typeof city !== 'string' || !city || typeof country !== 'string' || !country) return [];
    return [typeof region === 'string' && region ? { city, region, country } : { city, country }];
  });
}

/** Up to five cities Google knows by that name. Never throws. */
export async function searchPlacesEverywhere(input: string): Promise<PlacesSearchResult> {
  try {
    const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) };
    const response = await fetchWithTimeout(ROUTE, { method: 'POST', headers, body: JSON.stringify({ input }) }, TIMEOUT_MS);
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return { ok: false, message: typeof body.error === 'string' ? body.error : `HTTP ${response.status}` };
    }
    return { ok: true, configured: body.configured === true, cities: readPlaceCities(body.cities) };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'City search failed' };
  }
}
