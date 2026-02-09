# SAVING SYSTEM — Known Errors & Investigation
**Date:** 2026-02-09
**Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** End-to-end code trace of the entire save pipeline

---

## PRIMARY BUG: Enhanced Reports Don't Appear on Saved Page

**Status:** Under investigation — code reads correctly on paper, likely runtime/timing issue
**Reported by:** User (confirmed reproducible)
**Previous fix attempts:** 5+ sessions with Claude Code 4.5, all unsuccessful

---

## COMPLETE SAVE FLOW TRACED

### Files Involved (all read line-by-line):
1. `src/components/EnhancedComparison.tsx:1383-1403` — Save button + handleSave
2. `src/services/savedComparisons.ts:636-694` — saveEnhancedComparisonLocal
3. `src/services/savedComparisons.ts:576-631` — getLocalEnhancedComparisons (with type guard)
4. `src/services/savedComparisons.ts:617-631` — saveLocalEnhancedComparisons
5. `src/services/savedComparisons.ts:139-167` — safeLocalStorageSet (quota handling)
6. `src/services/databaseService.ts:90-134` — dbSaveComparison (Supabase upsert)
7. `src/components/SavedComparisons.tsx:77-121` — syncAndLoadComparisons
8. `src/services/savedComparisons.ts:2000-2109` — fullDatabaseSync
9. `src/components/SavedComparisons.tsx:123-145` — loadComparisons
10. `src/App.tsx:319-321` — handleSaved (setSavedKey)
11. `src/App.tsx:286-317` — handleLoadSavedComparison
12. `src/services/opusJudge.ts:26-34` — generateDeterministicId

---

## CONFIRMED BUG #1: Wrong localStorage Key for Badge Count

**File:** `src/App.tsx:162`
**Severity:** MEDIUM — misleading UI, user sees wrong saved count

```typescript
// WRONG:
const saved = localStorage.getItem('lifescore_comparisons');

// SHOULD BE:
const saved = localStorage.getItem('lifescore_saved_comparisons');
```

The actual storage keys are:
- Standard: `lifescore_saved_comparisons` (defined at savedComparisons.ts:123)
- Enhanced: `lifescore_saved_enhanced` (defined at savedComparisons.ts:124)

But App.tsx:162 reads `lifescore_comparisons` — a key that DOESN'T EXIST. The tab badge always shows 0 or stale data. This makes it LOOK like nothing saved even when comparisons ARE saved.

**Fix:** Read both keys and sum counts:
```typescript
const standardSaved = localStorage.getItem('lifescore_saved_comparisons');
const enhancedSaved = localStorage.getItem('lifescore_saved_enhanced');
let count = 0;
try { count += JSON.parse(standardSaved || '[]').length; } catch {}
try { count += JSON.parse(enhancedSaved || '[]').length; } catch {}
setSavedCount(count);
```

---

## CONFIRMED BUG #2: `clearAllLocal()` Doesn't Clear Enhanced

**File:** `src/services/savedComparisons.ts:564-566`
**Severity:** LOW — inconsistent behavior but doesn't cause the main bug

```typescript
export function clearAllLocal(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY); // Only 'lifescore_saved_comparisons'
  // MISSING: localStorage.removeItem(ENHANCED_STORAGE_KEY);
}
```

"Clear All" button in SavedComparisons only removes standard comparisons. Enhanced persist invisibly.

---

## SUSPECTED BUG #3: JSONB Round-Trip May Lose `llmsUsed` Field

**File:** `src/services/savedComparisons.ts:2037-2060`
**Severity:** HIGH (if confirmed) — would cause enhanced comparisons to be misclassified

During `fullDatabaseSync`, comparisons pulled from Supabase are classified:
```typescript
const isEnhanced = 'llmsUsed' in compResult && Array.isArray(compResult.llmsUsed);
```

If the Supabase JSONB round-trip somehow doesn't preserve `llmsUsed` as an array (e.g., serializes as null, string, or object), the enhanced comparison gets classified as STANDARD and goes into the wrong storage bucket.

**To verify:** Check Supabase dashboard → `comparisons` table → inspect `comparison_result` JSONB for an enhanced comparison. Look for the `llmsUsed` field. If it's missing or not an array, this is the bug.

---

## SUSPECTED BUG #4: localStorage Quota on Large Enhanced Results

**Severity:** MEDIUM (if confirmed) — would show "Save failed" message

Enhanced comparisons are ~200KB each. localStorage limit is typically 5-10MB. If the user has many standard comparisons + other data, the save could fail silently.

`safeLocalStorageSet` handles this by removing oldest items. But if this is the FIRST enhanced comparison and quota is exceeded, there are no old items to remove, and the function returns `false`. The user would see "Save failed - try again."

**To verify:** Open browser DevTools → Application → Local Storage. Check total usage.

---

## INVESTIGATION RESULTS: What Reads Correctly

| Step | Code | Status |
|------|------|--------|
| Save button calls `handleSave` | EnhancedComparison.tsx:1383 | ✅ Correct |
| `handleSave` calls `saveEnhancedComparisonLocal(result)` | EnhancedComparison.tsx:1390 | ✅ Correct |
| `saveEnhancedComparisonLocal` writes to `lifescore_saved_enhanced` | savedComparisons.ts:657 | ✅ Correct |
| Fire-and-forget DB save via `dbSaveComparison` | savedComparisons.ts:677 | ✅ Correct |
| `onSaved()` triggers `setSavedKey++` | App.tsx:319-321 | ✅ Correct |
| SavedComparisons remount via `key={savedKey}` | App.tsx:983 | ✅ Correct |
| `syncAndLoadComparisons()` calls `fullDatabaseSync()` | SavedComparisons.tsx:84 | ✅ Correct |
| `fullDatabaseSync` merges DB + localStorage | savedComparisons.ts:2024-2070 | ✅ Correct |
| `loadComparisons` reads both standard + enhanced | SavedComparisons.tsx:123-145 | ✅ Correct |
| Enhanced comparisons shown with ⚡ badge | SavedComparisons.tsx:497-507 | ✅ Correct |
| Type guard validates enhanced data | savedComparisons.ts:204-226 | ✅ Correct |
| `handleLoadSavedComparison` detects enhanced | App.tsx:300-304 | ✅ Correct (FIX 2026-02-08) |
| DB schema: JSONB column + UNIQUE constraint | 001_initial_schema.sql:59,71 | ✅ Correct |

---

## RECOMMENDED DEBUGGING STEPS

Since the code reads correctly but the bug persists, runtime diagnostics are needed:

### Step 1: Add breadcrumb console.logs
```typescript
// In EnhancedComparison.tsx handleSave:
console.log('[SAVE-DEBUG] Step 1: handleSave called, comparisonId:', result.comparisonId);
console.log('[SAVE-DEBUG] Step 2: result has llmsUsed:', result.llmsUsed);
console.log('[SAVE-DEBUG] Step 3: result.city1.city:', result.city1?.city);

// In savedComparisons.ts saveEnhancedComparisonLocal:
console.log('[SAVE-DEBUG] Step 4: Before save, existing count:', comparisons.length);
console.log('[SAVE-DEBUG] Step 5: JSON size:', JSON.stringify(saved).length, 'bytes');
console.log('[SAVE-DEBUG] Step 6: saveSuccess:', saveSuccess);

// In SavedComparisons.tsx loadComparisons:
console.log('[SAVE-DEBUG] Step 7: enhanced from localStorage:', enhancedComparisons.length);
console.log('[SAVE-DEBUG] Step 8: total display comparisons:', allComparisons.length);
```

### Step 2: Check localStorage directly
Open DevTools → Application → Local Storage → look for key `lifescore_saved_enhanced`. If it exists and has data, the save worked. If empty or missing, the save failed.

### Step 3: Check Supabase
Dashboard → comparisons table → filter by your user_id → check if `comparison_result` JSONB has `llmsUsed` field as an array.

---

## RELATED ISSUES

### Eye Icon Missing on Mobile (SavedComparisons)
The "View" button (eye icon) in saved comparisons list is not visible on mobile vertical orientation. The button exists in the code (SavedComparisons.tsx:525-530) but may be CSS-hidden or clipped by overflow.

**Tracked in:** BUGS/mobile-ui-ux/ (separate audit)

---

Co-Authored-By: Claude
