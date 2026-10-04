/**
 * LIFE SCORE - the world city list: every city of 15,000 people or more.
 *
 * John, 4 Oct 2026: compare any two cities in the world, not only the 200 in
 * src/data/metros.ts ("Both": this list, and a live Google search for anything
 * not on it - src/services/placesSearch.ts).
 *
 * The data is GeoNames (https://www.geonames.org, CC BY 4.0 - the city picker
 * credits it), built by scripts/build-world-cities.mjs into
 * public/data/world-cities.json. It is fetched the first time someone searches
 * the picker, never at start-up.
 */

import type { Metro } from './metros';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

/** A city from the world list. */
export interface WorldCity extends Metro {
  countryCode: string;
  population: number;
  /** The name lower-cased with accents removed (and its ASCII spelling), for search. */
  searchKey: string;
}

const WORLD_CITIES_URL = '/data/world-cities.json';
const LOAD_TIMEOUT_MS = 20_000;

/** Lower case with accents removed: "São Paulo" -> "sao paulo". */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** The file's rows as cities; a malformed row is skipped, anything else gives []. */
export function readWorldCities(json: unknown): WorldCity[] {
  if (typeof json !== 'object' || json === null) return [];
  const { countries, cities } = json as { countries?: unknown; cities?: unknown };
  if (typeof countries !== 'object' || countries === null || !Array.isArray(cities)) return [];
  const names = countries as Record<string, unknown>;
  const out: WorldCity[] = [];
  for (const row of cities) {
    if (!Array.isArray(row)) continue;
    const [name, region, code, population, ascii] = row as unknown[];
    const country = typeof code === 'string' ? names[code] : undefined;
    if (typeof name !== 'string' || !name || typeof code !== 'string' || typeof country !== 'string') continue;
    out.push({
      city: name,
      region: typeof region === 'string' && region ? region : undefined,
      country,
      countryCode: code,
      population: typeof population === 'number' && Number.isFinite(population) ? population : 0,
      searchKey: foldText(typeof ascii === 'string' && ascii ? `${name}|${ascii}` : name),
    });
  }
  return out;
}

let loading: Promise<WorldCity[]> | null = null;

/** The world list, fetched once; a failed fetch is tried again next time. */
export function loadWorldCities(): Promise<WorldCity[]> {
  if (!loading) {
    loading = fetchWithTimeout(WORLD_CITIES_URL, {}, LOAD_TIMEOUT_MS)
      .then((response) => {
        if (!response.ok) throw new Error(`World city list: HTTP ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then(readWorldCities)
      .catch((err: unknown) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/**
 * Cities matching the query, largest first: names that start with it, then
 * names that contain it. "Portland, Maine" also narrows by region or country.
 * Fewer than two letters finds nothing.
 */
export function searchWorldCities(cities: readonly WorldCity[], query: string, limit = 50): WorldCity[] {
  const [namePart, ...rest] = query.split(',');
  const q = foldText(namePart ?? '');
  const where = foldText(rest.join(','));
  if (q.length < 2) return [];
  const starts: WorldCity[] = [];
  const contains: WorldCity[] = [];
  for (const city of cities) {
    if (where && !foldText(`${city.region ?? ''} ${city.country} ${city.countryCode}`).includes(where)) continue;
    const keys = city.searchKey.split('|');
    if (keys.some((key) => key.startsWith(q))) {
      starts.push(city);
      if (starts.length >= limit) break;
    } else if (contains.length < limit && keys.some((key) => key.includes(q))) {
      contains.push(city);
    }
  }
  return [...starts, ...contains].slice(0, limit);
}
