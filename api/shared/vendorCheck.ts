/**
 * LIFE SCORE - the weekly vendor check: is everything the app depends on still there?
 *
 * John, 4 Oct 2026: scheduled checks for vendor and code drift. Run by
 * api/cron/vendor-check.ts every Monday (vercel.json); a failure emails the
 * admins. It checks:
 * - every AI model the app uses (api/shared/models.ts) is still served by its
 *   vendor — the commonest silent break, when a vendor retires a model id;
 * - Google sign-in still starts (on 4 Oct 2026 a stray space in Supabase's Site
 *   URL broke it with nothing to say so).
 * Perplexity is not checked: its Agent API takes a preset name ('low'), and it
 * has no endpoint that lists them.
 */

import { AI_MODELS } from './models.js';
import { claudeModelCheck } from './anthropic.js';
import { openaiModelCheck } from './openai.js';
import { geminiModelCheck } from './gemini.js';
import { grokModelCheck } from './xai.js';
import type { ModelCheck } from './llm.js';
import { fetchWithTimeout } from './fetchWithTimeout.js';
import { PUBLIC_SITE } from './siteUrl.js';
import { escapeHtml } from './resend.js';

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface VendorReport {
  checkedAt: string;
  results: CheckResult[];
  failures: CheckResult[];
}

type CheckableVendor = 'anthropic' | 'openai' | 'google' | 'xai';

const MODEL_CHECKS: Record<CheckableVendor, (id: string) => Promise<ModelCheck>> = {
  anthropic: claudeModelCheck,
  openai: openaiModelCheck,
  google: geminiModelCheck,
  xai: grokModelCheck,
};

/** Each model id to check once, with the jobs that use it. Vendors with no model endpoint are left out. */
export function plannedModelChecks(models: Record<string, { vendor: string; id: string }> = AI_MODELS): Array<{ vendor: CheckableVendor; id: string; jobs: string[] }> {
  const byKey = new Map<string, { vendor: CheckableVendor; id: string; jobs: string[] }>();
  for (const [job, model] of Object.entries(models)) {
    if (!(model.vendor in MODEL_CHECKS)) continue;
    const key = `${model.vendor}:${model.id}`;
    const entry = byKey.get(key) ?? { vendor: model.vendor as CheckableVendor, id: model.id, jobs: [] };
    entry.jobs.push(job);
    byKey.set(key, entry);
  }
  return [...byKey.values()].sort((a, b) => `${a.vendor}:${a.id}`.localeCompare(`${b.vendor}:${b.id}`));
}

/** Google sign-in starts: Supabase's authorize step redirects to Google. */
async function checkGoogleSignIn(): Promise<CheckResult> {
  const name = 'Google sign-in starts';
  const base = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!base) return { name, ok: false, detail: 'SUPABASE_URL is not set' };
  const url = `${base.replace(/\/+$/, '')}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${PUBLIC_SITE}/auth/callback`)}`;
  try {
    const response = await fetchWithTimeout(url, { method: 'GET', redirect: 'manual' }, 15_000);
    const location = response.headers.get('location') ?? '';
    const toGoogle = response.status >= 300 && response.status < 400 && /^https:\/\/accounts\.google\.com\//.test(location);
    return toGoogle
      ? { name, ok: true, detail: 'redirects to Google' }
      : { name, ok: false, detail: `HTTP ${response.status}${location ? ` to ${location.slice(0, 120)}` : ''} — check Supabase Auth's Site URL and Google provider` };
  } catch (err) {
    return { name, ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/** Run every check. */
export async function runVendorChecks(): Promise<VendorReport> {
  const planned = plannedModelChecks();
  const modelResults = await Promise.all(
    planned.map(async ({ vendor, id, jobs }): Promise<CheckResult> => {
      const check = await MODEL_CHECKS[vendor](id);
      const name = `${vendor} model ${id} (${jobs.join(', ')})`;
      if (check.ok) return { name, ok: true, detail: 'served' };
      const why = check.reason === 'missing' ? 'the vendor no longer serves this id — change it in api/shared/models.ts' : check.message;
      return { name, ok: false, detail: `${check.reason}${check.status ? ` (${check.status})` : ''}: ${why}` };
    })
  );
  const results = [...modelResults, await checkGoogleSignIn()];
  return { checkedAt: new Date().toISOString(), results, failures: results.filter(r => !r.ok) };
}

/** The admins' email for a report with failures. */
export function failureEmail(report: VendorReport): { subject: string; html: string; text: string } {
  const lines = report.failures.map(f => `• ${f.name}: ${f.detail}`);
  const subject = `LIFE SCORE weekly check: ${report.failures.length} problem${report.failures.length === 1 ? '' : 's'}`;
  const text = `The weekly vendor check (${report.checkedAt}) found:\n\n${lines.join('\n')}\n\n${report.results.length - report.failures.length} of ${report.results.length} checks passed.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#0f172a;color:#e2e8f0;border-radius:12px">
<h2 style="color:#F7931E;margin:0 0 12px">LIFE SCORE weekly check</h2>
<p style="margin:0 0 12px">${escapeHtml(report.checkedAt)} — ${report.failures.length} problem${report.failures.length === 1 ? '' : 's'}:</p>
<ul>${report.failures.map(f => `<li><strong>${escapeHtml(f.name)}</strong><br>${escapeHtml(f.detail)}</li>`).join('')}</ul>
<p style="color:#94a3b8;margin:12px 0 0">${report.results.length - report.failures.length} of ${report.results.length} checks passed.</p>
</div>`;
  return { subject, html, text };
}
