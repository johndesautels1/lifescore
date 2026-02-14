/**
 * LIFE SCORE - Cristiano "Go To My New City" Video Service
 *
 * Generates multi-scene narration scripts for Cristiano's HeyGen video
 * and orchestrates video generation with polling.
 *
 * Scene Structure (5 scenes with different backgrounds):
 *   Scene A (intro)     - Welcome to your winning city
 *   Scene B (verdict)   - Verdict recap and scores
 *   Scene C (category)  - Key category highlights
 *   Scene D (lifestyle) - What your new life looks like
 *   Scene E (action)    - Getting started / next steps
 *
 * Data comes from the already-generated judge report and comparison result.
 * No additional LLM calls needed.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { getAuthHeaders } from '../lib/supabase';
import { detectCityType } from './grokVideoService';
import type { CityType } from '../types/grokVideo';

// ============================================================================
// CONSTANTS
// ============================================================================

const POLL_INTERVAL_MS = 5000;       // 5 seconds between status checks
const MAX_POLL_ATTEMPTS = 120;       // 10 minutes total
const API_TIMEOUT_MS = 60000;        // 60 seconds for submission
const STATUS_TIMEOUT_MS = 30000;     // 30 seconds for status checks

// ============================================================================
// TYPES
// ============================================================================

export interface CristianoVideoScene {
  sceneType: 'intro' | 'verdict' | 'category' | 'lifestyle' | 'action';
  narration: string;
  title?: string;
}

export interface CristianoScriptInput {
  winnerCity: string;
  loserCity: string;
  winnerScore: number;
  loserScore: number;
  winnerCountry?: string;
  // Category data
  categoryWinners?: Record<string, string>;
  categoryScores?: Record<string, { winner: number; loser: number }>;
  // Judge report data
  executiveSummary?: {
    rationale?: string;
    keyFactors?: string[];
    futureOutlook?: string;
  };
}

export interface CristianoVideoState {
  status: 'idle' | 'generating' | 'processing' | 'completed' | 'failed';
  videoId?: string;
  heygenVideoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  progress: number;
  error?: string;
  cached?: boolean;
  cityName?: string;
  sceneCount?: number;
}

// ============================================================================
// CATEGORY DISPLAY NAMES
// ============================================================================

const CATEGORY_NAMES: Record<string, string> = {
  personal_freedom: 'Personal Autonomy',
  housing_property: 'Housing & Property',
  business_work: 'Business & Work',
  transportation: 'Transportation',
  policing_legal: 'Policing & Courts',
  speech_lifestyle: 'Speech & Lifestyle',
};

// ============================================================================
// CITY-TYPE LIFESTYLE DESCRIPTIONS
// ============================================================================

function getLifestyleDescription(cityName: string, cityType: CityType): string {
  const descriptions: Record<CityType, string> = {
    beach: `Imagine waking up to the sound of waves in ${cityName}. Morning walks on the beach, seafood for lunch, and sunsets that paint the sky in gold. This is a place where freedom means sand between your toes and salt in the air.`,
    mountain: `Picture yourself in ${cityName}, surrounded by majestic peaks and crisp mountain air. Hiking trails at your doorstep, cozy evenings by the fire, and a community that values independence and self-reliance.`,
    urban: `Welcome to the energy of ${cityName}. A city that never stops, with world-class dining, cultural diversity, and opportunity around every corner. Here, freedom means having the world at your fingertips.`,
    desert: `${cityName} offers a unique kind of freedom: wide open spaces, dramatic landscapes, and a pioneering spirit. The desert teaches you that less regulation means more room to breathe and build.`,
    european: `${cityName} brings old-world charm with modern freedoms. Cobblestone streets, sidewalk cafes, and a rich cultural tapestry. Here, quality of life is measured in experiences, not regulations.`,
    tropical: `${cityName} is a tropical paradise where freedom takes on a whole new meaning. Lush greenery, warm breezes, and a laid-back lifestyle that lets you focus on what truly matters.`,
    general: `${cityName} offers a lifestyle that balances opportunity with personal freedom. A place where you can build the life you want, on your own terms, without unnecessary barriers.`,
  };

  return descriptions[cityType] || descriptions.general;
}

// ============================================================================
// SCRIPT GENERATION
// ============================================================================

/**
 * Generate multi-scene presentation script from comparison data.
 * No API call needed - built entirely from existing data.
 */
export function generateCristianoScript(input: CristianoScriptInput): CristianoVideoScene[] {
  const {
    winnerCity,
    loserCity,
    winnerScore,
    loserScore,
    categoryWinners,
    categoryScores,
    executiveSummary,
  } = input;

  const diff = Math.round(winnerScore - loserScore);
  const cityType = detectCityType(winnerCity);
  const scenes: CristianoVideoScene[] = [];

  // ── SCENE A: Introduction ─────────────────────────────────────────────
  scenes.push({
    sceneType: 'intro',
    title: 'Welcome',
    narration: `Welcome. I'm Cristiano, and I have an important announcement for you. After a comprehensive analysis of one hundred freedom metrics across six categories of daily life, the verdict is in. Your new city has been determined. Let me take you on a journey to ${winnerCity}, the city that earned the highest LIFE SCORE in your comparison.`,
  });

  // ── SCENE B: Verdict Recap ────────────────────────────────────────────
  let verdictNarration: string;
  if (diff < 5) {
    verdictNarration = `In a very close verdict, ${winnerCity} edged out ${loserCity} with a LIFE SCORE of ${Math.round(winnerScore)} compared to ${Math.round(loserScore)}. While the overall difference of just ${diff} points shows these cities are remarkably similar, the details tell a deeper story.`;
  } else if (diff < 15) {
    verdictNarration = `${winnerCity} has been declared the winner with a LIFE SCORE of ${Math.round(winnerScore)}, compared to ${Math.round(loserScore)} for ${loserCity}. That is a meaningful ${diff} point advantage, indicating a noticeable difference in personal freedom between these two cities.`;
  } else {
    verdictNarration = `The verdict is decisive. ${winnerCity} leads with a commanding LIFE SCORE of ${Math.round(winnerScore)}, while ${loserCity} scored ${Math.round(loserScore)}. That is a significant ${diff} point gap, representing a substantial difference in how much freedom you will experience in your daily life.`;
  }

  scenes.push({
    sceneType: 'verdict',
    title: 'The Verdict',
    narration: verdictNarration,
  });

  // ── SCENE C: Category Highlights ──────────────────────────────────────
  let categoryNarration = '';

  if (categoryWinners && categoryScores) {
    // Find the categories where winner city dominated most
    const strongWins = Object.entries(categoryScores)
      .filter(([catId]) => categoryWinners[catId] === 'city1' || categoryWinners[catId] === 'city2')
      .sort(([, a], [, b]) => Math.abs(b.winner - b.loser) - Math.abs(a.winner - a.loser))
      .slice(0, 3);

    if (strongWins.length > 0) {
      const highlights = strongWins.map(([catId, scores]) => {
        const catName = CATEGORY_NAMES[catId] || catId;
        return `${catName} where ${winnerCity} scored ${Math.round(scores.winner)} versus ${Math.round(scores.loser)}`;
      });

      categoryNarration = `Let me highlight the categories that really set ${winnerCity} apart. The strongest advantages were in ${highlights.join(', and ')}. These are the areas of daily life where you will feel the most tangible difference in personal freedom.`;
    }
  }

  if (!categoryNarration) {
    categoryNarration = `${winnerCity} demonstrated advantages across multiple categories of daily life regulation. From personal autonomy to business freedom, from transportation to policing and courts, the data consistently favored ${winnerCity} as the city offering more measurable freedom in your daily life.`;
  }

  scenes.push({
    sceneType: 'category',
    title: 'Key Advantages',
    narration: categoryNarration,
  });

  // ── SCENE D: Your New Life ────────────────────────────────────────────
  const lifestyleBase = getLifestyleDescription(winnerCity, cityType);

  let lifestyleNarration = lifestyleBase;
  if (executiveSummary?.futureOutlook) {
    // Trim outlook to a reasonable length for video
    const outlook = executiveSummary.futureOutlook.length > 200
      ? executiveSummary.futureOutlook.substring(0, 200).replace(/[^.]*$/, '')
      : executiveSummary.futureOutlook;
    if (outlook) {
      lifestyleNarration += ` Looking ahead, ${outlook}`;
    }
  }

  scenes.push({
    sceneType: 'lifestyle',
    title: 'Your New Life',
    narration: lifestyleNarration,
  });

  // ── SCENE E: Getting Started ──────────────────────────────────────────
  scenes.push({
    sceneType: 'action',
    title: 'Your Next Steps',
    narration: `This is not just a score on a screen. This is your life, your freedom, your future. ${winnerCity} is waiting for you. Download your full LIFE SCORE report, share it with the people who matter, and start planning your move to a city that respects your autonomy. The court has spoken. Your new life begins now. I am Cristiano, and on behalf of LIFE SCORE, I wish you freedom in every step you take.`,
  });

  return scenes;
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Submit Cristiano video generation to the API
 */
export async function submitCristianoVideo(
  scenes: CristianoVideoScene[],
  params: {
    winnerCity: string;
    loserCity?: string;
    winnerScore?: number;
    loserScore?: number;
    title?: string;
  }
): Promise<{ videoId?: string; heygenVideoId?: string; cached?: boolean; video?: CristianoVideoState }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetchWithTimeout(
    '/api/cristiano/avatar/heygen-video',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        action: 'generate',
        scenes,
        winnerCity: params.winnerCity,
        loserCity: params.loserCity,
        winnerScore: params.winnerScore,
        loserScore: params.loserScore,
        title: params.title || `LIFE SCORE: Go To ${params.winnerCity}`,
      }),
    },
    API_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Cristiano video generation failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.cached && data.video) {
    return {
      cached: true,
      video: {
        status: 'completed',
        videoUrl: data.video.videoUrl,
        thumbnailUrl: data.video.thumbnailUrl,
        durationSeconds: data.video.durationSeconds,
        progress: 100,
        cached: true,
        cityName: data.video.cityName,
        sceneCount: data.video.sceneCount,
      },
    };
  }

  return {
    videoId: data.video?.id,
    heygenVideoId: data.video?.heygenVideoId,
    cached: false,
  };
}

/**
 * Check Cristiano video generation status
 */
export async function checkCristianoVideoStatus(
  heygenVideoId: string
): Promise<{
  status: 'generating' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  error?: string;
}> {
  const response = await fetchWithTimeout(
    `/api/cristiano/avatar/heygen-video?videoId=${encodeURIComponent(heygenVideoId)}`,
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
// ORCHESTRATION
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Full orchestration: generate script, submit, poll until complete.
 */
export async function generateCristianoVideo(
  input: CristianoScriptInput,
  onProgress?: (state: CristianoVideoState) => void
): Promise<CristianoVideoState> {
  try {
    // 1. Generate multi-scene script
    onProgress?.({
      status: 'generating',
      progress: 2,
      cityName: input.winnerCity,
    });

    const scenes = generateCristianoScript(input);
    console.log('[CristianoVideo] Script generated:', scenes.length, 'scenes');

    // 2. Submit to API (checks cache internally)
    onProgress?.({
      status: 'generating',
      progress: 5,
      cityName: input.winnerCity,
      sceneCount: scenes.length,
    });

    const result = await submitCristianoVideo(scenes, {
      winnerCity: input.winnerCity,
      loserCity: input.loserCity,
      winnerScore: input.winnerScore,
      loserScore: input.loserScore,
    });

    // Cache hit
    if (result.cached && result.video) {
      console.log('[CristianoVideo] Cache hit for:', input.winnerCity);
      onProgress?.(result.video);
      return result.video;
    }

    if (!result.heygenVideoId) {
      throw new Error('No HeyGen video ID returned');
    }

    // 3. Poll until complete
    onProgress?.({
      status: 'generating',
      heygenVideoId: result.heygenVideoId,
      progress: 8,
      cityName: input.winnerCity,
      sceneCount: scenes.length,
    });

    let attempts = 0;
    let consecutiveErrors = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      try {
        const status = await checkCristianoVideoStatus(result.heygenVideoId);
        consecutiveErrors = 0;

        const state: CristianoVideoState = {
          status: status.status === 'completed' ? 'completed'
            : status.status === 'failed' ? 'failed'
            : status.status === 'processing' ? 'processing'
            : 'generating',
          heygenVideoId: result.heygenVideoId,
          videoUrl: status.videoUrl,
          thumbnailUrl: status.thumbnailUrl,
          durationSeconds: status.durationSeconds,
          progress: status.status === 'completed'
            ? 100
            : status.status === 'processing'
            ? Math.min(20 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 70), 90)
            : Math.min(5 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 15), 20),
          error: status.error,
          cityName: input.winnerCity,
          sceneCount: scenes.length,
        };

        onProgress?.(state);

        if (status.status === 'completed') {
          console.log('[CristianoVideo] Completed:', status.videoUrl);
          return state;
        }

        if (status.status === 'failed') {
          console.error('[CristianoVideo] Failed:', status.error);
          return {
            ...state,
            status: 'failed',
            error: status.error || 'Video generation failed',
          };
        }
      } catch (err) {
        consecutiveErrors++;
        console.warn('[CristianoVideo] Poll error (attempt', attempts + 1, '):', err);

        if (consecutiveErrors > 10) {
          const errorMsg = err instanceof Error ? err.message : 'Polling failed';
          return {
            status: 'failed',
            heygenVideoId: result.heygenVideoId,
            progress: 0,
            error: `Lost connection: ${errorMsg}`,
            cityName: input.winnerCity,
          };
        }
      }

      await sleep(POLL_INTERVAL_MS);
      attempts++;
    }

    // Timed out
    return {
      status: 'failed',
      heygenVideoId: result.heygenVideoId,
      progress: 0,
      error: `Video generation timed out after ${Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000)} minutes`,
      cityName: input.winnerCity,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Video generation failed';
    console.error('[CristianoVideo] Error:', errorMsg);

    const errorState: CristianoVideoState = {
      status: 'failed',
      progress: 0,
      error: errorMsg,
      cityName: input.winnerCity,
    };

    onProgress?.(errorState);
    return errorState;
  }
}
