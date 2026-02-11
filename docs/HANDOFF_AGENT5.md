# Handoff for Next Agent (Agent 5)

## Context
A codebase audit identified bugs across 8 categories. Four previous agents have worked through the list. Your job is to continue through the remaining bugs.

## What's Been Completed (Do NOT Redo)

### Agent 1 — Security/Auth (branch: `claude/fix-critical-security-bugs-8Gitt`, pending owner review)
- All security bugs fixed: JWT auth on Stripe endpoints, IDOR vulnerabilities, admin API protection

### Agent 2 — Cache System (branch: `claude/security-audit-handoff-sJm2c`, pending owner review)
- All 6 cache system bugs fixed

### Agent 3 — Critical bugs (branch: `claude/fix-remaining-bugs-bZrQJ`, pending owner review)
- Fixed 17 items (scoring, database mutex, ErrorBoundary, localStorage key, mobile CSS, accessibility)
- **Note:** Agent 3's fixes are on a separate branch NOT merged into main. Agent 4 re-implemented some overlapping fixes independently.

### Agent 4 — This round (branch: `claude/fix-remaining-bugs-JG6rK`, pending owner review)
Fixed 30+ items across 6 categories (**24 files changed, +520/-179 lines**):

**Error Handling (4 fixed):**
- ✅ #2: Claude Sonnet retry logic (3 retries, exponential backoff) in `api/evaluate.ts`
- ✅ #3: GPT-4o retry logic (same pattern) in `api/evaluate.ts`
- ✅ #9: Tavily research retry (2 attempts with 2s backoff) in `api/evaluate.ts`
- ✅ #11: Partial LLM failure warning banner in `src/components/EnhancedComparison.tsx`

**Database/Supabase (5 fixed + 1 new migration):**
- ✅ #4: `isEnhancedComparisonResult()` validates `llmsUsed` array elements against known providers
- ✅ #5: `dbSaveComparison` marks synced/unsynced status (was fire-and-forget)
- ✅ #9: `exportUserData()` has LIMIT 1000 per table
- ✅ #12: `fullDatabaseSync` reports partial failures (was always success:true)
- ✅ New migration `20260209_fix_schema_issues.sql`: CHECK constraint fix, composite indexes, RLS tightening

**Accessibility (4 fixed):**
- ✅ #4: Gold color `#c9a227` → `#e6b800` across 8 CSS files (meets WCAG 4.5:1)
- ✅ #7: `role="progressbar"` + ARIA on LoadingState
- ✅ #8: `aria-hidden="true"` on SVG icons, `aria-label` on logout in Header
- ✅ #10: Full ARIA on weight sliders in WeightPresets

**Performance (3 fixed):**
- ✅ #6: Dynamic client timeout based on metrics count in `llmEvaluators.ts`
- ✅ #12: `loading="lazy"` on contrast images in `ContrastDisplays.tsx`
- ✅ Bonus: Fixed wrong localStorage key in `App.tsx:162` (`lifescore_comparisons` → reads both `lifescore_saved_comparisons` + `lifescore_saved_enhanced`)

**Mobile UI (10 fixed):**
- ✅ #9: Report type badges min-width:110px
- ✅ #10: Tab badge consistent sizing (20px)
- ✅ #14: JudgeTab action buttons font-size 0.38rem→0.75rem
- ✅ #15: Toolbar buttons centered not stretched
- ✅ #18: PricingModal max-height 95vh for short phones
- ✅ #19: FreedomMetricsList max-height 180px→250px
- ✅ #20: CitySelector input max-width:100%
- ✅ #21: LLM score cards min-width reduced for mobile
- ✅ #22: JudgeTab dropdown 480px breakpoint
- ✅ #23: Disputed metrics mini scores font-size 0.5→0.6rem

---

## What Remains — By Category (Recommended Priority Order)

To get the full bug details, run:
```
git fetch origin claude/codebase-audit-status-27FOA
git checkout origin/claude/codebase-audit-status-27FOA -- BUGS/
```

### 1. ERROR HANDLING (3 remaining)

| Bug # | Severity | File | Issue | Effort |
|-------|----------|------|-------|--------|
| #4 | HIGH | src/App.tsx + all components | No user-facing error messages — errors go to console only. Needs toast system (react-hot-toast or similar) | 2 hrs |
| #7 | MEDIUM | src/main.tsx | No offline detection — navigator.onLine + event listeners | 15 min |
| #10 | MEDIUM | All files | No external error tracking (259 console.error calls, zero Sentry/LogRocket) | 1 hr |

**Recommendation:** #7 is quick. #4 is high value but needs a new dependency. #10 may be out of scope (requires external service setup).

### 2. DATABASE/SUPABASE (6 remaining)

| Bug # | Severity | File | Issue | Effort |
|-------|----------|------|-------|--------|
| #6 | HIGH | supabase/migrations/20260207_add_city_columns_to_gamma_reports.sql | ALTER TABLE needs IF NOT EXISTS (ALREADY HAS IT — verify if audit was wrong) | 5 min |
| #8 | MEDIUM | lib/supabase.ts:96-100 | Promise.race timeout doesn't cancel hung Supabase connections — needs AbortController | 30 min |
| #10 | MEDIUM | migrations/003:77-79 | avatar_videos publicly readable without auth (RLS allows all SELECT) | 15 min |
| #13 | LOW | Various | Connection pooling concerns | 15 min |
| #14 | LOW | Various | Subscription enforcement gaps | 15 min |
| #15 | LOW | Various | Minor migration ordering issues | 10 min |

**Note:** #6 was already correct (has IF NOT EXISTS). #10's avatar_videos RLS is "by design" for public video content. The LOW items are optional.

### 3. MOBILE UI/UX (39 remaining)

| Category | Count | Effort |
|----------|-------|--------|
| HIGH items (#11, #12, #13, #16, #17) | 5 | ~3 hrs |
| MEDIUM items (#24-45) | 22 | ~5 hrs |
| LOW items (#46-57) | 12 | ~2 hrs |

**Key HIGH items still open:**
- **#11** Results.css: Category bars lose city identity when stacked — add left border colors (20 min)
- **#12** EnhancedComparison.css: Dual score mode headers not centered at 768px (1.5 hrs)
- **#13** AskOlivia.css: Cockpit header too tall on mobile (30 min)
- **#16** EnhancedComparison.css: 7-column grid still partially unreadable at 480px — needs TSX changes (1 hr)
- **#17** Results.css: Metric name truncated at 480px (15 min)

**MEDIUM items:** Mostly `!important` cleanup, forced white color in light mode, touch targets too small from `scale(0.75)`, missing 480px breakpoints on VisualsTab/AdvancedVisuals/GunComparisonModal, table horizontal overflow.

### 4. ACCESSIBILITY/WCAG (21 remaining)

| Category | Count | Effort |
|----------|-------|--------|
| HIGH items (#5, #6, #9, #11) | 4 | ~3 hrs |
| MEDIUM items (#12-23) | 12 | ~3 hrs |
| LOW items | 5 | ~1 hr |

**Key HIGH items still open:**
- **#5** Missing aria-live="polite" for dynamic content updates across 5 components (1 hr)
- **#6** TabNavigation.tsx missing role="tablist", role="tabpanel", aria-controls, arrow keys (1 hr)
- **#9** Results.css winner bars use color only — add checkmark or "Winner" text (20 min)
- **#11** Form errors not linked to inputs via aria-describedby (30 min)

### 5. PERFORMANCE/LOADING (11 remaining)

| Category | Count | Effort |
|----------|-------|--------|
| CRITICAL items (#1, #2, #4) | 3 | ~3 hrs |
| HIGH items (#7-11, #13-15) | 8 | ~5 hrs |

**Key items still open:**
- **#1 CRITICAL** App.tsx: 32 useState variables — consolidate into useReducer (2 hrs, high effort)
- **#2 CRITICAL** logo-transparent.png: 1.5MB — convert to WebP (30 min)
- **#4 CRITICAL** SavedComparisons.tsx: Blocking Supabase sync on mount — show localStorage first (30 min)
- **#7** App.tsx: 20+ handlers missing useCallback (1.5 hrs)
- **#8** EnhancedComparison.tsx: Median recalculated every render — needs useMemo (45 min)
- **#9** EnhancedComparison.tsx: New Set/Map per render — needs useMemo (30 min)
- **#14** EnhancedComparison.tsx: 100 metrics in DOM — needs react-window virtualization (1.5 hrs)

### 6. SCORING (1 remaining — optional)
- **#3 LOW**: ~150 lines dead Phase 2 category scoring code behind USE_CATEGORY_SCORING flag (cleanup only)

---

## Grand Total Remaining

| Category | Remaining | Estimated Effort |
|----------|-----------|------------------|
| Error Handling | 3 | ~3.25 hours |
| Database/Supabase | 6 | ~1.5 hours |
| Mobile UI/UX | 39 | ~10 hours |
| Accessibility | 21 | ~7 hours |
| Performance | 11 | ~8 hours |
| Scoring | 1 (low) | ~1 hour |
| **Total** | **81** | **~30.75 hours** |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| api/evaluate.ts | Main LLM evaluation endpoint — all 5 providers, Tavily, Perplexity batching. Now has retry on ALL providers. |
| src/services/llmEvaluators.ts | Client-side LLM score processing. Dynamic timeout now in place. |
| src/services/savedComparisons.ts | Save/load/sync with Supabase. Better error tracking. |
| src/App.tsx | Main app (~1100 lines, 32 useState). Fixed localStorage key. |
| src/components/EnhancedComparison.tsx | Enhanced view (~2100 lines). Now shows partial failure warning. |
| src/components/EnhancedComparison.css | ~4400 lines CSS — largest stylesheet. Several mobile fixes applied. |
| supabase/migrations/20260209_fix_schema_issues.sql | NEW — consolidating migration for CHECK, indexes, RLS |

## Rules
- NEVER run `npm run build` or `tsc -b` unless checking for errors — Vercel auto-deploys from main
- Do NOT push to main — owner reviews and merges
- Create your own `claude/` feature branch for fixes
- The BUGS/ directory is on branch `claude/codebase-audit-status-27FOA`
- **IMPORTANT:** Run `npm run build` before pushing to catch TS errors (the Vercel preview deploy will fail otherwise)
