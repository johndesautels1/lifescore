/**
 * LIFE SCORE - New User Signup Admin Notification
 * Sends an email alert to admins when a new user signs up.
 *
 * POST /api/admin/new-signup
 *   body: { email, fullName? }
 *
 * Fire-and-forget — called from the client after successful signup.
 * No auth required (the signup just happened, user has no session yet).
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { createClient } from '@supabase/supabase-js';
import { getAdminEmails } from '../shared/auth.js';

/** A signup alert is sent only for an account created in the last few minutes. */
const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/**
 * True when a profile with this email was created moments ago. The route is
 * called right after sign-up, before the user has a session, so this is what
 * stops anyone from using it to send alerts about made-up accounts.
 */
async function isFreshSignup(email: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !key) return false;
  const db = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - SIGNUP_WINDOW_MS).toISOString();
  const { data, error } = await db
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .gte('created_at', since)
    .limit(1);
  return !error && Array.isArray(data) && data.length > 0;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'LIFE SCORE <alerts@lifescore.app>';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'POST, OPTIONS' })) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email: rawEmail, fullName: rawName } = req.body || {};

  if (typeof rawEmail !== 'string' || !rawEmail.includes('@') || rawEmail.length > 320) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  if (!(await isFreshSignup(rawEmail.trim()))) {
    // Not a real, just-created account — say nothing more.
    res.status(200).json({ success: true });
    return;
  }

  const email = escapeHtml(rawEmail.trim());
  const fullName = typeof rawName === 'string' && rawName.trim() ? escapeHtml(rawName.trim().slice(0, 200)) : '';

  // Always respond fast — don't let email delivery block the response
  if (!RESEND_API_KEY) {
    console.warn('[NEW-SIGNUP] RESEND_API_KEY not configured — logging only');
    console.log(`[NEW-SIGNUP] New user: ${email} (${fullName || 'no name'})`);
    res.status(200).json({ success: true, note: 'logged only — email not configured' });
    return;
  }

  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subject = `🆕 New LIFE SCORE Signup: ${email}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e; color: #eee; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #16213e; border-radius: 12px; padding: 24px; }
    .header { text-align: center; margin-bottom: 24px; }
    .header h1 { color: #F7931E; margin: 0; font-size: 24px; }
    .header p { color: #94a3b8; font-size: 12px; margin: 4px 0 0; }
    .info-box { background: rgba(0, 212, 255, 0.1); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 8px; padding: 20px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #94a3b8; font-size: 13px; }
    .info-value { color: #00d4ff; font-weight: 600; font-size: 14px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏛️ LIFE SCORE</h1>
      <p>New User Signup Alert</p>
    </div>

    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">${email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Name</span>
        <span class="info-value">${fullName || '(not provided)'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Signed Up</span>
        <span class="info-value">${timestamp} ET</span>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated alert from LIFE SCORE.</p>
      <p>Clues Intelligence LTD &bull; cluesnomad.com</p>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: ADMIN_EMAILS,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[NEW-SIGNUP] Resend error:', response.status, errorText);
      // Still return 200 — we don't want signup UX to break because of an email failure
      res.status(200).json({ success: false, note: 'email send failed' });
      return;
    }

    console.log(`[NEW-SIGNUP] Admin alert sent for: ${email}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[NEW-SIGNUP] Email error:', err);
    res.status(200).json({ success: false, note: 'email error' });
  }
}
