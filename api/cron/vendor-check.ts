/**
 * LIFE SCORE - the weekly vendor check (Vercel cron, Mondays 08:00 UTC — vercel.json).
 *
 * GET /api/cron/vendor-check with `Authorization: Bearer <CRON_SECRET>`, the
 * header Vercel's cron sends when the CRON_SECRET setting exists. Without the
 * setting the route refuses every call, so nobody can run it from outside.
 * Runs api/shared/vendorCheck.ts; when anything fails it emails the admins
 * (getAdminEmails) and says so in the log.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { failureEmail, runVendorChecks } from '../shared/vendorCheck.js';
import { sendEmail } from '../shared/resend.js';
import { getAdminEmails } from '../shared/auth.js';

export const config = { maxDuration: 60 };

/** Constant-time comparison of the Authorization header with the expected one. */
function authorized(header: string | undefined, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'CRON_SECRET is not set; the vendor check does not run.' });
    return;
  }
  const header = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;
  if (!authorized(header, secret)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const report = await runVendorChecks();
  console.log(`[VENDOR-CHECK] ${report.results.length - report.failures.length}/${report.results.length} passed`, JSON.stringify(report.failures));

  let emailed: string = 'not needed';
  if (report.failures.length > 0) {
    const mail = failureEmail(report);
    const sent = await sendEmail({ to: getAdminEmails(), ...mail });
    emailed = sent.ok ? 'sent' : `failed: ${sent.message}`;
    if (!sent.ok) console.error('[VENDOR-CHECK] Could not email the admins:', sent.message);
  }

  res.status(200).json({ ...report, emailed });
}
