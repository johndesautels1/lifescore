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
import { saveCourtOrder } from '../services/savedComparisons';
import { toastSuccess, toastError } from '../utils/toast';
import { supabase } from '../lib/supabase';
import { uploadUserVideo, validateVideoFile } from '../services/videoStorageService';
import FreedomCategoryTabs from './FreedomCategoryTabs';
import FreedomMetricsList from './FreedomMetricsList';
import FreedomHeroFooter from './FreedomHeroFooter';
import type { CategoryId, FreedomEducationData, CategoryFreedomData } from '../types/freedomEducation';
import { getFirstNonEmptyCategory, getCategoryData, isValidFreedomData } from '../utils/freedomEducationUtils';
import './CourtOrderVideo.css';

// ============================================================================
// TYPES
// ============================================================================

interface InVideoOverride {
  id: string;
  video_url: string;
  video_title: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  source: 'manual' | 'api';
}

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
  winnerCity: propWinnerCity,
  loserCity: propLoserCity = 'City B',
  winnerScore,
  freedomEducation,
}) => {
  // CRITICAL: Use freedomEducation's own city labels if available.
  // The props may come from the overall verdict, but freedomEducation metrics
  // are validated against actual per-metric scores on the server side.
  const winnerCity = freedomEducation?.winnerCity || propWinnerCity;
  const loserCity = freedomEducation?.loserCity || propLoserCity;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // User video upload state
  const [userVideoUrl, setUserVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // FIX #48: Error count tracking for expired URL detection
  const [videoErrorCount, setVideoErrorCount] = useState(0);
  const MAX_VIDEO_ERRORS = 3;


  // ══════════════════════════════════════════════════════════════════════════
  // INVIDEO OVERRIDE STATE
  // ══════════════════════════════════════════════════════════════════════════
  const [invideoOverride, setInvideoOverride] = useState<InVideoOverride | null>(null);
  const [isLoadingOverride, setIsLoadingOverride] = useState(true);
  const [showAdminUpload, setShowAdminUpload] = useState(false);
  const [adminVideoUrl, setAdminVideoUrl] = useState('');
  const [adminVideoTitle, setAdminVideoTitle] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Check for InVideo override on mount / when comparison changes
  useEffect(() => {
    let cancelled = false;

    async function checkOverride() {
      setIsLoadingOverride(true);
      try {
        const response = await fetch(
          `/api/video/invideo-override?comparisonId=${encodeURIComponent(comparisonId)}&city=${encodeURIComponent(winnerCity)}`
        );
        if (!cancelled && response.ok) {
          const data = await response.json();
          setInvideoOverride(data.override || null);
        }
      } catch (err) {
        console.warn('[CourtOrderVideo] InVideo override check failed:', err);
      } finally {
        if (!cancelled) setIsLoadingOverride(false);
      }
    }

    checkOverride();
    return () => { cancelled = true; };
  }, [comparisonId, winnerCity]);

  // The effective video URL: User upload > InVideo override > Kling-generated
  // FIX: Skip expired Replicate URLs (they expire after ~24h)
  const generatedVideoUrl = video?.videoUrl && !video.videoUrl.includes('replicate.delivery') ? video.videoUrl : null;
  const effectiveVideoUrl = userVideoUrl || invideoOverride?.video_url || generatedVideoUrl;

  // Admin: Submit InVideo URL override
  const handleSubmitOverride = async () => {
    if (!adminVideoUrl.trim()) return;

    try {
      new URL(adminVideoUrl);
    } catch {
      toastError('Please enter a valid video URL');
      return;
    }

    setIsSubmittingOverride(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toastError('You must be logged in');
        return;
      }

      const response = await fetch('/api/video/invideo-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          comparisonId,
          cityName: winnerCity,
          videoUrl: adminVideoUrl.trim(),
          videoTitle: adminVideoTitle.trim() || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      const result = await response.json();
      setInvideoOverride({
        id: result.override.id,
        video_url: result.override.video_url,
        video_title: result.override.video_title,
        duration_seconds: result.override.duration_seconds,
        thumbnail_url: result.override.thumbnail_url,
        source: result.override.source,
      });
      setShowAdminUpload(false);
      setAdminVideoUrl('');
      setAdminVideoTitle('');
      toastSuccess('InVideo override saved! VIP video will now play.');
    } catch (err) {
      console.error('[CourtOrderVideo] Override submit error:', err);
      toastError(err instanceof Error ? err.message : 'Failed to save override');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  // Admin: Remove InVideo override
  const handleRemoveOverride = async () => {
    if (!invideoOverride) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/video/invideo-override?id=${invideoOverride.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        setInvideoOverride(null);
        toastSuccess('InVideo override removed. Default video will play.');
      }
    } catch (err) {
      console.error('[CourtOrderVideo] Override remove error:', err);
      toastError('Failed to remove override');
    }
  };

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
          toastError('Video failed to play. It may still be loading.');
        });
      }
    } else {
      console.warn('[CourtOrderVideo] Play pressed but video element not ready');
      toastError('Video is not loaded yet. Please wait a moment.');
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

  // Handle user video file upload: instant blob preview + background Supabase upload
  const handleUserVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting the same file triggers onChange again
    e.target.value = '';

    // Validate with the storage service validator (checks type + size)
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      toastError(validation.error || 'Invalid video file');
      return;
    }

    // Revoke previous blob URL to prevent memory leak
    if (userVideoUrl && userVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(userVideoUrl);
    }

    // 1. Instant preview via blob URL
    const blobUrl = URL.createObjectURL(file);
    setUserVideoUrl(blobUrl);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    // 2. Background upload to Supabase (if user is logged in)
    if (user?.id) {
      setIsUploading(true);
      setUploadStatus('Saving to cloud...');
      try {
        const result = await uploadUserVideo(
          user.id,
          comparisonId,
          file,
          (progress) => setUploadStatus(progress.message)
        );

        // Swap blob URL with permanent Supabase URL
        URL.revokeObjectURL(blobUrl);
        setUserVideoUrl(result.publicUrl);
        setUploadStatus(null);
        toastSuccess('Video saved to cloud!');
        console.log('[CourtOrderVideo] Video uploaded to Supabase:', result.publicUrl);
      } catch (err) {
        // Upload failed — keep the blob URL so video still plays locally
        console.error('[CourtOrderVideo] Supabase upload failed:', err);
        setUploadStatus(null);
        toastError('Cloud save failed — video plays locally only');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Clean up blob URL on unmount (only revoke blob: URLs, not Supabase URLs)
  useEffect(() => {
    return () => {
      if (userVideoUrl && userVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(userVideoUrl);
      }
    };
  }, [userVideoUrl]);

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
      // Clear broken InVideo override so we fall back to Kling generation
      if (invideoOverride) {
        console.warn('[CourtOrderVideo] Clearing broken InVideo override, falling back to Kling');
        setInvideoOverride(null);
      }
      reset();
      setHasStarted(false);
      setIsPlaying(false);
      setVideoErrorCount(0);
    }
  }, [videoErrorCount, reset, invideoOverride]);

  // Reset when comparisonId changes
  useEffect(() => {
    reset();
    setHasStarted(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setVideoErrorCount(0);
    if (userVideoUrl && userVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(userVideoUrl);
    }
    setUserVideoUrl(null);
    setIsUploading(false);
    setUploadStatus(null);
  }, [comparisonId]);

  // ══════════════════════════════════════════════════════════════════════════
  // ACTION HANDLERS - Save, Download, Share/Forward for Court Order
  // ══════════════════════════════════════════════════════════════════════════

  // Save Court Order via centralized service (localStorage + Supabase database)
  // Deferred to avoid blocking UI (INP fix: was blocking 3.5s with sync alert + localStorage)
  const handleSaveCourtOrder = () => {
    const videoUrl = effectiveVideoUrl;
    if (!videoUrl) return;

    // Don't save blob URLs to database — they're ephemeral
    if (videoUrl.startsWith('blob:')) {
      toastError('Video is still uploading. Please wait for cloud save to complete.');
      return;
    }

    // Defer heavy work so the browser can paint the button press immediately
    setTimeout(() => {
      try {
        saveCourtOrder({
          comparisonId,
          winnerCity,
          winnerScore,
          videoUrl,
          savedAt: new Date().toISOString(),
        });
        console.log('[CourtOrderVideo] Court Order saved:', comparisonId);
        toastSuccess('Court Order saved successfully!');
      } catch (error) {
        console.error('[CourtOrderVideo] Failed to save Court Order:', error);
        toastError('Failed to save Court Order. Please try again.');
      }
    }, 0);
  };

  // Download Court Order video
  const handleDownloadCourtOrder = async () => {
    const videoUrl = effectiveVideoUrl;
    if (!videoUrl) return;

    const filename = `court-order-${winnerCity.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${comparisonId.slice(0, 8)}.mp4`;

    try {
      console.log('[CourtOrderVideo] Downloading video:', videoUrl);

      // For blob URLs (user uploads), use the URL directly as download href
      if (videoUrl.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // For remote URLs, fetch first then download as blob
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }

      console.log('[CourtOrderVideo] Download initiated');
    } catch (err) {
      console.error('[CourtOrderVideo] Download error:', err);
      toastError('Failed to download video. Please try again.');
    }
  };

  // Share/Forward Court Order
  const handleShareCourtOrder = async () => {
    const videoUrl = effectiveVideoUrl;
    if (!videoUrl) return;

    const shareData = {
      title: `LIFE SCORE Court Order - ${winnerCity}`,
      text: `Check out my perfect life in ${winnerCity} with a LIFE SCORE of ${winnerScore.toFixed(1)}!`,
      url: videoUrl,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        console.log('[CourtOrderVideo] Shared successfully');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(videoUrl);
        toastSuccess('Video URL copied to clipboard!');
        console.log('[CourtOrderVideo] URL copied to clipboard');
      }
    } catch (err) {
      console.error('[CourtOrderVideo] Share error:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(videoUrl);
        toastSuccess('Video URL copied to clipboard!');
      } catch {
        toastError('Unable to share video');
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
                  loserCity={loserCity}
                  categoryName={currentCategoryData.categoryName}
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
              {(userVideoUrl || (isReady && effectiveVideoUrl) || (invideoOverride && !isLoadingOverride)) && effectiveVideoUrl ? (
                <video
                  ref={videoRef}
                  src={effectiveVideoUrl}
                  className="court-video"
                  onEnded={handleVideoEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onError={handleVideoError}
                  playsInline
                  crossOrigin="anonymous"
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

            {/* Video Controls - Show when video is ready, InVideo override, or user upload */}
            {(userVideoUrl || (isReady && effectiveVideoUrl) || (invideoOverride && !isLoadingOverride)) && (
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

        {/* Upload Progress Indicator */}
        {isUploading && uploadStatus && (
          <div className="upload-progress-bar">
            <div className="lcd-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
            <span className="upload-status-text">{uploadStatus}</span>
          </div>
        )}

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

        {/* Hidden file input for user video upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleUserVideoUpload}
          style={{ display: 'none' }}
        />

        {/* Action Buttons */}
        <div className="court-actions">
          {/* User uploaded video: play button */}
          {userVideoUrl && !isPlaying && (
            <button
              className="watch-future-btn"
              onClick={handlePlayPause}
            >
              <span className="btn-icon">▶</span>
              <span className="btn-text">PLAY YOUR VIDEO</span>
            </button>
          )}

          {/* InVideo override: skip generation, go straight to play */}
          {!userVideoUrl && invideoOverride && !isPlaying && (
            <button
              className="watch-future-btn"
              onClick={handlePlayPause}
            >
              <span className="btn-icon">▶</span>
              <span className="btn-text">WATCH YOUR MOVING MOVIE</span>
            </button>
          )}

          {/* No override, no user upload: normal generation flow */}
          {!userVideoUrl && !invideoOverride && !hasStarted && !isReady && (
            <button
              className="see-court-order-btn"
              onClick={handleGenerateVideo}
              disabled={isGenerating || !user?.id}
            >
              <span className="btn-icon">👁️</span>
              <span className="btn-text">SEE COURT ORDER</span>
            </button>
          )}

          {!userVideoUrl && !invideoOverride && isReady && !isPlaying && (
            <button
              className="watch-future-btn"
              onClick={handlePlayPause}
            >
              <span className="btn-icon">▶</span>
              <span className="btn-text">WATCH YOUR FUTURE</span>
            </button>
          )}

          {/* Upload your own video button - always visible when no user video loaded */}
          {!userVideoUrl && (
            <button
              className="upload-video-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <span className="btn-icon">🎥</span>
              <span className="btn-text">UPLOAD YOUR VIDEO</span>
            </button>
          )}

          {/* Replace uploaded video */}
          {userVideoUrl && (
            <button
              className="upload-video-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <span className="btn-icon">🔄</span>
              <span className="btn-text">{isUploading ? 'UPLOADING...' : 'CHANGE VIDEO'}</span>
            </button>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            ADMIN: InVideo Override Upload Panel
        ════════════════════════════════════════════════════════════════ */}
        {isAdmin && (
          <div className="invideo-admin-panel">
            {invideoOverride ? (
              <div className="invideo-active-override">
                <span className="override-badge">VIP VIDEO ACTIVE</span>
                <span className="override-title">
                  {invideoOverride.video_title || 'InVideo Override'}
                </span>
                <div className="override-actions">
                  <button
                    className="override-btn replace-btn"
                    onClick={() => setShowAdminUpload(true)}
                  >
                    Replace
                  </button>
                  <button
                    className="override-btn remove-btn"
                    onClick={handleRemoveOverride}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="invideo-upload-trigger"
                onClick={() => setShowAdminUpload(!showAdminUpload)}
              >
                <span className="btn-icon">🎬</span>
                <span className="btn-text">
                  {showAdminUpload ? 'Cancel' : 'Upload InVideo Movie (Admin)'}
                </span>
              </button>
            )}

            {showAdminUpload && (
              <div className="invideo-upload-form">
                <input
                  type="url"
                  className="invideo-input"
                  placeholder="Paste InVideo video URL..."
                  value={adminVideoUrl}
                  onChange={e => setAdminVideoUrl(e.target.value)}
                />
                <input
                  type="text"
                  className="invideo-input"
                  placeholder="Video title (optional)"
                  value={adminVideoTitle}
                  onChange={e => setAdminVideoTitle(e.target.value)}
                />
                <button
                  className="invideo-submit-btn"
                  onClick={handleSubmitOverride}
                  disabled={!adminVideoUrl.trim() || isSubmittingOverride}
                >
                  {isSubmittingOverride ? 'Saving...' : 'Save VIP Video'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            COURT ORDER ACTION BUTTONS - Save, Download, Share/Forward
        ════════════════════════════════════════════════════════════════ */}
        {(userVideoUrl || (isReady && effectiveVideoUrl) || invideoOverride) && (
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
