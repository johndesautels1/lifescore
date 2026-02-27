/**
 * LIFE SCORE - Olivia AI Assistant Types: Avatar & Voice
 * Clues Intelligence LTD © 2025
 *
 * Avatar providers, sessions, voice recognition, and TTS
 */

// ============================================================================
// AVATAR TYPES
// ============================================================================

/**
 * Avatar provider options
 */
export type AvatarProvider = 'heygen' | 'did' | 'none';

/**
 * Avatar connection status
 */
export type AvatarStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'error'
  | 'reconnecting';

/**
 * HeyGen session request
 */
export interface HeyGenSessionRequest {
  action: 'create' | 'speak' | 'interrupt' | 'close';
  sessionId?: string;
  text?: string;
  voiceId?: string;
}

/**
 * HeyGen session response
 */
export interface HeyGenSessionResponse {
  sessionId: string;
  status: 'created' | 'speaking' | 'idle' | 'closed' | 'error';
  streamUrl?: string;
  iceServers?: RTCIceServer[];
  sdpOffer?: RTCSessionDescriptionInit;
  error?: string;
}

/**
 * D-ID agent request
 */
export interface DIDAgentRequest {
  action: 'create' | 'chat' | 'close';
  agentId?: string;
  sessionId?: string;
  message?: string;
}

/**
 * D-ID agent response
 */
export interface DIDAgentResponse {
  sessionId: string;
  status: 'created' | 'processing' | 'completed' | 'error';
  streamUrl?: string;
  error?: string;
}

/**
 * Avatar session state
 */
export interface AvatarSession {
  provider: AvatarProvider;
  sessionId: string;
  status: AvatarStatus;
  streamUrl?: string;
  peerConnection?: RTCPeerConnection;
  mediaStream?: MediaStream;
}

// ============================================================================
// VOICE TYPES
// ============================================================================

/**
 * Voice recognition state
 */
export interface VoiceRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error?: string;
}

/**
 * TTS request to API
 */
export interface TTSRequest {
  text: string;
  voiceId?: string;
  outputFormat?: 'mp3_44100' | 'pcm_16000';
}

/**
 * TTS response from API
 */
export interface TTSResponse {
  audioUrl: string;
  durationMs: number;
  error?: string;
  fallback?: string;
  // FIX #73: Usage data for cost tracking
  usage?: {
    provider: 'elevenlabs' | 'openai';
    characterCount: number;
  };
}
