/**
 * LIFE SCORE - KV Cache Proxy API
 *
 * Server-side proxy for Vercel KV operations.
 * Keeps KV_REST_API_TOKEN out of the client bundle.
 *
 * POST /api/kv-cache
 * Body: { operation: 'get'|'set'|'del', key: string, value?: string, ex?: number }
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';

// ============================================================================
// CONFIG
// ============================================================================

const KV_BASE_URL = process.env.KV_REST_API_URL || '';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || '';
const KV_TIMEOUT_MS = 5000;

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — only authenticated users can use cache
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!KV_BASE_URL || !KV_TOKEN) {
    res.status(503).json({ error: 'KV not configured' });
    return;
  }

  const { operation, key, value, ex } = req.body || {};

  if (!operation || !key || typeof key !== 'string') {
    res.status(400).json({ error: 'operation and key are required' });
    return;
  }

  // Sanitize key — prevent path traversal
  if (key.includes('..') || key.includes('/') || key.length > 256) {
    res.status(400).json({ error: 'Invalid key' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);

    let kvRes: Response;

    switch (operation) {
      case 'get':
        kvRes = await fetch(`${KV_BASE_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
          signal: controller.signal,
        });
        break;

      case 'set':
        kvRes = await fetch(`${KV_BASE_URL}/set/${key}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${KV_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value, ex }),
          signal: controller.signal,
        });
        break;

      case 'del':
        kvRes = await fetch(`${KV_BASE_URL}/del/${key}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${KV_TOKEN}` },
          signal: controller.signal,
        });
        break;

      default:
        clearTimeout(timeout);
        res.status(400).json({ error: 'Invalid operation. Use get, set, or del.' });
        return;
    }

    clearTimeout(timeout);

    const data = await kvRes.json().catch(() => ({}));
    res.status(kvRes.ok ? 200 : kvRes.status).json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      res.status(504).json({ error: 'KV timeout' });
    } else {
      console.error('[kv-cache] Proxy error:', error);
      res.status(500).json({ error: 'KV proxy error' });
    }
  }
}
