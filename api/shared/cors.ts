/**
 * LIFE SCORE - Shared CORS Helper
 * Standardized CORS headers for all API endpoints
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { VercelResponse } from '@vercel/node';

// ============================================================================
// TYPES
// ============================================================================

export type CorsMode = 'restricted' | 'open' | 'same-app';

export interface CorsOptions {
  methods?: string;  // Default: 'POST, OPTIONS'
}

// ============================================================================
// CORS HELPERS
// ============================================================================

/**
 * Get the allowed origin based on mode
 * - restricted: Only allows requests from the Vercel deployment domain
 * - open: Allows requests from any origin (*)
 */
function getAllowedOrigin(mode: CorsMode): string {
  if (mode === 'restricted' || mode === 'same-app') {
    // Use Vercel's deployment URL if available, fallback to production domain
    return process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://lifescore.vercel.app';
  }
  return '*';
}

/**
 * Set CORS headers on the response
 *
 * @param res - Vercel response object
 * @param mode - 'restricted' (only Vercel domain) or 'open' (any origin)
 * @param options - Optional configuration (methods, etc.)
 *
 * @example
 * // Restricted CORS for sensitive endpoints
 * setCorsHeaders(res, 'restricted');
 *
 * @example
 * // Open CORS for public endpoints
 * setCorsHeaders(res, 'open', { methods: 'GET, POST, OPTIONS' });
 */
export function setCorsHeaders(
  res: VercelResponse,
  mode: CorsMode,
  options: CorsOptions = {}
): void {
  const { methods = 'POST, OPTIONS' } = options;

  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(mode));
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Handle OPTIONS preflight request
 * Returns true if this was an OPTIONS request (caller should return early)
 *
 * @example
 * setCorsHeaders(res, 'open');
 * if (handleOptionsRequest(req, res)) return;
 */
export function handleOptionsRequest(
  req: { method?: string },
  res: VercelResponse
): boolean {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Combined helper: Set CORS headers and handle OPTIONS in one call
 * Returns true if this was an OPTIONS request (caller should return early)
 *
 * @example
 * if (handleCors(req, res, 'restricted')) return;
 * // ... rest of handler
 */
export function handleCors(
  req: { method?: string },
  res: VercelResponse,
  mode: CorsMode,
  options: CorsOptions = {}
): boolean {
  setCorsHeaders(res, mode, options);
  return handleOptionsRequest(req, res);
}
