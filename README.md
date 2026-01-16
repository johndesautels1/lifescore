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
- **AI:** Claude Sonnet (for web search scoring)

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
- `/api/evaluate` - LLM evaluations (Claude, GPT-4o, Gemini, Grok, Perplexity)
- `/api/judge` - Claude Opus 4.5 consensus building

### Environment Variables (Vercel)
```
ANTHROPIC_API_KEY=your-key
OPENAI_API_KEY=your-key
GOOGLE_API_KEY=your-key
XAI_API_KEY=your-key
PERPLEXITY_API_KEY=your-key
```

## NEXT PHASE TODO

### Phase 2 Tasks (Next Session)
1. **AUDIT SCORING LOGIC**: Review all scoring calculations across the codebase
2. **AUDIT LLM PROMPTS**: Review all prompts in `/api/evaluate.ts`, `/api/judge.ts`, `llmEvaluators.ts`, `opusJudge.ts`
3. **HOME PAGE UI REARRANGEMENT**: Redesign/reorganize the main UI layout

### Current State (Commit 3a6064b)
- ✅ All demo mode code removed (379 lines deleted)
- ✅ Real API routes working (`/api/evaluate`, `/api/judge`)
- ✅ TypeScript compilation passing
- ✅ 6 LLM providers configured (Claude Sonnet, GPT-4o, Gemini 3 Pro, Grok 4, Perplexity, Claude Opus judge)
- ✅ Model IDs verified and locked

## License

UNLICENSED - John E. Desautels & Associates
