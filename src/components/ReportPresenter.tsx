/**
 * LIFE SCORE™ Report Presenter
 * Two modes for Olivia to present the Gamma report:
 *
 * 1. LIVE PRESENTER (existing) - Real-time streaming avatar overlay (HeyGen WebRTC / TTS)
 * 2. VIDEO REPORT  (new)       - Pre-rendered HeyGen video, polished & downloadable
 *
 * Architecture:
 *   - PIP overlay sits in bottom-right of the embedded report (live mode)
 *   - Video player replaces the iframe (video mode)
 *   - Playback controls: Play/Pause, Skip, Close (live); standard video controls (video)
 *
 * Integrations:
 *   - HeyGen Streaming API: /api/olivia/avatar/heygen (live presenter)
 *   - HeyGen Video API:     /api/olivia/avatar/heygen-video (pre-rendered video)
 *   - Olivia TTS:           /api/olivia/tts (audio-only fallback)
 *   - presenterService:     Generates narration script from comparison data
 *   - presenterVideoService: Orchestrates video generation + polling
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { AnyComparisonResult } from '../services/gammaService';
import type { PresenterState, PresenterSegment, VideoGenerationState } from '../types/presenter';
import { generatePresentationScript, getPresenterStatusLabel } from '../services/presenterService';
import { generatePresenterVideo } from '../services/presenterVideoService';
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
// SUB-MODE WITHIN PRESENTER
// ============================================================================

type PresenterSubMode = 'live' | 'video';

// ============================================================================
// COMPONENT
// ============================================================================

const ReportPresenter: React.FC<ReportPresenterProps> = ({
  result,
  gammaUrl,
  onClose,
}) => {
  // ---- Sub-mode: live presenter vs pre-rendered video ----
  const [subMode, setSubMode] = useState<PresenterSubMode>('live');

  // ---- Live presenter state ----
  const [state, setState] = useState<PresenterState>({
    status: 'idle',
    currentSegmentIndex: 0,
    segments: [],
    error: undefined,
    avatarConnected: false,
    ttsOnly: false,
  });

  // ---- Video generation state ----
  const [videoState, setVideoState] = useState<VideoGenerationState>({
    status: 'idle',
    progress: 0,
  });

  // ---- HeyGen session (live mode) ----
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
  // SESSION MANAGEMENT (Live Mode)
  // ============================================================================

  const cleanupSession = useCallback(() => {
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    if (heygenSessionRef.current) {
      closeHeyGenSession(heygenSessionRef.current.sessionId).catch(() => {});
      heygenSessionRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
  }, []);

  const connectHeyGen = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[ReportPresenter] Creating HeyGen session...');
      const response = await createHeyGenSession();
      if (!response.sessionId) throw new Error('No session ID returned');

      heygenSessionRef.current = {
        sessionId: response.sessionId,
        token: (response as any).token || '',
      };

      if (response.sdpOffer && response.iceServers) {
        const pc = new RTCPeerConnection({ iceServers: response.iceServers });
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          if (event.track.kind === 'video' && videoRef.current) {
            videoRef.current.srcObject = new MediaStream([event.track]);
          }
          if (event.track.kind === 'audio' && audioRef.current) {
            audioRef.current.srcObject = new MediaStream([event.track]);
          }
        };

        await pc.setRemoteDescription(response.sdpOffer);
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
  // SPEAKING (Live Mode)
  // ============================================================================

  const speakSegment = useCallback(async (segment: PresenterSegment) => {
    if (heygenSessionRef.current && !state.ttsOnly) {
      try {
        await heygenSpeak(heygenSessionRef.current.sessionId, segment.narration);
      } catch (err) {
        console.warn('[ReportPresenter] HeyGen speak failed, falling back to TTS:', err);
        await speakTTSFallback(segment.narration);
      }
    } else {
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
  // LIVE PLAYBACK CONTROLS
  // ============================================================================

  const startPresentation = useCallback(async () => {
    if (state.segments.length === 0) return;
    setState((prev) => ({ ...prev, status: 'loading' }));

    const avatarConnected = await connectHeyGen();

    setState((prev) => ({
      ...prev,
      status: 'presenting',
      currentSegmentIndex: 0,
      avatarConnected,
      ttsOnly: !avatarConnected,
    }));

    const firstSegment = state.segments[0];
    await speakSegment(firstSegment);
    scheduleNextSegment(0);
  }, [state.segments, connectHeyGen, speakSegment]);

  const scheduleNextSegment = useCallback((currentIndex: number) => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    const segment = state.segments[currentIndex];
    if (!segment) return;

    segmentTimerRef.current = setTimeout(() => {
      advanceToSegment(currentIndex + 1);
    }, segment.durationEstimateMs + 1500);
  }, [state.segments]);

  const advanceToSegment = useCallback(async (index: number) => {
    if (index >= state.segments.length) {
      setState((prev) => ({ ...prev, status: 'completed', currentSegmentIndex: prev.segments.length - 1 }));
      return;
    }
    setState((prev) => ({ ...prev, status: 'presenting', currentSegmentIndex: index }));
    const segment = state.segments[index];
    await speakSegment(segment);
    scheduleNextSegment(index);
  }, [state.segments, speakSegment, scheduleNextSegment]);

  const handlePause = useCallback(() => {
    if (segmentTimerRef.current) { clearTimeout(segmentTimerRef.current); segmentTimerRef.current = null; }
    if (heygenSessionRef.current && !state.ttsOnly) heygenInterrupt(heygenSessionRef.current.sessionId).catch(() => {});
    if (ttsAudioRef.current) ttsAudioRef.current.pause();
    setState((prev) => ({ ...prev, status: 'paused' }));
  }, [state.ttsOnly]);

  const handleResume = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'presenting' }));
    const segment = state.segments[state.currentSegmentIndex];
    if (segment) { await speakSegment(segment); scheduleNextSegment(state.currentSegmentIndex); }
  }, [state.segments, state.currentSegmentIndex, speakSegment, scheduleNextSegment]);

  const handleSkipForward = useCallback(() => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    if (heygenSessionRef.current && !state.ttsOnly) heygenInterrupt(heygenSessionRef.current.sessionId).catch(() => {});
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    advanceToSegment(state.currentSegmentIndex + 1);
  }, [state.currentSegmentIndex, state.ttsOnly, advanceToSegment]);

  const handleSkipBack = useCallback(() => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    if (heygenSessionRef.current && !state.ttsOnly) heygenInterrupt(heygenSessionRef.current.sessionId).catch(() => {});
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    advanceToSegment(Math.max(0, state.currentSegmentIndex - 1));
  }, [state.currentSegmentIndex, state.ttsOnly, advanceToSegment]);

  const handleClose = useCallback(() => { cleanupSession(); onClose(); }, [cleanupSession, onClose]);

  const handleRestart = useCallback(() => {
    cleanupSession();
    setState((prev) => ({ ...prev, status: 'idle', currentSegmentIndex: 0, avatarConnected: false, ttsOnly: false }));
  }, [cleanupSession]);

  // ============================================================================
  // VIDEO GENERATION
  // ============================================================================

  const handleGenerateVideo = useCallback(async () => {
    setVideoState({ status: 'generating', progress: 0 });

    const finalState = await generatePresenterVideo(result, (progress) => {
      setVideoState(progress);
    });

    setVideoState(finalState);
  }, [result]);

  const handleVideoReset = useCallback(() => {
    setVideoState({ status: 'idle', progress: 0 });
  }, []);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const currentSegment = state.segments[state.currentSegmentIndex] || null;
  const statusLabel = getPresenterStatusLabel(
    state.status,
    state.currentSegmentIndex,
    state.segments.length
  );

  const isVideoGenerating = videoState.status === 'generating' || videoState.status === 'processing';
  const isVideoReady = videoState.status === 'completed' && !!videoState.videoUrl;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="report-presenter">
      {/* Sub-mode tabs: Live Presenter vs Generate Video */}
      <div className="presenter-mode-tabs">
        <button
          className={`presenter-mode-tab ${subMode === 'live' ? 'active' : ''}`}
          onClick={() => setSubMode('live')}
          disabled={isVideoGenerating}
        >
          Live Presenter
        </button>
        <button
          className={`presenter-mode-tab ${subMode === 'video' ? 'active' : ''}`}
          onClick={() => setSubMode('video')}
          disabled={state.status === 'presenting' || state.status === 'loading'}
        >
          Generate Video
        </button>
      </div>

      {/* ================================================================
          LIVE PRESENTER MODE
          ================================================================ */}
      {subMode === 'live' && (
        <>
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
            <div className="pip-avatar-container">
              {!state.ttsOnly ? (
                <>
                  <video ref={videoRef} className="pip-avatar-video" autoPlay playsInline muted />
                  <audio ref={audioRef} autoPlay />
                </>
              ) : (
                <div className="pip-avatar-fallback">
                  <img src="/images/olivia-avatar.jpg" alt="Olivia" className="pip-avatar-image" />
                  {state.status === 'presenting' && (
                    <div className="pip-speaking-waves">
                      <span /><span /><span /><span />
                    </div>
                  )}
                </div>
              )}
              <div className={`pip-status-badge pip-status-${state.status}`}>
                <span className="pip-status-dot" />
                <span className="pip-status-text">
                  {state.avatarConnected ? 'LIVE' : state.ttsOnly ? 'AUDIO' : 'READY'}
                </span>
              </div>
            </div>
            {currentSegment && state.status !== 'idle' && (
              <div className="pip-segment-title">{currentSegment.title}</div>
            )}
          </div>

          {/* Live Control Bar */}
          <div className="presenter-controls">
            <div className="presenter-progress">
              <div className="presenter-progress-track">
                {state.segments.map((seg, i) => (
                  <div
                    key={seg.id}
                    className={`presenter-progress-segment ${
                      i < state.currentSegmentIndex ? 'segment-done'
                        : i === state.currentSegmentIndex ? 'segment-active'
                        : 'segment-upcoming'
                    }`}
                    title={seg.title}
                  />
                ))}
              </div>
              <span className="presenter-progress-label">{statusLabel}</span>
            </div>
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
                  <button className="presenter-btn presenter-btn-skip" onClick={handleSkipBack} title="Previous segment">⏮</button>
                  <button className="presenter-btn presenter-btn-pause" onClick={handlePause} title="Pause">⏸</button>
                  <button className="presenter-btn presenter-btn-skip" onClick={handleSkipForward} title="Next segment">⏭</button>
                </>
              )}
              {state.status === 'paused' && (
                <>
                  <button className="presenter-btn presenter-btn-skip" onClick={handleSkipBack} title="Previous segment">⏮</button>
                  <button className="presenter-btn presenter-btn-play" onClick={handleResume} title="Resume">▶</button>
                  <button className="presenter-btn presenter-btn-skip" onClick={handleSkipForward} title="Next segment">⏭</button>
                </>
              )}
              {state.status === 'completed' && (
                <button className="presenter-btn presenter-btn-play" onClick={handleRestart}>↻ Replay</button>
              )}
              {state.status === 'error' && (
                <button className="presenter-btn presenter-btn-play" onClick={handleRestart}>↻ Retry</button>
              )}
              <button className="presenter-btn presenter-btn-close" onClick={handleClose} title="Exit presenter">✕</button>
            </div>
          </div>

          {state.error && <div className="presenter-error-banner">{state.error}</div>}
        </>
      )}

      {/* ================================================================
          VIDEO GENERATION MODE
          ================================================================ */}
      {subMode === 'video' && (
        <div className="presenter-video-mode">
          {/* Video Ready - Show Player */}
          {isVideoReady && (
            <div className="presenter-video-player-container">
              <video
                src={videoState.videoUrl}
                className="presenter-video-player"
                controls
                autoPlay
                poster={videoState.thumbnailUrl}
              />
              <div className="presenter-video-actions">
                <a
                  href={videoState.videoUrl}
                  download={`LIFE-SCORE-${result.city1.city}-vs-${result.city2.city}.mp4`}
                  className="presenter-btn presenter-btn-download"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download MP4
                </a>
                <button className="presenter-btn presenter-btn-play" onClick={handleVideoReset}>
                  Generate New
                </button>
                <button className="presenter-btn presenter-btn-close" onClick={handleClose} title="Exit presenter">
                  ✕
                </button>
              </div>
              {videoState.durationSeconds && (
                <span className="presenter-video-duration">
                  Duration: {Math.floor(videoState.durationSeconds / 60)}:{String(Math.round(videoState.durationSeconds % 60)).padStart(2, '0')}
                </span>
              )}
            </div>
          )}

          {/* Generating / Processing - Show Progress */}
          {isVideoGenerating && (
            <div className="presenter-video-generating">
              <div className="presenter-video-generating-inner">
                <img
                  src="/images/olivia-avatar.jpg"
                  alt="Olivia"
                  className="presenter-video-avatar-preview"
                />
                <div className="presenter-video-progress-section">
                  <h3 className="presenter-video-title">Generating Presenter Video</h3>
                  <p className="presenter-video-subtitle">
                    Olivia is being rendered presenting your {result.city1.city} vs {result.city2.city} report.
                    This typically takes 2-5 minutes.
                  </p>
                  <div className="presenter-video-progress-bar">
                    <div
                      className="presenter-video-progress-fill"
                      style={{ width: `${videoState.progress}%` }}
                    />
                  </div>
                  <span className="presenter-video-progress-text">{videoState.progress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Failed */}
          {videoState.status === 'failed' && (
            <div className="presenter-video-error">
              <div className="presenter-video-error-inner">
                <span className="presenter-video-error-icon">!</span>
                <p>{videoState.error || 'Video generation failed'}</p>
                <div className="presenter-video-error-actions">
                  <button className="presenter-btn presenter-btn-play" onClick={handleGenerateVideo}>
                    ↻ Retry
                  </button>
                  <button className="presenter-btn presenter-btn-close" onClick={handleClose}>
                    ✕ Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Idle - Show Generate Button */}
          {videoState.status === 'idle' && (
            <div className="presenter-video-idle">
              <div className="presenter-video-idle-inner">
                <img
                  src="/images/olivia-avatar.jpg"
                  alt="Olivia"
                  className="presenter-video-avatar-preview"
                />
                <div className="presenter-video-idle-content">
                  <h3 className="presenter-video-title">Generate Video Report</h3>
                  <p className="presenter-video-subtitle">
                    Create a polished, downloadable video of Olivia presenting your
                    {' '}{result.city1.city} vs {result.city2.city} LIFE SCORE findings.
                    The video is rendered by HeyGen with Olivia's avatar synced to the narration.
                  </p>
                  <ul className="presenter-video-features">
                    <li>HD 1080p video with Olivia avatar</li>
                    <li>Full narration of all {state.segments.length} report sections</li>
                    <li>Downloadable MP4 - share or present anywhere</li>
                    <li>~2-5 minute rendering time</li>
                  </ul>
                  <div className="presenter-video-idle-actions">
                    <button className="presenter-btn presenter-btn-play" onClick={handleGenerateVideo}>
                      Generate Video
                    </button>
                    <button className="presenter-btn presenter-btn-close" onClick={handleClose}>
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportPresenter;
