/**
 * LIFE SCORE™ API Warmup Endpoint
 * Keeps Vercel serverless functions and Supabase connections warm.
 *
 * Called by Vercel cron every 5 minutes to prevent cold starts.
 * Also callable manually: GET /api/warmup
 *
 * Warms:
 * 1. This Vercel function's Node.js runtime (prevents ~5-10s cold start)
 * 2. Supabase PostgREST connection (prevents ~1-3s first-query delay)
 * 3. Supabase PgBouncer connection pool
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Module-level client — persists across warm invocations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow GET only (cron + manual)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const start = Date.now();
  const results: Record<string, string> = {};

  // 1. Runtime is already warm by reaching this point
  results.runtime = 'warm';

  // 2. Warm Supabase PostgREST + PgBouncer with a cheap query
  if (supabase) {
    try {
      const { error } = await supabase
        .from('judge_reports')
        .select('report_id')
        .limit(1)
        .maybeSingle();

      results.supabase = error ? `error: ${error.message}` : 'warm';
    } catch (e) {
      results.supabase = `exception: ${e instanceof Error ? e.message : 'unknown'}`;
    }
  } else {
    results.supabase = 'not configured';
  }

  const elapsed = Date.now() - start;

  return res.status(200).json({
    status: 'warm',
    elapsed_ms: elapsed,
    results,
    timestamp: new Date().toISOString(),
  });
}
