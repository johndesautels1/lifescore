/**
 * LIFE SCORE - Start a comparison: count it once, hand back a grant.
 *
 * POST /api/usage/consume  { feature: 'standardComparisons' | 'enhancedComparisons', city1, city2 }
 *   200 { grant, used, limit }        — the comparison is counted; send `grant` in the
 *                                       x-usage-grant header to /api/evaluate, /api/judge
 *                                       and /api/judge-report for this city pair
 *   403 { code: 'upgrade_required' | 'limit_reached', requiredTier, used, limit }
 *   503 { code: 'entitlement_unavailable' }
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { applyRateLimit } from '../shared/rateLimit.js';
import { isComparisonFeature, requireFeature, refundFeature, signComparisonGrant } from '../shared/entitlements.js';

const MAX_CITY_LENGTH = 200;

function isCity(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_CITY_LENGTH;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;
  if (!applyRateLimit(req.headers, 'usage-consume', 'standard', res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body: unknown = req.body;
  const { feature, city1, city2 } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  if (!isComparisonFeature(feature) || !isCity(city1) || !isCity(city2)) {
    res.status(400).json({ error: 'feature (standardComparisons or enhancedComparisons), city1 and city2 are required' });
    return;
  }

  const entitled = await requireFeature(req, res, feature, { consume: true });
  if (!entitled) return;

  const grant = signComparisonGrant(entitled.auth.userId, feature, city1, city2);
  if (!grant) {
    await refundFeature(entitled.auth.userId, feature, entitled.access.limits);
    res.status(503).json({ error: 'Comparisons are unavailable right now. Please try again shortly.', code: 'grant_unavailable' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ grant, limit: entitled.access.limits[feature] });
}
