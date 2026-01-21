/**
 * LIFE SCORE™ Olivia Chat Bubble
 *
 * Floating chat interface that appears on all pages except Ask Olivia.
 * Text-only, elegant, expandable/collapsible.
 * Uses the same OpenAI Assistant brain as the main Olivia interface.
 *
 * Design: Subtle luxury - like a concierge service at The Savoy.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import { useOliviaChat } from '../hooks/useOliviaChat';
import './OliviaChatBubble.css';

interface OliviaChatBubbleProps {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
}

const OliviaChatBubble: React.FC<OliviaChatBubbleProps> = ({ comparisonResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isTyping,
    error: chatError,
    sendMessage,
    clearHistory: _clearHistory,  // Available for future use
  } = useOliviaChat(comparisonResult);

  // Suppress unused warning - clearHistory available for header button
  void _clearHistory;

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
    setInputText('');
    await sendMessage(messageText);
  }, [inputText, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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

  // Data context
  const hasComparisonData = !!comparisonResult;
  const city1 = comparisonResult?.city1?.city || 'City 1';
  const city2 = comparisonResult?.city2?.city || 'City 2';

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
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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

          {/* Input */}
          <div className="bubble-input-area">
            <input
              ref={inputRef}
              type="text"
              className="bubble-input"
              placeholder="Ask Olivia..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="bubble-send-btn"
              onClick={handleSendMessage}
              disabled={!inputText.trim()}
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
