# LIFE SCORE - UNIFIED MASTER TODO
**Created:** February 3, 2026
**Conversation ID:** LS-TODO-20260203
**Source:** Merged from MASTER-TODO-20260202.md + FINAL-CODEBASE-FIXES-TABLE.md
**Duplicates Removed:** 14 items

---

## SUMMARY

| Priority | Count | Status |
|----------|-------|--------|
| CRITICAL (Architecture) | 4 | Active |
| HIGH (UI/UX Critical) | 4 | Active |
| MEDIUM (UI/UX) | 4 | Active |
| MEDIUM (Features) | 10 | Active |
| LOW (Documentation) | 6 | Active |
| LOW (Code Quality) | 2 | Active |
| DEFERRED (Legal/Compliance) | 7 | External |
| **TOTAL UNIQUE** | **37** | - |

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

| # | Item | Details |
|---|------|---------|
| 5 | ✅ ~~Judge Video welcome screen~~ | Added mobile CSS scaling (768px/480px breakpoints) | DONE 2/3 |
| 6 | ✅ ~~Judge Video - Christiano animation~~ | Adjusted Wav2Lip: wider pads, 30fps, 720p, resize_factor 0.75 | DONE 2/3 (needs testing) |
| 7 | Results Report section scroll | Auto-scroll to section when expanded |
| 8 | Post-search flow redesign | Show status buttons first, then "View Report" button |

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

| # | Item | Details | Source |
|---|------|---------|--------|
| 13 | Add More Models Button Handlers | Wire up button functionality | 6B.2 |
| 14 | Judge Re-runs with Combined Results | Re-run with updated data | 6B.4 |
| 15 | Disagreement Visualization | Show where LLMs disagree | 6D.3 |
| 16 | Session Management | Improve session handling | 6E.4 |
| 17 | Score calculation UI | Design explainer for LIFE SCORE math | NEW |
| 18 | Save button - Olivia images | Add save to comparison city images | E1 |
| 19 | Save button - Visuals video | Add save to comparison city video | E2 |
| 20 | Save button - Court Order | Add save to Court Order display | E3 |
| 21 | Court Order video upload | Override generated video with custom upload | E4 |
| 22 | Gamma prompt update | Extract, enhance, and upload new prompt | E5 |

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

---

## PRIORITY ORDER FOR WORK

### Phase 1: Critical Architecture (Do First)
1. #2 - City data caching (biggest performance win)
2. #1 - Tavily restructure (cost savings)
3. #3/#4 - Perplexity & Gemini prompt fixes

### Phase 2: High-Impact UI
4. #5 - Judge video welcome screen
5. #6 - Christiano animation
6. #7 - Results section scroll
7. #8 - Post-search flow

### Phase 3: Features & Polish
8. #13-16 - Core feature completions
9. #9-12 - UI polish items
10. #17-22 - New feature additions

### Phase 4: Cleanup
11. #23-28 - Documentation
12. #29-30 - Code quality
13. #31-37 - Legal (when ready)

---

**TOTAL: 37 unique items**
- 30 Active items
- 7 Deferred items

*Created: February 3, 2026*
*Progress tracking begins fresh from this unified list*
