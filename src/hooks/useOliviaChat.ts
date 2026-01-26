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
import type { SavedComparison, SavedEnhancedComparison } from '../services/savedComparisons';
import {
  sendMessage,
  buildContext,
  getErrorMessage,
  isRecoverableError,
} from '../services/oliviaService';

// ============================================================================
// SAVED COMPARISONS SUMMARY BUILDER
// ============================================================================

/**
 * Build a summary of saved comparisons for Olivia's context
 */
function buildSavedComparisonsSummary(
  savedComparisons: SavedComparison[],
  savedEnhanced: SavedEnhancedComparison[]
): string {
  if (savedComparisons.length === 0 && savedEnhanced.length === 0) {
    return '';
  }

  const lines: string[] = [
    '\n\n--- USER\'S SAVED COMPARISON HISTORY ---',
    `The user has ${savedComparisons.length + savedEnhanced.length} saved comparisons:\n`,
  ];

  // Add standard comparisons
  savedComparisons.forEach((saved, index) => {
    const r = saved.result;
    const city1Score = r.city1.totalScore || r.city1.normalizedScore || 0;
    const city2Score = r.city2.totalScore || r.city2.normalizedScore || 0;
    const winnerCity = city1Score > city2Score ? r.city1.city : r.city2.city;
    const winnerScore = Math.max(city1Score, city2Score);
    const loserScore = Math.min(city1Score, city2Score);
    lines.push(
      `${index + 1}. ${r.city1.city} vs ${r.city2.city}` +
      `${saved.nickname ? ` ("${saved.nickname}")` : ''}` +
      ` - Winner: ${winnerCity} (${winnerScore.toFixed(1)} vs ${loserScore.toFixed(1)})` +
      ` - Saved: ${new Date(saved.savedAt).toLocaleDateString()}`
    );
  });

  // Add enhanced comparisons
  savedEnhanced.forEach((saved, index) => {
    const r = saved.result;
    const winnerCity = r.winner === 'city1' ? r.city1.city : r.city2.city;
    const score1 = r.city1.totalConsensusScore || 0;
    const score2 = r.city2.totalConsensusScore || 0;
    lines.push(
      `${savedComparisons.length + index + 1}. [ENHANCED] ${r.city1.city} vs ${r.city2.city}` +
      `${saved.nickname ? ` ("${saved.nickname}")` : ''}` +
      ` - Winner: ${winnerCity} (${score1.toFixed(1)} vs ${score2.toFixed(1)})` +
      ` - Saved: ${new Date(saved.savedAt).toLocaleDateString()}`
    );
  });

  lines.push(
    '\nYou can reference any of these comparisons when the user asks about their history.',
    '--- END SAVED HISTORY ---\n'
  );

  return lines.join('\n');
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseOliviaChatOptions {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
  savedComparisons?: SavedComparison[];
  savedEnhanced?: SavedEnhancedComparison[];
}

export function useOliviaChat(
  options: UseOliviaChatOptions = {}
): UseOliviaChatReturn {
  const { comparisonResult, savedComparisons = [], savedEnhanced = [] } = options;

  // State
  const [messages, setMessages] = useState<OliviaChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<OliviaError | null>(null);
  const [context, setContextState] = useState<LifeScoreContext | null>(null);
  const [textSummary, setTextSummary] = useState<string | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(false);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastComparisonIdRef = useRef<string | null>(null);

  // Build context when comparison result changes
  useEffect(() => {
    const currentId = comparisonResult?.comparisonId || null;

    // Skip if same comparison already loaded
    if (currentId === lastComparisonIdRef.current && context !== null) {
      return;
    }

    // Update tracking
    lastComparisonIdRef.current = currentId;

    // Clear context when no comparison selected
    if (!comparisonResult) {
      setContextState(null);
      setTextSummary(null);
      setIsContextLoading(false);
      return;
    }

    // Build new context for the selected report
    console.log('[useOliviaChat] Building context for:', currentId);
    setIsContextLoading(true);

    buildContext(comparisonResult)
      .then(({ context: builtContext, textSummary: builtSummary }) => {
        // Verify this is still the current comparison (prevent race)
        if (comparisonResult.comparisonId !== lastComparisonIdRef.current) {
          console.log('[useOliviaChat] Stale context result, ignoring');
          return;
        }

        setContextState(builtContext);

        // Append saved comparisons summary to the text summary
        const savedSummary = buildSavedComparisonsSummary(savedComparisons, savedEnhanced);
        const fullSummary = (builtSummary || '') + savedSummary;
        setTextSummary(fullSummary);

        console.log('[useOliviaChat] Context built with', builtContext?.topMetrics?.length || 0, 'metrics');
      })
      .catch((err) => {
        console.error('[useOliviaChat] Failed to build context:', err);
        setError({
          type: 'context_build_failed',
          message: 'Failed to load comparison data for Olivia.',
          recoverable: true,
        });
      })
      .finally(() => {
        setIsContextLoading(false);
      });
  }, [comparisonResult, savedComparisons, savedEnhanced, context]);

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

    // Prevent sending if already processing a message
    if (isTyping) {
      console.log('[useOliviaChat] Already processing a message, ignoring duplicate send');
      return;
    }

    // Wait for context to finish loading if in progress
    if (isContextLoading) {
      console.log('[useOliviaChat] Waiting for context to load...');
      // Set a brief delay and retry - context should load quickly
      await new Promise(resolve => setTimeout(resolve, 500));
    }

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
      // Always include context when available (not just first message)
      // This ensures Olivia knows about the selected report
      const response = await sendMessage(userMessage, {
        threadId: threadId || undefined,
        context: context || undefined,
        textSummary: textSummary || undefined,
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
  }, [threadId, context, textSummary, isContextLoading, isTyping, generateMessageId]);

  /**
   * Clear chat history and start fresh
   * Note: Does NOT reset context - context is tied to the selected comparison
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
    // Context stays - it's tied to the comparison, not the conversation
  }, []);

  /**
   * Manually set context (for external updates)
   */
  const setContext = useCallback((newContext: LifeScoreContext) => {
    setContextState(newContext);
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
    isContextLoading,
    error,
    sendMessage: sendUserMessage,
    clearHistory,
    setContext,
  };
}

export default useOliviaChat;
