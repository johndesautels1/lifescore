/**
 * LIFE SCORE - New Life Videos Component
 *
 * "See Your New Life!" feature for the Visuals Tab.
 * Shows side-by-side videos of winner (freedom) vs loser (regulations) cities.
 * Replaces the Interactive Charts section for Enhanced Mode users.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGrokVideo } from '../hooks/useGrokVideo';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import FeatureGate from './FeatureGate';
import './NewLifeVideos.css';

// ============================================================================
// TYPES
// ============================================================================

interface NewLifeVideosProps {
  result: EnhancedComparisonResult;
}

// ============================================================================
// COMPONENT
// ============================================================================

const NewLifeVideos: React.FC<NewLifeVideosProps> = ({ result }) => {
  const { user } = useAuth();
  const {
    videoPair,
    status,
    isGenerating,
    isReady,
    progress,
    generateNewLifeVideos,
    error,
    reset,
  } = useGrokVideo();

  // Video refs for playback control
  const winnerVideoRef = useRef<HTMLVideoElement>(null);
  const loserVideoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Determine winner/loser from result
  const winner = result.recommendation;
  const winnerCity = winner === 'city1' ? result.city1.city : result.city2.city;
  const loserCity = winner === 'city1' ? result.city2.city : result.city1.city;
  const winnerScore = winner === 'city1' ? result.city1Score : result.city2Score;
  const loserScore = winner === 'city1' ? result.city2Score : result.city1Score;

  // Handle video generation
  const handleGenerateVideos = async () => {
    if (!user?.id) {
      console.warn('[NewLifeVideos] No user ID available');
      return;
    }

    setHasStarted(true);

    await generateNewLifeVideos({
      userId: user.id,
      comparisonId: result.comparisonId,
      winnerCity,
      loserCity,
    });
  };

  // Handle play both videos simultaneously
  const handlePlayVideos = () => {
    if (winnerVideoRef.current && loserVideoRef.current) {
      if (isPlaying) {
        winnerVideoRef.current.pause();
        loserVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        // Sync start both videos
        winnerVideoRef.current.currentTime = 0;
        loserVideoRef.current.currentTime = 0;
        Promise.all([
          winnerVideoRef.current.play(),
          loserVideoRef.current.play(),
        ]).then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('[NewLifeVideos] Play error:', err);
        });
      }
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  // Reset when result changes
  useEffect(() => {
    reset();
    setHasStarted(false);
    setIsPlaying(false);
  }, [result.comparisonId]);

  return (
    <FeatureGate feature="judgeVideos" blurContent={true}>
      <div className="new-life-videos">
        <div className="new-life-header">
          <h3 className="section-title">
            <span className="section-icon">🎬</span>
            See Your New Life!
          </h3>
          <p className="section-subtitle">
            Watch the contrast between freedom and regulation
          </p>
        </div>

        {/* Video Display Area */}
        <div className="video-comparison-container">
          {/* Winner City - Freedom Video */}
          <div className="video-panel winner-panel">
            <div className="panel-header">
              <span className="city-name">{winnerCity}</span>
              <span className="winner-badge">WINNER</span>
              <span className="score-badge">{winnerScore.toFixed(1)}</span>
            </div>
            <div className="video-viewport">
              {isReady && videoPair?.winner?.videoUrl ? (
                <video
                  ref={winnerVideoRef}
                  src={videoPair.winner.videoUrl}
                  className="city-video"
                  onEnded={handleVideoEnded}
                  playsInline
                  muted={false}
                />
              ) : (
                <div className="video-placeholder winner-placeholder">
                  <div className="placeholder-icon">🌟</div>
                  <div className="placeholder-text">
                    {isGenerating ? 'Generating...' : 'Freedom awaits'}
                  </div>
                </div>
              )}
            </div>
            <div className="panel-label freedom-label">
              <span className="label-icon">🗽</span>
              FREEDOM
            </div>
          </div>

          {/* VS Divider */}
          <div className="vs-divider">
            <span className="vs-text">VS</span>
          </div>

          {/* Loser City - Regulation Video */}
          <div className="video-panel loser-panel">
            <div className="panel-header">
              <span className="city-name">{loserCity}</span>
              <span className="loser-badge">LOSER</span>
              <span className="score-badge">{loserScore.toFixed(1)}</span>
            </div>
            <div className="video-viewport">
              {isReady && videoPair?.loser?.videoUrl ? (
                <video
                  ref={loserVideoRef}
                  src={videoPair.loser.videoUrl}
                  className="city-video"
                  onEnded={handleVideoEnded}
                  playsInline
                  muted={false}
                />
              ) : (
                <div className="video-placeholder loser-placeholder">
                  <div className="placeholder-icon">🔒</div>
                  <div className="placeholder-text">
                    {isGenerating ? 'Generating...' : 'Bureaucracy lurks'}
                  </div>
                </div>
              )}
            </div>
            <div className="panel-label regulation-label">
              <span className="label-icon">📋</span>
              REGULATIONS
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="generation-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: progress.includes('%') ? progress.match(/\d+/)?.[0] + '%' : '50%' }}
              />
            </div>
            <div className="progress-text">{progress || 'Initializing...'}</div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="video-error">
            <span className="error-icon">!</span>
            <span className="error-text">{error}</span>
            <button className="retry-btn" onClick={() => { reset(); setHasStarted(false); }}>
              Try Again
            </button>
          </div>
        )}

        {/* Action Button */}
        <div className="video-actions">
          {!hasStarted && !isReady && (
            <button
              className="generate-btn primary-btn"
              onClick={handleGenerateVideos}
              disabled={isGenerating || !user?.id}
            >
              <span className="btn-icon">👁️</span>
              <span className="btn-text">SEE YOUR NEW LIFE!</span>
            </button>
          )}

          {isReady && (
            <button
              className="play-btn primary-btn"
              onClick={handlePlayVideos}
            >
              <span className="btn-icon">{isPlaying ? '⏸' : '▶'}</span>
              <span className="btn-text">{isPlaying ? 'PAUSE' : 'PLAY BOTH VIDEOS'}</span>
            </button>
          )}

          {hasStarted && isGenerating && (
            <div className="generating-indicator">
              <span className="spinner"></span>
              <span>Creating your contrast videos...</span>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="video-info">
          <p className="info-text">
            Videos show the stark contrast between living in a freedom-friendly city
            versus one burdened by regulations and bureaucracy.
          </p>
        </div>
      </div>
    </FeatureGate>
  );
};

export default NewLifeVideos;
