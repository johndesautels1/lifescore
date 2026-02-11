# Handoff for Next Agent (Agent 6)

## Context
A codebase audit identified ~151 bugs across 8 categories. Five previous agents have fixed ~110 of them. Your job is to continue through the remaining bugs.

## What's Been Completed (Do NOT Redo)

### Agent 1 — Security/Auth (branch: `claude/fix-critical-security-bugs-8Gitt`)
- All 12 security bugs fixed: JWT auth on Stripe endpoints, IDOR vulnerabilities, admin API protection

### Agent 2 — Cache System (branch: `claude/security-audit-handoff-sJm2c`)
- All 6 cache system bugs fixed

### Agent 3 — Critical bugs (branch: `claude/fix-remaining-bugs-bZrQJ`)
- Fixed 17 items (scoring, database mutex, ErrorBoundary, localStorage key, mobile CSS, accessibility)
- **Note:** Agent 3's fixes are on a separate branch. Agent 4 re-implemented overlapping fixes independently.

### Agent 4 — (branch: `claude/fix-remaining-bugs-JG6rK`)
Fixed 30+ items (**24 files changed, +520/-179 lines**):

**Error Handling:** #2 Claude retry, #3 GPT-4o retry, #9 Tavily retry, #11 partial failure banner
**Database:** #4 validation, #5 sync status, #9 export limits, #12 partial failure reporting, new migration
**Accessibility:** #4 gold color contrast, #7 progressbar ARIA, #8 SVG aria-hidden, #10 slider ARIA
**Performance:** #6 dynamic timeout, #12 lazy loading, bonus localStorage key fix
**Mobile UI:** #9 badges, #10 tab badge, #14 JudgeTab font, #15 toolbar, #18 PricingModal, #19 metrics list, #20 CitySelector, #21 LLM cards, #22 JudgeTab dropdown, #23 disputed metrics

### Agent 5 — This round (branch: `claude/fix-remaining-bugs-C3HEr`)
Fixed 40+ items across 25 files (**+252/-90 lines**). Agent 5 merged Agent 4's work into this branch.

**Performance (4 fixed):**
- ✅ #2: Logo WebP conversion (1.5MB PNG → 37KB WebP, 98% smaller) + exclude from PWA precache
- ✅ #4: Non-blocking SavedComparisons mount — shows cached localStorage data immediately, syncs Supabase in background
- ✅ #8: useMemo for median/topDifferences/dealbreaker calculations in EnhancedComparison
- ✅ #9: O(1) Map-based metric lookups replacing O(n) `.find()` in 100-metric render loop

**Error Handling (1 fixed):**
- ✅ #7: Offline/online detection with red banner (`role="alert"`) + global unhandled rejection handler in `src/main.tsx`

**Accessibility (14 fixed):**
- ✅ #5: `aria-live="polite"` on LoadingState progress section and Results winner hero
- ✅ #6: Full WAI-ARIA tabs: `role="tablist"`, `aria-controls`, `tabIndex` roving, arrow/Home/End key navigation
- ✅ #9: Winner checkmark indicator (✓) alongside color on category bars
- ✅ #11: Form errors linked via `aria-describedby` + `role="alert"` on all 3 LoginScreen forms
- ✅ #12: `role="dialog"` + `aria-modal="true"` on all 7 modals (Pricing, Settings, Help, Legal, DataSources, GitHub, Gamma)
- ✅ #13: Global `prefers-reduced-motion` rule in `index.css` disables all animations
- ✅ #14: `aria-label` on external links in Footer ("opens in new window")
- ✅ #15: `aria-label` on OliviaChatBubble audio play/stop buttons
- ✅ #16: `aria-hidden="true"` on decorative trophy/tie emoji in Results winner hero

**Mobile UI (11 fixed):**
- ✅ #8: EmiliaChat nav `position: sticky; top: 0; z-index: 10`
- ✅ #4: Header overlap at <360px — switch from absolute to flex layout
- ✅ #5: SettingsModal `max-height: 95vh` (was 100vh)
- ✅ #11: Results category bars — city color left-border when stacked at 768px
- ✅ #13: AskOlivia cockpit header — compact 2-column layout, hide status cluster on mobile
- ✅ #17: Results metric name `word-break: break-word` at 480px
- ✅ MEDIUM: `!important` cleanup in Results.css (score-label, bar-city, bar-score, metric-name → CSS variables)
- ✅ MEDIUM: SavedComparisons nickname input `width: 100%; max-width: 200px` (was fixed 200px)
- ✅ MEDIUM: SavedComparisons tabs stay horizontal on mobile (`flex-wrap: wrap` instead of `flex-direction: column`)
- ✅ MEDIUM: DealbreakersWarning 480px responsive breakpoint added
- ✅ MEDIUM: NewLifeVideos 480px responsive breakpoint added

---

## What Remains — By Category (Recommended Priority Order)

To get the full bug details, run:
```
git fetch origin claude/codebase-audit-status-27FOA
git checkout origin/claude/codebase-audit-status-27FOA -- BUGS/
```

### 1. ERROR HANDLING (2 remaining)

| Bug # | Severity | File | Issue | Effort |
|-------|----------|------|-------|--------|
| #4 | HIGH | src/App.tsx + all components | No user-facing error messages — errors go to console only. Needs toast/notification system (react-hot-toast or custom) | 2 hrs |
| #10 | MEDIUM | All files | No external error tracking (259 console.error calls). Needs Sentry/LogRocket or similar | 1 hr |

**Note:** #4 is the highest-value remaining item across the entire audit. #10 requires external service setup which may be out of scope.

### 2. DATABASE/SUPABASE (6 remaining)

| Bug # | Severity | File | Issue | Effort |
|-------|----------|------|-------|--------|
| #6 | HIGH | supabase/migrations/20260207_add_city_columns_to_gamma_reports.sql | ALTER TABLE needs IF NOT EXISTS (**audit may be wrong — already has it**) | 5 min |
| #8 | MEDIUM | lib/supabase.ts:96-100 | Promise.race timeout doesn't cancel hung Supabase connections — needs AbortController | 30 min |
| #10 | MEDIUM | migrations/003:77-79 | avatar_videos publicly readable without auth (**by design** for public video content) | 15 min |
| #13 | LOW | Various | Connection pooling concerns | 15 min |
| #14 | LOW | Various | Subscription enforcement gaps | 15 min |
| #15 | LOW | Various | Minor migration ordering issues | 10 min |

**Note:** #6 is likely a false positive. #10 is by design. LOW items are optional.

### 3. PERFORMANCE/LOADING (7 remaining)

| Bug # | Severity | File | Issue | Effort |
|-------|----------|------|-------|--------|
| #1 | CRITICAL | src/App.tsx | 32 useState variables — consolidate into useReducer | 2 hrs |
| #7 | HIGH | src/App.tsx | 20+ event handlers missing useCallback (cause child re-renders) | 1.5 hrs |
| #10 | HIGH | Various | No bundle analysis — consider vite-plugin-visualizer | 15 min |
| #11 | HIGH | Various | No performance monitoring (Web Vitals) | 30 min |
| #13 | MEDIUM | src/components/EnhancedComparison.tsx | Inline styles in metric rows cause style recalc | 30 min |
| #14 | MEDIUM | src/components/EnhancedComparison.tsx | 100 metrics in DOM — needs react-window virtualization | 1.5 hrs |
| #15 | LOW | Various | No code splitting for heavy service modules | 45 min |

**Recommendation:** #1 (useReducer) is high-effort but would clean up App.tsx significantly. #7 (useCallback) pairs well with it. #14 (virtualization) would help scroll performance on the 100-metric list.

### 4. MOBILE UI/UX (28 remaining)

| Category | Count | Key Items |
|----------|-------|-----------|
| HIGH items | 2 | #12 (dual score headers 768px), #16 (7-column grid 480px) |
| MEDIUM items | ~16 | Touch targets from `scale(0.75)`, missing 480px breakpoints on VisualsTab, table overflow, forced white in light mode |
| LOW items | ~10 | Minor spacing, icon sizing |

**Key HIGH items:**
- **#12** EnhancedComparison.css: Dual score mode headers not centered at 768px (1.5 hrs)
- **#16** EnhancedComparison.css: 7-column grid still partially unreadable at 480px — needs TSX changes (1 hr)

**Key MEDIUM items:**
- Touch target sizes too small from `scale(0.75)` on header-right (affects all header buttons)
- Missing 480px breakpoints on VisualsTab, AdvancedVisuals
- Table horizontal overflow in ScoreMethodology on narrow screens
- Forced white color in light mode theme on some components

### 5. ACCESSIBILITY/WCAG (7 remaining)

| Category | Count | Key Items |
|----------|-------|-----------|
| MEDIUM | 5 | #17 (skip-to-content link), #18 (focus visible outlines), #19 (color contrast on disabled buttons), #20 (heading hierarchy), #22 (landmark regions) |
| LOW | 2 | #23 (link underlines), #24 (print styles) |

### 6. SCORING (1 remaining — optional)
- **#3 LOW**: ~150 lines dead Phase 2 category scoring code behind `USE_CATEGORY_SCORING` flag (cleanup only)

---

## Grand Total Remaining

| Category | Remaining | Estimated Effort |
|----------|-----------|------------------|
| Error Handling | 2 | ~3 hours |
| Database/Supabase | 6 (3 are false positives or LOW) | ~1.5 hours |
| Performance | 7 | ~7 hours |
| Mobile UI/UX | 28 | ~8 hours |
| Accessibility | 7 | ~2 hours |
| Scoring | 1 (low) | ~1 hour |
| **Total** | **~51** | **~22.5 hours** |

---

## Recommended Priority for Next Agent

1. **Error Handling #4** — Toast notification system (highest user-facing impact remaining)
2. **Performance #1** — useReducer for App.tsx 32 useState variables
3. **Performance #7** — useCallback for App.tsx handlers
4. **Mobile UI #12** — Dual score mode header centering at 768px
5. **Mobile UI #16** — 7-column grid readability at 480px
6. **Accessibility #17-#22** — Skip link, focus outlines, heading hierarchy, landmarks
7. **Performance #14** — react-window virtualization for 100-metric list

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app (~1100 lines, 32 useState). Biggest refactor target (useReducer). |
| `src/components/EnhancedComparison.tsx` | Enhanced view (~2100 lines). Has useMemo now, still needs virtualization. |
| `src/components/EnhancedComparison.css` | ~4400 lines CSS. Needs dual-score + 7-column mobile fixes. |
| `src/components/TabNavigation.tsx` | Now has full WAI-ARIA tabs with keyboard navigation. |
| `src/main.tsx` | Entry point. Now has offline detection + unhandled rejection handler. |
| `src/index.css` | Global styles. Now has prefers-reduced-motion rule. |
| `vite.config.ts` | PWA config. glob patterns now explicitly list PNG files (excludes logo-transparent.png). |
| `api/evaluate.ts` | Main LLM evaluation endpoint — all 5 providers with retry logic. |

## Rules
- NEVER run `npm run build` or `tsc -b` unless checking for errors — Vercel auto-deploys from main
- Run `npm install` first, then `npm run build` before pushing to catch TS errors
- Do NOT push to main — owner reviews and merges
- Create your own `claude/` feature branch for fixes
- The BUGS/ directory is on branch `claude/codebase-audit-status-27FOA`

## Branch History
This branch (`claude/fix-remaining-bugs-C3HEr`) contains ALL fixes from Agents 1-5, merged together:
- Agent 1+2 security/cache fixes (merged into main, inherited)
- Agent 4 fixes (merged from `claude/fix-remaining-bugs-JG6rK`)
- Agent 5 fixes (this round, 40+ items)
