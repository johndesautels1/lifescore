/**
 * LIFE SCORE - useOliviaFace: Olivia's live face, primary and back-up.
 *
 * John, 2026-10-03: "I want olivia liveavatar wired in bite identical to the
 * heygen configuration clues-questionnaire-engine uses but we keep her old
 * config as a backup in case the primary fails."
 *
 *   PRIMARY  HeyGen LiveAvatar, LITE mode (useLiveAvatar — the engine's wiring)
 *   BACK-UP  her previous face, unchanged: Simli, with D-ID behind it
 *            (useAvatarProvider, including its own Simli → D-ID fallback)
 *
 * Connect tries the primary; if it cannot start (not configured, refused,
 * unreachable, no room), the back-up connects instead for the rest of the visit.
 * The return shape is useAvatarProvider's, so Olivia's screen did not change.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useCallback, useState } from 'react';
import { useLiveAvatar } from './useLiveAvatar';
import { useAvatarProvider, type AvatarProvider, type AvatarStatus } from './useAvatarProvider';

export type OliviaFaceProvider = 'liveavatar' | AvatarProvider;

export interface UseOliviaFaceOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export interface UseOliviaFaceReturn {
  status: AvatarStatus;
  error: string | null;
  isConnected: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  activeProvider: OliviaFaceProvider;
  /** True once anything other than the primary is in use. */
  hasFallenBack: boolean;
  /** Resolves true when a face started (LiveAvatar, or the back-up), false when none did. */
  connect: () => Promise<boolean>;
  speak: (text: string) => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  pause: () => void;
  resume: () => void;
}

export function useOliviaFace(options: UseOliviaFaceOptions = {}): UseOliviaFaceReturn {
  const { videoRef, audioRef } = options;
  const primary = useLiveAvatar({ videoRef, audioRef });
  const backup = useAvatarProvider({ videoRef, audioRef, autoFallback: true });
  const [onBackup, setOnBackup] = useState(false);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!onBackup) {
      if (await primary.connect()) return true;
      console.warn('[useOliviaFace] LiveAvatar could not start; using the back-up face (Simli, then D-ID).');
      setOnBackup(true);
    }
    return backup.connect();
  }, [onBackup, primary, backup]);

  if (onBackup) {
    return {
      status: backup.status,
      error: backup.error,
      isConnected: backup.isConnected,
      isSpeaking: backup.isSpeaking,
      isPaused: backup.isPaused,
      activeProvider: backup.activeProvider,
      hasFallenBack: true,
      connect,
      speak: (text) => backup.speak(text),
      disconnect: backup.disconnect,
      interrupt: backup.interrupt,
      pause: backup.pause,
      resume: backup.resume,
    };
  }

  return {
    status: primary.status,
    error: primary.error,
    isConnected: primary.isConnected,
    isSpeaking: primary.isSpeaking,
    isPaused: primary.isPaused,
    activeProvider: 'liveavatar',
    hasFallenBack: false,
    connect,
    speak: primary.speak,
    disconnect: primary.disconnect,
    interrupt: primary.interrupt,
    pause: primary.pause,
    resume: primary.resume,
  };
}

export default useOliviaFace;
