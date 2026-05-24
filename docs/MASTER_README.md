# LIFE SCORE™ MASTER README
**Conversation ID:** `LS-SESSION9-20260205`
**Last Updated:** February 5, 2026
**Domain:** clueslifescore.com

---

## PROJECT OVERVIEW

**LIFE SCORE™** - Legal Independence & Freedom Evaluation
- Compares legal & lived freedom metrics between 200 metropolitan areas (100 NA + 100 EU)
- Uses 5 LLMs with web search to evaluate 100 metrics across 6 categories
- Claude Opus 4.6 serves as final judge ("The Judge") for consensus
- Gamma AI generates 30-page visual reports
- Ask Olivia AI assistant with D-ID/HeyGen avatar integration
- Ask Emilia help system with 6-tab documentation modal + AI chat

**Repository:** https://github.com/johndesautels1/lifescore
**Deployed:** Vercel (auto-deploy from main branch)
**Domain:** clueslifescore.com (GoDaddy - DNS pending)

---

## RECENT COMMITS (Session LS-SESSION9-20260205)

| Commit | Description |
|--------|-------------|
| `3c94a3a` | Features #18, #19, #71: Save buttons + draggable chat bubbles |
| `a7a1ada` | Reorganize docs, regenerate UNIFIED-MASTER-TODO |
| `f34c4ef` | B3 fix: LLM attribution badges on all source citations |
| `11ea65b` | Update all 3 manuals (CSM v2.5, TSM v2.4, UM v2.5) |
| `e5d5a8f` | Fix judge_reports onConflict to match unique constraint |
| `eac2a1b` | Session 8 docs: Update MASTER_README + fix APP_SCHEMA_MANUAL |

---

## COMPLETED THIS SESSION (LS-SESSION8-20260205)

| Task | Status | Notes |
|------|--------|-------|
| Fix Gamma "Error: Generation ID missing" | ✅ Done | api/gamma.ts fallback: `status.id \|\| generationId` |
| Judge reports visible in Visual Reports tab | ✅ Done | SavedComparisons.tsx now reads judge_reports |
| Centralize all Judge report localStorage access | ✅ Done | JudgeTab.tsx + judgePregenService.ts use service functions |
| Gamma reports persist to Supabase | ✅ Done | saveGammaReport() → databaseService.saveGammaReport() |
| Judge reports persist to Supabase | ✅ Done | saveJudgeReport() → judge_reports table upsert |
| Court Order video saves persist to Supabase | ✅ Done | New court_orders table + centralized saveCourtOrder() |
| Weight presets persist to Supabase | ✅ Done | user_preferences.weight_presets JSONB column |
| Law/Lived preferences persist to Supabase | ✅ Done | user_preferences.law_lived_preferences JSONB column |
| Excluded categories persist to Supabase | ✅ Done | user_preferences.excluded_categories JSONB column |
| Dealbreakers persist to Supabase | ✅ Done | user_preferences.dealbreakers JSONB column |
| All localStorage.setItem wrapped in try/catch | ✅ Done | 15+ save points protected |
| All Supabase DB saves wrapped in outer try/catch | ✅ Done | No unprotected fire-and-forget calls |
| Verify all Supabase schemas match code | ✅ Done | judge_reports, user_preferences, court_orders verified |
| Tavily timeout hotfix | ✅ Done | Reduced from 240s to 45s |
| Fix #17: Score Methodology explainer UI | ✅ Done | Glass-morphic 5-stage pipeline card |
| Fix #12: Freedom vs Imprisonment cards | ✅ Done | Polish comparison cards |
| Fix #73: API cost tracking audit | ✅ Done | Wire all providers to record costs |

---

## COMPLETED IN PRIOR SESSIONS (Summary)

| Session | Key Work |
|---------|----------|
| Session 5 (2026-02-04) | Fix #48 video stability, #49 Gemini retry, #50 cost auto-sync |
| Session 5/6 (2026-02-04) | Fix HIGH UI/UX bugs #51-56, MEDIUM #9-11, #57, #63 |
| Session 6 (2026-02-04) | Fix MEDIUM UI/UX bugs #58-69 (text colors, buttons, tabs) |
| Session 7 (2026-02-04) | Mark 50 items complete, Session 7 handoff |

---

## REMAINING WORK

### PHASE A: Infrastructure & Deployment

| # | Task | Priority | Status |
|---|------|----------|--------|
| A1 | Domain DNS Setup (GoDaddy → Vercel) | HIGH | 🔴 Not Started |
| A2 | Vercel Custom Domain Config | HIGH | 🔴 Not Started |
| A3 | Verify GitHub-Vercel auto-deploy | HIGH | 🔴 Not Started |

---

### PHASE B: Data Sources & Evidence (BUGS)

| # | Task | Priority | Status |
|---|------|----------|--------|
| B1 | Perplexity Data Sources | HIGH | 🔴 Not Started |
| B2 | 5th Thumbnail UI Wiring | HIGH | 🔴 Not Started |
| B3 | Multi-LLM Field Sources Missing | CRITICAL | ✅ Done (f34c4ef) - LLM attribution badges |
| B4 | Field-by-Field Comparison References | CRITICAL | ✅ Done (f34c4ef) - Source citations with provider |

---

### PHASE C: UI/UX Improvements

| # | Task | Priority | Status |
|---|------|----------|--------|
| C1 | Section Auto-Scroll | MEDIUM | 🔴 Not Started |
| C3 | Add More Models Button Handlers | MEDIUM | 🔴 Not Started |
| C4 | Incremental LLM Addition Flow | MEDIUM | 🔴 Not Started |
| C5 | Judge Re-runs with Combined Results | MEDIUM | 🔴 Not Started |

---

### PHASE D: Gamma Report

| # | Task | Priority | Status |
|---|------|----------|--------|
| D2 | Gamma Embed Loading Spinner | LOW | 🔴 Not Started |
| D3 | Gamma Embed Error Handling | LOW | 🔴 Not Started |

---

### PHASE H: Judge Toolbar Tab

| # | Task | Priority | Status |
|---|------|----------|--------|
| H1 | Judge Tab in Toolbar | HIGH | ✅ Done |
| H2 | Judge Results Display | HIGH | ✅ Done |
| H3 | Disagreement Visualization | MEDIUM | 🔴 Not Started |
| H4 | Re-run Judge Functionality | MEDIUM | 🔴 Not Started |

---

### PHASE F: User Authentication

| # | Task | Priority | Status |
|---|------|----------|--------|
| F1 | Login Landing Page (Glassmorphic) | HIGH | ✅ Done |
| F2 | User ID System | HIGH | ✅ Done |
| F3 | Toolbar User Tab | MEDIUM | ✅ Done |
| F4 | Session Management | MEDIUM | ✅ Done |

---

### PHASE G: Payment System (Stripe)

| # | Task | Priority | Status |
|---|------|----------|--------|
| G1 | Stripe Integration | HIGH | ✅ Done |
| G2 | Price Options Page | HIGH | ✅ Done |
| G3 | Payment Flow | HIGH | ✅ Done |
| G4 | Subscription Gating | MEDIUM | ✅ Done |

---

### PHASE I: Documentation Maintenance (NEW)

| # | Task | Priority | Status |
|---|------|----------|--------|
| I1 | Update APP_SCHEMA_MANUAL.md - court_orders table | HIGH | ✅ Done |
| I2 | Update APP_SCHEMA_MANUAL.md - user_preferences actual columns | HIGH | ✅ Done |
| I3 | Update APP_SCHEMA_MANUAL.md - judge_reports actual columns | HIGH | ✅ Done |
| I4 | Update CUSTOMER_SERVICE_MANUAL.md - dual save system | MEDIUM | ✅ Done |
| I5 | Update TECHNICAL_SUPPORT_MANUAL.md - save architecture | MEDIUM | ✅ Done |
| I6 | Update USER_MANUAL.md - save/export features | LOW | ✅ Done |
| I7 | Add Database Schema subtab to Ask Emilia modal | MEDIUM | 🔴 See Notes |

**I7 Notes:** App Schema tab already contains database schema. Decide if a separate "Database Schema" subtab is needed or if current coverage is sufficient.

---

## SAVE ARCHITECTURE (Added 2026-02-05)

All user data saves to BOTH localStorage (offline-first) AND Supabase (cloud backup).

| Data | localStorage Key | Supabase Table | Service Function |
|------|-----------------|---------------|-----------------|
| Standard Comparisons | `lifescore_saved_comparisons` | `comparisons` | `saveComparisonLocal()` |
| Enhanced Comparisons | `lifescore_saved_enhanced` | `comparisons` | `saveEnhancedComparisonLocal()` |
| Gamma Reports | `lifescore_saved_gamma_reports` | `gamma_reports` | `saveGammaReport()` |
| Judge Reports | `lifescore_judge_reports` | `judge_reports` | `saveJudgeReport()` |
| Court Orders | `lifescore_court_orders` | `court_orders` | `saveCourtOrder()` |
| Weight Presets | `lifescore_weights` | `user_preferences.weight_presets` | `saveUserPreferenceToDb()` |
| Law/Lived Prefs | `lifescore_lawlived` | `user_preferences.law_lived_preferences` | `saveUserPreferenceToDb()` |
| Excluded Categories | `lifescore_excluded_categories` | `user_preferences.excluded_categories` | `saveUserPreferenceToDb()` |
| Dealbreakers | `lifescore_dealbreakers` | `user_preferences.dealbreakers` | `saveUserPreferenceToDb()` |

**Central service file:** `src/services/savedComparisons.ts`

---

## DIRECTORY STRUCTURE

```
D:\LifeScore\
├── src/
│   ├── App.tsx                    # Main app, tab routing
│   ├── components/
│   │   ├── EnhancedComparison.tsx # Results display, LLMSelector
│   │   ├── JudgeTab.tsx           # Judge verdict display
│   │   ├── CourtOrderVideo.tsx    # Court order video player
│   │   ├── SavedComparisons.tsx   # Saved reports browser
│   │   ├── WeightPresets.tsx      # Category weight customization
│   │   ├── DealbreakersPanel.tsx  # Must-have metrics selection
│   │   ├── HelpModal.tsx          # Ask Emilia 6-tab help modal
│   │   ├── AskOlivia.tsx          # Olivia chat component
│   │   ├── VisualsTab.tsx         # Gamma embed iframe
│   │   └── ...
│   ├── services/
│   │   ├── savedComparisons.ts    # CENTRAL save service (localStorage + Supabase)
│   │   ├── databaseService.ts     # Supabase CRUD operations
│   │   ├── judgePregenService.ts  # Background judge pre-generation
│   │   ├── gammaService.ts        # Gamma 30-page prompt
│   │   ├── oliviaService.ts       # Olivia chat API wrapper
│   │   └── opusJudge.ts           # Judge client helpers
│   ├── hooks/
│   │   ├── useTierAccess.ts       # Tier limits + usage tracking
│   │   └── useApiUsageMonitor.ts  # Client-side API usage
│   ├── lib/
│   │   └── supabase.ts            # Supabase client init
│   └── types/
│       ├── enhancedComparison.ts  # SOURCE OF TRUTH for types
│       ├── database.ts            # Supabase type definitions
│       └── olivia.ts              # Olivia types
├── api/                           # Vercel serverless functions
│   ├── gamma.ts                   # Gamma API endpoint
│   ├── judge.ts                   # Opus Judge endpoint
│   ├── evaluate.ts                # LLM evaluation endpoint
│   ├── emilia/manuals.ts          # Manual content API
│   └── olivia/                    # Olivia API endpoints
├── docs/
│   ├── MASTER_README.md           # This file
│   ├── manuals/                   # Emilia help system content
│   │   ├── APP_SCHEMA_MANUAL.md
│   │   ├── JUDGE_EQUATIONS_MANUAL.md
│   │   ├── USER_MANUAL.md
│   │   ├── CUSTOMER_SERVICE_MANUAL.md
│   │   ├── TECHNICAL_SUPPORT_MANUAL.md
│   │   └── LEGAL_COMPLIANCE_MANUAL.md
│   └── handoffs/                  # Session handoff documents
└── package.json
```

---

## TECHNICAL NOTES

### LLM Providers (5 Evaluators + 1 Judge)

| Provider | Type ID | Model | Web Search |
|----------|---------|-------|------------|
| Claude Sonnet 4.6 | `claude-sonnet` | claude-sonnet-4-6 | Tavily |
| GPT-4o | `gpt-4o` | gpt-4o | Tavily |
| Gemini 3.1 Pro | `gemini-3-pro` | gemini-3.1-pro-preview | Google |
| Grok 4 | `grok-4` | grok-4 | Native |
| Perplexity | `perplexity` | sonar-reasoning-pro | Native |
| **Judge** | `claude-opus` | claude-opus-4-7 | N/A |

### API Keys
All configured in Vercel. **DO NOT ask user to configure.**

---

## NEW SESSION CHECKLIST

```
1. Read D:\lifescore\docs\MASTER_README.md (this file)
2. git log --oneline -10
3. git status
4. Read the Session 9 handoff section below
5. Confirm current phase and priority
6. Begin work
```

---

## SESSION 9 HANDOFF

**Next agent should:**
1. Review Phase I documentation tasks (I4, I5, I6) — update manuals affected by save audit
2. Review Phase B (CRITICAL bugs B3, B4 — field sources)
3. Review Phase A (domain/deployment)
4. Check if APP_SCHEMA_MANUAL.md database section needs further updates for `court_orders` and `user_preferences` actual vs documented schema

**Known Supabase schema discrepancies in APP_SCHEMA_MANUAL.md:**
- `user_preferences` documented columns don't match actual table (see Session 8 notes)
- `judge_reports` documented columns don't match actual table (see Session 8 notes)
- `court_orders` table is NEW and needs to be added to documentation
- `saved_comparisons` in docs but actual table name is `comparisons` in code

---

## COMPRESSION PROTOCOL

- **50% (~100k tokens):** "We're at 50% token capacity"
- **70% (~140k tokens):** "We're at 70% - consider wrapping up"
- **85% (~170k tokens):** STOP, commit all, update README, start new session

---

**END OF MASTER README**
