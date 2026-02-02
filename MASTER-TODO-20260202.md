# LIFE SCORE - MASTER TODO CHECKLIST
**Conversation ID:** `LIFESCORE-DEBUG-20260202-001`
**Generated:** February 2, 2026
**Purpose:** Consolidated list of ALL unfinished items from all README/handoff files

---

## SUMMARY

| Category | Not Started | In Progress | Total |
|----------|-------------|-------------|-------|
| Critical Bugs | 4 | 1 | 5 |
| Pricing/Tier Fix | 10 | 0 | 10 |
| Documentation Audit | 15 | 0 | 15 |
| Wav2Lip Migration | 0 | 0 | 7 ✅ COMPLETE |
| Infrastructure | 4 | 0 | 4 |
| Features Incomplete | 24 | 0 | 24 |
| Saved Reports Fixes | 6 | 0 | 6 |
| Olivia Enhancements | 2 | 0 | 2 |
| Compliance/Legal | 14 | 2 | 16 |
| **TOTAL** | **86** | **3** | **89** |

---

## SECTION 1: CRITICAL BUGS (5 items)

| # | Bug | File(s) | Status | Priority |
|---|-----|---------|--------|----------|
| 1.1 | Judge Tab Video/Pic Not Rendering | `src/components/JudgeTab.tsx` | NOT STARTED | HIGH |
| 1.2 | Supabase 406 Not Acceptable error | Auth/Supabase | NOT STARTED | MEDIUM |
| 1.3 | Tier/permission issue - loading saved comparisons ignores user's actual tier | `src/components/FeatureGate.tsx`, `src/hooks/useTierAccess.ts` | NOT STARTED | CRITICAL |
| 1.4 | Results page not opening after enhanced comparison | `src/App.tsx:136-140`, `src/components/EnhancedComparison.tsx` | NOT STARTED | HIGH |
| 1.5 | Cost tracking - capture usage field from API responses | Frontend integration | IN PROGRESS | MEDIUM |

**Source:** `docs/BUG_TRACKING_20260129.md`, `docs/handoffs/CRITICAL_BUG_HANDOFF.md`, `docs/handoffs/HANDOFF_20260129_BUGS.md`

---

## SECTION 2: PRICING/TIER FIX (10 items)

**Source:** `docs/PRICING_TIER_AUDIT.md`

All limits are **PER MONTH**. Correct values:
- FREE: 1 LLM, 1 comparison, NO Olivia, NO Gamma
- NAVIGATOR ($29/$249): 1 LLM, 1 comparison, 15min Olivia, 1 Gamma
- SOVEREIGN ($99/$899): 5 LLMs, 1 comparison (all 5 LLMs), 60min Olivia, 1 Gamma

| # | Task | File | Status |
|---|------|------|--------|
| 2.1 | Update tier limits (SOURCE OF TRUTH) | `src/hooks/useTierAccess.ts` | NOT STARTED |
| 2.2 | Fix pricing display | `src/components/PricingModal.tsx` | NOT STARTED |
| 2.3 | Fix pricing page | `src/components/PricingPage.tsx` | NOT STARTED |
| 2.4 | Fix feature gating logic | `src/components/FeatureGate.tsx` | NOT STARTED |
| 2.5 | Fix User Manual - PIONEER→NAVIGATOR, fix limits | `docs/manuals/USER_MANUAL.md` | NOT STARTED |
| 2.6 | Fix Customer Service Manual | `docs/manuals/CUSTOMER_SERVICE_MANUAL.md` | NOT STARTED |
| 2.7 | Fix Technical Support Manual | `docs/manuals/TECHNICAL_SUPPORT_MANUAL.md` | NOT STARTED |
| 2.8 | Fix embedded manuals content (lines 36-300) | `api/emilia/manuals.ts` | NOT STARTED |
| 2.9 | Fix main README | `README.md` | NOT STARTED |
| 2.10 | Fix legal documents (Terms, Refund) | `docs/legal/*.md` | NOT STARTED |

**Common errors to fix:**
- "PIONEER" → "NAVIGATOR"
- "$9.99/$24.99" → "$29/$99"
- "3 comparisons/month free" → "1"
- "unlimited comparisons for paid" → "1/month"
- "50 Olivia messages/day" → "15 min/month" or "60 min/month"

---

## SECTION 3: DOCUMENTATION/MANUAL AUDIT (15 items)

**Source:** `docs/handoffs/HANDOFF_20260130_MANUAL_AUDIT.md`

Total issues found: **127** across 2,098 lines. Priority items:

| # | Task | Files | Status |
|---|------|-------|--------|
| 3.1 | Fix all domain names: `lifescore.app` → `clueslifescore.com` | All manuals | NOT STARTED |
| 3.2 | Fix password requirements inconsistency (6 chars vs 8 chars) | USER_MANUAL, CSM | NOT STARTED |
| 3.3 | Add missing 12 environment variables to Tech Manual | `TECHNICAL_SUPPORT_MANUAL.md` | NOT STARTED |
| 3.4 | Fix database table count (14 vs 15) | `TECHNICAL_SUPPORT_MANUAL.md` | NOT STARTED |
| 3.5 | Add missing database tables: api_quota_settings, api_quota_alert_log | Tech Manual §4.1 | NOT STARTED |
| 3.6 | Add Cost Dashboard section to User Manual | `USER_MANUAL.md` §15 | NOT STARTED |
| 3.7 | Add Emilia Help Assistant section to all manuals | All manuals | NOT STARTED |
| 3.8 | Update avatar provider hierarchy (Simli primary, D-ID fallback) | All manuals | NOT STARTED |
| 3.9 | Add all missing API endpoints (Emilia, Usage) | Tech Manual §3.4, §3.5 | NOT STARTED |
| 3.10 | Add quota alert templates to CSM | `CUSTOMER_SERVICE_MANUAL.md` | NOT STARTED |
| 3.11 | Update glossary (Emilia, Cost Dashboard, TTS, Fallback) | CSM §12 | NOT STARTED |
| 3.12 | Add TTS fallback info (ElevenLabs → OpenAI TTS nova) | All manuals | NOT STARTED |
| 3.13 | Verify city count in metros.ts (200 claimed) | `src/data/metros.ts` | NOT STARTED |
| 3.14 | Add Kling AI mentions where missing | All manuals | NOT STARTED |
| 3.15 | Update version numbers to v2.3 after fixes | All manuals | NOT STARTED |

---

## SECTION 4: WAV2LIP MIGRATION (7 items) ✅ ALL COMPLETE

**Source:** `docs/handoffs/HANDOFF_20260130_PHASE4.md`

API endpoint switched, all supporting files updated and verified:

| # | Task | File | Status |
|---|------|------|--------|
| 4.1 | Update Wav2Lip type definitions | `src/types/avatar.ts` (lines 134-141) | ✅ DONE |
| 4.2 | Add replicate-wav2lip to cost calculator | `src/utils/costCalculator.ts` (line 98) | ✅ DONE |
| 4.3 | Update API usage types - fallback provider | `src/types/apiUsage.ts` (lines 55, 69-75) | ✅ DONE |
| 4.4 | Update Cost Dashboard - price per second | `src/components/CostDashboard.tsx` (line 730-731) | ✅ DONE |
| 4.5 | Update Technical Support Manual | `docs/manuals/TECHNICAL_SUPPORT_MANUAL.md` (lines 540, 597, 743, 896) | ✅ DONE |
| 4.6 | Update Voice Flow Architecture | `docs/VOICE_FLOW_ARCHITECTURE.md` (lines 52, 188, 212, 224) | ✅ DONE |
| 4.7 | Update Supabase migration | `supabase/migrations/20260130_create_api_quota_settings.sql` (line 97) | ✅ DONE |

**Verified Values:** $0.0014/sec, $10 budget, ~$0.005/video
**Also:** Delete old Replicate Wav2Lip deployment from dashboard (manual task)

---

## SECTION 5: INFRASTRUCTURE (4 items)

**Source:** `docs/MASTER_README.md`, `HANDOFF-20260130.md`

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Domain DNS Setup (GoDaddy → Vercel) | NOT STARTED | clueslifescore.com |
| 5.2 | Vercel Custom Domain Config | NOT STARTED | |
| 5.3 | Verify GitHub-Vercel auto-deploy | NOT STARTED | |
| 5.4 | Add WEBHOOK_BASE_URL env var to Vercel | NOT STARTED | `WEBHOOK_BASE_URL=https://clueslifescore.com` |

---

## SECTION 6: FEATURES INCOMPLETE (24 items)

### 6A: Data Sources & Evidence (4 items)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6A.1 | Perplexity Data Sources | HIGH | NOT STARTED |
| 6A.2 | 5th Thumbnail UI Wiring | HIGH | NOT STARTED |
| 6A.3 | Multi-LLM Field Sources Missing | CRITICAL | NOT STARTED |
| 6A.4 | Field-by-Field Comparison References | CRITICAL | NOT STARTED |

### 6B: UI/UX Improvements (5 items)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6B.1 | Section Auto-Scroll | MEDIUM | NOT STARTED |
| 6B.2 | Add More Models Button Handlers | MEDIUM | NOT STARTED |
| 6B.3 | Incremental LLM Addition Flow | MEDIUM | NOT STARTED |
| 6B.4 | Judge Re-runs with Combined Results | MEDIUM | NOT STARTED |
| 6B.5 | Cancel Button for Judge Video Generation | MEDIUM | NOT STARTED |

### 6C: Gamma Report (2 items)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6C.1 | Gamma Embed Loading Spinner | LOW | NOT STARTED |
| 6C.2 | Gamma Embed Error Handling | LOW | NOT STARTED |

### 6D: Judge Tab (4 items)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6D.1 | Judge Tab in Toolbar | HIGH | NOT STARTED |
| 6D.2 | Judge Results Display | HIGH | NOT STARTED |
| 6D.3 | Disagreement Visualization | MEDIUM | NOT STARTED |
| 6D.4 | Re-run Judge Functionality | MEDIUM | NOT STARTED |

### 6E: User Authentication (4 items)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6E.1 | Login Landing Page (Glassmorphic) | HIGH | NOT STARTED |
| 6E.2 | User ID System | HIGH | NOT STARTED |
| 6E.3 | Toolbar User Tab | MEDIUM | NOT STARTED |
| 6E.4 | Session Management | MEDIUM | NOT STARTED |

### 6F: Payment System / Stripe (4 items)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 6F.1 | Stripe Integration | HIGH | PARTIAL |
| 6F.2 | Price Options Page | HIGH | PARTIAL |
| 6F.3 | Payment Flow | HIGH | PARTIAL |
| 6F.4 | Subscription Gating | MEDIUM | NOT STARTED |

### 6G: Battle Plan Phases (1 item)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6G.1 | Phase 3: Progressive Opus Judging | NOT STARTED | After 2 LLMs → auto-call Opus, re-call on each additional |

**Source:** `docs/MASTER_README.md`, `docs/BATTLE_PLAN.md`

---

## SECTION 7: SAVED REPORTS FIXES (6 items)

**Source:** `docs/SAVED_REPORTS_FIXES.md`

Phase 1 COMPLETE. Phase 2 & 3 pending:

### Phase 2 - Medium Risk

| # | Task | File | Status |
|---|------|------|--------|
| 7.1 | Memoize savedComparisons Reads | `src/components/JudgeTab.tsx` | NOT STARTED |
| 7.2 | Empty String vs Null Coercion fix | `src/components/JudgeTab.tsx` | NOT STARTED |
| 7.3 | Callback Stale Closure fix | `src/App.tsx` | NOT STARTED |

### Phase 3 - High Risk

| # | Task | File | Status |
|---|------|------|--------|
| 7.4 | Type Coercion Issues (type guards) | `src/components/SavedComparisons.tsx` | NOT STARTED |
| 7.5 | Race Conditions (mutex lock) | `src/services/savedComparisons.ts` | NOT STARTED |
| 7.6 | localStorage JSON.parse Corruption handling | `src/services/savedComparisons.ts` | NOT STARTED |

---

## SECTION 8: OLIVIA ENHANCEMENTS (2 items)

**Source:** `HANDOFF-20260130.md`, `docs/handoffs/HANDOFF_20260129_BUGS.md`

| # | Task | File | Status |
|---|------|------|--------|
| 8.1 | Olivia Context Loading from Dropdown - reset context when comparison changes | `src/hooks/useOliviaChat.ts` | NOT STARTED |
| 8.2 | Letter "C" not typing in Ask Olivia text input | `src/components/AskOlivia.tsx` | NOT STARTED |

---

## SECTION 9: COMPLIANCE/LEGAL (16 items)

**Source:** `docs/legal/COMPLIANCE_README.md`, `docs/legal/DPA_TRACKER.md`

### 9A: Regulatory Registration (3 items)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9A.1 | ICO Registration (UK) | NOT STARTED | https://ico.org.uk/for-organisations/register/ |
| 9A.2 | EU Representative Appointed | NOT STARTED | Sign up with GDPR-Rep.eu (~€100-500/yr) |
| 9A.3 | DUNS Number | NOT STARTED | |

### 9B: DPAs Pending (5 items)

| # | Vendor | Service | Status |
|---|--------|---------|--------|
| 9B.1 | xAI (Grok) | LLM Evaluation | PENDING - Email required |
| 9B.2 | Perplexity | LLM Evaluation | PENDING - Email required |
| 9B.3 | D-ID | Video Avatar | PENDING - Email required |
| 9B.4 | Gamma | Report Generation | PENDING - Email required |
| 9B.5 | Tavily | Web Search | PENDING - Email required |

Email templates available in `docs/legal/COMPLIANCE_README.md`

### 9C: US State Compliance (5 items)

| # | State | Law | Status |
|---|-------|-----|--------|
| 9C.1 | California | CCPA/CPRA | NOT STARTED |
| 9C.2 | Virginia | VCDPA | NOT STARTED |
| 9C.3 | Colorado | CPA | NOT STARTED |
| 9C.4 | Connecticut | CTDPA | NOT STARTED |
| 9C.5 | Utah | UCPA | NOT STARTED |

### 9D: Company Info (3 items)

| # | Task | Status |
|---|------|--------|
| 9D.1 | Add Registered Address | NOT STARTED |
| 9D.2 | Appoint DPO (if required) | NOT STARTED |
| 9D.3 | Set calendar reminder for annual DPA review | NOT STARTED |

---

## SECTION 10: HANDOFF PENDING TASKS (from HANDOFF-20260130.md)

| # | Task | File | Status |
|---|------|------|--------|
| 10.1 | Cancel stuck Replicate predictions | Via curl command | NOT STARTED |
| 10.2 | Add Cancel Button for Judge Video Generation | `src/components/JudgeTab.tsx` | NOT STARTED |

Stuck predictions:
- `repa13a6e5rg80cw1f88t8yzfc`
- `7jxq5s3wv1rge0cw1f7srve0bw`
- `t9jdct1cyxrgc0cw1eybwgkdpm`

---

## SECTION 11: PHASE 4 MANUAL REFINEMENT TASKS (from latest handoff)

| # | Task | Status |
|---|------|--------|
| 11.1 | Add Enhanced Mode FAQ Details to User Manual | NOT STARTED |
| 11.2 | Browser Support Verification | NOT STARTED |
| 11.3 | PWA Check (manifest.json, service worker) | NOT STARTED |
| 11.4 | Wording Consistency Check (domain, tier names, time formats) | NOT STARTED |
| 11.5 | Missing Glossary Terms (Kling AI, Annual subscription) | NOT STARTED |
| 11.6 | Help Center Link Verification (help.clueslifescore.com) | NOT STARTED |

---

## QUICK REFERENCE: FILE PATHS

```
D:\lifescore\
├── api/
│   ├── avatar/
│   │   ├── generate-judge-video.ts
│   │   ├── video-status.ts
│   │   └── video-webhook.ts
│   ├── emilia/manuals.ts
│   ├── evaluate.ts
│   ├── judge.ts
│   └── olivia/
├── docs/
│   ├── legal/
│   │   ├── COMPLIANCE_README.md
│   │   └── DPA_TRACKER.md
│   ├── manuals/
│   │   ├── USER_MANUAL.md
│   │   ├── CUSTOMER_SERVICE_MANUAL.md
│   │   └── TECHNICAL_SUPPORT_MANUAL.md
│   └── handoffs/
├── src/
│   ├── components/
│   │   ├── FeatureGate.tsx
│   │   ├── JudgeTab.tsx
│   │   ├── SavedComparisons.tsx
│   │   ├── CostDashboard.tsx
│   │   ├── PricingModal.tsx
│   │   └── PricingPage.tsx
│   ├── hooks/
│   │   ├── useTierAccess.ts
│   │   ├── useJudgeVideo.ts
│   │   └── useOliviaChat.ts
│   ├── services/
│   │   └── savedComparisons.ts
│   ├── types/
│   │   ├── avatar.ts
│   │   └── apiUsage.ts
│   └── utils/
│       └── costCalculator.ts
└── supabase/migrations/
```

---

## PRIORITY EXECUTION ORDER

### WEEK 1 - Critical
1. Section 1: Critical Bugs (all 5 items)
2. Section 2: Pricing/Tier Fix (items 2.1-2.4 - code)
3. Section 5: Infrastructure (item 5.4 - WEBHOOK_BASE_URL)

### WEEK 2 - High
4. Section 2: Pricing/Tier Fix (items 2.5-2.10 - docs)
5. Section 4: Wav2Lip Migration (all 7 items)
6. Section 6A: Data Sources (all 4 items)

### WEEK 3 - Medium
7. Section 3: Documentation Audit (critical 15 items)
8. Section 7: Saved Reports Fixes (6 items)
9. Section 8: Olivia Enhancements (2 items)

### WEEK 4+ - Lower
10. Section 6B-6G: Features (remaining 20 items)
11. Section 9: Compliance/Legal (16 items)
12. Section 10-11: Misc handoff tasks

---

**END OF MASTER TODO CHECKLIST**

*This document consolidates all unfinished items from:*
- `README.md`
- `HANDOFF-20260130.md`
- `docs/BATTLE_PLAN.md`
- `docs/MASTER_README.md`
- `docs/BUG_TRACKING_20260129.md`
- `docs/PRICING_TIER_AUDIT.md`
- `docs/SAVED_REPORTS_FIXES.md`
- `docs/handoffs/HANDOFF_20260130_PHASE4.md`
- `docs/handoffs/HANDOFF_20260130_MANUAL_AUDIT.md`
- `docs/handoffs/HANDOFF_20260129_BUGS.md`
- `docs/handoffs/CRITICAL_BUG_HANDOFF.md`
- `docs/legal/COMPLIANCE_README.md`
- `docs/legal/DPA_TRACKER.md`
