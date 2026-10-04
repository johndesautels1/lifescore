/**
 * LIFE SCORE - Olivia Chat API
 *
 * POST /api/olivia/chat
 *   { message, history?, threadId?, context?, textSummary? }
 *   → { threadId, messageId, response, model, usage }
 *
 * Olivia ran on OpenAI's Assistants service until OpenAI switched it off on
 * 26 August 2026. She now runs on Claude through the shared call point
 * (api/shared/anthropic.ts), model AI_MODELS.writer:
 *   - her instructions and knowledge base are read from docs/ (api/shared/knowledge.ts)
 *     and cached by Claude, so the long knowledge base is billed in full only when it changes;
 *   - the comparison the user is viewing is added as a second cached block;
 *   - the conversation so far comes from the browser (history) — Claude keeps no threads;
 *   - get_field_evidence looks up the sources behind a metric of the user's OWN saved
 *     comparison (api/shared/fieldEvidence.ts) directly, with no internal HTTP hop.
 * Each message counts one Olivia message from the plan's monthly allowance.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'node:crypto';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { requireFeature, refundFeature } from '../shared/entitlements.js';
import {
  callClaude,
  cleanConversation,
  type ClaudeMessage,
  type ClaudeTextBlock,
  type ClaudeTool,
  type ClaudeToolResultBlock,
} from '../shared/anthropic.js';
import { AI_MODELS } from '../shared/models.js';
import { loadKnowledge } from '../shared/knowledge.js';
import { getAdminEmails } from '../shared/auth.js';
import { appKnowledgeGuide, appKnowledgeTools, isAppKnowledgeTool, runAppKnowledgeTool } from '../shared/appKnowledge.js';
import { lookupFieldEvidence } from '../shared/fieldEvidence.js';
import { readLifeScoreContext, type ContextMetric, type LifeScoreContext } from '../shared/oliviaContext.js';

// ============================================================================
// LIMITS
// ============================================================================

/** Whole request, tool rounds included (the route may run for 120 s). */
const CHAT_TIMEOUT_MS = 110_000;
const MAX_HISTORY_TURNS = 20;
const MAX_TURN_CHARS = 4_000;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 200_000;
/** Rounds of tool use per answer: room to search the app, read the lines, then answer. */
const MAX_TOOL_ROUNDS = 5;

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  threadId?: unknown;
  message?: unknown;
  history?: unknown;
  context?: unknown; // LifeScoreContext, built by /api/olivia/context and read back with readLifeScoreContext
  textSummary?: unknown; // Pre-built text summary from the context API
}

// ============================================================================
// HELPERS
// ============================================================================


/**
 * Build context message for Olivia with ALL 100 metrics
 */
function buildContextMessage(context: LifeScoreContext | null, textSummary?: string): string {
  // If we have a pre-built text summary, use it (more comprehensive)
  if (textSummary) {
    return `\n\n---\n${textSummary}\n---\n\nUse all the data above to answer user questions about this comparison. You have access to ALL 100 METRICS - be specific with scores and reference any metric the user asks about.`;
  }

  // Fallback: build from context object
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
  categories.forEach((cat) => {
    const winner = cat.winner === 'city1' ? comparison.city1.name :
                   cat.winner === 'city2' ? comparison.city2.name : 'Tie';
    contextStr += `| ${cat.name} | ${cat.city1Score} | ${cat.city2Score} | ${winner} |\n`;
  });
  contextStr += `\n`;

  // ALL metrics (not just top 10)
  if (topMetrics && topMetrics.length > 0) {
    contextStr += `### All ${topMetrics.length} Metrics\n`;

    // Group by category
    const metricsByCategory: Record<string, ContextMetric[]> = {};
    topMetrics.forEach((m) => {
      const cat = m.category || 'Other';
      if (!metricsByCategory[cat]) metricsByCategory[cat] = [];
      metricsByCategory[cat].push(m);
    });

    Object.entries(metricsByCategory).forEach(([catName, metrics]) => {
      contextStr += `\n#### ${catName}\n`;
      contextStr += `| Metric | ${comparison.city1.name} | ${comparison.city2.name} |\n`;
      contextStr += `|--------|---------|----------|\n`;
      metrics.forEach((m) => {
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
      consensus.topDisagreements.forEach((d) => {
        contextStr += `- ${d.metricName}: StdDev=${d.standardDeviation.toFixed(1)} - ${d.explanation}\n`;
      });
    }
    contextStr += `\n`;
  }

  // Evidence sources (limited)
  if (evidence && evidence.length > 0) {
    contextStr += `### Evidence Sources\n`;
    const uniqueSources = new Set<string>();
    evidence.slice(0, 10).forEach((e) => {
      e.sources.forEach((s) => {
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
// TOOL - FIELD EVIDENCE
// ============================================================================

const FIELD_EVIDENCE_TOOL: ClaudeTool = {
  name: 'get_field_evidence',
  description:
    'Look up the web sources (titles, links and quoted snippets) behind one metric of the comparison the user is ' +
    'viewing. Use it when the user asks where a score came from or wants proof. metricId is the metric id from ' +
    'the comparison data (for example "pf_01_cannabis_legal"); city narrows the sources to one of the two cities.',
  input_schema: {
    type: 'object',
    properties: {
      metricId: { type: 'string', description: 'The metric id from the comparison data.' },
      city: { type: 'string', description: 'Optional: one of the two compared cities.' },
    },
    required: ['metricId'],
    additionalProperties: false,
  },
  strict: true,
};

async function runFieldEvidenceTool(input: unknown, userId: string, comparisonId: string | undefined): Promise<string> {
  const args = (typeof input === 'object' && input !== null ? input : {}) as { metricId?: unknown; city?: unknown };
  if (typeof args.metricId !== 'string' || !args.metricId) return JSON.stringify({ error: 'metricId is required' });
  if (!comparisonId) return JSON.stringify({ error: 'No saved comparison is open, so there are no sources to look up.' });
  const result = await lookupFieldEvidence(userId, comparisonId, args.metricId, typeof args.city === 'string' ? args.city : undefined);
  return JSON.stringify(result.ok ? result.response : { error: result.error, metricId: args.metricId });
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app')) return;

  // Rate limiting - standard preset for chat
  if (!applyRateLimit(req.headers, 'olivia-chat', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = (req.body || {}) as ChatRequest;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_CHARS) {
    res.status(400).json({ error: `message is required (${MAX_MESSAGE_CHARS} characters at most)` });
    return;
  }

  // Sign-in + an Olivia plan; counts one message from this month's allowance.
  const entitled = await requireFeature(req, res, 'oliviaMinutesPerMonth', { consume: true });
  if (!entitled) return;

  const knowledge = loadKnowledge('olivia');
  if (!knowledge.ok) {
    await refundFeature(entitled.auth.userId, 'oliviaMinutesPerMonth', entitled.access.limits);
    res.status(503).json({ error: 'Olivia is unavailable right now. Please try again shortly.', type: 'knowledge_unavailable' });
    return;
  }

  try {
    const threadId = typeof body.threadId === 'string' && body.threadId ? body.threadId.slice(0, 100) : randomUUID();
    const context = readLifeScoreContext(body.context);
    const textSummary = typeof body.textSummary === 'string' ? body.textSummary : undefined;

    const panel = `\n\nMODELS IN USE TODAY\nThe judge is ${AI_MODELS.judge.name}. Claude's evaluator seat is ${AI_MODELS.claudeEvaluator.name}. You are ${AI_MODELS.writer.name}.`;
    // Whole-app knowledge (api/shared/appKnowledge.ts): admins may see code; everyone else plain words.
    const isAdmin = getAdminEmails().includes(entitled.auth.email.toLowerCase());
    const system: ClaudeTextBlock[] = [
      { type: 'text', text: knowledge.text + panel, cache_control: { type: 'ephemeral', ttl: '1h' } },
      { type: 'text', text: appKnowledgeGuide(isAdmin) },
    ];
    // The comparison the user is viewing, when there is one (always sent, so a report
    // chosen after the chat started is seen too).
    if (body.context) {
      const contextText = buildContextMessage(context, textSummary).slice(0, MAX_CONTEXT_CHARS);
      if (contextText.trim()) system.push({ type: 'text', text: contextText, cache_control: { type: 'ephemeral' } });
    }

    const messages: ClaudeMessage[] = [...cleanConversation(body.history, MAX_HISTORY_TURNS, MAX_TURN_CHARS), { role: 'user', content: message }];
    const comparisonId: string | undefined = context?.comparison.comparisonId || undefined;
    const deadline = Date.now() + CHAT_TIMEOUT_MS;
    const usage = { inputTokens: 0, outputTokens: 0 };
    let responseText = '';

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const reply = await callClaude({
        model: AI_MODELS.writer.id,
        maxTokens: 8000,
        effort: 'low', // conversation, spoken aloud — quick and natural
        system,
        messages,
        tools: round < MAX_TOOL_ROUNDS ? [FIELD_EVIDENCE_TOOL, ...appKnowledgeTools(isAdmin)] : undefined,
        timeoutMs: Math.max(5_000, deadline - Date.now()),
        label: 'olivia-chat',
      });
      if (!reply.ok) throw new Error(reply.message);

      usage.inputTokens += reply.usage.inputTokens + reply.usage.cacheReadTokens + reply.usage.cacheWriteTokens;
      usage.outputTokens += reply.usage.outputTokens;

      if (reply.stopReason !== 'tool_use' || reply.toolUses.length === 0) {
        responseText = reply.text;
        break;
      }

      // Answer every tool call in ONE user message, then let Olivia continue.
      messages.push({ role: 'assistant', content: reply.content });
      const results: ClaudeToolResultBlock[] = await Promise.all(
        reply.toolUses.map(async (call) => ({
          type: 'tool_result' as const,
          tool_use_id: call.id,
          content: call.name === FIELD_EVIDENCE_TOOL.name
            ? await runFieldEvidenceTool(call.input, entitled.auth.userId, comparisonId)
            : isAppKnowledgeTool(call.name)
              ? runAppKnowledgeTool(call.name, call.input, isAdmin)
              : JSON.stringify({ error: `Unknown tool: ${call.name}` }),
        })),
      );
      messages.push({ role: 'user', content: results });
      responseText = reply.text;
    }

    if (!responseText) throw new Error('Olivia returned no answer');

    res.status(200).json({
      threadId,
      messageId: randomUUID(),
      response: responseText,
      model: AI_MODELS.writer.id,
      usage,
    });
  } catch (error) {
    console.error('[OLIVIA/CHAT] Error:', error);
    await refundFeature(entitled.auth.userId, 'oliviaMinutesPerMonth', entitled.access.limits);
    res.status(502).json({
      error: 'Olivia could not answer just now. Please try again.',
      type: 'chat_api_error',
    });
  }
}
