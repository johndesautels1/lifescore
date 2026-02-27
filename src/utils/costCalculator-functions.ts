/**
 * LIFE SCORE™ Cost Calculator - Functions
 * Calculation, storage, and utility functions
 */

import { API_PRICING } from './costCalculator-pricing';
import type {
  ComparisonCostBreakdown,
  CostSummary,
  TavilyCost,
  GammaCost,
  OliviaCost,
  TTSCost,
  AvatarCost,
  KlingCost,
} from './costCalculator-pricing';

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

/**
 * Calculate Gamma API cost
 */
export function calculateGammaCost(): number {
  const pricing = API_PRICING['gamma'];
  return 'perGeneration' in pricing ? pricing.perGeneration : 0.50;
}

/**
 * Calculate TTS API cost
 */
export function calculateTTSCost(
  provider: 'elevenlabs' | 'openai' | 'openai-hd',
  characters: number
): number {
  const pricingKey = provider === 'elevenlabs' ? 'elevenlabs-tts' :
                     provider === 'openai-hd' ? 'openai-tts-hd' : 'openai-tts';
  const pricing = API_PRICING[pricingKey];
  if ('perThousandChars' in pricing) {
    return (characters / 1000) * pricing.perThousandChars;
  }
  return 0;
}

/**
 * Calculate Avatar API cost
 */
export function calculateAvatarCost(
  provider: 'replicate-wav2lip' | 'd-id' | 'simli' | 'heygen',
  durationSeconds: number
): number {
  const pricing = API_PRICING[provider];
  if ('perSecond' in pricing) {
    return durationSeconds * pricing.perSecond;
  }
  return 0;
}

/**
 * Calculate Kling Image Generation cost
 */
export function calculateKlingCost(imageCount: number): number {
  const pricing = API_PRICING['kling'];
  if ('perImage' in pricing) {
    return imageCount * pricing.perImage;
  }
  return 0;
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
 * FIX #73: Append a service cost to the most recent cost breakdown.
 * Used for costs that occur outside the main comparison flow
 * (TTS, Avatar, Gamma, Olivia chat, Kling videos, Tavily, etc.)
 *
 * This ensures that ALL API costs are tracked in the Cost Dashboard,
 * not just the LLM evaluation costs recorded during the comparison flow.
 */
export function appendServiceCost(
  type: 'tts' | 'avatar' | 'kling' | 'olivia' | 'gamma' | 'tavily',
  cost: TTSCost | AvatarCost | KlingCost | OliviaCost | GammaCost | TavilyCost
): void {
  try {
    const costs = getStoredCosts();
    if (costs.length === 0) {
      // No active comparison - create a standalone entry for service cost tracking
      const standalone = createCostBreakdown('service-costs-' + Date.now(), 'N/A', 'N/A', 'simple');
      costs.unshift(standalone);
    }

    const current = costs[0]; // Most recent breakdown

    switch (type) {
      case 'tts':
        current.tts = current.tts || [];
        current.tts.push(cost as TTSCost);
        break;
      case 'avatar':
        current.avatar = current.avatar || [];
        current.avatar.push(cost as AvatarCost);
        break;
      case 'kling':
        current.kling = current.kling || [];
        current.kling.push(cost as KlingCost);
        break;
      case 'olivia':
        current.olivia = current.olivia || [];
        current.olivia.push(cost as OliviaCost);
        break;
      case 'gamma':
        current.gamma = cost as GammaCost;
        break;
      case 'tavily':
        if ((cost as TavilyCost).type === 'research') {
          current.tavilyResearch = cost as TavilyCost;
        } else {
          current.tavilySearches = current.tavilySearches || [];
          current.tavilySearches.push(cost as TavilyCost);
        }
        break;
    }

    // Recalculate totals
    const finalized = finalizeCostBreakdown(current);
    costs[0] = finalized;

    // Save back
    const trimmed = costs.slice(0, MAX_STORED_COMPARISONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

    const costValue = 'cost' in cost ? (cost as { cost: number }).cost : 0;
    console.log(`[CostTracker] FIX #73: Recorded ${type} cost: $${costValue.toFixed(4)}`);
  } catch (e) {
    console.error('[CostTracker] Failed to append service cost:', e);
  }
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
    gammaCost: 0,
    oliviaCost: 0,
    ttsCost: 0,
    avatarCost: 0,
    klingCost: 0,

    totalEvaluatorCost: 0,
    totalJudgeCost: 0,
    totalGammaCost: 0,
    totalOliviaCost: 0,
    totalTTSCost: 0,
    totalAvatarCost: 0,
    totalKlingCost: 0,
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
    summary.gammaCost += cost.gammaTotal || 0;
    summary.oliviaCost += cost.oliviaTotal || 0;
    summary.ttsCost += cost.ttsTotal || 0;
    summary.avatarCost += cost.avatarTotal || 0;
    summary.klingCost += cost.klingTotal || 0;

    summary.totalEvaluatorCost += cost.evaluatorTotal;
    summary.totalJudgeCost += cost.judgeTotal;
    summary.totalGammaCost += cost.gammaTotal || 0;
    summary.totalOliviaCost += cost.oliviaTotal || 0;
    summary.totalTTSCost += cost.ttsTotal || 0;
    summary.totalAvatarCost += cost.avatarTotal || 0;
    summary.totalKlingCost += cost.klingTotal || 0;
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

    gamma: null,
    gammaTotal: 0,

    olivia: [],
    oliviaTotal: 0,

    tts: [],
    ttsTotal: 0,

    avatar: [],
    avatarTotal: 0,

    kling: [],
    klingTotal: 0,

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

  // Calculate Gamma total
  breakdown.gammaTotal = breakdown.gamma?.cost || 0;

  // Calculate Olivia total
  breakdown.oliviaTotal = breakdown.olivia.reduce((sum, o) => sum + o.totalCost, 0);

  // Calculate TTS total
  breakdown.ttsTotal = (breakdown.tts || []).reduce((sum, t) => sum + t.cost, 0);

  // Calculate Avatar total
  breakdown.avatarTotal = (breakdown.avatar || []).reduce((sum, a) => sum + a.cost, 0);

  // Calculate Kling total
  breakdown.klingTotal = (breakdown.kling || []).reduce((sum, k) => sum + k.cost, 0);

  // Calculate grand total
  breakdown.grandTotal =
    breakdown.tavilyTotal +
    breakdown.evaluatorTotal +
    breakdown.judgeTotal +
    breakdown.gammaTotal +
    breakdown.oliviaTotal +
    breakdown.ttsTotal +
    breakdown.avatarTotal +
    breakdown.klingTotal;

  return breakdown;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

/**
 * Convert a ComparisonCostBreakdown to database insert format
 */
export function toApiCostRecordInsert(
  breakdown: ComparisonCostBreakdown,
  userId: string
): {
  user_id: string;
  comparison_id: string;
  city1_name: string;
  city2_name: string;
  mode: 'simple' | 'enhanced';
  tavily_total: number;
  claude_sonnet_total: number;
  gpt4o_total: number;
  gemini_total: number;
  grok_total: number;
  perplexity_total: number;
  opus_judge_total: number;
  gamma_total: number;
  olivia_total: number;
  tts_total: number;
  avatar_total: number;
  kling_total: number;
  grand_total: number;
  cost_breakdown: Record<string, unknown>;
} {
  return {
    user_id: userId,
    comparison_id: breakdown.comparisonId,
    city1_name: breakdown.city1,
    city2_name: breakdown.city2,
    mode: breakdown.mode,
    tavily_total: breakdown.tavilyTotal,
    claude_sonnet_total: breakdown.claudeSonnet.reduce((s, c) => s + c.totalCost, 0),
    gpt4o_total: breakdown.gpt4o.reduce((s, c) => s + c.totalCost, 0),
    gemini_total: breakdown.gemini.reduce((s, c) => s + c.totalCost, 0),
    grok_total: breakdown.grok.reduce((s, c) => s + c.totalCost, 0),
    perplexity_total: breakdown.perplexity.reduce((s, c) => s + c.totalCost, 0),
    opus_judge_total: breakdown.opusJudge?.totalCost || 0,
    gamma_total: breakdown.gammaTotal || 0,
    olivia_total: breakdown.oliviaTotal || 0,
    tts_total: breakdown.ttsTotal || 0,
    avatar_total: breakdown.avatarTotal || 0,
    kling_total: breakdown.klingTotal || 0,
    grand_total: breakdown.grandTotal,
    cost_breakdown: breakdown as unknown as Record<string, unknown>,
  };
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
    `--- GAMMA REPORTS ---`,
    `Gamma Cost: ${formatCost(breakdown.gammaTotal)}`,
    ``,
    `--- OLIVIA CHAT ---`,
    `Olivia Cost: ${formatCost(breakdown.oliviaTotal)} (${breakdown.olivia.length} messages)`,
    ``,
    `--- TTS (Voice) ---`,
    `ElevenLabs: ${formatCost((breakdown.tts || []).filter(t => t.provider === 'elevenlabs').reduce((s, t) => s + t.cost, 0))}`,
    `OpenAI TTS: ${formatCost((breakdown.tts || []).filter(t => t.provider.startsWith('openai')).reduce((s, t) => s + t.cost, 0))}`,
    `TTS Total: ${formatCost(breakdown.ttsTotal || 0)}`,
    ``,
    `--- AVATAR (Video) ---`,
    `Replicate: ${formatCost((breakdown.avatar || []).filter(a => a.provider === 'replicate-wav2lip').reduce((s, a) => s + a.cost, 0))}`,
    `D-ID: ${formatCost((breakdown.avatar || []).filter(a => a.provider === 'd-id').reduce((s, a) => s + a.cost, 0))}`,
    `Simli: ${formatCost((breakdown.avatar || []).filter(a => a.provider === 'simli').reduce((s, a) => s + a.cost, 0))}`,
    `HeyGen: ${formatCost((breakdown.avatar || []).filter(a => a.provider === 'heygen').reduce((s, a) => s + a.cost, 0))}`,
    `Avatar Total: ${formatCost(breakdown.avatarTotal || 0)}`,
    ``,
    `========== GRAND TOTAL: ${formatCost(breakdown.grandTotal)} ==========\n`
  ];

  return lines.join('\n');
}
