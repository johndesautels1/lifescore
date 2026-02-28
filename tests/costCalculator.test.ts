/**
 * LIFE SCORE - Cost Calculator Unit Tests
 * Tests pure calculation functions with zero side effects
 */
import { describe, it, expect } from 'vitest';
import {
  calculateLLMCost,
  calculateTavilyCost,
  estimateTokens,
  calculateGammaCost,
  calculateTTSCost,
  calculateAvatarCost,
  calculateKlingCost,
  formatCost,
  createCostBreakdown,
  finalizeCostBreakdown,
} from '../src/utils/costCalculator-functions';

// ============================================================================
// calculateLLMCost
// ============================================================================

describe('calculateLLMCost', () => {
  it('calculates Claude Opus cost correctly', () => {
    // 1000 input tokens, 500 output tokens
    // Opus: $15/1M input, $75/1M output
    const result = calculateLLMCost('claude-opus-4-5', 1000, 500);
    expect(result.inputCost).toBeCloseTo(0.015, 5);
    expect(result.outputCost).toBeCloseTo(0.0375, 5);
    expect(result.totalCost).toBeCloseTo(0.0525, 5);
  });

  it('calculates GPT-4o cost correctly', () => {
    // $2.50/1M input, $10/1M output
    const result = calculateLLMCost('gpt-4o', 10000, 5000);
    expect(result.inputCost).toBeCloseTo(0.025, 5);
    expect(result.outputCost).toBeCloseTo(0.05, 5);
    expect(result.totalCost).toBeCloseTo(0.075, 5);
  });

  it('calculates Gemini cost correctly', () => {
    // $1.25/1M input, $5/1M output
    const result = calculateLLMCost('gemini-3-pro', 100000, 50000);
    expect(result.inputCost).toBeCloseTo(0.125, 5);
    expect(result.outputCost).toBeCloseTo(0.25, 5);
    expect(result.totalCost).toBeCloseTo(0.375, 5);
  });

  it('returns zero for zero tokens', () => {
    const result = calculateLLMCost('claude-sonnet-4-5', 0, 0);
    expect(result.inputCost).toBe(0);
    expect(result.outputCost).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it('handles large token counts', () => {
    // 1 million tokens each
    const result = calculateLLMCost('claude-opus-4-5', 1_000_000, 1_000_000);
    expect(result.inputCost).toBeCloseTo(15.0, 2);
    expect(result.outputCost).toBeCloseTo(75.0, 2);
    expect(result.totalCost).toBeCloseTo(90.0, 2);
  });
});

// ============================================================================
// calculateTavilyCost
// ============================================================================

describe('calculateTavilyCost', () => {
  it('calculates research credit cost', () => {
    // $0.01 per credit
    expect(calculateTavilyCost('research', 30)).toBeCloseTo(0.30, 4);
  });

  it('calculates search credit cost', () => {
    expect(calculateTavilyCost('search', 3)).toBeCloseTo(0.03, 4);
  });

  it('returns zero for zero credits', () => {
    expect(calculateTavilyCost('research', 0)).toBe(0);
  });
});

// ============================================================================
// estimateTokens
// ============================================================================

describe('estimateTokens', () => {
  it('estimates ~4 chars per token', () => {
    expect(estimateTokens('hello')).toBe(2); // ceil(5/4) = 2
  });

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('handles long text', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokens(text)).toBe(100); // 400/4
  });

  it('rounds up partial tokens', () => {
    expect(estimateTokens('abc')).toBe(1); // ceil(3/4) = 1
  });
});

// ============================================================================
// calculateGammaCost
// ============================================================================

describe('calculateGammaCost', () => {
  it('returns per-generation cost', () => {
    expect(calculateGammaCost()).toBe(0.50);
  });
});

// ============================================================================
// calculateTTSCost
// ============================================================================

describe('calculateTTSCost', () => {
  it('calculates ElevenLabs TTS cost', () => {
    // $0.18 per 1000 chars
    expect(calculateTTSCost('elevenlabs', 1000)).toBeCloseTo(0.18, 4);
  });

  it('calculates OpenAI TTS cost', () => {
    // $0.015 per 1000 chars
    expect(calculateTTSCost('openai', 5000)).toBeCloseTo(0.075, 4);
  });

  it('calculates OpenAI HD TTS cost', () => {
    // $0.030 per 1000 chars
    expect(calculateTTSCost('openai-hd', 2000)).toBeCloseTo(0.060, 4);
  });

  it('returns zero for zero characters', () => {
    expect(calculateTTSCost('elevenlabs', 0)).toBe(0);
  });
});

// ============================================================================
// calculateAvatarCost
// ============================================================================

describe('calculateAvatarCost', () => {
  it('calculates Replicate wav2lip cost', () => {
    // $0.0014 per second
    expect(calculateAvatarCost('replicate-wav2lip', 60)).toBeCloseTo(0.084, 4);
  });

  it('calculates D-ID cost', () => {
    // $0.025 per second
    expect(calculateAvatarCost('d-id', 30)).toBeCloseTo(0.75, 4);
  });

  it('calculates Simli cost', () => {
    // $0.02 per second
    expect(calculateAvatarCost('simli', 120)).toBeCloseTo(2.40, 4);
  });

  it('calculates HeyGen cost', () => {
    // $0.032 per second
    expect(calculateAvatarCost('heygen', 10)).toBeCloseTo(0.32, 4);
  });

  it('returns zero for zero duration', () => {
    expect(calculateAvatarCost('d-id', 0)).toBe(0);
  });
});

// ============================================================================
// calculateKlingCost
// ============================================================================

describe('calculateKlingCost', () => {
  it('calculates per-image cost', () => {
    // $0.05 per image
    expect(calculateKlingCost(5)).toBeCloseTo(0.25, 4);
  });

  it('returns zero for zero images', () => {
    expect(calculateKlingCost(0)).toBe(0);
  });
});

// ============================================================================
// formatCost
// ============================================================================

describe('formatCost', () => {
  it('formats with dollar sign and two decimal places', () => {
    expect(formatCost(1.5)).toBe('$1.50');
  });

  it('formats zero', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('formats small values', () => {
    expect(formatCost(0.001)).toBe('$0.00');
  });

  it('formats large values', () => {
    expect(formatCost(123.456)).toBe('$123.46');
  });
});

// ============================================================================
// createCostBreakdown / finalizeCostBreakdown
// ============================================================================

describe('createCostBreakdown', () => {
  it('creates an empty breakdown with correct metadata', () => {
    const breakdown = createCostBreakdown('test-123', 'Austin', 'Berlin', 'enhanced');
    expect(breakdown.comparisonId).toBe('test-123');
    expect(breakdown.city1).toBe('Austin');
    expect(breakdown.city2).toBe('Berlin');
    expect(breakdown.mode).toBe('enhanced');
    expect(breakdown.grandTotal).toBe(0);
    expect(breakdown.claudeSonnet).toEqual([]);
    expect(breakdown.gpt4o).toEqual([]);
    expect(breakdown.opusJudge).toBeNull();
  });
});

describe('finalizeCostBreakdown', () => {
  it('calculates totals from populated breakdown', () => {
    const breakdown = createCostBreakdown('test-456', 'NYC', 'London', 'enhanced');

    breakdown.claudeSonnet = [
      { provider: 'claude', model: 'sonnet', inputTokens: 1000, outputTokens: 500, inputCost: 0.003, outputCost: 0.0075, totalCost: 0.0105, timestamp: Date.now() }
    ];
    breakdown.gpt4o = [
      { provider: 'openai', model: 'gpt-4o', inputTokens: 1000, outputTokens: 500, inputCost: 0.0025, outputCost: 0.005, totalCost: 0.0075, timestamp: Date.now() }
    ];
    breakdown.tavilySearches = [
      { type: 'search', creditsUsed: 3, cost: 0.03, timestamp: Date.now() }
    ];
    breakdown.tavilyResearch = { type: 'research', creditsUsed: 30, cost: 0.30, timestamp: Date.now() };

    const finalized = finalizeCostBreakdown(breakdown);

    expect(finalized.tavilyTotal).toBeCloseTo(0.33, 4);
    expect(finalized.evaluatorTotal).toBeCloseTo(0.018, 4);
    expect(finalized.judgeTotal).toBe(0);
    expect(finalized.grandTotal).toBeCloseTo(0.348, 4);
  });

  it('handles empty breakdown', () => {
    const breakdown = createCostBreakdown('empty', 'A', 'B', 'simple');
    const finalized = finalizeCostBreakdown(breakdown);
    expect(finalized.grandTotal).toBe(0);
    expect(finalized.evaluatorTotal).toBe(0);
    expect(finalized.tavilyTotal).toBe(0);
  });
});
