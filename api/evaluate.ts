/**
 * LIFE SCORE™ LLM Evaluation API
 * Vercel Serverless Function - has access to environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
// Phase 2: Import shared metrics for category-based scoring (standalone api/shared version)
import { categoryToScore, METRICS_MAP, getCategoryOptionsForPrompt } from './shared/metrics.js';
import type { ScoreResult } from './shared/metrics.js';
import { fetchWithTimeout } from './shared/fetchWithTimeout.js';

// Timeout constants (in milliseconds)
const LLM_TIMEOUT_MS = 240000; // 240 seconds for LLM API calls (OpenAI, Claude, Gemini, etc.)
const TAVILY_TIMEOUT_MS = 45000; // 45 seconds for Tavily search/research (web APIs should be fast)

// ============================================================================
// TAVILY RESEARCH CACHE (In-memory, clears on redeploy)
// Added 2026-02-03 - Reduces duplicate Research API calls across LLM providers
// ============================================================================
interface CachedResearch {
  data: TavilyResearchResponse;
  timestamp: number;
}
const tavilyResearchCache = new Map<string, CachedResearch>();
const RESEARCH_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes (within single comparison session)
const RESEARCH_CACHE_MAX_ENTRIES = 50; // Cap to prevent unbounded memory growth

function pruneResearchCache(): void {
  if (tavilyResearchCache.size <= RESEARCH_CACHE_MAX_ENTRIES) return;
  const now = Date.now();
  // Remove expired entries first
  for (const [key, entry] of tavilyResearchCache) {
    if (now - entry.timestamp >= RESEARCH_CACHE_TTL_MS) {
      tavilyResearchCache.delete(key);
    }
  }
  // If still over limit, remove oldest entries
  if (tavilyResearchCache.size > RESEARCH_CACHE_MAX_ENTRIES) {
    const sorted = [...tavilyResearchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sorted.length - RESEARCH_CACHE_MAX_ENTRIES;
    for (let i = 0; i < toRemove; i++) {
      tavilyResearchCache.delete(sorted[i][0]);
    }
  }
}

// Stats tracking for logging
const tavilyStats = {
  researchCacheHits: 0,
  researchCacheMisses: 0,
  searchCalls: 0,
  reset() {
    this.researchCacheHits = 0;
    this.researchCacheMisses = 0;
    this.searchCalls = 0;
  },
  log(context: string) {
    console.log(`[TAVILY STATS - ${context}] Research: ${this.researchCacheHits} hits, ${this.researchCacheMisses} misses | Searches: ${this.searchCalls} calls`);
  }
};

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
  // Letter grade format (A/B/C/D/E) - preferred
  city1Legal?: string;
  city1Enforcement?: string;
  city2Legal?: string;
  city2Enforcement?: string;
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

// Authoritative sources for LLM web search
const AUTHORITATIVE_SOURCES = [
  'norml.org (cannabis laws)',
  'gunlaws.com (firearm regulations)',
  'ncsl.org (state legislation)',
  'ballotpedia.org (ballot measures)',
  'findlaw.com (legal information)',
  'justia.com (case law)',
  'state legislature websites',
  'city/county government websites'
];

// Build evaluation prompt with full scoring guidelines (0-100 scale)
function buildEvaluationPromptWithScoring(
  city1: string,
  city2: string,
  metrics: EvaluationRequest['metrics'],
  includeSearchInstructions: boolean = false
): string {
  const sourcesList = AUTHORITATIVE_SOURCES.map(s => `  - ${s}`).join('\n');

  const searchPreamble = includeSearchInstructions ? `
IMPORTANT: Use your web search capabilities to find current, accurate data about these cities' laws and regulations.

## PRIORITIZED DATA SOURCES
Search these authoritative sources FIRST:
${sourcesList}

Also search official government websites for the specific cities/regions being compared.
You MUST cite your sources in the "sources" field with actual URLs.

` : '';

  const metricsList = metrics.map(m => `
- ${m.id}: ${m.name}
  Category: ${m.categoryId}
  Description: ${m.description}
  Scoring: ${m.scoringDirection === 'higher_is_better' ? 'Higher = more freedom' : 'Lower = more freedom'}
`).join('\n');

  return `${searchPreamble}You are an expert legal analyst evaluating freedom metrics for city comparison.

## TASK
Evaluate the following metrics for two cities, providing DUAL scores:
1. **Legal Score (0-100)**: What does the law technically say? Higher = more permissive law
2. **Enforcement Score (0-100)**: How is the law actually enforced? Higher = more lenient enforcement

## CITIES TO COMPARE
- City 1: ${city1}
- City 2: ${city2}

## METRICS TO EVALUATE
${metricsList}

## OUTPUT FORMAT
Return a JSON object with this exact structure:
{
  "evaluations": [
    {
      "metricId": "metric_id_here",
      "city1LegalScore": 75,
      "city1EnforcementScore": 70,
      "city2LegalScore": 60,
      "city2EnforcementScore": 55,
      "confidence": "high",
      "reasoning": "Brief explanation with specific legal references",
      "sources": ["URL1", "URL2"]
    }
  ]
}

## SCORING GUIDELINES
- 90-100: Extremely permissive, minimal restrictions (MOST FREE)
- 70-89: Generally permissive with some limitations
- 50-69: Moderate restrictions
- 30-49: Significant restrictions
- 0-29: Highly restrictive or prohibited (LEAST FREE)

## IMPORTANT
- Be specific about laws and regulations
- Note differences between federal/national and local laws
- Consider recent changes (last 2 years)
- If uncertain, set confidence to "low" but still provide best estimate
- Enforcement score may differ significantly from legal score (e.g., law exists but rarely enforced)
- You MUST evaluate ALL ${metrics.length} metrics - do not skip any

Return ONLY the JSON object, no other text.`;
}

// Token usage from LLM response
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

// Tavily credit usage
interface TavilyUsage {
  researchCredits: number;
  searchCredits: number;
  totalCredits: number;
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

// Legacy function name for backward compatibility
function buildPrompt(city1: string, city2: string, metrics: EvaluationRequest['metrics']): string {
  return buildBasePrompt(city1, city2, metrics);
}

// Parse LLM response to extract scores
// Supports both A/B/C/D/E letter grades (preferred) and legacy numeric scores
function parseResponse(content: string, provider: LLMProvider): MetricScore[] {
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
    const hasCategories = parsed.evaluations?.some(e => e.city1Category && e.city2Category);
    const hasLetters = parsed.evaluations?.some(e => e.city1Legal || e.city2Legal);
    const hasNumbers = parsed.evaluations?.some(e => typeof e.city1LegalScore === 'number');
    console.log(`[PARSE] ${provider} format: categories=${hasCategories}, letters=${hasLetters}, numbers=${hasNumbers}`);
    console.log(`[PARSE] ${provider} returned ${parsed.evaluations?.length || 0} evaluations`);

    // Helper: Convert letter grade to score, or clamp numeric score
    // FIX 2026-01-21: Handle string numbers (e.g., "75" instead of 75) safely
    // FIX 2026-01-25: Return null instead of 50 for missing/invalid data - prevents artificial convergence
    const getScore = (letter: string | undefined, numeric: number | string | undefined): number | null => {
      // Prefer letter grade if present (legacy support)
      if (letter && typeof letter === 'string' && /^[A-Ea-e]$/.test(letter.trim())) {
        return letterToScore(letter);
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

// Tavily API helpers - Optimized per Tavily recommendations (2026-01-18)
interface TavilyResult { title: string; url: string; content: string }
interface TavilyResponse { results: TavilyResult[]; answer?: string; creditsUsed?: number }
interface TavilyResearchResponse { report: string; sources: { title: string; url: string }[] }

// Tavily API headers - Updated 2026-01-21 to use Bearer auth per official docs
// Docs: https://docs.tavily.com/documentation/api-reference/endpoint/search
const getTavilyHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'X-Project-ID': 'lifescore-freedom-app'  // Project tracking for usage analytics
});

// Tavily Research API - Comprehensive baseline report for city comparison
// FIX: Added retry logic (1 retry with 2s backoff) for transient failures
async function tavilyResearch(city1: string, city2: string): Promise<TavilyResearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  const MAX_RETRIES = 2;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[TAVILY RESEARCH] Attempt ${attempt}/${MAX_RETRIES} for ${city1} vs ${city2}`);
      const response = await fetchWithTimeout(
        'https://api.tavily.com/research',
        {
          method: 'POST',
          headers: getTavilyHeaders(apiKey),
          body: JSON.stringify({
            // api_key removed - now using Bearer auth in header per Tavily docs
            input: `Compare freedom laws and enforcement between ${city1} and ${city2} across: personal freedom (drugs, gambling, abortion, LGBTQ rights), property rights (zoning, HOA, land use), business regulations (licensing, taxes, employment), transportation laws, policing and legal system, and speech/lifestyle freedoms. Focus on 2024-2025 current laws.`,
            model: 'mini',              // Cost-effective: 4-110 credits vs pro's 15-250
            citation_format: 'numbered'
          })
        },
        TAVILY_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error(`[TAVILY RESEARCH] Attempt ${attempt} error ${response.status}: ${errorText.slice(0, 500)}`);
        // Don't retry on 4xx
        if (response.status >= 400 && response.status < 500) return null;
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        return null;
      }
      const data = await response.json();
      console.log(`[TAVILY RESEARCH] Success on attempt ${attempt} - report length: ${data.report?.length || 0}, sources: ${data.sources?.length || 0}`);
      return { report: data.report || '', sources: data.sources || [] };
    } catch (error) {
      console.error(`[TAVILY RESEARCH] Attempt ${attempt} exception:`, error instanceof Error ? error.message : error);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      return null;
    }
  }
  return null;
}

// Cached wrapper for tavilyResearch - checks in-memory cache first
// Original tavilyResearch() function above remains UNCHANGED
async function getCachedTavilyResearch(city1: string, city2: string): Promise<TavilyResearchResponse | null> {
  // Normalize cache key (alphabetical order for consistent hits)
  const [a, b] = [city1.toLowerCase(), city2.toLowerCase()].sort();
  const cacheKey = `${a}:${b}`;

  // Check cache
  const cached = tavilyResearchCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < RESEARCH_CACHE_TTL_MS) {
    tavilyStats.researchCacheHits++;
    console.log(`[TAVILY RESEARCH CACHE HIT] ${city1} vs ${city2} (key: ${cacheKey})`);
    return cached.data;
  }

  // Cache miss - call original function
  tavilyStats.researchCacheMisses++;
  console.log(`[TAVILY RESEARCH CACHE MISS] ${city1} vs ${city2} - fetching...`);

  const result = await tavilyResearch(city1, city2);

  // Store in cache if successful
  if (result) {
    pruneResearchCache();
    tavilyResearchCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    console.log(`[TAVILY RESEARCH CACHED] ${city1} vs ${city2} (expires in 30 min, cache size: ${tavilyResearchCache.size})`);
  }

  return result;
}

// Tavily Search API - Category-level focused queries
async function tavilySearch(query: string, maxResults: number = 5): Promise<TavilyResponse> {
  tavilyStats.searchCalls++; // Track search calls for stats
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [] };

  try {
    const response = await fetchWithTimeout(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: getTavilyHeaders(apiKey),
        body: JSON.stringify({
          // api_key removed - now using Bearer auth in header per Tavily docs
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: 'advanced',     // Advanced LLM-generated answer for better synthesis
          include_raw_content: false,     // Keep false, use chunks instead
          chunks_per_source: 3,           // Pre-chunked relevant snippets
          topic: 'general',
          start_date: '2024-01-01',       // Fixed start for historical context
          end_date: new Date().toISOString().split('T')[0],  // Dynamic: always current date
          exclude_domains: [              // Block low-quality/opinion-based sources
            'pinterest.com',
            'facebook.com',
            'twitter.com',
            'instagram.com',
            'tiktok.com',
            'reddit.com',
            'quora.com',
            'yelp.com',
            'tripadvisor.com'
          ],
          // country removed - was causing 400 errors for international cities
          // Tavily will search globally without this parameter
          include_usage: true             // Track credit consumption
        })
      },
      TAVILY_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error(`[TAVILY SEARCH] Error ${response.status} for query "${query.slice(0, 50)}...": ${errorText.slice(0, 500)}`);
      return { results: [] };
    }
    const data = await response.json();
    const creditsUsed = data.usage?.total_tokens || 0;
    console.log(`[TAVILY SEARCH] Success - results: ${data.results?.length || 0}, credits used: ${creditsUsed}`);
    return { results: data.results || [], answer: data.answer, creditsUsed };
  } catch (error) {
    console.error(`[TAVILY SEARCH] Exception for query "${query.slice(0, 50)}...":`, error instanceof Error ? error.message : error);
    return { results: [] };
  }
}

// Claude Sonnet 4.5 evaluation (with optional Tavily web search)
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

    const result1 = await evaluateWithClaude(city1, city2, batch1);
    const result2 = await evaluateWithClaude(city1, city2, batch2);

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
      usage: { tokens: combinedUsage },
      error: !combinedSuccess ? `Batch errors: ${result1.error || ''} ${result2.error || ''}`.trim() : undefined
    };
  }

  // Fetch Tavily context: Research baseline + Category searches (in parallel)
  let tavilyContext = '';
  if (process.env.TAVILY_API_KEY) {
    // Step 1: Research API for comprehensive baseline (runs in parallel with searches)
    const searchQueries = [
      // personal_freedom (15 metrics)
      `${city1} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`,
      `${city2} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`,
      // housing_property (20 metrics)
      `${city1} property rights zoning HOA land use housing regulations 2025`,
      `${city2} property rights zoning HOA land use housing regulations 2025`,
      // business_work (25 metrics)
      `${city1} business regulations taxes licensing employment labor laws 2025`,
      `${city2} business regulations taxes licensing employment labor laws 2025`,
      // transportation (15 metrics)
      `${city1} transportation vehicle regulations transit parking driving laws 2025`,
      `${city2} transportation vehicle regulations transit parking driving laws 2025`,
      // policing_legal (15 metrics)
      `${city1} criminal justice police enforcement legal rights civil liberties 2025`,
      `${city2} criminal justice police enforcement legal rights civil liberties 2025`,
      // speech_lifestyle (10 metrics)
      `${city1} freedom speech expression privacy lifestyle regulations 2025`,
      `${city2} freedom speech expression privacy lifestyle regulations 2025`,
    ];

    // Run Research + Search in parallel for speed
    const [researchResult, ...searchResults] = await Promise.all([
      getCachedTavilyResearch(city1, city2).catch(() => null),
      ...searchQueries.map(q => tavilySearch(q, 5).catch((): TavilyResponse => ({ results: [], answer: undefined })))
    ]);

    const allResults = searchResults.flatMap(r => r.results);
    const answers = searchResults.map(r => r.answer).filter(Boolean);

    // Build context: Research report first, then category searches
    let contextParts: string[] = [];

    if (researchResult?.report) {
      contextParts.push(`## TAVILY RESEARCH REPORT (Comprehensive Baseline)
${researchResult.report}

**Sources:** ${researchResult.sources.map((s, i) => `[${i + 1}] ${s.title}`).join(', ')}
`);
    }

    if (allResults.length > 0) {
      contextParts.push(`## CATEGORY-SPECIFIC SEARCH RESULTS
${answers.length > 0 ? `**Category Summaries:** ${answers.join(' | ')}\n\n` : ''}
${allResults.map(r => `- **${r.title}** (${r.url}): ${r.content}`).join('\n')}
`);
    }

    if (contextParts.length > 0) {
      tavilyContext = contextParts.join('\n') + '\nUse this research and search data to inform your evaluation.\n';
    }
  }

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

      const response = await fetchWithTimeout(
        'https://api.anthropic.com/v1/messages',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 16384,
            messages: [{ role: 'user', content: prompt }]
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `API error: ${response.status} - ${errorText}`;
        console.error(`[CLAUDE] Attempt ${attempt} failed: ${lastError}`);
        // Don't retry on 4xx errors (client errors), only on 5xx (server errors)
        if (response.status >= 400 && response.status < 500) {
          return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError };
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[CLAUDE] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const data = await response.json();
      // FIX #8: Defensive parsing - handle missing/malformed response
      const content = data?.content?.[0]?.text;
      if (!content) {
        lastError = 'Empty or malformed response from Claude';
        console.error(`[CLAUDE] Attempt ${attempt}: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

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

      // Extract token usage from Claude response
      const usage: TokenUsage = {
        inputTokens: data?.usage?.input_tokens || 0,
        outputTokens: data?.usage?.output_tokens || 0
      };

      console.log(`[CLAUDE] Success on attempt ${attempt}: ${scores.length} scores returned`);
      return {
        provider: 'claude-sonnet',
        success: true,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      };

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
  return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` };
}

// GPT-4o evaluation (with Tavily web search - same pattern as Claude Sonnet)
async function evaluateWithGPT4o(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { provider: 'gpt-4o', success: false, scores: [], latencyMs: 0, error: 'OPENAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // Fetch Tavily context: Research baseline + Category searches (in parallel)
  let tavilyContext = '';
  if (process.env.TAVILY_API_KEY) {
    const searchQueries = [
      // personal_freedom (15 metrics)
      `${city1} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`,
      `${city2} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`,
      // housing_property (20 metrics)
      `${city1} property rights zoning HOA land use housing regulations 2025`,
      `${city2} property rights zoning HOA land use housing regulations 2025`,
      // business_work (25 metrics)
      `${city1} business regulations taxes licensing employment labor laws 2025`,
      `${city2} business regulations taxes licensing employment labor laws 2025`,
      // transportation (15 metrics)
      `${city1} transportation vehicle regulations transit parking driving laws 2025`,
      `${city2} transportation vehicle regulations transit parking driving laws 2025`,
      // policing_legal (15 metrics)
      `${city1} criminal justice police enforcement legal rights civil liberties 2025`,
      `${city2} criminal justice police enforcement legal rights civil liberties 2025`,
      // speech_lifestyle (10 metrics)
      `${city1} freedom speech expression privacy lifestyle regulations 2025`,
      `${city2} freedom speech expression privacy lifestyle regulations 2025`,
    ];

    // Run Research + Search in parallel for speed
    const [researchResult, ...searchResults] = await Promise.all([
      getCachedTavilyResearch(city1, city2).catch(() => null),
      ...searchQueries.map(q => tavilySearch(q, 5).catch((): TavilyResponse => ({ results: [], creditsUsed: 0 })))
    ]);

    // Track total Tavily credits used for GPT-4o
    var gpt4oTavilyCredits = searchResults.reduce((sum, r) => sum + (r.creditsUsed || 0), 0);
    console.log(`[GPT-4o] Total Tavily credits used: ${gpt4oTavilyCredits}`);

    const allResults = searchResults.flatMap(r => r.results);
    const answers = searchResults.map(r => r.answer).filter(Boolean);

    // Build context: Research report first, then category searches
    let contextParts: string[] = [];

    if (researchResult?.report) {
      contextParts.push(`## TAVILY RESEARCH REPORT (Comprehensive Baseline)
${researchResult.report}

**Sources:** ${researchResult.sources.map((s, i) => `[${i + 1}] ${s.title}`).join(', ')}
`);
    }

    if (allResults.length > 0) {
      contextParts.push(`## CATEGORY-SPECIFIC SEARCH RESULTS
${answers.length > 0 ? `**Category Summaries:** ${answers.join(' | ')}\n\n` : ''}
${allResults.map(r => `- **${r.title}** (${r.url}): ${r.content}`).join('\n')}
`);
    }

    if (contextParts.length > 0) {
      tavilyContext = contextParts.join('\n') + '\nUse this research and search data to inform your evaluation.\n';
    }
  } else {
    var gpt4oTavilyCredits = 0;
  }

  // GPT-4o SPECIFIC ADDENDUM
  // UPDATED 2026-01-21: Removed duplicate scale (now in buildBasePrompt)
  const gptAddendum = `
## GPT-4o SPECIFIC INSTRUCTIONS
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
      console.log(`[GPT-4o] Attempt ${attempt}/${MAX_RETRIES} for ${city1} vs ${city2}`);

      // GPT-4o uses standard chat completions API
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              // UPDATED 2026-01-21: Removed duplicate scale (canonical scale is in buildBasePrompt)
              { role: 'system', content: `You are an expert legal analyst comparing two cities on freedom metrics.
Use the Tavily research data provided in the user message to evaluate laws and regulations.

## IMPORTANT
- Follow the scoring scale in the user message (0-100 with 5 anchor bands)
- Use numeric scores 0-100 (integers only)
- For each metric, provide TWO scores: Legal Score and Enforcement Score
- Use the Tavily research data as your primary source
- If the research doesn't cover a metric, use your knowledge but set confidence="low"
- Return JSON exactly matching the format requested
- You MUST evaluate ALL metrics provided` },
              { role: 'user', content: prompt }
            ],
            max_tokens: 16384,
            temperature: 0.3
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `API error: ${response.status} - ${errorText}`;
        console.error(`[GPT-4o] Attempt ${attempt} failed: ${lastError}`);
        // Don't retry on 4xx errors (client errors), only on 5xx (server errors)
        if (response.status >= 400 && response.status < 500) {
          return { provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError };
        }
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[GPT-4o] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const data = await response.json();
      // FIX #8: Defensive parsing - handle missing/malformed response
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        lastError = 'Empty or malformed response from GPT-4o';
        console.error(`[GPT-4o] Attempt ${attempt}: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const scores = parseResponse(content, 'gpt-4o');

      if (scores.length === 0) {
        lastError = 'Invalid JSON or no evaluations parsed from GPT-4o response';
        console.error(`[GPT-4o] Attempt ${attempt}: ${lastError}. Content preview: ${content.substring(0, 200)}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      // Extract token usage from OpenAI response
      const usage: TokenUsage = {
        inputTokens: data?.usage?.prompt_tokens || 0,
        outputTokens: data?.usage?.completion_tokens || 0
      };

      console.log(`[GPT-4o] Success on attempt ${attempt}: ${scores.length} scores returned`);
      return {
        provider: 'gpt-4o',
        success: true,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
      console.error(`[GPT-4o] Attempt ${attempt} exception: ${lastError}`);

      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[GPT-4o] Retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All retries exhausted
  console.error(`[GPT-4o] All ${MAX_RETRIES} attempts failed. Last error: ${lastError}`);
  return { provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` };
}

// Gemini 3 Pro evaluation (with Google Search grounding)
async function evaluateWithGemini(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: 0, error: 'GEMINI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // FIX: Batch split for large categories (Housing = 20, Policing = 15) to prevent timeouts
  const BATCH_THRESHOLD = 15;
  if (metrics.length > BATCH_THRESHOLD) {
    console.log(`[GEMINI] Large category (${metrics.length} metrics), splitting into batches`);
    const midpoint = Math.ceil(metrics.length / 2);
    const batch1 = metrics.slice(0, midpoint);
    const batch2 = metrics.slice(midpoint);
    console.log(`[GEMINI] Batch 1: ${batch1.length} metrics, Batch 2: ${batch2.length} metrics`);

    const result1 = await evaluateWithGemini(city1, city2, batch1);
    const result2 = await evaluateWithGemini(city1, city2, batch2);

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

      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction,
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 16384, temperature: 0.2 },  // UPDATED 2026-02-03: Lowered from 0.3 for stricter factual adherence
            // Safety settings - allow freedom-related content
            safetySettings: [
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }
            ],
            // Enable Google Search grounding for real-time web data
            tools: [{
              google_search: {}
            }]
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `API error: ${response.status} - ${errorText}`;
        console.error(`[GEMINI] Attempt ${attempt} failed: ${lastError}`);
        // Don't retry on 4xx errors (client errors), only on 5xx (server errors)
        if (response.status >= 400 && response.status < 500) {
          return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError };
        }
        // Exponential backoff before retry: 1s, 2s, 4s
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[GEMINI] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const data = await response.json();
      // FIX #8: Defensive parsing - handle missing/malformed response
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        lastError = 'Empty or malformed response from Gemini';
        console.error(`[GEMINI] Attempt ${attempt}: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

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
        inputTokens: data?.usageMetadata?.promptTokenCount || 0,
        outputTokens: data?.usageMetadata?.candidatesTokenCount || 0
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

// Grok 4 evaluation (with native X/Twitter search)
async function evaluateWithGrok(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { provider: 'grok-4', success: false, scores: [], latencyMs: 0, error: 'XAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // GROK-SPECIFIC ADDENDUM (optimized per Grok's own recommendations 2026-01-21)
  // UPDATED 2026-01-21: Removed duplicate scale (now in buildBasePrompt)
  const currentYear = new Date().getFullYear();
  const grokAddendum = `
## GROK-SPECIFIC CLASSIFICATION RULES

### REAL-TIME DATA STRATEGY
- Use your native X/Twitter search to bridge "legal theory" vs "enforcement reality"
- Query pattern: "${city1} OR ${city2} [metric keywords] enforcement experience since:2025-01-01"
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

      const response = await fetchWithTimeout(
        'https://api.x.ai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'grok-4',
            messages: [
              {
                role: 'system',
                // UPDATED 2026-01-21: Removed duplicate scale (canonical scale is in buildBasePrompt)
                content: `You are an expert legal analyst classifying freedom metrics. Use real-time web search for verification.

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
- Sources must be from last 12 months for high confidence`
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 16384,
            temperature: 0.2,  // Grok recommendation: 0.2-0.4 for deterministic classification
            search: true
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `API error: ${response.status} - ${errorText}`;
        console.error(`[GROK] Attempt ${attempt} failed: ${lastError}`);
        // Don't retry on 4xx errors (client errors), only on 5xx (server errors)
        if (response.status >= 400 && response.status < 500) {
          return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: lastError };
        }
        // Exponential backoff before retry: 1s, 2s, 4s
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`[GROK] Retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        lastError = 'Empty or malformed response from Grok';
        console.error(`[GROK] Attempt ${attempt}: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
        continue;
      }

      // JSON validation: try to parse before accepting
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

      // Extract token usage from Grok response (same format as OpenAI)
      const usage: TokenUsage = {
        inputTokens: data?.usage?.prompt_tokens || 0,
        outputTokens: data?.usage?.completion_tokens || 0
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
      usage: { tokens: combinedUsage },
      error: !combinedSuccess ? `Batch errors: ${result1.error || ''} ${result2.error || ''}`.trim() : undefined
    };
  }

  // Fetch Tavily context: Research baseline + Category searches (in parallel)
  // This pre-fetches data so Perplexity doesn't have to do ALL web searches itself
  let tavilyContext = '';
  if (process.env.TAVILY_API_KEY) {
    const searchQueries = [
      // personal_freedom (15 metrics)
      `${city1} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`,
      `${city2} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`,
      // housing_property (20 metrics)
      `${city1} property rights zoning HOA land use housing regulations 2025`,
      `${city2} property rights zoning HOA land use housing regulations 2025`,
      // business_work (25 metrics)
      `${city1} business regulations taxes licensing employment labor laws 2025`,
      `${city2} business regulations taxes licensing employment labor laws 2025`,
      // transportation (15 metrics)
      `${city1} transportation vehicle regulations transit parking driving laws 2025`,
      `${city2} transportation vehicle regulations transit parking driving laws 2025`,
      // policing_legal (15 metrics)
      `${city1} criminal justice police enforcement legal rights civil liberties 2025`,
      `${city2} criminal justice police enforcement legal rights civil liberties 2025`,
      // speech_lifestyle (10 metrics)
      `${city1} freedom speech expression privacy lifestyle regulations 2025`,
      `${city2} freedom speech expression privacy lifestyle regulations 2025`,
    ];

    // Run Research + Search in parallel for speed
    const [researchResult, ...searchResults] = await Promise.all([
      getCachedTavilyResearch(city1, city2).catch(() => null),
      ...searchQueries.map(q => tavilySearch(q, 5).catch((): TavilyResponse => ({ results: [], answer: undefined })))
    ]);

    const allResults = searchResults.flatMap(r => r.results);
    const answers = searchResults.map(r => r.answer).filter(Boolean);

    // Build context: Research report first, then category searches
    const contextParts: string[] = [];

    if (researchResult?.report) {
      contextParts.push(`## TAVILY RESEARCH REPORT (Comprehensive Baseline)
${researchResult.report}

**Sources:** ${researchResult.sources.map((s, i) => `[${i + 1}] ${s.title}`).join(', ')}
`);
    }

    if (allResults.length > 0) {
      contextParts.push(`## CATEGORY-SPECIFIC SEARCH RESULTS
${answers.length > 0 ? `**Category Summaries:** ${answers.join(' | ')}\n\n` : ''}
${allResults.map(r => `- **${r.title}** (${r.url}): ${r.content}`).join('\n')}
`);
    }

    if (contextParts.length > 0) {
      tavilyContext = contextParts.join('\n') + '\nUse this Tavily research data to supplement your Sonar web search.\n';
    }
  }

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

      const response = await fetchWithTimeout(
        'https://api.perplexity.ai/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'sonar-reasoning-pro',
            messages: [
              {
                role: 'system',
                content: `You are an expert legal analyst evaluating freedom metrics. Use your web search to find current laws.

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

You MUST evaluate ALL metrics provided. Return ONLY the JSON object.`
              },
              { role: 'user', content: prompt }
            ],
            // FIX: Increased from 16384 to 32768 — sonar-reasoning-pro <think> tokens
            // consume part of max_tokens budget, causing JSON output truncation
            max_tokens: 32768,
            temperature: 0.3,
            return_citations: true,
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        // Don't retry 4xx errors (bad request, auth issues)
        if (response.status >= 400 && response.status < 500) {
          return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
        }
        // Retry 5xx errors with backoff
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[PERPLEXITY] ${response.status} error, retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error after ${MAX_RETRIES} retries: ${response.status} - ${errorText}` };
      }

      const data = await response.json();

      // Perplexity uses OpenAI-compatible format: choices[0].message.content
      let rawText = '';

      // Primary format: OpenAI-compatible choices array
      if (data.choices?.[0]?.message?.content) {
        rawText = data.choices[0].message.content;
      }

      // Fallback: output array format
      if (!rawText && data.output?.length) {
        const last = data.output[data.output.length - 1];
        const contentArr = last?.content ?? [];
        const textPart = contentArr.find((c: any) => c.type === 'text' || c.type === 'output_text');
        rawText = textPart?.text ?? '';
      }

      // Fallback: Direct content/text fields
      if (!rawText && typeof data.content === 'string') rawText = data.content;
      if (!rawText && typeof data.text === 'string') rawText = data.text;

      if (!rawText) {
        console.error('[PERPLEXITY] No content found. Keys:', Object.keys(data));
        console.error('[PERPLEXITY] Full response:', JSON.stringify(data).slice(0, 1000));
        if (attempt < MAX_RETRIES) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[PERPLEXITY] Empty response, retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue;
        }
        return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Empty response from Perplexity after retries' };
      }

      // Strip <think>...</think> blocks from reasoning models
      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      // Check for JSON in code blocks first
      const codeMatch = rawText.match(/```json([\s\S]*?)```/i) ?? rawText.match(/```([\s\S]*?)```/);
      let candidate = codeMatch ? codeMatch[1].trim() : rawText;

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
        return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'No JSON object found in Perplexity output after retries' };
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

      // Extract token usage from Perplexity response (same format as OpenAI)
      const usage: TokenUsage = {
        inputTokens: data?.usage?.prompt_tokens || 0,
        outputTokens: data?.usage?.completion_tokens || 0
      };

      return {
        provider: 'perplexity',
        success: scores.length > 0,
        scores,
        latencyMs: Date.now() - startTime,
        usage: { tokens: usage }
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error');
      if (attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[PERPLEXITY] Exception on attempt ${attempt}: ${errorMsg}, retrying in ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue;
      }
      return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg };
    }
  }

  // Should never reach here, but TypeScript safety
  return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Unexpected end of retry loop' };
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

  try {
    const { provider, city1, city2, metrics } = req.body as EvaluationRequest;

    console.log(`[EVALUATE] Starting ${provider} evaluation for ${city1} vs ${city2}, ${metrics?.length || 0} metrics`);
    console.log(`[EVALUATE] USE_CATEGORY_SCORING=${USE_CATEGORY_SCORING}`);

    if (!provider || !city1 || !city2 || !metrics) {
      console.error('[EVALUATE] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: provider, city1, city2, metrics' });
    }

    let result: EvaluationResponse;

    switch (provider) {
      case 'claude-sonnet':
        console.log('[EVALUATE] Calling Claude Sonnet...');
        result = await evaluateWithClaude(city1, city2, metrics);
        break;
      case 'gpt-4o':
        console.log('[EVALUATE] Calling GPT-4o...');
        result = await evaluateWithGPT4o(city1, city2, metrics);
        break;
      case 'gemini-3-pro':
        console.log('[EVALUATE] Calling Gemini 3 Pro...');
        result = await evaluateWithGemini(city1, city2, metrics);
        break;
      case 'grok-4':
        console.log('[EVALUATE] Calling Grok 4...');
        result = await evaluateWithGrok(city1, city2, metrics);
        break;
      case 'perplexity':
        console.log('[EVALUATE] Calling Perplexity...');
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

    // Log Tavily usage stats for this evaluation
    tavilyStats.log(`${provider} - ${city1} vs ${city2}`);

    // Surface warnings for partial failures
    const warnings: string[] = result.warnings || [];
    if (result.success && result.scores.length < metrics.length) {
      warnings.push(`Only ${result.scores.length} of ${metrics.length} metrics were scored`);
    }
    if (tavilyStats.researchCacheMisses > 0 && tavilyStats.researchCacheHits === 0 && !result.usage?.tavily) {
      warnings.push('Web research data was unavailable — scores may be less accurate');
    }
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
