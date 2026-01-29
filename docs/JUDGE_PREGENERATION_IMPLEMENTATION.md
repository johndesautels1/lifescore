# Judge Pre-Generation Implementation Plan

**Created:** 2026-01-29
**Conversation ID:** LS-JUDGE-PREGEN-20260129
**Status:** In Progress

---

## Overview

Implement background pre-generation of Judge Report and Video after city comparison completes. This eliminates the 90+ second wait when users click the Judge tab.

**Current Flow (slow):**
```
User clicks Judge tab → Wait 30s for report → Wait 60s for video → Display
```

**New Flow (fast):**
```
Comparison completes → Background: Start report + video generation
User clicks Judge tab → Check database → Instant display (or show progress)
```

---

## Files Requiring Changes

### TRACKING TABLE

| # | File | Change Required | Status | Commit |
|---|------|-----------------|--------|--------|
| 1 | `src/App.tsx` | Add background trigger after comparison completes | PENDING | - |
| 2 | `src/components/EnhancedComparison.tsx` | Fire non-blocking API call when results ready | PENDING | - |
| 3 | `src/components/JudgeTab.tsx` | Check database FIRST before showing generate button | PENDING | - |
| 4 | `src/hooks/useJudgeVideo.ts` | Add method to check if video exists in DB | PENDING | - |
| 5 | `src/services/judgePregenService.ts` | NEW FILE: Service for background generation | PENDING | - |
| 6 | `api/judge-report.ts` | Add comparison_id to response for DB lookup | PENDING | - |
| 7 | `api/avatar/generate-judge-video.ts` | Already caches - verify working | PENDING | - |
| 8 | `src/types/judge.ts` | NEW FILE: Shared types for pre-generation | PENDING | - |

---

## Implementation Steps

### Step 1: Create Judge Pre-generation Service
**File:** `src/services/judgePregenService.ts`

```typescript
// Non-blocking service to trigger background generation
// Does NOT wait for response - fire and forget
// Stores job status in database for JudgeTab to query
```

**Functions needed:**
- `startBackgroundReportGeneration(comparison)` - Fires API call, doesn't wait
- `startBackgroundVideoGeneration(report)` - Fires API call, doesn't wait
- `checkReportStatus(comparisonId)` - Query DB for existing report
- `checkVideoStatus(comparisonId)` - Query DB for existing video

### Step 2: Create Shared Types
**File:** `src/types/judge.ts`

```typescript
interface PregenStatus {
  reportStatus: 'idle' | 'generating' | 'ready' | 'error';
  videoStatus: 'idle' | 'generating' | 'ready' | 'error';
  reportId?: string;
  videoUrl?: string;
  error?: string;
}
```

### Step 3: Modify EnhancedComparison.tsx
**Location:** After `buildEnhancedResultFromJudge()` completes

```typescript
// After comparison is complete and saved:
import { startBackgroundReportGeneration } from '../services/judgePregenService';

// Fire and forget - don't await
startBackgroundReportGeneration(enhancedResult);
```

### Step 4: Modify App.tsx
**Location:** `onResultsUpdate` callback

```typescript
// After results are stored:
// Trigger background generation if enhanced comparison
if (isEnhanced) {
  startBackgroundReportGeneration(result);
}
```

### Step 5: Modify JudgeTab.tsx
**Location:** Component mount / comparison change

```typescript
// On mount or when comparison changes:
useEffect(() => {
  // Check database for existing report
  const existing = await checkReportStatus(comparisonId);
  if (existing.reportStatus === 'ready') {
    setJudgeReport(existing.report);
    // Also check video
    const videoStatus = await checkVideoStatus(comparisonId);
    if (videoStatus === 'ready') {
      setVideoUrl(videoStatus.videoUrl);
    }
  } else if (existing.reportStatus === 'generating') {
    // Show progress indicator, start polling
  }
}, [comparisonId]);
```

### Step 6: Modify useJudgeVideo.ts
**Add method:**

```typescript
// Check if video already exists for this comparison
async function checkExistingVideo(comparisonId: string): Promise<JudgeVideo | null> {
  const response = await fetch(`/api/avatar/video-status?comparisonId=${comparisonId}`);
  // Return video if exists and completed
}
```

### Step 7: Verify API Endpoints
**api/judge-report.ts:**
- Ensure it saves to `judge_reports` table with `comparison_id`
- Return `comparison_id` in response

**api/avatar/generate-judge-video.ts:**
- Already caches in `avatar_videos` table
- Verify `comparison_id` index exists

---

## Database Requirements

### Existing Tables (verify these exist):

```sql
-- judge_reports table
SELECT * FROM judge_reports LIMIT 1;

-- avatar_videos table
SELECT * FROM avatar_videos LIMIT 1;
```

### Required Indexes:

```sql
-- For fast lookup by comparison_id
CREATE INDEX IF NOT EXISTS idx_judge_reports_comparison_id ON judge_reports(comparison_id);
CREATE INDEX IF NOT EXISTS idx_avatar_videos_comparison_id ON avatar_videos(comparison_id);
```

---

## Testing Checklist

- [ ] Run enhanced comparison
- [ ] Check console for "[JudgePregen] Starting background generation..."
- [ ] Check Supabase for new row in judge_reports
- [ ] Check Replicate for new prediction
- [ ] Navigate to Judge tab
- [ ] Verify report loads instantly from DB
- [ ] Verify video loads instantly (or shows progress if still generating)

---

## Rollback Plan

If issues occur:
1. Comment out background trigger in EnhancedComparison.tsx
2. JudgeTab will fall back to on-demand generation
3. No data loss - existing flow still works

---

## Commit Strategy

Each file change gets its own commit for traceability:

1. `feat(judge): add pre-generation service`
2. `feat(judge): add shared types for pre-generation`
3. `feat(judge): trigger background generation after comparison`
4. `feat(judge): check database first in JudgeTab`
5. `feat(judge): add existing video check to useJudgeVideo`
6. `feat(api): add comparison_id to judge-report response`
7. `docs: update technical manual with pre-generation`

---

## Files NOT Requiring Changes

These files are read-only or unaffected:
- `api/judge.ts` - Consensus builder, not report generator
- `api/judge-video.ts` - D-ID fallback, not primary
- `src/services/opusJudge.ts` - Helper functions only
- `src/components/JudgeVideo.tsx` - Wrapper component
- `src/components/CourtOrderVideo.tsx` - Separate feature
- Database migrations - Tables already exist

---

## Verification Attestation

After implementation, fill in this table:

| # | File | Change Made | Verified Working | Commit Hash |
|---|------|-------------|------------------|-------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |
| 6 | | | | |
| 7 | | | | |
| 8 | | | | |

**Attestation:** I, Claude, attest that all files listed above have been modified, tested, and committed. No files were missed.

**Date:** ___________
**Final Commit:** ___________
