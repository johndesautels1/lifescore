# LIFE SCORE Overnight Commit Audit Report

**Session:** LIFESCORE-AUDIT-20260210-001
**Date:** 2026-02-10
**Scope:** ~150 overnight commits across security, bug fixes, CSS/UI, enhanced mode, Judge reports, saved comparisons, and feature additions
**Branch:** `claude/review-handoff-agent-docs-p5i92`

---

## Executive Summary

The audit reviewed all commits from the overnight session. The codebase received significant work across security hardening, bug fixes, CSS/UI polish, and feature additions. While many fixes are structurally sound, **several critical and high-severity issues remain** that should be addressed before the next production deploy.

### Issue Count by Severity

| Severity | Count |
|----------|-------|
| **Critical** | 4 |
| **High** | 6 |
| **Medium** | 11 |
| **Low** | 8 |

---

## CRITICAL Issues

### C1. Judge Tie Handling is Contradictory Across Three Locations

**Files:** `api/judge-report.ts:530-531`, `src/components/JudgeTab.tsx:510-517`, `src/components/JudgeTab.tsx:1664-1684`

When Opus recommends `'tie'`, three code paths produce contradictory results:

| Location | winnerCity | loserCity |
|----------|-----------|-----------|
| API (`judge-report.ts:530`) | city2 | city1 |
| CourtOrderVideo props (`JudgeTab.tsx:1664`) | city1 | city2 |
| Video script (`JudgeTab.tsx:510`) | literal `"TIE"` | N/A |

The video script also produces nonsensical output: *"The winner is TIE with a score of [city2Score]"*.

**Fix:** Add explicit tie-handling branches in all three locations. On tie, use neutral language in the video script, and don't assign winner/loser in CourtOrderVideo or freedomEducation.

---

### C2. Standard Comparison Metrics Are All Zeros in Judge Prompt

**File:** `api/judge-report.ts:214-219`

The prompt builder accesses `m.consensusScore` for metric scores. Standard `MetricScore` objects have `normalizedScore`, not `consensusScore`. The nullish coalescing falls to `0` for every metric:

```typescript
const m1Score = m.consensusScore ?? 0;  // always 0 for standard comparisons
```

This means Opus receives a prompt where every individual metric score is `0`, despite the total scores being correct (via a separate fallback at line 526). Opus will produce unreliable analysis for standard comparisons.

**Fix:** Use `m.consensusScore ?? m.normalizedScore ?? 0` at line 217.

---

### C3. `src/utils/toast.ts` Does Not Exist — 21 `alert()` + 7 `confirm()` Calls Remain

**Files:** 6 source files

The handoff states all `alert()` calls were replaced with non-blocking toasts from `src/utils/toast.ts`. This is incorrect — the utility was never created. The codebase still contains:

- **21 `alert()` calls** across `PricingPage.tsx` (4), `PricingModal.tsx` (4), `JudgeTab.tsx` (5), `CourtOrderVideo.tsx` (5), `OliviaChatBubble.tsx` (2), `useEmilia.ts` (1)
- **7 `window.confirm()` calls** in `SavedComparisons.tsx` (6) and `CostDashboard.tsx` (1)

The only non-blocking toast pattern exists as a component-local `showMessage()` in `SavedComparisons.tsx`, not extracted into a reusable utility.

**Fix:** Create `src/utils/toast.ts` with `toastSuccess`/`toastError` functions. Replace all `alert()` and `window.confirm()` calls.

---

### C4. XSS in Olivia Print Function

**File:** `src/components/OliviaChatBubble.tsx:262`

The `handlePrintConversation` function injects `msg.content` directly into an HTML template string without escaping:

```typescript
<div class="content">${msg.content}</div>
```

If the AI response or user input contains HTML tags (e.g., `<script>`, `<img onerror=...>`), it executes as live HTML/JS in the print window.

**Fix:** HTML-entity-encode `msg.content` before template interpolation, or use `textContent` assignment via DOM APIs.

---

## HIGH Issues

### H1. Regex-Based HTML Sanitizer is Bypassable

**File:** `src/components/ManualViewer.tsx`

The `sanitizeHtml()` function uses regex to strip XSS vectors. Known bypass vectors include:
- SVG tags: `<svg onload=alert(1)>` (not in the blocked tags list)
- Entity-encoded tag names: `&#115;cript`
- Attribute injection through unquoted values

**Fix:** Replace with DOMPurify or equivalent battle-tested library.

### H2. Opus Can Recommend Wrong Winner — No Server-Side Validation

**File:** `api/judge-report.ts:592`

The API prompt explicitly tells Opus it can override raw scores. The response is passed through without validating that the recommendation matches the actual score data. The `comparisonResult.winner` field from the comparison is completely ignored.

**Fix:** Add post-processing validation: if Opus recommends city1 but city2 has a higher score, either reject or flag the inconsistency.

### H3. `SavedJudgeReport` is a Lossy Type Subset

**Files:** `src/services/savedComparisons.ts:88-105`, `src/components/JudgeTab.tsx:712`

`SavedJudgeReport` omits `city1Trend`, `city2Trend`, `categoryAnalysis`, `keyFactors`, `futureOutlook`, `confidenceLevel`, and `freedomEducation`. JudgeTab casts localStorage data as full `JudgeReport[]` (line 712). If a genuine `SavedJudgeReport` (without extra fields) is read, accessing these fields produces `undefined`, breaking the UI.

**Fix:** Either expand `SavedJudgeReport` to match `JudgeReport`, or add runtime null checks for all extended fields.

### H4. `.action-btn` CSS Leaks Globally with `!important`

**File:** `src/components/SavedComparisons.css:452, 898, 938`

The `.action-btn` selector in `SavedComparisons.css` is unscoped (no parent container). The mobile media query at 480px forces `width: 44px !important; height: 44px !important` on ALL `.action-btn` elements across the app. This overrides PricingPage's full-width CTA buttons and JudgeTab's differently-sized buttons.

**Fix:** Scope to `.saved-comparisons .action-btn` or `.saved-item-actions .action-btn`. Remove `!important`.

### H5. JudgeTab Guard Blocks Saved Report Rendering

**File:** `src/components/JudgeTab.tsx:1042`

The guard `if (!comparisonResult)` prevents rendering when `comparisonResult` is null, which happens in enhanced mode or fresh app state. This blocks saved judge report display.

**Fix:** Change to `if (!comparisonResult && !judgeReport)`.

### H6. Conflicting Database Migrations for `judge_reports`

**Files:** `supabase/migrations/20260124_create_judge_reports.sql`, `supabase/migrations/20260125_create_judge_tables.sql`

Two migration files create `judge_reports` with incompatible schemas (different column names). Both use `CREATE TABLE IF NOT EXISTS`, so whichever runs first defines the schema. The code expects the 20260124 schema (`city1_name`, `city2_name`).

**Fix:** Remove or reconcile the 20260125 migration. Add a comment to the canonical migration explaining it is the authoritative schema.

---

## MEDIUM Issues

### M1. Admin Authorization Fails Open

**File:** `api/admin/sync-olivia-knowledge.ts:181-183`

If `ADMIN_EMAILS` env var is empty/missing, any enterprise-tier user becomes admin. The logic should fail-closed: no configured admin emails = no one is admin.

### M2. `judge-video.ts` Has No Auth

**File:** `api/judge-video.ts`

While `judge-report.ts` was secured with JWT auth, `judge-video.ts` still uses `handleCors(req, res, 'open')` with no authentication. This is a video generation endpoint that makes expensive third-party API calls.

### M3. Many API Endpoints Still Unauthenticated

Endpoints with no JWT auth that handle user data or make expensive API calls:
- `api/olivia/chat.ts`, `tts.ts`, `contrast-images.ts`
- `api/video/grok-generate.ts`, `grok-status.ts`
- `api/gamma.ts`
- `api/emilia/message.ts`, `speak.ts`
- `api/avatar/generate-judge-video.ts`

### M4. Download Anchor Not Appended to DOM

**File:** `src/components/OliviaChatBubble.tsx:201`

`handleSaveConversation` calls `a.click()` without appending the anchor to `document.body`. Firefox and some mobile browsers silently ignore clicks on unattached elements.

### M5. Unhandled Clipboard Exceptions

**File:** `src/components/OliviaChatBubble.tsx:225,229`

`navigator.clipboard.writeText()` in both the catch block and else branch has no try/catch. Fails on non-HTTPS or when permissions are denied.

### M6. Share Cancel Copies to Clipboard

**File:** `src/components/OliviaChatBubble.tsx:223`

When user cancels the Web Share API dialog (`AbortError`), the code falls into the catch block and copies to clipboard. Should check for `AbortError` and silently ignore.

### M7. `.score-legend` Changed to Vertical on All Screens

**File:** `src/components/EnhancedComparison.css`

Commit `dcea470` changed `.score-legend` from `flex-wrap: wrap` to `flex-direction: column` on all screen sizes, not just mobile. Legend items stack vertically even on desktop where horizontal layout is more space-efficient.

### M8. `.agreed-item` Layout Changed from Grid to Column Flex on Desktop

**File:** `src/components/EnhancedComparison.css`

Commit `a207077` changed the "High Confidence Metrics" section from a horizontal grid to vertical column stack on all devices, significantly reducing information density on desktop.

### M9. Dual Supabase Save Paths for Judge Reports

**Files:** `src/services/savedComparisons.ts:1204-1221`, `src/components/JudgeTab.tsx:815-838`

Two different code paths write to `judge_reports` in Supabase with different column sets. The savedComparisons upsert omits `city1_trend`, `city2_trend`, `key_factors`, `future_outlook`, `confidence_level`, and `category_analysis` columns that JudgeTab's insert includes.

### M10. `saveLocalEnhancedComparisons` Return Unchecked in `fullDatabaseSync`

**File:** `src/services/savedComparisons.ts:2070`

If localStorage write fails during database sync, the function reports success anyway. Data pulled from Supabase is silently lost.

### M11. Inconsistent Supabase Key Fallback Patterns

Various API endpoints use different fallback chains for Supabase keys (`SERVICE_KEY || ANON_KEY`, `SERVICE_ROLE_KEY || SERVICE_KEY || ANON_KEY`, etc.). Should be standardized.

---

## LOW Issues

### L1. Duplicated JWT Verification Boilerplate

Every authenticated API endpoint duplicates Supabase client creation and Bearer token extraction. Should be extracted to a shared `api/shared/auth.ts` helper.

### L2. Missing `.diff-vs` CSS Styles

**File:** `src/components/EnhancedComparison.css`

Commit `dcea470` deleted the `.diff-vs` rule, but TSX still renders `<span className="diff-vs">vs</span>`. Element has no explicit styling.

### L3. Header Scale Applied on Desktop

**File:** `src/components/Header.css:163`

`transform: scale(0.75)` is applied to `.header-right` at the base (desktop) level, not just mobile. Shrinks all header controls by 25% on all screen sizes.

### L4. CSS `.report-type-badge` Unscoped in SavedComparisons

**File:** `src/components/SavedComparisons.css`

The mobile media query uses bare `.report-type-badge` instead of `.saved-comparisons .report-type-badge`.

### L5. Dual onClick/onTouchEnd Handlers

**File:** `src/components/SavedComparisons.tsx`

Both `onClick` and `onTouchEnd` call `handleLoad()`. Can cause double-firing on some browsers/devices.

### L6. `fetchFullJudgeReport` Returns `any`

**File:** `src/services/savedComparisons.ts:1269`

No runtime validation on the return value. Callers access deeply nested properties without null checks.

### L7. No Opus CategoryId Validation

**File:** `api/judge-report.ts:497-523`

If Opus returns a misspelled category ID, the analysis is silently lost and replaced with "Analysis pending".

### L8. Enhanced Comparisons Lack `synced` Flag

**File:** `src/services/savedComparisons.ts`

Unlike standard comparisons, enhanced comparisons have no `synced: boolean`. `fullDatabaseSync` pushes ALL local enhanced comparisons to the database every sync, relying on upsert deduplication.

---

## Feature Gap: Olivia Transcript Actions

The Save/Download/Forward buttons exist **only** in `OliviaChatBubble.tsx` (floating chat bubble). They are **absent** from `AskOlivia.tsx` (main Olivia page). Users on the premium Ask Olivia experience cannot save or share transcripts.

---

## Feature Gap: InVideo Override

The handoff references "InVideo Moving Movie admin override + cinematic prompt builder." No InVideo integration exists in the codebase. The project uses Replicate/Wav2Lip (Judge videos), Grok API (comparison videos), and Simli (avatar interactions). This feature may have been planned but not implemented, or may refer to a different naming convention.

---

## Recommended Priority Order for Fixes

1. **C2** — Standard metrics all-zero in Judge prompt (one-line fix, high impact)
2. **C1** — Tie handling inconsistency (affects data correctness)
3. **C4** — XSS in print function (security)
4. **H2** — Opus winner validation (data correctness)
5. **H5** — JudgeTab guard blocking saved reports (UX regression)
6. **H4** — `.action-btn` CSS global leak (CSS regression)
7. **C3** — Toast utility creation (UX, multiple files)
8. **H1** — Replace regex HTML sanitizer (security)
9. **H3** — SavedJudgeReport type alignment (type safety)
10. **H6** — Migration reconciliation (database integrity)

---

*Report generated by audit session LIFESCORE-AUDIT-20260210-001*
