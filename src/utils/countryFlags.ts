/**
 * Country flag utilities for LIFE SCORE
 * Uses flagcdn.com CDN for cross-platform flag images
 */

// Country → ISO 3166-1 alpha-2 (lowercase) for flagcdn.com
const COUNTRY_ISO: Record<string, string> = {
  'USA': 'us', 'Canada': 'ca',
  'UK': 'gb', 'France': 'fr', 'Germany': 'de', 'Italy': 'it', 'Spain': 'es',
  'Netherlands': 'nl', 'Belgium': 'be', 'Austria': 'at', 'Switzerland': 'ch',
  'Sweden': 'se', 'Norway': 'no', 'Denmark': 'dk', 'Finland': 'fi', 'Iceland': 'is',
  'Ireland': 'ie', 'Portugal': 'pt', 'Greece': 'gr', 'Poland': 'pl',
  'Czech Republic': 'cz', 'Hungary': 'hu', 'Romania': 'ro', 'Bulgaria': 'bg',
  'Croatia': 'hr', 'Slovakia': 'sk', 'Slovenia': 'si', 'Estonia': 'ee',
  'Latvia': 'lv', 'Lithuania': 'lt', 'Luxembourg': 'lu', 'Malta': 'mt',
  'Cyprus': 'cy', 'Monaco': 'mc',
};

export const getFlagUrl = (country: string): string => {
  const iso = COUNTRY_ISO[country] || country.slice(0, 2).toLowerCase();
  return `https://flagcdn.com/w40/${iso}.png`;
};
