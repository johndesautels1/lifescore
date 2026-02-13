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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useEmilia } from '../hooks/useEmilia';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import './EmiliaChat.css';

// ============================================================================
// LIGHTWEIGHT MARKDOWN RENDERER
// Converts common markdown patterns to HTML for chat messages.
// Handles: bold, italic, inline code, code blocks, links, lists, headers.
// ============================================================================

function renderMarkdown(text: string): string {
  let html = text
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    return `<pre class="md-code-block"><code>${code.trim()}</code></pre>`;
  });

  // Inline code (`...`)
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Bold + italic (***text***)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold (**text**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (*text*)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');

  // Headers (### h3, ## h2, # h1 — at line start)
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3 class="md-h3">$1</h3>');

  // Unordered lists (- item or * item)
  html = html.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="md-list">$1</ul>');

  // Numbered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
  );

  // Line breaks (double newline → paragraph break, single → <br>)
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

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
    retryLastMessage,
    dismissError,
    clearConversation,
    downloadConversation,
    printConversation,
    shareConversation,
    emailConversation,
    canShare,
    playMessage,
    stopPlaying,
    isPlaying,
    playingMessageId,
  } = useEmilia();

  // Voice input recognition
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        // When speech is finalized, set the input and optionally auto-send
        setInputText(text.trim());
      }
    },
  });

  // Update input with interim transcript while listening
  useEffect(() => {
    if (isListening && interimTranscript) {
      setInputText(interimTranscript);
    }
  }, [isListening, interimTranscript]);

  // When transcript finalizes, update input
  useEffect(() => {
    if (transcript && !isListening) {
      setInputText(transcript);
      resetTranscript();
    }
  }, [transcript, isListening, resetTranscript]);

  // Handle microphone toggle
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setInputText('');
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

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
          <MessageBubble
            key={msg.id}
            msg={msg}
            playingMessageId={playingMessageId}
            onPlay={playMessage}
            onStop={stopPlaying}
            formatTime={formatTime}
          />
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

        {/* Error message with retry */}
        {error && (
          <div className="emilia-error">
            <span className="error-icon">!</span>
            <span className="error-text">{error}</span>
            <div className="error-actions">
              <button className="error-retry-btn" onClick={retryLastMessage}>
                Retry
              </button>
              <button className="error-dismiss-btn" onClick={dismissError}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="emilia-input-area">
        <input
          ref={inputRef}
          type="text"
          className={`emilia-input ${isListening ? 'listening' : ''}`}
          placeholder={isListening ? 'Listening...' : 'Type or speak your question...'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || isInitializing || isListening}
        />
        {/* Microphone button */}
        {voiceSupported && (
          <button
            className={`emilia-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={handleMicToggle}
            disabled={isLoading || isInitializing}
            title={isListening ? 'Stop listening' : 'Speak your question'}
          >
            {isListening ? (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <rect fill="currentColor" x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
        )}
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

      {/* Voice error message */}
      {voiceError && (
        <div className="emilia-voice-error">
          <span>{voiceError}</span>
        </div>
      )}

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
        <button
          className="emilia-action-btn share"
          onClick={shareConversation}
          disabled={messages.length === 0}
          title={canShare ? "Share conversation" : "Copy to clipboard"}
        >
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
          </svg>
          <span>Share</span>
        </button>
        <button
          className="emilia-action-btn email"
          onClick={emailConversation}
          disabled={messages.length === 0}
          title="Email conversation"
        >
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </svg>
          <span>Email</span>
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

// ============================================================================
// MEMOIZED MESSAGE BUBBLE — renders markdown for assistant, plain for user
// ============================================================================

interface MessageBubbleProps {
  msg: { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date };
  playingMessageId: string | null;
  onPlay: (id: string, content: string) => void;
  onStop: () => void;
  formatTime: (date: Date) => string;
}

const MessageBubble = React.memo<MessageBubbleProps>(({ msg, playingMessageId, onPlay, onStop, formatTime }) => {
  const renderedHtml = useMemo(
    () => (msg.role === 'assistant' ? renderMarkdown(msg.content) : null),
    [msg.role, msg.content]
  );

  return (
    <div className={`emilia-message ${msg.role}`}>
      {msg.role === 'assistant' && (
        <div className="message-avatar">
          <span>E</span>
        </div>
      )}
      <div className="message-bubble">
        {msg.role === 'assistant' && renderedHtml ? (
          <div
            className="message-content md-rendered"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        ) : (
          <div className="message-content">{msg.content}</div>
        )}
        <div className="message-footer">
          <span className="message-time">{formatTime(msg.timestamp)}</span>
          {msg.role === 'assistant' && (
            <button
              className={`message-play-btn ${playingMessageId === msg.id ? 'playing' : ''}`}
              onClick={() =>
                playingMessageId === msg.id ? onStop() : onPlay(msg.id, msg.content)
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
  );
});

MessageBubble.displayName = 'MessageBubble';

export default EmiliaChat;
