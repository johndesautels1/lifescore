/**
 * LIFE SCORE™ Judge Report API
 * Vercel Serverless Function - Claude Opus 4.5 comprehensive analysis
 *
 * This endpoint generates THE JUDGE's comprehensive verdict including:
 * - Holistic freedom analysis across all metrics
 * - Future trend forecasting for each city
 * - Contextual recommendations based on user values
 * - Political/cultural shift analysis
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { fetchWithTimeout } from './shared/fetchWithTimeout.js';
import { CATEGORIES } from './shared/metrics.js';

// Timeout constant for Opus API (240s - within Vercel Pro 300s limit)
const OPUS_TIMEOUT_MS = 240000;

// ============================================================================
// TYPES
// ============================================================================

interface JudgeReportRequest {
  comparisonResult: {
    city1: CityConsensusScore;
    city2: CityConsensusScore;
    winner: 'city1' | 'city2' | 'tie';
    scoreDifference: number;
    llmsUsed: string[];
    overallConsensusConfidence: 'high' | 'medium' | 'low';
    disagreementSummary: string;
    comparisonId: string;
    generatedAt: string;
  };
  userId: string;
}

interface CityConsensusScore {
  city: string;
  country: string;
  region?: string;
  categories: CategoryConsensus[];
  totalConsensusScore: number;
  overallAgreement: number;
}

interface CategoryConsensus {
  categoryId: string;
  metrics: MetricConsensus[];
  averageConsensusScore: number;
  agreementLevel: number;
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

interface LLMMetricScore {
  metricId: string;
  normalizedScore: number;
  legalScore?: number;
  enforcementScore?: number;
  llmProvider: string;
  evidence?: EvidenceItem[];
  sources?: string[];
}

interface EvidenceItem {
  city: string;
  title: string;
  url: string;
  snippet: string;
  retrieved_at: string;
}

// Judge Report Output Types
interface JudgeReport {
  reportId: string;
  generatedAt: string;
  userId: string;
  comparisonId: string;
  city1: string;
  city2: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'generating' | 'ready' | 'error';
  summaryOfFindings: {
    city1Score: number;
    city1Trend: 'rising' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'rising' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };
  categoryAnalysis: {
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }[];
  executiveSummary: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

interface OpusJudgeResponse {
  summaryOfFindings: {
    city1Trend: 'rising' | 'stable' | 'declining';
    city2Trend: 'rising' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };
  categoryAnalysis: {
    categoryId: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }[];
  executiveSummary: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

function buildJudgePrompt(
  city1: string,
  city2: string,
  comparisonResult: JudgeReportRequest['comparisonResult']
): string {
  const { city1: c1Data, city2: c2Data, llmsUsed, overallConsensusConfidence, disagreementSummary } = comparisonResult;

  // Build category summaries with metrics
  const categorySummaries: string[] = [];
  const allEvidence: string[] = [];

  c1Data.categories.forEach((cat1, idx) => {
    const cat2 = c2Data.categories[idx];
    const categoryDef = CATEGORIES.find(c => c.id === cat1.categoryId);
    const categoryName = categoryDef?.name || cat1.categoryId;
    const categoryWeight = categoryDef?.weight || 0;

    // Handle both enhanced (averageConsensusScore) and standard (no average) results
    const cat1Score = cat1.averageConsensusScore ?? cat1.metrics?.reduce((sum, m) => sum + (m.consensusScore ?? m.normalizedScore ?? 0), 0) / (cat1.metrics?.length || 1);
    const cat2Score = cat2?.averageConsensusScore ?? cat2?.metrics?.reduce((sum, m) => sum + (m.consensusScore ?? m.normalizedScore ?? 0), 0) / (cat2?.metrics?.length || 1);

    let catSummary = `\n### ${categoryName} (Weight: ${categoryWeight}%)\n`;
    catSummary += `${city1}: ${(cat1Score ?? 0).toFixed(1)} | ${city2}: ${(cat2Score ?? 0).toFixed(1)}\n`;
    catSummary += `Agreement: ${city1}=${cat1.agreementLevel ?? 'N/A'}% | ${city2}=${cat2?.agreementLevel ?? 'N/A'}%\n`;
    catSummary += `\nKey Metrics:\n`;

    // Include top metrics from this category
    cat1.metrics.slice(0, 5).forEach(m => {
      const m2 = cat2?.metrics.find(x => x.metricId === m.metricId);
      const confidence = (m.confidenceLevel ?? 'moderate').toUpperCase();
      const m1Score = m.consensusScore ?? m.normalizedScore ?? 0;
      const m2Score = m2?.consensusScore ?? m2?.normalizedScore ?? 'N/A';
      catSummary += `- ${m.metricId}: ${city1}=${m1Score} (Legal:${m.legalScore ?? 'N/A'}/Enf:${m.enforcementScore ?? 'N/A'}) | ${city2}=${m2Score} [${confidence}, σ=${m.standardDeviation ?? 0}]\n`;

      // Collect evidence (only exists in enhanced results)
      if (m.llmScores) {
        m.llmScores.forEach(score => {
          if (score.evidence) {
            score.evidence.forEach(e => {
              if (e.snippet && e.snippet.length > 20) {
                allEvidence.push(`[${e.city}] ${e.title}: "${e.snippet.slice(0, 200)}..." (${e.url})`);
              }
            });
          }
          if (score.sources) {
            score.sources.forEach(src => {
              allEvidence.push(`[Source] ${src}`);
            });
          }
        });
      }
    });

    categorySummaries.push(catSummary);
  });

  // Limit evidence to prevent token overflow
  const evidenceSection = allEvidence.length > 0
    ? `\n## EVIDENCE FROM EVALUATOR LLMs\n${allEvidence.slice(0, 30).join('\n')}\n`
    : '';

  return `You are Claude Opus 4.5, THE JUDGE for LIFE SCORE™ - the final arbiter of freedom comparisons.

## YOUR ROLE
You are not just analyzing scores - you are THE JUDGE who must:
1. Look BEYOND the numbers to understand the LIVED REALITY of freedom in each city
2. Analyze FUTURE TRENDS - where is each city heading? Rising or declining in freedom?
3. Consider POLITICAL and CULTURAL shifts that may not yet be reflected in current laws
4. Provide a DEFINITIVE RECOMMENDATION even if scores are close

## CITIES BEING COMPARED
- City 1: ${city1} (${c1Data.country})
- City 2: ${city2} (${c2Data.country})

## CURRENT SCORES (from ${llmsUsed?.length || 1} LLM evaluators)
- ${city1}: ${(c1Data.totalConsensusScore ?? c1Data.totalScore ?? 0).toFixed(1)}/100 (Agreement: ${c1Data.overallAgreement ?? 'N/A'}%)
- ${city2}: ${(c2Data.totalConsensusScore ?? c2Data.totalScore ?? 0).toFixed(1)}/100 (Agreement: ${c2Data.overallAgreement ?? 'N/A'}%)
- Overall Consensus Confidence: ${(overallConsensusConfidence ?? 'medium').toUpperCase()}
${disagreementSummary ? `- Disagreement Areas: ${disagreementSummary}` : ''}

## DETAILED CATEGORY BREAKDOWN
${categorySummaries.join('\n')}
${evidenceSection}
## TREND ANALYSIS INSTRUCTIONS
For each city, assess whether freedom is:
- **RISING**: Recent legal reforms, court decisions, or political shifts expanding freedom
- **STABLE**: No significant changes expected in the next 2-3 years
- **DECLINING**: Recent restrictions, pending legislation, or political trends reducing freedom

Consider:
- Recent elections and political power shifts
- Pending legislation or ballot measures
- Court cases that may set precedent
- Cultural/demographic shifts affecting enforcement
- Economic factors affecting policy

## YOUR TASK
Provide a comprehensive Judge's Report in the following JSON format:

{
  "summaryOfFindings": {
    "city1Trend": "rising" | "stable" | "declining",
    "city2Trend": "rising" | "stable" | "declining",
    "overallConfidence": "high" | "medium" | "low"
  },
  "categoryAnalysis": [
    {
      "categoryId": "personal_freedom",
      "city1Analysis": "2-3 sentence analysis of ${city1}'s standing in this category",
      "city2Analysis": "2-3 sentence analysis of ${city2}'s standing in this category",
      "trendNotes": "Key trend observations for this category"
    }
    // ... one entry for each of the 6 categories
  ],
  "executiveSummary": {
    "recommendation": "city1" | "city2" | "tie",
    "rationale": "2-3 paragraph explanation of your verdict, going beyond the scores to explain WHY this city is better for someone seeking freedom",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3", "Factor 4", "Factor 5"],
    "futureOutlook": "1-2 paragraph forecast of how these cities' freedom landscapes may change in the next 3-5 years",
    "confidenceLevel": "high" | "medium" | "low"
  }
}

## CRITICAL INSTRUCTIONS
1. You MUST provide analysis for ALL 6 categories: personal_freedom, housing_property, business_work, transportation, policing_legal, speech_lifestyle
2. Your recommendation can OVERRIDE the raw scores if trend analysis suggests the "losing" city is actually better long-term
3. Be specific - cite particular laws, recent changes, or enforcement patterns you know about
4. The keyFactors should be the 5 most important considerations, not just a summary of categories
5. Consider the user's likely priorities: personal autonomy, property rights, business freedom, mobility, legal protection, self-expression

Return ONLY the JSON object, no other text.`;
}

function parseOpusJudgeResponse(content: string): OpusJudgeResponse | null {
  try {
    let jsonStr = content;

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const rawMatch = content.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate required structure
    if (!parsed.summaryOfFindings || !parsed.categoryAnalysis || !parsed.executiveSummary) {
      console.error('[JUDGE-REPORT] Missing required fields in Opus response');
      return null;
    }

    // Validate categoryAnalysis has 6 entries
    if (!Array.isArray(parsed.categoryAnalysis) || parsed.categoryAnalysis.length < 6) {
      console.warn(`[JUDGE-REPORT] Expected 6 category analyses, got ${parsed.categoryAnalysis?.length || 0}`);
      // Don't fail - we can work with partial data
    }

    return parsed as OpusJudgeResponse;
  } catch (error) {
    console.error('[JUDGE-REPORT] Failed to parse Opus response:', error);
    return null;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - restricted to Vercel deployment domain
  if (handleCors(req, res, 'restricted')) return;

  // Rate limiting - heavy preset for expensive Opus calls
  if (!applyRateLimit(req.headers, 'judge-report', 'heavy', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    const { comparisonResult, userId } = req.body as JudgeReportRequest;

    if (!comparisonResult || !userId) {
      return res.status(400).json({ error: 'Missing required fields: comparisonResult, userId' });
    }

    const city1 = comparisonResult.city1.city;
    const city2 = comparisonResult.city2.city;

    console.log(`[JUDGE-REPORT] Generating report for ${city1} vs ${city2}, userId: ${userId}`);

    // Check for Anthropic API key
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    // Build the comprehensive prompt
    const prompt = buildJudgePrompt(city1, city2, comparisonResult);
    console.log(`[JUDGE-REPORT] Prompt length: ${prompt.length} chars`);

    // Call Claude Opus 4.5
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
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }]
        })
      },
      OPUS_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[JUDGE-REPORT] Opus API error: ${response.status} - ${errorText.slice(0, 500)}`);
      return res.status(500).json({ error: `Opus API error: ${response.status}` });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error('[JUDGE-REPORT] Empty response from Opus');
      return res.status(500).json({ error: 'Empty response from Opus' });
    }

    console.log(`[JUDGE-REPORT] Opus response received, content length: ${content.length} chars`);

    // Parse the response
    const opusResult = parseOpusJudgeResponse(content);

    if (!opusResult) {
      console.error('[JUDGE-REPORT] Failed to parse Opus response');
      // Return raw content for debugging
      return res.status(500).json({
        error: 'Failed to parse Opus response',
        rawContent: content.slice(0, 1000)
      });
    }

    // Build the full JudgeReport
    const reportId = `LIFE-JDG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${userId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Map categoryAnalysis to include category names
    const categoryAnalysisWithNames = opusResult.categoryAnalysis.map(ca => {
      const categoryDef = CATEGORIES.find(c => c.id === ca.categoryId);
      return {
        categoryId: ca.categoryId,
        categoryName: categoryDef?.name || ca.categoryId,
        city1Analysis: ca.city1Analysis,
        city2Analysis: ca.city2Analysis,
        trendNotes: ca.trendNotes
      };
    });

    // Ensure we have all 6 categories (fill in any missing ones)
    const allCategoryIds = ['personal_freedom', 'housing_property', 'business_work', 'transportation', 'policing_legal', 'speech_lifestyle'];
    const existingIds = new Set(categoryAnalysisWithNames.map(ca => ca.categoryId));

    allCategoryIds.forEach(catId => {
      if (!existingIds.has(catId)) {
        const categoryDef = CATEGORIES.find(c => c.id === catId);
        categoryAnalysisWithNames.push({
          categoryId: catId,
          categoryName: categoryDef?.name || catId,
          city1Analysis: 'Analysis pending - generate full report for details.',
          city2Analysis: 'Analysis pending - generate full report for details.',
          trendNotes: 'Trend analysis pending.'
        });
      }
    });

    // Get scores - handle both enhanced (totalConsensusScore) and standard (totalScore) results
    const city1Score = comparisonResult.city1.totalConsensusScore ?? (comparisonResult.city1 as any).totalScore ?? 0;
    const city2Score = comparisonResult.city2.totalConsensusScore ?? (comparisonResult.city2 as any).totalScore ?? 0;

    const judgeReport: JudgeReport = {
      reportId,
      generatedAt: new Date().toISOString(),
      userId,
      comparisonId: comparisonResult.comparisonId,
      city1,
      city2,
      videoStatus: 'pending', // Will be updated by Phase C HeyGen integration
      summaryOfFindings: {
        city1Score: Math.round(city1Score),
        city1Trend: opusResult.summaryOfFindings.city1Trend,
        city2Score: Math.round(city2Score),
        city2Trend: opusResult.summaryOfFindings.city2Trend,
        overallConfidence: opusResult.summaryOfFindings.overallConfidence
      },
      categoryAnalysis: categoryAnalysisWithNames,
      executiveSummary: opusResult.executiveSummary
    };

    const latencyMs = Date.now() - startTime;
    console.log(`[JUDGE-REPORT] Report generated in ${latencyMs}ms, reportId: ${reportId}`);

    return res.status(200).json({
      success: true,
      report: judgeReport,
      latencyMs
    });

  } catch (error) {
    console.error('[JUDGE-REPORT] Handler error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: errorMsg });
  }
}
