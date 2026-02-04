/**
 * LIFE SCORE - useGrokVideo Hook
 *
 * React hook for generating and managing Grok Imagine videos.
 * Handles "See Your New Life" (winner/loser pair) and "Court Order" (perfect life).
 * Uses Grok as primary provider with Replicate fallback.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  GrokVideo,
  GrokVideoPair,
  GrokVideoStatus,
  UseGrokVideoReturn,
  GenerateNewLifeVideosRequest,
  GenerateCourtOrderVideoRequest,
} from '../types/grokVideo';
import {
  generateNewLifeVideos as apiGenerateNewLifeVideos,
  generateCourtOrderVideo as apiGenerateCourtOrderVideo,
  checkVideoStatus,
  getVideoErrorMessage,
} from '../services/grokVideoService';
// FIX #73: Import cost tracking utilities
import { appendServiceCost, calculateKlingCost } from '../utils/costCalculator';

const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 120; // 6 minutes max (120 * 3s)

export function useGrokVideo(): UseGrokVideoReturn {
  // Single video state (for Court Order)
  const [video, setVideo] = useState<GrokVideo | null>(null);

  // Video pair state (for New Life videos)
  const [videoPair, setVideoPair] = useState<GrokVideoPair | null>(null);

  // Status and progress
  const [status, setStatus] = useState<GrokVideoStatus>('idle');
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Polling refs
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef<number>(0);

  // Video refs for polling (avoid stale closure)
  const videoRef = useRef<GrokVideo | null>(null);
  const videoPairRef = useRef<GrokVideoPair | null>(null);
  const modeRef = useRef<'single' | 'pair'>('single');

  // Computed states
  const isGenerating = status === 'pending' || status === 'processing';
  const isReady = status === 'completed' && (
    (modeRef.current === 'single' && !!video?.videoUrl) ||
    (modeRef.current === 'pair' && !!videoPair?.winner?.videoUrl && !!videoPair?.loser?.videoUrl)
  );

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  // Reset state
  const reset = useCallback(() => {
    stopPolling();
    setVideo(null);
    setVideoPair(null);
    setStatus('idle');
    setProgress('');
    setError(null);
    videoRef.current = null;
    videoPairRef.current = null;
  }, [stopPolling]);

  // Check status for single video
  const checkSingleVideoStatus = useCallback(async () => {
    const currentVideo = videoRef.current;
    if (!currentVideo?.id) {
      console.log('[useGrokVideo] No video ID to check');
      return;
    }

    try {
      pollAttemptsRef.current++;

      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        setError('Video generation timed out');
        setStatus('failed');
        return;
      }

      const result = await checkVideoStatus(currentVideo.id);

      if (result.success && result.video) {
        videoRef.current = result.video;
        setVideo(result.video);
        setStatus(result.video.status);

        const pct = Math.min(95, Math.round((pollAttemptsRef.current / MAX_POLL_ATTEMPTS) * 100));
        setProgress(`Processing video... ${pct}%`);

        if (result.video.status === 'completed') {
          stopPolling();
          setProgress('Video ready!');
          console.log('[useGrokVideo] Video completed:', result.video.videoUrl);
        } else if (result.video.status === 'failed') {
          stopPolling();
          setError(result.video.errorMessage || 'Video generation failed');
        }
      }
    } catch (err) {
      console.error('[useGrokVideo] Status check error:', err);
      // Don't stop polling on transient errors
    }
  }, [stopPolling]);

  // Check status for video pair
  const checkPairVideoStatus = useCallback(async () => {
    const currentPair = videoPairRef.current;
    if (!currentPair?.winner?.id || !currentPair?.loser?.id) {
      console.log('[useGrokVideo] No video pair IDs to check');
      return;
    }

    try {
      pollAttemptsRef.current++;

      if (pollAttemptsRef.current > MAX_POLL_ATTEMPTS) {
        stopPolling();
        setError('Video generation timed out');
        setStatus('failed');
        return;
      }

      // Check both videos in parallel
      const [winnerResult, loserResult] = await Promise.all([
        currentPair.winner.status !== 'completed'
          ? checkVideoStatus(currentPair.winner.id)
          : Promise.resolve({ success: true, video: currentPair.winner }),
        currentPair.loser.status !== 'completed'
          ? checkVideoStatus(currentPair.loser.id)
          : Promise.resolve({ success: true, video: currentPair.loser }),
      ]);

      // Update pair
      const updatedPair: GrokVideoPair = {
        winner: winnerResult.video || currentPair.winner,
        loser: loserResult.video || currentPair.loser,
      };

      videoPairRef.current = updatedPair;
      setVideoPair(updatedPair);

      // Calculate progress with gradual simulation
      const winnerDone = updatedPair.winner?.status === 'completed';
      const loserDone = updatedPair.loser?.status === 'completed';

      // Base progress: each completed video = 50%
      let progressPct = (winnerDone ? 50 : 0) + (loserDone ? 50 : 0);

      // Add gradual progress based on poll attempts for videos still processing
      // Max ~45% per video before completion (so it doesn't reach 50% until actually done)
      const pollProgress = Math.min(pollAttemptsRef.current * 2, 45);
      if (!winnerDone) progressPct += pollProgress / 2;
      if (!loserDone) progressPct += pollProgress / 2;

      // Cap at 95% until actually complete
      if (!winnerDone || !loserDone) {
        progressPct = Math.min(progressPct, 95);
      }

      setProgress(`Generating videos... ${Math.round(progressPct)}%`);

      // Check for completion
      if (winnerDone && loserDone) {
        stopPolling();
        setStatus('completed');
        setProgress('Videos ready!');
        console.log('[useGrokVideo] Video pair completed');
      } else if (updatedPair.winner?.status === 'failed' || updatedPair.loser?.status === 'failed') {
        stopPolling();
        const failedVideo = updatedPair.winner?.status === 'failed' ? updatedPair.winner : updatedPair.loser;
        setError(failedVideo?.errorMessage || 'Video generation failed');
        setStatus('failed');
      }
    } catch (err) {
      console.error('[useGrokVideo] Pair status check error:', err);
    }
  }, [stopPolling]);

  // Start polling based on mode
  const startPolling = useCallback(() => {
    stopPolling();
    pollAttemptsRef.current = 0;

    const checkFn = modeRef.current === 'pair' ? checkPairVideoStatus : checkSingleVideoStatus;
    pollIntervalRef.current = setInterval(checkFn, POLL_INTERVAL);
  }, [checkSingleVideoStatus, checkPairVideoStatus, stopPolling]);

  // Generate New Life Videos (winner/loser pair)
  const generateNewLifeVideos = useCallback(async (request: GenerateNewLifeVideosRequest) => {
    reset();
    modeRef.current = 'pair';
    setStatus('pending');
    setProgress('Initializing video generation...');

    try {
      console.log('[useGrokVideo] Generating New Life videos:', request.winnerCity, 'vs', request.loserCity);

      const result = await apiGenerateNewLifeVideos(request);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate videos');
      }

      if (result.videos) {
        videoPairRef.current = result.videos;
        setVideoPair(result.videos);

        // FIX #73: Record Kling video cost (2 images for pair, skip if cached)
        if (!result.cached) {
          const imageCount = 2; // Winner + loser videos
          const cost = calculateKlingCost(imageCount);
          appendServiceCost('kling', {
            imageCount,
            cost,
            timestamp: Date.now(),
            context: 'new-life-videos',
          });
        }

        // Check if cached/complete
        if (result.cached ||
            (result.videos.winner?.status === 'completed' && result.videos.loser?.status === 'completed')) {
          setStatus('completed');
          setProgress('Videos ready!');
          console.log('[useGrokVideo] Cache hit or instant complete');
          return;
        }

        // Start polling if processing
        setStatus('processing');
        setProgress('Processing videos...');
        startPolling();
      }
    } catch (err) {
      const message = getVideoErrorMessage(err as Error);
      console.error('[useGrokVideo] Generate error:', message);
      setError(message);
      setStatus('failed');
      setProgress('');
    }
  }, [reset, startPolling]);

  // Generate Court Order Video (perfect life)
  const generateCourtOrderVideo = useCallback(async (request: GenerateCourtOrderVideoRequest) => {
    reset();
    modeRef.current = 'single';
    setStatus('pending');
    setProgress('Initializing court order video...');

    try {
      console.log('[useGrokVideo] Generating Court Order video for:', request.winnerCity);

      const result = await apiGenerateCourtOrderVideo(request);

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate video');
      }

      if (result.video) {
        videoRef.current = result.video;
        setVideo(result.video);

        // FIX #73: Record Kling video cost (1 image for court order, skip if cached)
        if (!result.cached) {
          const imageCount = 1;
          const cost = calculateKlingCost(imageCount);
          appendServiceCost('kling', {
            imageCount,
            cost,
            timestamp: Date.now(),
            context: 'court-order-video',
          });
        }

        // Check if cached/complete
        if (result.cached || result.video.status === 'completed') {
          setStatus('completed');
          setProgress('Video ready!');
          console.log('[useGrokVideo] Cache hit or instant complete');
          return;
        }

        // Start polling if processing
        setStatus('processing');
        setProgress('Processing video...');
        startPolling();
      }
    } catch (err) {
      const message = getVideoErrorMessage(err as Error);
      console.error('[useGrokVideo] Generate error:', message);
      setError(message);
      setStatus('failed');
      setProgress('');
    }
  }, [reset, startPolling]);

  // Manual status check
  const checkStatus = useCallback(async (videoId: string) => {
    try {
      const result = await checkVideoStatus(videoId);
      if (result.success && result.video) {
        if (modeRef.current === 'single') {
          videoRef.current = result.video;
          setVideo(result.video);
        }
        setStatus(result.video.status);
      }
    } catch (err) {
      console.error('[useGrokVideo] Manual status check error:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    video,
    videoPair,
    status,
    isGenerating,
    isReady,
    progress,
    generateNewLifeVideos,
    generateCourtOrderVideo,
    checkStatus,
    reset,
    error,
  };
}

export default useGrokVideo;
