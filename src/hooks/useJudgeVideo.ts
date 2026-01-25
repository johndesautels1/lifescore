/**
 * LIFE SCORE - useJudgeVideo Hook
 *
 * React hook for generating and managing Christiano judge videos.
 * Uses Replicate MuseTalk for video generation with caching.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  JudgeVideo,
  JudgeVideoStatus,
  UseJudgeVideoReturn,
  GenerateJudgeVideoRequest,
} from '../types/avatar';

const API_BASE = '/api/avatar';
const POLL_INTERVAL = 3000; // 3 seconds

export function useJudgeVideo(): UseJudgeVideoReturn {
  const [video, setVideo] = useState<JudgeVideo | null>(null);
  const [status, setStatus] = useState<JudgeVideoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGenerating = status === 'pending' || status === 'processing';
  const isReady = status === 'completed' && !!video?.videoUrl;

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Check video generation status
  const checkStatus = useCallback(async () => {
    if (!video?.id && !video?.comparisonId && !video?.replicatePredictionId) {
      return;
    }

    try {
      // Prefer predictionId for direct Replicate query (bypasses DB issues)
      const param = video.replicatePredictionId
        ? `predictionId=${video.replicatePredictionId}`
        : video.id
          ? `videoId=${video.id}`
          : `comparisonId=${video.comparisonId}`;

      console.log('[useJudgeVideo] Checking status with:', param);

      const response = await fetch(`${API_BASE}/video-status?${param}`);

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();

      if (data.success && data.video) {
        setVideo(data.video);
        setStatus(data.video.status);

        // Stop polling if complete or failed
        if (data.video.status === 'completed' || data.video.status === 'failed') {
          stopPolling();

          if (data.video.status === 'failed') {
            setError(data.video.error || 'Video generation failed');
          }
        }
      }
    } catch (err) {
      console.error('[useJudgeVideo] Status check error:', err);
      // Don't stop polling on transient errors
    }
  }, [video, stopPolling]);

  // Start polling for status
  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(checkStatus, POLL_INTERVAL);
  }, [checkStatus, stopPolling]);

  // Generate a new judge video
  const generate = useCallback(async (request: GenerateJudgeVideoRequest) => {
    setStatus('pending');
    setError(null);
    stopPolling();

    try {
      console.log('[useJudgeVideo] Generating video for:', request.city1, 'vs', request.city2);

      const response = await fetch(`${API_BASE}/generate-judge-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate video');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setVideo(data.video);
      setStatus(data.video.status);

      // If cached, we're done
      if (data.cached) {
        console.log('[useJudgeVideo] Cache hit!');
        return;
      }

      // If processing, start polling
      if (data.video.status === 'processing' || data.video.status === 'pending') {
        console.log('[useJudgeVideo] Starting poll for:', data.video.id);
        startPolling();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      console.error('[useJudgeVideo] Generate error:', message);
      setError(message);
      setStatus('failed');
    }
  }, [startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    video,
    status,
    isGenerating,
    isReady,
    generate,
    checkStatus,
    error,
  };
}

export default useJudgeVideo;
