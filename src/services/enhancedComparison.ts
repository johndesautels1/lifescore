/**
 * LIFE SCORE™ Enhanced Comparison Service
 * API Key Management utilities
 *
 * REFACTORED: 2026-01-20
 * - Removed dead runEnhancedComparison() function (~270 lines)
 * - LLM evaluation now uses LLMSelector -> runSingleEvaluatorBatched()
 * - See "Dead Code" folder for archived function if restoration needed
 */

import type { LLMProvider, LLMAPIKeys } from '../types/enhancedComparison';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  API_KEYS: 'lifescore_api_keys',
  ENHANCED_CONFIG: 'lifescore_enhanced_config'
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Get stored API keys from localStorage
 */
export function getStoredAPIKeys(): LLMAPIKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save API keys to localStorage
 */
export function saveAPIKeys(keys: LLMAPIKeys): void {
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
}

/**
 * Check which LLMs have valid API keys configured
 */
export function getAvailableLLMs(keys: LLMAPIKeys): LLMProvider[] {
  const available: LLMProvider[] = [];

  if (keys.anthropic) {
    available.push('claude-opus', 'claude-sonnet');
  }
  if (keys.openai) {
    available.push('gpt-4o');
  }
  if (keys.gemini) {
    available.push('gemini-3-pro');
  }
  if (keys.xai) {
    available.push('grok-4');
  }
  if (keys.perplexity) {
    available.push('perplexity');
  }

  return available;
}
