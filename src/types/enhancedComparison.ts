/**
 * LIFE SCORE™ Enhanced Comparison Types
 * Multi-LLM consensus scoring system
 */

import type { MetricScore, CategoryId } from './metrics';

// ============================================================================
// LLM PROVIDER DEFINITIONS
// ============================================================================

export type LLMProvider =
  | 'claude-opus'      // Anthropic Claude Opus (Primary Judge)
  | 'claude-sonnet'    // Anthropic Claude Sonnet
  | 'gpt-4'            // OpenAI GPT-4
  | 'gpt-4-turbo'      // OpenAI GPT-4 Turbo
  | 'gemini-pro'       // Google Gemini Pro
  | 'gemini-ultra'     // Google Gemini Ultra
  | 'mistral-large'    // Mistral Large
  | 'llama-3'          // Meta Llama 3

export interface LLMConfig {
  id: LLMProvider;
  name: string;
  shortName: string;
  vendor: string;
  endpoint?: string;
  supportsWebSearch: boolean;
  isJudge?: boolean;  // Claude Opus is the final judge
  icon: string;
  color: string;
}

export const LLM_CONFIGS: Record<LLMProvider, LLMConfig> = {
  'claude-opus': {
    id: 'claude-opus',
    name: 'Claude Opus 4.5',
    shortName: 'Opus',
    vendor: 'Anthropic',
    supportsWebSearch: true,
    isJudge: true,
    icon: '🎭',
    color: '#7C3AED'
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: 'Claude Sonnet 4',
    shortName: 'Sonnet',
    vendor: 'Anthropic',
    supportsWebSearch: true,
    icon: '📝',
    color: '#8B5CF6'
  },
  'gpt-4': {
    id: 'gpt-4',
    name: 'GPT-4',
    shortName: 'GPT-4',
    vendor: 'OpenAI',
    supportsWebSearch: false,
    icon: '🤖',
    color: '#10A37F'
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    shortName: 'GPT-4T',
    vendor: 'OpenAI',
    supportsWebSearch: true,
    icon: '⚡',
    color: '#00A67E'
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    shortName: 'Gemini',
    vendor: 'Google',
    supportsWebSearch: true,
    icon: '💎',
    color: '#4285F4'
  },
  'gemini-ultra': {
    id: 'gemini-ultra',
    name: 'Gemini Ultra',
    shortName: 'Ultra',
    vendor: 'Google',
    supportsWebSearch: true,
    icon: '🌟',
    color: '#EA4335'
  },
  'mistral-large': {
    id: 'mistral-large',
    name: 'Mistral Large',
    shortName: 'Mistral',
    vendor: 'Mistral AI',
    supportsWebSearch: false,
    icon: '🌀',
    color: '#FF7000'
  },
  'llama-3': {
    id: 'llama-3',
    name: 'Llama 3 70B',
    shortName: 'Llama',
    vendor: 'Meta',
    supportsWebSearch: false,
    icon: '🦙',
    color: '#0668E1'
  }
};

// Default 5 LLMs for enhanced comparison
export const DEFAULT_ENHANCED_LLMS: LLMProvider[] = [
  'claude-sonnet',
  'gpt-4-turbo',
  'gemini-pro',
  'mistral-large',
  'llama-3'
];

// ============================================================================
// ENHANCED SCORING TYPES
// ============================================================================

/**
 * Score from a single LLM for a single metric
 */
export interface LLMMetricScore extends MetricScore {
  llmProvider: LLMProvider;
  processingTimeMs?: number;
  explanation?: string;
}

/**
 * All LLM scores for a single metric
 */
export interface MetricConsensus {
  metricId: string;
  llmScores: LLMMetricScore[];
  consensusScore: number;         // Final consensus score (0-100)
  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  standardDeviation: number;      // How much LLMs disagreed
  judgeExplanation: string;       // Claude Opus explanation of consensus
}

/**
 * Category-level consensus
 */
export interface CategoryConsensus {
  categoryId: CategoryId;
  metrics: MetricConsensus[];
  averageConsensusScore: number;
  agreementLevel: number;  // 0-100 how much LLMs agreed
}

/**
 * Full city consensus scores
 */
export interface CityConsensusScore {
  city: string;
  country: string;
  region?: string;
  categories: CategoryConsensus[];
  totalConsensusScore: number;
  overallAgreement: number;  // How much LLMs agreed overall (0-100)
}

/**
 * Enhanced comparison result with multi-LLM data
 */
export interface EnhancedComparisonResult {
  city1: CityConsensusScore;
  city2: CityConsensusScore;
  winner: 'city1' | 'city2' | 'tie';
  scoreDifference: number;
  categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  comparisonId: string;
  generatedAt: string;

  // Enhanced features
  llmsUsed: LLMProvider[];
  judgeModel: LLMProvider;
  overallConsensusConfidence: 'high' | 'medium' | 'low';
  disagreementSummary: string;  // Where LLMs disagreed most
  processingStats: {
    totalTimeMs: number;
    llmTimings: Record<LLMProvider, number>;
    metricsEvaluated: number;
  };
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export interface LLMAPIKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
  mistral?: string;
  together?: string;  // For Llama 3 via Together.ai
}

export interface EnhancedComparisonConfig {
  apiKeys: LLMAPIKeys;
  llmsToUse: LLMProvider[];
  judgeModel: LLMProvider;
  parallelRequests: boolean;
  maxRetries: number;
  timeoutMs: number;
}

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

export interface EnhancedComparisonProgress {
  phase: 'initializing' | 'evaluating' | 'judging' | 'complete';
  currentLLM?: LLMProvider;
  llmsCompleted: LLMProvider[];
  metricsProcessed: number;
  totalMetrics: number;
  currentCategory?: CategoryId;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// UI STATE
// ============================================================================

export interface EnhancedComparisonState {
  status: 'idle' | 'loading' | 'success' | 'error';
  progress?: EnhancedComparisonProgress;
  result?: EnhancedComparisonResult;
  error?: string;
}
