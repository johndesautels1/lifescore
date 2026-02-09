# CACHE SYSTEM — Bug Report & Fix Plan
**Date:** 2026-02-09 | **Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Line-by-line reading of cache.ts, evaluate.ts, contrast-images.ts, rateLimit.ts

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3 | Swap bug serves wrong data, research context reversed, memory leak |
| HIGH | 1 | Contrast images cache key not normalized |
| MEDIUM | 2 | Rate limiter growth, localStorage race conditions |
| **TOTAL** | **6** | |

**5 Cache Systems Found:**
1. Comparison Cache (localStorage + Vercel KV) — TTL: 7-30 days
2. Tavily Research Cache (in-memory Map) — TTL: 30 min, **NO cleanup**
3. Contrast Images Cache (Supabase table) — TTL: 30 days
4. Rate Limiter (in-memory Map) — Max: 10,000 entries
5. Metric Score Lookup (in-memory Map) — No TTL

---

## CRITICAL BUGS

### 1. swapCityOrder() Doesn't Update Nested City References
**File:** `src/services/cache.ts:403-424`
**Impact:** Users see evidence/explanations attributed to WRONG cities after reversed cache hit

When user requests "Denver vs Austin" but cache has "Austin vs Denver":
- Top-level `city1`/`city2` objects swap correctly
- BUT `LLMMetricScore.city` field still references old city positions
- Evidence items still reference old city names
- LLM breakdown shows scores under reversed cities

**What the user sees:** "Denver scores 85 on cannabis legality" when it's actually Austin's score.

**Fix:** Recursively swap ALL nested city references:
```typescript
// Iterate metrics[].llmScores[].city and swap 'city1'↔'city2'
// Iterate metrics[].llmScores[].evidence[].city and swap
// Update any explanation text with hardcoded city names
```
**Effort:** 2 hours

### 2. Tavily Research Cache Returns Wrong City Context
**File:** `api/evaluate.ts:562-591`
**Impact:** LLMs receive backwards research context for reversed city pairs

Research is order-specific ("Austin's laws are X, Denver's are Y") but cached with alphabetically-sorted normalized key. Reversed lookup returns Austin-first research for a Denver-first request.

LLMs then generate scores based on reversed research → systematically wrong scores.

**Fix:** Include city order in cache key (don't alphabetically sort):
```typescript
const cacheKey = `${city1.toLowerCase()}:${city2.toLowerCase()}`;  // Order-specific
```
**Effort:** 15 min

### 3. Unbounded Memory Growth in Research Cache — No Cleanup
**File:** `api/evaluate.ts:26-27, 569, 583`
**Impact:** Vercel function memory grows until crash

```typescript
const tavilyResearchCache = new Map<string, CachedResearch>();  // NEVER cleaned
```

Expired entries checked on read but NEVER deleted. Over days/weeks:
- ~50-100KB per research response × 100 pairs/day = ~5-10MB/day
- After 30 days: 150-300MB accumulated before first entry "expires"
- Eventually exhausts Vercel function memory → all requests fail

**Fix:** Add cleanup on set():
```typescript
if (tavilyResearchCache.size > 1000) {
  for (const [k, v] of tavilyResearchCache.entries()) {
    if (Date.now() - v.timestamp > RESEARCH_CACHE_TTL_MS) {
      tavilyResearchCache.delete(k);
    }
  }
}
```
**Effort:** 15 min

---

## HIGH BUG

### 4. Contrast Images Cache Key Not Order-Normalized
**File:** `api/olivia/contrast-images.ts:61-62`
**Impact:** Reversed city pairs regenerate images instead of cache hit — wasted Replicate API credits

```typescript
// "Austin" vs "Denver" → contrast_austin_denver_cannabis_legality
// "Denver" vs "Austin" → contrast_denver_austin_cannabis_legality  ← DIFFERENT KEY!
```

**Fix:** Sort cities in key generation:
```typescript
const [a, b] = [cityA, cityB].map(c => c.toLowerCase()).sort();
```
**Effort:** 5 min

---

## MEDIUM BUGS

### 5. Rate Limiter Cleanup Only Deletes Expired Entries
**File:** `api/shared/rateLimit.ts:68-89`
**Problem:** Under continuous traffic from many unique IPs, store hits 10,000 entries but cleanup only removes expired ones. Active entries accumulate.
**Fix:** Delete oldest 20% when threshold hit, not just expired.
**Effort:** 20 min

### 6. localStorage Cache Race Conditions
**File:** `src/services/cache.ts:144-157`
**Problem:** Concurrent set() calls can trigger clearExpired() which iterates keys while another thread modifies localStorage. No synchronization.
**Fix:** Add clearing flag to prevent recursive operations.
**Effort:** 20 min

---

## CACHE INVALIDATION MATRIX

| Cache | Max Size | TTL | Auto-Cleanup | Risk |
|-------|----------|-----|--------------|------|
| Comparison (localStorage) | Browser quota | 7 days | On full | Low |
| Comparison (Vercel KV) | KV quota | 7 days | TTL-based | Low |
| Tavily Research | **Unbounded** | 30 min | **NONE** | **CRITICAL** |
| Contrast Images | DB quota | 30 days | TTL-based | Low |
| Rate Limiter | 10,000/endpoint | 1 min | Expired only | Medium |

---

## FIX PRIORITY

| Phase | Effort | Items |
|-------|--------|-------|
| CRITICAL (today) | 2.5 hours | #1 swap bug, #2 research context, #3 memory leak |
| HIGH (this week) | 25 min | #4 contrast key normalization |
| MEDIUM (next sprint) | 40 min | #5-6 rate limiter + localStorage races |

---

Co-Authored-By: Claude
