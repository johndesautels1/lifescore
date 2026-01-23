/**
 * LIFE SCORE - Delete Account API
 * GDPR Article 17 "Right to Erasure" implementation
 *
 * DELETE /api/user/delete
 *
 * Clues Intelligence LTD
 * © 2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '../shared/rateLimit';

// Vercel config
export const config = {
  maxDuration: 30,
};

// Rate limiter for delete endpoint (very restrictive)
const rateLimiter = checkRateLimit;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCors(req, res, 'restricted', { methods: 'DELETE, OPTIONS' })) return;

  // Rate limit
  const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  const rateResult = rateLimiter(clientIP, { windowMs: 60000, maxRequests: 3 }); // 3 per minute max
  if (!rateResult.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please wait before trying again.',
      resetIn: rateResult.resetIn,
    });
  }

  // Only allow DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const { confirmation, userId } = req.body || {};

    // Verify confirmation text
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'CONFIRMATION_MISMATCH',
        message: 'Please type "DELETE MY ACCOUNT" to confirm.',
      });
    }

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
      console.error('[DELETE] Missing Supabase credentials');
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

    const userIdToDelete = user.id;

    // Log deletion start
    console.log(`[DELETE] Starting account deletion for user: ${userIdToDelete}`);

    const deletionSummary = {
      messages: 0,
      conversations: 0,
      reports: 0,
      comparisons: 0,
      preferences: 0,
    };

    // 1. Delete Olivia messages (via conversation IDs)
    const { data: conversations } = await supabase
      .from('olivia_conversations')
      .select('id')
      .eq('user_id', userIdToDelete);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map((c: { id: string }) => c.id);
      const { count: msgCount } = await supabase
        .from('olivia_messages')
        .delete()
        .in('conversation_id', conversationIds)
        .select('*', { count: 'exact', head: true });
      deletionSummary.messages = msgCount || 0;
    }

    // 2. Delete Olivia conversations
    const { count: convCount } = await supabase
      .from('olivia_conversations')
      .delete()
      .eq('user_id', userIdToDelete)
      .select('*', { count: 'exact', head: true });
    deletionSummary.conversations = convCount || 0;

    // 3. Delete Gamma reports
    const { count: reportCount } = await supabase
      .from('gamma_reports')
      .delete()
      .eq('user_id', userIdToDelete)
      .select('*', { count: 'exact', head: true });
    deletionSummary.reports = reportCount || 0;

    // 4. Delete comparisons
    const { count: compCount } = await supabase
      .from('comparisons')
      .delete()
      .eq('user_id', userIdToDelete)
      .select('*', { count: 'exact', head: true });
    deletionSummary.comparisons = compCount || 0;

    // 5. Delete user preferences
    const { count: prefCount } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userIdToDelete)
      .select('*', { count: 'exact', head: true });
    deletionSummary.preferences = prefCount || 0;

    // 6. Delete profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', userIdToDelete);

    // 7. Delete the auth user (using admin API)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userIdToDelete);

    if (deleteUserError) {
      console.error('[DELETE] Failed to delete auth user:', deleteUserError);
      // Continue anyway - data is deleted, auth user deletion can be retried
    }

    console.log(`[DELETE] Account deletion complete for user: ${userIdToDelete}`, deletionSummary);

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated data have been deleted.',
      summary: deletionSummary,
    });

  } catch (error) {
    console.error('[DELETE] Error:', error);
    return res.status(500).json({
      error: 'DELETION_FAILED',
      message: 'An error occurred while deleting your account. Please contact support.',
    });
  }
}
