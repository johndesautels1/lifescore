/**
 * LIFE SCORE™ LLM Evaluation API
 * Vercel Serverless Function - has access to environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
// Phase 2: Import shared metrics for category-based scoring (standalone api/shared version)
import { categoryToScore, METRICS_MAP, getCategoryOptionsForPrompt } from './shared/metrics';
import type { ScoreResult } from './shared/metrics';

// Timeout constant (in milliseconds) - unified for all API calls
const LLM_TIMEOUT_MS = 180000; // 180 seconds for all LLM API calls including Tavily

// Phase 2: Environment variable toggle for gradual rollout
const USE_CATEGORY_SCORING = process.env.USE_CATEGORY_SCORING === 'true';

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
  city1LegalScore: number;
  city1EnforcementScore: number;
  city2LegalScore: number;
  city2EnforcementScore: number;
  confidence: string;
  reasoning?: string;
  sources?: string[];
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
  // Phase 2: Category-based format
  city1Category?: string;
  city2Category?: string;
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

interface EvaluationResponse {
  provider: LLMProvider;
  success: boolean;
  scores: MetricScore[];
  latencyMs: number;
  error?: string;
}

// Build BASE evaluation prompt with A/B/C/D/E letter grades
// This is shared by all LLMs - each LLM function adds its own addendum
function buildBasePrompt(city1: string, city2: string, metrics: EvaluationRequest['metrics']): string {
  const metricsList = metrics.map(m => `
- ${m.id}: ${m.name}
  Description: ${m.description}
  Direction: ${m.scoringDirection === 'higher_is_better' ? 'Higher grade = more freedom' : 'Lower grade = more freedom'}
`).join('\n');

  return `You are an expert legal analyst evaluating freedom metrics for city comparison.

## TASK
Evaluate the following metrics for two cities. For EACH metric, provide TWO letter grades (A/B/C/D/E):
1. **Legal Grade**: What does the law technically say?
2. **Enforcement Grade**: How is the law actually enforced in practice?

## CITIES TO COMPARE (Year: ${new Date().getFullYear()})
- City 1: ${city1}
- City 2: ${city2}

## LETTER GRADE SCALE

**Legal Score (What the law says):**
| Grade | Meaning |
|-------|---------|
| A | Fully legal/permitted - no restrictions |
| B | Mostly legal - minor limitations only |
| C | Moderate restrictions - some limits |
| D | Restricted - significant legal barriers |
| E | Prohibited/Illegal - severe penalties |

**Enforcement Score (How it's actually enforced):**
| Grade | Meaning |
|-------|---------|
| A | Never enforced - authorities ignore completely |
| B | Rarely enforced - low priority, warnings only |
| C | Selectively enforced - depends on situation |
| D | Usually enforced - regular citations/arrests |
| E | Strictly enforced - zero tolerance |

## METRICS TO EVALUATE
${metricsList}

## OUTPUT FORMAT
Return a JSON object with this EXACT structure:
{
  "evaluations": [
    {
      "metricId": "metric_id_here",
      "city1Legal": "B",
      "city1Enforcement": "C",
      "city2Legal": "D",
      "city2Enforcement": "D",
      "confidence": "high",
      "reasoning": "Brief explanation of key difference",
      "sources": ["https://example.com/law-source"],
      "city1Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}],
      "city2Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}]
    }
  ]
}

## CRITICAL RULES
1. Use ONLY letters A, B, C, D, or E - no numbers
2. Evaluate BOTH cities for EACH metric
3. Consider 2026 laws and current enforcement trends
4. Return ONLY the JSON object, no other text
5. MUST include sources - URLs to laws, government sites, news articles backing your evaluation
6. Include city1Evidence and city2Evidence with title, url, and relevant snippet for each city`;
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
${options}`;
  }).join('\n');

  return `You are an expert legal analyst evaluating freedom metrics for city comparison.

## TASK
Evaluate the following metrics for two cities. For EACH metric, select the CATEGORY VALUE that best describes the current legal status.

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
      "city1Category": "the_value_key",
      "city2Category": "the_value_key",
      "confidence": "high",
      "reasoning": "Brief explanation of key difference",
      "sources": ["https://example.com/law-source"],
      "city1Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}],
      "city2Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}]
    }
  ]
}

## CRITICAL RULES
1. Use ONLY the exact category value keys listed for each metric (e.g., "fully_legal", "medical_only")
2. Evaluate BOTH cities for EACH metric
3. Consider 2026 laws and current status
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

    // Helper: Convert letter grade to score, or clamp numeric score
    const getScore = (letter: string | undefined, numeric: number | undefined): number => {
      // Prefer letter grade if present
      if (letter && /^[A-Ea-e]$/.test(letter.trim())) {
        return letterToScore(letter);
      }
      // Fallback to numeric (clamp to 0-100)
      const s = numeric ?? 50;
      return Math.max(0, Math.min(100, Math.round(s)));
    };

    // Phase 2: Helper to convert category to score using shared metrics
    const getCategoryScore = (metricId: string, category: string | undefined): number => {
      if (!category) return 50;
      const result = categoryToScore(metricId, category);
      return result.score ?? 50;
    };

    return (parsed.evaluations || []).map((e: ParsedEvaluation) => {
      // Phase 2: If category-based response, use categoryToScore()
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
interface TavilyResponse { results: TavilyResult[]; answer?: string }
interface TavilyResearchResponse { report: string; sources: { title: string; url: string }[] }

const TAVILY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Project-ID': 'lifescore-freedom-app'  // Project tracking for usage analytics
};

// Tavily Research API - Comprehensive baseline report for city comparison
async function tavilyResearch(city1: string, city2: string): Promise<TavilyResearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

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
async function tavilySearch(query: string, maxResults: number = 5): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { results: [] };

  try {
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

    if (!response.ok) return { results: [] };
    const data = await response.json();
    return { results: data.results || [], answer: data.answer };
  } catch {
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
      tavilyResearch(city1, city2).catch(() => null),
      ...searchQueries.map(q => tavilySearch(q, 5).catch(() => ({ results: [] })))
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
  const claudeAddendum = `
## CLAUDE-SPECIFIC INSTRUCTIONS
- Use the Tavily Research Report as your primary baseline for comparing ${city1} vs ${city2}
- Cross-reference with category-specific search results for detailed metrics
- You excel at nuanced legal interpretation - distinguish between law text vs enforcement reality
- For ambiguous cases, lean toward the grade that reflects lived experience over technical legality
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = tavilyContext + basePrompt + claudeAddendum;

  console.log(`[EVALUATE] USE_CATEGORY_SCORING=${USE_CATEGORY_SCORING}`);

  try {
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
      return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    // FIX #8: Defensive parsing - handle missing/malformed response
    const content = data?.content?.[0]?.text;
    if (!content) {
      return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Empty or malformed response from Claude' };
    }
    const scores = parseResponse(content, 'claude-sonnet');

    return { provider: 'claude-sonnet', success: scores.length > 0, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
    return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg };
  }
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
      tavilyResearch(city1, city2).catch(() => null),
      ...searchQueries.map(q => tavilySearch(q, 5).catch(() => ({ results: [] })))
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

  // GPT-4o SPECIFIC ADDENDUM
  const gptAddendum = `
## GPT-4o SPECIFIC INSTRUCTIONS
- Use the Tavily Research Report as your primary baseline for comparing ${city1} vs ${city2}
- Cross-reference with category-specific search results for detailed metrics
- Focus on factual accuracy - be precise with letter grades
- Avoid defaulting to 'C' when evidence points elsewhere
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = tavilyContext + basePrompt + gptAddendum;

  try {
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
            { role: 'system', content: 'You are an expert legal analyst evaluating freedom metrics. Use the provided web search results to inform your evaluation. Return only valid JSON.' },
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
      return { provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    // FIX #8: Defensive parsing - handle missing/malformed response
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Empty or malformed response from GPT-4o' };
    }
    const scores = parseResponse(content, 'gpt-4o');

    return { provider: 'gpt-4o', success: scores.length > 0, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
    return { provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg };
  }
}

// Gemini 3 Pro evaluation (with Google Search grounding)
async function evaluateWithGemini(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: 0, error: 'GEMINI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // GEMINI-SPECIFIC ADDENDUM (optimized for Reasoning-over-Grounding)
  const geminiAddendum = `
## GEMINI-SPECIFIC INSTRUCTIONS
- Use Google Search grounding to verify current 2026 legal status for both cities
- Apply your "Thinking" reasoning to distinguish between legal text and enforcement reality
- For Policing & Legal metrics (pl_*), spend extra reasoning time on contradictory data
- You have the full context window - maintain consistency across all ${metrics.length} metrics
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = basePrompt + geminiAddendum;

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 16384, temperature: 0.3 },
          // Enable Google Search grounding for real-time web data
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
      return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    // FIX #8: Defensive parsing - handle missing/malformed response
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Empty or malformed response from Gemini' };
    }
    const scores = parseResponse(content, 'gemini-3-pro');

    return { provider: 'gemini-3-pro', success: scores.length > 0, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
    return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg };
  }
}

// Grok 4 evaluation (with native X/Twitter search)
async function evaluateWithGrok(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { provider: 'grok-4', success: false, scores: [], latencyMs: 0, error: 'XAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // GROK-SPECIFIC ADDENDUM (optimized for real-time social data)
  const grokAddendum = `
## GROK-SPECIFIC INSTRUCTIONS
- Use your native X/Twitter search to find real enforcement experiences from residents
- Prioritize recent posts (2024-2026) about actual encounters with laws and police
- X posts often reveal enforcement reality that differs from official policy
- Weight anecdotal enforcement data alongside official legal sources
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = basePrompt + grokAddendum;

  try {
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
            { role: 'system', content: 'You are an expert legal analyst evaluating freedom metrics. Use your real-time web search to find current laws and regulations.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 16384,
          temperature: 0.3,
          search: true
        })
      },
      LLM_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    // FIX #8: Defensive parsing - handle missing/malformed response
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Empty or malformed response from Grok' };
    }
    const scores = parseResponse(content, 'grok-4');

    return { provider: 'grok-4', success: scores.length > 0, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key');
    return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg };
  }
}

// Perplexity evaluation (with Sonar web search and citations)
async function evaluateWithPerplexity(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { provider: 'perplexity', success: false, scores: [], latencyMs: 0, error: 'PERPLEXITY_API_KEY not configured' };
  }

  const startTime = Date.now();

  // PERPLEXITY-SPECIFIC ADDENDUM (optimized for citation-backed research)
  const perplexityAddendum = `
## PERPLEXITY-SPECIFIC INSTRUCTIONS
- Use your Sonar web search to find authoritative sources for each metric
- Cite specific laws, statutes, or official government sources when possible
- Your strength is verified, citation-backed research - leverage it
- For enforcement scores, look for news articles about actual enforcement actions
`;

  // Phase 2: Use category prompt when enabled
  const basePrompt = USE_CATEGORY_SCORING
    ? buildCategoryPrompt(city1, city2, metrics as MetricWithCriteria[])
    : buildBasePrompt(city1, city2, metrics);
  const prompt = basePrompt + perplexityAddendum;

  try {
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
            { role: 'system', content: 'You are a scoring engine. Return ONLY valid JSON with no additional text.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 16384,
          temperature: 0.3,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'freedom_evaluations',
              schema: {
                type: 'object',
                properties: {
                  evaluations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        metricId: { type: 'string' },
                        city1LegalScore: { type: 'number' },
                        city1EnforcementScore: { type: 'number' },
                        city2LegalScore: { type: 'number' },
                        city2EnforcementScore: { type: 'number' },
                        confidence: { type: 'string' },
                        reasoning: { type: 'string' },
                        sources: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['metricId', 'city1LegalScore', 'city1EnforcementScore', 'city2LegalScore', 'city2EnforcementScore', 'confidence', 'reasoning']
                    }
                  }
                },
                required: ['evaluations'],
                additionalProperties: false
              },
              strict: true
            }
          }
        })
      },
      LLM_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();

    // Perplexity API uses 'output' array (new format) or 'choices' (legacy)
    const messages = data.output ?? [];
    const last = messages[messages.length - 1];
    const contentArr = last?.content ?? [];
    // Look for both 'text' and 'output_text' content types
    const textPart = contentArr.find((c: any) => c.type === 'text' || c.type === 'output_text');
    let rawText = textPart?.text ?? '';

    // Fallback to legacy choices format if output is empty
    if (!rawText && data.choices?.[0]?.message?.content) {
      rawText = data.choices[0].message.content;
    }

    if (!rawText) {
      console.error('[PERPLEXITY] No content found. Keys:', Object.keys(data));
      console.error('[PERPLEXITY] Full response:', JSON.stringify(data).slice(0, 1000));
      return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'Empty response from Perplexity - no output or choices' };
    }

    // Strip <think>...</think> blocks from reasoning models
    rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    // Check for JSON in code blocks first
    const codeMatch = rawText.match(/```json([\s\S]*?)```/i) ?? rawText.match(/```([\s\S]*?)```/);
    const candidate = codeMatch ? codeMatch[1].trim() : rawText;

    // Extract JSON object
    const jsonMatch = candidate.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[PERPLEXITY] No JSON object found. Text preview:', rawText.slice(0, 500));
      return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: 'No JSON object found in Perplexity output' };
    }

    const scores = parseResponse(jsonMatch[0], 'perplexity');
    if (scores.length === 0) {
      console.error('[PERPLEXITY] parseResponse returned 0 scores. JSON preview:', jsonMatch[0].slice(0, 300));
    }

    return { provider: 'perplexity', success: scores.length > 0, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : (error ? String(error) : 'Unknown error - check API key and network');
    return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: errorMsg };
  }
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // CORS headers - restrict to Vercel deployment domain
  const allowedOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://lifescore.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
