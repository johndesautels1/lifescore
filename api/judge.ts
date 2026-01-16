/**
 * LIFE SCORE™ Opus Judge API
 * Vercel Serverless Function - Claude Opus 4.5 consensus builder
 *
 * FIX: Now properly computes consensus scores from evaluator results
 * FIX: Now actually calls Opus API for enhanced judging (not just statistical)
 * FIX: Uses city1/city2 from request for Opus prompt
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  isDisagreementArea,
  type ConfidenceLevel
} from '../src/constants/scoringThresholds';

// Opus API types
// FIX #2: Add legalScore/enforcementScore fields to match opusJudge.ts
interface OpusJudgment {
  metricId: string;
  city1ConsensusScore: number;
  city1LegalScore?: number;
  city1EnforcementScore?: number;
  city2ConsensusScore: number;
  city2LegalScore?: number;
  city2EnforcementScore?: number;
  confidence: 'unanimous' | 'strong' | 'moderate' | 'split';
  explanation: string;
}

interface OpusResponse {
  judgments?: OpusJudgment[];
  disagreementAreas?: string[];
}

// ============================================================================
// TYPES
// ============================================================================

interface LLMMetricScore {
  metricId: string;
  normalizedScore: number;
  legalScore?: number;
  enforcementScore?: number;
  confidence?: string;
  llmProvider?: string;
  city?: 'city1' | 'city2';
  // FIX #9: Add evidence field to match types/enhancedComparison.ts
  evidence?: Array<{
    city: string;
    title: string;
    url: string;
    snippet: string;
    retrieved_at: string;
  }>;
}

interface EvaluatorResult {
  provider: string;
  success: boolean;
  scores: LLMMetricScore[];
  latencyMs: number;
  error?: string;
}

interface JudgeRequest {
  city1: string;
  city2: string;
  evaluatorResults: EvaluatorResult[];
}

interface MetricConsensus {
  metricId: string;
  llmScores: LLMMetricScore[];
  consensusScore: number;
  legalScore: number;
  enforcementScore: number;
  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  standardDeviation: number;
  judgeExplanation: string;
}

interface JudgeOutput {
  city1Consensuses: MetricConsensus[];
  city2Consensuses: MetricConsensus[];
  overallAgreement: number;
  disagreementAreas: string[];
  judgeLatencyMs: number;
}

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

// FIX #4: calculateMean now accepts optional default for empty arrays
// For score calculations, use 50 (neutral); for stdDev, use 0
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
// CONSENSUS BUILDING
// ============================================================================

function buildMetricConsensus(
  metricId: string,
  scores: LLMMetricScore[]
): MetricConsensus {
  if (scores.length === 0) {
    return {
      metricId,
      llmScores: [],
      consensusScore: 50,
      legalScore: 50,
      enforcementScore: 50,
      confidenceLevel: 'split',
      standardDeviation: 0,
      judgeExplanation: 'No LLM evaluations available for this metric'
    };
  }

  const normalizedScores = scores.map(s => s.normalizedScore);
  const legalScores = scores.map(s => s.legalScore ?? s.normalizedScore);
  const enforcementScores = scores.map(s => s.enforcementScore ?? s.normalizedScore);

  const median = calculateMedian(normalizedScores);
  const stdDev = calculateStdDev(normalizedScores);

  const consensusScore = Math.round(median);
  const legalScore = Math.round(calculateMedian(legalScores));
  const enforcementScore = Math.round(calculateMedian(enforcementScores));

  // Use centralized threshold constants
  const confidenceLevel: ConfidenceLevel = getConfidenceLevel(stdDev);

  const providers = scores.map(s => s.llmProvider).filter(Boolean);
  const uniqueProviders = [...new Set(providers)];

  let explanation = `Consensus from ${uniqueProviders.length} LLM${uniqueProviders.length > 1 ? 's' : ''}: `;
  if (confidenceLevel === 'unanimous') {
    explanation += `Strong agreement (σ=${stdDev.toFixed(1)}).`;
  } else if (confidenceLevel === 'strong') {
    explanation += `Good agreement (σ=${stdDev.toFixed(1)}).`;
  } else if (confidenceLevel === 'moderate') {
    explanation += `Some disagreement (σ=${stdDev.toFixed(1)}).`;
  } else {
    explanation += `Significant disagreement (σ=${stdDev.toFixed(1)}).`;
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

function aggregateAndBuildConsensuses(
  evaluatorResults: EvaluatorResult[]
): { city1Consensuses: MetricConsensus[]; city2Consensuses: MetricConsensus[]; disagreementMetrics: string[] } {
  // Aggregate scores by metric and city
  // FIX: Added LLM deduplication - same LLM shouldn't be counted twice per metric
  const city1ByMetric = new Map<string, LLMMetricScore[]>();
  const city2ByMetric = new Map<string, LLMMetricScore[]>();

  evaluatorResults.forEach(result => {
    if (!result.success) return;

    result.scores.forEach(score => {
      if (score.city === 'city1') {
        const existing = city1ByMetric.get(score.metricId) || [];
        // FIX: Check if this LLM already contributed to this metric
        const alreadyHasLLM = existing.some(s => s.llmProvider === score.llmProvider);
        if (!alreadyHasLLM) {
          existing.push(score);
          city1ByMetric.set(score.metricId, existing);
        }
      } else if (score.city === 'city2') {
        const existing = city2ByMetric.get(score.metricId) || [];
        // FIX: Check if this LLM already contributed to this metric
        const alreadyHasLLM = existing.some(s => s.llmProvider === score.llmProvider);
        if (!alreadyHasLLM) {
          existing.push(score);
          city2ByMetric.set(score.metricId, existing);
        }
      }
    });
  });

  // Build consensuses
  const city1Consensuses: MetricConsensus[] = [];
  const city2Consensuses: MetricConsensus[] = [];
  const disagreementMetrics: string[] = [];

  // Get all unique metric IDs
  const allMetricIds = new Set([...city1ByMetric.keys(), ...city2ByMetric.keys()]);

  allMetricIds.forEach(metricId => {
    const c1Scores = city1ByMetric.get(metricId) || [];
    const c2Scores = city2ByMetric.get(metricId) || [];

    const c1Consensus = buildMetricConsensus(metricId, c1Scores);
    const c2Consensus = buildMetricConsensus(metricId, c2Scores);

    city1Consensuses.push(c1Consensus);
    city2Consensuses.push(c2Consensus);

    // Track high disagreement using centralized threshold
    if (isDisagreementArea(c1Consensus.standardDeviation) || isDisagreementArea(c2Consensus.standardDeviation)) {
      disagreementMetrics.push(metricId);
    }
  });

  return { city1Consensuses, city2Consensuses, disagreementMetrics };
}

// ============================================================================
// OPUS API CALL HELPERS
// ============================================================================

function buildOpusPrompt(
  city1: string,
  city2: string,
  city1Consensuses: MetricConsensus[],
  city2Consensuses: MetricConsensus[]
): string {
  // Build summary of statistical consensuses for Opus to review
  const summaries: string[] = [];

  city1Consensuses.forEach((c1, idx) => {
    const c2 = city2Consensuses[idx];
    if (c1.llmScores.length === 0 && c2?.llmScores.length === 0) return;

    const c1LLMs = c1.llmScores.map(s => `${s.llmProvider}:${s.normalizedScore}`).join(', ');
    const c2LLMs = c2?.llmScores.map(s => `${s.llmProvider}:${s.normalizedScore}`).join(', ') || 'N/A';

    summaries.push(`${c1.metricId}: ${city1}=[${c1LLMs}] vs ${city2}=[${c2LLMs}]`);
  });

  return `You are Claude Opus 4.5, the final judge for LIFE SCORE™ city comparisons.

## CITIES
- City 1: ${city1}
- City 2: ${city2}

## LLM EVALUATIONS (format: LLM:score)
${summaries.slice(0, 30).join('\n')}

## TASK
Review these evaluations and for metrics with high disagreement (σ>10), provide your judgment.
Return JSON with ONLY metrics you want to override:
{
  "judgments": [
    {"metricId": "...", "city1ConsensusScore": N, "city2ConsensusScore": N, "confidence": "strong", "explanation": "..."}
  ],
  "disagreementAreas": ["metric1", "metric2"]
}

Return empty judgments array if you agree with statistical consensus.`;
}

function parseOpusResponse(content: string): OpusResponse | null {
  try {
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const rawMatch = content.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }
    const parsed = JSON.parse(jsonStr);
    // FIX: Validate required structure
    if (typeof parsed !== 'object' || parsed === null) {
      console.error('Opus response is not an object');
      return null;
    }
    return parsed as OpusResponse;
  } catch (error) {
    // FIX: Log parse errors instead of silent failure
    console.error('Failed to parse Opus response:', error);
    return null;
  }
}

function mergeOpusJudgments(
  city1Consensuses: MetricConsensus[],
  city2Consensuses: MetricConsensus[],
  opusResponse: OpusResponse
): void {
  if (!opusResponse.judgments) return;

  // FIX #3: Helper to validate and clamp scores to 0-100 range
  const clampScore = (score: number | undefined, fallback: number): number => {
    if (typeof score !== 'number' || isNaN(score)) return fallback;
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  opusResponse.judgments.forEach(judgment => {
    const c1 = city1Consensuses.find(c => c.metricId === judgment.metricId);
    const c2 = city2Consensuses.find(c => c.metricId === judgment.metricId);

    if (c1) {
      c1.consensusScore = clampScore(judgment.city1ConsensusScore, c1.consensusScore);
      // FIX #3: Now also update legalScore and enforcementScore from Opus
      c1.legalScore = clampScore(judgment.city1LegalScore, c1.legalScore);
      c1.enforcementScore = clampScore(judgment.city1EnforcementScore, c1.enforcementScore);
      c1.confidenceLevel = judgment.confidence || c1.confidenceLevel;
      c1.judgeExplanation = judgment.explanation || c1.judgeExplanation;
    }

    if (c2) {
      c2.consensusScore = clampScore(judgment.city2ConsensusScore, c2.consensusScore);
      // FIX #3: Now also update legalScore and enforcementScore from Opus
      c2.legalScore = clampScore(judgment.city2LegalScore, c2.legalScore);
      c2.enforcementScore = clampScore(judgment.city2EnforcementScore, c2.enforcementScore);
      c2.confidenceLevel = judgment.confidence || c2.confidenceLevel;
      c2.judgeExplanation = judgment.explanation || c2.judgeExplanation;
    }
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // FIX: Extract city1/city2 from request (previously ignored)
  const { city1, city2, evaluatorResults } = req.body as JudgeRequest;
  const startTime = Date.now();

  // Step 1: Build statistical consensus from evaluator results
  const { city1Consensuses, city2Consensuses, disagreementMetrics } =
    aggregateAndBuildConsensuses(evaluatorResults || []);

  // Step 2: FIX - Actually call Opus API for enhanced judging
  // FIX #8: Also verify that there are actual scores, not just success flags
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const hasActualScores = evaluatorResults?.some(r => r.success && r.scores && r.scores.length > 0);
  if (anthropicKey && city1 && city2 && hasActualScores) {
    try {
      const prompt = buildOpusPrompt(city1, city2, city1Consensuses, city2Consensuses);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2025-01-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content?.[0]?.text;
        if (content) {
          const opusJudgments = parseOpusResponse(content);
          if (opusJudgments) {
            mergeOpusJudgments(city1Consensuses, city2Consensuses, opusJudgments);
            // Override disagreement areas if Opus provided them
            if (opusJudgments.disagreementAreas && opusJudgments.disagreementAreas.length > 0) {
              disagreementMetrics.length = 0;
              disagreementMetrics.push(...opusJudgments.disagreementAreas);
            }
          }
        }
      } else {
        console.error('Opus API error:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Opus judge API call failed, using statistical consensus:', error);
    }
  }

  // Calculate overall agreement from standard deviations
  const allStdDevs = [...city1Consensuses, ...city2Consensuses].map(c => c.standardDeviation);
  const avgStdDev = allStdDevs.length > 0 ? calculateMean(allStdDevs) : CONFIDENCE_THRESHOLDS.DEFAULT_AVG_STDDEV;
  const overallAgreement = Math.max(0, Math.min(100, Math.round(100 - avgStdDev * 2)));

  const output: JudgeOutput = {
    city1Consensuses,
    city2Consensuses,
    overallAgreement,
    disagreementAreas: disagreementMetrics.slice(0, 5),
    judgeLatencyMs: Date.now() - startTime
  };

  return res.status(200).json(output);
}
