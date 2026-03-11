/**
 * LIFE SCORE - Simli Session API (v3 SDK)
 *
 * Returns Simli session status/info. The actual session token is now
 * generated server-side by /api/simli-config (v3 token flow).
 * This endpoint provides session metadata only.
 *
 * POST /api/avatar/simli-session
 *
 * Migrated from v2 on 2026-03-11. Removed deprecated wsUrl endpoint.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Require authentication
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const apiKey = process.env.SIMLI_API_KEY;
  const faceId = process.env.SIMLI_FACE_ID;

  if (!apiKey || !faceId) {
    res.status(503).json({
      error: 'Simli not configured',
    });
    return;
  }

  try {
    console.log('[SIMLI-SESSION] Session info requested by user:', auth.userId, 'faceId:', faceId);

    // Return session metadata (token generation is handled by /api/simli-config)
    res.status(200).json({
      success: true,
      session: {
        sessionId: `simli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        faceId: faceId,
        status: 'ready',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SIMLI-SESSION] Error:', error);
    res.status(500).json({
      error: 'Failed to create session',
    });
  }
}
