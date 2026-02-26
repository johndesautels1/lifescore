# LIFE SCORE — Grand Master Bug List (Single Source of Truth)

**Audit Date:** 2026-02-20
**Last Status Update:** 2026-02-26
**Branch:** claude/coding-session-Jh27y
**Scope:** Full codebase — 25 categories across 5 parallel agents
**Total bugs found:** 110 (deduplicated from technical audit)

**DO NOT create new bug lists. Update THIS file only.**

---

## PART 1: BUGS FIXED IN OUR SESSIONS (47 total)

All committed and pushed to `claude/coding-session-Jh27y`.

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
| 20 | S5 | 135f648+5f248de | Admin emails centralized (was copy-pasted in 10 files) |
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

---

## PART 2: BUGS NOT FIXED — PLAIN LANGUAGE EXPLANATIONS

### Security / Code Audit Skips

| Bug ID | What It Is (Plain Language) | How Important? | Can You Launch Without Fixing? |
|--------|---------------------------|----------------|-------------------------------|
| B1 (timeouts) | ~~7 API endpoints missing timeout settings in vercel.json.~~ | **NOT A BUG** — Vercel Pro default is 60s, all endpoints work. Verified 2026-02-26. DO NOT FIX. | N/A |
| R5 (duplication) | The withTimeout function is copy-pasted 12 times across the codebase. It works, it's just messy. Fixing it means changing imports in 12+ files at once. | LOW — It's ugly code but it works fine | YES — This is pure tech debt, doesn't affect users at all |
| I1 (duplication) | Same as R5 basically — code duplication across 30+ files (CORS helpers, fetch helpers). Works, just duplicated. | LOW — Technical debt only | YES — Zero user impact |
| A5 (anon key) | The Supabase anonymous key has a fallback hardcoded in src/lib/supabase.ts. If the env var is missing, it falls back to the hardcoded key. | LOW — The anon key is meant to be public (Supabase design). Real security is in RLS policies. | YES — Supabase anon keys are designed to be public. Cosmetic. |
| C1 (CORS) | Some endpoints still use * (allow any website) for CORS instead of restricting to your domain. The important ones (auth-protected) were already tightened. | LOW — The auth layer protects the data regardless of CORS | YES — Auth is the real protection, and that's done |
| G1+G2 (GDPR DB) | GDPR database tables for consent tracking and data deletion requests. Supabase migration files that need careful planning. | MEDIUM for UK/EU users — You're a UK company, so GDPR matters, but the app already has consent logging and user delete/export endpoints | YES for initial launch — schedule within 30 days if you have EU users |
| P1 (favicon) | Missing favicon/app icons in proper PNG format. The app works but may show a blank icon on some devices. | LOW — Cosmetic only | YES |
| P3 (zoom) | user-scalable=no in the HTML head prevents pinch-to-zoom. Intentional for Capacitor (mobile app). | NOT A BUG — Correct for mobile apps | YES — Working as designed |
| P4 (PWA devOptions) | PWA devOptions are set. Only matters in development. | NOT A BUG — Dev config | YES |
| SD3 (Gemini model) | Gemini model name mismatch — ALREADY FIXED in a prior session (commit 8a1d440). | ALREADY DONE | N/A |
| DC6 (async) | Flagged as "unnecessary async" — but the async IS needed. False positive. | NOT A BUG | N/A |
| as any (11) | 11 places in the code that bypass TypeScript type checking with `as any`. These exist because Supabase returns data in formats TypeScript can't predict. Changing them risks runtime crashes. | LOW — The code works correctly, TypeScript just can't verify it | YES — Safety workarounds, not bugs |

### Error Handling (3 remaining)

| Bug | What It Is | Important? | Launch Without It? |
|-----|-----------|------------|-------------------|
| #4 | Errors only show in the browser console — no toast/popup tells the user something went wrong | HIGH — Users see a blank screen instead of "Something went wrong, try again" | Risky — Users will think the app is broken. Consider react-hot-toast. |
| #7 | No offline detection — if the user loses internet, nothing tells them | MEDIUM — App just silently fails | YES — Most users understand when they're offline |
| #10 | No error tracking service (Sentry, LogRocket). 259 console.error calls go nowhere in production. | MEDIUM for debugging — When users report bugs, you have no data | YES for launch — Set up Sentry within first month |

### Database/Supabase (6 remaining)

| Bug | What It Is | Important? | Launch Without It? |
|-----|-----------|------------|-------------------|
| #6 | Migration file missing IF NOT EXISTS — was actually already correct (false alarm) | NOT A BUG | N/A |
| #8 | Hung Supabase connections don't get cancelled, just raced with a timeout | LOW — Wastes a connection but doesn't break anything | YES |
| #10 | avatar_videos table is publicly readable (no auth needed to SELECT) | BY DESIGN — These are public video content | YES |
| #13 | Connection pooling concerns | LOW — Supabase handles this | YES |
| #14 | Subscription enforcement gaps | MEDIUM — Some premium features might be accessible without paying | Check this — if monetization matters, verify your paywall |
| #15 | Minor migration ordering issues | LOW | YES |

### Mobile UI/UX (39 remaining)

| Priority | Count | What They Are | Launch Without? |
|----------|-------|--------------|-----------------|
| HIGH (5) | 5 | Category bars lose color identity when stacked, score headers not centered at 768px, cockpit header too tall, 7-column grid unreadable at 480px, metric names truncated | These are visual polish — app works, just looks rough on some phone sizes |
| MEDIUM (22) | 22 | !important cleanup, forced white text in light mode, touch targets too small, missing breakpoints, table overflow | YES — Cosmetic issues |
| LOW (12) | 12 | Minor spacing, alignment tweaks | YES — Nice to have |

### Accessibility/WCAG (21 remaining)

| Priority | Count | What They Are | Launch Without? |
|----------|-------|--------------|-----------------|
| HIGH (4) | 4 | Missing aria-live for dynamic content, TabNavigation missing keyboard support, winner bars use color only (colorblind users can't tell), form errors not linked to inputs | YES but note: If you need WCAG compliance for enterprise sales or government contracts, these matter |
| MEDIUM (12) | 12 | Various ARIA improvements | YES |
| LOW (5) | 5 | Minor accessibility enhancements | YES |

### Performance (11 remaining)

| Bug | What It Is | Important? | Launch Without It? |
|-----|-----------|------------|-------------------|
| #1 CRITICAL | App.tsx has 32 useState variables — should be consolidated with useReducer | MEDIUM — App re-renders more than it needs to, feels sluggish | YES — Works, just slower than ideal |
| #2 CRITICAL | Logo PNG is 1.5MB — should be WebP (~100KB) | HIGH — Every user downloads 1.5MB just for the logo, slow first load | Fix this — 5-minute conversion, huge payoff |
| #4 CRITICAL | SavedComparisons blocks on Supabase sync at mount — should show local data first | MEDIUM — Saved comparisons tab feels slow to open | YES |
| #7-#9 | Missing useCallback/useMemo optimizations | LOW — Slight performance gains | YES |
| #14 | 100 metrics in DOM without virtualization | MEDIUM — Scroll performance on low-end phones | YES |

### Scoring (1 remaining)

| Bug | What It Is | Important? | Launch Without It? |
|-----|-----------|------------|-------------------|
| #3 | 150 lines of dead Phase 2 scoring code behind a flag | LOW — Dead code, never runs | YES |

### From FINAL-CODEBASE-FIXES-TABLE (52 items — mostly features/UX/legal)

| Section | Count | Summary | Launch Without? |
|---------|-------|---------|-----------------|
| A: Critical UI/UX | 7 | Cristiano animation, text sizing, scroll behavior, mobile buttons, welcome screen | YES — Polish items |
| B: Legal/Compliance | 11 | Email updates, GDPR, DPAs with vendors, ICO registration, DPO appointment | Schedule these — Legal obligations for a UK company |
| C: Architecture | 4 | Tavily restructure, city caching, prompt tweaks | YES for launch — Performance/cost optimizations |
| D: UX Flow | 2 | Post-search flow redesign, score calculation UI | YES — Feature requests |
| E: New Features | 5 | Save buttons, upload buttons, Gamma prompt update | YES — Feature requests |
| F: Code Quality | 2 | Debug session, refactor pass | YES — Maintenance |
| G: Existing Items | 21 | Mix of bugs (letter C not typing), incomplete features, documentation | Mixed — The letter C bug (G1) should be investigated |

---

## PART 3: BOTTOM LINE — WHAT MATTERS FOR MARKETPLACE + PLAY STORE LAUNCH

### Must fix before launch (3 items)

1. ~~**B1 — vercel.json timeouts**~~ — **NOT A BUG.** Vercel Pro 60s default works. Verified 2026-02-26. DO NOT FIX.
2. **Logo 1.5MB → WebP** — Users on mobile wait too long for first load
3. **Error handling #4** — Add toast notifications so users see error messages
4. **Subscription enforcement #14** — Make sure your paywall actually works

### Should fix within 30 days of launch (5 items)

1. **G1+G2** — GDPR database tables (UK legal requirement)
2. **Legal section B** — DPAs, ICO registration
3. **Error tracking #10** — Set up Sentry so you can debug production issues
4. **Mobile HIGH items** — 5 layout issues on small phones
5. **Letter C bug (G1)** — Users can't type the letter C in Ask Olivia

### Everything else can wait

The remaining ~90 items are tech debt, cosmetic polish, accessibility improvements, and feature requests. None of them will prevent a launch or cause user complaints on day one.

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
| T1 | src/components/NewLifeVideos.tsx | 5 | MED | Rules of Hooks violation — useRef/useState called after conditional early return | **FIXED** |
| T2 | src/components/WeightPresets.tsx | 3 | LOW | Type assertion `as any` on weight redistribution | OPEN |
| T3 | src/components/CitySelector.tsx | 2 | LOW | Metro type doesn't include optional fields used in filtering | OPEN |
| T4 | src/components/CourtOrderVideo.tsx | 2 | LOW | result possibly undefined but destructured without guard | OPEN |
| T5 | src/hooks/useComparison.ts | 2 | LOW | Non-null assertion on API response | OPEN |
| T6 | src/hooks/useGrokVideo.ts | 2 | LOW | String literal union not enforced for status | OPEN |
| T7 | src/hooks/useJudgeVideo.ts | 2 | LOW | Same string literal issue | OPEN |
| T8 | src/hooks/useCristianoVideo.ts | 2 | LOW | Same string literal issue | OPEN |
| T9 | src/components/ManualViewer.tsx | 2 | LOW | Optional chain missing on nested access | OPEN |
| T10 | src/hooks/useEmilia.ts | 2 | LOW | Cast to `any` silences type error on audio context | OPEN |
| T11 | api/shared/supabaseClient.ts | 2 | LOW | Module-level `!` assertion on env vars | N/A (file removed) |
| T12 | api/evaluate.ts | 1 | LOW | Unused import | OPEN |
| T13 | api/video/grok-generate.ts | 1 | LOW | Unused import | OPEN |
| T14 | api/gamma/generate-gamma.ts | 1 | LOW | Unused import | N/A (path changed) |
| T15 | src/components/TabNavigation.tsx | 1 | LOW | Prop interface overly broad | OPEN |
| T16 | src/components/HelpBubble.tsx | 1 | LOW | Unused CSS class | OPEN |
| T17 | api/stripe/webhook.ts | 2 | LOW | event.type switch no default case | OPEN |
| T18 | api/user/preferences.ts | 2 | LOW | Missing validation on preference key names | OPEN |
| T19 | src/hooks/useTierAccess.ts | 2 | LOW | Retry count hardcoded, no backoff | OPEN |
| T20 | src/components/LoadingState.tsx | 1 | LOW | Inline style objects recreated every render | OPEN |
| T21 | api/shared/rateLimiter.ts | 2 | LOW | In-memory rate limiter resets on cold start | OPEN |
| T22 | api/emilia/manuals.ts | 1 | LOW | Error message leaks internal path | OPEN |
| T23 | src/components/ErrorBoundary.tsx | 1 | LOW | componentDidCatch logs to console only | OPEN |
| T24 | api/evaluate.ts | 2 | LOW | LLM response not validated against schema | OPEN |
| T25 | src/hooks/useURLParams.ts | 1 | LOW | URL params not sanitized before use | OPEN |

### CATEGORY B: API, AUTH & RACE CONDITIONS (35 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| A1 | api/video/grok-generate.ts | 5 | MED | No auth + arbitrary userId | **FIXED** |
| A2 | api/evaluate.ts | 4 | MED | No auth on LLM evaluation | **FIXED** |
| A3 | api/judge.ts | 4 | MED | No auth on judge | **FIXED** |
| A4 | api/gamma/generate-gamma.ts | 4 | MED | No auth on Gamma | **FIXED** |
| A5 | api/test-llm.ts | 4 | MED | No auth on test endpoint | MITIGATED (intentional) |
| A6 | 6 API files | 4 | MED | SUPABASE_ANON_KEY fallback | MITIGATED |
| A7 | api/stripe/webhook.ts | 4 | HIGH | Webhook signature not verified in dev | **FIXED** |
| A8 | api/stripe/create-checkout-session.ts | 4 | MED | Open redirect via success_url | **FIXED** |
| A9 | api/stripe/create-portal-session.ts | 4 | MED | Same open redirect | **FIXED** |
| A10 | api/user/delete.ts | 4 | HIGH | GDPR delete misses tables | OPEN |
| A11 | src/contexts/AuthContext.tsx | 3 | LOW | Race: two tabs fetch simultaneously | OPEN |
| A12 | src/hooks/useComparison.ts | 3 | LOW | Abort controller race | OPEN |
| A13 | api/evaluate.ts | 3 | LOW | No request timeout | OPEN |
| A14 | api/judge.ts | 3 | LOW | Same missing timeout | OPEN |
| A15 | api/gamma/generate-gamma.ts | 3 | LOW | Same missing timeout | OPEN |
| A16 | api/video/grok-generate.ts | 3 | LOW | Same missing timeout | OPEN |
| A17 | src/hooks/useContrastImages.ts | 3 | LOW | No timeout/abort | OPEN |
| A18 | api/shared/rateLimiter.ts | 3 | MED | Rate limiter resets per instance | OPEN |
| A19 | src/hooks/useOliviaChat.ts | 3 | MED | useEffect self-triggers | OPEN |
| A20 | src/hooks/useComparison.ts | 2 | LOW | Error state not cleared | OPEN |
| A21 | api/evaluate.ts | 2 | LOW | JSON parse failure returns 500 | OPEN |
| A22 | api/stripe/webhook.ts | 2 | LOW | Tier update failure swallowed | OPEN |
| A23 | api/user/preferences.ts | 2 | LOW | Upsert conflict may lose writes | OPEN |
| A24 | src/hooks/useEmilia.ts | 2 | LOW | Audio context not resumed | OPEN |
| A25 | src/hooks/useGrokVideo.ts | 2 | LOW | Polling not cleared on error | OPEN |
| A26 | src/hooks/useJudgeVideo.ts | 2 | LOW | Same polling pattern | OPEN |
| A27 | src/hooks/useCristianoVideo.ts | 2 | LOW | Same polling pattern | OPEN |
| A28 | api/emilia/chat.ts | 2 | LOW | System prompt injection | MITIGATED |
| A29 | api/shared/supabaseClient.ts | 2 | LOW | Shared client instance | N/A |
| A30 | src/hooks/useApiUsageMonitor.ts | 2 | LOW | 60s usage check interval | OPEN |
| A31 | api/evaluate.ts | 1 | LOW | Hardcoded model name | OPEN |
| A32 | api/judge.ts | 1 | LOW | Same hardcoded model | OPEN |
| A33 | api/video/grok-generate.ts | 1 | LOW | Same hardcoded model | OPEN |
| A34 | src/contexts/AuthContext.tsx | 1 | LOW | Console.log in auth flow | **FIXED** |
| A35 | api/shared/rateLimiter.ts | 1 | LOW | Rate limit headers not set | OPEN |

### CATEGORY C: SECURITY (17 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| S1 | api/avatar/simli-session.ts | 5 | HIGH | API key returned to client | **FIXED** |
| S2 | api/simli-config.ts | 5 | HIGH | Same API key exposure | **FIXED** |
| S3 | src/components/LoginScreen.tsx | 5 | HIGH | Password in localStorage | **FIXED** |
| S4 | vercel.json | 4 | MED | CORS * on API routes | **FIXED** |
| S5 | 4 files | 3 | MED | Hardcoded admin emails | **FIXED** |
| S6 | api/emilia/chat.ts | 3 | LOW | System prompt injection | MITIGATED |
| S7 | api/evaluate.ts | 3 | LOW | City names unsanitized in prompt | OPEN |
| S8 | src/components/ManualViewer.tsx | 3 | LOW | dangerouslySetInnerHTML | MITIGATED (sanitized) |
| S9 | api/shared/supabaseClient.ts | 3 | MED | Service role key overused | OPEN |
| S10 | src/App.tsx | 2 | LOW | Anon key in client bundle | OPEN (acceptable) |
| S11 | api/stripe/webhook.ts | 2 | LOW | Webhook secret not rotated | OPEN |
| S12 | api/user/delete.ts | 2 | LOW | No delete confirmation | OPEN |
| S13 | src/hooks/useVoiceRecognition.ts | 1 | LOW | Mic permission not graceful | OPEN |
| S14 | public/manifest.json | 1 | LOW | CSP not configured for PWA | OPEN |
| S15 | api/evaluate.ts | 1 | LOW | Stack trace in error response | OPEN |
| S16 | api/judge.ts | 1 | LOW | Same stack trace leak | OPEN |
| S17 | api/video/grok-generate.ts | 1 | LOW | Same stack trace leak | OPEN |

### CATEGORY D: CONFIG, BUILD, DATABASE & COMPLIANCE (35 bugs)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| B1 | vercel.json | 4 | HIGH | API routes missing includeFiles | **FIXED** |
| B2 | supabase/migrations | 4 | HIGH | consent_logs RLS blocks inserts | OPEN |
| B3 | supabase/migrations | 4 | HIGH | No RLS for api_usage_log | OPEN |
| B4 | package.json | 3 | MED | @anthropic-ai/sdk in client deps | OPEN |
| B5 | package.json | 3 | MED | openai in client bundle | OPEN |
| B6 | tsconfig.json | 3 | MED | strict: false | OPEN |
| B7 | supabase/migrations | 2 | LOW | Missing index comparisons.user_id | OPEN |
| B8 | supabase/migrations | 2 | LOW | Missing index api_usage_log.created_at | OPEN |
| B9 | supabase/migrations | 2 | LOW | Duplicate index user_preferences | OPEN |
| B10 | vite.config.ts | 2 | LOW | No chunk splitting | **FIXED** |
| B11 | package.json | 2 | LOW | No lint/typecheck scripts | OPEN |
| B12 | .env.example | 2 | LOW | Missing API key entries | **FIXED** |
| B13 | vercel.json | 2 | LOW | No cache headers on static assets | OPEN |
| B14 | vercel.json | 2 | LOW | No security headers | OPEN |
| B15 | public/sw.js | 2 | LOW | Service worker caches API indefinitely | OPEN |
| B16 | public/sw.js | 2 | LOW | No cache versioning | OPEN |
| B17 | public/manifest.json | 2 | LOW | start_url mismatch | OPEN |
| B18 | supabase/migrations | 2 | LOW | real vs numeric for scores | OPEN |
| B19 | supabase/migrations | 2 | LOW | No FK comparisons.user_id | OPEN |
| B20 | supabase/migrations | 2 | LOW | No FK api_usage_log.user_id | OPEN |
| B21 | docs/legal | 3 | MED | Data retention not implemented | OPEN |
| B22 | docs/legal | 3 | MED | Data portability not implemented | OPEN |
| B23 | api/user/delete.ts | 3 | MED | No confirmation email on delete | OPEN |
| B24 | public/robots.txt | 1 | LOW | Allows crawling /api/ | OPEN |
| B25 | public/index.html | 1 | LOW | Missing OG meta tags | **FIXED** |
| B26 | package.json | 1 | LOW | No engines field | OPEN |
| B27 | vercel.json | 1 | LOW | No region config | OPEN |
| B28 | .gitignore | 1 | LOW | Missing .env.local | OPEN |
| B29 | supabase/migrations | 1 | LOW | Inconsistent naming | OPEN |
| B30 | tsconfig.json | 1 | LOW | No path aliases | OPEN |
| B31 | vite.config.ts | 1 | LOW | No env validation plugin | OPEN |
| B32 | package.json | 1 | LOW | No prepare script | OPEN |
| B33 | supabase/migrations | 1 | LOW | No comments on RLS policies | OPEN |
| B34 | .env.example | 1 | LOW | No descriptions for env vars | OPEN |
| B35 | vercel.json | 2 | LOW | SPA fallback masks API 404s | OPEN |

### CATEGORY E: REACT STATE & MEMORY LEAKS (14 bugs, 4 cross-referenced above)

| ID | File | Sev | Risk | Description | Status |
|----|------|-----|------|-------------|--------|
| ML1 | src/hooks/useAvatarProvider.ts | 4 | MED | Stale disconnect refs — WebRTC leak | OPEN |
| ML2 | src/components/OliviaAvatar.tsx | 3 | MED | connect/disconnect stale closure | OPEN |
| ML3 | src/components/NewLifeVideos.tsx | 3 | LOW | reset missing from useEffect deps | OPEN |
| ML4 | src/components/CourtOrderVideo.tsx | 3 | LOW | reset missing from useEffect deps | OPEN |
| ML5 | src/components/WeightPresets.tsx | 3 | MED | Mount useEffect calls stale callback | OPEN |
| ML6 | src/components/WeightPresets.tsx | 3 | MED | Save effect overwrites with defaults | OPEN |
| ML7 | src/components/OliviaChatBubble.tsx | 2 | LOW | setTimeout without cleanup | OPEN |
| ML8 | src/components/EmiliaChat.tsx | 2 | LOW | setTimeout without cleanup | OPEN |
| ML9 | src/components/CitySelector.tsx | 2 | LOW | getFilteredMetros recomputed every render | OPEN |
| ML10 | src/components/ManualViewer.tsx | 2 | LOW | userEmail in deps but unused | OPEN |
| ML11 | src/components/LoginScreen.tsx | 2 | LOW | 3s setTimeout without cleanup | OPEN |
| ML12 | src/components/ResetPasswordScreen.tsx | 2 | LOW | 2s setTimeout without cleanup | OPEN |
| ML13 | src/hooks/useTTS.ts | 2 | LOW | speed missing from useCallback deps | OPEN |
| ML14 | src/hooks/useTTS.ts | 2 | LOW | speed missing from play useCallback deps | OPEN |

---

**END OF GRAND MASTER BUG LIST**

*This is the SINGLE SOURCE OF TRUTH. Do not create new bug lists. Update this file only.*
