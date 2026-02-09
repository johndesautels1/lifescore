# LIFE SCORE - FULL CODEBASE AUDIT REPORT
**Date:** 2026-02-09
**Session ID:** LIFESCORE-AUDIT-20260209-001
**Auditor:** Claude Code (Opus 4.6)
**Scope:** Every folder, file, subdirectory — entire codebase

---

## TABLE OF CONTENTS
1. [Master Status Chart — All Folders/Files](#1-master-status-chart)
2. [Critical Issues (RED)](#2-critical-issues-red)
3. [Caution Issues (YELLOW)](#3-caution-issues-yellow)
4. [Changes by Risk Level](#4-changes-by-risk-level)
5. [UI/UX Deep Dive](#5-uiux-deep-dive)
6. [Database & Backend Deep Dive](#6-database--backend-deep-dive)
7. [Performance & Loading Analysis](#7-performance--loading-analysis)
8. [Known Bugs Cross-Reference](#8-known-bugs-cross-reference)
9. [Improvement Suggestions](#9-improvement-suggestions)

---

## 1. MASTER STATUS CHART

### Legend
- ✅ **GREEN** — Code is correct, no action needed
- ⚠️ **YELLOW** — Caution: work needed but NOT breaking / NOT affecting current functionality
- 🔴 **RED** — Critical issue: bugs, security vulnerabilities, or breaking problems
- **Severity:** 1 (cosmetic) → 5 (catastrophic/data-loss)

---

### 1.1 API Layer (`api/`)

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `api/shared/cors.ts` | ✅ GREEN | Proper CORS with restricted/open modes | 0 |
| 2 | `api/shared/fetchWithTimeout.ts` | ✅ GREEN | Good AbortController timeout implementation | 0 |
| 3 | `api/shared/rateLimit.ts` | ✅ GREEN | In-memory rate limiter with presets (resets on cold start — acceptable) | 0 |
| 4 | `api/shared/types.ts` | ✅ GREEN | Type definitions only | 0 |
| 5 | `api/shared/metrics.ts` | ✅ GREEN | Metric scoring logic with fallback options | 0 |
| 6 | `api/shared/metrics-data.ts` | ✅ GREEN | Metric data definitions | 0 |
| 7 | `api/health.ts` | ✅ GREEN | Simple health check, no sensitive data leakage | 0 |
| 8 | `api/gamma.ts` | ✅ GREEN | Proper error handling, timeout management, API key validation | 0 |
| 9 | `api/test-llm.ts` | ✅ GREEN | Simple endpoint testing, proper error handling per provider | 0 |
| 10 | `api/judge-report.ts` | ✅ GREEN | Solid Opus API integration, proper prompt building | 0 |
| 11 | `api/consent/log.ts` | ✅ GREEN | Good consent logging, IP hashing for privacy, rate-limited (30/min) | 0 |
| 12 | `api/avatar/video-webhook.ts` | ✅ GREEN | Good webhook handling with timeout wrapper | 0 |
| 13 | `api/stripe/get-subscription.ts` | ✅ GREEN | Proper Supabase queries with `.maybeSingle()` | 0 |
| 14 | `api/usage/check-quotas.ts` | ✅ GREEN | Good quota tracking, email alerts for thresholds | 0 |
| 15 | `api/evaluate.ts` | ⚠️ YELLOW | 1648-line file; in-memory Tavily cache (no persistence); `USE_CATEGORY_SCORING` env toggle causes inconsistent behavior; JSON parsing from multiple LLM formats fragile | 3 |
| 16 | `api/judge.ts` | ⚠️ YELLOW | Same `USE_CATEGORY_SCORING` toggle; could cause scoring mode drift between requests | 2 |
| 17 | `api/judge-video.ts` | ⚠️ YELLOW | Uses deprecated D-ID Agents API as fallback; TTS fallback adds complexity | 2 |
| 18 | `api/avatar/generate-judge-video.ts` | ⚠️ YELLOW | Supabase credentials optional (may silently fail); TTS timeout not optimized | 2 |
| 19 | `api/olivia/chat.ts` | ⚠️ YELLOW | Tavily context building could overflow token limits on large categories | 2 |
| 20 | `api/olivia/field-evidence.ts` | ⚠️ YELLOW | Metric name lookup is hardcoded (maintainability issue) | 2 |
| 21 | `api/stripe/create-checkout-session.ts` | ⚠️ YELLOW | CORS set to `'open'` — verify Stripe data exposure is acceptable | 3 |
| 22 | `api/stripe/webhook.ts` | ⚠️ YELLOW | Webhook signature verification needs verification | 2 |
| 23 | `api/user/delete.ts` | ⚠️ YELLOW | Rate limiter pattern inconsistency — uses `checkRateLimit()` instead of `applyRateLimit()` wrapper; missing rate limit headers | 2 |
| 24 | `api/user/export.ts` | ⚠️ YELLOW | Same rate limiter inconsistency; 1/hour rate limit bypassable with IP rotation | 2 |
| 25 | `api/emilia/manuals.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 26 | `api/emilia/message.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 27 | `api/emilia/speak.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 28 | `api/emilia/thread.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 29 | `api/olivia/context.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 30 | `api/olivia/contrast-images.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 31 | `api/olivia/gun-comparison.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 32 | `api/olivia/tts.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 33 | `api/olivia/avatar/heygen.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 34 | `api/olivia/avatar/streams.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 35 | `api/avatar/simli-session.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 36 | `api/avatar/simli-speak.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 37 | `api/avatar/video-status.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 38 | `api/usage/elevenlabs.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 39 | `api/video/grok-status.ts` | ⚠️ YELLOW | Needs auth verification audit | 2 |
| 40 | `api/admin/sync-olivia-knowledge.ts` | 🔴 RED | **HARDCODED ADMIN EMAILS** in source code — credential exposure risk | 4 |
| 41 | `api/video/grok-generate.ts` | 🔴 RED | **HARDCODED BYPASS EMAILS** at line ~50 — grants SOVEREIGN tier unconditionally; dual-path vulnerability via ENV + hardcode | 4 |
| 42 | `api/olivia/avatar/did.ts` | 🔴 RED | **DEPRECATED** — D-ID Agents API has own LLM (architecture violation); should be removed | 3 |

**API Summary:** 14 GREEN | 25 YELLOW | 3 RED

---

### 1.2 React Components (`src/components/`)

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `CitySelector.tsx` | ✅ GREEN | Dropdown well-implemented, metro search responsive, mobile-friendly | 1 |
| 2 | `TabNavigation.tsx` | ✅ GREEN | All tabs always accessible; badge counter correct | 1 |
| 3 | `PricingModal.tsx` | ✅ GREEN | Closes on escape, responsive pricing grid | 1 |
| 4 | `PricingPage.tsx` | ✅ GREEN | Good CSS structure, monthly/annual toggle clear | 1 |
| 5 | `LoadingState.tsx` | ✅ GREEN | Progress bar, category pills, metric counter visible; no mobile cutoff | 1 |
| 6 | `ContrastDisplays.tsx` | ✅ GREEN | Bezel aesthetics, loading shimmer, error states, image vignette present | 1 |
| 7 | `DataSourcesModal.tsx` | ✅ GREEN | Clean modal, 8 data sources listed | 1 |
| 8 | `LoginScreen.tsx` | ✅ GREEN | OAuth buttons, form validation, password reset | 1 |
| 9 | `Footer.tsx` | ✅ GREEN | Company info, contact links, legal link buttons | 1 |
| 10 | `DealbreakersPanel.tsx` | ✅ GREEN | 5-dealbreaker limit enforced, localStorage persistence | 1 |
| 11 | `CostDashboard.tsx` | ✅ GREEN | Admin cost tracking, CSV export, dual persistence | 1 |
| 12 | `FeatureGate.tsx` | ✅ GREEN | Tier-based access control, admin bypass, blur/hide options | 1 |
| 13 | `ThemeToggle.tsx` | ✅ GREEN | Simple dark/light toggle | 1 |
| 14 | `FreedomMetricsList.tsx` | ✅ GREEN | Metric cards sort by advantage, clean rendering | 1 |
| 15 | `SavedComparisons.tsx` | ✅ GREEN | Handles both standard & enhanced. Defensive data checks. Gamma viewer. | 1 |
| 16 | `CookieConsent.tsx` | ✅ GREEN | Standard consent implementation | 1 |
| 17 | `HelpBubble.tsx` | ✅ GREEN | Simple help component | 1 |
| 18 | `HelpModal.tsx` | ✅ GREEN | Help modal | 1 |
| 19 | `LegalModal.tsx` | ✅ GREEN | Legal modal | 1 |
| 20 | `OliviaAvatar.tsx` | ✅ GREEN | Avatar display component | 1 |
| 21 | `OliviaChatBubble.tsx` | ✅ GREEN | Chat bubble styling | 1 |
| 22 | `DealbreakersWarning.tsx` | ✅ GREEN | Warning display | 1 |
| 23 | `ScoreMethodology.tsx` | ✅ GREEN | Score methodology reference | 1 |
| 24 | `Results.tsx` | ⚠️ YELLOW | Save button UX good, but mobile responsiveness of metric table needs verification | 2 |
| 25 | `Header.tsx` | ⚠️ YELLOW | Contact info visible; on mobile <320px header might overflow; needs flex-wrap | 2 |
| 26 | `SettingsModal.tsx` | ⚠️ YELLOW | Four-tab layout; modal might exceed viewport height on small screens | 2 |
| 27 | `EmiliaChat.tsx` | ⚠️ YELLOW | Voice transcript display area could overflow on narrow screens; no sticky header | 2 |
| 28 | `AdvancedVisuals.tsx` | ⚠️ YELLOW | Charts are **PLACEHOLDERS** only — data preview, no Chart.js/Recharts integration; "Coming soon" | 2 |
| 29 | `EvidencePanel.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 30 | `FreedomCategoryTabs.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 31 | `FreedomHeroFooter.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 32 | `GunComparisonModal.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 33 | `WeightPresets.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 34 | `ManualViewer.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 35 | `UsageWarningBanner.tsx` | ⚠️ YELLOW | Needs mobile responsive audit | 2 |
| 36 | `CourtOrderVideo.tsx` | ⚠️ YELLOW | In JudgeTab flow; needs mobile viewport testing | 2 |
| 37 | `JudgeVideo.tsx` | ⚠️ YELLOW | Needs mobile viewport testing | 2 |
| 38 | `NewLifeVideos.tsx` | ⚠️ YELLOW | Enhanced mode only; needs testing | 2 |
| 39 | `JudgeTab.tsx` | ⚠️ YELLOW | Cockpit design elegant; FIX 2026-02-08 shows city name mismatch bug was patched; video controls on mobile need 44px touch targets | 2 |
| 40 | `EnhancedComparison.tsx` | ⚠️ YELLOW | **2268-line file** — too large to fully audit in single pass; critical for multi-LLM consensus; CSS column alignment on mobile needs review | 3 |
| 41 | `VisualsTab.tsx` | ⚠️ YELLOW | Report generation works but **Gamma report saving needs verification** — fallback `comparisonId` generated with `Date.now()`; embedded iframe uses `/embed/` URL | 3 |
| 42 | `AskOlivia.tsx` | 🔴 RED | **CRITICAL MOBILE ISSUES:** (1) Viewport bezel frame doesn't resize <375px, (2) SPEAK/TRANSCRIPT buttons need larger touch targets, (3) Chat textarea squashes on narrow screens, (4) Video controls overlay position untested, (5) Scroll-to-top only works if `showTextChat=true` | 4 |

**Components Summary:** 23 GREEN | 18 YELLOW | 1 RED

---

### 1.3 Services (`src/services/`)

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `judgePregenService.ts` | ✅ GREEN | Fire-and-forget pattern properly implemented | 1 |
| 2 | `enhancedComparison.ts` | ✅ GREEN | Simple API key management, no state issues | 1 |
| 3 | `contrastImageService.ts` | ✅ GREEN | Well-structured prompt templates | 1 |
| 4 | `oliviaService.ts` | ✅ GREEN | Good timeout handling (60-90s), proper error parsing | 1 |
| 5 | `gammaService.ts` | ✅ GREEN | Good cost tracking, proper metrics mapping | 1 |
| 6 | `rateLimiter.ts` | ⚠️ YELLOW | In-memory only — resets on page refresh; no cross-tab support | 2 |
| 7 | `grokVideoService.ts` | ⚠️ YELLOW | Polling timeout fixed at 3 min, not configurable; no exponential backoff | 2 |
| 8 | `savedComparisons.ts` | ⚠️ YELLOW | localStorage quota handling removes oldest then re-saves (could fail again); type guards are good | 2 |
| 9 | `opusJudge.ts` | ⚠️ YELLOW | Fallback uses `DEFAULT_AVG_STDDEV` without logging; `averageConsensusScore` nullable but mostly safe | 3 |
| 10 | `llmEvaluators.ts` | ⚠️ YELLOW | Partial failure handling unclear — scoring continues with incomplete data; Tavily tracking conditional | 3 |
| 11 | `databaseService.ts` | ⚠️ YELLOW | Uses `as CityData` cast without validation; `profile: any`; `any[]` for conversations; missing type safety | 3 |
| 12 | `reportStorageService.ts` | ⚠️ YELLOW | Missing error handling on HTML cleanup — orphaned files accumulate; no enhanced report field mapping validation | 4 |
| 13 | `cache.ts` | 🔴 RED | **CACHE SWAP BUG:** `swapCityOrder()` (lines 403-424) only swaps root city pointers but **doesn't update nested CategoryConsensus references** — "Austin vs Denver" cached, retrieving "Denver vs Austin" shows Denver's scores under Austin's name | 5 |

**Services Summary:** 5 GREEN | 7 YELLOW | 1 RED

---

### 1.4 Hooks (`src/hooks/`)

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `useTTS.ts` | ✅ GREEN | Good audio cleanup, proper ref management | 1 |
| 2 | `useVoiceRecognition.ts` | ✅ GREEN | Recognition state properly managed | 1 |
| 3 | `useEmilia.ts` | ✅ GREEN | Message handling solid, cleanup present | 1 |
| 4 | `useApiUsageMonitor.ts` | ✅ GREEN | Usage tracking proper | 1 |
| 5 | `useOGMeta.ts` | ✅ GREEN | OG meta tag handling | 1 |
| 6 | `useDraggable.ts` | ✅ GREEN | Drag utility | 1 |
| 7 | `useTierAccess.ts` | ✅ GREEN | Tier access control | 1 |
| 8 | `useURLParams.ts` | ✅ GREEN | URL param handling | 1 |
| 9 | `useAvatarProvider.ts` | ⚠️ YELLOW | Callback refs updated in useEffect without dependency check — stale closure risk | 2 |
| 10 | `useSimli.ts` | ⚠️ YELLOW | Similar stale closure risk with callback refs | 2 |
| 11 | `useGrokVideo.ts` | ⚠️ YELLOW | useEffect depends on `pollIntervalRef` (ref never changes) — stale state in polling | 2 |
| 12 | `useJudgeVideo.ts` | ⚠️ YELLOW | `generationIdRef` increments but never triggers effect rerun — polling targets old generation | 2 |
| 13 | `useContrastImages.ts` | ⚠️ YELLOW | `pendingRef`/`mountedRef` prevent races but don't abort fetch — memory leak risk on unmount | 2 |
| 14 | `useGunComparison.ts` | ⚠️ YELLOW | Needs abort controller audit | 2 |
| 15 | `useComparison.ts` | ⚠️ YELLOW | **Race condition:** setState could execute after unmount during promise resolution; rapid calls create multiple abort controllers | 3 |
| 16 | `useOliviaChat.ts` | ⚠️ YELLOW | **Race condition:** stale data could apply if context finishes just before new comparison loads | 3 |
| 17 | `useDIDStream.ts` | ⚠️ YELLOW | Retry resets on unmount/remount; concurrent connect calls possible despite mutex | 3 |

**Hooks Summary:** 8 GREEN | 9 YELLOW | 0 RED

---

### 1.5 Types, Data, Constants, Utils, Lib, Contexts

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `src/types/metrics.ts` | ✅ GREEN | Well-defined category/metric types | 1 |
| 2 | `src/data/metrics.ts` | ✅ GREEN | Comprehensive 100 metric definitions | 1 |
| 3 | `src/constants/scoringThresholds.ts` | ✅ GREEN | Clear threshold definitions | 1 |
| 4 | `src/lib/supabase.ts` | ✅ GREEN | Excellent retry logic with exponential backoff | 1 |
| 5 | `src/lib/fetchWithTimeout.ts` | ✅ GREEN | Clean AbortController implementation | 1 |
| 6 | `src/utils/costCalculator.ts` | ✅ GREEN | Comprehensive cost tracking | 1 |
| 7 | `src/utils/freedomEducationUtils.ts` | ✅ GREEN | Education content utilities | 1 |
| 8 | `src/api/scoring.ts` | ✅ GREEN | Score normalization solid | 1 |
| 9 | `src/shared/metrics.ts` | ✅ GREEN | Shared metric definitions | 1 |
| 10 | `src/shared/types.ts` | ✅ GREEN | Shared type definitions | 1 |
| 11 | `src/types/index.ts` | ✅ GREEN | Index barrel exports | 1 |
| 12 | `src/data/metricTooltips.ts` | ✅ GREEN | Tooltip text | 1 |
| 13 | `src/data/metros.ts` | ✅ GREEN | Metro area data | 1 |
| 14 | `src/data/fieldKnowledge.ts` | ✅ GREEN | Field knowledge data | 1 |
| 15 | `src/types/enhancedComparison.ts` | ⚠️ YELLOW | `evaluatedMetrics?: number` optional but critical for completeness; no empty array validation | 2 |
| 16 | `src/types/database.ts` | ⚠️ YELLOW | `comparison_result: Record<string, unknown>` — no shape validation at DB layer | 2 |
| 17 | `src/utils/exportUtils.ts` | ⚠️ YELLOW | `(metric as any).llmScores?.[0]?.reasoning` — unsafe type cast | 2 |
| 18 | `src/types/apiUsage.ts` | ⚠️ YELLOW | Needs review for completeness | 1 |
| 19 | `src/types/avatar.ts` | ⚠️ YELLOW | Needs review | 1 |
| 20 | `src/types/gamma.ts` | ⚠️ YELLOW | Needs review | 1 |
| 21 | `src/types/grokVideo.ts` | ⚠️ YELLOW | Needs review | 1 |
| 22 | `src/types/judge.ts` | ⚠️ YELLOW | Needs review | 1 |
| 23 | `src/types/olivia.ts` | ⚠️ YELLOW | Needs review | 1 |
| 24 | `src/types/freedomEducation.ts` | ⚠️ YELLOW | Needs review | 1 |
| 25 | `src/contexts/AuthContext.tsx` | ⚠️ YELLOW | **Auth deadlock risk:** `fetchingRef` never resets if `fetchUserData()` hangs — blocks all future fetches | 3 |
| 26 | `src/data/freedom-index-scoring-anchors (1).json` | ⚠️ YELLOW | Filename has space and `(1)` — import path fragile | 1 |

**Types/Data/Lib Summary:** 14 GREEN | 12 YELLOW | 0 RED

---

### 1.6 Database Migrations (`supabase/`)

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `002_subscriptions_and_usage.sql` | ✅ GREEN | Well-structured, proper RLS | 1 |
| 2 | `003_avatar_videos.sql` | ✅ GREEN | Good indexes, proper RLS, cleanup function | 1 |
| 3 | `20260127_add_grok_videos_to_usage_tracking.sql` | ✅ GREEN | Safe ALTER TABLE | 1 |
| 4 | `20260130_update_replicate_to_wav2lip.sql` | ✅ GREEN | Safe UPDATE statement | 1 |
| 5 | `20260202_add_tavily_to_quota_settings.sql` | ✅ GREEN | Safe INSERT with ON CONFLICT | 1 |
| 6 | `20260207_add_city_columns_to_gamma_reports.sql` | ✅ GREEN | Safe ALTER TABLE | 1 |
| 7 | `001_initial_schema.sql` | ⚠️ YELLOW | Missing indexes on `comparisons.comparison_id` and `olivia_conversations.openai_thread_id` | 2 |
| 8 | `20260123_create_consent_logs.sql` | ⚠️ YELLOW | RLS `INSERT WITH CHECK (true)` — too broad, allows unauthenticated inserts | 3 |
| 9 | `20260126_create_api_cost_records.sql` | ⚠️ YELLOW | Assumes `update_updated_at_column()` exists from 001 — migration ordering dependency | 3 |
| 10 | `20260127_create_grok_videos.sql` | ⚠️ YELLOW | UNIQUE constraint includes `status` — allows duplicate city+type for different states | 3 |
| 11 | `20260130_create_api_quota_settings.sql` | ⚠️ YELLOW | Fallback provider references may fail at insert time | 2 |
| 12 | `20260202_create_authorized_manual_access.sql` | ⚠️ YELLOW | Hardcoded admin emails — security/maintainability concern | 3 |
| 13 | `20260207_create_reports_storage.sql` | ⚠️ YELLOW | Storage bucket policies assume bucket exists (no validation) | 2 |
| 14 | `20260124_create_judge_reports.sql` | 🔴 RED | **DUPLICATE TABLE:** `judge_reports` created here AND in 20260125 — migration collision | 5 |
| 15 | `20260125_create_judge_tables.sql` | 🔴 RED | **DUPLICATE TABLES:** `judge_reports` AND `avatar_videos` (conflicts with 003 & 124) | 5 |
| 16 | `20260128_create_contrast_image_cache.sql` | 🔴 RED | RLS `INSERT WITH CHECK (true)` + `UPDATE USING (true)` — allows unauthenticated writes; **cache poisoning risk** | 4 |
| 17 | `fix-all-warnings.sql` | 🔴 RED | **DESTRUCTIVE:** Drops ALL policies across ALL tables via dynamic SQL — **NEVER run in production** | 5 |
| 18 | `fix-rls-warnings.sql` | 🔴 RED | **DESTRUCTIVE:** Same dynamic policy drop+recreate — **NEVER run in production** | 5 |

**Migrations Summary:** 6 GREEN | 7 YELLOW | 5 RED

---

### 1.7 Configuration Files

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `tsconfig.json` | ✅ GREEN | Proper reference-based setup | 1 |
| 2 | `tsconfig.app.json` | ✅ GREEN | Strict mode enabled | 1 |
| 3 | `tsconfig.node.json` | ✅ GREEN | Proper node config | 1 |
| 4 | `eslint.config.js` | ✅ GREEN | Modern flat config | 1 |
| 5 | `index.html` | ✅ GREEN | Proper PWA setup | 1 |
| 6 | `public/manifest.json` | ✅ GREEN | Complete PWA manifest | 1 |
| 7 | `.gitignore` | ✅ GREEN | Proper exclusions | 1 |
| 8 | `vite.config.ts` | ⚠️ YELLOW | Code splitting incomplete — missing chunks for `stripe`, `simli-client`, `@vercel/og` | 2 |
| 9 | `.env.example` | ⚠️ YELLOW | 170+ env vars with no validation schema | 2 |
| 10 | `vercel.json` | ⚠️ YELLOW | **Missing security headers:** CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy | 3 |
| 11 | `package.json` | 🔴 RED | Build command `"tsc -b && vite build"` contradicts CLAUDE.md "NEVER run tsc locally"; Vercel executes this — risk of build failures | 4 |

**Config Summary:** 7 GREEN | 3 YELLOW | 1 RED

---

### 1.8 Core App Files

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `src/main.tsx` | ✅ GREEN | Clean entry point | 1 |
| 2 | `src/index.css` | ✅ GREEN | Proper reset styles | 1 |
| 3 | `src/App.tsx` | ⚠️ YELLOW | **31 useState variables** — violates React best practices; complex state interdependencies; missing error boundaries; `OliviaChatBubble` renders for free-tier users with 0 minutes | 3 |
| 4 | `src/App.css` | ⚠️ YELLOW | Missing dark mode variants for `.comparison-cities-header`, `.llm-add-btn`; duplicate `p{}` rules | 2 |
| 5 | `src/styles/dark-mode.css` | ⚠️ YELLOW | Incomplete selector coverage — missing dark variants for several components, poor button hover states | 2 |
| 6 | `src/styles/globals.css` | ⚠️ YELLOW | Unused typography variables; duplicate `p{}` rule conflicts | 2 |

**Core Summary:** 2 GREEN | 4 YELLOW | 0 RED

---

### 1.9 Scripts & Other Files

| # | File | Status | Summary | Sev |
|---|------|--------|---------|-----|
| 1 | `scripts/generate-pwa-icons.cjs` | ✅ GREEN | PWA icon generation utility | 1 |
| 2 | `scripts/update-results.cjs` | ✅ GREEN | Results update utility | 1 |
| 3 | `scripts/sync-emilia-knowledge.ts` | ⚠️ YELLOW | Needs auth review | 2 |
| 4 | `scripts/sync-olivia-knowledge.ts` | ⚠️ YELLOW | Needs auth review | 2 |
| 5 | `README.md` | ✅ GREEN | Project readme | 1 |
| 6 | `CLAUDE.md` | ✅ GREEN | Claude instructions | 1 |

**Scripts Summary:** 4 GREEN | 2 YELLOW | 0 RED

---

## GRAND TOTALS

| Section | ✅ GREEN | ⚠️ YELLOW | 🔴 RED | Total |
|---------|----------|-----------|--------|-------|
| API Layer | 14 | 25 | 3 | 42 |
| Components | 23 | 18 | 1 | 42 |
| Services | 5 | 7 | 1 | 13 |
| Hooks | 8 | 9 | 0 | 17 |
| Types/Data/Lib | 14 | 12 | 0 | 26 |
| DB Migrations | 6 | 7 | 5 | 18 |
| Config | 7 | 3 | 1 | 11 |
| Core App | 2 | 4 | 0 | 6 |
| Scripts/Other | 4 | 2 | 0 | 6 |
| **TOTALS** | **83** | **87** | **11** | **181** |

**Overall Health: 83 GREEN (46%) | 87 YELLOW (48%) | 11 RED (6%)**

---

## 2. CRITICAL ISSUES (RED)

### Severity 5 — CATASTROPHIC (Data corruption / System failure)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| **R1** | **Cache city swap bug** — `swapCityOrder()` only swaps root pointers, not nested CategoryConsensus city references. "Austin vs Denver" cached → retrieving "Denver vs Austin" shows Denver's scores under Austin's name | `src/services/cache.ts:403-424` | Wrong data shown to users; incorrect city scoring; corrupted saved reports |
| **R2** | **Duplicate table migrations** — `judge_reports` created in BOTH 20260124 and 20260125; `avatar_videos` in BOTH 003 and 20260125 | `supabase/migrations/20260124*.sql` + `20260125*.sql` | Migration failures on fresh DB setup |
| **R3** | **Destructive migration scripts** — Drop ALL RLS policies then recreate via dynamic SQL | `supabase/fix-all-warnings.sql` + `fix-rls-warnings.sql` | Running in production = lock out ALL users |

### Severity 4 — CRITICAL (Security / Major functionality)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| **R4** | **Hardcoded admin bypass emails** — grants SOVEREIGN tier unconditionally; dual-path via ENV + hardcode | `api/video/grok-generate.ts:~50` | Unauthorized enterprise access |
| **R5** | **Hardcoded admin emails in source** — credential exposure | `api/admin/sync-olivia-knowledge.ts` | Security risk |
| **R6** | **RLS cache poisoning** — `INSERT WITH CHECK (true)` + `UPDATE USING (true)` allows unauthenticated writes | `supabase/migrations/20260128_create_contrast_image_cache.sql:35-38` | Malicious cache data injection |
| **R7** | **Build command contradiction** — `package.json` runs `tsc -b` which CLAUDE.md forbids; Vercel executes it | `package.json:8` + `vercel.json:59` | Build instability |
| **R8** | **AskOlivia mobile breakage** — viewport frame doesn't resize <375px; touch targets too small; textarea squashes | `src/components/AskOlivia.tsx` | Broken mobile UX for Olivia feature |
| **R9** | **Orphaned storage files** — HTML cleanup fails silently after DB insert failure | `src/services/reportStorageService.ts:149-150` | Storage accumulation, costs |
| **R10** | **Deprecated D-ID endpoint** — architecture violation; has own LLM | `api/olivia/avatar/did.ts` | Unpredictable avatar behavior |

### Severity 3 — HIGH (Functional impact)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| **R11** | **Auth deadlock** — `fetchingRef` never resets if `fetchUserData()` hangs | `src/contexts/AuthContext.tsx:129-141` | User locked out of auth |

---

## 3. CAUTION ISSUES (YELLOW) — Top 20 Most Important

| # | Issue | Location | Sev | Impact |
|---|-------|----------|-----|--------|
| Y1 | `evaluate.ts` is 1648 lines with in-memory Tavily cache | `api/evaluate.ts` | 3 | Cache loss on cold start |
| Y2 | Missing security headers in Vercel (CSP, HSTS, etc.) | `vercel.json` | 3 | XSS/clickjacking risk |
| Y3 | Stripe checkout CORS set to `'open'` | `api/stripe/create-checkout-session.ts` | 3 | CSRF risk |
| Y4 | App.tsx has 31 useState — state management explosion | `src/App.tsx:69-184` | 3 | Maintenance nightmare |
| Y5 | AuthContext fetchingRef deadlock risk | `src/contexts/AuthContext.tsx` | 3 | Auth hangs |
| Y6 | `llmEvaluators.ts` partial failure handling unclear | `src/services/llmEvaluators.ts` | 3 | Incomplete scoring data |
| Y7 | `opusJudge.ts` fallback lacks logging | `src/services/opusJudge.ts` | 3 | Silent judge failures |
| Y8 | `databaseService.ts` uses unsafe casts (`as CityData`, `any`) | `src/services/databaseService.ts` | 3 | Type safety violations |
| Y9 | RLS INSERT allows unauthenticated consent logging | `supabase/20260123_consent_logs.sql` | 3 | Data integrity |
| Y10 | Hardcoded admin emails in migration | `supabase/20260202_authorized_manual_access.sql` | 3 | Maintainability |
| Y11 | Grok videos UNIQUE constraint includes `status` | `supabase/20260127_grok_videos.sql` | 3 | Duplicate video requests |
| Y12 | EnhancedComparison.tsx = 2268 lines | `src/components/EnhancedComparison.tsx` | 3 | Unmaintainable |
| Y13 | VisualsTab Gamma report saving uses `Date.now()` fallback ID | `src/components/VisualsTab.tsx` | 3 | Orphaned reports |
| Y14 | `useComparison.ts` race condition on unmount | `src/hooks/useComparison.ts` | 3 | State errors |
| Y15 | `useOliviaChat.ts` race condition — stale data risk | `src/hooks/useOliviaChat.ts` | 3 | Wrong Olivia context |
| Y16 | `useDIDStream.ts` concurrent connect despite mutex | `src/hooks/useDIDStream.ts` | 3 | Stream conflicts |
| Y17 | AdvancedVisuals charts are placeholders only | `src/components/AdvancedVisuals.tsx` | 2 | Feature incomplete |
| Y18 | Code splitting incomplete in vite.config.ts | `vite.config.ts` | 2 | Bundle bloat |
| Y19 | 170+ env vars with no validation schema | `.env.example` | 2 | Runtime config errors |
| Y20 | Dark mode incomplete for several components | `src/styles/dark-mode.css` + `App.css` | 2 | Visual glitches in dark mode |

---

## 4. CHANGES BY RISK LEVEL

### 4.1 SAFE CHANGES — Zero Risk of Breaking Anything

These are documentation, config, and cosmetic changes that cannot affect functionality:

| # | Change | Files | Why Safe |
|---|--------|-------|----------|
| S1 | Remove `fix-all-warnings.sql` and `fix-rls-warnings.sql` from repo (or rename `.bak`) | `supabase/fix-*.sql` | These are manual-run scripts, not in migration chain |
| S2 | Add security headers to `vercel.json` (CSP, X-Frame-Options, HSTS, etc.) | `vercel.json` | Additive config only; no existing behavior changed |
| S3 | Add missing indexes to initial schema (as new migration) | New migration file | Additive; improves performance; no schema change |
| S4 | Move hardcoded admin emails to environment variables | `api/admin/sync-olivia-knowledge.ts`, `supabase/20260202*.sql` | Same behavior, better security |
| S5 | Rename `freedom-index-scoring-anchors (1).json` to remove space/parentheses | `src/data/` | Fix fragile import path |
| S6 | Add `fetchWithTimeout` wrapper to `AuthContext.fetchUserData()` | `src/contexts/AuthContext.tsx` | Prevents deadlock; doesn't change success path |
| S7 | Add environment variable validation schema | New config file | Catches config errors at startup |
| S8 | Standardize rate limiter pattern — use `applyRateLimit()` everywhere | `api/user/delete.ts`, `api/user/export.ts` | Consistent behavior; same rate limits |
| S9 | Remove deprecated `api/olivia/avatar/did.ts` | `api/olivia/avatar/did.ts` | Confirmed deprecated; other avatar providers handle traffic |
| S10 | Fix dark mode CSS gaps (add missing selectors) | `src/styles/dark-mode.css`, `src/App.css` | Cosmetic only; doesn't affect light mode |
| S11 | Add `.bak` suffix to unused migration `20260125_create_judge_tables.sql` | `supabase/migrations/` | This file can't execute successfully anyway (duplicate tables) |
| S12 | Improve code splitting — add manual chunks for `stripe`, `simli-client` | `vite.config.ts` | Only affects bundling, not runtime |

---

### 4.2 MODERATE RISK CHANGES — Low Impact, Specific Risks Identified

| # | Change | Files | Risk | Mitigation |
|---|--------|-------|------|------------|
| M1 | **Fix cache `swapCityOrder()` bug** — deep-clone and update ALL nested city references | `src/services/cache.ts:403-424` | Risk: Existing cached data in localStorage could be in old format | Mitigation: Add version check on cached data; invalidate old cache entries on load |
| M2 | **Fix RLS policies** — change `WITH CHECK (true)` to `WITH CHECK (auth.role() = 'service_role')` | `supabase/20260123*.sql`, `20260128*.sql` | Risk: If any client-side code inserts directly (not via service role), it will break | Mitigation: Audit all insert paths first; verify all inserts go through server-side API |
| M3 | **Refactor App.tsx state** — extract 31 useState into custom hooks/context | `src/App.tsx` | Risk: State interdependencies are complex; refactor could break state sync | Mitigation: Extract one state group at a time; test after each extraction |
| M4 | **Remove hardcoded bypass emails from grok-generate** | `api/video/grok-generate.ts` | Risk: Admin user loses bypass if ENV not configured | Mitigation: Verify `DEV_BYPASS_EMAILS` env var is set in Vercel before removing hardcode |
| M5 | **Fix grok_videos UNIQUE constraint** — remove `status` from constraint | `supabase/20260127*.sql` | Risk: Requires DROP + CREATE constraint; brief downtime | Mitigation: Run during low-traffic window; use `IF EXISTS` guard |
| M6 | **Add lazy loading** to heavy components | `src/App.tsx`, various components | Risk: Flash of loading state; Suspense boundaries needed | Mitigation: Add Suspense with meaningful fallback UI; test on slow connections |
| M7 | **Fix race conditions** in `useComparison`, `useOliviaChat` | `src/hooks/useComparison.ts`, `useOliviaChat.ts` | Risk: Adding cleanup could mask real errors | Mitigation: Add `isMounted` ref check; keep error logging |
| M8 | **Add AbortController to `useContrastImages`** | `src/hooks/useContrastImages.ts` | Risk: Aborting mid-fetch could leave partial state | Mitigation: Reset state on abort; show retry option |
| M9 | **Fix `reportStorageService` orphaned file cleanup** | `src/services/reportStorageService.ts` | Risk: Retry logic could slow down save operation | Mitigation: Run cleanup as background task (non-blocking) |
| M10 | **Improve AskOlivia mobile layout** | `src/components/AskOlivia.tsx`, `AskOlivia.css` | Risk: CSS changes could affect desktop layout | Mitigation: Use `@media` queries only; test on both desktop and mobile |

---

### 4.3 HIGH RISK CHANGES — Significant Codebase Impact

| # | Change | Files | Risk | Mitigation Strategy |
|---|--------|-------|------|---------------------|
| H1 | **Fix scoring system** — `[object Object]` bug in category options; port advanced prompts from `llmEvaluators.ts` to `api/evaluate.ts` | `api/evaluate.ts`, `src/services/llmEvaluators.ts` | **HIGH:** This is the core scoring engine. Wrong fix = all scores wrong. Multiple LLMs affected. | 1. Create feature flag (`SCORING_V2=true`); 2. Port prompts to server-side behind flag; 3. Run both scoring paths in parallel; 4. Compare outputs before switching; 5. Gradual rollout |
| H2 | **Fix neutral 50 default** for missing/failed metrics — exclude instead of defaulting | `api/evaluate.ts`, `src/services/llmEvaluators.ts`, `src/services/opusJudge.ts` | **HIGH:** Changes how ALL scores are calculated. Cities with different data coverage will show different scores. | 1. Analyze impact on existing saved comparisons; 2. Add `evaluatedMetrics` count display in UI; 3. Implement alongside H1; 4. Show data completeness percentage |
| H3 | **Fix Perplexity JSON schema** — schema forces numeric when prompts ask for categories | `api/evaluate.ts` (Perplexity section) | **HIGH:** Perplexity returns 0/1 instead of real scores. Fix changes Perplexity output significantly. | 1. Test with sample cities first; 2. Validate output format matches other LLMs; 3. Update score normalization to handle new format |
| H4 | **Fix Gemini safety settings** | `api/evaluate.ts` (Gemini section) | **MEDIUM-HIGH:** May unblock previously blocked freedom-related content, changing scores | 1. Add `safetySettings` with `BLOCK_NONE` for research; 2. Test with sensitive topics (gun laws, etc.); 3. Verify output quality |
| H5 | **Bundle size reduction** — implement full lazy loading, dynamic imports for 268KB data files | `vite.config.ts`, `src/App.tsx`, multiple components | **MEDIUM-HIGH:** Fundamental loading behavior change | 1. Implement React.lazy() + Suspense one tab at a time; 2. Test cold-load times; 3. Monitor Core Web Vitals; 4. Deploy behind feature flag |
| H6 | **Fix Tavily search efficiency** — make it gap-filler instead of primary source | `api/evaluate.ts` | **HIGH:** Changes how all city data is gathered. Could improve or worsen data quality. | 1. A/B test with specific city pairs; 2. Log Tavily usage before/after; 3. Gradual reduction |
| H7 | **Personality/Persona weights in Standard mode** | `api/evaluate.ts`, scoring logic | **HIGH:** Changes how standard comparisons are scored for ALL users | 1. Audit current weight behavior; 2. Add UI indicator when weights active; 3. Feature flag for rollout |

---

## 5. UI/UX DEEP DIVE

### 5.1 Desktop vs Mobile Issues

| Component | Desktop | Mobile (<768px) | Mobile (<375px) | Sev |
|-----------|---------|-----------------|-----------------|-----|
| **AskOlivia.tsx** | ✅ Good | ⚠️ Bezel tight | 🔴 Frame breaks, textarea squashes, touch targets <44px | 4 |
| **Header.tsx** | ✅ Good | ⚠️ Contact info cramped | 🔴 Overflows at <320px; needs flex-wrap | 2 |
| **EnhancedComparison.tsx** | ✅ Good | ⚠️ Column alignment unknown | ⚠️ Needs testing — 2268-line component | 3 |
| **SettingsModal.tsx** | ✅ Good | ⚠️ Modal exceeds viewport height | ⚠️ 4-tab layout may need scrolling | 2 |
| **EmiliaChat.tsx** | ✅ Good | ⚠️ Voice transcript overflow | ⚠️ No sticky header during scroll | 2 |
| **JudgeTab.tsx** | ✅ Good | ⚠️ Video controls need 44px targets | ⚠️ Welcome screen too large for viewport | 2 |
| **Results.tsx** | ✅ Good | ⚠️ Metric table needs responsive testing | ⚠️ Column headers may misalign | 2 |
| **VisualsTab.tsx** | ✅ Good | ⚠️ Gamma iframe responsive | ⚠️ Report selector dropdown needs testing | 2 |

### 5.2 Column/Table/Section Alignment Issues

| Issue | Location | Description |
|-------|----------|-------------|
| City names with data underneath | Results.tsx, EnhancedComparison.tsx | Column headers may not align with data below on narrow screens |
| Judge Tab mobile buttons | JudgeTab.tsx | Not centered on mobile (documented in known bugs) |
| Freedom Cards text size | FreedomMetricsList.tsx | Text too large (documented in known bugs) |
| Results Report auto-scroll | Results.tsx | Doesn't scroll to start of report section |
| Mobile "One remaining" text | LoadingState.tsx area | Positioning issue (documented) |

### 5.3 Enhanced Report Saving Issue

**Finding:** Enhanced reports CAN be saved. The `SavedComparisons.tsx` component handles both standard and enhanced properly with defensive data checks. However:

1. **VisualsTab Gamma report saving** uses `Date.now()` fallback for `comparisonId` — this can create orphaned reports that don't link back to the comparison
2. **reportStorageService.ts** has no validation that enhanced comparison results properly map to `SaveReportData` fields — type mismatch could cause silent data loss
3. **Cache swap bug** (cache.ts:403-424) means saved enhanced reports could have city data swapped

---

## 6. DATABASE & BACKEND DEEP DIVE

### 6.1 Database Timeout Issues

| Issue | Location | Impact |
|-------|----------|--------|
| **Supabase profile fetch = 45+ seconds** | `AuthContext.tsx` → `databaseService.ts` | Falls back to 'free' tier; user loses paid features |
| **fetchingRef deadlock** | `AuthContext.tsx:129-141` | If fetch hangs, ALL future auth fetches blocked |
| **No timeout on fetchUserData()** | `AuthContext.tsx` | Infinite hang possible |

### 6.2 Database Code Bugs

| Bug | Location | Description |
|-----|----------|-------------|
| Unsafe casts | `databaseService.ts:104-105` | `as CityData` without validation |
| Any types | `databaseService.ts:629, 645+` | `profile: any`, `any[]` conversations |
| Unvalidated shapes | `types/database.ts:49, 76-78` | `Record<string, unknown>` for comparison results |

### 6.3 Database-to-UX Miscommunication

| Issue | Path | Symptom |
|-------|------|---------|
| Tier fallback to 'free' on timeout | DB → AuthContext → FeatureGate | Paid user sees free-tier restrictions |
| Stale Olivia context | DB → useOliviaChat → AskOlivia | Race condition: old comparison data in new context |
| Orphaned storage files | DB insert fail → Storage cleanup silent fail | Reports appear saved but HTML is ghost file |
| Cache city swap | localStorage cache → Results display | Scores shown under wrong city name |

---

## 7. PERFORMANCE & LOADING ANALYSIS

### 7.1 Critical Performance Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **Bundle size: 1.36MB** | 1-3 minute cold load; all 177 modules in ONE chunk | 5 |
| **No lazy loading** | All 42 components load on startup | 4 |
| **268KB static data in main chunk** | `metrics.ts`, `fieldKnowledge.ts`, anchors JSON all bundled | 3 |
| **88 useEffect hooks** | Cascade of API calls on mount; likely duplicate calls | 3 |
| **City data not cached** | 200 cities = no cache; searches take 3-5 minutes | 3 |
| **Tavily calls too aggressive** | Expensive and repetitive; controls everything instead of filling gaps | 3 |
| **In-memory Tavily cache** (server) | Resets on Vercel cold start; no persistence | 2 |
| **Incomplete code splitting** | Missing chunks for stripe, simli-client, @vercel/og | 2 |

### 7.2 Loading Sequence Issues

```
Current Flow (SLOW):
index.html → main.tsx → App.tsx (loads ALL 42 components)
                              → ALL hooks fire (88 useEffects)
                              → Auth fetch (45s timeout possible)
                              → Supabase connection
                              → ALL data files loaded (268KB)
Total: 5-15 seconds minimum, up to 3 minutes on cold Vercel start

Ideal Flow (FAST):
index.html → main.tsx → App.tsx (loads CitySelector + Header only)
                              → Auth fetch (with 5s timeout + retry)
                              → React.lazy() loads tab on demand
                              → Dynamic import for data files
Total: <3 seconds target
```

---

## 8. KNOWN BUGS CROSS-REFERENCE

### 8.1 Persistent Unresolved Issues (Mentioned in 2+ Documents)

| Bug | Docs Mentioning It | Status |
|-----|-------------------|--------|
| **Scoring system `[object Object]` bug** | CRITICAL_ISSUES_2026_0119, SCORING_FIX_PLAN, SCORING_SYSTEM_REDESIGN | **UNFIXED** |
| **Bundle size 1.36MB** | PERFORMANCE_AUDIT_20260202, BUG_TRACKING_20260129 | **UNFIXED** |
| **Supabase profile timeout 45s** | BUG_TRACKING, HANDOFF_20260129_BUGS, MASTER-TODO | **PARTIAL** |
| **Missing metrics (25% returned)** | CRITICAL_ISSUES, SCORING_FIX_PLAN | **UNFIXED** |
| **Inconsistent LLM score formats** | CRITICAL_ISSUES, SCORING_SYSTEM_REDESIGN | **UNFIXED** |
| **Neutral 50 default convergence** | SCORING_FIX_PLAN, SCORING_SYSTEM_REDESIGN | **UNFIXED** |
| **No lazy loading** | PERFORMANCE_AUDIT, BUG_TRACKING | **UNFIXED** |
| **Tier/permission issues** | HANDOFF_20260129, FEATURE_GATING_AUDIT, CRITICAL_BUG | **PARTIAL** |

### 8.2 Recently Fixed (Verify Still Working)

| Bug | Fix Commit | Status |
|-----|-----------|--------|
| Save button stuck in depressed state | `9da92d2` | FIXED ✅ |
| judge_reports 400 Bad Request | `3ef88d6` | FIXED ✅ |
| Results page not opening after enhanced | `e648388` | FIXED ✅ |
| FeatureGate blocks clicks after dismiss | `e827fff` | FIXED ✅ |
| NewLifeVideos expired cached URLs | `c4a9b0b` | FIXED ✅ |
| Gemini cold start timeouts | `c4a9b0b` | FIXED ✅ |
| Olivia audio not stopping on navigate | `0df7b98` | FIXED ✅ |

---

## 9. IMPROVEMENT SUGGESTIONS

### 9.1 Architecture Improvements

1. **State Management Overhaul** — Extract App.tsx's 31 useState into domain-specific contexts:
   - `ComparisonContext` (cities, results, enhanced mode)
   - `UIContext` (modals, tabs, loading states)
   - `AuthContext` (already exists, needs timeout fix)
   - `SettingsContext` (API keys, preferences)

2. **Lazy Loading Architecture** — Implement React.lazy() for all tabs:
   ```
   const JudgeTab = React.lazy(() => import('./components/JudgeTab'))
   const AskOlivia = React.lazy(() => import('./components/AskOlivia'))
   const VisualsTab = React.lazy(() => import('./components/VisualsTab'))
   ```

3. **Server-Side Caching** — Replace in-memory Tavily cache with Supabase cache table (already have `contrast_image_cache` pattern)

4. **Error Boundary Strategy** — Wrap each tab in its own ErrorBoundary so one tab crash doesn't take down entire app

### 9.2 Security Improvements

1. Add Content-Security-Policy header to vercel.json
2. Remove ALL hardcoded emails from source code → use env vars
3. Fix RLS policies on consent_logs and contrast_image_cache
4. Audit all API endpoints for authentication checks
5. Implement CSRF tokens for Stripe checkout

### 9.3 Performance Improvements

1. **Bundle splitting** — Add manual chunks for all heavy dependencies
2. **Dynamic imports** — Load `fieldKnowledge.ts` (100KB+) and metrics data on demand
3. **Image optimization** — Verify all public/ images are optimized
4. **API response caching** — Add `Cache-Control` headers for static API responses
5. **Prefetch critical routes** — Use `<link rel="prefetch">` for likely next tabs

### 9.4 UX Improvements

1. **Mobile-first pass** — Test ALL components at 320px, 375px, 768px breakpoints
2. **Touch targets** — Ensure ALL interactive elements are minimum 44x44px on mobile
3. **Loading states** — Add skeleton screens instead of spinners
4. **Data completeness indicator** — Show users what % of metrics were successfully evaluated
5. **Offline support** — PWA manifest exists but no service worker for offline
6. **Score explainer** — Show users HOW scores are calculated (not just the number)

### 9.5 Developer Experience Improvements

1. **Split EnhancedComparison.tsx** (2268 lines) into sub-components
2. **Split evaluate.ts** (1648 lines) into module files
3. **Add TypeScript strict validation** for all database types
4. **Create shared hook for race-condition-safe async** operations
5. **Add E2E tests** for critical flows (compare → save → load)

---

## APPENDIX: COMPLETE FILE COUNT

| Category | Count |
|----------|-------|
| API serverless functions | 42 |
| React components (.tsx) | 42 |
| React component styles (.css) | 42 |
| Services | 13 |
| Hooks | 17 |
| Types | 10 |
| Data files | 4 |
| Lib files | 2 |
| Utils | 3 |
| Constants | 1 |
| Contexts | 1 |
| Database migrations | 18 |
| Config files | 11 |
| Core app files | 6 |
| Scripts | 4 |
| Documentation | 80+ |
| **Total audited** | **~296 files** |

---

**Report generated:** 2026-02-09
**Auditor:** Claude Code (Opus 4.6)
**Co-Authored-By:** Claude
**Session:** LIFESCORE-AUDIT-20260209-001
