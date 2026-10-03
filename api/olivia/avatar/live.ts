/**
 * LIFE SCORE - Olivia's live face (HeyGen LiveAvatar, LITE mode)
 *
 * POST /api/olivia/avatar/live
 *   { action: 'session' }                     → { sessionId, livekitUrl, livekitToken, wsUrl }
 *   { action: 'keep-alive', sessionId }        → { ok }
 *   { action: 'stop', sessionId }              → { ok }
 *   { action: 'speak', text }                  → { audioBase64 }   (her ElevenLabs voice, PCM 24 kHz)
 *
 * The session and voice calls are the questionnaire engine's, ported verbatim
 * (api/shared/liveAvatar.ts, api/shared/oliviaVoice.ts). The vendor key never
 * leaves the server: the browser gets a LiveKit room and a socket that expire.
 *
 * Olivia's previous face (Simli, with D-ID behind it) stays as the automatic
 * back-up when this route cannot start a session (src/hooks/useOliviaFace.ts).
 *
 * Unlike the engine's presenter, the words come from the browser: here Olivia
 * voices her own chat reply, which the browser already holds. They are capped
 * and the route is limited to plans that include Olivia.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../shared/cors.js';
import { applyRateLimit } from '../../shared/rateLimit.js';
import { requireFeature } from '../../shared/entitlements.js';
import {
  keepOliviaSessionAlive,
  liveAvatarMessage,
  startOliviaSession,
  stopOliviaSession,
} from '../../shared/liveAvatar.js';
import { oliviaVoiceMessage, speakAsOlivia } from '../../shared/oliviaVoice.js';
import { VOICE_MAX_CHARS } from '../../shared/oliviaVoiceRequest.js';

/** A vendor session id: letters, digits, `_` and `-`. Anything else is refused. */
const SESSION_ID = /^[A-Za-z0-9_-]{1,128}$/;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;
  if (!applyRateLimit(req.headers, 'olivia-live', 'standard', res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = (req.body || {}) as { action?: unknown; sessionId?: unknown; text?: unknown };

  // Sign-in + a plan that includes Olivia. Messages are counted by the chat route.
  const entitled = await requireFeature(req, res, 'oliviaMinutesPerMonth');
  if (!entitled) return;

  switch (body.action) {
    case 'session': {
      const started = await startOliviaSession();
      if (!started.ok) {
        console.warn(`[OLIVIA/LIVE] session refused: ${started.reason} — ${started.detail}`);
        res.status(started.reason === 'not-configured' ? 503 : 502).json({
          error: liveAvatarMessage(started.reason),
          reason: started.reason,
        });
        return;
      }
      const { sessionId, livekitUrl, livekitToken, wsUrl } = started.session;
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ sessionId, livekitUrl, livekitToken, wsUrl });
      return;
    }

    case 'keep-alive':
    case 'stop': {
      if (typeof body.sessionId !== 'string' || !SESSION_ID.test(body.sessionId)) {
        res.status(400).json({ error: 'sessionId is required' });
        return;
      }
      const ok = body.action === 'stop'
        ? await stopOliviaSession(body.sessionId)
        : await keepOliviaSessionAlive(body.sessionId);
      res.status(200).json({ ok });
      return;
    }

    case 'speak': {
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text || text.length > VOICE_MAX_CHARS) {
        res.status(400).json({ error: `text is required (${VOICE_MAX_CHARS} characters at most)` });
        return;
      }
      const spoken = await speakAsOlivia(text);
      if (!spoken.ok) {
        console.warn(`[OLIVIA/LIVE] voice refused: ${spoken.reason} — ${spoken.detail}`);
        res.status(502).json({ error: oliviaVoiceMessage(spoken.reason), reason: spoken.reason });
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ audioBase64: spoken.audioBase64 });
      return;
    }

    default:
      res.status(400).json({ error: "action must be 'session', 'keep-alive', 'stop' or 'speak'" });
  }
}
