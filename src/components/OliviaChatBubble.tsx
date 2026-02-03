/**
 * LIFE SCORE™ Olivia Chat Bubble
 *
 * Floating chat interface that appears on all pages except Ask Olivia.
 * Text-only, elegant, expandable/collapsible.
 * Uses the same OpenAI Assistant brain as the main Olivia interface.
 *
 * Design: Subtle luxury - like a concierge service at The Savoy.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import { useOliviaChat } from '../hooks/useOliviaChat';
import { useTTS } from '../hooks/useTTS';
import { useTierAccess } from '../hooks/useTierAccess';
import {
  getLocalComparisons,
  getLocalEnhancedComparisons,
} from '../services/savedComparisons';
import './OliviaChatBubble.css';

interface OliviaChatBubbleProps {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
}

const OliviaChatBubble: React.FC<OliviaChatBubbleProps> = ({ comparisonResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [usageLimitReached, setUsageLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // FIX: Add tier access for Olivia usage gating
  const { checkUsage, incrementUsage, isUnlimited, isAdmin } = useTierAccess();

  // FIX 7.1: Memoize savedComparisons reads with refresh mechanism
  const [comparisonsRefreshKey, setComparisonsRefreshKey] = useState(0);
  const refreshComparisons = useCallback(() => setComparisonsRefreshKey(k => k + 1), []);

  // Load saved comparisons for Olivia's context (memoized)
  const savedComparisons = useMemo(() => getLocalComparisons(), [comparisonsRefreshKey]);
  const savedEnhanced = useMemo(() => getLocalEnhancedComparisons(), [comparisonsRefreshKey]);

  // Listen for storage events to refresh when data changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lifescore_saved_comparisons' || e.key === 'lifescore_saved_enhanced') {
        refreshComparisons();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshComparisons]);

  const {
    messages,
    isTyping,
    error: chatError,
    sendMessage,
    clearHistory,
  } = useOliviaChat({
    comparisonResult,
    savedComparisons,
    savedEnhanced,
  });

  // Track comparison ID to detect changes
  const lastComparisonIdRef = useRef<string | null>(null);

  // Clear chat history when comparison changes (new comparison run)
  useEffect(() => {
    const currentId = comparisonResult?.comparisonId || null;

    // If comparison changed and we had a previous one, clear history
    if (lastComparisonIdRef.current !== null && currentId !== lastComparisonIdRef.current) {
      console.log('[OliviaChatBubble] Comparison changed, clearing chat history');
      clearHistory();
    }

    lastComparisonIdRef.current = currentId;
  }, [comparisonResult?.comparisonId, clearHistory]);

  // TTS for message playback
  const { isPlaying, play: speakText, stop: stopSpeaking } = useTTS();
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Data context (moved up for use in callbacks)
  const hasComparisonData = !!comparisonResult;
  const city1 = comparisonResult?.city1?.city || 'City 1';
  const city2 = comparisonResult?.city2?.city || 'City 2';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Track new messages when minimized
  useEffect(() => {
    if (isMinimized && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        setHasNewMessage(true);
      }
    }
  }, [messages, isMinimized]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = useCallback(async () => {
    const messageText = inputText.trim();
    if (!messageText) return;

    // ADMIN BYPASS: Skip usage checks for admin users
    if (!isAdmin && !isUnlimited('oliviaMinutesPerMonth')) {
      const usage = await checkUsage('oliviaMinutesPerMonth');
      if (!usage.allowed) {
        setUsageLimitReached(true);
        // Dispatch event to open pricing modal
        window.dispatchEvent(new CustomEvent('openPricing', {
          detail: { feature: 'Olivia minutes', requiredTier: usage.requiredTier }
        }));
        return;
      }
      // Increment usage counter
      await incrementUsage('oliviaMinutesPerMonth');
    }

    setInputText('');
    setUsageLimitReached(false);
    await sendMessage(messageText);
  }, [inputText, sendMessage, checkUsage, incrementUsage, isUnlimited, isAdmin]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // Prevent external handlers from capturing keys
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Play/stop message TTS (with browser fallback)
  const handlePlayMessage = useCallback(async (messageId: string, content: string) => {
    if (playingMessageId === messageId && isPlaying) {
      stopSpeaking();
      window.speechSynthesis?.cancel();
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(messageId);
      try {
        await speakText(content);
      } catch {
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(content);
          utterance.rate = 0.9;
          utterance.onend = () => setPlayingMessageId(null);
          utterance.onerror = () => setPlayingMessageId(null);
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [playingMessageId, isPlaying, speakText, stopSpeaking]);

  // Reset playing state when TTS stops
  useEffect(() => {
    if (!isPlaying && playingMessageId) {
      setPlayingMessageId(null);
    }
  }, [isPlaying, playingMessageId]);

  // Save conversation as text file
  const handleSaveConversation = useCallback(() => {
    if (messages.length === 0) return;

    const text = messages.map(msg => {
      const sender = msg.role === 'assistant' ? 'OLIVIA' : 'YOU';
      const time = msg.timestamp.toLocaleString();
      return `[${time}] ${sender}:\n${msg.content}\n`;
    }).join('\n');

    const header = `LIFE SCORE - Olivia Conversation\n${hasComparisonData ? `${city1} vs ${city2}` : 'General'}\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;

    const blob = new Blob([header + text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olivia-chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, hasComparisonData, city1, city2]);

  // Share conversation
  const handleShareConversation = useCallback(async () => {
    if (messages.length === 0) return;

    const text = messages.slice(-3).map(msg => {
      const sender = msg.role === 'assistant' ? 'Olivia' : 'Me';
      return `${sender}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`;
    }).join('\n\n');

    const shareData = {
      title: 'LIFE SCORE - Olivia Chat',
      text: text,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error - copy to clipboard instead
        await navigator.clipboard.writeText(text);
        alert('Conversation copied to clipboard!');
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Conversation copied to clipboard!');
    }
  }, [messages]);

  // Print conversation
  const handlePrintConversation = useCallback(() => {
    if (messages.length === 0) return;

    const printContent = `
      <html>
        <head>
          <title>LIFE SCORE - Olivia Conversation</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
            h1 { color: #c9a227; font-size: 24px; border-bottom: 2px solid #c9a227; padding-bottom: 10px; }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 30px; }
            .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
            .assistant { background: #f8fafc; border-left: 3px solid #c9a227; }
            .user { background: #0a1628; color: #e2e8f0; border-left: 3px solid #64748b; }
            .sender { font-weight: 700; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px; }
            .assistant .sender { color: #c9a227; }
            .user .sender { color: #94a3b8; }
            .content { line-height: 1.6; white-space: pre-wrap; }
            .time { font-size: 10px; color: #94a3b8; margin-top: 8px; }
          </style>
        </head>
        <body>
          <h1>OLIVIA - AI Advisor</h1>
          <div class="meta">${hasComparisonData ? `${city1} vs ${city2} | ` : ''}${new Date().toLocaleString()}</div>
          ${messages.map(msg => `
            <div class="message ${msg.role}">
              <div class="sender">${msg.role === 'assistant' ? 'OLIVIA' : 'YOU'}</div>
              <div class="content">${msg.content}</div>
              <div class="time">${msg.timestamp.toLocaleTimeString()}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }, [messages, hasComparisonData, city1, city2]);

  const toggleOpen = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setHasNewMessage(false);
    } else if (!isMinimized) {
      setIsMinimized(true);
    } else {
      setIsMinimized(false);
      setHasNewMessage(false);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <div className={`olivia-bubble-container ${isOpen ? 'open' : ''} ${isMinimized ? 'minimized' : ''}`}>
      {/* Expanded Chat Panel */}
      {isOpen && !isMinimized && (
        <div className="bubble-chat-panel">
          {/* Header */}
          <div className="bubble-header">
            <div className="bubble-header-left">
              <div className="bubble-avatar">
                <span className="avatar-letter">O</span>
                <span className="avatar-status"></span>
              </div>
              <div className="bubble-header-info">
                <span className="bubble-name">OLIVIA</span>
                <span className="bubble-status">
                  {isTyping ? 'Typing...' : 'AI Advisor'}
                </span>
              </div>
            </div>
            <div className="bubble-header-actions">
              {/* Toolbar: Save, Share, Print */}
              <div className="bubble-toolbar">
                <button
                  className="toolbar-btn"
                  onClick={handleSaveConversation}
                  title="Save conversation"
                  disabled={messages.length === 0}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M5 20h14v-2H5v2zm7-18L5.33 9h3.17v4h5v-4h3.17L12 2z"/>
                  </svg>
                </button>
                <button
                  className="toolbar-btn"
                  onClick={handleShareConversation}
                  title="Share"
                  disabled={messages.length === 0}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                  </svg>
                </button>
                <button
                  className="toolbar-btn"
                  onClick={handlePrintConversation}
                  title="Print"
                  disabled={messages.length === 0}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                  </svg>
                </button>
                {/* FIX 2026-01-25: Global stop audio button */}
                {(isPlaying || playingMessageId) && (
                  <button
                    className="toolbar-btn stop-audio-btn"
                    onClick={() => {
                      stopSpeaking();
                      window.speechSynthesis?.cancel();
                      setPlayingMessageId(null);
                    }}
                    title="Stop Audio"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <rect fill="currentColor" x="6" y="6" width="12" height="12"/>
                    </svg>
                  </button>
                )}
              </div>
              <button
                className="bubble-action-btn"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                <span>−</span>
              </button>
              <button
                className="bubble-action-btn close"
                onClick={handleClose}
                title="Close"
              >
                <span>×</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="bubble-messages">
            {messages.length === 0 && (
              <div className="bubble-welcome">
                <div className="welcome-avatar">O</div>
                <p className="welcome-text">
                  Hello! I'm Olivia, your AI advisor.
                  {hasComparisonData
                    ? ` I can help you understand your ${city1} vs ${city2} comparison.`
                    : ' Run a comparison first, then ask me anything about your results.'}
                </p>
                <div className="welcome-hints">
                  <span className="hint-label">Try asking:</span>
                  <button
                    className="hint-btn"
                    onClick={() => {
                      setInputText('Which city is better for families?');
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                  >
                    Which city is better for families?
                  </button>
                  <button
                    className="hint-btn"
                    onClick={() => {
                      setInputText('Explain the tax differences');
                      setTimeout(() => inputRef.current?.focus(), 50);
                    }}
                  >
                    Explain the tax differences
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`bubble-message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar">O</div>
                )}
                <div className="message-bubble">
                  <div className="message-text">{msg.content}</div>
                  <div className="message-footer">
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        className={`msg-play-btn ${playingMessageId === msg.id ? 'playing' : ''}`}
                        onClick={() => handlePlayMessage(msg.id, msg.content)}
                        title={playingMessageId === msg.id ? 'Stop' : 'Listen'}
                      >
                        {playingMessageId === msg.id ? (
                          <svg viewBox="0 0 24 24" width="12" height="12">
                            <path fill="currentColor" d="M6 6h12v12H6z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="12" height="12">
                            <path fill="currentColor" d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="bubble-message assistant">
                <div className="message-avatar">O</div>
                <div className="message-bubble typing">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}

            {chatError && (
              <div className="bubble-error">
                <span className="error-icon">!</span>
                <span>{chatError.message}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Usage Limit Warning */}
          {usageLimitReached && (
            <div className="bubble-limit-warning">
              <span>Olivia minutes exhausted this month.</span>
              <button onClick={() => window.dispatchEvent(new CustomEvent('openPricing'))}>
                Upgrade
              </button>
            </div>
          )}

          {/* Input */}
          <div className="bubble-input-area">
            <input
              ref={inputRef}
              type="text"
              className="bubble-input"
              placeholder={usageLimitReached ? "Upgrade to continue..." : "Ask Olivia..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={usageLimitReached}
            />
            <button
              className="bubble-send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || usageLimitReached}
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Minimized Bar */}
      {isOpen && isMinimized && (
        <div className="bubble-minimized-bar" onClick={() => setIsMinimized(false)}>
          <div className="minimized-avatar">O</div>
          <span className="minimized-name">OLIVIA</span>
          {hasNewMessage && <span className="minimized-badge">1</span>}
          <button className="minimized-close" onClick={handleClose}>×</button>
        </div>
      )}

      {/* Floating Button */}
      <button
        className={`olivia-fab ${isOpen ? 'hidden' : ''} ${hasNewMessage ? 'has-notification' : ''}`}
        onClick={toggleOpen}
        aria-label="Chat with Olivia"
      >
        <div className="fab-inner">
          <span className="fab-letter">O</span>
          <div className="fab-rings">
            <span className="ring ring-1"></span>
            <span className="ring ring-2"></span>
          </div>
        </div>
        {hasNewMessage && <span className="fab-badge">1</span>}
        <span className="fab-tooltip">Chat with Olivia</span>
      </button>
    </div>
  );
};

export default OliviaChatBubble;
