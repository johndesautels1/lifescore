# LIFE SCORE - UNIFIED MASTER TODO
**Created:** February 3, 2026
**Last Updated:** February 5, 2026 (Session 9 - LS-SESSION9-20260205)
**Source:** Complete merged list from all sessions (1-9)
**Conversation ID:** LS-SESSION10-20260205

---

## MANDATORY BUILD & DEPLOY RULES (ALL SESSIONS)

> **NEVER run `npm run build` locally. Vercel handles all builds.**
>
> After ANY code change:
> 1. `git add` the changed files
> 2. `git commit` with a clear message
> 3. `git push origin main` — Vercel auto-deploys from main
>
> **There is NO local build step. Do NOT run `npm run build`, `tsc -b`, or any local compile command.**
> **ALWAYS commit and push to GitHub. Vercel IS the build system. No exceptions.**

---

## GRAND SUMMARY

| Category | Total | Completed | Active | Investigate | Deferred |
|----------|-------|-----------|--------|-------------|----------|
| CRITICAL (Architecture) | 6 | 5 | 0 | 0 | 1 |
| HIGH (UI/UX Critical) | 12 | 12 | 0 | 0 | 0 |
| MEDIUM (UI/UX Polish) | 18 | 17 | 0 | 1 | 0 |
| MEDIUM (Features) | 14 | 10 | 3 | 1 | 1 |
| LOW (Documentation) | 6 | 0 | 6 | 0 | 0 |
| LOW (Code Quality) | 2 | 0 | 2 | 0 | 0 |
| DEFERRED (Legal) | 7 | 0 | 0 | 0 | 7 |
| BUGS | 18 | 17 | 0 | 1 | 0 |
| NEW (Sessions 8-9) | 8 | 8 | 0 | 0 | 0 |
| **TOTAL** | **91** | **69** | **11** | **3** | **9** |

**Completion: 75.8%** (69 of 91)

---

# COMPLETE ITEM LIST

---

## CRITICAL - Architecture & Performance (#1-4, #49-50)

| # | Item | Details | Status |
|---|------|---------|--------|
| 1 | City data caching in Supabase | Load 200 cities into DB, cache results for instant responses | DEFERRED |
| 2 | Tavily search restructure | Added Research API caching wrapper (67% reduction in Research calls) | DONE (2/3) |
| 3 | Perplexity prompt adjustments | Optimized prompts: batch threshold 20->15, source reuse, evidence limits, confidence fallback | DONE (2/3) |
| 4 | Gemini prompt adjustments | Lowered temperature 0.3->0.2 for stricter factual adherence | DONE (2/3) |
| 49 | Gemini cold start timeouts | Fix cold start Gemini timeouts on enhanced search - causes failures on first request | DONE (c4a9b0b) - Added retry logic with exponential backoff |
| 50 | API cost tracking database persistence | Cost data only persists locally (localStorage), not syncing to Supabase. Fix database sync for all providers | DONE (c4a9b0b) - Added auto-sync to Supabase |

---

## HIGH - UI/UX Critical (#5-8, #51-56)

| # | Item | Details | Status |
|---|------|---------|--------|
| 5 | Judge Video welcome screen | Added mobile CSS scaling (768px/480px breakpoints) | DONE (2/3) |
| 6 | Judge Video - Christiano animation | Wav2Lip: wider pads, 30fps, 720p (works but slow - revisit later) | DONE (2/3) |
| 7 | Results Report section scroll | Fixed: scrollIntoView block:'start' scrolls to TOP of section, not bottom | DONE (2/3, b29d000) |
| 8 | Post-search flow redesign | Show success status buttons first, user clicks "View Results" manually - do NOT auto-open LLM data page | DONE (merged with #55) |
| 51 | Header bar mobile size reduction | Reduce top-right header bar by 15% on mobile (85% of current size) | DONE (80c5eb1) |
| 52 | Settings modal background scroll bug | On mobile, home screen scrolls in background when user clicks around inside settings modal card | DONE (80c5eb1) |
| 53 | Freedom vs Imprisonment cards broken | UI looks cheap with colored borders, buttons don't click/respond | DONE (80c5eb1) |
| 54 | Select report dropdown inconsistent | Dropdown on Visuals page sometimes opens to reveal comparison list, sometimes doesn't respond | DONE (80c5eb1) |
| 55 | Results/Visuals tabs always accessible | Make Results and Visuals tabs always clickable/accessible, but keep Sovereign-tier features blocked | DONE (80c5eb1) |
| 56 | Auto-save when adding LLM to saved report | When a report is already saved and user adds another LLM, auto-save since Save button can't be re-clicked | DONE (80c5eb1) |

---

## MEDIUM - UI/UX Polish (#9-12, #57-69)

| # | Item | Details | Status |
|---|------|---------|--------|
| 9 | Freedom Cards text size | City name text is too big on Freedom Cards, reduce font size | DONE (80c5eb1) |
| 10 | Judge Tab mobile buttons | Center the Save/Download/Forward buttons on mobile view | DONE (80c5eb1) |
| 11 | Mobile "One remaining" text | Move the "One remaining" text down approximately 1/4 inch on mobile | DONE (80c5eb1) |
| 12 | Freedom vs Imprisonment card polish | Green checkmark hero for winner, red alert badge for loser. 4D shadows, glass effects | DONE (c2be49c) |
| 57 | Settings modal widgets visibility | Brighten 4 widgets under "Account Settings". Orange password/email, gold API key text | DONE (80c5eb1) |
| 58 | Cost tracking loading text | Change "Loading data" small text to bright yellow | DONE (947ae97) |
| 59 | Cost tracking card titles | Change card title text to crisp golden yellow | DONE (947ae97) |
| 60 | Cost tracking percentage text | Provider percentage (%) text should be crisp yellow | DONE (947ae97) |
| 61 | Cost tracking profitability text | Change line item labels to crisp orange. Keep dollar amounts white | DONE (947ae97) |
| 62 | Recent comparisons provider text | Provider names in faint gray/white - change to crisp golden orange | DONE (947ae97) |
| 63 | Home page Law vs Lived Reality | Change "Written Law" and "Daily Reality" text labels to golden yellow | DONE (80c5eb1) |
| 64 | Deal breakers Clear All text | Change "Clear All" button text to crisp white | DONE (947ae97) |
| 65 | Freedom vs Imprisonment city text | City name text faded gray - change to crisp white | DONE (947ae97) |
| 66 | Saved comparisons button sizes | Enlarge Export/Import/Clear All buttons by 30% | DONE (947ae97) |
| 67 | Visuals PowerPoint button text | Change PPTX button text to golden orange crisp | DONE (947ae97) |
| 68 | Court orders green dot bug | Strange green dot appearing over "Amsterdam Advantage" text | NEEDS INVESTIGATION |
| 69 | Court orders tabs font | Change font for Court Orders category tabs | DONE (947ae97) |

---

## MEDIUM - Features (#13-22, #70-73)

| # | Item | Details | Status |
|---|------|---------|--------|
| 13 | Add More Models Button Handlers | Wire up the "Add More Models" button to actually add LLMs | ACTIVE |
| 14 | Judge Re-runs with Combined Results | Allow re-running the Judge with updated/combined data from multiple LLMs | ACTIVE |
| 15 | Disagreement Visualization | Show visual indicator where different LLMs disagree on scores | ACTIVE |
| 16 | Session Management | Improve session handling, persistence, state management. **Note:** Dual-storage (Session 8) addressed persistence significantly | ACTIVE |
| 17 | Score Calculation UI | Explainer UI showing how LIFE SCORE math works | **DONE (Session 8)** - Glass-morphic 5-stage pipeline card |
| 18 | Save button - Olivia images | Add save functionality for Olivia's comparison city images | **DONE (Session 9, 3c94a3a)** - SAVE IMAGES button on ContrastDisplays, fetch→blob download |
| 19 | Save button - Visuals video | Add save functionality for comparison city videos on Visuals tab | **DONE (Session 9, 3c94a3a)** - Fixed cross-origin download with fetch→blob pattern |
| 20 | Save button - Court Order | Added Save/Download/Share buttons to Court Order section | DONE (2/3, 58344b7) |
| 21 | Court Order video upload | Allow user to override auto-generated Court Order video with custom upload | DEFERRED |
| 22 | Gamma prompt update | Extract current Gamma prompt, enhance it, upload improved prompt | ACTIVE |
| 70 | Verify Olivia 100 metrics | Verify Olivia can talk about ALL 100 individual metrics | ACTIVE |
| 71 | Draggable Emilia/Olivia bubbles | Allow click-drag repositioning of chat bubble UI elements | **DONE (Session 9, 3c94a3a)** - useDraggable hook, pointer events, localStorage persistence |
| 72 | Verify schema for Court Orders | Verify Supabase DB schema updated for expanded Court Orders | **DONE (Session 8)** - court_orders table + RLS created & verified |
| 73 | API cost tracking - full provider audit | Wired ALL 14 providers to record costs. 8 were showing $0.00 | DONE (b785a5c) |

---

## LOW - Documentation (#23-28)

| # | Item | Details | Status |
|---|------|---------|--------|
| 23 | Update glossary | CSM Section 12 glossary updates needed. **Note:** Partial progress in Session 9 (added 3 entries) | ACTIVE |
| 24 | Add Kling AI mentions | Document Kling AI integration in all relevant manuals | ACTIVE |
| 25 | Update version numbers | Bump version numbers across all documentation. **Note:** Session 9 bumped CSM→v2.5, TSM→v2.4, UM→v2.5 | ACTIVE |
| 26 | Browser Support Verification | Test browser compatibility and document supported browsers | ACTIVE |
| 27 | PWA Check | Verify Progressive Web App functionality works correctly | ACTIVE |
| 28 | Help Center Link Verification | Ensure all help center links throughout app are working | ACTIVE |

---

## LOW - Code Quality (#29-30)

| # | Item | Details | Status |
|---|------|---------|--------|
| 29 | Final code debug session | Comprehensive debugging pass through entire codebase | ACTIVE |
| 30 | Final code refactor | Clean up and optimize codebase, remove dead code, improve structure | ACTIVE |

---

## DEFERRED - Legal/Compliance (#31-37)

| # | Item | Details | Status |
|---|------|---------|--------|
| 31 | Legal pages email update | Change contact email to cluesnomads@gmail.com in Privacy Policy, Terms of Service, Refund Policy, AUP, Cookie Policy | DEFERRED |
| 32 | GDPR compliance | Complete full GDPR compliance implementation | DEFERRED |
| 33 | Privacy policy finalization | Finalize privacy regulations and policy language | DEFERRED |
| 34 | ICO Registration (UK) | Register with UK Information Commissioner's Office for data processing | DEFERRED |
| 35 | DPAs (5 vendors) | Obtain Data Processing Agreements from: xAI, Perplexity, D-ID, Gamma, Tavily | DEFERRED |
| 36 | Appoint DPO | Appoint a Data Protection Officer | DEFERRED |
| 37 | Annual DPA review reminder | Set up recurring calendar reminder for annual DPA compliance review | DEFERRED |

---

## NEW - Session 8 Work (#74-78)

| # | Item | Details | Status |
|---|------|---------|--------|
| 74 | Gamma "Generation ID missing" fix | api/gamma.ts fallback: `status.id \|\| generationId` | DONE (Session 8, 9003271) |
| 75 | Dual-storage save system | All 9 save points now write to BOTH localStorage AND Supabase. Central service: savedComparisons.ts | DONE (Session 8, 9405a07) |
| 76 | Tavily timeout hotfix | Reduced from 240s to 45s for faster failure recovery | DONE (Session 8) |
| 77 | Supabase schema fixes | Fixed 3 mismatches: user_preferences (single-row-per-user), judge_reports (winner/margin/verdict/full_report columns), judge_reports onConflict (user_id,report_id) | DONE (Session 8, e5d5a8f) |
| 78 | Judge reports in Visual Reports / Saved tab | SavedComparisons.tsx now reads judge_reports. Judge reports visible in Saved tab | DONE (Session 8, 9003271) |

---

## NEW - Session 9 Work (#79-81)

| # | Item | Details | Status |
|---|------|---------|--------|
| 79 | B3 Fix: LLM attribution badges | Each source citation now shows which AI model found it (Claude, GPT-5.2, Grok, etc). Three display locations: per-metric breakdown, Top 5 Differences, EvidencePanel | DONE (Session 9, f34c4ef) |
| 80 | Manual updates (I4/I5/I6) | CSM v2.5, TSM v2.4, UM v2.5 — dual-storage, schema fixes, model names, new features | DONE (Session 9, 11ea65b) |
| 81 | Directory cleanup | Deleted 600+ tmpclaude temp files, nul, .claude-temp, .temp. Moved scattered handoffs/TODOs into docs/ subfolders | DONE (Session 9) |

---

# COMPLETE BUG TRACKING TABLE

---

## Historical Bugs (January 29, 2026)

| Bug # | Bug Name | Severity | Component | Details | Status |
|-------|----------|----------|-----------|---------|--------|
| B1 | NewLifeVideos "no supported sources" | HIGH | NewLifeVideos | Video screens below Gamma embed don't render | FIXED (ba4ecec) |
| B2 | Judge tab video/pic not rendering | HIGH | JudgeTab | Judge findings display screen doesn't work | FIXED |
| B3 | Runaway console polling messages | MEDIUM | useJudgeVideo | Console messages increasing by hundreds - infinite polling | FIXED (95c1061) |
| B4 | Save button stuck depressed | HIGH | EnhancedResults | Save button shows "Saved" when report didn't save | FIXED (9da92d2) |
| B5 | Saved reports not appearing | HIGH | SavedComparisons | Saved comparisons don't appear in list | FIXED (9da92d2) |
| B6 | Supabase 406 Not Acceptable | MEDIUM | Auth/Supabase | Content negotiation error on Supabase requests | FIXED |
| B7 | judge_reports 400 Bad Request | HIGH | JudgeTab | Missing comparison_id causing 400 on insert | FIXED (3ef88d6) |

---

## Session 2-4 Bugs (February 3-4, 2026)

| # | Bug Name | Severity | Component | Details | Status |
|---|----------|----------|-----------|---------|--------|
| 38 | Supabase profile fetch timeout | HIGH | Auth/Tier | Profile fetch takes 45+ seconds, tier falls back to 'free'. Supabase cold starts | PARTIAL (991cabc) - fail-open to enterprise |
| 39 | FeatureGate blocks clicks after dismiss | HIGH | FeatureGate | `pointer-events: none` persisted after dismiss | FIXED (e827fff) |
| 40 | Admin blocked from FeatureGate features | CRITICAL | FeatureGate | Admin seeing "Limit Reached" popups | FIXED (0df7b98) - Added isAdmin bypass |
| 41 | VisualsTab dropdown dark on dark | MEDIUM | VisualsTab | Placeholder dark blue on dark blue background | FIXED (0df7b98) |
| 42 | Saved Reports mobile buttons invisible | HIGH | SavedComparisons | Action buttons not visible on mobile | FIXED (a01484e) |
| 43 | Olivia audio not stopping | HIGH | AskOlivia | Audio kept playing on navigate/stop/tab switch | FIXED (0df7b98) |
| 44 | Olivia mobile text chaos | HIGH | AskOlivia | Audio overlapping on SMS interrupts | FIXED (0df7b98) |
| 45 | Mobile video playback broken | MEDIUM | NewLifeVideos | Autoplay blocked on mobile | FIXED (0df7b98) |
| 46 | Ask Olivia gray text | MEDIUM | AskOlivia | All text off-white instead of crisp white | FIXED (0df7b98) |
| 47 | Court Order badge spacing | LOW | FreedomMetrics | Badge too close to scores | FIXED (0df7b98) |
| 48 | NewLifeVideos video instability | MEDIUM | NewLifeVideos | Expired cached URLs causing errors | FIXED (c4a9b0b) - auto-reset after 3 attempts |

---

## Bug Summary

| Status | Count | Items |
|--------|-------|-------|
| FIXED | 17 | B1-B7, #39-48 |
| PARTIAL | 1 | #38 (Supabase timeout - fail-open workaround) |
| **TOTAL** | **18** | |

---

# WHAT'S LEFT TO FIX

---

## ACTIVE - Features (5 items)

| # | Item | Priority | Description |
|---|------|----------|-------------|
| 13 | Add More Models Button Handlers | HIGH | Wire up "Add More Models" button to trigger LLM addition flow |
| 14 | Judge Re-runs with Combined Results | HIGH | Allow re-running Opus Judge with updated/combined multi-LLM data |
| 15 | Disagreement Visualization | MEDIUM | Show visual indicators where different LLMs disagree on metric scores |
| 16 | Session Management | MEDIUM | Improve session handling and state. Dual-storage (Session 8) addressed persistence |
| 22 | Gamma Prompt Update | MEDIUM | Extract current Gamma prompt, enhance quality, upload improved version |

## ACTIVE - Verification (1 item)

| # | Item | Priority | Description |
|---|------|----------|-------------|
| 70 | Verify Olivia 100 Metrics | MEDIUM | Verify Olivia can discuss ALL 100 individual metrics |

## NEEDS INVESTIGATION (3 items)

| # | Item | Description |
|---|------|-------------|
| 38 | Supabase Profile Fetch Timeout | 45+ second fetch, tier falls to 'free'. Partial: fail-open to enterprise |
| 68 | Court Orders Green Dot Bug | Strange green dot over "Amsterdam Advantage" text. Needs live screenshot |

## ACTIVE - Documentation (6 items)

| # | Item | Description |
|---|------|-------------|
| 23 | Update Glossary | CSM Section 12 glossary (partial progress Session 9) |
| 24 | Add Kling AI Mentions | Document Kling AI in all manuals |
| 25 | Update Version Numbers | Bump to v2.5 across docs (partial progress Session 9) |
| 26 | Browser Support Verification | Test and document supported browsers |
| 27 | PWA Check | Verify Progressive Web App functionality |
| 28 | Help Center Link Verification | Ensure all help center links work |

## ACTIVE - Code Quality (2 items)

| # | Item | Description |
|---|------|-------------|
| 29 | Final Code Debug Session | Comprehensive debugging pass |
| 30 | Final Code Refactor | Clean up, remove dead code, optimize |

## DEFERRED (9 items - not blocking)

| # | Item | Description |
|---|------|-------------|
| 1 | City Data Caching | Load 200 cities into Supabase for instant responses |
| 21 | Court Order Video Upload | Allow custom video upload to replace auto-generated |
| 31 | Legal pages email update | Change email to cluesnomads@gmail.com |
| 32 | GDPR compliance | Full GDPR implementation |
| 33 | Privacy policy finalization | Finalize privacy language |
| 34 | ICO Registration (UK) | Register with Information Commissioner's Office |
| 35 | DPAs (5 vendors) | xAI, Perplexity, D-ID, Gamma, Tavily |
| 36 | Appoint DPO | Data Protection Officer |
| 37 | Annual DPA review reminder | Recurring compliance review |

---

# ALL SESSION COMMITS (Feb 3-5, 2026)

## Session 3 (Feb 3)
| Commit | Description |
|--------|-------------|
| 8770bad | 6-Tab Freedom Education section for Court Order |
| e81691c | Fix TypeScript errors for Freedom Education |
| 8d98528 | Fix unused loserCity variable |
| e827fff | Fix FeatureGate blocking clicks after dismiss |
| 991cabc | Fix tier access when Supabase profile fetch times out |
| b29d000 | Fix category section scroll to TOP not bottom |
| 58344b7 | Court Order Save/Download/Share buttons |

## Session 4 (Feb 3-4)
| Commit | Description |
|--------|-------------|
| 0df7b98 | Admin bypass, Court Order redesign, Olivia fixes, video playback |
| a01484e | Saved Reports mobile button visibility |

## Session 5 (Feb 4)
| Commit | Description |
|--------|-------------|
| c4a9b0b | Fix #48 video stability, #49 Gemini retry, #50 cost auto-sync |

## Session 6 (Feb 4)
| Commit | Description |
|--------|-------------|
| 80c5eb1 | Fix HIGH UI/UX #51-56, MEDIUM #9-11, #57, #63 |
| 947ae97 | Fix MEDIUM UI/UX #58-69 (text colors, buttons, tabs) |

## Session 7 (Feb 4)
| Commit | Description |
|--------|-------------|
| b785a5c | Fix #73 - API cost tracking audit, wire all 14 providers |
| c2be49c | Fix #12 - Freedom vs Imprisonment cards (green/red scheme) |

## Session 8 (Feb 4-5)
| Commit | Description |
|--------|-------------|
| 9003271 | Fix Gamma generationId + Judge reports in saved tab |
| 393f8bd | Dual-storage (localStorage + Supabase) for Gamma/Judge reports |
| 9405a07 | Complete save audit: dual-storage ALL 9 save points, outer try/catch |
| 3dc9217 | Fix user_preferences upsert to match actual Supabase schema |
| 7419e11 | Fix judge_reports upsert to match actual Supabase schema |
| e5d5a8f | Fix judge_reports onConflict to match unique constraint |
| eac2a1b | Session 8 docs: Update MASTER_README + fix APP_SCHEMA_MANUAL |

## Session 9 (Feb 5)
| Commit | Description |
|--------|-------------|
| 11ea65b | Update all 3 manuals (CSM v2.5, TSM v2.4, UM v2.5) |
| f34c4ef | B3 fix: LLM attribution badges on all source citations |
| a7a1ada | Reorganize docs, regenerate UNIFIED-MASTER-TODO |
| 3c94a3a | Features #18, #19, #71: Save buttons + draggable chat bubbles |
| e01b21f | Fix audit: transform direction, HelpBubble wrapper, update docs |

---

# GRAND TOTALS

| Metric | Count |
|--------|-------|
| Original Items (Sessions 1-7) | 78 |
| New Items (Sessions 8-9) | 8 |
| **GRAND TOTAL** | **86** |

| Status | Count | % |
|--------|-------|---|
| Completed | 69 | 76% |
| Active | 11 | 12% |
| Needs Investigation | 2 | 2% |
| Deferred | 9 | 10% |

---

# SESSION 10 WORK LOG

**Session ID:** LS-SESSION10-20260205
**Date:** February 5, 2026

---

## Session 10 Commits

| Commit | Description |
|--------|-------------|
| c05d3d1 | Fix TS2345: non-null assert videoUrl in download handlers |
| c69e0b3 | Add mandatory Vercel-only build rules to CLAUDE.md and TODO |
| 1285920 | Fix: Olivia avatar circle in chat header closes chat panel |
| 5bfa125 | CRITICAL #70: Fix 30 metric ID mismatches across 4 files |
| 923dbba | Fix contrastImageService: replace 23 wrong metric IDs |
| 0f62a93 | Fix bw_20_food_truck_regs mismatch + master alignment table |
| 808e41c | Add Gun Comparison Modal design spec to master TODO |
| 6b7574f | Add standalone Gun Rights Comparison modal (unscored) |

## Session 11 Commits

| Commit | Description |
|--------|-------------|
| 40bd10c | Fix 3 dark mode CSS bugs in Gun Comparison Modal |

---

## CRITICAL AUDIT: Metric ID Source-of-Truth Alignment (Session 10)

**Date:** February 5, 2026
**Audited by:** Claude Opus 4.5 (LS-SESSION10-20260205)
**Source of Truth:** `src/data/metrics.ts` (100 metrics, 6 categories)

### Problem Found

5 files maintain their own independent hardcoded copies of metric ID mappings instead of importing from the single source of truth. Over time, 31 metric IDs drifted out of sync. This means:
- **Olivia** loses display names + deep knowledge for 31% of metrics
- **Gamma reports** show raw IDs instead of proper names for 31 metrics
- **Field evidence** lookups fail silently for 31 metrics
- **Contrast images** use a completely wrong ID system

### Files Audited - SAFE (no mismatches)

| File | Status | Why Safe |
|------|--------|----------|
| `api/judge-report.ts` | SAFE | Imports from source of truth dynamically |
| `src/components/JudgeTab.tsx` | SAFE | No hardcoded metric IDs |
| `src/components/CourtOrderVideo.tsx` | SAFE | No hardcoded metric IDs |
| `src/components/EnhancedComparison.tsx` | SAFE | No hardcoded metric IDs |
| `src/types/metrics.ts` | SAFE | Type definitions only |
| `src/types/enhancedComparison.ts` | SAFE | Type definitions only |
| `api/shared/metrics-data.ts` | SAFE | Parallel copy, 0 mismatches |

### Files Audited - BROKEN (31 metric ID mismatches each)

| File | What's Wrong | Impact |
|------|-------------|--------|
| `api/olivia/context.ts` | 31 wrong IDs in METRIC_DISPLAY_NAMES + METRIC_KNOWLEDGE (100 entries each) | Olivia gets no display name or deep knowledge for 31 metrics |
| `api/olivia/field-evidence.ts` | 31 wrong IDs in its own METRIC_DISPLAY_NAMES copy | Field evidence lookups fail for 31 metrics |
| `src/services/gammaService.ts` | 31 wrong IDs in its own METRIC_DISPLAY_NAMES copy | Gamma reports show raw IDs for 31 metrics |
| `src/data/fieldKnowledge.ts` | 31 wrong keys in FIELD_KNOWLEDGE map | Knowledge base unreachable for 31 metrics |
| `src/services/contrastImageService.ts` | Uses completely wrong ID system (`ef_`, `ql_`, `ls_` prefixes) | Contrast images may fail to match ANY real metric |

### Complete List of 31 Mismatched Metric IDs

| # | Source of Truth (src/data/metrics.ts) | Wrong ID in 5 broken files |
|---|---------------------------------------|---------------------------|
| 1 | `pf_08_euthanasia_status` | `pf_08_assisted_dying` |
| 2 | `pf_09_smoking_regulations` | `pf_09_smoking_restrictions` |
| 3 | `pf_12_seatbelt_enforcement` | `pf_12_seatbelt_laws` |
| 4 | `hp_06_zoning_strictness` | `hp_06_zoning_restrictions` |
| 5 | `hp_15_transfer_taxes` | `hp_15_transfer_tax` |
| 6 | `hp_16_lawn_regulations` | `hp_16_lawn_maintenance` |
| 7 | `hp_17_exterior_colors` | `hp_17_exterior_modifications` |
| 8 | `hp_18_fence_rules` | `hp_18_fence_regulations` |
| 9 | `hp_19_vehicle_parking` | `hp_19_parking_requirements` |
| 10 | `bw_02_occupational_licensing` | `bw_02_occupational_license` |
| 11 | `bw_05_at_will_employment` | `bw_05_employment_protections` |
| 12 | `bw_06_paid_leave_mandate` | `bw_06_paid_leave` |
| 13 | `bw_12_freelance_regs` | `bw_12_gig_economy` |
| 14 | `bw_16_union_rights` | `bw_16_union_laws` |
| 15 | `bw_18_discrimination_law` | `bw_18_anti_discrimination` |
| 16 | `bw_19_startup_ease` | `bw_19_startup_friendliness` |
| 17 | `bw_22_health_insurance` | `bw_22_health_insurance_mandate` |
| 18 | `bw_25_crypto_regulation` | `bw_25_crypto_regulations` |
| 19 | `tr_01_public_transit_quality` | `tr_01_public_transit` |
| 20 | `tr_05_rideshare_legal` | `tr_05_rideshare_regs` |
| 21 | `tr_07_speed_camera` | `tr_07_traffic_cameras` |
| 22 | `tr_08_parking_regs` | `tr_08_parking_regulations` |
| 23 | `tr_11_drivers_license` | `tr_11_license_requirements` |
| 24 | `tr_13_scooter_ebike` | `tr_13_electric_vehicles` |
| 25 | `pl_04_mandatory_minimum` | `pl_04_mandatory_minimums` |
| 26 | `pl_06_police_accountability` | `pl_06_police_oversight` |
| 27 | `pl_10_jury_trial` | `pl_10_jury_rights` |
| 28 | `pl_15_record_expungement` | `pl_15_expungement` |
| 29 | `sl_07_data_privacy` | `sl_07_privacy_laws` |
| 30 | `sl_08_dress_code` | `sl_08_dress_codes` |
| 31 | (additional mismatch found during deep audit) | TBD - verify during fix |

### Fix Status

- [ ] `api/olivia/context.ts` — Fix METRIC_DISPLAY_NAMES (31 keys) + METRIC_KNOWLEDGE (31 keys)
- [ ] `api/olivia/field-evidence.ts` — Fix METRIC_DISPLAY_NAMES (31 keys)
- [ ] `src/services/gammaService.ts` — Fix METRIC_DISPLAY_NAMES (31 keys)
- [ ] `src/data/fieldKnowledge.ts` — Fix FIELD_KNOWLEDGE (31 keys)
- [ ] `src/services/contrastImageService.ts` — Fix entire ID system

### Architecture Rule (NEW)

> **ALL metric ID references MUST match `src/data/metrics.ts`.**
> Never create independent copies of metric ID mappings.
> If a file needs metric display names, import from or reference the source of truth.
> Run a metric ID alignment check before any session handoff.

---

## Priority Order for Remaining Work

### 1. HIGH - Features
- **#13** Add More Models Button Handlers
- **#14** Judge Re-runs with Combined Results

### 2. MEDIUM - Features
- **#15** Disagreement Visualization
- **#22** Gamma Prompt Update
- **#70** Verify Olivia 100 Metrics — **AUDIT COMPLETE, FIX IN PROGRESS**

### 3. INVESTIGATION
- **#38** Supabase Profile Fetch Timeout (root cause)
- **#68** Court Orders Green Dot Bug (needs screenshot)

### 4. LOW - Polish
- **#23-28** Documentation polish
- **#29-30** Code quality

## Key Files Reference

| Area | Key Files |
|------|-----------|
| App entry | `src/App.tsx` |
| Metrics SOURCE OF TRUTH | `src/data/metrics.ts` (100 metrics, 6 categories) |
| LLM models / results | `src/components/EnhancedComparison.tsx` |
| Judge | `src/components/JudgeTab.tsx`, `api/judge-report.ts` |
| Save service | `src/services/savedComparisons.ts` (central dual-storage) |
| Cost tracking | `src/utils/costCalculator.ts`, `src/components/CostDashboard.tsx` |
| Tier access | `src/hooks/useTierAccess.ts` |
| Olivia context | `api/olivia/context.ts` (METRIC_DISPLAY_NAMES + METRIC_KNOWLEDGE) |
| Olivia evidence | `api/olivia/field-evidence.ts` |
| Olivia chat | `src/components/AskOlivia.tsx`, `src/hooks/useOliviaChat.ts` |
| Gamma service | `src/services/gammaService.ts` |
| Field knowledge | `src/data/fieldKnowledge.ts` |
| Contrast images | `src/services/contrastImageService.ts` |
| Court Orders | `src/components/CourtOrderVideo.tsx` |
| Visuals | `src/components/VisualsTab.tsx` |
| Videos | `src/components/NewLifeVideos.tsx`, `src/hooks/useGrokVideo.ts` |
| Draggable bubbles | `src/hooks/useDraggable.ts` (shared hook) |
| Types | `src/types/enhancedComparison.ts` |
| This TODO | `docs/UNIFIED-MASTER-TODO.md` |
| Master README | `docs/MASTER_README.md` |

---

---

## MASTER 100-METRIC ALIGNMENT TABLE (Verified Feb 5, 2026)

All 100 source-of-truth metrics from `src/data/metrics.ts` cross-referenced against every downstream system.

**Legend**: Y = present & matching | `--` = no template (contrast images only cover 28 by design)

### Personal Autonomy (15 metrics)

| # | Metric ID | Display Name | Olivia | Evidence | Gamma | Knowledge | Images |
|---|-----------|-------------|--------|----------|-------|-----------|--------|
| 1 | `pf_01_cannabis_legal` | Cannabis Legality | Y | Y | Y | Y | Y |
| 2 | `pf_02_alcohol_restrictions` | Alcohol Purchase Restrictions | Y | Y | Y | Y | Y |
| 3 | `pf_03_gambling_legal` | Gambling Legality | Y | Y | Y | Y | Y |
| 4 | `pf_04_prostitution_status` | Sex Work Legal Status | Y | Y | Y | Y | Y |
| 5 | `pf_05_drug_possession` | Drug Possession Penalties | Y | Y | Y | Y | Y |
| 6 | `pf_06_abortion_access` | Abortion Access | Y | Y | Y | Y | Y |
| 7 | `pf_07_lgbtq_rights` | LGBTQ+ Rights | Y | Y | Y | Y | Y |
| 8 | `pf_08_euthanasia_status` | Assisted Dying Laws | Y | Y | Y | Y | Y |
| 9 | `pf_09_smoking_regulations` | Smoking Regulations | Y | Y | Y | Y | -- |
| 10 | `pf_10_public_drinking` | Public Drinking Laws | Y | Y | Y | Y | Y |
| 11 | `pf_11_helmet_laws` | Helmet Laws | Y | Y | Y | Y | -- |
| 12 | `pf_12_seatbelt_enforcement` | Seatbelt Laws | Y | Y | Y | Y | -- |
| 13 | `pf_13_jaywalking` | Jaywalking Enforcement | Y | Y | Y | Y | -- |
| 14 | `pf_14_curfew_laws` | Curfew Laws | Y | Y | Y | Y | -- |
| 15 | `pf_15_noise_ordinances` | Noise Ordinances | Y | Y | Y | Y | -- |

### Housing & Property (20 metrics)

| # | Metric ID | Display Name | Olivia | Evidence | Gamma | Knowledge | Images |
|---|-----------|-------------|--------|----------|-------|-----------|--------|
| 16 | `hp_01_hoa_prevalence` | HOA Prevalence | Y | Y | Y | Y | Y |
| 17 | `hp_02_hoa_power` | HOA Power & Restrictions | Y | Y | Y | Y | -- |
| 18 | `hp_03_property_tax_rate` | Property Tax Rate | Y | Y | Y | Y | Y |
| 19 | `hp_04_rent_control` | Rent Control Laws | Y | Y | Y | Y | -- |
| 20 | `hp_05_eviction_protection` | Tenant Eviction Protections | Y | Y | Y | Y | -- |
| 21 | `hp_06_zoning_strictness` | Zoning Restrictions | Y | Y | Y | Y | Y |
| 22 | `hp_07_building_permits` | Building Permit Requirements | Y | Y | Y | Y | -- |
| 23 | `hp_08_short_term_rental` | Short-Term Rental Laws | Y | Y | Y | Y | Y |
| 24 | `hp_09_adu_laws` | ADU Laws | Y | Y | Y | Y | -- |
| 25 | `hp_10_home_business` | Home Business Restrictions | Y | Y | Y | Y | -- |
| 26 | `hp_11_eminent_domain` | Eminent Domain Protections | Y | Y | Y | Y | -- |
| 27 | `hp_12_squatter_rights` | Squatter Rights | Y | Y | Y | Y | -- |
| 28 | `hp_13_historic_preservation` | Historic Preservation Rules | Y | Y | Y | Y | -- |
| 29 | `hp_14_foreign_ownership` | Foreign Property Ownership | Y | Y | Y | Y | -- |
| 30 | `hp_15_transfer_taxes` | Property Transfer Tax | Y | Y | Y | Y | -- |
| 31 | `hp_16_lawn_regulations` | Lawn Maintenance Requirements | Y | Y | Y | Y | -- |
| 32 | `hp_17_exterior_colors` | Exterior Modification Rules | Y | Y | Y | Y | -- |
| 33 | `hp_18_fence_rules` | Fence Regulations | Y | Y | Y | Y | -- |
| 34 | `hp_19_vehicle_parking` | Residential Parking Rules | Y | Y | Y | Y | -- |
| 35 | `hp_20_pet_restrictions` | Pet Ownership Restrictions | Y | Y | Y | Y | -- |

### Business & Work (25 metrics)

| # | Metric ID | Display Name | Olivia | Evidence | Gamma | Knowledge | Images |
|---|-----------|-------------|--------|----------|-------|-----------|--------|
| 36 | `bw_01_business_license` | Business License Requirements | Y | Y | Y | Y | -- |
| 37 | `bw_02_occupational_licensing` | Occupational Licensing | Y | Y | Y | Y | -- |
| 38 | `bw_03_minimum_wage` | Minimum Wage Level | Y | Y | Y | Y | Y |
| 39 | `bw_04_right_to_work` | Right to Work Laws | Y | Y | Y | Y | -- |
| 40 | `bw_05_at_will_employment` | Employment Protections | Y | Y | Y | Y | -- |
| 41 | `bw_06_paid_leave_mandate` | Mandatory Paid Leave | Y | Y | Y | Y | -- |
| 42 | `bw_07_parental_leave` | Parental Leave Requirements | Y | Y | Y | Y | -- |
| 43 | `bw_08_non_compete` | Non-Compete Enforceability | Y | Y | Y | Y | -- |
| 44 | `bw_09_corporate_tax` | Corporate Tax Rate | Y | Y | Y | Y | -- |
| 45 | `bw_10_income_tax` | State/Local Income Tax | Y | Y | Y | Y | Y |
| 46 | `bw_11_sales_tax` | Sales Tax Rate | Y | Y | Y | Y | Y |
| 47 | `bw_12_freelance_regs` | Gig Worker Regulations | Y | Y | Y | Y | -- |
| 48 | `bw_13_work_visa` | Work Visa Friendliness | Y | Y | Y | Y | -- |
| 49 | `bw_14_remote_work` | Remote Work Laws | Y | Y | Y | Y | -- |
| 50 | `bw_15_overtime_rules` | Overtime Requirements | Y | Y | Y | Y | -- |
| 51 | `bw_16_union_rights` | Union Rights & Laws | Y | Y | Y | Y | -- |
| 52 | `bw_17_workplace_safety` | Workplace Safety Standards | Y | Y | Y | Y | -- |
| 53 | `bw_18_discrimination_law` | Anti-Discrimination Laws | Y | Y | Y | Y | -- |
| 54 | `bw_19_startup_ease` | Startup Friendliness | Y | Y | Y | Y | Y |
| 55 | `bw_20_food_truck` | Food Truck Regulations | Y | Y | Y | Y | Y |
| 56 | `bw_21_contractor_license` | Contractor Licensing | Y | Y | Y | Y | -- |
| 57 | `bw_22_health_insurance` | Health Insurance Mandate | Y | Y | Y | Y | Y |
| 58 | `bw_23_tip_credit` | Tip Credit Laws | Y | Y | Y | Y | -- |
| 59 | `bw_24_banking_access` | Banking Access | Y | Y | Y | Y | -- |
| 60 | `bw_25_crypto_regulation` | Cryptocurrency Regulations | Y | Y | Y | Y | Y |

### Transportation (15 metrics)

| # | Metric ID | Display Name | Olivia | Evidence | Gamma | Knowledge | Images |
|---|-----------|-------------|--------|----------|-------|-----------|--------|
| 61 | `tr_01_public_transit_quality` | Public Transit Quality | Y | Y | Y | Y | Y |
| 62 | `tr_02_walkability` | Walkability Score | Y | Y | Y | Y | Y |
| 63 | `tr_03_bike_infrastructure` | Bike Infrastructure | Y | Y | Y | Y | Y |
| 64 | `tr_04_car_dependency` | Car Dependency Level | Y | Y | Y | Y | -- |
| 65 | `tr_05_rideshare_legal` | Rideshare Regulations | Y | Y | Y | Y | -- |
| 66 | `tr_06_speed_limits` | Speed Limit Enforcement | Y | Y | Y | Y | -- |
| 67 | `tr_07_speed_camera` | Traffic Camera Usage | Y | Y | Y | Y | -- |
| 68 | `tr_08_parking_regs` | Parking Regulations | Y | Y | Y | Y | -- |
| 69 | `tr_09_toll_roads` | Toll Road Prevalence | Y | Y | Y | Y | -- |
| 70 | `tr_10_vehicle_inspection` | Vehicle Inspection Requirements | Y | Y | Y | Y | -- |
| 71 | `tr_11_drivers_license` | Driver License Requirements | Y | Y | Y | Y | -- |
| 72 | `tr_12_dui_laws` | DUI Law Severity | Y | Y | Y | Y | -- |
| 73 | `tr_13_scooter_ebike` | E-Vehicle/E-Bike Laws | Y | Y | Y | Y | -- |
| 74 | `tr_14_airport_access` | Airport Accessibility | Y | Y | Y | Y | -- |
| 75 | `tr_15_traffic_congestion` | Traffic Congestion Level | Y | Y | Y | Y | -- |

### Policing & Legal (15 metrics)

| # | Metric ID | Display Name | Olivia | Evidence | Gamma | Knowledge | Images |
|---|-----------|-------------|--------|----------|-------|-----------|--------|
| 76 | `pl_01_incarceration_rate` | Incarceration Rate | Y | Y | Y | Y | Y |
| 77 | `pl_02_police_per_capita` | Police Per Capita | Y | Y | Y | Y | -- |
| 78 | `pl_03_civil_forfeiture` | Civil Asset Forfeiture | Y | Y | Y | Y | -- |
| 79 | `pl_04_mandatory_minimum` | Mandatory Minimum Sentences | Y | Y | Y | Y | -- |
| 80 | `pl_05_bail_system` | Cash Bail System | Y | Y | Y | Y | -- |
| 81 | `pl_06_police_accountability` | Police Oversight | Y | Y | Y | Y | Y |
| 82 | `pl_07_qualified_immunity` | Qualified Immunity Status | Y | Y | Y | Y | -- |
| 83 | `pl_08_legal_costs` | Legal System Costs | Y | Y | Y | Y | -- |
| 84 | `pl_09_court_efficiency` | Court System Efficiency | Y | Y | Y | Y | -- |
| 85 | `pl_10_jury_trial` | Jury Nullification Rights | Y | Y | Y | Y | -- |
| 86 | `pl_11_surveillance` | Government Surveillance | Y | Y | Y | Y | -- |
| 87 | `pl_12_search_seizure` | Search & Seizure Protections | Y | Y | Y | Y | -- |
| 88 | `pl_13_death_penalty` | Death Penalty Status | Y | Y | Y | Y | -- |
| 89 | `pl_14_prison_conditions` | Prison Conditions | Y | Y | Y | Y | -- |
| 90 | `pl_15_record_expungement` | Criminal Record Expungement | Y | Y | Y | Y | -- |

### Speech & Lifestyle (10 metrics)

| # | Metric ID | Display Name | Olivia | Evidence | Gamma | Knowledge | Images |
|---|-----------|-------------|--------|----------|-------|-----------|--------|
| 91 | `sl_01_free_speech` | Free Speech Protections | Y | Y | Y | Y | Y |
| 92 | `sl_02_press_freedom` | Press Freedom | Y | Y | Y | Y | -- |
| 93 | `sl_03_internet_freedom` | Internet Freedom | Y | Y | Y | Y | -- |
| 94 | `sl_04_hate_speech_laws` | Hate Speech Laws | Y | Y | Y | Y | -- |
| 95 | `sl_05_protest_rights` | Protest Rights | Y | Y | Y | Y | -- |
| 96 | `sl_06_religious_freedom` | Religious Freedom | Y | Y | Y | Y | Y |
| 97 | `sl_07_data_privacy` | Data Privacy Laws | Y | Y | Y | Y | -- |
| 98 | `sl_08_dress_code` | Dress Code Freedom | Y | Y | Y | Y | -- |
| 99 | `sl_09_cultural_tolerance` | Cultural Tolerance | Y | Y | Y | Y | Y |
| 100 | `sl_10_defamation_laws` | Defamation Laws | Y | Y | Y | Y | -- |

### Alignment Totals

| System | Aligned | Total | Status |
|--------|---------|-------|--------|
| Olivia Context (`api/olivia/context.ts`) | 100 | 100 | PERFECT |
| Field Evidence (`api/olivia/field-evidence.ts`) | 100 | 100 | PERFECT |
| Gamma Reports (`src/services/gammaService.ts`) | 100 | 100 | PERFECT |
| Field Knowledge (`src/data/fieldKnowledge.ts`) | 100 | 100 | PERFECT |
| Contrast Images (`src/services/contrastImageService.ts`) | 28 | 28 | PERFECT (subset) |

### OPEN QUESTIONS (Session 10)

1. **~~Gun Rights metric missing~~** — RESOLVED. See standalone Gun Comparison Modal below.
2. **Contrast Images 28/100** — Only 28 metrics have image prompt templates. Should more be added?

---

## GUN COMPARISON MODAL — Standalone Unscored Feature

> **COMPRESSION SAFETY NOTE**: If context is compressed, RE-READ this entire section
> AND `docs/UNIFIED-MASTER-TODO.md` before implementing or modifying this feature.
> Also re-read `src/data/metrics.ts` (source of truth) to avoid ID mismatches.

### The Problem

Gun rights is the ONE metric that fundamentally breaks the "more freedom = higher score"
assumption underpinning the entire 100-metric system. Every other metric has a defensible direction:

- More cannabis freedom → unambiguously "more free"
- Lower property taxes → unambiguously "more free"
- Less surveillance → unambiguously "more free"

But guns? **Constitutional carry in a Florida Publix is maximum freedom to one person and
maximum danger to another.** You cannot score this on a freedom scale without taking a
political position, which would destroy the credibility of the entire tool.

Consider: A MAGA supporter living in England would feel UNFREE because they can't own firearms.
A progressive living in rural Florida would feel UNSAFE — surrounded by AR-15s in grocery stores.
Neither perspective is wrong. Both are valid lived experiences of freedom (or lack thereof).

### The Design Decision (Session 10, Feb 5 2026)

**We do NOT add gun rights to the 100-metric scored system.**

Instead, we build a **standalone, unscored Gun Comparison Modal** that:
- Presents factual gun law data for City A vs City B side by side
- Does NOT assign a winner or hero banner
- Does NOT contribute to the overall freedom score
- Acknowledges the polarization explicitly in a user-facing disclaimer
- Simply returns structured data: which city has more gun freedoms vs restrictions

### Why Not Swap Jaywalking?

We audited the full impact of swapping `pf_13_jaywalking` → `pf_13_firearm_rights`:

**18 files, 35+ individual references** would need changing:
- `src/data/metrics.ts` (source of truth — full metric definition)
- `api/shared/metrics-data.ts` (mirror)
- `api/olivia/context.ts` (METRIC_DISPLAY_NAMES + METRIC_KNOWLEDGE)
- `src/data/fieldKnowledge.ts` (FIELD_KNOWLEDGE)
- `api/olivia/field-evidence.ts` (METRIC_DISPLAY_NAMES)
- `src/services/gammaService.ts` (METRIC_DISPLAY_NAMES)
- `src/data/metricTooltips.ts` (tooltip data)
- `src/data/freedom-index-scoring-anchors (1).json` (scoring anchors)
- `src/components/EnhancedComparison.tsx` (emoji map)
- `src/components/DealbreakersWarning.tsx` (emoji map)
- `src/components/DealbreakersPanel.tsx` (emoji map)
- `docs/OLIVIA_KNOWLEDGE_BASE.md` (7+ references, full section rewrite)
- `docs/OLIVIA_GPT_INSTRUCTIONS.md` (example text)
- `docs/OLIVIA_FUNCTION_CALLING_SETUP.md` (enum list)
- `docs/LIFE-SCORE-100-METRICS.md` (table row)
- `docs/handoffs/HANDOFF_GPT_INSTRUCTIONS_REWRITE.md` (example)
- `docs/handoffs/HANDOFF_FOR_AI_CONSULTANTS.md` (category list)
- `docs/UNIFIED-MASTER-TODO.md` (master table)

This is exactly the kind of change that caused the 30-metric-ID mismatch disaster.
The standalone modal approach is safer (isolated, no ripple effects), faster, and
better product design.

### User-Facing Disclaimer Text (Top of Modal)

> **Why Gun Rights Are Separated**
>
> We have separated the gun metric into its own standalone comparison because of the
> enormous polarizing opinions on whether guns mean more freedom or less freedom.
>
> To someone in a constitutional carry state, unrestricted firearm access IS freedom —
> the foundation of personal safety and self-determination. To someone from a country
> with strict gun control, being surrounded by armed civilians in a grocery store is
> NOT freedom — it's danger.
>
> We believe we cannot create an accurate derived freedom score for such a deeply
> divisive subject. Instead, we enable you to compare any two cities purely on their
> gun laws — which city has more gun freedoms vs. more restrictions — and let you
> decide what that means for YOUR definition of freedom.

### Architecture

**This feature is completely isolated from the 100-metric scoring system.**

#### New Files

| File | Purpose |
|------|---------|
| `api/olivia/gun-comparison.ts` | Vercel API endpoint — sends both cities to LLM, returns structured gun law facts |
| `src/components/GunComparisonModal.tsx` | Full-screen expand/collapse modal UI |
| `src/components/GunComparisonModal.css` | Styling |
| `src/hooks/useGunComparison.ts` | State management hook (fetch, loading, error, cache) |

#### What It Does NOT Touch

- `src/data/metrics.ts` — UNTOUCHED
- All 5 downstream metric systems — UNTOUCHED
- Judge, Court Orders, Gamma — UNTOUCHED
- Olivia's 100-metric brain — UNTOUCHED
- Scoring engine — UNTOUCHED
- The 18 jaywalking files — UNTOUCHED

#### API Response Shape

```typescript
interface GunComparisonResponse {
  cityA: {
    name: string;
    laws: {
      openCarry: string;
      concealedCarry: string;
      assaultWeaponBan: string;
      magazineLimits: string;
      waitingPeriod: string;
      backgroundChecks: string;
      redFlagLaws: string;
      standYourGround: string;
      castleDoctrine: string;
      gunFreeZones: string;
    };
  };
  cityB: { /* same shape */ };
  summary: string;  // Brief factual summary, no opinion
}
```

#### UI Trigger Location

Button on comparison results page (near category tabs or as a "Special Comparisons" link).
Opens a full-screen modal with:
1. Disclaimer text at top
2. Side-by-side factual comparison (no hero banner, no winner, no scores)
3. ~10 gun law categories compared factually
4. Collapse/close button

### Implementation Status

- [x] API endpoint (`api/olivia/gun-comparison.ts`) — DONE (6b7574f)
- [x] Modal component (`src/components/GunComparisonModal.tsx` + CSS) — DONE (6b7574f)
- [x] Hook (`src/hooks/useGunComparison.ts`) — DONE (6b7574f)
- [x] Wire trigger button into results page — DONE (6b7574f)
- [x] Dark mode CSS audit — DONE (40bd10c) — Fixed 3 bugs: error state, loading sub-text, mobile ::before
- [ ] Test with real city pairs (awaiting live deploy verification)

---

*Last Updated: February 5, 2026 - Session 10 (LS-SESSION10-20260205)*
*Build: Deploying via Vercel (NO local builds)*
*All changes pushed to GitHub (main branch)*
