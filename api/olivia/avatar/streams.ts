/**
 * LIFE SCORE - D-ID Streams API
 * Real-time video streaming avatar for the Ask Olivia cockpit page
 *
 * This creates a WebRTC stream of the Olivia avatar that can be displayed
 * in the TV viewport and lip-synced to OpenAI responses.
 *
 * VOICE: Microsoft Sonia (en-GB-SoniaNeural) - D-ID built-in voice
 * No external ElevenLabs API key required for lip-sync.
 *
 * RATE LIMITING: Server-side protection against runaway retry loops
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../../shared/rateLimit.js';
import { handleCors } from '../../shared/cors.js';
import { fetchWithTimeout } from '../../shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DID_API_BASE = 'https://api.d-id.com';
const DID_TIMEOUT_MS = 60000;

// Olivia's presenter image (the avatar image)
const OLIVIA_SOURCE_URL = process.env.DID_PRESENTER_URL || 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg';

// Voice settings - using Microsoft for testing (D-ID built-in)
const VOICE_PROVIDER = 'microsoft';
const VOICE_ID = 'en-GB-SoniaNeural';

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

/**
 * Strip markdown formatting from text for natural speech
 * Removes: **bold**, *italic*, # headers, - bullets, [links](url), etc.
 */
function stripMarkdown(text: string): string {
  return text
    // Remove headers (# ## ### etc)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic *text* or _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove inline code `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks ```code```
    .replace(/```[\s\S]*?```/g, '')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove bullet points and list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Clean up multiple spaces/newlines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
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
 * D-ID expects answer as RTCSessionDescriptionInit object: { type: 'answer', sdp: '...' }
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
        answer: {
          type: 'answer',
          sdp: sdpAnswer,
        },
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
  // Strip markdown formatting so Olivia speaks naturally
  const cleanText = stripMarkdown(text);

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
          input: cleanText,
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
  // CORS - open for avatar streaming
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting - standard preset for avatar streaming
  if (!applyRateLimit(req.headers, 'did-streams', 'standard', res)) {
    return; // 429 already sent
  }

  try {
    const authHeader = getDIDAuthHeader();
    const { action, streamId, sessionId, text, candidate, sdpAnswer } = req.body as StreamRequest;

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    console.log('[DID-STREAMS] Action:', action);

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
