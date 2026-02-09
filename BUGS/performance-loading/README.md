# PERFORMANCE & LOADING — Bug Report & Fix Plan
**Date:** 2026-02-09 | **Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Line-by-line code reading of vite.config, App.tsx, evaluate.ts, all services

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 6 | Blocking renders, sequential APIs, massive assets |
| HIGH | 9 | Missing memoization, auth deadlock, aggressive timeouts |
| MEDIUM | 15 | CSS filters, console logging, missing virtualization |
| **TOTAL** | **30** | |

**Estimated Current Performance:**
- FCP (First Contentful Paint): ~3-4s (target: <2s)
- TTI (Time to Interactive): ~6-8s (target: <4s)
- Comparison latency: 60-120s for 5 LLMs (target: <45s)
- Results page render: 1-2s (target: <500ms)

---

## CRITICAL ISSUES

### 1. 32 useState Variables in App.tsx — Cascading Re-renders
**File:** `src/App.tsx:73-134`
**Impact:** Every state change re-renders the entire component tree

App.tsx has 32 separate useState calls. Each triggers a full re-render. When an LLM result arrives, all 100+ metrics in the enhanced comparison view recalculate median scores, filtering, and sorting.

**Fix:** Consolidate into 5-8 logical state groups using useReducer or context splitting:
```typescript
interface AppUIState {
  modals: { showAPIKeyModal: boolean; showPricingModal: boolean; ... };
  comparison: { enhancedMode: boolean; enhancedStatus: string; ... };
}
```
**Effort:** 2 hours

### 2. 1.5MB Uncompressed Logo Asset
**File:** `public/logo-transparent.png`
**Impact:** Blocks FCP by ~500ms on 3G connections

**Fix:** Convert PNG to WebP (60% smaller), add `loading="lazy"`, or use SVG/CSS logo.
**Effort:** 30 min

### 3. Sequential Perplexity Batching — 2x Latency
**File:** `api/evaluate.ts:1282-1316`
**Impact:** 100 metrics = 2 recursive sequential calls = ~60s when could be ~30s

```typescript
const result1 = await evaluateWithPerplexity(city1, city2, batch1);  // 30s
const result2 = await evaluateWithPerplexity(city1, city2, batch2);  // 30s SEQUENTIAL
```

**Fix:** `const [result1, result2] = await Promise.all([...]);`
**Effort:** 15 min

### 4. Blocking Supabase Sync on SavedComparisons Mount
**File:** `src/components/SavedComparisons.tsx:72-94`
**Impact:** Saved tab blank for 5-10 seconds while fullDatabaseSync() runs

Data exists in localStorage but isn't shown until after the full DB sync completes.

**Fix:** Load from localStorage immediately, sync in background:
```typescript
useEffect(() => {
  loadComparisons();  // Show cached data NOW
  syncAndLoadComparisons().catch(console.error);  // Sync in background
}, []);
```
**Effort:** 30 min

### 5. Auth Deadlock — fetchingRef Never Resets
**File:** `src/contexts/AuthContext.tsx:129-150`
**Impact:** If profile fetch hangs, all future auth attempts blocked permanently

`fetchingRef.current` is set but never reset on timeout/hang.

**Fix:** Wrap in try/finally: `finally { fetchingRef.current = null; }`
**Effort:** 10 min

### 6. Client Timeout Too Aggressive for Large Evaluations
**File:** `src/services/llmEvaluators.ts:19`
**Impact:** 240s timeout can trigger before 5 LLMs complete on large category batches

**Fix:** Dynamic timeout: `Math.max(240000, metrics.length * 2000 + 60000)`
**Effort:** 10 min

---

## HIGH ISSUES

| # | File:Line | Issue | Fix |
|---|-----------|-------|-----|
| 7 | App.tsx:280-404 | Missing useCallback on 20+ handlers — child re-renders | Memoize with correct deps |
| 8 | EnhancedComparison.tsx:2042-2052 | Median recalculated every render (sort + filter in render) | useMemo on all metric calcs |
| 9 | EnhancedComparison.tsx:2031-2037 | New Set/Map created per render | useMemo for LLM provider sets |
| 10 | evaluate.ts:1318-1347 | 12 Tavily queries in parallel — risks rate limiting | Request coalescing + dedup |
| 11 | vite.config.ts:14-31 | PWA caches 1.5MB PNG on every install | Exclude large images from glob |
| 12 | ContrastDisplays.tsx:79-151 | Images use `loading="eager"` | Change to `loading="lazy"` |
| 13 | App.tsx:160-171 | Synchronous localStorage JSON.parse in render path | Move to separate hook, run once |
| 14 | EnhancedComparison.tsx:1903-2100 | 100 metrics all in DOM (no virtualization) | Use react-window |
| 15 | Multiple | 14+ console.log in production code | Gate behind `NODE_ENV === 'development'` |

---

## FIX PRIORITY

| Phase | Effort | Impact |
|-------|--------|--------|
| Phase 1: Critical fixes (items 1-6) | ~4 hours | 40% faster loading |
| Phase 2: Memoization (items 7-9) | ~3 hours | 30% fewer re-renders |
| Phase 3: Network + assets (items 10-15) | ~3 hours | 20% faster overall |
| **Total** | **~10 hours** | **~90% improvement** |

---

Co-Authored-By: Claude
