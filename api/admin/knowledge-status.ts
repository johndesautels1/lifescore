/**
 * LIFE SCORE - Knowledge status (admin)
 * GET /api/admin/knowledge-status
 *   → { olivia: { ok, files | missing }, emilia: { ok, files | missing },
 *       app: { files, publicFiles, passages, characters } }
 *
 * Olivia and Emilia read their instructions and manuals straight from docs/ in
 * the deployment (api/shared/knowledge.ts) — there is no "sync" step any more.
 * This check proves every file reached the live server, with its size, and how
 * much of the app the whole-app search (api/shared/appKnowledge.ts) indexed.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAdmin } from '../shared/entitlements.js';
import { loadKnowledge } from '../shared/knowledge.js';
import { appKnowledgeStats, getAppKnowledge } from '../shared/appKnowledge.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, OPTIONS' })) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const describe = (assistant: 'olivia' | 'emilia') => {
    const result = loadKnowledge(assistant);
    return result.ok ? { ok: true, files: result.files } : { ok: false, missing: result.missing };
  };

  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ olivia: describe('olivia'), emilia: describe('emilia'), app: appKnowledgeStats(getAppKnowledge()) });
}
