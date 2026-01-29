# Bug Tracking - January 29, 2026

**Conversation ID:** LS-JUDGE-PREGEN-20260129
**Reported:** 2026-01-29 ~20:30 UTC
**Status:** IN PROGRESS

---

## Summary of Issues

| # | Bug | Severity | Component | Caused by Today's Commits? |
|---|-----|----------|-----------|---------------------------|
| 1 | NewLifeVideos "no supported sources" error | HIGH | VisualsTab | NO |
| 2 | Judge tab video/pic not rendering | HIGH | JudgeTab | POSSIBLY |
| 3 | Runaway console polling messages | MEDIUM | useJudgeVideo | YES |
| 4 | Save button stuck in depressed state | HIGH | EnhancedResults | NO |
| 5 | Saved reports not appearing | HIGH | SavedComparisons | NO |
| 6 | Supabase 406 Not Acceptable error | MEDIUM | Auth/Supabase | NO |
| 7 | judge_reports 400 Bad Request | HIGH | JudgeTab | FIXED (3ef88d6) |

---

## Bug #1: NewLifeVideos "No Supported Sources"

**Error Message:**
```
[NewLifeVideos] Play error: NotSupportedError: The element has no supported sources.
```

**Location:** `src/components/NewLifeVideos.tsx`

**Symptoms:**
- Video screens below Gamma display area don't render
- Video element has no valid URL to play

**Possible Causes:**
- [ ] Videos never generated (API failure)
- [ ] Video URLs are empty/null
- [ ] Grok/Kling API returning errors
- [ ] useGrokVideo hook not returning video URLs

**Files to Check:**
- `src/components/NewLifeVideos.tsx`
- `src/hooks/useGrokVideo.ts`
- `src/services/grokVideoService.ts`
- `api/video/grok-generate.ts`
- `api/video/grok-status.ts`

**Status:** NOT STARTED

---

## Bug #2: Judge Tab Video/Pic Not Rendering

**Symptoms:**
- Judge findings display screen doesn't work
- No picture, no video displayed

**Location:** `src/components/JudgeTab.tsx`

**Possible Causes:**
- [ ] checkExistingVideo returning null/error
- [ ] Video URL not being set in state
- [ ] Render condition not met
- [ ] API returning empty data

**Files to Check:**
- `src/components/JudgeTab.tsx`
- `src/hooks/useJudgeVideo.ts`
- `api/avatar/generate-judge-video.ts`
- `api/avatar/video-status.ts`

**Status:** NOT STARTED

---

## Bug #3: Runaway Console Polling Messages

**Symptoms:**
- Console messages increasing by hundreds every few seconds
- Likely video status polling running indefinitely

**Location:** `src/hooks/useJudgeVideo.ts`

**Root Cause (Identified):**
- `checkExistingVideo` calls `startPolling()` if video status is 'processing' or 'pending'
- If video never completes, polling runs forever

**Fix Needed:**
- Add max poll limit check before starting polling
- Or don't start polling from checkExistingVideo

**Status:** NOT STARTED

---

## Bug #4: Save Button Stuck in Depressed State

**Symptoms:**
- Save button appears already pressed/saved
- Report didn't actually save
- Button shows "Saved" state incorrectly

**Location:** `src/components/EnhancedComparison.tsx` (EnhancedResults)

**Possible Causes:**
- [ ] `isEnhancedComparisonSaved()` returning true incorrectly
- [ ] comparisonId mismatch between check and actual saved data
- [ ] localStorage corruption
- [ ] Race condition in save state

**Files to Check:**
- `src/components/EnhancedComparison.tsx` (lines 1290, 1364, 2180-2184)
- `src/services/savedComparisons.ts` (isEnhancedComparisonSaved)

**Status:** NOT STARTED

---

## Bug #5: Saved Reports Not Appearing

**Symptoms:**
- New comparison reports don't show in saved list
- Related to Bug #4 (save not actually working)

**Location:** `src/components/SavedComparisons.tsx`

**Possible Causes:**
- [ ] Save function failing silently
- [ ] localStorage key mismatch
- [ ] Data structure mismatch
- [ ] Supabase sync failing

**Files to Check:**
- `src/components/SavedComparisons.tsx`
- `src/services/savedComparisons.ts`

**Status:** NOT STARTED

---

## Bug #6: Supabase 406 Not Acceptable

**Error Message:**
```
Failed to load resource: the server responded with a status of 406 ()
```

**Symptoms:**
- Supabase requests failing with content negotiation error
- May be causing cascading auth failures

**Possible Causes:**
- [ ] Accept header mismatch
- [ ] Supabase client configuration issue
- [ ] CORS or middleware interference

**Status:** NOT STARTED (may resolve with other fixes)

---

## Bug #7: judge_reports 400 Bad Request (FIXED)

**Error Message:**
```
Failed to load resource: the server responded with a status of 400 ()
[JudgeTab] Supabase save error
```

**Root Cause:** Missing `comparison_id` field in Supabase insert

**Fix Applied:** Commit `3ef88d6` - Added `comparison_id: report.comparisonId` to insert

**Status:** FIXED - Pending verification after deploy

---

## Commits Today (For Reference)

```
3ef88d6 fix(judge): add missing comparison_id to Supabase insert
9b811e3 docs: add Judge pre-generation to Technical Support Manual
99a0324 docs: update pre-generation implementation tracking
deaed8b feat(judge): trigger background pre-generation after comparison
a4a3270 feat(judge): check for pre-generated video on JudgeTab mount
9f97941 feat(judge): add checkExistingVideo to useJudgeVideo hook
36e5d4e feat(judge): add pre-generation service
5477e1d feat(judge): add pre-generation types
```

---

## Resolution Progress

- [ ] Bug #1 diagnosed
- [ ] Bug #1 fixed
- [ ] Bug #2 diagnosed
- [ ] Bug #2 fixed
- [ ] Bug #3 diagnosed
- [ ] Bug #3 fixed
- [ ] Bug #4 diagnosed
- [ ] Bug #4 fixed
- [ ] Bug #5 diagnosed
- [ ] Bug #5 fixed
- [x] Bug #7 fixed (3ef88d6)
- [ ] All bugs verified in production
