/**
 * LIFE SCORE - the one Google Places connection: city search beyond the built-in list.
 *
 * John, 4 Oct 2026 ("Both"): the city picker searches the built-in world list
 * (GeoNames, 15,000+ people) and, for anything not on it, Google's Place
 * Autocomplete (New):
 *   POST https://places.googleapis.com/v1/places:autocomplete
 *   headers X-Goog-Api-Key, X-Goog-FieldMask
 *   body { input, includedPrimaryTypes: ["(cities)"], languageCode }
 *   reply { suggestions: [{ placePrediction: { placeId, structuredFormat:
 *          { mainText: { text }, secondaryText: { text } }, types } }] }
 * (developers.google.com/maps/documentation/places/web-service/place-autocomplete,
 * read 4 Oct 2026). The key is GOOGLE_PLACES_API_KEY (a Google Maps Platform
 * key with Places API (New) enabled); without it the search reports
 * "not configured" and the picker keeps to its own list.
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';
import { asRecord, text } from './jsonRead.js';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const FIELD_MASK = 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types';
const TIMEOUT_MS = 8_000;

/** One city Google suggested. */
export interface PlaceCity {
  placeId: string;
  city: string;
  region?: string;
  country: string;
}

export type PlacesResult =
  | { ok: true; cities: PlaceCity[] }
  | { ok: false; kind: 'not-configured' | 'http' | 'network'; message: string; status?: number };

/** True when the key is set. */
export function placesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

/**
 * "Florida, USA" → region "Florida", country "USA"; "Japan" → country only.
 * A suggestion without a country is dropped.
 */
export function readPlaceSuggestions(body: unknown): PlaceCity[] {
  const suggestions = asRecord(body).suggestions;
  if (!Array.isArray(suggestions)) return [];
  return suggestions.flatMap((entry): PlaceCity[] => {
    const prediction = asRecord(asRecord(entry).placePrediction);
    const format = asRecord(prediction.structuredFormat);
    const city = text(asRecord(format.mainText).text);
    const placeId = text(prediction.placeId);
    const parts = (text(asRecord(format.secondaryText).text) ?? '').split(',').map((part) => part.trim()).filter(Boolean);
    const country = parts.pop();
    if (!city || !placeId || !country) return [];
    const place: PlaceCity = { placeId, city, country };
    if (parts.length > 0) place.region = parts.join(', ');
    return [place];
  });
}

/** Up to five cities Google suggests for the text typed. Never throws. */
export async function searchPlaceCities(input: string, languageCode = 'en'): Promise<PlacesResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return { ok: false, kind: 'not-configured', message: 'GOOGLE_PLACES_API_KEY is not set' };
  try {
    const response = await fetchWithTimeout(
      AUTOCOMPLETE_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
        body: JSON.stringify({ input, includedPrimaryTypes: ['(cities)'], languageCode }),
      },
      TIMEOUT_MS
    );
    const body: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = text(asRecord(asRecord(body).error).message) ?? `HTTP ${response.status}`;
      return { ok: false, kind: 'http', status: response.status, message };
    }
    return { ok: true, cities: readPlaceSuggestions(body) };
  } catch (err) {
    return { ok: false, kind: 'network', message: err instanceof Error ? err.message : String(err) };
  }
}
