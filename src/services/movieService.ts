/**
 * LIFE SCORE - Moving Movie Service
 *
 * Client-side orchestration for the InVideo Moving Movie pipeline:
 *   Stage 1: Screenplay Generator (Claude) → 12-scene JSON
 *   Stage 2: InVideo MCP → 10-minute cinematic movie
 *
 * Also builds the MovieComparisonInput from existing comparison/judge data
 * and handles polling for video completion.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { getAuthHeaders } from '../lib/supabase';

// ============================================================================
// CONSTANTS
// ============================================================================

const SCREENPLAY_TIMEOUT_MS = 240000;  // 4 min — LLM may retry
const GENERATE_TIMEOUT_MS = 180000;    // 3 min — MCP submission
const STATUS_TIMEOUT_MS = 30000;       // 30s for status checks
const POLL_INTERVAL_MS = 10000;        // 10s between polls
const MAX_POLL_ATTEMPTS = 180;         // 30 minutes max

// ============================================================================
// TYPES
// ============================================================================

/** Category IDs from the evaluation system */
type CategoryId = 'personal_freedom' | 'housing_property' | 'business_work' |
  'transportation' | 'policing_legal' | 'speech_lifestyle';

const CATEGORY_DISPLAY_NAMES: Record<CategoryId, string> = {
  personal_freedom: 'Personal Autonomy',
  housing_property: 'Housing, Property & HOA Control',
  business_work: 'Business & Work Regulation',
  transportation: 'Transportation & Daily Movement',
  policing_legal: 'Policing, Courts & Enforcement',
  speech_lifestyle: 'Speech, Lifestyle & Culture',
};

const CATEGORY_ICONS: Record<CategoryId, string> = {
  personal_freedom: '🗽',
  housing_property: '🏠',
  business_work: '💼',
  transportation: '🚇',
  policing_legal: '⚖️',
  speech_lifestyle: '🎭',
};

/** Full comparison input for the screenplay generator */
export interface MovieComparisonInput {
  userName?: string;
  winnerCity: string;
  winnerCountry: string;
  winnerRegion?: string;
  winnerScore: number;
  winnerCityType?: 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';
  loserCity: string;
  loserCountry: string;
  loserRegion?: string;
  loserScore: number;
  loserCityType?: 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';
  categories?: Array<{
    categoryName: string;
    categoryIcon: string;
    winnerScore: number;
    loserScore: number;
    winner: 'city1' | 'city2';
    keyMetrics?: string[];
  }>;
  judgeSummary?: string;
  judgeRecommendation?: string;
  winnerStrengths?: string[];
  loserWeaknesses?: string[];
}

/** State tracked by the movie generation UI */
export interface MovieState {
  status: 'idle' | 'generating_screenplay' | 'screenplay_ready' |
          'submitting_to_invideo' | 'rendering' | 'completed' | 'failed';
  movieId?: string;
  screenplay?: Record<string, unknown>;
  generationPrompt?: string;
  videoUrl?: string;
  editUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  progress: number;          // 0-100
  error?: string;
  cached?: boolean;
  winnerCity?: string;
  loserCity?: string;
}

// ============================================================================
// INPUT BUILDER
// ============================================================================

/**
 * Build MovieComparisonInput from app's comparison and judge data.
 */
export function buildMovieInput(params: {
  // Winner
  winnerCity: string;
  winnerCountry: string;
  winnerRegion?: string;
  winnerScore: number;
  winnerCityType?: MovieComparisonInput['winnerCityType'];
  // Loser
  loserCity: string;
  loserCountry: string;
  loserRegion?: string;
  loserScore: number;
  loserCityType?: MovieComparisonInput['loserCityType'];
  // Optional details
  userName?: string;
  winnerCategories?: Array<{ categoryId: string; averageScore: number | null }>;
  loserCategories?: Array<{ categoryId: string; averageScore: number | null }>;
  categoryWinners?: Record<string, string>;
  judgeSummary?: string;
  judgeRecommendation?: string;
}): MovieComparisonInput {
  // Build category breakdown
  const categories: MovieComparisonInput['categories'] = [];
  if (params.winnerCategories && params.loserCategories) {
    for (const wCat of params.winnerCategories) {
      const catId = wCat.categoryId as CategoryId;
      const lCat = params.loserCategories.find(c => c.categoryId === catId);
      if (!lCat) continue;

      const displayName = CATEGORY_DISPLAY_NAMES[catId];
      const icon = CATEGORY_ICONS[catId];
      if (!displayName) continue;

      const wScore = wCat.averageScore ?? 0;
      const lScore = lCat.averageScore ?? 0;

      categories.push({
        categoryName: displayName,
        categoryIcon: icon,
        winnerScore: Math.max(wScore, lScore),
        loserScore: Math.min(wScore, lScore),
        winner: wScore >= lScore ? 'city1' : 'city2',
      });
    }
  }

  return {
    userName: params.userName,
    winnerCity: params.winnerCity,
    winnerCountry: params.winnerCountry,
    winnerRegion: params.winnerRegion,
    winnerScore: params.winnerScore,
    winnerCityType: params.winnerCityType,
    loserCity: params.loserCity,
    loserCountry: params.loserCountry,
    loserRegion: params.loserRegion,
    loserScore: params.loserScore,
    loserCityType: params.loserCityType,
    categories: categories.length > 0 ? categories : undefined,
    judgeSummary: params.judgeSummary,
    judgeRecommendation: params.judgeRecommendation,
  };
}

// ============================================================================
// STAGE 1: SCREENPLAY
// ============================================================================

async function generateScreenplay(
  comparisonInput: MovieComparisonInput
): Promise<{ screenplay: Record<string, unknown>; qa: Record<string, unknown> }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/movie/screenplay',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ comparisonInput }),
    },
    SCREENPLAY_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Screenplay generation failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.screenplay) {
    throw new Error(data.error || 'Screenplay generation returned no data');
  }

  return { screenplay: data.screenplay, qa: data.qa };
}

// ============================================================================
// STAGE 2: INVIDEO SUBMISSION
// ============================================================================

async function submitToInVideo(params: {
  screenplay: Record<string, unknown>;
  winnerCity: string;
  loserCity: string;
  winnerCountry?: string;
  loserCountry?: string;
  winnerScore?: number;
  loserScore?: number;
  userName?: string;
}): Promise<{
  movieId: string;
  status: string;
  videoUrl?: string;
  editUrl?: string;
  generationPrompt?: string;
  cached: boolean;
}> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/movie/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(params),
    },
    GENERATE_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Movie submission failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Movie submission returned no data');
  }

  return {
    movieId: data.movie.id,
    status: data.movie.status,
    videoUrl: data.movie.videoUrl,
    editUrl: data.movie.editUrl,
    generationPrompt: data.movie.generationPrompt,
    cached: data.cached,
  };
}

// ============================================================================
// STATUS POLLING
// ============================================================================

async function checkMovieStatus(movieId: string): Promise<{
  status: string;
  videoUrl?: string;
  editUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  generationPrompt?: string;
}> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    `/api/movie/generate?movieId=${encodeURIComponent(movieId)}`,
    { method: 'GET', headers: authHeaders },
    STATUS_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Status check failed: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// FULL ORCHESTRATION
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Full pipeline: generate screenplay → submit to InVideo → poll until complete.
 */
export async function generateMovie(
  comparisonInput: MovieComparisonInput,
  onProgress?: (state: MovieState) => void
): Promise<MovieState> {
  try {
    // ── STAGE 1: Generate Screenplay ──────────────────────────────────
    onProgress?.({
      status: 'generating_screenplay',
      progress: 5,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
    });

    console.log('[Movie] Stage 1: Generating screenplay for',
      comparisonInput.winnerCity, 'vs', comparisonInput.loserCity);

    const { screenplay } = await generateScreenplay(comparisonInput);

    onProgress?.({
      status: 'screenplay_ready',
      screenplay,
      progress: 20,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
    });

    // ── STAGE 2: Submit to InVideo ────────────────────────────────────
    onProgress?.({
      status: 'submitting_to_invideo',
      screenplay,
      progress: 25,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
    });

    console.log('[Movie] Stage 2: Submitting to InVideo');

    const invideoResult = await submitToInVideo({
      screenplay,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
      winnerCountry: comparisonInput.winnerCountry,
      loserCountry: comparisonInput.loserCountry,
      winnerScore: comparisonInput.winnerScore,
      loserScore: comparisonInput.loserScore,
      userName: comparisonInput.userName,
    });

    // Cache hit
    if (invideoResult.cached) {
      console.log('[Movie] Cache hit!');
      const completedState: MovieState = {
        status: 'completed',
        movieId: invideoResult.movieId,
        videoUrl: invideoResult.videoUrl,
        progress: 100,
        cached: true,
        winnerCity: comparisonInput.winnerCity,
        loserCity: comparisonInput.loserCity,
      };
      onProgress?.(completedState);
      return completedState;
    }

    // Already completed (InVideo returned URL immediately)
    if (invideoResult.videoUrl) {
      const completedState: MovieState = {
        status: 'completed',
        movieId: invideoResult.movieId,
        videoUrl: invideoResult.videoUrl,
        editUrl: invideoResult.editUrl,
        generationPrompt: invideoResult.generationPrompt,
        screenplay,
        progress: 100,
        cached: false,
        winnerCity: comparisonInput.winnerCity,
        loserCity: comparisonInput.loserCity,
      };
      onProgress?.(completedState);
      return completedState;
    }

    // Screenplay ready but InVideo MCP unavailable — return prompt for manual use
    if (invideoResult.status === 'screenplay_ready') {
      const promptReadyState: MovieState = {
        status: 'screenplay_ready',
        movieId: invideoResult.movieId,
        screenplay,
        generationPrompt: invideoResult.generationPrompt,
        progress: 30,
        winnerCity: comparisonInput.winnerCity,
        loserCity: comparisonInput.loserCity,
      };
      onProgress?.(promptReadyState);
      return promptReadyState;
    }

    // ── POLL UNTIL COMPLETE ───────────────────────────────────────────
    const movieId = invideoResult.movieId;

    onProgress?.({
      status: 'rendering',
      movieId,
      screenplay,
      generationPrompt: invideoResult.generationPrompt,
      progress: 30,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
    });

    let attempts = 0;
    let consecutiveErrors = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      try {
        const status = await checkMovieStatus(movieId);
        consecutiveErrors = 0;

        const progressPct = status.status === 'completed'
          ? 100
          : status.status === 'rendering'
            ? Math.min(30 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 60), 90)
            : 30;

        const state: MovieState = {
          status: status.status === 'completed' ? 'completed'
            : status.status === 'failed' ? 'failed'
            : 'rendering',
          movieId,
          screenplay,
          generationPrompt: status.generationPrompt,
          videoUrl: status.videoUrl,
          editUrl: status.editUrl,
          thumbnailUrl: status.thumbnailUrl,
          durationSeconds: status.durationSeconds,
          progress: progressPct,
          error: undefined,
          winnerCity: comparisonInput.winnerCity,
          loserCity: comparisonInput.loserCity,
        };

        onProgress?.(state);

        if (status.status === 'completed') {
          console.log('[Movie] Completed:', status.videoUrl);
          return state;
        }

        if (status.status === 'failed') {
          console.error('[Movie] Failed');
          return { ...state, status: 'failed', error: 'Video rendering failed' };
        }
      } catch (err) {
        consecutiveErrors++;
        console.warn('[Movie] Poll error (attempt', attempts + 1, '):', err);
        if (consecutiveErrors > 10) {
          return {
            status: 'failed',
            movieId,
            progress: 0,
            error: `Lost connection: ${err instanceof Error ? err.message : 'Polling failed'}`,
            winnerCity: comparisonInput.winnerCity,
            loserCity: comparisonInput.loserCity,
          };
        }
      }

      await sleep(POLL_INTERVAL_MS);
      attempts++;
    }

    // Timed out
    return {
      status: 'failed',
      movieId,
      progress: 0,
      error: `Movie rendering timed out after ${Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000)} minutes`,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Movie generation failed';
    console.error('[Movie] Error:', errorMsg);

    const errorState: MovieState = {
      status: 'failed',
      progress: 0,
      error: errorMsg,
      winnerCity: comparisonInput.winnerCity,
      loserCity: comparisonInput.loserCity,
    };

    onProgress?.(errorState);
    return errorState;
  }
}
