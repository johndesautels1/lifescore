/**
 * LIFE SCORE - Emilia Manuals API
 * Serves the manuals for the help center (the admin panel's manual tabs).
 *
 * GET /api/emilia/manuals?type=user|csm|tech|legal|license|schema|equations|prompts
 *
 * One source (4 Oct 2026): each manual is its own file in docs/manuals/, shipped
 * with this function (vercel.json includeFiles). Until then the deployment could
 * not see docs/ and served copies embedded in this file, which had drifted from
 * the manuals. The facts a manual takes from the code (routes, settings, plans,
 * models, metrics, tables, jobs, tests…) are written in as it is served
 * (api/shared/manualFacts.ts), so they always match this deployment.
 *
 * Access Control:
 * - user, license: anyone
 * - csm, tech, legal, schema, equations, prompts: admins (admin list or the
 *   authorized_manual_access table)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth, getAdminEmails } from '../shared/auth.js';
import { promises as fs } from 'fs';
import path from 'path';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import { fillManualFacts } from '../shared/manualFacts.js';

// ============================================================================
// CONSTANTS
// ============================================================================

// Manual file mappings
const MANUAL_FILES: Record<string, string> = {
  user: 'USER_MANUAL.md',
  csm: 'CUSTOMER_SERVICE_MANUAL.md',
  tech: 'TECHNICAL_SUPPORT_MANUAL.md',
  legal: 'LEGAL_COMPLIANCE_MANUAL.md',
  license: 'LICENSE_MANUAL.md',
  schema: 'APP_SCHEMA_MANUAL.md',
  equations: 'JUDGE_EQUATIONS_MANUAL.md',
  prompts: 'GAMMA_PROMPTS_MANUAL.md',
};

// Manual titles
const MANUAL_TITLES: Record<string, string> = {
  user: 'User Manual',
  csm: 'Customer Service Manual',
  tech: 'Technical Support Manual',
  legal: 'Legal Compliance',
  license: 'Software License Agreement',
  schema: 'App Schema & Database',
  equations: 'Judge Mathematical Equations',
  prompts: 'GAMMA Prompt Templates',
};

// Manuals that require admin authorization
const RESTRICTED_MANUALS = ['csm', 'tech', 'legal', 'schema', 'equations', 'prompts'];

// Admin emails from shared auth module (reads DEV_BYPASS_EMAILS env var)
const ADMIN_EMAILS = getAdminEmails();

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function isUserAuthorized(userEmail: string | null): Promise<boolean> {
  if (!userEmail) return false;

  // Check admin email list (from DEV_BYPASS_EMAILS env var)
  if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
    return true;
  }

  // Check database for authorized users
  const supabase = getServiceClient();

  if (!supabase) {
    console.warn('[manuals] Supabase not configured, using admin email list only');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('authorized_manual_access')
      .select('email')
      .eq('email', userEmail.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('[manuals] Auth check error:', error.message);
    }

    return !!data;
  } catch (err) {
    console.error('[manuals] Auth check failed:', err);
    return false;
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - restricted to same app (requires auth)
  if (handleCors(req, res, 'same-app', { methods: 'GET, OPTIONS' })) return;

  // Method check
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type } = req.query;

  if (!type || typeof type !== 'string' || !MANUAL_FILES[type]) {
    res.status(400).json({
      error: 'Invalid type',
      message: `Valid types: ${Object.keys(MANUAL_FILES).join(', ')}`,
    });
    return;
  }

  // Check authorization for restricted manuals — use JWT, not query param email
  if (RESTRICTED_MANUALS.includes(type)) {
    const auth = await requireAuth(req, res);
    if (!auth) return; // 401 already sent

    // Verify the authenticated user's email is authorized
    const isAuthorized = await isUserAuthorized(auth.email);

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Access denied',
        message: 'This manual is restricted to authorized administrators only.',
        restricted: true,
      });
      return;
    }
  }

  try {
    let source: string;
    try {
      source = await fs.readFile(path.join(process.cwd(), 'docs', 'manuals', MANUAL_FILES[type]), 'utf-8');
    } catch {
      console.error(`[EMILIA/manuals] missing from this deployment: docs/manuals/${MANUAL_FILES[type]}`);
      res.status(503).json({ error: 'This manual is missing from this deployment.' });
      return;
    }

    const content = fillManualFacts(source);
    // The manual's own date line (the last time its written sections were reviewed).
    const dated = source.match(/\*\*Last (?:Updated|Reviewed):\*\*\s*([^|\r\n]+)/i);

    res.status(200).json({
      success: true,
      type,
      title: MANUAL_TITLES[type],
      content,
      lastUpdated: dated ? dated[1].trim() : 'current deployment',
    });
  } catch (error) {
    console.error('[EMILIA/manuals] Error:', error);

    res.status(500).json({
      error: 'Failed to load manual',
    });
  }
}
