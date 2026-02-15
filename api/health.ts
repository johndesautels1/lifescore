/**
 * LIFE SCORE™ API Health Check
 * Simple endpoint to verify API routing and environment variables
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - open for health checks
  if (handleCors(req, res, 'open', { methods: 'GET, OPTIONS' })) return;

  // Rate limiting - lenient for health checks
  if (!applyRateLimit(req.headers, 'health', 'health', res)) {
    return; // 429 already sent
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
