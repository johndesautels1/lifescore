/**
 * LIFE SCORE - Shared JWT Auth Helper
 * Verifies Supabase JWT from the Authorization header.
 *
 * Usage:
 *   const authResult = await requireAuth(req, res);
 *   if (!authResult) return; // 401 already sent
 *   const { userId, email } = authResult;
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { FOUNDER_ADMIN_EMAILS } from './plans.js';

// ============================================================================
// SUPABASE CLIENT (module-level, reused across requests)
// ============================================================================

// Trimmed: a pasted setting can carry a line break (the built page's address did, 2026-10-03).
const supabaseUrl = (
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
).trim();
const supabaseAnonKey = (
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
).trim();

/**
 * The browser's public Supabase settings, served by /api/public-config when a
 * build leaves them out (src/lib/publicConfig.ts). The anon key is public by
 * design — it ships in every visitor's page; row-level security protects data.
 */
export function publicSupabaseSettings(): { url: string; anonKey: string } {
  return { url: supabaseUrl, anonKey: supabaseAnonKey };
}

// ============================================================================
// AUTH RESULT TYPE
// ============================================================================

export interface AuthResult {
  userId: string;
  email: string;
}

// ============================================================================
// REQUIRE AUTH
// ============================================================================

/**
 * Verify JWT from Authorization: Bearer <token> header.
 * Returns { userId, email } on success, or null if auth failed (401 already sent).
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthResult | null> {
  // Extract Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[auth] Supabase URL or anon key not configured');
    res.status(500).json({ error: 'Auth service not configured' });
    return null;
  }

  // Create a per-request client with the user's token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  return {
    userId: user.id,
    email: user.email || '',
  };
}

// ============================================================================
// ADMIN EMAILS
// ============================================================================

/**
 * Single source of truth for the admin email list: the founder accounts in
 * ./plans.ts (the same list the screens use) plus any comma-separated emails
 * in the DEV_BYPASS_EMAILS environment variable.
 */
export function getAdminEmails(): string[] {
  const fromEnv = (process.env.DEV_BYPASS_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...FOUNDER_ADMIN_EMAILS, ...fromEnv]));
}
