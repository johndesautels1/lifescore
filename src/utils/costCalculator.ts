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
    name: 'Gemini 3 Pro',
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
  }
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

  // Totals
  totalEvaluatorCost: number;
  totalJudgeCost: number;
  grandTotal: number;

  // Averages
  avgCostPerEnhanced: number;
  avgCostPerSimple: number;
}

// ============================================================================
// COST CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate cost for an LLM API call
 */
export function calculateLLMCost(
  provider: keyof typeof API_PRICING,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const pricing = API_PRICING[provider];

  if ('input' in pricing && 'output' in pricing) {
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  return { inputCost: 0, outputCost: 0, totalCost: 0 };
}

/**
 * Calculate Tavily API cost
 */
export function calculateTavilyCost(
  type: 'research' | 'search',
  creditsUsed: number
): number {
  const pricing = type === 'research'
    ? API_PRICING['tavily-research']
    : API_PRICING['tavily-search'];

  return creditsUsed * pricing.perCredit;
}

/**
 * Estimate tokens from text (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// COST TRACKING STORAGE
// ============================================================================

const STORAGE_KEY = 'lifescore_cost_tracking';
const MAX_STORED_COMPARISONS = 100; // Keep last 100 comparisons

/**
 * Get all stored cost data
 */
export function getStoredCosts(): ComparisonCostBreakdown[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Store a comparison's cost breakdown
 */
export function storeCostBreakdown(breakdown: ComparisonCostBreakdown): void {
  try {
    const existing = getStoredCosts();
    existing.unshift(breakdown); // Add to beginning

    // Keep only the last N comparisons
    const trimmed = existing.slice(0, MAX_STORED_COMPARISONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to store cost breakdown:', e);
  }
}

/**
 * Clear all stored cost data
 */
export function clearStoredCosts(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Calculate summary statistics from stored costs
 */
export function calculateCostSummary(): CostSummary {
  const costs = getStoredCosts();

  const summary: CostSummary = {
    totalComparisons: costs.length,
    simpleComparisons: costs.filter(c => c.mode === 'simple').length,
    enhancedComparisons: costs.filter(c => c.mode === 'enhanced').length,

    tavilyCost: 0,
    claudeSonnetCost: 0,
    claudeOpusCost: 0,
    gpt4oCost: 0,
    geminiCost: 0,
    grokCost: 0,
    perplexityCost: 0,

    totalEvaluatorCost: 0,
    totalJudgeCost: 0,
    grandTotal: 0,

    avgCostPerEnhanced: 0,
    avgCostPerSimple: 0
  };

  for (const cost of costs) {
    summary.tavilyCost += cost.tavilyTotal;
    summary.claudeSonnetCost += cost.claudeSonnet.reduce((sum, c) => sum + c.totalCost, 0);
    summary.claudeOpusCost += cost.opusJudge?.totalCost || 0;
    summary.gpt4oCost += cost.gpt4o.reduce((sum, c) => sum + c.totalCost, 0);
    summary.geminiCost += cost.gemini.reduce((sum, c) => sum + c.totalCost, 0);
    summary.grokCost += cost.grok.reduce((sum, c) => sum + c.totalCost, 0);
    summary.perplexityCost += cost.perplexity.reduce((sum, c) => sum + c.totalCost, 0);

    summary.totalEvaluatorCost += cost.evaluatorTotal;
    summary.totalJudgeCost += cost.judgeTotal;
    summary.grandTotal += cost.grandTotal;
  }

  // Calculate averages
  const enhancedCosts = costs.filter(c => c.mode === 'enhanced');
  const simpleCosts = costs.filter(c => c.mode === 'simple');

  summary.avgCostPerEnhanced = enhancedCosts.length > 0
    ? enhancedCosts.reduce((sum, c) => sum + c.grandTotal, 0) / enhancedCosts.length
    : 0;

  summary.avgCostPerSimple = simpleCosts.length > 0
    ? simpleCosts.reduce((sum, c) => sum + c.grandTotal, 0) / simpleCosts.length
    : 0;

  return summary;
}

// ============================================================================
// COST BREAKDOWN BUILDER (for use in API calls)
// ============================================================================

/**
 * Create an empty cost breakdown for a new comparison
 */
export function createCostBreakdown(
  comparisonId: string,
  city1: string,
  city2: string,
  mode: 'simple' | 'enhanced'
): ComparisonCostBreakdown {
  return {
    comparisonId,
    city1,
    city2,
    mode,
    timestamp: Date.now(),

    tavilyResearch: null,
    tavilySearches: [],
    tavilyTotal: 0,

    claudeSonnet: [],
    gpt4o: [],
    gemini: [],
    grok: [],
    perplexity: [],
    evaluatorTotal: 0,

    opusJudge: null,
    judgeTotal: 0,

    grandTotal: 0
  };
}

/**
 * Finalize cost breakdown by calculating totals
 */
export function finalizeCostBreakdown(breakdown: ComparisonCostBreakdown): ComparisonCostBreakdown {
  // Calculate Tavily total
  breakdown.tavilyTotal =
    (breakdown.tavilyResearch?.cost || 0) +
    breakdown.tavilySearches.reduce((sum, s) => sum + s.cost, 0);

  // Calculate evaluator total
  breakdown.evaluatorTotal =
    breakdown.claudeSonnet.reduce((sum, c) => sum + c.totalCost, 0) +
    breakdown.gpt4o.reduce((sum, c) => sum + c.totalCost, 0) +
    breakdown.gemini.reduce((sum, c) => sum + c.totalCost, 0) +
    breakdown.grok.reduce((sum, c) => sum + c.totalCost, 0) +
    breakdown.perplexity.reduce((sum, c) => sum + c.totalCost, 0);

  // Calculate judge total
  breakdown.judgeTotal = breakdown.opusJudge?.totalCost || 0;

  // Calculate grand total
  breakdown.grandTotal =
    breakdown.tavilyTotal +
    breakdown.evaluatorTotal +
    breakdown.judgeTotal;

  return breakdown;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Format cost breakdown for logging
 */
export function formatCostBreakdownLog(breakdown: ComparisonCostBreakdown): string {
  const lines = [
    `\n========== COST BREAKDOWN ==========`,
    `Comparison: ${breakdown.city1} vs ${breakdown.city2}`,
    `Mode: ${breakdown.mode.toUpperCase()}`,
    `Time: ${new Date(breakdown.timestamp).toISOString()}`,
    ``,
    `--- TAVILY ---`,
    `Research: ${formatCost(breakdown.tavilyResearch?.cost || 0)} (${breakdown.tavilyResearch?.creditsUsed || 0} credits)`,
    `Searches: ${formatCost(breakdown.tavilySearches.reduce((s, t) => s + t.cost, 0))} (${breakdown.tavilySearches.length} calls)`,
    `Tavily Total: ${formatCost(breakdown.tavilyTotal)}`,
    ``,
    `--- LLM EVALUATORS ---`,
    `Claude Sonnet: ${formatCost(breakdown.claudeSonnet.reduce((s, c) => s + c.totalCost, 0))} (${breakdown.claudeSonnet.length} calls)`,
    `GPT-4o: ${formatCost(breakdown.gpt4o.reduce((s, c) => s + c.totalCost, 0))} (${breakdown.gpt4o.length} calls)`,
    `Gemini: ${formatCost(breakdown.gemini.reduce((s, c) => s + c.totalCost, 0))} (${breakdown.gemini.length} calls)`,
    `Grok: ${formatCost(breakdown.grok.reduce((s, c) => s + c.totalCost, 0))} (${breakdown.grok.length} calls)`,
    `Perplexity: ${formatCost(breakdown.perplexity.reduce((s, c) => s + c.totalCost, 0))} (${breakdown.perplexity.length} calls)`,
    `Evaluator Total: ${formatCost(breakdown.evaluatorTotal)}`,
    ``,
    `--- OPUS JUDGE ---`,
    `Judge Cost: ${formatCost(breakdown.judgeTotal)}`,
    ``,
    `========== GRAND TOTAL: ${formatCost(breakdown.grandTotal)} ==========\n`
  ];

  return lines.join('\n');
}
