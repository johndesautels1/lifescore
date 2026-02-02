# CLUES LIFE SCORE

**Legal Independence & Freedom Evaluation**

Compare cities across 100 freedom metrics in 6 categories. Part of the CLUES (Comprehensive Location & Utility Evaluation System) platform.

---
## 🚨 CRITICAL: Performance Audit - February 2, 2026 🚨

**READ:** `docs/PERFORMANCE_AUDIT_20260202.md`

Site takes 1-3 minutes to load. Bundle is 1.36MB (should be <500KB). Full audit with fix recommendations in the linked document.

---

## 🚨 HANDOFF: PRICING TIER FIX (January 28, 2026) 🚨

**Session ID:** `LS-20260128-002`
**Status:** AUDIT COMPLETE - 20+ Files Need Fixing

### Completed This Session
1. ✅ Built Emilia Help Widget (floating teal bubble, modal with 3 tabs, AI chat)
2. ✅ Added voice INPUT (microphone button) to Emilia chat
3. ✅ Fixed link handling (internal anchors stay in modal, external links open new tabs)
4. ✅ Audited ALL tier/pricing references across codebase
5. ✅ Created `docs/PRICING_TIER_AUDIT.md` with correct values

### CRITICAL: Files to Fix (Priority Order)

1. **`src/hooks/useTierAccess.ts`** - SOURCE OF TRUTH for tier limits
2. **`src/components/PricingModal.tsx`** - User-facing pricing display
3. **`src/components/PricingPage.tsx`** - Pricing page
4. **`src/components/FeatureGate.tsx`** - Feature gating logic
5. **`docs/manuals/USER_MANUAL.md`** - ✅ DONE (uses NAVIGATOR)
6. **`docs/manuals/CUSTOMER_SERVICE_MANUAL.md`** - ✅ DONE (uses NAVIGATOR)
7. **`docs/manuals/TECHNICAL_SUPPORT_MANUAL.md`** - Fix limits
8. **`api/emilia/manuals.ts`** - Fix EMBEDDED_MANUALS content (lines 36-300)

### Correct Values (All Per Month)

| Tier | Internal | Price | LLMs | Comparisons | Olivia | Gamma |
|------|----------|-------|------|-------------|--------|-------|
| FREE | `free` | $0 | 1 | 1 | NO | NO |
| NAVIGATOR | `pro` | $29/$249 | 1 | 1 | 15min | 1 |
| SOVEREIGN | `enterprise` | $99/$899 | 5 | 1 (5 LLMs) | 60min | 1 (5 LLMs) |

### Start Command
```
Read D:\lifescore\docs\PRICING_TIER_AUDIT.md
```

---

## AVATAR SYSTEM - SIMLI + REPLICATE (January 24, 2026)

**Conversation ID:** `LIFESCORE-AVATAR-20260124`
**Status:** IMPLEMENTATION COMPLETE - TESTING REQUIRED

### Overview

Replaced expensive D-ID/HeyGen ($500+/month) with cost-effective solution:
- **Olivia (Interactive Chat):** Simli AI - Real-time photorealistic streaming avatar
- **Christiano (Judge Videos):** Replicate Wav2Lip - Fast lip-sync video generation (~6 sec)

**Monthly Cost: ~$50-55 (vs $500+ previously) = 90% savings**

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OLIVIA (Interactive Chat)                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  User speaks/types → GPT responds → Simli streams video      │  │
│  │  • Real-time WebRTC streaming (<500ms latency)               │  │
│  │  • Your Olivia photo → photorealistic avatar                 │  │
│  │  • User can interrupt mid-speech                             │  │
│  │  • Cost: $49/mo Pro plan (1000 min shared)                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                 CHRISTIANO (Judge Video Reports)                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Judge verdict → Replicate Wav2Lip → MP4 video               │  │
│  │  • Fast video generation (~6 seconds)                        │  │
│  │  • Your Christiano photo → professional presenter            │  │
│  │  • Cached results (same comparison = same video)             │  │
│  │  • Cost: ~$0.005 per video                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Environment Variables Required

```bash
# Simli AI (Olivia interactive chat)
SIMLI_API_KEY=simli_xxxxxxxx
SIMLI_FACE_ID=olivia-face-id        # Created after uploading Olivia image

# Replicate (Christiano judge videos)
REPLICATE_API_TOKEN=r8_xxxxxxxx

# ElevenLabs (TTS for Christiano - optional, can use free browser TTS)
ELEVENLABS_API_KEY=xi_xxxxxxxx       # Optional
ELEVENLABS_VOICE_ID=christiano-voice # Optional
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/avatar/simli-session` | POST | Create Simli streaming session for Olivia |
| `/api/avatar/simli-speak` | POST | Send text for Olivia to speak |
| `/api/avatar/generate-judge-video` | POST | Generate Christiano video via Replicate |
| `/api/avatar/video-status` | GET | Check video generation status |

### Database Schema

```sql
-- Video cache table (prevents regenerating same videos)
CREATE TABLE IF NOT EXISTS public.avatar_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comparison_id TEXT NOT NULL,           -- Hash of city pair + verdict
  video_url TEXT NOT NULL,               -- Replicate output URL
  script TEXT NOT NULL,                  -- Judge script used
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                -- For cleanup
  UNIQUE(comparison_id)
);
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `OliviaAvatar` | `src/components/OliviaAvatar.tsx` | Simli streaming video player |
| `JudgeVideo` | `src/components/JudgeVideo.tsx` | Replicate video player |
| `useSimli` | `src/hooks/useSimli.ts` | Simli session management |
| `useJudgeVideo` | `src/hooks/useJudgeVideo.ts` | Video generation & caching |

### Types

```typescript
// src/types/avatar.ts
interface SimliSession {
  sessionId: string;
  streamUrl: string;
  faceId: string;
  status: 'connecting' | 'connected' | 'speaking' | 'idle' | 'error';
}

interface JudgeVideo {
  id: string;
  comparisonId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  script: string;
  error?: string;
}
```

### Integration Points

| Existing Component | Integration |
|--------------------|-------------|
| `AskOlivia.tsx` | Replace D-ID with `OliviaAvatar` component |
| `JudgeTab.tsx` | Add `JudgeVideo` component for verdict presentations |

### Cost Comparison

| Solution | Olivia (Chat) | Christiano (Videos) | Total/Month |
|----------|---------------|---------------------|-------------|
| **D-ID (old)** | N/A | $2,700+ | $2,700+ |
| **HeyGen (old)** | N/A | $500+ | $500+ |
| **Simli + Replicate (new)** | $49 | $2-5 | **$51-54** |

### Setup Steps

1. **Simli Setup:**
   - Sign up at https://simli.com
   - Upload Olivia image to create face
   - Copy API key and face ID to Vercel env vars

2. **Replicate Setup:**
   - Sign up at https://replicate.com
   - Get API token from account settings
   - Add to Vercel env vars

3. **Run Database Migration:**
   ```bash
   # Run migration for video caching
   supabase db push
   ```

4. **Test:**
   - Olivia: Open Ask Olivia tab, should see streaming avatar
   - Christiano: Generate judge report, video should appear

### Files Created This Session

```
api/avatar/simli-session.ts      # Simli session creation
api/avatar/simli-speak.ts        # Text-to-speech streaming
api/avatar/generate-judge-video.ts # Replicate video generation
api/avatar/video-status.ts       # Check generation status
src/components/OliviaAvatar.tsx  # Olivia streaming component
src/components/OliviaAvatar.css  # Styling
src/components/JudgeVideo.tsx    # Christiano video component
src/components/JudgeVideo.css    # Styling
src/hooks/useSimli.ts            # Simli hook
src/hooks/useJudgeVideo.ts       # Video generation hook
src/types/avatar.ts              # Type definitions
supabase/migrations/003_avatar_videos.sql # Video cache table
```

### Files Modified This Session

```
src/components/AskOlivia.tsx     # Integrated OliviaAvatar
src/components/JudgeTab.tsx      # Integrated JudgeVideo
README.md                        # This documentation
```

---

## PREMIUM PRICING SYSTEM (Updated January 28, 2026)

**Conversation ID:** `LIFESCORE-PRICING-20260128`
**Status:** AUDIT COMPLETE - Implementation Pending

### Pricing Tiers (CONFIRMED)

| Internal ID | Display Name | Monthly | Annual |
|-------------|--------------|---------|--------|
| `free` | **FREE** | $0 | $0 |
| `pro` | **NAVIGATOR** | $29 | $249 |
| `enterprise` | **SOVEREIGN** | $99 | $899 |

### Feature Matrix (CONFIRMED - All Limits Per Month)

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|------|-----------|-----------|
| **LLM Providers** | 1 | 1 (simple) | 5 (enhanced) |
| **Comparisons** | 1/month | 1/month | 1/month (all 5 LLMs) |
| **Olivia AI** | NO | 15 min (3×5min) | 60 min |
| **Gamma Reports** | NO | 1/month | 1/month (all 5 LLMs) |
| **Comparison Images** | NO | 1 set/month | 1 set/month |
| **Judge Verdict** | NO | 1/month (video+summary+details+court order) | 1/month |
| **Comparison Shorts** | NO | 1 set/month | 1 set/month |
| **Customer Support** | NO | Chat only | Phone + Video + 60min tech |
| **Enhanced Mode** | NO | NO | YES |

### ⚠️ CRITICAL: Tier Information Needs Fixing

**See:** `docs/PRICING_TIER_AUDIT.md` for complete list of 20+ files with incorrect tier information.

**Status (2026-02-02):** ✅ All tier naming standardized
- Manuals use "NAVIGATOR" (not "PIONEER")
- Pricing shows "$29/$99"
- All tiers show "1 comparison/month"
- Olivia uses "15 min/month" or "60 min/month"

### Stripe Integration

**Environment Variables Required:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_NAVIGATOR_MONTHLY=price_...
STRIPE_PRICE_NAVIGATOR_ANNUAL=price_...
STRIPE_PRICE_SOVEREIGN_MONTHLY=price_...
STRIPE_PRICE_SOVEREIGN_ANNUAL=price_...
```

**API Endpoints:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/stripe/create-checkout-session` | POST | Start Stripe checkout |
| `/api/stripe/webhook` | POST | Handle Stripe events |
| `/api/stripe/create-portal-session` | POST | Open billing portal |
| `/api/stripe/get-subscription` | GET | Get current subscription |

**Database Migration:**
Run `supabase/migrations/002_subscriptions_and_usage.sql` to create:
- `subscriptions` table (Stripe subscription data)
- `usage_tracking` table (monthly feature limits)

### Components

| Component | Purpose |
|-----------|---------|
| `PricingPage.tsx` | Premium pricing cards with Stripe checkout |
| `FeatureGate.tsx` | Lock overlay for gated features |
| `useTierAccess.ts` | Hook for checking tier limits |

---

## COMPLIANCE REMINDER (Before Launch)

| Task | Priority | Status | Action |
|------|----------|--------|--------|
| ICO Registration (UK) | **HIGH** | Pending | https://ico.org.uk/for-organisations/register/ |
| EU Representative | **HIGH** | Pending | Sign up with GDPR-Rep.eu (~€100-500/yr) |
| 5 DPA Emails | LOW | Pending | Templates in `docs/legal/COMPLIANCE_README.md` |

**Full compliance checklist:** `docs/legal/COMPLIANCE_README.md`

---

## CODEBASE AUDIT STATUS (January 23, 2026)

**Conversation ID:** `LIFESCORE-AUDIT-20260123-001`

### Completed Fixes (11 items)
- [x] Missing Vercel timeout configs (7 endpoints) → `a606537`
- [x] Rate limiting on all 11 API endpoints → `0914b8c`
- [x] CORS extraction to shared helper → `0dd3bbb`
- [x] `as any` type escapes (4 instances) → `ef587fc`
- [x] Empty catch handlers (10 instances) → `845e4b6`
- [x] fetchWithTimeout extraction (12→2 copies, -179 lines) → `0edce29`
- [x] Static OG image for social sharing → `1527edc`
- [x] Company name standardization → `2de0f27`
- [x] PostgrestBuilder TypeScript fix → `ff36bbc`
- [x] Undefined vars in streams.ts → `5ebb26f`
- [x] Dead Code folder excluded from git → `16bc391`

### Optional Remaining (1 item - low priority)

| # | Issue | Effort | Recommendation |
|---|-------|--------|----------------|
| 1 | **Metrics consolidation** (5,000+ lines duplicate in 3 files) | 2-3 hrs | Optional - low priority refactor |

### ✅ AUDIT COMPLETE
All critical and recommended items have been addressed. The metrics consolidation is optional tech debt that can be tackled in a future session if desired.

---

## CURRENT STATUS (January 22, 2026)

### Latest Session: 2026-01-22
**Conversation ID:** `LIFESCORE-OLIVIA-2026-0122-S2`

---

## 🚨 HANDOFF: ASK OLIVIA - ENHANCED CONTEXT BUILDER 🚨

**Date:** 2026-01-22
**Status:** D-ID VIDEO AVATAR COMPLETE - NEED ENHANCED CONTEXT

### What's Working
- D-ID video avatar in Ask Olivia TV viewport (`data-mode="full"`)
- OpenAI Assistant brain for intelligent responses
- Voice input and transcript replay
- OliviaChatBubble (text chat) on all other pages

### Immediate Tasks for Next Session

1. **BUG FIX:** Letter "C" not typing in Ask Olivia text input

2. **IMPLEMENT OPTION A: Enhanced Context Builder**
   - File: `api/olivia/context.ts`
   - Include ALL 100 metrics (not just top 10)
   - Increase token limit: 8000 → 16000
   - Add metric display names from `gammaService.ts`
   - Generate text summary of comparison for richer context

3. **Goal:** Olivia can answer ANY question about the user's specific LIFE SCORE report with full detail

### Start Next Session With:
```
Read D:\LifeScore\HANDOFF_2026_0122_SESSION2.md
```

---

## Previous Handoff: PROMPT UNIFICATION & SCORING STANDARDIZATION

**Date:** 2026-01-21
**Status:** PLANNING COMPLETE - READY FOR IMPLEMENTATION

### Problem Statement

All 6 LLMs were consulted about prompt issues. They identified critical conflicts:
1. **buildBasePrompt()** uses A-E letter grades
2. **All addendums + system prompts** use 0-100 numeric
3. **Perplexity system prompt** uses different JSON keys (`city1LegalScore` vs `city1Legal`)
4. LLMs receive 2-4 conflicting instructions per call

### Consensus from 6 LLM Consultations

| LLM | Recommendation |
|-----|----------------|
| Sonnet | Use 0-100, fix string vs number bug in parseResponse |
| GPT-4o | Use 0-100 with anchored bands (95-100, 85-94, 70-84, 50-69, 30-49, 10-29, 0-9) |
| Gemini | Use 0-100, define scale once in system prompt |
| Grok | Use 0-100, standardize temp to 0.3, add retry logic |
| Perplexity | Use 0-100 or A-E but NOT both |
| Opus | Use 0-100, maps naturally to percentages |

### Approved Implementation Plan

**FILE: `api/evaluate.ts` (ONLY file that needs changes)**

1. **Remove A-E from buildBasePrompt() (lines 231-298)**
   - Replace letter grade tables with 5 anchor bands
   - Keep JSON keys as `city1Legal` (no suffix)

2. **Add Anchor Bands (5 buckets per user preference)**
   ```
   90-100: Fully legal/unrestricted (most free)
   70-89:  Generally permissive with limitations
   50-69:  Moderate restrictions
   30-49:  Significant restrictions
   0-29:   Prohibited/heavily restricted (least free)
   ```

3. **Fix parseResponse() string vs number bug (lines 389-397)**
   - Add `Number()` coercion for safety
   - Current: `const s = numeric ?? 50` (fails if string)
   - Fixed: `const s = Number(numeric) || 50`

4. **Remove duplicate scale definitions**
   - Keep scale ONLY in system prompt (not in addendums)
   - Addendums reference system prompt instead

5. **Add explicit metric count after metric list**
   - Add: "There are exactly N metrics. Return exactly N evaluations."

6. **Standardize JSON keys to `city1Legal` (no suffix)**
   - Fix Perplexity system prompt (line 1220) to use `city1Legal` not `city1LegalScore`

### Files Verified - No Hidden Files Missed

| Category | Files | Status |
|----------|-------|--------|
| Prompts/Parsing | `api/evaluate.ts` | ⚠️ NEEDS CHANGES |
| Score Handling | `src/services/llmEvaluators.ts`, `src/services/opusJudge.ts` | ✅ Already correct |
| Hooks | `src/hooks/useComparison.ts` | ✅ No letter grades |
| Scoring | `src/api/scoring.ts` | ✅ Just 0-100 output |
| Judge | `api/judge.ts` | ✅ Uses correct keys |
| All other 28 .ts files | N/A | ✅ No scoring logic |

### What NOT to Change

| Item | Reason |
|------|--------|
| max_tokens (16384) | User directive |
| timeout (240000ms) | User directive |
| Batching logic | Already correct (6 batches by category) |
| Tavily search queries | Working correctly |
| parseResponse() flexibility | Keep handling both formats during transition |

### Verification After Implementation

Must verify:
1. [ ] All 5 LLMs return 0-100 scores
2. [ ] parseResponse() handles string "75" and number 75
3. [ ] No duplicate scale definitions
4. [ ] Explicit metric count in prompts
5. [ ] JSON keys consistent across all prompts
6. [ ] TypeScript compiles without errors
7. [ ] Build succeeds

---

## 🚨 HANDOFF: GROK OPTIMIZATION (DEFERRED ITEMS) 🚨

**Date:** 2026-01-21
**Status:** PARTIAL IMPLEMENTATION - SAFE CHANGES ONLY

### What Was Implemented This Session

| Change | Status | Notes |
|--------|--------|-------|
| Temperature 0.3 → 0.2 | ✅ DONE | More deterministic outputs |
| Updated grokAddendum | ✅ DONE | Grok's recommended format |
| Date/recency requirements | ✅ DONE | Explicit year, "last 12 months" |
| X search query patterns | ✅ DONE | Enforcement sentiment guidance |
| JSON validation with retry | ✅ DONE | 3 attempts with backoff |

### DEFERRED TO NEXT SESSION (Require More Testing)

| # | Item | Risk Level | Why Deferred |
|---|------|------------|--------------|
| 11 | Change `search: true` to selective per metric | 🟡 MEDIUM | Could break working metrics; needs metric-by-metric analysis |
| 12 | Major prompt restructuring | 🟡 MEDIUM | Grok already returning data; risk vs reward unclear |

### Grok's Own Recommendations (From Consultation)

**Selective Search Strategy (Item #11):**
- Enable `search: true` automatically for metrics prone to change (cannabis, abortion, firearms)
- Disable for static metrics (historical zoning laws) to save tokens/latency
- Add conditional: "If metric involves time-sensitive laws, perform real-time web search"
- Each search adds ~5-10 seconds; selective approach optimizes for 300s Vercel timeout

**Implementation Approach When Ready:**
```typescript
// In evaluateWithGrok(), determine search need per metric category
const dynamicCategories = ['personal_freedom', 'policing_legal'];
const needsSearch = metrics.some(m => dynamicCategories.includes(m.categoryId));
// Then: search: needsSearch (instead of search: true)
```

### What NOT to Change (Per User Directive)

| Setting | Value | Reason |
|---------|-------|--------|
| max_tokens | 16384 | User explicitly wants NO reduction |
| timeout | 240000ms | Court order: no timeout changes |
| Tavily pre-fetch | NOT added to Grok | Risk of 65-130s added latency causing timeouts |

### Files Changed This Session

- `api/evaluate.ts` - Lines 932-1016 (evaluateWithGrok function only)
- `README.md` - This handoff section

### Next Session TODO

1. Test selective `search: true` on staging with different metric categories
2. Measure latency difference between search: true vs false
3. If safe, implement metric-category-based search toggle
4. Consider Grok's "Dynamic Category Augmentation" idea for Opus review

---

## 🚨 HANDOFF: INCREMENTAL LLM ADDITION FEATURE 🚨

**Date:** 2026-01-20
**Issue:** User cannot add more LLMs after initial results display
**Status:** DESIGN COMPLETE, IMPLEMENTATION PENDING

### Problem Statement

After running Enhanced Mode comparison:
1. User selects cities → clicks LLM(s) → results appear
2. App auto-switches to Results tab
3. **LLMSelector disappears** - only exists on Compare tab
4. User cannot add more LLMs without starting over
5. Completed LLM states are lost when switching tabs
6. No visual indication of which LLMs contributed to current results

### CRITICAL: Gamma Timing Issue

⚠️ **Gamma reports cost money per generation** ⚠️

If we allow incremental LLM addition:
- Adding each new LLM could trigger a new Gamma report
- This would be EXTREMELY expensive
- Need explicit user control over when Gamma generates

**Proposed Solution:**
1. Do NOT auto-trigger Gamma on LLM completion
2. Add explicit "Generate Report" button on Results tab
3. Only call Gamma when user clicks that button
4. Show clear indicator: "Report will include results from X LLMs"

### Affected Files (MORE than initially thought)

| File | Impact | Changes Needed |
|------|--------|----------------|
| `src/App.tsx` | HIGH | Lift `llmStates` to App level, pass to Results tab |
| `src/components/EnhancedComparison.tsx` | HIGH | Extract `AddMoreLLMs` component, modify `LLMSelector` |
| `src/components/EnhancedResults.tsx` (inside EnhancedComparison.tsx) | HIGH | Add "Add More Models" section |
| `src/services/llmEvaluators.ts` | MEDIUM | May need to expose state merging logic |
| `src/services/opusJudge.ts` | LOW | Judge already re-runs when more LLMs complete |
| `src/components/VisualsTab.tsx` | HIGH | **MUST NOT auto-trigger Gamma** |
| `src/services/gammaService.ts` | LOW | No change, but timing matters |
| `api/gamma.ts` | LOW | No change needed |

### State That Needs Lifting to App.tsx

Currently in `LLMSelector` (local state):
```typescript
const [llmStates, setLLMStates] = useState<Map<LLMProvider, LLMButtonState>>()
const [judgeResult, setJudgeResult] = useState<JudgeOutput | null>(null)
const [lastJudgedCount, setLastJudgedCount] = useState(0)
```

This state MUST be lifted to `App.tsx` so it persists across tab switches.

### Proposed UX Flow

1. **Compare Tab:** User runs initial LLM(s)
2. **Results Tab:** Shows results with "Evaluated by: [icons]" section
3. **Results Tab:** Below icons, show "+ Add More Models" button
4. **Click "+":** Expands mini-selector showing remaining LLMs
5. **Run new LLM:** Merges with existing, judge re-runs
6. **Results update:** In-place, no page refresh
7. **Gamma:** ONLY generates when user clicks explicit "Generate Report" button

### Implementation Order

1. Lift `llmStates`, `judgeResult`, `lastJudgedCount` to App.tsx
2. Pass as props to both Compare and Results tabs
3. Create `AddMoreLLMs` component (simplified LLMSelector)
4. Add to EnhancedResults component
5. Ensure VisualsTab does NOT auto-trigger Gamma
6. Add explicit "Generate Report" button with confirmation

### Testing Requirements

- [ ] Can add LLM after initial results
- [ ] Completed LLM buttons stay "lit" when returning to Compare tab
- [ ] Judge re-runs with combined results
- [ ] Results update in-place
- [ ] Gamma does NOT auto-generate
- [ ] Gamma only generates on explicit button click
- [ ] No duplicate Gamma calls

---

## 🚨 HANDOFF: PERPLEXITY FIX DEPLOYED 🚨

**Date:** 2026-01-20
**Commit:** `f3a9dd1`
**Issue:** Perplexity only returning 3-4 of 6 categories, hero scores nearly identical

### Root Cause Analysis

**Why Perplexity was failing:**
1. Claude and GPT-4o get **Tavily pre-fetch** (12 searches + Research API report)
2. Gemini has **Google Search grounding**
3. Grok has **native X search**
4. Perplexity had **NOTHING** - relied entirely on Sonar web search during inference
5. With 6 category calls, later waves were timing out

**Why hero scores were similar:**
1. When category times out, it returns empty
2. Empty categories default to score 50 in `opusJudge.ts:86`
3. If 2-3 categories = 50 for ALL cities, scores converge

### Fix Applied

Added same Tavily pre-fetch to Perplexity that Claude/GPT-4o have:
- 12 category searches (6 categories × 2 cities)
- Tavily Research API baseline report
- Prepended to prompt as context

**File changed:** `api/evaluate.ts` (lines 1015-1093)
**No other files affected**

### Web Search Matrix (Updated)

| LLM | Web Search Method |
|-----|-------------------|
| Claude Sonnet | Tavily pre-fetch ✅ |
| GPT-4o | Tavily pre-fetch ✅ |
| Gemini 3 Pro | Google Search grounding |
| Grok 4 | Native X search |
| Perplexity | Tavily pre-fetch ✅ + Sonar |

### Testing Needed

- [ ] Perplexity now returns all 6 categories
- [ ] Hero scores now vary appropriately between city pairs
- [ ] No timeout errors in Vercel logs

---

## Previous Session: 2026-01-19
**Conversation ID:** `LIFESCORE-2026-0120-GAMMA`

### Gamma Integration Status
| Step | Status |
|------|--------|
| GAMMA_API_KEY in Vercel | ✅ DONE |
| GAMMA_THEME_ID in Vercel | ✅ DONE (optional) |
| GAMMA_TEMPLATE_ID in Vercel | ✅ DONE (`g_ceert739ynnkueg`) |
| Master template in Gamma app | ✅ DONE (10-card LIFE SCORE template) |
| src/types/gamma.ts | ✅ DONE |
| src/services/gammaService.ts | ✅ DONE |
| api/gamma.ts | ✅ DONE |
| src/components/VisualsTab.tsx | ✅ DONE |
| App.tsx integration | ✅ DONE |
| End-to-end testing | ⏳ PENDING |

### What Was Fixed This Session

| Issue | Fix | Commit | Lines |
|-------|-----|--------|-------|
| #5 Per-metric evidence hardcoded | Wired to `metric.llmScores[].evidence[]` | 427baa4 | +34 |
| #6 Identical Law/Reality scores | Dual category prompt + parsing | 14340ef | +35 |
| #9 Duplicate Judge code | Removed from opusJudge.ts | 9d2caae | -417 |
| #10 Dead client code | Removed evaluator functions | 1568773 | -1,548 |
| #11 opusJudge divergence | Covered by #9 | - | - |
| #13 Hardcoded evidence | Covered by #5 | - | - |

**Total dead code removed: ~2,000 lines**

### Codebase Now Clean:
- `llmEvaluators.ts`: 333 lines (was 1,493)
- `enhancedComparison.ts`: 69 lines (was 349)
- `opusJudge.ts`: 212 lines (was 629)
- `EnhancedComparison.tsx`: 1,614 lines (was 1,701)

### Still Needs Testing
| Item | Status |
|------|--------|
| GPT-4o evaluation | NEEDS TEST |
| Perplexity evaluation | NEEDS TEST |
| Law vs Enforcement scores now different | NEEDS TEST |
| Per-metric evidence displays correctly | NEEDS TEST |

### Next Session - Remaining Items
See Master Issue Table below for items #23-52:
- ~~#19: Saved button persistence~~ **FIXED** (commit 1e94321)
- ~~#23-29: Branding to "Clues Intelligence LTD"~~ **FIXED** (commit 3ae6461)
- #30-36: Olivia AI features
- #37-39: Reports (Gamma API)
- #40-46: User/Payment (Stripe)
- #47-49: Database caching
- #50-52: Mobile (Vite Capacitor)

---

## GAMMA API INTEGRATION (#37-39) - VISUAL REPORTS

**CRITICAL:** This is the visual heart of Clues. Transforms raw data into beautiful storybook presentations.

**Documentation Files:**
- `GAMMA_API_INTEGRATION.md` - Complete API reference (500+ lines)
- `HANDOFF_GAMMA_INTEGRATION.md` - Implementation guide & handoff

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  5 LLMs → Opus Judge → Raw Data → Gamma API → Visual Storybook     │
│                                       ↓                             │
│                    ┌──────────────────┴──────────────────┐          │
│                    │                                     │          │
│               Visuals Tab                          Ask Olivia       │
│               (Gamma Embed)                        (D-ID/HeyGen)    │
│                    │                                     │          │
│               PDF/PPTX Export                    Summary & Plan     │
└─────────────────────────────────────────────────────────────────────┘
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1.0/generations` | POST | Create from scratch |
| `/v1.0/generations/from-template` | POST | **Create from template (RECOMMENDED)** |
| `/v1.0/generations/{id}` | GET | Check status / get result |
| `/v1.0/themes` | GET | List available themes |
| `/v1.0/folders` | GET | List storage folders |

### Two Approaches

| Approach | Use Case | Consistency |
|----------|----------|-------------|
| Regular API | Custom one-offs | Variable |
| **Templates API (Beta)** | **Uniform branded reports** | **Identical every time** |

**LIFE SCORE should use Templates API** for consistent branding.

### Template Approach (Recommended)

```json
{
  "gammaId": "g_lifescore_template_v1",
  "prompt": "Austin vs Miami: Winner Austin (72 vs 65)...",
  "exportAs": "pdf"
}
```

### 10-Card Report Structure

1. **Hero** - Winner declaration, city images
2. **Radar Chart** - All 6 categories visualized
3. **Personal Freedom** - Scores + evidence
4. **Housing & Property** - Scores + evidence
5. **Business & Work** - Scores + evidence
6. **Transportation** - Scores + evidence
7. **Policing & Courts** - Scores + evidence
8. **Speech & Lifestyle** - Scores + evidence
9. **Winner Summary** - Final verdict
10. **Clues CTA** - Ask Olivia, ecosystem links

### Implementation Order

1. Create master template in Gamma app (manual)
2. Add `GAMMA_API_KEY` to Vercel
3. Create `src/types/gamma.ts`
4. Create `src/services/gammaService.ts`
5. Create `api/gamma.ts`
6. Create `src/components/VisualsTab.tsx`
7. Update `TabNavigation.tsx` with new tabs
8. Test end-to-end

### New Environment Variables

```
GAMMA_API_KEY=sk-gamma-xxxxxxxx
GAMMA_TEMPLATE_ID=[from Gamma app after creating template]
GAMMA_FOLDER_ID=[optional - for organizing reports]
```

### New Files to Create

| File | Purpose |
|------|---------|
| `src/types/gamma.ts` | Type definitions |
| `src/services/gammaService.ts` | API integration |
| `api/gamma.ts` | Serverless endpoint |
| `src/components/VisualsTab.tsx` | Report viewer |
| `src/components/AskOliviaTab.tsx` | AI assistant |

---

## COURT ORDER INJUNCTION - CLAUDE CODE RESTRICTIONS

**CLAUDE CODE IS FORBIDDEN FROM MAKING THE FOLLOWING CHANGES WITHOUT DIRECT OWNER APPROVAL:**

1. **TIMEOUT VALUES** - Any modification to timeout constants
2. **API MODEL NAMES** - Any changes to LLM model identifiers
3. **API KEY NAMES** - Any changes to environment variable names

**VIOLATION OF THIS INJUNCTION WILL RESULT IN IMMEDIATE TERMINATION OF CLAUDE CODE SESSION.**

---

## TIMEOUT AUDIT (Updated 2026-01-19)

**Vercel Pro Limit: 300 seconds**

| Layer | Constant | Value | File |
|-------|----------|-------|------|
| Vercel Hard Limit | `maxDuration` | 300s | vercel.json |
| Server LLM Calls | `LLM_TIMEOUT_MS` | 240s | api/evaluate.ts |
| Server Opus Judge | `OPUS_TIMEOUT_MS` | 240s | api/judge.ts |
| Client Fetch | `CLIENT_TIMEOUT_MS` | 240s | src/services/llmEvaluators.ts |

---

## API CONFIGURATION

### LLM Model Identifiers
| Provider | Model ID | API Endpoint |
|----------|----------|--------------|
| Claude Sonnet | `claude-sonnet-4-5-20250929` | api.anthropic.com |
| Claude Opus | `claude-opus-4-5-20251101` | api.anthropic.com |
| GPT-4o | `gpt-4o` | api.openai.com |
| Gemini | `gemini-3-pro-preview` | generativelanguage.googleapis.com |
| Grok | `grok-4` | api.x.ai |
| Perplexity | `sonar-reasoning-pro` | api.perplexity.ai |

### Environment Variables (Vercel)
```
ANTHROPIC_API_KEY    # Claude Sonnet & Opus
OPENAI_API_KEY       # GPT-4o
GEMINI_API_KEY       # Gemini 3 Pro
XAI_API_KEY          # Grok 4
PERPLEXITY_API_KEY   # Perplexity Sonar
TAVILY_API_KEY       # Web search for Claude/GPT
```

### Web Search Integration (Updated 2026-01-20)
| LLM | Web Search Method |
|-----|-------------------|
| Claude Sonnet | Tavily API (prepended to prompt) |
| GPT-4o | Tavily API (prepended to prompt) |
| Gemini 3 Pro | Google Search Grounding (google_search tool) |
| Grok 4 | Native (`search: true`) |
| Perplexity | Tavily API + Native Sonar (commit f3a9dd1) |

---

## FEATURES

- 100 Freedom Metrics across 6 categories
- City-to-city comparison
- Multi-LLM Consensus (5 LLMs + Claude Opus Judge)
- Real-time web search integration
- Modern React + TypeScript + Vite stack
- Vercel deployment

## Categories

| Category | Metrics | Weight |
|----------|---------|--------|
| Personal Freedom & Morality | 15 | 20% |
| Housing, Property & HOA Control | 20 | 20% |
| Business & Work Regulation | 25 | 20% |
| Transportation & Daily Movement | 15 | 15% |
| Policing, Courts & Enforcement | 15 | 15% |
| Speech, Lifestyle & Culture | 10 | 10% |

---

## QUICK START

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## DEBUG LOGGING

### Vercel Logs - What to Look For

**Evaluate endpoint (api/evaluate.ts):**
```
[PARSE] claude raw response (first 500): ...
[PARSE] claude format: categories=bool, letters=bool, numbers=bool
[PARSE] claude returned N evaluations
```

**Judge endpoint (api/judge.ts):**
```
[JUDGE] Evaluator results: N successful LLMs (names), N total scores
[JUDGE] Disagreement metrics: N (list...)
[JUDGE] hasActualScores=bool, anthropicKey=bool, city1=X, city2=Y
[JUDGE] Calling Opus API with prompt length: N chars
[JUDGE] Opus response received, content length: N chars
[JUDGE] Opus judgments parsed: N judgments
```

---

## ARCHITECTURE

### Data Flow
```
User clicks "Compare LIFE SCORES"
    ↓
App.tsx sets enhancedStatus='running'
    ↓
LLMSelector renders with 5 LLM buttons
    ↓
User clicks LLM button
    ↓
POST /api/evaluate (Vercel serverless)
    ↓
LLM returns scores → parseResponse()
    ↓
After 1+ LLMs complete → POST /api/judge
    ↓
Opus builds consensus → EnhancedResults displayed
```

### File Structure
```
api/
├── evaluate.ts      # LLM evaluations (all 5 providers)
├── judge.ts         # Claude Opus consensus builder
├── health.ts        # Health check endpoint
└── shared/          # Shared metrics module
    └── metrics.ts

src/
├── components/      # React components
├── services/        # Client-side services
├── types/           # TypeScript types
├── data/            # Metrics definitions
└── hooks/           # Custom React hooks
```

---

## RECENT COMMITS (Last 20)

```
3114a40 Fix GPT-4o, Perplexity failures + add Judge debug logging
7733f99 Improve Evidence Panel: match category progress height & styling
9a6c999 Auto-switch to Results tab on standard mode completion
a6f1fc0 Fix TypeScript errors in api/evaluate.ts
97dfade Fix scoring system: Port prompts from client to server
cb911f1 Add handoff document for next session
6a7617a Add detailed fix plan for scoring system
31beebc CRITICAL: Document all scoring system issues
8ffd14b Trigger redeploy
c7059d7 Fix Gemini API: googleSearchRetrieval → google_search
30a7da6 Add .js extensions to ESM imports for Vercel
55928c4 Fix includeFiles path to api/shared/**
13c09d1 Trigger redeploy for USE_CATEGORY_SCORING env var
db40057 Create standalone api/shared module for Vercel serverless
9be1ffe Update README and handoff docs
ea7537c Fix Vercel serverless import issue
57c1bd5 Update handoff document with critical fix status
02367fa Document critical API fix needed
7916568 Fix TypeScript errors in cache.ts and metrics.ts
1e6e82f Remove obsolete Phase 2/4 documentation files
```

---

## MANDATORY DEVELOPMENT RULES

### NO DEMO MODE ALLOWED
- No `demoMode` parameters or flags
- No fake/simulated data generators
- All data MUST come from real API calls

### AI ASSISTANT (Claude) MANDATORY RULES
1. **ATTESTATION REQUIREMENT**: Must verify ALL file locations before stating work is complete
2. **TYPESCRIPT VERIFICATION**: Must run `npx tsc --noEmit` before stating build is complete
3. **NO ALTERNATIVE CODE BLOCKS**: No duplicate functionality without permission
4. **NO CODE ROLLBACKS**: No rollbacks without explicit permission
5. **MODEL CONSISTENCY**: Never change LLM model IDs without permission

---

## KNOWN ISSUES TO INVESTIGATE

| Issue | Status | Notes |
|-------|--------|-------|
| GPT-4o fails | FIX DEPLOYED | Removed false web search claim |
| Perplexity fails | FIX DEPLOYED | Removed strict JSON schema |
| Opus runs too fast | DEBUG ADDED | Check [JUDGE] logs |
| Only ~25% metrics returned | MONITORING | Added debug logging |
| **#5 Per-metric evidence hardcoded** | ✅ FIXED | Wired to `metric.llmScores[].evidence[]` - commit 427baa4 |
| **#6 Identical Law/Reality scores** | ✅ FIXED | Dual category prompt + parsing - commit 14340ef |
| **#9 Duplicate Judge code** | ✅ FIXED | Removed ~417 lines from opusJudge.ts - commit 9d2caae |
| **#10 Client prompts out of sync** | ✅ FIXED | Dead code removed (~1,548 lines) - commit 1568773 |
| **#11 opusJudge.ts divergence** | ✅ FIXED | Covered by #9 - duplicate code removed |
| **#12 LLMProvider type** | NO ISSUE | Type is correct |
| **#13 EnhancedComparison hardcoded** | ✅ FIXED | Covered by #5 fix - commit 427baa4 |
| **#19 Saved button persistence** | ✅ FIXED | Deterministic IDs based on city pair - commit 1e94321 |
| **#23-29 Rebrand to Clues Intelligence LTD** | ✅ FIXED | 14 files updated - commit 3ae6461 |

---

## ISSUE #6: Identical Law/Reality Scores - DETAILED ANALYSIS

**Root Cause Identified: 2026-01-20**

### Problem Chain
1. When `USE_CATEGORY_SCORING=true` (Vercel env var), `buildCategoryPrompt()` asks for only ONE category per city
2. Prompt returns: `city1Category`, `city2Category` (single values)
3. `parseResponse()` at lines 402-405 duplicates the value:
   ```javascript
   city1LegalScore: city1Score,
   city1EnforcementScore: city1Score,  // ← BUG: Same value!
   ```

### Files Affected
- `api/evaluate.ts:297-340` - `buildCategoryPrompt()` needs dual categories
- `api/evaluate.ts:395-412` - `parseResponse()` needs to parse both fields

### Chosen Fix: Option A - Expand Categories for Dual Scoring

**Changes Required:**
1. Update `buildCategoryPrompt()` to ask for:
   - `city1LegalCategory` - What the law says
   - `city1EnforcementCategory` - How it's enforced
   - `city2LegalCategory`
   - `city2EnforcementCategory`

2. Update `parseResponse()` to parse all 4 fields:
   ```javascript
   city1LegalScore: getCategoryScore(e.metricId, e.city1LegalCategory),
   city1EnforcementScore: getCategoryScore(e.metricId, e.city1EnforcementCategory),
   ```

3. Consider whether enforcement needs different category options or can reuse legal scale

**Priority:** HIGH - Core differentiator of LifeScore product

---

## ISSUE #9: Duplicate Judge Code - DETAILED ANALYSIS

**Root Cause Identified: 2026-01-20**

### Problem: Two Separate Judge Implementations

| Path | File | How Called | Lines |
|------|------|------------|-------|
| Server | `api/judge.ts` | `fetch('/api/judge')` | ~500 |
| Client | `src/services/opusJudge.ts` | `runOpusJudge()` direct | ~629 |

### Duplicated Functions (~600 lines)
- `fetchWithTimeout()`
- `calculateMean/StdDev/Median()`
- `buildMetricConsensus()`
- `aggregateScoresByMetric()` variants
- `JUDGE_PROMPT_TEMPLATE`
- `parseOpusResponse()`
- `mergeOpusJudgments()`

### Current Usage
- `EnhancedComparison.tsx:195` → calls `/api/judge` (server)
- `enhancedComparison.ts:218` → calls `runOpusJudge()` (client direct)

### Chosen Fix: Option A - Server-Only Judge

**Changes Required:**
1. Modify `src/services/opusJudge.ts`:
   - Remove duplicate logic (fetchWithTimeout, stats functions, API call)
   - Replace `runOpusJudge()` to call `/api/judge` endpoint instead
   - Keep `buildCategoryConsensuses()` (needed client-side for result building)
   - Keep `buildEnhancedResultFromJudge()` (needed client-side for result building)

2. Ensure `api/judge.ts` returns all data needed by client

3. Update `src/services/enhancedComparison.ts:218` to use new pattern

### Files to Modify
- `src/services/opusJudge.ts` - Major refactor
- `src/services/enhancedComparison.ts` - Update call pattern
- `api/judge.ts` - Verify response shape

### Testing Requirements (MANDATORY)
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] All 5 LLM buttons work in EnhancedComparison UI
- [ ] enhancedComparison.ts service flow works
- [ ] Judge returns correct consensus scores
- [ ] No runtime errors in browser console
- [ ] Vercel deployment succeeds
- [ ] Full attestation required before merge

**Priority:** MEDIUM - Tech debt, risk of code drift

---

## ISSUE #10: Client Prompts Out of Sync - DETAILED ANALYSIS

**Root Cause Identified: 2026-01-20**

### Problem: Dead Code with Duplicate Prompts

`src/services/llmEvaluators.ts` contains ~1000 lines of functions that call LLM APIs directly:
- `evaluateWithClaude()` - lines ~300-500
- `evaluateWithGPT4o()` - lines ~500-600
- `evaluateWithGemini()` - lines ~600-700
- `evaluateWithGrok()` - lines ~700-800
- `evaluateWithPerplexity()` - lines ~800-1000

These have their **own prompts** that may be out of sync with `api/evaluate.ts`.

### Current Usage

| Function | What it calls | Used by |
|----------|---------------|---------|
| `runSingleEvaluatorBatched()` | `/api/evaluate` (server) | EnhancedComparison.tsx (LLM buttons) |
| `runAllEvaluators()` | Direct LLM APIs (client) | enhancedComparison.ts (service) |

### Risk Assessment: LOW
- The LLM buttons UI (main user flow) uses the correct server path
- The old `runAllEvaluators()` is only called by `enhancedComparison.ts`
- That service is used by `EnhancedComparisonContainer` but the primary flow is the button UI

### Recommended Fix (when time permits)
1. Delete the direct API call functions (~1000 lines)
2. Update `runAllEvaluators()` to use `/api/evaluate` like `runSingleEvaluatorBatched()` does
3. Or: Delete `runAllEvaluators()` entirely if not needed

**Priority:** LOW - Dead code, not actively causing bugs

---

## LICENSE

UNLICENSED - Clues Intelligence LTD

 
.
# 
!

