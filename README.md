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
| 3 | Progressive Opus Judging | ⬅️ NEXT |
| 4 | Targeted Tavily + Citation Requests | ✅ COMPLETE |
| 5 | Source Evidence Panel | ✅ COMPLETE |

### Next Session Tasks
1. **PHASE 3**: Progressive Opus Judging
   - Opus compares whatever LLMs completed, updates as more added
   - Auto-call after 2 LLMs complete
   - Re-call after each additional LLM
   - Show individual LLM opinions + judge consensus

2. **HOME PAGE UI REARRANGEMENT**: Redesign main layout

### Current State (Commit 0cdb5bd)
- ✅ All demo mode code removed
- ✅ Real API routes working (`/api/evaluate`, `/api/judge`)
- ✅ TypeScript compilation passing
- ✅ 5 LLM evaluators + Claude Opus judge configured
- ✅ **GPT-5.2 upgrade complete** (replaced GPT-4o with responses API + built-in web search)
- ✅ **Tavily integration** for Claude web search
- ✅ **Google Search grounding** for Gemini
- ✅ **Evidence Panel** created (collapseable citations above footer)
- ✅ Phase 1, 2, 4, 5 complete

### Recent Updates (This Session)
| Commit | Description |
|--------|-------------|
| `0cdb5bd` | Fix missing Google Search grounding in api/evaluate.ts Gemini |
| `e8e962c` | Fix 11 GPT-5.2 audit errors: field mapping, evidence capture, Tavily |
| `80f1eb1` | Fix TypeScript and ESLint errors in GPT-5.2 implementation |
| `8337811` | Replace GPT-4o with GPT-5.2 using new responses API |
| `ca7beb9` | Fix LLM prompt issues, standardize system messages |

## License

UNLICENSED - John E. Desautels & Associates
