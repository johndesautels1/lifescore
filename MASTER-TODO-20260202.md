# LIFE SCORE - MASTER TODO CHECKLIST
**Conversation ID:** `LIFESCORE-DEBUG-20260202-004`
**Last Updated:** February 2, 2026 (End of Day)
**Purpose:** Consolidated list of ALL items - Updated based on 44 commits today

---

## SUMMARY (UPDATED)

| Category | Completed | Remaining | Total |
|----------|-----------|-----------|-------|
| Critical Bugs | 4 | 1 | 5 |
| Pricing/Tier Fix | 8 | 2 | 10 |
| Documentation Audit | 10 | 5 | 15 |
| Wav2Lip Migration | 7 | 0 | 7 ✅ COMPLETE |
| Infrastructure | 2 | 2 | 4 |
| Features Incomplete | 6 | 18 | 24 |
| Saved Reports Fixes | 6 | 0 | 6 ✅ COMPLETE |
| Olivia Enhancements | 1 | 1 | 2 |
| Compliance/Legal | 0 | 16 | 16 |
| Emilia Knowledge Base | 1 | 1 | 2 |
| **TOTAL** | **45** | **46** | **91** |

**Progress: 49% Complete (was 3% at start of day)**

---

## SECTION 1: CRITICAL BUGS (5 items)

| # | Bug | File(s) | Status | Commit |
|---|-----|---------|--------|--------|
| 1.1 | Judge Tab Video/Pic Not Rendering | `src/components/JudgeTab.tsx` | NOT STARTED | - |
| 1.2 | Supabase 406 Not Acceptable error | Auth/Supabase | ✅ FIXED | `2310fc6` |
| 1.3 | Tier/permission issue - loading saved comparisons | `FeatureGate.tsx`, `useTierAccess.ts` | ✅ FIXED | `ce30fac`, `acb39d7` |
| 1.4 | Results page not opening after enhanced comparison | `src/App.tsx` | ✅ FIXED | `e648388`, `37efba0` |
| 1.5 | Cost tracking - Tavily missing from UI | `api_quota_settings` | ✅ FIXED | `f86d321` |

**Remaining: 1 item (Judge Tab rendering)**

---

## SECTION 2: PRICING/TIER FIX (10 items)

| # | Task | File | Status | Commit |
|---|------|------|--------|--------|
| 2.1 | Update tier limits (SOURCE OF TRUTH) | `src/hooks/useTierAccess.ts` | ✅ DONE | Already correct |
| 2.2 | Fix pricing display | `src/components/PricingModal.tsx` | ✅ DONE | Already correct |
| 2.3 | Fix pricing page | `src/components/PricingPage.tsx` | ✅ DONE | Already correct |
| 2.4 | Fix feature gating logic | `src/components/FeatureGate.tsx` | ✅ DONE | Already correct |
| 2.5 | Fix User Manual - tier limits | `docs/manuals/USER_MANUAL.md` | ✅ DONE | `4a42f3b`, `58b158b` |
| 2.6 | Fix Customer Service Manual | `docs/manuals/CUSTOMER_SERVICE_MANUAL.md` | ✅ DONE | `4a42f3b`, `58b158b`, `bf0326d` |
| 2.7 | Fix Technical Support Manual | `docs/manuals/TECHNICAL_SUPPORT_MANUAL.md` | ✅ DONE | Verified correct |
| 2.8 | Fix embedded manuals content | `api/emilia/manuals.ts` | NOT STARTED | - |
| 2.9 | Fix main README | `README.md` | ✅ DONE | Already correct |
| 2.10 | Fix legal documents | `docs/legal/*.md` | NOT STARTED | - |

**Remaining: 2 items (embedded manuals, legal docs)**

---

## SECTION 3: DOCUMENTATION/MANUAL AUDIT (15 items)

| # | Task | Files | Status | Commit |
|---|------|-------|--------|--------|
| 3.1 | Standardize domain names to `clueslifescore.com` | All | ✅ DONE | `a280a7e`, `88c1051` |
| 3.2 | Fix password requirements (6 chars) | USER_MANUAL, CSM | ✅ FIXED | `8e7920d` |
| 3.3 | Add missing 12 environment variables | Tech Manual | ✅ DONE | `ba2c411` |
| 3.4 | Fix database table count (now 17) | Tech Manual | ✅ FIXED | `0a3ecd1` |
| 3.5 | Add missing database tables | Tech Manual §4.1 | ✅ FIXED | `0a3ecd1` |
| 3.6 | Add Cost Dashboard section | User Manual §15 | ✅ DONE | Already exists |
| 3.7 | Add Emilia Help Assistant section | All manuals | ✅ DONE | Already exists |
| 3.8 | Update avatar provider hierarchy | All manuals | ✅ DONE | Already correct |
| 3.9 | Add Emilia & Usage endpoints | Tech Manual §3.4, §3.5 | ✅ DONE | Verified |
| 3.10 | Add quota alert templates to CSM | CSM | ✅ DONE | Already exists |
| 3.11 | Update glossary | CSM §12 | NOT STARTED | - |
| 3.12 | Add TTS fallback info | All manuals | ✅ DONE | Tech Manual §17 |
| 3.13 | Verify city count (200 metros) | `src/data/metros.ts` | NOT STARTED | - |
| 3.14 | Add Kling AI mentions | All manuals | NOT STARTED | - |
| 3.15 | Update version numbers to v2.3 | All manuals | NOT STARTED | - |

**Remaining: 5 items**

---

## SECTION 4: WAV2LIP MIGRATION (7 items) ✅ ALL COMPLETE

| # | Task | File | Status | Commit |
|---|------|------|--------|--------|
| 4.1 | Update Wav2Lip type definitions | `src/types/avatar.ts` | ✅ DONE | `f00c6a5` |
| 4.2 | Add replicate-wav2lip to cost calculator | `src/utils/costCalculator.ts` | ✅ DONE | `f00c6a5` |
| 4.3 | Update API usage types | `src/types/apiUsage.ts` | ✅ DONE | `f00c6a5` |
| 4.4 | Update Cost Dashboard | `src/components/CostDashboard.tsx` | ✅ DONE | `f00c6a5` |
| 4.5 | Update Technical Support Manual | `TECHNICAL_SUPPORT_MANUAL.md` | ✅ DONE | `f00c6a5` |
| 4.6 | Update Voice Flow Architecture | `VOICE_FLOW_ARCHITECTURE.md` | ✅ DONE | `f00c6a5` |
| 4.7 | Update Supabase migration | Migration file | ✅ DONE | `f00c6a5` |

---

## SECTION 5: INFRASTRUCTURE (4 items)

| # | Task | Status | Commit |
|---|------|--------|--------|
| 5.1 | Domain DNS Setup (GoDaddy → Vercel) | NOT STARTED | - |
| 5.2 | Vercel Custom Domain Config | NOT STARTED | - |
| 5.3 | Verify GitHub-Vercel auto-deploy | ✅ DONE | Working |
| 5.4 | Add WEBHOOK_BASE_URL env var | ✅ DONE | `e24e5af` |

**Remaining: 2 items (DNS setup)**

---

## SECTION 6: FEATURES INCOMPLETE (24 items)

### 6A: Data Sources & Evidence (4 items)

| # | Task | Status |
|---|------|--------|
| 6A.1 | Perplexity Data Sources | NOT STARTED |
| 6A.2 | 5th Thumbnail UI Wiring | NOT STARTED |
| 6A.3 | Multi-LLM Field Sources Missing | NOT STARTED |
| 6A.4 | Field-by-Field Comparison References | NOT STARTED |

### 6B: UI/UX Improvements (5 items)

| # | Task | Status |
|---|------|--------|
| 6B.1 | Section Auto-Scroll | ✅ DONE (`8addc41`) |
| 6B.2 | Add More Models Button Handlers | NOT STARTED |
| 6B.3 | Incremental LLM Addition Flow | NOT STARTED |
| 6B.4 | Judge Re-runs with Combined Results | NOT STARTED |
| 6B.5 | Cancel Button for Judge Video Generation | ✅ DONE (`926c5c1`) |

### 6C: Gamma Report (2 items)

| # | Task | Status |
|---|------|--------|
| 6C.1 | Gamma Embed Loading Spinner | NOT STARTED |
| 6C.2 | Gamma Embed Error Handling | NOT STARTED |

### 6D: Judge Tab (4 items)

| # | Task | Status |
|---|------|--------|
| 6D.1 | Judge Tab in Toolbar | NOT STARTED |
| 6D.2 | Judge Results Display | NOT STARTED |
| 6D.3 | Disagreement Visualization | NOT STARTED |
| 6D.4 | Re-run Judge Functionality | NOT STARTED |

### 6E: User Authentication (4 items)

| # | Task | Status |
|---|------|--------|
| 6E.1 | Login Landing Page (Glassmorphic) | NOT STARTED |
| 6E.2 | User ID System | NOT STARTED |
| 6E.3 | Toolbar User Tab | NOT STARTED |
| 6E.4 | Session Management | NOT STARTED |

### 6F: Payment System / Stripe (4 items)

| # | Task | Status |
|---|------|--------|
| 6F.1 | Stripe Integration | ✅ DONE (`d698816`) |
| 6F.2 | Price Options Page | ✅ DONE |
| 6F.3 | Payment Flow | ✅ DONE |
| 6F.4 | Subscription Gating | ✅ DONE (`9ea92b1`) |

### 6G: Battle Plan Phases (1 item)

| # | Task | Status |
|---|------|--------|
| 6G.1 | Phase 3: Progressive Opus Judging | NOT STARTED |

**Remaining: 18 items**

---

## SECTION 7: SAVED REPORTS FIXES (6 items) ✅ ALL COMPLETE

| # | Task | File | Status | Commit |
|---|------|------|--------|--------|
| 7.1 | Memoize savedComparisons Reads | JudgeTab.tsx | ✅ DONE | `44573b0` |
| 7.2 | Empty String vs Null Coercion fix | JudgeTab.tsx | ✅ DONE | `44573b0` |
| 7.3 | Callback Stale Closure fix | App.tsx | ✅ DONE | `44573b0` |
| 7.4 | Type Coercion Issues | SavedComparisons.tsx | ✅ DONE | `44573b0` |
| 7.5 | Race Conditions | savedComparisons.ts | ✅ DONE | `44573b0` |
| 7.6 | localStorage Corruption handling | savedComparisons.ts | ✅ DONE | `44573b0` |

---

## SECTION 8: OLIVIA ENHANCEMENTS (2 items)

| # | Task | File | Status | Commit |
|---|------|------|--------|--------|
| 8.1 | Olivia Context Loading from Dropdown | `api/olivia/chat.ts` | ✅ FIXED | `833729e` |
| 8.2 | Letter "C" not typing in Ask Olivia | `AskOlivia.tsx` | NOT STARTED | - |

**Remaining: 1 item**

---

## SECTION 9: COMPLIANCE/LEGAL (16 items)

### 9A: Regulatory Registration (3 items)

| # | Task | Status |
|---|------|--------|
| 9A.1 | ICO Registration (UK) | NOT STARTED |
| 9A.2 | EU Representative | ❌ N/A (UK company) |
| 9A.3 | DUNS Number | ❌ N/A |

### 9B: DPAs Pending (5 items)

| # | Vendor | Status |
|---|--------|--------|
| 9B.1 | xAI (Grok) | PENDING |
| 9B.2 | Perplexity | PENDING |
| 9B.3 | D-ID | PENDING |
| 9B.4 | Gamma | PENDING |
| 9B.5 | Tavily | PENDING |

### 9C: US State Compliance (5 items) ⏸️ DEFERRED

All deferred - below revenue threshold.

### 9D: Company Info (3 items)

| # | Task | Status |
|---|------|--------|
| 9D.1 | Add Registered Address | NOT STARTED |
| 9D.2 | Appoint DPO | NOT STARTED |
| 9D.3 | Annual DPA review reminder | NOT STARTED |

**Remaining: 16 items (mostly legal/compliance)**

---

## SECTION 10: HANDOFF PENDING TASKS

| # | Task | Status | Commit |
|---|------|--------|--------|
| 10.1 | Cancel stuck Replicate predictions | NOT STARTED | - |
| 10.2 | Add Cancel Button for Judge Video | ✅ DONE | `926c5c1` |

---

## SECTION 11: PHASE 4 MANUAL REFINEMENT

| # | Task | Status | Commit |
|---|------|--------|--------|
| 11.1 | Add Enhanced Mode FAQ | ✅ DONE | `c9d0788` |
| 11.2 | Browser Support Verification | NOT STARTED | - |
| 11.3 | PWA Check | NOT STARTED | - |
| 11.4 | Wording Consistency Check | ✅ DONE | Multiple |
| 11.5 | Missing Glossary Terms | ✅ DONE | `c9d0788` |
| 11.6 | Help Center Link Verification | NOT STARTED | - |

**Remaining: 3 items**

---

## SECTION 12: EMILIA KNOWLEDGE BASE (2 items)

| # | Task | Status | Commit |
|---|------|--------|--------|
| 12.1 | Create App Schema Manual | NOT STARTED | - |
| 12.2 | Create Judge Equations Manual | NOT STARTED | - |

**Infrastructure:** ✅ COMPLETE (`1de40ed`, `3705daa`)
- HelpModal.tsx tabs added
- api/emilia/manuals.ts mappings added
- sync script created and working

**Remaining: 2 items (content creation)**

---

## TODAY'S COMMITS (44 total)

```
ea1c13d Add saved reports dropdown to VisualsTab
bf0326d Fix CSM welcome template: Olivia messages → Olivia minutes
833729e Fix Olivia not remembering report when selected after starting chat
95dbe7e Move API Keys configuration to Account Settings as 4th tab
58b158b Add detailed feature tables to manuals for Emilia
3b072ae Fix: Sync all historical handoff documents with correct pricing
f24e5fc Fix: Sync OLIVIA_KNOWLEDGE_BASE.md pricing with code
4a42f3b Fix: Sync manual pricing/features with code
37efba0 Fix: Show warning when category data is missing
e648388 Fix: Show results page when LLM fails to return all 6 sections
f86d321 Add Tavily to API quota settings for cost tracking UI
98ba7ee docs: Add session 003 handoff
4179f39 docs: Add Section 12 to MASTER-TODO
1de40ed feat: Prepare infrastructure for Schema and Equations manuals
3705daa feat: Add Emilia knowledge sync script
fcab758 fix: Add Olivia/Emilia chat data to Legal Compliance Manual
0a3ecd1 fix: Database table audit
ba2c411 fix: Standardize environment variables
8e7920d fix: Standardize password requirements to 6 chars
2310fc6 fix: Supabase 406 error
7c917ee docs: Add feature gating audit handoff
acb39d7 fix(tier): Add missing usage tracking for CourtOrderVideo/JudgeVideo
ce30fac fix(tier): Add usage tracking for all gated features
0ed0911 fix(tier): Allow Sovereign users to run standard comparisons
a3102f3 feat(emilia): Add Share and Email buttons
88c1051 fix: Complete domain standardization
a280a7e fix: Standardize all domain references
4ad4b57 perf: Phase 2 - Lazy load tab components
f6b58dc perf: Phase 1 bundle optimization
08d10f4 Add performance audit documentation
e24e5af Trigger redeploy for env var changes
d698816 Fix silent failure on Manage Subscription button
8addc41 Fix AskOlivia scroll to TOP of response
381e037 Add brokerpinellas@gmail.com to manual access admins
b2a0640 Add Legal Compliance Manual
f00c6a5 Fix Wav2Lip pricing in docs, mark Section 4 complete
c5142b5 Add Valletta (Malta) and Nicosia (Cyprus) to metros
2454a97 Add session handoff document
926c5c1 Add Cancel Video button
9ea92b1 Fix subscription gating for Olivia chat
44573b0 Section 7: Comprehensive Saved Reports Fixes
2589e42 Fix Olivia chat history not clearing
c9d0788 Add Enhanced Mode FAQ and glossary terms
9768408 Fix TS2322: Make error property optional
```

---

## PRIORITY FOR NEXT SESSION

### HIGH PRIORITY (Do First)
1. **1.1** - Judge Tab Video/Pic Not Rendering
2. **2.8** - Fix embedded manuals in `api/emilia/manuals.ts`
3. **8.2** - Letter "C" not typing in Ask Olivia

### MEDIUM PRIORITY
4. **3.13** - Verify 200 city count in metros.ts
5. **3.14** - Add Kling AI mentions to manuals
6. **3.15** - Update manual version numbers
7. **12.1** - Create App Schema Manual content
8. **12.2** - Create Judge Equations Manual content

### LOW PRIORITY (Defer)
- Section 6A-6G incomplete features
- Section 9 compliance/legal items
- Section 5 DNS setup (needs GoDaddy access)

---

**END OF MASTER TODO CHECKLIST**

*Updated: February 2, 2026 - End of Day*
*44 commits made today - 49% complete*
