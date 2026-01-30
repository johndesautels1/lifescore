/**
 * LIFE SCORE - useJudgeVideo Hook
 *
 * React hook for generating and managing Christiano judge videos.
 * Uses Replicate Wav2Lip for video generation with caching.
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
const API_TIMEOUT_MS = 60000; // 60 second timeout for API calls

export function useJudgeVideo(): UseJudgeVideoReturn {
  const [video, setVideo] = useState<JudgeVideo | null>(null);
  const [status, setStatus] = useState<JudgeVideoStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Use ref to avoid stale closure issues with polling
  // This ref always has the latest video data for checkStatus to use
  const videoRef = useRef<JudgeVideo | null>(null);

  // Track the active comparison ID to prevent stale updates
  // When comparison changes, we increment this to invalidate old requests
  const generationIdRef = useRef<number>(0);

  // Track current comparison to detect changes
  const currentComparisonIdRef = useRef<string | null>(null);

  const isGenerating = status === 'pending' || status === 'processing';
  const isReady = status === 'completed' && !!video?.videoUrl;

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cancel any pending generation and reset state
  // Call this when switching comparisons to prevent race conditions
  const cancel = useCallback(() => {
    console.log('[useJudgeVideo] Cancelling current generation');
    generationIdRef.current += 1; // Invalidate any in-flight requests
    stopPolling();
    videoRef.current = null;
    currentComparisonIdRef.current = null;
    setVideo(null);
    setStatus('idle');
    setError(null);
  }, [stopPolling]);

  // Check video generation status
  // Uses videoRef to avoid stale closure issues when called from polling interval
  const checkStatus = useCallback(async () => {
    const currentVideo = videoRef.current;
    const myGenerationId = generationIdRef.current;

    if (!currentVideo?.id && !currentVideo?.comparisonId && !currentVideo?.replicatePredictionId) {
      console.log('[useJudgeVideo] checkStatus: No video data to check, skipping');
      return;
    }

    try {
      // Prefer predictionId for direct Replicate query (bypasses DB issues)
      const param = currentVideo.replicatePredictionId
        ? `predictionId=${currentVideo.replicatePredictionId}`
        : currentVideo.id
          ? `videoId=${currentVideo.id}`
          : `comparisonId=${currentVideo.comparisonId}`;

      console.log('[useJudgeVideo] Checking status with:', param);

      const response = await fetch(`${API_BASE}/video-status?${param}`);

      // Check if generation was cancelled while fetching
      if (generationIdRef.current !== myGenerationId) {
        console.log('[useJudgeVideo] Generation cancelled, ignoring stale response');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to check status');
      }

      const data = await response.json();

      // Double-check cancellation after parsing response
      if (generationIdRef.current !== myGenerationId) {
        console.log('[useJudgeVideo] Generation cancelled, ignoring stale response');
        return;
      }

      if (data.success && data.video) {
        // Update both ref and state
        videoRef.current = data.video;
        setVideo(data.video);
        setStatus(data.video.status);

        console.log('[useJudgeVideo] Status update:', data.video.status, 'videoUrl:', data.video.videoUrl);

        // Stop polling if complete or failed
        if (data.video.status === 'completed' || data.video.status === 'failed') {
          stopPolling();

          if (data.video.status === 'failed') {
            setError(data.video.error || 'Video generation failed');
          } else if (data.video.status === 'completed') {
            console.log('[useJudgeVideo] Video completed! URL:', data.video.videoUrl);
          }
        }
      }
    } catch (err) {
      console.error('[useJudgeVideo] Status check error:', err);
      // Don't stop polling on transient errors
    }
  }, [stopPolling]);

  // Start polling for status
  const startPolling = useCallback(() => {
    stopPolling();
    pollIntervalRef.current = setInterval(checkStatus, POLL_INTERVAL);
  }, [checkStatus, stopPolling]);

  // Generate a new judge video
  const generate = useCallback(async (request: GenerateJudgeVideoRequest) => {
    // Increment generation ID to invalidate any previous requests
    generationIdRef.current += 1;
    const myGenerationId = generationIdRef.current;

    // Track current comparison
    currentComparisonIdRef.current = request.comparisonId || `${request.city1}-${request.city2}`;

    setStatus('pending');
    setError(null);
    stopPolling();
    videoRef.current = null; // Reset ref

    // Setup timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      console.log('[useJudgeVideo] Generating video for:', request.city1, 'vs', request.city2, 'genId:', myGenerationId);

      const response = await fetch(`${API_BASE}/generate-judge-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if generation was cancelled while fetching
      if (generationIdRef.current !== myGenerationId) {
        console.log('[useJudgeVideo] Generation cancelled, ignoring response for:', request.city1, 'vs', request.city2);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || errorData.error || 'Failed to generate video');
      }

      const data = await response.json();

      // Double-check cancellation after parsing response
      if (generationIdRef.current !== myGenerationId) {
        console.log('[useJudgeVideo] Generation cancelled, ignoring response for:', request.city1, 'vs', request.city2);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || data.message || 'Generation failed');
      }

      // Update both ref (for polling) and state (for UI)
      // CRITICAL: Update ref BEFORE starting polling to avoid stale closure
      videoRef.current = data.video;
      setVideo(data.video);
      setStatus(data.video.status);

      console.log('[useJudgeVideo] Generate response:', {
        id: data.video.id,
        status: data.video.status,
        predictionId: data.video.replicatePredictionId,
        cached: data.cached,
      });

      // If cached, we're done
      if (data.cached) {
        console.log('[useJudgeVideo] Cache hit! Video URL:', data.video.videoUrl);
        return;
      }

      // If processing, start polling
      if (data.video.status === 'processing' || data.video.status === 'pending') {
        console.log('[useJudgeVideo] Starting poll for prediction:', data.video.replicatePredictionId);
        startPolling();
      }
    } catch (err) {
      clearTimeout(timeoutId);
      // Only update state if this is still the current generation
      if (generationIdRef.current !== myGenerationId) {
        console.log('[useJudgeVideo] Generation cancelled, ignoring error');
        return;
      }
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const message = isTimeout
        ? 'Video generation request timed out. Check your connection.'
        : (err instanceof Error ? err.message : 'Generation failed');
      console.error('[useJudgeVideo] Generate error:', message);
      setError(message);
      setStatus('failed');
      videoRef.current = null;
    }
  }, [startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  // Check if a video already exists for this comparison (for pre-generation)
  // NOTE: This is a read-only check - does NOT start polling to avoid runaway loops
  const checkExistingVideo = useCallback(async (comparisonId: string): Promise<JudgeVideo | null> => {
    try {
      console.log('[useJudgeVideo] Checking for existing video:', comparisonId);

      const response = await fetch(`${API_BASE}/video-status?comparisonId=${encodeURIComponent(comparisonId)}`);

      if (!response.ok) {
        console.log('[useJudgeVideo] Video status check failed (status:', response.status, ')');
        return null;
      }

      const data = await response.json();

      // Handle exists:false (no video yet - this is normal, not an error)
      if (data.exists === false || !data.video) {
        console.log('[useJudgeVideo] No video exists yet for this comparison');
        return null;
      }

      if (data.success && data.video) {
        console.log('[useJudgeVideo] Found existing video:', {
          id: data.video.id,
          status: data.video.status,
          videoUrl: data.video.videoUrl,
        });

        // If video is ready, update state
        if (data.video.status === 'completed' && data.video.videoUrl) {
          videoRef.current = data.video;
          setVideo(data.video);
          setStatus('completed');
        } else if (data.video.status === 'processing' || data.video.status === 'pending') {
          // Video is still generating - just update state, DON'T start polling
          // Polling should only be started by explicit generate() calls
          videoRef.current = data.video;
          setVideo(data.video);
          setStatus(data.video.status);
          console.log('[useJudgeVideo] Video still processing, NOT starting polling (read-only check)');
        }

        return data.video;
      }

      return null;
    } catch (error) {
      console.error('[useJudgeVideo] Error checking existing video:', error);
      return null;
    }
  }, []);

  return {
    video,
    status,
    isGenerating,
    isReady,
    generate,
    checkStatus,
    checkExistingVideo,
    cancel,
    error,
  };
}

export default useJudgeVideo;
