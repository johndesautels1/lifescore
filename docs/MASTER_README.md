# LIFE SCORE™ MASTER README
**Conversation ID:** `LIFESCORE-PERF-20260202`
**Last Updated:** February 2, 2026
**Domain:** lifescore.cluesintelligence.com

---

## PROJECT OVERVIEW

**LIFE SCORE™** - Legal Independence & Freedom Evaluation
- Compares legal & lived freedom metrics between 200 metropolitan areas (100 NA + 100 EU)
- Uses 5 LLMs with web search to evaluate 100 metrics across 6 categories
- Claude Opus 4.5 serves as final judge ("The Judge") for consensus
- Gamma AI generates 30-page visual reports
- Ask Olivia AI assistant (coming soon - D-ID/HeyGen integration)

**Repository:** https://github.com/johndesautels1/lifescore
**Deployed:** Vercel (auto-deploy from main branch)
**Domain:** clueslifescore.com (GoDaddy - DNS pending)

---

## RECENT COMMITS (Session OLIVIA-ENHANCE-20260124)

| Commit | Description |
|--------|-------------|
| `0ccd904` | feat(olivia): add automatic function calling for field evidence lookup |
| `f7db9c7` | feat(olivia): add field evidence API for dynamic source lookup |
| `358de3b` | feat(olivia): enhance context injection with evidence, field knowledge, executive summary |

---

## COMPLETED THIS SESSION (OLIVIA-ENHANCE-20260124)

| Task | Status | Notes |
|------|--------|-------|
| Phase 1: Expanded evidence injection | ✅ Done | Evidence with quotes/snippets in text summary |
| Phase 2: Field knowledge database | ✅ Done | 100 metrics with talking points, common questions |
| Phase 3: Gamma report content injection | ✅ Done | Executive summary narrative in context |
| Phase 4: OpenAI Assistant personality update | ✅ Done | Warmer, conversational instructions |
| Field Evidence API | ✅ Done | /api/olivia/field-evidence endpoint |
| Function calling integration | ✅ Done | Chat handler auto-handles tool calls |
| OpenAI function definition | ✅ Done | getFieldEvidence function added to assistant |

---

## REMAINING WORK

### URGENT TASKS COMPLETED

| # | Task | Priority | Status |
|---|------|----------|--------|
| U4 | Top 5 Deciding Factors Widget | HIGH | ✅ Done |
| U5 | Save Report Button | MEDIUM | ✅ Done |

---

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
| B3 | Multi-LLM Field Sources Missing | CRITICAL | 🔴 Not Started |
| B4 | Field-by-Field Comparison References | CRITICAL | 🔴 Not Started |

---

### PHASE C: UI/UX Improvements

| # | Task | Priority | Status |
|---|------|----------|--------|
| C1 | Section Auto-Scroll | MEDIUM | 🔴 Not Started |
| C2 | About Card Explanation | MEDIUM | ✅ Done (via U2) |
| C3 | Add More Models Button Handlers | MEDIUM | 🔴 Not Started |
| C4 | Incremental LLM Addition Flow | MEDIUM | 🔴 Not Started |
| C5 | Judge Re-runs with Combined Results | MEDIUM | 🔴 Not Started |
| C6 | Save Report Button | MEDIUM | ✅ Done (= U5) |

---

### PHASE D: Gamma Report

| # | Task | Priority | Status |
|---|------|----------|--------|
| D1 | Gamma 30-Page Setting | HIGH | ✅ Done |
| D2 | Gamma Embed Loading Spinner | LOW | 🔴 Not Started |
| D3 | Gamma Embed Error Handling | LOW | 🔴 Not Started |

---

### PHASE E: Ask Olivia AI Assistant

| # | Task | Priority | Status |
|---|------|----------|--------|
| E1 | Olivia Toolbar Tab | HIGH | ✅ Done |
| E2 | Olivia Iframe/Placeholder Page | HIGH | ✅ Done |
| E3 | Olivia Data Integration | HIGH | ✅ Done |
| E4 | D-ID/HeyGen Avatar Integration | HIGH | ✅ Done |
| E5 | Enhanced Context Injection | HIGH | ✅ Done |
| E6 | Field Knowledge Database (100 metrics) | HIGH | ✅ Done |
| E7 | Function Calling (getFieldEvidence) | HIGH | ✅ Done |
| E8 | OpenAI Assistant Personality Update | MEDIUM | ✅ Done |

---

### PHASE H: Judge Toolbar Tab (NEXT)

| # | Task | Priority | Status |
|---|------|----------|--------|
| H1 | Judge Tab in Toolbar | HIGH | 🔴 Not Started |
| H2 | Judge Results Display | HIGH | 🔴 Not Started |
| H3 | Disagreement Visualization | MEDIUM | 🔴 Not Started |
| H4 | Re-run Judge Functionality | MEDIUM | 🔴 Not Started |

---

### PHASE F: User Authentication

| # | Task | Priority | Status |
|---|------|----------|--------|
| F1 | Login Landing Page (Glassmorphic) | HIGH | 🔴 Not Started |
| F2 | User ID System | HIGH | 🔴 Not Started |
| F3 | Toolbar User Tab | MEDIUM | 🔴 Not Started |
| F4 | Session Management | MEDIUM | 🔴 Not Started |

---

### PHASE G: Payment System (Stripe)

| # | Task | Priority | Status |
|---|------|----------|--------|
| G1 | Stripe Integration | HIGH | 🔴 Not Started |
| G2 | Price Options Page | HIGH | 🔴 Not Started |
| G3 | Payment Flow | HIGH | 🔴 Not Started |
| G4 | Subscription Gating | MEDIUM | 🔴 Not Started |

---

## DIRECTORY STRUCTURE

```
D:\LifeScore\
├── src/
│   ├── App.tsx                    # Main app, tab routing
│   ├── components/
│   │   ├── EnhancedComparison.tsx # Results display, LLMSelector
│   │   ├── EnhancedComparison.css # Results styling
│   │   ├── TabNavigation.tsx      # Toolbar tabs (Olivia, Judge, etc.)
│   │   ├── AskOlivia.tsx          # Olivia chat component
│   │   ├── AskOlivia.css          # Olivia styling
│   │   ├── VisualsTab.tsx         # Gamma embed iframe
│   │   └── ...
│   ├── services/
│   │   ├── gammaService.ts        # Gamma 30-page prompt
│   │   ├── oliviaService.ts       # Olivia chat API wrapper
│   │   ├── opusJudge.ts           # Judge client helpers
│   │   └── ...
│   ├── data/
│   │   └── fieldKnowledge.ts      # 100 metrics knowledge base
│   └── types/
│       ├── enhancedComparison.ts  # SOURCE OF TRUTH for types
│       └── olivia.ts              # Olivia types
├── api/
│   ├── gamma.ts                   # Gamma API endpoint
│   ├── judge.ts                   # Opus Judge endpoint
│   ├── evaluate.ts                # LLM evaluation endpoint
│   └── olivia/
│       ├── chat.ts                # Olivia chat + function calling
│       ├── context.ts             # Context builder with evidence
│       ├── field-evidence.ts      # Dynamic source lookup API
│       └── tts.ts                 # Text-to-speech
├── docs/
│   ├── MASTER_README.md           # This file
│   ├── OLIVIA_GPT_INSTRUCTIONS.md # OpenAI Assistant instructions
│   ├── OLIVIA_KNOWLEDGE_BASE.md   # 200 cities knowledge (283KB)
│   └── handoffs/                  # Session handoff documents
└── olivia-function.json           # OpenAI function definition
```

---

## TECHNICAL NOTES

### LLM Providers (5 Evaluators + 1 Judge)

| Provider | Type ID | Model | Web Search |
|----------|---------|-------|------------|
| Claude Sonnet 4.5 | `claude-sonnet` | claude-sonnet-4-5-20250929 | Tavily |
| GPT-5.2 | `gpt-5.2` | gpt-5.2 | Native |
| Gemini 3 Pro | `gemini-3-pro` | gemini-3-pro-preview | Google |
| Grok 4 | `grok-4` | grok-4 | Native |
| Perplexity | `perplexity` | sonar-reasoning-pro | Native |
| **Judge** | `claude-opus` | claude-opus-4-5-20251101 | N/A |

### API Keys
All configured in Vercel. **DO NOT ask user to configure.**

---

## PRIORITY MATRIX

### CRITICAL
- B3: Multi-LLM Field Sources Missing
- B4: Field-by-Field Comparison References

### HIGH
- U4: Top 5 Deciding Factors Widget
- A1-A3: Domain & Deployment
- E3-E4: Olivia Integration
- F1-F2: Login System
- G1-G2: Stripe

### MEDIUM
- U5: Save Report Button
- C1, C3-C5: UI Improvements
- F3-F4: Session Management

### LOW
- D2-D3: Gamma Polish

---

## PERFORMANCE OPTIMIZATION (2026-02-02)

**Reference:** `docs/PERFORMANCE_AUDIT_20260202.md`
**Issue:** Site takes 1-3 MINUTES to load on cold start (1.36MB bundle)

### Phase Status

| Phase | Description | Status | Safe? |
|-------|-------------|--------|-------|
| **Phase 1** | Vendor manualChunks (react, supabase) | ✅ DONE | ✅ YES |
| **Phase 2** | Tab lazy loading (Olivia, Saved, Visuals) | 🔴 Not Started | ✅ YES |
| **Phase 3** | Refactor EnhancedComparison.tsx | 🔴 Not Started | ⚠️ CAREFUL |
| **Phase 4** | Data file lazy loading | 🔴 Not Started | ⚠️ HIGH RISK |

### Phase 1 Completed (2026-02-02)
- ✅ Removed `chunkSizeWarningLimit: 1000` (was hiding warnings)
- ✅ Added `manualChunks` for `react-vendor` and `supabase`
- Output: Vendor code now in separate cacheable chunks

### Phase 2 Ready (Safe to implement)
Components that CAN be lazy loaded (default exports only):
- `AskOlivia.tsx` (869 lines) - ✅ Clean candidate
- `SavedComparisons.tsx` (578 lines) - ✅ Clean candidate
- `VisualsTab.tsx` (334 lines) - ✅ Clean candidate

### Phase 3 Blocked (Requires Refactoring)
**EnhancedComparison.tsx CANNOT be lazy loaded as-is:**
- Exports 6 named components/constants used at App.tsx initialization
- `EVALUATOR_LLMS` used in `useState()` initialization (line 80-82)
- Must split into `constants.ts` + lazy-loadable `components.tsx`

### Phase 4 High Risk (Data Files)
- `metrics.ts` (92KB) imported by 16+ files synchronously
- `fieldKnowledge.ts` (67KB) deeply nested imports
- Requires full import chain audit before attempting

---

## NEW SESSION CHECKLIST

```
1. Read D:\LifeScore\HANDOFF_2026_0121_SESSION_THETA.md
2. git log --oneline -5
3. git status
4. Confirm current phase and priority
5. Begin work
```

---

## COMPRESSION PROTOCOL

- **50% (~100k tokens):** "We're at 50% token capacity"
- **70% (~140k tokens):** "We're at 70% - consider wrapping up"
- **85% (~170k tokens):** STOP, commit all, update README, start new session

---

**END OF MASTER README**
