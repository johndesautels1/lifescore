# HANDOFF: Generate Complete LIFE SCORE Master Schema

**From:** Session LIFESCORE-DEBUG-20260202-004
**Date:** February 2, 2026
**To:** Next Agent Session
**Priority:** HIGH

---

## MISSION

Generate the **COMPLETE MASTER SCHEMA** of the LIFE SCORE application. This document will serve as:
1. The definitive technical reference for the entire codebase
2. Content for the Emilia knowledge base (App Schema Manual - Item 12.1)
3. Onboarding documentation for future developers
4. Architecture documentation for compliance/audits

---

## WHAT TO GENERATE

### 1. DATABASE SCHEMA (Supabase/PostgreSQL)

Read and document ALL tables from:
- `supabase/migrations/*.sql`
- `src/types/database.ts`

For each table document:
- Table name
- All columns with types
- Primary keys, foreign keys
- Indexes
- RLS policies
- Relationships to other tables

**Known tables (17+):**
- users, profiles
- comparisons, enhanced_comparisons
- judge_reports, judge_videos
- gamma_reports
- api_usage, api_quota_settings
- olivia_threads, olivia_messages
- emilia_threads
- authorized_manual_access
- grok_videos
- subscriptions
- usage_tracking
- (verify complete list)

---

### 2. API ENDPOINTS

Document ALL endpoints from `api/` folder:

#### Evaluation APIs
- `POST /api/evaluate` - City evaluation
- `POST /api/evaluate-enhanced` - Multi-LLM evaluation
- `POST /api/judge-report` - Opus Judge analysis

#### Olivia APIs
- `POST /api/olivia/chat` - Chat with Olivia
- `POST /api/olivia/thread` - Thread management
- `POST /api/olivia/tts` - Text-to-speech

#### Emilia APIs
- `POST /api/emilia/thread` - Create thread
- `POST /api/emilia/message` - Send message
- `POST /api/emilia/speak` - TTS for Emilia
- `GET /api/emilia/manuals` - Get documentation

#### Avatar/Video APIs
- `POST /api/avatar/generate-judge-video` - Replicate Wav2Lip
- `GET /api/avatar/video-status` - Check video status
- `POST /api/judge-video` - Legacy D-ID endpoint
- `POST /api/grok-video` - Grok/Kling video generation

#### Gamma APIs
- `POST /api/gamma/generate` - Generate report
- `GET /api/gamma/status` - Check generation status

#### User APIs
- `POST /api/user/delete` - Delete account (GDPR)
- `GET /api/user/export` - Export data (GDPR)
- `GET /api/check-quotas` - Usage limits
- `POST /api/create-checkout-session` - Stripe
- `POST /api/webhook` - Stripe webhooks

For each endpoint document:
- Method, path
- Request body schema
- Response schema
- Authentication required
- Rate limits
- Error codes

---

### 3. COMPONENT ARCHITECTURE

Document ALL React components from `src/components/`:

**Main App Structure:**
- `App.tsx` - Root component, routing, state management
- `MainLayout.tsx` - Layout wrapper

**Core Feature Components:**
- `CitySelector.tsx` - City dropdowns
- `ComparisonView.tsx` - Results display
- `EnhancedComparisonView.tsx` - Multi-LLM results
- `CategorySection.tsx` - Expandable sections
- `MetricCard.tsx` - Individual metrics
- `FreedomCards.tsx` - Score cards

**Judge Components:**
- `JudgeTab.tsx` - Judge verdict page
- `CourtOrderVideo.tsx` - Perfect life video

**Olivia Components:**
- `AskOlivia.tsx` - Chat interface
- `OliviaBubble.tsx` - Floating bubble

**Emilia Components:**
- `HelpModal.tsx` - Help center
- `EmiliaChat.tsx` - Help chat

**Visuals Components:**
- `VisualsTab.tsx` - Reports & videos
- `NewLifeVideos.tsx` - City videos

**Settings/Auth Components:**
- `SettingsModal.tsx` - Account settings (4 tabs)
- `PricingModal.tsx` - Subscription plans
- `PricingPage.tsx` - Full pricing page
- `FeatureGate.tsx` - Tier access control

**Utility Components:**
- `CostDashboard.tsx` - API cost tracking
- `SavedComparisons.tsx` - Saved reports

---

### 4. STATE MANAGEMENT

Document:
- React Context providers (`src/contexts/`)
  - `AuthContext.tsx` - User authentication
  - Others if any
- Custom hooks (`src/hooks/`)
  - `useTierAccess.ts` - Tier limits (SOURCE OF TRUTH)
  - `useJudgeVideo.ts` - Video generation
  - `useGrokVideo.ts` - Grok videos
  - Others
- localStorage keys used
- State flow diagrams

---

### 5. TYPE DEFINITIONS

Document ALL types from `src/types/`:
- `metrics.ts` - ComparisonResult, CityMetrics
- `enhancedComparison.ts` - EnhancedComparisonResult
- `database.ts` - Database row types
- `avatar.ts` - Video generation types
- `gamma.ts` - Report types
- `grokVideo.ts` - Grok video types
- `apiUsage.ts` - Cost tracking types

---

### 6. SERVICES LAYER

Document `src/services/`:
- `gammaService.ts` - Gamma report generation
- `grokVideoService.ts` - Video service
- `savedComparisons.ts` - localStorage management
- Others

---

### 7. SHARED/CONSTANTS

Document `src/shared/`:
- `metrics.ts` - CATEGORIES, METRICS definitions
- `constants.ts` - App constants

Document `src/data/`:
- `metros.ts` - 200 city definitions

---

### 8. TIER SYSTEM

Document the complete tier structure:

```
FREE ($0):
- 1 comparison/month (1 LLM)
- 0 Olivia minutes
- 0 Judge videos
- 0 Gamma reports
- No cloud sync

NAVIGATOR ($29/mo):
- 1 comparison/month (1 LLM)
- 15 Olivia minutes
- 1 Judge video
- 1 Gamma report
- Cloud sync

SOVEREIGN ($99/mo):
- 1 comparison/month (5 LLMs)
- 60 Olivia minutes
- 1 Judge video
- 1 Gamma report
- Enhanced mode
- Cloud sync
```

---

### 9. EXTERNAL INTEGRATIONS

Document all third-party services:

| Service | Purpose | API Key Env Var |
|---------|---------|-----------------|
| Anthropic Claude | LLM evaluation, Judge | ANTHROPIC_API_KEY |
| OpenAI GPT-4o | LLM evaluation, Olivia, Emilia | OPENAI_API_KEY |
| Google Gemini | LLM evaluation | GOOGLE_API_KEY |
| xAI Grok | LLM evaluation | XAI_API_KEY |
| Perplexity | LLM evaluation + search | PERPLEXITY_API_KEY |
| Tavily | Web search | TAVILY_API_KEY |
| ElevenLabs | TTS voices | ELEVENLABS_API_KEY |
| Replicate | Wav2Lip video | REPLICATE_API_TOKEN |
| Gamma | Report generation | GAMMA_API_KEY |
| Kling/Minimax | Video generation | KLING_* keys |
| Stripe | Payments | STRIPE_* keys |
| Supabase | Database, Auth | SUPABASE_* keys |

---

### 10. FILE STRUCTURE

Generate complete directory tree:
```
lifescore/
├── api/                    # Vercel serverless functions
├── docs/                   # Documentation
│   ├── manuals/           # User, CSM, Tech, Legal manuals
│   ├── handoffs/          # Session handoffs
│   └── legal/             # Legal documents
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities (supabase, etc)
│   ├── services/          # Service layer
│   ├── shared/            # Shared constants
│   ├── types/             # TypeScript types
│   ├── data/              # Static data (metros)
│   └── utils/             # Utility functions
├── supabase/
│   └── migrations/        # Database migrations
└── scripts/               # Build/deploy scripts
```

---

## OUTPUT FORMAT

Generate a single comprehensive markdown file:
`docs/manuals/APP_SCHEMA_MANUAL.md`

Structure:
1. Executive Summary
2. Architecture Overview (with diagram)
3. Database Schema (all tables)
4. API Reference (all endpoints)
5. Component Hierarchy
6. State Management
7. Type Definitions
8. Services Layer
9. External Integrations
10. Environment Variables (complete list)
11. Tier System
12. Data Flow Diagrams
13. Appendix: File Structure

---

## FILES TO READ

Start by reading these key files:
```
src/hooks/useTierAccess.ts          # Tier limits SOURCE OF TRUTH
src/types/*.ts                       # All type definitions
src/shared/metrics.ts                # Categories and metrics
src/components/App.tsx               # Main app structure
api/**/*.ts                          # All API endpoints
supabase/migrations/*.sql            # Database schema
src/data/metros.ts                   # City data
```

---

## CONTEXT

- **Conversation ID:** LIFESCORE-DEBUG-20260202-004
- **Related TODO:** Item 12.1 (Create App Schema Manual)
- **Final Fixes Table:** `FINAL-CODEBASE-FIXES-TABLE.md`
- **This will be used by:** Emilia help system, developers, compliance

---

## SUCCESS CRITERIA

The schema document is complete when:
- [ ] All 17+ database tables documented
- [ ] All API endpoints documented with request/response schemas
- [ ] All React components listed with props
- [ ] All hooks documented with return types
- [ ] All types fully documented
- [ ] Tier system accurately reflects useTierAccess.ts
- [ ] All environment variables listed
- [ ] File structure is accurate
- [ ] Document can serve as single source of truth

---

**END OF HANDOFF**

*Generated: February 2, 2026*
*Session: LIFESCORE-DEBUG-20260202-004*
