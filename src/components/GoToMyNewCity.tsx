/**
 * LIFE SCORE - Go To My New City Component
 *
 * The final celebration: Cristiano's cinematic 105-120 second Freedom Tour
 * of the winning city. Uses the same LCD display style as CourtOrderVideo.
 *
 * 2-stage pipeline:
 *   Stage 1: LLM builds a 7-scene storyboard from the Winner Package
 *   Stage 2: HeyGen Video Agent renders the cinematic video with B-roll
 *
 * Sovereign plan only, 1 video/month per user.
 * Videos cached by winning city in Supabase for reuse across users.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTierAccess } from '../hooks/useTierAccess';
import { useCristianoVideo } from '../hooks/useCristianoVideo';
import FeatureGate from './FeatureGate';
import { toastSuccess, toastError, toastInfo } from '../utils/toast';
import { buildWinnerPackage } from '../services/cristianoVideoService';
import { NotifyMeModal } from './NotifyMeModal';
import { useJobTracker } from '../hooks/useJobTracker';
import { supabase } from '../lib/supabase';
import type { NotifyChannel } from '../types/database';
import VideoPhoneWarning from './VideoPhoneWarning';
import './GoToMyNewCity.css';

// ============================================================================
// TYPES
// ============================================================================

interface GoToMyNewCityProps {
  winnerCity: string;
  winnerCountry: string;
  winnerRegion?: string;
  winnerScore: number;
  /** comparisonResult.cityX.categories — for category score extraction */
  winnerCategories?: Array<{
    categoryId: string;
    averageScore: number | null;
  }>;
  /** judgeReport.executiveSummary */
  executiveSummary?: {
    rationale?: string;
    keyFactors?: string[];
    futureOutlook?: string;
  };
  /** comparisonResult.categoryWinners */
  categoryWinners?: Record<string, string>;
  comparisonId: string;
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

function getStatusMessage(status: string, progress: number): string {
  switch (status) {
    case 'building_storyboard':
      return 'Building your cinematic storyboard...';
    case 'storyboard_ready':
      return 'Storyboard ready. Submitting to HeyGen...';
    case 'rendering':
      return progress > 25
        ? `Cristiano is filming your Freedom Tour... ${progress}%`
        : 'Submitting to HeyGen Video Agent...';
    case 'processing':
      return `Rendering cinematic video... ${progress}%`;
    default:
      return 'Preparing your city tour...';
  }
}

function getSubstatusMessage(status: string): string {
  switch (status) {
    case 'building_storyboard':
      return '7-scene cinematic storyboard via AI';
    case 'rendering':
      return '105-120s Freedom Tour with B-roll';
    case 'processing':
      return 'HeyGen Video Agent assembling your video';
    default:
      return '';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

const GoToMyNewCity: React.FC<GoToMyNewCityProps> = ({
  winnerCity,
  winnerCountry,
  winnerRegion,
  winnerScore,
  winnerCategories,
  executiveSummary,
  categoryWinners,
  comparisonId,
}) => {
  const { user } = useAuth();
  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
  const {
    status,
    isGenerating,
    isReady,
    isFailed,
    videoUrl,
    thumbnailUrl,
    progress,
    error,
    cached,
    generate,
    reset,
  } = useCristianoVideo();

  // Video ref for playback control
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Error tracking for expired URLs
  const [videoErrorCount, setVideoErrorCount] = useState(0);
  const MAX_VIDEO_ERRORS = 3;

  // Notification system
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const { createJob, completeJobAndNotify } = useJobTracker();
  const pendingJobRef = useRef<string | null>(null);

  // FIX 2026-02-14: Auto-restore cached Cristiano city video on mount
  // When JudgeTab remounts after a tab switch, useCristianoVideo starts idle.
  // Query cristiano_city_videos for a completed video so we don't lose it.
  const [cachedVideoUrl, setCachedVideoUrl] = useState<string | null>(null);
  const [cachedThumbnailUrl, setCachedThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkCachedVideo() {
      try {
        const { data } = await supabase
          .from('cristiano_city_videos')
          .select('video_url, thumbnail_url')
          .ilike('city_name', winnerCity.trim())
          .eq('status', 'completed')
          .not('video_url', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && data?.video_url) {
          setCachedVideoUrl(data.video_url);
          setCachedThumbnailUrl(data.thumbnail_url || null);
          console.log('[GoToMyNewCity] Restored cached video:', data.video_url.substring(0, 60) + '...');
        }
      } catch (err) {
        console.warn('[GoToMyNewCity] Cache check failed:', err);
      }
    }

    checkCachedVideo();
    return () => { cancelled = true; };
  }, [winnerCity]);

  // Fire pending notification when video generation completes
  useEffect(() => {
    if (isReady && videoUrl && pendingJobRef.current) {
      const jobId = pendingJobRef.current;
      pendingJobRef.current = null;
      completeJobAndNotify(
        jobId,
        { winnerCity, videoUrl },
        `Freedom Tour Ready: ${winnerCity.split(',')[0].trim()}`,
        `Your cinematic Freedom Tour of ${winnerCity.split(',')[0].trim()} is ready to watch.`,
        '/?tab=judge'
      );
    }
  }, [isReady, videoUrl, winnerCity, completeJobAndNotify]);

  // Effective video URL: hook result > cached from DB
  const effectiveVideoUrl = videoUrl || cachedVideoUrl;
  const effectiveThumbnailUrl = thumbnailUrl || cachedThumbnailUrl;
  const hasVideo = (isReady && videoUrl) || !!cachedVideoUrl;

  // Handle video generation — show notify modal first
  const handleGenerate = () => {
    if (!user?.id) {
      toastError('Please log in to generate videos.');
      return;
    }
    setShowNotifyModal(true);
  };

  // Actually generate the video (after user chooses wait/notify)
  const doGenerate = async () => {
    if (!user?.id) return;

    // ADMIN BYPASS: Skip usage checks for admin users
    if (!isAdmin) {
      const usageResult = await checkUsage('cristianoVideos' as any);
      if (!usageResult.allowed) {
        toastError('Monthly Cristiano video limit reached. You get 1 per month on the Sovereign plan.');
        return;
      }

      await incrementUsage('cristianoVideos' as any);
      console.log('[GoToMyNewCity] Incremented cristianoVideos usage');
    }

    setHasStarted(true);

    const winnerPackage = buildWinnerPackage({
      winnerCity,
      winnerCountry,
      winnerRegion,
      winnerScore,
      winnerCategories,
      executiveSummary,
      categoryWinners,
    });

    await generate(winnerPackage);
  };

  const handleTourWaitHere = () => {
    doGenerate();
  };

  const handleTourNotifyMe = async (channels: NotifyChannel[]) => {
    const jobId = await createJob({
      type: 'freedom_tour',
      payload: { comparisonId, winnerCity },
      notifyVia: channels,
    });
    if (jobId) {
      pendingJobRef.current = jobId;
      toastInfo(`We'll notify you when your Freedom Tour is ready.`);
    }
    doGenerate();
  };

  // Playback controls
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('[GoToMyNewCity] Play error:', err);
          toastError('Video failed to play. It may still be loading.');
        });
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle video load errors
  const handleVideoError = useCallback(() => {
    setVideoErrorCount(prev => {
      const newCount = prev + 1;
      console.warn(`[GoToMyNewCity] Video error count: ${newCount}/${MAX_VIDEO_ERRORS}`);
      return newCount;
    });
  }, []);

  // Auto-reset on repeated errors (expired URLs)
  useEffect(() => {
    if (videoErrorCount >= MAX_VIDEO_ERRORS) {
      console.log('[GoToMyNewCity] Video error threshold reached - resetting');
      reset();
      setHasStarted(false);
      setIsPlaying(false);
      setVideoErrorCount(0);
    }
  }, [videoErrorCount, reset]);

  // Reset when comparison changes
  useEffect(() => {
    reset();
    setHasStarted(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVideoErrorCount(0);
  }, [comparisonId, reset]);

  // Download video
  const handleDownload = async () => {
    if (!effectiveVideoUrl) return;
    const filename = `go-to-${winnerCity.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-freedom-tour.mp4`;
    try {
      const response = await fetch(effectiveVideoUrl);
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
      console.error('[GoToMyNewCity] Download error:', err);
      toastError('Failed to download video.');
    }
  };

  // Share video
  const handleShare = async () => {
    if (!effectiveVideoUrl) return;
    const shareData = {
      title: `LIFE SCORE - Go To ${winnerCity}`,
      text: `Cristiano's Freedom Tour: ${winnerCity} scored ${winnerScore.toFixed(1)} on the LIFE SCORE Freedom Index!`,
      url: effectiveVideoUrl,
    };
    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(effectiveVideoUrl);
        toastSuccess('Video URL copied to clipboard!');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(effectiveVideoUrl);
        toastSuccess('Video URL copied to clipboard!');
      } catch {
        toastError('Unable to share video');
      }
    }
  };

  return (
    <>
    <FeatureGate feature="cristianoVideos" blurContent={true}>
      <div className="new-city-wrapper">
        <div className="new-city-container">
          {/* Header */}
          <div className="new-city-header">
            <h4 className="new-city-title">
              <span className="new-city-icon">{'\uD83C\uDF0D'}</span>
              GO TO MY NEW CITY
            </h4>
            <p className="new-city-subtitle">
              Cristiano presents: {winnerCity}
            </p>
            {cached && (
              <span className="cache-badge">INSTANT REPLAY</span>
            )}
          </div>

          {/* Stage Indicator */}
          {isGenerating && (
            <div className="stage-indicator">
              <span className={`stage-dot ${status === 'building_storyboard' ? 'active' : hasStarted ? 'complete' : ''}`} />
              <span className="stage-label">Storyboard</span>
              <span className={`stage-dot ${status === 'rendering' || status === 'processing' ? 'active' : status === 'completed' ? 'complete' : ''}`} />
              <span className="stage-label">Render</span>
              <span className={`stage-dot ${status === 'completed' ? 'complete' : ''}`} />
              <span className="stage-label">Done</span>
            </div>
          )}

          {/* Phone call audio warning (mobile only) */}
          <VideoPhoneWarning />

          {/* LCD Screen */}
          <div className="lcd-screen">
            <div className="lcd-bezel">
              <div className="lcd-display">
                {/* Clues Logo Overlay - always visible in corner */}
                <img
                  src="/logo-transparent.png"
                  alt="CLUES"
                  className="video-logo-overlay"
                />
                {hasVideo ? (
                  <>
                    {/* Intro poster image - shows before video plays */}
                    {!isPlaying && currentTime === 0 && (
                      <div className="video-poster-overlay" onClick={handlePlayPause}>
                        <img
                          src="/logo-transparent.png"
                          alt="CLUES"
                          className="poster-logo"
                        />
                        <div className="poster-title">CLUES FREEDOM TOUR</div>
                        <div className="poster-city">{winnerCity}</div>
                        <div className="poster-cta">TAP TO PLAY</div>
                      </div>
                    )}
                    <video
                      ref={videoRef}
                      src={effectiveVideoUrl!}
                      poster={effectiveThumbnailUrl || undefined}
                      className="court-video"
                      onEnded={handleVideoEnded}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onError={handleVideoError}
                      playsInline
                      crossOrigin="anonymous"
                    />
                  </>
                ) : (
                  <div className="lcd-placeholder">
                    {isGenerating ? (
                      <div className="generating-state">
                        <div className="lcd-spinner"></div>
                        <div className="lcd-status">
                          {getStatusMessage(status, progress)}
                        </div>
                        <div className="lcd-substatus">
                          {getSubstatusMessage(status)}
                        </div>
                      </div>
                    ) : hasStarted && !isFailed ? (
                      <div className="generating-state">
                        <div className="lcd-spinner"></div>
                        <div className="lcd-status">Initializing...</div>
                      </div>
                    ) : (
                      <div className="idle-state">
                        <div className="city-preview">
                          <span className="preview-icon">{'\uD83C\uDF0D'}</span>
                          <span className="preview-city">{winnerCity}</span>
                          <span className="preview-score">Freedom Score: {winnerScore.toFixed(1)}</span>
                        </div>
                        <div className="preview-text">
                          Cristiano's cinematic Freedom Tour
                        </div>
                        <div className="preview-badge">
                          <span className="badge-icon">{'\u2696\uFE0F'}</span>
                          <span className="badge-text">7-SCENE CINEMATIC VIDEO</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Video Controls */}
              {hasVideo && (
                <div className="lcd-controls">
                  <button
                    className="control-btn play-btn"
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? '\u23F8' : '\u25B6'}
                  </button>

                  <div className="progress-container">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="progress-slider"
                    />
                    <div className="time-display">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>

                  <div className="volume-container">
                    <span className="volume-icon">{volume > 0 ? '\uD83D\uDD0A' : '\uD83D\uDD07'}</span>
                    <input
                      type="range"
                      className="volume-slider"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* LCD Reflection */}
            <div className="lcd-reflection"></div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="court-error">
              <span className="error-icon">!</span>
              <span className="error-text">{typeof error === 'string' ? error : (error as any)?.message || 'Video generation failed'}</span>
              <button className="retry-btn" onClick={() => { reset(); setHasStarted(false); }}>
                Retry
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="court-actions">
            {!hasStarted && !isReady && !hasVideo && (
              <button
                className="new-city-generate-btn"
                onClick={handleGenerate}
                disabled={isGenerating || !user?.id}
              >
                <span className="btn-icon">{'\uD83C\uDF0D'}</span>
                <span className="btn-text">GO TO MY NEW CITY</span>
              </button>
            )}

            {hasVideo && !isPlaying && (
              <button
                className="watch-future-btn"
                onClick={handlePlayPause}
              >
                <span className="btn-icon">{'\u25B6'}</span>
                <span className="btn-text">WATCH FREEDOM TOUR</span>
              </button>
            )}
          </div>

          {/* Action Buttons - Download, Share */}
          {hasVideo && (
            <div className="court-order-action-buttons">
              <button
                className="court-action-btn download-btn"
                onClick={handleDownload}
              >
                <span className="btn-icon">{'\u2B07\uFE0F'}</span>
                <span className="btn-text">DOWNLOAD</span>
              </button>
              <button
                className="court-action-btn share-btn"
                onClick={handleShare}
              >
                <span className="btn-icon">{'\uD83D\uDCE4'}</span>
                <span className="btn-text">SHARE</span>
              </button>
            </div>
          )}

          {/* Cristiano Badge */}
          <div className="cristiano-footer">
            <div className="cristiano-badge">
              <span className="badge-icon">{'\u2696\uFE0F'}</span>
              <span className="badge-name">CRISTIANO</span>
              <span className="badge-role">THE JUDGE</span>
            </div>
            <div className="sovereign-badge">
              <span className="sovereign-icon">{'\uD83D\uDC51'}</span>
              <span className="sovereign-text">SOVEREIGN EXCLUSIVE</span>
            </div>
          </div>
        </div>
      </div>
    </FeatureGate>

    {/* Notify Me Modal */}
    <NotifyMeModal
      isOpen={showNotifyModal}
      onClose={() => setShowNotifyModal(false)}
      onWaitHere={handleTourWaitHere}
      onNotifyMe={handleTourNotifyMe}
      taskLabel="Freedom Tour Video"
      estimatedSeconds={120}
    />
    </>
  );
};

export default GoToMyNewCity;
