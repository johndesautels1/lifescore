# HANDOFF: Judge Tab - Phase C Complete (D-ID Video Integration)

**Date:** 2026-01-24
**Conversation ID:** LIFESCORE-JUDGE-TAB-20260124
**Status:** Phase C Complete - D-ID Video Integration Done

> **UPDATE 2026-01-29:** Voice configuration has been updated:
> - Primary: Replicate SadTalker + ElevenLabs (`api/avatar/generate-judge-video.ts`)
> - Fallback: D-ID + ElevenLabs (`api/judge-video.ts`)
> - Both now use ElevenLabs Christiano voice: `ZpwpoMoU84OhcbA2YBBV`
> - Env var: `ELEVENLABS_CHRISTIANO_VOICE_ID`
> - Old Microsoft voice references below are outdated.

---

## What Was Built (Phase C)

### Files Created
1. **`api/judge-video.ts`** - D-ID Talks API video generation endpoint
   - `action: 'generate'` - Creates video from JudgeReport
   - `action: 'status'` - Polls video generation status via talkId
   - Video script generator from JudgeReport data
   - **SEPARATE env vars from Olivia** to prevent config mixing:
     - `DID_API_KEY` (shared - same D-ID account)
     - `DID_JUDGE_PRESENTER_URL` (Judge-specific avatar image)
     - `DID_JUDGE_VOICE_ID` (Judge-specific voice - male)

### Files Modified
1. **`src/components/JudgeTab.tsx`** - Video integration:
   - `generateJudgeVideo()` - Initiates video generation
   - `pollVideoStatus()` - Polls D-ID every 5s until ready/error
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

## CRITICAL: Separation from Olivia

**Judge (Christian) uses:**
- `DID_API_KEY` - Shared D-ID account API key
- `DID_JUDGE_PRESENTER_URL` - URL to Christian's avatar image
- `DID_JUDGE_VOICE_ID` - Male voice (default: `en-US-GuyNeural`)

**Olivia uses (DO NOT TOUCH):**
- `DID_PRESENTER_URL` - Olivia's avatar
- `DID_AGENT_ID` - Olivia's agent
- Microsoft Sonia voice (female)

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
  talkId: 'did-talk-id',
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
  talkId: 'did-talk-id'
}

// Response
{
  success: true,
  talkId: 'did-talk-id',
  status: 'pending' | 'generating' | 'ready' | 'error',
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
# D-ID API (shared with Olivia - same account)
DID_API_KEY=your-did-api-key

# JUDGE-SPECIFIC Configuration (Christian avatar)
DID_JUDGE_PRESENTER_URL=https://your-bucket/christian-avatar.png
DID_JUDGE_VOICE_ID=en-US-GuyNeural  # Optional, defaults to this male voice

# Olivia's config (DO NOT USE FOR JUDGE):
# DID_PRESENTER_URL - Olivia only
# DID_AGENT_ID - Olivia only
```

---

## Video Generation Flow

```
1. User clicks "Generate Judge's Verdict"
   |
2. handleGenerateReport() calls /api/judge-report
   |
3. Claude Opus 4.5 generates JudgeReport
   |
4. generateJudgeVideo(report) called automatically
   |
5. POST /api/judge-video { action: 'generate', report }
   - Script generated from report
   - D-ID Talks API video generation started
   - Returns talkId
   |
6. pollVideoStatus(talkId) starts polling every 5s
   |
7. UI shows "GENERATING VIDEO" with green pulsing animation
   |
8. When status = 'ready':
   - Update report.videoUrl
   - Update report.videoStatus = 'ready'
   - Save to localStorage
   - Video player shows generated video
   |
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
- D-ID Processing indicator with pulsing dot

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

1. Set environment variables in Vercel:
   ```
   DID_API_KEY=your-did-key (may already exist for Olivia)
   DID_JUDGE_PRESENTER_URL=https://your-christian-avatar-image-url
   DID_JUDGE_VOICE_ID=en-US-GuyNeural (optional)
   ```

2. Run city comparison in enhanced mode

3. Click "Judges Report" tab

4. Click "GENERATE JUDGE'S VERDICT"

5. Watch states:
   - Report generation (blue rings, progress bar)
   - Video generation (green rings, D-ID indicator)

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

### D-ID Configuration
- Uses D-ID Talks API (POST /talks, GET /talks/{id})
- Pre-rendered video (not streaming like Olivia)
- Microsoft Azure TTS voices
- Default male voice: en-US-GuyNeural
- Stitch mode enabled for smoother video

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
If real-time interaction needed, reference `api/olivia/avatar/` for D-ID streaming implementation.

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

- `api/judge-video.ts` - D-ID video generation API endpoint
- `api/judge-report.ts` - Report generation API endpoint
- `src/components/JudgeTab.tsx` - UI component with full implementation
- `src/components/JudgeTab.css` - Styling with video states

---

## Notes

1. **Video Generation Time** - D-ID typically takes 30-120 seconds
2. **Rate Limiting** - Uses 'heavy' preset (10 req/min)
3. **Error Handling** - Graceful fallback with retry option
4. **Cost Consideration** - Each video costs D-ID credits
5. **Separation** - Judge config is COMPLETELY SEPARATE from Olivia

---

**Commits this session:**
- Phase C: D-ID Video Integration (api/judge-video.ts, JudgeTab.tsx video integration, CSS video states)
- Switched from HeyGen to D-ID Talks API for Judge video generation
