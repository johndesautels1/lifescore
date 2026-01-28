/**
 * LIFE SCORE - Emilia Thread API
 * Creates new conversation thread for Emilia help assistant
 *
 * POST /api/emilia/thread
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_TIMEOUT_MS = 30000;

// Emilia Assistant ID (configured in Vercel env vars)
const EMILIA_ASSISTANT_ID = process.env.EMILIA_ASSISTANT_ID || '';

// ============================================================================
// HELPERS
// ============================================================================

function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return key;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'open', { methods: 'POST, OPTIONS' })) return;

  // Method check
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const openaiKey = getOpenAIKey();

    if (!EMILIA_ASSISTANT_ID) {
      console.error('[EMILIA/thread] EMILIA_ASSISTANT_ID not configured');
      res.status(500).json({
        error: 'Emilia assistant not configured',
        message: 'Please set EMILIA_ASSISTANT_ID environment variable',
      });
      return;
    }

    // Create a new thread
    const createThreadResponse = await fetch(`${OPENAI_API_BASE}/threads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({}),
    });

    if (!createThreadResponse.ok) {
      const error = await createThreadResponse.text();
      console.error('[EMILIA/thread] Thread creation failed:', error);
      throw new Error(`Failed to create thread: ${createThreadResponse.status}`);
    }

    const thread = await createThreadResponse.json();

    console.log(`[EMILIA/thread] Created thread: ${thread.id}`);

    res.status(200).json({
      success: true,
      threadId: thread.id,
      message: "Hello! I'm Emilia, your LifeScore help assistant. How can I help you today?",
    });
  } catch (error) {
    console.error('[EMILIA/thread] Error:', error);

    res.status(500).json({
      error: 'Failed to create conversation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
