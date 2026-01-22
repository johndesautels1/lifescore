# LIFE SCORE SCORING SYSTEM - MASTER IMPLEMENTATION PLAN

**Created:** 2026-01-18
**Status:** Ready for Implementation
**LLM Consensus:** 5/5 Complete (Perplexity pending)

---

## CRITICAL CONTEXT FOR NEW SESSION

If you are reading this after context compression:
1. READ: `D:\LifeScore\SCORING_SYSTEM_REDESIGN.md` for full LLM consensus
2. The problem: Cities showing identical scores (65 vs 65) due to generic A-E grading
3. The fix: Replace A-E with category keys from existing `scoringCriteria.options`
4. 5 LLMs agree unanimously on this approach

---

## MASTER IMPLEMENTATION TABLE

### PHASE 1: FOUNDATION (No Breaking Changes)

| Step | File | Action | Tavily Impact | Timeout Impact | Risk |
|------|------|--------|---------------|----------------|------|
| 1.1 | `src/shared/metrics.ts` | CREATE: Move metrics from `src/data/metrics.ts` | None | None | Low |
| 1.2 | `src/shared/metrics.ts` | ADD: `insufficient_data` and `transitional` options to ALL 100 metrics | None | None | Low |
| 1.3 | `src/shared/metrics.ts` | ADD: `METRIC_SCORE_LOOKUP` Map for O(1) lookups | None | None | Low |
| 1.4 | `src/shared/metrics.ts` | ADD: `categoryToScore()` function with error typing | None | None | Low |
| 1.5 | ALL client files | UPDATE: Change imports from `src/data/metrics` to `src/shared/metrics` | None | None | Low |
| 1.6 | `api/evaluate.ts` | UPDATE: Import from `../src/shared/metrics` | None | None | Low |

### PHASE 2: PROMPT REWRITE (Parallel System)

| Step | File | Action | Tavily Impact | Timeout Impact | Risk |
|------|------|--------|---------------|----------------|------|
| 2.1 | `api/evaluate.ts` | ADD: `buildCategoryPrompt()` alongside existing `buildBasePrompt()` | **YES - See Below** | +10-15s | Medium |
| 2.2 | `api/evaluate.ts` | ADD: `USE_CATEGORY_SCORING` environment variable check | None | None | Low |
| 2.3 | `api/evaluate.ts` | UPDATE: Pass `scoringCriteria.options` in EvaluationRequest | None | None | Low |
| 2.4 | `api/evaluate.ts` | ADD: Fallback protocol in prompt instructions | None | None | Low |

### PHASE 3: PARSER UPDATE

| Step | File | Action | Tavily Impact | Timeout Impact | Risk |
|------|------|--------|---------------|----------------|------|
| 3.1 | `api/evaluate.ts` | UPDATE: `parseResponse()` to handle `city1Category`/`city2Category` | None | None | Medium |
| 3.2 | `api/evaluate.ts` | REPLACE: `letterToScore()` with `categoryToScore()` call | None | None | Medium |
| 3.3 | `api/evaluate.ts` | ADD: Validation logic with retry/review flags | None | +5-10s on retry | Medium |
| 3.4 | `api/evaluate.ts` | REMOVE: `sources[]` from output (keep only `cityEvidence[]`) | None | None | Low |

### PHASE 4: CACHE FIX

| Step | File | Action | Tavily Impact | Timeout Impact | Risk |
|------|------|--------|---------------|----------------|------|
| 4.1 | `src/services/cache.ts` | FIX: Store city order in cache value, not just sorted key | None | None | Medium |
| 4.2 | `src/services/cache.ts` | ADD: `originalCity1`/`originalCity2` fields to cached result | None | None | Low |

### PHASE 5: TESTING & CUTOVER

| Step | Action | Tavily Impact | Timeout Impact | Risk |
|------|--------|---------------|----------------|------|
| 5.1 | Deploy to staging with `USE_CATEGORY_SCORING=false` | None | None | Low |
| 5.2 | Run Austin vs Denver baseline (old system) | Normal | Normal | Low |
| 5.3 | Enable `USE_CATEGORY_SCORING=true` on staging | None | None | Low |
| 5.4 | Run Austin vs Denver new system, compare results | Normal | +10-15s | Low |
| 5.5 | A/B test token usage and accuracy | Normal | Normal | Low |
| 5.6 | Enable in production, monitor 24-48h | Normal | Normal | Medium |
| 5.7 | Remove old code paths after stability confirmed | None | None | Low |

---

## TAVILY ARCHITECTURE - CRITICAL DETAILS

### Current Architecture (Unchanged for Tavily)

```
┌─────────────────────────────────────────────────────────────────┐
│ TAVILY INTEGRATION (Per LLM Call)                               │
│                                                                  │
│ 1. Research API call (comprehensive baseline)                   │
│    - 1 call per comparison                                      │
│    - Returns report + sources                                   │
│                                                                  │
│ 2. Search API calls (category-specific)                         │
│    - 12 calls per comparison (2 per category × 6 categories)    │
│    - Returns results + answer                                   │
│                                                                  │
│ Total Tavily calls per LLM: 13                                  │
│ Total Tavily calls per comparison: 13 × 5 LLMs = 65 calls       │
└──────────────────────────────────────────────────────────────────┘
```

### What Changes With New Prompt?

| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| **Tavily Research API** | 1 call/LLM | 1 call/LLM | **NO CHANGE** |
| **Tavily Search API** | 12 calls/LLM | 12 calls/LLM | **NO CHANGE** |
| **Prompt includes Tavily context** | Yes | Yes | **NO CHANGE** |
| **Prompt structure** | A-E grades | Category keys | **CHANGED** |
| **Prompt size** | ~5,500 tokens | ~7,600 tokens (Sonnet condensed) | **+38%** |

### Tavily Context Flow (UNCHANGED)

```javascript
// This stays EXACTLY the same - just the LLM prompt changes
const [researchResult, ...searchResults] = await Promise.all([
  tavilyResearch(city1, city2),  // 1 call
  ...searchQueries.map(q => tavilySearch(q, 5))  // 12 calls
]);

// Tavily context still prepended to prompt
const prompt = tavilyContext + buildCategoryPrompt(city1, city2, metrics);
//                             ^^^^^^^^^^^^^^^^^^^^
//                             ONLY THIS CHANGES
```

---

## PROMPT ARCHITECTURE - 6 LLMS × 1 SHARED PROMPT

### Question: "Do we have 1 prompt or 6 different prompts?"

**ANSWER: 1 SHARED BASE PROMPT + 6 LLM-SPECIFIC ADDENDUMS**

```
┌─────────────────────────────────────────────────────────────────┐
│ buildCategoryPrompt() ← SHARED (NEW)                            │
│ - Includes scoringCriteria.options for each metric              │
│ - Includes fallback instructions                                │
│ - Includes JSON output format                                   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ LLM-SPECIFIC ADDENDUMS (EXISTING - UNCHANGED)                   │
│                                                                  │
│ Claude:    claudeAddendum (Tavily baseline instructions)        │
│ GPT-4o:    gptAddendum (factual accuracy focus)                 │
│ Gemini:    geminiAddendum (thinking level, Google grounding)    │
│ Grok:      grokAddendum (X/Twitter enforcement data)            │
│ Perplexity: perplexityAddendum (citation-backed research)       │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FINAL PROMPT = tavilyContext + basePrompt + llmAddendum         │
└──────────────────────────────────────────────────────────────────┘
```

### What Gets Rewritten?

| Component | Status | Details |
|-----------|--------|---------|
| `buildBasePrompt()` | REWRITE → `buildCategoryPrompt()` | New structure with category keys |
| `claudeAddendum` | **KEEP** | Tavily-specific instructions |
| `gptAddendum` | **KEEP** | Factual accuracy instructions |
| `geminiAddendum` | **KEEP** | Thinking level instructions |
| `grokAddendum` | **KEEP** | X/Twitter instructions |
| `perplexityAddendum` | **KEEP** | Citation instructions |
| `parseResponse()` | UPDATE | Handle `city1Category` instead of `city1Legal` |

---

## TIMEOUT ARCHITECTURE

### Current Timeouts

| Component | Current Timeout | After Change | Impact |
|-----------|----------------|--------------|--------|
| **Vercel Function** | 300s (Pro limit) | 300s | **NO CHANGE** |
| **LLM API calls** | 180s each | 180s each | **NO CHANGE** |
| **Tavily calls** | 180s (shared) | 180s | **NO CHANGE** |
| **Per-batch timeout** | 240s | 240s | **NO CHANGE** |

### Parallel Execution (UNCHANGED)

```
Time 0s ──────────────────────────────────────────────────── 300s
        │
        ├─ Category 1 (Personal Freedom) ─────────────────│ ~45s
        ├─ Category 2 (Housing/Property) ─────────────────│ ~45s
        ├─ Category 3 (Business/Work) ───────────────────│ ~50s
        ├─ Category 4 (Transportation) ──────────────────│ ~40s
        ├─ Category 5 (Legal System) ────────────────────│ ~45s
        └─ Category 6 (Speech/Lifestyle) ────────────────│ ~35s
                                                          │
        All 6 run in PARALLEL ────────────────────────────┘

        Then: Opus Judge ─────────────────────────────────│ ~60s

        Total: ~110-150s (well under 300s limit)
```

### New Timeout Considerations

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Larger prompt (+38% tokens) | +5-10s per call | Still within limits |
| Validation retry | +30-45s if needed | Only ~10% of calls need retry |
| Category with 25 metrics | May need 50s | Split if >20 metrics (Sonnet's suggestion) |

---

## ARCHITECTURE IMPACT SUMMARY

### What CHANGES

| Component | Change | Effort |
|-----------|--------|--------|
| `api/evaluate.ts` | Prompt rewrite, parser update, score lookup | 4-6 hours |
| `src/shared/metrics.ts` | New file with lookup Map | 2 hours |
| `src/services/cache.ts` | City order fix | 30 min |
| `EvaluationRequest` interface | Add `scoringCriteria` field | 30 min |
| All client imports | Point to shared location | 1 hour |

### What STAYS THE SAME

| Component | Status |
|-----------|--------|
| Tavily Research API integration | **UNCHANGED** |
| Tavily Search API integration | **UNCHANGED** |
| 5 LLM evaluators architecture | **UNCHANGED** |
| 6 parallel category calls | **UNCHANGED** |
| Opus Judge consensus builder | **UNCHANGED** |
| Vercel serverless architecture | **UNCHANGED** |
| Timeout limits | **UNCHANGED** |
| Evidence/citation structure | **UNCHANGED** (except remove redundant `sources[]`) |

---

## FINAL CHECKLIST BEFORE IMPLEMENTATION

| # | Item | Confirmed |
|---|------|-----------|
| 1 | Tavily integration UNCHANGED | ✅ |
| 2 | 1 shared base prompt + 6 addendums | ✅ |
| 3 | Parallel execution UNCHANGED | ✅ |
| 4 | Timeouts still within 300s | ✅ |
| 5 | Environment variable for gradual rollout | ✅ |
| 6 | Add fallback categories to all 100 metrics | ✅ |
| 7 | Use Sonnet's condensed prompt format | ✅ |
| 8 | Implement O(1) score lookup Map | ✅ |
| 9 | Add validation with retry/review logic | ✅ |
| 10 | Fix cache city order bug | ✅ |

---

## QUICK REFERENCE: FILES TO MODIFY

```
MODIFY:
├── api/evaluate.ts           # Prompt, parser, score lookup
├── src/services/cache.ts     # City order fix
├── src/hooks/useComparison.ts # Update to use new response format
└── vite.config.ts            # Add path alias (if needed)

CREATE:
├── src/shared/metrics.ts     # Shared metrics + lookup Map
├── src/shared/categories.ts  # Shared categories
└── src/shared/types.ts       # Shared TypeScript interfaces

DELETE (after migration):
└── src/data/metrics.ts       # Replaced by shared version
```

---

## TOKEN COST COMPARISON

| System | Tokens/Comparison | Cost (Claude rates) | Difference |
|--------|-------------------|---------------------|------------|
| Current (A-E) | 33K | ~$0.99 | Baseline |
| GPT-4o verbose | 94.8K | ~$2.84 | +$1.85 ⚠️ |
| Sonnet condensed | 45.6K | ~$1.37 | +$0.38 ✅ |

**Recommendation:** Use Sonnet's condensed format to minimize cost increase.

---

*This document is the master implementation reference. Read `SCORING_SYSTEM_REDESIGN.md` for full LLM consultation details.*
