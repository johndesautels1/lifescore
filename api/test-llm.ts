/**
 * LIFE SCORE™ LLM Test Endpoint
 * Simple endpoint to test each LLM API connection with minimal calls
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Quick timeout for test calls (15 seconds)
const TEST_TIMEOUT_MS = 15000;

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
      throw new Error(`Timeout after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

// Test Claude Sonnet
async function testClaude(): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { success: false, message: 'ANTHROPIC_API_KEY not set', latencyMs: 0 };

  const startTime = Date.now();
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
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "ok"' }]
        })
      },
      TEST_TIMEOUT_MS
    );

    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API error ${response.status}: ${errorText.slice(0, 200)}`, latencyMs };
    }

    const data = await response.json();
    return { success: true, message: `Response: ${data.content?.[0]?.text || 'ok'}`, latencyMs };
  } catch (error) {
    return { success: false, message: String(error), latencyMs: Date.now() - startTime };
  }
}

// Test GPT-4o
async function testGPT4o(): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, message: 'OPENAI_API_KEY not set', latencyMs: 0 };

  const startTime = Date.now();
  try {
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
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 10
        })
      },
      TEST_TIMEOUT_MS
    );

    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API error ${response.status}: ${errorText.slice(0, 200)}`, latencyMs };
    }

    const data = await response.json();
    return { success: true, message: `Response: ${data.choices?.[0]?.message?.content?.slice(0, 50) || 'ok'}`, latencyMs };
  } catch (error) {
    return { success: false, message: String(error), latencyMs: Date.now() - startTime };
  }
}

// Test Gemini 3 Pro
async function testGemini(): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { success: false, message: 'GEMINI_API_KEY not set', latencyMs: 0 };

  const startTime = Date.now();
  try {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "ok"' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      },
      TEST_TIMEOUT_MS
    );

    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API error ${response.status}: ${errorText.slice(0, 200)}`, latencyMs };
    }

    const data = await response.json();
    return { success: true, message: `Response: ${data.candidates?.[0]?.content?.parts?.[0]?.text || 'ok'}`, latencyMs };
  } catch (error) {
    return { success: false, message: String(error), latencyMs: Date.now() - startTime };
  }
}

// Test Grok 4
async function testGrok(): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { success: false, message: 'XAI_API_KEY not set', latencyMs: 0 };

  const startTime = Date.now();
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
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 10
        })
      },
      TEST_TIMEOUT_MS
    );

    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API error ${response.status}: ${errorText.slice(0, 200)}`, latencyMs };
    }

    const data = await response.json();
    return { success: true, message: `Response: ${data.choices?.[0]?.message?.content || 'ok'}`, latencyMs };
  } catch (error) {
    return { success: false, message: String(error), latencyMs: Date.now() - startTime };
  }
}

// Test Perplexity
async function testPerplexity(): Promise<{ success: boolean; message: string; latencyMs: number }> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return { success: false, message: 'PERPLEXITY_API_KEY not set', latencyMs: 0 };

  const startTime = Date.now();
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
          messages: [{ role: 'user', content: 'Say "ok"' }],
          max_tokens: 10
        })
      },
      TEST_TIMEOUT_MS
    );

    const latencyMs = Date.now() - startTime;
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `API error ${response.status}: ${errorText.slice(0, 200)}`, latencyMs };
    }

    const data = await response.json();
    return { success: true, message: `Response: ${data.choices?.[0]?.message?.content || 'ok'}`, latencyMs };
  } catch (error) {
    return { success: false, message: String(error), latencyMs: Date.now() - startTime };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check which LLM to test (default: all)
  const provider = req.query.provider as string | undefined;

  console.log(`[TEST-LLM] Testing provider: ${provider || 'all'}`);

  const results: Record<string, { success: boolean; message: string; latencyMs: number }> = {};

  if (!provider || provider === 'claude') {
    results.claude = await testClaude();
  }
  if (!provider || provider === 'gpt') {
    results.gpt = await testGPT4o();
  }
  if (!provider || provider === 'gemini') {
    results.gemini = await testGemini();
  }
  if (!provider || provider === 'grok') {
    results.grok = await testGrok();
  }
  if (!provider || provider === 'perplexity') {
    results.perplexity = await testPerplexity();
  }

  const allSuccess = Object.values(results).every(r => r.success);

  console.log(`[TEST-LLM] Results: ${JSON.stringify(results)}`);

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    allSuccess,
    results
  });
}
