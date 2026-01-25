# LIFESCORE TypeScript Error Handoff
**Session:** LIFESCORE-AUDIT-2026-0125-A
**Date:** 2026-01-25
**Status:** BUILD FAILING - TypeScript errors unresolved

---

## CRITICAL: Previous session made type changes without fixing all consumers

The `MetricConsensus` and `CategoryConsensus` interfaces were changed to allow `null` values:
- `consensusScore: number` → `consensusScore: number | null`
- `legalScore: number` → `legalScore: number | null`
- `enforcementScore: number` → `enforcementScore: number | null`
- `standardDeviation: number` → `standardDeviation: number | null`
- `averageConsensusScore: number` → `averageConsensusScore: number | null`
- `confidenceLevel` added `'no_data'` option

**These changes broke ~50+ locations across the codebase that were NOT fixed.**

---

## Remaining Features (from SCORING_FIX_PLAN.md)

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| 4 | Category exclusion UI | MEDIUM | TODO |
| 5 | Weight redistribution | MEDIUM | TODO |

---

## ALL CURRENT BUILD ERRORS

### src/App.tsx (2 errors)
```
Line 151: legalScore type 'number | null | undefined' not assignable to 'number | undefined'
Line 162: Same issue for city2
```

### src/components/AdvancedVisuals.tsx (15 errors)
```
Line 95: Argument 'number | null' not assignable to 'number'
Line 100: Argument 'number | null' not assignable to 'number'
Line 121: Type 'number | null' not assignable to 'number'
Line 122: Type 'number | null' not assignable to 'number'
Line 123: 'metric.consensusScore' possibly null (x2)
Line 169: Argument 'number | null' not assignable to 'number'
Line 174: Argument 'number | null' not assignable to 'number'
Line 220: Argument 'number | null' not assignable to 'number'
Line 238: 'metric.consensusScore' and 'city2Score' possibly null
Line 244: Argument 'number | null' not assignable to 'number'
Line 245: Argument 'number | null' not assignable to 'number'
```

### src/components/EnhancedComparison.tsx (40+ errors)
```
Line 734: Argument 'number | null' not assignable to 'number'
Line 756-763: Multiple type mismatches for consensusScore, legalScore, enforcementScore, confidenceLevel, standardDeviation
Line 1023: 'metric1.standardDeviation' possibly null
Line 1031-1035: Multiple type mismatches
Line 1246: 'metric1.consensusScore' and 'metric2.consensusScore' possibly null
Line 1252-1255: Multiple type mismatches
Line 1291-1292: MetricConsensus[] not assignable (consensusScore type mismatch)
Line 1305: 'wCat.averageConsensusScore' possibly null
Line 1325: 'lCat.averageConsensusScore' possibly null
Line 1634: 'a' and 'b' possibly null
Line 1636: Object possibly null (x2)
Line 1637: Argument 'number | null' not assignable to 'number'
Line 1642: Argument 'number | null' not assignable to 'number' (x2)
Line 1651: 'a' and 'b' possibly null
Line 1653: Object possibly null (x2)
Line 1654: Argument 'number | null' not assignable to 'number'
Line 1659: Argument 'number | null' not assignable to 'number' (x2)
```

---

## ROOT CAUSE

Types were changed in:
- `src/types/enhancedComparison.ts` - MetricConsensus, CategoryConsensus interfaces
- `src/types/metrics.ts` - MetricScore, CategoryScore interfaces

But consumers in these files were NOT updated:
- `src/App.tsx`
- `src/components/AdvancedVisuals.tsx`
- `src/components/EnhancedComparison.tsx`

---

## FIX STRATEGY

For each error, add null coalescing (`?? 0`) or null checks before using values:

```typescript
// Before (broken):
Math.round(metric.consensusScore)

// After (fixed):
Math.round(metric.consensusScore ?? 0)
```

For type assignments:
```typescript
// Before (broken):
const score: number = metric.consensusScore;

// After (fixed):
const score: number = metric.consensusScore ?? 0;
```

For confidenceLevel 'no_data':
```typescript
// Update any type that expects only 4 options to include 'no_data'
type ConfidenceLevel = 'unanimous' | 'strong' | 'moderate' | 'split' | 'no_data';
```

---

## FILES TO FIX (in order)

1. `src/App.tsx` - Lines 151, 162
2. `src/components/AdvancedVisuals.tsx` - Lines 95, 100, 121-123, 169, 174, 220, 238, 244-245
3. `src/components/EnhancedComparison.tsx` - All lines listed above (~40 fixes needed)

---

## VERIFICATION

After fixes, run:
```bash
cd D:\lifescore && npm run build
```

Build must complete with exit code 0.
