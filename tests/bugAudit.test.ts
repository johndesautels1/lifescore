/**
 * LIFE SCORE - the bug audit document says what the code does (anti-drift).
 *
 * On 4 Oct 2026 every item in docs/MASTER_BUG_AUDIT_20260220.md was re-checked
 * against the code (John: "verify each one with the actual code not trusting the
 * docs ... update the docs so they dont drift again"). Five rows had claimed a
 * fix the code did not have (A34, S5, T12, T13, B12/B34).
 *
 * This test holds both sides:
 * - every row in Categories A-E shows the status listed here (the first word(s)
 *   of its Status cell), so the document cannot quietly change; and
 * - for each verdict that the code can show, the code still shows it.
 * Change a status in the document and here together. Database verdicts (B2, B3,
 * B7-B9, B18-B20) were read from the live database on 4 Oct and carry no code
 * check.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Status = 'FIXED' | 'NOT A BUG' | 'N/A' | 'ACCEPTED' | 'OPEN';

const read = (path: string) => readFileSync(path, 'utf8');
const has = (path: string, text: string) => read(path).includes(text);
const lacks = (path: string, text: string) => !read(path).includes(text);
const gone = (path: string) => !existsSync(path);

function codeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return codeFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

const pkg = JSON.parse(read('package.json')) as {
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  engines?: { node?: string };
};

/** Every row's status, and the code fact behind it where there is one. */
const AUDIT: Record<string, { status: Status; check?: () => boolean }> = {
  // Category A
  T1: { status: 'FIXED' },
  T2: { status: 'FIXED', check: () => lacks('src/components/WeightPresets.tsx', 'as any') },
  T3: { status: 'NOT A BUG', check: () => has('src/data/metros.ts', 'region?: string;') },
  T4: { status: 'FIXED', check: () => has('src/components/CourtOrderVideo.tsx', 'The server did not return the saved video') },
  T5: { status: 'FIXED', check: () => !/\w!\./.test(read('src/hooks/useComparison.ts')) },
  T6: { status: 'FIXED', check: () => has('src/hooks/useGrokVideo.ts', 'useState<GrokVideoStatus>') },
  T7: { status: 'FIXED', check: () => has('src/hooks/useJudgeVideo.ts', 'useState<JudgeVideoStatus>') },
  T8: { status: 'FIXED' },
  T9: { status: 'FIXED' },
  T10: { status: 'FIXED', check: () => !/\bany\b/.test(read('src/hooks/useEmilia.ts').replace(/\/\/.*$/gm, '')) },
  T11: { status: 'N/A', check: () => gone('api/shared/supabaseClient.ts') },
  T12: { status: 'FIXED', check: () => !/import \{[^}]*\bMETRICS_MAP\b/.test(read('api/evaluate.ts')) },
  T13: { status: 'FIXED', check: () => lacks('api/video/grok-generate.ts', 'generateCacheKey') },
  T14: { status: 'N/A', check: () => gone('api/gamma/generate-gamma.ts') },
  T15: { status: 'NOT A BUG' },
  T16: { status: 'NOT A BUG' },
  T17: { status: 'FIXED', check: () => has('api/stripe/webhook.ts', 'default:') },
  T18: { status: 'N/A', check: () => gone('api/user/preferences.ts') },
  T19: { status: 'FIXED', check: () => has('src/hooks/useTierAccess.ts', 'withRetry(') },
  T20: { status: 'NOT A BUG' },
  T21: { status: 'ACCEPTED' },
  T22: { status: 'FIXED', check: () => has('api/emilia/manuals.ts', "error: 'Failed to load manual'") },
  T23: { status: 'FIXED', check: () => has('src/components/ErrorBoundary.tsx', 'trackError(') },
  T24: { status: 'FIXED', check: () => has('api/evaluate.ts', 'Math.max(0, Math.min(100') },
  T25: { status: 'NOT A BUG', check: () => has('src/components/CitySelector.tsx', 'ALL_METROS.find(') },
  // Category B
  A1: { status: 'FIXED' },
  A2: { status: 'FIXED', check: () => has('api/evaluate.ts', 'requireComparisonGrant(') },
  A3: { status: 'FIXED', check: () => has('api/judge.ts', 'requireComparisonGrant(') },
  A4: { status: 'FIXED' },
  A5: { status: 'FIXED', check: () => has('api/test-llm.ts', 'requireAdmin(') },
  A6: {
    status: 'FIXED',
    check: () => [...codeFiles('api'), ...codeFiles('src')].every((f) => !/eyJ[A-Za-z0-9_-]{20,}/.test(read(f))),
  },
  A7: { status: 'FIXED', check: () => has('api/stripe/webhook.ts', 'constructEvent(') },
  A8: { status: 'FIXED', check: () => has('api/stripe/create-checkout-session.ts', 'isAllowedRedirectUrl(') },
  A9: { status: 'FIXED', check: () => has('api/stripe/create-portal-session.ts', 'isAllowedRedirectUrl(') },
  A10: { status: 'FIXED' },
  A11: { status: 'NOT A BUG' },
  A12: { status: 'FIXED', check: () => has('src/hooks/useComparison.ts', 'comparisonControllerRef.current?.abort()') },
  A13: { status: 'FIXED' },
  A14: { status: 'FIXED' },
  A15: { status: 'FIXED' },
  A16: { status: 'FIXED', check: () => has('api/video/grok-generate.ts', 'fetchWithTimeout(') },
  A17: { status: 'FIXED', check: () => has('src/services/contrastImageService.ts', 'AbortSignal.timeout(') },
  A18: { status: 'ACCEPTED' },
  A19: { status: 'NOT A BUG', check: () => has('src/hooks/useOliviaChat.ts', 'lastComparisonIdRef') },
  A20: { status: 'FIXED' },
  A21: { status: 'FIXED', check: () => has('api/evaluate.ts', 'The request body is not valid JSON') },
  A22: { status: 'FIXED', check: () => has('api/stripe/webhook.ts', 'WebhookWriteError') },
  A23: { status: 'N/A', check: () => gone('api/user/preferences.ts') },
  A24: { status: 'N/A', check: () => lacks('src/hooks/useEmilia.ts', 'AudioContext') },
  A25: { status: 'FIXED', check: () => has('src/hooks/useGrokVideo.ts', 'MAX_POLL_ATTEMPTS') },
  A26: { status: 'FIXED', check: () => has('src/hooks/useJudgeVideo.ts', 'MAX_CONSECUTIVE_POLL_ERRORS') },
  A27: { status: 'FIXED', check: () => has('src/services/cristianoVideoService.ts', 'MAX_POLL_ATTEMPTS') },
  A28: { status: 'FIXED', check: () => has('api/emilia/message.ts', "{ role: 'user', content: text }") },
  A29: { status: 'N/A', check: () => gone('api/shared/supabaseClient.ts') },
  A30: { status: 'FIXED', check: () => has('src/hooks/useApiUsageMonitor.ts', '5 * 60 * 1000') },
  A31: { status: 'FIXED', check: () => has('api/evaluate.ts', "from './shared/models.js'") },
  A32: { status: 'FIXED', check: () => has('api/judge.ts', "from './shared/models.js'") },
  A33: { status: 'FIXED' },
  A34: { status: 'FIXED', check: () => lacks('src/contexts/AuthContext.tsx', 'Profile loaded:') },
  A35: { status: 'FIXED', check: () => has('api/shared/rateLimit.ts', 'X-RateLimit-Limit') },
  // Category C
  S1: { status: 'FIXED', check: () => codeFiles('src').every((f) => !read(f).includes('SIMLI_API_KEY')) },
  S2: { status: 'FIXED' },
  S3: { status: 'FIXED', check: () => codeFiles('src').every((f) => !/localStorage\.setItem\([^)]*password/i.test(read(f))) },
  S4: { status: 'FIXED' },
  S5: { status: 'FIXED', check: () => codeFiles('src').every((f) => !/const \w*ADMIN_EMAILS\w* = \[/.test(read(f))) },
  S6: { status: 'FIXED' },
  S7: { status: 'FIXED', check: () => has('api/usage/consume.ts', '!/[\\u0000-\\u001f\\u007f]/.test(value)') },
  S8: { status: 'FIXED', check: () => has('src/components/ManualViewer.tsx', 'let html = escapeHtml(markdown);') },
  S9: { status: 'ACCEPTED', check: () => codeFiles('src').every((f) => !read(f).includes('SERVICE_ROLE')) },
  S10: { status: 'NOT A BUG' },
  S11: { status: 'NOT A BUG' },
  S12: { status: 'FIXED', check: () => has('src/components/SettingsModal.tsx', "'DELETE MY ACCOUNT'") },
  S13: { status: 'FIXED', check: () => has('src/hooks/useVoiceRecognition.ts', "case 'not-allowed'") },
  // Report-only, then enforced, 4 Oct 2026 (John: "switch")
  S14: { status: 'FIXED', check: () => has('vercel.json', '"Content-Security-Policy"') && lacks('vercel.json', '"Content-Security-Policy-Report-Only"') },
  S15: { status: 'NOT A BUG' },
  S16: { status: 'NOT A BUG' },
  S17: { status: 'NOT A BUG' },
  // Category D
  B1: { status: 'FIXED', check: () => has('vercel.json', '"includeFiles": "api/shared/**"') },
  B2: { status: 'FIXED', check: () => has('api/consent/log.ts', "from('consent_logs')") },
  B3: { status: 'N/A' },
  B4: { status: 'FIXED', check: () => !('@anthropic-ai/sdk' in pkg.dependencies) },
  B5: { status: 'FIXED', check: () => !('openai' in pkg.dependencies) },
  B6: { status: 'FIXED', check: () => has('tsconfig.app.json', '"strict": true') && has('tsconfig.api.json', '"strict": true') },
  B7: { status: 'FIXED' },
  B8: { status: 'N/A' },
  B9: { status: 'FIXED' },
  B10: { status: 'FIXED', check: () => has('vite.config.ts', 'codeSplitting') },
  B11: { status: 'FIXED', check: () => ['lint', 'test', 'typecheck'].every((s) => s in pkg.scripts) },
  B12: { status: 'FIXED', check: () => has('.env.example', 'FAL_KEY=') },
  B13: { status: 'NOT A BUG', check: () => has('vercel.json', '"/assets/(.*)"') },
  B14: { status: 'FIXED', check: () => has('vercel.json', 'X-Content-Type-Options') },
  B15: { status: 'FIXED', check: () => gone('public/sw.js') && has('vite.config.ts', "handler: 'NetworkFirst'") },
  B16: { status: 'FIXED', check: () => gone('public/sw.js') },
  B17: { status: 'NOT A BUG' },
  B18: { status: 'FIXED' },
  B19: { status: 'FIXED' },
  B20: { status: 'N/A' },
  B21: { status: 'FIXED', check: () => has('src/legal/legalContent.ts', 'How long we keep it') },
  B22: { status: 'FIXED', check: () => !gone('api/user/export.ts') },
  B23: { status: 'NOT A BUG' },
  B24: { status: 'FIXED', check: () => has('public/robots.txt', 'Disallow: /api/') },
  B25: { status: 'FIXED', check: () => has('index.html', 'og:title') },
  B26: { status: 'FIXED', check: () => Boolean(pkg.engines?.node) },
  B27: { status: 'NOT A BUG' },
  B28: { status: 'NOT A BUG', check: () => has('.gitignore', '.env.local') },
  B29: { status: 'ACCEPTED' },
  B30: { status: 'NOT A BUG' },
  B31: { status: 'NOT A BUG' },
  B32: { status: 'NOT A BUG' },
  B33: { status: 'ACCEPTED' },
  B34: { status: 'FIXED' },
  B35: { status: 'FIXED', check: () => has('vercel.json', '(?!api/') },
  // Category E
  ML1: { status: 'FIXED', check: () => has('src/hooks/useDIDStream.ts', 'openStreamRef') },
  ML2: { status: 'NOT A BUG' },
  ML3: { status: 'NOT A BUG' },
  ML4: { status: 'NOT A BUG' },
  ML5: { status: 'NOT A BUG' },
  ML6: { status: 'FIXED', check: () => has('src/components/WeightPresets.tsx', 'setHydrated(true)') },
  ML7: { status: 'FIXED', check: () => has('src/components/OliviaChatBubble.tsx', 'clearTimeout(') },
  ML8: { status: 'FIXED', check: () => has('src/components/EmiliaChat.tsx', 'clearTimeout(') },
  ML9: { status: 'ACCEPTED' },
  ML10: { status: 'FIXED' },
  ML11: { status: 'FIXED', check: () => has('src/components/LoginScreen.tsx', 'signupTimeoutRef') },
  ML12: { status: 'FIXED', check: () => has('src/components/ResetPasswordScreen.tsx', 'redirectTimeoutRef') },
  ML13: { status: 'FIXED', check: () => has('src/hooks/useTTS.ts', '}, [speed]);') },
  ML14: { status: 'FIXED', check: () => has('src/hooks/useTTS.ts', '}, [voiceId, playUrl, speed]);') },
};

/** Status cell of each Category A-E row, by id. */
function documentRows(): Map<string, string> {
  const rows = new Map<string, string>();
  for (const line of read('docs/MASTER_BUG_AUDIT_20260220.md').split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 8) continue;
    const id = cells[1];
    if (!/^(T|A|S|B|ML)\d+$/.test(id)) continue;
    rows.set(id, cells[cells.length - 2]);
  }
  return rows;
}

describe('bug audit document', () => {
  const rows = documentRows();

  it('lists exactly the audited rows', () => {
    expect([...rows.keys()].sort()).toEqual(Object.keys(AUDIT).sort());
  });

  it('shows the status this test holds for every row', () => {
    const wrong = Object.entries(AUDIT)
      .filter(([id, { status }]) => !(rows.get(id) ?? '').startsWith(status))
      .map(([id, { status }]) => `${id}: document says "${rows.get(id)}", expected ${status}`);
    expect(wrong).toEqual([]);
  });

  it('every verdict the code can show still holds in the code', () => {
    const broken = Object.entries(AUDIT)
      .filter(([, { check }]) => check && !check())
      .map(([id]) => id);
    expect(broken).toEqual([]);
  });
});
