# LIFE SCORE

**Legal Independence & Freedom Evaluation**

Compare cities across **100 freedom metrics** in **6 categories** using multi-AI consensus scoring. Part of the **CLUES** (Comprehensive Location & Utility Evaluation System) platform by **Clues Intelligence LTD**.

**Live:** [lifescore.app](https://lifescore.app) | **Stack:** React 19 + TypeScript + Vite + Vercel + Supabase

---

## Overview

LIFE SCORE evaluates and compares cities on 100 legal freedom metrics spanning personal autonomy, housing, business regulation, transportation, policing, and speech/lifestyle. Users select two cities, choose Standard (1 AI) or Enhanced (5 AI) mode, and receive a detailed comparison with scores, evidence, AI judge verdict, visual reports, cinematic videos, and AI assistant analysis.

---

## Architecture

```
Frontend (React 19 + TypeScript + Vite)
    │
    ├── 55 Components  ·  21 Hooks  ·  18 Services
    │
    ▼
Vercel Serverless Functions (Node.js 20)
    │
    ├── 52 API Endpoints  ·  15 Shared Modules
    │
    ▼
Supabase (PostgreSQL)
    │
    ├── 26 Tables  ·  6 Storage Buckets  ·  45 Migrations
    │
    ▼
External Services
    ├── AI Evaluators:  Claude Sonnet 4.5 · GPT-4o · Gemini 3.1 Pro · Grok 4 · Perplexity Sonar
    ├── AI Judge:       Claude Opus 4.5 (consensus analysis)
    ├── Web Research:   Tavily API
    ├── Payments:       Stripe
    ├── Reports:        Gamma (PDF/PPTX generation)
    ├── Video:          Kling AI · Replicate · InVideo · HeyGen
    ├── Voice/Avatar:   ElevenLabs · OpenAI TTS · D-ID · Simli
    └── Email:          Resend
```

---

## Scoring System

### 100 Metrics in 6 Categories

| Category | Metrics | Weight |
|----------|--------:|-------:|
| Personal Autonomy | 15 | 20% |
| Housing & Property | 20 | 20% |
| Business & Work | 25 | 20% |
| Transportation | 15 | 15% |
| Policing & Legal | 15 | 15% |
| Speech & Lifestyle | 10 | 10% |

### Dual-Score System

Each metric produces 4 raw scores (0-100): Legal and Enforcement for each city.

```
normalizedScore = (legalScore × lawWeight + enforcementScore × livedWeight) / 100
Default: 50/50 weighting (adjustable via Law vs Lived Reality slider)
Worst-Case Mode: MIN(legalScore, enforcementScore)
```

### Comparison Modes

| Mode | AI Providers | Web Research | Use Case |
|------|:---:|---|---|
| **Standard** | 1 (Claude Sonnet) | Tavily pre-fetch | Fast, accurate (2-3 min) |
| **Enhanced** | 5 (Claude, GPT-4o, Gemini, Grok, Perplexity) | Tavily + Google + X + Sonar | Consensus scoring (5-8 min) |

### Web Research Integration

| Provider | Research Method |
|----------|----------------|
| Claude Sonnet | Tavily API pre-fetch |
| GPT-4o | Tavily API pre-fetch |
| Gemini 3.1 Pro | Google Search Grounding |
| Grok 4 | Native X search |
| Perplexity Sonar | Tavily API + Native Sonar search |

### The Judge

Claude Opus 4.5 serves as the impartial Judge, analyzing all provider scores to produce:
- Consensus scoring with disagreement detection
- Category-by-category analysis with trend identification
- Final verdict with winner declaration
- Confidence levels: unanimous / strong / moderate / split

---

## Subscription Tiers

| Feature | FREE | NAVIGATOR ($29/mo) | SOVEREIGN ($99/mo) |
|---------|:----:|:-------------------:|:-------------------:|
| Standard Comparisons | 1/mo | 1/mo | 1/mo |
| Enhanced Mode (5 AIs) | - | - | 1/mo |
| Olivia AI Minutes | - | 15/mo | 60/mo |
| Judge Verdict | - | 1/mo | 1/mo |
| Gamma Reports | - | 1/mo | 1/mo |
| Grok/Kling Videos | - | - | 1/mo |
| InVideo Movies | - | - | 1/mo |
| Cloud Sync | - | Yes | Yes |

Annual pricing: NAVIGATOR $249/yr, SOVEREIGN $899/yr. Payments via Stripe.

**Source of truth:** `src/hooks/useTierAccess.ts`

---

## Key Features

### Olivia AI Assistant (5 Independent Systems)

| System | Service | Purpose |
|--------|---------|---------|
| Ask Olivia Chat | OpenAI Assistants API | Intelligent Q&A about comparisons |
| Olivia Voice (TTS) | ElevenLabs → OpenAI fallback | Cloned voice for chat responses |
| Live Presenter | HeyGen Streaming v1 (WebRTC) | Real-time avatar over Gamma reports |
| Video Presenter | HeyGen Video v2 | Pre-rendered MP4 narration |
| Cockpit Avatar | D-ID Streams (WebRTC) | Ask Olivia page TV viewport |

### Cristiano "Go To My New City" Video

HeyGen Video Agent V2 cinematic tour. 2-stage pipeline: Claude generates 7-scene storyboard, HeyGen renders with B-roll and transitions.

### Visual Reports (Gamma)

Two-tab layout: Generate New Report / View Existing Report. Three view modes: Read (iframe), Live Presenter (HeyGen streaming), Generate Video (HeyGen MP4). PDF/PPTX exports permanently stored in Supabase.

### InVideo Movie Pipeline (SOVEREIGN Tier)

10-minute cinematic movie from comparison data. 3-stage process:
1. **Screenplay** — Claude writes 12-scene, 5-act screenplay
2. **Rendering** — InVideo AI renders the movie
3. **Polling** — Status checks every 10s (up to 30 min)

### Court Order Video (SOVEREIGN Tier)

10-second "perfect life" cinematic scene via Kling AI (Replicate Minimax fallback). Admin VIP override system for custom videos.

### New Life Videos

AI-generated Freedom vs Imprisonment contrast videos via Kling AI / Replicate.

### Notification System

Bell icon with unread badge, "Notify Me & Go" modal for long-running tasks, email via Resend (alerts@lifescore.app), 30-second polling.

---

## Database Schema

### 26 Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (id, email, tier) |
| `comparisons` | Saved comparison results |
| `subscriptions` | Stripe billing records |
| `usage_tracking` | Monthly feature limits |
| `olivia_conversations` | Olivia chat threads |
| `olivia_messages` | Olivia chat messages |
| `gamma_reports` | Report URLs + permanent storage paths |
| `judge_reports` | Judge verdicts (unique on user_id, report_id) |
| `avatar_videos` | Judge video cache |
| `grok_videos` | Kling/Replicate video cache |
| `cristiano_city_videos` | Cristiano city tour video cache |
| `movie_videos` | InVideo 10-min movie records |
| `invideo_overrides` | Admin cinematic video overrides |
| `report_shares` | Shared report links |
| `report_access_logs` | Report view tracking |
| `reports` | HTML reports per user |
| `contrast_image_cache` | Olivia contrast images |
| `user_preferences` | Per-user settings (JSONB) |
| `consent_logs` | GDPR consent records |
| `app_prompts` | 50 system prompts (6 categories) |
| `api_cost_records` | Cost tracking per provider |
| `api_quota_settings` | Admin quota limits (16 providers) |
| `api_quota_alert_log` | Quota email alert history |
| `authorized_manual_access` | Help manual access control |
| `jobs` | Persistent job queue |
| `notifications` | In-app + email notification records |

### 6 Storage Buckets

| Bucket | Size Limit | Purpose |
|--------|-----------|---------|
| `reports` | 200 MB | HTML reports (private, RLS) |
| `user-videos` | 100 MB | User-uploaded Court Order videos |
| `contrast-images` | 5 MB | Contrast image copies |
| `judge-videos` | 50 MB | Judge avatar videos |
| `court-order-videos` | 50 MB | Court Order videos |
| `gamma-exports` | 50 MB | Gamma PDF/PPTX (public) |

---

## API Endpoints (52)

### Core
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/evaluate` | POST | City evaluation (Tavily + LLM) |
| `/api/judge-report` | POST | Judge analysis |
| `/api/judge` | POST | Opus consensus builder |
| `/api/judge-video` | POST | Judge video generation |
| `/api/health` | GET | Health check |
| `/api/warmup` | GET | Cold start warmup |
| `/api/test-llm` | POST | LLM connectivity test |
| `/api/kv-cache` | GET/POST | KV cache operations |

### Video
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/video/grok-generate` | POST | Kling/Replicate video generation |
| `/api/video/grok-status` | GET | Video status polling |
| `/api/video/invideo-override` | GET/POST/DELETE | Admin VIP video overrides |

### Movie (SOVEREIGN Tier Required)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/movie/screenplay` | POST | 12-scene screenplay (Claude, 310s) |
| `/api/movie/generate` | POST/GET | InVideo submission + status (300s) |

### Olivia
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/olivia/chat` | POST | Chat (OpenAI Assistants API) |
| `/api/olivia/context` | POST | Comparison data → Olivia context |
| `/api/olivia/tts` | POST | ElevenLabs TTS + OpenAI fallback |
| `/api/olivia/field-evidence` | POST | Metric source evidence |
| `/api/olivia/gun-comparison` | POST | Standalone gun rights comparison |
| `/api/olivia/contrast-images` | POST | AI contrast images (Flux) |
| `/api/olivia/avatar/heygen` | POST | HeyGen Live Presenter streaming |
| `/api/olivia/avatar/heygen-video` | POST/GET | HeyGen pre-rendered video |
| `/api/olivia/avatar/streams` | POST | D-ID cockpit avatar |
| `/api/olivia/avatar/did` | POST | D-ID Agents (deprecated) |

### Cristiano
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cristiano/storyboard` | POST | 7-scene storyboard (Claude) |
| `/api/cristiano/render` | POST | HeyGen Video Agent V2 |

### Emilia (Help Center)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/emilia/thread` | POST | Create thread (JWT auth) |
| `/api/emilia/message` | POST | Send message |
| `/api/emilia/speak` | POST | Emilia TTS |
| `/api/emilia/manuals` | GET | Documentation (JWT auth) |

### Stripe
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stripe/create-checkout-session` | POST | Start checkout |
| `/api/stripe/webhook` | POST | Handle events |
| `/api/stripe/create-portal-session` | POST | Billing portal |
| `/api/stripe/get-subscription` | GET | Current subscription |

### Avatar
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/avatar/simli-session` | POST | Simli streaming session |
| `/api/avatar/simli-speak` | POST | Simli text-to-speech |
| `/api/avatar/generate-judge-video` | POST | Replicate video |
| `/api/avatar/video-status` | GET | Video generation status |
| `/api/avatar/video-webhook` | POST | Video completion webhook |
| `/api/simli-config` | GET | Simli configuration |

### Admin
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin-check` | GET | Admin status verification |
| `/api/admin/env-check` | GET | Environment variable audit |
| `/api/admin/new-signup` | POST | New user signup notification |
| `/api/admin/sync-emilia-knowledge` | POST | Sync Emilia knowledge base |
| `/api/admin/sync-olivia-knowledge` | POST | Sync Olivia knowledge base |

### Other
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gamma` | POST/GET | Visual report generation |
| `/api/prompts` | GET/POST/PUT | System prompts (admin) |
| `/api/notify` | POST | In-app + email notification |
| `/api/consent/log` | POST | GDPR consent logging |
| `/api/usage/check-quotas` | GET | API quota monitoring |
| `/api/usage/elevenlabs` | GET | ElevenLabs usage stats |
| `/api/user/delete` | POST | GDPR account deletion |
| `/api/user/export` | GET | GDPR data export |

---

## Frontend Components (55)

### Core
`App` · `Header` · `Footer` · `LoginScreen` · `ResetPasswordScreen` · `TabNavigation` · `ThemeToggle` · `ErrorBoundary` · `LoadingState`

### Comparison
`CitySelector` · `EnhancedComparison` · `Results` · `SavedComparisons` · `FreedomCategoryTabs` · `FreedomMetricsList` · `FreedomHeroFooter` · `DealbreakersPanel` · `DealbreakersWarning` · `WeightPresets` · `EvidencePanel` · `AdvancedVisuals` · `ScoreMethodology` · `DataSourcesModal` · `ContrastDisplays`

### AI Assistants
`AskOlivia` · `OliviaChatBubble` · `OliviaAvatar` · `EmiliaChat` · `HelpBubble` · `HelpModal` · `ManualViewer`

### Judge & Video
`JudgeTab` · `JudgeVideo` · `CourtOrderVideo` · `NewLifeVideos` · `GoToMyNewCity` · `MovieGenerator` · `VideoPhoneWarning`

### Reports
`VisualsTab` · `ReportPresenter` · `GammaIframe` · `AboutClues`

### Settings & Billing
`SettingsModal` · `CostDashboard` · `PricingModal` · `PricingPage` · `FeatureGate` · `UsageWarningBanner` · `PromptsManager` · `EnvConfigPanel`

### Notifications & Modals
`NotificationBell` · `NotifyMeModal` · `MobileWarningModal` · `CookieConsent` · `LegalModal` · `GunComparisonModal`

---

## Hooks (21)

| Hook | Purpose |
|------|---------|
| `useTierAccess` | Tier limits (SOURCE OF TRUTH) |
| `useComparison` | Comparison state machine |
| `useGrokVideo` | Video generation + polling |
| `useOliviaChat` | Olivia conversation |
| `useSimli` | WebRTC avatar session |
| `useTTS` | Text-to-speech |
| `useEmilia` | Emilia help widget |
| `useNotifications` | Notification polling (30s) |
| `useJobTracker` | Job creation + status |
| `useCristianoVideo` | Freedom tour video |
| `useContrastImages` | AI contrast images |
| `useGunComparison` | Gun rights comparison |
| `useJudgeVideo` | Judge video generation |
| `useAvatarProvider` | Avatar provider selection |
| `useDIDStream` | D-ID streaming |
| `useDraggable` | Draggable UI elements |
| `useFocusTrap` | Modal focus trapping |
| `useVoiceRecognition` | Speech-to-text input |
| `useApiUsageMonitor` | API quota monitoring |
| `useOGMeta` | Open Graph meta tags |
| `useURLParams` | URL parameter parsing |

---

## Services (18)

| Service | Purpose |
|---------|---------|
| `movieService` | InVideo movie orchestration |
| `llmEvaluators` | Multi-LLM evaluation runner |
| `opusJudge` | Opus consensus builder |
| `gammaService` | Gamma report generation |
| `grokVideoService` | Kling/Replicate video API |
| `cristianoVideoService` | HeyGen city tour video |
| `presenterService` | Narration script generator |
| `presenterVideoService` | Video orchestration + polling |
| `oliviaService` | Olivia API integration |
| `contrastImageService` | AI contrast images |
| `savedComparisons` | Local + cloud save/load |
| `databaseService` | Supabase operations |
| `reportStorageService` | Report persistence |
| `videoStorageService` | Video persistence |
| `enhancedComparison` | Enhanced mode orchestration |
| `judgePregenService` | Judge pre-generation |
| `rateLimiter` | Client-side rate limiting |
| `cache` | Client-side caching |

---

## Authentication

**Provider:** Supabase Auth (GoTrue)

**Sign-in methods:** Email/Password, Google OAuth, GitHub OAuth, Magic Link

**Password reset flow:**
LoginScreen → `resetPasswordForEmail()` → email with recovery JWT (1hr TTL) → `/auth/callback` → PASSWORD_RECOVERY event → ResetPasswordScreen → `updateUser({ password })` → main app

---

## Test Infrastructure

**Framework:** Vitest | **Location:** `tests/` | **Suite:** 100 tests across 7 files

| Test File | Tests | Coverage |
|-----------|------:|----------|
| `costCalculator.test.ts` | 31 | LLM/TTS/Avatar/Video cost calculations |
| `scoring.test.ts` | 26 | Score normalization, comparisons |
| `rateLimit.test.ts` | 18 | Rate limiter presets, blocking |
| `scoringThresholds.test.ts` | 9 | Confidence levels, disagreement |
| `metricDisplayNames.test.ts` | 7 | All 100 metric display names |
| `fetchWithTimeout.test.ts` | 5 | Timeout behavior |
| `countryFlags.test.ts` | 4 | Flag URLs for 34 countries |

```bash
npm test          # Single run
npm run test:watch # Watch mode
```

---

## Environment Variables

### Required (Production)
```
VITE_SUPABASE_URL              SUPABASE_URL
VITE_SUPABASE_ANON_KEY         SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY              OPENAI_API_KEY
TAVILY_API_KEY                 STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET          RESEND_API_KEY
```

### Required (Features)
```
ELEVENLABS_API_KEY             ELEVENLABS_OLIVIA_VOICE_ID
SIMLI_API_KEY                  KLING_VIDEO_API_KEY
KLING_VIDEO_SECRET             REPLICATE_API_TOKEN
GAMMA_API_KEY                  EMILIA_ASSISTANT_ID
OPENAI_ASSISTANT_ID
```

### Optional
```
GEMINI_API_KEY                 GROK_API_KEY
PERPLEXITY_API_KEY             DID_API_KEY
HEYGEN_API_KEY                 HEYGEN_OLIVIA_AVATAR_ID
HEYGEN_OLIVIA_VOICE_ID         HEYGEN_CRISTIANO_AVATAR_ID
HEYGEN_CRISTIANO_VOICE_ID      HEYGEN_AVATAR_LOOK_ID
INVIDEO_MCP_URL                INVIDEO_API_KEY
KV_REST_API_URL                KV_REST_API_TOKEN
DEV_BYPASS_EMAILS
```

---

## Project Structure

```
lifescore/
├── api/                    # Vercel serverless functions (52 endpoints)
│   ├── shared/             # Shared modules (auth, cors, rate limit, metrics)
│   ├── olivia/             # Olivia AI endpoints (chat, TTS, avatars)
│   ├── emilia/             # Emilia help center endpoints
│   ├── cristiano/          # Cristiano city tour video
│   ├── movie/              # InVideo movie pipeline
│   ├── video/              # Kling/Replicate video generation
│   ├── stripe/             # Payment endpoints
│   ├── avatar/             # Simli/Replicate avatar endpoints
│   ├── admin/              # Admin tools
│   ├── usage/              # Quota monitoring
│   ├── user/               # GDPR endpoints (export, delete)
│   └── consent/            # Consent logging
├── src/                    # React frontend
│   ├── components/         # 55 React components
│   ├── hooks/              # 21 custom hooks
│   ├── services/           # 18 service modules
│   ├── contexts/           # AuthContext, ThemeContext
│   ├── types/              # TypeScript type definitions
│   ├── shared/             # Shared utilities (metricDisplayNames)
│   ├── constants/          # Scoring thresholds, config
│   ├── data/               # Metrics definitions
│   ├── lib/                # fetchWithTimeout
│   ├── api/                # Client-side API helpers
│   └── utils/              # Utility functions
├── supabase/               # 45 SQL migrations
├── tests/                  # 7 test files (100 tests)
├── docs/                   # Documentation
│   ├── manuals/            # 7 support manuals
│   └── legal/              # Legal compliance docs + DPAs
├── public/                 # Static assets
└── scripts/                # Build/utility scripts
```

---

## Codebase Statistics

| Metric | Count |
|--------|------:|
| **Total lines of code** | ~125,000 |
| Frontend (src/) | 95,000 |
| Backend (api/) | 23,500 |
| Database (supabase/) | 6,100 |
| React components | 55 |
| Custom hooks | 21 |
| Service modules | 18 |
| API endpoints | 52 |
| Shared API modules | 15 |
| Database tables | 26 |
| Storage buckets | 6 |
| SQL migrations | 45 |
| CSS files | 110 |
| Test files | 7 (100 tests) |

---

## Development

### Local Development
```bash
npm install
npm run dev
```

### Deployment
Vercel auto-deploys from `main` branch. No local builds needed.

```bash
git add <files>
git commit -m "description"
git push origin main
```

### Testing
```bash
npm test
```

---

## Security

- JWT authentication on all sensitive endpoints
- Supabase Row Level Security (RLS) on all tables
- Admin authorization via `authorized_manual_access` table + `DEV_BYPASS_EMAILS`
- Rate limiting on all API endpoints (heavy/standard/light/health presets)
- CORS restricted to same-app origin
- GDPR: data export (`/api/user/export`), account deletion (`/api/user/delete`), consent logging

---

## Legal & Compliance

**Company:** Clues Intelligence LTD
**Address:** 167-169 Great Portland Street, 5th Floor, London W1W 5PF, United Kingdom
**ICO Registration:** Required (UK data controller)

DPA status, compliance checklist, and legal policies in `docs/legal/`.

---

## License

UNLICENSED - Clues Intelligence LTD. All rights reserved.
