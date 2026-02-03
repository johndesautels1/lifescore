/**
 * LIFE SCORE - Court Order Video Component
 *
 * "Court Order" perfect life video for the Judge Tab.
 * Shows a cinematic video of the winning city's ideal lifestyle.
 * Displayed in an LCD screen below the verdict.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGrokVideo } from '../hooks/useGrokVideo';
import FeatureGate from './FeatureGate';
import { useTierAccess } from '../hooks/useTierAccess';
import './CourtOrderVideo.css';

// ============================================================================
// TYPES
// ============================================================================

interface CourtOrderVideoProps {
  comparisonId: string;
  winnerCity: string;
  winnerScore: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CourtOrderVideo: React.FC<CourtOrderVideoProps> = ({
  comparisonId,
  winnerCity,
  winnerScore,
}) => {
  const { user } = useAuth();
  const { checkUsage, incrementUsage } = useTierAccess();
  const {
    video,
    isGenerating,
    isReady,
    progress,
    generateCourtOrderVideo,
    error,
    reset,
  } = useGrokVideo();

  // Video ref for playback control
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Handle video generation
  const handleGenerateVideo = async () => {
    if (!user?.id) {
      console.warn('[CourtOrderVideo] No user ID available');
      return;
    }

    // Check usage limits before generating Grok video
    const usageResult = await checkUsage('grokVideos');
    if (!usageResult.allowed) {
      console.log('[CourtOrderVideo] Grok video limit reached:', usageResult);
      return;
    }

    // Increment usage counter before starting generation
    await incrementUsage('grokVideos');
    console.log('[CourtOrderVideo] Incremented grokVideos usage');

    setHasStarted(true);

    await generateCourtOrderVideo({
      userId: user.id,
      comparisonId,
      winnerCity,
    });
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('[CourtOrderVideo] Play error:', err);
        });
      }
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle loaded metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset when comparisonId changes
  useEffect(() => {
    reset();
    setHasStarted(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [comparisonId]);

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS - Save, Download, Share/Forward for Court Order
  // ══════════════════════════════════════════════════════════════════════════

  // Save Court Order to localStorage
  const handleSaveCourtOrder = () => {
    if (!video?.videoUrl) return;

    const savedCourtOrders = JSON.parse(localStorage.getItem('lifescore_court_orders') || '[]');
    const courtOrderData = {
      comparisonId,
      winnerCity,
      winnerScore,
      videoUrl: video.videoUrl,
      savedAt: new Date().toISOString(),
    };

    // Check if already saved
    const existingIndex = savedCourtOrders.findIndex((co: { comparisonId: string }) => co.comparisonId === comparisonId);
    if (existingIndex >= 0) {
      savedCourtOrders[existingIndex] = courtOrderData;
    } else {
      savedCourtOrders.push(courtOrderData);
    }

    localStorage.setItem('lifescore_court_orders', JSON.stringify(savedCourtOrders));
    console.log('[CourtOrderVideo] Court Order saved:', comparisonId);
    alert('Court Order saved successfully!');
  };

  // Download Court Order video
  const handleDownloadCourtOrder = async () => {
    if (!video?.videoUrl) return;

    try {
      console.log('[CourtOrderVideo] Downloading video:', video.videoUrl);

      // Fetch the video
      const response = await fetch(video.videoUrl);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `court-order-${winnerCity.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${comparisonId.slice(0, 8)}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('[CourtOrderVideo] Download initiated');
    } catch (err) {
      console.error('[CourtOrderVideo] Download error:', err);
      // Fallback: open in new tab
      window.open(video.videoUrl, '_blank');
    }
  };

  // Share/Forward Court Order
  const handleShareCourtOrder = async () => {
    if (!video?.videoUrl) return;

    const shareData = {
      title: `LIFE SCORE Court Order - ${winnerCity}`,
      text: `Check out my perfect life in ${winnerCity} with a LIFE SCORE of ${winnerScore.toFixed(1)}!`,
      url: video.videoUrl,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('[CourtOrderVideo] Shared successfully');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(video.videoUrl);
        alert('Video URL copied to clipboard!');
        console.log('[CourtOrderVideo] URL copied to clipboard');
      }
    } catch (err) {
      console.error('[CourtOrderVideo] Share error:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(video.videoUrl);
        alert('Video URL copied to clipboard!');
      } catch {
        alert('Unable to share. Video URL: ' + video.videoUrl);
      }
    }
  };

  return (
    <FeatureGate feature="grokVideos" blurContent={true}>
      <div className="court-order-wrapper">
        <div className="court-order-video">
        <div className="court-order-header">
          <h4 className="court-order-title">
            <span className="gavel-icon">⚖️</span>
            COURT ORDER
          </h4>
          <p className="court-order-subtitle">
            Your future in {winnerCity}
          </p>
        </div>

        {/* LCD Screen Container */}
        <div className="lcd-screen">
          <div className="lcd-bezel">
            <div className="lcd-display">
              {isReady && video?.videoUrl ? (
                <video
                  ref={videoRef}
                  src={video.videoUrl}
                  className="court-video"
                  onEnded={handleVideoEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  playsInline
                />
              ) : (
                <div className="lcd-placeholder">
                  {isGenerating ? (
                    <div className="generating-state">
                      <div className="lcd-spinner"></div>
                      <div className="lcd-status">{progress || 'Rendering your future...'}</div>
                    </div>
                  ) : hasStarted ? (
                    <div className="generating-state">
                      <div className="lcd-spinner"></div>
                      <div className="lcd-status">Initializing...</div>
                    </div>
                  ) : (
                    <div className="idle-state">
                      <div className="city-preview">
                        <span className="preview-icon">🏆</span>
                        <span className="preview-city">{winnerCity}</span>
                        <span className="preview-score">{winnerScore.toFixed(1)}</span>
                      </div>
                      <div className="preview-text">
                        Click below to see your perfect life
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video Controls - Only show when video is ready */}
            {isReady && video?.videoUrl && (
              <div className="lcd-controls">
                <button
                  className="control-btn play-btn"
                  onClick={handlePlayPause}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '⏸' : '▶'}
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
              </div>
            )}
          </div>

          {/* LCD Reflection Effect */}
          <div className="lcd-reflection"></div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="court-error">
            <span className="error-icon">!</span>
            <span className="error-text">{error}</span>
            <button className="retry-btn" onClick={() => { reset(); setHasStarted(false); }}>
              Retry
            </button>
          </div>
        )}

        {/* Action Button */}
        <div className="court-actions">
          {!hasStarted && !isReady && (
            <button
              className="see-court-order-btn"
              onClick={handleGenerateVideo}
              disabled={isGenerating || !user?.id}
            >
              <span className="btn-icon">👁️</span>
              <span className="btn-text">SEE COURT ORDER</span>
            </button>
          )}

          {isReady && !isPlaying && (
            <button
              className="watch-future-btn"
              onClick={handlePlayPause}
            >
              <span className="btn-icon">▶</span>
              <span className="btn-text">WATCH YOUR FUTURE</span>
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            COURT ORDER ACTION BUTTONS - Save, Download, Share/Forward
        ════════════════════════════════════════════════════════════════ */}
        {isReady && video?.videoUrl && (
          <div className="court-order-action-buttons">
            <button
              className="court-action-btn save-btn"
              onClick={handleSaveCourtOrder}
            >
              <span className="btn-icon">💾</span>
              <span className="btn-text">SAVE</span>
            </button>
            <button
              className="court-action-btn download-btn"
              onClick={handleDownloadCourtOrder}
            >
              <span className="btn-icon">⬇️</span>
              <span className="btn-text">DOWNLOAD</span>
            </button>
            <button
              className="court-action-btn share-btn"
              onClick={handleShareCourtOrder}
            >
              <span className="btn-icon">📤</span>
              <span className="btn-text">SHARE</span>
            </button>
          </div>
        )}
        </div>
      </div>
    </FeatureGate>
  );
};

export default CourtOrderVideo;
