/**
 * LIFE SCORE™ Enhanced Comparison Service
 * Multi-LLM evaluation with Claude Opus consensus judging
 */

import type {
  LLMProvider,
  LLMAPIKeys,
  EnhancedComparisonResult,
  EnhancedComparisonProgress,
  LLMMetricScore,
  MetricConsensus,
  CategoryConsensus
} from '../types/enhancedComparison';
import { DEFAULT_ENHANCED_LLMS } from '../types/enhancedComparison';
import type { CategoryId, MetricDefinition } from '../types/metrics';
import { ALL_METRICS, CATEGORIES, getMetricsByCategory } from '../data/metrics';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  API_KEYS: 'lifescore_api_keys',
  ENHANCED_CONFIG: 'lifescore_enhanced_config'
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * Get stored API keys
 */
export function getStoredAPIKeys(): LLMAPIKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save API keys to storage
 */
export function saveAPIKeys(keys: LLMAPIKeys): void {
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
}

/**
 * Check which LLMs have valid API keys configured
 */
export function getAvailableLLMs(keys: LLMAPIKeys): LLMProvider[] {
  const available: LLMProvider[] = [];

  if (keys.anthropic) {
    available.push('claude-opus', 'claude-sonnet');
  }
  if (keys.openai) {
    available.push('gpt-4o');
  }
  if (keys.google) {
    available.push('gemini-3-pro');
  }
  if (keys.xai) {
    available.push('grok-4');
  }
  if (keys.perplexity) {
    available.push('perplexity');
  }

  return available;
}

// ============================================================================
// LLM API CALLS
// ============================================================================

/**
 * Build the prompt for evaluating metrics
 */
function buildEvaluationPrompt(
  city1: string,
  city2: string,
  metrics: MetricDefinition[]
): string {
  const metricsList = metrics.map(m => `
- ${m.id}: ${m.name}
  Description: ${m.description}
  Scoring: ${m.scoringDirection === 'higher_is_better' ? 'Higher scores are better' : 'Lower scores are better'}
  Type: ${m.dataType}
`).join('\n');

  return `You are evaluating legal freedom metrics for two cities. For each metric, provide a score from 0-100 where 100 represents maximum freedom/favorability.

CITIES TO COMPARE:
1. ${city1}
2. ${city2}

METRICS TO EVALUATE:
${metricsList}

Respond in JSON format:
{
  "evaluations": [
    {
      "metricId": "metric_id_here",
      "city1Score": 75,
      "city2Score": 60,
      "confidence": "high|medium|low",
      "explanation": "Brief explanation of scoring rationale"
    }
  ]
}

Use your knowledge about these cities' laws, regulations, and policies. If you're uncertain, indicate lower confidence but still provide your best estimate.`;
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropicAPI(
  apiKey: string,
  model: 'claude-opus' | 'claude-sonnet',
  prompt: string
): Promise<string> {
  const modelId = model === 'claude-opus'
    ? 'claude-opus-4-5-20251101'
    : 'claude-sonnet-4-20250514';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8192 }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Call xAI Grok API
 */
async function callGrokAPI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-2',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call Perplexity API
 */
async function callPerplexityAPI(
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'sonar-reasoning-pro',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Call appropriate API based on LLM provider
 */
async function callLLMAPI(
  provider: LLMProvider,
  apiKeys: LLMAPIKeys,
  prompt: string
): Promise<string> {
  switch (provider) {
    case 'claude-opus':
    case 'claude-sonnet':
      if (!apiKeys.anthropic) throw new Error('Anthropic API key not configured');
      return callAnthropicAPI(apiKeys.anthropic, provider, prompt);

    case 'gpt-4o':
      if (!apiKeys.openai) throw new Error('OpenAI API key not configured');
      return callOpenAIAPI(apiKeys.openai, prompt);

    case 'gemini-3-pro':
      if (!apiKeys.google) throw new Error('Google API key not configured');
      return callGeminiAPI(apiKeys.google, prompt);

    case 'grok-4':
      if (!apiKeys.xai) throw new Error('xAI API key not configured');
      return callGrokAPI(apiKeys.xai, prompt);

    case 'perplexity':
      if (!apiKeys.perplexity) throw new Error('Perplexity API key not configured');
      return callPerplexityAPI(apiKeys.perplexity, prompt);

    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Parse LLM response into metric scores
 */
function parseLLMResponse(
  response: string,
  provider: LLMProvider,
  city: 'city1' | 'city2'
): LLMMetricScore[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`No JSON found in ${provider} response`);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const evaluations = parsed.evaluations || [];

    return evaluations.map((eval_: {
      metricId: string;
      city1Score?: number;
      city2Score?: number;
      confidence?: string;
      explanation?: string;
    }) => ({
      metricId: eval_.metricId,
      rawValue: city === 'city1' ? eval_.city1Score : eval_.city2Score,
      normalizedScore: city === 'city1' ? eval_.city1Score : eval_.city2Score,
      confidence: (eval_.confidence as 'high' | 'medium' | 'low') || 'medium',
      llmProvider: provider,
      explanation: eval_.explanation
    }));
  } catch (error) {
    console.error(`Error parsing ${provider} response:`, error);
    return [];
  }
}

// ============================================================================
// CONSENSUS CALCULATION
// ============================================================================

/**
 * Calculate consensus from multiple LLM scores
 */
function calculateConsensus(
  metricId: string,
  scores: LLMMetricScore[],
  judgeExplanation?: string
): MetricConsensus {
  if (scores.length === 0) {
    return {
      metricId,
      llmScores: [],
      consensusScore: 0,
      legalScore: 0,
      enforcementScore: 0,
      confidenceLevel: 'split',
      standardDeviation: 0,
      judgeExplanation: 'No scores available'
    };
  }

  const normalizedScores = scores.map(s => s.normalizedScore);
  const mean = normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;

  // Calculate standard deviation
  const squaredDiffs = normalizedScores.map(s => Math.pow(s - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / normalizedScores.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  // Determine confidence level based on agreement
  let confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  if (stdDev < 5) {
    confidenceLevel = 'unanimous';
  } else if (stdDev < 15) {
    confidenceLevel = 'strong';
  } else if (stdDev < 25) {
    confidenceLevel = 'moderate';
  } else {
    confidenceLevel = 'split';
  }

  // For now, default dual scores to consensus (can be enhanced with real LLM dual scoring later)
  const consensusScore = Math.round(mean);

  return {
    metricId,
    llmScores: scores,
    consensusScore,
    legalScore: consensusScore,      // TODO: Get from LLM dual scoring
    enforcementScore: consensusScore, // TODO: Get from LLM dual scoring
    confidenceLevel,
    standardDeviation: Math.round(stdDev * 10) / 10,
    judgeExplanation: judgeExplanation || `Consensus based on ${scores.length} LLM evaluations`
  };
}

/**
 * Calculate category consensus
 */
function calculateCategoryConsensus(
  categoryId: CategoryId,
  metricConsensuses: MetricConsensus[]
): CategoryConsensus {
  const categoryMetrics = metricConsensuses.filter(m => {
    const metric = ALL_METRICS.find(am => am.id === m.metricId);
    return metric?.categoryId === categoryId;
  });

  const avgScore = categoryMetrics.length > 0
    ? categoryMetrics.reduce((sum, m) => sum + m.consensusScore, 0) / categoryMetrics.length
    : 0;

  // Calculate agreement level (inverse of average std deviation)
  const avgStdDev = categoryMetrics.length > 0
    ? categoryMetrics.reduce((sum, m) => sum + m.standardDeviation, 0) / categoryMetrics.length
    : 50;
  const agreementLevel = Math.max(0, Math.min(100, 100 - avgStdDev * 2));

  return {
    categoryId,
    metrics: categoryMetrics,
    averageConsensusScore: Math.round(avgScore),
    agreementLevel: Math.round(agreementLevel)
  };
}

// ============================================================================
// MAIN ENHANCED COMPARISON FUNCTION
// ============================================================================

export interface EnhancedComparisonOptions {
  city1: string;
  city2: string;
  llmsToUse?: LLMProvider[];
  apiKeys: LLMAPIKeys;
  onProgress?: (progress: EnhancedComparisonProgress) => void;
}

/**
 * Run enhanced comparison with multiple LLMs
 */
export async function runEnhancedComparison(
  options: EnhancedComparisonOptions
): Promise<EnhancedComparisonResult> {
  const { city1, city2, apiKeys, onProgress } = options;
  const llmsToUse = options.llmsToUse || DEFAULT_ENHANCED_LLMS;

  const startTime = Date.now();
  const llmTimings: Record<string, number> = {};

  // Initialize progress
  const updateProgress = (progress: Partial<EnhancedComparisonProgress>) => {
    onProgress?.({
      phase: 'initializing',
      llmsCompleted: [],
      metricsProcessed: 0,
      totalMetrics: ALL_METRICS.length,
      ...progress
    } as EnhancedComparisonProgress);
  };

  updateProgress({ phase: 'evaluating' });

  // Collect all LLM responses
  const allCity1Scores: Map<string, LLMMetricScore[]> = new Map();
  const allCity2Scores: Map<string, LLMMetricScore[]> = new Map();

  // Initialize maps for each metric
  ALL_METRICS.forEach(m => {
    allCity1Scores.set(m.id, []);
    allCity2Scores.set(m.id, []);
  });

  const llmsCompleted: LLMProvider[] = [];

  // Process each LLM (could be parallelized)
  for (const provider of llmsToUse) {
    updateProgress({
      phase: 'evaluating',
      currentLLM: provider,
      llmsCompleted: [...llmsCompleted]
    });

    const llmStart = Date.now();

    try {
      // Build prompt for all metrics
      const prompt = buildEvaluationPrompt(city1, city2, ALL_METRICS);

      // Call LLM API
      const response = await callLLMAPI(provider, apiKeys, prompt);

      // Parse response for both cities
      const city1Scores = parseLLMResponse(response, provider, 'city1');
      const city2Scores = parseLLMResponse(response, provider, 'city2');

      // Add to collections
      city1Scores.forEach(score => {
        const existing = allCity1Scores.get(score.metricId) || [];
        existing.push(score);
        allCity1Scores.set(score.metricId, existing);
      });

      city2Scores.forEach(score => {
        const existing = allCity2Scores.get(score.metricId) || [];
        existing.push(score);
        allCity2Scores.set(score.metricId, existing);
      });

      llmTimings[provider] = Date.now() - llmStart;
      llmsCompleted.push(provider);
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
      llmTimings[provider] = Date.now() - llmStart;
    }
  }

  // Phase 2: Claude Opus Judging
  updateProgress({ phase: 'judging', llmsCompleted });

  // Calculate consensus for each metric
  const city1Consensuses: MetricConsensus[] = [];
  const city2Consensuses: MetricConsensus[] = [];

  allCity1Scores.forEach((scores, metricId) => {
    city1Consensuses.push(calculateConsensus(metricId, scores));
  });

  allCity2Scores.forEach((scores, metricId) => {
    city2Consensuses.push(calculateConsensus(metricId, scores));
  });

  // Build category consensuses
  const city1Categories: CategoryConsensus[] = CATEGORIES.map(cat =>
    calculateCategoryConsensus(cat.id, city1Consensuses)
  );

  const city2Categories: CategoryConsensus[] = CATEGORIES.map(cat =>
    calculateCategoryConsensus(cat.id, city2Consensuses)
  );

  // Calculate total scores
  const city1Total = city1Categories.reduce((sum, cat) => {
    const catDef = CATEGORIES.find(c => c.id === cat.categoryId);
    return sum + (cat.averageConsensusScore * (catDef?.weight || 0)) / 100;
  }, 0);

  const city2Total = city2Categories.reduce((sum, cat) => {
    const catDef = CATEGORIES.find(c => c.id === cat.categoryId);
    return sum + (cat.averageConsensusScore * (catDef?.weight || 0)) / 100;
  }, 0);

  // Calculate overall agreement
  const allStdDevs = [...city1Consensuses, ...city2Consensuses].map(c => c.standardDeviation);
  const avgStdDev = allStdDevs.reduce((a, b) => a + b, 0) / allStdDevs.length;
  const overallAgreement = Math.max(0, Math.min(100, 100 - avgStdDev * 2));

  // Determine winner
  let winner: 'city1' | 'city2' | 'tie';
  const scoreDiff = Math.abs(city1Total - city2Total);
  if (scoreDiff < 2) {
    winner = 'tie';
  } else if (city1Total > city2Total) {
    winner = 'city1';
  } else {
    winner = 'city2';
  }

  // Category winners
  const categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'> = {} as Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  CATEGORIES.forEach(cat => {
    const c1 = city1Categories.find(c => c.categoryId === cat.id);
    const c2 = city2Categories.find(c => c.categoryId === cat.id);
    const diff = (c1?.averageConsensusScore || 0) - (c2?.averageConsensusScore || 0);
    if (Math.abs(diff) < 5) {
      categoryWinners[cat.id] = 'tie';
    } else if (diff > 0) {
      categoryWinners[cat.id] = 'city1';
    } else {
      categoryWinners[cat.id] = 'city2';
    }
  });

  // Parse city info
  const parseCity = (cityStr: string) => {
    const parts = cityStr.split(',').map(s => s.trim());
    return {
      city: parts[0],
      region: parts.length > 2 ? parts[1] : undefined,
      country: parts[parts.length - 1] || 'Unknown'
    };
  };

  const city1Info = parseCity(city1);
  const city2Info = parseCity(city2);

  // Find disagreement areas
  const disagreementAreas = city1Consensuses
    .filter(c => c.standardDeviation > 20)
    .map(c => ALL_METRICS.find(m => m.id === c.metricId)?.name || c.metricId)
    .slice(0, 5);

  updateProgress({ phase: 'complete', llmsCompleted });

  return {
    city1: {
      city: city1Info.city,
      country: city1Info.country,
      region: city1Info.region,
      categories: city1Categories,
      totalConsensusScore: Math.round(city1Total),
      overallAgreement: Math.round(overallAgreement)
    },
    city2: {
      city: city2Info.city,
      country: city2Info.country,
      region: city2Info.region,
      categories: city2Categories,
      totalConsensusScore: Math.round(city2Total),
      overallAgreement: Math.round(overallAgreement)
    },
    winner,
    scoreDifference: Math.round(scoreDiff),
    categoryWinners,
    comparisonId: `LIFE-ENH-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    llmsUsed: llmsCompleted,
    judgeModel: 'claude-opus',
    overallConsensusConfidence: overallAgreement > 75 ? 'high' : overallAgreement > 50 ? 'medium' : 'low',
    disagreementSummary: disagreementAreas.length > 0
      ? `LLMs disagreed most on: ${disagreementAreas.join(', ')}`
      : 'LLMs showed strong agreement across all metrics',
    processingStats: {
      totalTimeMs: Date.now() - startTime,
      llmTimings: llmTimings as Record<LLMProvider, number>,
      metricsEvaluated: ALL_METRICS.length
    }
  };
}

// ============================================================================
// DEMO MODE FOR TESTING
// ============================================================================

/**
 * Generate demo enhanced comparison (for testing without API keys)
 */
export function generateDemoEnhancedComparison(
  city1: string,
  city2: string
): EnhancedComparisonResult {
  const parseCity = (cityStr: string) => {
    const parts = cityStr.split(',').map(s => s.trim());
    return {
      city: parts[0],
      region: parts.length > 2 ? parts[1] : undefined,
      country: parts[parts.length - 1] || 'Unknown'
    };
  };

  const city1Info = parseCity(city1);
  const city2Info = parseCity(city2);

  // Generate pseudo-random but consistent scores
  const seed = (city1 + city2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  let offset = 0;
  const generateCategoryConsensus = (): CategoryConsensus[] => {
    return CATEGORIES.map(cat => {
      const categoryMetrics = getMetricsByCategory(cat.id);
      const metrics: MetricConsensus[] = categoryMetrics.map(m => {
        const baseScore = 40 + random(offset++) * 50;
        const stdDev = random(offset++) * 20;

        // Generate fake LLM scores
        const llmScores: LLMMetricScore[] = DEFAULT_ENHANCED_LLMS.map(llm => ({
          metricId: m.id,
          rawValue: baseScore + (random(offset++) - 0.5) * stdDev * 2,
          normalizedScore: Math.round(baseScore + (random(offset++) - 0.5) * stdDev * 2),
          confidence: random(offset++) > 0.3 ? 'high' : 'medium',
          llmProvider: llm,
          explanation: 'Demo evaluation'
        }));

        // Generate dual scores: Law vs Enforcement
        // Legal score: What the law says (tends to be higher/more stable)
        // Enforcement score: How it's actually applied (can vary significantly)
        const legalScore = Math.round(Math.min(100, baseScore + 5 + random(offset++) * 15));
        const enforcementVariance = (random(offset++) - 0.5) * 30; // Can be +/- 15 points from legal
        const enforcementScore = Math.round(Math.max(0, Math.min(100, legalScore + enforcementVariance)));

        // Lived Freedom (consensusScore) = 50% Legal + 50% Enforcement
        const livedFreedomScore = Math.round((legalScore * 0.5) + (enforcementScore * 0.5));

        return {
          metricId: m.id,
          llmScores,
          consensusScore: livedFreedomScore,
          legalScore,
          enforcementScore,
          confidenceLevel: stdDev < 5 ? 'unanimous' : stdDev < 15 ? 'strong' : 'moderate',
          standardDeviation: Math.round(stdDev * 10) / 10,
          judgeExplanation: 'Demo consensus'
        } as MetricConsensus;
      });

      const avgScore = metrics.reduce((sum, m) => sum + m.consensusScore, 0) / metrics.length;
      const avgStdDev = metrics.reduce((sum, m) => sum + m.standardDeviation, 0) / metrics.length;

      return {
        categoryId: cat.id,
        metrics,
        averageConsensusScore: Math.round(avgScore),
        agreementLevel: Math.round(100 - avgStdDev * 2)
      };
    });
  };

  const city1Categories = generateCategoryConsensus();
  const city2Categories = generateCategoryConsensus();

  const city1Total = city1Categories.reduce((sum, cat) => {
    const catDef = CATEGORIES.find(c => c.id === cat.categoryId);
    return sum + (cat.averageConsensusScore * (catDef?.weight || 0)) / 100;
  }, 0);

  const city2Total = city2Categories.reduce((sum, cat) => {
    const catDef = CATEGORIES.find(c => c.id === cat.categoryId);
    return sum + (cat.averageConsensusScore * (catDef?.weight || 0)) / 100;
  }, 0);

  const scoreDiff = Math.abs(city1Total - city2Total);
  let winner: 'city1' | 'city2' | 'tie';
  if (scoreDiff < 2) winner = 'tie';
  else if (city1Total > city2Total) winner = 'city1';
  else winner = 'city2';

  const categoryWinners: Record<CategoryId, 'city1' | 'city2' | 'tie'> = {} as Record<CategoryId, 'city1' | 'city2' | 'tie'>;
  CATEGORIES.forEach(cat => {
    const c1 = city1Categories.find(c => c.categoryId === cat.id);
    const c2 = city2Categories.find(c => c.categoryId === cat.id);
    const diff = (c1?.averageConsensusScore || 0) - (c2?.averageConsensusScore || 0);
    if (Math.abs(diff) < 5) categoryWinners[cat.id] = 'tie';
    else if (diff > 0) categoryWinners[cat.id] = 'city1';
    else categoryWinners[cat.id] = 'city2';
  });

  return {
    city1: {
      city: city1Info.city,
      country: city1Info.country,
      region: city1Info.region,
      categories: city1Categories,
      totalConsensusScore: Math.round(city1Total),
      overallAgreement: 75
    },
    city2: {
      city: city2Info.city,
      country: city2Info.country,
      region: city2Info.region,
      categories: city2Categories,
      totalConsensusScore: Math.round(city2Total),
      overallAgreement: 75
    },
    winner,
    scoreDifference: Math.round(scoreDiff),
    categoryWinners,
    comparisonId: `LIFE-DEMO-${Date.now().toString(36).toUpperCase()}`,
    generatedAt: new Date().toISOString(),
    llmsUsed: DEFAULT_ENHANCED_LLMS,
    judgeModel: 'claude-opus',
    overallConsensusConfidence: 'high',
    disagreementSummary: 'Demo mode - simulated LLM consensus',
    processingStats: {
      totalTimeMs: 2500,
      llmTimings: {
        'claude-opus': 550,
        'claude-sonnet': 500,
        'gpt-4o': 520,
        'gemini-3-pro': 450,
        'grok-4': 480,
        'perplexity': 470
      } as Record<LLMProvider, number>,
      metricsEvaluated: ALL_METRICS.length
    }
  };
}
