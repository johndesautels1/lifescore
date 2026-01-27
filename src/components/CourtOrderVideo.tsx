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

  return (
    <FeatureGate feature="grokVideos" blurContent={true}>
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
      </div>
    </FeatureGate>
  );
};

export default CourtOrderVideo;
