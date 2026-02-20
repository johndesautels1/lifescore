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
import { createClient } from '@supabase/supabase-js';
import { handleCors } from './shared/cors.js';
import { fetchWithTimeout } from './shared/fetchWithTimeout.js';

// Supabase admin client (service role for inserting notifications)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Resend API
const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'LIFE SCORE <alerts@lifescore.app>';

// ============================================================================
// TYPES
// ============================================================================

interface NotifyRequest {
  jobId?: string;
  userId: string;
  title: string;
  message?: string;
  link?: string;
  channels?: ('in_app' | 'email' | 'sms')[];
  email?: string;  // recipient email (looked up from profile if not provided)
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
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('[NOTIFY] RESEND_API_KEY not configured — skipping email');
    return { success: false, error: 'Email service not configured' };
  }

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

  try {
    const response = await fetchWithTimeout(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: `LIFE SCORE: ${subject}`,
        html: htmlBody,
      }),
    }, 15000);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NOTIFY] Resend error:', response.status, errorText);
      return { success: false, error: `Resend ${response.status}: ${errorText}` };
    }

    console.log('[NOTIFY] Email sent to:', to);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[NOTIFY] Email send failed:', msg);
    return { success: false, error: msg };
  }
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

  try {
    const {
      jobId,
      userId,
      title,
      message,
      link,
      channels = ['in_app'],
      email,
    } = req.body as NotifyRequest;

    if (!userId || !title) {
      res.status(400).json({ error: 'userId and title are required' });
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
          ? `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://lifescore.vercel.app'}${link}`
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
        .eq('id', jobId);
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
