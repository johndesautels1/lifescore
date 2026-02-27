/**
 * LIFE SCORE - App Prompts API
 *
 * Admin-editable prompt management.
 * GET  /api/prompts?category=invideo        — List prompts by category
 * GET  /api/prompts?category=invideo&key=X  — Get specific prompt
 * GET  /api/prompts?categories=true          — List all categories
 * PUT  /api/prompts                          — Update prompt (admin only)
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from './shared/cors.js';
import { requireAuth, getAdminEmails } from './shared/auth.js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function verifyAdmin(req: VercelRequest): Promise<{ email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return null;

  const email = user.email.toLowerCase();
  if (!getAdminEmails().includes(email)) return null;
  return { email };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res, 'restricted', { methods: 'GET, PUT, OPTIONS' })) return;

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

    // ── PUT: Update prompt (admin only) ───────────────────────────────
    if (req.method === 'PUT') {
      const admin = await verifyAdmin(req);
      if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id, prompt_text, display_name, description } = req.body;

      if (!id || !prompt_text) {
        return res.status(400).json({ error: 'id and prompt_text required' });
      }

      const updateData: Record<string, unknown> = {
        prompt_text,
        last_edited_by: admin.email,
      };
      if (display_name !== undefined) updateData.display_name = display_name;
      if (description !== undefined) updateData.description = description;

      const { data, error } = await supabaseAdmin
        .from('app_prompts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[prompts] Update error:', error);
        return res.status(500).json({ error: 'Failed to update prompt' });
      }

      console.log(`[prompts] Admin ${admin.email} updated prompt ${id} (v${data.version})`);
      return res.status(200).json({ success: true, prompt: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[prompts] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
