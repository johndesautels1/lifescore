# LIFE SCORE™ MASTER README
**Conversation ID:** `LIFESCORE-2026-0120-DELTA`
**Last Updated:** January 20, 2026
**Domain:** clueslifescore.com (pending DNS setup)

---

## PROJECT OVERVIEW

**LIFE SCORE™** - Legal Independence & Freedom Evaluation
- Compares legal freedom metrics between 200 metropolitan areas (100 NA + 100 EU)
- Uses 5 LLMs with web search to evaluate 100 metrics across 6 categories
- Claude Opus 4.5 serves as final judge ("The Judge") for consensus
- Gamma AI generates 50-page visual reports

**Repository:** https://github.com/johndesautels1/lifescore
**Deployed:** Vercel (auto-deploy from main branch)
**Domain:** clueslifescore.com (GoDaddy - DNS pending)

---

## DIRECTORY STRUCTURE

```
D:\LifeScore\
├── src/
│   ├── App.tsx                    # Main app, state lifting, Add More Models UI
│   ├── App.css                    # Add More Models styling
│   ├── data/
│   │   └── metrics.ts             # 100 metric definitions
│   ├── services/
│   │   ├── llmEvaluators.ts       # Individual LLM evaluation functions
│   │   ├── opusJudge.ts           # Opus consensus builder
│   │   ├── enhancedComparison.ts  # Main orchestration
│   │   ├── cache.ts               # Caching system
│   │   └── rateLimiter.ts         # Rate limiting, circuit breaker
│   ├── components/
│   │   ├── EnhancedComparison.tsx # Results display, LLMSelector
│   │   ├── EnhancedComparison.css # Results styling, gradients
│   │   ├── VisualsTab.tsx         # Gamma embed iframe
│   │   ├── VisualsTab.css         # Embed styles
│   │   ├── EvidencePanel.tsx      # Source evidence display
│   │   ├── EvidencePanel.css      # Evidence styling
│   │   ├── CitySelector.tsx       # City dropdown
│   │   └── CitySelector.css       # City selector styling
│   ├── types/
│   │   ├── metrics.ts             # Category, Metric type definitions
│   │   └── enhancedComparison.ts  # LLM score types (SOURCE OF TRUTH)
│   └── shared/
│       └── metrics.ts             # Shared metrics + lookup Map
├── api/
│   └── gamma.ts                   # Gamma API integration
├── MASTER_README.md               # THIS FILE - master task list
├── BATTLE_PLAN.md                 # Architecture decisions
├── IMPLEMENTATION_MASTER_PLAN.md  # Scoring system redesign
├── HANDOFF_2026-01-20.md          # Previous session handoff
└── .env.local                     # API keys (not in git)
```

---

## COMPLETED FEATURES (Previous Sessions)

| Feature | Status | Commit |
|---------|--------|--------|
| State Lifting (llmStates → App.tsx) | ✅ Done | 72f583e |
| Add More Models UI on Results tab | ✅ Done | 72f583e |
| Gamma Embedded View (iframe) | ✅ Done | 72f583e |
| Gamma API Fixes (imageOptions, themeId, response mapping) | ✅ Done | 72f583e |
| Dark Mode Text Visibility | ✅ Done | 681e67c |
| Evidence Count Badge (white + gold) | ✅ Done | 681e67c |
| Single-LLM Selection UI | ✅ Done | 6ef12e7 |
| Category Batch Prompts (6 parallel) | ✅ Done | 4db8294 |
| Winner Logic Fix (rounded scores) | ✅ Done | 824874e |
| Score Legend + Full Metric Names | ✅ Done | 67a1f20 |
| 5-LLM Evaluator System | ✅ Done | Earlier |
| Opus Judge Consensus | ✅ Done | Earlier |
| Cache System (localStorage fallback) | ✅ Done | Earlier |

---

## TASK LIST - ALL REMAINING WORK

### PHASE A: Infrastructure & Deployment

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| A1 | **Domain DNS Setup** - Configure GoDaddy DNS for clueslifescore.com | HIGH | 🔴 Not Started | Need to point nameservers to Vercel |
| A2 | **Vercel Domain Wiring** - Add custom domain in Vercel dashboard | HIGH | 🔴 Not Started | After DNS propagates |
| A3 | **GitHub-Vercel Integration** - Verify auto-deploy from main | HIGH | 🔴 Not Started | Should already work, verify |

### PHASE B: Data Sources & Evidence Display (BUGS)

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| B1 | **Perplexity Data Sources** - Investigate if Perplexity returns sources in API response | HIGH | 🔴 Not Started | May be API issue or UI wiring |
| B2 | **5th Thumbnail UI Wiring** - Check if Perplexity thumbnail shows sources correctly | HIGH | 🔴 Not Started | Related to B1 |
| B3 | **Multi-LLM Field Sources Missing** - White microscopic clickable page icon not showing when multiple LLMs | CRITICAL | 🔴 Not Started | Works with 1 LLM, breaks with 2+ |
| B4 | **Field-by-Field Comparison References** - Restore per-field source display in multi-LLM view | CRITICAL | 🔴 Not Started | Key feature broken |

### PHASE C: UI/UX Improvements

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| C1 | **Section Auto-Scroll** - When expanding any of 6 sections with +, auto-scroll to top of that section | MEDIUM | 🔴 Not Started | Currently scrolls wrong or not at all |
| C2 | **About Card Explanation** - Add paragraph explaining scoring without revealing proprietary math | MEDIUM | 🔴 Not Started | Explain "The Judge" concept |
| C3 | **Add More Models Button Handlers** - Wire up click handlers on Results tab | MEDIUM | 🔴 Not Started | UI exists, needs functionality |
| C4 | **Incremental LLM Addition Flow** - Test adding LLM after initial results displayed | MEDIUM | 🔴 Not Started | End-to-end flow test |
| C5 | **Judge Re-runs with Combined Results** - Verify Opus re-judges when new LLM added | MEDIUM | 🔴 Not Started | Part of incremental flow |
| C6 | **Save Report Button** - Add save/export functionality on advanced comparison page | MEDIUM | 🔴 Not Started | Currently missing |

### PHASE D: Gamma Report Fixes

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| D1 | **Gamma 50-Page Setting** - Fix prompt or Gamma settings to generate 50 pages (not 10) | HIGH | 🔴 Not Started | User configured 50 in Gamma dashboard |
| D2 | **Gamma Embed Loading Spinner** - Add spinner while iframe loads | LOW | 🔴 Not Started | Polish |
| D3 | **Gamma Embed Error Handling** - Handle load errors gracefully | LOW | 🔴 Not Started | Edge case handling |

### PHASE E: Ask Olivia AI Assistant

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| E1 | **Olivia Toolbar Button** - Add "Ask Olivia" button to toolbar | HIGH | 🔴 Not Started | New feature |
| E2 | **Olivia Iframe Page** - Create iframe container for D-ID/HeyGen avatar | HIGH | 🔴 Not Started | Glassmorphic design |
| E3 | **Olivia Data Integration** - Wire results data + Gamma reports to Olivia's context | HIGH | 🔴 Not Started | GPT-brained assistant |
| E4 | **D-ID/HeyGen API Setup** - Configure API keys and avatar | HIGH | 🔴 Not Started | Need API credentials |

### PHASE F: User Authentication

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| F1 | **Login Landing Page** - Glassmorphic login/signup UI | HIGH | 🔴 Not Started | First user touchpoint |
| F2 | **User ID System** - Generate/store unique user IDs | HIGH | 🔴 Not Started | Backend consideration |
| F3 | **Toolbar User Tab** - Show logged-in user at far right of toolbar | MEDIUM | 🔴 Not Started | Username display |
| F4 | **Session Management** - Handle login state, tokens, logout | MEDIUM | 🔴 Not Started | Security consideration |

### PHASE G: Payment System (Stripe)

| # | Task | Priority | Status | Notes |
|---|------|----------|--------|-------|
| G1 | **Stripe Integration** - Set up Stripe account and API keys | HIGH | 🔴 Not Started | Payment foundation |
| G2 | **Price Options Page** - Design and implement pricing tiers | HIGH | 🔴 Not Started | User has GPT work in progress |
| G3 | **Payment Flow** - Checkout, subscription management | HIGH | 🔴 Not Started | Stripe Checkout or custom |
| G4 | **Subscription Gating** - Lock features behind paid tiers | MEDIUM | 🔴 Not Started | Feature access control |

---

## TASK PRIORITY MATRIX

### CRITICAL (Fix Immediately)
- B3: Multi-LLM Field Sources Missing
- B4: Field-by-Field Comparison References

### HIGH PRIORITY
- A1-A3: Domain & Deployment
- B1-B2: Perplexity Data Sources
- D1: Gamma 50-Page Setting
- E1-E4: Ask Olivia Feature
- F1-F2: Login System
- G1-G2: Stripe Integration

### MEDIUM PRIORITY
- C1-C6: UI/UX Improvements
- F3-F4: User Session
- G3-G4: Payment Flow

### LOW PRIORITY
- D2-D3: Gamma Polish

---

## TECHNICAL NOTES

### LLM Providers (5 Evaluators + 1 Judge)

| Provider | Type ID | Actual API Model | Web Search Method |
|----------|---------|------------------|-------------------|
| Claude Sonnet 4.5 | `claude-sonnet` | `claude-sonnet-4-5-20250929` | Tavily API |
| GPT-5.2 | `gpt-5.2` | `gpt-5.2` | Native web_search tool |
| Gemini 3 Pro | `gemini-3-pro` | `gemini-3-pro-preview` | Google Search grounding |
| Grok 4 | `grok-4` | `grok-4` | Native search: true |
| Perplexity | `perplexity` | `sonar-reasoning-pro` | Native (return_citations) |
| **Judge** | `claude-opus` | `claude-opus-4-5-20251101` | N/A (judge only) |

### API Keys (All Configured in Vercel)
- Anthropic (Claude) ✓
- OpenAI (GPT-5.2) ✓
- Google (Gemini) ✓
- xAI (Grok) ✓
- Perplexity ✓
- Tavily ✓
- Gamma ✓

**NEVER ask user to configure API keys - they are done.**

---

## DOMAIN SETUP GUIDE (clueslifescore.com)

### Step 1: GoDaddy DNS Configuration
1. Log into GoDaddy → DNS Management for clueslifescore.com
2. Remove existing A records pointing elsewhere
3. Add Vercel DNS records:
   - Type: `A` | Name: `@` | Value: `76.76.21.21`
   - Type: `CNAME` | Name: `www` | Value: `cname.vercel-dns.com`

### Step 2: Vercel Domain Configuration
1. Vercel Dashboard → Project → Settings → Domains
2. Add domain: `clueslifescore.com`
3. Add domain: `www.clueslifescore.com`
4. Wait for SSL certificate (automatic)

### Step 3: Verify
1. Wait 24-48 hours for DNS propagation
2. Test: https://clueslifescore.com
3. Test: https://www.clueslifescore.com (should redirect)

---

## SCORING SYSTEM EXPLANATION (For About Card - C2)

**Draft copy for "About Enhanced Comparison" card:**

> **How LIFE SCORE™ Works**
>
> Our system uses a multi-model consensus approach to evaluate freedom metrics objectively:
>
> 1. **Independent Evaluation**: Multiple AI research models independently analyze each of the 100 freedom metrics using real-time web data from authoritative sources.
>
> 2. **Evidence-Based Scoring**: Each metric is scored based on verifiable data - laws, regulations, statistics, and government policies - not opinions or rankings.
>
> 3. **The Judge**: A specialized AI model reviews all independent evaluations, identifies consensus and disagreements, and produces the final balanced score. This "judge" weighs the evidence and reasoning from each evaluator.
>
> 4. **Transparency**: Every score links to the specific data sources used, so you can verify the findings yourself.
>
> The result is a data-driven freedom comparison that's more comprehensive and less biased than any single source could provide.

---

## NEW SESSION CHECKLIST

When starting a new conversation:
```
1. "Read D:\LifeScore\MASTER_README.md"
2. Run: git log --oneline -5
3. Run: git status
4. Confirm current phase and task
5. Begin work
```

---

## COMPRESSION PROTOCOL

### At 50% Context (~100k tokens)
- Claude will warn: "We're at 50% token capacity"
- **Action**: Continue but be aware

### At 70% Context (~140k tokens)
- Claude will warn: "We're at 70% - consider wrapping up soon"
- **Action**: Commit current work, push, update this file

### At 85% Context (~170k tokens)
- Claude will alert: "We should start a new conversation NOW"
- **Action**:
  1. STOP coding immediately
  2. Commit and push ALL changes
  3. Update MASTER_README.md with exact stopping point
  4. Start new conversation with: "Read D:\LifeScore\MASTER_README.md and continue"

---

## FILES MODIFIED THIS SESSION

*(To be updated as work progresses)*

---

## COMMITS THIS SESSION

*(To be updated as work progresses)*

---

**END OF MASTER README**
