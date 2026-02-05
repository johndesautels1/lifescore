# LIFE SCORE - UNIFIED MASTER TODO
**Created:** February 3, 2026
**Last Updated:** February 5, 2026 (Session 9 - LS-SESSION9-20260205)
**Source:** Complete merged list from all sessions (1-9)
**Conversation ID:** LS-SESSION9-20260205

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

# SESSION 10 HANDOFF

**Date:** February 5, 2026
**From:** Session 9 (LS-SESSION9-20260205)
**To:** Next Agent (Session 10)

## Priority Order for Next Session

### 1. HIGH - Features
- **#13** Add More Models Button Handlers
- **#14** Judge Re-runs with Combined Results

### 2. MEDIUM - Features
- **#15** Disagreement Visualization
- **#22** Gamma Prompt Update
- **#70** Verify Olivia 100 Metrics

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
| LLM models / results | `src/components/EnhancedComparison.tsx` |
| Judge | `src/components/JudgeTab.tsx`, `api/judge-report.ts` |
| Save service | `src/services/savedComparisons.ts` (central dual-storage) |
| Cost tracking | `src/utils/costCalculator.ts`, `src/components/CostDashboard.tsx` |
| Tier access | `src/hooks/useTierAccess.ts` |
| Olivia | `src/components/AskOlivia.tsx`, `src/hooks/useOliviaChat.ts` |
| Court Orders | `src/components/CourtOrderVideo.tsx` |
| Visuals | `src/components/VisualsTab.tsx` |
| Videos | `src/components/NewLifeVideos.tsx`, `src/hooks/useGrokVideo.ts` |
| Draggable bubbles | `src/hooks/useDraggable.ts` (shared hook) |
| Types (SOURCE OF TRUTH) | `src/types/enhancedComparison.ts` |
| This TODO | `docs/UNIFIED-MASTER-TODO.md` |
| Master README | `docs/MASTER_README.md` |

---

*Last Updated: February 5, 2026 - Session 9 (LS-SESSION9-20260205)*
*Build: Clean, 0 TypeScript errors*
*All changes pushed to GitHub (main branch)*
