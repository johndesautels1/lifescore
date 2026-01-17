/**
 * LIFE SCORE™ LLM Evaluation API
 * Vercel Serverless Function - has access to environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Timeout constants (in milliseconds)
const LLM_TIMEOUT_MS = 120000; // 120 seconds for all LLM API calls
const TAVILY_TIMEOUT_MS = 60000; // 60 seconds for Tavily search

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

// Parsed LLM evaluation structure
interface ParsedEvaluation {
  metricId: string;
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

interface EvaluationResponse {
  provider: LLMProvider;
  success: boolean;
  scores: MetricScore[];
  latencyMs: number;
  error?: string;
}

// Build evaluation prompt
function buildPrompt(city1: string, city2: string, metrics: EvaluationRequest['metrics']): string {
  const metricsList = metrics.map(m => `
- ${m.id}: ${m.name}
  Category: ${m.categoryId}
  Description: ${m.description}
  Scoring: ${m.scoringDirection === 'higher_is_better' ? 'Higher = more freedom' : 'Lower = more freedom'}
`).join('\n');

  return `You are an expert legal analyst evaluating freedom metrics for city comparison.

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
      "reasoning": "Brief explanation"
    }
  ]
}

## SCORING GUIDELINES
- 90-100: Extremely permissive, minimal restrictions
- 70-89: Generally permissive with some limitations
- 50-69: Moderate restrictions
- 30-49: Significant restrictions
- 0-29: Highly restrictive or prohibited

Return ONLY the JSON object, no other text.`;
}

// Parse LLM response to extract scores
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
    // FIX #11: Clamp all scores to 0-100 range
    const clampScore = (score: number | undefined): number => {
      const s = score ?? 50;
      return Math.max(0, Math.min(100, Math.round(s)));
    };
    return (parsed.evaluations || []).map((e: ParsedEvaluation) => ({
      metricId: e.metricId,
      city1LegalScore: clampScore(e.city1LegalScore),
      city1EnforcementScore: clampScore(e.city1EnforcementScore),
      city2LegalScore: clampScore(e.city2LegalScore),
      city2EnforcementScore: clampScore(e.city2EnforcementScore),
      confidence: e.confidence || 'medium',
      reasoning: e.reasoning,
      sources: e.sources,
      // Include evidence from LLM web search
      city1Evidence: e.city1Evidence || [],
      city2Evidence: e.city2Evidence || []
    }));
  } catch (error) {
    console.error(`Failed to parse ${provider} response:`, error);
    return [];
  }
}

// Tavily web search helper for Claude
async function tavilySearch(query: string, maxResults: number = 3): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetchWithTimeout(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false
        })
      },
      TAVILY_TIMEOUT_MS
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// Claude Sonnet 4.5 evaluation (with optional Tavily web search)
async function evaluateWithClaude(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: 0, error: 'ANTHROPIC_API_KEY not configured' };
  }

  const startTime = Date.now();

  // Optionally fetch web search context via Tavily
  let searchContext = '';
  if (process.env.TAVILY_API_KEY) {
    const searchQueries = [
      `${city1} laws regulations freedom`,
      `${city2} laws regulations freedom`
    ];
    const searchResults = await Promise.all(
      searchQueries.map(q => tavilySearch(q, 3).catch(() => []))
    );
    const results = searchResults.flat();
    if (results.length > 0) {
      searchContext = `\n\n## WEB SEARCH RESULTS\n${results.map(r => `- ${r.title}: ${r.content.slice(0, 400)}`).join('\n')}\n\nUse these search results to inform your evaluation.\n`;
    }
  }

  const prompt = searchContext + buildPrompt(city1, city2, metrics);

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
    const content = data.content[0].text;
    const scores = parseResponse(content, 'claude-sonnet');

    return { provider: 'claude-sonnet', success: true, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    return { provider: 'claude-sonnet', success: false, scores: [], latencyMs: Date.now() - startTime, error: String(error) };
  }
}

// GPT-4o evaluation (with Tavily web search - same pattern as Claude Sonnet)
async function evaluateWithGPT4o(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { provider: 'gpt-4o', success: false, scores: [], latencyMs: 0, error: 'OPENAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // Optionally fetch web search context via Tavily (same pattern as Claude)
  let searchContext = '';
  if (process.env.TAVILY_API_KEY) {
    const searchQueries = [
      `${city1} laws regulations freedom`,
      `${city2} laws regulations freedom`
    ];
    const searchResults = await Promise.all(
      searchQueries.map(q => tavilySearch(q, 3).catch(() => []))
    );
    const results = searchResults.flat();
    if (results.length > 0) {
      searchContext = `\n\n## WEB SEARCH RESULTS\n${results.map(r => `- ${r.title}: ${r.content.slice(0, 400)}`).join('\n')}\n\nUse these search results to inform your evaluation.\n`;
    }
  }

  const prompt = searchContext + buildPrompt(city1, city2, metrics);

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
    const content = data.choices[0].message.content;
    const scores = parseResponse(content, 'gpt-4o');

    return { provider: 'gpt-4o', success: true, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    return { provider: 'gpt-4o', success: false, scores: [], latencyMs: Date.now() - startTime, error: String(error) };
  }
}

// Gemini 3 Pro evaluation (with Google Search grounding)
async function evaluateWithGemini(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: 0, error: 'GOOGLE_API_KEY not configured' };
  }

  const startTime = Date.now();
  const prompt = buildPrompt(city1, city2, metrics);

  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key=${apiKey}`,
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const scores = parseResponse(content, 'gemini-3-pro');

    return { provider: 'gemini-3-pro', success: true, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    return { provider: 'gemini-3-pro', success: false, scores: [], latencyMs: Date.now() - startTime, error: String(error) };
  }
}

// Grok 4 evaluation
async function evaluateWithGrok(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { provider: 'grok-4', success: false, scores: [], latencyMs: 0, error: 'XAI_API_KEY not configured' };
  }

  const startTime = Date.now();
  const prompt = buildPrompt(city1, city2, metrics);

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
    const content = data.choices[0].message.content;
    const scores = parseResponse(content, 'grok-4');

    return { provider: 'grok-4', success: true, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    return { provider: 'grok-4', success: false, scores: [], latencyMs: Date.now() - startTime, error: String(error) };
  }
}

// Perplexity evaluation
async function evaluateWithPerplexity(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return { provider: 'perplexity', success: false, scores: [], latencyMs: 0, error: 'PERPLEXITY_API_KEY not configured' };
  }

  const startTime = Date.now();
  const prompt = buildPrompt(city1, city2, metrics);

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
            { role: 'system', content: 'You are an expert legal analyst evaluating freedom metrics. Use your web search capabilities to find current laws and regulations.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 16384,
          temperature: 0.3,
          return_citations: true
        })
      },
      LLM_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const scores = parseResponse(content, 'perplexity');

    return { provider: 'perplexity', success: true, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    return { provider: 'perplexity', success: false, scores: [], latencyMs: Date.now() - startTime, error: String(error) };
  }
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

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

  try {
    const { provider, city1, city2, metrics } = req.body as EvaluationRequest;

    console.log(`[EVALUATE] Starting ${provider} evaluation for ${city1} vs ${city2}, ${metrics?.length || 0} metrics`);

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
