# HANDOFF: Judge Tab - Phase B Complete (Claude Opus API Integration)

**Date:** 2026-01-24
**Conversation ID:** LIFESCORE-JUDGE-TAB-20260124
**Status:** Phase B Complete - Claude Opus API Integration Done

---

## What Was Built (Phase B)

### Files Created
1. **`api/judge-report.ts`** - Claude Opus 4.5 comprehensive Judge Report API endpoint
2. **`supabase/migrations/20260124_create_judge_reports.sql`** - Database migration for Judge reports

### Files Modified
1. **`src/components/JudgeTab.tsx`** - Full Phase B implementation:
   - `handleGenerateReport()` - API integration with progress tracking
   - `saveReportToLocalStorage()` - Local caching
   - `saveReportToSupabase()` - Cloud storage for authenticated users
   - `handleSaveReport()` - Manual save functionality
   - `handleDownloadReport()` - PDF generation and download
   - `handleForwardReport()` - Share via Web Share API / clipboard
   - `generatePDFContent()` - Rich HTML report generation
   - Auto-load cached reports on mount

---

## API Endpoint: `/api/judge-report`

### Request
```typescript
POST /api/judge-report
{
  comparisonResult: EnhancedComparisonResult,
  userId: string
}
```

### Response
```typescript
{
  success: boolean,
  report: JudgeReport,
  latencyMs: number
}
```

### Features
- Calls Claude Opus 4.5 (`claude-opus-4-5-20251101`)
- 240 second timeout (within Vercel Pro 300s limit)
- Comprehensive prompt including:
  - All metric scores and consensuses
  - Evidence/sources from 5 evaluator LLMs
  - Trend analysis instructions
  - Political/cultural shift considerations
  - Future forecasting guidelines
- Parses structured JSON response into `JudgeReport` type
- Includes all 6 category analyses

---

## Claude Opus Prompt Structure

The Judge prompt instructs Opus to:
1. **Look beyond scores** - Analyze lived reality of freedom
2. **Assess trends** - Rising, stable, or declining freedom
3. **Consider political shifts** - Recent elections, pending legislation
4. **Provide definitive verdict** - Even if scores are close

### Output Format
```json
{
  "summaryOfFindings": {
    "city1Trend": "rising|stable|declining",
    "city2Trend": "rising|stable|declining",
    "overallConfidence": "high|medium|low"
  },
  "categoryAnalysis": [
    {
      "categoryId": "personal_freedom",
      "city1Analysis": "...",
      "city2Analysis": "...",
      "trendNotes": "..."
    }
    // ... 6 categories total
  ],
  "executiveSummary": {
    "recommendation": "city1|city2|tie",
    "rationale": "...",
    "keyFactors": ["Factor 1", ...],
    "futureOutlook": "...",
    "confidenceLevel": "high|medium|low"
  }
}
```

---

## Storage Implementation

### localStorage
- Key: `lifescore_judge_reports`
- Stores last 20 reports
- Auto-loads matching report on mount
- Reports matched by `comparisonId` or city names

### Supabase
- Table: `judge_reports`
- Row Level Security (RLS) enabled
- Indexed for performance
- Stores full report + denormalized fields for querying

### Supabase Table Schema
```sql
CREATE TABLE public.judge_reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  report_id TEXT UNIQUE,
  city1_name TEXT,
  city2_name TEXT,
  city1_score NUMERIC(5,2),
  city1_trend TEXT,
  city2_score NUMERIC(5,2),
  city2_trend TEXT,
  overall_confidence TEXT,
  recommendation TEXT,
  rationale TEXT,
  key_factors JSONB,
  future_outlook TEXT,
  confidence_level TEXT,
  category_analysis JSONB,
  full_report JSONB,
  video_url TEXT,
  video_status TEXT DEFAULT 'pending',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Download/Share Features

### PDF Download
- Generates rich HTML with dark theme styling
- Includes all report sections
- Downloads as `.html` file (can print to PDF)
- Styled with cockpit/James Bond aesthetic

### Forward/Share
- Uses Web Share API on supported devices
- Falls back to clipboard copy
- Generates concise summary text

---

## Phase C: HeyGen Video Integration

### Tasks
1. Configure "Cristiano" avatar in HeyGen
2. Create video script generator from JudgeReport
3. Implement `/api/judge-video` endpoint
4. Call HeyGen API to generate video
5. Store video URL in report
6. Update video player in JudgeTab
7. Implement video download

### HeyGen Integration Points
- `video_status` field tracks: pending → generating → ready → error
- `video_url` stores the generated video URL
- Existing `api/olivia/avatar/heygen.ts` provides pattern for HeyGen API calls

### Video Script Structure
```
"Welcome to the LIFE SCORE Judge's Verdict.

Today I'm comparing {city1} and {city2}.

After comprehensive analysis across {metrics_count} freedom metrics
evaluated by {llm_count} AI systems...

The verdict is: {winner} with {confidence} confidence.

{rationale_summary}

{future_outlook_summary}

This has been Cristiano, your Judge. Thank you for using LIFE SCORE."
```

---

## Resume Command

```
Resume Judge Tab Phase C.

Conversation ID: LIFESCORE-JUDGE-TAB-20260124
Repo: D:\LifeScore

Read: D:\LifeScore\docs\handoffs\HANDOFF_JUDGE_TAB_PHASE_B_20260124.md

TASK: HeyGen video integration for Cristiano avatar
- Create api/judge-video.ts endpoint
- Generate video script from JudgeReport
- Implement HeyGen video generation
- Update video player with streaming
- Add video download functionality
```

---

## Testing Phase B

1. Run city comparison in enhanced mode
2. Click "Judges Report" tab
3. Click "GENERATE JUDGE'S VERDICT" button
4. Watch progress bar animate
5. When complete:
   - Summary of Findings shows scores and trends
   - Detailed Analysis shows category breakdowns
   - Executive Summary shows verdict, rationale, key factors
6. Test action buttons:
   - Save Report (saves to localStorage + Supabase if signed in)
   - Download PDF (downloads HTML file)
   - Forward (copies summary to clipboard)

---

## Key Files

- `api/judge-report.ts` - API endpoint
- `src/components/JudgeTab.tsx` - UI component with full implementation
- `src/components/JudgeTab.css` - Styling
- `supabase/migrations/20260124_create_judge_reports.sql` - DB migration

---

## Notes for Phase C

1. **HeyGen API key required** - Set `HEYGEN_API_KEY` env var
2. **Cristiano avatar ID required** - Configure in HeyGen dashboard
3. **Video generation is async** - May take 30-60 seconds
4. **Consider streaming** - HeyGen supports WebRTC streaming
5. **Storage for videos** - May need Supabase storage bucket

---

**Commits this session:**
- Phase B: Judge Tab API Integration (api/judge-report.ts, JudgeTab.tsx updates, Supabase migration)
