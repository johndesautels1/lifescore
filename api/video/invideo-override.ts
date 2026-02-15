/**
 * LIFE SCORE - InVideo Override API
 *
 * Admin-only endpoint to manage InVideo video overrides for Court Orders.
 * When an override exists, it replaces the default Kling AI short clip
 * with a full cinematic InVideo movie.
 *
 * GET  /api/video/invideo-override?comparisonId=X&city=Y  — Lookup override
 * POST /api/video/invideo-override                        — Create/update override
 * DELETE /api/video/invideo-override?id=X                 — Deactivate override
 *
 * Admin auth: Requires authenticated user with admin email.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Admin emails authorized to manage InVideo overrides
const ADMIN_EMAILS = [
  'cluesnomads@gmail.com',
  'brokerpinellas@gmail.com',
  ...(process.env.DEV_BYPASS_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean),
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verify the request comes from an authenticated admin user.
 * Extracts user from the Authorization bearer token via Supabase.
 */
async function verifyAdmin(req: VercelRequest): Promise<{ email: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user?.email) return null;

  const email = user.email.toLowerCase();
  if (!ADMIN_EMAILS.includes(email)) return null;

  return { email };
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res, 'restricted', { methods: 'GET, POST, DELETE, OPTIONS' })) return;

  try {
    // ── GET: Lookup override (public for authenticated users) ──────────
    if (req.method === 'GET') {
      const { comparisonId, city } = req.query;

      if (!comparisonId && !city) {
        return res.status(400).json({ error: 'comparisonId or city required' });
      }

      // Use the lookup function for priority-based resolution
      if (comparisonId && city) {
        const { data, error } = await supabaseAdmin.rpc('find_invideo_override', {
          p_comparison_id: comparisonId as string,
          p_city_name: (city as string).toLowerCase(),
        });

        if (error) {
          console.error('[invideo-override] Lookup error:', error);
          return res.status(500).json({ error: 'Lookup failed' });
        }

        const override = data?.[0] || null;
        return res.status(200).json({ override });
      }

      // City-only lookup (for city-level defaults)
      if (city) {
        const { data, error } = await supabaseAdmin
          .from('invideo_overrides')
          .select('id, video_url, video_title, duration_seconds, thumbnail_url, source')
          .eq('city_name', (city as string).toLowerCase())
          .is('comparison_id', null)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
          console.error('[invideo-override] City lookup error:', error);
          return res.status(500).json({ error: 'Lookup failed' });
        }

        return res.status(200).json({ override: data || null });
      }

      return res.status(400).json({ error: 'comparisonId or city required' });
    }

    // ── POST: Create/update override (admin only) ─────────────────────
    if (req.method === 'POST') {
      const admin = await verifyAdmin(req);
      if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const {
        comparisonId,
        cityName,
        videoUrl,
        videoTitle,
        durationSeconds,
        thumbnailUrl,
        generationPrompt,
      } = req.body;

      if (!cityName || !videoUrl) {
        return res.status(400).json({ error: 'cityName and videoUrl are required' });
      }

      // Validate URL format
      try {
        new URL(videoUrl);
      } catch {
        return res.status(400).json({ error: 'Invalid videoUrl format' });
      }

      // Deactivate any existing override for this comparison/city combo
      if (comparisonId) {
        await supabaseAdmin
          .from('invideo_overrides')
          .update({ is_active: false })
          .eq('comparison_id', comparisonId)
          .eq('is_active', true);
      } else {
        await supabaseAdmin
          .from('invideo_overrides')
          .update({ is_active: false })
          .eq('city_name', cityName.toLowerCase())
          .is('comparison_id', null)
          .eq('is_active', true);
      }

      // Insert new override
      const { data, error } = await supabaseAdmin
        .from('invideo_overrides')
        .insert({
          comparison_id: comparisonId || null,
          city_name: cityName.toLowerCase(),
          video_url: videoUrl,
          video_title: videoTitle || null,
          duration_seconds: durationSeconds || null,
          thumbnail_url: thumbnailUrl || null,
          uploaded_by: admin.email,
          generation_prompt: generationPrompt || null,
          source: 'manual',
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('[invideo-override] Insert error:', error);
        return res.status(500).json({ error: 'Failed to save override' });
      }

      console.log(`[invideo-override] Admin ${admin.email} created override for ${cityName}`, data.id);
      return res.status(201).json({ success: true, override: data });
    }

    // ── DELETE: Deactivate override (admin only) ──────────────────────
    if (req.method === 'DELETE') {
      const admin = await verifyAdmin(req);
      if (!admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'id required' });
      }

      const { error } = await supabaseAdmin
        .from('invideo_overrides')
        .update({ is_active: false })
        .eq('id', id as string);

      if (error) {
        console.error('[invideo-override] Delete error:', error);
        return res.status(500).json({ error: 'Failed to deactivate override' });
      }

      console.log(`[invideo-override] Admin ${admin.email} deactivated override ${id}`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[invideo-override] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
