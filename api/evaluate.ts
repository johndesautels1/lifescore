/**
 * LIFE SCORE™ LLM Evaluation API
 * Vercel Serverless Function - has access to environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// LLM Provider types
type LLMProvider = 'claude-sonnet' | 'gpt-5.2' | 'gemini-3-pro' | 'grok-4' | 'perplexity';

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
}

// Evidence item from GPT-5.2 web search
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
    return (parsed.evaluations || []).map((e: ParsedEvaluation) => ({
      metricId: e.metricId,
      city1LegalScore: e.city1LegalScore || 50,
      city1EnforcementScore: e.city1EnforcementScore || 50,
      city2LegalScore: e.city2LegalScore || 50,
      city2EnforcementScore: e.city2EnforcementScore || 50,
      confidence: e.confidence || 'medium',
      reasoning: e.reasoning,
      sources: e.sources
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
    const response = await fetch('https://api.tavily.com/search', {
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
    });

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
      searchQueries.map(q => tavilySearch(q, 3))
    );
    const results = searchResults.flat();
    if (results.length > 0) {
      searchContext = `\n\n## WEB SEARCH RESULTS\n${results.map(r => `- ${r.title}: ${r.content.slice(0, 400)}`).join('\n')}\n\nUse these search results to inform your evaluation.\n`;
    }
  }

  const prompt = searchContext + buildPrompt(city1, city2, metrics);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 16384,
        messages: [{ role: 'user', content: prompt }]
      })
    });

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

// GPT-5.2 evaluation (with built-in web search via responses API)
async function evaluateWithGPT5(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { provider: 'gpt-5.2', success: false, scores: [], latencyMs: 0, error: 'OPENAI_API_KEY not configured' };
  }

  const startTime = Date.now();

  // Build system prompt for GPT-5.2
  const systemPrompt = `You are an impartial analyst comparing two cities using factual web data only.
Use the built-in web_search tool automatically.
Cite every claim. If evidence is missing, set confidence="low" and explain why.
Return JSON exactly matching the schema provided.`;

  // Build user payload (JSON format for GPT-5.2)
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

  // JSON Schema for structured output (matching GPT's schema but with our 0-100 scoring)
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
            required: ["metricId", "city1LegalScore", "city1EnforcementScore", "city2LegalScore", "city2EnforcementScore", "confidence", "reasoning", "city1Evidence", "city2Evidence"]
          }
        }
      },
      required: ["evaluations"]
    }
  };

  try {
    // GPT-5.2 uses the responses API with built-in web search
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        reasoning: { effort: 'medium' },
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(userPayload) }
        ],
        text: { format: outputSchema }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { provider: 'gpt-5.2', success: false, scores: [], latencyMs: Date.now() - startTime, error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    // GPT-5.2 responses API returns output_text instead of choices[0].message.content
    const content = data.output_text;
    const scores = parseResponse(content, 'gpt-5.2');

    return { provider: 'gpt-5.2', success: true, scores, latencyMs: Date.now() - startTime };
  } catch (error) {
    return { provider: 'gpt-5.2', success: false, scores: [], latencyMs: Date.now() - startTime, error: String(error) };
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
    const response = await fetch(
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
      }
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
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
    });

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
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
    });

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

  const { provider, city1, city2, metrics } = req.body as EvaluationRequest;

  if (!provider || !city1 || !city2 || !metrics) {
    return res.status(400).json({ error: 'Missing required fields: provider, city1, city2, metrics' });
  }

  let result: EvaluationResponse;

  switch (provider) {
    case 'claude-sonnet':
      result = await evaluateWithClaude(city1, city2, metrics);
      break;
    case 'gpt-5.2':
      result = await evaluateWithGPT5(city1, city2, metrics);
      break;
    case 'gemini-3-pro':
      result = await evaluateWithGemini(city1, city2, metrics);
      break;
    case 'grok-4':
      result = await evaluateWithGrok(city1, city2, metrics);
      break;
    case 'perplexity':
      result = await evaluateWithPerplexity(city1, city2, metrics);
      break;
    default:
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
  }

  return res.status(200).json(result);
}
