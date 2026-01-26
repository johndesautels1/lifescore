/**
 * LIFE SCORE - useTTS Hook
 * Text-to-speech audio playback hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UseTTSReturn } from '../types/olivia';
import { generateTTS } from '../services/oliviaService';

// ============================================================================
// HOOK
// ============================================================================

export function useTTS(
  options: {
    voiceId?: string;
    autoPlay?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {}
): UseTTSReturn {
  const { voiceId, autoPlay: _autoPlay = false, onStart, onEnd, onError } = options;
  void _autoPlay; // Reserved for future auto-play on load feature

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // audioContextRef reserved for Web Audio API integration
  const _audioContextRef = useRef<AudioContext | null>(null);
  void _audioContextRef;

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();

    audioRef.current.onplay = () => {
      setIsPlaying(true);
      onStart?.();
    };

    audioRef.current.onended = () => {
      setIsPlaying(false);
      onEnd?.();
    };

    audioRef.current.onerror = () => {
      setIsPlaying(false);
      setError('Failed to play audio');
      onError?.('Failed to play audio');
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [onStart, onEnd, onError]);

  /**
   * Play audio from URL
   */
  const playUrl = useCallback(async (url: string): Promise<void> => {
    if (!audioRef.current) return;

    setError(null);

    try {
      // Stop any current playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Set new source and play
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to play audio';
      setError(message);
      setIsPlaying(false);
      onError?.(message);
    }
  }, [onError]);

  /**
   * Generate and play TTS for text
   * Falls back to browser speech synthesis if API fails
   */
  const play = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    setError(null);
    setIsLoading(true);

    // Helper to use browser speech synthesis
    const useBrowserTTS = () => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => {
          setIsPlaying(true);
          onStart?.();
        };
        utterance.onend = () => {
          setIsPlaying(false);
          onEnd?.();
        };
        utterance.onerror = () => {
          setIsPlaying(false);
          setError('Browser TTS failed');
        };
        window.speechSynthesis.speak(utterance);
        return true;
      }
      return false;
    };

    try {
      // Generate TTS from API
      const response = await generateTTS(text, { voiceId });

      if (response.audioUrl) {
        await playUrl(response.audioUrl);
      } else {
        // Fallback to browser speech synthesis
        if (!useBrowserTTS()) {
          throw new Error('No audio URL returned and browser TTS not supported');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'TTS generation failed';
      setError(message);
      // Fallback to browser speech synthesis on error
      if (!useBrowserTTS()) {
        onError?.(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [voiceId, playUrl, onError, onStart, onEnd]);

  /**
   * Stop playback
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    play,
    playUrl,
    stop,
  };
}

export default useTTS;
