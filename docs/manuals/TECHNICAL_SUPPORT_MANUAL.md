# LIFE SCORE Technical Support Manual

**Last Reviewed:** 4 October 2026
**Document ID:** LS-TSM-001
**For:** administrators and developers (restricted in the admin panel)

How LIFE SCORE is built, run, checked and repaired. Everything the code itself defines — routes, settings, tables, models, libraries, functions, jobs, tests — is written into this manual from the code each time it is opened. Each written section names the code it explains and is brought up to date automatically when that code changes (section 14).

---

## 1. Architecture
<!-- covers: vercel.json, vite.config.ts, src/main.tsx -->

- **The app** — a React single-page app built with Vite (Rolldown bundler), served by Vercel from `dist/`. It is also an installable PWA: the service worker precaches the app's scripts and styles, fetches the start page from the network first (the stored copy only when offline), and caches other scripts on first use. Supabase settings load before the app starts (`src/lib/publicConfig.ts`).
- **The server** — Vercel functions in `api/` (Node.js), one file per route. Shared server code lives in `api/shared/`; each outside vendor has one client file there.
- **Data** — Supabase: Postgres with row-level security, Supabase Auth (email/password and Google), and Storage for videos that must outlive the vendors' temporary links.
- **Outside services** — AI models (Anthropic, OpenAI, Google, xAI, Perplexity), Tavily (web research), video and voice (fal/Kling 3, Replicate, HeyGen, LiveAvatar, Simli, D-ID, ElevenLabs, InVideo), Gamma (visual reports), Stripe (payments), Resend (email), Vercel KV (cache).
- **Region** — functions run in Frankfurt (fra1).

Libraries and versions (from `package.json`):

<!-- facts:stack -->
<!-- /facts:stack -->

---

## 2. Where things are
<!-- covers: src/App.tsx, src/components/TabNavigation.tsx -->

| Folder | What it holds |
|---|---|
| `src/components/` | Screens and their parts (one `.tsx` + `.css` per component) |
| `src/hooks/` | React hooks (comparison runs, videos, voice, plan access, tilt) |
| `src/services/` | Browser-side services (saved comparisons and sync, Gamma, contrast images, costs) |
| `src/shared/`, `src/data/` | Metrics, categories, the city list, company contact |
| `src/legal/` | The legal pages' single source (`legalContent.ts`, `legalFacts.ts`, `subProcessors.ts`) |
| `src/assets/icons3d/` | The 3D icons (CC0), listed once in `src/components/icons3d/icons3d.ts` |
| `src/components/hover/` | The dark glass hovers: `GlassHover` (every hover card — centred on phones, beside its anchor and inside the window on desktop, drawn on `<body>`), `GlassTooltipLayer` (every `title` hint, mounted once in `App`), `placeHover` (the desktop placement). A new hover uses these, never its own CSS card (`tests/glassHover.test.ts`) |
| `api/` | Server routes; `api/shared/` shared server code |
| `supabase/migrations/` | Database migrations, applied in file order |
| `scripts/` | Maintenance scripts (legal documents, auth URLs, manuals) |
| `tests/` | Vitest tests, most of them anti-drift guards |
| `docs/manuals/` | These manuals; `docs/legal/` generated legal documents and compliance records |

`src/App.tsx` holds the tab state, the comparison flow and the modals; tabs other than Compare are loaded on demand.

Components, hooks and services (each file's own header):

<!-- facts:components -->
<!-- /facts:components -->

<!-- facts:hooks -->
<!-- /facts:hooks -->

<!-- facts:services -->
<!-- /facts:services -->

---

## 3. API routes
<!-- covers: api/shared/cors.ts, api/shared/rateLimit.ts -->

Every route answers CORS for the app's own origin only (`api/shared/cors.ts`; `/api/health` is open to any site), is rate-limited per caller (`api/shared/rateLimit.ts`, an in-memory burst limiter that sets `X-RateLimit-*` headers and resets when an instance restarts), and checks who is calling before it does anything paid (section 4). Links the server writes for users (emails) use the public site, `clueslifescore.com` (`api/shared/siteUrl.ts`); checkout returns only to the project's own addresses.

<!-- facts:routes -->
<!-- /facts:routes -->

Shared server modules (`api/shared/`):

<!-- facts:shared -->
<!-- /facts:shared -->

---

## 4. Sign-in, plans and access
<!-- covers: api/shared/auth.ts, api/shared/entitlements.ts, api/shared/plans.ts, api/usage/consume.ts, src/hooks/useTierAccess.ts -->

- **`requireAuth`** — verifies the Supabase access token (Bearer header) and returns the user id and email.
- **`requireFeature(feature, { consume })`** — signs in, resolves the plan (`profiles`, beta testers, administrators), and refuses with 403 when the plan does not include the feature (*"This feature needs the … plan."*) or the month's allowance is used (*"You have used this month's allowance (x of y). It resets on the 1st…"*). With `consume`, it counts one use in `usage_tracking`; routes whose own work then fails give the use back (`refundFeature`, e.g. Olivia and comparison grants).
- **Comparison grants** — `/api/usage/consume` checks the plan, counts one comparison, and signs a grant binding the user, the feature and the exact city pair. `/api/evaluate` and `/api/judge` accept work only with a grant (`requireComparisonGrant`, valid 2 hours); the Judge's Report accepts a grant up to 30 days old, or any paid plan (`requireJudgeReportAccess`). City names with line breaks or control characters are refused before a grant is signed.
- **`requireAdmin`** — the administrators' list: the founders' addresses in `api/shared/plans.ts` plus `DEV_BYPASS_EMAILS`. The browser uses the same founders' list and asks `/api/admin-check` for the rest (`useTierAccess`); no screen keeps its own list.
- **When the plan cannot be read** — routes answer 503 *"We could not check your plan just now…"* rather than guess.

Plans and allowances (from `api/shared/plans.ts`):

<!-- facts:plans -->
<!-- /facts:plans -->

---

## 5. AI models and how comparisons run
<!-- covers: api/shared/models.ts, api/evaluate.ts, api/judge.ts, api/judge-report.ts, src/hooks/useComparison.ts, api/shared/anthropic.ts -->

Models are chosen by job in one file; change a job's model there and every caller follows:

<!-- facts:models -->
<!-- /facts:models -->

- **Standard comparison** — the browser runs the six categories against `/api/evaluate` with Claude's evaluator seat. Each request researches the metrics (Tavily, section 6) and asks the model to score both cities, Law and Lived, per metric. Replies are parsed tolerantly: every score is checked, clamped to 0–100, and dropped when invalid. A half (Law or Lived) the model could not rate is left out, never counted as 0 (`src/shared/lawLived.ts`).
- **Enhanced comparison** — the user starts each of the five evaluator seats; `/api/judge` (the judge model) builds the consensus from the finished seats, weighting by confidence and arbitrating metrics where the seats disagree by more than 15 points.
- **Judge's Report** — `/api/judge-report` writes Cristiano's verdict from a comparison.
- **Calls** — every vendor has one client in `api/shared/` (`anthropic.ts`, `openai.ts`, `gemini.ts`, `xai.ts`, `perplexity.ts`); the Claude client retries overloads and network failures. Every server call to an outside service has a time limit (`tests/serverTimeouts.test.ts`).

---

## 6. Web research (Tavily)
<!-- covers: api/shared/tavily.ts, api/shared/tavilyCache.ts -->

`api/shared/tavily.ts` is the one Tavily connection (search and research reports). A comparison searches once per city pair and shares the results with every category and model for 30 minutes through the `tavily_context_cache` table; the first request claims the work and later ones wait for it. Research reports are queued and collected on a later call. Credits are recorded at LIFE SCORE's plan rate for the cost dashboard.

---

## 7. Olivia and Emilia
<!-- covers: api/olivia/chat.ts, api/emilia/message.ts, api/shared/knowledge.ts, api/shared/appKnowledge.ts, src/hooks/useOliviaFace.ts, api/olivia/avatar/live.ts -->

- **Brain** — Claude (the `writer` job) through `api/shared/anthropic.ts`. Olivia: `/api/olivia/chat` (each message counts one from the Olivia allowance and is refunded if the answer fails). Emilia: `/api/emilia/message` (any signed-in user).
- **Knowledge** — their instructions and documents are read from the deployment (`api/shared/knowledge.ts`; Olivia: `docs/OLIVIA_GPT_INSTRUCTIONS.md`, `docs/OLIVIA_KNOWLEDGE_BASE.md`; Emilia: `docs/EMILIA_INSTRUCTIONS.md` and the five manuals), with code facts written in (section 14). Both can also search the whole deployed app line by line (`api/shared/appKnowledge.ts`): the files are shipped with their functions and indexed on a cold start, so every deployment knows exactly its own code. Non-admins search only the browser app, the user and customer-service manuals, the legal pages and the plan list, and are never shown code; administrators may also read exact lines of any file. Olivia additionally looks up the web sources behind a metric (field evidence).
- **Olivia's face** — primary: HeyGen LiveAvatar (`/api/olivia/avatar/live`, her ElevenLabs voice); back-up: Simli, with D-ID behind it (`useOliviaFace`).
- **Voice** — ElevenLabs, with OpenAI TTS as the fallback (`/api/olivia/tts`).

---

## 8. Videos
<!-- covers: api/video/grok-generate.ts, api/video/grok-status.ts, api/shared/falKling.ts, api/avatar/generate-judge-video.ts, api/cristiano/render.ts, api/movie/generate.ts, api/shared/persistVideo.ts -->

| Video | Made by | Route |
|---|---|---|
| City clips (Freedom Video Clip, City Life Videos) | Kling 3 through fal (with sound); Replicate Minimax as the last back-up | `/api/video/grok-generate`, status `/api/video/grok-status` |
| Judge video (Video Report by Cristiano) | Replicate Wav2Lip on a voiced script | `/api/avatar/generate-judge-video`, status `/api/avatar/video-status`, Replicate's signed webhook `/api/avatar/video-webhook` |
| Go To My New City (Freedom Tour) | A 7-scene storyboard by Claude, rendered by HeyGen's video agent | `/api/cristiano/storyboard`, `/api/cristiano/render` |
| Moving Movie | A 12-scene screenplay, rendered by InVideo through its MCP server; on a refusal the screenplay is kept with the reason | `/api/movie/screenplay`, `/api/movie/generate` |
| Olivia presenter (Visuals tab) | Live: LiveAvatar, with HeyGen streaming behind it. Video: HeyGen | `/api/olivia/avatar/live`, `/api/olivia/avatar/heygen`, `/api/olivia/avatar/heygen-video` |

Vendors' video links expire; finished videos are copied to Supabase Storage (`api/shared/persistVideo.ts`). The browser polls status with caps: city clips 6 minutes, judge videos 15 minutes or 10 failed checks in a row.

---

## 9. Database
<!-- covers: api/shared/supabaseAdmin.ts -->

Tables, from the migrations (applied in file order; a later drop removes a table):

<!-- facts:tables -->
<!-- /facts:tables -->

- **Row-level security** is on for every public table. Customer tables (comparisons, judge and Gamma reports, Olivia conversations, preferences, profiles, subscriptions, usage, notifications, jobs, court orders, shares) let each user read only their own rows. Shared tables (finished city videos, contrast images, the global comparison cache, active prompts and video overrides) hold no personal information and are readable without being the owner. Server routes use the service-role key (`api/shared/supabaseAdmin.ts`), never sent to the browser.
- **Changes** go in a new file in `supabase/migrations/`, applied to production through Supabase migrations — never by editing an applied migration.

---

## 10. Settings
<!-- covers: .env.example -->

Every setting the code reads, from `.env.example` (`tests/envExample.test.ts` keeps the two equal). Real values live in Vercel (Production and Preview); the browser receives only public `VITE_*` values, such as the Supabase URL and anon key.

<!-- facts:env -->
<!-- /facts:env -->

---

## 11. Functions, scheduled jobs and deployment
<!-- covers: .github/workflows/ci.yml, .github/workflows/dependency-lockfile.yml, .github/workflows/dependency-security.yml -->

Function time limits and the extra files each carries (`vercel.json`):

<!-- facts:functions -->
<!-- /facts:functions -->

Scheduled and automatic jobs:

<!-- facts:jobs -->
<!-- /facts:jobs -->

**Deployment** — every push to `main` deploys to production on Vercel; other branches get preview deployments. **CI** (`ci.yml`) on every push and pull request: `npm ci` (fails if the lockfile has drifted), the TypeScript 7 type check of the app and of `api/`, the manuals step (section 14, pushes to main only), the tests, the production build, and the offline start-up check (`scripts/check-precache-shell.mjs`: every file the page loads at start is precached, the start page itself is not, and navigations go to the network first). **Dependencies** — library upgrades are resolved on GitHub by the Dependency lockfile job on a branch; the weekly security job offers fixes as a pull request.

---

## 12. Tests
<!-- covers: vitest.config.ts -->

Run by CI on every push (`npx vitest run`). Most are anti-drift guards: they read the code and fail when a rule is broken.

<!-- facts:tests -->
<!-- /facts:tests -->

---

## 13. Debugging
<!-- covers: src/main.tsx, vite.config.ts, api/shared/entitlements.ts -->

- **Server errors** — Vercel's runtime logs for the project (each route logs with its own prefix, e.g. `[EVALUATE]`, `[OLIVIA/CHAT]`, `[appKnowledge]`). Database and auth: Supabase's logs.
- **"Failed to fetch dynamically imported module"** — a page from an older release asked for a file the new release replaced. The app reloads once on Vite's `vite:preloadError`; the start page is network-first, so the reload gets the current release.
- **403 `upgrade_required` / `limit_reached`** — the plan check is working; compare `usage_tracking` for the month with the plan (section 4).
- **403 `comparison_grant_*`** — the request had no grant for that city pair, or it expired (2 hours; 30 days for the Judge's Report).
- **503 `entitlement_unavailable`** — the plan could not be read from Supabase; check Supabase's status and logs.
- **A video stuck "processing"** — check the vendor's status for the prediction or request id in the row (`grok_videos`, `avatar_videos`); finished videos must have been copied to Storage.
- **Google sign-in fails with a 500** — check Supabase Auth's Site URL and redirect URLs; `node scripts/check-auth-urls.mjs` reads them and, with `--fix`, repairs them (needs `SUPABASE_ACCESS_TOKEN`).
- **Olivia or Emilia unavailable** — the admin panel's knowledge check (`/api/admin/knowledge-status`) lists every knowledge file and how much of the app the search indexed.

---

## 14. How the manuals and assistants stay current
<!-- covers: api/shared/manualFacts.ts, api/emilia/manuals.ts, scripts/manualsCoverage.mjs, scripts/manuals-stamp.mjs, scripts/manuals-autoupdate.ts, tests/manuals.test.ts -->

- **One source** — the admin panel serves `docs/manuals/` (shipped with `/api/emilia/manuals`); a missing manual answers 503, never an old copy.
- **Facts from the code** — a manual marks `<!-- facts:NAME -->…<!-- /facts:NAME -->` and `api/shared/manualFacts.ts` writes the table as the deployed code has it, every time the manual is read (also in Emilia's and Olivia's loaded documents).
- **Written sections follow their code** — each section names its code (`<!-- covers: … -->`); `docs/manuals/coverage.json` records a fingerprint of those files and the commit at the last review. On every push to `main`, CI runs `scripts/manuals-autoupdate.ts` before the tests: for each section whose code changed it gives Claude the section, the diff since the review and the code now, accepts the rewrite only if it keeps the heading, the covers line and every facts block, re-stamps it and commits it back to `main`. It needs the `ANTHROPIC_API_KEY` repository secret on GitHub. A section it could not update stays unstamped and `tests/manuals.test.ts` names it; after updating it by hand, run `npm run manuals:stamp`.
- **Assistants** — section 7.

---

## 15. Admin tools
<!-- covers: src/components/HelpModal.tsx, src/components/CostDashboard.tsx, api/admin/env-check.ts, src/components/PromptsManager.tsx, api/usage/check-quotas.ts -->

- **Help → admin tabs** — the restricted manuals; **Prompts** (`PromptsManager`: read-only reference copies from `app_prompts`, which nothing in the app reads — the prompts that run are in the code; Gamma Prompts Manual, section 5); **APIs** (`EnvConfigPanel`, which settings are present via `/api/admin/env-check`, values masked).
- **Cost Dashboard** — the gold coin button in the top bar for administrators: spending by service and by comparison, from costs recorded in this browser and in the database (`api_cost_records`), with each vendor's price per unit (`src/utils/costCalculator*.ts`).
- **Quota alerts** — `/api/usage/check-quotas` compares vendor usage with the limits in `api_quota_settings` and emails the administrators (Resend) when a threshold is crossed.
- **Beta testers** — rows in `beta_testers` (by email), with their comparison limits.
- **Manual access** — the restricted manuals open for administrators and any email active in `authorized_manual_access`.

---

## 16. Security
<!-- covers: api/stripe/webhook.ts, api/shared/replicateWebhook.ts, vercel.json -->

- **Secrets** stay on the server (Vercel); the browser bundle carries only public values. The browser console never shows an email, a user id or a profile (`tests/browserLogs.test.ts`).
- **Webhooks** are verified: Stripe by signature (`constructEvent`; a failed database write answers 500 so Stripe retries), Replicate by its Standard Webhooks signature.
- **Stripe return addresses** are checked against an allow-list (`isAllowedRedirectUrl`).
- **Headers** — `X-Content-Type-Options`, `X-Frame-Options` and `Referrer-Policy` on every response; HSTS from Vercel. A Content-Security-Policy is not set yet (open item S14 in `docs/MASTER_BUG_AUDIT_20260220.md`).
- **Prompt input** — users' text goes only in the user turn of a model call; city names are validated before a comparison grant is signed.

---

## 17. Open items

The current list of known faults and their state is `docs/MASTER_BUG_AUDIT_20260220.md`, held to the code by `tests/bugAudit.test.ts`. The live burndown is the LIFE SCORE turnkey audit page.
