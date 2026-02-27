/**
 * LIFE SCORE™ Cost Calculator
 * Tracks and calculates API costs for LLM and Tavily usage
 *
 * This barrel file re-exports all pricing data, types, and functions.
 */

// Pricing data + type definitions
export { API_PRICING } from './costCalculator-pricing';
export type {
  TokenUsage,
  APICallCost,
  TavilyCost,
  GammaCost,
  OliviaCost,
  TTSCost,
  AvatarCost,
  KlingCost,
  ComparisonCostBreakdown,
  CostSummary,
} from './costCalculator-pricing';

// Calculation, storage, and utility functions
export {
  calculateLLMCost,
  calculateTavilyCost,
  estimateTokens,
  calculateGammaCost,
  calculateTTSCost,
  calculateAvatarCost,
  calculateKlingCost,
  getStoredCosts,
  storeCostBreakdown,
  clearStoredCosts,
  appendServiceCost,
  calculateCostSummary,
  createCostBreakdown,
  finalizeCostBreakdown,
  formatCost,
  toApiCostRecordInsert,
  formatCostBreakdownLog,
} from './costCalculator-functions';
