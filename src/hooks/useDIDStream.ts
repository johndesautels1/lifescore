/**
 * LIFE SCORE - useDIDStream Hook
 * Manages WebRTC connection to D-ID Streams API for real-time video avatar
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface DIDStreamState {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'error';
  error: string | null;
  streamId: string | null;
  sessionId: string | null;
}

interface UseDIDStreamOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onError?: (error: string) => void;
}

interface UseDIDStreamReturn {
  status: DIDStreamState['status'];
  error: string | null;
  isConnected: boolean;
  isSpeaking: boolean;
  connect: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useDIDStream(options: UseDIDStreamOptions): UseDIDStreamReturn {
  const { videoRef, onSpeakingStart, onSpeakingEnd, onError } = options;

  const [state, setState] = useState<DIDStreamState>({
    status: 'idle',
    error: null,
    streamId: null,
    sessionId: null,
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Create WebRTC connection and connect to D-ID stream
   */
  const connect = useCallback(async () => {
    if (state.status === 'connected' || state.status === 'connecting') {
      console.log('[useDIDStream] Already connected/connecting');
      return;
    }

    setState(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      // 1. Request stream from backend
      const createResponse = await fetch('/api/olivia/avatar/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create stream');
      }

      const { streamId, sessionId, offer, iceServers } = await createResponse.json();
      console.log('[useDIDStream] Stream created:', streamId);

      // 2. Create RTCPeerConnection
      const peerConnection = new RTCPeerConnection({
        iceServers: iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = peerConnection;

      // 3. Handle incoming video track
      peerConnection.ontrack = (event) => {
        console.log('[useDIDStream] Received track:', event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch(console.error);
        }
      };

      // 4. Handle ICE candidates
      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await fetch('/api/olivia/avatar/streams', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'ice-candidate',
                streamId,
                sessionId,
                candidate: event.candidate.toJSON(),
              }),
            });
          } catch (err) {
            console.warn('[useDIDStream] Failed to send ICE candidate:', err);
          }
        }
      };

      // 5. Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('[useDIDStream] Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setState(prev => ({ ...prev, status: 'connected' }));
        } else if (peerConnection.connectionState === 'failed') {
          setState(prev => ({ ...prev, status: 'error', error: 'Connection failed' }));
          onError?.('WebRTC connection failed');
        }
      };

      // 6. Set remote description (D-ID's offer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // 7. Create and set local answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // 8. Send answer to D-ID
      const startResponse = await fetch('/api/olivia/avatar/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'speak',
          streamId,
          sessionId,
          sdpAnswer: answer.sdp,
          text: 'Hello, I am Olivia, your AI advisor.', // Initial greeting
        }),
      });

      if (!startResponse.ok) {
        const error = await startResponse.json();
        throw new Error(error.error || 'Failed to start stream');
      }

      setState({
        status: 'connected',
        error: null,
        streamId,
        sessionId,
      });

      console.log('[useDIDStream] Connected successfully');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      console.error('[useDIDStream] Connection error:', message);
      setState(prev => ({ ...prev, status: 'error', error: message }));
      onError?.(message);
    }
  }, [state.status, videoRef, onError]);

  /**
   * Make the avatar speak text
   */
  const speak = useCallback(async (text: string) => {
    if (!state.streamId || !state.sessionId) {
      console.warn('[useDIDStream] Not connected');
      return;
    }

    if (!text.trim()) {
      return;
    }

    setState(prev => ({ ...prev, status: 'speaking' }));
    onSpeakingStart?.();

    try {
      const response = await fetch('/api/olivia/avatar/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'speak',
          streamId: state.streamId,
          sessionId: state.sessionId,
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to speak');
      }

      const { duration } = await response.json();
      console.log('[useDIDStream] Speaking, duration:', duration);

      // Set timeout to mark speaking as done
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      speakingTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'connected' }));
        onSpeakingEnd?.();
      }, duration || text.length * 60); // Estimate ~60ms per character

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Speak failed';
      console.error('[useDIDStream] Speak error:', message);
      setState(prev => ({ ...prev, status: 'connected' }));
      onSpeakingEnd?.();
    }
  }, [state.streamId, state.sessionId, onSpeakingStart, onSpeakingEnd]);

  /**
   * Disconnect from D-ID stream
   */
  const disconnect = useCallback(async () => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear speaking timeout
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }

    // Notify backend
    if (state.streamId && state.sessionId) {
      try {
        await fetch('/api/olivia/avatar/streams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'destroy',
            streamId: state.streamId,
            sessionId: state.sessionId,
          }),
        });
      } catch (err) {
        console.warn('[useDIDStream] Cleanup warning:', err);
      }
    }

    setState({
      status: 'idle',
      error: null,
      streamId: null,
      sessionId: null,
    });

    console.log('[useDIDStream] Disconnected');
  }, [state.streamId, state.sessionId, videoRef]);

  return {
    status: state.status,
    error: state.error,
    isConnected: state.status === 'connected' || state.status === 'speaking',
    isSpeaking: state.status === 'speaking',
    connect,
    speak,
    disconnect,
  };
}

export default useDIDStream;
