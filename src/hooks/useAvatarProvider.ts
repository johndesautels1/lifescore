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

  // Provider info
  activeProvider: AvatarProvider;
  preferredProvider: AvatarProvider;
  hasFallenBack: boolean;

  // Actions
  connect: () => Promise<void>;
  speak: (text: string, options?: { emotion?: string; speed?: number }) => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;

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

  // Create a stable videoRef for providers if not provided
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const effectiveVideoRef = videoRef || internalVideoRef;

  // Initialize both hooks - BOTH get the videoRef now
  const simli = useSimli({
    videoRef: effectiveVideoRef,
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
    onProviderSwitch?.('simli', 'did', reason);

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
      onError?.(message);
      return false;
    }
  }, [activeProvider, autoFallback, simli, did, onProviderSwitch, onError]);

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
          onError?.(message);
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
        onError?.(message);
      }
    }
  }, [activeProvider, simli, did, autoFallback, triggerFallback, onError]);

  const speak = useCallback(async (
    text: string,
    options?: { emotion?: string; speed?: number }
  ) => {
    onSpeakingStart?.();

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
          onError?.(message);
        }
      }
    } else {
      // Using D-ID
      try {
        await did.speak(text);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'D-ID speak failed';
        onError?.(message);
      }
    }

    onSpeakingEnd?.();
  }, [activeProvider, simli, did, autoFallback, triggerFallback, onSpeakingStart, onSpeakingEnd, onError]);

  const disconnect = useCallback(() => {
    if (activeProvider === 'simli') {
      simli.disconnect();
    } else {
      did.disconnect();
    }
  }, [activeProvider, simli, did]);

  const interrupt = useCallback(() => {
    if (activeProvider === 'simli') {
      simli.interrupt();
    }
    // D-ID doesn't have interrupt - just log
    console.log('[useAvatarProvider] Interrupt requested');
  }, [activeProvider, simli]);

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

    // Provider info
    activeProvider,
    preferredProvider,
    hasFallenBack,

    // Actions
    connect,
    speak,
    disconnect,
    interrupt,

    // Provider control
    switchProvider,
    resetToPreferred,
  };
}

export default useAvatarProvider;
