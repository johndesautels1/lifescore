/**
 * LIFE SCORE - Olivia Field Evidence API
 * Returns source evidence for a specific metric from a saved comparison
 * Also used directly by Olivia's get_field_evidence tool (api/shared/fieldEvidence.ts)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { lookupFieldEvidence } from '../shared/fieldEvidence.js';

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — reject unauthenticated requests
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { comparisonId, metricId, city } = req.body || {};

    if (!comparisonId || typeof comparisonId !== 'string') {
      res.status(400).json({ error: 'comparisonId is required' });
      return;
    }

    if (!metricId || typeof metricId !== 'string') {
      res.status(400).json({ error: 'metricId is required' });
      return;
    }

    const result = await lookupFieldEvidence(auth.userId, comparisonId, metricId, typeof city === 'string' ? city : undefined);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.status(200).json(result.response);
  } catch (error) {
    console.error('[OLIVIA/FIELD-EVIDENCE] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch evidence',
    });
  }
}
