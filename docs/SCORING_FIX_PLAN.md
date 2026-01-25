# LIFE SCORE - Scoring System Fix Plan

**Conversation ID:** `LIFESCORE-AUDIT-2026-0125-A`
**Created:** 2026-01-25
**Status:** Ready for Implementation

---

## Executive Summary

The scoring system has fundamental math errors causing two compared cities to always show similar total scores despite having different individual field scores. The root cause is premature 50/50 averaging of Law vs Lived scores, combined with neutral defaults (50) for missing data.

---

## Bug Summary Table

| # | Bug | Severity | File | Lines | Status |
|---|-----|----------|------|-------|--------|
| 1 | Law/Lived 50/50 averaging | **CRITICAL** | `src/hooks/useComparison.ts` | 292-297 | TODO |
| 2 | Neutral default 50 (useComparison) | **HIGH** | `src/hooks/useComparison.ts` | 103-112 | TODO |
| 3 | Neutral default 50 (scoring.ts) | **HIGH** | `src/api/scoring.ts` | 123-138 | TODO |
| 4 | Neutral default 50 (parseAPIResponse) | **HIGH** | `src/api/scoring.ts` | 276-286 | TODO |
| 5 | Neutral default 50 (opusJudge) | **HIGH** | `src/services/opusJudge.ts` | 93-97 | TODO |
| 6 | Neutral default 50 (judge.ts) | **HIGH** | `api/judge.ts` | 154-165 | TODO |
| 7 | Failed LLM defaults to 50 | **HIGH** | `api/evaluate.ts` | 385-395 | TODO |
| 8 | Persona weights ignored (Standard) | **MEDIUM** | `src/hooks/useComparison.ts` | all | TODO |
| 9 | Median consensus flattens data | **MEDIUM** | `api/judge.ts` | 171-174 | TODO |

---

## Missing Features Table

| # | Feature | Priority | Files to Create/Modify |
|---|---------|----------|------------------------|
| 1 | Law/Lived ratio per persona | **HIGH** | `WeightPresets.tsx` |
| 2 | Law/Lived user slider | **HIGH** | `WeightPresets.tsx`, `CitySelector.tsx`, `App.tsx` |
| 3 | Conservative mode (MIN) | **MEDIUM** | `WeightPresets.tsx`, scoring files |
| 4 | Category exclusion UI | **MEDIUM** | `WeightPresets.tsx` |
| 5 | Weight redistribution | **MEDIUM** | All scoring files |
| 6 | Data completeness indicator | **LOW** | Results components |

---

## Detailed Fix Instructions

### FIX #1: Law/Lived 50/50 Averaging (CRITICAL)

**File:** `src/hooks/useComparison.ts`
**Lines:** 292-297

**Current Code (WRONG):**
```typescript
const city1NormalizedScore = Math.round(
  (score.city1LegalScore + score.city1EnforcementScore) / 2
);
const city2NormalizedScore = Math.round(
  (score.city2LegalScore + score.city2EnforcementScore) / 2
);
```

**Fixed Code:**
```typescript
// Store Law and Lived scores SEPARATELY - do not average here
// The combining happens at final display using user preferences
const city1LegalScore = score.city1LegalScore;
const city1LivedScore = score.city1EnforcementScore;
const city2LegalScore = score.city2LegalScore;
const city2LivedScore = score.city2EnforcementScore;

// For backward compatibility, calculate normalized using user's Law/Lived preference
// This requires passing lawLivedRatio from WeightPresets
const city1NormalizedScore = Math.round(
  (city1LegalScore * lawWeight + city1LivedScore * livedWeight) / 100
);
const city2NormalizedScore = Math.round(
  (city2LegalScore * lawWeight + city2LivedScore * livedWeight) / 100
);
```

**Additional Changes Required:**
1. Add `lawLivedRatio` parameter to `useComparison` hook
2. Pass from `App.tsx` via `WeightPresets`
3. Store both scores in `MetricScore` type

---

### FIX #2: Neutral Default 50 in useComparison.ts

**File:** `src/hooks/useComparison.ts`
**Lines:** 103-112

**Current Code (WRONG):**
```typescript
} else {
  // Create placeholder for missing metric with neutral score
  metricsForCategory.push({
    metricId: metricDef.id,
    rawValue: null,
    normalizedScore: 50, // Neutral score, not 0
    confidence: 'unverified'
  });
  totalWeightedScore += 50 * metricDef.weight;
  totalWeight += metricDef.weight;
}
```

**Fixed Code:**
```typescript
} else {
  // EXCLUDE missing metrics from calculation entirely
  // Do not use neutral 50 - it causes artificial convergence
  metricsForCategory.push({
    metricId: metricDef.id,
    rawValue: null,
    normalizedScore: null, // NULL not 50
    confidence: 'unverified',
    isMissing: true
  });
  // DO NOT add to totalWeightedScore or totalWeight
  // Missing metrics are excluded from average
}
```

**Type Change Required:**
```typescript
// In src/types/metrics.ts, update MetricScore:
export interface MetricScore {
  metricId: string;
  rawValue: string | number | boolean | null;
  normalizedScore: number | null;  // Changed: can be null
  legalScore?: number | null;      // Added
  livedScore?: number | null;      // Added
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  isMissing?: boolean;             // Added
  // ... rest unchanged
}
```

---

### FIX #3: Neutral Default 50 in scoring.ts

**File:** `src/api/scoring.ts`
**Lines:** 123-138

**Same pattern as Fix #2** - exclude missing metrics from calculation instead of using 50.

---

### FIX #4: Neutral Default 50 in parseAPIResponse

**File:** `src/api/scoring.ts`
**Lines:** 276-286

**Current Code (WRONG):**
```typescript
if (!metric) {
  console.warn(`Unknown metric ID: ${metricId}`);
  return {
    metricId,
    rawValue: null,
    normalizedScore: 50, // Neutral score instead of 0
    confidence: 'unverified',
    notes: 'Unknown metric'
  };
}
```

**Fixed Code:**
```typescript
if (!metric) {
  console.warn(`Unknown metric ID: ${metricId}`);
  return {
    metricId,
    rawValue: null,
    normalizedScore: null, // NULL - exclude from calculations
    confidence: 'unverified',
    notes: 'Unknown metric',
    isMissing: true
  };
}
```

---

### FIX #5: Neutral Default 50 in opusJudge.ts

**File:** `src/services/opusJudge.ts`
**Lines:** 93-97

**Current Code (WRONG):**
```typescript
const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 50;
```

**Fixed Code:**
```typescript
// If no valid metrics, return null to indicate no data
// Do not use 50 which causes artificial convergence
const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : null;
```

---

### FIX #6: Neutral Default 50 in judge.ts

**File:** `api/judge.ts`
**Lines:** 154-165

**Current Code (WRONG):**
```typescript
if (scores.length === 0) {
  return {
    metricId,
    llmScores: [],
    consensusScore: 50,
    legalScore: 50,
    enforcementScore: 50,
    confidenceLevel: 'split',
    standardDeviation: 0,
    judgeExplanation: 'No LLM evaluations available for this metric'
  };
}
```

**Fixed Code:**
```typescript
if (scores.length === 0) {
  return {
    metricId,
    llmScores: [],
    consensusScore: null,  // NULL not 50
    legalScore: null,
    enforcementScore: null,
    confidenceLevel: 'no_data',  // New level
    standardDeviation: null,
    judgeExplanation: 'No LLM evaluations available - excluded from totals',
    isMissing: true
  };
}
```

---

### FIX #7: Failed LLM Defaults to 50

**File:** `api/evaluate.ts`
**Lines:** 385-395

**Current Code (WRONG):**
```typescript
if (numeric === undefined || numeric === null) {
  return 50; // Default to middle score
}
// ...
if (isNaN(numericValue)) {
  console.warn(`[PARSE] Invalid numeric value: ${numeric}, defaulting to 50`);
  return 50;
}
```

**Fixed Code:**
```typescript
if (numeric === undefined || numeric === null) {
  return null; // Return null - this metric will be excluded
}
// ...
if (isNaN(numericValue)) {
  console.warn(`[PARSE] Invalid numeric value: ${numeric}, excluding metric`);
  return null;
}
```

---

### FIX #8: Persona Weights Ignored in Standard Mode

**File:** `src/hooks/useComparison.ts`

**Problem:** Standard mode uses hardcoded `CATEGORIES` weights, ignoring user's persona selection.

**Fix:** Pass `customWeights` to `useComparison` hook and use them in `calculateCityScore`.

**Changes:**
1. Add `customWeights` parameter to `compare()` function
2. Pass weights to `calculateCategoryScore()`
3. Use user weights instead of `category?.weight`

---

### FIX #9: Median Consensus Flattens Data

**File:** `api/judge.ts`
**Lines:** 171-174

**Current Code:**
```typescript
const median = calculateMedian(normalizedScores);
const consensusScore = Math.round(median);
```

**Discussion:** Median is intentional for outlier rejection, but when combined with other bugs creates over-convergence. Consider:
- Using weighted mean based on confidence levels
- Or keeping median but fixing the other bugs first (they're the bigger problem)

**Recommendation:** Fix bugs 1-8 first, then reassess if median is still problematic.

---

## New Feature: Law/Lived Ratio System

### 1. Add to WeightPresets.tsx

**Add new state and presets:**
```typescript
// New interface for Law/Lived ratio
interface LawLivedRatio {
  law: number;   // 0-100, percentage
  lived: number; // 0-100, percentage (must sum to 100)
}

// Add to each preset
const PRESETS: WeightPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    icon: '⚖️',
    description: 'Equal weight to all categories',
    weights: { /* existing */ },
    lawLivedRatio: { law: 50, lived: 50 }  // NEW
  },
  {
    id: 'digital_nomad',
    name: 'Digital Nomad',
    icon: '💻',
    description: 'Remote work, mobility, lifestyle freedom',
    weights: { /* existing */ },
    lawLivedRatio: { law: 30, lived: 70 }  // Cares about actual experience
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    icon: '🚀',
    description: 'Business ease, taxes, regulations',
    weights: { /* existing */ },
    lawLivedRatio: { law: 70, lived: 30 }  // Needs legal framework
  },
  {
    id: 'family',
    name: 'Family',
    icon: '👨‍👩‍👧‍👦',
    description: 'Safety, property, stability',
    weights: { /* existing */ },
    lawLivedRatio: { law: 60, lived: 40 }  // Legal protections + safe environment
  },
  {
    id: 'libertarian',
    name: 'Libertarian',
    icon: '🗽',
    description: 'Maximum personal & economic freedom',
    weights: { /* existing */ },
    lawLivedRatio: { law: 40, lived: 60 }  // Actions > words
  },
  {
    id: 'investor',
    name: 'Investor',
    icon: '📈',
    description: 'Property rights, taxes, asset protection',
    weights: { /* existing */ },
    lawLivedRatio: { law: 80, lived: 20 }  // Legal asset protection
  }
];
```

### 2. Add Law/Lived Slider UI

```tsx
{/* Law vs Lived Slider */}
<div className="law-lived-slider">
  <div className="slider-header">
    <span>Priority: What the Law Says vs Lived Reality</span>
  </div>
  <div className="slider-labels">
    <span>📜 Law ({lawLivedRatio.law}%)</span>
    <span>🏙️ Lived ({lawLivedRatio.lived}%)</span>
  </div>
  <input
    type="range"
    min="0"
    max="100"
    value={lawLivedRatio.law}
    onChange={(e) => {
      const law = parseInt(e.target.value);
      setLawLivedRatio({ law, lived: 100 - law });
      onLawLivedChange?.({ law, lived: 100 - law });
    }}
    className="law-lived-range"
  />
</div>
```

### 3. Add Conservative Mode Toggle

```tsx
{/* Conservative Mode */}
<div className="conservative-mode">
  <label>
    <input
      type="checkbox"
      checked={conservativeMode}
      onChange={(e) => {
        setConservativeMode(e.target.checked);
        onConservativeModeChange?.(e.target.checked);
      }}
    />
    <span>🛡️ Worst-Case Mode</span>
    <span className="mode-description">
      Use whichever is LOWER (Law or Lived) for each metric
    </span>
  </label>
</div>
```

### 4. Conservative Mode Calculation

```typescript
function calculateMetricScore(
  legalScore: number,
  livedScore: number,
  lawWeight: number,
  livedWeight: number,
  conservativeMode: boolean
): number {
  if (conservativeMode) {
    // Worst-case: use the lower of the two
    return Math.min(legalScore, livedScore);
  }
  // Normal: weighted combination
  return Math.round((legalScore * lawWeight + livedScore * livedWeight) / 100);
}
```

---

## New Feature: Category Exclusion

### 1. Add to WeightPresets.tsx

```typescript
// State for excluded categories
const [excludedCategories, setExcludedCategories] = useState<Set<CategoryId>>(new Set());

// In the category slider section, add exclusion toggle:
{CATEGORIES.map(category => (
  <div key={category.id} className="slider-row">
    <div className="slider-label">
      <input
        type="checkbox"
        checked={!excludedCategories.has(category.id)}
        onChange={(e) => {
          const newExcluded = new Set(excludedCategories);
          if (e.target.checked) {
            newExcluded.delete(category.id);
          } else {
            newExcluded.add(category.id);
          }
          setExcludedCategories(newExcluded);
          onExcludedCategoriesChange?.(newExcluded);
        }}
      />
      <span className={`slider-icon ${excludedCategories.has(category.id) ? 'excluded' : ''}`}>
        {category.icon}
      </span>
      <span className={`slider-name ${excludedCategories.has(category.id) ? 'excluded' : ''}`}>
        {category.name}
      </span>
    </div>
    {/* Slider disabled if excluded */}
    <div className="slider-control">
      <input
        type="range"
        disabled={excludedCategories.has(category.id)}
        // ...
      />
    </div>
  </div>
))}
```

### 2. Weight Redistribution Logic

```typescript
function redistributeWeights(
  weights: Record<CategoryId, number>,
  excludedCategories: Set<CategoryId>
): Record<CategoryId, number> {
  const activeCategories = Object.keys(weights).filter(
    id => !excludedCategories.has(id as CategoryId)
  ) as CategoryId[];

  if (activeCategories.length === 0) {
    // All excluded - shouldn't happen, but handle gracefully
    return weights;
  }

  // Calculate total weight of active categories
  const activeTotal = activeCategories.reduce(
    (sum, id) => sum + weights[id], 0
  );

  // Redistribute to sum to 100
  const redistributed: Record<CategoryId, number> = {} as Record<CategoryId, number>;
  activeCategories.forEach(id => {
    redistributed[id] = Math.round((weights[id] / activeTotal) * 100);
  });

  // Set excluded to 0
  excludedCategories.forEach(id => {
    redistributed[id] = 0;
  });

  return redistributed;
}
```

---

## Implementation Order

1. **Phase 1: Fix Critical Math (Bugs 1-7)**
   - Fix neutral defaults (change 50 to null)
   - Fix Law/Lived averaging
   - Update types to support null scores
   - Test that scores now vary properly

2. **Phase 2: Add Law/Lived System**
   - Add ratios to persona presets
   - Add slider UI
   - Add conservative mode
   - Pass through to scoring functions

3. **Phase 3: Add Category Exclusion**
   - Add exclusion UI
   - Add weight redistribution
   - Test with various exclusion combinations

4. **Phase 4: Standard Mode Parity**
   - Ensure Standard mode uses all the same fixes
   - Pass persona weights to Standard mode
   - Pass Law/Lived ratio to Standard mode

---

## Testing Checklist

After fixes, verify:

- [ ] London pot (Law=20, Lived=85) vs Deep South trans (Law=90, Lived=15) show DIFFERENT total scores
- [ ] Changing persona changes the Law/Lived ratio and updates scores
- [ ] Law/Lived slider overrides persona default
- [ ] Conservative mode shows MIN of Law/Lived
- [ ] Excluding a category redistributes weight to remaining 5
- [ ] Missing metrics are excluded from average (not defaulted to 50)
- [ ] Data completeness shows "87/100 metrics evaluated"
- [ ] Standard mode and Enhanced mode produce consistent results
- [ ] Scores actually vary significantly between different cities

---

## Files Quick Reference

| File | Changes Needed |
|------|----------------|
| `src/hooks/useComparison.ts` | Fix averaging, add Law/Lived, add persona weights |
| `src/api/scoring.ts` | Fix neutral defaults |
| `src/services/opusJudge.ts` | Fix neutral defaults, add Law/Lived weighting |
| `src/services/llmEvaluators.ts` | Keep Law/Lived separate |
| `src/components/WeightPresets.tsx` | Add Law/Lived slider, conservative mode, category exclusion |
| `src/components/CitySelector.tsx` | Pass new props |
| `src/components/Results.tsx` | Display Law/Lived separately |
| `src/components/EnhancedComparison.tsx` | Display Law/Lived separately |
| `src/types/metrics.ts` | Add null support, new fields |
| `api/evaluate.ts` | Fix default 50 |
| `api/judge.ts` | Fix default 50, consensus calculation |
| `App.tsx` | Pass new state through component tree |

---

## Resume Instructions

If context window compresses, use this document to resume:

1. Read this file first
2. Check which bugs are marked TODO vs DONE
3. Continue from the next TODO item
4. Update status in this file as you complete each fix
