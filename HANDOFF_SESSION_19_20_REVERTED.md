# Session 19 & 20 Reverted Features - Handoff Document

**Date:** February 8, 2026
**Reverted To:** Commit `b067799` (Feb 7, ~21:48)
**Reason:** Session 19's global comparison cache feature caused critical bugs - LLM calls hung indefinitely due to missing timeout on Supabase cache queries.

---

## CRITICAL: What NOT to Re-add

### Global Comparison Cache (Session 19) - DO NOT RE-ADD WITHOUT MAJOR REWORK

**Commits:** `b871fa7`, `69f0f96`, `cefa07b`

The cache feature added to `api/evaluate.ts` had these fatal flaws:
1. **No timeout on cache query** - When Supabase is slow, the entire LLM request hangs forever
2. **Added Supabase to critical path** - Every LLM call now depends on database availability
3. **90-day TTL is too long** - City data changes, stale results are problematic

**If re-implementing, requirements:**
- Cache query MUST have 2-3 second timeout with fallback to fresh call
- Cache should be "best effort" - never block the main flow
- Consider shorter TTL (7-14 days max)
- Add circuit breaker pattern for repeated cache failures

---

## Features That CAN Be Re-added (With Care)

### 1. Comparison Type Badges on Saved Page
**Commit:** `455bd7c`
**Description:** Shows "Enhanced" vs "Standard" badge on saved comparisons
**Status:** Safe to re-add
**Files:** `SavedComparisons.tsx`, `SavedComparisons.css`

### 2. Database Sync Spinner
**Commits:** `d2050b8`, `c9d364b`
**Description:** Shows "Database Sync in Progress" with spinner when syncing from Supabase
**Status:** Safe to re-add
**Files:** `SavedComparisons.tsx`, `SavedComparisons.css`

### 3. PWA Rotation Support
**Commit:** `9234160`
**Description:** Changed PWA orientation from `portrait-primary` to `any` to allow rotation
**Status:** Safe to re-add
**Files:** `manifest.json` or `vite.config.ts`

### 4. Emoji Variation Selectors for Samsung/Android
**Commit:** `d34e680`
**Description:** Added variation selectors to emojis for better Android compatibility
**Status:** Safe to re-add
**Files:** Various component files using emojis

### 5. Login Text Color Change
**Commit:** `1786abb`
**Description:** Changed login text to golden orange for better visibility
**Status:** Safe to re-add
**Files:** `LoginScreen.css` or related

### 6. "No saved comparisons" Text Color
**Commit:** `bc6e254`
**Description:** Changed empty state text to crisp yellow (#FFD700)
**Status:** Safe to re-add
**Files:** `SavedComparisons.css`

---

## CSS Scoping Fixes - ALREADY RE-APPLIED

These fixes were re-applied in the current session:

### Commit `165548c` - CostDashboard.css scoping
- Scoped `.action-btn` to `.cost-dashboard .action-btn`

### Commit `34d3bcd` - EnhancedComparison.css & JudgeTab.css scoping
- Scoped `.action-btn` to `.enhanced-results .action-btn`
- Scoped `.action-btn` to `.judge-tab .action-btn`

**These fixes prevent CSS cascade issues where action button styles leak globally.**

---

## Session 20 Bug Fixes That Were Attempting to Fix Session 19 Bugs

These commits were trying to fix bugs introduced by Session 19:

| Commit | Description | Verdict |
|--------|-------------|---------|
| `88367fd` | Cache timeout + state management | Was incomplete, had TypeScript errors |
| `178b861` | Fix TypeScript errors | Fixed wrong property names |
| `78e4d1a` | Toolbar button size | May be valid, review needed |
| `cd56594` | Simplify handleLoad | Removed defensive checks |
| `75322c2` | Remove auto-collapse | Behavioral change |
| Various | CSS scoping attempts | Partially correct, we re-did properly |

---

## State Management Bugs Identified (Not Yet Fixed)

These bugs were identified but the fixes were reverted:

1. **llmStates not reset on new compare** - `App.tsx` `handleCompare` should reset `llmStates` Map
2. **llmStates not restored when loading saved comparison** - `handleLoadSavedComparison` should restore state
3. **pendingCities not cleared on new compare** - Can cause stale city data
4. **judgeResult not cleared on new compare** - Old judge verdict persists

**Location:** `App.tsx` around lines 337-400

---

## Files Most Affected

| File | Changes | Risk |
|------|---------|------|
| `api/evaluate.ts` | Cache logic removed | Low (reverted cleanly) |
| `src/App.tsx` | State management | Medium (needs review) |
| `src/components/SavedComparisons.tsx` | UI changes | Low |
| `src/components/SavedComparisons.css` | Styling | Low |
| `src/services/savedComparisons.ts` | Sync logic | Medium |

---

## Recommended Approach for Next Agent

1. **DO NOT** attempt to re-add the global cache without proper timeout handling
2. **Start with cosmetic changes** (badges, colors, spinner) - low risk
3. **Review state management** in App.tsx before making changes
4. **Test on production** after each small change
5. **Keep commits small and focused** - one feature per commit

---

## Current Production State

- Commit: `34d3bcd`
- All Session 19/20 features reverted except CSS scoping fixes
- Application is stable and functional
- No cache feature (all LLM calls go direct)

---

**Prepared by:** Claude Opus 4.5
**Session:** February 8, 2026 (Session 21 - Recovery)
