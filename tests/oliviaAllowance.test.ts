/**
 * LIFE SCORE - Olivia's allowance is promised in messages, the unit the app counts (anti-drift).
 *
 * John, 4 Oct 2026 ("Say messages"): pricing promised "15 min" / "60 min" of
 * Olivia a month while api/olivia/chat.ts counts every message as one against
 * oliviaMinutesPerMonth (15 NAVIGATOR, 60 SOVEREIGN). The screens now print
 * messages, with the numbers read from TIER_LIMITS.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TIER_LIMITS } from '../api/shared/plans';

const screens = ['src/components/PricingModal.tsx', 'src/components/PricingPage.tsx', 'src/components/FeatureGate.tsx'];

describe("Olivia's allowance", () => {
  it('is counted per message', () => {
    expect(readFileSync('api/olivia/chat.ts', 'utf8').includes("requireFeature(req, res, 'oliviaMinutesPerMonth', { consume: true })")).toBe(true);
    expect(TIER_LIMITS.pro.oliviaMinutesPerMonth).toBeGreaterThan(0);
  });

  it('is promised in messages, from the limits table, never in minutes', () => {
    for (const file of screens) {
      const text = readFileSync(file, 'utf8');
      expect({ file, minutes: /\d+ ?min(\/month| Olivia)/.test(text) }).toEqual({ file, minutes: false });
      expect({ file, fromTable: text.includes('TIER_LIMITS.pro.oliviaMinutesPerMonth') && text.includes('TIER_LIMITS.enterprise.oliviaMinutesPerMonth') }).toEqual({ file, fromTable: true });
      expect({ file, messages: text.includes('messages/month') }).toEqual({ file, messages: true });
    }
  });
});
