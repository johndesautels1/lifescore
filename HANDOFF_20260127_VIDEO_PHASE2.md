# VIDEO FEATURES IMPLEMENTATION - HANDOFF DOCUMENT

**Date:** 2026-01-27
**Conversation ID:** LIFESCORE-VIDEO-20260127-A2
**Status:** PHASE 1-2 COMPLETE, PHASE 3-5 PENDING

---

## MASTER IMPLEMENTATION TABLE

| Phase | Task | File(s) | Status | Commit |
|-------|------|---------|--------|--------|
| 1.1 | Create Grok video types | `src/types/grokVideo.ts` | ✅ COMPLETE | `69772e3` |
| 1.2 | Create Grok video service | `src/services/grokVideoService.ts` | ✅ COMPLETE | `69772e3` |
| 1.3 | Create useGrokVideo hook | `src/hooks/useGrokVideo.ts` | ✅ COMPLETE | `69772e3` |
| 1.4 | Create generate API | `api/video/grok-generate.ts` | ✅ COMPLETE | `69772e3` |
| 1.5 | Create status API | `api/video/grok-status.ts` | ✅ COMPLETE | `69772e3` |
| 1.6 | Create NewLifeVideos component | `src/components/NewLifeVideos.tsx` + `.css` | ✅ COMPLETE | `fa25aae` |
| 1.7 | Create CourtOrderVideo component | `src/components/CourtOrderVideo.tsx` + `.css` | ✅ COMPLETE | `fa25aae` |
| 2.1 | Create grok_videos DB table | `supabase/migrations/20260127_create_grok_videos.sql` | ✅ COMPLETE | `aea8848` |
| 2.2 | Add types to database.ts | `src/types/database.ts` | ✅ COMPLETE | `aea8848` |
| **3** | **Modify VisualsTab.tsx** | `src/components/VisualsTab.tsx` | ⏳ PENDING | - |
| **4** | **Modify JudgeTab.tsx** | `src/components/JudgeTab.tsx` | ⏳ PENDING | - |
| **5** | **Add FeatureGate config** | `src/hooks/useTierAccess.ts` | ⏳ PENDING | - |

---

## WHAT'S BEEN BUILT (Phase 1-2)

### New Files Created:

```
src/
├── types/
│   └── grokVideo.ts          # Type definitions for Grok video generation
├── services/
│   └── grokVideoService.ts   # Client-side API wrapper with city type detection
├── hooks/
│   └── useGrokVideo.ts       # React hook for video generation state
├── components/
│   ├── NewLifeVideos.tsx     # Winner vs Loser video comparison UI
│   ├── NewLifeVideos.css     # Styles for NewLifeVideos
│   ├── CourtOrderVideo.tsx   # LCD screen Court Order video UI
│   └── CourtOrderVideo.css   # Styles for CourtOrderVideo

api/
└── video/
    ├── grok-generate.ts      # Backend: Grok (primary) + Replicate (fallback)
    └── grok-status.ts        # Backend: Status polling + cache check

supabase/
└── migrations/
    └── 20260127_create_grok_videos.sql  # Database table with RLS
```

### Database Table Created:

```sql
grok_videos (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,        -- REQUIRED: Track who generates (costs $$$)
  comparison_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  video_type TEXT NOT NULL,     -- 'winner_mood' | 'loser_mood' | 'perfect_life'
  prompt TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC,
  provider TEXT,                -- 'grok' | 'replicate'
  prediction_id TEXT,
  status TEXT,                  -- 'pending' | 'processing' | 'completed' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
```

**RLS Policies:**
- Users see their own videos
- Users can also see ANY completed video (enables cache reuse across users)
- Service role has full access

---

## WHAT NEEDS TO BE DONE (Phase 3-5)

### Phase 3: Modify VisualsTab.tsx

**Location:** `src/components/VisualsTab.tsx` lines 313-333

**Current Code:**
```tsx
{/* In-App Visualizations - Only for Enhanced mode */}
{isEnhancedResult(result) ? (
  <div className="in-app-visuals">
    <h3 className="section-title">
      <span className="section-icon">📈</span>
      Interactive Charts
    </h3>
    <AdvancedVisuals result={result} />
  </div>
) : (
  <div className="simple-mode-notice">...</div>
)}
```

**Required Changes:**
1. Add import at top: `import NewLifeVideos from './NewLifeVideos';`
2. Replace `<AdvancedVisuals result={result} />` with `<NewLifeVideos result={result} />`
3. Keep the simple-mode-notice for non-enhanced users

**CRITICAL:** DO NOT touch the Gamma section (lines 151-311)

---

### Phase 4: Modify JudgeTab.tsx

**Location:** `src/components/JudgeTab.tsx` - Add section BELOW verdict

**Required Changes:**
1. Add import at top: `import CourtOrderVideo from './CourtOrderVideo';`
2. Add new section after the verdict text (around line 900+)
3. Pass props: `comparisonId`, `winnerCity`, `winnerScore`

**Proposed Addition (after verdict section):**
```tsx
{/* Court Order Video - Perfect Life visualization */}
{judgeReport && (
  <CourtOrderVideo
    comparisonId={result.comparisonId}
    winnerCity={judgeReport.recommendation === 'city1' ? result.city1.city : result.city2.city}
    winnerScore={judgeReport.recommendation === 'city1' ? result.city1Score : result.city2Score}
  />
)}
```

**User Requirements:**
- LCD screen style below verdict
- Own "SEE COURT ORDER" button
- NO auto-generate (wait for click)
- NO simultaneous play with other videos

---

### Phase 5: Add FeatureGate Configuration

**Location:** `src/hooks/useTierAccess.ts`

**Required Changes:**

1. Add to `TierLimits` interface (line ~45):
```typescript
grokVideos: number;
```

2. Add to `TIER_LIMITS` (line ~67):
```typescript
free: {
  ...
  grokVideos: 0,  // Free users: no access
},
pro: {
  ...
  grokVideos: 0,  // Pro users: no access (Sovereign only)
},
enterprise: {
  ...
  grokVideos: -1, // Sovereign: unlimited
},
```

3. Add to `FEATURE_TO_COLUMN` (line ~100):
```typescript
grokVideos: 'grok_videos',
```

4. Add to `FEATURE_DESCRIPTIONS` in `FeatureGate.tsx`:
```typescript
grokVideos: {
  title: 'City Mood Videos',
  description: 'AI-generated videos showing life in your compared cities.',
},
```

**User Decision:** Only Sovereign tier gets Grok videos. Usage counting:
- 1 video for winner+loser pair (New Life)
- 1 video for Court Order
- Per comparison, not per video

---

## USER REQUIREMENTS SUMMARY

| Requirement | Decision |
|-------------|----------|
| user_id tracking | YES - videos cost money |
| Video caching | YES - reuse across users for same city |
| NewLifeVideos location | REPLACES charts section (NOT gamma) |
| Who sees NewLifeVideos | Enhanced mode users only |
| Court Order location | LCD screen BELOW verdict |
| Court Order trigger | Button click only (no auto-generate) |
| Simultaneous play | NO - bandwidth concerns |
| Tier access | Sovereign only |
| Usage counting | 1 for winner/loser pair, 1 for court order |

---

## COMMITS THIS SESSION

| Commit | Description |
|--------|-------------|
| `69772e3` | feat(video): Add Grok video generation infrastructure (Phase 1.1-1.5) |
| `fa25aae` | feat(video): Add NewLifeVideos and CourtOrderVideo components (Phase 1.6-1.7) |
| `aea8848` | feat(db): Add grok_videos table and TypeScript types (Phase 2) |

---

## ENVIRONMENT VARIABLES

Already configured:
- `GROK_API_KEY` or `XAI_API_KEY` - For Grok Imagine video generation
- `REPLICATE_API_TOKEN` - For fallback video generation

**Note:** Grok video API endpoint URL needs verification. Current code uses `https://api.x.ai/v1/videos/generations` but this may need updating based on actual Grok API docs.

---

## TESTING CHECKLIST

Before deploying:
- [ ] Run Supabase migration to create grok_videos table
- [ ] Test NewLifeVideos component renders correctly
- [ ] Test CourtOrderVideo component renders correctly
- [ ] Test video generation API endpoint
- [ ] Test video status polling
- [ ] Test video caching/reuse
- [ ] Test FeatureGate blocks free/pro users
- [ ] Test mobile responsiveness

---

## FILES TO READ FIRST

For next agent - read these to understand context:
1. `D:\lifescore\HANDOFF_20260127_VIDEO_FEATURES.md` - Original feature spec
2. `src/components/VisualsTab.tsx` - Target for Phase 3 modification
3. `src/components/JudgeTab.tsx` - Target for Phase 4 modification
4. `src/hooks/useTierAccess.ts` - Target for Phase 5 modification

---

## PROMPT FOR NEXT CONVERSATION

```
Continue implementing video features for LIFE SCORE.

Conversation ID: LIFESCORE-VIDEO-20260127-A2

Read: D:\lifescore\HANDOFF_20260127_VIDEO_PHASE2.md

Remaining tasks:
- Phase 3: Modify VisualsTab.tsx (replace charts with NewLifeVideos)
- Phase 4: Modify JudgeTab.tsx (add CourtOrderVideo below verdict)
- Phase 5: Add grokVideos to FeatureGate/useTierAccess

CRITICAL RULES:
1. DO NOT touch Gamma section in VisualsTab
2. DO NOT break existing video playback in JudgeTab
3. Only Sovereign tier gets Grok videos
4. Discuss any changes before making them
```

---

**Ready for Phase 3-5 implementation in next conversation!**
