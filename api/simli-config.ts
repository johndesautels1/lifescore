/**
 * LIFE SCORE - Simli Config API (v3 SDK)
 *
 * Generates a Simli session token and ICE servers server-side.
 * The API key NEVER leaves the server — only the session token
 * and ICE servers are returned to the authenticated client.
 *
 * POST /api/simli-config
 *
 * Migrated from v2 (returned raw apiKey) to v3 token flow on 2026-03-11.
 * See: https://docs.simli.com/api-reference/simli-client
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './shared/cors.js';
import { requireFeature } from './shared/entitlements.js';
import { asRecord, readIceServers, text, type IceServer } from './shared/jsonRead.js';

export const config = {
  maxDuration: 30,
};

const SIMLI_API_URL = 'https://api.simli.ai';

/** The session_token from Simli's /compose/token reply, if present. */
function readSessionToken(body: unknown): string | undefined {
  return text(asRecord(body).session_token);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // JWT auth — only authenticated users get Simli session tokens
  const auth = (await requireFeature(req, res, 'oliviaMinutesPerMonth'))?.auth ?? null;
  if (!auth) return;

  const apiKey = process.env.SIMLI_API_KEY || '';
  const faceId = process.env.SIMLI_FACE_ID || '';

  if (!apiKey || !faceId) {
    res.status(503).json({ error: 'Simli not configured' });
    return;
  }

  try {
    console.log('[SIMLI-CONFIG] Generating session token for user:', auth.userId);

    // Generate session token via Simli API (v3 flow)
    const tokenResponse = await fetch(`${SIMLI_API_URL}/compose/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-simli-api-key': apiKey,
      },
      body: JSON.stringify({
        faceId,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 600,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[SIMLI-CONFIG] Token generation failed:', tokenResponse.status, errorText);
      res.status(502).json({ error: 'Failed to generate Simli session token' });
      return;
    }

    const tokenData: unknown = await tokenResponse.json();
    const sessionToken = readSessionToken(tokenData);

    if (!sessionToken) {
      console.error('[SIMLI-CONFIG] No session_token in response:', tokenData);
      res.status(502).json({ error: 'Invalid Simli token response' });
      return;
    }

    // Generate ICE servers via Simli API (v3 flow)
    let iceServers: IceServer[] = [{ urls: ['stun:stun.l.google.com:19302'] }];
    try {
      const iceResponse = await fetch(`${SIMLI_API_URL}/compose/ice`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-simli-api-key': apiKey,
        },
      });

      if (iceResponse.ok) {
        const iceData = readIceServers(await iceResponse.json());
        if (iceData.length > 0) {
          iceServers = iceData;
        }
      } else {
        console.warn('[SIMLI-CONFIG] ICE server fetch failed, using STUN fallback');
      }
    } catch (iceErr) {
      console.warn('[SIMLI-CONFIG] ICE server fetch error, using STUN fallback:', iceErr);
    }

    console.log('[SIMLI-CONFIG] Session token generated, ICE servers:', iceServers.length);

    // Return session token + ICE servers (API key stays on server)
    res.status(200).json({
      sessionToken,
      iceServers,
      faceId,
    });
  } catch (error) {
    console.error('[SIMLI-CONFIG] Error:', error);
    res.status(500).json({ error: 'Failed to generate Simli session config' });
  }
}
