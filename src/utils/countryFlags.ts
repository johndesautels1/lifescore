/**
 * Country flag utilities for LIFE SCORE
 * Uses flagcdn.com CDN for cross-platform flag images
 *
 * Any country in the world (John, 4 Oct 2026: compare any two cities): the code
 * comes from the city when it carries one, else from the country's name -
 * every name in src/data/countries.ts (GeoNames) plus the short forms the app
 * and Google use ("USA", "UK", "Czech Republic"...).
 */

import { COUNTRY_NAMES } from '../data/countries';

/** Short or older names → ISO 3166-1 alpha-2 (lowercase). */
const ALIASES: Record<string, string> = {
  'usa': 'us', 'united states of america': 'us', 'us': 'us',
  'uk': 'gb', 'england': 'gb', 'scotland': 'gb', 'wales': 'gb', 'northern ireland': 'gb', 'great britain': 'gb',
  'czech republic': 'cz', 'czechia': 'cz',
  'turkey': 'tr', 'türkiye': 'tr',
  'south korea': 'kr', 'korea': 'kr', 'north korea': 'kp',
  'russia': 'ru', 'vietnam': 'vn', 'iran': 'ir', 'syria': 'sy', 'laos': 'la',
  'macedonia': 'mk', 'north macedonia': 'mk',
  "côte d'ivoire": 'ci', 'cote d\'ivoire': 'ci', 'ivory coast': 'ci',
  'holland': 'nl', 'netherlands': 'nl', 'the netherlands': 'nl',
  'uae': 'ae', 'united arab emirates': 'ae',
  'taiwan': 'tw', 'palestine': 'ps', 'vatican city': 'va', 'hong kong': 'hk', 'macau': 'mo',
};

/** Every GeoNames country name → its code. */
const BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name.toLowerCase(), code.toLowerCase()])
);

/** The country's ISO 3166-1 alpha-2 code (lowercase); the city's own code wins. */
export function countryIso(country: string, countryCode?: string): string {
  if (countryCode && /^[A-Za-z]{2}$/.test(countryCode)) return countryCode.toLowerCase();
  const key = country.trim().toLowerCase();
  return ALIASES[key] ?? BY_NAME[key] ?? key.slice(0, 2);
}

export const getFlagUrl = (country: string, countryCode?: string): string => {
  return `https://flagcdn.com/w40/${countryIso(country, countryCode)}.png`;
};
