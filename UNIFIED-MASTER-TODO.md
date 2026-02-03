# LIFE SCORE - UNIFIED MASTER TODO
**Created:** February 3, 2026
**Last Updated:** February 3, 2026 (Session LS-COURT-ORDER-20260203 - Final)
**Source:** Merged from MASTER-TODO-20260202.md + FINAL-CODEBASE-FIXES-TABLE.md
**Duplicates Removed:** 14 items

---

## SUMMARY

| Priority | Count | Status |
|----------|-------|--------|
| CRITICAL (Architecture) | 4 | 3 Done, 1 Deferred |
| HIGH (UI/UX Critical) | 4 | 4 Done |
| MEDIUM (UI/UX) | 4 | Active |
| MEDIUM (Features) | 10 | 2 Done, 8 Active |
| LOW (Documentation) | 6 | Active |
| LOW (Code Quality) | 2 | Active |
| DEFERRED (Legal/Compliance) | 7 | External |
| NEW BUGS | 2 | Identified |
| **TOTAL UNIQUE** | **39** | - |

---

## CRITICAL - Architecture & Performance (4 items)

| # | Item | Details | Priority |
|---|------|---------|----------|
| 1 | ~~City data caching in Supabase~~ | Load 200 cities into DB, cache results for instant responses | DEFERRED |
| 2 | ✅ ~~Tavily search restructure~~ | Added Research API caching wrapper (67% reduction in Research calls) | DONE 2/3 |
| 3 | ✅ ~~Perplexity prompt adjustments~~ | Optimized prompts: batch threshold 20→15, source reuse, evidence limits, confidence fallback | DONE 2/3 |
| 4 | ✅ ~~Gemini prompt adjustments~~ | Lowered temperature 0.3→0.2 for stricter factual adherence | DONE 2/3 |

---

## HIGH - UI/UX Critical (4 items)

| # | Item | Details | Status |
|---|------|---------|--------|
| 5 | ✅ ~~Judge Video welcome screen~~ | Added mobile CSS scaling (768px/480px breakpoints) | DONE 2/3 |
| 6 | ✅ ~~Judge Video - Christiano animation~~ | Wav2Lip: wider pads, 30fps, 720p (works but slow - revisit later) | DONE 2/3 |
| 7 | ✅ ~~Results Report section scroll~~ | Fixed: scrollIntoView block:'start' scrolls to TOP of section | DONE 2/3 (b29d000) |
| 8 | Post-search flow redesign | Show status buttons first, then "View Report" button | ACTIVE |

---

## MEDIUM - UI/UX Polish (4 items)

| # | Item | Details |
|---|------|---------|
| 9 | Freedom Cards text size | City text too big, reduce font |
| 10 | Judge Tab mobile buttons | Center Save/Download/Forward on mobile |
| 11 | Mobile "One remaining" text | Move down ~1/4 inch on mobile |
| 12 | City selection modals | Picture modals need polish/upscale |

---

## MEDIUM - Features (10 items)

| # | Item | Details | Status |
|---|------|---------|--------|
| 13 | Add More Models Button Handlers | Wire up button functionality | ACTIVE |
| 14 | Judge Re-runs with Combined Results | Re-run with updated data | ACTIVE |
| 15 | Disagreement Visualization | Show where LLMs disagree | ACTIVE |
| 16 | Session Management | Improve session handling | ACTIVE |
| 17 | Score calculation UI | Design explainer for LIFE SCORE math | ACTIVE |
| 18 | Save button - Olivia images | Add save to comparison city images | ACTIVE |
| 19 | Save button - Visuals video | Add save to comparison city video | ACTIVE |
| 20 | ✅ ~~Save button - Court Order~~ | Added Save/Download/Share buttons | DONE 2/3 (58344b7) |
| 21 | Court Order video upload | Override generated video with custom upload | DEFERRED |
| 22 | Gamma prompt update | Extract, enhance, and upload new prompt | ACTIVE |

---

## NEW FEATURE - Court Order Freedom Education (DONE 2/3)

| Commit | Feature | Details |
|--------|---------|---------|
| 8770bad | 6-Tab Freedom Education | Tabs: Personal, Housing, Business, Transport, Policing, Speech |
| 8770bad | Winning Metrics Display | Shows metrics where winner beats loser by 10+ points |
| 8770bad | Real-World Examples | AI-generated practical examples for each metric |
| 8770bad | Hero Statements | Celebratory summary per category tab |
| 8770bad | API Enhancement | judge-report.ts extended to generate freedomEducation data |

---

## NEW BUGS IDENTIFIED (Session 2/3)

| # | Bug | Details | Status |
|---|-----|---------|--------|
| 38 | Supabase profile fetch timeout | Profile/preferences fetch times out (45s x 4 retries), causing tier fallback to 'free' | PARTIALLY FIXED (991cabc) - Added fail-open to enterprise for authenticated users |
| 39 | FeatureGate blocks clicks after dismiss | pointer-events: none persisted after user dismissed upgrade overlay | FIXED (e827fff) |
| 40 | Admin blocked from FeatureGate features | Admin/owner seeing "Limit Reached" popups | FIXED - Added isAdmin bypass to all 10 usage-checking files |
| 41 | VisualsTab dropdown dark on dark | "Select Text" was dark blue on blue background | FIXED - Changed to gold/white |
| 42 | Saved Reports mobile buttons invisible | Eye/pencil/trash buttons not visible on mobile vertical | FIXED (a01484e) - Added 44px touch targets with !important |
| 43 | Olivia audio not stopping | Audio kept playing on navigation/stop click | FIXED - Added interruptAvatar, stopSpeaking, speechSynthesis.cancel |
| 44 | Olivia goes bonkers on mobile text | Audio chaos when receiving text messages | FIXED - Added visibilitychange and blur handlers |
| 45 | Mobile video playback broken | "Play Both Videos" not working on mobile | FIXED - Added muted fallback for autoplay policy |
| 46 | Ask Olivia gray text | All text was off-white/gray instead of crisp white | FIXED - Changed CSS variables to #ffffff |
| 47 | Court Order badge spacing | Advantage badge too close to scores | FIXED - Added extra top padding to metric cards |

---

## LOW - Documentation (6 items)

| # | Item | Details | Source |
|---|------|---------|--------|
| 23 | Update glossary | CSM Section 12 updates | 3.11 |
| 24 | Add Kling AI mentions | Document in all manuals | 3.14 |
| 25 | Update version numbers to v2.3 | Version bump across manuals | 3.15 |
| 26 | Browser Support Verification | Test and document compatibility | 11.2 |
| 27 | PWA Check | Verify PWA functionality | 11.3 |
| 28 | Help Center Link Verification | Ensure all help links work | 11.6 |

---

## LOW - Code Quality (2 items)

| # | Item | Details |
|---|------|---------|
| 29 | Final code debug session | Comprehensive debugging pass |
| 30 | Final code refactor | Clean up and optimize codebase |

---

## DEFERRED - Legal/Compliance (7 items, external dependencies)

| # | Item | Details | Source |
|---|------|---------|--------|
| 31 | Legal pages email update | Change to cluesnomads@gmail.com in Privacy, ToS, Refund, AUP, Cookies | B1 |
| 32 | GDPR compliance | Complete GDPR implementation | B2 |
| 33 | Privacy policy finalization | Finalize privacy regulations | B3 |
| 34 | ICO Registration (UK) | Required for UK data processing | 9A.1 |
| 35 | DPAs (5 vendors) | xAI, Perplexity, D-ID, Gamma, Tavily | 9B.1-5 |
| 36 | Appoint DPO | Data Protection Officer | 9D.2 |
| 37 | Annual DPA review reminder | Set up recurring compliance review | 9D.3 |

---

## COMMITS THIS SESSION (Feb 3, 2026 - Sessions 2 & 3)

| Commit | Description |
|--------|-------------|
| 8770bad | Implement 6-Tab Freedom Education section for Court Order |
| e81691c | Fix TypeScript errors for Freedom Education components |
| 8d98528 | Fix unused loserCity variable in CourtOrderVideo |
| e827fff | Fix FeatureGate blocking clicks after dismiss on mobile |
| 991cabc | Fix tier access when Supabase profile fetch times out |
| b29d000 | Fix category section scroll - scroll to TOP not bottom |
| **SESSION 3 COMMITS** | |
| 0df7b98 | Admin bypass for all FeatureGate-protected features (10 files) |
| 0df7b98 | Court Order UI redesign: orange subtitle, centered tabs, larger fonts |
| 0df7b98 | Opus prompt enhancement for powerful freedom visions |
| 0df7b98 | VisualsTab dropdown contrast fix (gold/white) |
| 0df7b98 | Olivia audio stop/cleanup fixes with visibility handlers |
| 0df7b98 | Mobile video playback muted fallback |
| 0df7b98 | Ask Olivia text colors to crisp white |
| 0df7b98 | Court Order advantage badge spacing |
| a01484e | Saved Reports mobile button visibility fix |

---

## RECENTLY COMPLETED (for reference)

These items were marked complete on Feb 3, 2026:

| Item | Status |
|------|--------|
| Perplexity Data Sources (6A.1) | Done (prior chat) |
| 5th Thumbnail UI Wiring (6A.2) | Done (prior chat) |
| Multi-LLM Field Sources (6A.3) | Done (prior chat) |
| Gamma Embed Error Handling (6C.2) | Done (prior chat) |
| Re-run Judge Functionality (6D.4) | Done (prior chat) |
| Login Landing Page (6E.1) | Done (prior chat) |
| Letter "C" bug (8.2) | Done (prior chat) |
| Cancel stuck Replicate (10.1) | Done (prior chat) |
| Verify city count (3.13) | Done (prior chat) |
| App Schema Manual (12.1) | Done (4596f41) |
| Judge Equations Manual (12.2) | Done (f640979) |
| Court Order Save/Download/Share | Done (58344b7) |
| Freedom Education 6-Tab Feature | Done (8770bad) |
| Category Scroll Fix | Done (b29d000) |
| FeatureGate Click Fix | Done (e827fff) |
| Tier Access Fail-Open Fix | Done (991cabc) |
| **SESSION 3 FIXES** | |
| Admin bypass for FeatureGate (#40) | Done (0df7b98) |
| VisualsTab dropdown contrast (#41) | Done (0df7b98) |
| Saved Reports mobile buttons (#42) | Done (a01484e) |
| Olivia audio stopping (#43) | Done (0df7b98) |
| Olivia mobile text chaos (#44) | Done (0df7b98) |
| Mobile video playback (#45) | Done (0df7b98) |
| Ask Olivia gray text (#46) | Done (0df7b98) |
| Court Order badge spacing (#47) | Done (0df7b98) |
| Court Order UI redesign (orange/centered/fonts) | Done (0df7b98) |
| Opus prompt enhancement (powerful freedom visions) | Done (0df7b98) |

---

## KNOWN ISSUES TO INVESTIGATE

1. **Supabase Slow/Timeout** - Profile fetch taking 45+ seconds suggests Supabase project may be paused/cold starting. Check Supabase dashboard.
2. **Christiano Animation Quality** - Wav2Lip works but is stiff. Long-term: consider alternative lip-sync models.

---

## PRIORITY ORDER FOR NEXT SESSION

### Immediate (Next Session)
1. #8 - Post-search flow redesign
2. #9-12 - UI polish items (Freedom Cards, mobile buttons, modals)

### Phase 2: Features
3. #13-17 - Core feature completions
4. #18-19 - Remaining save buttons

### Phase 3: Cleanup
5. #23-28 - Documentation
6. #29-30 - Code quality
7. #31-37 - Legal (when ready)

---

**TOTAL: 47 unique items**
- 26 Completed (Sessions 2 & 3)
- 13 Active items remaining
- 8 Deferred/External items

*Last Updated: February 3, 2026 - Session LS-COURT-ORDER-20260203 (Final)*
