/**
 * LIFE SCORE - the "Save up to N%" label is worked out from the prices (anti-drift).
 *
 * John, 4 Oct 2026 ("Save up to 28%"): the pricing pop-up said "Save 28%" for
 * every plan; SOVEREIGN saves 24%.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { annualSavingPercent, maxAnnualSavingPercent } from '../src/utils/annualSaving';

describe('annual saving', () => {
  it('works out each plan, rounded down', () => {
    expect(annualSavingPercent(29, 249)).toBe(28); // NAVIGATOR: 99 saved of 348
    expect(annualSavingPercent(99, 899)).toBe(24); // SOVEREIGN: 289 saved of 1,188
    expect(annualSavingPercent(0, 0)).toBe(0);
    expect(annualSavingPercent(10, 130)).toBe(0); // never a negative saving
  });

  it('takes the largest saving across the plans', () => {
    expect(maxAnnualSavingPercent([
      { monthlyPrice: 0, annualPrice: 0 },
      { monthlyPrice: 29, annualPrice: 249 },
      { monthlyPrice: 99, annualPrice: 899 },
    ])).toBe(28);
  });

  it('both pricing screens print it from their own price lists, never a fixed number', () => {
    for (const file of ['src/components/PricingModal.tsx', 'src/components/PricingPage.tsx']) {
      const text = readFileSync(file, 'utf8');
      expect({ file, computed: text.includes('Save up to {maxAnnualSavingPercent(PRICING_TIERS)}%') }).toEqual({ file, computed: true });
      expect({ file, fixed: /Save (up to )?\d+%/.test(text) }).toEqual({ file, fixed: false });
    }
  });

  it('both pricing screens take their prices from the one list (api/shared/plans.ts TIER_PRICING)', () => {
    for (const file of ['src/components/PricingModal.tsx', 'src/components/PricingPage.tsx']) {
      const text = readFileSync(file, 'utf8');
      expect({ file, fixedPrices: /(monthly|annual)Price:\s*\d/.test(text) }).toEqual({ file, fixedPrices: false });
      expect({ file, list: text.includes('TIER_PRICING.pro.annual') && text.includes('TIER_PRICING.enterprise.monthly') }).toEqual({ file, list: true });
    }
  });
});
