/**
 * LIFE SCORE - the one Resend (email) connection.
 *
 * POST https://api.resend.com/emails with RESEND_API_KEY; the sender is
 * RESEND_FROM_EMAIL. Never throws: a typed result the caller switches on.
 * Used by notify (results-ready emails), admin/new-signup and usage/check-quotas
 * (admin alerts) and the weekly vendor check; tests/vendorClients.test.ts keeps
 * Resend's address out of every other file.
 */

import { fetchWithTimeout } from './fetchWithTimeout.js';

const EMAILS_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'LIFE SCORE <alerts@lifescore.app>';

export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export type EmailResult =
  | { ok: true; id: string | null }
  | { ok: false; kind: 'not-configured' | 'http' | 'network'; message: string; status?: number };

/** Send one email through Resend. */
export async function sendEmail(message: EmailMessage, timeoutMs = 15_000): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, kind: 'not-configured', message: 'RESEND_API_KEY is not set' };
  if (message.to.length === 0) return { ok: false, kind: 'http', message: 'no recipients' };
  try {
    const response = await fetchWithTimeout(
      EMAILS_URL,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
          to: message.to,
          subject: message.subject,
          html: message.html,
          ...(message.text ? { text: message.text } : {}),
        }),
      },
      timeoutMs
    );
    const body = (await response.json().catch(() => ({}))) as { id?: unknown; message?: unknown };
    if (!response.ok) {
      return { ok: false, kind: 'http', status: response.status, message: typeof body.message === 'string' ? body.message : `HTTP ${response.status}` };
    }
    return { ok: true, id: typeof body.id === 'string' ? body.id : null };
  } catch (err) {
    return { ok: false, kind: 'network', message: err instanceof Error ? err.message : String(err) };
  }
}

/** Text made safe to place inside HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
