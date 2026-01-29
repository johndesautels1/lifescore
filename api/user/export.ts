/**
 * LIFE SCORE - Data Export API
 * GDPR Article 20 "Right to Data Portability" implementation
 *
 * POST /api/user/export
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
  maxDuration: 60, // May take time to gather all data
};

// Types for the export
interface ExportData {
  exportInfo: {
    generatedAt: string;
    userId: string;
    format: string;
    version: string;
  };
  profile: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
  comparisons: Record<string, unknown>[];
  conversations: Array<{
    id: string;
    title: string | null;
    createdAt: string;
    messages: Array<{
      role: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  reports: Record<string, unknown>[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCors(req, res, 'restricted', { methods: 'POST, OPTIONS' })) return;

  // Rate limit (1 export per hour per IP)
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  const rateResult = checkRateLimit(clientIP, { windowMs: 3600000, maxRequests: 1 });
  if (!rateResult.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'You can only export your data once per hour.',
      resetIn: rateResult.resetIn,
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const token = authHeader.substring(7);

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[EXPORT] Missing Supabase credentials');
      return res.status(500).json({
        error: 'CONFIG_ERROR',
        message: 'Server configuration error.',
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Verify the user's token and get their ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    }

    const userId = user.id;
    console.log(`[EXPORT] Starting data export for user: ${userId}`);

    // Initialize export data structure
    const exportData: ExportData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        userId: userId,
        format: 'CLUES_DATA_EXPORT_V1',
        version: '1.0',
      },
      profile: null,
      preferences: null,
      comparisons: [],
      conversations: [],
      reports: [],
    };

    // 1. Get profile
    // FIX 2026-01-29: Use maybeSingle() - profile may not exist
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      // Remove sensitive/internal fields
      const { id, ...profileData } = profile;
      exportData.profile = profileData;
    }

    // 2. Get preferences
    // FIX 2026-01-29: Use maybeSingle() - preferences may not exist
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (preferences) {
      const { id, user_id, ...prefsData } = preferences;
      exportData.preferences = prefsData;
    }

    // 3. Get comparisons
    const { data: comparisons } = await supabase
      .from('comparisons')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (comparisons) {
      exportData.comparisons = comparisons.map((comp: Record<string, unknown>) => {
        const { id, user_id, ...compData } = comp;
        return compData;
      });
    }

    // 4. Get conversations with messages
    const { data: conversations } = await supabase
      .from('olivia_conversations')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (conversations) {
      for (const conv of conversations) {
        const { data: messages } = await supabase
          .from('olivia_messages')
          .select('role, content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        exportData.conversations.push({
          id: conv.id,
          title: conv.title,
          createdAt: conv.created_at,
          messages: (messages || []).map((msg: Record<string, unknown>) => ({
            role: msg.role as string,
            content: msg.content as string,
            createdAt: msg.created_at as string,
          })),
        });
      }
    }

    // 5. Get Gamma reports
    const { data: reports } = await supabase
      .from('gamma_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (reports) {
      exportData.reports = reports.map((report: Record<string, unknown>) => {
        const { id, user_id, ...reportData } = report;
        return reportData;
      });
    }

    console.log(`[EXPORT] Export complete for user: ${userId}`, {
      comparisons: exportData.comparisons.length,
      conversations: exportData.conversations.length,
      reports: exportData.reports.length,
    });

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="clues-data-export-${new Date().toISOString().split('T')[0]}.json"`);

    return res.status(200).json(exportData);

  } catch (error) {
    console.error('[EXPORT] Error:', error);
    return res.status(500).json({
      error: 'EXPORT_FAILED',
      message: 'An error occurred while exporting your data. Please try again.',
    });
  }
}
