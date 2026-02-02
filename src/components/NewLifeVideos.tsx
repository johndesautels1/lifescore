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
import { useTierAccess } from '../hooks/useTierAccess';
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
  const { checkUsage, incrementUsage } = useTierAccess();
  const {
    videoPair,
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
  const winner = result.winner;
  const winnerCity = winner === 'city1' ? result.city1.city : result.city2.city;
  const loserCity = winner === 'city1' ? result.city2.city : result.city1.city;
  const winnerScore = winner === 'city1' ? result.city1.totalConsensusScore : result.city2.totalConsensusScore;
  const loserScore = winner === 'city1' ? result.city2.totalConsensusScore : result.city1.totalConsensusScore;

  // Handle video generation
  const handleGenerateVideos = async () => {
    if (!user?.id) {
      console.warn('[NewLifeVideos] No user ID available');
      return;
    }

    // Check usage limits before generating Grok videos
    const usageResult = await checkUsage('grokVideos');
    if (!usageResult.allowed) {
      console.log('[NewLifeVideos] Grok video limit reached:', usageResult);
      return;
    }

    // Increment usage counter before starting generation
    await incrementUsage('grokVideos');
    console.log('[NewLifeVideos] Incremented grokVideos usage');

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
    <FeatureGate feature="grokVideos" blurContent={true}>
      <div className="new-life-videos">
        <div className="new-life-header">
          <h3 className="section-title">
            <span className="section-icon">🎬</span>
            {winnerCity} & {loserCity}
          </h3>
          <p className="section-subtitle" style={{ color: '#FFD700' }}>
            See the contrast between freedom and imprisonment
          </p>
        </div>

        {/* Video Display Area */}
        <div className="video-comparison-container">
          {/* Winner City - Freedom Video */}
          <div className="video-panel winner-panel">
            {/* FREEDOM Banner */}
            <div className="status-banner freedom-banner">
              <span className="banner-icon">🗽</span>
              <span className="banner-text">FREEDOM</span>
              <span className="banner-icon">🏆</span>
            </div>
            <div className="panel-header">
              <span className="hero-badge">
                <span className="hero-icon">🦸</span>
              </span>
              <span className="city-name">{winnerCity}</span>
              <span className="winner-badge">WINNER</span>
              <span className="score-badge">{winnerScore.toFixed(1)}</span>
            </div>
            <div className="video-viewport">
              {isReady && videoPair?.winner?.videoUrl && videoPair.winner.videoUrl.startsWith('http') ? (
                <video
                  ref={winnerVideoRef}
                  src={videoPair.winner.videoUrl}
                  className="city-video"
                  onEnded={handleVideoEnded}
                  onError={(e) => console.error('[NewLifeVideos] Winner video load error:', e)}
                  playsInline
                  muted={false}
                />
              ) : (
                <div className="video-placeholder winner-placeholder">
                  <div className="placeholder-icon">🌟</div>
                  <div className="placeholder-text">
                    {isGenerating ? 'Generating...' : error ? 'Video unavailable' : 'Freedom awaits'}
                  </div>
                </div>
              )}
            </div>
            <div className="panel-label freedom-label">
              <span className="label-icon">🗽</span>
              YOUR NEW LIFE
            </div>
          </div>

          {/* VS Divider */}
          <div className="vs-divider">
            <span className="vs-text">VS</span>
          </div>

          {/* Loser City - Imprisonment Video */}
          <div className="video-panel loser-panel">
            {/* IMPRISONMENT Banner */}
            <div className="status-banner imprisonment-banner">
              <span className="banner-icon">⛓️</span>
              <span className="banner-text">IMPRISONMENT</span>
              <span className="banner-icon">👮</span>
            </div>
            <div className="panel-header">
              <span className="city-name">{loserCity}</span>
              <span className="loser-badge">LOSER</span>
              <span className="score-badge">{loserScore.toFixed(1)}</span>
            </div>
            <div className="video-viewport">
              {isReady && videoPair?.loser?.videoUrl && videoPair.loser.videoUrl.startsWith('http') ? (
                <video
                  ref={loserVideoRef}
                  src={videoPair.loser.videoUrl}
                  className="city-video"
                  onEnded={handleVideoEnded}
                  onError={(e) => console.error('[NewLifeVideos] Loser video load error:', e)}
                  playsInline
                  muted={false}
                />
              ) : (
                <div className="video-placeholder loser-placeholder">
                  <div className="placeholder-icon">⛓️</div>
                  <div className="placeholder-text">
                    {isGenerating ? 'Generating...' : error ? 'Video unavailable' : 'Oppression looms'}
                  </div>
                </div>
              )}
            </div>
            <div className="panel-label imprisonment-label">
              <span className="label-icon">👮</span>
              GOVERNMENT CONTROL
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
            <div className="ready-actions">
              <button
                className="play-btn primary-btn"
                onClick={handlePlayVideos}
              >
                <span className="btn-icon">{isPlaying ? '⏸' : '▶'}</span>
                <span className="btn-text">{isPlaying ? 'PAUSE' : 'PLAY BOTH VIDEOS'}</span>
              </button>

              <div className="download-actions">
                {videoPair?.winner?.videoUrl && (
                  <a
                    href={videoPair.winner.videoUrl}
                    download={`${winnerCity}-freedom-video.mp4`}
                    className="download-btn secondary-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="btn-icon">⬇️</span>
                    <span className="btn-text">Download {winnerCity}</span>
                  </a>
                )}
                {videoPair?.loser?.videoUrl && (
                  <a
                    href={videoPair.loser.videoUrl}
                    download={`${loserCity}-imprisonment-video.mp4`}
                    className="download-btn secondary-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="btn-icon">⬇️</span>
                    <span className="btn-text">Download {loserCity}</span>
                  </a>
                )}
              </div>
            </div>
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
