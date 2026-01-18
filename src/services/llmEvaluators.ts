/**
 * LIFE SCORE™ Real LLM Evaluators
 * Individual evaluator functions for each LLM with web search capabilities
 */

import type { LLMProvider, LLMAPIKeys, LLMMetricScore } from '../types/enhancedComparison';
import type { MetricDefinition, CategoryId } from '../types/metrics';
import { CATEGORIES, getMetricsByCategory } from '../data/metrics';
import { withRetry, isCircuitOpen, recordSuccess, recordFailure } from './rateLimiter';

// ============================================================================
// TIMEOUT CONSTANTS
// ============================================================================
const LLM_TIMEOUT_MS = 180000; // 180 seconds for ALL LLM API calls
const CLIENT_TIMEOUT_MS = 240000; // 240 seconds for client-side fetch (must exceed server)

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
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface EvaluatorResult {
  provider: LLMProvider;
  success: boolean;
  scores: LLMMetricScore[];
  error?: string;
  latencyMs: number;
}

export interface LLMEvaluation {
  metricId: string;
  city1LegalScore: number;
  city1EnforcementScore: number;
  city2LegalScore: number;
  city2EnforcementScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  sources?: string[];
  city1Evidence?: Array<{ title: string; url: string; snippet: string }>;
  city2Evidence?: Array<{ title: string; url: string; snippet: string }>;
}

// API response score format (from /api/evaluate)
interface APIMetricScore {
  metricId: string;
  city1LegalScore: number;
  city1EnforcementScore: number;
  city2LegalScore: number;
  city2EnforcementScore: number;
  confidence: string;
  reasoning?: string;
  sources?: string[];
  // FIX: Include evidence fields from GPT-4o web search
  city1Evidence?: Array<{ title: string; url: string; snippet: string }>;
  city2Evidence?: Array<{ title: string; url: string; snippet: string }>;
}

// ============================================================================
// EVALUATION PROMPT - SHARED ACROSS ALL LLMS
// ============================================================================

// Authoritative data sources that LLMs should prioritize
const AUTHORITATIVE_SOURCES = [
  'Freedom House (freedomhouse.org) - Political rights, civil liberties',
  'CATO Human Freedom Index (cato.org) - Personal & economic freedom rankings',
  'World Bank Open Data (data.worldbank.org) - Business regulations, ease of doing business',
  'Transparency International (transparency.org) - Corruption Perception Index',
  'Reporters Without Borders (rsf.org) - Press Freedom Index',
  'Numbeo (numbeo.com) - Cost of living, crime rates, quality of life',
  'OECD Data (data.oecd.org) - Employment, education, health statistics',
  'Official government websites - State/local laws, municipal codes'
];

export function buildEvaluationPrompt(
  city1: string,
  city2: string,
  metrics: MetricDefinition[],
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
- 90-100: Extremely permissive, minimal restrictions
- 70-89: Generally permissive with some limitations
- 50-69: Moderate restrictions
- 30-49: Significant restrictions
- 0-29: Highly restrictive or prohibited

## IMPORTANT
- Be specific about laws and regulations
- Note differences between federal/national and local laws
- Consider recent changes (last 2 years)
- If uncertain, set confidence to "low" but still provide best estimate
- Enforcement score may differ significantly from legal score (e.g., law exists but rarely enforced)

Return ONLY the JSON object, no other text.`;
}

// ============================================================================
// TAVILY API HELPERS - Optimized per Tavily recommendations (2026-01-18)
// ============================================================================

interface TavilyResult { title: string; url: string; content: string }
interface TavilyResponse { results: TavilyResult[]; answer?: string }
interface TavilyResearchResponse { report: string; sources: { title: string; url: string }[] }

const TAVILY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Project-ID': 'lifescore-freedom-app'  // Project tracking for usage analytics
};

// Tavily Research API - Comprehensive baseline report for city comparison
export async function tavilyResearch(
  apiKey: string,
  city1: string,
  city2: string
): Promise<TavilyResearchResponse | null> {
  try {
    const response = await fetchWithTimeout(
      'https://api.tavily.com/research',
      {
        method: 'POST',
        headers: TAVILY_HEADERS,
        body: JSON.stringify({
          api_key: apiKey,
          input: `Compare freedom laws and enforcement between ${city1} and ${city2} across: personal freedom (drugs, gambling, abortion, LGBTQ rights), property rights (zoning, HOA, land use), business regulations (licensing, taxes, employment), transportation laws, policing and legal system, and speech/lifestyle freedoms. Focus on 2024-2025 current laws.`,
          model: 'mini',              // Cost-effective: 4-110 credits vs pro's 15-250
          citation_format: 'numbered'
        })
      },
      LLM_TIMEOUT_MS
    );

    if (!response.ok) return null;
    const data = await response.json();
    return { report: data.report || '', sources: data.sources || [] };
  } catch {
    return null;
  }
}

// Tavily Search API - Category-level focused queries
export async function tavilySearch(
  apiKey: string,
  query: string,
  maxResults: number = 5
): Promise<TavilyResponse> {
  const response = await fetchWithTimeout(
    'https://api.tavily.com/search',
    {
      method: 'POST',
      headers: TAVILY_HEADERS,
      body: JSON.stringify({
        api_key: apiKey,
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
        country: 'US',                  // Boost US results
        include_usage: true             // Track credit consumption
      })
    },
    LLM_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  const data = await response.json();
  return { results: data.results || [], answer: data.answer };
}

// ============================================================================
// ANTHROPIC CLAUDE EVALUATOR (with Tavily search)
// ============================================================================

export async function evaluateWithClaude(
  apiKey: string,
  tavilyKey: string | undefined,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'claude-sonnet';

  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      provider,
      success: false,
      scores: [],
      error: 'Circuit breaker open - too many recent failures',
      latencyMs: Date.now() - startTime
    };
  }

  try {
    let searchContext = '';

    // If Tavily key available, perform Research + category-level searches (in parallel)
    if (tavilyKey) {
      const searchQueries = [
        // personal_freedom (15 metrics)
        `${city1} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025 2026`,
        `${city2} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025 2026`,
        // housing_property (20 metrics)
        `${city1} property rights zoning HOA land use housing regulations 2025`,
        `${city2} property rights zoning HOA land use housing regulations 2025`,
        // business_work (25 metrics)
        `${city1} business regulations taxes licensing employment labor laws 2025 2026`,
        `${city2} business regulations taxes licensing employment labor laws 2025 2026`,
        // transportation (15 metrics)
        `${city1} transportation vehicle regulations transit parking driving laws 2025 2026`,
        `${city2} transportation vehicle regulations transit parking driving laws 2025 2026`,
        // policing_legal (15 metrics)
        `${city1} criminal justice police enforcement legal rights civil liberties 2025`,
        `${city2} criminal justice police enforcement legal rights civil liberties 2025`,
        // speech_lifestyle (10 metrics)
        `${city1} freedom speech expression privacy lifestyle regulations 2025`,
        `${city2} freedom speech expression privacy lifestyle regulations 2025`,
      ];

      // Run Research + Search in parallel for speed
      const [researchResult, ...searchResults] = await Promise.all([
        tavilyResearch(tavilyKey, city1, city2).catch(() => null),
        ...searchQueries.map(q => tavilySearch(tavilyKey, q, 5).catch(() => ({ results: [] })))
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
        searchContext = contextParts.join('\n') + '\nUse this research and search data to inform your evaluation.\n\n---\n\n';
      }
    }

    const prompt = searchContext + buildEvaluationPrompt(city1, city2, metrics, false);

    // Use retry logic for API call
    const content = await withRetry(provider, async () => {
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
        throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error('Anthropic returned empty or malformed response');
      }
      return data.content[0].text;
    });

    const scores = parseEvaluationResponse(content, provider);
    recordSuccess(provider);

    return {
      provider,
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    recordFailure(provider);
    return {
      provider,
      success: false,
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// OPENAI GPT-4o EVALUATOR (with built-in web search via responses API)
// ============================================================================

export async function evaluateWithGPT4o(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'gpt-4o';

  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      provider,
      success: false,
      scores: [],
      error: 'Circuit breaker open - too many recent failures',
      latencyMs: Date.now() - startTime
    };
  }

  // Build system prompt for GPT-4o with full scoring context
  const systemPrompt = `You are an expert legal analyst comparing two cities on freedom metrics.
Use the built-in web_search tool to find current, accurate data about laws and regulations.

## SCORING SCALE (0-100)
- 90-100: Extremely permissive, minimal restrictions (most free)
- 70-89: Generally permissive with some limitations
- 50-69: Moderate restrictions
- 30-49: Significant restrictions
- 0-29: Highly restrictive or prohibited (least free)

## DUAL SCORING SYSTEM
For each metric, provide TWO scores:
1. **Legal Score**: What does the law technically say? Higher = more permissive law
2. **Enforcement Score**: How is the law actually enforced? Higher = more lenient enforcement

## IMPORTANT
- Cite every claim with actual URLs
- Note differences between federal/state/local laws
- If evidence is missing, set confidence="low" and explain why
- Return JSON exactly matching the schema provided`;

  // Build user payload (JSON format for GPT-4o)
  // Field names must match output schema expectations (camelCase, city1/city2)
  const userPayload = {
    categoryId: metrics[0]?.categoryId || 'general',
    categoryName: 'Freedom Metrics Evaluation',
    city1: city1,
    city2: city2,
    metrics: metrics.map(m => ({
      metricId: m.id,
      metricName: m.name,
      description: m.description,
      scoringDirection: m.scoringDirection === 'higher_is_better' ? 'Higher score = more freedom' : 'Lower score = more freedom'
    })),
    currentDate: new Date().toISOString()
  };

  // JSON Schema for structured output (using our 0-100 scoring)
  // Note: additionalProperties: false is required for strict mode
  const outputSchema = {
    type: "json_schema",
    name: "freedom_evaluation",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        evaluations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              metricId: { type: "string" },
              city1LegalScore: { type: "number" },
              city1EnforcementScore: { type: "number" },
              city2LegalScore: { type: "number" },
              city2EnforcementScore: { type: "number" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              reasoning: { type: "string" },
              city1Evidence: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    snippet: { type: "string" }
                  },
                  required: ["title", "url", "snippet"]
                }
              },
              city2Evidence: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    snippet: { type: "string" }
                  },
                  required: ["title", "url", "snippet"]
                }
              }
            },
            required: ["metricId", "city1LegalScore", "city1EnforcementScore", "city2LegalScore", "city2EnforcementScore", "confidence", "reasoning"]
          }
        }
      },
      required: ["evaluations"]
    }
  };

  try {
    // GPT-4o uses the responses API with built-in web search (with retry logic)
    const content = await withRetry(provider, async () => {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/responses',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            reasoning: { effort: 'medium' },
            tools: [{ type: 'web_search' }],
            tool_choice: 'auto',
            input: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: JSON.stringify(userPayload) }
            ],
            text: { format: outputSchema }
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      // GPT-4o responses API returns output_text instead of choices[0].message.content
      if (!data.output_text) {
        throw new Error('OpenAI returned empty or malformed response');
      }
      return data.output_text;
    });

    // Pass city names so evidence items can be properly tagged
    const scores = parseEvaluationResponse(content, provider, city1, city2);
    recordSuccess(provider);

    return {
      provider,
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    recordFailure(provider);
    return {
      provider,
      success: false,
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// GOOGLE GEMINI EVALUATOR (with grounding)
// ============================================================================

export async function evaluateWithGemini(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'gemini-3-pro';

  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      provider,
      success: false,
      scores: [],
      error: 'Circuit breaker open - too many recent failures',
      latencyMs: Date.now() - startTime
    };
  }

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    // System instruction for Gemini
    const systemInstruction = {
      parts: [{
        text: 'You are an expert legal analyst evaluating freedom metrics for city comparison. Use Google Search grounding to find current, accurate data about laws and regulations. Be factual and cite sources.'
      }]
    };

    const content = await withRetry(provider, async () => {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction,
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 16384,
              temperature: 0.3
            },
            // Safety settings - allow freedom-related content
            safetySettings: [
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }
            ],
            // Enable Google Search grounding
            tools: [{
              googleSearchRetrieval: {
                dynamicRetrievalConfig: {
                  mode: 'MODE_DYNAMIC',
                  dynamicThreshold: 0.3
                }
              }
            }]
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Null checks for Gemini response structure
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini returned no candidates (possibly blocked by safety filters)');
      }

      const candidate = data.candidates[0];
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Gemini response blocked by safety filters');
      }

      if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
        throw new Error('Gemini returned empty or malformed response');
      }

      return candidate.content.parts[0].text;
    });

    const scores = parseEvaluationResponse(content, provider);
    recordSuccess(provider);

    return {
      provider,
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    recordFailure(provider);
    return {
      provider,
      success: false,
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// XAI GROK EVALUATOR (with native web search)
// ============================================================================

export async function evaluateWithGrok(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'grok-4';

  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      provider,
      success: false,
      scores: [],
      error: 'Circuit breaker open - too many recent failures',
      latencyMs: Date.now() - startTime
    };
  }

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    const content = await withRetry(provider, async () => {
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
                content: 'You are an expert legal analyst evaluating freedom metrics. Use your real-time web search to find current laws and regulations.'
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 16384,
            temperature: 0.3,
            // Grok has native web search
            search: true
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grok API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Null checks for response structure
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Grok returned no choices');
      }
      if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Grok returned empty or malformed response');
      }

      return data.choices[0].message.content;
    });

    const scores = parseEvaluationResponse(content, provider);
    recordSuccess(provider);

    return {
      provider,
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    recordFailure(provider);
    return {
      provider,
      success: false,
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// PERPLEXITY EVALUATOR (native search)
// ============================================================================

export async function evaluateWithPerplexity(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'perplexity';

  // Check circuit breaker
  if (isCircuitOpen(provider)) {
    return {
      provider,
      success: false,
      scores: [],
      error: 'Circuit breaker open - too many recent failures',
      latencyMs: Date.now() - startTime
    };
  }

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    const { content, citations } = await withRetry(provider, async () => {
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
                content: 'You are an expert legal analyst evaluating freedom metrics. Use your web search capabilities to find current laws and regulations.'
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 16384,
            temperature: 0.3,
            // Perplexity has native search
            return_citations: true
          })
        },
        LLM_TIMEOUT_MS
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Null checks for response structure
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Perplexity returned no choices');
      }
      if (!data.choices[0].message || !data.choices[0].message.content) {
        throw new Error('Perplexity returned empty or malformed response');
      }

      // Extract citations from response (Perplexity returns these separately)
      const extractedCitations: string[] = data.citations || [];

      return {
        content: data.choices[0].message.content,
        citations: extractedCitations
      };
    });

    // Pass citations to parser so they can be attached to scores
    const scores = parseEvaluationResponse(content, provider, city1, city2, citations);
    recordSuccess(provider);

    return {
      provider,
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    recordFailure(provider);
    return {
      provider,
      success: false,
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: Date.now() - startTime
    };
  }
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

function parseEvaluationResponse(
  response: string,
  provider: LLMProvider,
  city1Name?: string,
  city2Name?: string,
  citations?: string[]
): LLMMetricScore[] {
  try {
    // Extract JSON from response (may have markdown code blocks)
    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON object
      const rawMatch = response.match(/\{[\s\S]*\}/);
      if (rawMatch) {
        jsonStr = rawMatch[0];
      }
    }

    const parsed = JSON.parse(jsonStr);
    const evaluations: LLMEvaluation[] = parsed.evaluations || [];
    const now = new Date().toISOString();

    // Helper: clamp score to 0-100 range and handle NaN
    const clampScore = (score: number | undefined): number => {
      if (score === undefined || score === null || isNaN(score)) {
        return 50; // Default to neutral score if missing
      }
      return Math.max(0, Math.min(100, Math.round(score)));
    };

    // Helper: safely calculate normalized score with NaN prevention
    const calculateNormalizedScore = (legal: number | undefined, enforcement: number | undefined): number => {
      const safeLegal = clampScore(legal);
      const safeEnforcement = clampScore(enforcement);
      return Math.round((safeLegal + safeEnforcement) / 2);
    };

    // Convert to LLMMetricScore format (one per city per metric)
    const scores: LLMMetricScore[] = [];

    evaluations.forEach((eval_: LLMEvaluation) => {
      // Validate required fields exist
      if (!eval_.metricId) {
        console.warn(`Skipping evaluation with missing metricId from ${provider}`);
        return;
      }

      // Convert GPT-4o evidence to EvidenceItem format for city1
      const city1Evidence = (eval_.city1Evidence || []).map(e => ({
        city: city1Name || 'city1',
        title: e.title,
        url: e.url,
        snippet: e.snippet,
        retrieved_at: now
      }));

      // Convert GPT-4o evidence to EvidenceItem format for city2
      const city2Evidence = (eval_.city2Evidence || []).map(e => ({
        city: city2Name || 'city2',
        title: e.title,
        url: e.url,
        snippet: e.snippet,
        retrieved_at: now
      }));

      // Build sources array, including Perplexity citations if provided
      let allSources = eval_.sources || [];
      if (citations && citations.length > 0 && provider === 'perplexity') {
        allSources = [...allSources, ...citations];
      }

      // City 1 scores with validation
      const city1Legal = clampScore(eval_.city1LegalScore);
      const city1Enforcement = clampScore(eval_.city1EnforcementScore);
      scores.push({
        metricId: eval_.metricId,
        rawValue: city1Legal,
        normalizedScore: calculateNormalizedScore(eval_.city1LegalScore, eval_.city1EnforcementScore),
        legalScore: city1Legal,
        enforcementScore: city1Enforcement,
        confidence: clampScore(eval_.confidence) / 100, // Normalize confidence to 0-1
        llmProvider: provider,
        explanation: eval_.reasoning || '',
        sources: allSources,
        evidence: city1Evidence.length > 0 ? city1Evidence : undefined,
        city: 'city1'
      });

      // City 2 scores with validation
      const city2Legal = clampScore(eval_.city2LegalScore);
      const city2Enforcement = clampScore(eval_.city2EnforcementScore);
      scores.push({
        metricId: eval_.metricId,
        rawValue: city2Legal,
        normalizedScore: calculateNormalizedScore(eval_.city2LegalScore, eval_.city2EnforcementScore),
        legalScore: city2Legal,
        enforcementScore: city2Enforcement,
        confidence: clampScore(eval_.confidence) / 100, // Normalize confidence to 0-1
        llmProvider: provider,
        explanation: eval_.reasoning || '',
        sources: allSources,
        evidence: city2Evidence.length > 0 ? city2Evidence : undefined,
        city: 'city2'
      });
    });

    return scores;
  } catch (error) {
    console.error(`Error parsing ${provider} response:`, error);
    console.error('Raw response:', response.slice(0, 500));
    return [];
  }
}

// ============================================================================
// RUN ALL EVALUATORS IN PARALLEL
// ============================================================================

export interface AllEvaluatorsResult {
  results: EvaluatorResult[];
  totalLatencyMs: number;
  successCount: number;
}

export async function runAllEvaluators(
  city1: string,
  city2: string,
  metrics: MetricDefinition[],
  apiKeys: LLMAPIKeys & { tavily?: string },
  onProgress?: (provider: LLMProvider, status: 'started' | 'completed' | 'failed') => void
): Promise<AllEvaluatorsResult> {
  const startTime = Date.now();
  const evaluatorPromises: Promise<EvaluatorResult>[] = [];

  // Launch all evaluators in parallel
  if (apiKeys.anthropic) {
    onProgress?.('claude-sonnet', 'started');
    evaluatorPromises.push(
      evaluateWithClaude(apiKeys.anthropic, apiKeys.tavily, city1, city2, metrics)
        .then(r => { onProgress?.('claude-sonnet', r.success ? 'completed' : 'failed'); return r; })
    );
  }

  if (apiKeys.openai) {
    onProgress?.('gpt-4o', 'started');
    evaluatorPromises.push(
      evaluateWithGPT4o(apiKeys.openai, city1, city2, metrics)
        .then(r => { onProgress?.('gpt-4o', r.success ? 'completed' : 'failed'); return r; })
    );
  }

  if (apiKeys.gemini) {
    onProgress?.('gemini-3-pro', 'started');
    evaluatorPromises.push(
      evaluateWithGemini(apiKeys.gemini, city1, city2, metrics)
        .then(r => { onProgress?.('gemini-3-pro', r.success ? 'completed' : 'failed'); return r; })
    );
  }

  if (apiKeys.xai) {
    onProgress?.('grok-4', 'started');
    evaluatorPromises.push(
      evaluateWithGrok(apiKeys.xai, city1, city2, metrics)
        .then(r => { onProgress?.('grok-4', r.success ? 'completed' : 'failed'); return r; })
    );
  }

  if (apiKeys.perplexity) {
    onProgress?.('perplexity', 'started');
    evaluatorPromises.push(
      evaluateWithPerplexity(apiKeys.perplexity, city1, city2, metrics)
        .then(r => { onProgress?.('perplexity', r.success ? 'completed' : 'failed'); return r; })
    );
  }

  const results = await Promise.all(evaluatorPromises);

  return {
    results,
    totalLatencyMs: Date.now() - startTime,
    successCount: results.filter(r => r.success).length
  };
}

// ============================================================================
// RUN SINGLE LLM EVALUATOR
// For progressive evaluation - user selects one LLM at a time
// ============================================================================

export async function runSingleEvaluator(
  provider: LLMProvider,
  city1: string,
  city2: string,
  metrics: MetricDefinition[],
  apiKeys: LLMAPIKeys & { tavily?: string },
  onProgress?: (phase: 'starting' | 'evaluating' | 'completed' | 'failed') => void
): Promise<EvaluatorResult> {
  onProgress?.('starting');

  try {
    let result: EvaluatorResult;

    switch (provider) {
      case 'claude-sonnet':
        if (!apiKeys.anthropic) {
          throw new Error('Anthropic API key not configured');
        }
        onProgress?.('evaluating');
        result = await evaluateWithClaude(apiKeys.anthropic, apiKeys.tavily, city1, city2, metrics);
        break;

      case 'gpt-4o':
        if (!apiKeys.openai) {
          throw new Error('OpenAI API key not configured');
        }
        onProgress?.('evaluating');
        result = await evaluateWithGPT4o(apiKeys.openai, city1, city2, metrics);
        break;

      case 'gemini-3-pro':
        if (!apiKeys.gemini) {
          throw new Error('Gemini API key not configured');
        }
        onProgress?.('evaluating');
        result = await evaluateWithGemini(apiKeys.gemini, city1, city2, metrics);
        break;

      case 'grok-4':
        if (!apiKeys.xai) {
          throw new Error('xAI API key not configured');
        }
        onProgress?.('evaluating');
        result = await evaluateWithGrok(apiKeys.xai, city1, city2, metrics);
        break;

      case 'perplexity':
        if (!apiKeys.perplexity) {
          throw new Error('Perplexity API key not configured');
        }
        onProgress?.('evaluating');
        result = await evaluateWithPerplexity(apiKeys.perplexity, city1, city2, metrics);
        break;

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    onProgress?.(result.success ? 'completed' : 'failed');
    return result;

  } catch (error) {
    onProgress?.('failed');
    return {
      provider,
      success: false,
      scores: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs: 0
    };
  }
}

// ============================================================================
// PHASE 2: CATEGORY BATCH EVALUATION
// Splits 100 metrics into 6 category batches, runs in parallel
// ============================================================================

export interface CategoryBatchProgress {
  categoryId: CategoryId;
  categoryName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  metricsCount: number;
}

export interface BatchedEvaluatorResult extends EvaluatorResult {
  categoryResults: Map<CategoryId, {
    success: boolean;
    scores: LLMMetricScore[];
    latencyMs: number;
    error?: string;
  }>;
}

/**
 * Evaluate a single category's metrics with a specific LLM provider
 */
/**
 * Evaluate a single category's metrics via Vercel API route
 * This calls /api/evaluate which has access to env vars with API keys
 */
async function evaluateCategoryBatch(
  provider: LLMProvider,
  city1: string,
  city2: string,
  categoryId: CategoryId,
  metrics: MetricDefinition[]
  // API keys not needed here - keys are in env vars on server
): Promise<{ success: boolean; scores: LLMMetricScore[]; latencyMs: number; error?: string }> {
  const startTime = Date.now();

  console.log(`[CLIENT] Starting ${provider} evaluation for category ${categoryId}, ${metrics.length} metrics`);

  // Client-side timeout - 240s per category (must exceed server 180s timeout)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    // Call Vercel serverless function which has access to env vars
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        provider,
        city1,
        city2,
        metrics: metrics.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          categoryId: m.categoryId,
          scoringDirection: m.scoringDirection
        }))
      })
    });

    clearTimeout(timeoutId);

    console.log(`[CLIENT] ${provider}/${categoryId} response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CLIENT] ${provider}/${categoryId} API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        scores: [],
        latencyMs: Date.now() - startTime,
        error: `API error: ${response.status} - ${errorText}`
      };
    }

    const result = await response.json() as { success: boolean; scores: APIMetricScore[]; error?: string };

    console.log(`[CLIENT] ${provider}/${categoryId} result: success=${result.success}, scores=${result.scores?.length || 0}, error=${result.error || 'none'}`);

    // Helper to convert confidence string to proper type
    const parseConfidence = (conf: string): 'high' | 'medium' | 'low' => {
      if (conf === 'high') return 'high';
      if (conf === 'medium') return 'medium';
      return 'low';
    };

    // Convert API response scores to LLMMetricScore format
    // FIX: Now includes evidence from GPT-4o web search
    const apiScores: APIMetricScore[] = result.scores || [];
    const now = new Date().toISOString();

    const city1Scores: LLMMetricScore[] = apiScores.map((s: APIMetricScore) => ({
      metricId: s.metricId,
      rawValue: null,
      normalizedScore: Math.round((s.city1LegalScore + s.city1EnforcementScore) / 2),
      confidence: parseConfidence(s.confidence),
      llmProvider: provider,
      legalScore: s.city1LegalScore,
      enforcementScore: s.city1EnforcementScore,
      explanation: s.reasoning,
      sources: s.sources,
      // FIX: Include evidence with proper EvidenceItem format
      evidence: s.city1Evidence?.map(e => ({
        city: city1,
        title: e.title,
        url: e.url,
        snippet: e.snippet,
        retrieved_at: now
      })),
      city: 'city1' as const
    }));

    const city2Scores: LLMMetricScore[] = apiScores.map((s: APIMetricScore) => ({
      metricId: s.metricId,
      rawValue: null,
      normalizedScore: Math.round((s.city2LegalScore + s.city2EnforcementScore) / 2),
      confidence: parseConfidence(s.confidence),
      llmProvider: provider,
      legalScore: s.city2LegalScore,
      enforcementScore: s.city2EnforcementScore,
      explanation: s.reasoning,
      sources: s.sources,
      // FIX: Include evidence with proper EvidenceItem format
      evidence: s.city2Evidence?.map(e => ({
        city: city2,
        title: e.title,
        url: e.url,
        snippet: e.snippet,
        retrieved_at: now
      })),
      city: 'city2' as const
    }));

    const scores: LLMMetricScore[] = [...city1Scores, ...city2Scores];

    // FIX #12: Only mark as success if we actually have scores
    // API might return success:true but empty scores array
    return {
      success: result.success && scores.length > 0,
      scores,
      latencyMs: Date.now() - startTime,
      error: scores.length === 0 && result.success ? 'No scores returned from API' : result.error
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Provide clearer error message for timeout
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const errorMsg = isTimeout
      ? `Request timed out after ${CLIENT_TIMEOUT_MS / 1000} seconds for ${provider}/${categoryId}`
      : (error instanceof Error ? error.message : 'Unknown error');

    console.error(`[CLIENT] ${provider}/${categoryId} fetch error:`, errorMsg);

    return {
      success: false,
      scores: [],
      latencyMs: Date.now() - startTime,
      error: errorMsg
    };
  }
}

// Concurrency limit - run only 2 categories at a time to avoid API rate limits
const MAX_CONCURRENT_CATEGORIES = 2;

/**
 * Run a single LLM evaluator with category batching (2 concurrent, 3 waves)
 * FIX: Limit concurrency to 2 to avoid Claude API rate limits causing 5/6 failures
 */
export async function runSingleEvaluatorBatched(
  provider: LLMProvider,
  city1: string,
  city2: string,
  _apiKeys: LLMAPIKeys & { tavily?: string }, // Keys are in Vercel env vars, not used client-side
  onCategoryProgress?: (progress: CategoryBatchProgress[]) => void
): Promise<BatchedEvaluatorResult> {
  const startTime = Date.now();

  console.log(`[BATCH] Starting ${provider} batched evaluation (max ${MAX_CONCURRENT_CATEGORIES} concurrent)`);

  // NOTE: API keys are stored in Vercel environment variables on the server
  // The /api/evaluate endpoint has access to them, so we don't validate client-side

  // Initialize progress for all 6 categories
  const progressState: CategoryBatchProgress[] = CATEGORIES.map(cat => ({
    categoryId: cat.id as CategoryId,
    categoryName: cat.name,
    status: 'pending',
    metricsCount: cat.metricCount
  }));

  onCategoryProgress?.(progressState);

  // Helper to wrap a promise with timeout
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, timeoutValue: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(timeoutValue), timeoutMs))
    ]);
  };

  // Helper to evaluate a single category
  const evaluateCategory = async (category: typeof CATEGORIES[0]) => {
    const categoryId = category.id as CategoryId;
    const metrics = getMetricsByCategory(categoryId);

    // Update progress to running
    const idx = progressState.findIndex(p => p.categoryId === categoryId);
    if (idx >= 0) {
      progressState[idx].status = 'running';
      onCategoryProgress?.([...progressState]);
    }

    // Wrap in timeout to prevent hanging (240s per category - must exceed server 180s)
    const result = await withTimeout(
      evaluateCategoryBatch(provider, city1, city2, categoryId, metrics),
      CLIENT_TIMEOUT_MS,
      { success: false, scores: [], latencyMs: CLIENT_TIMEOUT_MS, error: `Timeout for ${categoryId}` }
    );

    console.log(`[BATCH] ${provider}/${categoryId} done: success=${result.success}, scores=${result.scores.length}`);

    // Update progress to completed/failed
    if (idx >= 0) {
      progressState[idx].status = result.success ? 'completed' : 'failed';
      onCategoryProgress?.([...progressState]);
    }

    return { categoryId, result };
  };

  // Split categories into waves of MAX_CONCURRENT_CATEGORIES
  const allResults: { categoryId: CategoryId; result: { success: boolean; scores: LLMMetricScore[]; latencyMs: number; error?: string } }[] = [];

  for (let i = 0; i < CATEGORIES.length; i += MAX_CONCURRENT_CATEGORIES) {
    const wave = CATEGORIES.slice(i, i + MAX_CONCURRENT_CATEGORIES);
    console.log(`[BATCH] ${provider} wave ${Math.floor(i / MAX_CONCURRENT_CATEGORIES) + 1}: ${wave.map(c => c.id).join(', ')}`);

    // Run this wave in parallel (but only 2 at a time)
    const waveResults = await Promise.all(wave.map(cat => evaluateCategory(cat)));
    allResults.push(...waveResults);

    // Small delay between waves to let API recover
    if (i + MAX_CONCURRENT_CATEGORIES < CATEGORIES.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const results = allResults;

  console.log(`[BATCH] ${provider} all categories done in ${Date.now() - startTime}ms`);

  // Aggregate results
  const categoryResults = new Map<CategoryId, {
    success: boolean;
    scores: LLMMetricScore[];
    latencyMs: number;
    error?: string;
  }>();

  const allScores: LLMMetricScore[] = [];
  let successCount = 0;
  const errors: string[] = [];

  results.forEach(({ categoryId, result }) => {
    categoryResults.set(categoryId, result);
    allScores.push(...result.scores);
    if (result.success) {
      successCount++;
    } else if (result.error) {
      errors.push(`${categoryId}: ${result.error}`);
    }
  });

  // PARTIAL SUCCESS: Count as success if at least 3/6 categories (50%) have scores
  // This ensures partial results still render and count toward judging
  const hasEnoughScores = allScores.length >= 30; // At least ~30 metrics worth of scores
  const partialSuccess = successCount >= 3 || hasEnoughScores;

  console.log(`[BATCH] ${provider}: ${successCount}/6 categories succeeded, ${allScores.length} scores, partialSuccess=${partialSuccess}`);

  return {
    provider,
    success: partialSuccess,
    scores: allScores,
    latencyMs: Date.now() - startTime,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    categoryResults
  };
}
