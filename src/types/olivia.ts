/**
 * LIFE SCORE - Olivia AI Assistant Types
 * Type definitions for Ask Olivia feature
 */

import type { LLMProvider } from './enhancedComparison';

// ============================================================================
// CHAT TYPES
// ============================================================================

/**
 * Chat message in conversation
 */
export interface OliviaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;           // TTS audio URL if generated
  sources?: string[];          // Evidence URLs referenced in response
  isStreaming?: boolean;       // True while response is streaming
}

/**
 * Chat request to API
 */
export interface OliviaChatRequest {
  threadId?: string;           // OpenAI thread ID for continuity
  message: string;             // User's message
  context?: LifeScoreContext;  // LIFE SCORE data context
  generateAudio?: boolean;     // Request TTS audio with response
}

/**
 * Chat response from API
 */
export interface OliviaChatResponse {
  threadId: string;
  messageId: string;
  response: string;
  audioUrl?: string;
  sources?: string[];
  error?: string;
}

// ============================================================================
// CONTEXT TYPES - LIFE SCORE Data for Olivia
// ============================================================================

/**
 * Simplified city data for context
 */
export interface ContextCity {
  name: string;
  country: string;
  totalScore: number;
  normalizedScore: number;
}

/**
 * Category summary for context
 */
export interface ContextCategory {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  winner: 'city1' | 'city2' | 'tie';
  topMetrics: ContextMetric[];
}

/**
 * Metric data for context
 */
export interface ContextMetric {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  consensusLevel?: 'unanimous' | 'strong' | 'moderate' | 'split';
  judgeExplanation?: string;
  legalScore?: number;
  enforcementScore?: number;
}

/**
 * Evidence/source for context
 */
export interface ContextEvidence {
  metricId: string;
  metricName: string;
  city: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

/**
 * Full LIFE SCORE context for Olivia
 */
export interface LifeScoreContext {
  // Comparison overview
  comparison: {
    city1: ContextCity;
    city2: ContextCity;
    winner: string;
    scoreDifference: number;
    generatedAt: string;
    comparisonId: string;
  };

  // Category breakdowns
  categories: ContextCategory[];

  // Top metrics (most significant differences or disagreements)
  topMetrics: ContextMetric[];

  // Evidence and sources
  evidence: ContextEvidence[];

  // Multi-LLM consensus info (enhanced mode only)
  consensus?: {
    llmsUsed: LLMProvider[];
    judgeModel: string;
    overallConfidence: 'high' | 'medium' | 'low';
    disagreementSummary?: string;
    topDisagreements: Array<{
      metricName: string;
      standardDeviation: number;
      explanation: string;
    }>;
  };

  // Gamma report URL if available
  gammaReportUrl?: string;

  // Processing stats
  stats?: {
    metricsEvaluated: number;
    totalProcessingTimeMs: number;
  };
}

/**
 * Context build request to API
 */
export interface ContextBuildRequest {
  comparisonId: string;
  includeEvidence?: boolean;
  maxTokens?: number;
}

/**
 * Context build response from API
 */
export interface ContextBuildResponse {
  context: LifeScoreContext;
  textSummary?: string; // Human-readable summary with all 100 metrics
  tokenEstimate: number;
  truncated: boolean;
}

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
}

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
// QUICK ACTIONS
// ============================================================================

/**
 * Predefined quick action button
 */
export interface OliviaQuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  category: 'overview' | 'metrics' | 'advice' | 'sources';
}

/**
 * Default quick actions for Olivia
 */
export const DEFAULT_QUICK_ACTIONS: OliviaQuickAction[] = [
  {
    id: 'explain_winner',
    label: 'Explain the Winner',
    icon: '🏆',
    prompt: 'Why did the winning city score higher? What are the key differences?',
    category: 'overview',
  },
  {
    id: 'biggest_differences',
    label: 'Biggest Differences',
    icon: '📊',
    prompt: 'What are the biggest scoring differences between these cities?',
    category: 'metrics',
  },
  {
    id: 'category_breakdown',
    label: 'Category Breakdown',
    icon: '📋',
    prompt: 'Give me a breakdown of how each category scored for both cities.',
    category: 'overview',
  },
  {
    id: 'personal_freedom',
    label: 'Personal Freedom',
    icon: '🗽',
    prompt: 'Compare the personal freedom and autonomy metrics. Which city is more permissive?',
    category: 'metrics',
  },
  {
    id: 'housing_property',
    label: 'Housing & Property',
    icon: '🏠',
    prompt: 'Compare housing and property rights. Which city has fewer restrictions?',
    category: 'metrics',
  },
  {
    id: 'business_taxes',
    label: 'Business & Taxes',
    icon: '💼',
    prompt: 'Compare business regulations and tax burden. Which city is better for entrepreneurs?',
    category: 'metrics',
  },
  {
    id: 'llm_disagreement',
    label: 'Where LLMs Disagreed',
    icon: '🤔',
    prompt: 'Which metrics had the most disagreement among the AI models? Why might that be?',
    category: 'metrics',
  },
  {
    id: 'best_for_priorities',
    label: 'Best for My Priorities',
    icon: '🎯',
    prompt: 'Based on someone who values personal freedom and low taxes, which city would you recommend?',
    category: 'advice',
  },
  {
    id: 'sources_evidence',
    label: 'Show Sources',
    icon: '📚',
    prompt: 'What sources were used to evaluate these cities? Can you cite specific evidence?',
    category: 'sources',
  },
  {
    id: 'gamma_report',
    label: 'About the Report',
    icon: '📑',
    prompt: 'Tell me about the visual report that was generated. What does it contain?',
    category: 'overview',
  },
];

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Olivia configuration
 */
export interface OliviaConfig {
  assistantId: string;
  heygenAvatarId?: string;
  didAgentId?: string;
  elevenlabsVoiceId?: string;
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
