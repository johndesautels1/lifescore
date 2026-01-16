/**
 * LIFE SCORE™ Claude Opus 4.5 Judge
 * Final consensus builder from multiple LLM evaluations
 */

import type { LLMMetricScore, MetricConsensus, CategoryConsensus } from '../types/enhancedComparison';
import type { CategoryId } from '../types/metrics';
import { ALL_METRICS, CATEGORIES } from '../data/metrics';
import type { EvaluatorResult } from './llmEvaluators';
import {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  isDisagreementArea,
  type ConfidenceLevel
} from '../constants/scoringThresholds';

// Timeout constant for Opus API (90s)
const OPUS_TIMEOUT_MS = 90000;

// Helper: fetch with timeout using AbortController
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Opus API timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface JudgeInput {
  city1: string;
  city2: string;
  evaluatorResults: EvaluatorResult[];
}

export interface JudgeOutput {
  city1Consensuses: MetricConsensus[];
  city2Consensuses: MetricConsensus[];
  overallAgreement: number;
  disagreementAreas: string[];
  judgeLatencyMs: number;
}

interface AggregatedMetricScores {
  metricId: string;
  city1Scores: LLMMetricScore[];
  city2Scores: LLMMetricScore[];
}

// ============================================================================
// AGGREGATE SCORES BY METRIC
// ============================================================================

function aggregateScoresByMetric(
  evaluatorResults: EvaluatorResult[]
): Map<string, AggregatedMetricScores> {
  const aggregated = new Map<string, AggregatedMetricScores>();

  // Initialize for all metrics
  ALL_METRICS.forEach(m => {
    aggregated.set(m.id, {
      metricId: m.id,
      city1Scores: [],
      city2Scores: []
    });
  });

  // Aggregate scores from all evaluators
  // FIX: Removed unnecessary type casts - LLMMetricScore already has city field
  // FIX: Added LLM deduplication - same LLM shouldn't be counted twice per metric
  evaluatorResults.forEach(result => {
    if (!result.success) return;

    result.scores.forEach(score => {
      const agg = aggregated.get(score.metricId);
      if (!agg) return;

      if (score.city === 'city1') {
        // FIX: Check if this LLM already contributed to this metric
        const alreadyHasLLM = agg.city1Scores.some(s => s.llmProvider === score.llmProvider);
        if (!alreadyHasLLM) {
          agg.city1Scores.push(score);
        }
      } else if (score.city === 'city2') {
        // FIX: Check if this LLM already contributed to this metric
        const alreadyHasLLM = agg.city2Scores.some(s => s.llmProvider === score.llmProvider);
        if (!alreadyHasLLM) {
          agg.city2Scores.push(score);
        }
      }
    });
  });

  return aggregated;
}

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

// FIX #5: calculateMean now accepts optional default for empty arrays
function calculateMean(values: number[], defaultValue: number = 0): number {
  if (values.length === 0) return defaultValue;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ============================================================================
// BUILD CONSENSUS FOR SINGLE METRIC
// ============================================================================

function buildMetricConsensus(
  metricId: string,
  scores: LLMMetricScore[]
): MetricConsensus {
  if (scores.length === 0) {
    return {
      metricId,
      llmScores: [],
      consensusScore: 50, // Default neutral score
      legalScore: 50,
      enforcementScore: 50,
      confidenceLevel: 'split',
      standardDeviation: 0,
      judgeExplanation: 'No LLM evaluations available for this metric'
    };
  }

  // Extract scores
  // FIX: Removed unnecessary type casts - LLMMetricScore already has legalScore and enforcementScore
  const normalizedScores = scores.map(s => s.normalizedScore);
  const legalScores = scores.map(s => s.legalScore ?? s.normalizedScore);
  const enforcementScores = scores.map(s => s.enforcementScore ?? s.normalizedScore);

  // Calculate statistics
  const median = calculateMedian(normalizedScores);
  const stdDev = calculateStdDev(normalizedScores);

  // Use median for consensus (more robust to outliers)
  const consensusScore = Math.round(median);
  const legalScore = Math.round(calculateMedian(legalScores));
  const enforcementScore = Math.round(calculateMedian(enforcementScores));

  // Determine confidence level using centralized threshold constants
  const confidenceLevel: ConfidenceLevel = getConfidenceLevel(stdDev);

  // Build judge explanation
  // FIX #10: Filter out undefined providers before creating unique set
  const providers = scores.map(s => s.llmProvider).filter(Boolean);
  const uniqueProviders = [...new Set(providers)];
  const scoreRange = Math.max(...normalizedScores) - Math.min(...normalizedScores);

  let explanation = `Consensus from ${uniqueProviders.length} LLM${uniqueProviders.length > 1 ? 's' : ''}: `;
  if (confidenceLevel === 'unanimous') {
    explanation += `Strong agreement (σ=${stdDev.toFixed(1)}).`;
  } else if (confidenceLevel === 'strong') {
    explanation += `Good agreement with minor variance (σ=${stdDev.toFixed(1)}).`;
  } else if (confidenceLevel === 'moderate') {
    explanation += `Some disagreement present (σ=${stdDev.toFixed(1)}, range=${scoreRange}).`;
  } else {
    explanation += `Significant disagreement between models (σ=${stdDev.toFixed(1)}, range=${scoreRange}).`;
  }

  // Note law vs enforcement gap if significant
  const lawEnforceGap = Math.abs(legalScore - enforcementScore);
  if (lawEnforceGap > 10) {
    explanation += ` Notable ${lawEnforceGap}pt gap between law (${legalScore}) and enforcement (${enforcementScore}).`;
  }

  return {
    metricId,
    llmScores: scores,
    consensusScore,
    legalScore,
    enforcementScore,
    confidenceLevel,
    standardDeviation: Math.round(stdDev * 10) / 10,
    judgeExplanation: explanation
  };
}

// ============================================================================
// OPUS JUDGE - ENHANCED WITH API CALL
// ============================================================================

const JUDGE_PROMPT_TEMPLATE = `You are Claude Opus 4.5, serving as the final judge for LIFE SCORE™ city comparisons.

## YOUR ROLE
Review evaluations from multiple AI models and build the final consensus scores. You have the authority to:
1. Weight different models' opinions based on their apparent reasoning quality
2. Identify and explain significant disagreements
3. Flag areas where more research would be valuable
4. Provide the definitive LIFE SCORE™ verdict

## EVALUATIONS TO JUDGE
{{EVALUATIONS}}

## CITIES
- City 1: {{CITY1}}
- City 2: {{CITY2}}

## TASK
For each metric, provide:
1. Final consensus score (0-100) - weighted average considering quality of reasoning
2. Confidence level: unanimous/strong/moderate/split
3. Brief explanation of your judgment

Also identify:
- Top 5 areas of significant LLM disagreement
- Any metrics where you override the statistical consensus and why

Return JSON:
{
  "judgments": [
    {
      "metricId": "string",
      "city1ConsensusScore": number,
      "city1LegalScore": number,
      "city1EnforcementScore": number,
      "city2ConsensusScore": number,
      "city2LegalScore": number,
      "city2EnforcementScore": number,
      "confidence": "unanimous|strong|moderate|split",
      "explanation": "string"
    }
  ],
  "disagreementAreas": ["metric1", "metric2", ...],
  "overallAssessment": "string"
}`;

export async function runOpusJudge(
  anthropicKey: string,
  input: JudgeInput
): Promise<JudgeOutput> {
  const startTime = Date.now();

  // First, do statistical aggregation
  const aggregated = aggregateScoresByMetric(input.evaluatorResults);

  // Build statistical consensus for each metric
  const city1Consensuses: MetricConsensus[] = [];
  const city2Consensuses: MetricConsensus[] = [];
  const disagreementMetrics: string[] = [];

  aggregated.forEach((agg, metricId) => {
    const c1 = buildMetricConsensus(metricId, agg.city1Scores);
    const c2 = buildMetricConsensus(metricId, agg.city2Scores);

    city1Consensuses.push(c1);
    city2Consensuses.push(c2);

    // Track high-disagreement metrics using centralized threshold
    if (isDisagreementArea(c1.standardDeviation) || isDisagreementArea(c2.standardDeviation)) {
      const metric = ALL_METRICS.find(m => m.id === metricId);
      if (metric) disagreementMetrics.push(metric.shortName);
    }
  });

  // Calculate overall agreement
  // FIX #6: Handle empty stdDevs with DEFAULT_AVG_STDDEV like api/judge.ts does
  const allStdDevs = [...city1Consensuses, ...city2Consensuses].map(c => c.standardDeviation);
  const avgStdDev = allStdDevs.length > 0 ? calculateMean(allStdDevs) : CONFIDENCE_THRESHOLDS.DEFAULT_AVG_STDDEV;
  const overallAgreement = Math.max(0, Math.min(100, Math.round(100 - avgStdDev * 2)));

  // If we have Anthropic key, enhance with actual Opus judgment
  // FIX #7: Sync with api/judge.ts - also verify non-empty scores
  const hasActualScores = input.evaluatorResults.some(r => r.success && r.scores && r.scores.length > 0);
  if (anthropicKey && hasActualScores) {
    try {
      // Build summary of evaluations for Opus to judge
      const evaluationSummary = buildEvaluationSummary(aggregated);

      const prompt = JUDGE_PROMPT_TEMPLATE
        .replace('{{EVALUATIONS}}', evaluationSummary)
        .replace('{{CITY1}}', input.city1)
        .replace('{{CITY2}}', input.city2);

      const response = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2025-01-01'
          },
          body: JSON.stringify({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 16384,
            messages: [{ role: 'user', content: prompt }]
          })
        },
        OPUS_TIMEOUT_MS
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.content[0].text;

        // Parse and merge Opus judgments
        const opusJudgments = parseOpusResponse(content);
        if (opusJudgments) {
          mergeOpusJudgments(city1Consensuses, city2Consensuses, opusJudgments);
          if (opusJudgments.disagreementAreas) {
            disagreementMetrics.length = 0;
            disagreementMetrics.push(...opusJudgments.disagreementAreas);
          }
        }
      }
    } catch (error) {
      console.error('Opus judge API call failed, using statistical consensus:', error);
    }
  }

  return {
    city1Consensuses,
    city2Consensuses,
    overallAgreement,
    disagreementAreas: disagreementMetrics.slice(0, 5),
    judgeLatencyMs: Date.now() - startTime
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildEvaluationSummary(aggregated: Map<string, AggregatedMetricScores>): string {
  const summaries: string[] = [];

  aggregated.forEach((agg, metricId) => {
    const metric = ALL_METRICS.find(m => m.id === metricId);
    if (!metric) return;

    if (agg.city1Scores.length === 0 && agg.city2Scores.length === 0) return;

    const c1Scores = agg.city1Scores.map(s => `${s.llmProvider}:${s.normalizedScore}`).join(', ');
    const c2Scores = agg.city2Scores.map(s => `${s.llmProvider}:${s.normalizedScore}`).join(', ');

    summaries.push(`${metric.shortName} (${metricId}):
  City1: [${c1Scores}]
  City2: [${c2Scores}]`);
  });

  return summaries.slice(0, 50).join('\n\n'); // Limit to avoid token overflow
}

interface OpusJudgment {
  metricId: string;
  city1ConsensusScore: number;
  city1LegalScore: number;
  city1EnforcementScore: number;
  city2ConsensusScore: number;
  city2LegalScore: number;
  city2EnforcementScore: number;
  confidence: 'unanimous' | 'strong' | 'moderate' | 'split';
  explanation: string;
}

interface OpusResponse {
  judgments: OpusJudgment[];
  disagreementAreas?: string[];
  overallAssessment?: string;
}

function parseOpusResponse(response: string): OpusResponse | null {
  try {
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const rawMatch = response.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }
    const parsed = JSON.parse(jsonStr);
    // FIX: Validate required structure
    if (typeof parsed !== 'object' || parsed === null) {
      console.error('opusJudge: Parsed response is not an object');
      return null;
    }
    if (!Array.isArray(parsed.judgments)) {
      console.error('opusJudge: Response missing judgments array');
      return null;
    }
    return parsed;
  } catch (error) {
    // FIX: Log parse errors instead of silent failure
    console.error('opusJudge: Failed to parse Opus response:', error);
    console.error('opusJudge: Raw response (first 500 chars):', response.slice(0, 500));
    return null;
  }
}

function mergeOpusJudgments(
  city1Consensuses: MetricConsensus[],
  city2Consensuses: MetricConsensus[],
  opusResponse: OpusResponse
): void {
  // FIX: Validate score ranges and handle missing fields
  const clampScore = (score: number | undefined, fallback: number): number => {
    if (typeof score !== 'number' || isNaN(score)) return fallback;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  opusResponse.judgments.forEach(judgment => {
    const c1 = city1Consensuses.find(c => c.metricId === judgment.metricId);
    const c2 = city2Consensuses.find(c => c.metricId === judgment.metricId);

    if (c1) {
      c1.consensusScore = clampScore(judgment.city1ConsensusScore, c1.consensusScore);
      c1.legalScore = clampScore(judgment.city1LegalScore, c1.legalScore);
      c1.enforcementScore = clampScore(judgment.city1EnforcementScore, c1.enforcementScore);
      c1.confidenceLevel = judgment.confidence || c1.confidenceLevel;
      c1.judgeExplanation = judgment.explanation || c1.judgeExplanation;
    }

    if (c2) {
      c2.consensusScore = clampScore(judgment.city2ConsensusScore, c2.consensusScore);
      c2.legalScore = clampScore(judgment.city2LegalScore, c2.legalScore);
      c2.enforcementScore = clampScore(judgment.city2EnforcementScore, c2.enforcementScore);
      c2.confidenceLevel = judgment.confidence || c2.confidenceLevel;
      c2.judgeExplanation = judgment.explanation || c2.judgeExplanation;
    }
  });
}

// ============================================================================
// BUILD CATEGORY CONSENSUS
// ============================================================================

export function buildCategoryConsensuses(
  metricConsensuses: MetricConsensus[]
): CategoryConsensus[] {
  return CATEGORIES.map(category => {
    const categoryMetrics = metricConsensuses.filter(m => {
      const metric = ALL_METRICS.find(am => am.id === m.metricId);
      return metric?.categoryId === category.id;
    });

    // FIX: Apply metric weights when calculating category average
    // Each metric has a weight (1-10) defined in metrics.ts
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalWeightedStdDev = 0;

    categoryMetrics.forEach(m => {
      const metricDef = ALL_METRICS.find(am => am.id === m.metricId);
      const weight = metricDef?.weight || 1;
      totalWeightedScore += m.consensusScore * weight;
      totalWeightedStdDev += m.standardDeviation * weight;
      totalWeight += weight;
    });

    // FIX: Return neutral score (50) for empty categories, not 0
    // This prevents entire categories from dragging down scores when data is missing
    const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
    const avgStdDev = totalWeight > 0 ? totalWeightedStdDev / totalWeight : CONFIDENCE_THRESHOLDS.DEFAULT_AVG_STDDEV;

    return {
      categoryId: category.id as CategoryId,
      metrics: categoryMetrics,
      averageConsensusScore: Math.round(avgScore),
      agreementLevel: Math.round(Math.max(0, 100 - avgStdDev * 2))
    };
  });
}
