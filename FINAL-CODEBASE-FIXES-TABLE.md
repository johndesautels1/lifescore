# LIFE SCORE - FINAL CODEBASE FIXES TABLE
**Created:** February 2, 2026
**Purpose:** Master checklist combining all remaining items + new user items
**For Review:** February 3, 2026

---

## STATUS KEY
| Symbol | Meaning |
|--------|---------|
| ✅ | DONE - Completed |
| ⚠️ | PARTIAL - Partially done or needs verification |
| ❌ | NOT DONE - Needs work |

---

## SECTION A: CRITICAL UI/UX FIXES

| # | Status | Item | Details |
|---|--------|------|---------|
| A1 | ❌ | Judge Video - Christiano animation | Face and body too rigid, needs animation tweaks to look more natural |
| A2 | ❌ | Freedom Cards text size | City text too big, reduce font size |
| A3 | ❌ | Results Report section scroll | When user expands a section, doesn't auto-scroll to beginning of that section |
| A4 | ❌ | Judge Tab mobile buttons | Save/Download/Forward buttons need centered on mobile (desktop OK) |
| A5 | ❌ | **[IMPORTANT]** Judge Video welcome screen | Content (text/graphics) too large - scale down to fit within viewport WITHOUT shrinking the screen container |
| A6 | ❌ | Mobile "One remaining" text | Text needs moved down ~1/4 inch (mobile only) |
| A7 | ❌ | City selection modals | Picture modals look cheap - need polish and upscale (not the data display) |

---

## SECTION B: LEGAL/COMPLIANCE

| # | Status | Item | Details |
|---|--------|------|---------|
| B1 | ❌ | Legal pages email update | Change email to cluesnomads@gmail.com in: Privacy Policy, Terms of Service, Refund Policy, Acceptable Use Policy, Cookies Page |
| B2 | ❌ | GDPR compliance | Complete GDPR regulations implementation |
| B3 | ❌ | Privacy policy | Finalize privacy policy regulations |
| B4 | ❌ | ICO Registration (UK) | Required for UK company processing personal data |
| B5 | ❌ | DPA - xAI (Grok) | Data Processing Agreement pending |
| B6 | ❌ | DPA - Perplexity | Data Processing Agreement pending |
| B7 | ❌ | DPA - D-ID | Data Processing Agreement pending |
| B8 | ❌ | DPA - Gamma | Data Processing Agreement pending |
| B9 | ❌ | DPA - Tavily | Data Processing Agreement pending |
| B10 | ❌ | Appoint DPO | Data Protection Officer designation |
| B11 | ❌ | Annual DPA review reminder | Set up recurring compliance review |

---

## SECTION C: ARCHITECTURE & PERFORMANCE

| # | Status | Item | Details |
|---|--------|------|---------|
| C1 | ❌ | **[MAJOR]** Tavily search restructure | Reduce repetitive/expensive calls - design Tavily to fill in LLM gaps only, not control everything searched |
| C2 | ❌ | **[MAJOR]** City data caching in Supabase | Load all 200 cities into DB, store LLM results, future searches pull cached data for near-instant responses (currently 3-5 min is too long) |
| C3 | ❌ | Perplexity prompt adjustments | Several sections fail to return data - use Perplexity to help tweak its own prompts |
| C4 | ❌ | Gemini prompt adjustments | Several sections fail to return data - use Gemini to help tweak its own prompts |

---

## SECTION D: UX FLOW CHANGES

| # | Status | Item | Details |
|---|--------|------|---------|
| D1 | ❌ | Post-search flow redesign | Don't auto-open data report after LLM search - show section success/fail status buttons first, add "Complete Processing and View Report" button |
| D2 | ❌ | Score calculation UI | Design UI element explaining how mathematics and final LIFE SCOREs are calculated |

---

## SECTION E: NEW FEATURES

| # | Status | Item | Details |
|---|--------|------|---------|
| E1 | ❌ | Save buttons - Olivia images | Add save button to comparison city images on Olivia |
| E2 | ❌ | Save buttons - Visuals video | Add save button to comparison city video on Visuals |
| E3 | ❌ | Save buttons - Court Order | Add save button to Court Order digital display |
| E4 | ❌ | Court Order video upload | Add upload button to override generated video with custom video (e.g. from InVideo), only overrides if video uploaded |
| E5 | ❌ | Gamma prompt update | Extract current Gamma prompt, update for new app features, upload enhanced prompt to generate more advanced reports |

---

## SECTION F: CODE QUALITY

| # | Status | Item | Details |
|---|--------|------|---------|
| F1 | ❌ | Final code debug session | Comprehensive debugging pass |
| F2 | ❌ | Final code refactor | Clean up and optimize codebase |

---

## SECTION G: EXISTING REMAINING ITEMS (from prior TODO)

### Bugs & Fixes
| # | Status | Item | Details |
|---|--------|------|---------|
| G1 | ⚠️ | Letter "C" not typing in Ask Olivia | `AskOlivia.tsx` - needs investigation |
| G2 | ❌ | Cancel stuck Replicate predictions | Handle orphaned prediction cleanup |

### Features Incomplete
| # | Status | Item | Details |
|---|--------|------|---------|
| G3 | ❌ | Perplexity Data Sources | Wire up data source display |
| G4 | ❌ | 5th Thumbnail UI Wiring | Connect 5th thumbnail in UI |
| G5 | ❌ | Multi-LLM Field Sources Missing | Show which LLM provided each field |
| G6 | ❌ | Add More Models Button Handlers | Wire up button functionality |
| G7 | ❌ | Judge Re-runs with Combined Results | Allow re-running Judge with updated data |
| G8 | ❌ | Gamma Embed Error Handling | Handle embed failures gracefully |
| G9 | ❌ | Disagreement Visualization | Show where LLMs disagree |
| G10 | ❌ | Re-run Judge Functionality | Button to re-run Judge analysis |
| G11 | ❌ | Login Landing Page (Glassmorphic) | Design and implement login page |
| G12 | ❌ | Session Management | Improve session handling |

### Documentation
| # | Status | Item | Details |
|---|--------|------|---------|
| G13 | ❌ | Update glossary | CSM §12 glossary updates |
| G14 | ❌ | Verify city count (200 metros) | Confirm `src/data/metros.ts` has 200 cities |
| G15 | ❌ | Add Kling AI mentions | Document Kling AI in all manuals |
| G16 | ❌ | Update version numbers to v2.3 | Version bump across all manuals |
| G17 | ❌ | Browser Support Verification | Test and document browser compatibility |
| G18 | ❌ | PWA Check | Verify PWA functionality |
| G19 | ❌ | Help Center Link Verification | Ensure all help links work |
| G20 | ❌ | Create App Schema Manual | Content for Emilia knowledge base |
| G21 | ❌ | Create Judge Equations Manual | Document scoring mathematics |

---

## SUMMARY TABLE

| Section | Total | Done | Partial | Not Done |
|---------|-------|------|---------|----------|
| A: Critical UI/UX | 7 | 0 | 0 | 7 |
| B: Legal/Compliance | 11 | 0 | 0 | 11 |
| C: Architecture | 4 | 0 | 0 | 4 |
| D: UX Flow | 2 | 0 | 0 | 2 |
| E: New Features | 5 | 0 | 0 | 5 |
| F: Code Quality | 2 | 0 | 0 | 2 |
| G: Existing Items | 21 | 0 | 1 | 20 |
| **TOTAL** | **52** | **0** | **1** | **51** |

---

## PRIORITY ORDER FOR TOMORROW

### CRITICAL (Do First)
1. **C2** - City data caching (biggest performance win)
2. **C1** - Tavily restructure (cost savings)
3. **A5** - Judge video welcome screen scaling
4. **D1** - Post-search flow redesign

### HIGH
5. **C3/C4** - Perplexity & Gemini prompt fixes
6. **A1** - Christiano animation tweaks
7. **A3** - Results section auto-scroll
8. **E5** - Gamma prompt update

### MEDIUM
9. **B1** - Legal email updates
10. **A2** - Freedom cards text size
11. **A4** - Mobile button centering
12. **A6** - Mobile "one remaining" positioning
13. **E1-E4** - Save/upload buttons

### LOW (Can Defer)
14. **F1/F2** - Debug & refactor sessions
15. **G13-G21** - Documentation updates
16. **B2-B11** - Compliance items (external dependencies)

---

**END OF FINAL CODEBASE FIXES TABLE**

*Created: February 2, 2026*
*Total Items: 52 (51 not done, 1 partial)*
*Ready for review: February 3, 2026*
