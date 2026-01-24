/**
 * LIFE SCORE - Simli Speak API
 *
 * Sends text for Olivia to speak via Simli.
 * The avatar will lip-sync and speak the text in real-time.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';

const SIMLI_API_URL = 'https://api.simli.ai/v1';

export const config = {
  maxDuration: 60,
};

interface SpeakRequest {
  sessionId: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';
  speed?: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.SIMLI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Simli not configured' });
    return;
  }

  const body = req.body as SpeakRequest;

  if (!body.sessionId || !body.text) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['sessionId', 'text'],
    });
    return;
  }

  try {
    console.log('[SIMLI] Speaking:', body.text.substring(0, 50) + '...');

    const response = await fetch(`${SIMLI_API_URL}/sessions/${body.sessionId}/speak`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: body.text,
        emotion: body.emotion || 'neutral',
        speed: body.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SIMLI] Speak failed:', response.status, errorText);
      res.status(response.status).json({
        error: 'Failed to speak',
        message: errorText,
      });
      return;
    }

    const data = await response.json();
    console.log('[SIMLI] Speaking started, duration:', data.duration);

    res.status(200).json({
      success: true,
      duration: data.duration,
    });
  } catch (error) {
    console.error('[SIMLI] Speak error:', error);
    res.status(500).json({
      error: 'Failed to speak',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
