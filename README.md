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

6. **MODEL CONSISTENCY**: Claude must NEVER change LLM model IDs (e.g., `claude-sonnet-4-5-20250514`, `grok-4`, `gemini-3-pro`) without explicit permission.

### API Architecture
All LLM calls go through Vercel serverless functions:
- `/api/evaluate` - LLM evaluations (Claude Sonnet, GPT-5.2, Gemini 3 Pro, Grok 4, Perplexity)
- `/api/judge` - Claude Opus 4.5 consensus building

### Web Search Integration
| LLM | Web Search Method | API/Service |
|-----|-------------------|-------------|
| Claude Sonnet | Tavily API | External search prepended to prompt |
| GPT-5.2 | Built-in web_search | Native responses API tool |
| Gemini 3 Pro | Google Search Grounding | googleSearchRetrieval tool |
| Grok 4 | Native search | `search: true` parameter |
| Perplexity | Native (Sonar) | `return_citations: true` |

### Environment Variables (Vercel)
```
ANTHROPIC_API_KEY=your-key    # Claude Sonnet & Opus
OPENAI_API_KEY=your-key       # GPT-5.2 (built-in web search)
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
- ✅ **GPT-5.2 upgrade complete** (replaced GPT-4o with responses API + built-in web search)
- ✅ **Tavily integration** for Claude web search
- ✅ **Google Search grounding** for Gemini
- ✅ **Evidence Panel** created (collapseable citations above footer)
- ✅ **Phase 3 Progressive Judging** complete - Opus re-judges as LLMs finish
- ✅ All 5 phases complete!

### Recent Updates (January 16, 2026 Session)
| Commit | Description |
|--------|-------------|
| `e453046` | **FIX: Anthropic 404** - Updated API version header from 2023-06-01 to 2025-01-01 |
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
| `e8e962c` | Fix 11 GPT-5.2 audit errors: field mapping, evidence capture, Tavily |
| `80f1eb1` | Fix TypeScript and ESLint errors in GPT-5.2 implementation |
| `8337811` | Replace GPT-4o with GPT-5.2 using new responses API |
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
   - Claude Sonnet 4.5 (`claude-sonnet-4-5-20250514`) - uses Tavily for web search
   - GPT-5.2 (`gpt-5.2`) - uses `/v1/responses` API with built-in web_search
   - Gemini 3 Pro (`gemini-3-pro`) - uses Google Search grounding
   - Grok 4 (`grok-4`) - uses `search: true` parameter
   - Perplexity (`sonar-reasoning-pro`) - uses `return_citations: true`

2. **API Version Headers** - Only Anthropic uses version headers. Other APIs (OpenAI, Google, xAI, Perplexity) use URL versioning or are backward compatible.

3. **Vercel Environment Variables Required:**
   ```
   ANTHROPIC_API_KEY    # Claude Sonnet & Opus
   OPENAI_API_KEY       # GPT-5.2
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

## License

UNLICENSED - John E. Desautels & Associates
