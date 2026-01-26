/**
 * LIFE SCORE - useVoiceRecognition Hook
 * Web Speech API wrapper for voice input
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { UseVoiceRecognitionReturn } from '../types/olivia';

// ============================================================================
// WEB SPEECH API TYPES
// ============================================================================

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onaudiostart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useVoiceRecognition(
  options: {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    onResult?: (transcript: string, isFinal: boolean) => void;
    onError?: (error: string) => void;
  } = {}
): UseVoiceRecognitionReturn {
  const {
    language = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  // State
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs - use refs for callbacks to avoid re-initializing recognition on every render
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isManualStop = useRef(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      recognitionRef.current = new SpeechRecognitionAPI();
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.lang = language;

      // Handle results - use ref to always get latest callback
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
          setInterimTranscript('');
          onResultRef.current?.(finalTranscript, true);
        } else {
          setInterimTranscript(interimText);
          onResultRef.current?.(interimText, false);
        }
      };

      // Handle end
      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Auto-restart if continuous and not manually stopped
        if (continuous && !isManualStop.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (e) {
            // Already started or other error
          }
        }
      };

      // Handle errors - use ref to always get latest callback
      recognitionRef.current.onerror = (event) => {
        let errorMessage = 'Speech recognition error';

        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
          case 'aborted':
            // User aborted, not an error
            return;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }

        setError(errorMessage);
        setIsListening(false);
        onErrorRef.current?.(errorMessage);
      };

      // Handle audio start
      recognitionRef.current.onaudiostart = () => {
        setError(null);
      };
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [continuous, interimResults, language]); // Callbacks use refs, so not in deps

  /**
   * Start listening
   */
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    isManualStop.current = false;
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      // Already started
      if (e instanceof Error && e.message.includes('already started')) {
        setIsListening(true);
      } else {
        setError('Failed to start voice recognition.');
      }
    }
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    isManualStop.current = true;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  /**
   * Reset transcript
   */
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

export default useVoiceRecognition;
