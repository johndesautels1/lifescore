/**
 * LIFE SCORE - Olivia AI Assistant Types: Chat & Context
 * Clues Intelligence LTD © 2025
 *
 * Chat messages, requests/responses, and LIFE SCORE context for Olivia
 */

import type { LLMProvider } from './enhancedComparison';

// ============================================================================
// CHAT TYPES
// ============================================================================

/**
 * Chat message in conversation
 */
export interface OliviaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;           // TTS audio URL if generated
  sources?: string[];          // Evidence URLs referenced in response
  isStreaming?: boolean;       // True while response is streaming
}

/**
 * Chat request to API
 */
export interface OliviaChatRequest {
  threadId?: string;           // OpenAI thread ID for continuity
  message: string;             // User's message
  context?: LifeScoreContext;  // LIFE SCORE data context
  generateAudio?: boolean;     // Request TTS audio with response
}

/**
 * Chat response from API
 */
export interface OliviaChatResponse {
  threadId: string;
  messageId: string;
  response: string;
  audioUrl?: string;
  sources?: string[];
  error?: string;
  // FIX #73: Token usage data from backend for cost tracking
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================================================
// CONTEXT TYPES - LIFE SCORE Data for Olivia
// ============================================================================

/**
 * Simplified city data for context
 */
export interface ContextCity {
  name: string;
  country: string;
  totalScore: number;
  normalizedScore: number;
}

/**
 * Category summary for context
 */
export interface ContextCategory {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  winner: 'city1' | 'city2' | 'tie';
  topMetrics: ContextMetric[];
}

/**
 * Metric data for context
 */
export interface ContextMetric {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  consensusLevel?: 'unanimous' | 'strong' | 'moderate' | 'split';
  judgeExplanation?: string;
  legalScore?: number;
  enforcementScore?: number;
}

/**
 * Evidence/source for context
 */
export interface ContextEvidence {
  metricId: string;
  metricName: string;
  city: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

/**
 * Full LIFE SCORE context for Olivia
 */
export interface LifeScoreContext {
  // Comparison overview
  comparison: {
    city1: ContextCity;
    city2: ContextCity;
    winner: string;
    scoreDifference: number;
    generatedAt: string;
    comparisonId: string;
  };

  // Category breakdowns
  categories: ContextCategory[];

  // Top metrics (most significant differences or disagreements)
  topMetrics: ContextMetric[];

  // Evidence and sources
  evidence: ContextEvidence[];

  // Multi-LLM consensus info (enhanced mode only)
  consensus?: {
    llmsUsed: LLMProvider[];
    judgeModel: string;
    overallConfidence: 'high' | 'medium' | 'low';
    disagreementSummary?: string;
    topDisagreements: Array<{
      metricName: string;
      standardDeviation: number;
      explanation: string;
    }>;
  };

  // Gamma report URL if available
  gammaReportUrl?: string;

  // Processing stats
  stats?: {
    metricsEvaluated: number;
    totalProcessingTimeMs: number;
  };
}

/**
 * Context build request to API
 */
export interface ContextBuildRequest {
  comparisonId: string;
  includeEvidence?: boolean;
  maxTokens?: number;
}

/**
 * Context build response from API
 */
export interface ContextBuildResponse {
  context: LifeScoreContext;
  textSummary?: string; // Human-readable summary with all 100 metrics
  tokenEstimate: number;
  truncated: boolean;
}
