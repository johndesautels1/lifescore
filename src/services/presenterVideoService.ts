/**
 * LIFE SCORE™ Presenter Video Service
 * Orchestrates HeyGen video generation from comparison data.
 *
 * Flow:
 *   1. Generate narration script from presenterService
 *   2. Concatenate segments into a single script
 *   3. Submit to HeyGen via oliviaService.generateHeyGenVideo()
 *   4. Poll via oliviaService.checkHeyGenVideoStatus()
 *   5. Return video URL for playback/download
 *
 * Polling pattern matches gammaService.ts:
 *   - 5 second intervals
 *   - Max 120 attempts (10 minutes - video rendering takes longer than reports)
 *   - Progress callback for UI updates
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { generatePresentationScript } from './presenterService';
import { generateHeyGenVideo, checkHeyGenVideoStatus } from './oliviaService';
import type { AnyComparisonResult } from './gammaService';
import type { VideoGenerationState } from '../types/presenter';

// ============================================================================
// CONSTANTS
// ============================================================================

const POLL_INTERVAL_MS = 5000;       // 5 seconds between status checks
const MAX_POLL_ATTEMPTS = 120;       // 10 minutes total (video rendering is slow)

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Concatenate presentation segments into a single narration script.
 * Adds double newlines between segments for natural pause points.
 */
function buildFullScript(result: AnyComparisonResult): { script: string; title: string } {
  const presentation = generatePresentationScript(result);

  const script = presentation.segments
    .map((seg) => seg.narration)
    .join('\n\n');

  const title = `LIFE SCORE: ${presentation.city1} vs ${presentation.city2}`;

  return { script, title };
}

// ============================================================================
// POLLING
// ============================================================================

/**
 * Poll HeyGen video status until completed or failed.
 * Follows the same pattern as gammaService.pollUntilComplete().
 */
async function pollVideoUntilComplete(
  videoId: string,
  onProgress?: (state: VideoGenerationState) => void
): Promise<VideoGenerationState> {
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    try {
      const status = await checkHeyGenVideoStatus(videoId);

      // Map to our state type
      const state: VideoGenerationState = {
        status: status.status,
        videoId: status.videoId,
        videoUrl: status.videoUrl,
        thumbnailUrl: status.thumbnailUrl,
        durationSeconds: status.durationSeconds,
        progress: status.status === 'completed'
          ? 100
          : status.status === 'processing'
          ? Math.min(20 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 70), 90)
          : Math.min(5 + Math.round((attempts / MAX_POLL_ATTEMPTS) * 15), 20),
        error: status.error,
      };

      onProgress?.(state);

      if (status.status === 'completed') {
        return state;
      }

      if (status.status === 'failed') {
        return {
          ...state,
          status: 'failed',
          error: status.error || 'Video generation failed',
        };
      }
    } catch (err) {
      // Network errors during polling are recoverable - keep trying
      console.warn('[PresenterVideo] Poll error (attempt', attempts + 1, '):', err);

      // If we've had many consecutive failures, give up
      if (attempts > 10) {
        const errorMsg = err instanceof Error ? err.message : 'Polling failed';
        return {
          status: 'failed',
          videoId,
          progress: 0,
          error: `Lost connection to HeyGen: ${errorMsg}`,
        };
      }
    }

    await sleep(POLL_INTERVAL_MS);
    attempts++;
  }

  // Timed out
  return {
    status: 'failed',
    videoId,
    progress: 0,
    error: `Video generation timed out after ${Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000)} minutes`,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a presenter video from comparison data.
 * Full orchestration: script → HeyGen submit → poll → return video URL.
 */
export async function generatePresenterVideo(
  result: AnyComparisonResult,
  onProgress?: (state: VideoGenerationState) => void
): Promise<VideoGenerationState> {
  try {
    // 1. Build the narration script
    onProgress?.({
      status: 'generating',
      progress: 2,
    });

    const { script, title } = buildFullScript(result);
    console.log('[PresenterVideo] Script generated:', script.length, 'chars,', title);

    // 2. Submit to HeyGen
    onProgress?.({
      status: 'generating',
      progress: 5,
    });

    const { videoId } = await generateHeyGenVideo(script, { title });
    console.log('[PresenterVideo] Submitted to HeyGen:', videoId);

    onProgress?.({
      status: 'generating',
      videoId,
      progress: 8,
    });

    // 3. Poll until complete
    const finalState = await pollVideoUntilComplete(videoId, onProgress);

    console.log('[PresenterVideo] Final status:', finalState.status, finalState.videoUrl ? '(has URL)' : '(no URL)');

    return finalState;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Video generation failed';
    console.error('[PresenterVideo] Error:', errorMsg);

    const errorState: VideoGenerationState = {
      status: 'failed',
      progress: 0,
      error: errorMsg,
    };

    onProgress?.(errorState);
    return errorState;
  }
}

/**
 * Check the status of an existing video generation.
 * For resuming polling after page refresh.
 */
export async function checkExistingVideo(
  videoId: string
): Promise<VideoGenerationState> {
  try {
    const status = await checkHeyGenVideoStatus(videoId);
    return {
      status: status.status,
      videoId: status.videoId,
      videoUrl: status.videoUrl,
      thumbnailUrl: status.thumbnailUrl,
      durationSeconds: status.durationSeconds,
      progress: status.status === 'completed' ? 100 : 50,
      error: status.error,
    };
  } catch (err) {
    return {
      status: 'failed',
      videoId,
      progress: 0,
      error: err instanceof Error ? err.message : 'Status check failed',
    };
  }
}
