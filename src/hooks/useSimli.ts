/**
 * LIFE SCORE - useSimli Hook
 *
 * React hook for managing Simli AI sessions for Olivia avatar.
 * Uses official simli-client SDK for WebRTC connection.
 *
 * Reference: https://docs.simli.com/api-reference/javascript
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SimliClient } from 'simli-client';
import { getAuthHeaders } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface SimliSession {
  sessionId: string;
  createdAt: Date;
}

export type SimliSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'disconnected'
  | 'error';

export interface SimliSpeakRequest {
  sessionId: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'concerned' | 'empathetic' | 'encouraging';
  speed?: number;
  interrupt?: boolean;
}

export interface UseSimliReturn {
  session: SimliSession | null;
  status: SimliSessionStatus;
  isConnected: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  speak: (text: string, options?: Partial<SimliSpeakRequest>) => Promise<void>;
  interrupt: () => void;
  pause: () => void;
  resume: () => void;
  error: string | null;
}

export interface UseSimliOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

// ============================================================================
// HOOK
// ============================================================================

export function useSimli(options: UseSimliOptions = {}): UseSimliReturn {
  const { videoRef, audioRef, onConnected, onDisconnected, onError } = options;

  const [session, setSession] = useState<SimliSession | null>(null);
  const [status, setStatus] = useState<SimliSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Ref for SimliClient instance
  const simliClientRef = useRef<SimliClient | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interruptedRef = useRef<boolean>(false); // Flag to stop audio chunk sending
  const pausedRef = useRef<boolean>(false); // Flag to pause/resume chunk sending
  const [isPaused, setIsPaused] = useState(false);

  // Callback refs - prevent re-renders from causing reconnections
  const onConnectedRef = useRef(onConnected);
  const onDisconnectedRef = useRef(onDisconnected);
  const onErrorRef = useRef(onError);

  // Keep callback refs updated
  useEffect(() => {
    onConnectedRef.current = onConnected;
    onDisconnectedRef.current = onDisconnected;
    onErrorRef.current = onError;
  }, [onConnected, onDisconnected, onError]);

  const isConnected = status === 'connected' || status === 'speaking' || status === 'listening';
  const isSpeaking = status === 'speaking';

  /**
   * Connect to Simli via official SDK
   */
  const connect = useCallback(async () => {
    if (simliClientRef.current) {
      console.log('[useSimli] Already connected or connecting');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      // Fetch credentials from server (keeps API key out of static JS bundle)
      const authHeaders = await getAuthHeaders();
      const configRes = await fetch('/api/simli-config', { headers: authHeaders });
      if (!configRes.ok) {
        const errorMsg = 'Simli not configured or auth failed.';
        console.error('[useSimli]', errorMsg);
        setError(errorMsg);
        setStatus('error');
        onErrorRef.current?.(errorMsg);
        return;
      }
      const { apiKey, faceId } = await configRes.json();

      // Validate refs
      if (!videoRef?.current) {
        const errorMsg = 'Video element ref not available';
        console.error('[useSimli]', errorMsg);
        setError(errorMsg);
        setStatus('error');
        onErrorRef.current?.(errorMsg);
        return;
      }

      if (!audioRef?.current) {
        const errorMsg = 'Audio element ref not available';
        console.error('[useSimli]', errorMsg);
        setError(errorMsg);
        setStatus('error');
        onErrorRef.current?.(errorMsg);
        return;
      }

      console.log('[useSimli] Initializing SimliClient...');

      // Create SimliClient instance
      const simliClient = new SimliClient();
      simliClientRef.current = simliClient;

      // Initialize with configuration
      const simliConfig = {
        apiKey,
        faceID: faceId,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 600,
        videoRef: videoRef.current,
        audioRef: audioRef.current,
        session_token: '',
        SimliURL: '',
        maxRetryAttempts: 5,
        retryDelay_ms: 2000,
        videoReceivedTimeout: 15000,
        enableSFU: true,
        // Leave empty to use SDK default ('fasttalk')
        // 'fasttalk' = server-side buffering (Trinity + legacy)
        // 'artalk' = client-side pacing required (tested: worse on legacy)
        model: '' as const,
        enableConsoleLogs: true,
      };

      simliClient.Initialize(simliConfig);
      console.log('[useSimli] SimliClient initialized');

      // Start the session
      await simliClient.start();
      console.log('[useSimli] SimliClient started');

      // Create session object
      const sessionId = `simli_${Date.now()}`;
      setSession({
        sessionId,
        createdAt: new Date(),
      });

      setStatus('connected');
      onConnectedRef.current?.();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      console.error('[useSimli] Connect error:', message);
      setError(message);
      setStatus('error');
      onErrorRef.current?.(message);

      // Cleanup on error
      if (simliClientRef.current) {
        try {
          simliClientRef.current.close();
        } catch {
          // Ignore close errors
        }
        simliClientRef.current = null;
      }
    }
  }, [videoRef, audioRef]);

  /**
   * Disconnect from Simli
   */
  const disconnect = useCallback(() => {
    console.log('[useSimli] Disconnecting...');

    // Clear speaking timeout
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    // Close SimliClient
    if (simliClientRef.current) {
      try {
        simliClientRef.current.close();
      } catch (err) {
        console.warn('[useSimli] Error closing client:', err);
      }
      simliClientRef.current = null;
    }

    setSession(null);
    setStatus('disconnected');
    setError(null);
    onDisconnectedRef.current?.();

    console.log('[useSimli] Disconnected');
  }, []);

  /**
   * Convert text to audio and send to Simli for lip-sync
   * Uses server-side TTS to generate audio
   */
  const speak = useCallback(async (
    text: string,
    options?: Partial<SimliSpeakRequest>
  ) => {
    if (!isConnected) {
      console.error('[useSimli] Cannot speak - not connected');
      throw new Error('Not connected to Simli');
    }

    if (!simliClientRef.current) {
      console.error('[useSimli] SimliClient not available');
      throw new Error('SimliClient not initialized');
    }

    setStatus('speaking');
    interruptedRef.current = false; // Reset interrupt flag before starting

    try {
      console.log('[useSimli] Calling simli-speak API...');

      // Call server-side API to generate TTS audio
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/avatar/simli-speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          sessionId: session?.sessionId,
          text,
          emotion: options?.emotion || 'neutral',
          speed: options?.speed || 1.0,
        }),
      });

      console.log('[useSimli] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useSimli] API error response:', errorText);
        throw new Error(`Speak failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useSimli] Audio data received:', data.audioData ? `${data.audioData.length} chars` : 'none');

      if (data.audioData) {
        // Convert base64 to Uint8Array (raw PCM16 bytes)
        const binaryString = atob(data.audioData);
        const audioBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          audioBytes[i] = binaryString.charCodeAt(i);
        }

        console.log('[useSimli] Sending', audioBytes.length, 'bytes to Simli');

        // Resume audio/video elements if they were paused (e.g., after interrupt)
        if (audioRef?.current?.paused) {
          console.log('[useSimli] Resuming paused audio element');
          audioRef.current.play().catch(() => {});
        }
        if (videoRef?.current?.paused) {
          console.log('[useSimli] Resuming paused video element');
          videoRef.current.play().catch(() => {});
        }

        // Send audio chunks to Simli with FASTER-than-realtime pacing
        // Chunk size: 6000 bytes (Simli recommended per docs.simli.com)
        // Pacing: ~115ms per chunk — well ahead of the 187.5ms of audio per chunk
        //   PCM16 @ 16kHz mono = 32000 bytes/sec → 6000 bytes = 187.5ms
        //   150ms was still 25% too fast on lips. Lower = more buffer = slower lips.
        //   115ms delivers ~63% ahead of real-time, giving Simli ample buffer
        //   to pace lip animation at natural speech speed.
        //   Tuning history: 0→180→205(worse)→150(25% fast)→115
        const chunkSize = 6000;
        const pacingMs = 115;

        // Split into chunks
        const chunks: Uint8Array[] = [];
        for (let i = 0; i < audioBytes.length; i += chunkSize) {
          chunks.push(audioBytes.slice(i, Math.min(i + chunkSize, audioBytes.length)));
        }

        // Send chunks with pacing - stops if interrupted, waits if paused
        let chunkIndex = 0;
        const sendNextChunk = () => {
          // Check if interrupted before sending next chunk
          if (interruptedRef.current) {
            console.log('[useSimli] Audio sending interrupted at chunk', chunkIndex, 'of', chunks.length);
            return;
          }
          // If paused, wait and retry without advancing
          if (pausedRef.current) {
            setTimeout(sendNextChunk, 50);
            return;
          }
          if (chunkIndex < chunks.length && simliClientRef.current) {
            simliClientRef.current.sendAudioData(chunks[chunkIndex]);
            chunkIndex++;
            setTimeout(sendNextChunk, pacingMs);
          } else {
            console.log('[useSimli] Audio sent successfully:', chunks.length, 'chunks');
          }
        };

        // Start sending
        sendNextChunk();
      }

      // Set timeout to return to connected state
      const estimatedDuration = data.duration || Math.max(2, text.length / 15);

      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }

      speakingTimeoutRef.current = setTimeout(() => {
        if (status === 'speaking') {
          setStatus('connected');
        }
      }, estimatedDuration * 1000);

      console.log('[useSimli] Speaking:', text.substring(0, 50) + '...');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speak failed';
      console.error('[useSimli] Speak error:', message);
      setError(message);
      setStatus('connected');
      throw err;
    }
  }, [isConnected, session, status, audioRef, videoRef]);

  /**
   * Pause current speech - freezes chunk sending and pauses audio/video
   * Can be resumed with resume()
   */
  const pause = useCallback(() => {
    if (pausedRef.current) return; // Already paused
    console.log('[useSimli] ⏸ PAUSE - Freezing audio/video');
    pausedRef.current = true;
    setIsPaused(true);

    if (audioRef?.current) {
      audioRef.current.pause();
    }
    if (videoRef?.current) {
      videoRef.current.pause();
    }
  }, [audioRef, videoRef]);

  /**
   * Resume from pause - resumes chunk sending and plays audio/video
   */
  const resume = useCallback(() => {
    if (!pausedRef.current) return; // Not paused
    console.log('[useSimli] ▶ RESUME - Unfreezing audio/video');
    pausedRef.current = false;
    setIsPaused(false);

    if (audioRef?.current) {
      audioRef.current.play().catch(() => {});
    }
    if (videoRef?.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [audioRef, videoRef]);

  /**
   * Interrupt current speech - aggressively stop all audio
   */
  const interrupt = useCallback(() => {
    // Also clear pause state on interrupt
    pausedRef.current = false;
    setIsPaused(false);
    console.log('[useSimli] 🛑 INTERRUPT - Stopping all audio');

    // CRITICAL: Set interrupt flag to stop audio chunk loop
    interruptedRef.current = true;

    // Clear speaking timeout
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    // Use SDK ClearBuffer to flush server-side audio queue
    // (avoids sending silence data that could accumulate and desync lip timing)
    if (simliClientRef.current) {
      simliClientRef.current.ClearBuffer();
    }

    // AGGRESSIVE: Directly pause and mute the audio element
    if (audioRef?.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = true;
      console.log('[useSimli] Audio element paused and muted');
      // Unmute after a brief delay so next speech works
      setTimeout(() => {
        if (audioRef?.current) audioRef.current.muted = false;
      }, 100);
    }

    // Also pause video element
    if (videoRef?.current) {
      videoRef.current.pause();
      console.log('[useSimli] Video element paused');
    }

    // Also cancel any browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      console.log('[useSimli] Browser speech synthesis cancelled');
    }

    setStatus('connected');
  }, [audioRef, videoRef]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    session,
    status,
    isConnected,
    isSpeaking,
    isPaused,
    connect,
    disconnect,
    speak,
    interrupt,
    pause,
    resume,
    error,
  };
}

export default useSimli;
