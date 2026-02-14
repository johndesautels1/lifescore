/**
 * LIFE SCORE - useCristianoVideo Hook
 *
 * React hook for generating and managing Cristiano "Go To My New City"
 * HeyGen videos. Multi-scene avatar video with city-specific scenery.
 *
 * Sovereign plan only, 1 video/month per user.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CristianoVideoState, CristianoScriptInput } from '../services/cristianoVideoService';
import { generateCristianoVideo } from '../services/cristianoVideoService';

export function useCristianoVideo() {
  const [state, setState] = useState<CristianoVideoState>({
    status: 'idle',
    progress: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Track active generation to prevent stale updates
  const generationIdRef = useRef<number>(0);
  const abortRef = useRef<boolean>(false);

  const isGenerating = state.status === 'generating' || state.status === 'processing';
  const isReady = state.status === 'completed' && !!state.videoUrl;

  // Reset state
  const reset = useCallback(() => {
    generationIdRef.current += 1;
    abortRef.current = true;
    setState({ status: 'idle', progress: 0 });
    setError(null);
  }, []);

  // Generate video
  const generate = useCallback(async (input: CristianoScriptInput) => {
    generationIdRef.current += 1;
    const myGenerationId = generationIdRef.current;
    abortRef.current = false;

    setState({ status: 'generating', progress: 0, cityName: input.winnerCity });
    setError(null);

    try {
      console.log('[useCristianoVideo] Starting generation for:', input.winnerCity, 'genId:', myGenerationId);

      const result = await generateCristianoVideo(input, (progressState) => {
        // Only update if this is still the active generation
        if (generationIdRef.current !== myGenerationId || abortRef.current) {
          return;
        }
        setState(progressState);
        if (progressState.error) {
          setError(progressState.error);
        }
      });

      // Final check
      if (generationIdRef.current !== myGenerationId || abortRef.current) {
        console.log('[useCristianoVideo] Generation cancelled, ignoring result');
        return;
      }

      setState(result);
      if (result.error) {
        setError(result.error);
      }

      if (result.status === 'completed') {
        console.log('[useCristianoVideo] Video ready:', result.videoUrl);
      }
    } catch (err) {
      if (generationIdRef.current !== myGenerationId || abortRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Video generation failed';
      console.error('[useCristianoVideo] Error:', message);
      setError(message);
      setState({ status: 'failed', progress: 0, error: message, cityName: input.winnerCity });
    }
  }, []);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return {
    state,
    isGenerating,
    isReady,
    error,
    generate,
    reset,
    videoUrl: state.videoUrl,
    thumbnailUrl: state.thumbnailUrl,
    progress: state.progress,
    status: state.status,
    cached: state.cached,
  };
}

export default useCristianoVideo;
