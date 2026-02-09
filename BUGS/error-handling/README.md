# ERROR HANDLING & RESILIENCE — Bug Report & Fix Plan
**Date:** 2026-02-09 | **Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Line-by-line reading of all api/*.ts, App.tsx, services, components

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 1 | No React ErrorBoundary — app crashes to white screen |
| HIGH | 5 | No retry on Claude/GPT, no user error messages, wrong localStorage key |
| MEDIUM | 5 | No offline detection, auth deadlock, no error tracking, Tavily silent fail |
| **TOTAL** | **11** | |

**What's Working Well:**
- Supabase retry with exponential backoff (supabase.ts)
- Gemini has 3 retries with backoff
- Grok has 3 retries with backoff
- Gamma API returns user-friendly error messages
- Judge video has ElevenLabs → OpenAI fallback
- Judge report degrades to statistical consensus if Opus fails

---

## CRITICAL ISSUE

### 1. No React ErrorBoundary — Any Render Crash = White Screen
**Files checked:** All components — zero ErrorBoundary found
**Impact:** If ANY component throws during render, the entire app becomes a blank white page with no recovery

No `componentDidCatch`, no `ErrorBoundary` wrapper, no fallback UI anywhere.

**Fix:** Create ErrorBoundary component:
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ hasError: true, error });
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. <button onClick={() => window.location.reload()}>Refresh</button></div>;
    }
    return this.props.children;
  }
}
```

Wrap `<App />` in main.tsx:
```typescript
<ErrorBoundary><App /></ErrorBoundary>
```
**Effort:** 30 min

---

## HIGH ISSUES

### 2. Claude Sonnet — No Retry Logic
**File:** `api/evaluate.ts:651-785`
**Impact:** Claude timeout or rate limit → entire LLM fails immediately. Single attempt only.

Gemini and Grok both have 3 retries with exponential backoff. Claude and GPT-4o have zero retries.

**Fix:** Match Gemini/Grok pattern: 3 retries, 1s/2s/4s backoff.
**Effort:** 30 min

### 3. GPT-4o — No Retry Logic
**File:** `api/evaluate.ts:788-939`
**Same issue as #2.** Returns error immediately on non-200 response.
**Effort:** 30 min

### 4. No User-Facing Error Messages
**File:** `src/App.tsx` and all components
**Impact:** Errors logged to console only. User sees nothing — either blank screen or stale data.

Examples of silent failures:
- localStorage parse error → `setSavedCount(0)` silently
- Database sync failure → console.error only
- LLM failure → partial results with no explanation

**Fix:** Add toast notification system:
```typescript
// Use react-hot-toast or similar
toast.error('LLM evaluation failed — retrying...');
toast.success('Comparison saved successfully');
```
**Effort:** 2 hours (system + wiring)

### 5. Wrong localStorage Key — Badge Always Shows 0
**File:** `src/App.tsx:162`
**Impact:** Tab badge shows 0 saved comparisons even when user has many saved.

Reads `lifescore_comparisons` (nonexistent) instead of `lifescore_saved_comparisons`.

**Fix:** Change to correct key. Also read enhanced key and sum both.
**Effort:** 10 min

### 6. No Global Window Error Handler
**Files:** No `window.onerror` or `window.onunhandledrejection` found
**Impact:** Unhandled promise rejections crash silently.

**Fix:** Add to main.tsx:
```typescript
window.onunhandledrejection = (event) => {
  console.error('[Unhandled]', event.reason);
  // Show generic error toast
};
```
**Effort:** 15 min

---

## MEDIUM ISSUES

### 7. No Offline Detection
**Impact:** User goes offline mid-comparison → app tries to fetch → timeout after 240s → no explanation shown

**Fix:** Add `navigator.onLine` + event listeners:
```typescript
window.addEventListener('offline', () => toast.error('No internet connection'));
window.addEventListener('online', () => toast.success('Back online'));
```
**Effort:** 15 min

### 8. Auth Deadlock — fetchingRef Never Resets on Hang
**File:** `src/contexts/AuthContext.tsx:129-187`
**Impact:** Profile fetch hangs → fetchingRef stays set → all future auth blocked

**Fix:** `try { ... } finally { fetchingRef.current = null; }`
**Effort:** 5 min

### 9. Tavily Research Failures Silent
**File:** `api/evaluate.ts:526-558`
**Impact:** Returns `null` silently. LLMs evaluate with reduced research baseline. No retry.
**Fix:** Add 2 retries on 5xx errors. Pass "research unavailable" flag to LLM prompts.
**Effort:** 30 min

### 10. No External Error Tracking
**Finding:** 259 console.error calls found, zero external logging (no Sentry, LogRocket, etc.)
**Impact:** Production errors invisible to developers.
**Fix:** Install @sentry/react. Initialize in main.tsx. All console.error auto-captured.
**Effort:** 1 hour

### 11. Partial LLM Failures — User Unaware
**File:** `api/evaluate.ts:1570-1648`
**Impact:** If 1 of 5 LLMs fails, comparison shows 4 scores with no indication that one is missing. Confidence looks lower but user doesn't know why.
**Fix:** Include `failedLlms: string[]` in response. Show in UI: "Claude failed — results based on 4/5 LLMs."
**Effort:** 45 min

---

## WHAT'S WORKING WELL (Keep These Patterns)

| Component | Pattern | Quality |
|-----------|---------|---------|
| supabase.ts:70-136 | withRetry() — exponential backoff, 3 retries | Excellent |
| evaluate.ts (Gemini) | 3 retries, 1s/2s/4s backoff | Excellent |
| evaluate.ts (Grok) | 3 retries, exponential backoff | Excellent |
| gamma.ts:141-204 | User-friendly error messages (401/403/429) | Excellent |
| judge-video.ts:88-142 | ElevenLabs → OpenAI audio fallback | Excellent |
| judge.ts:515-567 | Statistical consensus fallback if Opus fails | Excellent |
| savedComparisons.ts:139-167 | localStorage QuotaExceededError cleanup | Good |

---

## FIX PRIORITY

| Phase | Effort | Items |
|-------|--------|-------|
| Phase 1: Crash prevention | 1 hour | #1 ErrorBoundary, #5 localStorage key, #6 global handler |
| Phase 2: Retry + UX | 2.5 hours | #2-3 Claude/GPT retry, #4 toast system, #11 partial failure UI |
| Phase 3: Resilience | 2 hours | #7 offline, #8 auth fix, #9 Tavily retry, #10 Sentry |
| **Total** | **~5.5 hours** | |

---

Co-Authored-By: Claude
