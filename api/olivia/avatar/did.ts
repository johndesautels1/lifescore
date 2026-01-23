/**
 * LIFE SCORE - D-ID Agents API
 *
 * ⚠️ DEPRECATED: This file uses D-ID Agents API which has its own LLM brain.
 *
 * Option B Architecture: Use streams.ts instead.
 * - OpenAI Assistant = ALL intelligence (brain)
 * - D-ID Streams API = Avatar video only (no brain)
 *
 * This file is kept for reference but should NOT be used.
 * Use /api/olivia/avatar/streams for Option B compliant avatar.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CONSTANTS
// ============================================================================

const DID_API_BASE = 'https://api.d-id.com';
const DID_TIMEOUT_MS = 60000;

// Default agent (can be overridden via env)
const DEFAULT_AGENT_ID = process.env.DID_AGENT_ID || '';

// ============================================================================
// TYPES
// ============================================================================

interface DIDAgentRequest {
  action: 'create' | 'chat' | 'close';
  agentId?: string;
  sessionId?: string;
  message?: string;
}

interface DIDChatResponse {
  id: string;
  chat_id: string;
  status: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch with timeout
 */
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

/**
 * Get D-ID API key and encode for Basic auth
 * D-ID keys come as "username:password" format from studio
 * If your key doesn't contain a colon, it's just the password (username is empty)
 */
function getDIDAuthHeader(): string {
  const key = process.env.DID_API_KEY;
  if (!key) {
    throw new Error('DID_API_KEY not configured');
  }
  // If key already contains colon (username:password format), use as-is
  // Otherwise, treat as password-only with empty username
  const credentials = key.includes(':') ? key : `:${key}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Create a new chat session with agent
 */
async function createChat(authHeader: string, agentId: string): Promise<{ chatId: string }> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/agents/${agentId}/chats`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create chat: ${error}`);
  }

  const data = await response.json();
  return { chatId: data.id };
}

/**
 * Send a message to the agent
 */
async function sendMessage(
  authHeader: string,
  agentId: string,
  chatId: string,
  message: string
): Promise<DIDChatResponse> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/agents/${agentId}/chats/${chatId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
        stream: false,
      }),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }

  return response.json();
}

/**
 * Get chat status and result
 */
async function getChatStatus(
  authHeader: string,
  agentId: string,
  chatId: string
): Promise<DIDChatResponse> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/agents/${agentId}/chats/${chatId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get chat status: ${error}`);
  }

  return response.json();
}

/**
 * Delete chat session
 */
async function deleteChat(
  authHeader: string,
  agentId: string,
  chatId: string
): Promise<void> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/agents/${agentId}/chats/${chatId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    console.warn('[DID] Delete chat warning:', await response.text());
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

  try {
    const authHeader = getDIDAuthHeader();
    const { action, agentId, sessionId, message } = req.body as DIDAgentRequest;

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const effectiveAgentId = agentId || DEFAULT_AGENT_ID;
    if (!effectiveAgentId) {
      res.status(400).json({ error: 'DID_AGENT_ID not configured and no agentId provided' });
      return;
    }

    console.log('[DID] Action:', action);

    switch (action) {
      case 'create': {
        const { chatId } = await createChat(authHeader, effectiveAgentId);
        console.log('[DID] Created chat:', chatId);

        res.status(200).json({
          sessionId: chatId,
          agentId: effectiveAgentId,
          status: 'created',
        });
        return;
      }

      case 'chat': {
        if (!sessionId || !message) {
          res.status(400).json({ error: 'sessionId and message are required' });
          return;
        }

        // Send message
        const chatResponse = await sendMessage(authHeader, effectiveAgentId, sessionId, message);
        console.log('[DID] Chat response status:', chatResponse.status);

        // If video URL is available, return it
        if (chatResponse.result_url) {
          res.status(200).json({
            sessionId,
            status: 'completed',
            streamUrl: chatResponse.result_url,
          });
          return;
        }

        // Poll for result if not immediately available
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds max

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const status = await getChatStatus(authHeader, effectiveAgentId, sessionId);

          if (status.status === 'done' && status.result_url) {
            res.status(200).json({
              sessionId,
              status: 'completed',
              streamUrl: status.result_url,
            });
            return;
          }

          if (status.status === 'error') {
            throw new Error('Chat processing failed');
          }

          attempts++;
        }

        throw new Error('Chat processing timed out');
      }

      case 'close': {
        if (!sessionId) {
          res.status(400).json({ error: 'sessionId is required' });
          return;
        }

        await deleteChat(authHeader, effectiveAgentId, sessionId);
        console.log('[DID] Closed chat:', sessionId);

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
    console.error('[DID] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'D-ID request failed',
    });
  }
}
