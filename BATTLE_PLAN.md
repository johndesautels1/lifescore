# LIFE SCORE™ BATTLE PLAN
> Last Updated: 2026-01-16 by Claude Opus 4.5
> Conversation ID: lifescore-enhanced-refactor-001

---

## 🎯 PROJECT OVERVIEW

**LIFE SCORE™** - Legal Independence & Freedom Evaluation
- Compares legal freedom metrics between 200 metropolitan areas (100 NA + 100 EU)
- Uses multiple LLMs with web search to evaluate 100 metrics across 6 categories
- Claude Opus 4.5 serves as final judge for consensus

**Repository**: https://github.com/johndesautels1/lifescore
**Deployed**: Vercel (auto-deploy from main branch)

---

## 🔑 API KEYS - ALREADY CONFIGURED (DO NOT ASK USER)

**ALL API KEYS ARE ALREADY SET IN VERCEL ENVIRONMENT VARIABLES.**
- Anthropic (Claude) ✓
- OpenAI (GPT-4o) ✓
- Google (Gemini) ✓
- xAI (Grok) ✓
- Perplexity ✓
- Tavily ✓

**NEVER ask the user to add, configure, or verify API keys. They are done.**

---

## 📊 CURRENT STATE

### Recently Completed (Verified via git)
| Task | Commit | Files Changed | Date |
|------|--------|---------------|------|
| Winner logic fix (rounded scores) | `824874e` | enhancedComparison.ts | Jan 16 |
| Score Legend + full metric names | `67a1f20` | EnhancedComparison.tsx, .css | Jan 16 |
| Vercel rebuild trigger | `35d93f7` | .vercel-trigger | Jan 16 |
| Glassmorphic popular buttons | earlier | CitySelector.css | Jan 16 |
| Cache system implementation | earlier | src/services/cache.ts | Jan 16 |
| 5-LLM evaluator system | earlier | src/services/llmEvaluators.ts | Jan 16 |
| Opus judge consensus | earlier | src/services/opusJudge.ts | Jan 16 |

### What's Working
- UI renders correctly with city selection (200 metros)
- Demo mode works when no API keys present
- Real API calls work (but prone to timeout with 5 LLMs)
- Cache system with localStorage fallback
- Winner determination logic fixed

### What's Broken / Needs Refactor
- **TIMEOUT RISK**: 5 LLMs × 100 metrics × web search = will timeout on Vercel
- **Poor UX**: All-or-nothing approach, user can't see per-LLM results
- **Weak Sources**: Only 3 generic Tavily queries, no targeted source searches
- **No Source Display**: Citations not shown in UI
- **Single Mega-Prompt**: All 100 metrics in one prompt (token overload risk)

---

## 🏗️ ARCHITECTURE DECISIONS (LOCKED IN)

### Categories (6 total, DO NOT CHANGE)
| ID | Name | Metrics | Weight |
|----|------|---------|--------|
| `personal_freedom` | Personal Autonomy | 15 | 20% |
| `housing_property` | Housing, Property & HOA | 20 | 20% |
| `business_work` | Business & Work Regulation | 25 | 20% |
| `transportation` | Transportation & Movement | 15 | 15% |
| `policing_legal` | Policing, Courts & Enforcement | 15 | 15% |
| `speech_lifestyle` | Speech, Lifestyle & Culture | 10 | 10% |

### Metrics
- **100 total metrics** defined in `src/data/metrics.ts`
- DO NOT add or remove metrics without updating category counts
- Each metric has `searchQueries` array for web search

### LLM Providers (5 total)
| Provider | Model | Web Search Method |
|----------|-------|-------------------|
| Claude (Anthropic) | claude-sonnet-4 | Tavily API |
| GPT-4o (OpenAI) | gpt-4o | Native web_search tool |
| Gemini (Google) | gemini-2.0-flash | Google Search grounding |
| Grok (xAI) | grok-3 | Native search: true |
| Perplexity | sonar-reasoning-pro | Native (return_citations) |

### Judge
- **Claude Opus 4.5** (`claude-opus-4-5-20251101`) for final consensus
- Only called after ≥2 LLMs have completed

---

## 🚀 IMPLEMENTATION PLAN (5 PHASES)

### Phase 1: Single-LLM Selection UI ⬅️ CURRENT
**Goal**: Let user select and run ONE LLM at a time
**Files to modify**:
- `src/components/EnhancedComparison.tsx` - Add LLM selector buttons
- `src/components/EnhancedComparison.css` - Style the selector
- `src/App.tsx` - Update state management for progressive LLM calls

**Acceptance Criteria**:
- [ ] 5 LLM buttons displayed (Claude, GPT-4o, Gemini, Grok, Perplexity)
- [ ] User clicks one → that LLM evaluates → results shown
- [ ] User can click another → adds to results
- [ ] After ≥2 LLMs → Opus judge auto-called
- [ ] Each LLM's individual scores visible

### Phase 2: Category Batch Prompts
**Goal**: Split 100 metrics into 6 category batches, run in parallel per LLM
**Files to modify**:
- `src/services/llmEvaluators.ts` - Add batch evaluation functions
- `src/services/enhancedComparison.ts` - Orchestrate 6 parallel batch calls

**Acceptance Criteria**:
- [ ] Each LLM call splits into 6 parallel batch requests
- [ ] Each batch handles only its category's metrics
- [ ] Progress indicator shows which categories completed
- [ ] Total time per LLM: 30-60 seconds

### Phase 3: Progressive Opus Judging
**Goal**: Opus compares whatever LLMs have completed, updates as more added
**Files to modify**:
- `src/services/opusJudge.ts` - Support incremental judging
- `src/components/EnhancedComparison.tsx` - Show per-LLM breakdown + consensus

**Acceptance Criteria**:
- [ ] After 2 LLMs complete → auto-call Opus
- [ ] After each additional LLM → re-call Opus with updated data
- [ ] UI shows individual LLM opinions + judge consensus
- [ ] Disagreement areas highlighted

### Phase 4: Targeted Tavily + Citation Requests
**Goal**: Better source queries, ask (not require) citations
**Files to modify**:
- `src/services/llmEvaluators.ts` - Update Tavily queries per category
- Prompt templates - Add source priority list, citation request

**Key Sources by Category**:
- Personal: NORML, Guttmacher, ILGA, Drug Policy Alliance
- Housing: Tax Foundation, Institute for Justice, Nolo
- Business: Tax Foundation, DOL, NCSL, SBA
- Transportation: WalkScore, TomTom, IIHS, PeopleForBikes
- Legal: Prison Policy Initiative, Vera Institute, DPIC
- Speech: Freedom House, RSF, EFF, Pew Research

**Acceptance Criteria**:
- [ ] 30+ targeted Tavily queries (not 3 generic)
- [ ] Prompts list authoritative sources to prioritize
- [ ] LLMs asked to cite sources (not required)

### Phase 5: Source Evidence Panel
**Goal**: Display actual sources used in comparison
**Files to create/modify**:
- `src/components/SourceEvidencePanel.tsx` - New component
- `src/components/EnhancedComparison.tsx` - Integrate panel

**Acceptance Criteria**:
- [ ] Panel shows source cards with favicon, title, URL
- [ ] Sources linked to specific metrics where cited
- [ ] Collapsible/expandable for each category
- [ ] "X sources cited" summary visible

---

## 📁 CRITICAL FILE PATHS

```
D:\LifeScore\
├── src/
│   ├── data/
│   │   └── metrics.ts          # 100 metric definitions (DO NOT MODIFY COUNTS)
│   ├── services/
│   │   ├── llmEvaluators.ts    # Individual LLM evaluation functions
│   │   ├── opusJudge.ts        # Opus consensus builder
│   │   ├── enhancedComparison.ts # Main orchestration
│   │   ├── cache.ts            # Caching system
│   │   └── rateLimiter.ts      # Rate limiting, circuit breaker
│   ├── components/
│   │   ├── EnhancedComparison.tsx  # Results display (1000+ lines)
│   │   ├── EnhancedComparison.css  # Results styling
│   │   ├── CitySelector.tsx    # City dropdown + popular comparisons
│   │   └── CitySelector.css    # City selector styling
│   ├── types/
│   │   ├── metrics.ts          # Category, Metric type definitions
│   │   └── enhancedComparison.ts # LLM score types
│   └── App.tsx                 # Main app, API key management
├── BATTLE_PLAN.md              # THIS FILE - source of truth
└── .env.local                  # API keys (not in git)
```

---

## 🚨 COMPRESSION PROTOCOL

### At 50% Context (~100k tokens)
- Claude will warn: "We're at 50% token capacity"
- **Action**: Continue but be aware

### At 70% Context (~140k tokens)
- Claude will warn: "We're at 70% - consider wrapping up soon"
- **Action**:
  1. Commit current work: `git add -A && git commit -m "WIP: [description]"`
  2. Push: `git push`
  3. Update this BATTLE_PLAN.md

### At 85% Context (~170k tokens)
- Claude will alert: "We should start a new conversation NOW"
- **Action**:
  1. STOP coding immediately
  2. Commit and push ALL changes
  3. Update BATTLE_PLAN.md with exact stopping point
  4. Start new conversation with: "Read D:\LifeScore\BATTLE_PLAN.md and continue"

---

## 📋 NEW SESSION CHECKLIST

When starting a new conversation:
```
1. "Read D:\LifeScore\BATTLE_PLAN.md"
2. Run: git log --oneline -5
3. Run: git status
4. Confirm current phase and task
5. Begin work
```

---

## 📝 SESSION NOTES

### Session: 2026-01-16 (Current)
- Discussed source mapping for all 100 metrics
- Identified timeout risk with current 5-LLM parallel approach
- Agreed on new architecture: single-LLM selection, category batching
- Created this BATTLE_PLAN.md
- Starting Phase 1 implementation

---

## ⚠️ DO NOT

1. **DO NOT** change category definitions without updating all files
2. **DO NOT** add/remove metrics without verifying 100 total count
3. **DO NOT** fire all 5 LLMs in parallel (timeout guaranteed)
4. **DO NOT** mark tasks complete without verifying git commit exists
5. **DO NOT** continue coding past 85% context without saving state
6. **DO NOT** ask user about API keys - they are all configured in Vercel
