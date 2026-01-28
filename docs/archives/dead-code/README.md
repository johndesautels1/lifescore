# Dead Code Archive - LifeScore

**Archived:** 2026-01-20
**Conversation ID:** LIFESCORE-2026-0120-CONTINUE

## Summary

This folder contains code that was identified as dead/unused during a comprehensive code audit. The code was safely removed from the active codebase but preserved here for potential future restoration.

## Why This Code Is Dead

The app was refactored from an **automatic multi-LLM flow** to a **manual button-click flow**:

| Old Flow (Dead) | New Flow (Active) |
|-----------------|-------------------|
| `EnhancedComparisonContainer` | `LLMSelector` component |
| Auto-runs all LLMs at once | User clicks individual LLM buttons |
| `runEnhancedComparison()` | `runSingleEvaluatorBatched()` |
| `runAllEvaluators()` | Each button → `/api/evaluate` |
| Direct client-side API calls | Vercel serverless functions |

## Files in This Archive

| File | Contents | Original Lines |
|------|----------|----------------|
| `DEAD_CODE_ARCHIVE_2026-01-20.ts` | LLM evaluator functions | ~937 lines |
| `DEAD_CODE_SERVICES_2026-01-20.ts` | Service + Component | ~353 lines |

### Removed 2026-01-20 (Issue #9 fix)

From `opusJudge.ts` (~417 lines removed, file now 212 lines):

| Function | Purpose | Why Dead |
|----------|---------|----------|
| `fetchWithTimeout()` | Timeout wrapper | Duplicate of api/judge.ts |
| `aggregateScoresByMetric()` | Score aggregation | Duplicate of api/judge.ts |
| `calculateMean/StdDev/Median()` | Statistics | Duplicate of api/judge.ts |
| `buildMetricConsensus()` | Consensus builder | Duplicate of api/judge.ts |
| `JUDGE_PROMPT_TEMPLATE` | Opus prompt | Duplicate of api/judge.ts |
| `runOpusJudge()` | Direct Opus API call | NEVER CALLED - client uses /api/judge |
| `buildEvaluationSummary()` | Summary builder | Only used by runOpusJudge |
| `parseOpusResponse()` | JSON parser | Duplicate of api/judge.ts |
| `mergeOpusJudgments()` | Merge function | Duplicate of api/judge.ts |

**Kept in opusJudge.ts:**
- `JudgeInput`, `JudgeOutput` types (used by EnhancedComparison.tsx)
- `buildCategoryConsensuses()` (used by buildEnhancedResultFromJudge)
- `buildEnhancedResultFromJudge()` (dynamic import in App.tsx:190)

## Dead Code Inventory

### From `llmEvaluators.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `evaluateWithClaude()` | 257-393 | Direct Anthropic API call |
| `evaluateWithGPT4o()` | 395-574 | Direct OpenAI API call |
| `evaluateWithGemini()` | 576-687 | Direct Google API call |
| `evaluateWithGrok()` | 689-780 | Direct xAI API call |
| `evaluateWithPerplexity()` | 782-928 | Direct Perplexity API call |
| `parseEvaluationResponse()` | 930-1049 | Response parser |
| `AllEvaluatorsResult` + `runAllEvaluators()` | 1051-1119 | Parallel runner |
| `runSingleEvaluator()` | 1121-1197 | Single LLM runner |

### From `enhancedComparison.ts`

| Function | Lines | Purpose |
|----------|-------|---------|
| `EnhancedComparisonOptions` | 82-88 | Interface |
| `runEnhancedComparison()` | 90-348 | Main orchestrator |

### From `EnhancedComparison.tsx`

| Component | Lines | Purpose |
|-----------|-------|---------|
| `EnhancedComparisonContainerProps` | 1620-1625 | Interface |
| `EnhancedComparisonContainer` | 1627-1699 | Container component |
| `export default` | 1701 | Default export |

## How to Restore

If you need to restore any of this code:

1. Open the relevant archive file
2. Find the function/component you need
3. Copy it back to the original source file
4. Add necessary imports
5. Update any callers to use the restored function
6. Test thoroughly

## Verification

Before this code was archived, it was verified that:
- [x] `EnhancedComparisonContainer` is never imported anywhere
- [x] `runEnhancedComparison()` is only called by `EnhancedComparisonContainer`
- [x] `runAllEvaluators()` is only called by `runEnhancedComparison()`
- [x] The 5 `evaluateWith*()` functions are only called by dead functions
- [x] The active app uses `LLMSelector` → `runSingleEvaluatorBatched()` → `/api/evaluate`
- [x] Multiple LLM selection works via the button-click flow
