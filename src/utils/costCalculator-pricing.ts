/**
 * LIFE SCORE™ Cost Calculator
 * Tracks and calculates API costs for LLM and Tavily usage
 *
 * Pricing as of January 2025 (update these values as pricing changes)
 */

// ============================================================================
// API PRICING CONFIGURATION (per 1M tokens unless noted)
// ============================================================================

export const API_PRICING = {
  // Anthropic Claude
  'claude-opus-4-5': {
    input: 15.00,    // $15 per 1M input tokens
    output: 75.00,   // $75 per 1M output tokens
    name: 'Claude Opus 4.5',
    icon: '🧠'
  },
  'claude-sonnet-4-5': {
    input: 3.00,     // $3 per 1M input tokens
    output: 15.00,   // $15 per 1M output tokens
    name: 'Claude Sonnet 4.5',
    icon: '🎵'
  },

  // OpenAI
  'gpt-4o': {
    input: 2.50,     // $2.50 per 1M input tokens
    output: 10.00,   // $10 per 1M output tokens
    name: 'GPT-4o',
    icon: '🤖'
  },

  // Google Gemini
  'gemini-3-pro': {
    input: 1.25,     // $1.25 per 1M input tokens
    output: 5.00,    // $5 per 1M output tokens
    name: 'Gemini 3.1 Pro',
    icon: '💎'
  },

  // xAI Grok
  'grok-4': {
    input: 3.00,     // $3 per 1M input tokens (estimated)
    output: 15.00,   // $15 per 1M output tokens (estimated)
    name: 'Grok 4',
    icon: '🚀'
  },

  // Perplexity
  'perplexity-sonar': {
    input: 1.00,     // $1 per 1M input tokens
    output: 5.00,    // $5 per 1M output tokens
    name: 'Perplexity Sonar',
    icon: '🔍'
  },

  // OpenAI GPT-4 (for Olivia Assistant)
  'gpt-4-turbo': {
    input: 10.00,    // $10 per 1M input tokens
    output: 30.00,   // $30 per 1M output tokens
    name: 'GPT-4 Turbo (Olivia)',
    icon: '💬'
  },

  // Tavily (credit-based pricing)
  'tavily-research': {
    perCredit: 0.01,  // $0.01 per credit (estimated from $50/5000 credits)
    minCredits: 4,
    maxCredits: 110,
    avgCredits: 30,   // typical usage
    name: 'Tavily Research',
    icon: '📚'
  },
  'tavily-search': {
    perCredit: 0.01,  // $0.01 per credit
    minCredits: 1,
    maxCredits: 10,
    avgCredits: 3,    // typical usage per search
    name: 'Tavily Search',
    icon: '🔎'
  },

  // Gamma (credit-based for visual reports)
  'gamma': {
    perGeneration: 0.50,  // ~$0.50 per generation (estimated based on plan)
    name: 'Gamma Reports',
    icon: '📊'
  },

  // TTS SERVICES (character-based pricing)
  'elevenlabs-tts': { perThousandChars: 0.18, name: 'ElevenLabs TTS', icon: '🔊' },
  'openai-tts': { perThousandChars: 0.015, name: 'OpenAI TTS', icon: '🗣️' },
  'openai-tts-hd': { perThousandChars: 0.030, name: 'OpenAI TTS HD', icon: '🎙️' },

  // AVATAR SERVICES (time-based pricing)
  'replicate-wav2lip': { perSecond: 0.0014, name: 'Replicate Wav2Lip', icon: '🎬' },
  'd-id': { perSecond: 0.025, name: 'D-ID Avatar', icon: '👤' },
  'simli': { perSecond: 0.02, name: 'Simli Avatar', icon: '🎭' },
  'heygen': { perSecond: 0.032, name: 'HeyGen Avatar', icon: '🎥' },

  // IMAGE GENERATION SERVICES
  'kling': { perImage: 0.05, name: 'Kling AI', icon: '🖼️' }
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface APICallCost {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: number;
  context?: string;  // e.g., "city1-personal_freedom" or "judge"
}

export interface TavilyCost {
  type: 'research' | 'search';
  creditsUsed: number;
  cost: number;
  timestamp: number;
  query?: string;
}

export interface GammaCost {
  generationId: string;
  cost: number;
  timestamp: number;
}

export interface OliviaCost {
  threadId: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: number;
}

// TTS Cost (ElevenLabs, OpenAI TTS)
export interface TTSCost {
  provider: 'elevenlabs' | 'openai' | 'openai-hd';
  characters: number;
  cost: number;
  timestamp: number;
  context?: string;
}

// Avatar Cost (Replicate Wav2Lip, D-ID, Simli, HeyGen)
export interface AvatarCost {
  provider: 'replicate-wav2lip' | 'd-id' | 'simli' | 'heygen';
  durationSeconds: number;
  cost: number;
  timestamp: number;
  context?: string;
}

// Kling Image Generation Cost
export interface KlingCost {
  imageCount: number;
  cost: number;
  timestamp: number;
  context?: string;
}

export interface ComparisonCostBreakdown {
  comparisonId: string;
  city1: string;
  city2: string;
  mode: 'simple' | 'enhanced';
  timestamp: number;

  // Tavily costs
  tavilyResearch: TavilyCost | null;
  tavilySearches: TavilyCost[];
  tavilyTotal: number;

  // LLM Evaluator costs
  claudeSonnet: APICallCost[];
  gpt4o: APICallCost[];
  gemini: APICallCost[];
  grok: APICallCost[];
  perplexity: APICallCost[];
  evaluatorTotal: number;

  // Judge costs
  opusJudge: APICallCost | null;
  judgeTotal: number;

  // Gamma costs (visual reports)
  gamma: GammaCost | null;
  gammaTotal: number;

  // Olivia costs (chat assistant)
  olivia: OliviaCost[];
  oliviaTotal: number;

  // TTS costs (judge video narration)
  tts: TTSCost[];
  ttsTotal: number;

  // Avatar costs (judge video, Olivia avatar)
  avatar: AvatarCost[];
  avatarTotal: number;

  // Kling image generation costs
  kling: KlingCost[];
  klingTotal: number;

  // Totals
  grandTotal: number;
}

export interface CostSummary {
  totalComparisons: number;
  simpleComparisons: number;
  enhancedComparisons: number;

  // By provider
  tavilyCost: number;
  claudeSonnetCost: number;
  claudeOpusCost: number;
  gpt4oCost: number;
  geminiCost: number;
  grokCost: number;
  perplexityCost: number;
  gammaCost: number;
  oliviaCost: number;
  ttsCost: number;
  avatarCost: number;
  klingCost: number;

  // Totals
  totalEvaluatorCost: number;
  totalJudgeCost: number;
  totalGammaCost: number;
  totalOliviaCost: number;
  totalTTSCost: number;
  totalAvatarCost: number;
  totalKlingCost: number;
  grandTotal: number;

  // Averages
  avgCostPerEnhanced: number;
  avgCostPerSimple: number;
}
