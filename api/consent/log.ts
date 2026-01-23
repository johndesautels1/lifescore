/**
 * LIFE SCORE - Consent Logging API
 * GDPR Compliance: Records consent actions for audit trail
 *
 * POST /api/consent/log
 *
 * Clues Intelligence LTD
 * © 2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors';
import { checkRateLimit } from '../shared/rateLimit';

// Vercel config
export const config = {
  maxDuration: 10,
};

// Types
interface ConsentLogRequest {
  consentType: 'cookies' | 'marketing' | 'analytics' | 'terms' | 'privacy';
  consentAction: 'granted' | 'denied' | 'withdrawn';
  consentCategories?: {
    essential?: boolean;
    functional?: boolean;
    analytics?: boolean;
    marketing?: boolean;
  };
  anonymousId?: string;
  pageUrl?: string;
  policyVersion?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCors(req, res, 'restricted', { methods: 'POST, OPTIONS' })) return;

  // Rate limit (30 per minute - consent changes shouldn't be frequent)
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  const rateResult = checkRateLimit(clientIP, { windowMs: 60000, maxRequests: 30 });
  if (!rateResult.allowed) {
    return res.status(429).json({ error: 'RATE_LIMITED' });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const body = req.body as ConsentLogRequest;

    // Validate required fields
    if (!body.consentType || !body.consentAction) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'consentType and consentAction are required',
      });
    }

    // Validate consentType
    const validTypes = ['cookies', 'marketing', 'analytics', 'terms', 'privacy'];
    if (!validTypes.includes(body.consentType)) {
      return res.status(400).json({
        error: 'INVALID_CONSENT_TYPE',
        message: `consentType must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Validate consentAction
    const validActions = ['granted', 'denied', 'withdrawn'];
    if (!validActions.includes(body.consentAction)) {
      return res.status(400).json({
        error: 'INVALID_CONSENT_ACTION',
        message: `consentAction must be one of: ${validActions.join(', ')}`,
      });
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[CONSENT] Missing Supabase credentials');
      return res.status(500).json({ error: 'CONFIG_ERROR' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Try to get user ID from auth header (optional)
    let userId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Hash IP for privacy (keep only first 3 octets for IPv4)
    const ipParts = clientIP.split('.');
    const partialIP = ipParts.length === 4
      ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0`
      : clientIP.substring(0, 20); // Truncate IPv6

    // Insert consent log
    const { data, error } = await supabase
      .from('consent_logs')
      .insert({
        user_id: userId,
        anonymous_id: body.anonymousId || null,
        consent_type: body.consentType,
        consent_action: body.consentAction,
        consent_categories: body.consentCategories || {},
        ip_address: partialIP,
        user_agent: (req.headers['user-agent'] || '').substring(0, 500),
        page_url: body.pageUrl || null,
        policy_version: body.policyVersion || '1.0',
        metadata: {
          logged_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('[CONSENT] Insert error:', error);
      // Don't fail the request - consent logging is not critical
      return res.status(200).json({
        success: true,
        logged: false,
        message: 'Consent recorded locally',
      });
    }

    console.log(`[CONSENT] Logged: ${body.consentType} ${body.consentAction} (${data?.id})`);

    return res.status(200).json({
      success: true,
      logged: true,
      id: data?.id,
    });

  } catch (error) {
    console.error('[CONSENT] Error:', error);
    // Don't fail - consent should still work even if logging fails
    return res.status(200).json({
      success: true,
      logged: false,
      message: 'Consent recorded locally',
    });
  }
}
