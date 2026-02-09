# SCORING SYSTEM — Known Errors & Fix Plan
**Date:** 2026-02-09
**Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Direct code reading of api/evaluate.ts, src/services/llmEvaluators.ts, src/services/opusJudge.ts

---

## STATUS: Architecture Sound — 3 Targeted Fixes Needed

The scoring system does NOT need a rewrite. All 5 LLMs already return 0-100 numeric scores. The `[object Object]` bug, letter grades, Perplexity schema forcing, and Gemini safety settings have ALL been fixed in the current codebase.

---

## BUG #1: Premature Legal/Enforcement Averaging (CRITICAL)

**File:** `src/services/llmEvaluators.ts` lines 164 and 184
**Severity:** HIGH — causes score convergence between different cities

### What's Wrong
```typescript
// Line 164 - CITY 1
normalizedScore: Math.round((s.city1LegalScore + s.city1EnforcementScore) / 2),

// Line 184 - CITY 2
normalizedScore: Math.round((s.city2LegalScore + s.city2EnforcementScore) / 2),
```

`normalizedScore` is the ONLY score used downstream for:
- Total city scores (`src/api/scoring.ts:121`)
- Gamma reports (`src/services/gammaService.ts:237-238`)
- Olivia chat context
- Database storage
- Saved comparisons display

### Symptom
- City A: Legal=20 (strict law), Enforcement=80 (rarely enforced) → normalizedScore=50
- City B: Legal=50, Enforcement=50 → normalizedScore=50
- **Two completely different cities get identical scores**

### Additional Bug
`src/App.tsx:545` overwrites enforcement score with the averaged value:
```typescript
enforcementScore: score.normalizedScore,  // Uses averaged value, not real enforcement
```

### Fix
**Option A (Simple — 1 hour):** Fix App.tsx:545 to pass actual enforcementScore.

**Option B (Better — 3-4 hours):** Store legal and enforcement separately all the way through. Compute combined score at display time using user preference (law vs lived weight). Changes needed:
1. `llmEvaluators.ts:164,184` — remove averaging, keep both scores
2. `App.tsx:544-545` — pass actual legalScore and enforcementScore
3. `src/api/scoring.ts:121` — use combined score with configurable weight
4. UI: add weight preference display

**Risk:** LOW — the averaging formula is in one file. Downstream consumers already have fields for separate scores.

---

## BUG #2: Perplexity Large Category Batching (MEDIUM)

**File:** `api/evaluate.ts` lines 1282-1316
**Severity:** MEDIUM — causes incomplete metric coverage for large categories

### What's Wrong
Categories with >15 metrics (business_work=25, housing_property=20) are split into sequential recursive batches:
```typescript
const BATCH_THRESHOLD = 15;
if (metrics.length > BATCH_THRESHOLD) {
  const midpoint = Math.ceil(metrics.length / 2);
  const batch1 = metrics.slice(0, midpoint);
  const batch2 = metrics.slice(midpoint);

  const result1 = await evaluateWithPerplexity(city1, city2, batch1);
  const result2 = await evaluateWithPerplexity(city1, city2, batch2);
```

### Problems
1. Each batch is a separate API call with separate context
2. If batch 2 fails, partial data returns (only 12-13 of 25 metrics)
3. Sequential execution doubles latency for large categories
4. No validation that all metrics in category actually returned

### Fix
Run batches in parallel with `Promise.allSettled()`:
```typescript
const [result1, result2] = await Promise.allSettled([
  evaluateWithPerplexity(city1, city2, batch1),
  evaluateWithPerplexity(city1, city2, batch2)
]);
```
Merge whatever succeeds. Halves latency and improves resilience.

**Risk:** LOW — only affects Perplexity provider.

---

## BUG #3: Dead Phase 2 Code (LOW PRIORITY — Cleanup)

**File:** `api/evaluate.ts` line 45 + lines 457-488, 729-731, 870-872, 980-982, 1140-1142, 1406-1408
**Severity:** LOW — dead code, not causing issues

### What's There
```typescript
const USE_CATEGORY_SCORING = process.env.USE_CATEGORY_SCORING === 'true';
```
~150 lines of category-based scoring behind this toggle. Likely disabled in production.

### Recommendation
**Do NOT enable.** The numeric 0-100 system works correctly. Phase 2 category scoring is a different scoring philosophy. If you want to explore it:
1. Test in staging with 5-10 city pairs
2. Compare scores side-by-side
3. Only enable if scores are demonstrably better

For now: leave as-is or remove the dead code for cleanliness.

---

## WHAT'S NOT BROKEN (Verified by Code Reading)

| Component | Status | Evidence |
|-----------|--------|----------|
| LLM prompts (all 5 providers) | ✅ Working | `buildBasePrompt()` asks for 0-100 numeric with dual legal/enforcement |
| Response parsing | ✅ Working | `parseResponse()` handles numeric values, returns null for missing |
| Gemini safety settings | ✅ Fixed | Lines 1004-1009: `BLOCK_ONLY_HIGH` for all categories |
| Perplexity JSON schema | ✅ Fixed | Line 1469: "Removed strict json_schema" |
| Neutral 50 default | ✅ Fixed | Lines 433-434: returns null for missing data |
| Retry logic | ✅ Working | Exponential backoff on all providers |
| Category batching | ✅ Working | 2-concurrent limit per category |
| Tavily research | ✅ Working | Research caching implemented |
| Judge consensus | ✅ Working | `opusJudge.ts` aggregation logic sound |

---

## PRIORITY ORDER

| # | Fix | Effort | Risk | Impact |
|---|-----|--------|------|--------|
| 1 | Fix premature averaging | 1-4 hrs | Low | Eliminates score convergence |
| 2 | Parallel Perplexity batching | 1-2 hrs | Low | Improves reliability |
| 3 | Clean up Phase 2 dead code | 1 hr | None | Code hygiene |

**Total: 3-7 hours. Not a rewrite.**

---

Co-Authored-By: Claude
