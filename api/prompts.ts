/**
 * LIFE SCORE - App Prompts API
 *
 * Read-only reference copies of prompts (the app_prompts table), for the
 * admin panel's Prompts screen. Nothing in the app reads them: the prompts
 * that run are built in the code. John, 4 Oct 2026 ("Say so, read-only") —
 * editing was removed (fault GR4 in docs/MASTER_BUG_AUDIT_20260220.md).
 *
 * GET  /api/prompts?category=invideo        — List prompts by category
 * GET  /api/prompts?category=invideo&key=X  — Get specific prompt
 * GET  /api/prompts?categories=true          — List all categories
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './shared/supabaseAdmin.js';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';

const supabaseAdmin = serviceDb;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res, 'restricted', { methods: 'GET, OPTIONS' })) return;

  try {
    // FIX AC4: Require authentication for all methods (prompts are internal IP)
    const auth = await requireAuth(req, res);
    if (!auth) return;

    // ── GET: List prompts or categories ───────────────────────────────
    if (req.method === 'GET') {
      const { category, key, categories } = req.query;

      // List all distinct categories
      if (categories === 'true') {
        const { data, error } = await supabaseAdmin
          .from('app_prompts')
          .select('category')
          .eq('is_active', true)
          .order('category');

        if (error) {
          console.error('[prompts] Categories error:', error);
          return res.status(500).json({ error: 'Failed to load categories' });
        }

        const unique = [...new Set((data || []).map(r => r.category))];
        return res.status(200).json({ categories: unique });
      }

      // Get specific prompt by category + key
      if (category && key) {
        const { data, error } = await supabaseAdmin
          .from('app_prompts')
          .select('*')
          .eq('category', category as string)
          .eq('prompt_key', key as string)
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[prompts] Lookup error:', error);
          return res.status(500).json({ error: 'Failed to load prompt' });
        }

        return res.status(200).json({ prompt: data || null });
      }

      // List all prompts in a category
      if (category) {
        const { data, error } = await supabaseAdmin
          .from('app_prompts')
          .select('id, category, prompt_key, display_name, description, version, last_edited_by, updated_at, prompt_text')
          .eq('category', category as string)
          .eq('is_active', true)
          .order('display_name');

        if (error) {
          console.error('[prompts] List error:', error);
          return res.status(500).json({ error: 'Failed to load prompts' });
        }

        return res.status(200).json({ prompts: data || [] });
      }

      return res.status(400).json({ error: 'category parameter required' });
    }

    // ── Editing was removed: the copies are reference only (see the header) ──
    if (req.method === 'PUT') {
      return res.status(405).json({
        error: 'Prompts are read-only reference copies; the prompts the app uses are in the code.',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[prompts] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
