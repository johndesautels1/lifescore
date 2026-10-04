# LIFE SCORE — Grand Master Bug List (Single Source of Truth)

**Audit Date:** 2026-02-20
**Last Status Update:** 2026-10-04 — every item re-checked against the code and the live database, not against this document
**Scope:** Full codebase — 25 categories across 5 parallel agents
**Total bugs found:** 110 (deduplicated from technical audit)

**DO NOT create new bug lists. Update THIS file only.**

**Held to the code by `tests/bugAudit.test.ts`.** Every row in Categories A–E carries one status word — FIXED, NOT A BUG, N/A, ACCEPTED or OPEN — followed by its evidence. The test fails if a row's status disagrees with the test's own list, and for each verdict it can check in the code (a file, a call, a guard), it checks it. Change a status here and in the test together.

---

## THE 4 OCTOBER 2026 VERIFICATION

John, 4 Oct 2026: *"you must verify each one with the actual code not trusting the docs and you must update the docs so they dont drift again."*

**Wrong in this document until today** (marked fixed or clean; the code disagreed):

| ID | The document said | The code said | Now |
|----|-------------------|---------------|-----|
| A34 | Console.log in auth flow — FIXED | The browser console printed the signed-in user's id and email; the pricing screens logged the whole profile; saved comparisons logged the user id | Fixed (commit 0e8c900); `tests/browserLogs.test.ts` |
| S5 | Admin emails centralized — FIXED | HelpModal and PromptsManager still carried their own copied admin list | Both use the server's admin answer (`useTierAccess`) |
| T12 | Unused import — FIXED | `api/evaluate.ts` still imported `METRICS_MAP` unused | Removed (0e8c900) |
| T13 | No unused imports | `api/video/grok-generate.ts` computed a cache key it never used | Removed (0e8c900) |
| B12, B34 | .env.example complete | Nine settings the code reads were missing (FAL_KEY, LIVEAVATAR_*, INVIDEO_*, PRODUCTION_URL, SUPABASE_ACCESS_TOKEN, two fallback names); four it lists were no longer read | Matched both ways; `tests/envExample.test.ts` |
| #7 (errors) | No offline detection — OPEN | `src/main.tsx` already tells the user when the connection drops and returns | FIXED |
| as any (11) | 11 places | 39 `as any` in src/ and api/ | OPEN (counted below) |

**Real faults fixed today:** A16 and six more server calls with no time limit · A17 · A21 · A26 · T4 · ML1 (a paid D-ID stream left open on exit) · ML6 (saved preferences overwritten by defaults on every visit — also in DealbreakersPanel) · ML13/ML14 · S7 · S8. New drift tests: `serverTimeouts`, `browserLogs`, `envExample`, `preferenceSaves`, `bugAudit`.

**Checked in the live database** (Supabase, 4 Oct 2026): every public table has row-level security; consent records and usage rows are readable only by their owner; `comparisons.user_id` is indexed and linked to `profiles`; `user_preferences` has no duplicate index; scores are stored as `numeric`. The table `api_usage_log` no longer exists (usage lives in `usage_tracking`, owner-only, linked to `profiles`).

**Found in the live database and fixed** (4 Oct 2026, migration `20261004_reconcile_live_schema`, applied with John's approval). Three committed migrations had never been applied, and the report library's storage bucket had been made by hand as `Reports` while the code and its policies use `reports`:

- Gamma reports had not saved to accounts since 15 Feb (the insert named `pdf_storage_path` / `pptx_storage_path`, missing live);
- PDF and PowerPoint exports could not be kept (no `gamma-exports` bucket), so users got Gamma's expiring links;
- the report library had never saved a report (0 rows, 0 files);
- the Do Not Sell opt-out was not stored (`user_preferences.ccpa_dns_optout` missing).

Account deletion now clears `reports/` (it named the empty `Reports`). The opt-out audit view runs with the caller's permissions. Held by `tests/storageBuckets.test.ts` and `tests/schemaColumns.test.ts`.

---

## PART 1: BUGS FIXED IN THE FEBRUARY SESSIONS (47 total)

The February history, kept as it was recorded. The current state of each item is in the category tables below.

| # | Bug ID | Commit | What Was Fixed |
|---|--------|--------|----------------|
| 1 | H1 | 20b9a00 | React hooks moved above conditional return (crash fix) |
| 2 | S1 | a9fa464 | API key was being sent to the browser — removed |
| 3 | X1+X2 | 5a34947 | Stripe redirect URLs validated (prevents phishing) |
| 4 | N4 | 2fcb59a | Tie case showed blank text in report verdict |
| 5 | RT1 | 37f0d00 | Retry logic actually works now (was retrying stale promises) |
| 6 | SD1+SD2 | 313f83f | Hardcoded "2025" replaced with dynamic year |
| 7 | D1 | 6f55521 | innerHTML XSS vulnerability replaced with safe DOMParser |
| 8 | X3 | 49c3787 | voiceId validated before URL injection (prevents attack) |
| 9 | M1 | d2b2d37 | JSDoc said 45s timeout but code uses 12s — corrected |
| 10 | B4 | f1affd7 | var replaced with let (scoping bug) |
| 11 | DC3 | d6ee00f | Dead gitHubUsername state removed |
| 12 | P2 | 1bf8a0c | Social media preview images now use absolute URLs |
| 13 | RL2 | ccc8ac3 | check-quotas endpoint now requires login |
| 14 | AC4 | f3a70be | Prompts endpoint now requires login |
| 15 | A11 | f552343 | InVideo override endpoint now requires login |
| 16 | DC1 | 6c3c3cd | Dead byProvider Map code removed |
| 17 | S4 | 24727ba | Admin env-check masks secrets more tightly |
| 18 | EN1+EN2 | 3c50445 | Missing env vars added to .env.example |
| 19 | M3 | 908faef | Hardcoded bypass emails removed (was security hole) |
| 20 | S5 | 135f648+5f248de | Admin emails centralized (was copy-pasted in 10 files) — two screens still had copies until 4 Oct 2026 |
| 21 | C2 | 992db07 | CORS mode was missing on sync-emilia endpoint |
| 22 | Refactor | 9bfe497 | sync-olivia cleaned up to use shared helpers |
| 23 | EN3 | 4816ccf | Resend email from-address standardized |
| 24 | RL3 | 82984a2 | ElevenLabs usage endpoint now requires login |
| 25 | A12 | aa3f1a6 | Gun comparison endpoint now requires login |
| 26 | A13 | 25c4326 | Olivia context endpoint now requires login |
| 27 | A14 | e8a948f | Emilia thread endpoint now requires login |
| 28 | A15 | c5bfb30 | Simli speak endpoint now requires login |
| 29 | A16 | d6b96f6 | Video status endpoint now requires login |
| 30 | A17 | f6861dc | HeyGen streaming endpoint now requires login |
| 31 | A18+A19 | 1ec92e9 | HeyGen video + D-ID streams now require login |
| 32 | A28 | b579628 | Grok generate: auth added + IDOR fix (users could spoof other users' IDs) |
| 33 | A27 | f2c4499 | Grok status endpoint now requires login |
| 34 | A30 | 99ee3d5 | Main comparison engine now requires login |
| 35 | A31 | 7a516c7 | Judge consensus endpoint now requires login |
| 36 | A33 | b808b6e | Gamma report endpoint now requires login |
| 37 | A34 | b808b6e | Judge video endpoint now requires login |
| 38 | C3 | 4aff50d | CORS tightened from "allow anyone" to "our app only" on 3 endpoints |
| 39 | CL1 | 34d3135 | 44 debug console.log removed from JudgeTab |
| 40 | CL2 | 573c867 | 10 debug console.log removed from CourtOrderVideo |
| 41 | CL3 | f5dceaf | 10 debug console.log removed from VisualsTab |
| 42 | CL4 | e25e0e4 | 7 debug console.log removed from AskOlivia |
| 43 | CL5 | 50e1d9d | 5 debug console.log removed from SavedComparisons |
| 44-47 | CL6 | b2e96e3 | 11 debug console.log removed from 5 smaller components |

(The IDs in Part 1 are the February session's own numbering; A12, A13… here are not the Category B rows of the same name.)

---

## PART 2: THE FEBRUARY "NOT FIXED" GROUPS — STATE ON 4 OCT 2026

### Security / code-audit skips

| Bug ID | What it is | State (4 Oct 2026) |
|--------|-----------|--------------------|
| B1 (timeouts) | vercel.json function time limits | NOT A BUG — the functions that need longer than the default carry `maxDuration` in vercel.json; every outbound server call now has its own limit (`tests/serverTimeouts.test.ts`). |
| R5 (duplication) | withTimeout copy-pasted | OPEN — 11 copies (was 12). Joins the code-style clean-up on the burndown. |
| I1 (duplication) | CORS / fetch helpers duplicated | IMPROVED — CORS is one helper (`api/shared/cors.ts`); server fetches share `api/shared/fetchWithTimeout.ts`. Remaining copies join the code-style clean-up. |
| A5 (anon key) | Hard-coded Supabase key fallback in src/lib/supabase.ts | FIXED — no Supabase key is written anywhere in src/ or api/; settings load from the build or the server (`src/lib/publicConfig.ts`). |
| C1 (CORS) | Some endpoints allow any website | FIXED — one route is open to every site, `api/health.ts`, a public health check. |
| G1+G2 (GDPR DB) | Consent and deletion | FIXED — consent records in `consent_logs` (written by the server, owner-only reads); Download My Data and Delete My Account in Settings (`api/user/export.ts`, `api/user/delete.ts`, `tests/privacyRoutes.test.ts`). |
| P1 (favicon) | PNG icons | FIXED — favicon-16/32, apple-touch-icon and PWA icons ship in public/. |
| P3 (zoom) | user-scalable=no | NOT A BUG — deliberate for the mobile app. |
| P4 (PWA devOptions) | Dev config | NOT A BUG. |
| SD3 (Gemini model) | Model name | FIXED — model names live in `api/shared/models.ts`. |
| DC6 (async) | "Unnecessary async" | NOT A BUG. |
| as any | Type escapes | OPEN — 39 `as any` in src/ and api/ (the February count of 11 was wrong). Code-style clean-up. |

### Error handling

| Bug | What it is | State |
|-----|-----------|-------|
| #4 | Errors only in the console | FIXED — react-hot-toast, `<Toaster>` in main.tsx, `src/utils/toast`. |
| #7 | No offline detection | FIXED — `src/main.tsx` toasts on `offline` and `online`. |
| #10 | No error tracking | FIXED — `src/lib/errorTracking.ts`; ErrorBoundary calls `trackError`. |

### Database / Supabase

| Bug | What it is | State |
|-----|-----------|-------|
| #6 | Migration IF NOT EXISTS | NOT A BUG. |
| #8 | Hung connections raced with a timeout | ACCEPTED — queries run through `withRetry` with a timeout. |
| #10 | avatar_videos publicly readable | BY DESIGN — public video content; RLS on. |
| #13 | Connection pooling | N/A — Supabase pools. |
| #14 | Backend does not check the plan | FIXED 3 Oct 2026 — every paid server route checks the plan (`api/shared/entitlements.ts`; comparisons need a signed grant from `/api/usage/consume`). |
| #15 | Migration ordering | ACCEPTED — applied migrations are not renamed. |

### Mobile UI/UX (39), Accessibility/WCAG (21), FINAL-CODEBASE-FIXES-TABLE (52)

The individual items behind these counts were never written into this file, and their source table is no longer in the repository, so they cannot be checked one by one. What could be checked:

- **WCAG HIGH (4):** live regions for changing content — FIXED (`aria-live` on the loading progress, Olivia's chat log and the winner); tab bar keyboard — FIXED (arrow keys, Home, End in `TabNavigation.tsx`); winner bars by colour only — FIXED (each bar names its city and the winner is written out); form errors linked to inputs — FIXED (`aria-invalid` + `aria-describedby` in LoginScreen).
- **Mobile HIGH (5):** FIXED in February (768 px and 480 px breakpoints).
- The rest of the mobile and accessibility polish moves to the burndown's look-and-feel work (the 3D look, dark glass hovers centred on phones).

### Performance

| Bug | What it is | State |
|-----|-----------|-------|
| #1 | App.tsx had 32 useState | IMPROVED — 19 now, with reducers for modals and the enhanced flow. |
| #2 | 1.5 MB logo | FIXED — 37 KB WebP. |
| #4 | Saved comparisons waited for the database | FIXED — shows the browser's copy first, then syncs (`SavedComparisons.tsx`). |
| #7–#9 | Missing memoisation | ACCEPTED — memo only where measured. |
| #14 | 100 metrics without virtualisation | ACCEPTED — not measured as slow. |

### Scoring

| Bug | What it is | State |
|-----|-----------|-------|
| #3 | Phase 2 scoring code behind a flag | OPEN — still in `api/evaluate.ts` behind `USE_CATEGORY_SCORING`, with two unused prompt builders (`buildEvaluationPromptWithScoring`, `buildPrompt`). Removing it needs the flag's Vercel value confirmed first. |

---

## PART 3: BOTTOM LINE (4 OCT 2026)

- Launch blocker #14 (server plan checks): FIXED 3 Oct 2026.
- GDPR (G1/G2), retention and portability (B21/B22): FIXED — the privacy policy promises keeping data for the life of the account and deleting it at once on request, which is what the code does.
- Open and real: S14 (a Content-Security-Policy header), the code-style clean-up (39 `as any`, 11 withTimeout copies, dead Phase 2 code), and the mobile/accessibility polish folded into the look-and-feel work.

---

## 110-BUG TECHNICAL AUDIT — DETAILED REFERENCE

### Severity Distribution

| Severity | Count |
|----------|-------|
| 5 — CRITICAL | 5 |
| 4 — MAJOR | 15 |
| 3 — MODERATE | 34 |
| 2 — MINOR | 40 |
| 1 — COSMETIC | 16 |

### CATEGORY A: TYPESCRIPT & TYPE SAFETY (25 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| T1 | src/components/NewLifeVideos.tsx | 5 | MED | Rules of Hooks violation | FIXED — ESLint's rules-of-hooks (4 Oct run) flags nothing here |
| T2 | src/components/WeightPresets.tsx | 3 | LOW | `as any` on weight redistribution | FIXED — no `as any` in the file |
| T3 | src/components/CitySelector.tsx | 2 | LOW | Metro type missing fields used in filtering | NOT A BUG — Metro is {city, country, region?}; the selector reads only these |
| T4 | src/components/CourtOrderVideo.tsx | 2 | LOW | result destructured without guard | FIXED — 4 Oct: a reply without the saved row shows an error instead of crashing |
| T5 | src/hooks/useComparison.ts | 2 | LOW | Non-null assertion on API response | FIXED — none left |
| T6 | src/hooks/useGrokVideo.ts | 2 | LOW | Status not a literal union | FIXED — `useState<GrokVideoStatus>` |
| T7 | src/hooks/useJudgeVideo.ts | 2 | LOW | Same | FIXED — `useState<JudgeVideoStatus>` |
| T8 | src/hooks/useCristianoVideo.ts | 2 | LOW | Same | FIXED — CristianoVideoState.status is a literal union |
| T9 | src/components/ManualViewer.tsx | 2 | LOW | Optional chain missing | FIXED — no unguarded nested access |
| T10 | src/hooks/useEmilia.ts | 2 | LOW | `any` cast on audio context | FIXED — no `any`; plays an audio element |
| T11 | api/shared/supabaseClient.ts | 2 | LOW | Module-level `!` on env vars | N/A — file removed |
| T12 | api/evaluate.ts | 1 | LOW | Unused import | FIXED — 4 Oct: METRICS_MAP removed (the February fix had missed it) |
| T13 | api/video/grok-generate.ts | 1 | LOW | Unused import | FIXED — 4 Oct: unused cache key and its crypto import removed |
| T14 | api/gamma/generate-gamma.ts | 1 | LOW | Unused import | N/A — path is now api/gamma.ts |
| T15 | src/components/TabNavigation.tsx | 1 | LOW | Prop interface overly broad | NOT A BUG — typed props, icon names typed (`Icon3DName`) |
| T16 | src/components/HelpBubble.tsx | 1 | LOW | Unused CSS class | NOT A BUG |
| T17 | api/stripe/webhook.ts | 2 | LOW | switch without default | FIXED — `default:` present |
| T18 | api/user/preferences.ts | 2 | LOW | Preference key validation | N/A — file does not exist |
| T19 | src/hooks/useTierAccess.ts | 2 | LOW | Retry without backoff | FIXED — `withRetry` (exponential backoff) |
| T20 | src/components/LoadingState.tsx | 1 | LOW | Inline style objects | NOT A BUG — the dynamic width is intentional |
| T21 | api/shared/rateLimit.ts | 2 | LOW | In-memory limiter resets on cold start | ACCEPTED — burst protection only; paid use is counted in the database |
| T22 | api/emilia/manuals.ts | 1 | LOW | Error leaks internal path | FIXED — 500 answers `{ error: 'Failed to load manual' }` only |
| T23 | src/components/ErrorBoundary.tsx | 1 | LOW | Logs to console only | FIXED — calls `trackError` |
| T24 | api/evaluate.ts | 2 | LOW | LLM response not validated | FIXED — every score checked, clamped 0–100, invalid ones dropped |
| T25 | src/hooks/useURLParams.ts | 1 | LOW | URL params not sanitised | NOT A BUG — the values are only matched against the city list |

### CATEGORY B: API, AUTH & RACE CONDITIONS (35 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| A1 | api/video/grok-generate.ts | 5 | MED | No auth + arbitrary userId | FIXED — plan check on the signed-in user |
| A2 | api/evaluate.ts | 4 | MED | No auth on LLM evaluation | FIXED — `requireComparisonGrant` |
| A3 | api/judge.ts | 4 | MED | No auth on judge | FIXED — `requireComparisonGrant` |
| A4 | api/gamma.ts | 4 | MED | No auth on Gamma | FIXED — plan check (path was api/gamma/generate-gamma.ts) |
| A5 | api/test-llm.ts | 4 | MED | No auth on test endpoint | FIXED — `requireAdmin` |
| A6 | 6 API files | 4 | MED | SUPABASE_ANON_KEY fallback | FIXED — no key written in code |
| A7 | api/stripe/webhook.ts | 4 | HIGH | Signature not verified in dev | FIXED — `constructEvent` always; no secret means 500 |
| A8 | api/stripe/create-checkout-session.ts | 4 | MED | Open redirect | FIXED — `isAllowedRedirectUrl` |
| A9 | api/stripe/create-portal-session.ts | 4 | MED | Open redirect | FIXED — `isAllowedRedirectUrl` |
| A10 | api/user/delete.ts | 4 | HIGH | GDPR delete misses tables | FIXED — 3 Oct: every user table (`tests/privacyRoutes.test.ts`) |
| A11 | src/contexts/AuthContext.tsx | 3 | LOW | Two tabs fetch at once | NOT A BUG — each tab reads its own copy; the reads change nothing |
| A12 | src/hooks/useComparison.ts | 3 | LOW | Abort controller race | FIXED — the previous comparison is aborted first |
| A13 | api/evaluate.ts | 3 | LOW | No request timeout | FIXED — model calls are timed |
| A14 | api/judge.ts | 3 | LOW | No request timeout | FIXED — through the shared Claude client, timed |
| A15 | api/gamma.ts | 3 | LOW | No request timeout | FIXED — timed |
| A16 | api/video/grok-generate.ts | 3 | LOW | No request timeout | FIXED — 4 Oct: the Minimax request (30 s), and six other untimed server calls (`tests/serverTimeouts.test.ts`) |
| A17 | src/hooks/useContrastImages.ts | 3 | LOW | No timeout/abort | FIXED — 4 Oct: the browser gives up after 2 minutes with a plain message |
| A18 | api/shared/rateLimit.ts | 3 | MED | Rate limiter per instance | ACCEPTED — as T21 |
| A19 | src/hooks/useOliviaChat.ts | 3 | MED | useEffect self-triggers | NOT A BUG — guarded by the last-comparison ref and a stale-result check |
| A20 | src/hooks/useComparison.ts | 2 | LOW | Error state not cleared | FIXED — a new comparison replaces the whole state |
| A21 | api/evaluate.ts | 2 | LOW | Bad JSON returns 500 | FIXED — 4 Oct: answers 400 |
| A22 | api/stripe/webhook.ts | 2 | LOW | Tier update failure swallowed | FIXED — a failed write answers 500 so Stripe retries |
| A23 | api/user/preferences.ts | 2 | LOW | Upsert conflict | N/A — file does not exist |
| A24 | src/hooks/useEmilia.ts | 2 | LOW | Audio context not resumed | N/A — plays an audio element, no AudioContext |
| A25 | src/hooks/useGrokVideo.ts | 2 | LOW | Polling not cleared on error | FIXED — capped at MAX_POLL_ATTEMPTS, errors included |
| A26 | src/hooks/useJudgeVideo.ts | 2 | LOW | Polling not cleared on error | FIXED — 4 Oct: stops after 15 minutes or 10 failed checks in a row |
| A27 | src/hooks/useCristianoVideo.ts | 2 | LOW | Polling not cleared | FIXED — the service polls at most MAX_POLL_ATTEMPTS |
| A28 | api/emilia/message.ts | 2 | LOW | System prompt injection | FIXED — the user's text goes only in the user turn |
| A29 | api/shared/supabaseClient.ts | 2 | LOW | Shared client instance | N/A — file removed |
| A30 | src/hooks/useApiUsageMonitor.ts | 2 | LOW | 60 s usage check | FIXED — every 5 minutes |
| A31 | api/evaluate.ts | 1 | LOW | Hard-coded model name | FIXED — `api/shared/models.ts` |
| A32 | api/judge.ts | 1 | LOW | Hard-coded model name | FIXED — `api/shared/models.ts` |
| A33 | api/video/grok-generate.ts | 1 | LOW | Hard-coded model name | FIXED — each video model named once in its vendor file |
| A34 | src/contexts/AuthContext.tsx | 1 | LOW | Console.log in auth flow | FIXED — 4 Oct: the console no longer shows ids, emails or profiles (`tests/browserLogs.test.ts`) |
| A35 | api/shared/rateLimit.ts | 1 | LOW | Rate limit headers not set | FIXED — X-RateLimit-* set |

### CATEGORY C: SECURITY (17 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| S1 | api/avatar/simli-session.ts | 5 | HIGH | API key returned to client | FIXED — the key stays on the server (`api/simli-config.ts` returns a session token) |
| S2 | api/simli-config.ts | 5 | HIGH | Same | FIXED — as S1 |
| S3 | src/components/LoginScreen.tsx | 5 | HIGH | Password in localStorage | FIXED — never stored |
| S4 | vercel.json | 4 | MED | CORS * on API routes | FIXED — per-route CORS in `api/shared/cors.ts` |
| S5 | 4 files | 3 | MED | Hard-coded admin emails | FIXED — 4 Oct: the last two copies removed; one list in `api/shared/plans.ts` |
| S6 | api/emilia/message.ts | 3 | LOW | System prompt injection | FIXED — as A28 |
| S7 | api/usage/consume.ts | 3 | LOW | City names unsanitised in prompt | FIXED — 4 Oct: names with line breaks or control characters are refused before the grant that binds them |
| S8 | src/components/ManualViewer.tsx | 3 | LOW | dangerouslySetInnerHTML | FIXED — 4 Oct: the manual text is escaped before conversion, so only the converter's own tags appear |
| S9 | api/shared/supabaseAdmin.ts | 3 | MED | Service role key overused | ACCEPTED — server-only, never in src/; routes authenticate first |
| S10 | src/App.tsx | 2 | LOW | Anon key in client bundle | NOT A BUG — public by Supabase design; RLS protects data |
| S11 | api/stripe/webhook.ts | 2 | LOW | Webhook secret not rotated | NOT A BUG — rotation is done in Stripe's dashboard, not in code |
| S12 | api/user/delete.ts | 2 | LOW | No delete confirmation | FIXED — the user types DELETE MY ACCOUNT; the server checks it |
| S13 | src/hooks/useVoiceRecognition.ts | 1 | LOW | Mic permission not graceful | FIXED — a plain message on not-allowed |
| S14 | vercel.json | 1 | LOW | No Content-Security-Policy | OPEN — needs one careful policy across every vendor (Simli, LiveKit, HeyGen, D-ID, Stripe, Supabase, Gamma, video hosts) |
| S15 | api/evaluate.ts | 1 | LOW | Stack trace in error response | NOT A BUG — no stack in any response |
| S16 | api/judge.ts | 1 | LOW | Same | NOT A BUG |
| S17 | api/video/grok-generate.ts | 1 | LOW | Same | NOT A BUG |

### CATEGORY D: CONFIG, BUILD, DATABASE & COMPLIANCE (35 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| B1 | vercel.json | 4 | HIGH | API routes missing includeFiles | FIXED — `includeFiles: api/shared/**` where needed |
| B2 | supabase | 4 | HIGH | consent_logs RLS blocks inserts | FIXED — the server writes consent (`api/consent/log.ts`); signed-in users may insert their own (checked live 4 Oct) |
| B3 | supabase | 4 | HIGH | No RLS for api_usage_log | N/A — table gone; `usage_tracking` has RLS, owner-only (checked live) |
| B4 | package.json | 3 | MED | @anthropic-ai/sdk in client deps | FIXED — not a dependency |
| B5 | package.json | 3 | MED | openai in client bundle | FIXED — not a dependency |
| B6 | tsconfig | 3 | MED | strict: false | FIXED — strict in both app and server configs |
| B7 | supabase | 2 | LOW | Missing index comparisons.user_id | FIXED — `idx_comparisons_user_id` (checked live) |
| B8 | supabase | 2 | LOW | Missing index api_usage_log.created_at | N/A — table gone |
| B9 | supabase | 2 | LOW | Duplicate index user_preferences | FIXED — primary key + unique(user_id) only (checked live) |
| B10 | vite.config.ts | 2 | LOW | No chunk splitting | FIXED — Rolldown `codeSplitting.groups` |
| B11 | package.json | 2 | LOW | No lint/typecheck scripts | FIXED — `lint`, `test`, `typecheck` |
| B12 | .env.example | 2 | LOW | Missing API key entries | FIXED — 4 Oct: matches the code both ways (`tests/envExample.test.ts`) |
| B13 | vercel.json | 2 | LOW | No cache headers on static assets | NOT A BUG — /assets/ headers set |
| B14 | vercel.json | 2 | LOW | No security headers | FIXED — X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| B15 | public/sw.js | 2 | LOW | Service worker caches API | FIXED — hand-written sw.js gone; Workbox caches no API call and fetches the start page from the network first |
| B16 | public/sw.js | 2 | LOW | No cache versioning | FIXED — Workbox revisions and `cleanupOutdatedCaches` |
| B17 | public/manifest.json | 2 | LOW | start_url mismatch | NOT A BUG |
| B18 | supabase | 2 | LOW | real vs numeric for scores | FIXED — scores are numeric (checked live) |
| B19 | supabase | 2 | LOW | No FK comparisons.user_id | FIXED — references profiles.id (checked live) |
| B20 | supabase | 2 | LOW | No FK api_usage_log.user_id | N/A — table gone; usage_tracking.user_id references profiles.id |
| B21 | docs/legal | 3 | MED | Data retention not implemented | FIXED — the policy states account-lifetime retention and immediate deletion, which the code does |
| B22 | docs/legal | 3 | MED | Data portability not implemented | FIXED — Download My Data (`api/user/export.ts`) |
| B23 | api/user/delete.ts | 3 | MED | No confirmation email on delete | NOT A BUG — none promised; deletion is confirmed on screen and takes effect at once |
| B24 | public/robots.txt | 1 | LOW | Allows crawling /api/ | FIXED — Disallow: /api/ |
| B25 | index.html | 1 | LOW | Missing OG meta tags | FIXED — og: and twitter: tags in index.html |
| B26 | package.json | 1 | LOW | No engines field | FIXED — engines.node 24.x |
| B27 | vercel.json | 1 | LOW | No region config | NOT A BUG — the project runs in fra1 (Vercel project setting) |
| B28 | .gitignore | 1 | LOW | Missing .env.local | NOT A BUG — listed |
| B29 | supabase | 1 | LOW | Inconsistent naming | ACCEPTED — applied migrations are not renamed |
| B30 | tsconfig.json | 1 | LOW | No path aliases | NOT A BUG — a style choice |
| B31 | vite.config.ts | 1 | LOW | No env validation plugin | NOT A BUG — public settings are validated as they load (`src/lib/publicConfig.ts`) |
| B32 | package.json | 1 | LOW | No prepare script | NOT A BUG — nothing to prepare |
| B33 | supabase | 1 | LOW | No comments on RLS policies | ACCEPTED — the policy names say what each does |
| B34 | .env.example | 1 | LOW | No descriptions for env vars | FIXED — every entry described (4 Oct) |
| B35 | vercel.json | 2 | LOW | SPA fallback masks API 404s | FIXED — the fallback excludes api/ |

### CATEGORY E: REACT STATE & MEMORY LEAKS (14 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| ML1 | src/hooks/useAvatarProvider.ts | 4 | MED | Stale disconnect — WebRTC leak | FIXED — 4 Oct: leaving now closes the paid D-ID stream on D-ID's side (`openStreamRef` in useDIDStream) |
| ML2 | src/components/OliviaAvatar.tsx | 3 | MED | connect/disconnect stale closure | NOT A BUG — useSimli's disconnect reads refs and never changes |
| ML3 | src/components/NewLifeVideos.tsx | 3 | LOW | reset missing from deps | NOT A BUG — reset never changes (stable callback) |
| ML4 | src/components/CourtOrderVideo.tsx | 3 | LOW | reset missing from deps | NOT A BUG — reset is stable and the effect sees the current upload; adding the upload would reset on every upload |
| ML5 | src/components/WeightPresets.tsx | 3 | MED | Mount effect calls stale callback | NOT A BUG — runs once, with the props of that render |
| ML6 | src/components/WeightPresets.tsx | 3 | MED | Save effect overwrites with defaults | FIXED — 4 Oct: saving waits for the load (also DealbreakersPanel); `tests/preferenceSaves.test.ts` |
| ML7 | src/components/OliviaChatBubble.tsx | 2 | LOW | setTimeout without cleanup | FIXED — clearTimeout in cleanup |
| ML8 | src/components/EmiliaChat.tsx | 2 | LOW | setTimeout without cleanup | FIXED — clearTimeout in cleanup |
| ML9 | src/components/CitySelector.tsx | 2 | LOW | Filtered list recomputed every render | ACCEPTED — 201 cities; not measured as slow |
| ML10 | src/components/ManualViewer.tsx | 2 | LOW | userEmail in deps but unused | FIXED |
| ML11 | src/components/LoginScreen.tsx | 2 | LOW | setTimeout without cleanup | FIXED — ref + clearTimeout |
| ML12 | src/components/ResetPasswordScreen.tsx | 2 | LOW | setTimeout without cleanup | FIXED — ref + clearTimeout |
| ML13 | src/hooks/useTTS.ts | 2 | LOW | speed missing from deps | FIXED — 4 Oct |
| ML14 | src/hooks/useTTS.ts | 2 | LOW | speed missing from play deps | FIXED — 4 Oct |

---

**END OF GRAND MASTER BUG LIST**

*This is the SINGLE SOURCE OF TRUTH. Do not create new bug lists. Update this file only — and `tests/bugAudit.test.ts` with it.*
