/**
 * LIFE SCORE - Olivia Context Builder API
 * Transforms comparison data into context for Olivia AI assistant
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// TYPES (inline to avoid import issues in Vercel)
// ============================================================================

interface ContextCity {
  name: string;
  country: string;
  totalScore: number;
  normalizedScore: number;
}

interface ContextMetric {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  consensusLevel?: string;
  judgeExplanation?: string;
  legalScore?: number;
  enforcementScore?: number;
}

interface ContextCategory {
  id: string;
  name: string;
  city1Score: number;
  city2Score: number;
  winner: string;
  topMetrics: ContextMetric[];
}

interface ContextEvidence {
  metricId: string;
  metricName: string;
  city: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
  }>;
}

interface LifeScoreContext {
  comparison: {
    city1: ContextCity;
    city2: ContextCity;
    winner: string;
    scoreDifference: number;
    generatedAt: string;
    comparisonId: string;
  };
  categories: ContextCategory[];
  topMetrics: ContextMetric[];
  evidence: ContextEvidence[];
  consensus?: {
    llmsUsed: string[];
    judgeModel: string;
    overallConfidence: string;
    disagreementSummary?: string;
    topDisagreements: Array<{
      metricName: string;
      standardDeviation: number;
      explanation: string;
    }>;
  };
  gammaReportUrl?: string;
  stats?: {
    metricsEvaluated: number;
    totalProcessingTimeMs: number;
  };
}

// ============================================================================
// CATEGORY NAME MAPPING
// ============================================================================

const CATEGORY_NAMES: Record<string, string> = {
  'personal_freedom': 'Personal Autonomy',
  'personal-freedom': 'Personal Autonomy',
  'housing_property': 'Housing & Property',
  'housing-property': 'Housing & Property',
  'business_work': 'Business & Work',
  'business-work': 'Business & Work',
  'transportation': 'Transportation',
  'policing_legal': 'Policing & Courts',
  'policing-courts': 'Policing & Courts',
  'speech_lifestyle': 'Speech & Lifestyle',
  'speech-lifestyle': 'Speech & Lifestyle',
};

// ============================================================================
// CONTEXT BUILDER FUNCTIONS
// ============================================================================

/**
 * Check if result is enhanced (multi-LLM) format
 */
function isEnhancedResult(result: any): boolean {
  return 'llmsUsed' in result && Array.isArray(result.llmsUsed);
}

/**
 * Build context from standard ComparisonResult
 */
function buildStandardContext(result: any): LifeScoreContext {
  const city1 = result.city1;
  const city2 = result.city2;

  // Build category summaries
  const categories: ContextCategory[] = city1.categories.map((cat: any, idx: number) => {
    const city2Cat = city2.categories[idx];
    const winner = cat.averageScore > city2Cat.averageScore ? 'city1' :
                   city2Cat.averageScore > cat.averageScore ? 'city2' : 'tie';

    // Get top 3 metrics by score difference
    const metricDiffs = cat.metrics.map((m: any, mIdx: number) => ({
      metric: m,
      city2Metric: city2Cat.metrics[mIdx],
      diff: Math.abs(m.normalizedScore - (city2Cat.metrics[mIdx]?.normalizedScore || 0))
    }));
    metricDiffs.sort((a: any, b: any) => b.diff - a.diff);

    const topMetrics: ContextMetric[] = metricDiffs.slice(0, 3).map((md: any) => ({
      id: md.metric.metricId,
      name: md.metric.metricName || md.metric.metricId,
      city1Score: Math.round(md.metric.normalizedScore),
      city2Score: Math.round(md.city2Metric?.normalizedScore || 0),
    }));

    return {
      id: cat.categoryId,
      name: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      city1Score: Math.round(cat.averageScore),
      city2Score: Math.round(city2Cat.averageScore),
      winner,
      topMetrics,
    };
  });

  // Collect evidence from all metrics
  const evidence: ContextEvidence[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.sources && metric.sources.length > 0) {
        evidence.push({
          metricId: metric.metricId,
          metricName: metric.metricName || metric.metricId,
          city: city1.city,
          sources: metric.sources.map((url: string) => ({ url })),
        });
      }
    });
  });
  city2.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.sources && metric.sources.length > 0) {
        evidence.push({
          metricId: metric.metricId,
          metricName: metric.metricName || metric.metricId,
          city: city2.city,
          sources: metric.sources.map((url: string) => ({ url })),
        });
      }
    });
  });

  // Get overall top metrics by score difference
  const allMetricDiffs: any[] = [];
  city1.categories.forEach((cat: any, catIdx: number) => {
    cat.metrics.forEach((m: any, mIdx: number) => {
      const city2Metric = city2.categories[catIdx]?.metrics[mIdx];
      allMetricDiffs.push({
        id: m.metricId,
        name: m.metricName || m.metricId,
        city1Score: Math.round(m.normalizedScore),
        city2Score: Math.round(city2Metric?.normalizedScore || 0),
        diff: Math.abs(m.normalizedScore - (city2Metric?.normalizedScore || 0))
      });
    });
  });
  allMetricDiffs.sort((a, b) => b.diff - a.diff);
  const topMetrics = allMetricDiffs.slice(0, 10);

  return {
    comparison: {
      city1: {
        name: city1.city,
        country: city1.country,
        totalScore: Math.round(city1.totalScore),
        normalizedScore: Math.round(city1.normalizedScore),
      },
      city2: {
        name: city2.city,
        country: city2.country,
        totalScore: Math.round(city2.totalScore),
        normalizedScore: Math.round(city2.normalizedScore),
      },
      winner: result.winner === 'city1' ? city1.city :
              result.winner === 'city2' ? city2.city : 'Tie',
      scoreDifference: Math.round(result.scoreDifference),
      generatedAt: result.generatedAt,
      comparisonId: result.comparisonId,
    },
    categories,
    topMetrics,
    evidence: evidence.slice(0, 20), // Limit evidence to avoid context overflow
    stats: {
      metricsEvaluated: allMetricDiffs.length,
      totalProcessingTimeMs: 0,
    },
  };
}

/**
 * Build context from EnhancedComparisonResult (multi-LLM)
 */
function buildEnhancedContext(result: any): LifeScoreContext {
  const city1 = result.city1;
  const city2 = result.city2;

  // Build category summaries with consensus data
  const categories: ContextCategory[] = city1.categories.map((cat: any, idx: number) => {
    const city2Cat = city2.categories[idx];
    const winner = cat.averageConsensusScore > city2Cat.averageConsensusScore ? 'city1' :
                   city2Cat.averageConsensusScore > cat.averageConsensusScore ? 'city2' : 'tie';

    // Get top 3 metrics by score difference or disagreement
    const metricData = cat.metrics.map((m: any, mIdx: number) => ({
      metric: m,
      city2Metric: city2Cat.metrics[mIdx],
      diff: Math.abs(m.consensusScore - (city2Cat.metrics[mIdx]?.consensusScore || 0)),
      stdDev: m.standardDeviation || 0,
    }));
    metricData.sort((a: any, b: any) => b.diff - a.diff);

    const topMetrics: ContextMetric[] = metricData.slice(0, 3).map((md: any) => ({
      id: md.metric.metricId,
      name: md.metric.metricId, // Will be formatted by client
      city1Score: Math.round(md.metric.consensusScore),
      city2Score: Math.round(md.city2Metric?.consensusScore || 0),
      consensusLevel: md.metric.confidenceLevel,
      judgeExplanation: md.metric.judgeExplanation,
      legalScore: md.metric.legalScore,
      enforcementScore: md.metric.enforcementScore,
    }));

    return {
      id: cat.categoryId,
      name: CATEGORY_NAMES[cat.categoryId] || cat.categoryId,
      city1Score: Math.round(cat.averageConsensusScore),
      city2Score: Math.round(city2Cat.averageConsensusScore),
      winner,
      topMetrics,
    };
  });

  // Collect evidence from LLM scores
  const evidence: ContextEvidence[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((metric: any) => {
      if (metric.llmScores) {
        metric.llmScores.forEach((llmScore: any) => {
          if (llmScore.evidence && llmScore.evidence.length > 0) {
            evidence.push({
              metricId: metric.metricId,
              metricName: metric.metricId,
              city: city1.city,
              sources: llmScore.evidence.map((e: any) => ({
                url: e.url,
                title: e.title,
                snippet: e.snippet,
              })),
            });
          }
        });
      }
    });
  });

  // Get top disagreements
  const topDisagreements: any[] = [];
  city1.categories.forEach((cat: any) => {
    cat.metrics.forEach((m: any) => {
      if (m.standardDeviation && m.standardDeviation > 10) {
        topDisagreements.push({
          metricName: m.metricId,
          standardDeviation: m.standardDeviation,
          explanation: m.judgeExplanation || 'LLMs disagreed on this metric.',
        });
      }
    });
  });
  topDisagreements.sort((a, b) => b.standardDeviation - a.standardDeviation);

  // Get overall top metrics
  const allMetricDiffs: any[] = [];
  city1.categories.forEach((cat: any, catIdx: number) => {
    cat.metrics.forEach((m: any, mIdx: number) => {
      const city2Metric = city2.categories[catIdx]?.metrics[mIdx];
      allMetricDiffs.push({
        id: m.metricId,
        name: m.metricId,
        city1Score: Math.round(m.consensusScore),
        city2Score: Math.round(city2Metric?.consensusScore || 0),
        consensusLevel: m.confidenceLevel,
        judgeExplanation: m.judgeExplanation,
        diff: Math.abs(m.consensusScore - (city2Metric?.consensusScore || 0))
      });
    });
  });
  allMetricDiffs.sort((a, b) => b.diff - a.diff);
  const topMetrics = allMetricDiffs.slice(0, 10);

  return {
    comparison: {
      city1: {
        name: city1.city,
        country: city1.country,
        totalScore: Math.round(city1.totalConsensusScore),
        normalizedScore: Math.round(city1.totalConsensusScore),
      },
      city2: {
        name: city2.city,
        country: city2.country,
        totalScore: Math.round(city2.totalConsensusScore),
        normalizedScore: Math.round(city2.totalConsensusScore),
      },
      winner: result.winner === 'city1' ? city1.city :
              result.winner === 'city2' ? city2.city : 'Tie',
      scoreDifference: Math.round(result.scoreDifference),
      generatedAt: result.generatedAt,
      comparisonId: result.comparisonId,
    },
    categories,
    topMetrics,
    evidence: evidence.slice(0, 20),
    consensus: {
      llmsUsed: result.llmsUsed || [],
      judgeModel: result.judgeModel || 'claude-opus',
      overallConfidence: result.overallConsensusConfidence || 'medium',
      disagreementSummary: result.disagreementSummary,
      topDisagreements: topDisagreements.slice(0, 5),
    },
    stats: {
      metricsEvaluated: result.processingStats?.metricsEvaluated || allMetricDiffs.length,
      totalProcessingTimeMs: result.processingStats?.totalTimeMs || 0,
    },
  };
}

/**
 * Estimate token count for context
 */
function estimateTokens(context: LifeScoreContext): number {
  const json = JSON.stringify(context);
  // Rough estimate: ~4 characters per token
  return Math.ceil(json.length / 4);
}

/**
 * Truncate context if too large
 */
function truncateContext(context: LifeScoreContext, maxTokens: number): LifeScoreContext {
  let tokens = estimateTokens(context);

  if (tokens <= maxTokens) {
    return context;
  }

  // Progressively reduce data
  const truncated = { ...context };

  // First: reduce evidence
  if (truncated.evidence.length > 10) {
    truncated.evidence = truncated.evidence.slice(0, 10);
    tokens = estimateTokens(truncated);
    if (tokens <= maxTokens) return truncated;
  }

  // Second: reduce top metrics per category
  truncated.categories = truncated.categories.map(cat => ({
    ...cat,
    topMetrics: cat.topMetrics.slice(0, 2),
  }));
  tokens = estimateTokens(truncated);
  if (tokens <= maxTokens) return truncated;

  // Third: reduce overall top metrics
  truncated.topMetrics = truncated.topMetrics.slice(0, 5);
  tokens = estimateTokens(truncated);
  if (tokens <= maxTokens) return truncated;

  // Fourth: remove judge explanations
  truncated.topMetrics = truncated.topMetrics.map(m => ({
    ...m,
    judgeExplanation: undefined,
  }));
  truncated.categories = truncated.categories.map(cat => ({
    ...cat,
    topMetrics: cat.topMetrics.map(m => ({
      ...m,
      judgeExplanation: undefined,
    })),
  }));

  // Fifth: clear evidence entirely
  truncated.evidence = [];

  return truncated;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { comparisonResult, includeEvidence = true, maxTokens = 8000 } = req.body || {};

    if (!comparisonResult) {
      res.status(400).json({ error: 'comparisonResult is required' });
      return;
    }

    // Build context based on result type
    let context: LifeScoreContext;
    if (isEnhancedResult(comparisonResult)) {
      context = buildEnhancedContext(comparisonResult);
    } else {
      context = buildStandardContext(comparisonResult);
    }

    // Remove evidence if not requested
    if (!includeEvidence) {
      context.evidence = [];
    }

    // Truncate if needed
    const tokenEstimate = estimateTokens(context);
    const truncated = tokenEstimate > maxTokens;
    if (truncated) {
      context = truncateContext(context, maxTokens);
    }

    res.status(200).json({
      context,
      tokenEstimate: estimateTokens(context),
      truncated,
    });
  } catch (error) {
    console.error('[OLIVIA/CONTEXT] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to build context',
    });
  }
}
