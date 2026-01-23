# HANDOFF: Judge Tab - Phase C Complete (HeyGen Video Integration)

**Date:** 2026-01-24
**Conversation ID:** LIFESCORE-JUDGE-TAB-20260124
**Status:** Phase C Complete - HeyGen Video Integration Done

---

## What Was Built (Phase C)

### Files Created
1. **`api/judge-video.ts`** - HeyGen video generation endpoint
   - `action: 'generate'` - Creates video from JudgeReport
   - `action: 'status'` - Polls video generation status
   - Video script generator from JudgeReport data
   - Uses HEYGEN_CHRISTIAN_AVATAR_ID / HEYGEN_CHRISTIAN_VOICE_ID env vars

### Files Modified
1. **`src/components/JudgeTab.tsx`** - Video integration:
   - `generateJudgeVideo()` - Initiates video generation
   - `pollVideoStatus()` - Polls HeyGen every 5s until ready/error
   - Auto-triggers video after report generation
   - Multiple UI states: pending, generating, ready, error
   - Retry button for failed video generation

2. **`src/components/JudgeTab.css`** - New styles:
   - `.video-generating` state styles
   - `.video-ring` animation (green rings)
   - `.video-status-indicator` with pulsing dot
   - `.error-state` styling
   - `.video-pending` styling
   - `.retry-btn` button styling

---

## API Endpoint: `/api/judge-video`

### Generate Video
```typescript
POST /api/judge-video
{
  action: 'generate',
  report: JudgeReport
}

// Response
{
  success: true,
  videoId: 'heygen-video-id',
  status: 'pending',
  message: 'Video generation started...',
  script: '...' // Generated script for debugging
}
```

### Check Status
```typescript
POST /api/judge-video
{
  action: 'status',
  videoId: 'heygen-video-id'
}

// Response
{
  success: true,
  videoId: 'heygen-video-id',
  status: 'generating' | 'ready' | 'error',
  heygenStatus: 'pending' | 'processing' | 'completed' | 'failed',
  videoUrl: 'https://...' // When ready
}
```

---

## Video Script Template

```
Welcome to the LIFE SCORE Judge's Verdict.

I'm Christian, and I've conducted a comprehensive analysis comparing {city1} and {city2} across multiple dimensions of freedom and quality of life.

{city1} achieved a score of {score}, and is {trend}.
{city2} earned a score of {score}, and is {trend}.

After careful deliberation, my verdict is: {winner}, {confidence}.

{rationale}

The key factors in this decision include: {keyFactors}.

Looking ahead: {futureOutlook}

This has been the LIFE SCORE Judge's Verdict. Make informed decisions about where you live and work.
```

---

## Environment Variables Required

```bash
# HeyGen API
HEYGEN_API_KEY=your-heygen-api-key

# Christian Avatar Configuration
HEYGEN_CHRISTIAN_AVATAR_ID=your-avatar-id
HEYGEN_CHRISTIAN_VOICE_ID=your-voice-id  # Optional, uses avatar default if not set
```

---

## Video Generation Flow

```
1. User clicks "Generate Judge's Verdict"
   ↓
2. handleGenerateReport() calls /api/judge-report
   ↓
3. Claude Opus 4.5 generates JudgeReport
   ↓
4. generateJudgeVideo(report) called automatically
   ↓
5. POST /api/judge-video { action: 'generate', report }
   - Script generated from report
   - HeyGen video generation started
   - Returns videoId
   ↓
6. pollVideoStatus(videoId) starts polling every 5s
   ↓
7. UI shows "GENERATING VIDEO" with green pulsing animation
   ↓
8. When status = 'ready':
   - Update report.videoUrl
   - Update report.videoStatus = 'ready'
   - Save to localStorage
   - Video player shows generated video
   ↓
9. If error:
   - Update report.videoStatus = 'error'
   - Show retry button
```

---

## UI States

### 1. Initial State (No Report)
- Christian silhouette
- "CHRISTIAN - Judge's Video Report"
- "GENERATE JUDGE'S VERDICT" button

### 2. Generating Report
- Blue pulsing rings
- "ANALYZING EVIDENCE"
- Progress bar

### 3. Generating Video
- Green pulsing rings (`.video-ring`)
- "GENERATING VIDEO"
- "Christian is preparing your video report..."
- HeyGen Processing indicator with pulsing dot

### 4. Video Ready
- Video player with generated video
- Play/pause, seek, volume controls
- Download video button enabled

### 5. Video Error
- Warning icon
- "VIDEO UNAVAILABLE"
- "RETRY VIDEO GENERATION" button

### 6. Report Ready, Video Pending (cached report)
- Camera icon
- "VIDEO PENDING"
- "GENERATE VIDEO REPORT" button

---

## Testing Phase C

1. Set environment variables:
   ```
   HEYGEN_API_KEY=your-key
   HEYGEN_CHRISTIAN_AVATAR_ID=your-avatar-id
   ```

2. Run city comparison in enhanced mode

3. Click "Judges Report" tab

4. Click "GENERATE JUDGE'S VERDICT"

5. Watch states:
   - Report generation (blue rings, progress bar)
   - Video generation (green rings, HeyGen indicator)

6. When video is ready:
   - Video should auto-display in player
   - Test play/pause, seek, volume
   - Test "DOWNLOAD VIDEO" button

7. Test error recovery:
   - Disable API key temporarily
   - Verify error state shows
   - Verify retry button works

---

## Key Implementation Details

### Video Polling
- Polls every 5 seconds
- Cleans up on component unmount
- Uses ref to track interval for cleanup
- Maximum runtime: until ready or error (no timeout)

### Script Generation
- Extracts key data from JudgeReport
- Generates natural-sounding narration
- ~60-90 second video length target
- Includes scores, trends, verdict, rationale, outlook

### HeyGen Configuration
- Uses v2/video/generate API (not streaming)
- 1280x720 (16:9) resolution
- Dark background matching LIFE SCORE theme (#0a1628)
- Normal avatar style

---

## Phase D: Future Enhancements

### Potential Improvements
1. **Video Storage** - Store videos in Supabase Storage bucket
2. **Video Caching** - Re-use videos for same city comparisons
3. **Progress Estimation** - Show estimated time remaining
4. **Video Thumbnails** - Display thumbnail while loading
5. **Multiple Avatars** - Allow user to choose avatar
6. **Voice Selection** - Allow voice customization
7. **Video Sharing** - Direct link to hosted video

### Streaming Alternative
If real-time interaction needed, reference `api/olivia/avatar/heygen.ts` for WebRTC streaming implementation.

---

## Resume Command

```
Resume Judge Tab Phase D.

Conversation ID: LIFESCORE-JUDGE-TAB-20260124
Repo: D:\LifeScore

Read: D:\LifeScore\docs\handoffs\HANDOFF_JUDGE_TAB_PHASE_C_20260124.md

TASK: Video storage and caching improvements
- Store generated videos in Supabase Storage
- Cache videos by comparison ID
- Add video thumbnail generation
- Implement video sharing links
```

---

## Key Files

- `api/judge-video.ts` - Video generation API endpoint
- `api/judge-report.ts` - Report generation API endpoint
- `src/components/JudgeTab.tsx` - UI component with full implementation
- `src/components/JudgeTab.css` - Styling with video states

---

## Notes

1. **Video Generation Time** - HeyGen typically takes 30-120 seconds
2. **Rate Limiting** - Uses 'heavy' preset (10 req/min)
3. **Error Handling** - Graceful fallback with retry option
4. **Cost Consideration** - Each video costs HeyGen credits

---

**Commits this session:**
- Phase C: HeyGen Video Integration (api/judge-video.ts, JudgeTab.tsx video integration, CSS video states)
