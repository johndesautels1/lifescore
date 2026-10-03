/**
 * LIFE SCORE - Emilia Thread API
 * Starts a new conversation with Emilia, the help assistant.
 *
 * POST /api/emilia/thread → { success, threadId, message }
 *
 * Emilia ran on OpenAI Assistants threads until OpenAI switched that service off
 * on 26 August 2026. She now runs on Claude (api/emilia/message.ts), which keeps
 * no server-side threads: the id below only labels the conversation in this
 * browser, and the conversation itself travels with each message.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;

  // Method check
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Signed-in users only
  const auth = await requireAuth(req, res);
  if (!auth) return;

  res.status(200).json({
    success: true,
    threadId: randomUUID(),
    message: "Hello! I'm Emilia, your LifeScore help assistant. How can I help you today?",
  });
}
