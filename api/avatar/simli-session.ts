/**
 * LIFE SCORE - Simli Session API
 *
 * Creates a Simli streaming session for Olivia avatar.
 * Returns session ID and WebRTC stream URL.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';

// Simli API configuration
const SIMLI_API_URL = 'https://api.simli.ai/v1';

export const config = {
  maxDuration: 30,
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Handle CORS
  if (handleCors(req, res, 'open')) return;

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
    });
    return;
  }

  try {
    console.log('[SIMLI] Creating session with faceId:', faceId);

    // Create Simli session
    const response = await fetch(`${SIMLI_API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face_id: faceId,
        // Optional: voice settings
        voice: {
          provider: 'elevenlabs', // or 'azure', 'google'
          voice_id: process.env.SIMLI_VOICE_ID || 'default',
        },
        // Session settings
        settings: {
          language: 'en',
          interruption_enabled: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SIMLI] Session creation failed:', response.status, errorText);
      res.status(response.status).json({
        error: 'Failed to create Simli session',
        message: errorText,
      });
      return;
    }

    const data = await response.json();
    console.log('[SIMLI] Session created:', data.session_id);

    res.status(200).json({
      success: true,
      session: {
        sessionId: data.session_id,
        faceId: faceId,
        streamUrl: data.stream_url,
        status: 'connected',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[SIMLI] Session error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
