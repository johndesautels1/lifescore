/**
 * LIFE SCORE - Olivia AI Assistant Types: State, Config & Hooks
 * Clues Intelligence LTD © 2025
 *
 * Olivia component state, error handling, configuration, and hook return types
 */

import type { OliviaChatMessage, LifeScoreContext } from './olivia-chat';
import type { AvatarProvider, AvatarStatus, AvatarSession } from './olivia-avatar';

// ============================================================================
// OLIVIA STATE TYPES
// ============================================================================

/**
 * Olivia interaction mode
 */
export type OliviaMode = 'idle' | 'avatar' | 'chat' | 'voice';

/**
 * Main Olivia component state
 */
export interface OliviaState {
  // Interaction mode
  mode: OliviaMode;

  // Avatar state
  avatarProvider: AvatarProvider;
  avatarStatus: AvatarStatus;
  avatarSession: AvatarSession | null;

  // Chat state
  chatHistory: OliviaChatMessage[];
  threadId: string | null;
  isTyping: boolean;

  // Voice state
  isListening: boolean;
  isSpeaking: boolean;

  // Context state
  contextLoaded: boolean;
  context: LifeScoreContext | null;

  // Error state
  error: OliviaError | null;
}

/**
 * Olivia error types
 */
export type OliviaErrorType =
  | 'avatar_connection_failed'
  | 'chat_api_error'
  | 'voice_recognition_unsupported'
  | 'voice_recognition_error'
  | 'tts_generation_failed'
  | 'context_too_large'
  | 'context_build_failed'
  | 'rate_limited'
  | 'network_error'
  | 'assistant_not_found';

/**
 * Olivia error object
 */
export interface OliviaError {
  type: OliviaErrorType;
  message: string;
  recoverable: boolean;
  fallbackAction?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Olivia configuration
 *
 * Voice: Microsoft Sonia (en-GB-SoniaNeural) via D-ID - no external API key needed
 * ElevenLabs is optional fallback only when D-ID unavailable
 */
export interface OliviaConfig {
  assistantId: string;
  heygenAvatarId?: string;
  didAgentId?: string;
  elevenlabsVoiceId?: string; // Optional - fallback TTS only
  defaultMode: OliviaMode;
  enableVoiceInput: boolean;
  enableAvatar: boolean;
}

/**
 * Hook return type for useOliviaChat
 */
export interface UseOliviaChatReturn {
  messages: OliviaChatMessage[];
  threadId: string | null;
  isTyping: boolean;
  isContextLoading: boolean;
  error: OliviaError | null;
  sendMessage: (message: string) => Promise<void>;
  clearHistory: () => void;
  setContext: (context: LifeScoreContext) => void;
}

/**
 * Hook return type for useOliviaAvatar
 */
export interface UseOliviaAvatarReturn {
  provider: AvatarProvider;
  status: AvatarStatus;
  session: AvatarSession | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  connect: () => Promise<void>;
  disconnect: () => void;
  speak: (text: string) => Promise<void>;
  interrupt: () => void;
  switchProvider: (provider: AvatarProvider) => void;
}

/**
 * Hook return type for useVoiceRecognition
 */
export interface UseVoiceRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook return type for useTTS
 */
export interface UseTTSReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  play: (text: string) => Promise<void>;
  playUrl: (url: string) => Promise<void>;
  stop: () => void;
}
