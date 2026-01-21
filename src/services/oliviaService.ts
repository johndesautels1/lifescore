/**
 * LIFE SCORE - Olivia Service
 * Client-side API wrapper for Olivia AI assistant
 */

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

// ============================================================================
// CONSTANTS
// ============================================================================

const API_TIMEOUT_MS = 60000; // 60 seconds for chat responses

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
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
        maxTokens: options.maxTokens ?? 8000,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
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
    generateAudio?: boolean;
  } = {}
): Promise<OliviaChatResponse> {
  const request: OliviaChatRequest = {
    message,
    threadId: options.threadId,
    context: options.context,
    generateAudio: options.generateAudio,
  };

  const response = await fetchWithTimeout(
    '/api/olivia/chat',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
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
  const response = await fetchWithTimeout(
    '/api/olivia/tts',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceId: options.voiceId,
      }),
    },
    30000 // 30 second timeout for TTS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
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
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
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
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
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
    const error = await response.json().catch(() => ({}));
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
// D-ID AVATAR API (FALLBACK)
// ============================================================================

/**
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `D-ID session creation failed: ${response.status}`);
  }

  return response.json();
}

/**
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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `D-ID chat failed: ${response.status}`);
  }

  return response.json();
}

/**
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
 * Start a new conversation with Olivia, injecting comparison context
 */
export async function startConversation(
  comparisonResult: EnhancedComparisonResult | ComparisonResult,
  initialMessage?: string
): Promise<{
  threadId: string;
  context: LifeScoreContext;
  response?: OliviaChatResponse;
}> {
  // Build context from comparison
  const { context } = await buildContext(comparisonResult);

  // If initial message provided, send it
  if (initialMessage) {
    const response = await sendMessage(initialMessage, { context });
    return {
      threadId: response.threadId,
      context,
      response,
    };
  }

  return {
    threadId: '',
    context,
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
