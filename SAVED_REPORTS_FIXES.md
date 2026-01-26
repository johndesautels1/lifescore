# Saved Reports - Remaining Potential Fixes

**Created:** 2026-01-26
**Status:** Phase 1 Complete, Phase 2 & 3 Pending
**Commit:** `89ab968` (Phase 1)

---

## Phase 1 - COMPLETED (Safe Fixes)

These fixes have been implemented:

- [x] Comprehensive defensive null checks in `handleLoad()` (SavedComparisons.tsx)
- [x] User-visible error messages instead of silent console.error
- [x] Handle `find()` returning undefined in JudgeTab.tsx
- [x] Validate city1/city2 data before returning result
- [x] Added `reportLoadError` state with dismissible UI

---

## Phase 2 - MEDIUM RISK (Test Thoroughly)

### Fix #8 & #9: Memoize savedComparisons Reads

**Problem:** `savedComparisons` and `savedEnhanced` are read fresh on every render in JudgeTab.tsx but lookups happen with potentially stale `selectedComparisonId`.

**File:** `src/components/JudgeTab.tsx`

**Current Code (lines 108-109):**
```tsx
const savedComparisons = getLocalComparisons();
const savedEnhanced = getLocalEnhancedComparisons();
```

**Proposed Fix:**
```tsx
import { useMemo } from 'react';

// Memoize to prevent stale reads
const savedComparisons = useMemo(() => getLocalComparisons(), []);
const savedEnhanced = useMemo(() => getLocalEnhancedComparisons(), []);

// Add a refresh function if needed
const [refreshKey, setRefreshKey] = useState(0);
const refreshComparisons = () => setRefreshKey(k => k + 1);

const savedComparisons = useMemo(() => getLocalComparisons(), [refreshKey]);
const savedEnhanced = useMemo(() => getLocalEnhancedComparisons(), [refreshKey]);
```

**Risk:** Could change re-render timing, may need to add refresh trigger when comparisons are saved/deleted elsewhere.

---

### Fix #24: Empty String vs Null Coercion

**Problem:** Mismatch between `selectedComparisonId || ''` and `e.target.value || null` can cause lookup failures.

**File:** `src/components/JudgeTab.tsx`

**Current Code:**
```tsx
value={selectedComparisonId || ''}
onChange={(e) => setSelectedComparisonId(e.target.value || null)}
```

**Proposed Fix:**
```tsx
value={selectedComparisonId ?? ''}
onChange={(e) => {
  const value = e.target.value;
  setSelectedComparisonId(value === '' ? null : value);
}}
```

**Risk:** Could change dropdown selection behavior if there are edge cases with empty strings.

---

### Fix #13 & #14: Callback Stale Closure

**Problem:** `onLoadComparison` callback in SavedComparisons may have stale reference.

**File:** `src/App.tsx`

**Current Code (line 237):**
```tsx
const handleLoadSavedComparison = useCallback((result: ComparisonResult) => {
  // ...
  loadResult(result);
  // ...
}, [loadResult]);
```

**Proposed Fix:**
```tsx
const handleLoadSavedComparison = useCallback((result: ComparisonResult) => {
  if (!result) {
    console.error('[App] handleLoadSavedComparison called with null/undefined result');
    return;
  }
  // Use functional update or ref to ensure fresh state
  loadResult(result);
  setEnhancedStatus('idle');
  setEnhancedResult(null);
  setActiveTab('results');
}, [loadResult, setEnhancedStatus, setEnhancedResult, setActiveTab]);
```

**Risk:** Adding more dependencies could cause extra re-renders.

---

## Phase 3 - HIGH RISK (Needs Careful Testing)

### Fix #4 & #22: Type Coercion Issues

**Problem:** `as unknown as ComparisonResult` cast loses type safety, enhanced comparisons may have different property structures.

**File:** `src/components/SavedComparisons.tsx`

**Current Code (lines 64-69):**
```tsx
const enhancedComparisons = getLocalEnhancedComparisons().map(c => ({
  ...c,
  result: c.result as unknown as ComparisonResult,
  isEnhanced: true
}));
```

**Proposed Fix:**
```tsx
// Create a type guard function
function isValidComparisonResult(obj: unknown): obj is ComparisonResult {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;
  return (
    r.comparisonId !== undefined &&
    r.city1 !== undefined &&
    r.city2 !== undefined &&
    typeof r.city1 === 'object' &&
    typeof r.city2 === 'object'
  );
}

// Use type guard instead of cast
const enhancedComparisons = getLocalEnhancedComparisons()
  .filter(c => isValidComparisonResult(c.result))
  .map(c => ({
    ...c,
    result: c.result as ComparisonResult, // Safe after validation
    isEnhanced: true
  }));
```

**Risk:** Could filter out valid enhanced comparisons if the type guard is too strict.

---

### Fix #11 & #12: Race Conditions

**Problem:** Database sync may overwrite localStorage mid-read, or multiple rapid clicks trigger multiple loads.

**File:** `src/services/savedComparisons.ts` and `src/components/SavedComparisons.tsx`

**Proposed Fix for Rapid Clicks:**
```tsx
// In SavedComparisons.tsx
const [isLoading, setIsLoading] = useState(false);

const handleLoad = async (comparison: DisplayComparison) => {
  if (isLoading) {
    console.log('[SavedComparisons] Already loading, ignoring click');
    return;
  }

  setIsLoading(true);
  try {
    // ... existing validation and load logic
  } finally {
    setIsLoading(false);
  }
};
```

**Proposed Fix for Database Sync Race:**
```tsx
// In savedComparisons.ts - add mutex lock
let syncLock = false;

export async function pullFromDatabase(): Promise<...> {
  if (syncLock) {
    return { success: false, message: 'Sync already in progress', added: 0 };
  }

  syncLock = true;
  try {
    // ... existing logic
  } finally {
    syncLock = false;
  }
}
```

**Risk:** Could make UI feel slower or block legitimate rapid actions.

---

### Fix #1: localStorage JSON.parse Corruption

**Problem:** `JSON.parse()` fails silently on corrupted data, returns `[]`.

**File:** `src/services/savedComparisons.ts`

**Current Code (lines 99-108):**
```tsx
export function getLocalComparisons(): SavedComparison[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedComparison[];
  } catch (error) {
    console.error('Error loading local comparisons:', error);
    return [];
  }
}
```

**Proposed Fix:**
```tsx
export function getLocalComparisons(): SavedComparison[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.error('[savedComparisons] localStorage data is not an array, clearing');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return [];
    }

    // Filter out corrupted entries
    const valid = parsed.filter((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const c = item as Record<string, unknown>;
      return c.id && c.result && c.savedAt;
    });

    if (valid.length !== parsed.length) {
      console.warn(`[savedComparisons] Filtered ${parsed.length - valid.length} corrupted entries`);
      // Save cleaned data back
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(valid));
    }

    return valid as SavedComparison[];
  } catch (error) {
    console.error('[savedComparisons] localStorage corrupted, clearing:', error);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return [];
  }
}
```

**Risk:** Could delete valid data if validation is too strict.

---

## Diagnostic Checklist

If saved reports still fail after Phase 1, check the browser console for these messages:

| Console Message | Meaning | Next Step |
|-----------------|---------|-----------|
| `[SavedComparisons] comparison is undefined` | Click handler received null | Check how list items are rendered |
| `[SavedComparisons] comparison.result is undefined` | Data structure corrupted | Check localStorage directly |
| `[SavedComparisons] Missing/invalid city1` | City data missing | Implement Phase 3 type validation |
| `[JudgeTab] Selected comparison not found` | ID mismatch | Implement Phase 2 memoization |
| `[JudgeTab] Standard/Enhanced comparison missing city data` | Partial corruption | Check save logic |

---

## How to Check localStorage Directly

Open browser DevTools (F12) > Console, run:

```javascript
// View all saved comparisons
console.log(JSON.parse(localStorage.getItem('lifescore_saved_comparisons')));

// View enhanced comparisons
console.log(JSON.parse(localStorage.getItem('lifescore_saved_enhanced')));

// Check for corruption
const data = localStorage.getItem('lifescore_saved_comparisons');
try {
  const parsed = JSON.parse(data);
  console.log('Valid JSON, entries:', parsed.length);
  parsed.forEach((c, i) => {
    if (!c.result?.city1 || !c.result?.city2) {
      console.error('Corrupted entry at index', i, c);
    }
  });
} catch (e) {
  console.error('JSON corrupted:', e);
}
```

---

## Contact

If issues persist after implementing these fixes, the problem may be in:
1. The comparison generation/save logic (data never saved correctly)
2. Supabase sync overwriting local data
3. Browser-specific localStorage issues
