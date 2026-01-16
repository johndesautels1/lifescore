/**
 * LIFE SCORE™ API Health Check
 * Simple endpoint to verify API routing and environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check which API keys are configured (don't expose actual keys)
  const envStatus = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
    XAI_API_KEY: !!process.env.XAI_API_KEY,
    PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
    TAVILY_API_KEY: !!process.env.TAVILY_API_KEY
  };

  const allKeysConfigured = Object.values(envStatus).every(Boolean);

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    vercel: !!process.env.VERCEL,
    apiKeys: envStatus,
    allKeysConfigured,
    message: allKeysConfigured
      ? 'All API keys configured'
      : 'Missing API keys: ' + Object.entries(envStatus).filter(([, v]) => !v).map(([k]) => k).join(', ')
  });
}
