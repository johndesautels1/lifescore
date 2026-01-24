/**
 * LIFE SCORE - useSimli Hook
 *
 * React hook for managing Simli AI sessions for Olivia avatar.
 * Handles connection, speaking, and real-time streaming.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Inline types since avatar.ts does not exist
export interface SimliSession {
  sessionId: string;
  streamUrl?: string;
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

const API_BASE = '/api/avatar';

export function useSimli(): UseSimliReturn {
  const [session, setSession] = useState<SimliSession | null>(null);
  const [status, setStatus] = useState<SimliSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const isConnected = status === 'connected' || status === 'speaking' || status === 'listening';
  const isSpeaking = status === 'speaking';

  // Connect to Simli and establish WebRTC stream
  const connect = useCallback(async () => {
    if (session) {
      console.log('[useSimli] Already connected');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/simli-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create session');
      }

      const data = await response.json();

      if (!data.success || !data.session) {
        throw new Error(data.error || 'Invalid session response');
      }

      setSession(data.session);
      setStatus('connected');

      // If stream URL is provided, set up WebRTC
      if (data.session.streamUrl) {
        await setupWebRTC(data.session.streamUrl);
      }

      console.log('[useSimli] Connected:', data.session.sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      console.error('[useSimli] Connect error:', message);
      setError(message);
      setStatus('error');
    }
  }, [session]);

  // Set up WebRTC connection for video streaming
  const setupWebRTC = async (streamUrl: string) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[useSimli] ICE state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          setError('Connection failed');
          setStatus('error');
        }
      };

      // Simli provides the stream URL - connect to it
      // This is a simplified version - real implementation depends on Simli's API
      console.log('[useSimli] WebRTC setup for:', streamUrl);
    } catch (err) {
      console.error('[useSimli] WebRTC error:', err);
    }
  };

  // Disconnect from Simli
  const disconnect = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setSession(null);
    setStatus('disconnected');
    console.log('[useSimli] Disconnected');
  }, []);

  // Make Olivia speak
  const speak = useCallback(async (
    text: string,
    options?: Partial<SimliSpeakRequest>
  ) => {
    if (!session) {
      console.error('[useSimli] No session to speak');
      return;
    }

    setStatus('speaking');

    try {
      const response = await fetch(`${API_BASE}/simli-speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          text,
          emotion: options?.emotion || 'neutral',
          speed: options?.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to speak');
      }

      const data = await response.json();

      // Wait for speech duration before setting back to connected
      if (data.duration) {
        setTimeout(() => {
          setStatus('connected');
        }, data.duration * 1000);
      } else {
        // Fallback: estimate duration from text length
        const estimatedDuration = Math.max(2, text.length / 15); // ~15 chars per second
        setTimeout(() => {
          setStatus('connected');
        }, estimatedDuration * 1000);
      }

      console.log('[useSimli] Speaking:', text.substring(0, 30) + '...');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Speak failed';
      console.error('[useSimli] Speak error:', message);
      setError(message);
      setStatus('connected'); // Return to connected state
    }
  }, [session]);

  // Interrupt current speech
  const interrupt = useCallback(() => {
    if (!session || status !== 'speaking') {
      return;
    }

    // Send interrupt signal to Simli
    fetch(`${API_BASE}/simli-speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.sessionId,
        interrupt: true,
      }),
    }).catch(console.error);

    setStatus('connected');
    console.log('[useSimli] Interrupted');
  }, [session, status]);

  // Cleanup on unmount
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
