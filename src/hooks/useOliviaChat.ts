/**
 * LIFE SCORE - useOliviaChat Hook
 * Manages chat state and communication with Olivia AI assistant
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  OliviaChatMessage,
  LifeScoreContext,
  OliviaError,
  UseOliviaChatReturn,
} from '../types/olivia';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import {
  sendMessage,
  buildContext,
  getErrorMessage,
  isRecoverableError,
} from '../services/oliviaService';

// ============================================================================
// HOOK
// ============================================================================

export function useOliviaChat(
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null
): UseOliviaChatReturn {
  // State
  const [messages, setMessages] = useState<OliviaChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<OliviaError | null>(null);
  const [context, setContextState] = useState<LifeScoreContext | null>(null);

  // Refs
  const contextBuiltRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build context when comparison result changes
  useEffect(() => {
    if (comparisonResult && !contextBuiltRef.current) {
      contextBuiltRef.current = true;

      buildContext(comparisonResult)
        .then(({ context: builtContext }) => {
          setContextState(builtContext);
          console.log('[useOliviaChat] Context built successfully');
        })
        .catch((err) => {
          console.error('[useOliviaChat] Failed to build context:', err);
          setError({
            type: 'context_build_failed',
            message: 'Failed to load comparison data for Olivia.',
            recoverable: true,
          });
        });
    }
  }, [comparisonResult]);

  // Reset context flag when comparison changes
  useEffect(() => {
    contextBuiltRef.current = false;
  }, [comparisonResult?.comparisonId]);

  /**
   * Generate unique message ID
   */
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Send a message to Olivia
   */
  const sendUserMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Clear any previous error
    setError(null);

    // Add user message to chat
    const userMsg: OliviaChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Show typing indicator
    setIsTyping(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Send to API
      const response = await sendMessage(userMessage, {
        threadId: threadId || undefined,
        context: !threadId ? context || undefined : undefined, // Only send context on first message
      });

      // Update thread ID if new
      if (!threadId && response.threadId) {
        setThreadId(response.threadId);
      }

      // Add assistant response
      const assistantMsg: OliviaChatMessage = {
        id: response.messageId || generateMessageId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        audioUrl: response.audioUrl,
        sources: response.sources,
      };
      setMessages(prev => [...prev, assistantMsg]);

    } catch (err) {
      const errorMsg = err instanceof Error ? err : new Error('Unknown error');
      console.error('[useOliviaChat] Send failed:', errorMsg);

      setError({
        type: 'chat_api_error',
        message: getErrorMessage(errorMsg),
        recoverable: isRecoverableError(errorMsg),
      });

      // Add error message to chat
      const errorChatMsg: OliviaChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${getErrorMessage(errorMsg)}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorChatMsg]);

    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [threadId, context, generateMessageId]);

  /**
   * Clear chat history and start fresh
   */
  const clearHistory = useCallback(() => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setMessages([]);
    setThreadId(null);
    setError(null);
    setIsTyping(false);
  }, []);

  /**
   * Manually set context (for external updates)
   */
  const setContext = useCallback((newContext: LifeScoreContext) => {
    setContextState(newContext);
    contextBuiltRef.current = true;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    threadId,
    isTyping,
    error,
    sendMessage: sendUserMessage,
    clearHistory,
    setContext,
  };
}

export default useOliviaChat;
