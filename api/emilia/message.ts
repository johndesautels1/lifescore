/**
 * LIFE SCORE - Emilia Message API
 * Send message to Emilia and get response
 *
 * POST /api/emilia/message
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_TIMEOUT_MS = 60000;
const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;

// Emilia Assistant ID (configured in Vercel env vars)
const EMILIA_ASSISTANT_ID = process.env.EMILIA_ASSISTANT_ID || '';

// ============================================================================
// TYPES
// ============================================================================

interface MessageRequest {
  threadId: string;
  message: string;
}

interface OpenAIRun {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';
  thread_id: string;
}

interface OpenAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: { value: string };
  }>;
}

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

/**
 * Strip OpenAI citation annotations from response text
 */
function stripCitations(text: string): string {
  return text.replace(/【\d+:\d+†[^\】]+】/g, '').trim();
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// HANDLER
// ============================================================================

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

  // JWT auth — reject unauthenticated requests
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { threadId, message } = req.body as MessageRequest;

  if (!threadId || !message) {
    res.status(400).json({ error: 'threadId and message are required' });
    return;
  }

  try {
    const openaiKey = getOpenAIKey();

    if (!EMILIA_ASSISTANT_ID) {
      console.error('[EMILIA/message] EMILIA_ASSISTANT_ID not configured');
      res.status(500).json({
        error: 'Emilia assistant not configured',
      });
      return;
    }

    // 1. Add user message to thread
    const addMessageResponse = await fetch(
      `${OPENAI_API_BASE}/threads/${threadId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          role: 'user',
          content: message,
        }),
      }
    );

    if (!addMessageResponse.ok) {
      const error = await addMessageResponse.text();
      console.error('[EMILIA/message] Failed to add message:', error);
      throw new Error(`Failed to add message: ${addMessageResponse.status}`);
    }

    // 2. Create and run the assistant
    const createRunResponse = await fetch(
      `${OPENAI_API_BASE}/threads/${threadId}/runs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2',
        },
        body: JSON.stringify({
          assistant_id: EMILIA_ASSISTANT_ID,
        }),
      }
    );

    if (!createRunResponse.ok) {
      const error = await createRunResponse.text();
      console.error('[EMILIA/message] Failed to create run:', error);
      throw new Error(`Failed to create run: ${createRunResponse.status}`);
    }

    const run: OpenAIRun = await createRunResponse.json();

    // 3. Poll for completion
    let attempts = 0;
    let currentRun: OpenAIRun = run;

    while (attempts < MAX_POLL_ATTEMPTS) {
      if (currentRun.status === 'completed') {
        break;
      }

      if (
        currentRun.status === 'failed' ||
        currentRun.status === 'cancelled' ||
        currentRun.status === 'expired'
      ) {
        throw new Error(`Run ${currentRun.status}`);
      }

      await sleep(POLL_INTERVAL_MS);
      attempts++;

      const checkRunResponse = await fetch(
        `${OPENAI_API_BASE}/threads/${threadId}/runs/${run.id}`,
        {
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'OpenAI-Beta': 'assistants=v2',
          },
        }
      );

      if (!checkRunResponse.ok) {
        throw new Error(`Failed to check run status: ${checkRunResponse.status}`);
      }

      currentRun = await checkRunResponse.json();
    }

    if (currentRun.status !== 'completed') {
      throw new Error('Run timed out');
    }

    // 4. Get the latest message
    const messagesResponse = await fetch(
      `${OPENAI_API_BASE}/threads/${threadId}/messages?limit=1&order=desc`,
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      }
    );

    if (!messagesResponse.ok) {
      throw new Error(`Failed to get messages: ${messagesResponse.status}`);
    }

    const messagesData = await messagesResponse.json();
    const latestMessage: OpenAIMessage = messagesData.data[0];

    if (!latestMessage || latestMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    // Extract text content
    const textContent = latestMessage.content.find((c) => c.type === 'text');
    const responseText = textContent?.text?.value || 'Sorry, I couldn\'t generate a response.';

    // Strip citations
    const cleanResponse = stripCitations(responseText);

    console.log(`[EMILIA/message] Response generated (${cleanResponse.length} chars)`);

    res.status(200).json({
      success: true,
      response: {
        id: latestMessage.id,
        content: cleanResponse,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[EMILIA/message] Error:', error);

    res.status(500).json({
      error: 'Failed to get response',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
