/**
 * ============================================================================
 * DEAD CODE ARCHIVE - LIFESCORE
 * ============================================================================
 *
 * Archived: 2026-01-20
 * Conversation ID: LIFESCORE-2026-0120-CONTINUE
 *
 * This file contains code that was identified as dead/unused during code audit.
 * The code was replaced by newer implementations that use Vercel serverless
 * functions (/api/evaluate, /api/judge) instead of direct client-side API calls.
 *
 * WHY THIS CODE IS DEAD:
 * - The app now uses LLMSelector component with runSingleEvaluatorBatched()
 * - runSingleEvaluatorBatched() calls /api/evaluate (server-side)
 * - The old flow (EnhancedComparisonContainer -> runEnhancedComparison ->
 *   runAllEvaluators -> evaluateWith*) is no longer used
 *
 * TO RESTORE:
 * 1. Copy the relevant function(s) back to the original file
 * 2. Ensure all imports are present
 * 3. Update any callers to use the restored function
 *
 * ORIGINAL FILES:
 * - src/services/llmEvaluators.ts (lines 257-1197)
 * - src/services/enhancedComparison.ts (lines 82-348)
 * - src/components/EnhancedComparison.tsx (lines 1616-1701)
 *
 * ============================================================================
 */

// ============================================================================
// FROM: src/services/llmEvaluators.ts
// LINES: 257-393 (137 lines)
// FUNCTION: evaluateWithClaude
// CALLED BY: runAllEvaluators(), runSingleEvaluator()
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
        ...searchQueries.map(q => tavilySearch(tavilyKey, q, 5).catch((): TavilyResponse => ({ results: [], answer: undefined })))
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
// FROM: src/services/llmEvaluators.ts
// LINES: 395-574 (180 lines)
// FUNCTION: evaluateWithGPT4o
// CALLED BY: runAllEvaluators(), runSingleEvaluator()
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

  // JSON Schema for structured output
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
      if (!data.output_text) {
        throw new Error('OpenAI returned empty or malformed response');
      }
      return data.output_text;
    });

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
// FROM: src/services/llmEvaluators.ts
// LINES: 576-687 (112 lines)
// FUNCTION: evaluateWithGemini
// CALLED BY: runAllEvaluators(), runSingleEvaluator()
// ============================================================================

export async function evaluateWithGemini(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'gemini-3-pro';

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
            safetySettings: [
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' }
            ],
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
// FROM: src/services/llmEvaluators.ts
// LINES: 689-780 (92 lines)
// FUNCTION: evaluateWithGrok
// CALLED BY: runAllEvaluators(), runSingleEvaluator()
// ============================================================================

export async function evaluateWithGrok(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'grok-4';

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
// FROM: src/services/llmEvaluators.ts
// LINES: 782-928 (147 lines)
// FUNCTION: evaluateWithPerplexity
// CALLED BY: runAllEvaluators(), runSingleEvaluator()
// ============================================================================

export async function evaluateWithPerplexity(
  apiKey: string,
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): Promise<EvaluatorResult> {
  const startTime = Date.now();
  const provider: LLMProvider = 'perplexity';

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
        throw new Error(`Perplexity API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const messages = data.output ?? [];
      const last = messages[messages.length - 1];
      const contentArr = last?.content ?? [];
      const textPart = contentArr.find((c: { type: string }) => c.type === 'text' || c.type === 'output_text');
      let rawText = textPart?.text ?? '';

      if (!rawText && data.choices?.[0]?.message?.content) {
        rawText = data.choices[0].message.content;
      }

      if (!rawText) {
        throw new Error('Perplexity returned empty response - no output or choices');
      }

      rawText = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      const codeMatch = rawText.match(/```json([\s\S]*?)```/i) ?? rawText.match(/```([\s\S]*?)```/);
      const candidate = codeMatch ? codeMatch[1].trim() : rawText;

      const jsonMatch = candidate.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in Perplexity output');
      }

      const extractedCitations: string[] = data.citations || [];

      return {
        content: jsonMatch[0],
        citations: extractedCitations
      };
    });

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
// FROM: src/services/llmEvaluators.ts
// LINES: 1051-1119 (69 lines)
// INTERFACE + FUNCTION: AllEvaluatorsResult + runAllEvaluators
// CALLED BY: runEnhancedComparison()
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
// FROM: src/services/llmEvaluators.ts
// LINES: 1121-1197 (77 lines)
// FUNCTION: runSingleEvaluator
// CALLED BY: None (never imported/used)
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
// TYPE STUBS (required for the above functions to compile)
// These types were imported in the original files
// ============================================================================

// Placeholder types - actual types should be imported from their source files
type LLMProvider = 'claude-sonnet' | 'gpt-4o' | 'gemini-3-pro' | 'grok-4' | 'perplexity' | 'claude-opus';
type MetricDefinition = any;
type EvaluatorResult = any;
type LLMAPIKeys = any;
type TavilyResponse = { results: any[]; answer?: string };

// Placeholder functions - these would need to be imported
declare function isCircuitOpen(provider: LLMProvider): boolean;
declare function withRetry<T>(provider: LLMProvider, fn: () => Promise<T>): Promise<T>;
declare function recordSuccess(provider: LLMProvider): void;
declare function recordFailure(provider: LLMProvider): void;
declare function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response>;
declare function buildEvaluationPrompt(city1: string, city2: string, metrics: MetricDefinition[], includeSearch: boolean): string;
declare function parseEvaluationResponse(content: string, provider: LLMProvider, city1?: string, city2?: string, citations?: string[]): any[];
declare function tavilySearch(key: string, query: string, limit: number): Promise<TavilyResponse>;
declare function tavilyResearch(key: string, city1: string, city2: string): Promise<{ report: string; sources: { title: string }[] } | null>;
declare const LLM_TIMEOUT_MS: number;
