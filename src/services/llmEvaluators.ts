/**
 * LIFE SCORE™ Real LLM Evaluators
 * Individual evaluator functions for each LLM with web search capabilities
 */

import type { LLMProvider, LLMAPIKeys, LLMMetricScore } from '../types/enhancedComparison';
import type { MetricDefinition, CategoryId } from '../types/metrics';
import { CATEGORIES, getMetricsByCategory } from '../data/metrics';
import { withRetry, isCircuitOpen, recordSuccess, recordFailure } from './rateLimiter';

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
// TAVILY WEB SEARCH (for Claude)
// ============================================================================

export async function tavilySearch(
  apiKey: string,
  query: string,
  maxResults: number = 5
): Promise<{ title: string; url: string; content: string }[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false
    })
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
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

    // If Tavily key available, perform searches for context
    if (tavilyKey) {
      const searchQueries = [
        `${city1} laws regulations freedom index`,
        `${city2} laws regulations freedom index`,
        `${city1} vs ${city2} legal comparison`
      ];

      const searchResults = await Promise.all(
        searchQueries.map(q => tavilySearch(tavilyKey, q, 3).catch(() => []))
      );

      searchContext = `
## WEB SEARCH RESULTS
${searchResults.flat().map(r => `- ${r.title}: ${r.content.slice(0, 500)}`).join('\n')}

Use these search results to inform your evaluation.
`;
    }

    const prompt = searchContext + buildEvaluationPrompt(city1, city2, metrics, false);

    // Use retry logic for API call
    const content = await withRetry(provider, async () => {
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
        throw new Error(`Anthropic API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
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
// OPENAI GPT-4o EVALUATOR (with native web browsing)
// ============================================================================

export async function evaluateWithGPT4o(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert legal analyst. Use web browsing to research current laws and regulations.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 16384,
        temperature: 0.3,
        // Enable web browsing tool
        tools: [{ type: 'web_search' }],
        tool_choice: 'auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const scores = parseEvaluationResponse(content, 'gpt-4o');

    return {
      provider: 'gpt-4o',
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      provider: 'gpt-4o',
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

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 16384,
            temperature: 0.3
          },
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const scores = parseEvaluationResponse(content, 'gemini-3-pro');

    return {
      provider: 'gemini-3-pro',
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      provider: 'gemini-3-pro',
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

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
            content: 'You are an expert legal analyst with real-time web access. Research current laws thoroughly.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 16384,
        temperature: 0.3,
        // Grok has native web search
        search: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const scores = parseEvaluationResponse(content, 'grok-4');

    return {
      provider: 'grok-4',
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      provider: 'grok-4',
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

  try {
    const prompt = buildEvaluationPrompt(city1, city2, metrics, true);

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
            content: 'You are an expert legal analyst. Use your web search capabilities to find accurate, current data.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 16384,
        temperature: 0.3,
        // Perplexity has native search
        return_citations: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const scores = parseEvaluationResponse(content, 'perplexity');

    return {
      provider: 'perplexity',
      success: true,
      scores,
      latencyMs: Date.now() - startTime
    };
  } catch (error) {
    return {
      provider: 'perplexity',
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
  provider: LLMProvider
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

    // Convert to LLMMetricScore format (one per city per metric)
    const scores: LLMMetricScore[] = [];

    evaluations.forEach((eval_: LLMEvaluation) => {
      // City 1 scores
      scores.push({
        metricId: eval_.metricId,
        rawValue: eval_.city1LegalScore,
        normalizedScore: Math.round((eval_.city1LegalScore + eval_.city1EnforcementScore) / 2),
        legalScore: eval_.city1LegalScore,
        enforcementScore: eval_.city1EnforcementScore,
        confidence: eval_.confidence,
        llmProvider: provider,
        explanation: eval_.reasoning,
        sources: eval_.sources,
        city: 'city1'
      });

      // City 2 scores
      scores.push({
        metricId: eval_.metricId,
        rawValue: eval_.city2LegalScore,
        normalizedScore: Math.round((eval_.city2LegalScore + eval_.city2EnforcementScore) / 2),
        legalScore: eval_.city2LegalScore,
        enforcementScore: eval_.city2EnforcementScore,
        confidence: eval_.confidence,
        llmProvider: provider,
        explanation: eval_.reasoning,
        sources: eval_.sources,
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

  if (apiKeys.google) {
    onProgress?.('gemini-3-pro', 'started');
    evaluatorPromises.push(
      evaluateWithGemini(apiKeys.google, city1, city2, metrics)
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
        if (!apiKeys.google) {
          throw new Error('Google API key not configured');
        }
        onProgress?.('evaluating');
        result = await evaluateWithGemini(apiKeys.google, city1, city2, metrics);
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
async function evaluateCategoryBatch(
  provider: LLMProvider,
  city1: string,
  city2: string,
  _categoryId: CategoryId, // Reserved for future logging/debugging
  metrics: MetricDefinition[],
  apiKeys: LLMAPIKeys & { tavily?: string }
): Promise<{ success: boolean; scores: LLMMetricScore[]; latencyMs: number; error?: string }> {
  const startTime = Date.now();

  try {
    let result: EvaluatorResult;

    switch (provider) {
      case 'claude-sonnet':
        result = await evaluateWithClaude(apiKeys.anthropic!, apiKeys.tavily, city1, city2, metrics);
        break;
      case 'gpt-4o':
        result = await evaluateWithGPT4o(apiKeys.openai!, city1, city2, metrics);
        break;
      case 'gemini-3-pro':
        result = await evaluateWithGemini(apiKeys.google!, city1, city2, metrics);
        break;
      case 'grok-4':
        result = await evaluateWithGrok(apiKeys.xai!, city1, city2, metrics);
        break;
      case 'perplexity':
        result = await evaluateWithPerplexity(apiKeys.perplexity!, city1, city2, metrics);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return {
      success: result.success,
      scores: result.scores,
      latencyMs: Date.now() - startTime,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      scores: [],
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run a single LLM evaluator with category batching (6 parallel requests)
 * This is the Phase 2 implementation that prevents timeout by splitting work
 */
export async function runSingleEvaluatorBatched(
  provider: LLMProvider,
  city1: string,
  city2: string,
  apiKeys: LLMAPIKeys & { tavily?: string },
  onCategoryProgress?: (progress: CategoryBatchProgress[]) => void
): Promise<BatchedEvaluatorResult> {
  const startTime = Date.now();

  // Validate API key for provider
  const keyMap: Record<LLMProvider, keyof LLMAPIKeys> = {
    'claude-opus': 'anthropic',
    'claude-sonnet': 'anthropic',
    'gpt-4o': 'openai',
    'gemini-3-pro': 'google',
    'grok-4': 'xai',
    'perplexity': 'perplexity'
  };

  const requiredKey = keyMap[provider];
  if (!apiKeys[requiredKey]) {
    return {
      provider,
      success: false,
      scores: [],
      error: `${provider} API key not configured`,
      latencyMs: 0,
      categoryResults: new Map()
    };
  }

  // Initialize progress for all 6 categories
  const progressState: CategoryBatchProgress[] = CATEGORIES.map(cat => ({
    categoryId: cat.id as CategoryId,
    categoryName: cat.name,
    status: 'pending',
    metricsCount: cat.metricCount
  }));

  onCategoryProgress?.(progressState);

  // Create batch promises for all 6 categories in parallel
  const categoryPromises = CATEGORIES.map(async (category) => {
    const categoryId = category.id as CategoryId;
    const metrics = getMetricsByCategory(categoryId);

    // Update progress to running
    const idx = progressState.findIndex(p => p.categoryId === categoryId);
    if (idx >= 0) {
      progressState[idx].status = 'running';
      onCategoryProgress?.([...progressState]);
    }

    const result = await evaluateCategoryBatch(
      provider,
      city1,
      city2,
      categoryId,
      metrics,
      apiKeys
    );

    // Update progress to completed/failed
    if (idx >= 0) {
      progressState[idx].status = result.success ? 'completed' : 'failed';
      onCategoryProgress?.([...progressState]);
    }

    return { categoryId, result };
  });

  // Wait for all categories to complete
  const results = await Promise.all(categoryPromises);

  // Aggregate results
  const categoryResults = new Map<CategoryId, {
    success: boolean;
    scores: LLMMetricScore[];
    latencyMs: number;
    error?: string;
  }>();

  const allScores: LLMMetricScore[] = [];
  let overallSuccess = true;
  const errors: string[] = [];

  results.forEach(({ categoryId, result }) => {
    categoryResults.set(categoryId, result);
    allScores.push(...result.scores);
    if (!result.success) {
      overallSuccess = false;
      if (result.error) errors.push(`${categoryId}: ${result.error}`);
    }
  });

  return {
    provider,
    success: overallSuccess,
    scores: allScores,
    latencyMs: Date.now() - startTime,
    error: errors.length > 0 ? errors.join('; ') : undefined,
    categoryResults
  };
}
