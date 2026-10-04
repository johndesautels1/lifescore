/**
 * LIFE SCORE - browsers' Content-Security-Policy reports, read field by field.
 *
 * vercel.json sends a Content-Security-Policy-Report-Only header: browsers block
 * nothing and report what the policy WOULD have blocked to /api/csp-report
 * (api/csp-report.ts), which logs one line per report. Those lines say which
 * outside sites the policy is still missing before it is switched on (open item
 * S14 in docs/MASTER_BUG_AUDIT_20260220.md).
 *
 * Two formats arrive: the classic `{ "csp-report": {...} }` (report-uri) and the
 * Reporting API's list of `{ type: "csp-violation", body: {...} }`. Only the
 * blocked site's origin and the page's path are kept: a full link can carry a
 * token or an email address.
 */

import { asRecord, finite, isRecord, text } from './jsonRead.js';

/** One report, reduced to what is needed to fix the policy. */
export interface CspViolation {
  /** The directive that would have blocked it, e.g. "connect-src". */
  directive: string;
  /** The blocked site's origin, or a keyword such as "inline", "eval", "data" or "blob". */
  blocked: string;
  /** The page's path, without its query. */
  page: string;
  /** The script that made the request, when the browser names one (origin and path only). */
  source?: string;
  line?: number;
}

/** At most this many reports are read from one request. */
export const MAX_REPORTS_PER_REQUEST = 20;

/** "scheme://host" for a web link; the scheme alone for data:, blob: and the like; a short keyword as it is. */
function originOrKeyword(value: string | undefined): string {
  if (!value) return 'unknown';
  try {
    const url = new URL(value);
    return url.origin !== 'null' ? url.origin : url.protocol.replace(':', '');
  } catch {
    return value.slice(0, 40);
  }
}

function pathOf(value: string | undefined): string {
  if (!value) return 'unknown';
  try {
    return new URL(value).pathname;
  } catch {
    return 'unknown';
  }
}

function sourceOf(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.origin !== 'null' ? url.origin + url.pathname : url.protocol.replace(':', '');
  } catch {
    return undefined;
  }
}

function violation(fields: {
  directive: string | undefined;
  blocked: string | undefined;
  page: string | undefined;
  source: string | undefined;
  line: number | undefined;
}): CspViolation {
  const result: CspViolation = {
    directive: (fields.directive ?? 'unknown').split(' ')[0],
    blocked: originOrKeyword(fields.blocked),
    page: pathOf(fields.page),
  };
  const source = sourceOf(fields.source);
  if (source) result.source = source;
  if (fields.line !== undefined) result.line = fields.line;
  return result;
}

/** The reports in a request body (either format); anything else gives []. */
export function readCspReports(body: unknown): CspViolation[] {
  // Classic report-uri: { "csp-report": { ... } }
  if (isRecord(body) && isRecord(body['csp-report'])) {
    const r = body['csp-report'];
    return [
      violation({
        directive: text(r['effective-directive']) ?? text(r['violated-directive']),
        blocked: text(r['blocked-uri']),
        page: text(r['document-uri']),
        source: text(r['source-file']),
        line: finite(r['line-number']),
      }),
    ];
  }
  // Reporting API: [{ type: "csp-violation", body: { ... } }, ...]
  if (Array.isArray(body)) {
    return body
      .filter((entry) => asRecord(entry).type === 'csp-violation')
      .slice(0, MAX_REPORTS_PER_REQUEST)
      .map((entry) => {
        const r = asRecord(asRecord(entry).body);
        return violation({
          directive: text(r.effectiveDirective),
          blocked: text(r.blockedURL),
          page: text(r.documentURL),
          source: text(r.sourceFile),
          line: finite(r.lineNumber),
        });
      });
  }
  return [];
}
