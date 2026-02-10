/**
 * LIFE SCORE - Olivia Service
 * Client-side API wrapper for Olivia AI assistant
 */

import { getAuthHeaders } from '../lib/supabase';
import type {
  OliviaChatRequest,
  OliviaChatResponse,
  LifeScoreContext,
  ContextBuildResponse,
  TTSResponse,
  HeyGenSessionRequest,
  HeyGenSessionResponse,
  DIDAgentRequest,
  DIDAgentResponse,
} from '../types/olivia';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

// ============================================================================
// CONTEXT API
// ============================================================================

/**
 * Build LIFE SCORE context for Olivia from comparison result
 */
export async function buildContext(
  comparisonResult: EnhancedComparisonResult | ComparisonResult,
  options: { includeEvidence?: boolean; maxTokens?: number } = {}
): Promise<ContextBuildResponse> {
  const response = await fetchWithTimeout(
    '/api/olivia/context',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comparisonResult,
        includeEvidence: options.includeEvidence ?? true,
        maxTokens: options.maxTokens ?? 16000, // Increased to include all 100 metrics
      }),
    },
    60000 // 60 second timeout for context building
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `Failed to build context: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// CHAT API
// ============================================================================

/**
 * Send a message to Olivia and get a response
 */
export async function sendMessage(
  message: string,
  options: {
    threadId?: string;
    context?: LifeScoreContext;
    textSummary?: string; // Pre-built text summary with all 100 metrics
    generateAudio?: boolean;
  } = {}
): Promise<OliviaChatResponse> {
  const request: OliviaChatRequest & { textSummary?: string } = {
    message,
    threadId: options.threadId,
    context: options.context,
    textSummary: options.textSummary,
    generateAudio: options.generateAudio,
  };

  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/olivia/chat',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(request),
    },
    90000 // 90 second timeout - server may retry on active runs
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `Chat request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Send a quick action prompt to Olivia
 */
export async function sendQuickAction(
  _actionId: string,  // Reserved for analytics/tracking
  prompt: string,
  options: {
    threadId?: string;
    context?: LifeScoreContext;
  } = {}
): Promise<OliviaChatResponse> {
  void _actionId; // Will be used for action tracking
  return sendMessage(prompt, options);
}

// ============================================================================
// TTS API
// ============================================================================

/**
 * Generate text-to-speech audio for text
 */
export async function generateTTS(
  text: string,
  options: { voiceId?: string } = {}
): Promise<TTSResponse> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/olivia/tts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        text,
        voiceId: options.voiceId,
      }),
    },
    60000 // 60 second timeout for TTS
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `TTS generation failed: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// HEYGEN AVATAR API
// ============================================================================

/**
 * Create a HeyGen streaming avatar session
 */
export async function createHeyGenSession(): Promise<HeyGenSessionResponse> {
  const request: HeyGenSessionRequest = { action: 'create' };

  const response = await fetchWithTimeout(
    '/api/olivia/avatar/heygen',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    45000 // 45 second timeout for avatar session creation
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `HeyGen session creation failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Make HeyGen avatar speak text
 */
export async function heygenSpeak(
  sessionId: string,
  text: string
): Promise<HeyGenSessionResponse> {
  const request: HeyGenSessionRequest = {
    action: 'speak',
    sessionId,
    text,
  };

  const response = await fetchWithTimeout(
    '/api/olivia/avatar/heygen',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    },
    60000 // 60 second timeout for avatar speech (TTS + streaming)
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `HeyGen speak failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Interrupt HeyGen avatar speech
 */
export async function heygenInterrupt(sessionId: string): Promise<HeyGenSessionResponse> {
  const request: HeyGenSessionRequest = {
    action: 'interrupt',
    sessionId,
  };

  const response = await fetchWithTimeout(
    '/api/olivia/avatar/heygen',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `HeyGen interrupt failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Close HeyGen session
 */
export async function closeHeyGenSession(sessionId: string): Promise<void> {
  const request: HeyGenSessionRequest = {
    action: 'close',
    sessionId,
  };

  await fetchWithTimeout(
    '/api/olivia/avatar/heygen',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
}

// ============================================================================
// D-ID AGENTS API (⚠️ DEPRECATED - Uses D-ID's own LLM brain)
// ============================================================================
// Option B Architecture: Use useDIDStream hook instead which calls /api/olivia/avatar/streams
// These functions are kept for reference but should NOT be used.

/**
 * @deprecated Use useDIDStream hook instead. D-ID Agents have their own LLM brain.
 * Create a D-ID agent session
 */
export async function createDIDSession(): Promise<DIDAgentResponse> {
  const request: DIDAgentRequest = { action: 'create' };

  const response = await fetchWithTimeout(
    '/api/olivia/avatar/did',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `D-ID session creation failed: ${response.status}`);
  }

  return response.json();
}

/**
 * @deprecated Use useDIDStream hook instead. D-ID Agents have their own LLM brain.
 * Send a chat message through D-ID agent
 */
export async function didChat(
  sessionId: string,
  message: string
): Promise<DIDAgentResponse> {
  const request: DIDAgentRequest = {
    action: 'chat',
    sessionId,
    message,
  };

  const response = await fetchWithTimeout(
    '/api/olivia/avatar/did',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch((e) => { console.warn('[OliviaService] Failed to parse error response:', e); return {}; });
    throw new Error(error.error || `D-ID chat failed: ${response.status}`);
  }

  return response.json();
}

/**
 * @deprecated Use useDIDStream hook instead. D-ID Agents have their own LLM brain.
 * Close D-ID session
 */
export async function closeDIDSession(sessionId: string): Promise<void> {
  const request: DIDAgentRequest = {
    action: 'close',
    sessionId,
  };

  await fetchWithTimeout(
    '/api/olivia/avatar/did',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Start a new conversation with Olivia, injecting comparison context with all 100 metrics
 */
export async function startConversation(
  comparisonResult: EnhancedComparisonResult | ComparisonResult,
  initialMessage?: string
): Promise<{
  threadId: string;
  context: LifeScoreContext;
  textSummary?: string;
  response?: OliviaChatResponse;
}> {
  // Build context from comparison (now includes textSummary with all 100 metrics)
  const { context, textSummary } = await buildContext(comparisonResult);

  // If initial message provided, send it with both context and textSummary
  if (initialMessage) {
    const response = await sendMessage(initialMessage, { context, textSummary });
    return {
      threadId: response.threadId,
      context,
      textSummary,
      response,
    };
  }

  return {
    threadId: '',
    context,
    textSummary,
  };
}

/**
 * Send message and get audio response (for voice mode)
 */
export async function sendMessageWithAudio(
  message: string,
  options: {
    threadId?: string;
    context?: LifeScoreContext;
  } = {}
): Promise<{
  response: OliviaChatResponse;
  audioUrl?: string;
}> {
  // Get text response
  const response = await sendMessage(message, options);

  // Generate TTS for the response
  try {
    const tts = await generateTTS(response.response);
    return {
      response,
      audioUrl: tts.audioUrl,
    };
  } catch (error) {
    console.warn('[OliviaService] TTS generation failed:', error);
    return { response };
  }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('rate limit')
  );
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  if (message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment.';
  }
  if (message.includes('not found')) {
    return 'Olivia assistant not found. Please check configuration.';
  }
  if (message.includes('context')) {
    return 'Failed to load comparison data. Please try again.';
  }

  return error.message || 'Something went wrong. Please try again.';
}
