/**
 * LIFE SCORE - where browsers send Content-Security-Policy reports.
 *
 * POST /api/csp-report. The header in vercel.json is report-only, so nothing is
 * blocked yet; each report is logged as one "[CSP]" line (blocked site, page
 * path, directive - see api/shared/cspReport.ts) to show which outside sites
 * the policy still lacks before it is switched on. Browsers send these with
 * their own content types (application/csp-report, application/reports+json),
 * which Vercel does not parse, so the body is read as bytes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { readRawBody } from './shared/rawBody.js';
import { readCspReports } from './shared/cspReport.js';

export const config = { api: { bodyParser: false } };

/** A report batch larger than this is not read. */
const MAX_BODY_BYTES = 64 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  if (!applyRateLimit(req.headers, 'csp-report', 'health', res)) return;

  const raw = await readRawBody(req);
  if (raw.length > MAX_BODY_BYTES) {
    res.status(413).end();
    return;
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    // not JSON: nothing to read
  }
  for (const report of readCspReports(body)) {
    console.warn(`[CSP] ${JSON.stringify(report)}`);
  }
  res.status(204).end();
}
