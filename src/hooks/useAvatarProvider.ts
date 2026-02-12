/**
 * LIFE SCORE - useAvatarProvider Facade Hook
 *
 * Unified interface for avatar providers with automatic fallback.
 * Primary: Simli AI (cost-effective)
 * Fallback: D-ID Streams (premium backup)
 *
 * Environment Variable:
 *   VITE_AVATAR_PROVIDER = 'simli' | 'did' (default: 'simli')
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSimli } from './useSimli';
import { useDIDStream } from './useDIDStream';

// ============================================================================
// TYPES
// ============================================================================

export type AvatarProvider = 'simli' | 'did';

export type AvatarStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'error'
  | 'disconnected'
  | 'rate_limited'
  | 'falling_back';

export interface UseAvatarProviderOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onError?: (error: string) => void;
  onProviderSwitch?: (from: AvatarProvider, to: AvatarProvider, reason: string) => void;
  autoFallback?: boolean; // default: true
}

export interface UseAvatarProviderReturn {
  // State
  status: AvatarStatus;
  error: string | null;
  isConnected: boolean;
  isSpeaking: boolean;
  isPaused: boolean;

  // Provider info
  activeProvider: AvatarProvider;
  preferredProvider: AvatarProvider;
  hasFallenBack: boolean;

  // Actions
  connect: () => Promise<void>;
  speak: (text: string, options?: { emotion?: string; speed?: number }) => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  pause: () => void;
  resume: () => void;

  // Provider control
  switchProvider: (provider: AvatarProvider) => void;
  resetToPreferred: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SIMLI_ERRORS_BEFORE_FALLBACK = 2;

// Get preferred provider from environment
function getPreferredProvider(): AvatarProvider {
  const envProvider = import.meta.env.VITE_AVATAR_PROVIDER?.toLowerCase();
  if (envProvider === 'did') return 'did';
  return 'simli'; // default
}

// ============================================================================
// HOOK
// ============================================================================

export function useAvatarProvider(options: UseAvatarProviderOptions = {}): UseAvatarProviderReturn {
  const {
    videoRef,
    audioRef,
    onSpeakingStart,
    onSpeakingEnd,
    onError,
    onProviderSwitch,
    autoFallback = true,
  } = options;

  // Provider state
  const preferredProvider = getPreferredProvider();
  const [activeProvider, setActiveProvider] = useState<AvatarProvider>(preferredProvider);
  const [hasFallenBack, setHasFallenBack] = useState(false);
  const [facadeStatus, setFacadeStatus] = useState<AvatarStatus>('idle');
  const [facadeError, setFacadeError] = useState<string | null>(null);

  // Error tracking for fallback logic
  const simliErrorCount = useRef(0);
  const isFallingBack = useRef(false);

  // Callback refs - prevent re-renders from causing issues
  const onSpeakingStartRef = useRef(onSpeakingStart);
  const onSpeakingEndRef = useRef(onSpeakingEnd);
  const onErrorRef = useRef(onError);
  const onProviderSwitchRef = useRef(onProviderSwitch);

  // Keep callback refs updated
  useEffect(() => {
    onSpeakingStartRef.current = onSpeakingStart;
    onSpeakingEndRef.current = onSpeakingEnd;
    onErrorRef.current = onError;
    onProviderSwitchRef.current = onProviderSwitch;
  }, [onSpeakingStart, onSpeakingEnd, onError, onProviderSwitch]);

  // Create stable refs for providers if not provided
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const effectiveVideoRef = videoRef || internalVideoRef;
  const effectiveAudioRef = audioRef || internalAudioRef;

  // Initialize both hooks - Simli needs both videoRef and audioRef
  const simli = useSimli({
    videoRef: effectiveVideoRef,
    audioRef: effectiveAudioRef,
    onError: (err) => {
      console.error('[useAvatarProvider] Simli error:', err);
      onError?.(err);
    },
  });

  const did = useDIDStream({
    videoRef: effectiveVideoRef,
    onSpeakingStart,
    onSpeakingEnd,
    onError: (err) => {
      console.error('[useAvatarProvider] D-ID error:', err);
      onError?.(err);
    },
  });

  // Get current provider's state
  const currentProviderState = activeProvider === 'simli' ? simli : did;

  // Sync status from active provider
  useEffect(() => {
    if (isFallingBack.current) return; // Don't update during fallback transition

    const providerStatus = currentProviderState.status;

    // Map provider-specific statuses to unified status
    if (providerStatus === 'rate_limited') {
      setFacadeStatus('rate_limited');
    } else {
      setFacadeStatus(providerStatus as AvatarStatus);
    }

    // Sync error
    setFacadeError(currentProviderState.error);
  }, [currentProviderState.status, currentProviderState.error, activeProvider]);

  // ============================================================================
  // FALLBACK LOGIC
  // ============================================================================

  const triggerFallback = useCallback(async (reason: string) => {
    if (!autoFallback || activeProvider === 'did' || isFallingBack.current) {
      return false;
    }

    console.log('[useAvatarProvider] Triggering fallback to D-ID:', reason);
    isFallingBack.current = true;
    setFacadeStatus('falling_back');

    // Disconnect from Simli
    simli.disconnect();

    // Switch to D-ID
    setActiveProvider('did');
    setHasFallenBack(true);
    onProviderSwitchRef.current?.('simli', 'did', reason);

    // Wait a moment then connect to D-ID
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await did.connect();
      isFallingBack.current = false;
      return true;
    } catch (err) {
      isFallingBack.current = false;
      const message = err instanceof Error ? err.message : 'D-ID fallback failed';
      setFacadeError(message);
      setFacadeStatus('error');
      onErrorRef.current?.(message);
      return false;
    }
  }, [activeProvider, autoFallback, simli, did]);

  // ============================================================================
  // PUBLIC ACTIONS
  // ============================================================================

  const connect = useCallback(async () => {
    setFacadeError(null);

    if (activeProvider === 'simli') {
      try {
        await simli.connect();
        simliErrorCount.current = 0; // Reset on success
      } catch (err) {
        simliErrorCount.current++;
        const message = err instanceof Error ? err.message : 'Simli connection failed';
        console.error('[useAvatarProvider] Simli connect error:', message);

        if (simliErrorCount.current >= MAX_SIMLI_ERRORS_BEFORE_FALLBACK && autoFallback) {
          await triggerFallback(`Simli failed ${simliErrorCount.current} times: ${message}`);
        } else {
          setFacadeError(message);
          setFacadeStatus('error');
          onErrorRef.current?.(message);
        }
      }
    } else {
      // Using D-ID directly
      try {
        await did.connect();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'D-ID connection failed';
        setFacadeError(message);
        setFacadeStatus('error');
        onErrorRef.current?.(message);
      }
    }
  }, [activeProvider, simli, did, autoFallback, triggerFallback]);

  const speak = useCallback(async (
    text: string,
    options?: { emotion?: string; speed?: number }
  ) => {
    onSpeakingStartRef.current?.();

    if (activeProvider === 'simli') {
      try {
        await simli.speak(text, {
          emotion: options?.emotion as any,
          speed: options?.speed,
        });
        simliErrorCount.current = 0; // Reset on success
      } catch (err) {
        simliErrorCount.current++;
        const message = err instanceof Error ? err.message : 'Simli speak failed';
        console.error('[useAvatarProvider] Simli speak error:', message);

        if (simliErrorCount.current >= MAX_SIMLI_ERRORS_BEFORE_FALLBACK && autoFallback) {
          const fellBack = await triggerFallback(`Simli speak failed: ${message}`);
          if (fellBack) {
            // Retry speak with D-ID after fallback
            await did.speak(text);
          }
        } else {
          onErrorRef.current?.(message);
        }
      }
    } else {
      // Using D-ID
      try {
        await did.speak(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'D-ID speak failed';
        onErrorRef.current?.(message);
      }
    }

    onSpeakingEndRef.current?.();
  }, [activeProvider, simli, did, autoFallback, triggerFallback]);

  const pause = useCallback(() => {
    if (activeProvider === 'simli') {
      simli.pause();
    }
    // D-ID doesn't support pause natively - use interrupt as fallback
  }, [activeProvider, simli]);

  const resume = useCallback(() => {
    if (activeProvider === 'simli') {
      simli.resume();
    }
  }, [activeProvider, simli]);

  const disconnect = useCallback(() => {
    if (activeProvider === 'simli') {
      simli.disconnect();
    } else {
      did.disconnect();
    }
  }, [activeProvider, simli, did]);

  const interrupt = useCallback(() => {
    console.log('[useAvatarProvider] 🛑 INTERRUPT - Stopping ALL audio sources');

    // Interrupt both providers to be safe (one may have pending audio)
    try {
      simli.interrupt();
    } catch (e) {
      console.log('[useAvatarProvider] Simli interrupt:', e);
    }

    // Pause video element (don't mute - just pause)
    if (effectiveVideoRef?.current) {
      effectiveVideoRef.current.pause();
      console.log('[useAvatarProvider] Video element paused');
    }

    // Pause and reset audio element
    if (effectiveAudioRef?.current) {
      effectiveAudioRef.current.pause();
      effectiveAudioRef.current.currentTime = 0;
      console.log('[useAvatarProvider] Audio element paused and reset');
    }

    // Cancel ALL browser speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      console.log('[useAvatarProvider] Browser speech synthesis cancelled');
    }

    // Reset speaking state in facade
    setFacadeStatus('connected');
  }, [activeProvider, simli, effectiveVideoRef, effectiveAudioRef]);

  // ============================================================================
  // PROVIDER CONTROL
  // ============================================================================

  const switchProvider = useCallback((provider: AvatarProvider) => {
    if (provider === activeProvider) return;

    console.log('[useAvatarProvider] Manual switch to:', provider);

    // Disconnect current
    if (activeProvider === 'simli') {
      simli.disconnect();
    } else {
      did.disconnect();
    }

    setActiveProvider(provider);
    setFacadeStatus('idle');
    setFacadeError(null);

    // Reset error counts on manual switch
    if (provider === 'simli') {
      simliErrorCount.current = 0;
      setHasFallenBack(false);
    }
  }, [activeProvider, simli, did]);

  const resetToPreferred = useCallback(() => {
    simliErrorCount.current = 0;
    switchProvider(preferredProvider);
    setHasFallenBack(false);

    // Reset D-ID retries too
    did.resetRetries();
  }, [preferredProvider, switchProvider, did]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      simli.disconnect();
      did.disconnect();
    };
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    status: facadeStatus,
    error: facadeError,
    isConnected: currentProviderState.isConnected,
    isSpeaking: currentProviderState.isSpeaking,
    isPaused: activeProvider === 'simli' ? simli.isPaused : false,

    // Provider info
    activeProvider,
    preferredProvider,
    hasFallenBack,

    // Actions
    connect,
    speak,
    disconnect,
    interrupt,
    pause,
    resume,

    // Provider control
    switchProvider,
    resetToPreferred,
  };
}

export default useAvatarProvider;
