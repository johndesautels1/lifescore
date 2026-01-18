/**
 * LIFE SCORE™ Enhanced Comparison Types
 * Multi-LLM consensus scoring system
 */

import type { MetricScore, CategoryId } from './metrics';

// ============================================================================
// LLM PROVIDER DEFINITIONS
// ============================================================================

export type LLMProvider =
  | 'claude-opus'      // Anthropic Claude Opus 4.5 (Primary Judge)
  | 'claude-sonnet'    // Anthropic Claude Sonnet 4.5
  | 'gpt-4o'           // OpenAI GPT-4o (with Tavily web search)
  | 'gemini-3-pro'     // Google Gemini 3 Pro
  | 'grok-4'           // xAI Grok 4
  | 'perplexity'       // Perplexity Sonar Reasoning Pro

// ============================================================================
// EVIDENCE TYPE - Citations from LLM web search
// ============================================================================

export interface EvidenceItem {
  city: string;
  title: string;
  url: string;
  snippet: string;
  retrieved_at: string;
}

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
    name: 'Claude Sonnet 4.5',
    shortName: 'Sonnet',
    vendor: 'Anthropic',
    supportsWebSearch: true,
    icon: '📝',
    color: '#8B5CF6'
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'GPT-4o',
    shortName: 'GPT-4o',
    vendor: 'OpenAI',
    supportsWebSearch: true,  // Web search via Tavily API
    icon: '🤖',
    color: '#10A37F'
  },
  'gemini-3-pro': {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    shortName: 'Gemini',
    vendor: 'Google',
    supportsWebSearch: true,
    icon: '💎',
    color: '#4285F4'
  },
  'grok-4': {
    id: 'grok-4',
    name: 'Grok 4',
    shortName: 'Grok',
    vendor: 'xAI',
    supportsWebSearch: true,
    icon: '𝕏',
    color: '#000000'
  },
  'perplexity': {
    id: 'perplexity',
    name: 'Sonar Reasoning Pro',
    shortName: 'Perplexity',
    vendor: 'Perplexity',
    supportsWebSearch: true,
    icon: '🔮',
    color: '#20B2AA'
  }
};

// Default 5 LLMs for enhanced comparison (Claude Opus is judge)
export const DEFAULT_ENHANCED_LLMS: LLMProvider[] = [
  'gpt-4o',
  'gemini-3-pro',
  'grok-4',
  'claude-sonnet',
  'perplexity'
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
  // Dual scoring fields (from real LLM evaluation)
  legalScore?: number;
  enforcementScore?: number;
  // Source tracking for citations (legacy string[] format)
  sources?: string[];
  // Evidence items with full citation data (LLM format)
  evidence?: EvidenceItem[];
  // Which city this score is for (used during aggregation)
  city?: 'city1' | 'city2';
}

/**
 * All LLM scores for a single metric
 */
export interface MetricConsensus {
  metricId: string;
  llmScores: LLMMetricScore[];
  consensusScore: number;         // Final consensus score (0-100) - "Lived Freedom" blended score

  // Dual Scoring: Law vs Enforcement Reality
  legalScore: number;             // What the law technically says (0-100)
  enforcementScore: number;       // How aggressively it's applied (0-100)

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
    // Cache indicators
    fromCache?: boolean;
    cachedAt?: string;
  };
}

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

export interface LLMAPIKeys {
  anthropic?: string;   // Claude Opus & Sonnet (Sonnet uses Tavily for web search)
  openai?: string;      // GPT-4o (uses Tavily for web search)
  gemini?: string;      // Gemini 3 Pro (native Google Search grounding)
  xai?: string;         // Grok 4 (native X/Twitter search)
  perplexity?: string;  // Sonar Reasoning Pro (native web search)
  tavily?: string;      // Tavily Search API (for Claude Sonnet + GPT-4o web search)
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
