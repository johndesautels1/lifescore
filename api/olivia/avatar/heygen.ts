/**
 * LIFE SCORE - HeyGen Streaming Avatar API
 * Real-time avatar streaming using HeyGen's Streaming Avatar API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../../shared/rateLimit.js';
import { handleCors } from '../../shared/cors.js';
import { fetchWithTimeout } from '../../shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const HEYGEN_API_BASE = 'https://api.heygen.com/v1';
const HEYGEN_TIMEOUT_MS = 60000;

// Olivia avatar, voice & look defaults
const DEFAULT_AVATAR_ID = process.env.HEYGEN_OLIVIA_AVATAR_ID || '';
const DEFAULT_VOICE_ID = process.env.HEYGEN_OLIVIA_VOICE_ID || '';
const AVATAR_LOOK_ID = process.env.HEYGEN_AVATAR_LOOK_ID || '';

// ============================================================================
// TYPES
// ============================================================================

interface HeyGenSessionRequest {
  action: 'create' | 'speak' | 'interrupt' | 'close';
  sessionId?: string;
  text?: string;
  voiceId?: string;
}

interface HeyGenAccessTokenResponse {
  data: {
    token: string;
  };
}

interface HeyGenSessionResponse {
  data: {
    session_id: string;
    sdp: {
      sdp: string;
      type: 'offer';
    };
    ice_servers: Array<{
      urls: string[];
      username?: string;
      credential?: string;
    }>;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get HeyGen API key
 */
function getHeyGenKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new Error('HEYGEN_API_KEY not configured');
  }
  return key;
}

/**
 * Get HeyGen access token for streaming
 */
async function getAccessToken(apiKey: string): Promise<string> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/streaming.create_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data: HeyGenAccessTokenResponse = await response.json();
  return data.data.token;
}

/**
 * Create streaming session
 */
async function createSession(
  token: string,
  avatarId: string,
  voiceId?: string
): Promise<HeyGenSessionResponse['data']> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/streaming.new`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        avatar_id: avatarId,
        voice_id: voiceId || undefined,
        look_id: AVATAR_LOOK_ID || undefined,
        quality: 'high',
        video_encoding: 'VP8',
      }),
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create session: ${error}`);
  }

  const data: HeyGenSessionResponse = await response.json();
  return data.data;
}

/**
 * Send text for avatar to speak
 */
async function speak(
  token: string,
  sessionId: string,
  text: string
): Promise<void> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/streaming.task`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        text: text,
        task_type: 'talk',
      }),
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to speak: ${error}`);
  }
}

/**
 * Interrupt current speech
 */
async function interrupt(token: string, sessionId: string): Promise<void> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/streaming.interrupt`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to interrupt: ${error}`);
  }
}

/**
 * Close session
 */
async function closeSession(token: string, sessionId: string): Promise<void> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/streaming.stop`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
      }),
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    // Session might already be closed
    console.warn('[HEYGEN] Close session warning:', await response.text());
  }
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - open for avatar
  if (handleCors(req, res, 'same-app')) return;

  // Rate limiting - standard preset for avatar
  if (!applyRateLimit(req.headers, 'heygen', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getHeyGenKey();
    const { action, sessionId, text, voiceId } = req.body as HeyGenSessionRequest;

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    console.log('[HEYGEN] Action:', action);

    switch (action) {
      case 'create': {
        if (!DEFAULT_AVATAR_ID) {
          res.status(400).json({ error: 'HEYGEN_OLIVIA_AVATAR_ID not configured' });
          return;
        }

        // Get access token
        const token = await getAccessToken(apiKey);
        console.log('[HEYGEN] Got access token');

        // Create session
        const session = await createSession(token, DEFAULT_AVATAR_ID, voiceId || DEFAULT_VOICE_ID);
        console.log('[HEYGEN] Created session:', session.session_id);

        res.status(200).json({
          sessionId: session.session_id,
          status: 'created',
          sdpOffer: {
            type: session.sdp.type,
            sdp: session.sdp.sdp,
          },
          iceServers: session.ice_servers.map(server => ({
            urls: server.urls,
            username: server.username,
            credential: server.credential,
          })),
          token, // Client needs token for subsequent requests
        });
        return;
      }

      case 'speak': {
        if (!sessionId || !text) {
          res.status(400).json({ error: 'sessionId and text are required' });
          return;
        }

        // Get token from request body (passed back from create)
        const token = req.body.token;
        if (!token) {
          res.status(400).json({ error: 'token is required for speak action' });
          return;
        }

        await speak(token, sessionId, text);
        console.log('[HEYGEN] Speaking:', text.substring(0, 50) + '...');

        res.status(200).json({
          sessionId,
          status: 'speaking',
        });
        return;
      }

      case 'interrupt': {
        if (!sessionId) {
          res.status(400).json({ error: 'sessionId is required' });
          return;
        }

        const token = req.body.token;
        if (!token) {
          res.status(400).json({ error: 'token is required' });
          return;
        }

        await interrupt(token, sessionId);
        console.log('[HEYGEN] Interrupted session:', sessionId);

        res.status(200).json({
          sessionId,
          status: 'idle',
        });
        return;
      }

      case 'close': {
        if (!sessionId) {
          res.status(400).json({ error: 'sessionId is required' });
          return;
        }

        const token = req.body.token;
        if (token) {
          await closeSession(token, sessionId);
        }
        console.log('[HEYGEN] Closed session:', sessionId);

        res.status(200).json({
          sessionId,
          status: 'closed',
        });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[HEYGEN] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'HeyGen request failed',
    });
  }
}
