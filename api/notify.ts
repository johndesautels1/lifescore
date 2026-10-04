/**
 * LIFE SCORE - Notification API
 * Vercel Serverless Function
 *
 * Called by other API endpoints after a long-running job completes.
 * Creates an in-app notification and optionally sends email via Resend.
 *
 * POST /api/notify
 *   body: { jobId, userId, title, message, link, channels: ['in_app', 'email'] }
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from './shared/supabaseAdmin.js';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';
import { publicSiteUrl } from './shared/siteUrl.js';
import { sendEmail } from './shared/resend.js';

// Supabase admin client (service role for inserting notifications)
const supabaseAdmin = serviceDb;


// ============================================================================
// TYPES
// ============================================================================

/** The recipient is always the signed-in caller; there is no user or email field. */
interface NotifyRequest {
  jobId?: string;
  title: string;
  message?: string;
  link?: string;
  channels?: ('in_app' | 'email' | 'sms')[];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Send an email notification via Resend
 */
async function sendEmailViaResend(
  to: string,
  subject: string,
  body: string,
  link?: string
): Promise<{ success: boolean; error?: string }> {

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #F7931E; font-size: 24px; margin: 0;">LIFE SCORE</h1>
        <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0;">Legal Independence &amp; Freedom Evaluation</p>
      </div>
      <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #e2e8f0; font-size: 18px; margin: 0 0 8px;">${subject}</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0;">${body}</p>
      </div>
      ${link ? `
      <div style="text-align: center; margin-bottom: 20px;">
        <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #F7931E, #c66e00); color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">View Results</a>
      </div>
      ` : ''}
      <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
        <p style="color: #64748b; font-size: 11px; margin: 0;">Clues Intelligence LTD &bull; cluesnomad.com</p>
      </div>
    </div>
  `;

  const sent = await sendEmail({ to: [to], subject: `LIFE SCORE: ${subject}`, html: htmlBody });
  if (!sent.ok) {
    if (sent.kind === 'not-configured') console.warn('[NOTIFY] RESEND_API_KEY not configured — skipping email');
    else console.error('[NOTIFY] Email send failed:', sent.message);
    return { success: false, error: sent.kind === 'not-configured' ? 'Email service not configured' : sent.message };
  }
  console.log('[NOTIFY] Email sent');
  return { success: true };
}

/**
 * Look up user's email from profiles table
 */
async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle();
  return data?.email || null;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Signed-in users may notify only themselves: the recipient is always the
  // caller's own account and own email (this route was once an open mail relay).
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const {
      jobId,
      title,
      message,
      link,
      channels = ['in_app'],
    } = req.body as NotifyRequest;
    const userId = auth.userId;
    const email = auth.email || undefined;

    if (!title || typeof title !== 'string' || title.length > 200) {
      res.status(400).json({ error: 'title is required (200 characters at most)' });
      return;
    }
    if (link !== undefined && (typeof link !== 'string' || !link.startsWith('/'))) {
      res.status(400).json({ error: 'link must be a path within the app' });
      return;
    }

    const results: Record<string, { success: boolean; error?: string }> = {};

    // 1. Create in-app notification
    if (channels.includes('in_app')) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          job_id: jobId || null,
          type: 'in_app',
          title,
          message: message || null,
          link: link || null,
        });

      if (error) {
        console.error('[NOTIFY] In-app insert error:', error.message);
        results.in_app = { success: false, error: error.message };
      } else {
        console.log('[NOTIFY] In-app notification created for user:', userId);
        results.in_app = { success: true };
      }
    }

    // 2. Send email if requested
    if (channels.includes('email')) {
      const recipientEmail = email || await getUserEmail(userId);
      if (recipientEmail) {
        const fullLink = link
          ? `${publicSiteUrl()}${link}`
          : undefined;
        results.email = await sendEmailViaResend(
          recipientEmail,
          title,
          message || 'Your results are ready.',
          fullLink
        );

        // Also create an in-app record of the email notification
        const { error: emailRecordError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: userId,
            job_id: jobId || null,
            type: 'email',
            title,
            message: `Email sent to ${recipientEmail}`,
            link: link || null,
          });
        if (emailRecordError) {
          console.error('[NOTIFY] Failed to create email notification record:', emailRecordError.message);
        }
      } else {
        results.email = { success: false, error: 'No email address found' };
      }
    }

    // 3. Update job status to 'notified' if jobId provided
    if (jobId) {
      const { error: jobUpdateError } = await supabaseAdmin
        .from('jobs')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('user_id', userId);
      if (jobUpdateError) {
        console.error('[NOTIFY] Failed to update job status to notified:', jobUpdateError.message);
      }
    }

    res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('[NOTIFY] Handler error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
}
