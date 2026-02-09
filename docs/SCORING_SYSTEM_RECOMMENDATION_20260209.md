# LIFE SCORE — Scoring System Fix Recommendation
**Date:** 2026-02-09
**Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Direct code reading of api/evaluate.ts (1648 lines), src/services/llmEvaluators.ts, src/api/scoring.ts, src/App.tsx

---

## DIAGNOSIS

The scoring architecture is **sound**. All 5 LLMs receive identical 0-100 numeric prompts with dual Legal/Enforcement scores. Parsing returns `null` for missing data (not 50). Retry logic and safety settings are properly configured.

There are **3 specific issues** remaining:

---

## FIX #1: Premature Legal/Enforcement Averaging (CRITICAL)

### The Bug
`src/services/llmEvaluators.ts` lines 164 and 184:
```typescript
normalizedScore: Math.round((s.city1LegalScore + s.city1EnforcementScore) / 2),
```

`normalizedScore` is the **only score used downstream** for total city scores, Gamma reports, Olivia context, database storage, and saved comparisons. The separate `legalScore`/`enforcementScore` are stored but barely used.

Additionally, `src/App.tsx` line 545 overwrites the enforcement score:
```typescript
enforcementScore: score.normalizedScore,  // Uses averaged value, not real enforcement
```

### Impact
- City A: Legal=20, Enforcement=80 → normalizedScore=50
- City B: Legal=50, Enforcement=50 → normalizedScore=50
- **Two completely different cities get identical scores**

### Recommended Fix
**Option A (Simple — 1 hour):** Keep the averaging but fix the App.tsx pass-through so the real enforcement score is preserved in enhanced view.

**Option B (Better — 3-4 hours):** Let users choose how Legal vs Enforcement are weighted. Default to 50/50 average but allow a slider or persona-based preference. Store both scores separately all the way through. This would require:
1. Change lines 164/184 to keep legal and enforcement separate as the primary display scores
2. Add a `combinedScore` computed at display time based on user preference
3. Fix App.tsx:544-545 to pass actual legalScore and enforcementScore
4. Update `src/api/scoring.ts:121` to use the combined score with user weight

### Risk Level: LOW
The averaging formula is in one file. Downstream consumers already have fields for separate scores. No database schema changes needed.

---

## FIX #2: Perplexity Large Category Batching (MEDIUM)

### The Bug
`api/evaluate.ts` lines 1282-1316: Categories with >15 metrics (business_work=25, housing_property=20) are split into sequential recursive batches. Each batch is a separate API call with no shared context. If batch 2 fails, partial data returns.

### Impact
- business_work (25 metrics) gets split into batches of 13 + 12
- If batch 2 fails, only 13/25 metrics scored
- Sequential execution doubles latency for large categories

### Recommended Fix
Run batches in parallel with `Promise.allSettled()` instead of sequential:
```typescript
const [result1, result2] = await Promise.allSettled([
  evaluateWithPerplexity(city1, city2, batch1),
  evaluateWithPerplexity(city1, city2, batch2)
]);
```
Merge whatever succeeds. This halves latency and improves resilience (partial success instead of total failure).

### Risk Level: LOW
Only affects Perplexity provider. Other LLMs handle large categories in a single call.

---

## FIX #3: Dead Phase 2 Code Cleanup (LOW PRIORITY)

### The Situation
`USE_CATEGORY_SCORING` env toggle (line 45) gates ~150 lines of category-based scoring code that is likely disabled in production. The numeric 0-100 system works correctly without it.

### Recommendation
**Do NOT enable Phase 2 right now.** The numeric system is working. Phase 2 (category-based scoring with predefined options) is a different scoring philosophy that would change all results. If you want to enable it later:
1. Test it in staging with 5-10 city pairs
2. Compare scores side-by-side with numeric system
3. Only enable if scores are more accurate

For now: Leave the code as-is. It's not hurting anything. Clean up later if you decide not to use it.

---

## PRIORITY ORDER

| # | Fix | Effort | Risk | Impact |
|---|-----|--------|------|--------|
| 1 | Fix premature averaging (llmEvaluators.ts:164,184 + App.tsx:545) | 1-4 hours | Low | High — eliminates score convergence |
| 2 | Parallel Perplexity batching (evaluate.ts:1282-1316) | 1-2 hours | Low | Medium — improves Perplexity reliability |
| 3 | Clean up Phase 2 dead code (optional) | 1 hour | None | Low — code hygiene only |

**Total effort: 3-7 hours depending on Option A vs B for Fix #1.**

---

## WHAT'S NOT BROKEN (Confirmed by Code Reading)

- All LLM prompts ask for 0-100 numeric scores ✅
- parseResponse() returns null for missing data (not 50) ✅
- Gemini safety settings configured ✅
- Perplexity JSON schema removed ✅
- Tavily research caching works ✅
- Retry logic with exponential backoff on all providers ✅
- Category batching with 2-concurrent limit works ✅

---

Co-Authored-By: Claude
