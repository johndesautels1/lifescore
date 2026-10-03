/**
 * LIFE SCORE - Public configuration for the browser.
 *
 * GET /api/public-config → { supabaseUrl, supabaseAnonKey }
 *
 * The page asks for these only when its build left them out (src/lib/
 * publicConfig.ts) — on 2026-10-03 production builds shipped without the key
 * and nobody could sign in. Both values are public by design: the anon key is
 * meant to be in every visitor's browser; row-level security protects the data.
 * Nothing secret is ever returned here.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicSupabaseSettings } from './shared/auth.js';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { url, anonKey } = publicSupabaseSettings();
  if (!url || !anonKey) {
    console.error('[PUBLIC-CONFIG] Supabase address or public key missing on the server');
    res.status(503).json({ error: 'Sign-in is not configured on the server' });
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).json({ supabaseUrl: url, supabaseAnonKey: anonKey });
}
