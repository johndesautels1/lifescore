/**
 * LIFE SCORE - useSimli Hook
 *
 * React hook for managing Simli AI sessions for Olivia avatar.
 * Implements proper WebRTC connection via Simli's WebSocket API.
 *
 * Reference: https://docs.simli.com/api-reference/simli-webrtc
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// CONSTANTS
// ============================================================================

const SIMLI_WS_URL = 'wss://api.simli.ai/startWebRTCSession';
const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302'] }];

// ============================================================================
// HOOK
// ============================================================================

export function useSimli(): UseSimliReturn {
  const [session, setSession] = useState<SimliSession | null>(null);
  const [status, setStatus] = useState<SimliSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Refs for WebRTC and WebSocket
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isConnected = status === 'connected' || status === 'speaking' || status === 'listening';
  const isSpeaking = status === 'speaking';

  /**
   * Create and configure RTCPeerConnection
   */
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const config: RTCConfiguration = {
      iceServers: ICE_SERVERS,
    };

    const pc = new RTCPeerConnection(config);

    // Track if we've already attached the stream (to avoid duplicate play() calls)
    let streamAttached = false;

    // Handle incoming tracks (video/audio stream from Simli)
    pc.ontrack = (event) => {
      console.log('[useSimli] Received track:', event.track.kind);

      // Only attach stream once (first track, usually video)
      if (event.streams && event.streams[0] && !streamAttached) {
        streamAttached = true;

        // Find video element in DOM if not set via ref
        const videoEl = videoElementRef.current || document.querySelector('.avatar-video') as HTMLVideoElement;

        if (videoEl) {
          videoEl.srcObject = event.streams[0];
          // Use a small delay to ensure stream is ready
          setTimeout(() => {
            videoEl.play().catch(err => {
              console.warn('[useSimli] Video autoplay failed:', err);
              // Try muted autoplay as fallback (browser policy)
              videoEl.muted = true;
              videoEl.play().catch(() => {
                console.warn('[useSimli] Muted autoplay also failed');
              });
            });
          }, 100);
          console.log('[useSimli] Video stream attached to element');
        } else {
          console.error('[useSimli] No video element found to attach stream');
        }
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('[useSimli] Connection state:', pc.connectionState);

      switch (pc.connectionState) {
        case 'connected':
          setStatus('connected');
          break;
        case 'disconnected':
        case 'failed':
          setStatus('error');
          setError('WebRTC connection failed');
          break;
        case 'closed':
          setStatus('disconnected');
          break;
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[useSimli] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        setError('ICE connection failed');
        setStatus('error');
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[useSimli] ICE candidate:', event.candidate.candidate.substring(0, 50));
      }
    };

    return pc;
  }, []);

  /**
   * Connect to Simli via WebRTC
   */
  const connect = useCallback(async () => {
    if (peerConnectionRef.current) {
      console.log('[useSimli] Already connected or connecting');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      // Create peer connection
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;

      // Add transceiver for receiving video
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Create data channel for sending audio
      const dc = pc.createDataChannel('audio', { ordered: true });
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log('[useSimli] Data channel opened');

        // Send initial silence to start the avatar
        const silence = new Uint8Array(16000); // 0.5 second silence at 16kHz
        dc.send(silence);
      };

      dc.onclose = () => {
        console.log('[useSimli] Data channel closed');
      };

      dc.onerror = (err) => {
        console.error('[useSimli] Data channel error:', err);
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('[useSimli] Connecting to WebSocket:', SIMLI_WS_URL);

      // Connect to Simli WebSocket
      const ws = new WebSocket(SIMLI_WS_URL);
      webSocketRef.current = ws;

      ws.onopen = () => {
        console.log('[useSimli] WebSocket connected, sending offer');

        // Get credentials from Vite environment
        const apiKey = import.meta.env.VITE_SIMLI_API_KEY;
        const faceId = import.meta.env.VITE_SIMLI_FACE_ID;

        // Validate credentials before sending
        if (!apiKey || !faceId) {
          const missing = [];
          if (!apiKey) missing.push('VITE_SIMLI_API_KEY');
          if (!faceId) missing.push('VITE_SIMLI_FACE_ID');
          const errorMsg = `Simli not configured. Missing: ${missing.join(', ')}. Add these to Vercel environment variables.`;
          console.error('[useSimli]', errorMsg);
          setError(errorMsg);
          setStatus('error');
          ws.close();
          return;
        }

        console.log('[useSimli] Credentials found, sending to Simli...');

        // Send SDP offer with credentials
        ws.send(JSON.stringify({
          sdp: offer.sdp,
          type: offer.type,
          apiKey,
          faceId,
        }));
      };

      ws.onmessage = async (event) => {
        const rawMessage = event.data;

        // Handle plain text protocol messages from Simli
        if (typeof rawMessage === 'string') {
          // Check for error messages with user-friendly translations
          if (rawMessage.startsWith('ERROR:') || rawMessage.startsWith('NO SESSION')) {
            console.error('[useSimli] Simli error:', rawMessage);

            // Translate Simli errors to user-friendly messages
            let userMessage = rawMessage;
            if (rawMessage.includes('NO SESSION') || rawMessage.includes('Invalid API')) {
              userMessage = 'Video connection failed. Please check that VITE_SIMLI_API_KEY and VITE_SIMLI_FACE_ID are set correctly in Vercel.';
            } else if (rawMessage.includes('rate limit')) {
              userMessage = 'Video service rate limited. Please try again in a moment.';
            }

            setError(userMessage);
            setStatus('error');
            return;
          }

          // Protocol messages we can safely ignore
          if (rawMessage.startsWith('ENDFRAME:') || rawMessage === 'STOP' || rawMessage === 'START') {
            console.log('[useSimli] Protocol message:', rawMessage);
            return;
          }

          // Try to parse as JSON
          try {
            const data = JSON.parse(rawMessage);
            console.log('[useSimli] WebSocket message:', data.type || 'unknown');

            if (data.type === 'answer' && data.sdp) {
              // Set remote description from Simli's answer
              const answer = new RTCSessionDescription({
                type: 'answer',
                sdp: data.sdp,
              });
              await pc.setRemoteDescription(answer);
              console.log('[useSimli] Remote description set');

              // Create session object
              const sessionId = `simli_${Date.now()}`;
              setSession({
                sessionId,
                createdAt: new Date(),
              });

              setStatus('connected');
            } else if (data.type === 'error') {
              console.error('[useSimli] Server error:', data.message);
              setError(data.message || 'Simli connection error');
            }
          } catch {
            // Not JSON - log unknown messages for debugging
            console.log('[useSimli] Unknown message:', rawMessage.substring(0, 50));
          }
        }
      };

      ws.onerror = (err) => {
        console.error('[useSimli] WebSocket error:', err);
        setError('WebSocket connection failed');
        setStatus('error');
      };

      ws.onclose = (event) => {
        console.log('[useSimli] WebSocket closed:', event.code, event.reason);
        if (status === 'connecting') {
          setError('Connection closed unexpectedly');
          setStatus('error');
        }
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      console.error('[useSimli] Connect error:', message);
      setError(message);
      setStatus('error');

      // Cleanup on error
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    }
  }, [createPeerConnection, status]);

  /**
   * Disconnect from Simli
   */
  const disconnect = useCallback(() => {
    console.log('[useSimli] Disconnecting...');

    // Close data channel
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    // Close WebSocket
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setSession(null);
    setStatus('disconnected');
    setError(null);

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

    setStatus('speaking');

    try {
      // Call server-side API to generate TTS audio and send to Simli
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Speak failed: ${response.status}`);
      }

      const data = await response.json();

      // If we got audio data, send it through the data channel
      if (data.audioData && dataChannelRef.current?.readyState === 'open') {
        // Convert base64 audio to Uint8Array
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Send in chunks of 6000 bytes (Simli recommended)
        const chunkSize = 6000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          dataChannelRef.current.send(chunk);
        }
      }

      // Estimate duration and set timeout to return to connected state
      const estimatedDuration = data.duration || Math.max(2, text.length / 15);
      setTimeout(() => {
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

    // Send empty audio to clear buffer
    if (dataChannelRef.current?.readyState === 'open') {
      const silence = new Uint8Array(1000);
      dataChannelRef.current.send(silence);
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
