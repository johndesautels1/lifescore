/**
 * LIFE SCORE - Shared Job Notification Helper
 * Fire-and-forget: marks a job as completed and inserts an in-app notification.
 * Called from API endpoints after long-running tasks finish.
 *
 * Does NOT send email — that's handled by /api/notify (called from client side).
 * This creates the in-app notification so the bell icon badge updates.
 *
 * Clues Intelligence LTD
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

interface NotifyJobParams {
  userId: string;
  jobType: string;
  title: string;
  message: string;
  link?: string;
  result?: Record<string, unknown>;
}

/**
 * Fire-and-forget: insert an in-app notification for the user.
 * This is non-blocking — errors are logged but never thrown.
 * Call this at the end of any long-running API handler.
 */
export async function notifyJobComplete(params: NotifyJobParams): Promise<void> {
  const { userId, title, message, link } = params;

  try {
    // Insert in-app notification
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'in_app',
        title,
        message,
        link: link || null,
      });

    if (error) {
      console.warn('[notifyJob] Insert error:', error.message);
    } else {
      console.log('[notifyJob] Notification created for user:', userId, '|', title);
    }
  } catch (err) {
    // Fire-and-forget — never block the API response
    console.warn('[notifyJob] Exception (non-blocking):', err);
  }
}

/**
 * Update a job's status to 'completed' and store the result.
 * Non-blocking — errors are logged, never thrown.
 */
export async function markJobCompleted(
  jobId: string,
  result?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'completed',
        result: result || null,
      })
      .eq('id', jobId);

    if (error) {
      console.warn('[notifyJob] Job update error:', error.message);
    }
  } catch (err) {
    console.warn('[notifyJob] Job update exception (non-blocking):', err);
  }
}

/**
 * Update a job's status to 'failed' with an error message.
 * Non-blocking — errors are logged, never thrown.
 */
export async function markJobFailed(
  jobId: string,
  errorMessage: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('jobs')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', jobId);

    if (error) {
      console.warn('[notifyJob] Job fail update error:', error.message);
    }
  } catch (err) {
    console.warn('[notifyJob] Job fail exception (non-blocking):', err);
  }
}
