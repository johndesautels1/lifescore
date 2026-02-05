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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGrokVideo } from '../hooks/useGrokVideo';
import FeatureGate from './FeatureGate';
import { useTierAccess } from '../hooks/useTierAccess';
import FreedomCategoryTabs from './FreedomCategoryTabs';
import FreedomMetricsList from './FreedomMetricsList';
import FreedomHeroFooter from './FreedomHeroFooter';
import type { CategoryId, FreedomEducationData, CategoryFreedomData } from '../types/freedomEducation';
import { getFirstNonEmptyCategory, getCategoryData, isValidFreedomData } from '../utils/freedomEducationUtils';
import './CourtOrderVideo.css';

// ============================================================================
// TYPES
// ============================================================================

interface CourtOrderVideoProps {
  comparisonId: string;
  winnerCity: string;
  loserCity?: string;
  winnerScore: number;
  freedomEducation?: FreedomEducationData;
}

// ============================================================================
// COMPONENT
// ============================================================================

const CourtOrderVideo: React.FC<CourtOrderVideoProps> = ({
  comparisonId,
  winnerCity,
  loserCity: _loserCity, // Reserved for future use
  winnerScore,
  freedomEducation,
}) => {
  const { user } = useAuth();
  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
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

  // FIX #48: Error count tracking for expired URL detection
  const [videoErrorCount, setVideoErrorCount] = useState(0);
  const MAX_VIDEO_ERRORS = 3;

  // Freedom Education tab state
  const [activeCategory, setActiveCategory] = useState<CategoryId>('personal_freedom');

  // Initialize active category to first non-empty category when freedomEducation changes
  useEffect(() => {
    if (freedomEducation?.categories) {
      const firstCategory = getFirstNonEmptyCategory(freedomEducation.categories);
      if (firstCategory) {
        setActiveCategory(firstCategory);
      }
    }
  }, [freedomEducation]);

  // Get current category data
  const currentCategoryData: CategoryFreedomData | null = freedomEducation?.categories
    ? getCategoryData(freedomEducation.categories, activeCategory)
    : null;

  // Check if freedom education data is valid
  const hasFreedomData = isValidFreedomData(freedomEducation);

  // Handle video generation
  const handleGenerateVideo = async () => {
    if (!user?.id) {
      console.warn('[CourtOrderVideo] No user ID available');
      return;
    }

    // ADMIN BYPASS: Skip usage checks for admin users
    if (!isAdmin) {
      // Check usage limits before generating Grok video
      const usageResult = await checkUsage('grokVideos');
      if (!usageResult.allowed) {
        console.log('[CourtOrderVideo] Grok video limit reached:', usageResult);
        return;
      }

      // Increment usage counter before starting generation
      await incrementUsage('grokVideos');
      console.log('[CourtOrderVideo] Incremented grokVideos usage');
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

  // FIX #48: Handle video load errors - track count and reset when threshold reached
  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('[CourtOrderVideo] Video load error:', e);
    setVideoErrorCount(prev => {
      const newCount = prev + 1;
      console.warn(`[CourtOrderVideo] Video error count: ${newCount}/${MAX_VIDEO_ERRORS}`);
      return newCount;
    });
  }, []);

  // FIX #48: Auto-reset when video errors exceed threshold (expired URLs)
  useEffect(() => {
    if (videoErrorCount >= MAX_VIDEO_ERRORS) {
      console.log('[CourtOrderVideo] Video error threshold reached - resetting to allow regeneration');
      reset();
      setHasStarted(false);
      setIsPlaying(false);
      setVideoErrorCount(0);
    }
  }, [videoErrorCount, reset]);

  // Reset when comparisonId changes
  useEffect(() => {
    reset();
    setHasStarted(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVideoErrorCount(0);
  }, [comparisonId]);

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS - Save, Download, Share/Forward for Court Order
  // ══════════════════════════════════════════════════════════════════════════

  // Save Court Order to localStorage (video already persisted in grok_videos Supabase table by API)
  const handleSaveCourtOrder = () => {
    if (!video?.videoUrl) return;

    try {
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
    } catch (error) {
      console.error('[CourtOrderVideo] Failed to save Court Order:', error);
      alert('Failed to save Court Order. Please try again.');
    }
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

        {/* ════════════════════════════════════════════════════════════════
            FREEDOM EDUCATION SECTION - 6-Tab Category Display
        ════════════════════════════════════════════════════════════════ */}
        {hasFreedomData && freedomEducation && (
          <div className="freedom-education-section">
            {/* Category Tabs */}
            <FreedomCategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              categories={freedomEducation.categories}
            />

            {/* Winning Metrics List */}
            {currentCategoryData && (
              <>
                <FreedomMetricsList
                  metrics={currentCategoryData.winningMetrics}
                  winnerCity={winnerCity}
                />

                {/* Hero Statement Footer */}
                {currentCategoryData.heroStatement && (
                  <FreedomHeroFooter
                    heroStatement={currentCategoryData.heroStatement}
                    winnerCity={winnerCity}
                    categoryName={currentCategoryData.categoryName}
                  />
                )}
              </>
            )}
          </div>
        )}

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
                  onError={handleVideoError}
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
