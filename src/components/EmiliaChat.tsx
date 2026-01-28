/**
 * LIFE SCORE™ Emilia Chat Component
 *
 * AI-powered chat interface for help and documentation questions.
 * Uses OpenAI Assistants API via Emilia backend.
 *
 * Features:
 * - Real-time chat with streaming responses
 * - Voice output (ElevenLabs TTS)
 * - Conversation download, print, replay
 * - Message history persistence
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEmilia } from '../hooks/useEmilia';
import './EmiliaChat.css';

interface EmiliaChatProps {
  onBack?: () => void;
}

const EmiliaChat: React.FC<EmiliaChatProps> = ({ onBack }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isLoading,
    isInitializing,
    error,
    sendMessage,
    clearConversation,
    downloadConversation,
    printConversation,
    playMessage,
    stopPlaying,
    isPlaying,
    playingMessageId,
  } = useEmilia();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    await sendMessage(text);
  }, [inputText, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputText(question);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Format timestamp
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="emilia-chat">
      {/* Header with Back Button */}
      {onBack && (
        <div className="emilia-chat-nav">
          <button className="emilia-back-btn" onClick={onBack}>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span>Back to Manuals</span>
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="emilia-messages">
        {/* Welcome message when empty */}
        {messages.length === 0 && !isInitializing && (
          <div className="emilia-welcome">
            <div className="emilia-welcome-avatar">
              <span>E</span>
            </div>
            <h3 className="emilia-welcome-title">Hi, I'm Emilia!</h3>
            <p className="emilia-welcome-text">
              I'm your LifeScore help assistant. Ask me anything about features,
              troubleshooting, subscriptions, or how to use the platform.
            </p>
            <div className="emilia-quick-questions">
              <span className="quick-label">Quick questions:</span>
              <div className="quick-buttons">
                <button
                  className="quick-btn"
                  onClick={() => handleQuickQuestion('How do I run a comparison?')}
                >
                  How do I run a comparison?
                </button>
                <button
                  className="quick-btn"
                  onClick={() => handleQuickQuestion('What is Enhanced Mode?')}
                >
                  What is Enhanced Mode?
                </button>
                <button
                  className="quick-btn"
                  onClick={() => handleQuickQuestion('How do I upgrade my plan?')}
                >
                  How do I upgrade my plan?
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Initializing state */}
        {isInitializing && (
          <div className="emilia-initializing">
            <div className="emilia-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Emilia is getting ready...</p>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div key={msg.id} className={`emilia-message ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="message-avatar">
                <span>E</span>
              </div>
            )}
            <div className="message-bubble">
              <div className="message-content">{msg.content}</div>
              <div className="message-footer">
                <span className="message-time">{formatTime(msg.timestamp)}</span>
                {msg.role === 'assistant' && (
                  <button
                    className={`message-play-btn ${playingMessageId === msg.id ? 'playing' : ''}`}
                    onClick={() =>
                      playingMessageId === msg.id
                        ? stopPlaying()
                        : playMessage(msg.id, msg.content)
                    }
                    title={playingMessageId === msg.id ? 'Stop' : 'Listen'}
                  >
                    {playingMessageId === msg.id ? (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <rect fill="currentColor" x="6" y="6" width="12" height="12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="12" height="12">
                        <path fill="currentColor" d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="emilia-message assistant">
            <div className="message-avatar">
              <span>E</span>
            </div>
            <div className="message-bubble typing">
              <div className="emilia-typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="emilia-error">
            <span className="error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="emilia-input-area">
        <input
          ref={inputRef}
          type="text"
          className="emilia-input"
          placeholder="Type your question..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isInitializing}
        />
        <button
          className="emilia-send-btn"
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isLoading || isInitializing}
          title="Send message"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Action Bar */}
      <div className="emilia-action-bar">
        <button
          className="emilia-action-btn"
          onClick={() => downloadConversation('txt')}
          disabled={messages.length === 0}
          title="Download conversation"
        >
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M5 20h14v-2H5v2zm7-18L5.33 9h3.17v4h5v-4h3.17L12 2z" />
          </svg>
          <span>Download</span>
        </button>
        <button
          className="emilia-action-btn"
          onClick={printConversation}
          disabled={messages.length === 0}
          title="Print conversation"
        >
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
          </svg>
          <span>Print</span>
        </button>
        {isPlaying && (
          <button
            className="emilia-action-btn stop"
            onClick={stopPlaying}
            title="Stop audio"
          >
            <svg viewBox="0 0 24 24" width="14" height="14">
              <rect fill="currentColor" x="6" y="6" width="12" height="12" />
            </svg>
            <span>Stop Audio</span>
          </button>
        )}
        <button
          className="emilia-action-btn clear"
          onClick={clearConversation}
          disabled={messages.length === 0}
          title="Clear conversation"
        >
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

export default EmiliaChat;
