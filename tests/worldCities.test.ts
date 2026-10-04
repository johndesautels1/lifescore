/**
 * LIFE SCORE - any city in the world can be picked (anti-drift).
 *
 * John, 4 Oct 2026: "go from comparing any of 200 given cities to being able to
 * compare any 2 cities in the world" - "Both": the built-in world list
 * (GeoNames, every city of 15,000+ people, public/data/world-cities.json) and
 * Google's place search beyond it (api/places/autocomplete.ts).
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { foldText, readWorldCities, searchWorldCities } from '../src/data/worldCities';
import { COUNTRY_NAMES } from '../src/data/countries';
import { readPlaceSuggestions } from '../api/shared/googlePlaces';
import { readPlaceCities } from '../src/services/placesSearch';

const file: unknown = JSON.parse(readFileSync('public/data/world-cities.json', 'utf8'));
const world = readWorldCities(file);

describe('the world list', () => {
  it('holds every city of 15,000+ people in every country, credited to GeoNames', () => {
    expect(world.length).toBeGreaterThan(30_000);
    expect(Object.keys(COUNTRY_NAMES).length).toBeGreaterThan(240);
    expect((file as { source: string }).source).toContain('GeoNames');
    expect(new Set(world.map((c) => c.countryCode)).size).toBeGreaterThan(200);
  });

  it('includes the popular cities and cities far beyond them', () => {
    for (const [city, code] of [['Tampa', 'US'], ['London', 'GB'], ['Tbilisi', 'GE'], ['Kyoto', 'JP'], ['Nairobi', 'KE'], ['Medellín', 'CO']]) {
      expect({ city, found: world.some((c) => c.city === city && c.countryCode === code) }).toEqual({ city, found: true });
    }
  });

  it('skips a malformed file or row', () => {
    expect(readWorldCities(null)).toEqual([]);
    expect(readWorldCities({ countries: { XX: 'Xland' }, cities: [['Ok', '', 'XX', 5], [42], ['NoCountry', '', 'ZZ', 1]] }).map((c) => c.city)).toEqual(['Ok']);
  });
});

describe('searching the world list', () => {
  it('ignores accents and puts names that start with the text first, largest first', () => {
    expect(foldText('São Paulo')).toBe('sao paulo');
    const found = searchWorldCities(world, 'sao paulo');
    expect(found[0].city).toBe('São Paulo');
    expect(found[0].countryCode).toBe('BR');
  });

  it('narrows by region or country after a comma', () => {
    expect(searchWorldCities(world, 'Portland, Maine')[0].region).toBe('Maine');
    expect(searchWorldCities(world, 'Portland, Oregon')[0].region).toBe('Oregon');
  });

  it('needs two letters and keeps to the limit', () => {
    expect(searchWorldCities(world, 'a')).toEqual([]);
    expect(searchWorldCities(world, 'san', 10).length).toBe(10);
  });
});

describe("Google's place search", () => {
  it('reads city, region and country from a suggestion', () => {
    const cities = readPlaceSuggestions({
      suggestions: [
        { placePrediction: { placeId: 'a', structuredFormat: { mainText: { text: 'Mendocino' }, secondaryText: { text: 'CA, USA' } } } },
        { placePrediction: { placeId: 'b', structuredFormat: { mainText: { text: 'Hallstatt' }, secondaryText: { text: 'Austria' } } } },
        { placePrediction: { placeId: 'c', structuredFormat: { mainText: { text: 'NoCountry' } } } },
        { queryPrediction: { text: { text: 'pizza' } } },
      ],
    });
    expect(cities).toEqual([
      { placeId: 'a', city: 'Mendocino', region: 'CA', country: 'USA' },
      { placeId: 'b', city: 'Hallstatt', country: 'Austria' },
    ]);
    expect(readPlaceSuggestions({ error: { message: 'denied' } })).toEqual([]);
  });

  it('the picker reads the route answer the same way', () => {
    expect(readPlaceCities([{ city: 'Hallstatt', country: 'Austria' }, { city: 'X' }, 'junk'])).toEqual([{ city: 'Hallstatt', country: 'Austria' }]);
  });

  it('the route needs a signed-in user, limits requests, and says when it is not switched on', () => {
    const route = readFileSync('api/places/autocomplete.ts', 'utf8');
    expect(route.includes('await requireAuth(req, res)')).toBe(true);
    expect(route.includes("applyRateLimit(req.headers, 'places-autocomplete'")).toBe(true);
    expect(route.includes('{ configured: false, cities: [] }')).toBe(true);
  });
});

describe('the city picker', () => {
  const picker = readFileSync('src/components/CitySelector.tsx', 'utf8');

  it('searches the world list and offers Google, crediting both', () => {
    expect(picker.includes('searchWorldCities(world, searchQuery')).toBe(true);
    expect(picker.includes('searchPlacesEverywhere(query)')).toBe(true);
    expect(picker.includes('GeoNames')).toBe(true);
    expect(picker.includes('powered by Google')).toBe(true);
  });

  it('no longer says it is limited to 200 cities', () => {
    expect(picker.includes('Choose from 200 major metropolitan areas')).toBe(false);
    for (const doc of ['docs/manuals/USER_MANUAL.md', 'docs/manuals/CUSTOMER_SERVICE_MANUAL.md', 'docs/OLIVIA_KNOWLEDGE_BASE.md']) {
      expect({ doc, limited: /covers 200 metropolitan areas|Compares 200 metropolitan areas|the list holds 200 metropolitan/.test(readFileSync(doc, 'utf8')) }).toEqual({ doc, limited: false });
    }
  });
});
