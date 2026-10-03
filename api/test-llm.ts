/**
 * LIFE SCORE - AI provider check (admins only)
 * GET /api/test-llm?provider=claude|gpt|gemini|grok|perplexity  (all when omitted)
 *
 * Sends one tiny request to each evaluator through the SAME shared connection
 * and model the real comparison uses (api/shared/*.ts, AI_MODELS), so a green
 * result proves the real path, not a copy of it.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { requireAdmin } from './shared/entitlements.js';
import { callClaude } from './shared/anthropic.js';
import { callOpenAI } from './shared/openai.js';
import { callGemini } from './shared/gemini.js';
import { callGrok } from './shared/xai.js';
import { callPerplexity } from './shared/perplexity.js';
import { AI_MODELS } from './shared/models.js';
import type { LlmResult } from './shared/llm.js';

/** Thinking models need a moment even for "Say ok". */
const TEST_TIMEOUT_MS = 45_000;
const ASK = 'Reply with the single word: ok';

interface TestResult {
  success: boolean;
  model: string;
  message: string;
  latencyMs: number;
}

async function timed(model: string, run: () => Promise<LlmResult>): Promise<TestResult> {
  const startTime = Date.now();
  const reply = await run();
  const latencyMs = Date.now() - startTime;
  return reply.ok
    ? { success: true, model, message: `Response from ${reply.servedBy}: ${reply.text.slice(0, 50)}`, latencyMs }
    : { success: false, model, message: reply.message.slice(0, 300), latencyMs };
}

const TESTS: Record<string, () => Promise<TestResult>> = {
  claude: () =>
    timed(AI_MODELS.claudeEvaluator.id, async () => {
      const reply = await callClaude({
        model: AI_MODELS.claudeEvaluator.id,
        maxTokens: 2000,
        effort: 'low',
        messages: [{ role: 'user', content: ASK }],
        timeoutMs: TEST_TIMEOUT_MS,
        retries: 0,
        label: 'test-claude',
      });
      return reply.ok
        ? { ok: true, text: reply.text, usage: { inputTokens: reply.usage.inputTokens, outputTokens: reply.usage.outputTokens }, citations: [], servedBy: reply.servedBy }
        : { ok: false, kind: reply.kind, message: reply.message, status: reply.status };
    }),
  gpt: () =>
    timed(AI_MODELS.gptEvaluator.id, () =>
      callOpenAI({ model: AI_MODELS.gptEvaluator.id, system: 'You are a connectivity check.', user: ASK, maxOutputTokens: 2000, effort: 'low', timeoutMs: TEST_TIMEOUT_MS, retries: 0, label: 'test-gpt' }),
    ),
  gemini: () =>
    timed(AI_MODELS.geminiEvaluator.id, () =>
      callGemini({ model: AI_MODELS.geminiEvaluator.id, system: 'You are a connectivity check.', user: ASK, maxOutputTokens: 200, temperature: 0.2, googleSearch: false, timeoutMs: TEST_TIMEOUT_MS, retries: 0, label: 'test-gemini' }),
    ),
  grok: () =>
    timed(AI_MODELS.grokEvaluator.id, () =>
      callGrok({ model: AI_MODELS.grokEvaluator.id, system: 'You are a connectivity check.', user: ASK, maxOutputTokens: 2000, effort: 'low', temperature: 0.2, webSearch: false, timeoutMs: TEST_TIMEOUT_MS, retries: 0, label: 'test-grok' }),
    ),
  perplexity: () =>
    timed(`preset:${AI_MODELS.perplexityEvaluator.id}`, () =>
      callPerplexity({ preset: AI_MODELS.perplexityEvaluator.id, instructions: 'You are a connectivity check.', input: ASK, maxOutputTokens: 200, timeoutMs: TEST_TIMEOUT_MS, retries: 0, label: 'test-perplexity' }),
    ),
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - same app only; this route spends money on every call
  if (handleCors(req, res, 'same-app', { methods: 'GET, POST, OPTIONS' })) return;

  // Rate limiting - light preset for test calls
  if (!applyRateLimit(req.headers, 'test-llm', 'light', res)) {
    return; // 429 already sent
  }

  // Admins only — it calls every AI provider (was open to anyone before 2026-10-03)
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
  if (provider && !(provider in TESTS)) {
    return res.status(400).json({ error: `provider must be one of: ${Object.keys(TESTS).join(', ')}` });
  }

  const names = provider ? [provider] : Object.keys(TESTS);
  const settled = await Promise.all(names.map(async (name) => [name, await TESTS[name]()] as const));
  const results = Object.fromEntries(settled);
  const allSuccess = settled.every(([, r]) => r.success);

  console.log(`[TEST-LLM] Results: ${JSON.stringify(results)}`);

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    allSuccess,
    results,
  });
}
