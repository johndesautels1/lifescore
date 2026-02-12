/**
 * LIFE SCORE - Grok Video Service
 * Client-side API wrapper for Grok Imagine video generation
 * with Replicate fallback support.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type {
  GrokVideo,
  GrokVideoPair,
  GenerateNewLifeVideosRequest,
  GenerateNewLifeVideosResponse,
  GenerateCourtOrderVideoRequest,
  GenerateCourtOrderVideoResponse,
  GrokVideoStatusResponse,
  CityType,
} from '../types/grokVideo';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

// ============================================================================
// CONSTANTS
// ============================================================================

const VIDEO_GENERATE_TIMEOUT = 120000; // 2 minutes for initial submission
const VIDEO_STATUS_TIMEOUT = 30000; // 30 seconds for status checks
const POLL_INTERVAL = 3000; // 3 seconds between polls

// ============================================================================
// CITY TYPE DETECTION
// ============================================================================

/**
 * Detect city type from city name for prompt selection
 */
export function detectCityType(cityName: string): CityType {
  const nameLower = cityName.toLowerCase();

  // Import keywords from types (re-defined here to avoid circular deps)
  const keywords = {
    beach: ['beach', 'coast', 'ocean', 'shore', 'tropical', 'island', 'bay', 'harbor', 'pier', 'seaside', 'miami', 'san diego', 'honolulu', 'santa monica', 'malibu'],
    mountain: ['mountain', 'alpine', 'ski', 'elevation', 'rocky', 'peak', 'summit', 'valley', 'highland', 'denver', 'boulder', 'aspen', 'vail', 'park city', 'salt lake'],
    urban: ['downtown', 'metro', 'city center', 'skyline', 'metropolitan', 'urban', 'midtown', 'new york', 'chicago', 'los angeles', 'san francisco', 'seattle', 'boston'],
    desert: ['desert', 'arid', 'southwest', 'canyon', 'mesa', 'dry', 'phoenix', 'vegas', 'tucson', 'scottsdale', 'albuquerque', 'sedona'],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => nameLower.includes(word))) {
      return type as CityType;
    }
  }

  return 'general';
}

// ============================================================================
// NEW LIFE VIDEOS API (Winner vs Loser)
// ============================================================================

/**
 * Generate "See Your New Life" videos for winner and loser cities
 * This is a single API call that generates both videos as a pair
 */
export async function generateNewLifeVideos(
  request: GenerateNewLifeVideosRequest
): Promise<GenerateNewLifeVideosResponse> {
  // Auto-detect city types if not provided
  const requestWithTypes: GenerateNewLifeVideosRequest & { forceRegenerate?: boolean } = {
    ...request,
    winnerCityType: request.winnerCityType || detectCityType(request.winnerCity),
    loserCityType: request.loserCityType || detectCityType(request.loserCity),
  };

  // Pass through forceRegenerate if set
  if (request.forceRegenerate) {
    requestWithTypes.forceRegenerate = true;
  }

  const response = await fetchWithTimeout(
    '/api/video/grok-generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'new_life_videos',
        ...requestWithTypes,
      }),
    },
    VIDEO_GENERATE_TIMEOUT
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to generate videos: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// COURT ORDER VIDEO API (Perfect Life)
// ============================================================================

/**
 * Generate "Court Order" perfect life video for winning city
 */
export async function generateCourtOrderVideo(
  request: GenerateCourtOrderVideoRequest
): Promise<GenerateCourtOrderVideoResponse> {
  // Auto-detect city type if not provided
  const requestWithType: GenerateCourtOrderVideoRequest = {
    ...request,
    cityType: request.cityType || detectCityType(request.winnerCity),
  };

  const response = await fetchWithTimeout(
    '/api/video/grok-generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'court_order_video',
        ...requestWithType,
      }),
    },
    VIDEO_GENERATE_TIMEOUT
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to generate court order video: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// VIDEO STATUS API
// ============================================================================

/**
 * Check status of a video generation
 */
export async function checkVideoStatus(
  videoId: string,
  predictionId?: string
): Promise<GrokVideoStatusResponse> {
  const params = new URLSearchParams({ videoId });
  if (predictionId) {
    params.append('predictionId', predictionId);
  }

  const response = await fetchWithTimeout(
    `/api/video/grok-status?${params.toString()}`,
    { method: 'GET' },
    VIDEO_STATUS_TIMEOUT
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to check video status: ${response.status}`);
  }

  return response.json();
}

/**
 * Check status of a video pair (winner + loser)
 */
export async function checkVideoPairStatus(
  winnerVideoId: string,
  loserVideoId: string
): Promise<{ winner: GrokVideoStatusResponse; loser: GrokVideoStatusResponse }> {
  // Check loser first, then winner (matches sequential generation order)
  const [loserStatus, winnerStatus] = await Promise.all([
    checkVideoStatus(loserVideoId),
    checkVideoStatus(winnerVideoId),
  ]);

  return { winner: winnerStatus, loser: loserStatus };
}

// ============================================================================
// POLLING HELPERS
// ============================================================================

/**
 * Poll for video completion
 * @returns Promise that resolves when video is complete or fails
 */
export async function pollVideoUntilComplete(
  videoId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 60 // 3 minutes max
): Promise<GrokVideo> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await checkVideoStatus(videoId);

    if (!result.success || !result.video) {
      throw new Error(result.error || 'Failed to get video status');
    }

    const { video } = result;

    if (video.status === 'completed') {
      return video;
    }

    if (video.status === 'failed') {
      throw new Error(video.errorMessage || 'Video generation failed');
    }

    // Report progress
    if (onProgress) {
      onProgress(`Processing... ${Math.round((attempts / maxAttempts) * 100)}%`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    attempts++;
  }

  throw new Error('Video generation timed out');
}

/**
 * Poll for video pair completion (both winner and loser)
 */
export async function pollVideoPairUntilComplete(
  winnerVideoId: string,
  loserVideoId: string,
  onProgress?: (status: string) => void,
  maxAttempts: number = 60
): Promise<GrokVideoPair> {
  let attempts = 0;
  let winnerComplete = false;
  let loserComplete = false;
  let winnerVideo: GrokVideo | null = null;
  let loserVideo: GrokVideo | null = null;

  while (attempts < maxAttempts && (!winnerComplete || !loserComplete)) {
    // Check loser first, then winner (matches sequential generation order)
    const [loserResult, winnerResult] = await Promise.all([
      !loserComplete ? checkVideoStatus(loserVideoId) : Promise.resolve(null),
      !winnerComplete ? checkVideoStatus(winnerVideoId) : Promise.resolve(null),
    ]);

    // Check loser status (generated first)
    if (loserResult?.video) {
      if (loserResult.video.status === 'completed') {
        loserComplete = true;
        loserVideo = loserResult.video;
      } else if (loserResult.video.status === 'failed') {
        throw new Error(`Loser video failed: ${loserResult.video.errorMessage}`);
      }
    }

    // Check winner status (generated second)
    if (winnerResult?.video) {
      if (winnerResult.video.status === 'completed') {
        winnerComplete = true;
        winnerVideo = winnerResult.video;
      } else if (winnerResult.video.status === 'failed') {
        throw new Error(`Winner video failed: ${winnerResult.video.errorMessage}`);
      }
    }

    // Report progress
    if (onProgress) {
      const progress = ((winnerComplete ? 1 : 0) + (loserComplete ? 1 : 0)) / 2;
      onProgress(`Generating videos... ${Math.round(progress * 100)}%`);
    }

    if (!winnerComplete || !loserComplete) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      attempts++;
    }
  }

  if (!winnerComplete || !loserComplete) {
    throw new Error('Video pair generation timed out');
  }

  return { winner: winnerVideo, loser: loserVideo };
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Check if videos exist in cache for given cities
 * This allows reusing videos across users
 */
export async function checkCachedVideos(
  city1: string,
  city2: string,
  videoType: 'new_life' | 'court_order'
): Promise<{
  hasCached: boolean;
  videos?: GrokVideoPair | GrokVideo;
}> {
  const response = await fetchWithTimeout(
    '/api/video/grok-status',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'check_cache',
        city1,
        city2,
        videoType,
      }),
    },
    VIDEO_STATUS_TIMEOUT
  );

  if (!response.ok) {
    return { hasCached: false };
  }

  const result = await response.json();
  return {
    hasCached: result.hasCached || false,
    videos: result.videos,
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Check if error is recoverable (retry-able)
 */
export function isRecoverableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('rate limit') ||
    message.includes('503') ||
    message.includes('502')
  );
}

/**
 * Get user-friendly error message
 */
export function getVideoErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) {
    return 'Video generation timed out. Please try again.';
  }
  if (message.includes('network')) {
    return 'Network error. Please check your connection.';
  }
  if (message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment.';
  }
  if (message.includes('quota') || message.includes('limit')) {
    return 'Video generation limit reached. Upgrade to Sovereign for more.';
  }
  if (message.includes('failed')) {
    return 'Video generation failed. Please try again.';
  }

  return error.message || 'Something went wrong with video generation.';
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

/**
 * Generate video prompt for a city based on type and mood
 */
export function generateVideoPrompt(
  cityName: string,
  videoType: 'winner_mood' | 'loser_mood' | 'perfect_life',
  cityType: CityType = 'general'
): string {
  const templates = {
    winner_mood: `Happy person enjoying freedom in ${cityName}. Sunny day, relaxed atmosphere, minimal government presence, people freely going about their business, vibrant local economy, low stress environment. 8 seconds, cinematic quality.`,

    loser_mood: `Stressed person in ${cityName} overwhelmed by regulations. Government buildings, bureaucratic offices, long lines, paperwork piling up, frustrated citizens, heavy tax burden visible, restricted freedoms. 8 seconds, cinematic quality.`,

    perfect_life: {
      beach: `Crystal white sand beach at golden hour sunset, gentle waves crashing, palm trees swaying, person relaxing in paradise, ${cityName} coastline, ultimate freedom and peace. 10 seconds, cinematic 4K quality.`,
      mountain: `Cozy cabin overlooking lush green valley and pristine lake, person enjoying hot chocolate on deck, snow-capped peaks in distance, ${cityName} mountain serenity, fresh air and freedom. 10 seconds, cinematic 4K quality.`,
      urban: `Rooftop bar at sunset overlooking ${cityName} skyline, person toasting to success, city lights beginning to glow, vibrant nightlife energy, cosmopolitan freedom and opportunity. 10 seconds, cinematic 4K quality.`,
      desert: `Desert sunset with dramatic red rock formations near ${cityName}, person on scenic overlook, wide open spaces, endless horizon, ultimate freedom and adventure. 10 seconds, cinematic 4K quality.`,
      general: `Beautiful scenic view of ${cityName} at golden hour, person enjoying the moment of freedom and new beginnings, peaceful atmosphere, cinematic quality. 10 seconds.`,
    },
  };

  if (videoType === 'perfect_life') {
    return templates.perfect_life[cityType] || templates.perfect_life.general;
  }

  return templates[videoType];
}
