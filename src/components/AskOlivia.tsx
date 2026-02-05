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

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  const lastAssistantMsgRef = useRef<HTMLDivElement>(null); // FIX: Ref for scrolling to Olivia's response
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSpokenMsgRef = useRef<string | null>(null);
  const lastAnalyzedMsgRef = useRef<string | null>(null); // Track last message analyzed for contrast images
  const lastScrolledMsgRef = useRef<string | null>(null); // FIX: Track last message we scrolled to
  // const hasGreetedRef = useRef(false); // Disabled with auto-greeting

  // Tier access for message limits
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

    // Cleanup ALL audio sources on page refresh/close
    const handleBeforeUnload = () => {
      console.log('[AskOlivia] Page unloading - stopping ALL audio');
      interruptAvatar();
      stopSpeaking();
      disconnectAvatar();
      // Force cancel any lingering browser speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // MOBILE FIX: Handle visibility change (text message, app switch, notification)
    // When page loses visibility, STOP all audio to prevent chaos when returning
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[AskOlivia] 📱 Page hidden (text/notification/app switch) - stopping audio');
        interruptAvatar();
        stopSpeaking();
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also handle blur (loses focus but still visible)
    const handleBlur = () => {
      console.log('[AskOlivia] 📱 Window blur - pausing audio');
      interruptAvatar();
      stopSpeaking();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      // CRITICAL: Stop ALL audio on cleanup/navigation
      console.log('[AskOlivia] Cleanup - stopping ALL audio sources');
      interruptAvatar();
      stopSpeaking();
      disconnectAvatar();
      // Force cancel browser speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoEnabled]); // Only re-run when videoEnabled changes

  // Toggle video chat
  const toggleVideoChat = useCallback(() => {
    setVideoEnabled(prev => !prev);
  }, []);

  // FIX 2026-02-02: Scroll to TOP of Olivia's response, not to the end of the page
  // When Olivia responds, scroll so her response starts at the top of the visible area
  useEffect(() => {
    if (!showTextChat || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Only scroll when there's a NEW assistant message we haven't scrolled to yet
    if (lastMessage.role === 'assistant' && lastMessage.id !== lastScrolledMsgRef.current) {
      lastScrolledMsgRef.current = lastMessage.id;

      // Use setTimeout to ensure DOM has rendered the new message
      setTimeout(() => {
        if (lastAssistantMsgRef.current) {
          // Scroll to TOP of Olivia's response with 'start' alignment
          lastAssistantMsgRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start', // Align to TOP of viewport, not bottom
          });
        }
      }, 100);
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

        // CRITICAL: Interrupt any ongoing speech before starting new
        // This prevents overlapping/repeating audio
        interruptAvatar();
        stopSpeaking();

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
  }, [messages, autoSpeak, isAvatarConnected, makeAvatarSpeak, speakText, activeProvider, videoEnabled, interruptAvatar, stopSpeaking]);

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
    // Send to OpenAI (the brain) - response will auto-trigger speak
    await sendMessage(messageText);
  }, [inputText, sendMessage, checkUsage, incrementUsage, isUnlimited, isAdmin]);

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

  // Save contrast images handler (fetch → blob → download)
  const handleSaveContrastImages = useCallback(async () => {
    if (!contrastImages) return;

    const downloadImage = async (url: string, filename: string) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('[AskOlivia] Image download failed:', err);
        window.open(url, '_blank');
      }
    };

    if (contrastImages.cityAImage?.url) {
      await downloadImage(
        contrastImages.cityAImage.url,
        `${city1.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-contrast.png`
      );
    }
    if (contrastImages.cityBImage?.url) {
      setTimeout(async () => {
        await downloadImage(
          contrastImages.cityBImage.url,
          `${city2.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-contrast.png`
        );
      }, 500);
    }
  }, [contrastImages, city1, city2]);

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

                  {/* Video Controls Overlay - Always visible when video is enabled */}
                  {isAvatarReady && (
                    <div className="video-controls-overlay">
                      {(isAvatarSpeaking || isTTSSpeaking) ? (
                        <button
                          className="video-control-btn pause-btn"
                          onClick={() => {
                            interruptAvatar();
                            stopSpeaking();
                          }}
                          title="Pause Olivia"
                        >
                          <span className="control-icon">⏸</span>
                          <span className="control-label">PAUSE</span>
                        </button>
                      ) : (
                        <div className="video-control-status">
                          <span className="status-icon">●</span>
                          <span className="status-label">READY</span>
                        </div>
                      )}
                      <button
                        className="video-control-btn stop-btn"
                        onClick={() => {
                          interruptAvatar();
                          stopSpeaking();
                          setVideoEnabled(false);
                        }}
                        title="Stop Video Chat"
                      >
                        <span className="control-icon">◼</span>
                        <span className="control-label">STOP VIDEO</span>
                      </button>
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
          onSaveImages={handleSaveContrastImages}
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
            value={selectedComparisonId ?? ''}
            onChange={(e) => {
              // FIX 7.2: Proper empty string vs null handling
              const value = e.target.value;
              setSelectedComparisonId(value === '' ? null : value);
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
          <UsageMeter feature="oliviaMinutesPerMonth" compact={true} />
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

            {messages.map((msg, index) => {
              // FIX 2026-02-02: Attach ref to the LAST assistant message for proper scroll targeting
              const isLastAssistantMsg = msg.role === 'assistant' &&
                index === messages.map(m => m.role).lastIndexOf('assistant');

              return (
                <div
                  key={msg.id}
                  ref={isLastAssistantMsg ? lastAssistantMsgRef : undefined}
                  className={`transcript-message ${msg.role}`}
                >
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
              );
            })}

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
          <span className="footer-location">LONDON • TAMPA • DENVER • LOS ANGELES • MANILA</span>
        </div>
      </footer>
    </div>
  );
};

export default AskOlivia;
