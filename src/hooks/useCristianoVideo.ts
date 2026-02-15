/**
 * LIFE SCORE - useCristianoVideo Hook
 *
 * React hook for the "Go To My New City" 2-stage video pipeline.
 * Manages state for storyboard generation → HeyGen Video Agent render → polling.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef } from 'react';
import {
  generateCristianoVideo,
  type WinnerPackage,
  type CristianoVideoState,
} from '../services/cristianoVideoService';

const INITIAL_STATE: CristianoVideoState = {
  status: 'idle',
  progress: 0,
};

export function useCristianoVideo() {
  const [state, setState] = useState<CristianoVideoState>(INITIAL_STATE);
  const abortRef = useRef(false);

  const generate = useCallback(async (winnerPackage: WinnerPackage) => {
    abortRef.current = false;

    setState({
      status: 'building_storyboard',
      progress: 2,
      cityName: winnerPackage.winning_city_name,
    });

    const result = await generateCristianoVideo(winnerPackage, (progressState) => {
      if (!abortRef.current) {
        setState(progressState);
      }
    });

    if (!abortRef.current) {
      setState(result);
    }

    return result;
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setState(INITIAL_STATE);
  }, []);

  return {
    // State
    status: state.status,
    isGenerating: state.status === 'building_storyboard' || state.status === 'rendering' || state.status === 'processing',
    isStoryboardReady: state.status === 'storyboard_ready',
    isReady: state.status === 'completed',
    isFailed: state.status === 'failed',
    videoUrl: state.videoUrl,
    thumbnailUrl: state.thumbnailUrl,
    durationSeconds: state.durationSeconds,
    progress: state.progress,
    error: state.error,
    cached: state.cached,
    storyboard: state.storyboard,
    sceneCount: state.sceneCount,
    wordCount: state.wordCount,

    // Actions
    generate,
    reset,
  };
}
