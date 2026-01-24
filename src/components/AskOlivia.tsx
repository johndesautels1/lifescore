/**
 * LIFE SCORE™ Ask Olivia - Premium Edition
 *
 * ARCHITECTURE: Option B
 * - OpenAI Assistant = ALL intelligence (the brain)
 * - D-ID Streams = Avatar video only (no brain)
 *
 * Flow: User → OpenAI → Response → D-ID speaks response
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
import { useTierAccess } from '../hooks/useTierAccess';
import { UsageMeter } from './FeatureGate';
import './AskOlivia.css';

interface AskOliviaProps {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
}

const AskOlivia: React.FC<AskOliviaProps> = ({ comparisonResult }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTextChat, setShowTextChat] = useState(false);
  const [inputText, setInputText] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [usageLimitReached, setUsageLimitReached] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSpokenMsgRef = useRef<string | null>(null);

  // Tier access for message limits
  const { checkUsage, incrementUsage, isUnlimited } = useTierAccess();

  // ═══════════════════════════════════════════════════════════════════
  // OPENAI CHAT - The Brain (ALL intelligence comes from here)
  // ═══════════════════════════════════════════════════════════════════
  const {
    messages,
    isTyping,
    error: chatError,
    sendMessage,
    clearHistory,
  } = useOliviaChat(comparisonResult);

  // ═══════════════════════════════════════════════════════════════════
  // D-ID STREAMS - Avatar Only (NO brain, just video/lip-sync)
  // ═══════════════════════════════════════════════════════════════════
  const {
    status: didStatus,
    isConnected: isAvatarConnected,
    isSpeaking: isAvatarSpeaking,
    isRateLimited,
    connect: connectAvatar,
    speak: makeAvatarSpeak,
    disconnect: disconnectAvatar,
    resetRetries,
  } = useDIDStream({
    videoRef,
    onSpeakingStart: () => console.log('[AskOlivia] Avatar started speaking'),
    onSpeakingEnd: () => console.log('[AskOlivia] Avatar finished speaking'),
    onError: (err) => console.error('[AskOlivia] Avatar error:', err),
  });

  // ═══════════════════════════════════════════════════════════════════
  // VOICE RECOGNITION - Speech to text input
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // TTS FALLBACK - Browser speech synthesis if D-ID unavailable
  // ═══════════════════════════════════════════════════════════════════
  const { isPlaying: isTTSSpeaking, play: speakText, stop: stopSpeaking } = useTTS();

  // ═══════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════

  // Real-time clock for cockpit feel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-connect to D-ID Streams on mount
  // IMPORTANT: Empty dependency array - connect ONCE on mount only!
  // Having connectAvatar in deps caused infinite retry loops when status changed
  useEffect(() => {
    console.log('[AskOlivia] Initializing D-ID Streams connection (avatar only, OpenAI is brain)');
    connectAvatar();

    // Cleanup D-ID session on page refresh/close to prevent "Max user sessions" error
    const handleBeforeUnload = () => {
      disconnectAvatar();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectAvatar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - mount/unmount only

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-SPEAK: When OpenAI responds, make D-ID avatar speak it
  // This is the KEY Option B connection: OpenAI brain → D-ID mouth
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Only speak NEW assistant messages (from OpenAI)
      if (lastMessage.role === 'assistant' && lastMessage.id !== lastSpokenMsgRef.current) {
        lastSpokenMsgRef.current = lastMessage.id;

        console.log('[AskOlivia] OpenAI responded, sending to D-ID avatar to speak');

        // Try D-ID avatar first
        if (isAvatarConnected) {
          makeAvatarSpeak(lastMessage.content).catch((err) => {
            console.warn('[AskOlivia] D-ID speak failed, falling back to browser TTS:', err);
            speakText(lastMessage.content);
          });
        } else {
          // Fallback to browser TTS
          console.log('[AskOlivia] D-ID not connected, using browser TTS');
          speakText(lastMessage.content);
        }
      }
    }
  }, [messages, autoSpeak, isAvatarConnected, makeAvatarSpeak, speakText]);

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    // Check usage limits before sending
    if (!isUnlimited('oliviaMessagesPerDay')) {
      const usage = await checkUsage('oliviaMessagesPerDay');
      if (!usage.allowed) {
        setUsageLimitReached(true);
        // Dispatch event to open pricing modal
        window.dispatchEvent(new CustomEvent('openPricing', {
          detail: { feature: 'Olivia messages', requiredTier: usage.requiredTier }
        }));
        return;
      }
      // Increment usage counter
      await incrementUsage('oliviaMessagesPerDay');
    }

    setInputText('');
    setUsageLimitReached(false);
    // Send to OpenAI (the brain) - response will auto-trigger D-ID speak
    await sendMessage(messageText);
  }, [inputText, sendMessage, checkUsage, incrementUsage, isUnlimited]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DATA CONTEXT
  // ═══════════════════════════════════════════════════════════════════
  const hasComparisonData = !!comparisonResult;
  const city1 = comparisonResult?.city1?.city || 'City 1';
  const city2 = comparisonResult?.city2?.city || 'City 2';

  // Determine avatar status for display
  const getAvatarStatus = () => {
    if (isAvatarSpeaking) return 'SPEAKING';
    if (isAvatarConnected) return 'READY';
    if (isRateLimited) return 'RATE LIMITED';
    if (didStatus === 'connecting') return 'CONNECTING';
    if (didStatus === 'error') return 'ERROR';
    return 'INIT...';
  };

  // Handler for manual reconnection attempt
  const handleManualReconnect = () => {
    resetRetries();
    connectAvatar();
  };

  const isAvatarReady = isAvatarConnected || didStatus === 'connected';

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
              <span className="indicator-label">OPENAI BRAIN</span>
            </div>
            <div className="status-indicator">
              <span className="indicator-icon">◈</span>
              <span className="indicator-label">D-ID AVATAR</span>
              <span className={`indicator-value ${isAvatarReady ? 'active' : ''}`}>
                {getAvatarStatus()}
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
          MAIN VIEWPORT - D-ID Streams Video (Avatar Only, No Brain)
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="viewport-container">
        <div className="viewport-frame">
          {/* Premium bezel styling */}
          <div className="viewport-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            {/* The actual video screen - D-ID WebRTC stream */}
            <div id="olivia-viewport" className="viewport-screen">
              {/* D-ID Streams video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={false}
                className="avatar-video"
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

              {/* Avatar loading state */}
              {!isAvatarReady && (
                <div className="avatar-loading">
                  {!isRateLimited && didStatus !== 'error' && (
                    <>
                      <div className="loading-ring"></div>
                      <div className="loading-ring delay-1"></div>
                      <div className="loading-ring delay-2"></div>
                    </>
                  )}
                  <div className="loading-text">
                    {isRateLimited ? 'RATE LIMITED' : didStatus === 'error' ? 'CONNECTION ERROR' : 'INITIALIZING OLIVIA'}
                  </div>
                  <div className="loading-subtext">
                    {isRateLimited
                      ? 'D-ID API rate limit reached. Please wait...'
                      : didStatus === 'error'
                        ? 'Connection failed - using text mode'
                        : 'Connecting to D-ID Streams...'}
                  </div>
                  {(didStatus === 'error' || isRateLimited) && (
                    <button
                      className="retry-connection-btn"
                      onClick={handleManualReconnect}
                      style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1.5rem',
                        background: 'rgba(212, 175, 55, 0.2)',
                        border: '1px solid rgba(212, 175, 55, 0.5)',
                        color: '#d4af37',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontFamily: 'inherit',
                        letterSpacing: '0.1em',
                      }}
                    >
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
              <span className="segment-label">VIDEO</span>
              <span className={`segment-value ${isAvatarReady ? 'active' : ''}`}>
                {isAvatarReady ? 'LIVE' : 'STANDBY'}
              </span>
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
              <span className="segment-label">DATA</span>
              <span className={`segment-value ${hasComparisonData ? 'active' : ''}`}>
                {hasComparisonData ? `${city1} / ${city2}` : 'NO DATA'}
              </span>
            </div>
            <div className="info-segment">
              <span className="segment-icon">⚡</span>
              <span className="segment-label">BRAIN</span>
              <span className="segment-value active">OPENAI</span>
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

            {/* STOP OLIVIA button - shown when she's speaking */}
            {(isAvatarSpeaking || isTTSSpeaking) && (
              <button
                className="control-btn danger"
                onClick={() => {
                  disconnectAvatar();
                  stopSpeaking();
                }}
                title="Stop Olivia"
              >
                <span className="btn-icon">◼</span>
                <span className="btn-text">PAUSE</span>
              </button>
            )}

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
              placeholder={usageLimitReached ? "Daily limit reached - Upgrade for more" : "Type your question..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={usageLimitReached}
            />
            <button
              className="send-command-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || usageLimitReached}
            >
              <span className="btn-icon">▶</span>
            </button>
          </div>
          {/* Usage meter for message limits */}
          <div className="olivia-usage-meter">
            <UsageMeter feature="oliviaMessagesPerDay" compact={true} />
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
          TEXT CHAT PANEL - Expandable Transcript (OpenAI responses)
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
                      if (isTTSSpeaking) {
                        stopSpeaking();
                      } else if (isAvatarConnected) {
                        makeAvatarSpeak(msg.content);
                      } else {
                        speakText(msg.content);
                      }
                    }}
                  >
                    <span>{isTTSSpeaking || isAvatarSpeaking ? '◼ STOP' : '▶ REPLAY'}</span>
                  </button>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="transcript-message assistant">
                <div className="message-header">
                  <span className="message-sender">OLIVIA</span>
                  <span className="message-time">THINKING...</span>
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
              {isAvatarReady ? 'OPENAI + D-ID CONNECTED' : 'ESTABLISHING LINK'}
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
