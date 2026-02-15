/**
 * LIFE SCORE™ Judge Video Component
 *
 * Displays Cristiano judge videos generated via Replicate.
 * Shows generation progress and cached videos.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useJudgeVideo } from '../hooks/useJudgeVideo';
import { useTierAccess } from '../hooks/useTierAccess';
import type { GenerateJudgeVideoRequest } from '../types/avatar';
import './JudgeVideo.css';

interface JudgeVideoProps {
  city1: string;
  city2: string;
  winner: string;
  winnerScore: number;
  loserScore: number;
  script: string;
  autoGenerate?: boolean;
  onVideoReady?: (videoUrl: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const JudgeVideo: React.FC<JudgeVideoProps> = ({
  city1,
  city2,
  winner,
  winnerScore,
  loserScore,
  script,
  autoGenerate = false,
  onVideoReady,
  onError,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
  const {
    video,
    status,
    isGenerating,
    isReady,
    generate,
    cancel,
    error,
  } = useJudgeVideo();

  // FIX #48: Error count tracking for expired URL detection
  const [videoErrorCount, setVideoErrorCount] = useState(0);
  const MAX_VIDEO_ERRORS = 3;

  // Auto-generate on mount if requested
  useEffect(() => {
    if (autoGenerate && script) {
      handleGenerate();
    }
  }, [autoGenerate, script]);

  // Notify parent when video is ready
  useEffect(() => {
    if (isReady && video?.videoUrl && onVideoReady) {
      onVideoReady(video.videoUrl);
    }
  }, [isReady, video?.videoUrl, onVideoReady]);

  // Notify parent of errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // FIX #48: Handle video load errors - track count and reset when threshold reached
  const handleVideoError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('[JudgeVideo] Video load error:', e);
    setVideoErrorCount(prev => {
      const newCount = prev + 1;
      console.warn(`[JudgeVideo] Video error count: ${newCount}/${MAX_VIDEO_ERRORS}`);
      return newCount;
    });
  }, []);

  // FIX #48: Auto-reset when video errors exceed threshold (expired URLs)
  useEffect(() => {
    if (videoErrorCount >= MAX_VIDEO_ERRORS) {
      console.log('[JudgeVideo] Video error threshold reached - resetting to allow regeneration');
      cancel();
      setVideoErrorCount(0);
    }
  }, [videoErrorCount, cancel]);

  const handleGenerate = async () => {
    // ADMIN BYPASS: Skip usage checks for admin users
    if (!isAdmin) {
      // Check usage limits before generating Judge video
      const usageResult = await checkUsage('judgeVideos');
      if (!usageResult.allowed) {
        console.log('[JudgeVideo] Judge video limit reached:', usageResult);
        if (onError) {
          onError('Monthly Judge video limit reached. Please upgrade to continue.');
        }
        return;
      }

      // Increment usage counter before starting generation
      await incrementUsage('judgeVideos');
      console.log('[JudgeVideo] Incremented judgeVideos usage');
    }

    const request: GenerateJudgeVideoRequest = {
      script,
      city1,
      city2,
      winner,
      winnerScore,
      loserScore,
    };
    generate(request);
  };

  // Video controls
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage for generation
  const getProgressMessage = () => {
    switch (status) {
      case 'pending': return 'Preparing video generation...';
      case 'processing': return 'Cristiano is recording your verdict...';
      case 'completed': return 'Video ready!';
      case 'failed': return 'Generation failed';
      default: return 'Ready to generate';
    }
  };

  return (
    <div className={`judge-video ${className}`}>
      {/* Video Player */}
      {isReady && video?.videoUrl ? (
        <div className="video-player">
          <video
            ref={videoRef}
            src={video.videoUrl}
            className="video-element"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onError={handleVideoError}
            playsInline
          />

          {/* Custom Controls */}
          <div className="video-controls">
            <button className="play-btn" onClick={handlePlayPause}>
              {isPlaying ? '⏸' : '▶'}
            </button>

            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <input
              type="range"
              className="seek-bar"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
            />

            <div className="volume-control">
              <span className="volume-icon">{volume > 0 ? '🔊' : '🔇'}</span>
              <input
                type="range"
                className="volume-bar"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>

          {/* Video Overlay - Cristiano Info */}
          <div className="video-overlay">
            <div className="presenter-badge">
              <span className="presenter-icon">⚖️</span>
              <span className="presenter-name">CRISTIANO</span>
              <span className="presenter-title">THE JUDGE</span>
            </div>
          </div>
        </div>
      ) : (
        /* Generation State */
        <div className="generation-container">
          {/* Cristiano Placeholder */}
          <div className="placeholder-avatar">
            <img
              src="/images/cristiano-judge.jpg"
              alt="Cristiano - The Judge"
              className="judge-image"
            />
            <div className="judge-title-overlay">
              <span className="title-icon">⚖️</span>
              <span className="title-text">THE JUDGE</span>
            </div>
          </div>

          {/* Generation Status */}
          <div className="generation-status">
            {isGenerating ? (
              <>
                <div className="generation-spinner">
                  <div className="spinner-ring"></div>
                </div>
                <p className="status-message">{getProgressMessage()}</p>
                <p className="status-hint">This typically takes 30-60 seconds</p>
              </>
            ) : status === 'failed' ? (
              <>
                <span className="error-icon">❌</span>
                <p className="error-message">{error || 'Video generation failed'}</p>
                <button className="retry-btn" onClick={handleGenerate}>
                  Try Again
                </button>
              </>
            ) : (
              <>
                <p className="status-message">Ready to generate verdict video</p>
                <button className="generate-btn" onClick={handleGenerate}>
                  <span className="btn-icon">🎬</span>
                  <span className="btn-text">Generate Video Report</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Verdict Summary */}
      <div className="verdict-summary">
        <div className="verdict-cities">
          <span className={`city ${winner === city1 ? 'winner' : ''}`}>
            {city1} ({winner === city1 ? winnerScore : loserScore})
          </span>
          <span className="vs">vs</span>
          <span className={`city ${winner === city2 ? 'winner' : ''}`}>
            {city2} ({winner === city2 ? winnerScore : loserScore})
          </span>
        </div>
        <div className="verdict-winner">
          Winner: <strong>{winner}</strong>
        </div>
      </div>
    </div>
  );
};

export default JudgeVideo;
