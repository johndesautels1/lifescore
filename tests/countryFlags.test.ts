/**
 * LIFE SCORE - Country Flags Unit Tests
 * Tests flag URL generation from country names
 */
import { describe, it, expect } from 'vitest';
import { getFlagUrl } from '../src/utils/countryFlags';

describe('getFlagUrl', () => {
  it('returns correct flag URL for known countries', () => {
    expect(getFlagUrl('USA')).toBe('https://flagcdn.com/w40/us.png');
    expect(getFlagUrl('Canada')).toBe('https://flagcdn.com/w40/ca.png');
    expect(getFlagUrl('UK')).toBe('https://flagcdn.com/w40/gb.png');
    expect(getFlagUrl('France')).toBe('https://flagcdn.com/w40/fr.png');
    expect(getFlagUrl('Germany')).toBe('https://flagcdn.com/w40/de.png');
  });

  it('returns correct URL for European countries', () => {
    expect(getFlagUrl('Netherlands')).toBe('https://flagcdn.com/w40/nl.png');
    expect(getFlagUrl('Sweden')).toBe('https://flagcdn.com/w40/se.png');
    expect(getFlagUrl('Norway')).toBe('https://flagcdn.com/w40/no.png');
    expect(getFlagUrl('Poland')).toBe('https://flagcdn.com/w40/pl.png');
    expect(getFlagUrl('Switzerland')).toBe('https://flagcdn.com/w40/ch.png');
  });

  it('falls back to first two chars for unknown countries', () => {
    // Unknown country: takes first 2 chars, lowercased
    expect(getFlagUrl('Australia')).toBe('https://flagcdn.com/w40/au.png');
    expect(getFlagUrl('Mexico')).toBe('https://flagcdn.com/w40/me.png');
  });

  it('handles all mapped countries without errors', () => {
    const countries = [
      'USA', 'Canada', 'UK', 'France', 'Germany', 'Italy', 'Spain',
      'Netherlands', 'Belgium', 'Austria', 'Switzerland', 'Sweden',
      'Norway', 'Denmark', 'Finland', 'Iceland', 'Ireland', 'Portugal',
      'Greece', 'Poland', 'Czech Republic', 'Hungary', 'Romania',
      'Bulgaria', 'Croatia', 'Slovakia', 'Slovenia', 'Estonia',
      'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Cyprus', 'Monaco',
    ];
    for (const country of countries) {
      const url = getFlagUrl(country);
      expect(url).toMatch(/^https:\/\/flagcdn\.com\/w40\/[a-z]{2}\.png$/);
    }
  });
});
