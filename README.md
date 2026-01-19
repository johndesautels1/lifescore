# CLUES LIFE SCORE

**Legal Independence & Freedom Evaluation**

Compare cities across 100 freedom metrics in 6 categories. Part of the CLUES (Comprehensive Location & Utility Evaluation System) platform.

---

## CURRENT STATUS (January 20, 2026)

### Latest Session: 2026-01-20
**Conversation ID:** `LIFESCORE-2026-0120-DEADCODE`

### What Was Fixed This Session

| Issue | Fix | Commit | Lines |
|-------|-----|--------|-------|
| #5 Per-metric evidence hardcoded | Wired to `metric.llmScores[].evidence[]` | 427baa4 | +34 |
| #6 Identical Law/Reality scores | Dual category prompt + parsing | 14340ef | +35 |
| #9 Duplicate Judge code | Removed from opusJudge.ts | 9d2caae | -417 |
| #10 Dead client code | Removed evaluator functions | 1568773 | -1,548 |
| #11 opusJudge divergence | Covered by #9 | - | - |
| #13 Hardcoded evidence | Covered by #5 | - | - |

**Total dead code removed: ~2,000 lines**

### Codebase Now Clean:
- `llmEvaluators.ts`: 333 lines (was 1,493)
- `enhancedComparison.ts`: 69 lines (was 349)
- `opusJudge.ts`: 212 lines (was 629)
- `EnhancedComparison.tsx`: 1,614 lines (was 1,701)

### Still Needs Testing
| Item | Status |
|------|--------|
| GPT-4o evaluation | NEEDS TEST |
| Perplexity evaluation | NEEDS TEST |
| Law vs Enforcement scores now different | NEEDS TEST |
| Per-metric evidence displays correctly | NEEDS TEST |

### Next Session - Remaining Items
See Master Issue Table below for items #23-52:
- ~~#19: Saved button persistence~~ **FIXED** (commit 1e94321)
- ~~#23-29: Branding to "Clues Intelligence LTD"~~ **FIXED** (commit 3ae6461)
- #30-36: Olivia AI features
- #37-39: Reports (Gamma API)
- #40-46: User/Payment (Stripe)
- #47-49: Database caching
- #50-52: Mobile (Vite Capacitor)

---

## GAMMA API INTEGRATION (#37-39) - VISUAL REPORTS

**Full Documentation:** `GAMMA_API_INTEGRATION.md`

### Architecture Overview

```
LLM Evaluations → Opus Judge → Raw Data → Gamma API → Visual Storybook
                                              ↓
                              ┌───────────────┴───────────────┐
                              │                               │
                         Visuals Tab                    Ask Olivia Tab
                         (Gamma Embed)                  (D-ID/HeyGen)
                              │                               │
                         PDF/PPTX Export              Summary & Action Plan
```

### Gamma API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1.0/generations` | POST | Create visual presentation |
| `/v1.0/generations/{id}` | GET | Check status / get result |
| `/v1.0/themes` | GET | List available themes |
| `/v1.0/folders` | GET | List storage folders |

### Key Configuration

```json
{
  "textMode": "generate",
  "format": "presentation",
  "cardSplit": "inputTextBreaks",
  "exportAs": "pdf",
  "imageOptions": { "source": "aiGenerated", "model": "imagen-4-pro" }
}
```

### New Components Required

- `src/services/gammaService.ts` - API integration
- `api/gamma.ts` - Serverless endpoint
- `src/components/VisualsTab.tsx` - Presentation viewer
- `src/components/AskOliviaTab.tsx` - AI assistant iframe

### New Environment Variables

```
GAMMA_API_KEY=sk-gamma-xxxxxxxx
GAMMA_THEME_ID=[custom theme ID]
GAMMA_FOLDER_ID=[reports folder ID]
```

---

## COURT ORDER INJUNCTION - CLAUDE CODE RESTRICTIONS

**CLAUDE CODE IS FORBIDDEN FROM MAKING THE FOLLOWING CHANGES WITHOUT DIRECT OWNER APPROVAL:**

1. **TIMEOUT VALUES** - Any modification to timeout constants
2. **API MODEL NAMES** - Any changes to LLM model identifiers
3. **API KEY NAMES** - Any changes to environment variable names

**VIOLATION OF THIS INJUNCTION WILL RESULT IN IMMEDIATE TERMINATION OF CLAUDE CODE SESSION.**

---

## TIMEOUT AUDIT (Updated 2026-01-17)

**Vercel Pro Limit: 300 seconds**

| Layer | Constant | Value | File |
|-------|----------|-------|------|
| Vercel Hard Limit | `maxDuration` | 300s | vercel.json |
| Server LLM Calls | `LLM_TIMEOUT_MS` | 180s | api/evaluate.ts |
| Server Opus Judge | `OPUS_TIMEOUT_MS` | 180s | api/judge.ts |
| Client Fetch | `CLIENT_TIMEOUT_MS` | 240s | src/services/llmEvaluators.ts |

---

## API CONFIGURATION

### LLM Model Identifiers
| Provider | Model ID | API Endpoint |
|----------|----------|--------------|
| Claude Sonnet | `claude-sonnet-4-5-20250929` | api.anthropic.com |
| Claude Opus | `claude-opus-4-5-20251101` | api.anthropic.com |
| GPT-4o | `gpt-4o` | api.openai.com |
| Gemini | `gemini-3-pro-preview` | generativelanguage.googleapis.com |
| Grok | `grok-4` | api.x.ai |
| Perplexity | `sonar-reasoning-pro` | api.perplexity.ai |

### Environment Variables (Vercel)
```
ANTHROPIC_API_KEY    # Claude Sonnet & Opus
OPENAI_API_KEY       # GPT-4o
GEMINI_API_KEY       # Gemini 3 Pro
XAI_API_KEY          # Grok 4
PERPLEXITY_API_KEY   # Perplexity Sonar
TAVILY_API_KEY       # Web search for Claude/GPT
```

### Web Search Integration
| LLM | Web Search Method |
|-----|-------------------|
| Claude Sonnet | Tavily API (prepended to prompt) |
| GPT-4o | Tavily API (prepended to prompt) |
| Gemini 3 Pro | Google Search Grounding (google_search tool) |
| Grok 4 | Native (`search: true`) |
| Perplexity | Native Sonar |

---

## FEATURES

- 100 Freedom Metrics across 6 categories
- City-to-city comparison
- Multi-LLM Consensus (5 LLMs + Claude Opus Judge)
- Real-time web search integration
- Modern React + TypeScript + Vite stack
- Vercel deployment

## Categories

| Category | Metrics | Weight |
|----------|---------|--------|
| Personal Freedom & Morality | 15 | 20% |
| Housing, Property & HOA Control | 20 | 20% |
| Business & Work Regulation | 25 | 20% |
| Transportation & Daily Movement | 15 | 15% |
| Policing, Courts & Enforcement | 15 | 15% |
| Speech, Lifestyle & Culture | 10 | 10% |

---

## QUICK START

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## DEBUG LOGGING

### Vercel Logs - What to Look For

**Evaluate endpoint (api/evaluate.ts):**
```
[PARSE] claude raw response (first 500): ...
[PARSE] claude format: categories=bool, letters=bool, numbers=bool
[PARSE] claude returned N evaluations
```

**Judge endpoint (api/judge.ts):**
```
[JUDGE] Evaluator results: N successful LLMs (names), N total scores
[JUDGE] Disagreement metrics: N (list...)
[JUDGE] hasActualScores=bool, anthropicKey=bool, city1=X, city2=Y
[JUDGE] Calling Opus API with prompt length: N chars
[JUDGE] Opus response received, content length: N chars
[JUDGE] Opus judgments parsed: N judgments
```

---

## ARCHITECTURE

### Data Flow
```
User clicks "Compare LIFE SCORES"
    ↓
App.tsx sets enhancedStatus='running'
    ↓
LLMSelector renders with 5 LLM buttons
    ↓
User clicks LLM button
    ↓
POST /api/evaluate (Vercel serverless)
    ↓
LLM returns scores → parseResponse()
    ↓
After 1+ LLMs complete → POST /api/judge
    ↓
Opus builds consensus → EnhancedResults displayed
```

### File Structure
```
api/
├── evaluate.ts      # LLM evaluations (all 5 providers)
├── judge.ts         # Claude Opus consensus builder
├── health.ts        # Health check endpoint
└── shared/          # Shared metrics module
    └── metrics.ts

src/
├── components/      # React components
├── services/        # Client-side services
├── types/           # TypeScript types
├── data/            # Metrics definitions
└── hooks/           # Custom React hooks
```

---

## RECENT COMMITS (Last 20)

```
3114a40 Fix GPT-4o, Perplexity failures + add Judge debug logging
7733f99 Improve Evidence Panel: match category progress height & styling
9a6c999 Auto-switch to Results tab on standard mode completion
a6f1fc0 Fix TypeScript errors in api/evaluate.ts
97dfade Fix scoring system: Port prompts from client to server
cb911f1 Add handoff document for next session
6a7617a Add detailed fix plan for scoring system
31beebc CRITICAL: Document all scoring system issues
8ffd14b Trigger redeploy
c7059d7 Fix Gemini API: googleSearchRetrieval → google_search
30a7da6 Add .js extensions to ESM imports for Vercel
55928c4 Fix includeFiles path to api/shared/**
13c09d1 Trigger redeploy for USE_CATEGORY_SCORING env var
db40057 Create standalone api/shared module for Vercel serverless
9be1ffe Update README and handoff docs
ea7537c Fix Vercel serverless import issue
57c1bd5 Update handoff document with critical fix status
02367fa Document critical API fix needed
7916568 Fix TypeScript errors in cache.ts and metrics.ts
1e6e82f Remove obsolete Phase 2/4 documentation files
```

---

## MANDATORY DEVELOPMENT RULES

### NO DEMO MODE ALLOWED
- No `demoMode` parameters or flags
- No fake/simulated data generators
- All data MUST come from real API calls

### AI ASSISTANT (Claude) MANDATORY RULES
1. **ATTESTATION REQUIREMENT**: Must verify ALL file locations before stating work is complete
2. **TYPESCRIPT VERIFICATION**: Must run `npx tsc --noEmit` before stating build is complete
3. **NO ALTERNATIVE CODE BLOCKS**: No duplicate functionality without permission
4. **NO CODE ROLLBACKS**: No rollbacks without explicit permission
5. **MODEL CONSISTENCY**: Never change LLM model IDs without permission

---

## KNOWN ISSUES TO INVESTIGATE

| Issue | Status | Notes |
|-------|--------|-------|
| GPT-4o fails | FIX DEPLOYED | Removed false web search claim |
| Perplexity fails | FIX DEPLOYED | Removed strict JSON schema |
| Opus runs too fast | DEBUG ADDED | Check [JUDGE] logs |
| Only ~25% metrics returned | MONITORING | Added debug logging |
| **#5 Per-metric evidence hardcoded** | ✅ FIXED | Wired to `metric.llmScores[].evidence[]` - commit 427baa4 |
| **#6 Identical Law/Reality scores** | ✅ FIXED | Dual category prompt + parsing - commit 14340ef |
| **#9 Duplicate Judge code** | ✅ FIXED | Removed ~417 lines from opusJudge.ts - commit 9d2caae |
| **#10 Client prompts out of sync** | ✅ FIXED | Dead code removed (~1,548 lines) - commit 1568773 |
| **#11 opusJudge.ts divergence** | ✅ FIXED | Covered by #9 - duplicate code removed |
| **#12 LLMProvider type** | NO ISSUE | Type is correct |
| **#13 EnhancedComparison hardcoded** | ✅ FIXED | Covered by #5 fix - commit 427baa4 |
| **#19 Saved button persistence** | ✅ FIXED | Deterministic IDs based on city pair - commit 1e94321 |
| **#23-29 Rebrand to Clues Intelligence LTD** | ✅ FIXED | 14 files updated - commit 3ae6461 |

---

## ISSUE #6: Identical Law/Reality Scores - DETAILED ANALYSIS

**Root Cause Identified: 2026-01-20**

### Problem Chain
1. When `USE_CATEGORY_SCORING=true` (Vercel env var), `buildCategoryPrompt()` asks for only ONE category per city
2. Prompt returns: `city1Category`, `city2Category` (single values)
3. `parseResponse()` at lines 402-405 duplicates the value:
   ```javascript
   city1LegalScore: city1Score,
   city1EnforcementScore: city1Score,  // ← BUG: Same value!
   ```

### Files Affected
- `api/evaluate.ts:297-340` - `buildCategoryPrompt()` needs dual categories
- `api/evaluate.ts:395-412` - `parseResponse()` needs to parse both fields

### Chosen Fix: Option A - Expand Categories for Dual Scoring

**Changes Required:**
1. Update `buildCategoryPrompt()` to ask for:
   - `city1LegalCategory` - What the law says
   - `city1EnforcementCategory` - How it's enforced
   - `city2LegalCategory`
   - `city2EnforcementCategory`

2. Update `parseResponse()` to parse all 4 fields:
   ```javascript
   city1LegalScore: getCategoryScore(e.metricId, e.city1LegalCategory),
   city1EnforcementScore: getCategoryScore(e.metricId, e.city1EnforcementCategory),
   ```

3. Consider whether enforcement needs different category options or can reuse legal scale

**Priority:** HIGH - Core differentiator of LifeScore product

---

## ISSUE #9: Duplicate Judge Code - DETAILED ANALYSIS

**Root Cause Identified: 2026-01-20**

### Problem: Two Separate Judge Implementations

| Path | File | How Called | Lines |
|------|------|------------|-------|
| Server | `api/judge.ts` | `fetch('/api/judge')` | ~500 |
| Client | `src/services/opusJudge.ts` | `runOpusJudge()` direct | ~629 |

### Duplicated Functions (~600 lines)
- `fetchWithTimeout()`
- `calculateMean/StdDev/Median()`
- `buildMetricConsensus()`
- `aggregateScoresByMetric()` variants
- `JUDGE_PROMPT_TEMPLATE`
- `parseOpusResponse()`
- `mergeOpusJudgments()`

### Current Usage
- `EnhancedComparison.tsx:195` → calls `/api/judge` (server)
- `enhancedComparison.ts:218` → calls `runOpusJudge()` (client direct)

### Chosen Fix: Option A - Server-Only Judge

**Changes Required:**
1. Modify `src/services/opusJudge.ts`:
   - Remove duplicate logic (fetchWithTimeout, stats functions, API call)
   - Replace `runOpusJudge()` to call `/api/judge` endpoint instead
   - Keep `buildCategoryConsensuses()` (needed client-side for result building)
   - Keep `buildEnhancedResultFromJudge()` (needed client-side for result building)

2. Ensure `api/judge.ts` returns all data needed by client

3. Update `src/services/enhancedComparison.ts:218` to use new pattern

### Files to Modify
- `src/services/opusJudge.ts` - Major refactor
- `src/services/enhancedComparison.ts` - Update call pattern
- `api/judge.ts` - Verify response shape

### Testing Requirements (MANDATORY)
- [ ] TypeScript compiles with zero errors (`npx tsc --noEmit`)
- [ ] All 5 LLM buttons work in EnhancedComparison UI
- [ ] enhancedComparison.ts service flow works
- [ ] Judge returns correct consensus scores
- [ ] No runtime errors in browser console
- [ ] Vercel deployment succeeds
- [ ] Full attestation required before merge

**Priority:** MEDIUM - Tech debt, risk of code drift

---

## ISSUE #10: Client Prompts Out of Sync - DETAILED ANALYSIS

**Root Cause Identified: 2026-01-20**

### Problem: Dead Code with Duplicate Prompts

`src/services/llmEvaluators.ts` contains ~1000 lines of functions that call LLM APIs directly:
- `evaluateWithClaude()` - lines ~300-500
- `evaluateWithGPT4o()` - lines ~500-600
- `evaluateWithGemini()` - lines ~600-700
- `evaluateWithGrok()` - lines ~700-800
- `evaluateWithPerplexity()` - lines ~800-1000

These have their **own prompts** that may be out of sync with `api/evaluate.ts`.

### Current Usage

| Function | What it calls | Used by |
|----------|---------------|---------|
| `runSingleEvaluatorBatched()` | `/api/evaluate` (server) | EnhancedComparison.tsx (LLM buttons) |
| `runAllEvaluators()` | Direct LLM APIs (client) | enhancedComparison.ts (service) |

### Risk Assessment: LOW
- The LLM buttons UI (main user flow) uses the correct server path
- The old `runAllEvaluators()` is only called by `enhancedComparison.ts`
- That service is used by `EnhancedComparisonContainer` but the primary flow is the button UI

### Recommended Fix (when time permits)
1. Delete the direct API call functions (~1000 lines)
2. Update `runAllEvaluators()` to use `/api/evaluate` like `runSingleEvaluatorBatched()` does
3. Or: Delete `runAllEvaluators()` entirely if not needed

**Priority:** LOW - Dead code, not actively causing bugs

---

## LICENSE

UNLICENSED - Clues Intelligence LTD
