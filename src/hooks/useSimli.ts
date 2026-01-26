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

import React, { useState, useCallback, useRef, useEffect } from 'react';

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

export interface UseSimliOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SIMLI_WS_URL = 'wss://api.simli.ai/startWebRTCSession';
const ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302'] }];

// ============================================================================
// HOOK
// ============================================================================

export function useSimli(options: UseSimliOptions = {}): UseSimliReturn {
  const { videoRef: externalVideoRef, onConnected, onDisconnected, onError } = options;

  const [session, setSession] = useState<SimliSession | null>(null);
  const [status, setStatus] = useState<SimliSessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Refs for WebRTC and WebSocket
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Use external videoRef if provided, otherwise fall back to internal
  const videoElementRef = externalVideoRef || internalVideoRef;

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

      // Monitor track state changes
      event.track.onmute = () => console.log(`[useSimli] ${event.track.kind} track MUTED`);
      event.track.onunmute = () => console.log(`[useSimli] ${event.track.kind} track UNMUTED`);
      event.track.onended = () => console.log(`[useSimli] ${event.track.kind} track ENDED`);

      // Only attach stream once (first track, usually video)
      if (event.streams && event.streams[0] && !streamAttached) {
        streamAttached = true;

        // Use provided videoRef, or fall back to DOM query
        const videoEl = videoElementRef?.current || document.querySelector('.avatar-video') as HTMLVideoElement;

        console.log('[useSimli] Looking for video element:', {
          hasExternalRef: !!externalVideoRef,
          refHasElement: !!videoElementRef?.current,
          foundViaQuery: !!document.querySelector('.avatar-video'),
        });

        if (videoEl) {
          videoEl.srcObject = event.streams[0];

          // Log video element state
          console.log('[useSimli] Video element found:', {
            tagName: videoEl.tagName,
            className: videoEl.className,
            width: videoEl.clientWidth,
            height: videoEl.clientHeight,
            display: getComputedStyle(videoEl).display,
            visibility: getComputedStyle(videoEl).visibility,
            opacity: getComputedStyle(videoEl).opacity,
          });

          // Log stream info
          const stream = event.streams[0];
          console.log('[useSimli] Stream tracks:', {
            videoTracks: stream.getVideoTracks().length,
            audioTracks: stream.getAudioTracks().length,
            videoTrackEnabled: stream.getVideoTracks()[0]?.enabled,
            videoTrackMuted: stream.getVideoTracks()[0]?.muted,
            videoTrackState: stream.getVideoTracks()[0]?.readyState,
          });

          // Use a small delay to ensure stream is ready
          setTimeout(() => {
            videoEl.play()
              .then(() => {
                console.log('[useSimli] Video playing successfully!', {
                  paused: videoEl.paused,
                  currentTime: videoEl.currentTime,
                  readyState: videoEl.readyState,
                });
              })
              .catch(err => {
                console.warn('[useSimli] Video autoplay failed:', err.message);
                // Try muted autoplay as fallback (browser policy)
                videoEl.muted = true;
                videoEl.play()
                  .then(() => {
                    console.log('[useSimli] Video playing MUTED (browser policy)');
                  })
                  .catch((err2) => {
                    console.error('[useSimli] Muted autoplay also failed:', err2.message);
                    onError?.('Video autoplay blocked by browser');
                  });
              });
          }, 100);
          console.log('[useSimli] Video stream attached to element successfully');
        } else {
          console.error('[useSimli] No video element found to attach stream! Check videoRef prop.');
          onError?.('Video element not found');
        }
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('[useSimli] Connection state:', pc.connectionState);

      switch (pc.connectionState) {
        case 'connected':
          setStatus('connected');
          onConnected?.();
          break;
        case 'disconnected':
        case 'failed':
          setStatus('error');
          setError('WebRTC connection failed');
          onError?.('WebRTC connection failed');
          onDisconnected?.();
          break;
        case 'closed':
          setStatus('disconnected');
          onDisconnected?.();
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

      // Listen for messages FROM Simli through data channel
      dc.onmessage = (event) => {
        console.log('[useSimli] Data channel message from Simli:', event.data);
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('[useSimli] Connecting to WebSocket:', SIMLI_WS_URL);

      // Connect to Simli WebSocket
      const ws = new WebSocket(SIMLI_WS_URL);
      webSocketRef.current = ws;

      ws.onopen = async () => {
        console.log('[useSimli] WebSocket connected');

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

        console.log('[useSimli] Credentials found, getting session token...');

        try {
          // Step 1: Get session token via HTTP POST
          const sessionResponse = await fetch('https://api.simli.ai/startAudioToVideoSession', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              faceId: faceId,
              apiKey: apiKey,
              isJPG: false,
              syncAudio: true,
            }),
          });

          if (!sessionResponse.ok) {
            const errorText = await sessionResponse.text();
            console.error('[useSimli] Session API error:', sessionResponse.status, errorText);
            setError(`Simli authentication failed: ${sessionResponse.status}`);
            setStatus('error');
            ws.close();
            return;
          }

          const sessionData = await sessionResponse.json();
          console.log('[useSimli] Session token received');

          // Step 2: Send SDP offer via WebSocket
          console.log('[useSimli] Sending SDP offer...');
          ws.send(JSON.stringify({
            sdp: offer.sdp,
            type: offer.type,
          }));

          // Step 3: Send session token via WebSocket
          if (sessionData.session_token) {
            console.log('[useSimli] Sending session token...');
            ws.send(sessionData.session_token);
          }
        } catch (err) {
          console.error('[useSimli] Session setup error:', err);
          setError('Failed to establish Simli session');
          setStatus('error');
          ws.close();
        }
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
      console.log('[useSimli] Calling simli-speak API...');

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

      console.log('[useSimli] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useSimli] API error response:', errorText);
        throw new Error(`Speak failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useSimli] API response data keys:', Object.keys(data));

      console.log('[useSimli] Audio data received:', data.audioData ? `${data.audioData.length} chars` : 'none');
      console.log('[useSimli] Data channel state:', dataChannelRef.current?.readyState || 'no channel');

      // If we got audio data, send it through the data channel
      if (data.audioData && dataChannelRef.current?.readyState === 'open') {
        // Convert base64 audio to Uint8Array
        const binaryString = atob(data.audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        console.log('[useSimli] Sending', bytes.length, 'bytes of audio to Simli');

        // Send in chunks with pacing to avoid overwhelming the data channel
        // Simli expects PCM16 at 16kHz = 32000 bytes/sec
        // Send 6000 bytes (~0.1875s of audio) every ~50ms for ~4x realtime
        const chunkSize = 6000;
        const dc = dataChannelRef.current;
        let offset = 0;

        const sendNextChunk = () => {
          if (!dc || dc.readyState !== 'open') {
            console.warn('[useSimli] Data channel closed during send');
            return;
          }

          // Check if buffer is getting full (>64KB queued)
          if (dc.bufferedAmount > 65536) {
            // Wait for buffer to drain
            setTimeout(sendNextChunk, 50);
            return;
          }

          const end = Math.min(offset + chunkSize, bytes.length);
          const chunk = bytes.slice(offset, end);
          dc.send(chunk);
          offset = end;

          if (offset < bytes.length) {
            // Schedule next chunk
            setTimeout(sendNextChunk, 10);
          } else {
            console.log('[useSimli] Audio sent successfully');
          }
        };

        // Start sending
        sendNextChunk();
      } else if (data.audioData) {
        console.warn('[useSimli] Audio received but data channel not open!', dataChannelRef.current?.readyState);
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
