/**
 * LIFE SCORE™ Ask Olivia - Premium Edition
 *
 * Design Philosophy:
 * - James Bond: Sleek sophistication, MI6 briefing room elegance
 * - Airbus A320: Glass cockpit precision, information-dense displays
 * - Patek Philippe: Swiss craftsmanship, perfect typography
 * - London International: Cosmopolitan wealth, refined taste
 *
 * "The name is Olivia. Just Olivia."
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import type { OliviaQuickAction } from '../types/olivia';
import { DEFAULT_QUICK_ACTIONS } from '../types/olivia';
import { useOliviaChat } from '../hooks/useOliviaChat';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useTTS } from '../hooks/useTTS';
import { useDIDStream } from '../hooks/useDIDStream';
import './AskOlivia.css';

interface AskOliviaProps {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
}

const AskOlivia: React.FC<AskOliviaProps> = ({ comparisonResult }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTextChat, setShowTextChat] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // D-ID Video Stream for real avatar
  const {
    status: streamStatus,
    error: streamError,
    isConnected: isAvatarReady,
    isSpeaking: isAvatarSpeaking,
    connect: connectAvatar,
    speak: avatarSpeak,
    disconnect: disconnectAvatar,
  } = useDIDStream({
    videoRef,
    onSpeakingStart: () => console.log('[AskOlivia] Avatar speaking started'),
    onSpeakingEnd: () => console.log('[AskOlivia] Avatar speaking ended'),
    onError: (error) => console.error('[AskOlivia] Avatar error:', error),
  });

  // Auto-connect avatar on mount
  useEffect(() => {
    connectAvatar();
    return () => {
      disconnectAvatar();
    };
  }, []);

  // Real-time clock for cockpit feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chat functionality
  const {
    messages,
    isTyping,
    error: chatError,
    sendMessage,
    clearHistory,
  } = useOliviaChat(comparisonResult);

  // Voice recognition
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        handleSendMessage(text.trim());
        resetTranscript();
      }
    },
  });

  // TTS (backup if avatar not ready)
  const { isPlaying: isTTSSpeaking, play: speakText, stop: stopSpeaking } = useTTS();

  const [inputText, setInputText] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const lastSpokenMsgRef = useRef<string | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-speak assistant responses through D-ID avatar
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only speak new messages from assistant
      if (lastMessage.role === 'assistant' && lastMessage.id !== lastSpokenMsgRef.current) {
        lastSpokenMsgRef.current = lastMessage.id;

        if (isAvatarReady) {
          // Use D-ID avatar to speak
          avatarSpeak(lastMessage.content);
        } else {
          // Fallback to browser TTS if avatar not ready
          speakText(lastMessage.content);
        }
      }
    }
  }, [messages, autoSpeak, isAvatarReady, avatarSpeak, speakText]);

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;
    setInputText('');
    await sendMessage(messageText);
  }, [inputText, sendMessage]);

  const handleQuickAction = useCallback((action: OliviaQuickAction) => {
    setShowTextChat(true);
    handleSendMessage(action.prompt);
  }, [handleSendMessage]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Data context
  const hasComparisonData = !!comparisonResult;
  const city1 = comparisonResult?.city1?.city || 'City 1';
  const city2 = comparisonResult?.city2?.city || 'City 2';

  // Cockpit-style time formatting
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).toUpperCase();
  };

  return (
    <div className="olivia-premium">
      {/* ═══════════════════════════════════════════════════════════════════
          COCKPIT HEADER - Airbus A320 Glass Cockpit Inspiration
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="cockpit-header">
        <div className="cockpit-left">
          <div className="status-cluster">
            <div className="status-indicator online">
              <span className="indicator-dot"></span>
              <span className="indicator-label">SYSTEM ONLINE</span>
            </div>
            <div className="status-indicator">
              <span className="indicator-icon">◈</span>
              <span className="indicator-label">D-ID AVATAR</span>
              <span className={`indicator-value ${isAvatarReady ? 'active' : ''}`}>
                {isAvatarReady ? 'READY' : 'INIT...'}
              </span>
            </div>
          </div>
        </div>

        <div className="cockpit-center">
          <div className="olivia-wordmark">
            <span className="wordmark-prefix">ASK</span>
            <span className="wordmark-main">OLIVIA</span>
          </div>
          <div className="wordmark-tagline">AI Freedom Advisor • London</div>
        </div>

        <div className="cockpit-right">
          <div className="time-cluster">
            <div className="time-display">
              <span className="time-label">LOCAL</span>
              <span className="time-value">{formatTime(currentTime)}</span>
            </div>
            <div className="date-display">
              <span className="date-value">{formatDate(currentTime)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN VIEWPORT - The TV Screen / Video Interface
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="viewport-container">
        <div className="viewport-frame">
          {/* Premium bezel styling */}
          <div className="viewport-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            {/* The actual video screen */}
            <div className="viewport-screen">
              {/* D-ID Avatar Video Stream */}
              <video
                ref={videoRef}
                className="avatar-video"
                autoPlay
                playsInline
                muted={false}
              />

              {/* Overlay gradient for depth */}
              <div className="screen-vignette"></div>

              {/* Speaking indicator */}
              {isAvatarSpeaking && (
                <div className="speaking-indicator">
                  <div className="speaking-waves">
                    <span></span><span></span><span></span><span></span><span></span>
                  </div>
                </div>
              )}

              {/* Avatar loading/connecting state */}
              {!isAvatarReady && (
                <div className="avatar-loading">
                  <div className="loading-ring"></div>
                  <div className="loading-ring delay-1"></div>
                  <div className="loading-ring delay-2"></div>
                  <div className="loading-text">
                    {streamStatus === 'connecting' ? 'ESTABLISHING CONNECTION' :
                     streamStatus === 'error' ? 'CONNECTION ERROR' :
                     'INITIALIZING AVATAR'}
                  </div>
                  <div className="loading-subtext">
                    {streamError || 'Connecting to D-ID Video Stream'}
                  </div>
                  {streamStatus === 'error' && (
                    <button className="retry-btn" onClick={() => connectAvatar()}>
                      RETRY CONNECTION
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Viewport bottom info bar */}
          <div className="viewport-info-bar">
            <div className="info-segment">
              <span className="segment-icon">◉</span>
              <span className="segment-label">VIDEO FEED</span>
              <span className="segment-value">{isAvatarReady ? 'LIVE' : 'STANDBY'}</span>
            </div>
            <div className="info-segment">
              <span className="segment-icon">◈</span>
              <span className="segment-label">VOICE</span>
              <span className={`segment-value ${isListening ? 'active' : ''}`}>
                {isListening ? 'LISTENING' : isAvatarSpeaking ? 'SPEAKING' : 'READY'}
              </span>
            </div>
            <div className="info-segment">
              <span className="segment-icon">◇</span>
              <span className="segment-label">DATA CONTEXT</span>
              <span className={`segment-value ${hasComparisonData ? 'active' : ''}`}>
                {hasComparisonData ? `${city1} / ${city2}` : 'NO DATA'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          CONTROL PANEL - Swiss Timepiece Precision
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="control-panel">
        {/* Voice Controls */}
        <div className="control-group voice-controls">
          <div className="control-label">VOICE COMMAND</div>
          <div className="control-buttons">
            <button
              className={`control-btn primary ${isListening ? 'active recording' : ''}`}
              onClick={handleVoiceToggle}
              disabled={!voiceSupported}
            >
              <span className="btn-icon">{isListening ? '◼' : '◉'}</span>
              <span className="btn-text">{isListening ? 'STOP' : 'SPEAK'}</span>
              {isListening && <span className="btn-pulse"></span>}
            </button>

            <button
              className={`control-btn ${autoSpeak ? 'active' : ''}`}
              onClick={() => setAutoSpeak(!autoSpeak)}
              title="Auto-speak responses"
            >
              <span className="btn-icon">{autoSpeak ? '◉' : '○'}</span>
              <span className="btn-text">AUTO</span>
            </button>
          </div>

          {/* Voice transcript display */}
          {(transcript || interimTranscript) && (
            <div className="voice-transcript-display">
              <span className="transcript-indicator">◉ REC</span>
              <span className="transcript-text">
                {transcript}
                <span className="interim">{interimTranscript}</span>
              </span>
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="control-group text-input-group">
          <div className="control-label">TEXT COMMAND</div>
          <div className="text-input-wrapper">
            <input
              type="text"
              className="text-command-input"
              placeholder="Type your question..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="send-command-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
            >
              <span className="btn-icon">▶</span>
            </button>
          </div>
        </div>

        {/* Toggle text chat panel */}
        <div className="control-group">
          <button
            className={`control-btn toggle-chat ${showTextChat ? 'active' : ''}`}
            onClick={() => setShowTextChat(!showTextChat)}
          >
            <span className="btn-icon">☰</span>
            <span className="btn-text">TRANSCRIPT</span>
            {messages.length > 0 && (
              <span className="message-count">{messages.length}</span>
            )}
          </button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK ACTIONS - James Bond Gadget Panel
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="quick-actions-panel">
        <div className="panel-header">
          <span className="panel-icon">◈</span>
          <span className="panel-title">QUICK BRIEFING</span>
          <span className="panel-subtitle">Select a topic for instant analysis</span>
        </div>
        <div className="actions-grid">
          {DEFAULT_QUICK_ACTIONS.slice(0, 8).map((action, index) => (
            <button
              key={action.id}
              className={`action-tile ${!hasComparisonData ? 'disabled' : ''}`}
              onClick={() => hasComparisonData && handleQuickAction(action)}
              disabled={!hasComparisonData}
              style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
            >
              <span className="tile-number">{String(index + 1).padStart(2, '0')}</span>
              <span className="tile-icon">{action.icon}</span>
              <span className="tile-label">{action.label}</span>
              <span className="tile-arrow">→</span>
            </button>
          ))}
        </div>
        {!hasComparisonData && (
          <div className="no-data-notice">
            <span className="notice-icon">⚠</span>
            <span>Run a city comparison first to unlock full analysis capabilities</span>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          TEXT CHAT PANEL - Expandable Transcript
      ═══════════════════════════════════════════════════════════════════ */}
      {showTextChat && (
        <section className="chat-transcript-panel">
          <div className="transcript-header">
            <div className="header-left">
              <span className="header-icon">◈</span>
              <span className="header-title">CONVERSATION TRANSCRIPT</span>
            </div>
            <div className="header-right">
              <button className="header-btn" onClick={clearHistory} title="Clear history">
                <span>CLEAR</span>
              </button>
              <button className="header-btn close" onClick={() => setShowTextChat(false)}>
                <span>✕</span>
              </button>
            </div>
          </div>

          <div className="transcript-messages">
            {messages.length === 0 && (
              <div className="transcript-empty">
                <span className="empty-icon">◇</span>
                <span className="empty-text">No conversation yet</span>
                <span className="empty-hint">Speak or type to begin your briefing with Olivia</span>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`transcript-message ${msg.role}`}>
                <div className="message-header">
                  <span className="message-sender">
                    {msg.role === 'assistant' ? 'OLIVIA' : 'YOU'}
                  </span>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="message-body">{msg.content}</div>
                {msg.role === 'assistant' && (
                  <button
                    className="replay-btn"
                    onClick={() => {
                      if (isAvatarSpeaking || isTTSSpeaking) {
                        stopSpeaking();
                      } else if (isAvatarReady) {
                        avatarSpeak(msg.content);
                      } else {
                        speakText(msg.content);
                      }
                    }}
                  >
                    <span>{isAvatarSpeaking || isTTSSpeaking ? '◼ STOP' : '▶ REPLAY'}</span>
                  </button>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="transcript-message assistant">
                <div className="message-header">
                  <span className="message-sender">OLIVIA</span>
                  <span className="message-time">TYPING...</span>
                </div>
                <div className="typing-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}

            {chatError && (
              <div className="transcript-error">
                <span className="error-icon">⚠</span>
                <span>{chatError.message}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER - Luxury Brand Footer
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="olivia-footer">
        <div className="footer-left">
          <span className="footer-brand">LIFE SCORE™</span>
          <span className="footer-divider">|</span>
          <span className="footer-tagline">Premium AI Advisory</span>
        </div>
        <div className="footer-center">
          <div className="connection-status">
            <span className={`status-dot ${isAvatarReady ? 'online' : 'connecting'}`}></span>
            <span className="status-text">
              {isAvatarReady ? 'SECURE CONNECTION' : 'ESTABLISHING LINK'}
            </span>
          </div>
        </div>
        <div className="footer-right">
          <span className="footer-location">LONDON • NEW YORK • SINGAPORE</span>
        </div>
      </footer>
    </div>
  );
};

export default AskOlivia;
