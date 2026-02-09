# DATABASE & SUPABASE — Bug Report & Fix Plan
**Date:** 2026-02-09 | **Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Line-by-line reading of all 16 migrations, databaseService.ts, savedComparisons.ts, supabase.ts

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 1 | Race condition in sync mutex lock |
| HIGH | 5 | Schema conflicts, JSONB type guard, fire-and-forget saves |
| MEDIUM | 6 | Missing indexes, unbounded queries, timeout gaps, RLS permissiveness |
| LOW | 3 | Connection pooling, subscription enforcement |
| **TOTAL** | **15** | |

**RLS Status:** All tables properly protected. 2 tables overly permissive (avatar_videos, contrast_image_cache).

---

## CRITICAL ISSUE

### 1. Boolean Mutex Lock Has Race Condition — Data Corruption Risk
**File:** `src/services/savedComparisons.ts:1815-2109`

```typescript
let databaseSyncLock = false;  // Line 1815 — GLOBAL BOOLEAN

export async function fullDatabaseSync() {
  if (databaseSyncLock) return;  // NOT ATOMIC
  databaseSyncLock = true;       // Line 2012
  // ... 10-30 second sync operation
  databaseSyncLock = false;      // Line 2107
}
```

**Problem:** JavaScript boolean check is NOT atomic across async gaps. Two concurrent calls can both pass the check before either sets the lock. Both run fullDatabaseSync simultaneously → data corruption.

**Real scenario:** Desktop saves comparison → sync starts → Mobile opens app → sync also starts → Desktop's update lost when Mobile's stale data overwrites.

**Fix:** Use Promise-based lock or Supabase advisory locks:
```typescript
let syncPromise: Promise<any> | null = null;
export async function fullDatabaseSync() {
  if (syncPromise) return syncPromise;
  syncPromise = doSync().finally(() => { syncPromise = null; });
  return syncPromise;
}
```
**Effort:** 1 hour

---

## HIGH ISSUES

### 2. avatar_videos Table Defined Twice with Conflicts
**Files:** `supabase/migrations/003_avatar_videos.sql:22` vs `20260125_create_judge_tables.sql:15`
**Problem:** Different UNIQUE constraint definitions. Migration ordering determines which runs.
**Fix:** Consolidate to single definition. Add `DROP TABLE IF EXISTS` guard.
**Effort:** 30 min

### 3. judge_reports CHECK Constraint Mismatch
**Files:** `migrations/20260124_create_judge_reports.sql` vs `20260125_create_judge_tables.sql`
**Problem:** `city1_trend` accepts `'rising'` in one migration, `'improving'` in another. Code uses `'improving'` (savedComparisons.ts:1140) but earlier migration accepts only `'rising'`.
**Fix:** Consolidate CHECK constraints to match code.
**Effort:** 20 min

### 4. JSONB llmsUsed Round-Trip Vulnerable
**File:** `src/services/savedComparisons.ts:251-269`
**Problem:** `isEnhancedComparisonResult()` checks `Array.isArray(r.llmsUsed)` but doesn't validate array ELEMENTS. Corrupted arrays like `[null, {}]` pass the guard.
**Fix:** Add element validation: `r.llmsUsed.every(item => item && typeof item === 'object' && 'name' in item)`
**Effort:** 15 min

### 5. Fire-and-Forget DB Saves Create Silent Failures
**File:** `src/services/savedComparisons.ts:444-458`
**Problem:** `dbSaveComparison()` runs in background with `.catch(console.error)`. User thinks save succeeded but DB has no record. Next sync may overwrite with stale data.
**Fix:** Await the save or queue for retry on failure.
**Effort:** 30 min

### 6. Destructive ALTER TABLE with No Ordering Guard
**File:** `supabase/migrations/20260207_add_city_columns_to_gamma_reports.sql:7-9`
**Problem:** Relies on filename sort for execution order. If run before 001_initial_schema, would fail.
**Fix:** Add explicit dependency comments and IF NOT EXISTS guards.
**Effort:** 10 min

---

## MEDIUM ISSUES

| # | File | Issue | Fix |
|---|------|-------|-----|
| 7 | Multiple migrations | Missing composite indexes on (user_id, created_at DESC) for gamma_reports, judge_reports, reports | Add 3 indexes |
| 8 | supabase.ts:96-100 | Promise.race timeout doesn't cancel hung Supabase connections | Use AbortController |
| 9 | databaseService.ts:638-647 | exportUserData() has no LIMIT on conversations/messages | Add `.limit(1000)` |
| 10 | migrations/003:77-79 | avatar_videos publicly readable without auth | Require authentication |
| 11 | migrations/20260128:34-35 | contrast_image_cache allows INSERT from any user | Restrict to service_role |
| 12 | savedComparisons.ts:2078-2091 | Partial sync failures reported as success | Track and report failed IDs |

---

## WHAT'S WORKING WELL

- Supabase client: 45s timeout, 3 retries with exponential backoff
- All core queries use efficient single SELECT + order + limit patterns
- No N+1 query patterns found
- RLS enabled on all tables with proper auth.uid() checks
- Proper cascade deletes on all FK relationships
- 21 indexes covering common queries

---

## FIX PRIORITY

| Phase | Effort | Items |
|-------|--------|-------|
| CRITICAL (now) | 1 hour | #1 mutex race condition |
| HIGH (this week) | 1.5 hours | #2-6 schema + type guards |
| MEDIUM (next sprint) | 2 hours | #7-12 indexes + policies |

---

Co-Authored-By: Claude
