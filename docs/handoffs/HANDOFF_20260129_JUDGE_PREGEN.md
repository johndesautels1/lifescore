# HANDOFF: Judge Pre-Generation & Replicate Fix

**Date:** 2026-01-29
**Conversation ID:** LS-JUDGE-PREGEN-20260129
**Status:** Ready for Implementation

---

## SUMMARY OF THIS SESSION

### Completed This Session:

1. **Supabase Retry Logic** ✅
   - Added exponential backoff retry to all Supabase queries
   - Files: `src/lib/supabase.ts`, `AuthContext.tsx`, `databaseService.ts`, `useTierAccess.ts`, `JudgeTab.tsx`, `savedComparisons.ts`
   - Commit: `e1a955a`

2. **Court Order Section Resize** ✅
   - Matched Judge video viewport size (900px max-width)
   - Commit: `163a392`

3. **Replicate Deployment Setup** ✅
   - Switched code to use deployment endpoint: `johndesautels1/james-bond`
   - Changed deployment hardware from CPU → **Nvidia T4 GPU**
   - Commit: `04fcdd8`

4. **Stripe Webhook Fix** ✅
   - User updated webhook URL from `lifescore.vercel.app` → `clueslifescore.com`
   - All 7 Stripe env vars confirmed in Vercel

5. **Judge Pre-Generation Plan** ✅
   - Created implementation plan: `docs/JUDGE_PREGENERATION_IMPLEMENTATION.md`
   - Commit: `7a38dd8`

---

## PENDING TASKS FOR NEXT SESSION

### Task 1: Get Christiano PNG URL from Replicate

**Status:** User uploaded PNG to Replicate playground, ran test successfully

**Action needed:**
1. User needs to copy the PNG URL from Replicate (format: `https://replicate.delivery/pbxt/xxxxx/enhanced_avatar_max.png`)
2. Add to Vercel as `CHRISTIANO_IMAGE_URL`
3. Current code uses MP4 which causes head bobbing - PNG will fix this

**Optimal SadTalker settings (user tested):**
- `pose_style`: 25
- `expression_scale`: 0
- `still_mode`: true
- `preprocess`: full
- `size_of_image`: 512

### Task 2: Implement Judge Pre-Generation

**Implementation Plan:** `D:\lifescore\docs\JUDGE_PREGENERATION_IMPLEMENTATION.md`

**8 Files to Modify:**

| # | File | Change Required | Status |
|---|------|-----------------|--------|
| 1 | `src/App.tsx` | Add background trigger after comparison completes | PENDING |
| 2 | `src/components/EnhancedComparison.tsx` | Fire non-blocking API call when results ready | PENDING |
| 3 | `src/components/JudgeTab.tsx` | Check database FIRST before showing generate button | PENDING |
| 4 | `src/hooks/useJudgeVideo.ts` | Add method to check if video exists in DB | PENDING |
| 5 | `src/services/judgePregenService.ts` | NEW FILE: Service for background generation | PENDING |
| 6 | `api/judge-report.ts` | Add comparison_id to response for DB lookup | PENDING |
| 7 | `api/avatar/generate-judge-video.ts` | Already caches - verify working | PENDING |
| 8 | `src/types/judge.ts` | NEW FILE: Shared types for pre-generation | PENDING |

**Commit Strategy:** One commit per file change for traceability

---

## CURRENT STATE OF KEY SYSTEMS

### Replicate Deployment
- **Name:** `johndesautels1/james-bond`
- **Model:** `cjwbw/sadtalker:a519cc0c`
- **Hardware:** Nvidia T4 GPU ($0.81/hr)
- **Autoscaling:** 0 min / 1 max instances
- **API Endpoint:** `https://api.replicate.com/v1/deployments/johndesautels1/james-bond/predictions`

### Stripe Configuration
- **Webhook URL:** `https://clueslifescore.com/api/stripe/webhook`
- **Events:** checkout.session.completed, customer.subscription.*, invoice.payment_*
- **All env vars set:** STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, 4x PRICE IDs

### Database Tables
- `judge_reports` - Stores judge verdicts
- `avatar_videos` - Caches generated videos
- `subscriptions` - Stripe subscription data
- Index created: `idx_judge_reports_video_id`

---

## ENVIRONMENT VARIABLES TO VERIFY

```
# Replicate
REPLICATE_API_TOKEN=r8_xxx
REPLICATE_DEPLOYMENT_OWNER=johndesautels1  (optional, defaults in code)
REPLICATE_DEPLOYMENT_NAME=james-bond       (optional, defaults in code)

# Christiano Avatar
CHRISTIANO_IMAGE_URL=<NEEDS PNG URL FROM REPLICATE>
ELEVENLABS_CHRISTIANO_VOICE_ID=ZpwpoMoU84OhcbA2YBBV

# Stripe (all 7 confirmed)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_NAVIGATOR_MONTHLY=price_xxx
STRIPE_PRICE_NAVIGATOR_ANNUAL=price_xxx
STRIPE_PRICE_SOVEREIGN_MONTHLY=price_xxx
STRIPE_PRICE_SOVEREIGN_ANNUAL=price_xxx
```

---

## RESUME COMMAND

```
Resume Judge Pre-Generation Implementation.

Conversation ID: LS-JUDGE-PREGEN-20260129
Repo: D:\lifescore

Read these files first:
1. D:\lifescore\docs\handoffs\HANDOFF_20260129_JUDGE_PREGEN.md
2. D:\lifescore\docs\JUDGE_PREGENERATION_IMPLEMENTATION.md

TASKS:
1. Get Christiano PNG URL from user and update CHRISTIANO_IMAGE_URL
2. Implement Judge pre-generation (8 files per implementation plan)
3. Commit each file change separately
4. Fill in verification attestation table
5. Test end-to-end: comparison → background generation → instant Judge tab load
```

---

## KEY FILES REFERENCE

| Feature | Primary Files |
|---------|---------------|
| Judge Report API | `api/judge-report.ts` |
| Judge Video API | `api/avatar/generate-judge-video.ts` |
| Judge Tab UI | `src/components/JudgeTab.tsx` |
| Video Hook | `src/hooks/useJudgeVideo.ts` |
| Comparison Flow | `src/components/EnhancedComparison.tsx`, `src/App.tsx` |
| Supabase Retry | `src/lib/supabase.ts` |
| Stripe Checkout | `api/stripe/create-checkout-session.ts` |
| Stripe Webhook | `api/stripe/webhook.ts` |
| Stripe Portal | `api/stripe/create-portal-session.ts` |

---

## COMMITS THIS SESSION

| Hash | Description |
|------|-------------|
| `163a392` | Resize Court Order section to match Judge video viewport |
| `e1a955a` | Add exponential backoff retry logic for all Supabase queries |
| `04fcdd8` | Switch Judge video to use Replicate deployment endpoint |
| `7a38dd8` | docs: add Judge pre-generation implementation plan |

---

## NOTES

1. User is on PAID Supabase tier - timeout issues are transient, not cold start related
2. SadTalker requires PNG source image (not MP4) for stable output
3. User's email for developer bypass: `brokerpinellas@gmail.com`
4. Technical Support Manual updated with retry logic documentation

---

**End of Handoff**
