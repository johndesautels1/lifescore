/**
 * LIFE SCORE - Olivia AI Assistant Types
 * Type definitions for Ask Olivia feature
 *
 * This barrel file re-exports all Olivia types from domain-specific files.
 */

// ============================================================================
// RE-EXPORTS FROM DOMAIN FILES
// ============================================================================

// Chat & Context types
export type {
  OliviaChatMessage,
  OliviaChatRequest,
  OliviaChatResponse,
  ContextCity,
  ContextCategory,
  ContextMetric,
  ContextEvidence,
  LifeScoreContext,
  ContextBuildRequest,
  ContextBuildResponse,
} from './olivia-chat';

// Avatar & Voice types
export type {
  AvatarProvider,
  AvatarStatus,
  HeyGenSessionRequest,
  HeyGenSessionResponse,
  DIDAgentRequest,
  DIDAgentResponse,
  AvatarSession,
  VoiceRecognitionState,
  TTSRequest,
  TTSResponse,
} from './olivia-avatar';

// State, Config & Hook return types
export type {
  OliviaMode,
  OliviaState,
  OliviaErrorType,
  OliviaError,
  OliviaConfig,
  UseOliviaChatReturn,
  UseOliviaAvatarReturn,
  UseVoiceRecognitionReturn,
  UseTTSReturn,
} from './olivia-state';

// Quick Actions (includes runtime value DEFAULT_QUICK_ACTIONS)
export type { OliviaQuickAction } from './olivia-actions';
export { DEFAULT_QUICK_ACTIONS } from './olivia-actions';
