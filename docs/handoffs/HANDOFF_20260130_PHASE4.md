# Phase 4 Handoff - LifeScore Manual Refinements

**Date:** 2026-01-30
**Conversation ID:** LS-20260130-P3-001 (continued)
**Previous:** Phase 3 Complete

---

## PROJECT PATH

```
D:\lifescore
```

**USE THIS EXACT PATH FOR ALL OPERATIONS.**

---

## CRITICAL: Judge Video - Wav2Lip Migration (PARTIAL - NEEDS COMPLETION)

**The API endpoint was switched from SadTalker to Wav2Lip, but supporting files need updating.**

| Metric | SadTalker (OLD) | Wav2Lip (NEW) |
|--------|-----------------|---------------|
| Generation time | 20 minutes | **~6 seconds** |
| Cost per video | $0.27 | **$0.005** |
| Cost per second | $0.0023/sec | **$0.0014/sec** |
| Reliability | Failed often (85% setup time) | Reliable |
| GPU | T4 (custom deployment) | L40S (public model) |

---

### COMPLETED:
- ✅ `api/avatar/generate-judge-video.ts` - Switched to Wav2Lip model

### STILL NEEDS UPDATING:

#### 1. Type Definitions - `src/types/avatar.ts` (lines 133-138)
**Current:**
```typescript
export interface SadTalkerInput {
  source_image: string;
  driven_audio: string;
  enhancer?: 'gfpgan' | 'RestoreFormer';
  preprocess?: 'crop' | 'resize' | 'full';
}
```

**Change to:**
```typescript
export interface Wav2LipInput {
  face: string;      // URL to image/video with face
  audio: string;     // URL to audio file
  pads?: string;     // "top bottom left right" default "0 10 0 0"
  smooth?: boolean;  // default true
  fps?: number;      // default 25
  out_height?: number; // default 480
}

// Keep SadTalkerInput for backwards compatibility but mark deprecated
/** @deprecated Use Wav2LipInput instead */
export interface SadTalkerInput {
  source_image: string;
  driven_audio: string;
  enhancer?: 'gfpgan' | 'RestoreFormer';
  preprocess?: 'crop' | 'resize' | 'full';
}
```

#### 2. Cost Calculator - `src/utils/costCalculator.ts` (line 98)
**Current:**
```typescript
'replicate-sadtalker': { perSecond: 0.0023, name: 'Replicate SadTalker', icon: '🎬' },
```

**Change to:**
```typescript
'replicate-wav2lip': { perSecond: 0.0014, name: 'Replicate Wav2Lip', icon: '🎬' },
```

#### 3. API Usage Types - `src/types/apiUsage.ts` (lines 55, 69-75)
**Current (line 55):**
```typescript
fallbackProvider: 'replicate-sadtalker',
```

**Change to:**
```typescript
fallbackProvider: 'replicate-wav2lip',
```

**Current (lines 67-75):**
```typescript
replicate: {
  provider: 'replicate',
  displayName: 'Replicate SadTalker',
  icon: '🎬',
  quotaType: 'dollars',
  monthlyQuota: 25, // $25 budget
  ...
},
```

**Change to:**
```typescript
replicate: {
  provider: 'replicate',
  displayName: 'Replicate Wav2Lip',
  icon: '🎬',
  quotaType: 'dollars',
  monthlyQuota: 10, // $10 budget (Wav2Lip is cheaper)
  ...
},
```

#### 4. Cost Dashboard UI - `src/components/CostDashboard.tsx` (line 730)
**Current:**
```tsx
<td>🎬 Replicate SadTalker</td>
<td colSpan={2}>$0.0023/sec</td>
```

**Change to:**
```tsx
<td>🎬 Replicate Wav2Lip</td>
<td colSpan={2}>$0.0014/sec</td>
```

#### 5. Technical Support Manual - `docs/manuals/TECHNICAL_SUPPORT_MANUAL.md`
Search and replace all instances of:
- "SadTalker" → "Wav2Lip"
- "$0.0023/sec" → "$0.0014/sec"

Lines to check: 540, 597, 743, 896

#### 6. Voice Flow Architecture - `docs/VOICE_FLOW_ARCHITECTURE.md`
Update lines 52, 188, 212, 224 to reference Wav2Lip instead of SadTalker.

#### 7. Supabase Migration - `supabase/migrations/20260130_create_api_quota_settings.sql` (line 97)
**Current:**
```sql
('replicate', 'Replicate SadTalker', '🎬', 'dollars', 25.00, 'Judge video - $0.0023/sec'),
```

**Change to:**
```sql
('replicate', 'Replicate Wav2Lip', '🎬', 'dollars', 10.00, 'Judge video - $0.0014/sec'),
```

---

### REPLICATE DASHBOARD INSTRUCTIONS

#### Delete the Old SadTalker Deployment:
1. Go to: https://replicate.com/deployments/johndesautels1/james-bond
2. Click **"Settings"** tab
3. Scroll to bottom
4. Click **"Delete deployment"**
5. Confirm deletion

**Why delete?** The deployment costs money even when idle (min instances). Wav2Lip uses the public model directly - no deployment needed.

#### Verify Wav2Lip is Working:
1. Go to: https://replicate.com/skytells-research/wav2lip
2. This is the public model - no setup required
3. Your API token (`REPLICATE_API_TOKEN`) already has access

#### No Environment Variables Need Changing:
- `REPLICATE_API_TOKEN` - Keep as-is (same token works)
- `REPLICATE_DEPLOYMENT_OWNER` - No longer used (can remove)
- `REPLICATE_DEPLOYMENT_NAME` - No longer used (can remove)

---

### Wav2Lip Model Reference

**Model:** `skytells-research/wav2lip`
**Version:** `22b1ecf6252b8adcaeadde30bb672b199c125b7d3c98607db70b66eea21d75ae`
**Hardware:** Nvidia L40S GPU
**Speed:** ~6-9 seconds
**Cost:** ~$0.005-0.01 per run

**Input Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| face | string (URL) | Yes | - | Image/video with face |
| audio | string (URL) | Yes | - | Audio file URL |
| pads | string | No | "0 10 0 0" | Face padding (top bottom left right) |
| smooth | boolean | No | true | Smooth face detections |
| fps | number | No | 25 | Output FPS |
| out_height | number | No | 480 | Output video height |

---

## What Was Completed in Phase 3

- USER_MANUAL.md → v2.2 (TTS fallback, Kling AI, video timing fix, annual pricing)
- CUSTOMER_SERVICE_MANUAL.md → v2.2 (Kling AI, video timing, annual pricing, live chat fix)
- TECHNICAL_SUPPORT_MANUAL.md → v2.2 (version sync)
- OLIVIA_KNOWLEDGE_BASE.md → Section 36.6-36.7 added (Voice/TTS, Video Generation)
- Olivia sync completed successfully
- Git committed and pushed

## What Was Completed in This Session

- Fixed JudgeTab console spam (removed debug logs from render body)
- Fixed Olivia sync v2 API (uses vector_stores instead of deprecated file_ids)
- **Switched Judge video from SadTalker to Wav2Lip** (major improvement)

### Session 2026-01-30 (Continued)

#### Critical Fixes:
- ✅ **Judge Tab Direct Access** - Removed `disabled: !hasResults` from `TabNavigation.tsx:65` so users can access Judge tab without requiring results first
- ✅ **Race Condition Prevention** - Added `cancel()` method to `useJudgeVideo.ts` with generation ID tracking to prevent concurrent API calls when switching comparisons
- ✅ **Unified 45-Second Timeouts** - All avatar API files now have consistent 45s timeouts:
  - `api/avatar/generate-judge-video.ts` - TTS, upload, and DB operations
  - `api/avatar/video-status.ts` - Replicate and Supabase queries
  - `api/avatar/video-webhook.ts` - Supabase updates
  - `api/avatar/simli-speak.ts` - TTS operations

---

## IMPORTANT: Infrastructure Notes

### Supabase Tier: PAID (NOT FREE)

**The LifeScore project is on a PAID Supabase tier.**

- Do NOT assume free tier limitations
- Do NOT suggest cold start issues related to free tier
- Connection retries in console logs are transient network issues, not tier-related
- Pooler connections are enabled and working correctly

### Environment Configuration

All environment variables are properly configured in Vercel:
- `SUPABASE_URL` - Production Supabase instance
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for admin operations
- `SUPABASE_ANON_KEY` - Anon key for client operations

---

## Phase 4 Tasks

### Task 1: Enhanced Mode FAQ Details

**File:** `D:\lifescore\docs\manuals\USER_MANUAL.md`

**Location:** Section 14 (FAQs) > Technical

**Add Q&A:**
```markdown
**Q: What is Enhanced Mode?**
A: Enhanced Mode uses five AI providers (Claude, GPT-4o, Gemini, Grok, Perplexity) to independently evaluate your cities. A Judge AI (Claude Opus) then reviews all evaluations to produce consensus scores. This provides more reliable results but takes longer (5-8 minutes vs 2-3 minutes for Standard).

**Q: Why would Enhanced Mode give different results than Standard?**
A: Different AI providers have access to different information sources and may weight factors differently. Enhanced Mode's consensus scoring resolves these differences, often producing more balanced results.
```

---

### Task 2: Browser Support Verification

**Files to check:**
- `D:\lifescore\package.json` (browserslist)
- `D:\lifescore\vite.config.ts` (build targets)

**Verify manuals match actual support:**
- Current USER_MANUAL.md says: "Chrome, Firefox, Safari, Edge (latest versions)"
- Confirm this is accurate or update

---

### Task 3: PWA Check

**Check if PWA is implemented:**
- Look for `manifest.json` or `manifest.webmanifest`
- Look for service worker registration

**If PWA exists:**
- Add to USER_MANUAL.md Section 2 (Getting Started)
- Add installation instructions

**If no PWA:**
- Skip this task

---

### Task 4: Wording Consistency Check

**Search for inconsistencies:**

1. "clueslifescore.com" vs "LifeScore" vs "lifescore"
   - Domain should always be: clueslifescore.com
   - Product name should always be: LifeScore

2. Tier names consistency:
   - FREE, NAVIGATOR, SOVEREIGN (all caps in tables, Title Case in prose)

3. Time formats:
   - Use "X minutes" or "X-Y minutes" (not "X min")
   - Exception: tables can use "X min/month"

---

### Task 5: Missing Glossary Terms

**File:** `D:\lifescore\docs\manuals\CUSTOMER_SERVICE_MANUAL.md`

**Check if these terms need adding to Section 12 Glossary:**
- Kling AI
- Annual subscription
- Enhanced comparison (already there as "Enhanced Mode")

---

### Task 6: Help Center Link Verification

**Check if help.clueslifescore.com exists:**
- Test URL accessibility
- If not live yet, add note "(coming soon)" or remove

---

## After Completing All Tasks

### 1. Update Version Numbers

Change all three manuals from v2.2 to v2.3

### 2. Sync Olivia (if knowledge base changed)

```bash
curl -X POST https://clueslifescore.com/api/admin/sync-olivia-knowledge -H "Content-Type: application/json" -d "{\"adminEmail\": \"brokerpinellas@gmail.com\"}"
```

### 3. Commit to GitHub

```bash
cd D:\lifescore
git add -A
git commit -m "Phase 4 complete: Enhanced FAQ, browser support, wording consistency

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push
```

### 4. Create Phase 5 Handoff (if needed)

Topics for future phases:
- Mobile responsiveness documentation
- Accessibility (WCAG) compliance notes
- Performance optimization tips for users
- Advanced API key usage guide (SOVEREIGN users)

---

## Checklist

- [ ] Task 1: Enhanced Mode FAQ added
- [ ] Task 2: Browser support verified
- [ ] Task 3: PWA checked
- [ ] Task 4: Wording consistency fixed
- [ ] Task 5: Glossary terms added
- [ ] Task 6: Help Center link verified
- [ ] Versions updated to 2.3
- [ ] Olivia synced (if needed)
- [ ] Git committed and pushed

---

**PROJECT PATH: D:\lifescore**
