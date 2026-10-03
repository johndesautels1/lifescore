/**
 * LIFE SCORE™ Enhanced Comparison Types
 * Multi-LLM consensus scoring system
 */

import { modelForSeat } from '../../api/shared/models';

import type { MetricScore, CategoryId } from './metrics';

// ============================================================================
// LLM PROVIDER DEFINITIONS
// ============================================================================

export type LLMProvider =
  | 'claude-opus'      // The judge (model: AI_MODELS.judge)
  | 'claude-sonnet'    // Anthropic's evaluator seat (AI_MODELS.claudeEvaluator)
  | 'gpt-4o'           // OpenAI's seat (AI_MODELS.gptEvaluator) — the key is a stable seat id, not a model
  | 'gemini-3-pro'     // Google's seat (AI_MODELS.geminiEvaluator)
  | 'grok-4'           // xAI's seat (AI_MODELS.grokEvaluator)
  | 'perplexity'       // Perplexity's seat (AI_MODELS.perplexityEvaluator)

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
    name: modelForSeat('claude-opus').name,
    shortName: 'Opus',
    vendor: 'Anthropic',
    supportsWebSearch: true,
    isJudge: true,
    icon: '🎭',
    color: '#7C3AED'
  },
  'claude-sonnet': {
    id: 'claude-sonnet',
    name: modelForSeat('claude-sonnet').name,
    shortName: 'Sonnet',
    vendor: 'Anthropic',
    supportsWebSearch: true,
    icon: '📝',
    color: '#8B5CF6'
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: modelForSeat('gpt-4o').name,
    shortName: 'GPT',
    vendor: 'OpenAI',
    supportsWebSearch: true,  // Web search via Tavily API
    icon: '🤖',
    color: '#10A37F'
  },
  'gemini-3-pro': {
    id: 'gemini-3-pro',
    name: modelForSeat('gemini-3-pro').name,
    shortName: 'Gemini',
    vendor: 'Google',
    supportsWebSearch: true,
    icon: '💎',
    color: '#4285F4'
  },
  'grok-4': {
    id: 'grok-4',
    name: modelForSeat('grok-4').name,
    shortName: 'Grok',
    vendor: 'xAI',
    supportsWebSearch: true,
    icon: '𝕏',
    color: '#000000'
  },
  'perplexity': {
    id: 'perplexity',
    name: modelForSeat('perplexity').name,
    shortName: 'Perplexity',
    vendor: 'Perplexity',
    supportsWebSearch: true,
    icon: '🔮',
    color: '#20B2AA'
  }
};

// Default 5 LLMs for enhanced comparison (matches firing sequence order)
export const DEFAULT_ENHANCED_LLMS: LLMProvider[] = [
  'claude-sonnet',
  'gpt-4o',
  'gemini-3-pro',
  'grok-4',
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
  consensusScore: number | null;  // Final consensus score (0-100) or null if no data

  // Dual Scoring: Law vs Enforcement Reality
  legalScore: number | null;             // What the law technically says (0-100)
  enforcementScore: number | null;       // How aggressively it's applied (0-100)

  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split' | 'no_data';
  standardDeviation: number | null;      // How much LLMs disagreed
  judgeExplanation: string;              // Claude Opus explanation of consensus
  isMissing?: boolean;                   // True if metric should be excluded from totals
}

/**
 * Category-level consensus
 */
export interface CategoryConsensus {
  categoryId: CategoryId;
  metrics: MetricConsensus[];
  averageConsensusScore: number | null;  // null if no valid metrics (excluded from total)
  agreementLevel: number | null;         // 0-100 how much LLMs agreed, null if no data
  evaluatedMetrics?: number;             // How many metrics had valid data
  totalMetrics?: number;                 // Total possible metrics in category
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
  openai?: string;      // GPT seat (AI_MODELS.gptEvaluator; Tavily for web search)
  gemini?: string;      // Gemini seat (AI_MODELS.geminiEvaluator; Google Search grounding)
  xai?: string;         // Grok seat (AI_MODELS.grokEvaluator; X search)
  perplexity?: string;  // Perplexity seat (AI_MODELS.perplexityEvaluator; native web search)
  tavily?: string;      // Tavily Search API (web search for the Claude and GPT seats)
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
