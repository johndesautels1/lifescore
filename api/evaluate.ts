/**
 * LIFE SCORE™ LLM Evaluation API
 * Vercel Serverless Function - has access to environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { requireComparisonGrant } from './shared/entitlements.js';
import { callClaude } from './shared/anthropic.js';
import { callOpenAI } from './shared/openai.js';
import { callGemini } from './shared/gemini.js';
import { callGrok } from './shared/xai.js';
import { callPerplexity } from './shared/perplexity.js';
import { isRetryable } from './shared/llm.js';
import { AI_MODELS } from './shared/models.js';

/** The one model a standard (single-model) comparison runs on — see src/hooks/useComparison.ts. */
const STANDARD_COMPARISON_PROVIDER = 'claude-sonnet';
// Phase 2: Import shared metrics for category-based scoring (standalone api/shared version)
import { categoryToScore, getCategoryOptionsForPrompt } from './shared/metrics.js';
import { checkResearchOnce, tavilyResearch, tavilySearch } from './shared/tavily.js';
import {
  claimTavilyContext,
  fillTavilyContext,
  releaseTavilyContext,
  searchKey,
  tavilyPairKey,
  updateTavilyContext,
  worthSharing,
  type CachedSearch,
  type TavilyContextData,
} from './shared/tavilyCache.js';

// Timeout constants (in milliseconds)
const LLM_TIMEOUT_MS = 240000; // 240 seconds for LLM API calls (OpenAI, Claude, Gemini, etc.)
const TAVILY_TIMEOUT_MS = 45000; // 45 seconds for Tavily search/research (web APIs should be fast)

// FIX SD1+SD2: Dynamic year for Tavily search queries (prevents stale hardcoded years)
const CURRENT_YEAR = new Date().getFullYear().toString();

// Phase 2: Environment variable toggle for gradual rollout
const USE_CATEGORY_SCORING = process.env.USE_CATEGORY_SCORING === 'true';

// LLM Provider types
type LLMProvider = 'claude-sonnet' | 'gpt-4o' | 'gemini-3-pro' | 'grok-4' | 'perplexity';

interface EvaluationRequest {
  provider: LLMProvider;
  city1: string;
  city2: string;
  categoryId?: string;
  metrics: Array<{
    id: string;
    name: string;
    description: string;
    categoryId: string;
    scoringDirection: string;
  }>;
}

interface MetricScore {
  metricId: string;
  city1LegalScore: number | null;       // null if data missing - excludes from calculations
  city1EnforcementScore: number | null;
  city2LegalScore: number | null;
  city2EnforcementScore: number | null;
  confidence: string;
  reasoning?: string;
  sources?: string[];
  isMissing?: boolean;                  // true if metric should be excluded from totals
  // FIX #1: Add evidence fields that parseResponse() returns
  city1Evidence?: Array<{ title: string; url: string; snippet: string }>;
  city2Evidence?: Array<{ title: string; url: string; snippet: string }>;
}

// Evidence item from LLM web search
interface EvidenceSource {
  title: string;
  url: string;
  snippet: string;
}

// Parsed LLM evaluation structure (supports both letter grades and numeric)
interface ParsedEvaluation {
  metricId: string;
  // Letter grade (A/B/C/D/E, legacy) or, from the numbers prompt, a 0-100 score
  city1Legal?: string | number;
  city1Enforcement?: string | number;
  city2Legal?: string | number;
  city2Enforcement?: string | number;
  // Phase 2: Category-based format (legacy single category)
  city1Category?: string;
  city2Category?: string;
  // Phase 2b: Dual category format (legal vs enforcement)
  city1LegalCategory?: string;
  city1EnforcementCategory?: string;
  city2LegalCategory?: string;
  city2EnforcementCategory?: string;
  // Legacy numeric format (0-100) - fallback
  city1LegalScore?: number;
  city1EnforcementScore?: number;
  city2LegalScore?: number;
  city2EnforcementScore?: number;
  confidence?: string;
  reasoning?: string;
  sources?: string[];
  city1Evidence?: EvidenceSource[];
  city2Evidence?: EvidenceSource[];
}

// Extended metric interface with scoringCriteria for category-based scoring
interface MetricWithCriteria {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  scoringDirection: string;
  scoringCriteria?: {
    type: string;
    options?: Array<{
      value: string;
      label: string;
      score: number;
    }>;
  };
}

// Convert letter grade to numeric score
function letterToScore(grade: string | undefined): number {
  if (!grade) return 50; // Default to C
  const map: Record<string, number> = {
    'A': 100, 'a': 100,
    'B': 75,  'b': 75,
    'C': 50,  'c': 50,
    'D': 25,  'd': 25,
    'E': 0,   'e': 0,
    'F': 0,   'f': 0  // Treat F same as E
  };
  return map[grade.trim()] ?? 50;
}

// Token usage from LLM response
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Tavily credit usage: the credits Tavily reported for this evaluation's calls.
// Mirrored by TavilyUsage in src/services/llmEvaluators.ts (the screen's copy).
interface TavilyUsage {
  researchCredits: number;
  searchCredits: number;
  totalCredits: number;
  /** Research reports ordered whose credits Tavily did not report (the cost screen estimates these). */
  researchUnreported: number;
  /** Searches whose credits Tavily did not report (the cost screen estimates these). */
  searchUnreported: number;
}

interface EvaluationResponse {
  provider: LLMProvider;
  success: boolean;
  scores: MetricScore[];
  latencyMs: number;
  error?: string;
  warnings?: string[];
  // Cost tracking data
  usage?: {
    tokens: TokenUsage;
    tavily?: TavilyUsage;
  };
}

// Build BASE evaluation prompt with unified 0-100 numeric scoring
// This is shared by all LLMs - each LLM function adds its own addendum
// UPDATED 2026-01-21: Standardized to 5 anchor bands per 6-LLM consultation consensus
function buildBasePrompt(city1: string, city2: string, metrics: EvaluationRequest['metrics']): string {
  const metricsList = metrics.map(m => `
- ${m.id}: ${m.name}
  Description: ${m.description}
  Direction: ${m.scoringDirection === 'higher_is_better' ? 'Higher score = more freedom' : 'Lower score = more freedom'}
`).join('\n');

  return `You are an expert legal analyst evaluating freedom metrics for city comparison.

## TASK
Evaluate the following metrics for two cities. For EACH metric, provide TWO numeric scores (0-100):
1. **Legal Score**: What does the law technically say? Higher = more permissive law
2. **Enforcement Score**: How is the law actually enforced? Higher = more lenient enforcement

## CITIES TO COMPARE (Year: ${new Date().getFullYear()})
- City 1: ${city1}
- City 2: ${city2}

## SCORING SCALE (0-100) - USE THESE ANCHOR BANDS

**Legal Score (What the law says):**
| Score Range | Meaning |
|-------------|---------|
| 90-100 | Fully legal/unrestricted - no legal barriers |
| 70-89  | Generally permissive - minor limitations only |
| 50-69  | Moderate restrictions - some legal limits |
| 30-49  | Significant restrictions - substantial barriers |
| 0-29   | Prohibited/Illegal - severe penalties |

**Enforcement Score (How it's actually enforced):**
| Score Range | Meaning |
|-------------|---------|
| 90-100 | Never/rarely enforced - authorities ignore |
| 70-89  | Low priority - warnings, minimal action |
| 50-69  | Selectively enforced - depends on situation |
| 30-49  | Usually enforced - regular citations/arrests |
| 0-29   | Strictly enforced - zero tolerance |

## METRICS TO EVALUATE
${metricsList}

**IMPORTANT: There are exactly ${metrics.length} metrics above. You MUST return exactly ${metrics.length} evaluations.**

## OUTPUT FORMAT
Return a JSON object with this EXACT structure:
{
  "evaluations": [
    {
      "metricId": "metric_id_here",
      "city1Legal": 75,
      "city1Enforcement": 65,
      "city2Legal": 45,
      "city2Enforcement": 40,
      "confidence": "high",
      "reasoning": "Brief explanation of key difference",
      "sources": ["https://example.com/law-source"],
      "city1Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}],
      "city2Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}]
    }
  ]
}

## CRITICAL RULES
1. Use numeric scores 0-100 (integers only, no decimals)
2. Evaluate BOTH cities for EACH metric
3. Consider ${new Date().getFullYear()} laws and current enforcement trends
4. Return ONLY the JSON object, no other text
5. MUST include sources - URLs to laws, government sites, news articles backing your evaluation
6. Include city1Evidence and city2Evidence with title, url, and relevant snippet for each city
7. Return EXACTLY ${metrics.length} evaluations - do not skip any metrics`;
}

// Phase 2: Build category-based prompt that asks LLM to return category VALUE KEYS
function buildCategoryPrompt(city1: string, city2: string, metrics: MetricWithCriteria[]): string {
  const metricsList = metrics.map(m => {
    const options = getCategoryOptionsForPrompt(m.id);
    return `
- ${m.id}: ${m.name}
  Description: ${m.description}
  Direction: ${m.scoringDirection === 'higher_is_better' ? 'Higher = more freedom' : 'Lower = more freedom'}
  **CATEGORY OPTIONS (choose EXACTLY one value for each city):**
${options.map(o => `    - "${o.value}": ${o.label} → ${o.score} points`).join('\n')}`;
  }).join('\n');

  return `You are an expert legal analyst evaluating freedom metrics for city comparison.

## TASK
Evaluate the following metrics for two cities. For EACH metric, you must provide TWO separate assessments:
1. **LEGAL** - What does the written law technically say?
2. **ENFORCEMENT** - How is it actually enforced in practice?

These often differ! A law may exist but be rarely enforced (high enforcement freedom), or informal enforcement may be stricter than the law suggests.

## CITIES TO COMPARE (Year: ${new Date().getFullYear()})
- City 1: ${city1}
- City 2: ${city2}

## METRICS TO EVALUATE
${metricsList}

## OUTPUT FORMAT
Return a JSON object with this EXACT structure:
{
  "evaluations": [
    {
      "metricId": "metric_id_here",
      "city1LegalCategory": "the_value_key",
      "city1EnforcementCategory": "the_value_key",
      "city2LegalCategory": "the_value_key",
      "city2EnforcementCategory": "the_value_key",
      "confidence": "high",
      "reasoning": "Brief explanation including any law vs enforcement gap",
      "sources": ["https://example.com/law-source"],
      "city1Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}],
      "city2Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}]
    }
  ]
}

## CRITICAL RULES
1. Use ONLY the exact category value keys listed for each metric (e.g., "fully_legal", "medical_only")
2. Evaluate BOTH Legal AND Enforcement separately - they are often different!
3. Consider 2026 laws and current enforcement practices
4. Return ONLY the JSON object, no other text
5. MUST include sources - URLs to laws, government sites, news articles backing your evaluation`;
}

/**
 * Read an evaluator's reply into scores: level choices (USE_CATEGORY_SCORING on),
 * 0-100 numbers, or legacy letter grades. A half that cannot be read is null.
 * Exported for tests/evaluateParse.test.ts.
 */
export function parseResponse(content: string, provider: LLMProvider): MetricScore[] {
  try {
    // Log first 500 chars of raw response for debugging
    console.log(`[PARSE] ${provider} raw response (first 500):`, content.substring(0, 500));

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

    const parsed = JSON.parse(jsonStr) as { evaluations?: ParsedEvaluation[] };

    // Log what format was detected
    const hasCategories = parsed.evaluations?.some(e => (e.city1Category && e.city2Category) || (e.city1LegalCategory && e.city2LegalCategory));
    const hasLetters = parsed.evaluations?.some(e => typeof e.city1Legal === 'string' || typeof e.city2Legal === 'string');
    const hasNumbers = parsed.evaluations?.some(e => typeof e.city1LegalScore === 'number' || typeof e.city1Legal === 'number');
    console.log(`[PARSE] ${provider} format: categories=${hasCategories}, letters=${hasLetters}, numbers=${hasNumbers}`);
    console.log(`[PARSE] ${provider} returned ${parsed.evaluations?.length || 0} evaluations`);

    // Helper: Convert letter grade to score, or clamp numeric score
    // FIX 2026-01-21: Handle string numbers (e.g., "75" instead of 75) safely
    // FIX 2026-01-25: Return null instead of 50 for missing/invalid data - prevents artificial convergence
    const getScore = (letter: string | number | undefined, numeric: number | string | undefined): number | null => {
      // Prefer letter grade if present (legacy support)
      if (letter && typeof letter === 'string' && /^[A-Ea-e]$/.test(letter.trim())) {
        return letterToScore(letter);
      }
      // The numbers prompt (buildBasePrompt) asks for "city1Legal": 75 — a number
      // under the letter's name. Until 4 Oct 2026 that went unread and every score
      // was dropped whenever USE_CATEGORY_SCORING was off (fault SC6).
      if (numeric === undefined || numeric === null) {
        numeric = typeof letter === 'number' || (typeof letter === 'string' && letter.trim() !== '') ? letter : undefined;
      }
      // Handle numeric scores - convert strings to numbers safely
      // FIXED: Return null for missing data instead of defaulting to 50
      if (numeric === undefined || numeric === null) {
        return null; // Missing data - will be excluded from calculations
      }
      // Convert to number (handles both number and string "75")
      const numericValue = typeof numeric === 'string' ? parseFloat(numeric) : numeric;
      // Validate and clamp to 0-100
      // FIXED: Return null for invalid data instead of defaulting to 50
      if (isNaN(numericValue)) {
        console.warn(`[PARSE] Invalid numeric value: ${numeric}, excluding metric`);
        return null;
      }
      return Math.max(0, Math.min(100, Math.round(numericValue)));
    };

    // Phase 2: Helper to convert category to score using shared metrics
    // FIXED: Return null for missing category instead of 50
    const getCategoryScore = (metricId: string, category: string | undefined): number | null => {
      if (!category) return null;
      const result = categoryToScore(metricId, category);
      return result.score ?? null;
    };

    return (parsed.evaluations || []).map((e: ParsedEvaluation) => {
      // Phase 2b: NEW dual category format (legal + enforcement separate)
      if (USE_CATEGORY_SCORING && e.city1LegalCategory && e.city1EnforcementCategory) {
        return {
          metricId: e.metricId,
          city1LegalScore: getCategoryScore(e.metricId, e.city1LegalCategory),
          city1EnforcementScore: getCategoryScore(e.metricId, e.city1EnforcementCategory),
          city2LegalScore: getCategoryScore(e.metricId, e.city2LegalCategory),
          city2EnforcementScore: getCategoryScore(e.metricId, e.city2EnforcementCategory),
          confidence: e.confidence || 'medium',
          reasoning: e.reasoning,
          sources: e.sources,
          city1Evidence: e.city1Evidence || [],
          city2Evidence: e.city2Evidence || []
        };
      }

      // Phase 2: Legacy single category format (backwards compatibility)
      if (USE_CATEGORY_SCORING && e.city1Category && e.city2Category) {
        const city1Score = getCategoryScore(e.metricId, e.city1Category);
        const city2Score = getCategoryScore(e.metricId, e.city2Category);
        return {
          metricId: e.metricId,
          city1LegalScore: city1Score,
          city1EnforcementScore: city1Score,
          city2LegalScore: city2Score,
          city2EnforcementScore: city2Score,
          confidence: e.confidence || 'medium',
          reasoning: e.reasoning,
          sources: e.sources,
          city1Evidence: e.city1Evidence || [],
          city2Evidence: e.city2Evidence || []
        };
      }

      // Legacy: letter grades or numeric scores
      return {
        metricId: e.metricId,
        // Convert letter grades to numeric scores (A=100, B=75, C=50, D=25, E=0)
        city1LegalScore: getScore(e.city1Legal, e.city1LegalScore),
        city1EnforcementScore: getScore(e.city1Enforcement, e.city1EnforcementScore),
        city2LegalScore: getScore(e.city2Legal, e.city2LegalScore),
        city2EnforcementScore: getScore(e.city2Enforcement, e.city2EnforcementScore),
        confidence: e.confidence || 'medium',
        reasoning: e.reasoning,
        sources: e.sources,
        // Include evidence from LLM web search
        city1Evidence: e.city1Evidence || [],
        city2Evidence: e.city2Evidence || []
      };
    });
  } catch (error) {
    console.error(`Failed to parse ${provider} response:`, error);
    return [];
  }
}

// Tavily: research baseline + category searches, through the one Tavily
// connection (api/shared/tavily.ts), done ONCE per city pair and shared by every
// category, model and half-batch for 30 minutes (api/shared/tavilyCache.ts).

/** The Tavily context block for an evaluator's prompt, and what it cost. */
interface TavilyContext {
  /** Text placed before the evaluation prompt ('' when Tavily returned nothing). */
  context: string;
  usage: TavilyUsage;
}

/** No Tavily call made by this evaluation (it used the shared research). */
const NO_TAVILY_COST: TavilyUsage = { researchCredits: 0, searchCredits: 0, totalCredits: 0, researchUnreported: 0, searchUnreported: 0 };

/** The twelve searches: each of the six categories, for each city. */
function tavilySearchQueries(city1: string, city2: string): string[] {
  return [
    // personal_freedom (15 metrics)
    `${city1} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws ${CURRENT_YEAR}`,
    `${city2} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws ${CURRENT_YEAR}`,
    // housing_property (20 metrics)
    `${city1} property rights zoning HOA land use housing regulations ${CURRENT_YEAR}`,
    `${city2} property rights zoning HOA land use housing regulations ${CURRENT_YEAR}`,
    // business_work (25 metrics)
    `${city1} business regulations taxes licensing employment labor laws ${CURRENT_YEAR}`,
    `${city2} business regulations taxes licensing employment labor laws ${CURRENT_YEAR}`,
    // transportation (15 metrics)
    `${city1} transportation vehicle regulations transit parking driving laws ${CURRENT_YEAR}`,
    `${city2} transportation vehicle regulations transit parking driving laws ${CURRENT_YEAR}`,
    // policing_legal (15 metrics)
    `${city1} criminal justice police enforcement legal rights civil liberties ${CURRENT_YEAR}`,
    `${city2} criminal justice police enforcement legal rights civil liberties ${CURRENT_YEAR}`,
    // speech_lifestyle (10 metrics)
    `${city1} freedom speech expression privacy lifestyle regulations ${CURRENT_YEAR}`,
    `${city2} freedom speech expression privacy lifestyle regulations ${CURRENT_YEAR}`,
  ];
}

/** Runs the research order and the twelve searches, in parallel, and counts what they cost. */
async function searchTavily(city1: string, city2: string, queries: string[]): Promise<{ data: TavilyContextData; usage: TavilyUsage }> {
  const [research, ...searchResults] = await Promise.all([
    tavilyResearch(
      `Compare freedom laws and enforcement between ${city1} and ${city2} across: personal freedom (drugs, gambling, abortion, LGBTQ rights), property rights (zoning, HOA, land use), business regulations (licensing, taxes, employment), transportation laws, policing and legal system, and speech/lifestyle freedoms. Focus on ${CURRENT_YEAR} current laws.`,
      { deadlineMs: TAVILY_TIMEOUT_MS, label: `${city1} vs ${city2}` },
    ),
    ...queries.map(q => tavilySearch(q, 5, TAVILY_TIMEOUT_MS)),
  ]);

  const searches: Record<string, CachedSearch> = {};
  queries.forEach((q, i) => {
    searches[searchKey(q)] = { results: searchResults[i].results, answer: searchResults[i].answer };
  });

  const researchCredits = research.ordered ? (research.credits ?? 0) : 0;
  const searchCredits = searchResults.reduce((sum, r) => sum + (r.credits ?? 0), 0);
  return {
    data: { research: research.report, researchRequestId: research.requestId, searches },
    usage: {
      researchCredits,
      searchCredits,
      totalCredits: researchCredits + searchCredits,
      researchUnreported: research.ordered && research.credits === null ? 1 : 0,
      searchUnreported: searchResults.filter(r => r.credits === null).length,
    },
  };
}

/** A shared copy whose report was not ready in time: ask Tavily once whether it is now. */
async function completeLateResearch(key: string, data: TavilyContextData): Promise<TavilyContextData> {
  if (data.research || !data.researchRequestId) return data;
  const status = await checkResearchOnce(data.researchRequestId, 5000);
  if (status?.status === 'completed' && status.text) {
    const updated: TavilyContextData = { ...data, research: { text: status.text, sources: status.sources }, researchRequestId: undefined };
    await updateTavilyContext(key, updated);
    console.log('[TAVILY] Late research report collected for', key);
    return updated;
  }
  if (status?.status === 'failed') {
    const updated: TavilyContextData = { ...data, researchRequestId: undefined };
    await updateTavilyContext(key, updated);
    return updated;
  }
  return data;
}

/**
 * The Tavily context for one evaluation: the city pair's shared research when
 * another call has it (or is fetching it), else this call searches and shares.
 * Returns null when Tavily is not configured. Never throws.
 */
async function gatherTavilyContext(city1: string, city2: string, closingLine: string): Promise<TavilyContext | null> {
  if (!process.env.TAVILY_API_KEY) return null;

  const queries = tavilySearchQueries(city1, city2);
  const key = tavilyPairKey(city1, city2);
  const claim = await claimTavilyContext(key);

  let data: TavilyContextData;
  let usage: TavilyUsage;
  if (claim.kind === 'hit') {
    data = await completeLateResearch(key, claim.data);
    usage = NO_TAVILY_COST;
  } else {
    const fresh = await searchTavily(city1, city2, queries);
    data = fresh.data;
    usage = fresh.usage;
    if (claim.kind === 'claimed') {
      if (worthSharing(data)) await fillTavilyContext(key, data);
      else await releaseTavilyContext(key);
    }
  }

  // This evaluation's own query order (the cities may be the other way round).
  const searchResults = queries.map(q => data.searches[searchKey(q)] ?? { results: [] });
  const allResults = searchResults.flatMap(r => r.results);
  const answers = searchResults.map(r => r.answer).filter(Boolean);

  // Build context: Research report first, then category searches
  const contextParts: string[] = [];

  if (data.research) {
    contextParts.push(`## TAVILY RESEARCH REPORT (Comprehensive Baseline)
${data.research.text}

**Sources:** ${data.research.sources.map((s, i) => `[${i + 1}] ${s.title}`).join(', ')}
`);
  }

  if (allResults.length > 0) {
    contextParts.push(`## CATEGORY-SPECIFIC SEARCH RESULTS
${answers.length > 0 ? `**Category Summaries:** ${answers.join(' | ')}\n\n` : ''}
${allResults.map(r => `- **${r.title}** (${r.url}): ${r.content}`).join('\n')}
`);
  }

  console.log(`[TAVILY] ${city1} vs ${city2}: ${claim.kind === 'hit' ? 'shared research reused' : claim.kind === 'claimed' ? 'searched and shared' : 'searched (no shared copy)'}, report ${data.research ? 'used' : 'not available'}, ${allResults.length} search results, credits reported ${usage.totalCredits} (unreported: ${usage.researchUnreported} research, ${usage.searchUnreported} searches)`);

  return {
    context: contextParts.length > 0 ? contextParts.join('\n') + closingLine : '',
    usage,
  };
}

/** Adds an evaluation's Tavily cost (and the no-research warning) to its result. */
function withTavily(result: EvaluationResponse, tavily: TavilyContext | null): EvaluationResponse {
  if (!tavily) return result;
  const warnings = tavily.context
    ? result.warnings
    : [...(result.warnings ?? []), 'Web research data was unavailable — scores may be less accurate'];
  return {
    ...result,
    warnings,
    usage: { tokens: result.usage?.tokens ?? { inputTokens: 0, outputTokens: 0 }, tavily: tavily.usage },
  };
}

/** Both halves' warnings, each once (large categories run as two batches). */
function mergeWarnings(a: string[] | undefined, b: string[] | undefined): string[] | undefined {
  const all = [...new Set([...(a ?? []), ...(b ?? [])])];
  return all.length > 0 ? all : undefined;
}

/** Adds up the Tavily cost of a category's two halves (large categories run as two batches). */
function sumTavilyUsage(a: TavilyUsage | undefined, b: TavilyUsage | undefined): TavilyUsage | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    researchCredits: a.researchCredits + b.researchCredits,
    searchCredits: a.searchCredits + b.searchCredits,
    totalCredits: a.totalCredits + b.totalCredits,
    researchUnreported: a.researchUnreported + b.researchUnreported,
    searchUnreported: a.searchUnreported + b.searchUnreported,
  };
}

// Claude evaluation — model from AI_MODELS.claudeEvaluator (with optional Tavily web research)
async function evaluateWithClaude(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: 0, error: 'ANTHROPIC_API_KEY not configured' };
  }

  const startTime = Date.now();

  // FIX: Batch split for large categories (Housing = 20 metrics) to prevent timeouts
  const BATCH_THRESHOLD = 12;
  if (metrics.length > BATCH_THRESHOLD) {
    console.log(`[CLAUDE] Large category (${metrics.length} metrics), splitting into batches`);
    const midpoint = Math.ceil(metrics.length / 2);
    const batch1 = metrics.slice(0, midpoint);
    const batch2 = metrics.slice(midpoint);
    console.log(`[CLAUDE] Batch 1: ${batch1.length} metrics, Batch 2: ${batch2.length} metrics`);

    const [result1, result2] = await Promise.all([
      evaluateWithClaude(city1, city2, batch1),
      evaluateWithClaude(city1, city2, batch2)
    ]);

    const combinedScores = [...result1.scores, ...result2.scores];
    const combinedSuccess = result1.success && result2.success;
    const combinedUsage: TokenUsage = {
      inputTokens: (result1.usage?.tokens?.inputTokens || 0) + (result2.usage?.tokens?.inputTokens || 0),
      outputTokens: (result1.usage?.tokens?.outputTokens || 0) + (result2.usage?.tokens?.outputTokens || 0)
    };

    console.log(`[CLAUDE] Batched: ${combinedScores.length}/${metrics.length} scores, success=${combinedSuccess}`);
    return {
      provider: 'claude-sonnet',
      success: combinedSuccess || combinedScores.length > 0,
      scores: combinedScores,
      latencyMs: Date.now() - startTime,
      usage: { tokens: combinedUsage, tavily: sumTavilyUsage(result1.usage?.tavily, result2.usage?.tavily) },
      warnings: mergeWarnings(result1.warnings, result2.warnings),
      error: !combinedSuccess ? `Batch errors: ${result1.error || ''} ${result2.error || ''}`.trim() : undefined
    };
  }

  // Fetch Tavily context: Research baseline + Category searches (in parallel)
  const tavily = await gatherTavilyContext(city1, city2, '\nUse this research and search data to inform your evaluation.\n');
  const tavilyContext = tavily?.context ?? '';

  // CLAUDE-SPECIFIC ADDENDUM
  // UPDATED 2026-01-21: Removed duplicate scale (now in buildBasePrompt)
  const claudeAddendum = `
## CLAUDE-SPECIFIC INSTRUCTIONS
- Use the Tavily Research Report as your primary baseline for comparing ${city1} vs ${city2}
- Cross-reference with category-specific search results for detailed metrics
- You excel at nuanced legal interpretation - distinguish between law text vs enforcement reality
- For ambiguous cases, lean toward the score that reflects lived experience over technical legality
- Follow the scoring scale defined above (0-100 with 5 anchor bands)
- You MUST return evaluations for ALL ${metrics.length} metrics - do not skip any
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = tavilyContext + basePrompt + claudeAddendum;

  console.log(`[EVALUATE] USE_CATEGORY_SCORING=${USE_CATEGORY_SCORING}`);

  // FIX: Retry logic with exponential backoff (matches Gemini/Grok pattern)
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CLAUDE] Attempt ${attempt}/${MAX_RETRIES} for ${city1} vs ${city2}`);

      // One shared Claude call point (api/shared/anthropic.ts) — it retries overloads itself.
      const reply = await callClaude({
        model: AI_MODELS.claudeEvaluator.id,
        maxTokens: 24000, // room for thinking + 100 scored metrics
        effort: 'medium',
        messages: [{ role: 'user', content: prompt }],
        timeoutMs: LLM_TIMEOUT_MS,
        retries: 1,
        label: 'evaluate',
      });

      if (!reply.ok) {
        lastError = reply.message;
        console.error(`[CLAUDE] Attempt ${attempt} failed: ${lastError}`);
        // A request Anthropic rejects outright (4xx other than overload) will not succeed on retry
        if (reply.kind === 'not-configured' || reply.kind === 'refused' || (reply.kind === 'http' && reply.status !== undefined && reply.status < 500 && reply.status !== 429)) {
          return withTavily({ provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError }, tavily);
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[CLAUDE] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const content = reply.text;

      const scores = parseResponse(content, 'claude-sonnet');

      if (scores.length === 0) {
        lastError = 'Invalid JSON or no evaluations parsed from Claude response';
        console.error(`[CLAUDE] Attempt ${attempt}: ${lastError}. Content preview: ${content.substring(0, 200)}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      // Token usage for cost tracking
      const usage: TokenUsage = {
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens
      };

      console.log(`[CLAUDE] Success on attempt ${attempt}: ${scores.length} scores returned`);
      return withTavily({
        provider: 'claude-sonnet',
        success: true,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      }, tavily);

    } catch (error) {
      lastError = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
      console.error(`[CLAUDE] Attempt ${attempt} exception: ${lastError}`);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[CLAUDE] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  console.error(`[CLAUDE] All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
  return withTavily({ provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` }, tavily);
}

// GPT evaluation — model from AI_MODELS.gptEvaluator (with Tavily web research)
async function evaluateWithGPT4o(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { provider: 'gpt-4o', success: false, scores: [], latencyMs: 0, error: 'OPENAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // Fetch Tavily context: Research baseline + Category searches (in parallel)
  const tavily = await gatherTavilyContext(city1, city2, '\nUse this research and search data to inform your evaluation.\n');
  const tavilyContext = tavily?.context ?? '';

  // GPT SPECIFIC ADDENDUM
  // UPDATED 2026-01-21: Removed duplicate scale (now in buildBasePrompt)
  const gptAddendum = `
## GPT SPECIFIC INSTRUCTIONS
- Use the Tavily Research Report as your primary baseline for comparing ${city1} vs ${city2}
- Cross-reference with category-specific search results for detailed metrics
- Focus on factual accuracy - be precise with scores using the 5 anchor bands
- Follow the scoring scale defined above (0-100 with 5 anchor bands)
- You MUST evaluate ALL ${metrics.length} metrics - do not skip any
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = tavilyContext + basePrompt + gptAddendum;

  // FIX: Retry logic with exponential backoff (matches Gemini/Grok pattern)
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[GPT] Attempt ${attempt}/${MAX_RETRIES} for ${city1} vs ${city2}`);

      // One shared OpenAI call point (api/shared/openai.ts) — Responses API, model from AI_MODELS.
      const reply = await callOpenAI({
        model: AI_MODELS.gptEvaluator.id,
        system: `You are an expert legal analyst comparing two cities on freedom metrics.
Use the Tavily research data provided in the user message to evaluate laws and regulations.

## IMPORTANT
- Follow the scoring scale in the user message (0-100 with 5 anchor bands)
- Use numeric scores 0-100 (integers only)
- For each metric, provide TWO scores: Legal Score and Enforcement Score
- Use the Tavily research data as your primary source
- If the research doesn't cover a metric, use your knowledge but set confidence="low"
- Return JSON exactly matching the format requested
- You MUST evaluate ALL metrics provided`,
        user: prompt,
        maxOutputTokens: 32000, // reasoning and the scored JSON share this ceiling
        effort: 'medium',
        timeoutMs: LLM_TIMEOUT_MS,
        retries: 1,
        label: 'evaluate-gpt',
      });
      if (!reply.ok) {
        lastError = reply.message;
        console.error(`[GPT] Attempt ${attempt} failed: ${lastError}`);
        // A request the vendor rejects outright will not succeed on retry
        if (!isRetryable(reply)) {
          return withTavily({ provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError }, tavily);
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[GPT] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const content = reply.text;

      const scores = parseResponse(content, 'gpt-4o');

      if (scores.length === 0) {
        lastError = 'Invalid JSON or no evaluations parsed from the GPT response';
        console.error(`[GPT] Attempt ${attempt}: ${lastError}. Content preview: ${content.substring(0, 200)}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      // Extract token usage from OpenAI response
      const usage: TokenUsage = {
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens
      };

      console.log(`[GPT] Success on attempt ${attempt}: ${scores.length} scores returned`);
      return withTavily({
        provider: 'gpt-4o',
        success: true,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      }, tavily);

    } catch (error) {
      lastError = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
      console.error(`[GPT] Attempt ${attempt} exception: ${lastError}`);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[GPT] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  console.error(`[GPT] All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
  return withTavily({ provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` }, tavily);
}

// Gemini evaluation — model from AI_MODELS.geminiEvaluator (with Google Search grounding)
async function evaluateWithGemini(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: 0, error: 'GEMINI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // FIX: Batch split for large categories (Housing = 20, Policing = 15) to prevent timeouts
  const BATCH_THRESHOLD = 12;
  if (metrics.length >= BATCH_THRESHOLD) {
    console.log(`[GEMINI] Large category (${metrics.length} metrics), splitting into batches`);
    const midpoint = Math.ceil(metrics.length / 2);
    const batch1 = metrics.slice(0, midpoint);
    const batch2 = metrics.slice(midpoint);
    console.log(`[GEMINI] Batch 1: ${batch1.length} metrics, Batch 2: ${batch2.length} metrics`);

    const [result1, result2] = await Promise.all([
      evaluateWithGemini(city1, city2, batch1),
      evaluateWithGemini(city1, city2, batch2)
    ]);

    const combinedScores = [...result1.scores, ...result2.scores];
    const combinedSuccess = result1.success && result2.success;
    const combinedUsage: TokenUsage = {
      inputTokens: (result1.usage?.tokens?.inputTokens || 0) + (result2.usage?.tokens?.inputTokens || 0),
      outputTokens: (result1.usage?.tokens?.outputTokens || 0) + (result2.usage?.tokens?.outputTokens || 0)
    };

    console.log(`[GEMINI] Batched: ${combinedScores.length}/${metrics.length} scores, success=${combinedSuccess}`);
    return {
      provider: 'gemini-3-pro',
      success: combinedSuccess || combinedScores.length > 0,
      scores: combinedScores,
      latencyMs: Date.now() - startTime,
      usage: { tokens: combinedUsage },
      error: !combinedSuccess ? `Batch errors: ${result1.error || ''} ${result2.error || ''}`.trim() : undefined
    };
  }

  // GEMINI-SPECIFIC ADDENDUM (optimized for Reasoning-over-Grounding)
  // UPDATED 2026-01-21: Removed duplicate scale (now in buildBasePrompt)
  // FIX: Lowered threshold from 20 to 12 to also cover Policing (15 metrics) timeouts
  const isLargeCategory = metrics.length >= 12;
  const geminiAddendum = `
## GEMINI-SPECIFIC INSTRUCTIONS
- Use Google Search grounding to verify current ${new Date().getFullYear()} legal status for both cities
- Apply your "Thinking" reasoning to distinguish between legal text and enforcement reality
- For Policing & Legal metrics (pl_*), spend extra reasoning time on contradictory data
- Follow the scoring scale defined above (0-100 with 5 anchor bands)
- You have the full context window - maintain consistency across all ${metrics.length} metrics
- You MUST evaluate ALL ${metrics.length} metrics - do not skip any
${isLargeCategory ? `
## CRITICAL: CONCISENESS REQUIRED (${metrics.length} metrics)
- Keep "reasoning" to 1 sentence only (under 25 words)
- Include only 1 source per metric (most authoritative only)
- Include only 1 evidence item per city per metric
- Omit verbose explanations - scores and brief justification are sufficient
- This is required to fit within the output token limit
` : ''}`;

  // Gemini system instruction
  // UPDATED 2026-01-21: Added reference to base prompt's scale
  const systemInstruction = {
    parts: [{
      text: 'You are an expert legal analyst evaluating freedom metrics for city comparison. Use Google Search grounding to find current, accurate data about laws and regulations. Be factual and cite sources. Follow the scoring scale in the user message (0-100 with 5 anchor bands). Use numeric scores 0-100 (integers only). You MUST evaluate ALL metrics provided.'
    }]
  };

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = basePrompt + geminiAddendum;

  // FIX #49: Gemini retry logic with exponential backoff (matches Grok pattern)
  // Addresses cold start timeouts on enhanced search
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[GEMINI] Attempt ${attempt}/${MAX_RETRIES} for ${city1} vs ${city2}`);

      // One shared Gemini call point (api/shared/gemini.ts) — key in a header, model from AI_MODELS.
      const reply = await callGemini({
        model: AI_MODELS.geminiEvaluator.id,
        system: systemInstruction.parts[0].text,
        user: prompt,
        maxOutputTokens: 16384, // the answer only — Gemini's thinking is counted separately
        temperature: 0.2,       // stricter factual adherence (lowered from 0.3 on 2026-02-03)
        googleSearch: true,     // Google Search grounding for current law
        timeoutMs: LLM_TIMEOUT_MS,
        retries: 1,
        label: 'evaluate-gemini',
      });
      if (!reply.ok) {
        lastError = reply.message;
        console.error(`[GEMINI] Attempt ${attempt} failed: ${lastError}`);
        // A request the vendor rejects outright will not succeed on retry
        if (!isRetryable(reply)) {
          return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError };
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[GEMINI] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const content = reply.text;

      const scores = parseResponse(content, 'gemini-3-pro');

      if (scores.length === 0) {
        lastError = 'Invalid JSON or no evaluations parsed from Gemini response';
        console.error(`[GEMINI] Attempt ${attempt}: ${lastError}. Content preview: ${content.substring(0, 200)}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      // Extract token usage from Gemini response
      const usage: TokenUsage = {
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens
      };

      // Success!
      console.log(`[GEMINI] Success on attempt ${attempt}: ${scores.length} scores returned`);
      return {
        provider: 'gemini-3-pro',
        success: true,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error');
      console.error(`[GEMINI] Attempt ${attempt} exception: ${lastError}`);

      // Exponential backoff before retry
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[GEMINI] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  console.error(`[GEMINI] All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
  return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` };
}

// Grok evaluation — model from AI_MODELS.grokEvaluator (with its own web search)
async function evaluateWithGrok(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { provider: 'grok-4', success: false, scores: [], latencyMs: 0, error: 'XAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // FIX: Batch split for large categories (Business & Work = 25 metrics) to prevent timeouts
  // Matches existing pattern used by Claude (line ~698), Gemini (~1117), Perplexity (~1479)
  const BATCH_THRESHOLD = 12;
  if (metrics.length > BATCH_THRESHOLD) {
    console.log(`[GROK] Large category (${metrics.length} metrics), splitting into batches`);
    const midpoint = Math.ceil(metrics.length / 2);
    const batch1 = metrics.slice(0, midpoint);
    const batch2 = metrics.slice(midpoint);
    console.log(`[GROK] Batch 1: ${batch1.length} metrics, Batch 2: ${batch2.length} metrics`);

    const [result1, result2] = await Promise.all([
      evaluateWithGrok(city1, city2, batch1),
      evaluateWithGrok(city1, city2, batch2)
    ]);

    const combinedScores = [...result1.scores, ...result2.scores];
    const combinedSuccess = result1.success && result2.success;
    const combinedUsage: TokenUsage = {
      inputTokens: (result1.usage?.tokens?.inputTokens || 0) + (result2.usage?.tokens?.inputTokens || 0),
      outputTokens: (result1.usage?.tokens?.outputTokens || 0) + (result2.usage?.tokens?.outputTokens || 0)
    };

    console.log(`[GROK] Batched: ${combinedScores.length}/${metrics.length} scores, success=${combinedSuccess}`);
    return {
      provider: 'grok-4',
      success: combinedSuccess || combinedScores.length > 0,
      scores: combinedScores,
      latencyMs: Date.now() - startTime,
      usage: { tokens: combinedUsage },
      error: !combinedSuccess ? `Batch errors: ${result1.error || ''} ${result2.error || ''}`.trim() : undefined
    };
  }

  // GROK-SPECIFIC ADDENDUM (optimized per Grok's own recommendations 2026-01-21)
  // UPDATED 2026-01-21: Removed duplicate scale (now in buildBasePrompt)
  const currentYear = new Date().getFullYear();
  const grokAddendum = `
## GROK-SPECIFIC CLASSIFICATION RULES

### REAL-TIME DATA STRATEGY
- Use your native X/Twitter search to bridge "legal theory" vs "enforcement reality"
- Query pattern: "${city1} OR ${city2} [metric keywords] enforcement experience since:${CURRENT_YEAR}-01-01"
- Summarize 5-10 recent posts to inform if enforcement deviates from written law
- Weight X anecdotes at 20-30% alongside official sources (gov sites, statutes)

### DATE/RECENCY REQUIREMENTS
- Base classification on current ${currentYear} laws and enforcement
- Sources must be from the last 12 months; flag older data as confidence: "low"
- If laws are in flux (pending legislation), classify based on CURRENT effective status
- Note potential changes in reasoning field

### CLASSIFICATION RULES
- Prioritize official sources (gov sites, statutes) but cross-verify with X for enforcement reality
- Follow the scoring scale defined above (0-100 with 5 anchor bands)
- If ambiguous, choose closest band and note uncertainty in reasoning

### EDGE CASES
- For rapidly changing laws: classify conservatively (current status), set confidence: "low"
- For pending legislation: note in reasoning, stick to current effective law
- If enforcement differs significantly from law, note gap in reasoning

### OUTPUT
- You MUST evaluate ALL ${metrics.length} metrics - do not skip any
- Return ONLY valid JSON matching the requested format
- No additional text outside the JSON object
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = basePrompt + grokAddendum;

  // Grok retry logic with exponential backoff (per Grok's recommendation)
  const MAX_RETRIES = 3;
  let lastError = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[GROK] Attempt ${attempt}/${MAX_RETRIES} for ${city1} vs ${city2}`);

      // One shared xAI call point (api/shared/xai.ts) — Responses API with web search, model from AI_MODELS.
      const reply = await callGrok({
        model: AI_MODELS.grokEvaluator.id,
        system: `You are an expert legal analyst classifying freedom metrics. Use real-time web search for verification.

## CLASSIFICATION APPROACH
- For LEGAL score: Classify based on written law text from official sources
- For ENFORCEMENT score: Use X/Twitter search for real-world resident experiences
- These often differ (e.g., law exists but rarely enforced)

## IMPORTANT
- Follow the scoring scale in the user message (0-100 with 5 anchor bands)
- Use numeric scores 0-100 (integers only)
- Return ONLY valid JSON matching the requested format
- Evaluate ALL metrics provided - do not skip any
- If ambiguous, use closest band and explain in reasoning
- Sources must be from last 12 months for high confidence`,
        user: prompt,
        maxOutputTokens: 16384,
        effort: 'low',       // xAI's setting for scoring calls (engine grokSeat, 2026-09)
        temperature: 0.2,    // Grok recommendation: 0.2-0.4 for deterministic classification
        webSearch: true,
        timeoutMs: LLM_TIMEOUT_MS,
        retries: 1,
        label: 'evaluate-grok',
      });
      if (!reply.ok) {
        lastError = reply.message;
        console.error(`[GROK] Attempt ${attempt} failed: ${lastError}`);
        // A request the vendor rejects outright will not succeed on retry
        if (!isRetryable(reply)) {
          return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError };
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[GROK] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const content = reply.text;

      const scores = parseResponse(content, 'grok-4');

      if (scores.length === 0) {
        lastError = 'Invalid JSON or no evaluations parsed from Grok response';
        console.error(`[GROK] Attempt ${attempt}: ${lastError}. Content preview: ${content.substring(0, 200)}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      // Token usage from Grok's reply
      const usage: TokenUsage = {
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens
      };

      // Success!
      console.log(`[GROK] Success on attempt ${attempt}: ${scores.length} scores returned`);
      return {
        provider: 'grok-4',
        success: true,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error');
      console.error(`[GROK] Attempt ${attempt} exception: ${lastError}`);

      // Exponential backoff before retry
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[GROK] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  console.error(`[GROK] All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
  return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` };
}

// Perplexity evaluation (with Sonar web search and citations)
// UPDATED 2026-02-03: Optimized prompts per Perplexity recommendations - reduced evidence, better batching
async function evaluateWithPerplexity(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { provider: 'perplexity', success: false, scores: [], latencyMs: 0, error: 'PERPLEXITY_API_KEY not configured' };
  }

  const startTime = Date.now();

  // BATCHING: For categories >15 metrics, split into smaller batches to prevent output truncation
  // UPDATED 2026-02-03: Lowered from 20 to 15 for more reliable responses
  const BATCH_THRESHOLD = 15;
  if (metrics.length > BATCH_THRESHOLD) {
    console.log(`[PERPLEXITY] Large category detected (${metrics.length} metrics), splitting into batches`);

    const midpoint = Math.ceil(metrics.length / 2);
    const batch1 = metrics.slice(0, midpoint);
    const batch2 = metrics.slice(midpoint);

    console.log(`[PERPLEXITY] Batch 1: ${batch1.length} metrics, Batch 2: ${batch2.length} metrics`);

    // Run batches in parallel — each batch is a separate API call with different metrics
    const [result1, result2] = await Promise.all([
      evaluateWithPerplexity(city1, city2, batch1),
      evaluateWithPerplexity(city1, city2, batch2),
    ]);

    // Merge results
    const combinedScores = [...result1.scores, ...result2.scores];
    const combinedLatency = Date.now() - startTime;
    const combinedSuccess = result1.success && result2.success;

    // Combine token usage
    const combinedUsage: TokenUsage = {
      inputTokens: (result1.usage?.tokens?.inputTokens || 0) + (result2.usage?.tokens?.inputTokens || 0),
      outputTokens: (result1.usage?.tokens?.outputTokens || 0) + (result2.usage?.tokens?.outputTokens || 0)
    };

    console.log(`[PERPLEXITY] Batched evaluation complete: ${combinedScores.length}/${metrics.length} scores, success=${combinedSuccess}`);

    return {
      provider: 'perplexity',
      success: combinedSuccess || combinedScores.length > 0, // Partial success if we got any scores
      scores: combinedScores,
      latencyMs: combinedLatency,
      usage: { tokens: combinedUsage, tavily: sumTavilyUsage(result1.usage?.tavily, result2.usage?.tavily) },
      warnings: mergeWarnings(result1.warnings, result2.warnings),
      error: !combinedSuccess ? `Batch errors: ${result1.error || ''} ${result2.error || ''}`.trim() : undefined
    };
  }

  // Fetch Tavily context: Research baseline + Category searches (in parallel)
  // This pre-fetches data so Perplexity doesn't have to do ALL web searches itself
  const tavily = await gatherTavilyContext(city1, city2, '\nUse this Tavily research data to supplement your Sonar web search.\n');
  const tavilyContext = tavily?.context ?? '';

  // PERPLEXITY-SPECIFIC ADDENDUM (optimized for citation-backed research)
  // UPDATED 2026-02-03: Added source efficiency, reuse, and confidence fallback rules per Perplexity optimization
  const perplexityAddendum = `
## PERPLEXITY-SPECIFIC INSTRUCTIONS

### Source Strategy
- Use your Sonar web search to find 2-3 authoritative sources per metric for reliability
- Cite specific laws, statutes, or official government sources when possible
- Your strength is verified, citation-backed research - leverage it
- For enforcement scores, look for news articles about actual enforcement actions

### Source Reuse Efficiency
- When evaluating related metrics (e.g., multiple gun laws, multiple tax types), reuse the same authoritative source if it covers multiple topics
- Prefer comprehensive government portals that cover multiple regulations over searching separately for each metric
- Example: A state's official code/statutes page can often answer 5-10 related metrics

### Evidence Output Efficiency
- Include 2-3 source URLs in the "sources" array for verification and reliability
- Limit "city1Evidence" and "city2Evidence" to AT MOST 1 detailed snippet each per metric
- The snippet should be the most relevant quote supporting your score

### Confidence Fallback
- If current data is unavailable or sources conflict, use "medium" confidence and note uncertainty in reasoning
- If a metric truly cannot be evaluated (e.g., city doesn't have the relevant law category), use scores of 50/50 with "low" confidence

### Required
- Follow the scoring scale defined above (0-100 with 5 anchor bands)
- You MUST evaluate ALL ${metrics.length} metrics - do not skip any
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = tavilyContext + basePrompt + perplexityAddendum;

  // Retry loop (3 attempts with exponential backoff, matching Gemini/Grok pattern)
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[PERPLEXITY] Attempt ${attempt}/${MAX_RETRIES} for ${metrics.length} metrics`);

      // One shared Perplexity call point (api/shared/perplexity.ts) — the Agent API; Perplexity
      // switched the chat/completions endpoint this route used off on 27 September 2026.
      const reply = await callPerplexity({
        preset: AI_MODELS.perplexityEvaluator.id,
        instructions: `You are an expert legal analyst evaluating freedom metrics. Use your web search to find current laws.

## SCORING RULES
- Follow the scoring scale in the user message (0-100 with 5 anchor bands)
- Use numeric scores 0-100 (integers only)
- Higher scores = MORE freedom/permissiveness for that metric

## OUTPUT EFFICIENCY RULES
- "sources": Include 2-3 URLs for reliability and verification
- "city1Evidence" and "city2Evidence": Include AT MOST 1 evidence snippet each (the most relevant)
- Keep reasoning brief (1-2 sentences max)
- IMPORTANT: Minimize your <think> reasoning to conserve output tokens for the JSON response

## CONFIDENCE RULES
- "high": Clear, current data from official sources
- "medium": Data exists but may be outdated or sources partially conflict
- "low": Limited data available; using best available inference

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no explanation):
{
  "evaluations": [
    {
      "metricId": "metric_id",
      "city1Legal": 75,
      "city1Enforcement": 70,
      "city2Legal": 60,
      "city2Enforcement": 55,
      "confidence": "high",
      "reasoning": "Brief explanation",
      "sources": ["url1", "url2"],
      "city1Evidence": [{"title": "Source", "url": "https://...", "snippet": "Key quote"}],
      "city2Evidence": [{"title": "Source", "url": "https://...", "snippet": "Key quote"}]
    }
  ]
}

You MUST evaluate ALL metrics provided. Return ONLY the JSON object.`,
        input: prompt,
        maxOutputTokens: 16384,
        timeoutMs: LLM_TIMEOUT_MS,
        retries: 1,
        label: 'evaluate-perplexity',
      });

      if (!reply.ok) {
        if (!isRetryable(reply)) {
          return withTavily({ provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: reply.message }, tavily);
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[PERPLEXITY] ${reply.message} — retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        return withTavily({ provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: `${reply.message} (after ${MAX_RETRIES} attempts)` }, tavily);
      }

      let rawText = reply.text;

      // Strip <think>...</think> blocks from reasoning models
      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Check for JSON in code blocks first
      const codeMatch = rawText.match(/```json([\s\S]*?)```/i) ?? rawText.match(/```([\s\S]*?)```/);
      const candidate = codeMatch ? codeMatch[1].trim() : rawText;

      // Extract JSON object - try multiple patterns
      let jsonMatch = candidate.match(/\{[\s\S]*\}/);

      // If no match, try to find JSON that starts with {"evaluations"
      if (!jsonMatch) {
        const evalMatch = candidate.match(/\{"evaluations"[\s\S]*\}/);
        if (evalMatch) jsonMatch = evalMatch;
      }

      // If still no match, try to extract from raw text
      if (!jsonMatch && !codeMatch) {
        const jsonStart = rawText.indexOf('{"evaluations"');
        if (jsonStart !== -1) {
          const jsonSubstr = rawText.substring(jsonStart);
          jsonMatch = jsonSubstr.match(/\{[\s\S]*\}/);
        }
      }

      if (!jsonMatch) {
        console.error('[PERPLEXITY] No JSON found. Preview:', rawText.slice(0, 500));
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[PERPLEXITY] No JSON in response, retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        return withTavily({ provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'No JSON object found in Perplexity output after retries' }, tavily);
      }

      const scores = parseResponse(jsonMatch[0], 'perplexity');
      if (scores.length === 0) {
        console.error('[PERPLEXITY] parseResponse returned 0 scores. JSON preview:', jsonMatch[0].slice(0, 300));
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[PERPLEXITY] 0 scores parsed, retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
      }

      // Token usage from the stream's usage frame
      const usage: TokenUsage = {
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens
      };
      // FIX: If API returned no usage, estimate from prompt + response length
      // so costs aren't silently lost (~4 chars per token)
      if (usage.inputTokens === 0 && usage.outputTokens === 0 && rawText.length > 0) {
        usage.inputTokens = Math.ceil(prompt.length / 4);
        usage.outputTokens = Math.ceil(rawText.length / 4);
        console.warn(`[PERPLEXITY] Estimated tokens from text: ${usage.inputTokens} in / ${usage.outputTokens} out`);
      }

      return withTavily({
        provider: 'perplexity',
        success: scores.length > 0,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      }, tavily);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error');
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[PERPLEXITY] Exception on attempt ${attempt}: ${errorMsg}, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      return withTavily({ provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg }, tavily);
    }
  }

  // Should never reach here, but TypeScript safety
  return withTavily({ provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Unexpected end of retry loop' }, tavily);
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // CORS - restricted to Vercel deployment domain
  if (handleCors(req, res, 'restricted')) return;

  // Rate limiting - heavy preset for expensive LLM calls
  if (!applyRateLimit(req.headers, 'evaluate', 'heavy', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // A body that is not JSON is the caller's mistake: 400, not a 500 (bug audit A21).
  // @vercel/node parses the body when it is first read and throws on bad JSON.
  let body: EvaluationRequest;
  try {
    body = req.body as EvaluationRequest;
  } catch {
    return res.status(400).json({ error: 'The request body is not valid JSON' });
  }

  try {
    const { provider, city1, city2, metrics } = (body ?? {}) as EvaluationRequest;

    if (!provider || !city1 || !city2 || !metrics) {
      console.error('[EVALUATE] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: provider, city1, city2, metrics' });
    }

    // Sign-in + a comparison grant for this city pair (counted once at /api/usage/consume).
    // A standard comparison runs on one model only; every model needs an enhanced grant.
    const granted = await requireComparisonGrant(req, res, city1, city2, ['standardComparisons', 'enhancedComparisons']);
    if (!granted) return;
    if (granted.feature === 'standardComparisons' && provider !== STANDARD_COMPARISON_PROVIDER) {
      return res.status(403).json({
        error: 'Comparing with every AI model needs an enhanced comparison.',
        code: 'upgrade_required',
        feature: 'enhancedComparisons',
        requiredTier: 'enterprise',
      });
    }

    console.log(`[EVALUATE] Starting ${provider} evaluation for ${city1} vs ${city2}, ${metrics.length} metrics`);
    console.log(`[EVALUATE] USE_CATEGORY_SCORING=${USE_CATEGORY_SCORING}`);

    let result: EvaluationResponse;

    switch (provider) {
      case 'claude-sonnet':
        console.log(`[EVALUATE] Calling ${AI_MODELS.claudeEvaluator.name}...`);
        result = await evaluateWithClaude(city1, city2, metrics);
        break;
      case 'gpt-4o':
        console.log(`[EVALUATE] Calling ${AI_MODELS.gptEvaluator.name}...`);
        result = await evaluateWithGPT4o(city1, city2, metrics);
        break;
      case 'gemini-3-pro':
        console.log(`[EVALUATE] Calling ${AI_MODELS.geminiEvaluator.name}...`);
        result = await evaluateWithGemini(city1, city2, metrics);
        break;
      case 'grok-4':
        console.log(`[EVALUATE] Calling ${AI_MODELS.grokEvaluator.name}...`);
        result = await evaluateWithGrok(city1, city2, metrics);
        break;
      case 'perplexity':
        console.log(`[EVALUATE] Calling ${AI_MODELS.perplexityEvaluator.name}...`);
        result = await evaluateWithPerplexity(city1, city2, metrics);
        break;
      default:
        console.error(`[EVALUATE] Unknown provider: ${provider}`);
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    console.log(`[EVALUATE] ${provider} completed in ${Date.now() - startTime}ms, success: ${result.success}, scores: ${result.scores?.length || 0}`);

    if (!result.success) {
      console.error(`[EVALUATE] ${provider} failed: ${result.error}`);
    }

    // Tavily use for this evaluation is logged by gatherTavilyContext ("[TAVILY] …").

    // Surface warnings for partial failures
    const warnings: string[] = result.warnings || [];
    if (result.success && result.scores.length < metrics.length) {
      warnings.push(`Only ${result.scores.length} of ${metrics.length} metrics were scored`);
    }
    // The "web research unavailable" warning is added per evaluation by withTavily().
    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return res.status(200).json(result);
  } catch (error) {
    // Catch any uncaught errors to prevent hanging
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[EVALUATE] Uncaught error after ${Date.now() - startTime}ms:`, errorMessage);

    return res.status(500).json({
      provider: 'unknown',
      success: false,
      scores: [],
      latencyMs: Date.now() - startTime,
      error: `Server error: ${errorMessage}`
    });
  }
}
