/**
 * LIFE SCORE™ Report Presenter
 * Olivia video avatar overlaid on the Gamma report in a picture-in-picture style.
 *
 * Architecture:
 *   - HeyGen streaming avatar (primary) with TTS audio-only fallback
 *   - PIP overlay sits in bottom-right of the embedded report
 *   - Playback controls: Play/Pause, Skip Forward/Back, Close
 *   - Segments progress bar shows current position in presentation
 *
 * Integrations:
 *   - HeyGen: Real-time streaming avatar (creates session, sends text to speak)
 *   - Olivia TTS: Fallback audio narration when HeyGen unavailable
 *   - presenterService: Generates narration script from comparison data
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AnyComparisonResult } from '../services/gammaService';
import type { PresenterState, PresenterSegment } from '../types/presenter';
import { generatePresentationScript, getPresenterStatusLabel } from '../services/presenterService';
import {
  createHeyGenSession,
  heygenSpeak,
  heygenInterrupt,
  closeHeyGenSession,
  generateTTS,
} from '../services/oliviaService';
import './ReportPresenter.css';

// ============================================================================
// PROPS
// ============================================================================

interface ReportPresenterProps {
  result: AnyComparisonResult;
  gammaUrl: string;
  onClose: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ReportPresenter: React.FC<ReportPresenterProps> = ({
  result,
  gammaUrl,
  onClose,
}) => {
  // ---- Presenter state ----
  const [state, setState] = useState<PresenterState>({
    status: 'idle',
    currentSegmentIndex: 0,
    segments: [],
    error: undefined,
    avatarConnected: false,
    ttsOnly: false,
  });

  // ---- HeyGen session ----
  const heygenSessionRef = useRef<{ sessionId: string; token: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // ---- TTS fallback ----
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  // ---- Segment auto-advance timer ----
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, []);

  // ---- Build script on mount ----
  useEffect(() => {
    const script = generatePresentationScript(result);
    setState((prev) => ({
      ...prev,
      segments: script.segments,
    }));
  }, [result]);

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  const cleanupSession = useCallback(() => {
    // Clear timers
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    // Close HeyGen session
    if (heygenSessionRef.current) {
      closeHeyGenSession(heygenSessionRef.current.sessionId).catch(() => {});
      heygenSessionRef.current = null;
    }

    // Close WebRTC peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop TTS audio
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
  }, []);

  const connectHeyGen = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[ReportPresenter] Creating HeyGen session...');
      const response = await createHeyGenSession();

      if (!response.sessionId) {
        throw new Error('No session ID returned');
      }

      // Store session + token
      heygenSessionRef.current = {
        sessionId: response.sessionId,
        token: (response as any).token || '',
      };

      // Set up WebRTC peer connection if SDP offer available
      if (response.sdpOffer && response.iceServers) {
        const pc = new RTCPeerConnection({
          iceServers: response.iceServers,
        });
        peerConnectionRef.current = pc;

        // Handle incoming media stream
        pc.ontrack = (event) => {
          if (event.track.kind === 'video' && videoRef.current) {
            const stream = new MediaStream([event.track]);
            videoRef.current.srcObject = stream;
          }
          if (event.track.kind === 'audio' && audioRef.current) {
            const stream = new MediaStream([event.track]);
            audioRef.current.srcObject = stream;
          }
        };

        // Set remote description (SDP offer from HeyGen)
        await pc.setRemoteDescription(response.sdpOffer);

        // Create and set local answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log('[ReportPresenter] WebRTC connected');
      }

      return true;
    } catch (err) {
      console.warn('[ReportPresenter] HeyGen connection failed:', err);
      return false;
    }
  }, []);

  // ============================================================================
  // SPEAKING
  // ============================================================================

  const speakSegment = useCallback(async (segment: PresenterSegment) => {
    if (heygenSessionRef.current && !state.ttsOnly) {
      // Use HeyGen streaming avatar
      try {
        await heygenSpeak(heygenSessionRef.current.sessionId, segment.narration);
      } catch (err) {
        console.warn('[ReportPresenter] HeyGen speak failed, falling back to TTS:', err);
        await speakTTSFallback(segment.narration);
      }
    } else {
      // TTS-only fallback
      await speakTTSFallback(segment.narration);
    }
  }, [state.ttsOnly]);

  const speakTTSFallback = useCallback(async (text: string) => {
    try {
      const ttsResponse = await generateTTS(text);
      if (ttsResponse.audioUrl) {
        const audio = new Audio(ttsResponse.audioUrl);
        ttsAudioRef.current = audio;
        await audio.play();
      }
    } catch (err) {
      console.warn('[ReportPresenter] TTS fallback failed:', err);
    }
  }, []);

  // ============================================================================
  // PLAYBACK CONTROLS
  // ============================================================================

  const startPresentation = useCallback(async () => {
    if (state.segments.length === 0) return;

    setState((prev) => ({ ...prev, status: 'loading' }));

    // Try to connect HeyGen avatar
    const avatarConnected = await connectHeyGen();

    setState((prev) => ({
      ...prev,
      status: 'presenting',
      currentSegmentIndex: 0,
      avatarConnected,
      ttsOnly: !avatarConnected,
    }));

    // Start first segment
    const firstSegment = state.segments[0];
    await speakSegment(firstSegment);

    // Schedule auto-advance
    scheduleNextSegment(0);
  }, [state.segments, connectHeyGen, speakSegment]);

  const scheduleNextSegment = useCallback((currentIndex: number) => {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
    }

    const segment = state.segments[currentIndex];
    if (!segment) return;

    segmentTimerRef.current = setTimeout(() => {
      advanceToSegment(currentIndex + 1);
    }, segment.durationEstimateMs + 1500); // +1.5s buffer between segments
  }, [state.segments]);

  const advanceToSegment = useCallback(async (index: number) => {
    if (index >= state.segments.length) {
      // Presentation complete
      setState((prev) => ({ ...prev, status: 'completed', currentSegmentIndex: prev.segments.length - 1 }));
      return;
    }

    setState((prev) => ({ ...prev, status: 'presenting', currentSegmentIndex: index }));

    const segment = state.segments[index];
    await speakSegment(segment);
    scheduleNextSegment(index);
  }, [state.segments, speakSegment, scheduleNextSegment]);

  const handlePause = useCallback(() => {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    // Interrupt HeyGen speech
    if (heygenSessionRef.current && !state.ttsOnly) {
      heygenInterrupt(heygenSessionRef.current.sessionId).catch(() => {});
    }

    // Pause TTS audio
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }

    setState((prev) => ({ ...prev, status: 'paused' }));
  }, [state.ttsOnly]);

  const handleResume = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'presenting' }));

    // Re-speak current segment
    const segment = state.segments[state.currentSegmentIndex];
    if (segment) {
      await speakSegment(segment);
      scheduleNextSegment(state.currentSegmentIndex);
    }
  }, [state.segments, state.currentSegmentIndex, speakSegment, scheduleNextSegment]);

  const handleSkipForward = useCallback(() => {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
    }

    // Interrupt current speech
    if (heygenSessionRef.current && !state.ttsOnly) {
      heygenInterrupt(heygenSessionRef.current.sessionId).catch(() => {});
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    advanceToSegment(state.currentSegmentIndex + 1);
  }, [state.currentSegmentIndex, state.ttsOnly, advanceToSegment]);

  const handleSkipBack = useCallback(() => {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
    }

    // Interrupt current speech
    if (heygenSessionRef.current && !state.ttsOnly) {
      heygenInterrupt(heygenSessionRef.current.sessionId).catch(() => {});
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }

    const prevIndex = Math.max(0, state.currentSegmentIndex - 1);
    advanceToSegment(prevIndex);
  }, [state.currentSegmentIndex, state.ttsOnly, advanceToSegment]);

  const handleClose = useCallback(() => {
    cleanupSession();
    onClose();
  }, [cleanupSession, onClose]);

  const handleRestart = useCallback(() => {
    cleanupSession();
    setState((prev) => ({
      ...prev,
      status: 'idle',
      currentSegmentIndex: 0,
      avatarConnected: false,
      ttsOnly: false,
    }));
  }, [cleanupSession]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const currentSegment = state.segments[state.currentSegmentIndex] || null;
  const progressPercent =
    state.segments.length > 0
      ? Math.round(((state.currentSegmentIndex + (state.status === 'completed' ? 1 : 0)) / state.segments.length) * 100)
      : 0;

  const statusLabel = getPresenterStatusLabel(
    state.status,
    state.currentSegmentIndex,
    state.segments.length
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="report-presenter">
      {/* Gamma Report Iframe (background) */}
      <div className="presenter-report-container">
        <iframe
          src={gammaUrl.replace('/docs/', '/embed/')}
          className="presenter-gamma-frame"
          title="LIFE SCORE Visual Report"
          allowFullScreen
        />
      </div>

      {/* Olivia PIP Overlay */}
      <div className={`presenter-pip ${state.status === 'presenting' ? 'pip-speaking' : ''} ${state.ttsOnly ? 'pip-tts-only' : ''}`}>
        {/* Avatar Video (HeyGen) or Fallback Image */}
        <div className="pip-avatar-container">
          {!state.ttsOnly ? (
            <>
              <video
                ref={videoRef}
                className="pip-avatar-video"
                autoPlay
                playsInline
                muted
              />
              <audio ref={audioRef} autoPlay />
            </>
          ) : (
            <div className="pip-avatar-fallback">
              <img
                src="/images/olivia-avatar.jpg"
                alt="Olivia"
                className="pip-avatar-image"
              />
              {state.status === 'presenting' && (
                <div className="pip-speaking-waves">
                  <span /><span /><span /><span />
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          <div className={`pip-status-badge pip-status-${state.status}`}>
            <span className="pip-status-dot" />
            <span className="pip-status-text">
              {state.avatarConnected ? 'LIVE' : state.ttsOnly ? 'AUDIO' : 'READY'}
            </span>
          </div>
        </div>

        {/* Current Segment Title */}
        {currentSegment && state.status !== 'idle' && (
          <div className="pip-segment-title">
            {currentSegment.title}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="presenter-controls">
        {/* Segment Progress Bar */}
        <div className="presenter-progress">
          <div className="presenter-progress-track">
            {state.segments.map((seg, i) => (
              <div
                key={seg.id}
                className={`presenter-progress-segment ${
                  i < state.currentSegmentIndex
                    ? 'segment-done'
                    : i === state.currentSegmentIndex
                    ? 'segment-active'
                    : 'segment-upcoming'
                }`}
                title={seg.title}
              />
            ))}
          </div>
          <span className="presenter-progress-label">{statusLabel}</span>
        </div>

        {/* Playback Buttons */}
        <div className="presenter-buttons">
          {state.status === 'idle' && (
            <button className="presenter-btn presenter-btn-play" onClick={startPresentation}>
              ▶ Start Presentation
            </button>
          )}

          {state.status === 'loading' && (
            <button className="presenter-btn presenter-btn-loading" disabled>
              <span className="presenter-spinner" /> Connecting...
            </button>
          )}

          {state.status === 'presenting' && (
            <>
              <button className="presenter-btn presenter-btn-skip" onClick={handleSkipBack} title="Previous segment">
                ⏮
              </button>
              <button className="presenter-btn presenter-btn-pause" onClick={handlePause} title="Pause">
                ⏸
              </button>
              <button className="presenter-btn presenter-btn-skip" onClick={handleSkipForward} title="Next segment">
                ⏭
              </button>
            </>
          )}

          {state.status === 'paused' && (
            <>
              <button className="presenter-btn presenter-btn-skip" onClick={handleSkipBack} title="Previous segment">
                ⏮
              </button>
              <button className="presenter-btn presenter-btn-play" onClick={handleResume} title="Resume">
                ▶
              </button>
              <button className="presenter-btn presenter-btn-skip" onClick={handleSkipForward} title="Next segment">
                ⏭
              </button>
            </>
          )}

          {state.status === 'completed' && (
            <button className="presenter-btn presenter-btn-play" onClick={handleRestart}>
              ↻ Replay
            </button>
          )}

          {state.status === 'error' && (
            <button className="presenter-btn presenter-btn-play" onClick={handleRestart}>
              ↻ Retry
            </button>
          )}

          {/* Close button (always visible) */}
          <button
            className="presenter-btn presenter-btn-close"
            onClick={handleClose}
            title="Exit presenter"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {state.error && (
        <div className="presenter-error-banner">
          {state.error}
        </div>
      )}
    </div>
  );
};

export default ReportPresenter;
