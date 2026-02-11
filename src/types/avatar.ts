/**
 * LIFE SCORE - Avatar System Types
 *
 * Types for Simli AI (Olivia) and Replicate (Christiano) integration.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

// ============================================================================
// SIMLI AI TYPES (Olivia Interactive Chat)
// ============================================================================

export type SimliSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'error'
  | 'disconnected';

export interface SimliSession {
  sessionId: string;
  faceId: string;
  status: SimliSessionStatus;
  streamUrl?: string;
  error?: string;
  createdAt: string;
}

export interface SimliConfig {
  apiKey: string;
  faceId: string;
  voiceId?: string;
  language?: string;
}

export interface SimliSpeakRequest {
  sessionId: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry';
  speed?: number; // 0.5 to 2.0
}

export interface SimliSpeakResponse {
  success: boolean;
  duration?: number;
  error?: string;
}

export interface CreateSimliSessionRequest {
  userId?: string;
}

export interface CreateSimliSessionResponse {
  success: boolean;
  session?: SimliSession;
  error?: string;
}

// ============================================================================
// REPLICATE TYPES (Christiano Judge Videos)
// ============================================================================

export type JudgeVideoStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface JudgeVideo {
  id: string;
  comparisonId: string;
  status: JudgeVideoStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  script: string;
  durationSeconds?: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  replicatePredictionId?: string;
}

export interface GenerateJudgeVideoRequest {
  comparisonId?: string;
  script: string;
  city1: string;
  city2: string;
  winner: string;
  winnerScore: number;
  loserScore: number;
}

export interface GenerateJudgeVideoResponse {
  success: boolean;
  video?: JudgeVideo;
  cached?: boolean;
  error?: string;
}

export interface VideoStatusRequest {
  videoId: string;
}

export interface VideoStatusResponse {
  success: boolean;
  video?: JudgeVideo;
  error?: string;
}

// ============================================================================
// REPLICATE API TYPES
// ============================================================================

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  created_at: string;
  completed_at?: string;
}

/** @deprecated Use Wav2LipInput instead */
export interface MuseTalkInput {
  source_image: string;  // URL to Christiano image
  driven_audio: string;  // URL to TTS audio
  bbox_shift?: number;   // Face bounding box adjustment
}

export interface Wav2LipInput {
  face: string;      // URL to image/video with face
  audio: string;     // URL to audio file
  pads?: string;     // "top bottom left right" default "0 10 0 0"
  smooth?: boolean;  // default true
  fps?: number;      // default 25
  out_height?: number; // default 480
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface AvatarVideoRecord {
  id: string;
  comparison_id: string;
  city1: string;
  city2: string;
  winner: string;
  winner_score?: number;
  loser_score?: number;
  script: string;
  video_url: string;
  audio_url?: string;
  duration_seconds?: number;
  replicate_prediction_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

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

export interface UseJudgeVideoReturn {
  video: JudgeVideo | null;
  status: JudgeVideoStatus;
  isGenerating: boolean;
  isReady: boolean;
  generate: (request: GenerateJudgeVideoRequest) => Promise<void>;
  checkStatus: () => Promise<void>;
  checkExistingVideo: (comparisonId: string) => Promise<JudgeVideo | null>;
  /** Cancel any pending video generation and reset state. Call when switching comparisons. */
  cancel: () => void;
  error: string | null;
}
