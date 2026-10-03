/**
 * LIFE SCORE - Emilia Message API
 * Send a message to Emilia, the help assistant, and get her answer.
 *
 * POST /api/emilia/message
 *   { threadId, message, history? } → { success, response: { id, content, createdAt } }
 *
 * Emilia ran on OpenAI Assistants until OpenAI switched that service off on
 * 26 August 2026. She now runs on Claude through the shared call point
 * (api/shared/anthropic.ts), model AI_MODELS.writer. Her instructions
 * (docs/EMILIA_INSTRUCTIONS.md) and the five manuals she answers from are read
 * from the deployment (api/shared/knowledge.ts) and cached by Claude. The
 * conversation so far comes from the browser.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { applyRateLimit } from '../shared/rateLimit.js';
import { callClaude, cleanConversation } from '../shared/anthropic.js';
import { AI_MODELS } from '../shared/models.js';
import { loadKnowledge } from '../shared/knowledge.js';

// ============================================================================
// LIMITS
// ============================================================================

const EMILIA_TIMEOUT_MS = 55_000; // inside the route's 60-second limit
const MAX_HISTORY_TURNS = 20;
const MAX_TURN_CHARS = 4_000;
const MAX_MESSAGE_CHARS = 4_000;

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;
  if (!applyRateLimit(req.headers, 'emilia-message', 'standard', res)) return;

  // Method check
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Signed-in users only
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { threadId, message, history } = (req.body || {}) as { threadId?: unknown; message?: unknown; history?: unknown };
  const text = typeof message === 'string' ? message.trim() : '';
  if (typeof threadId !== 'string' || !threadId || !text || text.length > MAX_MESSAGE_CHARS) {
    res.status(400).json({ error: `threadId and message are required (${MAX_MESSAGE_CHARS} characters at most)` });
    return;
  }

  const knowledge = loadKnowledge('emilia');
  if (!knowledge.ok) {
    res.status(503).json({ error: 'Emilia is unavailable right now. Please try again shortly.' });
    return;
  }

  const reply = await callClaude({
    model: AI_MODELS.writer.id,
    maxTokens: 8000,
    effort: 'low', // help-desk answers: quick and direct
    system: [{ type: 'text', text: knowledge.text, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: [...cleanConversation(history, MAX_HISTORY_TURNS, MAX_TURN_CHARS), { role: 'user', content: text }],
    timeoutMs: EMILIA_TIMEOUT_MS,
    label: 'emilia',
  });

  if (!reply.ok) {
    console.error('[EMILIA/message] Claude call failed:', reply.kind, reply.message);
    res.status(502).json({ error: 'Emilia could not answer just now. Please try again.' });
    return;
  }

  res.status(200).json({
    success: true,
    response: {
      id: randomUUID(),
      content: reply.text,
      createdAt: new Date().toISOString(),
    },
  });
}
