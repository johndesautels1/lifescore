/**
 * LIFE SCORE - D-ID Streams API
 * Real-time video streaming avatar for the Ask Olivia cockpit page
 *
 * This creates a WebRTC stream of the Olivia avatar that can be displayed
 * in the TV viewport and lip-synced to OpenAI responses.
 *
 * RATE LIMITING: Server-side protection against runaway retry loops
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CONSTANTS
// ============================================================================

const DID_API_BASE = 'https://api.d-id.com';
const DID_TIMEOUT_MS = 30000;

// ============================================================================
// SERVER-SIDE RATE LIMITING (Defense in depth)
// ============================================================================

// Simple in-memory rate limiter (resets on cold start, but that's OK for burst protection)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;  // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 30;  // Max 30 requests per minute per IP

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = ip || 'unknown';
  const record = rateLimitMap.get(key);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 1000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetTime < now) rateLimitMap.delete(k);
    }
  }

  if (!record || record.resetTime < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count, resetIn: record.resetTime - now };
}

// Olivia's presenter image (the avatar image)
const OLIVIA_SOURCE_URL = process.env.DID_PRESENTER_URL || 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg';

// Voice settings
const VOICE_PROVIDER = 'elevenlabs';
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

// ============================================================================
// TYPES
// ============================================================================

interface StreamRequest {
  action: 'create' | 'speak' | 'destroy' | 'ice-candidate';
  streamId?: string;
  sessionId?: string;
  text?: string;
  candidate?: RTCIceCandidateInit;
  sdpAnswer?: string;
}

interface StreamSession {
  id: string;
  session_id: string;
  offer: RTCSessionDescriptionInit;
  ice_servers: RTCIceServer[];
}

// ============================================================================
// HELPERS
// ============================================================================

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

function getDIDAuthHeader(): string {
  const key = process.env.DID_API_KEY;
  if (!key) {
    throw new Error('DID_API_KEY not configured');
  }
  // D-ID expects Basic auth with email:key format
  const credentials = key.includes(':') ? key : `:${key}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// ============================================================================
// D-ID STREAMS API FUNCTIONS
// ============================================================================

/**
 * Create a new streaming session
 * Returns an SDP offer and ICE servers for WebRTC connection
 */
async function createStream(authHeader: string): Promise<StreamSession> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks/streams`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        source_url: OLIVIA_SOURCE_URL,
        driver_url: 'bank://lively', // Natural movement driver
        config: {
          stitch: true, // Better quality
          result_format: 'mp4',
        },
      }),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DID-STREAMS] Create error:', error);
    throw new Error(`Failed to create stream: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('[DID-STREAMS] Created stream:', data.id);

  return {
    id: data.id,
    session_id: data.session_id,
    offer: data.offer,
    ice_servers: data.ice_servers,
  };
}

/**
 * Start the stream with SDP answer from client
 */
async function startStream(
  authHeader: string,
  streamId: string,
  sessionId: string,
  sdpAnswer: string
): Promise<void> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks/streams/${streamId}/sdp`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        answer: sdpAnswer,
        session_id: sessionId,
      }),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start stream: ${error}`);
  }

  console.log('[DID-STREAMS] Stream started');
}

/**
 * Send ICE candidate to D-ID
 */
async function sendIceCandidate(
  authHeader: string,
  streamId: string,
  sessionId: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks/streams/${streamId}/ice`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        candidate: candidate.candidate,
        sdpMid: candidate.sdpMid,
        sdpMLineIndex: candidate.sdpMLineIndex,
        session_id: sessionId,
      }),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    console.warn('[DID-STREAMS] ICE candidate warning:', await response.text());
  }
}

/**
 * Make the avatar speak text
 */
async function speakText(
  authHeader: string,
  streamId: string,
  sessionId: string,
  text: string
): Promise<{ duration: number }> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks/streams/${streamId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        script: {
          type: 'text',
          input: text,
          provider: {
            type: VOICE_PROVIDER,
            voice_id: VOICE_ID,
          },
        },
        session_id: sessionId,
        config: {
          fluent: true,
          pad_audio: 0.5,
        },
      }),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to speak: ${error}`);
  }

  const data = await response.json();
  console.log('[DID-STREAMS] Speaking, duration:', data.duration);

  return { duration: data.duration || text.length * 50 }; // Estimate if not provided
}

/**
 * Destroy streaming session
 */
async function destroyStream(
  authHeader: string,
  streamId: string,
  sessionId: string
): Promise<void> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks/streams/${streamId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
      body: JSON.stringify({ session_id: sessionId }),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    console.warn('[DID-STREAMS] Destroy warning:', await response.text());
  } else {
    console.log('[DID-STREAMS] Stream destroyed');
  }
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Server-side rate limiting (defense in depth)
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.headers['x-real-ip'] as string
    || 'unknown';
  const rateLimit = checkRateLimit(clientIp);

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetIn / 1000).toString());

  if (!rateLimit.allowed) {
    console.warn(`[DID-STREAMS] Rate limited: ${clientIp}`);
    res.status(429).json({
      error: 'Too many requests. Please wait before retrying.',
      retryAfter: Math.ceil(rateLimit.resetIn / 1000),
    });
    return;
  }

  try {
    const authHeader = getDIDAuthHeader();
    const { action, streamId, sessionId, text, candidate, sdpAnswer } = req.body as StreamRequest;

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    console.log('[DID-STREAMS] Action:', action, '| IP:', clientIp, '| Remaining:', rateLimit.remaining);

    switch (action) {
      case 'create': {
        const stream = await createStream(authHeader);
        res.status(200).json({
          streamId: stream.id,
          sessionId: stream.session_id,
          offer: stream.offer,
          iceServers: stream.ice_servers,
        });
        return;
      }

      case 'speak': {
        if (!streamId || !sessionId || !text) {
          res.status(400).json({ error: 'streamId, sessionId, and text are required' });
          return;
        }

        // If sdpAnswer provided, start the stream first
        if (sdpAnswer) {
          await startStream(authHeader, streamId, sessionId, sdpAnswer);
        }

        const result = await speakText(authHeader, streamId, sessionId, text);
        res.status(200).json({
          status: 'speaking',
          duration: result.duration,
        });
        return;
      }

      case 'ice-candidate': {
        if (!streamId || !sessionId || !candidate) {
          res.status(400).json({ error: 'streamId, sessionId, and candidate are required' });
          return;
        }

        await sendIceCandidate(authHeader, streamId, sessionId, candidate);
        res.status(200).json({ status: 'ok' });
        return;
      }

      case 'destroy': {
        if (!streamId || !sessionId) {
          res.status(400).json({ error: 'streamId and sessionId are required' });
          return;
        }

        await destroyStream(authHeader, streamId, sessionId);
        res.status(200).json({ status: 'destroyed' });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[DID-STREAMS] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Stream request failed',
    });
  }
}
