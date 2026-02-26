/**
 * LIFE SCORE - Simli Session API
 *
 * Returns Simli session info for WebRTC session establishment.
 * Requires authentication — API key is NOT returned to the client.
 * The actual WebRTC connection is handled client-side using useSimli hook
 * with credentials from /api/simli-config.
 *
 * Reference: https://docs.simli.com/api-reference/simli-webrtc
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

  // FIX S1: Require authentication — prevent unauthenticated access
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
    console.log('[SIMLI-SESSION] Session created for user:', auth.userId, 'faceId:', faceId);

    // Return session info WITHOUT the API key
    // Client should use /api/simli-config for credentials
    res.status(200).json({
      success: true,
      session: {
        sessionId: `simli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        faceId: faceId,
        wsUrl: 'wss://api.simli.ai/startWebRTCSession',
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
