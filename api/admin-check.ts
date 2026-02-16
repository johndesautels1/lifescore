/**
 * LIFE SCORE - Admin Check API
 *
 * Returns whether the authenticated user has admin/developer bypass status.
 * Keeps admin email list server-side only (not in the client JS bundle).
 * Both brokerpinellas@gmail.com and cluesnomads@gmail.com are hardcoded fallbacks.
 *
 * Requires env var: DEV_BYPASS_EMAILS (comma-separated admin emails)
 *
 * GET /api/admin-check
 * Returns: { isAdmin: boolean }
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';

// ============================================================================
// ADMIN EMAIL LIST (server-side only — never sent to the client)
// ============================================================================

/**
 * Read admin emails from server-side env var (DEV_BYPASS_EMAILS, no VITE_ prefix).
 * Falls back to hardcoded list for reliability.
 */
function getAdminEmails(): string[] {
  const envEmails = (process.env.DEV_BYPASS_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  // Hardcoded fallback — ensures admin access even if env var is missing
  const fallbackEmails = ['brokerpinellas@gmail.com', 'cluesnomads@gmail.com', 'jdes7@aol.com'];

  // Merge and deduplicate
  return [...new Set([...envEmails, ...fallbackEmails])];
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — must be logged in
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(auth.email.toLowerCase());

  // Cache-Control: short cache to avoid repeated calls, but refresh often enough
  res.setHeader('Cache-Control', 'private, max-age=300'); // 5 minutes

  res.status(200).json({ isAdmin });
}
