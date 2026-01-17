# CLUES LIFE SCORE

**Legal Independence & Freedom Evaluation**

Compare cities across 100 freedom metrics in 6 categories. Part of the CLUES (Comprehensive Location & Utility Evaluation System) platform.

## Features

- 100 Freedom Metrics across 6 categories
- City-to-city comparison
- Real-time scoring with Claude AI + Web Search
- Modern React + TypeScript + Vite stack
- Turnkey Vercel deployment

## Categories

| Category | Metrics | Weight |
|----------|---------|--------|
| Personal Freedom & Morality | 15 | 20% |
| Housing, Property & HOA Control | 20 | 20% |
| Business & Work Regulation | 25 | 20% |
| Transportation & Daily Movement | 15 | 15% |
| Policing, Courts & Enforcement | 15 | 15% |
| Speech, Lifestyle & Culture | 10 | 10% |

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   gh repo create clues-life-score --public --push
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite - click "Deploy"

3. **Environment Variables (for API integration):**
   ```
   VITE_ANTHROPIC_API_KEY=your-api-key
   ```

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 7
- **Styling:** CSS with CSS Variables
- **Deployment:** Vercel
- **AI:** Multi-LLM Consensus (5 LLMs + Claude Opus Judge)

## Project Structure

```
src/
├── api/          # API services (scoring engine)
├── components/   # React components
├── data/         # 100 metrics definitions
├── hooks/        # Custom React hooks
├── styles/       # Global styles
└── types/        # TypeScript types
```

## CRITICAL DEVELOPMENT RULES

### NO DEMO MODE ALLOWED
**MANDATORY: No programmatic language for any demo mode is allowed in the application code or interface.**

- No `demoMode` parameters, flags, or variables
- No `generateDemo*()` functions
- No `simulateDemo*()` functions
- No `useDemoMode` options
- No fake/simulated data generators
- All data MUST come from real API calls through Vercel serverless functions
- API keys are stored in Vercel environment variables (`process.env.*`)

### AI ASSISTANT (Claude) MANDATORY RULES

1. **ATTESTATION REQUIREMENT**: Claude must 100% attest to reading ALL possible file locations in the codebase before stating that any work is "done", "working", "complete", or "all files fixed". Partial verification is not acceptable.

2. **TYPESCRIPT VERIFICATION**: Claude MUST always run `npx tsc --noEmit` and fix ALL TypeScript errors BEFORE stating a build is complete. No exceptions.

3. **NO ALTERNATIVE CODE BLOCKS**: Claude is FORBIDDEN from building alternative function code blocks or duplicate functionality without explicit programmer permission.

4. **DUPLICATE CODE CHECK**: Claude MUST test the application for duplicate code or code that could be duplicated and notify the programmer of any discoveries. However, Claude must NEVER remove or refactor duplicate code without permission.

5. **NO CODE ROLLBACKS**: Claude is FORBIDDEN from rolling back any code, architecture, models, or API configurations without explicit programmer permission. This rule has NO exceptions.

6. **MODEL CONSISTENCY**: Claude must NEVER change LLM model IDs (e.g., `claude-sonnet-4-5-20250929`, `grok-4`, `gemini-3-pro`) without explicit permission.

### API Architecture
All LLM calls go through Vercel serverless functions:
- `/api/evaluate` - LLM evaluations (Claude Sonnet, GPT-4o, Gemini 3 Pro, Grok 4, Perplexity)
- `/api/judge` - Claude Opus 4.5 consensus building

### Web Search Integration
| LLM | Web Search Method | API/Service |
|-----|-------------------|-------------|
| Claude Sonnet | Tavily API | External search prepended to prompt |
| GPT-4o | Tavily API | External search prepended to prompt |
| Gemini 3 Pro | Google Search Grounding | googleSearchRetrieval tool |
| Grok 4 | Native search | `search: true` parameter |
| Perplexity | Native (Sonar) | `return_citations: true` |

### Environment Variables (Vercel)
```
ANTHROPIC_API_KEY=your-key    # Claude Sonnet & Opus
OPENAI_API_KEY=your-key       # GPT-4o (with Tavily web search)
GOOGLE_API_KEY=your-key       # Gemini 3 Pro (Google Search grounding)
XAI_API_KEY=your-key          # Grok 4 (native search)
PERPLEXITY_API_KEY=your-key   # Perplexity Sonar (native search)
TAVILY_API_KEY=your-key       # Tavily web search (for Claude)
```

## NEXT PHASE TODO

### 5-Phase Implementation Plan (from BATTLE_PLAN.md)
| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Single-LLM Selection UI | ✅ COMPLETE |
| 2 | Category Batch Prompts (6 parallel batches per LLM) | ✅ COMPLETE |
| 3 | Progressive Opus Judging | ✅ COMPLETE |
| 4 | Targeted Tavily + Citation Requests | ✅ COMPLETE |
| 5 | Source Evidence Panel | ✅ COMPLETE |

### All 5 Phases Complete!

**Phase 3 Implementation Details:**
- ✅ Opus auto-triggers after 2 LLMs complete
- ✅ Re-judges when additional LLMs finish (progressive consensus)
- ✅ UI shows individual LLM opinions in expanded evidence panel
- ✅ Consensus status updates: "Consensus from N LLMs" with agreement %
- ✅ Standard deviation and confidence level displayed per metric

### Next Session Tasks
1. **HOME PAGE UI REARRANGEMENT**: Redesign main layout

### Current State
- ✅ All demo mode code removed
- ✅ Real API routes working (`/api/evaluate`, `/api/judge`)
- ✅ TypeScript compilation passing
- ✅ 5 LLM evaluators + Claude Opus judge configured
- ✅ **GPT-4o implementation complete** (using Tavily web search, replaced GPT-4o due to cost)
- ✅ **Tavily integration** for Claude web search
- ✅ **Google Search grounding** for Gemini
- ✅ **Evidence Panel** created (collapseable citations above footer)
- ✅ **Phase 3 Progressive Judging** complete - Opus re-judges as LLMs finish
- ✅ All 5 phases complete!

### Recent Updates (January 16, 2026 Session)
| Commit | Description |
|--------|-------------|
| `e453046` | **FIX: Anthropic 404** - API version header (note: correct version is `2023-06-01`) |
| `7461241` | **FIX: LLM buttons not firing** - Removed client-side API key validation (keys are in Vercel env vars) |
| `eb045fd` | **FIX: Silent failure UX** - Added clear messaging for users to click LLM buttons |
| `d8121fc` | **FIX: handleSubmit** - Accept both FormEvent and MouseEvent for button click |
| `3822fac` | **UI: Move buttons** - Compare LIFE SCORES button and Share Link moved below Dealbreakers |

### Previous Session Updates
| Commit | Description |
|--------|-------------|
| `6caf460` | Fix 12 Codex CLI audit: field IDs, data flow, LLM call logic |
| `0add7d5` | Fix 7 Copilot audit issues: Opus API call, parse logic, LLM deduplication |
| `ae30073` | Fix 6 judge production cycle errors (Codex audit) - evidence data flow |
| `dc3dc87` | Phase 3: Progressive Opus Judging with individual LLM opinions |
| `0cdb5bd` | Fix missing Google Search grounding in api/evaluate.ts Gemini |
| `e8e962c` | Fix 11 GPT-4o audit errors: field mapping, evidence capture, Tavily |
| `80f1eb1` | Fix TypeScript and ESLint errors in GPT-4o implementation |
| `8337811` | Replace GPT-4o with GPT-4o using new responses API |
| `ca7beb9` | Fix LLM prompt issues, standardize system messages |

---

## AGENT HANDOFF DOCUMENT

### Current Status (January 16, 2026)
**BLOCKING ISSUE:** LLM API calls may still be failing. Need to test each LLM button individually.

### What Was Fixed This Session
1. **Anthropic API Version** - The `anthropic-version` header must be `2023-06-01` (the valid API version). Using invalid versions like `2025-01-01` causes 400 errors.

2. **LLM Buttons Not Firing** - `runSingleEvaluatorBatched()` in `src/services/llmEvaluators.ts` was checking for API keys in localStorage, but keys are stored in Vercel environment variables. Removed client-side validation.

3. **Silent Failure UX** - Users didn't realize they needed to click LLM buttons after clicking "Compare". Updated button text and added clear instructions.

### Files Modified This Session
- `api/evaluate.ts` - Anthropic API version header fix
- `api/judge.ts` - Anthropic API version header fix
- `src/services/llmEvaluators.ts` - Removed client-side API key validation
- `src/components/EnhancedComparison.tsx` - UX messaging improvements
- `src/components/CitySelector.tsx` - Added `enhancedWaiting` prop, button text updates
- `src/App.tsx` - Pass `enhancedWaiting` prop to CitySelector

### Known Issues / Next Steps
1. **TEST ALL 5 LLMs** - Click each LLM button individually and check Vercel logs for errors:
   - Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) - uses Tavily for web search
   - GPT-4o (`gpt-4o`) - uses `/v1/chat/completions` API with Tavily web search
   - Gemini 3 Pro (`gemini-3-pro`) - uses Google Search grounding
   - Grok 4 (`grok-4`) - uses `search: true` parameter
   - Perplexity (`sonar-reasoning-pro`) - uses `return_citations: true`

2. **API Version Headers** - Only Anthropic uses version headers. Other APIs (OpenAI, Google, xAI, Perplexity) use URL versioning or are backward compatible.

3. **Vercel Environment Variables Required:**
   ```
   ANTHROPIC_API_KEY    # Claude Sonnet & Opus
   OPENAI_API_KEY       # GPT-4o
   GOOGLE_API_KEY       # Gemini 3 Pro
   XAI_API_KEY          # Grok 4
   PERPLEXITY_API_KEY   # Perplexity Sonar
   TAVILY_API_KEY       # Web search for Claude
   ```

### Data Flow Architecture
```
User clicks "Compare LIFE SCORES"
    ↓
App.tsx sets enhancedStatus='running', pendingCities={city1, city2}
    ↓
LLMSelector renders with 5 LLM buttons
    ↓
User clicks LLM button (e.g., Claude)
    ↓
runLLM() → runSingleEvaluatorBatched() [src/services/llmEvaluators.ts]
    ↓
evaluateCategoryBatch() calls POST /api/evaluate with {provider, city1, city2, metrics}
    ↓
api/evaluate.ts routes to correct LLM function based on provider
    ↓
LLM returns scores → parsed → returned to client
    ↓
After 2+ LLMs complete → auto-triggers POST /api/judge
    ↓
Opus builds consensus → results displayed
```

### Naming Conventions (NOT a bug)
- `metro1`/`metro2` - Internal Metro objects in CitySelector.tsx only
- `city1`/`city2` - String values and field names everywhere else
- `cityA`/`cityB` - URL parameter names only

---

---

## PROMPT ARCHITECTURE REDESIGN - CONSOLIDATION PLAN

### Conversation ID: `LIFESCORE-PROMPT-REDESIGN-2026-01-17`

### Session Date: January 17, 2026

### Problem Statement

The current `buildPrompt()` function sends metrics to LLMs with only name + description:
```
- pf_01_cannabis_legal: Cannabis Legality
  Description: Legal status of recreational cannabis
  Scoring: Higher = more freedom
```

**LLMs have to GUESS what 50 vs 75 vs 100 means.** This causes inconsistent scores across the 5 LLMs.

### Solution: Scoring Anchors

A new file was created by Claude Desktop: `D:\LifeScore\freedom-index-scoring-anchors (1).json`

This file contains **scoring anchors** for all 100 metrics with explicit definitions for what 0, 25, 50, 75, 100 means for BOTH Legal and Enforcement scores.

**Example:**
```json
"pf_01_cannabis_legal": {
  "name": "Cannabis Legality",
  "legalScore": {
    "100": "Fully legal - recreational sales permitted, licensed dispensaries",
    "75": "Medical program with broad access, decriminalized recreational",
    "50": "Medical only (strict program) OR decriminalized possession",
    "25": "Illegal - misdemeanor penalties, small fines",
    "0": "Illegal - felony charges, prison time possible"
  },
  "enforcementScore": {
    "100": "Never enforced - police ignore cannabis completely",
    "75": "Rarely enforced - low priority, warnings only",
    "50": "Selectively enforced - depends on quantity/location",
    "25": "Usually enforced - regular arrests and citations",
    "0": "Strictly enforced - zero tolerance, active prosecution"
  }
}
```

### Current Architecture Issues

#### ISSUE 1: Duplicate Prompt Builders
| File | Function | Lines |
|------|----------|-------|
| `api/evaluate.ts` | `buildPrompt()` | 91-137 |
| `src/services/llmEvaluators.ts` | `buildEvaluationPrompt()` | 91-164 |

**Problem:** Two functions doing the same thing. If we update one and forget the other, bugs happen.

#### ISSUE 2: Duplicate Judge Code
| File | Duplicated Functions |
|------|---------------------|
| `api/judge.ts` | `buildMetricConsensus()`, `parseOpusResponse()`, `mergeOpusJudgments()`, `calculateMean()`, `calculateStdDev()`, `calculateMedian()` |
| `src/services/opusJudge.ts` | Same functions, nearly identical code |

**Problem:** Same maintenance nightmare. Changes to one file may not be reflected in the other.

#### ISSUE 3: Opus Judge Has No Scoring Context
Current `buildOpusPrompt()` in `api/judge.ts:262-301` sends:
```
Cannabis (pf_01_cannabis_legal):
  City1: [claude-sonnet:75, gpt-4o:80, gemini:70]
  City2: [claude-sonnet:90, gpt-4o:85, gemini:95]
```

**Problem:** Opus sees raw numbers but doesn't know what 75 vs 80 means. When mediating disagreements, Opus is guessing.

#### ISSUE 4: Timeout Too Short
| Location | Current Timeout | Issue |
|----------|-----------------|-------|
| `src/services/llmEvaluators.ts:926` | 30 seconds per category | Too short for web search + 15-25 metrics |
| `api/evaluate.ts` | 120 seconds total | May be adequate |
| Perplexity | N/A | Already times out regularly |

---

### CONSOLIDATION PLAN

#### Phase 1: Merge Scoring Anchors into metrics.ts

**File:** `src/data/metrics.ts`

**Change:** Add `legalScoreAnchors` and `enforcementScoreAnchors` to each `MetricDefinition`

**Rationale:**
- Single source of truth for all metric data
- TypeScript types enforce structure
- Both `api/evaluate.ts` and any other file can import from same place
- No runtime JSON loading needed
- IDE autocomplete works

**Type Update Required in:** `src/types/metrics.ts`
```typescript
export interface MetricDefinition {
  // ... existing fields ...
  legalScoreAnchors: Record<string, string>;      // {"100": "...", "75": "...", ...}
  enforcementScoreAnchors: Record<string, string>;
}
```

#### Phase 2: Update buildPrompt() to Include Anchors

**File:** `api/evaluate.ts`

**Change:** Update `buildPrompt()` (lines 91-137) to include scoring anchors per metric:
```
- pf_01_cannabis_legal: Cannabis Legality
  Description: Legal status of recreational cannabis

  Legal Score Anchors:
    100: Fully legal - recreational sales permitted, licensed dispensaries
    75: Medical program with broad access, decriminalized recreational
    50: Medical only (strict program) OR decriminalized possession
    25: Illegal - misdemeanor penalties, small fines
    0: Illegal - felony charges, prison time possible

  Enforcement Score Anchors:
    100: Never enforced - police ignore cannabis completely
    75: Rarely enforced - low priority, warnings only
    50: Selectively enforced - depends on quantity/location
    25: Usually enforced - regular arrests and citations
    0: Strictly enforced - zero tolerance, active prosecution
```

#### Phase 3: Delete Duplicate Code in llmEvaluators.ts

**File:** `src/services/llmEvaluators.ts`

**Change:** Remove `buildEvaluationPrompt()` function (lines 91-164) - it's dead code.

**Verification:** Search codebase for calls to `buildEvaluationPrompt()`. If no external calls, delete.

**Note:** The individual evaluator functions (`evaluateWithClaude`, `evaluateWithGPT5`, etc.) in this file may also be dead code since all calls now go through the `/api/evaluate` route. Verify before removing.

#### Phase 4: Update Opus Judge Prompt

**Files:** `api/judge.ts`, `src/services/opusJudge.ts`

**Change:** Update `buildOpusPrompt()` to include scoring anchors ONLY for disagreement metrics (σ>10):
```
Cannabis (pf_01_cannabis_legal) - HIGH DISAGREEMENT (σ=12.3):
  City1: [claude-sonnet:75, gpt-4o:80, gemini:70]
  City2: [claude-sonnet:90, gpt-4o:85, gemini:95]

  Legal Score Anchors:
    100: Fully legal - recreational sales permitted
    75: Medical + decriminalized recreational
    50: Medical only OR decriminalized
    25: Illegal - misdemeanor
    0: Illegal - felony
```

**Rationale:** Keeps Opus prompt lean (~5-10 disagreement metrics) while giving context where it matters.

#### Phase 5: Consolidate Judge Code

**Decision Required:** Which file is the "real" one?
- `api/judge.ts` - Vercel serverless function (called via HTTP)
- `src/services/opusJudge.ts` - Client-side service (may be dead code)

**Recommendation:**
1. Check if `opusJudge.ts` is called anywhere besides through `/api/judge`
2. If not, delete `opusJudge.ts` entirely
3. If yes, extract shared functions to `src/utils/judgeUtils.ts` and import in both places

#### Phase 6: Increase Timeouts

**File:** `src/services/llmEvaluators.ts`

**Change:** Line 926 - increase category batch timeout:
```typescript
// OLD
const timeoutId = setTimeout(() => controller.abort(), 30000);

// NEW
const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds for web search + metrics
```

**Also consider:** Per-LLM timeouts (Perplexity needs longer than Claude)

---

### FILES TO MODIFY (Summary)

| File | Action |
|------|--------|
| `src/types/metrics.ts` | Add `legalScoreAnchors`, `enforcementScoreAnchors` to MetricDefinition type |
| `src/data/metrics.ts` | Add anchor data from JSON to each of 100 metrics |
| `api/evaluate.ts` | Update `buildPrompt()` to include anchors |
| `api/judge.ts` | Update `buildOpusPrompt()` to include anchors for disagreement metrics |
| `src/services/llmEvaluators.ts` | Delete `buildEvaluationPrompt()`, increase timeout |
| `src/services/opusJudge.ts` | Either delete entirely OR consolidate shared code to utils |

### FILES TO REFERENCE

| File | Purpose |
|------|---------|
| `D:\LifeScore\freedom-index-scoring-anchors (1).json` | SOURCE - All 100 metrics with scoring anchors |

---

### DATA FLOW (Current vs Proposed)

#### Current Flow (Broken)
```
User clicks LLM button
    ↓
evaluateCategoryBatch() calls POST /api/evaluate
    ↓
buildPrompt() creates prompt WITHOUT scoring anchors
    ↓
LLM guesses what scores mean → inconsistent results
    ↓
Opus mediates blindly → more guessing
```

#### Proposed Flow (Fixed)
```
User clicks LLM button
    ↓
evaluateCategoryBatch() calls POST /api/evaluate
    ↓
buildPrompt() creates prompt WITH scoring anchors from metrics.ts
    ↓
LLM knows exactly what 0/25/50/75/100 means → consistent results
    ↓
Opus sees anchors for disagreement metrics → informed mediation
```

---

### BATCHING STRATEGY (Unchanged)

Keep 6 category batches (one prompt per category):
- Personal Freedom (15 metrics)
- Housing & Property (20 metrics)
- Business & Work (25 metrics)
- Transportation (15 metrics)
- Policing & Legal (15 metrics)
- Speech & Lifestyle (10 metrics)

**Rationale:** Single 100-metric prompt would be too large and timeout.

---

### NEXT SESSION CHECKLIST

1. [ ] Read `freedom-index-scoring-anchors (1).json` to verify anchor data
2. [ ] Update `src/types/metrics.ts` with new type fields
3. [ ] Add anchors to all 100 metrics in `src/data/metrics.ts`
4. [ ] Update `buildPrompt()` in `api/evaluate.ts`
5. [ ] Verify if `src/services/llmEvaluators.ts:buildEvaluationPrompt()` is used - if not, delete
6. [ ] Update `buildOpusPrompt()` in `api/judge.ts` for disagreement metrics
7. [ ] Verify if `src/services/opusJudge.ts` is used - decide consolidate vs delete
8. [ ] Increase timeout in `llmEvaluators.ts:926` from 30s to 90s
9. [ ] Run `npx tsc --noEmit` to verify TypeScript
10. [ ] Test with 2 cities to verify LLM consistency improves

---

### QUESTIONS RESOLVED IN THIS SESSION

| Question | Answer |
|----------|--------|
| Keep dual-score (Legal + Enforcement)? | YES - existing architecture, no change |
| Use A/B/C/D/E letter codes? | NO - keep numeric 0-100 with anchors |
| All 100 metrics in one prompt? | NO - keep 6 category batches |
| Where to store anchors? | In `src/data/metrics.ts` alongside metric definitions |
| Does Opus need anchors? | YES - but only for disagreement metrics (σ>10) |

---

## GRAND MASTER FIX PLAN - SESSION LS-AUDIT-20260117-001

### Date: January 17, 2026
### Context Window Handoff Document

**IF THIS SESSION ENDS, THE NEXT AGENT MUST:**
1. Read this entire README.md
2. Continue from the task marked `[ ] IN PROGRESS` or first `[ ] PENDING`
3. Follow the same attestation pattern for each fix

---

### MASTER FIX TABLE

| # | Task | File(s) | Status | Attestation |
|---|------|---------|--------|-------------|
| 1 | Replace GPT-5.2 with GPT-4o + Tavily | `api/evaluate.ts` | [x] DONE | Claude attested |
| 2 | Replace GPT-5.2 with GPT-4o in types | `src/types/enhancedComparison.ts` | [x] DONE | Claude attested |
| 3 | Replace GPT-5.2 with GPT-4o in UI | `src/components/EnhancedComparison.tsx` | [x] DONE | Claude attested |
| 4 | Replace GPT-5.2 references in README | `README.md` | [x] DONE | Claude attested |
| 5 | Fix UI partial success (scores.length > 0) | `src/components/EnhancedComparison.tsx` | [x] DONE | Claude attested |
| 6 | Debug Sonnet 3-second crash | `api/evaluate.ts` + logs | [ ] PENDING | |
| 7 | Debug Grok UI not opening sections | `src/components/EnhancedComparison.tsx` | [ ] PENDING | |
| 8 | Add defensive parsing all LLMs | `api/evaluate.ts` | [ ] PENDING | |
| 9 | Filter UI to show only called LLMs | `src/components/EnhancedComparison.tsx` | [ ] PENDING | |
| 10 | Run TypeScript check | `npx tsc --noEmit` | [ ] PENDING | |
| 11 | Git commit all changes | N/A | [ ] PENDING | |

---

### CRITICAL CLARIFICATIONS

**GPT-4o FULLY REPLACES GPT-4o:**
- GPT-4o costs $7/call (too expensive)
- GPT-4o costs $0.30/call (with Tavily web search)
- ALL references to `gpt-4o` must become `gpt-4o`
- GPT-4o uses standard `/v1/chat/completions` API (NOT the responses API)
- GPT-4o needs Tavily for web search (same pattern as Claude Sonnet)

**PERPLEXITY FIELD ISSUE (ALREADY FIXED):**
- Original field names had content Perplexity flagged as inappropriate
- Fields were already renamed (e.g., "Prostitution" → "Sex Work Laws")
- Defensive parsing still needed to prevent crashes on partial responses

**CITY DATA IS SAFE:**
- The 200+ cities in `src/data/metros.ts` are REAL data - DO NOT TOUCH
- Frequent comparison cities are REAL data - DO NOT TOUCH
- Only remove fake SCORE generators (e.g., `generateDemoData()`)

**VERCEL TIMEOUT: 300 SECONDS**
- Pro plan = 300s (NOT 60s as previously assumed)
- All current timeouts are within limits
- Sonnet 3-second crash is NOT a timeout - it's an immediate API error

**⚠️ DEAD CODE WARNING:**
- `src/services/llmEvaluators.ts` contains `evaluateWithGPT4o()` function (lines ~306-444)
- This function was renamed from `evaluateWithGPT5` but STILL uses the old `/v1/responses` API format
- This is DEAD CODE because all LLM calls now go through `/api/evaluate` serverless function
- The serverless function (`api/evaluate.ts`) has the CORRECT GPT-4o implementation using Tavily + chat completions
- **ACTION NEEDED:** Either delete `evaluateWithGPT4o()` from llmEvaluators.ts OR update it to match api/evaluate.ts
- The old path via `runAllEvaluators()` → `evaluateWithGPT4o()` will FAIL if called

---

### LLM CONFIGURATION (AFTER FIXES)

| LLM | Model ID | Web Search | Cost | Status |
|-----|----------|------------|------|--------|
| Claude Sonnet | `claude-sonnet-4-5-20250929` | Tavily | ~$0.50 | DEBUGGING |
| **GPT-4o** | `gpt-4o` | **Tavily** | ~$0.30 | **REPLACING 5.2** |
| Gemini 3 Pro | `gemini-3-pro` | Google Search | ~$0.20 | READY |
| Grok 4 | `grok-4` | Native | ~$0.40 | BACKEND OK, UI BROKEN |
| Perplexity | `sonar-reasoning-pro` | Native | ~$0.50 | PARTIAL SUCCESS |
| Opus Judge | `claude-opus-4-5-20251101` | N/A | ~$1.00 | READY |

---

### FILES TO MODIFY (COMPLETE LIST)

| File | Changes Required |
|------|------------------|
| `api/evaluate.ts` | Replace `evaluateWithGPT5()` with `evaluateWithGPT4o()` using Tavily, add defensive parsing |
| `src/types/enhancedComparison.ts` | Change `'gpt-4o'` to `'gpt-4o'` in LLMProvider type and LLM_CONFIGS |
| `src/components/EnhancedComparison.tsx` | Change GPT-4o refs to GPT-4o, fix partial success check, filter called LLMs |
| `README.md` | Update all GPT-4o references to GPT-4o |

---

### DATA FLOW REMINDER

```
User clicks LLM button
    ↓
runSingleEvaluatorBatched() [src/services/llmEvaluators.ts]
    ↓
POST /api/evaluate [api/evaluate.ts]
    ↓
evaluateWith[LLM]() function
    ↓
parseResponse() → scores[]
    ↓
Return to client → Update llmStates
    ↓
After 2+ LLMs → POST /api/judge
    ↓
UI should render (CURRENTLY BROKEN)
```

---

### ATTESTATION TEMPLATE

For each fix, Claude must state:
```
✅ FIX #N COMPLETE
- File: [filename]
- Lines changed: [line numbers]
- What was changed: [description]
- Verified: [how verified]
- I 100% ATTEST this fix is complete.
```

---

## License

UNLICENSED - John E. Desautels & Associates
