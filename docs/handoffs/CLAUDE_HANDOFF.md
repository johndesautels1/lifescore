# LIFE SCORE™ - Claude Implementation Handoff

## Quick Start for New Claude Session

**Project Location:** `D:\LifeScore`
**Run Dev Server:** `cd D:\LifeScore && npm run dev`
**Build:** `cd D:\LifeScore && npm run build`

---

## Current App State (Fully Functional)

### Tech Stack
- **Vite 7** + **React 19** + **TypeScript**
- Custom CSS with CSS variables (no Tailwind)
- localStorage + GitHub Gist for data persistence
- Planned: Vercel serverless deployment

### What's Working Now
1. **200 Metro Searchable Dropdown** - 100 North America + 100 Europe cities
2. **Standard Comparison** - Single LLM scoring
3. **Enhanced Comparison** - 5 LLMs + Claude Opus as judge
4. **100 LIFE Metrics** across 6 categories with icons
5. **Expandable Category Details** - Click to see all field scores
6. **Save/Share/Export** - localStorage save, Web Share API, JSON export
7. **Dark Mode Toggle**

### 6 LLM Providers Configured
| Provider | Model | API Endpoint |
|----------|-------|--------------|
| OpenAI | GPT-4o | api.openai.com |
| Google | Gemini 3 Pro | generativelanguage.googleapis.com |
| xAI | Grok 4 | api.x.ai |
| Anthropic | Claude Sonnet 4.5 | api.anthropic.com |
| Perplexity | Sonar Reasoning Pro | api.perplexity.ai |
| Anthropic | Claude Opus 4.5 (Judge) | api.anthropic.com |

### The 100 LIFE Metrics (6 Categories)
1. **Personal Freedom & Morality** (15 metrics)
2. **Housing & Property Rights** (20 metrics)
3. **Business & Work Regulation** (25 metrics)
4. **Transportation & Movement** (15 metrics)
5. **Policing & Legal System** (15 metrics)
6. **Speech & Lifestyle Freedom** (10 metrics)

---

## Key Files to Know

```
D:\LifeScore\
├── src/
│   ├── App.tsx                    # Main app component
│   ├── components/
│   │   ├── CitySelector.tsx       # Metro dropdown & comparison trigger
│   │   ├── EnhancedComparison.tsx # Multi-LLM comparison UI + icons
│   │   ├── Results.tsx            # Standard comparison results
│   │   └── SavedComparisons.tsx   # Saved comparisons list
│   ├── data/
│   │   ├── metrics.ts             # 100 metric definitions
│   │   └── metros.ts              # 200 city definitions
│   ├── services/
│   │   ├── enhancedComparison.ts  # LLM API calls
│   │   └── savedComparisons.ts    # Storage service
│   └── types/
│       ├── metrics.ts             # Type definitions
│       └── enhancedComparison.ts  # Enhanced comparison types
├── docs/
│   ├── HANDOFF_FOR_AI_CONSULTANTS.md  # Full vision document
│   └── LIFE-SCORE-100-METRICS.md      # Metric details
└── package.json
```

---

## LLM Suggestions Document Location

**The unified LLM suggestions are at:**
`D:\Clues Life Score\LIFE_SCORE_LLM_Analysis_v3_UNIFIED.md`

Read this file first to understand what improvements the other LLMs suggested.

---

## Brand/Style Guidelines (CRITICAL)

**DO NOT use light gray text on light backgrounds. The user has zero tolerance for this.**

| Element | Style |
|---------|-------|
| Important labels | Bold + Cobalt Blue (#0047AB) or Gold (#D4AF37) |
| Metric names | Orange (#F7931E), bold |
| Winning scores | Cobalt blue background (#0047AB), white text, bold |
| Losing scores | White background, red text (#DC2626), NOT bold |
| Headers | Cobalt blue gradient background, white text |
| City labels | White on blue header, or gold on light background |
| Never use | Gray text on gray/white backgrounds, cursive fonts |

---

## Features to Implement (Grand Vision)

### Phase 1: Dashboard Tabs
Create a tabbed interface with:
1. **Compare** - Current main view
2. **Advanced Visuals** - Charts, graphs, visualizations
3. **Ask Olivia** - AI avatar (D-ID/HeyGen) Q&A
4. **View My Report** - Gamma-generated PDF reports
5. **Profile/Login** - User authentication

### Phase 2: Authentication
- Email/password login
- GitHub Gist storage for user data
- Saved comparisons synced to cloud
- User preferences persistence

### Phase 3: Vercel API Integration
- Serverless functions to hide API keys
- Environment variables for LLM keys
- Rate limiting per user

### Phase 4: Advanced Visualizations
- Spider/Radar graphs (6 categories comparison)
- Bar charts (metric-by-metric)
- Speedometer gauges (overall score)
- Trend charts (freedom trajectory over time)
- Heat maps (quick visual wins/losses)

### Phase 5: Mobile Optimization
- Responsive CSS (mobile-first)
- Capacitor wrapper for App Store/Play Store
- Touch-friendly UI

### Phase 6: Social Media Optimization
- Shareable comparison graphics
- Open Graph images
- "City X beats City Y" social cards

---

## Git History (Recent)

```
c783d91 Add AI consultant handoff document with grand vision roadmap
b9835e8 Fix all 100 metric icons to match exact shortNames from metrics.ts
574de0d UI polish: fix LLM providers, add save/share, redesign metric tables
499446a Fix enhanced results: add expandable field-by-field metric comparisons
b2ee06c Add Enhanced Comparison feature with multi-LLM consensus
7bf645e Add 200 metro searchable dropdown (100 NA + 100 EU)
```

---

## Important User Preferences

1. **Always commit changes** - User wants git commits after significant work
2. **No light text on light backgrounds** - Use high contrast always
3. **Bold, readable fonts** - Never cursive, always legible
4. **Test before claiming done** - Verify changes actually work
5. **Read files before editing** - Don't assume, verify
6. **Icons for all 100 metrics** - Each metric must have a unique emoji icon
7. **Orange for metric names** - #F7931E
8. **Cobalt blue for winners** - #0047AB background
9. **Red for losers** - #DC2626 text

---

## How to Start

1. Read the LLM suggestions: `D:\Clues Life Score\LIFE_SCORE_LLM_Analysis_v3_UNIFIED.md`
2. Check current app: `cd D:\LifeScore && npm run dev`
3. Pick a feature from the suggestions to implement
4. Implement incrementally, commit often
5. Test in browser before claiming complete

---

## Commands Reference

```bash
# Start dev server
cd D:\LifeScore && npm run dev

# Build for production
cd D:\LifeScore && npm run build

# Check git status
cd D:\LifeScore && git status

# Commit changes
cd D:\LifeScore && git add -A && git commit -m "message"

# View recent commits
cd D:\LifeScore && git log --oneline -10
```

---

*Handoff created: January 2026*
*App: LIFE SCORE™ by John E. Desautels II & Associates*
