/**
 * LIFE SCORE™ Claude Opus 4.5 Judge
 * Final consensus builder from multiple LLM evaluations
 */

import type { LLMMetricScore, MetricConsensus, CategoryConsensus } from '../types/enhancedComparison';
import type { CategoryId } from '../types/metrics';
import { ALL_METRICS, CATEGORIES } from '../data/metrics';
import type { EvaluatorResult } from './llmEvaluators';

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
  evaluatorResults.forEach(result => {
    if (!result.success) return;

    result.scores.forEach(score => {
      const agg = aggregated.get(score.metricId);
      if (!agg) return;

      if ((score as any).city === 'city1') {
        agg.city1Scores.push(score);
      } else if ((score as any).city === 'city2') {
        agg.city2Scores.push(score);
      }
    });
  });

  return aggregated;
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
  const normalizedScores = scores.map(s => s.normalizedScore);
  const legalScores = scores.map(s => (s as any).legalScore ?? s.normalizedScore);
  const enforcementScores = scores.map(s => (s as any).enforcementScore ?? s.normalizedScore);

  // Calculate statistics
  const _mean = calculateMean(normalizedScores); // Reserved for future weighted average
  const median = calculateMedian(normalizedScores);
  const stdDev = calculateStdDev(normalizedScores);

  // Use median for consensus (more robust to outliers)
  const consensusScore = Math.round(median);
  const legalScore = Math.round(calculateMedian(legalScores));
  const enforcementScore = Math.round(calculateMedian(enforcementScores));

  // Determine confidence level
  let confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  if (stdDev < 5) {
    confidenceLevel = 'unanimous';
  } else if (stdDev < 12) {
    confidenceLevel = 'strong';
  } else if (stdDev < 20) {
    confidenceLevel = 'moderate';
  } else {
    confidenceLevel = 'split';
  }

  // Build judge explanation
  const providers = scores.map(s => s.llmProvider);
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

    // Track high-disagreement metrics
    if (c1.standardDeviation > 15 || c2.standardDeviation > 15) {
      const metric = ALL_METRICS.find(m => m.id === metricId);
      if (metric) disagreementMetrics.push(metric.shortName);
    }
  });

  // Calculate overall agreement
  const allStdDevs = [...city1Consensuses, ...city2Consensuses].map(c => c.standardDeviation);
  const avgStdDev = calculateMean(allStdDevs);
  const overallAgreement = Math.max(0, Math.min(100, Math.round(100 - avgStdDev * 2)));

  // If we have Anthropic key, enhance with actual Opus judgment
  if (anthropicKey && input.evaluatorResults.some(r => r.success)) {
    try {
      // Build summary of evaluations for Opus to judge
      const evaluationSummary = buildEvaluationSummary(aggregated);

      const prompt = JUDGE_PROMPT_TEMPLATE
        .replace('{{EVALUATIONS}}', evaluationSummary)
        .replace('{{CITY1}}', input.city1)
        .replace('{{CITY2}}', input.city2);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 16384,
          messages: [{ role: 'user', content: prompt }]
        })
      });

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
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function mergeOpusJudgments(
  city1Consensuses: MetricConsensus[],
  city2Consensuses: MetricConsensus[],
  opusResponse: OpusResponse
): void {
  opusResponse.judgments.forEach(judgment => {
    const c1 = city1Consensuses.find(c => c.metricId === judgment.metricId);
    const c2 = city2Consensuses.find(c => c.metricId === judgment.metricId);

    if (c1) {
      c1.consensusScore = judgment.city1ConsensusScore;
      c1.legalScore = judgment.city1LegalScore;
      c1.enforcementScore = judgment.city1EnforcementScore;
      c1.confidenceLevel = judgment.confidence;
      c1.judgeExplanation = judgment.explanation;
    }

    if (c2) {
      c2.consensusScore = judgment.city2ConsensusScore;
      c2.legalScore = judgment.city2LegalScore;
      c2.enforcementScore = judgment.city2EnforcementScore;
      c2.confidenceLevel = judgment.confidence;
      c2.judgeExplanation = judgment.explanation;
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

    const avgScore = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, m) => sum + m.consensusScore, 0) / categoryMetrics.length
      : 0;

    const avgStdDev = categoryMetrics.length > 0
      ? categoryMetrics.reduce((sum, m) => sum + m.standardDeviation, 0) / categoryMetrics.length
      : 50;

    return {
      categoryId: category.id as CategoryId,
      metrics: categoryMetrics,
      averageConsensusScore: Math.round(avgScore),
      agreementLevel: Math.round(Math.max(0, 100 - avgStdDev * 2))
    };
  });
}
