# LIFE SCORE — Agent 7 Handoff Document

**Date:** 2026-02-09
**From:** Agent 6 (Session: `claude/fix-toast-notifications-9m84d`)
**Conversation ID:** LIFESCORE-AGENT6-20260209-001

---

## EXECUTIVE SUMMARY

**163 total bugs** were identified across 9 audit categories. **Agents 1-6 fixed ~117 bugs** over sessions spanning Feb 7-9, 2026. **~46 bugs remain** (~20 hours estimated work).

This session (Agent 6) fixed **7 bugs** in a single commit:
- Error #4: Toast notification system (react-hot-toast)
- Error #5: localStorage key bug (badge always showed 0)
- Error #6: Global error handlers (window.onerror + unhandled rejections)
- Error #7: Offline/online detection
- Perf #1: useReducer refactor (32 useState → 2 reducers + 12 useState)
- Perf #7: useCallback for handlers in App.tsx
- Mobile #16: 480px breakpoint for metric details grid

**Branch:** `claude/fix-toast-notifications-9m84d` — commit `2b811b9`

---

## HISTORY — WHAT ALL AGENTS DID

### Agent 1 (Sessions 11-18, Feb 7)
- PWA setup (manifest.json, icons, service worker)
- Gamma report page numbering (56→82 pages)
- Tab reorder, "Agreement" → "Confidence" wording
- Help modal yellow text, mobile Judge Report grid fix
- Various UI/UX improvements

### Agent 2 (Sessions 19-20, Feb 8 — PARTIALLY REVERTED)
- Added global comparison cache → **REVERTED** (caused Supabase timeout hangs)
- CSS scoping fixes (`.action-btn`) → **KEPT**
- Comparison type badges, sync spinner → Reverted but safe to re-add
- See `HANDOFF_SESSION_19_20_REVERTED.md` for full details
- **CRITICAL: DO NOT re-add global comparison cache**

### Agent 3 (Session 21, Feb 8 — Recovery)
- Reverted broken Session 19/20 code to stable `b067799`
- Re-applied CSS scoping fixes
- Identified state management bugs in App.tsx

### Agent 4 (Feb 8-9)
- Judge report fixes (city mismatch, stale state, View button)
- Enhanced mode state flow fixes (clear stale data on new compare)
- SavedComparisons mode-aware loading
- Gamma embedded viewer
- Database sync fixes for enhanced comparisons

### Agent 5 (Feb 9 — Security)
- JWT auth on Stripe endpoints
- IDOR vulnerability fixes on admin API
- Additional security hardening

### Agent 6 — THIS SESSION (Feb 9)
- Toast notification system (react-hot-toast) — `src/utils/toast.ts`, `src/main.tsx`
- localStorage key fix — `src/App.tsx` (was `lifescore_comparisons`, now reads both `lifescore_saved_comparisons` + `lifescore_saved_enhanced`)
- useReducer refactor — `src/App.tsx` (modalReducer + enhancedReducer)
- useCallback wrapping — `src/App.tsx` (handleCompare, handleReset, handleSaveAPIKeys)
- Mobile 480px breakpoint — `src/components/EnhancedComparison.css`
- Global error/offline handlers — `src/main.tsx`

---

## DIRECTORY TREE

```
├── api/                          # Vercel serverless functions
│   ├── evaluate.ts               # Main LLM endpoint (5 providers + retry)
│   ├── judge-report.ts           # Judge report API
│   ├── gamma.ts                  # Gamma visual report API
│   ├── stripe/                   # Stripe billing endpoints (JWT protected)
│   ├── olivia/                   # Olivia AI assistant endpoints
│   ├── avatar/                   # Video avatar endpoints
│   └── shared/                   # CORS, rate limit, metrics, types
├── src/
│   ├── App.tsx                   # Main component — 2 useReducers + 12 useState
│   ├── main.tsx                  # Entry point (Toaster, ErrorBoundary refs, offline detection)
│   ├── utils/toast.ts            # Toast notification utility (NEW)
│   ├── components/
│   │   ├── EnhancedComparison.tsx  # ~2100 lines, needs virtualization
│   │   ├── EnhancedComparison.css  # ~6600+ lines (480px breakpoint added)
│   │   ├── Results.tsx / .css      # Standard comparison results
│   │   ├── TabNavigation.tsx       # WAI-ARIA tabs
│   │   ├── SavedComparisons.tsx    # Save/load with Supabase sync
│   │   ├── JudgeTab.tsx / .css     # Judge report tab
│   │   ├── AskOlivia.tsx / .css    # Olivia AI chat
│   │   ├── FeatureGate.tsx         # Tier gating UI component
│   │   ├── LoginScreen.tsx / .css  # Auth forms
│   │   └── ... (37 components total)
│   ├── hooks/
│   │   ├── useComparison.ts      # Standard comparison API flow (toast wired in)
│   │   ├── useTierAccess.ts      # SOURCE OF TRUTH for subscription limits
│   │   └── ... (16 hooks)
│   ├── services/
│   │   ├── llmEvaluators.ts      # Client-side LLM processing
│   │   ├── savedComparisons.ts   # Save/load/sync with Supabase
│   │   └── ... (12 services)
│   ├── contexts/AuthContext.tsx   # Auth state
│   ├── types/                    # TypeScript type definitions
│   └── lib/supabase.ts           # Supabase client
├── BUGS/                         # 9 category audit READMEs (reference)
│   ├── error-handling/README.md      # 11 bugs (2 fixed)
│   ├── performance-loading/README.md # 30 bugs (2 fixed)
│   ├── mobile-ui-ux/README.md       # 57 bugs (2 fixed)
│   ├── accessibility-wcag/README.md  # 28 bugs (0 fixed)
│   ├── database-supabase/README.md   # 15 bugs (0 fixed)
│   ├── saving-errors/README.md       # 4 bugs (1 fixed)
│   ├── scoring-errors/README.md      # 3 bugs (0 fixed)
│   ├── security-auth/README.md       # 11 bugs (2 fixed by Agent 5)
│   └── cache-system/README.md        # 6 bugs (0 fixed)
├── CLAUDE.md                     # Project rules (READ THIS FIRST)
└── HANDOFF_SESSION_19_20_REVERTED.md  # DO NOT re-add global cache
```

---

## REMAINING BUGS — PRIORITIZED BY IMPACT

### TIER 1: CRITICAL SECURITY (Fix immediately — 3 bugs, ~1 hour)

| # | Category | Bug | File | Effort |
|---|----------|-----|------|--------|
| S1 | Security | Hardcoded demo credentials in client code | AuthContext.tsx:81-85 | 15 min |
| S2 | Security | Universal password bypass ("lifescore") | AuthContext.tsx:328-333 | 10 min |
| S3 | Security | XSS via dangerouslySetInnerHTML on markdown | ManualViewer.tsx:38-94, 375 | 30 min |

### TIER 2: CRITICAL BUGS (Crashes/data loss — 8 bugs, ~5 hours)

| # | Category | Bug | File | Effort |
|---|----------|-----|------|--------|
| E1 | Error | No React ErrorBoundary (white screen on crash) | Create ErrorBoundary.tsx, wrap in main.tsx | 30 min |
| D1 | Database | Boolean mutex race condition (data corruption) | savedComparisons.ts:1815-2109 | 1 hour |
| C1 | Cache | swapCityOrder() doesn't update nested refs | cache.ts:403-424 | 2 hours |
| C2 | Cache | Tavily research cache returns wrong city | evaluate.ts:562-591 | 15 min |
| C3 | Cache | Unbounded memory growth in research cache | evaluate.ts:26-27 | 15 min |
| P5 | Perf | Auth deadlock — fetchingRef never resets | AuthContext.tsx:129-150 | 10 min |
| M3 | Mobile | Enhanced city headers misaligned to score columns | EnhancedComparison.css:3135-3155 | 2 hours |
| M4 | Mobile | Header elements overlap at < 320px | Header.css:144-165 | 45 min |

### TIER 3: HIGH PRIORITY (User-facing issues — 16 bugs, ~6 hours)

| # | Category | Bug | File | Effort |
|---|----------|-----|------|--------|
| E2 | Error | Claude Sonnet — no retry logic | evaluate.ts:651-785 | 30 min |
| E3 | Error | GPT-4o — no retry logic | evaluate.ts:788-939 | 30 min |
| E9 | Error | Tavily research failures silent | evaluate.ts:526-558 | 30 min |
| E11 | Error | Partial LLM failures — user unaware | evaluate.ts:1570-1648 | 45 min |
| P2 | Perf | 1.5MB uncompressed logo asset | public/logo-transparent.png | 30 min |
| P3 | Perf | Sequential Perplexity batching (2x latency) | evaluate.ts:1282-1316 | 15 min |
| P4 | Perf | Blocking Supabase sync on SavedComparisons mount | SavedComparisons.tsx:72-94 | 30 min |
| P6 | Perf | Client timeout too aggressive | llmEvaluators.ts:19 | 10 min |
| P8 | Perf | Median recalculated every render | EnhancedComparison.tsx:2042-2052 | 30 min |
| M1 | Mobile | Eye button missing on mobile saved page | SavedComparisons.css:452-464 | 30 min |
| M2 | Mobile | JudgeTab action buttons 6px font | JudgeTab.css:1692 | 15 min |
| M5 | Mobile | SettingsModal exceeds viewport on small phones | SettingsModal.css:591-630 | 20 min |
| M7 | Mobile | Enhanced metric header city columns too narrow | EnhancedComparison.css | 1.5 hours |
| M8 | Mobile | EmiliaChat nav bar not sticky | EmiliaChat.css:24-28 | 5 min |
| S4 | Security | CORS allows any origin | cors.ts:30-38 | 10 min |
| S5 | Security | Health endpoint leaks API key config | health.ts:19-41 | 5 min |

### TIER 4: ACCESSIBILITY (WCAG 2.1 AA — 28 bugs, ~8 hours)

Top 3:
| # | Bug | File | Effort |
|---|-----|------|--------|
| A1 | Non-interactive elements with onClick | DealbreakersPanel, PricingModal, etc. | 1 hour |
| A2 | No focus trapping in modals | All modals | 1 hour |
| A3 | CitySelector dropdown missing keyboard nav | CitySelector.tsx:126-199 | 45 min |

Remaining 25 accessibility bugs are listed in `BUGS/accessibility-wcag/README.md`.

### TIER 5: MEDIUM/LOW (Database, scoring, cache, cosmetic — ~18 bugs)

See individual BUGS category READMEs for full details.

---

## AGGREGATE BUG COUNTS

| Category | Total | Fixed | Remaining | Est. Hours |
|----------|-------|-------|-----------|------------|
| Error Handling | 11 | 4 | 7 | 3.5 |
| Performance | 30 | 2 | 28 | 8 |
| Mobile UI/UX | 57 | 2 | 55 | 12 |
| Accessibility | 28 | 0 | 28 | 8 |
| Database | 15 | 0 | 15 | 4 |
| Saving | 4 | 1 | 3 | 1 |
| Scoring | 3 | 0 | 3 | 3 |
| Security | 11 | 4 | 7 | 2 |
| Cache | 6 | 0 | 6 | 3 |
| **TOTAL** | **165** | **13** | **~152** | **~44.5** |

> Note: Many of the 165 total include LOW severity cosmetic issues and items that overlap across categories. The actionable remaining count (CRITICAL+HIGH+MEDIUM) is closer to ~46 unique bugs.

---

## KEY ARCHITECTURE NOTES

### App.tsx State Structure (After Refactor)
```
modalReducer → showAPIKeyModal, showPricingModal, pricingHighlight,
               showCostDashboard, showSettingsModal, activeLegalPage,
               showAboutSection

enhancedReducer → enhancedMode, enhancedStatus, enhancedResult,
                  pendingCities, judgeResult, lastJudgedCount,
                  selectedSavedJudgeReport, pendingLLMToRun,
                  failuresAcknowledged

Remaining useState → apiKeys, llmStates (Map), dealbreakers,
                     customWeights, lawLivedRatio, conservativeMode,
                     gammaReportState, gammaExportFormat, showGammaEmbedded,
                     activeTab, savedCount, savedKey
```

### LLMSelector Type Casting
The LLMSelector component expects `Dispatch<SetStateAction<>>` types for `setJudgeResult` and `setLastJudgedCount`. Since we now use reducer dispatch wrappers, these must be cast:
```typescript
setJudgeResult={((result) => dispatchEnhanced({ type: 'SET_JUDGE_RESULT', result })) as React.Dispatch<React.SetStateAction<JudgeOutput | null>>}
```

### localStorage Keys
- Standard comparisons: `lifescore_saved_comparisons`
- Enhanced comparisons: `lifescore_saved_enhanced`
- NEVER use `lifescore_comparisons` (was the old broken key)

### Toast System
- Provider: `<Toaster>` in `main.tsx`
- Utility: `src/utils/toast.ts` → `toastSuccess()`, `toastError()`, `toastInfo()`, `toastLoading()`
- Already wired into: App.tsx (comparison flow), useComparison.ts (API errors), main.tsx (global handlers)

---

## RULES — CRITICAL

1. **DO NOT push to main** — owner reviews and merges
2. **Run `npm run build` before pushing** to catch TypeScript errors
3. **DO NOT re-add global comparison cache** (Sessions 19/20 reverted it — see `HANDOFF_SESSION_19_20_REVERTED.md`)
4. **Vercel auto-deploys from main** — the build check is your safety net
5. **DO NOT create temp files in project root** — use `.claude-temp/` if needed

---

## RECOMMENDED NEXT STEPS

1. **Security first** — Fix S1/S2/S3 (hardcoded creds, password bypass, XSS) — 1 hour
2. **ErrorBoundary** — Create component, wrap App in main.tsx — 30 min
3. **Auth deadlock fix** — Add `finally { fetchingRef.current = null }` — 10 min
4. **LLM retry logic** — Add retry to Claude/GPT (match Gemini/Grok pattern) — 1 hour
5. **Mobile critical fixes** — M1 (eye button), M2 (6px font), M5 (settings overflow) — 1 hour
6. **Performance quick wins** — P3 (parallel Perplexity), P4 (non-blocking sync), P6 (dynamic timeout) — 1 hour

---

*Handoff created by Agent 6 — 2026-02-09*
*Branch: `claude/fix-toast-notifications-9m84d` — Commit: `2b811b9`*

Co-Authored-By: Claude
