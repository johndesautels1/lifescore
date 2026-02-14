/**
 * LIFE SCORE - Cristiano "Go To My New City" Video Service
 *
 * Client-side orchestration for the 2-stage video pipeline:
 *   Stage 1: Storyboard Builder (LLM) → 9-scene JSON
 *   Stage 2: HeyGen Video Agent Render → cinematic 120s video
 *
 * Also builds the Winner Package from existing comparison/judge data
 * and handles polling for video completion.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { getAuthHeaders } from '../lib/supabase';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORYBOARD_TIMEOUT_MS = 240000;  // 240s — server may retry LLM (2×90s) + overhead
const RENDER_TIMEOUT_MS = 120000;      // 120s — HeyGen submission + Supabase cache write
const STATUS_TIMEOUT_MS = 30000;       // 30s for status checks (individual polls)
const POLL_INTERVAL_MS = 5000;         // 5s between polls
const MAX_POLL_ATTEMPTS = 360;         // 30 minutes max — HeyGen Video Agent can take 20+ min

// ============================================================================
// TYPES
// ============================================================================

/** Category IDs from the evaluation system */
type CategoryId = 'personal_freedom' | 'housing_property' | 'business_work' |
  'transportation' | 'policing_legal' | 'speech_lifestyle';

/** Maps internal category IDs to video display names */
const CATEGORY_DISPLAY_NAMES: Record<CategoryId, string> = {
  personal_freedom: 'Personal Autonomy',
  housing_property: 'Housing, Property & HOA Control',
  business_work: 'Business & Work Regulation',
  transportation: 'Transportation & Daily Movement',
  policing_legal: 'Policing, Courts & Enforcement',
  speech_lifestyle: 'Speech, Lifestyle & Culture',
};

/** Winner Package — the input for Stage 1 */
export interface WinnerPackage {
  winning_city_name: string;
  winning_region?: string;
  winning_country: string;
  freedom_score_overall: number;
  category_scores: {
    personal_autonomy: number;
    housing_property_hoa: number;
    business_work: number;
    transportation_movement: number;
    policing_courts: number;
    speech_lifestyle_culture: number;
  };
  top_neighborhoods?: Array<{
    name: string;
    one_liner_reason: string;
    signature_visual: string;
  }>;
  signature_city_highlights?: string[];
  watchouts?: string[];
  executive_summary?: {
    rationale?: string;
    key_factors?: string[];
    future_outlook?: string;
  };
  category_winners?: Record<string, string>;
}

/** State tracked by useCristianoVideo hook */
export interface CristianoVideoState {
  status: 'idle' | 'building_storyboard' | 'storyboard_ready' | 'rendering' |
          'processing' | 'completed' | 'failed';
  storyboard?: Record<string, unknown>;
  heygenVideoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  progress: number;
  error?: string;
  cached?: boolean;
  cityName?: string;
  sceneCount?: number;
  wordCount?: number;
}

// ============================================================================
// WINNER PACKAGE BUILDER
// ============================================================================

/**
 * Extract a Winner Package from existing comparison and judge report data.
 * This maps from the app's internal data structures to the video pipeline format.
 */
export function buildWinnerPackage(params: {
  winnerCity: string;
  winnerCountry: string;
  winnerRegion?: string;
  winnerScore: number;
  /** comparisonResult.cityX.categories array */
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
}): WinnerPackage {
  // Map category scores from internal IDs to video format
  const categoryScores = {
    personal_autonomy: 0,
    housing_property_hoa: 0,
    business_work: 0,
    transportation_movement: 0,
    policing_courts: 0,
    speech_lifestyle_culture: 0,
  };

  if (params.winnerCategories) {
    for (const cat of params.winnerCategories) {
      const score = cat.averageScore ?? 0;
      switch (cat.categoryId) {
        case 'personal_freedom': categoryScores.personal_autonomy = Math.round(score); break;
        case 'housing_property': categoryScores.housing_property_hoa = Math.round(score); break;
        case 'business_work': categoryScores.business_work = Math.round(score); break;
        case 'transportation': categoryScores.transportation_movement = Math.round(score); break;
        case 'policing_legal': categoryScores.policing_courts = Math.round(score); break;
        case 'speech_lifestyle': categoryScores.speech_lifestyle_culture = Math.round(score); break;
      }
    }
  }

  // Map category winners from internal IDs to display names
  const mappedWinners: Record<string, string> = {};
  if (params.categoryWinners) {
    for (const [catId, winner] of Object.entries(params.categoryWinners)) {
      const displayName = CATEGORY_DISPLAY_NAMES[catId as CategoryId];
      if (displayName) {
        mappedWinners[displayName] = winner;
      }
    }
  }

  return {
    winning_city_name: params.winnerCity,
    winning_region: params.winnerRegion,
    winning_country: params.winnerCountry,
    freedom_score_overall: Math.round(params.winnerScore),
    category_scores: categoryScores,
    executive_summary: params.executiveSummary ? {
      rationale: params.executiveSummary.rationale,
      key_factors: params.executiveSummary.keyFactors,
      future_outlook: params.executiveSummary.futureOutlook,
    } : undefined,
    category_winners: Object.keys(mappedWinners).length > 0 ? mappedWinners : undefined,
  };
}

// ============================================================================
// STAGE 1: STORYBOARD BUILDER
// ============================================================================

/**
 * Call the Storyboard Builder API to generate a 9-scene storyboard.
 */
export async function generateStoryboard(
  winnerPackage: WinnerPackage
): Promise<{ storyboard: Record<string, unknown>; qa: Record<string, unknown> }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/cristiano/storyboard',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ winnerPackage }),
    },
    STORYBOARD_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Storyboard generation failed: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.storyboard) {
    throw new Error(data.error || 'Storyboard generation returned no data');
  }

  return { storyboard: data.storyboard, qa: data.qa };
}

// ============================================================================
// STAGE 2: HEYGEN RENDER
// ============================================================================

/**
 * Submit the storyboard to HeyGen Video Agent for rendering.
 */
export async function submitRender(params: {
  storyboard: Record<string, unknown>;
  winnerPackage: WinnerPackage;
  winnerCity: string;
  winnerCountry?: string;
  winnerRegion?: string;
  freedomScore?: number;
}): Promise<{
  cached: boolean;
  video: Record<string, unknown>;
}> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/cristiano/render',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'render',
        storyboard: params.storyboard,
        winnerPackage: params.winnerPackage,
        winnerCity: params.winnerCity,
        winnerCountry: params.winnerCountry,
        winnerRegion: params.winnerRegion,
        freedomScore: params.freedomScore,
      }),
    },
    RENDER_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // Surface validation errors so they're visible in the console
    const detail = error.validationErrors?.length
      ? ` [${error.validationErrors.join('; ')}]`
      : '';
    throw new Error((error.error || `Render submission failed: ${response.status}`) + detail);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Render submission returned no data');
  }

  return { cached: data.cached, video: data.video };
}

/**
 * Check render status via polling.
 */
export async function checkRenderStatus(
  heygenVideoId: string
): Promise<{
  status: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  error?: string;
}> {
  const response = await fetchWithTimeout(
    `/api/cristiano/render?videoId=${encodeURIComponent(heygenVideoId)}`,
    { method: 'GET' },
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
 * Full 2-stage orchestration: build storyboard → submit render → poll until complete.
 */
export async function generateCristianoVideo(
  winnerPackage: WinnerPackage,
  onProgress?: (state: CristianoVideoState) => void
): Promise<CristianoVideoState> {
  try {
    // ── STAGE 1: Build Storyboard ──────────────────────────────────────
    onProgress?.({
      status: 'building_storyboard',
      progress: 5,
      cityName: winnerPackage.winning_city_name,
    });

    console.log('[CristianoVideo] Stage 1: Building storyboard for', winnerPackage.winning_city_name);
    const { storyboard, qa } = await generateStoryboard(winnerPackage);

    console.log('[CristianoVideo] Storyboard ready. QA:', qa);

    onProgress?.({
      status: 'storyboard_ready',
      storyboard,
      progress: 15,
      cityName: winnerPackage.winning_city_name,
    });

    // ── STAGE 2: Submit to HeyGen Video Agent ──────────────────────────
    onProgress?.({
      status: 'rendering',
      storyboard,
      progress: 18,
      cityName: winnerPackage.winning_city_name,
    });

    console.log('[CristianoVideo] Stage 2: Submitting to HeyGen Video Agent');
    const renderResult = await submitRender({
      storyboard,
      winnerPackage,
      winnerCity: winnerPackage.winning_city_name,
      winnerCountry: winnerPackage.winning_country,
      winnerRegion: winnerPackage.winning_region,
      freedomScore: winnerPackage.freedom_score_overall,
    });

    // Cache hit — video already exists
    if (renderResult.cached) {
      console.log('[CristianoVideo] Cache hit!');
      const completedState: CristianoVideoState = {
        status: 'completed',
        videoUrl: renderResult.video.videoUrl as string,
        thumbnailUrl: renderResult.video.thumbnailUrl as string | undefined,
        durationSeconds: renderResult.video.durationSeconds as number | undefined,
        progress: 100,
        cached: true,
        cityName: winnerPackage.winning_city_name,
        sceneCount: renderResult.video.sceneCount as number | undefined,
        wordCount: renderResult.video.wordCount as number | undefined,
      };
      onProgress?.(completedState);
      return completedState;
    }

    // In-progress from another user
    const heygenVideoId = renderResult.video.heygenVideoId as string;
    if (!heygenVideoId) {
      throw new Error('No HeyGen video ID returned from render');
    }

    // ── POLL UNTIL COMPLETE ────────────────────────────────────────────
    onProgress?.({
      status: 'rendering',
      heygenVideoId,
      storyboard,
      progress: 20,
      cityName: winnerPackage.winning_city_name,
      sceneCount: renderResult.video.sceneCount as number | undefined,
      wordCount: renderResult.video.wordCount as number | undefined,
    });

    let attempts = 0;
    let consecutiveErrors = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      try {
        const status = await checkRenderStatus(heygenVideoId);
        consecutiveErrors = 0;

        const progressPct = status.status === 'completed'
          ? 100
          : status.status === 'processing'
          ? Math.min(25 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 65), 90)
          : Math.min(20 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 10), 30);

        const state: CristianoVideoState = {
          status: status.status === 'completed' ? 'completed'
            : status.status === 'failed' ? 'failed'
            : status.status === 'processing' ? 'processing'
            : 'rendering',
          heygenVideoId,
          storyboard,
          videoUrl: status.videoUrl,
          thumbnailUrl: status.thumbnailUrl,
          durationSeconds: status.durationSeconds,
          progress: progressPct,
          // FIX 2026-02-14: HeyGen may return error as an object — stringify to prevent React error #31
          error: typeof status.error === 'string' ? status.error
            : status.error ? JSON.stringify(status.error) : undefined,
          cityName: winnerPackage.winning_city_name,
          sceneCount: renderResult.video.sceneCount as number | undefined,
          wordCount: renderResult.video.wordCount as number | undefined,
        };

        onProgress?.(state);

        if (status.status === 'completed') {
          console.log('[CristianoVideo] Completed:', status.videoUrl);
          return state;
        }

        if (status.status === 'failed') {
          console.error('[CristianoVideo] Failed:', status.error);
          const errMsg = typeof status.error === 'string' ? status.error
            : status.error ? JSON.stringify(status.error) : 'Video rendering failed';
          return {
            ...state,
            status: 'failed',
            error: errMsg,
          };
        }
      } catch (err) {
        consecutiveErrors++;
        console.warn('[CristianoVideo] Poll error (attempt', attempts + 1, '):', err);

        if (consecutiveErrors > 10) {
          const errorMsg = err instanceof Error ? err.message : 'Polling failed';
          return {
            status: 'failed',
            heygenVideoId,
            progress: 0,
            error: `Lost connection: ${errorMsg}`,
            cityName: winnerPackage.winning_city_name,
          };
        }
      }

      await sleep(POLL_INTERVAL_MS);
      attempts++;
    }

    // Timed out
    return {
      status: 'failed',
      heygenVideoId,
      progress: 0,
      error: `Video rendering timed out after ${Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000)} minutes`,
      cityName: winnerPackage.winning_city_name,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Video generation failed';
    console.error('[CristianoVideo] Error:', errorMsg);

    const errorState: CristianoVideoState = {
      status: 'failed',
      progress: 0,
      error: errorMsg,
      cityName: winnerPackage.winning_city_name,
    };

    onProgress?.(errorState);
    return errorState;
  }
}
