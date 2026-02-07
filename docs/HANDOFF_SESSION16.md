# LIFE SCORE - Session 16 Handoff Document

## Previous Session: LS-SESSION15-20260206
## Handoff Date: 2026-02-07
## Next Task: Supabase Database Architecture Upgrade

---

# CONTEXT

## What Was Accomplished (Session 15)

### 1. Enhanced Gamma Report v4.0 (COMPLETE)
- Added 6 NEW unique sections not in web UI
- Report now generates **82 pages** (was 64)
- Includes AI-generated images throughout
- 15-minute timeout (was 7.5 min)

### 2. Files Modified
```
src/services/gammaService.ts  (+1,016 lines)
  - formatSectionLifeInEachCity()      - "A Week In Your Life" narratives
  - formatSectionPersonaRecommendations() - 8 persona recommendations
  - formatSectionSurprisingFindings()   - Myth vs Reality
  - formatSectionHiddenCosts()          - Financial impact analysis
  - formatSectionFutureOutlook()        - 5-year forecast
  - formatSectionNextSteps()            - Relocation checklists
  - formatSection8EvidenceClosingBothCities() - Fixed citations
  - Updated formatEnhancedReportForGamma() - New v4.0 prompt
  - Updated pollEnhancedUntilComplete() - 15-min timeout, new messages
```

### 3. Gamma Syntax Fixes Applied
- `dotGridStats` → `circleStats` (heat maps)
- `image-layout="background"` → `image-layout="behind"`
- Removed `image-layout="split"` (use `<columns>` instead)
- Removed `type="radar"` diagram (doesn't exist)
- Page count: 82 pages final

---

# YOUR TASK: Database Architecture Upgrade

## Problem
Currently, Gamma reports are stored as **URLs only** in `gamma_reports` table:
- If Gamma deletes reports or goes down, users lose access
- No distinction between Standard (35 pages) and Enhanced (82 pages)
- No report sharing capability
- No access analytics

## Solution
Implement Gamma's recommended architecture:
1. Store full HTML in Supabase Storage
2. Store metadata in new `reports` table
3. Add sharing via token system
4. Add access logging for analytics

---

# IMPLEMENTATION STEPS

## Phase 1: Supabase Setup (Run in SQL Editor)

### Create Reports Table
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT DEFAULT 'enhanced',  -- 'standard' or 'enhanced'
  version TEXT DEFAULT 'v4.0',
  city1_name TEXT NOT NULL,
  city1_country TEXT NOT NULL,
  city2_name TEXT NOT NULL,
  city2_country TEXT NOT NULL,
  winner TEXT NOT NULL,
  winner_score INTEGER NOT NULL,
  loser_score INTEGER NOT NULL,
  score_difference INTEGER NOT NULL,
  gamma_doc_id TEXT,
  gamma_url TEXT,
  pdf_url TEXT,
  html_storage_path TEXT,  -- Path in Supabase Storage
  status TEXT DEFAULT 'generating',
  generation_started_at TIMESTAMPTZ DEFAULT NOW(),
  generation_completed_at TIMESTAMPTZ,
  generation_duration_seconds INTEGER,
  page_count INTEGER,
  total_metrics INTEGER DEFAULT 100,
  llm_consensus_confidence INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 months'),
  CONSTRAINT valid_scores CHECK (
    winner_score >= 0 AND winner_score <= 100 AND
    loser_score >= 0 AND loser_score <= 100
  )
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_cities ON reports(city1_name, city2_name);
```

### Create Access Logs Table
```sql
CREATE TABLE report_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_type TEXT,
  ip_address INET,
  user_agent TEXT
);
```

### Create Shares Table
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

### Enable RLS
```sql
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON reports
  FOR DELETE USING (auth.uid() = user_id);
```

### Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create bucket named `reports`
3. Set to private (RLS controlled)
4. Add policies:
```sql
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

## Phase 2: TypeScript Types

### Update `src/types/database.ts`

Add these interfaces:

```typescript
export interface Report {
  id: string;
  user_id: string;
  report_type: 'standard' | 'enhanced';
  version: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  score_difference: number;
  gamma_doc_id: string | null;
  gamma_url: string | null;
  pdf_url: string | null;
  html_storage_path: string | null;
  status: 'generating' | 'completed' | 'failed';
  generation_started_at: string;
  generation_completed_at: string | null;
  generation_duration_seconds: number | null;
  page_count: number | null;
  total_metrics: number;
  llm_consensus_confidence: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ReportInsert {
  user_id: string;
  report_type?: 'standard' | 'enhanced';
  version?: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  score_difference: number;
  gamma_doc_id?: string | null;
  gamma_url?: string | null;
  pdf_url?: string | null;
  html_storage_path?: string | null;
  status?: 'generating' | 'completed' | 'failed';
  generation_duration_seconds?: number | null;
  page_count?: number | null;
  llm_consensus_confidence?: number | null;
}

export interface ReportShare {
  id: string;
  report_id: string;
  shared_by: string;
  share_token: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  created_at: string;
}

export interface ReportAccessLog {
  id: string;
  report_id: string;
  user_id: string | null;
  accessed_at: string;
  access_type: 'view' | 'download' | 'share';
  ip_address: string | null;
  user_agent: string | null;
}
```

---

## Phase 3: Create Report Storage Service

### Create `src/services/reportStorageService.ts`

```typescript
import { supabase } from '../lib/supabase';
import { Report, ReportInsert } from '../types/database';

/**
 * Save report HTML to Supabase Storage and metadata to database
 */
export async function saveReport(
  userId: string,
  reportData: {
    reportType: 'standard' | 'enhanced';
    city1Name: string;
    city1Country: string;
    city2Name: string;
    city2Country: string;
    winner: string;
    winnerScore: number;
    loserScore: number;
    scoreDifference: number;
    gammaUrl?: string;
    durationSeconds: number;
    pageCount: number;
    confidence?: number;
  },
  htmlContent: string
): Promise<Report> {
  const reportId = crypto.randomUUID();
  const fileName = `${userId}/${reportId}.html`;

  // 1. Upload HTML to storage
  const { error: storageError } = await supabase.storage
    .from('reports')
    .upload(fileName, htmlContent, {
      contentType: 'text/html',
      cacheControl: '3600',
      upsert: false
    });

  if (storageError) throw storageError;

  // 2. Save metadata to database
  const insert: ReportInsert = {
    user_id: userId,
    report_type: reportData.reportType,
    version: 'v4.0',
    city1_name: reportData.city1Name,
    city1_country: reportData.city1Country,
    city2_name: reportData.city2Name,
    city2_country: reportData.city2Country,
    winner: reportData.winner,
    winner_score: reportData.winnerScore,
    loser_score: reportData.loserScore,
    score_difference: reportData.scoreDifference,
    gamma_url: reportData.gammaUrl || null,
    html_storage_path: fileName,
    status: 'completed',
    generation_duration_seconds: reportData.durationSeconds,
    page_count: reportData.pageCount,
    llm_consensus_confidence: reportData.confidence || null,
  };

  const { data, error } = await supabase
    .from('reports')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Report;
}

/**
 * Get report with HTML content
 */
export async function getReport(reportId: string): Promise<Report & { html: string }> {
  // Get metadata
  const { data: report, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error || !report) throw new Error('Report not found');

  // Fetch HTML from storage
  const { data: htmlData, error: storageError } = await supabase.storage
    .from('reports')
    .download(report.html_storage_path);

  if (storageError) throw storageError;

  const html = await htmlData.text();

  // Log access
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('report_access_logs').insert({
      report_id: reportId,
      user_id: user.id,
      access_type: 'view'
    });
  }

  return { ...(report as Report), html };
}

/**
 * Get all reports for a user
 */
export async function getUserReports(userId: string, limit = 50): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Report[];
}

/**
 * Share a report
 */
export async function shareReport(
  reportId: string,
  userId: string,
  expiresInDays = 30,
  maxViews = 100
): Promise<string> {
  const shareToken = crypto.randomUUID();

  const { error } = await supabase
    .from('report_shares')
    .insert({
      report_id: reportId,
      shared_by: userId,
      share_token: shareToken,
      expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
      max_views: maxViews
    });

  if (error) throw error;

  return `https://clueslifescore.com/shared/${shareToken}`;
}

/**
 * Get shared report by token
 */
export async function getSharedReport(shareToken: string): Promise<Report & { html: string }> {
  const { data: share, error } = await supabase
    .from('report_shares')
    .select('*, reports(*)')
    .eq('share_token', shareToken)
    .single();

  if (error || !share) throw new Error('Shared report not found');

  // Check expiration and view limits
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    throw new Error('Share link has expired');
  }
  if (share.max_views && share.view_count >= share.max_views) {
    throw new Error('Share link has reached maximum views');
  }

  // Increment view count
  await supabase
    .from('report_shares')
    .update({ view_count: share.view_count + 1 })
    .eq('id', share.id);

  // Get full report
  return getReport(share.report_id);
}
```

---

## Phase 4: Update gammaService.ts

After Gamma generates a report, fetch the HTML and save it:

```typescript
// In generateEnhancedAndWaitForReport(), after successful generation:

// Fetch the HTML from Gamma
const response = await fetch(result.gammaUrl);
const htmlContent = await response.text();

// Save to our storage
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  await saveReport(
    user.id,
    {
      reportType: 'enhanced',
      city1Name: comparisonResult.city1.city,
      city1Country: comparisonResult.city1.country,
      city2Name: comparisonResult.city2.city,
      city2Country: comparisonResult.city2.country,
      winner: comparisonResult.winner === 'city1'
        ? comparisonResult.city1.city
        : comparisonResult.city2.city,
      winnerScore: Math.round(
        comparisonResult.winner === 'city1'
          ? comparisonResult.city1.totalConsensusScore
          : comparisonResult.city2.totalConsensusScore
      ),
      loserScore: Math.round(
        comparisonResult.winner === 'city1'
          ? comparisonResult.city2.totalConsensusScore
          : comparisonResult.city1.totalConsensusScore
      ),
      scoreDifference: Math.abs(comparisonResult.scoreDifference),
      gammaUrl: result.gammaUrl,
      durationSeconds: Math.round((Date.now() - startTime) / 1000),
      pageCount: 82,
      confidence: /* consensus confidence */
    },
    htmlContent
  );
}
```

---

## Phase 5: Migration

If you need to migrate existing `gamma_reports` data:

```sql
-- Insert existing gamma_reports into new reports table
INSERT INTO reports (
  user_id,
  report_type,
  gamma_url,
  pdf_url,
  status,
  created_at
)
SELECT
  user_id,
  'standard',  -- Assume old reports are standard
  gamma_url,
  pdf_url,
  'completed',
  created_at
FROM gamma_reports;
```

---

# KEY FILES TO MODIFY

| File | Changes |
|------|---------|
| `src/types/database.ts` | Add Report, ReportShare, ReportAccessLog types |
| `src/services/reportStorageService.ts` | NEW - Create this file |
| `src/services/gammaService.ts` | Call saveReport after generation |
| `src/services/databaseService.ts` | Add report CRUD functions |
| `src/components/VisualsTab.tsx` | Use new report storage |

---

# TESTING CHECKLIST

- [ ] Create new `reports` table in Supabase
- [ ] Create `reports` storage bucket
- [ ] Test report generation saves to storage
- [ ] Test report retrieval displays correctly
- [ ] Test report sharing generates valid links
- [ ] Test shared links work for anonymous users
- [ ] Test expiration and view limits work
- [ ] Verify RLS prevents cross-user access

---

# REFERENCE

Full architecture details in: `docs/GRAND_MASTER_TODO.md`

---

*Handoff created by Session 15 - 2026-02-07*
