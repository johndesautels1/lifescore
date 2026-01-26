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
  connect: () => Promise<void>;
  disconnect: () => void;
  speak: (text: string, options?: Partial<SimliSpeakRequest>) => Promise<void>;
  interrupt: () => void;
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
      // Get credentials from Vite environment
      const apiKey = import.meta.env.VITE_SIMLI_API_KEY;
      const faceId = import.meta.env.VITE_SIMLI_FACE_ID;

      // Validate credentials
      if (!apiKey || !faceId) {
        const missing = [];
        if (!apiKey) missing.push('VITE_SIMLI_API_KEY');
        if (!faceId) missing.push('VITE_SIMLI_FACE_ID');
        const errorMsg = `Simli not configured. Missing: ${missing.join(', ')}. Add these to Vercel environment variables.`;
        console.error('[useSimli]', errorMsg);
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
        return;
      }

      // Validate refs
      if (!videoRef?.current) {
        const errorMsg = 'Video element ref not available';
        console.error('[useSimli]', errorMsg);
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
        return;
      }

      if (!audioRef?.current) {
        const errorMsg = 'Audio element ref not available';
        console.error('[useSimli]', errorMsg);
        setError(errorMsg);
        setStatus('error');
        onError?.(errorMsg);
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
      onConnected?.();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      console.error('[useSimli] Connect error:', message);
      setError(message);
      setStatus('error');
      onError?.(message);

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
  }, [videoRef, audioRef, onConnected, onError]);

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
    onDisconnected?.();

    console.log('[useSimli] Disconnected');
  }, [onDisconnected]);

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

    try {
      console.log('[useSimli] Calling simli-speak API...');

      // Call server-side API to generate TTS audio
      const response = await fetch('/api/avatar/simli-speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

        // Send audio chunks to Simli
        // Chunk size: 100ms of audio at 16kHz * 2 bytes/sample = 3200 bytes
        const chunkSize = 3200;
        const client = simliClientRef.current;

        for (let i = 0; i < audioBytes.length; i += chunkSize) {
          const chunk = audioBytes.slice(i, Math.min(i + chunkSize, audioBytes.length));
          client.sendAudioData(chunk);
        }

        console.log('[useSimli] Audio sent successfully');
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
  }, [isConnected, session, status]);

  /**
   * Interrupt current speech
   */
  const interrupt = useCallback(() => {
    if (!isSpeaking) {
      return;
    }

    console.log('[useSimli] Interrupting speech');

    // Clear speaking timeout
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    // Send empty audio to clear buffer
    if (simliClientRef.current) {
      const silence = new Uint8Array(3200); // 100ms of silence (16kHz * 2 bytes/sample)
      simliClientRef.current.sendAudioData(silence);
    }

    setStatus('connected');
  }, [isSpeaking]);

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
    connect,
    disconnect,
    speak,
    interrupt,
    error,
  };
}

export default useSimli;
