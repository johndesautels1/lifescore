/**
 * LIFE SCORE™ Ask Olivia - Premium Edition
 *
 * ARCHITECTURE: Option B (Updated for Simli AI)
 * - OpenAI Assistant = ALL intelligence (the brain)
 * - Simli AI = Avatar video only (replaced D-ID - 90% cost savings)
 *
 * Flow: User → OpenAI → Response → Simli speaks response
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
import { useAvatarProvider } from '../hooks/useAvatarProvider';
import { useTierAccess } from '../hooks/useTierAccess';
import { useContrastImages } from '../hooks/useContrastImages';
import { UsageMeter } from './FeatureGate';
import { ContrastDisplays } from './ContrastDisplays';
import {
  getLocalComparisons,
  getLocalEnhancedComparisons,
} from '../services/savedComparisons';
import './AskOlivia.css';

interface AskOliviaProps {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
}

const AskOlivia: React.FC<AskOliviaProps> = ({ comparisonResult: propComparisonResult }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTextChat, setShowTextChat] = useState(false);
  const [inputText, setInputText] = useState('');
  // Auto-speak is always enabled - Olivia always speaks her responses
  const autoSpeak = true;
  const [usageLimitReached, setUsageLimitReached] = useState(false);

  // Video chat is now OPT-IN (user must click "Start Video Chat")
  const [videoEnabled, setVideoEnabled] = useState(false);

  // Selected comparison from dropdown (null = use prop, or "none" for general chat)
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSpokenMsgRef = useRef<string | null>(null);
  const lastAnalyzedMsgRef = useRef<string | null>(null); // Track last message analyzed for contrast images
  // const hasGreetedRef = useRef(false); // Disabled with auto-greeting

  // Tier access for message limits
  const { checkUsage, incrementUsage, isUnlimited } = useTierAccess();

  // Load saved comparisons for Olivia's context
  // This gives Olivia knowledge of ALL user's previous comparisons
  const savedComparisons = getLocalComparisons();
  const savedEnhanced = getLocalEnhancedComparisons();

  // Determine which comparison to use for context
  // Priority: Selected from dropdown > Prop > None
  const getActiveComparison = (): EnhancedComparisonResult | ComparisonResult | null => {
    if (selectedComparisonId === 'none') return null;
    if (selectedComparisonId) {
      // Look up in saved comparisons
      const savedStd = savedComparisons.find(c => c.result.comparisonId === selectedComparisonId);
      if (savedStd) return savedStd.result;
      const savedEnh = savedEnhanced.find(c => c.result.comparisonId === selectedComparisonId);
      if (savedEnh) return savedEnh.result;
    }
    return propComparisonResult || null;
  };

  const comparisonResult = getActiveComparison();

  // ═══════════════════════════════════════════════════════════════════
  // OPENAI CHAT - The Brain (ALL intelligence comes from here)
  // Now includes saved comparison history for full context
  // ═══════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════
  // AVATAR PROVIDER - Simli AI with D-ID fallback
  // Primary: Simli AI (cost-effective)
  // Fallback: D-ID Streams (premium backup)
  // ═══════════════════════════════════════════════════════════════════
  const {
    status: avatarStatus,
    isConnected: isAvatarConnected,
    isSpeaking: isAvatarSpeaking,
    connect: connectAvatar,
    speak: makeAvatarSpeak,
    disconnect: disconnectAvatar,
    interrupt: interruptAvatar,
    error: avatarError,
    activeProvider,
    hasFallenBack,
  } = useAvatarProvider({
    videoRef,
    audioRef,
    autoFallback: true,
    onProviderSwitch: (from, to, reason) => {
      console.log(`[AskOlivia] Avatar provider switched: ${from} → ${to} (${reason})`);
    },
  });

  // ═══════════════════════════════════════════════════════════════════
  // VOICE RECOGNITION - Speech to text input
  // ═══════════════════════════════════════════════════════════════════
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
    continuous: true, // Stay engaged until user toggles off
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

  // Connect/disconnect avatar based on videoEnabled state
  useEffect(() => {
    if (videoEnabled) {
      console.log('[AskOlivia] Starting video chat (Simli primary, D-ID fallback)');
      connectAvatar();
    } else {
      console.log('[AskOlivia] Video chat disabled, disconnecting avatar');
      disconnectAvatar();
    }

    // Cleanup avatar session on page refresh/close
    const handleBeforeUnload = () => {
      if (videoEnabled) {
        disconnectAvatar();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      disconnectAvatar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEnabled]); // Only re-run when videoEnabled changes

  // Toggle video chat
  const toggleVideoChat = useCallback(() => {
    setVideoEnabled(prev => !prev);
  }, []);

  // Scroll to bottom when messages change OR when chat panel opens
  // FIXED 2026-01-25: Now properly scrolls when panel opens to show latest messages
  useEffect(() => {
    if (showTextChat && messagesEndRef.current) {
      // Use setTimeout to ensure DOM has rendered before scrolling
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [messages, showTextChat]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-SPEAK: When OpenAI responds, make avatar speak it (if video enabled)
  // This is the KEY connection: OpenAI brain → Avatar mouth (Simli or D-ID)
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // Only speak NEW assistant messages (from OpenAI)
      if (lastMessage.role === 'assistant' && lastMessage.id !== lastSpokenMsgRef.current) {
        lastSpokenMsgRef.current = lastMessage.id;

        // If video is enabled and avatar is connected, use avatar
        if (videoEnabled && isAvatarConnected) {
          makeAvatarSpeak(lastMessage.content).catch((err: Error) => {
            console.warn('[AskOlivia] Avatar speak failed, falling back to browser TTS:', err);
            speakText(lastMessage.content);
          });
        } else {
          // Use browser TTS when video is disabled
          speakText(lastMessage.content);
        }
      }
    }
  }, [messages, autoSpeak, isAvatarConnected, makeAvatarSpeak, speakText, activeProvider, videoEnabled]);

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-GREETING: Disabled for testing
  // ═══════════════════════════════════════════════════════════════════
  // useEffect(() => {
  //   if (videoEnabled && isAvatarConnected && !hasGreetedRef.current) {
  //     hasGreetedRef.current = true;
  //     setTimeout(() => {
  //       const greeting = "Hello, I'm Olivia, your AI freedom advisor. How may I assist you today?";
  //       makeAvatarSpeak(greeting).catch((err: Error) => {
  //         console.warn('[AskOlivia] Greeting failed:', err);
  //       });
  //     }, 2000);
  //   }
  //   if (!videoEnabled) {
  //     hasGreetedRef.current = false;
  //   }
  // }, [videoEnabled, isAvatarConnected, makeAvatarSpeak]);

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
    // Send to OpenAI (the brain) - response will auto-trigger speak
    await sendMessage(messageText);
  }, [inputText, sendMessage, checkUsage, incrementUsage, isUnlimited]);

  const handleQuickAction = useCallback((action: OliviaQuickAction) => {
    setShowTextChat(true);
    handleSendMessage(action.prompt);
  }, [handleSendMessage]);

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      // If there's pending transcript when stopping, send it as a message
      const pendingText = (transcript + interimTranscript).trim();
      if (pendingText) {
        handleSendMessage(pendingText);
        resetTranscript();
      }
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening, transcript, interimTranscript, handleSendMessage, resetTranscript]);

  // ═══════════════════════════════════════════════════════════════════
  // DATA CONTEXT
  // ═══════════════════════════════════════════════════════════════════
  const hasComparisonData = !!comparisonResult;
  const city1 = comparisonResult?.city1?.city || 'City 1';
  const city2 = comparisonResult?.city2?.city || 'City 2';

  // Helper to get score from either CityScore or CityConsensusScore
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getScore = (city: any): number | undefined => {
    if (!city) return undefined;
    // CityScore has totalScore, CityConsensusScore has totalConsensusScore
    if ('totalScore' in city) return city.totalScore;
    if ('totalConsensusScore' in city) return city.totalConsensusScore;
    return undefined;
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONTRAST IMAGES - AI-generated visual comparisons
  // ═══════════════════════════════════════════════════════════════════
  const {
    status: contrastStatus,
    images: contrastImages,
    error: contrastError,
    currentTopic: contrastTopic,
    detectAndGenerate: detectContrastTriggers,
    generateImages: generateContrastImages,
    clearImages: clearContrastImages,
  } = useContrastImages({
    cityA: comparisonResult ? { name: city1, score: getScore(comparisonResult.city1) } : undefined,
    cityB: comparisonResult ? { name: city2, score: getScore(comparisonResult.city2) } : undefined,
    autoDetect: true,
  });

  // ═══════════════════════════════════════════════════════════════════
  // AUTO-VISUALIZE: Generate contrast images when Olivia discusses metrics
  // Only triggers once per unique message to prevent flickering/re-renders
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (hasComparisonData && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // Only analyze NEW assistant messages (not already analyzed)
      if (lastMessage.role === 'assistant' && lastMessage.id !== lastAnalyzedMsgRef.current) {
        lastAnalyzedMsgRef.current = lastMessage.id;
        detectContrastTriggers(lastMessage.content);
      }
    }
  }, [messages, hasComparisonData, detectContrastTriggers]);

  // Determine avatar status for display
  const getAvatarStatus = () => {
    if (isAvatarSpeaking) return 'SPEAKING';
    if (isAvatarConnected) return 'READY';
    if (avatarStatus === 'connecting') return 'CONNECTING';
    if (avatarStatus === 'falling_back') return 'SWITCHING...';
    if (avatarStatus === 'error') return 'ERROR';
    if (avatarStatus === 'listening') return 'LISTENING';
    if (avatarStatus === 'rate_limited') return 'RATE LIMITED';
    return 'INIT...';
  };

  // Get provider display name
  const getProviderDisplay = () => {
    const provider = activeProvider.toUpperCase();
    return hasFallenBack ? `${provider} (FALLBACK)` : provider;
  };

  // Handler for manual reconnection attempt
  const handleManualReconnect = () => {
    connectAvatar();
  };

  const isAvatarReady = isAvatarConnected || avatarStatus === 'connected';
  const hasConnectionError = avatarStatus === 'error' || avatarStatus === 'rate_limited';

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
              <span className="indicator-label">{getProviderDisplay()} AVATAR</span>
              <span className={`indicator-value ${isAvatarReady ? 'active' : ''} ${hasFallenBack ? 'fallback' : ''}`}>
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
          MAIN VIEWPORT - Simli AI Video (Avatar Only, No Brain)
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="viewport-container">
        <div className="viewport-frame">
          {/* Premium bezel styling */}
          <div className="viewport-bezel">
            <div className="bezel-corner tl"></div>
            <div className="bezel-corner tr"></div>
            <div className="bezel-corner bl"></div>
            <div className="bezel-corner br"></div>

            {/* The actual video screen - Simli AI WebRTC stream */}
            <div id="olivia-viewport" className="viewport-screen">
              {videoEnabled ? (
                <>
                  {/* Simli AI video element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={false}
                    className="avatar-video"
                  />
                  {/* Simli AI audio element (required by SDK) */}
                  <audio ref={audioRef} autoPlay />

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
                      {!hasConnectionError && (
                        <>
                          <div className="loading-ring"></div>
                          <div className="loading-ring delay-1"></div>
                          <div className="loading-ring delay-2"></div>
                        </>
                      )}
                      <div className="loading-text">
                        {hasConnectionError ? 'CONNECTION ERROR' : 'INITIALIZING OLIVIA'}
                      </div>
                      <div className="loading-subtext">
                        {hasConnectionError
                          ? avatarError || 'Connection failed - using text mode'
                          : `Connecting to ${activeProvider.toUpperCase()} AI...`}
                      </div>
                      {hasConnectionError && (
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
                </>
              ) : (
                /* Video disabled placeholder */
                <div className="video-disabled-placeholder">
                  <div className="placeholder-avatar">
                    <div className="avatar-circle">
                      <span className="avatar-initial">O</span>
                    </div>
                    <div className="avatar-name">OLIVIA</div>
                    <div className="avatar-subtitle">AI Freedom Advisor</div>
                  </div>
                  <button
                    className="start-video-btn"
                    onClick={toggleVideoChat}
                  >
                    <span className="btn-icon">🎥</span>
                    <span className="btn-text">Start Video Chat</span>
                  </button>
                  <div className="text-mode-hint">
                    Text chat is active. Click above to enable video.
                  </div>
                </div>
              )}

              {/* Overlay gradient for depth */}
              <div className="screen-vignette"></div>
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
          CONTRAST DISPLAYS - AI-Generated Visual Comparisons
      ═══════════════════════════════════════════════════════════════════ */}
      {hasComparisonData && (
        <ContrastDisplays
          cityA={{ name: city1, score: getScore(comparisonResult?.city1) }}
          cityB={{ name: city2, score: getScore(comparisonResult?.city2) }}
          status={contrastStatus}
          images={contrastImages}
          topic={contrastTopic}
          error={contrastError}
          onRetry={() => {
            if (contrastTopic) {
              // Retry last topic
              const metricId = contrastTopic.toLowerCase().replace(/\s+/g, '_');
              generateContrastImages(metricId);
            }
          }}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CONTROL PANEL - Clean Row Layout
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="control-panel">
        {/* Row 1: SELECT REPORT | SPEAK | TRANSCRIPT - 3 buttons */}
        <div className="control-row">
          {/* 1. Report Dropdown */}
          <select
            className="control-item"
            value={selectedComparisonId || ''}
            onChange={(e) => {
              setSelectedComparisonId(e.target.value || null);
              clearHistory();
              clearContrastImages();
            }}
          >
            <option value="">
              {propComparisonResult
                ? `${propComparisonResult.city1?.city || 'City 1'} vs ${propComparisonResult.city2?.city || 'City 2'}`
                : 'Select Report'}
            </option>
            <option value="none">General Chat</option>
            {savedComparisons.length > 0 && (
              <optgroup label="Saved">
                {savedComparisons.map((saved) => (
                  <option key={saved.id} value={saved.result.comparisonId}>
                    {saved.result.city1.city} vs {saved.result.city2.city}
                  </option>
                ))}
              </optgroup>
            )}
            {savedEnhanced.length > 0 && (
              <optgroup label="Enhanced">
                {savedEnhanced.map((saved) => (
                  <option key={saved.id} value={saved.result.comparisonId}>
                    {saved.result.city1.city} vs {saved.result.city2.city}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {/* 2. Speak Button */}
          <button
            className={`control-item control-btn ${isListening ? 'recording' : ''}`}
            onClick={handleVoiceToggle}
            disabled={!voiceSupported}
          >
            <span className="btn-icon">{isListening ? '◼' : '🎤'}</span>
            <span className="btn-text">{isListening ? 'STOP' : 'SPEAK'}</span>
            {isListening && <span className="btn-pulse"></span>}
          </button>

          {/* 3. Transcript Button */}
          <button
            className={`control-item control-btn ${showTextChat ? 'active' : ''}`}
            onClick={() => setShowTextChat(!showTextChat)}
          >
            <span className="btn-icon">☰</span>
            <span className="btn-text">TRANSCRIPT</span>
            {messages.length > 0 && (
              <span className="message-count">{messages.length}</span>
            )}
          </button>
        </div>

        {/* Row 2: Large Chat Input Box - centered */}
        <div className="chat-input-row">
          <div className="chat-box">
            <textarea
              className="chat-textarea"
              placeholder={usageLimitReached ? "Daily limit reached - Upgrade for more" : "Type your message to Olivia..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={usageLimitReached}
            />
            <button
              className="chat-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || usageLimitReached}
            >
              SEND
            </button>
          </div>
        </div>

        {/* Voice transcript display - shows below when recording */}
        {(transcript || interimTranscript) && (
          <div className="voice-transcript-display">
            <span className="transcript-indicator">◉ REC</span>
            <span className="transcript-text">
              {transcript}
              <span className="interim">{interimTranscript}</span>
            </span>
          </div>
        )}

        {/* Voice error display */}
        {voiceError && (
          <div className="voice-error-display">
            ⚠️ {voiceError}
          </div>
        )}

        {/* Pause button - shows when Olivia is speaking */}
        {(isAvatarSpeaking || isTTSSpeaking) && (
          <button
            className="pause-btn"
            onClick={() => {
              interruptAvatar();
              stopSpeaking();
            }}
          >
            ⏸ PAUSE OLIVIA
          </button>
        )}

        {/* Usage meter */}
        <div className="usage-meter-row">
          <UsageMeter feature="oliviaMessagesPerDay" compact={true} />
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
            <span className={`status-dot ${isAvatarReady ? 'online' : 'connecting'} ${hasFallenBack ? 'fallback' : ''}`}></span>
            <span className="status-text">
              {isAvatarReady
                ? `OPENAI + ${activeProvider.toUpperCase()} CONNECTED${hasFallenBack ? ' (FALLBACK)' : ''}`
                : 'ESTABLISHING LINK'}
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
