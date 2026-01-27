# VIDEO FEATURES IMPLEMENTATION PLAN

**Date:** 2026-01-27
**Conversation ID:** LIFESCORE-OLIVIA-20260127-A1
**Status:** READY FOR IMPLEMENTATION

---

## FEATURE 1: "See Your New Life!" - Visuals Tab

### Location
- **File:** `src/components/VisualsTab.tsx`
- **Section:** Replace/enhance "Interactive Charts" section (lines 313-333)
- **Component:** `src/components/AdvancedVisuals.tsx` (currently placeholder)

### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│                     SEE YOUR NEW LIFE                       │
├────────────────────────┬────────────────────────────────────┤
│      [CITY A NAME]     │         [CITY B NAME]              │
│        🏆 WINNER       │           😢 LOSER                 │
│   ┌────────────────┐   │   ┌────────────────────────┐      │
│   │                │   │   │                        │      │
│   │   "FREEDOM"    │   │   │  🔒 Prison bars        │      │
│   │   Hero Banner  │   │   │  👔 Govt agent         │      │
│   │                │   │   │  📋 Regulations        │      │
│   │ [Grok Video]   │   │   │  [Grok Video]          │      │
│   │ Happy person   │   │   │  Stressed person       │      │
│   │ enjoying life  │   │   │  buried in paperwork   │      │
│   └────────────────┘   │   └────────────────────────┘      │
├────────────────────────┴────────────────────────────────────┤
│              [ 👁️ SEE YOUR NEW LIFE! ]                      │
│                  (plays both videos)                        │
└─────────────────────────────────────────────────────────────┘
```

### Requirements
- **Playback:** Simultaneous (both videos play at same time)
- **Trigger:** On-demand only (user clicks button)
- **Access:** Pro users only (use FeatureGate)
- **Video Source:** Grok Imagine API (8-10 second clips)

### Grok Video Prompts (to be refined)

**Winner City Prompt Template:**
```
Happy person enjoying freedom in [CITY_NAME]. Sunny day, relaxed atmosphere,
minimal government presence, people freely going about their business,
vibrant local economy, low stress environment. 8 seconds, cinematic quality.
```

**Loser City Prompt Template:**
```
Stressed person in [CITY_NAME] overwhelmed by regulations. Government buildings,
bureaucratic offices, long lines, paperwork piling up, frustrated citizens,
heavy tax burden visible, restricted freedoms. 8 seconds, cinematic quality.
```

---

## FEATURE 2: "Court Order" - Judge Tab

### Location
- **File:** `src/components/JudgeTab.tsx`
- **Section:** Below the verdict section
- **New Component:** `src/components/CourtOrderVideo.tsx` (to be created)

### UI Layout
```
┌─────────────────────────────────────────────────────────────┐
│                      COURT ORDER                            │
│   ┌───────────────────────────────────────────────────┐    │
│   │                                                   │    │
│   │  [Cinematic "Perfect Life" Video]                 │    │
│   │                                                   │    │
│   │  Beach city = sunset, waves, crystal white sand   │    │
│   │  Mountain city = hot chocolate, valley, lake      │    │
│   │  Urban city = rooftop bar, skyline, nightlife     │    │
│   │                                                   │    │
│   └───────────────────────────────────────────────────┘    │
│                                                             │
│              [ ▶️ WATCH YOUR FUTURE ]                       │
└─────────────────────────────────────────────────────────────┘
```

### Requirements
- **Playback:** Single video of winning city's "perfect life"
- **Trigger:** On-demand (user clicks button)
- **Access:** Pro users only
- **Video Source:** Grok Imagine or SadTalker (TBD based on quality)

### City Type Detection & Prompts

**Beach City Keywords:** beach, coast, ocean, shore, tropical, island
```
Crystal white sand beach at golden hour sunset, gentle waves crashing,
palm trees swaying, person relaxing in paradise, [CITY_NAME] coastline,
ultimate freedom and peace. 10 seconds, cinematic 4K quality.
```

**Mountain City Keywords:** mountain, alpine, ski, elevation, rocky
```
Cozy cabin overlooking lush green valley and pristine lake, person enjoying
hot chocolate on deck, snow-capped peaks in distance, [CITY_NAME] mountain
serenity, fresh air and freedom. 10 seconds, cinematic 4K quality.
```

**Urban City Keywords:** downtown, metro, city center, skyline
```
Rooftop bar at sunset overlooking [CITY_NAME] skyline, person toasting to
success, city lights beginning to glow, vibrant nightlife energy,
cosmopolitan freedom and opportunity. 10 seconds, cinematic 4K quality.
```

**Desert City Keywords:** desert, arid, southwest, canyon
```
Desert sunset with dramatic red rock formations near [CITY_NAME], person
on scenic overlook, wide open spaces, endless horizon, ultimate freedom
and adventure. 10 seconds, cinematic 4K quality.
```

---

## TECHNICAL IMPLEMENTATION

### New Files to Create

1. **`src/components/NewLifeVideos.tsx`** - Main component for Visuals tab
2. **`src/components/CourtOrderVideo.tsx`** - Component for Judge tab
3. **`src/hooks/useGrokVideo.ts`** - Hook for Grok Imagine API integration
4. **`api/video/grok-generate.ts`** - Backend API for Grok video generation
5. **`src/services/grokVideoService.ts`** - Frontend service for video generation

### Database Tables Needed

```sql
-- GROK VIDEOS CACHE TABLE
CREATE TABLE IF NOT EXISTS grok_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id TEXT NOT NULL,
  city_name TEXT NOT NULL,
  video_type TEXT NOT NULL CHECK (video_type IN ('winner_mood', 'loser_mood', 'perfect_life')),
  prompt TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds NUMERIC DEFAULT 8,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(comparison_id, city_name, video_type)
);

CREATE INDEX idx_grok_videos_comparison ON grok_videos(comparison_id);
CREATE INDEX idx_grok_videos_status ON grok_videos(status);

ALTER TABLE grok_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view completed" ON grok_videos
  FOR SELECT USING (status = 'completed');
CREATE POLICY "Service role full access" ON grok_videos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Environment Variables Needed

```env
# Grok/xAI API
GROK_API_KEY=your_grok_api_key
GROK_API_URL=https://api.x.ai/v1  # or correct endpoint

# SuperGrok limits
# 50 videos/day on SuperGrok plan
```

### API Integration - Grok Imagine

**Endpoint:** Research needed - check xAI docs for exact API
**Auth:** Bearer token with GROK_API_KEY
**Rate Limit:** 50 videos/day on SuperGrok ($30/mo)

```typescript
// Pseudocode for Grok video generation
interface GrokVideoRequest {
  prompt: string;
  duration?: number; // 6-15 seconds
  style?: 'cinematic' | 'realistic' | 'artistic';
}

interface GrokVideoResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
}
```

---

## VIDEO GENERATION STACK SUMMARY

| Use Case | Tool | Duration | API Available | Status |
|----------|------|----------|---------------|--------|
| Winner mood clip | Grok Imagine | 8-10 sec | ✅ Yes | TO BUILD |
| Loser mood clip | Grok Imagine | 8-10 sec | ✅ Yes | TO BUILD |
| Perfect life finale | Grok Imagine | 10-15 sec | ✅ Yes | TO BUILD |
| Judge verdict | SadTalker | 30-60 sec | ✅ Yes | ✅ WORKING |
| Olivia avatar | Simli | Real-time | ✅ Yes | ✅ WORKING |
| Contrast images | Replicate Flux | Static | ✅ Yes | ✅ WORKING |
| Cinematic finale | InVideo | 1-2 min | ❌ Manual | MANUAL ONLY |

---

## EXISTING WORKING FEATURES (Reference)

### Olivia Page - FIXED THIS SESSION
- ✅ Simli lip sync (6000 byte chunks)
- ✅ OpenAI polling (500ms)
- ✅ Conversation persistence to Supabase
- ✅ Contrast images via Replicate Flux

### Judge Page - VERIFIED THIS SESSION
- ✅ SadTalker video generation via Replicate
- ✅ ElevenLabs TTS for Christiano voice
- ✅ Christiano image URL configured
- ✅ Voice ID: ZpwpoMoU84OhcbA2YBBV
- ✅ avatar_videos table for caching

---

## COMMITS MADE THIS SESSION

| Commit | Description |
|--------|-------------|
| `224968e` | Simli chunk size fix (6000 bytes) |
| `6bf8629` | OpenAI polling interval (500ms) |
| `be89b95` | Safe conversation persistence |
| `cff3107` | Handoff documentation |
| `2cbf9a3` | JudgeTab userId from auth |

---

## NEXT STEPS FOR NEW CONVERSATION

1. **Research Grok API** - Find exact endpoint and SDK docs
2. **Create `useGrokVideo.ts` hook** - Handle video generation state
3. **Create `api/video/grok-generate.ts`** - Backend API endpoint
4. **Create `NewLifeVideos.tsx`** - UI component for Visuals tab
5. **Create `CourtOrderVideo.tsx`** - UI component for Judge tab
6. **Add Supabase table** - `grok_videos` for caching
7. **Wire up FeatureGate** - Pro users only
8. **Test end-to-end** - Full flow verification

---

## QUESTIONS FOR NEXT SESSION

1. Do you have Grok/xAI API access credentials?
2. Should we add a "Generating..." loading animation?
3. Should videos auto-replay or play once?
4. Should we add a "Download Video" option?

---
