/**
 * LIFE SCORE - API Usage Monitoring Types
 * Types for tracking API quotas, credits, and usage warnings
 *
 * Created: 2026-01-30
 */

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

export interface ProviderQuota {
  provider: string;
  displayName: string;
  icon: string;
  quotaType: 'credits' | 'characters' | 'requests' | 'dollars' | 'seconds';
  monthlyQuota: number;
  warningThresholds: {
    yellow: number; // 50% - informational
    orange: number; // 70% - warning
    red: number;    // 85% - critical
  };
  resetDay: number; // Day of month quota resets (1-31)
  fallbackProvider?: string;
}

export const API_PROVIDER_QUOTAS: Record<string, ProviderQuota> = {
  elevenlabs: {
    provider: 'elevenlabs',
    displayName: 'ElevenLabs TTS',
    icon: '🔊',
    quotaType: 'characters',
    monthlyQuota: 100000, // Starter plan: 100K chars/month
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
    fallbackProvider: 'openai-tts',
  },
  'openai-tts': {
    provider: 'openai-tts',
    displayName: 'OpenAI TTS',
    icon: '🗣️',
    quotaType: 'dollars',
    monthlyQuota: 50, // $50 budget
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
  },
  'd-id': {
    provider: 'd-id',
    displayName: 'D-ID Avatar',
    icon: '👤',
    quotaType: 'credits',
    monthlyQuota: 20, // 20 credits (videos)
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
    fallbackProvider: 'replicate-sadtalker',
  },
  simli: {
    provider: 'simli',
    displayName: 'Simli Avatar',
    icon: '🎭',
    quotaType: 'seconds',
    monthlyQuota: 3600, // 1 hour of streaming
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
    fallbackProvider: 'd-id',
  },
  replicate: {
    provider: 'replicate',
    displayName: 'Replicate SadTalker',
    icon: '🎬',
    quotaType: 'dollars',
    monthlyQuota: 25, // $25 budget
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
  },
  tavily: {
    provider: 'tavily',
    displayName: 'Tavily Research',
    icon: '🔎',
    quotaType: 'credits',
    monthlyQuota: 5000, // 5000 credits
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
  },
  anthropic: {
    provider: 'anthropic',
    displayName: 'Anthropic Claude',
    icon: '🧠',
    quotaType: 'dollars',
    monthlyQuota: 100, // $100 budget
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
  },
  openai: {
    provider: 'openai',
    displayName: 'OpenAI GPT',
    icon: '🤖',
    quotaType: 'dollars',
    monthlyQuota: 50, // $50 budget
    warningThresholds: { yellow: 0.5, orange: 0.7, red: 0.85 },
    resetDay: 1,
  },
};

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface ProviderUsage {
  provider: string;
  used: number;
  quota: number;
  percentage: number;
  status: 'ok' | 'yellow' | 'orange' | 'red' | 'exceeded';
  lastUpdated: number;
  estimatedDaysRemaining: number | null;
}

export interface UsageWarning {
  provider: string;
  displayName: string;
  icon: string;
  level: 'info' | 'warning' | 'critical' | 'exceeded';
  message: string;
  percentage: number;
  fallbackAvailable: boolean;
  fallbackProvider?: string;
  timestamp: number;
}

export interface UsageSnapshot {
  timestamp: number;
  providers: Record<string, ProviderUsage>;
  warnings: UsageWarning[];
  overallStatus: 'healthy' | 'warning' | 'critical';
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ElevenLabsUsageResponse {
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  professional_voice_limit: number;
  can_extend_voice_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  available_models: { model_id: string; display_name: string }[];
  status: {
    first_payment_expected: boolean;
    status: string;
  };
}

export interface OpenAIUsageResponse {
  // OpenAI doesn't have a simple usage API - track locally
  total_tokens: number;
  total_cost: number;
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

export interface StoredUsageData {
  version: number;
  lastSync: number;
  monthlyUsage: Record<string, {
    month: string; // YYYY-MM format
    providers: Record<string, number>;
  }>;
  recentCalls: {
    provider: string;
    timestamp: number;
    units: number;
    context?: string;
  }[];
}

export const USAGE_STORAGE_KEY = 'lifescore_api_usage';
export const USAGE_STORAGE_VERSION = 1;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getUsageStatus(percentage: number): 'ok' | 'yellow' | 'orange' | 'red' | 'exceeded' {
  if (percentage >= 1) return 'exceeded';
  if (percentage >= 0.85) return 'red';
  if (percentage >= 0.7) return 'orange';
  if (percentage >= 0.5) return 'yellow';
  return 'ok';
}

export function getWarningLevel(status: string): 'info' | 'warning' | 'critical' | 'exceeded' {
  switch (status) {
    case 'yellow': return 'info';
    case 'orange': return 'warning';
    case 'red': return 'critical';
    case 'exceeded': return 'exceeded';
    default: return 'info';
  }
}

export function formatQuotaValue(value: number, quotaType: ProviderQuota['quotaType']): string {
  switch (quotaType) {
    case 'characters':
      return value >= 1000 ? `${(value / 1000).toFixed(1)}K chars` : `${value} chars`;
    case 'credits':
      return `${value} credits`;
    case 'requests':
      return `${value} requests`;
    case 'dollars':
      return `$${value.toFixed(2)}`;
    case 'seconds':
      return value >= 60 ? `${(value / 60).toFixed(1)} min` : `${value} sec`;
    default:
      return value.toString();
  }
}
