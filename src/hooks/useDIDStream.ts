/**
 * LIFE SCORE - useDIDStream Hook
 * Manages WebRTC connection to D-ID Streams API for real-time video avatar
 *
 * RATE LIMITING: This hook implements exponential backoff to prevent
 * runaway retry loops that can exhaust D-ID API quotas.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// RATE LIMITING CONSTANTS
// ============================================================================

const MIN_RETRY_DELAY_MS = 2000;      // Minimum 2 seconds between retries
const MAX_RETRY_DELAY_MS = 60000;     // Maximum 1 minute between retries
const BACKOFF_MULTIPLIER = 2;         // Double delay each failure
const MAX_RETRIES = 5;                // Give up after 5 failed attempts
const COOLDOWN_AFTER_429_MS = 30000;  // 30 second cooldown after rate limit

// ============================================================================
// TYPES
// ============================================================================

interface DIDStreamState {
  status: 'idle' | 'connecting' | 'connected' | 'speaking' | 'error' | 'rate_limited';
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
  isRateLimited: boolean;
  retryCount: number;
  connect: () => Promise<void>;
  speak: (text: string) => Promise<void>;
  disconnect: () => Promise<void>;
  resetRetries: () => void;
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

  // Rate limiting refs - persist across renders without triggering re-renders
  const retryCountRef = useRef(0);
  const lastAttemptRef = useRef(0);
  const retryDelayRef = useRef(MIN_RETRY_DELAY_MS);
  const isConnectingRef = useRef(false);  // Mutex to prevent concurrent connects
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Create WebRTC connection and connect to D-ID stream
   * Implements rate limiting and exponential backoff to prevent API abuse
   */
  const connect = useCallback(async () => {
    // Prevent concurrent connection attempts (mutex)
    if (isConnectingRef.current) {
      console.log('[useDIDStream] Connection already in progress, skipping');
      return;
    }

    // Already connected - no need to reconnect
    if (state.status === 'connected' || state.status === 'speaking') {
      console.log('[useDIDStream] Already connected');
      return;
    }

    // Check rate limiting: enforce minimum delay between attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptRef.current;
    if (lastAttemptRef.current > 0 && timeSinceLastAttempt < retryDelayRef.current) {
      console.log(`[useDIDStream] Rate limited - wait ${Math.ceil((retryDelayRef.current - timeSinceLastAttempt) / 1000)}s before retry`);
      return;
    }

    // Check max retries
    if (retryCountRef.current >= MAX_RETRIES) {
      console.log(`[useDIDStream] Max retries (${MAX_RETRIES}) exceeded, giving up`);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Connection failed after multiple attempts. Please refresh the page.',
      }));
      return;
    }

    // Set mutex and update tracking
    isConnectingRef.current = true;
    lastAttemptRef.current = now;

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

        // Special handling for rate limit (429)
        if (createResponse.status === 429) {
          console.error('[useDIDStream] Rate limited by D-ID API');
          retryDelayRef.current = COOLDOWN_AFTER_429_MS;
          setState(prev => ({
            ...prev,
            status: 'rate_limited',
            error: 'D-ID rate limited. Waiting 30 seconds...',
          }));
          isConnectingRef.current = false;
          retryCountRef.current++;
          return;
        }

        throw new Error(error.error || 'Failed to create stream');
      }

      // Success! Reset retry counters
      retryCountRef.current = 0;
      retryDelayRef.current = MIN_RETRY_DELAY_MS;

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

      // Release mutex on success
      isConnectingRef.current = false;
      console.log('[useDIDStream] Connected successfully');

    } catch (error) {
      // Release mutex on failure
      isConnectingRef.current = false;

      const message = error instanceof Error ? error.message : 'Connection failed';
      console.error('[useDIDStream] Connection error:', message);

      // Increment retry counter and apply exponential backoff
      retryCountRef.current++;
      retryDelayRef.current = Math.min(
        retryDelayRef.current * BACKOFF_MULTIPLIER,
        MAX_RETRY_DELAY_MS
      );
      console.log(`[useDIDStream] Retry ${retryCountRef.current}/${MAX_RETRIES}, next delay: ${retryDelayRef.current}ms`);

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

  /**
   * Reset retry counters - call this when user explicitly requests reconnection
   */
  const resetRetries = useCallback(() => {
    retryCountRef.current = 0;
    retryDelayRef.current = MIN_RETRY_DELAY_MS;
    lastAttemptRef.current = 0;
    console.log('[useDIDStream] Retry counters reset');
  }, []);

  return {
    status: state.status,
    error: state.error,
    isConnected: state.status === 'connected' || state.status === 'speaking',
    isSpeaking: state.status === 'speaking',
    isRateLimited: state.status === 'rate_limited',
    retryCount: retryCountRef.current,
    connect,
    speak,
    disconnect,
    resetRetries,
  };
}

export default useDIDStream;
