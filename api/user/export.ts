/**
 * LIFE SCORE - Data Export API
 * GDPR Article 15 (access) and Article 20 (portability); the US state "right to know".
 *
 * POST /api/user/export → one JSON file of everything the account holds.
 *
 * Before 2026-10-03 the export covered six tables and silently left out judge
 * reports, court orders, Grok videos, saved report records, their share links
 * and views, subscriptions, usage, notifications, jobs, consent records and the
 * beta invitation. Every
 * table that holds a user's rows is now listed in USER_TABLES — and
 * tests/privacyRoutes.test.ts fails if a table with a user column is missing.
 *
 * Clues Intelligence LTD
 * © 2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getServiceClient } from '../shared/supabaseAdmin.js';
import { handleCors } from '../shared/cors.js';
import { checkRateLimit } from '../shared/rateLimit.js';
import { timeLimit } from '../shared/timeout.js';

export const config = {
  maxDuration: 60, // May take time to gather all data
};

/** Per query; the whole export stays inside maxDuration. */
const QUERY_TIMEOUT_MS = 10_000;

/**
 * Every table holding the user's own rows, the column that names the owner,
 * and what the section is called in the file. Columns that only point at other
 * rows (internal ids) are dropped from the output.
 */
export const USER_TABLES: ReadonlyArray<{ table: string; owner: string; section: string }> = [
  { table: 'profiles', owner: 'id', section: 'profile' },
  { table: 'user_preferences', owner: 'user_id', section: 'preferences' },
  { table: 'comparisons', owner: 'user_id', section: 'comparisons' },
  { table: 'gamma_reports', owner: 'user_id', section: 'visualReports' },
  { table: 'judge_reports', owner: 'user_id', section: 'judgeReports' },
  { table: 'court_orders', owner: 'user_id', section: 'courtOrders' },
  { table: 'grok_videos', owner: 'user_id', section: 'videos' },
  { table: 'reports', owner: 'user_id', section: 'savedReports' },
  { table: 'report_shares', owner: 'shared_by', section: 'reportShareLinks' },
  { table: 'report_access_logs', owner: 'user_id', section: 'reportViews' },
  { table: 'subscriptions', owner: 'user_id', section: 'subscriptions' },
  { table: 'usage_tracking', owner: 'user_id', section: 'usage' },
  { table: 'notifications', owner: 'user_id', section: 'notifications' },
  { table: 'jobs', owner: 'user_id', section: 'jobs' },
  { table: 'consent_logs', owner: 'user_id', section: 'consentRecords' },
  { table: 'api_cost_records', owner: 'user_id', section: 'serviceCostRecords' },
];

/** Never exported: a share link's password hash. */
const HIDDEN_COLUMNS = new Set(['password_hash']);

interface ConversationExport {
  id: string;
  title: string | null;
  createdAt: string;
  messages: Array<{ role: string; content: string; createdAt: string }>;
}

/** This file's work gives up after QUERY_TIMEOUT_MS (api/shared/timeout.ts). */
const withTimeout = timeLimit(QUERY_TIMEOUT_MS);

function withoutHidden(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) if (!HIDDEN_COLUMNS.has(key)) out[key] = value;
  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCors(req, res, 'restricted', { methods: 'POST, OPTIONS' })) return;

  // Rate limit (1 export per hour per IP)
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  if (!checkRateLimit(clientIP, 'user/export', { windowMs: 3600000, maxRequests: 1 }, res)) {
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const db = getServiceClient();
  if (!db) {
    console.error('[EXPORT] Missing Supabase credentials');
    return res.status(500).json({ error: 'CONFIG_ERROR', message: 'Server configuration error.' });
  }

  // Always the caller's own data — never an id from the request.
  const { data: { user }, error: authError } = await db.auth.getUser(authHeader.substring(7));
  if (authError || !user) {
    return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Invalid or expired authentication token.' });
  }
  const userId = user.id;
  console.log(`[EXPORT] Starting data export for user: ${userId}`);

  try {
    const sections: Record<string, unknown> = {};

    for (const { table, owner, section } of USER_TABLES) {
      const { data, error } = await withTimeout(db.from(table).select('*').eq(owner, userId), `Read ${table}`);
      if (error) throw new Error(`${table}: ${error.message}`);
      const rows = (data ?? []).map((row: Record<string, unknown>) => withoutHidden(row));
      sections[section] = owner === 'id' ? rows[0] ?? null : rows;
    }

    // The beta invitation, matched by sign-in email (lower case, as beta-check reads it).
    if (user.email) {
      const { data: beta, error: betaError } = await withTimeout(
        db.from('beta_testers').select('*').eq('email', user.email.toLowerCase()),
        'Read beta invitation'
      );
      if (betaError) throw new Error(`beta_testers: ${betaError.message}`);
      sections.betaInvitation = (beta ?? [])[0] ?? null;
    }

    // Olivia conversations, each with its messages.
    const { data: conversations, error: convError } = await withTimeout(
      db.from('olivia_conversations').select('id, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
      'Read conversations'
    );
    if (convError) throw new Error(`olivia_conversations: ${convError.message}`);
    const conversationList = (conversations ?? []) as Array<{ id: string; title: string | null; created_at: string }>;
    const conversationIds = conversationList.map((c) => c.id);
    const messagesByConversation = new Map<string, ConversationExport['messages']>();
    if (conversationIds.length > 0) {
      const { data: messages, error: msgError } = await withTimeout(
        db.from('olivia_messages').select('conversation_id, role, content, created_at').in('conversation_id', conversationIds).order('created_at', { ascending: true }),
        'Read messages'
      );
      if (msgError) throw new Error(`olivia_messages: ${msgError.message}`);
      for (const m of (messages ?? []) as Array<{ conversation_id: string; role: string; content: string; created_at: string }>) {
        const list = messagesByConversation.get(m.conversation_id) ?? [];
        list.push({ role: m.role, content: m.content, createdAt: m.created_at });
        messagesByConversation.set(m.conversation_id, list);
      }
    }
    const oliviaConversations: ConversationExport[] = conversationList.map((c) => ({
      id: c.id,
      title: c.title,
      createdAt: c.created_at,
      messages: messagesByConversation.get(c.id) ?? [],
    }));

    const exportData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        userId,
        email: user.email ?? null,
        format: 'CLUES_DATA_EXPORT_V2',
        version: '2.0',
      },
      ...sections,
      oliviaConversations,
    };

    console.log(`[EXPORT] Export complete for user: ${userId}`);

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
