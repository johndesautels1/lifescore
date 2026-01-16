/**
 * LIFE SCORE™ Opus Judge API
 * Vercel Serverless Function - Claude Opus 4.5 consensus builder
 *
 * FIX: Now properly computes consensus scores from evaluator results
 * instead of returning empty arrays
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CONFIDENCE_THRESHOLDS,
  getConfidenceLevel,
  isDisagreementArea,
  type ConfidenceLevel
} from '../src/constants/scoringThresholds';

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

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
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
  const city1ByMetric = new Map<string, LLMMetricScore[]>();
  const city2ByMetric = new Map<string, LLMMetricScore[]>();

  evaluatorResults.forEach(result => {
    if (!result.success) return;

    result.scores.forEach(score => {
      if (score.city === 'city1') {
        const existing = city1ByMetric.get(score.metricId) || [];
        existing.push(score);
        city1ByMetric.set(score.metricId, existing);
      } else if (score.city === 'city2') {
        const existing = city2ByMetric.get(score.metricId) || [];
        existing.push(score);
        city2ByMetric.set(score.metricId, existing);
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

  const { evaluatorResults } = req.body as JudgeRequest;
  const startTime = Date.now();

  // FIX: Actually compute consensus scores from evaluator results
  const { city1Consensuses, city2Consensuses, disagreementMetrics } =
    aggregateAndBuildConsensuses(evaluatorResults || []);

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
