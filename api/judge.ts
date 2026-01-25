/**
 * LIFE SCORE™ Opus Judge API
 * Vercel Serverless Function - Claude Opus 4.5 consensus builder
 *
 * FIX: Now properly computes consensus scores from evaluator results
 * FIX: Now actually calls Opus API for enhanced judging (not just statistical)
 * FIX: Uses city1/city2 from request for Opus prompt
 * Phase 3: Updated for category-based scoring validation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { fetchWithTimeout } from './shared/fetchWithTimeout.js';
// Phase 3: Import shared metrics for category-based scoring context (standalone api/shared version)
import { METRICS_MAP, getCategoryOptionsForPrompt } from './shared/metrics.js';

// Phase 3: Environment variable toggle (matches api/evaluate.ts)
const USE_CATEGORY_SCORING = process.env.USE_CATEGORY_SCORING === 'true';

// INLINED from src/constants/scoringThresholds.ts to fix Vercel import error
const CONFIDENCE_THRESHOLDS = {
  UNANIMOUS: 5,
  STRONG: 12,
  MODERATE: 20,
  DISAGREEMENT_FLAG: 15,
  DEFAULT_AVG_STDDEV: 25
} as const;

type ConfidenceLevel = 'unanimous' | 'strong' | 'moderate' | 'split';

function getConfidenceLevel(stdDev: number): ConfidenceLevel {
  if (stdDev < CONFIDENCE_THRESHOLDS.UNANIMOUS) return 'unanimous';
  if (stdDev < CONFIDENCE_THRESHOLDS.STRONG) return 'strong';
  if (stdDev < CONFIDENCE_THRESHOLDS.MODERATE) return 'moderate';
  return 'split';
}

function isDisagreementArea(stdDev: number): boolean {
  return stdDev > CONFIDENCE_THRESHOLDS.DISAGREEMENT_FLAG;
}

// Timeout constant for Opus API (240s - within Vercel Pro 300s limit)
const OPUS_TIMEOUT_MS = 240000;

// Opus API types
// FIX #2: Add legalScore/enforcementScore fields to match opusJudge.ts
// FIX: Removed confidence field - confidenceLevel must ONLY be derived from stdDev
//      Opus overriding confidence caused mismatch with displayed variance (e.g., σ=47 showing "Strong")
interface OpusJudgment {
  metricId: string;
  city1ConsensusScore: number;
  city1LegalScore?: number;
  city1EnforcementScore?: number;
  city2ConsensusScore: number;
  city2LegalScore?: number;
  city2EnforcementScore?: number;
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
  consensusScore: number | null;     // null if no data available
  legalScore: number | null;         // null if no data available
  enforcementScore: number | null;   // null if no data available
  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split' | 'no_data';
  standardDeviation: number | null;  // null if no data available
  judgeExplanation: string;
  isMissing?: boolean;               // true if metric should be excluded from totals
}

// Token usage tracking
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface JudgeOutput {
  city1Consensuses: MetricConsensus[];
  city2Consensuses: MetricConsensus[];
  overallAgreement: number;
  disagreementAreas: string[];
  judgeLatencyMs: number;
  // Cost tracking
  usage?: {
    opusTokens: TokenUsage;
  };
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

/**
 * Convert confidence string to numeric weight
 * FIX #9: Used for weighted consensus calculation
 */
function confidenceToWeight(confidence: string | undefined): number {
  switch (confidence?.toLowerCase()) {
    case 'high': return 1.0;
    case 'medium': return 0.7;
    case 'low': return 0.4;
    default: return 0.5; // unverified or missing
  }
}

/**
 * Calculate confidence-weighted mean
 * FIX #9: Replaces pure median to preserve more variance in data
 * Higher confidence LLMs have more influence on the final score
 */
function calculateWeightedConsensus(scores: LLMMetricScore[]): number {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return scores[0].normalizedScore;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const score of scores) {
    const weight = confidenceToWeight(score.confidence);
    weightedSum += score.normalizedScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : calculateMedian(scores.map(s => s.normalizedScore));
}

/**
 * Calculate weighted consensus for legal/enforcement scores
 */
function calculateWeightedLegalLivedConsensus(
  scores: LLMMetricScore[],
  field: 'legalScore' | 'enforcementScore'
): number {
  if (scores.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const score of scores) {
    const value = score[field] ?? score.normalizedScore;
    const weight = confidenceToWeight(score.confidence);
    weightedSum += value * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ============================================================================
// CONSENSUS BUILDING
// ============================================================================

function buildMetricConsensus(
  metricId: string,
  scores: LLMMetricScore[]
): MetricConsensus {
  if (scores.length === 0) {
    // FIXED: Return null scores to exclude metric from calculations
    // Using 50 causes artificial convergence between cities
    return {
      metricId,
      llmScores: [],
      consensusScore: null,
      legalScore: null,
      enforcementScore: null,
      confidenceLevel: 'no_data',
      standardDeviation: null,
      judgeExplanation: 'No LLM evaluations available - excluded from totals',
      isMissing: true
    };
  }

  const normalizedScores = scores.map(s => s.normalizedScore);

  // FIX #9: Use confidence-weighted mean instead of pure median
  // This preserves more variance in the data while still respecting higher-confidence LLMs
  const weightedConsensus = calculateWeightedConsensus(scores);
  const stdDev = calculateStdDev(normalizedScores);

  const consensusScore = Math.round(weightedConsensus);
  const legalScore = Math.round(calculateWeightedLegalLivedConsensus(scores, 'legalScore'));
  const enforcementScore = Math.round(calculateWeightedLegalLivedConsensus(scores, 'enforcementScore'));

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
  city2Consensuses: MetricConsensus[],
  disagreementMetrics: string[]
): string {
  // Build summary of statistical consensuses for Opus to review
  const summaries: string[] = [];
  // Phase 3: Build category context for disagreement metrics
  const categoryContext: string[] = [];

  city1Consensuses.forEach((c1, idx) => {
    const c2 = city2Consensuses[idx];
    if (c1.llmScores.length === 0 && c2?.llmScores.length === 0) return;

    const c1LLMs = c1.llmScores.map(s => `${s.llmProvider}:${s.normalizedScore}`).join(', ');
    const c2LLMs = c2?.llmScores.map(s => `${s.llmProvider}:${s.normalizedScore}`).join(', ') || 'N/A';

    const isDisagreement = disagreementMetrics.includes(c1.metricId);
    const marker = isDisagreement ? ' [HIGH DISAGREEMENT]' : '';
    summaries.push(`${c1.metricId}${marker}: ${city1}=[${c1LLMs}] vs ${city2}=[${c2LLMs}]`);

    // Phase 3: Add category context for disagreement metrics when category scoring is enabled
    if (USE_CATEGORY_SCORING && isDisagreement) {
      const metric = METRICS_MAP[c1.metricId];
      if (metric) {
        const options = getCategoryOptionsForPrompt(c1.metricId);
        if (options.length > 0) {
          const optionsStr = options.map(o => `    ${o.value} (${o.label}) = ${o.score}`).join('\n');
          categoryContext.push(`\n### ${c1.metricId}: ${metric.name}\nCategory options:\n${optionsStr}`);
        }
      }
    }
  });

  // Phase 3: Include category context section if available
  const categorySection = categoryContext.length > 0
    ? `\n## SCORING CRITERIA FOR DISAGREEMENT METRICS\nThese metrics use category-based scoring. Use this context to resolve disagreements:\n${categoryContext.join('\n')}\n`
    : '';

  return `You are Claude Opus 4.5, the final judge for LIFE SCORE™ city comparisons.

## CITIES
- City 1: ${city1}
- City 2: ${city2}

## LLM EVALUATIONS (format: LLM:score)
${summaries.slice(0, 30).join('\n')}
${categorySection}
## TASK
Review these evaluations and for metrics marked [HIGH DISAGREEMENT] (σ>15), provide your judgment.
${USE_CATEGORY_SCORING ? 'Use the scoring criteria above to determine the correct category and score.' : ''}
Return JSON with ONLY metrics you want to override:
{
  "judgments": [
    {"metricId": "...", "city1ConsensusScore": N, "city2ConsensusScore": N, "explanation": "Why you chose this score"}
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
    // FIX: Validate judgments is an array if present
    if (parsed.judgments !== undefined && !Array.isArray(parsed.judgments)) {
      console.error('Opus response judgments is not an array');
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
      // FIX: Do NOT override confidenceLevel - it must always match stdDev
      // Opus was causing σ=47 to show "Strong" instead of "Split"
      c1.judgeExplanation = judgment.explanation || c1.judgeExplanation;
    }

    if (c2) {
      c2.consensusScore = clampScore(judgment.city2ConsensusScore, c2.consensusScore);
      // FIX #3: Now also update legalScore and enforcementScore from Opus
      c2.legalScore = clampScore(judgment.city2LegalScore, c2.legalScore);
      c2.enforcementScore = clampScore(judgment.city2EnforcementScore, c2.enforcementScore);
      // FIX: Do NOT override confidenceLevel - it must always match stdDev
      c2.judgeExplanation = judgment.explanation || c2.judgeExplanation;
    }
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - restricted to Vercel deployment domain
  if (handleCors(req, res, 'restricted')) return;

  // Rate limiting - heavy preset for expensive Opus calls
  if (!applyRateLimit(req.headers, 'judge', 'heavy', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

  // Debug logging
  const successfulLLMs = evaluatorResults?.filter(r => r.success).map(r => r.provider) || [];
  const totalScores = evaluatorResults?.reduce((sum, r) => sum + (r.scores?.length || 0), 0) || 0;
  console.log(`[JUDGE] Evaluator results: ${successfulLLMs.length} successful LLMs (${successfulLLMs.join(', ')}), ${totalScores} total scores`);
  console.log(`[JUDGE] Disagreement metrics: ${disagreementMetrics.length} (${disagreementMetrics.slice(0, 5).join(', ')}${disagreementMetrics.length > 5 ? '...' : ''})`);
  console.log(`[JUDGE] hasActualScores=${hasActualScores}, anthropicKey=${!!anthropicKey}, city1=${city1}, city2=${city2}`);

  // Track Opus token usage for cost tracking
  let opusTokenUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  if (anthropicKey && city1 && city2 && hasActualScores) {
    try {
      const prompt = buildOpusPrompt(city1, city2, city1Consensuses, city2Consensuses, disagreementMetrics);
      console.log(`[JUDGE] Calling Opus API with prompt length: ${prompt.length} chars`);

      const response = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }]
          })
        },
        OPUS_TIMEOUT_MS
      );

      if (response.ok) {
        const data = await response.json();

        // Capture token usage from Opus response
        opusTokenUsage = {
          inputTokens: data?.usage?.input_tokens || 0,
          outputTokens: data?.usage?.output_tokens || 0
        };
        console.log(`[JUDGE] Opus token usage: ${opusTokenUsage.inputTokens} in / ${opusTokenUsage.outputTokens} out`);

        const content = data.content?.[0]?.text;
        console.log(`[JUDGE] Opus response received, content length: ${content?.length || 0} chars`);
        if (content) {
          const opusJudgments = parseOpusResponse(content);
          console.log(`[JUDGE] Opus judgments parsed: ${opusJudgments?.judgments?.length || 0} judgments`);
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
        const errorText = await response.text();
        console.error(`[JUDGE] Opus API error: ${response.status} - ${errorText.slice(0, 500)}`);
      }
    } catch (error) {
      console.error('[JUDGE] Opus judge API call failed, using statistical consensus:', error);
    }
  } else {
    console.log(`[JUDGE] Skipping Opus API call - conditions not met`);
  }

  // Calculate overall agreement from standard deviations
  // FIX: Only include metrics with 2+ LLM scores - single-LLM metrics have stdDev=0 which falsely inflates agreement
  const validConsensuses = [...city1Consensuses, ...city2Consensuses].filter(c => c.llmScores.length >= 2);
  const validStdDevs = validConsensuses.map(c => c.standardDeviation);

  // If no metrics have 2+ LLMs, use default (indicates insufficient data, not perfect agreement)
  const avgStdDev = validStdDevs.length > 0 ? calculateMean(validStdDevs) : CONFIDENCE_THRESHOLDS.DEFAULT_AVG_STDDEV;
  const overallAgreement = Math.max(0, Math.min(100, Math.round(100 - avgStdDev * 2)));

  const output: JudgeOutput = {
    city1Consensuses,
    city2Consensuses,
    overallAgreement,
    disagreementAreas: disagreementMetrics.slice(0, 5),
    judgeLatencyMs: Date.now() - startTime,
    // Include Opus token usage for cost tracking
    usage: {
      opusTokens: opusTokenUsage
    }
  };

  return res.status(200).json(output);
  } catch (error) {
    console.error('Judge handler error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown judge error';
    return res.status(500).json({ error: errorMsg });
  }
}
