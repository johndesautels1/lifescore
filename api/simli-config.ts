/**
 * LIFE SCORE - Simli Config API
 *
 * Returns Simli credentials to authenticated users only.
 * Keeps SIMLI_API_KEY out of the static JS bundle.
 *
 * GET /api/simli-config
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — only authenticated users get Simli credentials
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.SIMLI_API_KEY || process.env.VITE_SIMLI_API_KEY || '';
  const faceId = process.env.SIMLI_FACE_ID || process.env.VITE_SIMLI_FACE_ID || '';

  if (!apiKey || !faceId) {
    res.status(503).json({ error: 'Simli not configured' });
    return;
  }

  res.status(200).json({ apiKey, faceId });
}
