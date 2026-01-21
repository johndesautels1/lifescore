/**
 * LIFE SCORE - Olivia Chat API
 * Main chat endpoint using OpenAI Assistants API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

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

interface OpenAIRun {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired' | 'requires_action';
  thread_id: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
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
 * Build context message for Olivia
 */
function buildContextMessage(context: any): string {
  if (!context) return '';

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

  // Top metrics with biggest differences
  if (topMetrics && topMetrics.length > 0) {
    contextStr += `### Top Metrics (Biggest Differences)\n`;
    topMetrics.slice(0, 10).forEach((m: any) => {
      contextStr += `- **${m.name}:** ${comparison.city1.name}=${m.city1Score}, ${comparison.city2.name}=${m.city2Score}`;
      if (m.judgeExplanation) {
        contextStr += ` (${m.judgeExplanation})`;
      }
      contextStr += `\n`;
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

  contextStr += `---\n\nUse the data above to answer user questions about this comparison. Be specific with scores and cite evidence when relevant.`;

  return contextStr;
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
 * Poll run status until complete
 */
async function waitForRun(
  apiKey: string,
  threadId: string,
  runId: string,
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

    // Wait 1 second before next poll
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Run timed out');
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getOpenAIKey();
    const { threadId: existingThreadId, message, context } = req.body as ChatRequest;

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
    }

    // Build context instructions for this conversation
    let additionalInstructions: string | undefined;
    if (context && isNewThread) {
      additionalInstructions = buildContextMessage(context);
      console.log('[OLIVIA/CHAT] Added context, length:', additionalInstructions.length);
    }

    // Add user message to thread
    await addMessage(apiKey, threadId, message, 'user');

    // Run the assistant
    const run = await createRun(apiKey, threadId, ASSISTANT_ID, additionalInstructions);
    console.log('[OLIVIA/CHAT] Created run:', run.id);

    // Wait for completion
    await waitForRun(apiKey, threadId, run.id);
    console.log('[OLIVIA/CHAT] Run completed');

    // Get the assistant's response
    const messages = await getMessages(apiKey, threadId, 1);
    const assistantMessage = messages.find(m => m.role === 'assistant');

    if (!assistantMessage) {
      throw new Error('No assistant response received');
    }

    const responseText = assistantMessage.content
      .filter(c => c.type === 'text')
      .map(c => c.text.value)
      .join('\n');

    console.log('[OLIVIA/CHAT] Response length:', responseText.length);

    res.status(200).json({
      threadId,
      messageId: assistantMessage.id,
      response: responseText,
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
