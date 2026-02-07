# LIFE SCORE - Grand Master ToDo List

## Last Updated: 2026-02-07
## Session: LS-SESSION15-20260206

---

# PRIORITY 1: DATABASE ARCHITECTURE UPGRADE

## Gamma Report Storage - Supabase Implementation

### Current State
- Reports saved to `gamma_reports` table with URLs only
- Actual report content hosted on Gamma's servers
- No distinction between Standard (35 pages) and Enhanced (82 pages) reports
- Risk: If Gamma deletes reports or goes down, users lose access

### Target State
- Full HTML snapshots stored in Supabase Storage
- Metadata in database for fast queries
- Report sharing via token system
- Access logging for analytics

---

## RECOMMENDED DATABASE SCHEMA

### 1. Reports Table (Replace/Upgrade `gamma_reports`)

```sql
-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Report metadata
  report_type TEXT DEFAULT 'enhanced_freedom_comparison',
  version TEXT DEFAULT 'v4.0',

  -- Cities compared
  city1_name TEXT NOT NULL,
  city1_country TEXT NOT NULL,
  city2_name TEXT NOT NULL,
  city2_country TEXT NOT NULL,

  -- Results
  winner TEXT NOT NULL,
  winner_score INTEGER NOT NULL,
  loser_score INTEGER NOT NULL,
  score_difference INTEGER NOT NULL,

  -- Storage
  gamma_doc_id TEXT,          -- If Gamma provides a doc ID
  gamma_url TEXT,             -- Public Gamma URL
  pdf_url TEXT,               -- If you export to PDF
  html_snapshot TEXT,         -- Full HTML for archival (or URL to storage)
  html_storage_path TEXT,     -- Path in Supabase Storage

  -- Status
  status TEXT DEFAULT 'generating',  -- generating, completed, failed
  generation_started_at TIMESTAMPTZ DEFAULT NOW(),
  generation_completed_at TIMESTAMPTZ,
  generation_duration_seconds INTEGER,

  -- Metadata
  page_count INTEGER,
  total_metrics INTEGER DEFAULT 100,
  llm_consensus_confidence INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'),

  -- Validation
  CONSTRAINT valid_scores CHECK (
    winner_score >= 0 AND winner_score <= 100 AND
    loser_score >= 0 AND loser_score <= 100
  )
);

-- Indexes for fast queries
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_cities ON reports(city1_name, city2_name);
```

### 2. Report Access Logs (Analytics)

```sql
CREATE TABLE report_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_type TEXT,  -- view, download, share
  ip_address INET,
  user_agent TEXT
);
```

### 3. Report Shares (Sharing System)

```sql
CREATE TABLE report_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES auth.users(id),
  share_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket policies
CREATE POLICY "Users can upload own reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## STORAGE APPROACH: Option 2 (Recommended)

**Supabase Storage + Database Metadata**

### Why This Approach:
- Keeps database lean (no 2MB HTML blobs in rows)
- CDN-backed for fast global access
- Can set expiration policies
- Cost-effective ($0.021/GB storage, $0.09/GB bandwidth)

### Cost Estimate:
- 1,000 reports = 1-2GB = $0.04/month storage
- 10,000 views/month = $1.80/month bandwidth
- **Total: ~$2/month for 1,000 users**

---

## IMPLEMENTATION TASKS

### Phase 1: Database Schema - COMPLETED (Session 16)
- [x] Create new `reports` table in Supabase
- [x] Create `report_access_logs` table
- [x] Create `report_shares` table
- [x] Set up RLS policies
- [ ] Create Supabase Storage bucket `reports` (manual step in dashboard)
- [ ] Run migration: `supabase/migrations/20260207_create_reports_storage.sql`

### Phase 2: TypeScript Types - COMPLETED (Session 16)
- [x] Update `src/types/database.ts` with new interfaces
- [x] Add `Report`, `ReportInsert`, `ReportUpdate` types
- [x] Add `ReportShare`, `ReportAccessLog` types
- [x] Add `ReportWithHtml`, `ReportSummary` types

### Phase 3: Service Layer - COMPLETED (Session 16)
- [x] Create `src/services/reportStorageService.ts`
- [x] Implement `saveReport()` - uploads HTML to Supabase Storage
- [x] Implement `getReport()` - fetches metadata
- [x] Implement `getReportWithHtml()` - fetches metadata + HTML
- [x] Implement `shareReport()` - generates share tokens
- [x] Implement `getSharedReport()` - access via token
- [x] Implement `logReportAccess()` - analytics logging
- [x] Implement `getReportAnalytics()` - access stats

### Phase 4: Integration - PARTIALLY COMPLETED (Session 16)
- [x] Update `gammaService.ts` to use new storage
- [x] Created `generateAndSaveEnhancedReport()` wrapper function
- [ ] Update VisualsTab.tsx to use `generateAndSaveEnhancedReport`
- [ ] Add report dashboard showing user's saved reports
- [ ] Create `/api/proxy-gamma` endpoint for CORS issues

### Phase 5: Migration - PENDING
- [ ] Migrate existing `gamma_reports` data to new `reports` table
- [ ] Deprecate old `gamma_reports` table
- [ ] Update usage tracking to use new table

---

## CODE SNIPPETS FOR IMPLEMENTATION

### Save Report to Storage

```typescript
const saveReportToStorage = async (
  userId: string,
  reportId: string,
  reportData: ReportData,
  gammaHtml: string
) => {
  const fileName = `${userId}/${reportId}.html`;

  // Upload HTML to storage
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('reports')
    .upload(fileName, gammaHtml, {
      contentType: 'text/html',
      cacheControl: '3600',
      upsert: false
    });

  if (storageError) throw storageError;

  // Get public URL
  const { data: urlData } = supabase
    .storage
    .from('reports')
    .getPublicUrl(fileName);

  // Save metadata to database
  const { data, error } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      report_type: reportData.reportType,  // 'standard' or 'enhanced'
      version: 'v4.0',
      city1_name: reportData.city1Name,
      city1_country: reportData.city1Country,
      city2_name: reportData.city2Name,
      city2_country: reportData.city2Country,
      winner: reportData.winner,
      winner_score: reportData.winnerScore,
      loser_score: reportData.loserScore,
      score_difference: reportData.scoreDifference,
      gamma_url: reportData.gammaUrl,
      html_storage_path: fileName,
      status: 'completed',
      generation_completed_at: new Date(),
      generation_duration_seconds: reportData.durationSeconds,
      page_count: reportData.pageCount,
      llm_consensus_confidence: reportData.confidence
    })
    .select()
    .single();

  return data;
};
```

### Get Report

```typescript
const getReport = async (reportId: string) => {
  // Get metadata
  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (!report) throw new Error('Report not found');

  // Fetch HTML from storage
  const { data: htmlData } = await supabase
    .storage
    .from('reports')
    .download(report.html_storage_path);

  const html = await htmlData?.text();

  // Log access
  await supabase.from('report_access_logs').insert({
    report_id: reportId,
    user_id: currentUserId,
    access_type: 'view'
  });

  return { ...report, html };
};
```

### Share Report

```typescript
const shareReport = async (reportId: string, expiresInDays = 30) => {
  const shareToken = crypto.randomUUID();

  const { data, error } = await supabase
    .from('report_shares')
    .insert({
      report_id: reportId,
      shared_by: userId,
      share_token: shareToken,
      expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      max_views: 100
    })
    .select()
    .single();

  const shareUrl = `https://clueslifescore.com/shared/${shareToken}`;
  return shareUrl;
};
```

---

## USER DASHBOARD UI

```
┌─────────────────────────────────────────────────────┐
│ Your Reports                                        │
├─────────────────────────────────────────────────────┤
│ ★ San Francisco vs Austin                          │
│ Winner: Austin (79 vs 68) • Enhanced • 82 pages    │
│ Generated: Feb 6, 2026                              │
│ [View Report] [Download PDF] [Share]               │
├─────────────────────────────────────────────────────┤
│ ★ New York vs Miami                                │
│ Winner: Miami (82 vs 71) • Standard • 35 pages     │
│ Generated: Feb 5, 2026                              │
│ [View Report] [Download PDF] [Share]               │
└─────────────────────────────────────────────────────┘
```

---

# PRIORITY 2: COMPLETED ITEMS (This Session)

## Enhanced Gamma Report v4.0 - DONE

### New Unique Sections Added:
- [x] "A Week In Your Life" - Narrative storytelling for each city
- [x] "Who Should Choose Which?" - 8 persona recommendations
- [x] "Surprising Findings" - Myth vs reality insights
- [x] "Hidden Costs of Restrictions" - Financial impact analysis
- [x] "5-Year Trajectory Forecast" - Future outlook predictions
- [x] "Your Next Steps" - Relocation checklists per city
- [x] Evidence from BOTH cities (fixed citation issue)
- [x] Beautiful AI images throughout (image-layout prompts)
- [x] "Thank You" closing page

### Gamma Syntax Fixes:
- [x] Heat maps: `dotGridStats` → `circleStats`
- [x] Image layouts: `background` → `behind`
- [x] Remove `split` layout (use `<columns>` instead)
- [x] Diagrams: Remove invalid `radar` type
- [x] Page count: 72-80 → **82 pages**
- [x] Timeout: 7.5 min → **15 min** (180 poll attempts)

### Progress Messages Updated:
- 0-2 min: "Generating your 82-page Premium Report..."
- 2-4 min: "Creating lifestyle narratives and AI images..."
- 4-6 min: "Analyzing 100 metrics across 6 categories..."
- 6-8 min: "Building category deep dives and heat maps..."
- 8-10 min: "Generating insights, forecasts, and checklists..."
- 10-12 min: "Finalizing evidence and closing pages..."
- 12+ min: "Almost done... Complex report nearly complete"

---

# PRIORITY 3: FUTURE ENHANCEMENTS

## Report Improvements
- [ ] Add PDF download directly to Supabase Storage
- [ ] Generate "Quick Summary" (first 20 pages) in 2-3 min, continue full report in background
- [ ] Add report comparison feature (compare two reports side by side)
- [ ] Add report templates for different use cases

## Visual Enhancements
- [ ] Add more Venn diagrams for overlapping freedoms
- [ ] Add sparklines for trend visualization
- [ ] Add waterfall charts for score breakdown
- [ ] Consider video summaries using Grok

## Analytics
- [ ] Track which report sections users view most
- [ ] A/B test report layouts
- [ ] User feedback collection per report

---

# SESSION HISTORY

| Session | Date | Key Changes |
|---------|------|-------------|
| LS-SESSION15 | 2026-02-06/07 | Enhanced Report v4.0, 82 pages, 6 new sections, Gamma syntax fixes, 15-min timeout |
| LS-SESSION16 | 2026-02-07 | Database architecture upgrade: reports table, storage service, sharing system |

---

*Last commit: TBD - Session 16 changes not yet committed*
