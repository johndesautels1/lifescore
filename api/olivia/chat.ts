/**
 * LIFE SCORE - Olivia Chat API
 * Main chat endpoint using OpenAI Assistants API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const OPENAI_TIMEOUT_MS = 60000; // 60 seconds for assistant responses
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_3wbVjyY629u7fDylaK0s5gsM';

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  threadId?: string;
  message: string;
  context?: any; // LifeScoreContext
  textSummary?: string; // Pre-built text summary from context API
  generateAudio?: boolean;
}

interface OpenAIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: { value: string };
  }>;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAIRun {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'requires_action';
  thread_id: string;
  required_action?: {
    type: 'submit_tool_outputs';
    submit_tool_outputs: {
      tool_calls: ToolCall[];
    };
  };
  // Token usage (available after completion)
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get OpenAI API key
 */
function getOpenAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return key;
}

/**
 * Strip OpenAI citation annotations from response text
 * These look like: 【4:9†OLIVIA_KNOWLEDGE_BASE.md】
 */
function stripCitations(text: string): string {
  // Match patterns like 【number:number†filename】
  return text.replace(/【\d+:\d+†[^\】]+】/g, '').trim();
}

/**
 * Build context message for Olivia with ALL 100 metrics
 */
function buildContextMessage(context: any, textSummary?: string): string {
  if (!context) return '';

  // If we have a pre-built text summary, use it (more comprehensive)
  if (textSummary) {
    return `\n\n---\n${textSummary}\n---\n\nUse all the data above to answer user questions about this comparison. You have access to ALL 100 METRICS - be specific with scores and reference any metric the user asks about.`;
  }

  // Fallback: build from context object
  const { comparison, categories, topMetrics, consensus, evidence } = context;

  let contextStr = `\n\n---\n## CURRENT COMPARISON DATA\n\n`;

  // Overview
  contextStr += `### Overview\n`;
  contextStr += `- **Cities Compared:** ${comparison.city1.name}, ${comparison.city1.country} vs ${comparison.city2.name}, ${comparison.city2.country}\n`;
  contextStr += `- **Winner:** ${comparison.winner}\n`;
  contextStr += `- **Score Difference:** ${comparison.scoreDifference} points\n`;
  contextStr += `- **${comparison.city1.name} Total Score:** ${comparison.city1.normalizedScore}/100\n`;
  contextStr += `- **${comparison.city2.name} Total Score:** ${comparison.city2.normalizedScore}/100\n`;
  contextStr += `- **Comparison ID:** ${comparison.comparisonId}\n`;
  contextStr += `- **Generated:** ${comparison.generatedAt}\n\n`;

  // Category breakdown
  contextStr += `### Category Breakdown\n`;
  contextStr += `| Category | ${comparison.city1.name} | ${comparison.city2.name} | Winner |\n`;
  contextStr += `|----------|----------|----------|--------|\n`;
  categories.forEach((cat: any) => {
    const winner = cat.winner === 'city1' ? comparison.city1.name :
                   cat.winner === 'city2' ? comparison.city2.name : 'Tie';
    contextStr += `| ${cat.name} | ${cat.city1Score} | ${cat.city2Score} | ${winner} |\n`;
  });
  contextStr += `\n`;

  // ALL metrics (not just top 10)
  if (topMetrics && topMetrics.length > 0) {
    contextStr += `### All ${topMetrics.length} Metrics\n`;

    // Group by category
    const metricsByCategory: Record<string, any[]> = {};
    topMetrics.forEach((m: any) => {
      const cat = m.category || 'Other';
      if (!metricsByCategory[cat]) metricsByCategory[cat] = [];
      metricsByCategory[cat].push(m);
    });

    Object.entries(metricsByCategory).forEach(([catName, metrics]) => {
      contextStr += `\n#### ${catName}\n`;
      contextStr += `| Metric | ${comparison.city1.name} | ${comparison.city2.name} |\n`;
      contextStr += `|--------|---------|----------|\n`;
      metrics.forEach((m: any) => {
        contextStr += `| ${m.name} | ${m.city1Score} | ${m.city2Score} |\n`;
      });
    });
    contextStr += `\n`;
  }

  // Consensus info (enhanced mode)
  if (consensus) {
    contextStr += `### Multi-LLM Consensus\n`;
    contextStr += `- **LLMs Used:** ${consensus.llmsUsed.join(', ')}\n`;
    contextStr += `- **Final Judge:** ${consensus.judgeModel}\n`;
    contextStr += `- **Overall Confidence:** ${consensus.overallConfidence}\n`;
    if (consensus.disagreementSummary) {
      contextStr += `- **Disagreement Summary:** ${consensus.disagreementSummary}\n`;
    }
    if (consensus.topDisagreements && consensus.topDisagreements.length > 0) {
      contextStr += `\n**Top Disagreements:**\n`;
      consensus.topDisagreements.forEach((d: any) => {
        contextStr += `- ${d.metricName}: StdDev=${d.standardDeviation.toFixed(1)} - ${d.explanation}\n`;
      });
    }
    contextStr += `\n`;
  }

  // Evidence sources (limited)
  if (evidence && evidence.length > 0) {
    contextStr += `### Evidence Sources\n`;
    const uniqueSources = new Set<string>();
    evidence.slice(0, 10).forEach((e: any) => {
      e.sources.forEach((s: any) => {
        if (!uniqueSources.has(s.url)) {
          uniqueSources.add(s.url);
          contextStr += `- [${e.metricName}] ${s.url}\n`;
        }
      });
    });
    contextStr += `\n`;
  }

  contextStr += `---\n\nUse the data above to answer user questions about this comparison. You have access to ALL ${topMetrics?.length || 0} METRICS - be specific with scores.`;

  return contextStr;
}

// ============================================================================
// FUNCTION CALLING - FIELD EVIDENCE
// ============================================================================

/**
 * Call the field-evidence API to get sources for a metric
 */
async function callFieldEvidenceAPI(
  comparisonId: string,
  metricId: string,
  city?: string
): Promise<string> {
  try {
    // Use internal API call (same server)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'https://clueslifescore.com';

    const response = await fetchWithTimeout(
      `${baseUrl}/api/olivia/field-evidence`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparisonId, metricId, city }),
      },
      10000
    );

    if (!response.ok) {
      return JSON.stringify({ error: 'Could not fetch evidence', metricId });
    }

    const data = await response.json();
    return JSON.stringify(data);
  } catch (error) {
    console.error('[OLIVIA/CHAT] Field evidence API error:', error);
    return JSON.stringify({ error: 'Evidence lookup failed', metricId });
  }
}

/**
 * Handle tool calls from the assistant
 */
async function handleToolCalls(
  toolCalls: ToolCall[],
  comparisonId?: string
): Promise<Array<{ tool_call_id: string; output: string }>> {
  const outputs: Array<{ tool_call_id: string; output: string }> = [];

  for (const toolCall of toolCalls) {
    if (toolCall.function.name === 'getFieldEvidence') {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await callFieldEvidenceAPI(
        args.comparisonId || comparisonId || '',
        args.metricId,
        args.city
      );
      outputs.push({ tool_call_id: toolCall.id, output: result });
      console.log('[OLIVIA/CHAT] Tool call result for', args.metricId, ':', result.substring(0, 100));
    } else {
      // Unknown function - return error
      outputs.push({
        tool_call_id: toolCall.id,
        output: JSON.stringify({ error: `Unknown function: ${toolCall.function.name}` }),
      });
    }
  }

  return outputs;
}

/**
 * Submit tool outputs back to the run
 */
async function submitToolOutputs(
  apiKey: string,
  threadId: string,
  runId: string,
  toolOutputs: Array<{ tool_call_id: string; output: string }>
): Promise<OpenAIRun> {
  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({ tool_outputs: toolOutputs }),
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit tool outputs: ${error}`);
  }

  return response.json();
}

// ============================================================================
// OPENAI ASSISTANTS API FUNCTIONS
// ============================================================================

/**
 * Create a new thread
 */
async function createThread(apiKey: string): Promise<string> {
  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({}),
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create thread: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Add a message to thread
 */
async function addMessage(
  apiKey: string,
  threadId: string,
  content: string,
  role: 'user' | 'assistant' = 'user'
): Promise<string> {
  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads/${threadId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify({ role, content }),
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add message: ${error}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Run the assistant on a thread
 */
async function createRun(
  apiKey: string,
  threadId: string,
  assistantId: string,
  additionalInstructions?: string
): Promise<OpenAIRun> {
  const body: any = { assistant_id: assistantId };
  if (additionalInstructions) {
    body.additional_instructions = additionalInstructions;
  }

  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads/${threadId}/runs`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
      body: JSON.stringify(body),
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create run: ${error}`);
  }

  return response.json();
}

/**
 * Poll run status until complete, handling tool calls automatically
 */
async function waitForRun(
  apiKey: string,
  threadId: string,
  runId: string,
  comparisonId?: string,
  maxAttempts: number = 60
): Promise<OpenAIRun> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetchWithTimeout(
      `${OPENAI_API_BASE}/threads/${threadId}/runs/${runId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2',
        },
      },
      OPENAI_TIMEOUT_MS
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get run status: ${error}`);
    }

    const run: OpenAIRun = await response.json();

    if (run.status === 'completed') {
      return run;
    }

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run ${run.status}`);
    }

    // Handle tool calls (function calling)
    if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      console.log('[OLIVIA/CHAT] Handling', toolCalls.length, 'tool calls');

      // Execute the tool calls
      const toolOutputs = await handleToolCalls(toolCalls, comparisonId);

      // Submit the results back to OpenAI
      await submitToolOutputs(apiKey, threadId, runId, toolOutputs);
      console.log('[OLIVIA/CHAT] Submitted tool outputs, continuing run');

      // Continue polling (don't count this as an attempt)
      continue;
    }

    // Wait 500ms before next poll (reduced from 1000ms for faster response)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error('Run timed out');
}

/**
 * List runs on a thread to check for active ones
 */
async function listRuns(
  apiKey: string,
  threadId: string,
  limit: number = 10
): Promise<OpenAIRun[]> {
  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads/${threadId}/runs?limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list runs: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Cancel an active run
 */
async function cancelRun(
  apiKey: string,
  threadId: string,
  runId: string
): Promise<OpenAIRun> {
  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads/${threadId}/runs/${runId}/cancel`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to cancel run: ${error}`);
  }

  return response.json();
}

/**
 * Check for and cancel any active runs on a thread
 * Returns true if runs were cancelled, false if no active runs
 */
async function cancelActiveRuns(apiKey: string, threadId: string): Promise<boolean> {
  const runs = await listRuns(apiKey, threadId, 5);
  const activeStatuses = ['queued', 'in_progress', 'requires_action'];
  const activeRuns = runs.filter(run => activeStatuses.includes(run.status));

  if (activeRuns.length === 0) {
    return false;
  }

  console.log('[OLIVIA/CHAT] Found', activeRuns.length, 'active run(s), cancelling...');

  for (const run of activeRuns) {
    try {
      await cancelRun(apiKey, threadId, run.id);
      console.log('[OLIVIA/CHAT] Cancelled run:', run.id);
    } catch (err) {
      // Run may have already completed/cancelled, ignore
      console.log('[OLIVIA/CHAT] Could not cancel run:', run.id, err);
    }
  }

  // Wait for cancellation to take effect - poll until no active runs
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const checkRuns = await listRuns(apiKey, threadId, 5);
    const stillActive = checkRuns.filter(run => activeStatuses.includes(run.status));
    if (stillActive.length === 0) {
      console.log('[OLIVIA/CHAT] All runs cancelled successfully');
      return true;
    }
    console.log('[OLIVIA/CHAT] Still waiting for', stillActive.length, 'run(s) to cancel...');
  }

  console.log('[OLIVIA/CHAT] Warning: Some runs may still be active after cancellation attempts');
  return true;
}

/**
 * Get messages from thread
 */
async function getMessages(
  apiKey: string,
  threadId: string,
  limit: number = 1
): Promise<OpenAIMessage[]> {
  const response = await fetchWithTimeout(
    `${OPENAI_API_BASE}/threads/${threadId}/messages?limit=${limit}&order=desc`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2',
      },
    },
    OPENAI_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get messages: ${error}`);
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - open for chat
  if (handleCors(req, res, 'open')) return;

  // Rate limiting - standard preset for chat
  if (!applyRateLimit(req.headers, 'olivia-chat', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getOpenAIKey();
    const { threadId: existingThreadId, message, context, textSummary } = req.body as ChatRequest;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    console.log('[OLIVIA/CHAT] Processing message:', message.substring(0, 50) + '...');

    // Create or use existing thread
    let threadId = existingThreadId;
    let isNewThread = false;
    if (!threadId) {
      threadId = await createThread(apiKey);
      isNewThread = true;
      console.log('[OLIVIA/CHAT] Created new thread:', threadId);
    } else {
      // Existing thread - check for and cancel any active runs before adding message
      try {
        const hadActiveRuns = await cancelActiveRuns(apiKey, threadId);
        if (hadActiveRuns) {
          console.log('[OLIVIA/CHAT] Cancelled active runs on existing thread');
        }
      } catch (err) {
        console.warn('[OLIVIA/CHAT] Could not check/cancel active runs:', err);
        // Continue anyway - the addMessage will fail if runs are still active
      }
    }

    // Build context instructions for this conversation (with ALL 100 metrics)
    let additionalInstructions: string | undefined;
    if (context && isNewThread) {
      additionalInstructions = buildContextMessage(context, textSummary);
      console.log('[OLIVIA/CHAT] Added context with', context?.topMetrics?.length || 0, 'metrics, length:', additionalInstructions.length);
    }

    // Add user message to thread with retry on active run error
    let messageAdded = false;
    for (let attempt = 0; attempt < 3 && !messageAdded; attempt++) {
      try {
        await addMessage(apiKey, threadId, message, 'user');
        messageAdded = true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (errorMsg.includes('while a run') && errorMsg.includes('is active')) {
          console.log('[OLIVIA/CHAT] Active run detected, cancelling and retrying (attempt', attempt + 1, ')');
          await cancelActiveRuns(apiKey, threadId);
        } else {
          throw err; // Re-throw non-active-run errors
        }
      }
    }
    if (!messageAdded) {
      throw new Error('Failed to add message after multiple attempts - thread may have stuck runs');
    }

    // Run the assistant
    const run = await createRun(apiKey, threadId, ASSISTANT_ID, additionalInstructions);
    console.log('[OLIVIA/CHAT] Created run:', run.id);

    // Extract comparisonId for function calling
    const comparisonId = context?.comparison?.comparisonId;

    // Wait for completion (handles tool calls automatically)
    const completedRun = await waitForRun(apiKey, threadId, run.id, comparisonId);
    console.log('[OLIVIA/CHAT] Run completed');

    // Log token usage for cost tracking
    if (completedRun.usage) {
      console.log(`[OLIVIA/CHAT] Token usage: ${completedRun.usage.prompt_tokens} in / ${completedRun.usage.completion_tokens} out`);
    }

    // Get the assistant's response
    const messages = await getMessages(apiKey, threadId, 1);
    const assistantMessage = messages.find(m => m.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('No assistant response received');
    }

    const rawResponse = assistantMessage.content
      .filter(c => c.type === 'text')
      .map(c => c.text.value)
      .join('\n');

    // Strip citation annotations like 【4:9†OLIVIA_KNOWLEDGE_BASE.md】
    const responseText = stripCitations(rawResponse);

    console.log('[OLIVIA/CHAT] Response length:', responseText.length);

    res.status(200).json({
      threadId,
      messageId: assistantMessage.id,
      response: responseText,
      // Include token usage for cost tracking
      usage: completedRun.usage ? {
        inputTokens: completedRun.usage.prompt_tokens,
        outputTokens: completedRun.usage.completion_tokens,
      } : undefined,
    });
  } catch (error) {
    console.error('[OLIVIA/CHAT] Error:', error);

    const message = error instanceof Error ? error.message : 'Chat request failed';
    const isNotFound = message.includes('not found') || message.includes('404');

    res.status(isNotFound ? 404 : 500).json({
      error: message,
      type: isNotFound ? 'assistant_not_found' : 'chat_api_error',
    });
  }
}
