# LifeScore Performance Fix Guide

**Version:** 1.0
**Last Updated:** January 28, 2026
**Document ID:** LS-PERF-001
**Priority:** CRITICAL

---

## Executive Summary

This document details all identified performance issues in LifeScore and provides specific code changes to fix them. The current application takes 3-6 minutes for enhanced comparisons. With these fixes, we can reduce this to 30-60 seconds.

**Total Issues Identified:** 15
**Critical Issues:** 5
**Quick Wins:** 6
**Expected Improvement:** 80-90% faster load times

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Priority Issues](#2-high-priority-issues)
3. [Medium Priority Issues](#3-medium-priority-issues)
4. [Quick Wins](#4-quick-wins)
5. [Implementation Order](#5-implementation-order)
6. [Code Changes](#6-code-changes)
7. [Testing & Validation](#7-testing--validation)

---

## 1. Critical Issues

### Issue 1.1: Sequential Category Evaluation

**Severity:** CRITICAL
**Impact:** 6x slower than necessary
**Location:** `src/hooks/useComparison.ts:291-448`

**Current Behavior:**
```typescript
// Categories evaluated ONE AT A TIME
for (let i = 0; i < CATEGORIES.length; i++) {
  const category = CATEGORIES[i];
  const response = await fetch('/api/evaluate', {...});  // WAITS
  // Next category only starts after this completes
}
```

**Problem:** 6 categories × 30 seconds each = 180 seconds minimum

**Fix:** Parallelize all category evaluations

```typescript
// NEW: Evaluate ALL categories in parallel
const categoryPromises = CATEGORIES.map(category =>
  fetch('/api/evaluate', {
    method: 'POST',
    body: JSON.stringify({ city1, city2, category, provider })
  }).then(r => r.json())
);

const results = await Promise.allSettled(categoryPromises);
```

**Expected Improvement:** 180s → 30s (6x faster)

---

### Issue 1.2: Duplicated Tavily Calls Per LLM Provider

**Severity:** CRITICAL
**Impact:** 5x API cost waste
**Location:** `api/evaluate.ts:598-627, 735-763, etc.`

**Current Behavior:**
- Claude makes 12 Tavily searches
- GPT-4o makes 12 Tavily searches
- Gemini makes 12 Tavily searches
- Grok makes 12 Tavily searches
- Perplexity makes 12 Tavily searches
- **Total: 60 Tavily calls for same data**

**Fix:** Cache Tavily results, share across providers

```typescript
// NEW: Fetch Tavily data ONCE before LLM calls
const tavilyData = await fetchTavilyResearch(city1, city2);

// Pass cached data to each provider
const [claudeResult, gptResult, geminiResult] = await Promise.all([
  evaluateWithClaude(city1, city2, metrics, tavilyData),
  evaluateWithGPT4o(city1, city2, metrics, tavilyData),
  evaluateWithGemini(city1, city2, metrics, tavilyData)
]);
```

**Expected Improvement:** 60 API calls → 12 calls (80% reduction)

---

### Issue 1.3: No Parallel LLM Evaluation

**Severity:** CRITICAL
**Impact:** 5x slower than necessary
**Location:** Frontend orchestration / `api/evaluate.ts`

**Current Behavior:**
```
Claude → wait → GPT-4o → wait → Gemini → wait → Grok → wait → Perplexity
```

**Fix:** Call all LLM providers simultaneously

```typescript
// NEW: Parallel LLM evaluation
const providerPromises = [
  evaluateWithClaude(city1, city2, metrics, tavilyData),
  evaluateWithGPT4o(city1, city2, metrics, tavilyData),
  evaluateWithGemini(city1, city2, metrics, tavilyData),
  evaluateWithGrok(city1, city2, metrics, tavilyData),
  evaluateWithPerplexity(city1, city2, metrics, tavilyData)
];

const results = await Promise.allSettled(providerPromises);
// Use successful results, log failures
```

**Expected Improvement:** 150s → 30s (5x faster)

---

### Issue 1.4: Excessive LLM Timeout (240 seconds)

**Severity:** CRITICAL
**Impact:** Slow failure detection
**Location:** `api/evaluate.ts:15`

**Current Code:**
```typescript
const LLM_TIMEOUT_MS = 240000; // 240 seconds - TOO LONG
```

**Fix:** Reduce timeout, add provider-specific limits

```typescript
// NEW: Provider-specific timeouts
const PROVIDER_TIMEOUTS = {
  claude: 60000,      // 60s - fastest
  gpt4o: 90000,       // 90s
  gemini: 120000,     // 120s - has reasoning
  grok: 180000,       // 180s - includes search
  perplexity: 120000, // 120s
  tavily: 30000       // 30s - should be quick
};
```

**Expected Improvement:** Failures detected in 60-120s instead of 240s

---

### Issue 1.5: No Evaluation Result Caching

**Severity:** CRITICAL
**Impact:** Repeated work, high costs
**Location:** No caching exists

**Current Behavior:**
- Miami vs Austin = full API calls
- Miami vs Austin again = full API calls again

**Fix:** See `CACHING_IMPLEMENTATION_GUIDE.md` for complete solution

**Expected Improvement:** Cached results in < 5 seconds

---

## 2. High Priority Issues

### Issue 2.1: Large Component Bundle

**Severity:** HIGH
**Impact:** Slow initial page load
**Location:** `src/components/EnhancedComparison.tsx` (2,265 lines)

**Problem:**
- Single massive component
- All code loaded upfront
- 100+ metric icons hardcoded

**Fix:** Split into smaller components

```
EnhancedComparison.tsx (2,265 lines)
  ↓ SPLIT INTO ↓
EnhancedComparison.tsx (400 lines) - orchestration
├── LLMSelector.tsx (200 lines)
├── ResultsGrid.tsx (600 lines)
├── EvidencePanel.tsx (400 lines)
├── CategoryBreakdown.tsx (400 lines)
└── metricIcons.ts (265 lines) - extracted
```

**Expected Improvement:** 40% smaller initial bundle

---

### Issue 2.2: No Lazy Loading of Tabs

**Severity:** HIGH
**Impact:** Slow initial page load
**Location:** `src/App.tsx:22-48`

**Current Code:**
```typescript
import VisualsTab from './components/VisualsTab';
import JudgeTab from './components/JudgeTab';
import AskOlivia from './components/AskOlivia';
// All loaded immediately
```

**Fix:** Lazy load tab components

```typescript
const VisualsTab = React.lazy(() => import('./components/VisualsTab'));
const JudgeTab = React.lazy(() => import('./components/JudgeTab'));
const AskOlivia = React.lazy(() => import('./components/AskOlivia'));

// In render:
<Suspense fallback={<TabSkeleton />}>
  {activeTab === 'visuals' && <VisualsTab />}
</Suspense>
```

**Expected Improvement:** 50% faster initial load

---

### Issue 2.3: Sequential Perplexity Batching

**Severity:** HIGH
**Impact:** Extra 120s for large categories
**Location:** `api/evaluate.ts:1177-1179`

**Current Code:**
```typescript
// Run batches SEQUENTIALLY
const result1 = await evaluateWithPerplexity(city1, city2, batch1);
const result2 = await evaluateWithPerplexity(city1, city2, batch2);
```

**Fix:** Parallelize batches

```typescript
// NEW: Run batches in parallel
const [result1, result2] = await Promise.all([
  evaluateWithPerplexity(city1, city2, batch1),
  evaluateWithPerplexity(city1, city2, batch2)
]);
```

**Expected Improvement:** 120s saved for business_work category

---

## 3. Medium Priority Issues

### Issue 3.1: Unnecessary Opus Calls

**Severity:** MEDIUM
**Impact:** Wasted cost when providers agree
**Location:** `api/judge.ts:514-570`

**Current Behavior:**
- Always calls Opus for consensus
- Even when all providers strongly agree
- Costs ~$3 per call

**Fix:** Skip Opus when agreement is high

```typescript
// Calculate agreement before calling Opus
const stdDev = calculateStdDev(providerScores);

if (stdDev < 10) {
  // High agreement - skip Opus, use average
  console.log('High agreement detected, skipping Opus');
  return { consensusScore: average(providerScores), skipReason: 'agreement' };
}

// Only call Opus for low agreement
const opusResult = await callOpus(providerScores);
```

**Expected Improvement:** 30-40% cost reduction, 30s faster

---

### Issue 3.2: Blocking Video Generation

**Severity:** MEDIUM
**Impact:** 20-30s delay before video starts
**Location:** `api/judge-video.ts:60-100`

**Current Flow:**
```
TTS Generation (20s) → Upload (5s) → Start Video
```

**Fix:** Start video job earlier, provide audio URL

```typescript
// NEW: Parallel audio and video job start
const [ttsResult, videoJobId] = await Promise.all([
  generateTTS(script),
  startVideoJob(script)  // Start without audio
]);

// Update video job with audio URL
await updateVideoWithAudio(videoJobId, ttsResult.url);
```

**Expected Improvement:** 20-30s faster video start

---

### Issue 3.3: JWT Regeneration on Every Status Check

**Severity:** MEDIUM
**Impact:** Unnecessary computation
**Location:** `api/video/grok-status.ts:34-62`

**Current Behavior:**
- Generates new Kling JWT on every status poll
- JWT valid for 30 minutes, regenerated every 5 seconds

**Fix:** Cache JWT with TTL

```typescript
let cachedJWT: { token: string; expires: number } | null = null;

function getKlingJWT(): string {
  if (cachedJWT && Date.now() < cachedJWT.expires) {
    return cachedJWT.token;
  }

  const token = generateKlingJWT(accessKey, secretKey);
  cachedJWT = { token, expires: Date.now() + 25 * 60 * 1000 }; // 25 min
  return token;
}
```

**Expected Improvement:** Reduced CPU, faster status checks

---

### Issue 3.4: Rate Limiting Too Aggressive

**Severity:** MEDIUM
**Impact:** Limits concurrent users
**Location:** `api/shared/rateLimit.ts:31-35`

**Current Code:**
```typescript
heavy: {
  windowMs: 60000,
  maxRequests: 10,  // Only 10 requests per minute!
}
```

**Fix:** Increase limits

```typescript
heavy: {
  windowMs: 60000,
  maxRequests: 50,  // Support more concurrent users
}
```

**Expected Improvement:** Support 50+ concurrent evaluations

---

## 4. Quick Wins

### Quick Win 1: Reduce Payload Size

**Location:** `src/hooks/useComparison.ts:311-318`
**Time:** 30 minutes

**Current:** Sending full metric objects (30KB per request)
**Fix:** Send only metric IDs, reconstruct on server

```typescript
// BEFORE: Send full objects
const categoryMetrics = ALL_METRICS.filter(m => m.categoryId === category.id);

// AFTER: Send only IDs
const metricIds = ALL_METRICS
  .filter(m => m.categoryId === category.id)
  .map(m => m.id);
```

**Impact:** 80% smaller request payload

---

### Quick Win 2: Add Keep-Alive Headers

**Location:** All fetch calls
**Time:** 15 minutes

```typescript
// Add to all API calls
const response = await fetch(url, {
  ...options,
  headers: {
    ...options.headers,
    'Connection': 'keep-alive'
  }
});
```

**Impact:** Connection reuse, faster subsequent requests

---

### Quick Win 3: Skip Opus for High Agreement

**Location:** `api/judge.ts`
**Time:** 30 minutes

**Impact:** 30s faster when providers agree

---

### Quick Win 4: Increase Rate Limits

**Location:** `api/shared/rateLimit.ts`
**Time:** 5 minutes

**Impact:** More concurrent users supported

---

### Quick Win 5: Provider-Specific Timeouts

**Location:** `api/evaluate.ts`
**Time:** 20 minutes

**Impact:** Faster failure detection

---

### Quick Win 6: Gamma Timeout Increase

**Location:** `api/gamma.ts:19`
**Time:** 5 minutes

**Current:** 60s timeout
**Fix:** 90s timeout

**Impact:** Fewer timeout errors for reports

---

## 5. Implementation Order

### Day 1: Quick Wins (2-3 hours)

1. ✅ Reduce LLM timeout from 240s to 120s
2. ✅ Increase rate limit from 10 to 50
3. ✅ Add provider-specific timeouts
4. ✅ Increase Gamma timeout to 90s
5. ✅ Add keep-alive headers

### Day 2: Parallel Execution (4-6 hours)

1. ✅ Parallelize category evaluation
2. ✅ Parallelize LLM provider calls
3. ✅ Parallelize Perplexity batches
4. ✅ Update progress UI for parallel

### Day 3: Tavily Optimization (3-4 hours)

1. ✅ Create shared Tavily fetch
2. ✅ Pass cached data to all providers
3. ✅ Remove duplicate Tavily calls
4. ✅ Test API cost reduction

### Day 4: Frontend Optimization (4-6 hours)

1. ✅ Split EnhancedComparison component
2. ✅ Extract metric icons
3. ✅ Add lazy loading for tabs
4. ✅ Add Suspense boundaries

### Day 5: Caching (6-8 hours)

1. ✅ Create city_evaluations table
2. ✅ Implement cache check
3. ✅ Implement cache write
4. ✅ Add cache status to UI

### Day 6: Testing & Polish (4-6 hours)

1. ✅ End-to-end testing
2. ✅ Performance benchmarks
3. ✅ Monitor in production
4. ✅ Fix any regressions

---

## 6. Code Changes

### File: `api/evaluate.ts`

**Change 1: Shared Tavily Fetch**
```typescript
// Line 580 - Add before provider evaluations
async function fetchSharedTavilyData(city1: string, city2: string) {
  const [research, ...searches] = await Promise.all([
    tavilyResearch(city1, city2),
    ...CATEGORY_QUERIES.map(q => tavilySearch(q))
  ]);
  return { research, searches };
}
```

**Change 2: Provider-Specific Timeouts**
```typescript
// Line 15 - Replace single timeout
const PROVIDER_TIMEOUTS = {
  claude: 60000,
  gpt4o: 90000,
  gemini: 120000,
  grok: 180000,
  perplexity: 120000
};
```

---

### File: `src/hooks/useComparison.ts`

**Change: Parallel Category Evaluation**
```typescript
// Line 291 - Replace sequential loop
const evaluateAllCategories = async () => {
  const promises = CATEGORIES.map(category =>
    evaluateCategory(city1, city2, category, provider)
  );

  const results = await Promise.allSettled(promises);

  return results.map((r, i) => ({
    category: CATEGORIES[i],
    success: r.status === 'fulfilled',
    data: r.status === 'fulfilled' ? r.value : null,
    error: r.status === 'rejected' ? r.reason : null
  }));
};
```

---

### File: `src/App.tsx`

**Change: Lazy Loading**
```typescript
// Lines 22-48 - Add lazy imports
import React, { Suspense, lazy } from 'react';

const VisualsTab = lazy(() => import('./components/VisualsTab'));
const JudgeTab = lazy(() => import('./components/JudgeTab'));
const AskOlivia = lazy(() => import('./components/AskOlivia'));
const GammaReports = lazy(() => import('./components/GammaReports'));

// In render - wrap with Suspense
<Suspense fallback={<div className="tab-loading">Loading...</div>}>
  {activeTab === 'visuals' && <VisualsTab {...props} />}
</Suspense>
```

---

### File: `api/shared/rateLimit.ts`

**Change: Increase Limits**
```typescript
// Line 31-35
heavy: {
  windowMs: 60000,
  maxRequests: 50,  // Was 10
}
```

---

## 7. Testing & Validation

### Performance Benchmarks

**Before Fixes:**
| Metric | Time |
|--------|------|
| Standard comparison | 2-3 min |
| Enhanced comparison | 5-8 min |
| Cached comparison | N/A |
| Initial page load | 3-4 sec |
| Tab switch | 1-2 sec |

**Target After Fixes:**
| Metric | Time |
|--------|------|
| Standard comparison | 30-60 sec |
| Enhanced comparison | 60-90 sec |
| Cached comparison | < 5 sec |
| Initial page load | 1-2 sec |
| Tab switch | < 500ms |

### Testing Checklist

- [ ] Standard comparison completes in < 60s
- [ ] Enhanced comparison completes in < 90s
- [ ] Second comparison (same cities) uses cache
- [ ] All tabs lazy load correctly
- [ ] No regression in accuracy
- [ ] Error handling works for parallel failures
- [ ] Rate limiting doesn't block normal usage

### Monitoring

After deployment, monitor:
- API response times (Vercel analytics)
- Error rates by endpoint
- Cache hit rates
- User-reported issues

---

## Summary Table

| Issue | Severity | Fix Time | Impact |
|-------|----------|----------|--------|
| Sequential categories | CRITICAL | 2 hours | 6x faster |
| Duplicate Tavily calls | CRITICAL | 3 hours | 80% cost reduction |
| No parallel LLM | CRITICAL | 4 hours | 5x faster |
| 240s timeout | CRITICAL | 1 hour | Faster failures |
| No caching | CRITICAL | 6 hours | Instant repeats |
| Large component | HIGH | 4 hours | 40% bundle reduction |
| No lazy loading | HIGH | 2 hours | 50% faster initial |
| Sequential batches | HIGH | 1 hour | 120s saved |
| Unnecessary Opus | MEDIUM | 30 min | 30% cost reduction |
| Blocking video | MEDIUM | 2 hours | 20-30s faster |
| JWT regen | MEDIUM | 30 min | Faster status |
| Aggressive rate limit | MEDIUM | 5 min | More users |

**Total Implementation Time:** ~25-30 hours (5-6 days)
**Expected Overall Improvement:** 80-90% faster

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
