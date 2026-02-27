/**
 * LIFE SCORE™ API Health Check
 * Simple endpoint to verify API routing and environment variables.
 *
 * Usage:
 *   GET /api/health        — basic health check (fast, no DB)
 *   GET /api/health?db=1   — health check + Supabase DB ping
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { createClient } from '@supabase/supabase-js';

// Module-level client — reused across warm invocations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS - open for health checks
  if (handleCors(req, res, 'open', { methods: 'GET, OPTIONS' })) return;

  // Rate limiting - lenient for health checks
  if (!applyRateLimit(req.headers, 'health', 'health', res)) {
    return; // 429 already sent
  }

  const wantDb = req.query.db === '1' || req.query.db === 'true';

  const result: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Optional: ping Supabase to warm/verify DB connection
  if (wantDb && supabase) {
    const start = Date.now();
    try {
      const { error } = await supabase
        .from('judge_reports')
        .select('report_id')
        .limit(1)
        .maybeSingle();

      result.db = error ? { status: 'error', message: error.message } : { status: 'ok', latency_ms: Date.now() - start };
    } catch (e) {
      result.db = { status: 'error', message: e instanceof Error ? e.message : 'unknown' };
    }
  }

  return res.status(200).json(result);
}
