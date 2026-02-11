/**
 * LIFE SCORE - Simli Session API
 *
 * Returns Simli credentials for WebRTC session establishment.
 * The actual WebRTC connection is handled client-side using useSimli hook.
 *
 * Reference: https://docs.simli.com/api-reference/simli-webrtc
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';

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

  const apiKey = process.env.SIMLI_API_KEY;
  const faceId = process.env.SIMLI_FACE_ID;

  if (!apiKey || !faceId) {
    res.status(500).json({
      error: 'Simli not configured',
      message: 'SIMLI_API_KEY and SIMLI_FACE_ID environment variables required',
      configured: {
        apiKey: !!apiKey,
        faceId: !!faceId,
      },
    });
    return;
  }

  try {
    console.log('[SIMLI-SESSION] Providing credentials for faceId:', faceId);

    // Return credentials for client-side WebRTC connection
    // The actual session is established via WebSocket in useSimli hook
    res.status(200).json({
      success: true,
      session: {
        sessionId: `simli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        faceId: faceId,
        apiKey: apiKey, // Sent securely to client for WebRTC auth
        wsUrl: 'wss://api.simli.ai/startWebRTCSession',
        status: 'ready',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SIMLI-SESSION] Error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
