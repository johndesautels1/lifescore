/**
 * LIFE SCORE - Scoring Thresholds Unit Tests
 * Tests confidence level determination from standard deviations
 */
import { describe, it, expect } from 'vitest';
import {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  isDisagreementArea,
} from '../src/constants/scoringThresholds';

// ============================================================================
// CONFIDENCE_THRESHOLDS constants
// ============================================================================

describe('CONFIDENCE_THRESHOLDS', () => {
  it('has expected threshold values', () => {
    expect(CONFIDENCE_THRESHOLDS.UNANIMOUS).toBe(5);
    expect(CONFIDENCE_THRESHOLDS.STRONG).toBe(12);
    expect(CONFIDENCE_THRESHOLDS.MODERATE).toBe(20);
    expect(CONFIDENCE_THRESHOLDS.DISAGREEMENT_FLAG).toBe(20);
    expect(CONFIDENCE_THRESHOLDS.DEFAULT_AVG_STDDEV).toBe(25);
  });
});

// ============================================================================
// getConfidenceLevel
// ============================================================================

describe('getConfidenceLevel', () => {
  it('returns unanimous for stdDev < 5', () => {
    expect(getConfidenceLevel(0)).toBe('unanimous');
    expect(getConfidenceLevel(2.5)).toBe('unanimous');
    expect(getConfidenceLevel(4.99)).toBe('unanimous');
  });

  it('returns strong for stdDev >= 5 and < 12', () => {
    expect(getConfidenceLevel(5)).toBe('strong');
    expect(getConfidenceLevel(8)).toBe('strong');
    expect(getConfidenceLevel(11.99)).toBe('strong');
  });

  it('returns moderate for stdDev >= 12 and < 20', () => {
    expect(getConfidenceLevel(12)).toBe('moderate');
    expect(getConfidenceLevel(15)).toBe('moderate');
    expect(getConfidenceLevel(19.99)).toBe('moderate');
  });

  it('returns split for stdDev >= 20', () => {
    expect(getConfidenceLevel(20)).toBe('split');
    expect(getConfidenceLevel(30)).toBe('split');
    expect(getConfidenceLevel(100)).toBe('split');
  });

  it('handles edge cases at exact boundaries', () => {
    expect(getConfidenceLevel(5)).toBe('strong');   // exactly 5 = strong (not unanimous)
    expect(getConfidenceLevel(12)).toBe('moderate'); // exactly 12 = moderate (not strong)
    expect(getConfidenceLevel(20)).toBe('split');    // exactly 20 = split (not moderate)
  });
});

// ============================================================================
// isDisagreementArea
// ============================================================================

describe('isDisagreementArea', () => {
  it('returns false for low stdDev', () => {
    expect(isDisagreementArea(0)).toBe(false);
    expect(isDisagreementArea(10)).toBe(false);
    expect(isDisagreementArea(19)).toBe(false);
  });

  it('returns false at exactly the threshold (uses >)', () => {
    expect(isDisagreementArea(20)).toBe(false);
  });

  it('returns true above threshold', () => {
    expect(isDisagreementArea(20.01)).toBe(true);
    expect(isDisagreementArea(25)).toBe(true);
    expect(isDisagreementArea(50)).toBe(true);
  });
});
