/**
 * LIFE SCORE - Moving Movie Generator Component
 *
 * Full-screen cinematic movie experience showing the user's freedom journey.
 * Integrates with InVideo to generate a 10-minute personalized movie
 * from the city comparison data.
 *
 * States:
 *   idle            → "Create My Movie" button
 *   generating      → Screenplay + InVideo progress
 *   screenplay_ready → Prompt ready (fallback when InVideo MCP unavailable)
 *   rendering       → Video processing progress
 *   completed       → Video player
 *   failed          → Error with retry
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { generateMovie, buildMovieInput, type MovieState, type MovieComparisonInput } from '../services/movieService';
import './MovieGenerator.css';

// ============================================================================
// TYPES
// ============================================================================

interface MovieGeneratorProps {
  // Winner city data
  winnerCity: string;
  winnerCountry: string;
  winnerRegion?: string;
  winnerScore: number;
  winnerCityType?: MovieComparisonInput['winnerCityType'];

  // Loser city data
  loserCity: string;
  loserCountry: string;
  loserRegion?: string;
  loserScore: number;
  loserCityType?: MovieComparisonInput['loserCityType'];

  // Categories from comparison result
  winnerCategories?: Array<{ categoryId: string; averageScore: number | null }>;
  loserCategories?: Array<{ categoryId: string; averageScore: number | null }>;
  categoryWinners?: Record<string, string>;

  // Judge findings
  judgeSummary?: string;
  judgeRecommendation?: string;

  // User info
  userName?: string;
}

// Scene titles for progress display
const SCENE_TITLES = [
  'The Weight',
  'The Search',
  'The Discovery',
  'The Comparison',
  'The Revelation',
  "The Judge's Verdict",
  'The Dark Path',
  'The Decision',
  'The Journey',
  'The Arrival',
  'The New Life',
  'Freedom',
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function MovieGenerator(props: MovieGeneratorProps) {
  const {
    winnerCity, winnerCountry, winnerRegion, winnerScore, winnerCityType,
    loserCity, loserCountry, loserRegion, loserScore, loserCityType,
    winnerCategories, loserCategories, categoryWinners,
    judgeSummary, judgeRecommendation, userName,
  } = props;

  const [movieState, setMovieState] = useState<MovieState>({
    status: 'idle',
    progress: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cancelledRef = useRef(false);

  // Determine which scene is being "written" during screenplay generation
  const currentScene = movieState.status === 'generating_screenplay'
    ? Math.min(Math.floor(movieState.progress / 1.5), 11)
    : -1;

  // ── Generate Movie ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;
    cancelledRef.current = false;
    setIsGenerating(true);

    const input = buildMovieInput({
      winnerCity, winnerCountry, winnerRegion, winnerScore, winnerCityType,
      loserCity, loserCountry, loserRegion, loserScore, loserCityType,
      userName,
      winnerCategories,
      loserCategories,
      categoryWinners,
      judgeSummary,
      judgeRecommendation,
    });

    const result = await generateMovie(input, (state) => {
      if (!cancelledRef.current) {
        setMovieState(state);
      }
    });

    if (!cancelledRef.current) {
      setMovieState(result);
    }
    setIsGenerating(false);
  }, [
    winnerCity, winnerCountry, winnerRegion, winnerScore, winnerCityType,
    loserCity, loserCountry, loserRegion, loserScore, loserCityType,
    userName, winnerCategories, loserCategories, categoryWinners,
    judgeSummary, judgeRecommendation, isGenerating,
  ]);

  // ── Copy Prompt to Clipboard ──────────────────────────────────────
  const handleCopyPrompt = useCallback(async () => {
    if (movieState.generationPrompt) {
      try {
        await navigator.clipboard.writeText(movieState.generationPrompt);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = movieState.generationPrompt;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    }
  }, [movieState.generationPrompt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cancelledRef.current = true; };
  }, []);

  // ── RENDER: Idle State ────────────────────────────────────────────
  if (movieState.status === 'idle') {
    return (
      <div className="movie-generator">
        <div className="movie-hero">
          <div className="movie-film-strip" />
          <h2 className="movie-title">Watch your Freedom Journey</h2>
          <p className="movie-subtitle">
            A 10-minute cinematic film of your freedom journey — from {loserCity} to {winnerCity}
          </p>
          <div className="movie-preview-scenes">
            {SCENE_TITLES.map((title, i) => (
              <div key={i} className="movie-scene-chip">
                <span className="scene-number">{i + 1}</span>
                <span className="scene-title">{title}</span>
              </div>
            ))}
          </div>
          <button
            className="movie-generate-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <span className="btn-icon">🎬</span>
            Create My Moving Movie
          </button>
          <p className="movie-powered-by">Powered by InVideo AI</p>
        </div>
      </div>
    );
  }

  // ── RENDER: Generating/Processing States ──────────────────────────
  if (movieState.status === 'generating_screenplay' ||
      movieState.status === 'submitting_to_invideo' ||
      movieState.status === 'rendering') {
    return (
      <div className="movie-generator">
        <div className="movie-progress-container">
          <div className="movie-progress-header">
            <h2 className="movie-title">
              {movieState.status === 'generating_screenplay'
                ? 'Writing Your Screenplay'
                : movieState.status === 'submitting_to_invideo'
                  ? 'Sending to InVideo'
                  : 'Rendering Your Movie'}
            </h2>
            <p className="movie-subtitle">
              {movieState.status === 'generating_screenplay'
                ? `Claude is crafting your 12-scene story from ${loserCity} to ${winnerCity}`
                : movieState.status === 'submitting_to_invideo'
                  ? 'Submitting your screenplay to InVideo AI for cinematic rendering'
                  : `InVideo is rendering your 10-minute cinematic movie`}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="movie-progress-bar-container">
            <div
              className="movie-progress-bar"
              style={{ width: `${movieState.progress}%` }}
            />
            <span className="movie-progress-label">{movieState.progress}%</span>
          </div>

          {/* Scene Progress (during screenplay generation) */}
          {movieState.status === 'generating_screenplay' && (
            <div className="movie-scene-progress">
              {SCENE_TITLES.map((title, i) => (
                <div
                  key={i}
                  className={`scene-progress-item ${
                    i < currentScene ? 'done' :
                    i === currentScene ? 'active' : 'pending'
                  }`}
                >
                  <span className="scene-progress-dot" />
                  <span className="scene-progress-label">
                    Scene {i + 1}: {title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Rendering animation */}
          {movieState.status === 'rendering' && (
            <div className="movie-rendering-visual">
              <div className="film-reel">
                <div className="reel-circle" />
                <div className="reel-circle" />
                <div className="reel-circle" />
              </div>
              <p className="rendering-hint">
                InVideo is producing your movie with AI-generated visuals,
                voiceover, and orchestral music. This may take several minutes.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Screenplay Ready (Manual Fallback) ────────────────────
  if (movieState.status === 'screenplay_ready') {
    return (
      <div className="movie-generator">
        <div className="movie-screenplay-ready">
          <h2 className="movie-title">Screenplay Ready</h2>
          <p className="movie-subtitle">
            Your 12-scene cinematic screenplay has been generated. Copy the prompt
            below and paste it into InVideo AI to create your 10-minute movie.
          </p>

          <div className="movie-prompt-actions">
            <button
              className="movie-copy-btn"
              onClick={handleCopyPrompt}
            >
              {copySuccess ? 'Copied!' : 'Copy InVideo Prompt'}
            </button>
            <a
              href="https://invideo.io/make/ai-video-generator/"
              target="_blank"
              rel="noopener noreferrer"
              className="movie-invideo-link"
            >
              Open InVideo AI
            </a>
          </div>

          {/* Screenplay Preview */}
          <div className="movie-screenplay-preview">
            <h3>12-Scene Screenplay</h3>
            <div className="screenplay-scenes">
              {(movieState.screenplay as { scenes?: Array<{ title: string; act: string; voiceover: string }> })?.scenes?.map(
                (scene: { title: string; act: string; voiceover: string }, i: number) => (
                  <div key={i} className="screenplay-scene-card">
                    <div className="scene-card-header">
                      <span className="scene-number-badge">{i + 1}</span>
                      <span className="scene-card-title">{scene.title}</span>
                      <span className="scene-card-act">{scene.act}</span>
                    </div>
                    <p className="scene-card-voiceover">
                      {scene.voiceover?.substring(0, 150)}
                      {(scene.voiceover?.length || 0) > 150 ? '...' : ''}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Prompt Preview (collapsible) */}
          <details className="movie-prompt-details">
            <summary>View Full InVideo Prompt</summary>
            <pre className="movie-prompt-text">
              {movieState.generationPrompt}
            </pre>
          </details>

          <button
            className="movie-retry-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            Regenerate Screenplay
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: Completed ─────────────────────────────────────────────
  if (movieState.status === 'completed' && movieState.videoUrl) {
    return (
      <div className="movie-generator">
        <div className="movie-player-container">
          <h2 className="movie-title">Watch your Freedom Journey</h2>
          <p className="movie-subtitle">
            {userName ? `${userName}'s` : 'Your'} freedom journey from {loserCity} to {winnerCity}
          </p>

          <div className="movie-cinema-screen">
            <div className="cinema-bezel">
              <video
                ref={videoRef}
                className="movie-video"
                src={movieState.videoUrl}
                controls
                poster={movieState.thumbnailUrl}
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="movie-meta-bar">
            <span className="movie-meta-item">
              {movieState.durationSeconds
                ? `${Math.floor(movieState.durationSeconds / 60)}:${String(Math.floor(movieState.durationSeconds % 60)).padStart(2, '0')}`
                : '10:00'}
            </span>
            <span className="movie-meta-item">12 Scenes</span>
            <span className="movie-meta-item">Powered by InVideo AI</span>
            {movieState.cached && <span className="movie-meta-item cache-badge">Cached</span>}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Failed ────────────────────────────────────────────────
  if (movieState.status === 'failed') {
    return (
      <div className="movie-generator">
        <div className="movie-error">
          <h2 className="movie-title">Movie Generation Failed</h2>
          <p className="movie-error-message">
            {movieState.error || 'An unexpected error occurred.'}
          </p>
          <button
            className="movie-retry-btn"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
}
