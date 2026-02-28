/**
 * LIFE SCORE - Metric Display Names Unit Tests
 * Validates the display name mapping covers all expected metrics
 */
import { describe, it, expect } from 'vitest';
import { METRIC_DISPLAY_NAMES } from '../src/shared/metricDisplayNames';

describe('METRIC_DISPLAY_NAMES', () => {
  it('has entries for all 100 metrics', () => {
    const count = Object.keys(METRIC_DISPLAY_NAMES).length;
    expect(count).toBe(100);
  });

  it('has all personal freedom metrics (pf_01 through pf_15)', () => {
    for (let i = 1; i <= 15; i++) {
      const key = `pf_${String(i).padStart(2, '0')}_`;
      const found = Object.keys(METRIC_DISPLAY_NAMES).some(k => k.startsWith(key));
      expect(found, `Missing personal freedom metric ${key}*`).toBe(true);
    }
  });

  it('has all housing property metrics (hp_01 through hp_20)', () => {
    for (let i = 1; i <= 20; i++) {
      const key = `hp_${String(i).padStart(2, '0')}_`;
      const found = Object.keys(METRIC_DISPLAY_NAMES).some(k => k.startsWith(key));
      expect(found, `Missing housing property metric ${key}*`).toBe(true);
    }
  });

  it('has all business work metrics (bw_01 through bw_25)', () => {
    for (let i = 1; i <= 25; i++) {
      const key = `bw_${String(i).padStart(2, '0')}_`;
      const found = Object.keys(METRIC_DISPLAY_NAMES).some(k => k.startsWith(key));
      expect(found, `Missing business work metric ${key}*`).toBe(true);
    }
  });

  it('has no empty display names', () => {
    for (const [key, value] of Object.entries(METRIC_DISPLAY_NAMES)) {
      expect(value.trim().length, `Empty display name for ${key}`).toBeGreaterThan(0);
    }
  });

  it('all display names are human-readable (no underscores)', () => {
    for (const [key, value] of Object.entries(METRIC_DISPLAY_NAMES)) {
      expect(value.includes('_'), `Display name for ${key} contains underscore: "${value}"`).toBe(false);
    }
  });

  it('maps specific known metrics correctly', () => {
    expect(METRIC_DISPLAY_NAMES['pf_01_cannabis_legal']).toBe('Cannabis Legality');
    expect(METRIC_DISPLAY_NAMES['pf_07_lgbtq_rights']).toBe('LGBTQ+ Rights');
    expect(METRIC_DISPLAY_NAMES['hp_01_hoa_prevalence']).toBe('HOA Prevalence');
  });
});
