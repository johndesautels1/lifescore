# LifeScore Technical Support Manual

**Version:** 4.9
**Last Updated:** February 26, 2026
**Document ID:** LS-TSM-001

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Coding Standards & Developer Guide](#2-coding-standards--developer-guide)
3. [Technology Stack](#3-technology-stack)
4. [API Reference](#4-api-reference)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [LLM Provider Integration](#7-llm-provider-integration)
8. [Tavily Integration](#8-tavily-integration)
9. [Video Generation Pipeline](#9-video-generation-pipeline)
10. [Performance Optimization](#10-performance-optimization)
11. [Error Handling & Logging](#11-error-handling--logging)
12. [Deployment & Infrastructure](#12-deployment--infrastructure)
13. [Debugging Procedures](#13-debugging-procedures)
14. [Known Issues & Workarounds](#14-known-issues--workarounds)
15. [Monitoring & Alerts](#15-monitoring--alerts)
16. [Security Considerations](#16-security-considerations)
17. [API Quota Monitoring System](#17-api-quota-monitoring-system)
18. [TTS Fallback System](#18-tts-fallback-system)
19. [Dual-Storage Save Architecture](#19-dual-storage-save-architecture)
20. [App Prompts System](#20-app-prompts-system-added-2026-02-10)
21. [Dark Mode Fixes for Saved Reports](#21-dark-mode-fixes-for-saved-reports-added-2026-02-14)
22. [AUDIO Badge + Voice Wave Indicator](#22-audio-badge--voice-wave-indicator-added-2026-02-14)
23. [Codebase Statistics](#23-codebase-statistics-added-2026-02-15)

---

## 1. System Architecture

### 1.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  React 19.2 + TypeScript + Vite                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                           │
│  Serverless Functions (Node.js 20)                               │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   SUPABASE    │    │  AI PROVIDERS │    │    MEDIA      │
│  (Database)   │    │  (LLMs)       │    │  SERVICES     │
├───────────────┤    ├───────────────┤    ├───────────────┤
│ - PostgreSQL  │    │ - Anthropic   │    │ - Replicate   │
│ - Auth        │    │ - OpenAI      │    │ - Kling AI    │
│ - Storage     │    │ - Google      │    │ - ElevenLabs  │
│ - RLS         │    │ - xAI (Grok)  │    │ - Gamma       │
└───────────────┘    │ - Perplexity  │    │ - D-ID        │
                     │ - Tavily      │    │ - Simli       │
                     └───────────────┘    │ - Resend      │
                                          └───────────────┘
```

### 1.2 Data Flow

```
User Request → Vercel Function → Tavily Research → LLM Evaluation →
→ Consensus Scoring → Database Storage → Client Response
```

### 1.3 Key Directories

```
lifescore/
├── api/                    # Vercel serverless functions (backend)
│   ├── shared/             #   Shared utilities (auth, CORS, rate limiting)
│   ├── avatar/             #   Judge avatar video generation (Simli, Wav2Lip)
│   ├── olivia/             #   Olivia AI assistant endpoints
│   │   └── avatar/         #     Olivia avatar streaming (WebRTC) + HeyGen video generation
│   ├── video/              #   Grok & InVideo video generation
│   ├── stripe/             #   Billing & subscription management
│   ├── user/               #   User account operations (GDPR delete/export)
│   ├── admin/              #   Admin-only endpoints
│   ├── consent/            #   GDPR consent logging
│   ├── usage/              #   API quota checking
│   └── emilia/             #   Emilia help widget backend
│
├── src/                    # React TypeScript frontend
│   ├── components/         #   React components (UI)
│   ├── services/           #   Business logic & API clients
│   ├── hooks/              #   Custom React hooks
│   ├── types/              #   TypeScript type definitions
│   ├── contexts/           #   React context providers (auth)
│   ├── data/               #   Static data (metrics, cities, tooltips)
│   ├── shared/             #   Code shared between frontend & backend
│   ├── utils/              #   Utility functions
│   └── lib/                #   Library wrappers (Supabase client, etc.)
│
├── supabase/               # Database
│   └── migrations/         #   PostgreSQL migration files (run in order)
│
├── public/                 # Static assets (icons, logos, PWA manifest)
├── scripts/                # Build & utility scripts
├── docs/                   # Documentation
│   ├── legal/              #   Legal compliance (DPAs, GDPR)
│   ├── manuals/            #   User & support manuals
│   └── handoffs/           #   Session handoff notes
└── .claude-temp/           # Temporary files (gitignored)
```

---

## 2. Coding Standards & Developer Guide

This section defines the commenting conventions, naming rules, and structural map that every developer working on LIFE SCORE must follow. For the full standalone reference, see also `docs/CODING_STANDARDS.md`.

### 2.1 File Headers (Required on Every File)

Every `.ts` / `.tsx` file must start with a JSDoc header:

```typescript
/**
 * ComponentName / ServiceName / HookName
 *
 * Brief one-line description of what this file does.
 *
 * Key responsibilities:
 * - Responsibility 1
 * - Responsibility 2
 *
 * Dependencies: list key external services (Supabase, Stripe, Simli, etc.)
 *
 * @module components/EnhancedComparison
 */
```

**For API endpoints, add the route:**

```typescript
/**
 * Evaluate API Endpoint
 *
 * Runs multi-LLM city comparison with Tavily research enrichment.
 *
 * POST /api/evaluate
 *
 * Body: { city1: string, city2: string, metrics: string[], llm: string }
 * Returns: ComparisonResult with scored metrics and evidence
 *
 * Dependencies: OpenAI, Claude, Tavily, Supabase
 *
 * @module api/evaluate
 */
```

### 2.2 Section Dividers

Use section dividers to break large files into logical blocks:

```typescript
// ============================================================================
// SECTION NAME
// ============================================================================
```

Use for: state declarations, event handlers, render helpers, effects, API calls.

Example in a component:

```typescript
// ============================================================================
// STATE & REFS
// ============================================================================

const [cities, setCities] = useState<City[]>([]);
const abortRef = useRef<AbortController | null>(null);

// ============================================================================
// DATA FETCHING
// ============================================================================

const fetchComparison = async () => { ... };

// ============================================================================
// EVENT HANDLERS
// ============================================================================

const handleSubmit = () => { ... };

// ============================================================================
// RENDER
// ============================================================================

return ( ... );
```

### 2.3 Function Comments

**Public / exported functions** — always document with JSDoc:

```typescript
/**
 * Fetches and scores a city comparison using the selected LLM provider.
 *
 * @param city1 - First city name (e.g. "Austin, TX")
 * @param city2 - Second city name (e.g. "Lisbon, Portugal")
 * @param metrics - Array of metric IDs to evaluate
 * @returns Scored comparison result with evidence
 * @throws {ApiError} When the LLM provider is unreachable
 */
export async function evaluateCities(
  city1: string,
  city2: string,
  metrics: string[]
): Promise<ComparisonResult> { ... }
```

**Private / internal functions** — a brief comment is sufficient:

```typescript
/** Normalizes city name for cache key lookup. */
function normalizeCityKey(name: string): string { ... }
```

**Trivial getters/setters** — no comment needed.

### 2.4 Inline Comments

Use inline comments to explain **why**, not **what**:

```typescript
// BAD - describes what the code does (obvious from reading it)
// Set loading to true
setLoading(true);

// GOOD - explains why this specific approach is used
// Abort any in-flight request before starting a new one to prevent race conditions
abortRef.current?.abort();
abortRef.current = new AbortController();
```

### 2.5 Fix & Session Markers

When fixing bugs or making changes tied to a specific session/issue, use this format:

```typescript
// FIX #<number>: Brief description of what was fixed and why
// Example:
// FIX #73: Import cost tracking utilities — was causing undefined errors on CostDashboard

// SESSION <id>: Brief description of what was added/changed
// Example:
// SESSION LIFESCORE-AUDIT-20260123-001: Added GDPR consent logging
```

### 2.6 TODO / FIXME / HACK

Use these markers consistently so they can be grep'd:

```typescript
// TODO: Description of future work needed
// FIXME: Description of known bug that needs fixing
// HACK: Description of workaround — explain WHY it's a hack and what the proper fix would be
// PERF: Performance-related note (optimization applied or needed)
// SECURITY: Security-sensitive code that needs extra review attention
```

### 2.7 SQL Migration Comments

Every migration file must start with:

```sql
-- ============================================================
-- Migration: Short Title
-- Date: YYYY-MM-DD
-- Author: Name
--
-- Purpose:
--   What this migration does and why.
--
-- Tables affected: table1, table2
-- Reversible: yes/no
-- ============================================================
```

For individual statements in migrations, comment what each block does:

```sql
-- Add user_id index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);

-- Drop duplicate index (user_preferences_user_id_idx duplicates the UNIQUE constraint)
DROP INDEX IF EXISTS public.user_preferences_user_id_idx;
```

### 2.8 CSS Comments

Group related styles with headers:

```css
/* ============================================================================
   Component: CitySelector
   ============================================================================ */

/* --- Layout --- */
.container { ... }

/* --- Interactive States --- */
.container:hover { ... }

/* --- Responsive (mobile-first) --- */
@media (max-width: 768px) { ... }
```

### 2.9 What NOT to Comment

- Obvious code (`const count = 0; // initialize count to zero`)
- Closing braces (`} // end if`, `} // end function`)
- Auto-generated code unless modified
- Commented-out code — delete it, git has history

### 2.10 Naming Conventions

#### Files

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `CitySelector.tsx` |
| Services | camelCase | `gammaService.ts` |
| Hooks | camelCase with `use` prefix | `useComparison.ts` |
| Types | camelCase | `metrics.ts` |
| Utils | camelCase | `costCalculator.ts` |
| API endpoints | kebab-case | `judge-report.ts` |
| CSS modules | PascalCase matching component | `CitySelector.module.css` |
| Migrations | `YYYYMMDD_description.sql` | `20260212_advisor_remediation.sql` |

#### Code

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `EnhancedComparison` |
| Functions | camelCase | `fetchComparison()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `ComparisonResult` |
| Enums | PascalCase | `AvatarProvider` |
| Boolean variables | `is`/`has`/`should` prefix | `isLoading`, `hasAccess` |
| Event handlers | `handle` prefix | `handleSubmit()` |
| Callbacks/props | `on` prefix | `onComplete` |

#### Branches

| Type | Convention | Example |
|------|-----------|---------|
| Feature | `feature/<description>` | `feature/olivia-chat` |
| Fix | `fix/<description>` | `fix/judge-timeout` |
| Claude sessions | `claude/<auto-generated>` | `claude/lifescore-debug-42MtS` |

### 2.11 Component Guide

#### Core Application

| Component | What It Does |
|-----------|-------------|
| `App.tsx` | Root component. Manages tabs, auth gate, lazy-loading of tab content. |
| `LoginScreen.tsx` | Supabase auth — email/password login, signup, password reset. |
| `Header.tsx` | Top navigation bar with logo, user menu, theme toggle. |
| `Footer.tsx` | Bottom bar with legal links and copyright. |
| `TabNavigation.tsx` | Main tab switcher (Compare, Results, Visuals, Judge, Olivia, etc.). |

#### Comparison Engine

| Component | What It Does |
|-----------|-------------|
| `CitySelector.tsx` | Typeahead city picker with orange country badges, flag emojis, search highlighting. User selects two cities to compare. |
| `EnhancedComparison.tsx` | The main comparison view. Orchestrates multi-LLM evaluation, shows metric scores, evidence panels, consensus voting. Largest component (~2,400 lines). |
| `Results.tsx` | Displays scored metric table after comparison completes. |
| `SavedComparisons.tsx` | Lists user's saved comparisons with search, delete, re-open. |
| `DealbreakersWarning.tsx` | Warns when a category weight exceeds safe thresholds. |
| `WeightPresets.tsx` | Predefined category weight configurations. |
| `ScoreMethodology.tsx` | Explains how the 100-metric scoring system works. |

#### AI Assistants

| Component | What It Does |
|-----------|-------------|
| `AskOlivia.tsx` | Full chat interface with Olivia (AI assistant). Sends messages, displays responses, handles TTS and avatar streaming. |
| `OliviaChatBubble.tsx` | Individual chat message bubble with avatar and formatting. |
| `OliviaAvatar.tsx` | Simli WebRTC video player — renders Olivia's face in real-time. |
| `EmiliaChat.tsx` | Lightweight help widget. Uses OpenAI assistant for support questions. |

#### Judge & Legal

| Component | What It Does |
|-----------|-------------|
| `JudgeTab.tsx` | AI judge that renders a legal-style verdict. Generates analysis, creates avatar video, shows verdict with reasoning. Features 3 collapsible panels (Media, Evidence, Verdict) with live stats in headers. |
| `GoToMyNewCity.tsx` | HeyGen multi-scene relocation video at bottom of JudgeTab. Uses HeyGen Video Generate v2 API with storyboard. Validates against 10K char limit. Poster image + CTA to Cluesnomads.com. |
| `JudgeVideo.tsx` | Video player for pre-rendered judge avatar videos. |
| `CourtOrderVideo.tsx` | Formatted court-order-style video report with legal styling. |
| `GunComparisonModal.tsx` | Dedicated modal for comparing gun rights between jurisdictions. |

#### Visual Reports

| Component | What It Does |
|-----------|-------------|
| `VisualsTab.tsx` | Generates PDF/PPTX visual reports via Gamma API. Handles generation, polling, download. Read/Listen to Presenter toggle. |
| `ReportPresenter.tsx` | Olivia video presenter with Live (PIP avatar overlay) and Video (pre-rendered MP4) sub-modes. AUDIO badge in top-right corner with animated voice wave indicator when playing. |
| `NewLifeVideos.tsx` | Side-by-side winner (FREEDOM) vs loser (IMPRISONMENT) videos. Blob URL conversion for CORS-safe playback, expired URL detection, auto-reset after 3 failed loads, download with fetch→blob→ObjectURL. |
| `AboutClues.tsx` | About Clues tab with 6 sub-tabs presenting the 18-page ecosystem document. |

#### User & Settings

| Component | What It Does |
|-----------|-------------|
| `SettingsModal.tsx` | User preferences — theme, default view, comparison settings. |
| `CostDashboard.tsx` | Shows API usage costs per provider (OpenAI, Tavily, Simli, etc.). Field-by-field merge of localStorage and DB records; auto-syncs patched records back to DB. |
| `PricingModal.tsx` / `PricingPage.tsx` | Subscription tier display and Stripe checkout trigger. |
| `FeatureGate.tsx` | Wraps features that require a specific tier. Shows upgrade prompt if locked. |
| `CookieConsent.tsx` | GDPR cookie consent banner. |

#### UI Utilities

| Component | What It Does |
|-----------|-------------|
| `ErrorBoundary.tsx` | Catches React render errors, shows fallback UI. |
| `LoadingState.tsx` | Skeleton loading placeholders. |
| `ThemeToggle.tsx` | Dark/light mode switch. |
| `HelpModal.tsx` / `HelpBubble.tsx` | Contextual help overlays. |
| `LegalModal.tsx` | Legal/compliance information display. |
| `UsageWarningBanner.tsx` | Shows warning when user approaches API quota limits. |

### 2.12 Services Guide

Services contain the core business logic. They sit between components/hooks and the API.

| Service | What It Does |
|---------|-------------|
| `gammaService.ts` | Integrates with Gamma API to generate PDF/PPTX visual reports. Handles prompt building, polling, download URLs. Largest service (~3,100 lines). |
| `savedComparisons.ts` | CRUD operations for saved comparisons. Uses Supabase for persistence with localStorage as fallback cache. |
| `databaseService.ts` | Low-level Supabase database operations — queries, inserts, updates across all tables. |
| `reportStorageService.ts` | Manages report saving, sharing links, and Supabase Storage uploads. |
| `contrastImageService.ts` | Generates visual contrast images comparing two cities (calls Replicate). |
| `cache.ts` | In-memory caching layer for comparison results and city data. Reduces redundant API calls. |
| `llmEvaluators.ts` | Orchestrates multi-LLM evaluation. Sends prompts to Claude, GPT-4, Gemini, Grok, Llama and collects scored results. |
| `oliviaService.ts` | Client-side Olivia chat integration — manages threads, sends messages, handles streaming. Also includes `generateHeyGenVideo()` and `checkHeyGenVideoStatus()` for presenter videos. |
| `presenterService.ts` | Client-side narration script generator from comparison data. Segments: intro → winner → categories → highlights → consensus → conclusion. |
| `presenterVideoService.ts` | HeyGen video generation orchestration + polling (5s intervals, 120 attempts, 10 min timeout). |
| `grokVideoService.ts` | Client-side Grok video generation — triggers generation, polls status, handles downloads. |
| `opusJudge.ts` | Claude Opus judge verdict generation — builds legal-style prompt, parses structured verdict. |
| `judgePregenService.ts` | Pre-generates judge verdicts in the background after comparison completes. |
| `videoStorageService.ts` | Uploads and retrieves videos from Supabase Storage buckets. |
| `enhancedComparison.ts` | State management for enhanced (multi-LLM) comparison mode. |
| `rateLimiter.ts` | Client-side rate limiting to prevent excessive API calls before they hit the server. |

### 2.13 Hooks Guide

Custom hooks encapsulate stateful logic and side effects.

| Hook | What It Does |
|------|-------------|
| `useComparison` | Core comparison state machine — manages city selection, evaluation trigger, results, loading states. Used by EnhancedComparison. |
| `useOliviaChat` | Manages Olivia chat state — message history, sending, receiving, thread management. |
| `useSimli` | Manages Simli WebRTC session — connection setup, video/audio streams, reconnection. |
| `useTTS` | Text-to-speech — sends text to ElevenLabs, plays audio response. |
| `useAvatarProvider` | Selects and initializes the active avatar provider (Simli, D-ID, HeyGen). |
| `useJudgeVideo` | Manages judge video generation — triggers Wav2Lip, polls status, caches result. |
| `useGrokVideo` | Manages Grok video generation — triggers New Life pair (winner+loser) and Court Order (single) modes. Polls at 3s intervals, max 6 minutes (120 attempts). Progress: 50% per completed video, scaling to 95%. Integrates Kling cost tracking. |
| `useContrastImages` | Manages contrast image generation and caching. |
| `useTierAccess` | Returns current user's tier and feature access flags. Used by FeatureGate. |
| `useApiUsageMonitor` | Tracks API usage in real-time, triggers warnings when approaching limits. |
| `useEmilia` | Manages Emilia help widget state — open/close, message sending. |
| `useGunComparison` | Manages gun rights comparison modal state and data. |
| `useOGMeta` | Sets Open Graph meta tags for social sharing. |
| `useURLParams` | Syncs comparison state with URL query parameters. |
| `useDraggable` | Adds drag-and-drop capability to elements. |
| `useFocusTrap` | Traps keyboard focus within modals for accessibility (a11y). |

### 2.14 Type System Guide

All types live in `src/types/`. Import from the barrel export:

```typescript
import type { ComparisonResult, MetricDefinition, Profile } from '@/types';
```

| File | Key Types |
|------|-----------|
| `metrics.ts` | `Category`, `MetricDefinition`, `ScoringCriteria`, `ComparisonResult`, `MetricScore` |
| `database.ts` | `Profile`, `Comparison`, `GammaReport`, `JudgeReport`, `ConsentLog` |
| `avatar.ts` | `SimliSession`, `AvatarConfig`, `StreamStatus`, `AvatarProvider` |
| `gamma.ts` | `VisualReportResponse`, `GammaGenerationStatus` |
| `apiUsage.ts` | `UsageQuota`, `CostRecord`, `RateLimitStatus` |
| `olivia.ts` | `OliviaConfig`, `ChatMessage`, `StreamingOptions` |
| `enhancedComparison.ts` | `EnhancedComparisonResult`, `MetricConsensus`, `EvidenceItem` |
| `grokVideo.ts` | `GrokVideoRequest`, `VideoStatus` |
| `judge.ts` | `JudgeOutput`, `Verdict`, `LegalAnalysis` |
| `presenter.ts` | `PresenterSegment`, `PresentationScript`, `PresenterState`, `ReportViewMode`, `VideoGenerationState`, `HeyGenVideoRequest/Response` |

### 2.15 Data Flow Diagrams

#### City Comparison (main flow)

```
User selects City A & City B
         │
         ▼
    CitySelector component
         │
         ▼
    useComparison hook (state machine)
         │
         ▼
    POST /api/evaluate
    ├── Tavily API (web research on both cities)
    ├── LLM (Claude/GPT/Gemini/Grok scores 100 metrics)
    └── Returns ComparisonResult
         │
         ▼
    Results component (displays scored metrics)
         │
         ├──► "Save" → savedComparisons service → Supabase
         ├──► "Visual Report" → gammaService → Gamma API → PDF/PPTX
         ├──► "Judge Verdict" → opusJudge → Claude Opus → avatar video
         └──► "Ask Olivia" → oliviaService → OpenAI thread → Simli avatar
```

#### Authentication Flow

```
LoginScreen → Supabase Auth (email/password)
         │
         ▼
    AuthContext provider (wraps entire app)
         │
         ▼
    useTierAccess hook (reads profile.tier)
         │
         ▼
    FeatureGate components (show/hide features by tier)
```

#### Billing Flow

```
PricingModal → POST /api/stripe/create-checkout-session
         │
         ▼
    Stripe Checkout (external)
         │
         ▼
    POST /api/stripe/webhook (payment confirmed)
         │
         ▼
    Updates profiles.tier in Supabase
         │
         ▼
    AuthContext refreshes → features unlock
```

### 2.16 Quick Reference: Where Things Live

| "I need to..." | Go to... |
|----------------|----------|
| Add a new UI component | `src/components/` |
| Add business logic | `src/services/` |
| Add a React hook | `src/hooks/` |
| Add an API endpoint | `api/` |
| Add a TypeScript type | `src/types/` |
| Add a database migration | `supabase/migrations/` |
| Add a static asset | `public/` |
| Add documentation | `docs/` |
| Add a utility function | `src/utils/` |
| Modify auth logic | `src/contexts/AuthContext.tsx` |
| Modify Supabase client | `src/lib/supabase.ts` |
| Modify build config | `vite.config.ts` |
| Modify deploy config | `vercel.json` |
| Modify scoring metrics | `src/data/metrics.ts` |

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| Tailwind CSS | 3.x | Styling (if used) |

### 3.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Vercel Functions | - | Serverless API |
| Supabase | - | Database + Auth |

### 3.3 AI Providers

| Provider | Type ID | Model | Use Case |
|----------|---------|-------|----------|
| Anthropic | `claude-sonnet` | claude-sonnet-4-5-20250929 | Primary evaluator |
| Anthropic | `claude-opus` | claude-opus-4-5-20251101 | Judge/consensus |
| OpenAI | `gpt-4o` | gpt-4o | Secondary evaluator |
| Google | `gemini-3-pro` | gemini-3-pro-preview | Evaluator with Google Search |
| xAI | `grok-4` | grok-4 | Evaluator with X search |
| Perplexity | `perplexity` | sonar-reasoning-pro | Research evaluator |
| Tavily | N/A | Search + Research | Web research |

### 3.4 Media Services

| Service | Purpose |
|---------|---------|
| Replicate | Video generation (Minimax) |
| Kling AI | Primary video generation |
| ElevenLabs | Text-to-speech |
| Gamma | PDF/PPTX report generation |
| Simli | Avatar video (PRIMARY) |
| HeyGen | Gamma report video presenter (streaming avatar + pre-rendered MP4) |
| D-ID | Avatar video (fallback) |

---

### CRITICAL: Olivia Voice & Avatar Wiring (Support Reference)

**DO NOT confuse these three separate systems:**

| Feature | Service | Env Vars | Files |
|---------|---------|----------|-------|
| **Ask Olivia Chat** (Help bubble + Ask Olivia page) | OpenAI Assistants API | `OPENAI_API_KEY`, `OPENAI_ASSISTANT_ID` | `api/olivia/chat.ts` |
| **Olivia Voice** (Chat TTS) | ElevenLabs → OpenAI fallback | `ELEVENLABS_API_KEY`, `ELEVENLABS_OLIVIA_VOICE_ID` | `api/olivia/tts.ts` |
| **Olivia Video Presenter** (Gamma reports) | HeyGen | `HEYGEN_API_KEY`, `HEYGEN_OLIVIA_AVATAR_ID`, `HEYGEN_OLIVIA_VOICE_ID` | `api/olivia/avatar/heygen-video.ts` |

- The ElevenLabs voice is a **cloned voice** specific to Olivia. When ElevenLabs quota runs out, OpenAI "nova" voice kicks in automatically.
- HeyGen has its **own separate voice** (`HEYGEN_OLIVIA_VOICE_ID`) used only for Gamma video presenter.
- Changing HeyGen vars will NOT affect Ask Olivia chat or voice. Changing ElevenLabs/OpenAI vars will NOT affect the video presenter.

---

## 4. API Reference

### 4.1 Core Endpoints

#### POST /api/evaluate

**Purpose:** Evaluate metrics for a city pair

**Request:**
```typescript
{
  city1: string,
  city2: string,
  category: CategoryId,
  metrics: Metric[],
  provider: 'claude' | 'gpt4o' | 'gemini' | 'grok' | 'perplexity',
  tavilyApiKey?: string,
  anthropicKey?: string,
  openaiKey?: string,
  // ... other provider keys
}
```

**Response:**
```typescript
{
  success: boolean,
  scores: MetricScore[],
  evidence: Evidence[],
  provider: string,
  tokensUsed: { input: number, output: number },
  tavilyCredits: number
}
```

**Timeout:** 240 seconds

#### POST /api/judge

**Purpose:** Generate consensus scores using Opus

**Request:**
```typescript
{
  city1: string,
  city2: string,
  evaluations: ProviderEvaluation[],
  anthropicKey?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  consensusScores: MetricScore[],
  overrides: Override[],
  reasoning: string
}
```

#### POST /api/gamma

**Purpose:** Generate presentation report

**Request:**
```typescript
{
  comparisonData: ComparisonResult,
  format: 'pdf' | 'pptx'
}
```

**Response:**
```typescript
{
  success: boolean,
  reportUrl: string,
  generationId: string
}
```

### 4.2 Olivia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/olivia/thread | POST | Create conversation |
| /api/olivia/message | POST | Send message |
| /api/olivia/speak | POST | Generate TTS |
| /api/olivia/contrast-images | POST | Generate comparison images |

### 4.3 Video Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/video/grok-generate | POST | Start video generation (two actions: `new_life_videos` pair, `court_order_video` single). Kling AI primary, Replicate fallback. SOVEREIGN only. |
| /api/video/grok-status | GET | Check video status. HEAD-validates replicate.delivery URLs, auto-marks expired as failed. |
| /api/video/invideo-override | POST | Admin cinematic prompt override per comparison |
| /api/avatar/generate-judge-video | POST | Generate judge video (JWT auth required) |
| /api/avatar/video-status | GET | Check judge video status |

### 4.4 Emilia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/emilia/thread | POST | Create new conversation thread (JWT auth required) |
| /api/emilia/message | POST | Send message, get response |
| /api/emilia/speak | POST | TTS with shimmer voice |
| /api/emilia/manuals | GET | Fetch manual content (JWT auth required — no longer accepts unverified email param) |

**Knowledge Sync:** Run `npx ts-node scripts/sync-emilia-knowledge.ts` after updating manuals.

### 4.7 Prompts Endpoints (Added 2026-02-10)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/prompts | GET | Fetch all 50 system prompts (admin only) |
| /api/prompts | POST | Create new prompt (admin only) |
| /api/prompts | PUT | Update existing prompt text (admin only) |

50 prompts across 6 categories: evaluate (11), judge (8), olivia (7), gamma (8), video (8), invideo (8). Visible in Help Modal > Prompts tab.

### 4.5 Usage/Quota Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/usage/check-quotas | GET | Get all quota statuses |
| /api/usage/check-quotas | POST | Update usage, trigger alerts |
| /api/usage/elevenlabs | GET | Real-time ElevenLabs usage |

### 4.6 Avatar Endpoints (Additional)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/avatar/simli-speak | POST | Simli avatar with audio |

### 4.8 Olivia Presenter Endpoints (Added 2026-02-13)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/olivia/avatar/heygen-video | POST | Generate pre-rendered HeyGen video (action: generate/status) |
| /api/olivia/avatar/heygen-video | GET | Poll video generation status (?videoId=xxx) |

**POST body (generate):**
```typescript
{ action: 'generate', script: string, avatarId?: string, voiceId?: string, title?: string }
```
**POST body (status):**
```typescript
{ action: 'status', videoId: string }
```
**GET query:**
```
?videoId=xxx
```
**Rate limit:** standard (30 req/min). Max script: 15,000 chars. Scenes split at ~1,500 chars.

---

## 5. Database Schema

### 5.1 Current Tables (21 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| profiles | User accounts | id, email, tier |
| comparisons | Saved comparisons (NOTE: code references this, not `saved_comparisons`) | city1, city2, scores |
| olivia_conversations | Chat threads | openai_thread_id |
| olivia_messages | Chat messages | role, content |
| gamma_reports | Report URLs, city names | gamma_url, pdf_url, generation_id, city1, city2 |
| user_preferences | Single-row-per-user settings (upsert on `user_id`) | weight_presets, dealbreakers, law_lived_preferences, excluded_categories |
| subscriptions | Stripe billing | stripe_subscription_id |
| usage_tracking | Monthly limits | comparisons, messages |
| consent_logs | GDPR compliance | consent_type, action |
| judge_reports | Judge verdicts (unique on `user_id, report_id`) | winner, margin, verdict, full_report |
| avatar_videos | Judge video cache | video_url, status |
| api_cost_records | Cost tracking | provider totals |
| grok_videos | Grok video cache | city_name, video_type, status (UNIQUE includes status) |
| contrast_image_cache | Olivia images | cache_key, urls |
| api_quota_settings | Admin quota limits | provider_key, monthly_limit, warning thresholds |
| api_quota_alert_log | Email alert history | provider_key, alert_level, sent_at |
| authorized_manual_access | Manual access control | email, access_level, granted_by |
| court_orders | Court Order video saves | user_id, comparison_id, winner_city, video_url, video_storage_path |
| app_prompts | All 50 system prompts (6 categories: evaluate, judge, olivia, gamma, video, invideo) | category, prompt_key, display_name, prompt_text, last_edited_by |
| invideo_overrides | Admin cinematic prompt overrides per comparison | comparison_id, custom_prompt, created_by |
| report_shares | Shared report links | share_token, report_type, expires_at |

### 5.2 Storage Buckets (3 total)

| Bucket | Purpose | Max Size | Access |
|--------|---------|----------|--------|
| `avatars` | User profile pictures | 5 MB | User-owned RLS |
| `judge-videos` | Judge avatar video cache | 50 MB | Service role write, public read |
| `user-videos` | Court Order video uploads | 100 MB | User-owned RLS (`user-videos/{userId}/{file}`) |

**Schema Notes (Updated 2026-02-13):**
- `user_preferences`: Single-row-per-user design. JSONB columns: `weight_presets`, `law_lived_preferences`, `excluded_categories`, `dealbreakers`. Upsert on `user_id`.
- `judge_reports`: Column names are `winner`, `margin`, `verdict`, `full_report`. Unique constraint on `(user_id, report_id)`.
- `court_orders`: Unique constraint on `(user_id, comparison_id)`. RLS: users can only CRUD their own. Added `video_storage_path` for Supabase Storage uploads.
- `comparisons`: Actual table name is `comparisons`, not `saved_comparisons` as some older docs reference.
- `gamma_reports`: Added `city1`, `city2` TEXT columns with index `idx_gamma_reports_cities` for cross-device sync.
- `grok_videos`: UNIQUE constraint now includes `status` column (database hardening fix).
- `app_prompts`: 50 reference prompts across 6 categories. Admin-editable via Help Modal > Prompts tab. Most prompts are dynamically generated in TypeScript; these are read-only references.
- `invideo_overrides`: Allows cinematic prompt customization per comparison for admins.
- `report_shares`: Hardened RLS policies (database hardening migration).

### 5.2 Missing Schema (Needs Creation)

**city_evaluations (PROPOSED FOR CACHING):**
```sql
CREATE TABLE city_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  metrics_data JSONB NOT NULL,
  evidence_data JSONB,
  category_scores JSONB,
  tavily_summary TEXT,
  llm_provider TEXT,
  evaluation_version TEXT DEFAULT 'v1.0',
  UNIQUE(city_name, country)
);
```

### 5.3 Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only read/write their own data
- Service role has full access
- Some tables (avatar_videos, grok_videos) allow public read for completed items

---

## 6. Authentication & Authorization

### 6.1 Auth Flow

```
User Login → Supabase Auth → JWT Token →
→ Stored in localStorage → Sent in headers
```

### 6.2 Password Reset Flow (Added 2026-02-17)

**Complete technical flow for "Forgot Password":**

```
STEP 1: REQUEST RESET
  LoginScreen.tsx:163-180  handleForgotPassword()
    → AuthContext.tsx:505-523  resetPassword(email)
      → supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth/callback'
        })
    → Supabase stores recovery_token (1hr TTL) in auth.users
    → Supabase sends email from noreply@mail.app.supabase.io
    → Returns success even if email doesn't exist (anti-enumeration)

STEP 2: USER CLICKS EMAIL LINK
  Browser → /auth/callback#access_token=...&type=recovery
    → Supabase JS auto-parses URL hash fragment
    → supabase.auth.onAuthStateChange fires:
        event = 'PASSWORD_RECOVERY'
        session = { access_token, refresh_token, user }
    → AuthContext.tsx:339-349 handles event:
        isPasswordRecovery = true
        isAuthenticated = true (temporary session)
    → App.tsx:621-622 route gate:
        if (isPasswordRecovery) → <ResetPasswordScreen />

STEP 3: SET NEW PASSWORD
  ResetPasswordScreen.tsx (validation: min 6 chars, must match)
    → AuthContext.tsx:525-547  updatePassword(newPassword)
      → supabase.auth.updateUser({ password: newPassword })
    → Supabase: bcrypt(newPassword) → auth.users.encrypted_password
    → recovery_token = NULL (consumed)
    → isPasswordRecovery = false
    → URL hash cleaned
    → App renders main content (user fully authenticated)
```

**Key Files:**
| File | Lines | Responsibility |
|------|-------|---------------|
| `src/contexts/AuthContext.tsx` | 505-553 | `resetPassword()`, `updatePassword()`, `clearPasswordRecovery()` |
| `src/components/LoginScreen.tsx` | 163-180 | Forgot password form, success message |
| `src/components/ResetPasswordScreen.tsx` | Full | New password form (6 char min, confirm match, show/hide toggle) |
| `src/App.tsx` | 621-622 | `isPasswordRecovery` route gate |

**Database impact:** ONLY `auth.users.encrypted_password` and `auth.users.recovery_token` are modified. All application tables (`profiles`, `comparisons`, `subscriptions`, etc.) are untouched.

### 6.3 Session Management

```typescript
// src/lib/supabase.ts
const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    storageKey: 'lifescore-auth',
    storage: localStorage
  }
});
```

### 6.4 Tier Enforcement

**Client-side:** `src/hooks/useTierAccess.ts`
**Server-side:** `api/shared/tierCheck.ts`

**Developer Bypass (Current):**
```typescript
// Hardcoded for admin testing
const DEVELOPER_EMAILS = ['brokerpinellas@gmail.com'];
if (DEVELOPER_EMAILS.includes(userEmail)) {
  return { hasAccess: true, tier: 'SOVEREIGN' };
}
```

### 6.5 Auth Profile Fetch Retry Storm Fix (Added 2026-02-14)

**Problem:** When a profile fetch from Supabase failed (e.g., network blip, cold start), the auth context would immediately retry, creating an exponential retry loop that could hammer Supabase Auth with hundreds of requests per second.

**Fix:** Added a 60-second cooldown after a profile fetch failure. During the cooldown period, subsequent fetch attempts return the cached (possibly stale) profile data instead of making new network requests.

**Behavior:**
- First failure: Triggers cooldown timer (60 seconds)
- During cooldown: Returns cached profile, no network requests
- After cooldown expires: Next access attempt makes a fresh fetch
- Successful fetch: Resets cooldown timer

**Impact:** Prevents exponential retry loops from overwhelming Supabase Auth during transient failures.

### 6.6 API Key Handling

User-provided API keys are:
- Passed in request body (not stored)
- Used for that request only
- Never logged or persisted
- Enable "Enhanced Mode" features

---

## 7. LLM Provider Integration

### 7.1 Provider Configuration

| Provider | Endpoint | Auth Method |
|----------|----------|-------------|
| Anthropic | https://api.anthropic.com/v1/messages | x-api-key header |
| OpenAI | https://api.openai.com/v1/chat/completions | Bearer token |
| Google | https://generativelanguage.googleapis.com/v1beta | API key param |
| xAI | https://api.x.ai/v1/chat/completions | Bearer token |
| Perplexity | https://api.perplexity.ai/chat/completions | Bearer token |

### 7.2 Timeout Settings

#### Server-Side (API Routes)
```typescript
// api/evaluate.ts
const LLM_TIMEOUT_MS = 240000; // 240 seconds for LLM evaluations

// api/evaluate.ts (Tavily — updated 2026-02-05)
const TAVILY_TIMEOUT_MS = 45000; // 45 seconds (reduced from 240s for faster failure recovery)

// api/olivia/chat.ts
const OPENAI_TIMEOUT_MS = 60000; // 60 seconds for OpenAI Assistants API
```

#### Client-Side (Service Functions)
| Service | Function | Timeout | File |
|---------|----------|---------|------|
| **Olivia Chat** | sendMessage | 90s | oliviaService.ts:85 |
| **Olivia Context** | buildContext | 60s | oliviaService.ts:43 |
| **Olivia TTS** | generateTTS | 60s | oliviaService.ts:132 |
| **HeyGen Avatar** | createSession | 45s | oliviaService.ts:160 |
| **HeyGen Avatar** | speak | 60s | oliviaService.ts:191 |
| **Video Generate** | grokGenerate | 120s | grokVideoService.ts:26 |
| **Video Status** | checkStatus | 30s | grokVideoService.ts:27 |
| **GitHub Gist** | all operations | 60s | savedComparisons.ts:89 |
| **Vercel KV Cache** | get/set/delete | 10s | cache.ts:33 |

**Per-Provider LLM Recommendations:**
- Claude: 60s
- GPT-4o: 90s
- Gemini: 120s
- Grok: 180s (includes search)
- Perplexity: 120s

### 7.3 Token Pricing

| Provider | Input (per 1M) | Output (per 1M) |
|----------|---------------|-----------------|
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |
| GPT-4o | $2.50 | $10.00 |
| Gemini 3 Pro | $1.25 | $5.00 |
| Grok 4 | $3.00 | $15.00 (estimated) |
| Perplexity | $1.00 | $5.00 |

### 7.4 Error Handling

```typescript
try {
  const response = await fetchWithTimeout(url, options, LLM_TIMEOUT_MS);
} catch (error) {
  if (error.name === 'AbortError') {
    // Timeout - return partial results or retry
  } else if (error.status === 429) {
    // Rate limited - exponential backoff
  } else {
    // Log and return error to client
  }
}
```

### 7.5 Supabase Retry Logic (Added 2026-01-29)

All Supabase queries use automatic retry with exponential backoff to handle transient failures.

**Configuration (`src/lib/supabase.ts`):**
```typescript
RETRY_CONFIG = {
  maxRetries: 2,           // 2 retries = 3 total attempts
  initialDelayMs: 1000,    // Start with 1 second delay
  maxDelayMs: 5000,        // Cap at 5 seconds
  backoffMultiplier: 2,    // Double delay each retry
}
SUPABASE_TIMEOUT_MS = 12000  // 12 second timeout per attempt
```

**Retry Behavior:**
- Attempt 1: Immediate
- Attempt 2: Wait 1s, then retry
- Attempt 3: Wait 2s, then retry (final)
- Total max wait: ~3 seconds + query time

**Retryable Errors:**
- Timeout errors (query took > 12s)
- Network errors (fetch failed)

**Non-Retryable Errors:**
- Authentication failures
- Permission denied (RLS)
- Invalid queries

**Usage:**
```typescript
import { withRetry, withRetryFallback } from '../lib/supabase';

// Throws after all retries fail
const result = await withRetry(
  () => supabase.from('profiles').select('*'),
  { operationName: 'Profile fetch' }
);

// Returns fallback on failure
const profile = await withRetryFallback(
  () => supabase.from('profiles').select('*'),
  { data: null, error: null },
  { operationName: 'Profile fetch' }
);
```

**Files Using Retry:**
- `src/contexts/AuthContext.tsx` - Profile/preferences fetch
- `src/services/databaseService.ts` - All database operations
- `src/services/savedComparisons.ts` - Comparison save/load
- `src/hooks/useTierAccess.ts` - Tier checking
- `src/components/JudgeTab.tsx` - Judge report operations

### 7.6 Supabase Cold Start Warm-Up + LRU Cache (Added 2026-02-14)

**Warm-Up Ping:**
On app load, a lightweight ping is sent to Supabase to "wake up" any cold-started connection pools. This prevents the first real user action from experiencing a 2-5 second cold start delay.

```
App mounts → useEffect fires warm-up ping →
→ supabase.from('profiles').select('id').limit(1) →
→ Response discarded (fire-and-forget)
```

**Retry Logic Fix:**
The existing retry logic was using `.then()/.catch()` on a `PromiseLike` return from Supabase (not a real `Promise`). This caused silent failures where retries never actually executed. Fixed by properly `await`-ing the Supabase call to get a real Promise before applying retry logic.

**LRU Cache Expansion:**
Frequently accessed data (profiles, user preferences, tier status) now uses an expanded LRU (Least Recently Used) cache to reduce redundant Supabase queries during a session.

### 7.7 LLM Evaluator Retry Logic (Added 2026-02-04)

Both Gemini and Grok evaluators now include retry logic with exponential backoff to handle cold start timeouts and transient failures.

**Configuration (`api/evaluate.ts`):**
```typescript
MAX_RETRIES = 3           // Up to 3 attempts
backoffMs = 2^(attempt-1) * 1000  // 1s, 2s, 4s delays
```

**Retry Behavior:**
- Attempt 1: Immediate
- Attempt 2: Wait 1s, then retry
- Attempt 3: Wait 2s, then retry
- Final attempt: Wait 4s, then retry

**Retryable Conditions:**
- 5xx server errors (timeout, overload)
- Empty/malformed response
- Invalid JSON or no scores parsed

**Non-Retryable Conditions:**
- 4xx client errors (invalid API key, bad request)

**Logging:**
```
[GEMINI] Attempt 1/3 for Miami, FL vs Austin, TX
[GEMINI] Success on attempt 1: 45 scores returned
// or on failure:
[GEMINI] Attempt 1 failed: API error: 503 - Service unavailable
[GEMINI] Retrying in 1000ms...
[GEMINI] All 3 attempts failed. Last error: Service unavailable
```

**Providers with Retry:**
- ✅ Gemini 3 Pro (Fix #49 - Added 2026-02-04)
- ✅ Grok 4 (existing)
- ❌ Claude Sonnet (uses SDK with built-in retry)
- ❌ GPT-4o (uses SDK with built-in retry)
- ❌ Perplexity (single attempt currently)

### 7.8 Cost Tracking Auto-Sync (Added 2026-02-04)

API cost data is now automatically synchronized to Supabase after each comparison completes (Fix #50).

**Flow:**
```
Comparison completes → finalizeCostBreakdown() →
→ storeCostBreakdown() (localStorage) →
→ toApiCostRecordInsert() → saveApiCostRecord() (Supabase)
```

**Database Table:** `api_cost_records`

**Files Involved:**
- `src/App.tsx` - Auto-sync trigger point (line 594-606)
- `src/utils/costCalculator.ts` - Cost calculation and conversion
- `src/services/databaseService.ts` - Database insert with upsert

**Logging:**
```
[App] Cost tracking stored: <breakdown log>
[App] Cost data auto-synced to Supabase: LIFE-xxx-xxx
// or on failure:
[App] Cost DB sync failed (non-fatal): <error message>
```

### 7.9 Cost Dashboard $0 Fix (3 Bugs Fixed) (Added 2026-02-14)

The CostDashboard was displaying $0.00 for many comparisons due to three separate bugs:

**Bug 1 — DB/localStorage Merge Logic:**
`CostDashboard.tsx` `loadCosts()` discarded localStorage records when DB records existed for the same `comparisonId`. However, the DB record was saved at comparison time BEFORE post-comparison services (Gamma, Olivia, TTS, Avatar) ran, so DB records were always missing those costs.

*Fix:* Field-by-field merge taking `max(DB, localStorage)` for each individual service cost field (e.g., `tavily_cost`, `gamma_cost`, `tts_cost`).

**Bug 2 — `appendServiceCost()` Never Synced to DB:**
The `appendServiceCost()` function only wrote to localStorage and never synced the updated record back to Supabase, so DB records remained permanently stale.

*Fix:* CostDashboard now auto-syncs patched (merged) records back to DB in a fire-and-forget pattern after loading and merging.

**Bug 3 — Perplexity Missing `stream: false`:**
The Perplexity API request in `evaluate.ts` was missing `stream: false` in the request body. Without this flag, Perplexity returns a streaming response that does not include `usage` data (token counts), so cost calculation returned $0.00.

*Fix:* Added `stream: false` to the Perplexity request body. Added diagnostic logging of token usage. Added fallback token estimation from prompt/response length when usage data is still unavailable.

### 7.10 Grok Business Category Batch Splitting (Added 2026-02-14)

**Problem:** The Business & Work category contains 25 metrics — the largest of all 6 categories. Sending all 25 metrics to the Grok API in a single request caused timeouts due to the combined prompt size and search overhead (Grok includes X/Twitter search for each metric).

**Fix:** The Business & Work category is now automatically split into smaller batches for Grok evaluation. Each batch is sent as a separate API call, and the results are merged on the server before returning to the client.

**Applies To:** Grok 4 provider only. Other providers (Claude, GPT-4o, Gemini, Perplexity) handle 25 metrics in a single call without timeout issues.

---

## 8. Tavily Integration

### 8.1 APIs Used

**Research API (`/research`):**
- One call per comparison
- Generates comprehensive report
- Cost: 4-110 credits

**Search API (`/search`):**
- 12 calls per LLM evaluation (2 cities × 6 categories)
- Focused category queries
- Cost: ~2-3 credits each

### 8.2 Authentication

```typescript
const getTavilyHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'X-Project-ID': 'lifescore-freedom-app'
});
```

### 8.3 Search Configuration

```typescript
{
  query: "<category-specific query>",
  search_depth: 'advanced',
  max_results: 5,
  include_answer: 'advanced',
  chunks_per_source: 3,
  topic: 'general',
  start_date: '2024-01-01',
  end_date: '<current date>',
  exclude_domains: ['pinterest.com', 'facebook.com', ...]
}
```

### 8.4 APIs NOT Used (Opportunities)

- **Extract API:** Could cache source content
- **Agent API:** Could resolve LLM disagreements
- **Graph API:** Could map regulatory relationships

---

## 9. Video Generation Pipeline

### 9.1 Judge Video Flow

```
Script Generation (LLM) → TTS Audio (ElevenLabs) →
→ Upload to Supabase → Video Generation (Replicate Wav2Lip) →
→ Poll for completion → Return URL
```

### 9.2 Grok/Kling Video Flow (Updated 2026-02-13)

```
Client Request → /api/video/grok-generate →
→ Two actions supported:
   1. "new_life_videos" — generates winner (FREEDOM) + loser (IMPRISONMENT) pair
   2. "court_order_video" — generates single "perfect life" video
→ Try Kling AI (primary, model kling-v2-6, 10s duration, 'std' mode) →
→ Fallback to Replicate Minimax (minimax/video-01) on Kling failure →
→ Store job ID in grok_videos table →
→ Client polls /api/video/grok-status at 3s intervals →
→ Return video URL when complete (max 6 min / 120 poll attempts)
```

**Sequential Generation (Critical Fix):**
Videos are now generated sequentially (loser first, then winner) — NOT in parallel. This prevents Vercel timeout at ~73% that occurred with parallel Promise.all. API timeout is 240 seconds (doubled from original 120s).

**City Type Detection:**
Automatic city type classification for prompt optimization: beach, mountain, urban, desert, european, tropical.

**Stale Processing Detection:**
Auto-fails processing records older than 3 minutes to prevent stuck video jobs.

### 9.3 Kling AI JWT Generation

```typescript
// api/video/grok-status.ts
function generateKlingJWT(accessKey: string, secretKey: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + 1800, // 30 min
    nbf: Math.floor(Date.now() / 1000) - 5
  };
  // Sign with HMAC-SHA256 using secretKey
}
```

**Kling Error Code 1201:** Model/mode not supported with sound. App uses 'std' mode (no sound, cost-effective).

### 9.4 Video Status Values

| Status | Meaning |
|--------|---------|
| pending | Job submitted |
| processing | Video being generated |
| completed | Video ready |
| failed | Generation failed |

### 9.5 Video Playback & Error Handling (Updated 2026-02-13)

**Blob URL Playback (CORS-safe):**
NewLifeVideos converts remote video URLs to local blob URLs for reliable cross-origin playback. The fetch→blob→ObjectURL pattern bypasses CDN CORS restrictions.

**Expired URL Detection:**
- Replicate CDN URLs expire after ~24 hours
- Backend HEAD-checks replicate.delivery URLs before returning cached videos
- Frontend verifies `content-type: video/*` on blob fetch (rejects HTML error pages)
- Dead URLs tracked in state Set, showing "Video expired — regenerate" placeholder

**Promise.allSettled for Playback:**
Play button uses `Promise.allSettled` (not `Promise.all`) so one broken video doesn't block the other from playing.

**Error Count Auto-Reset:**
```typescript
MAX_VIDEO_ERRORS = 3  // Reset after 3 failed load attempts
```

**Flow:**
```
Video element onError event →
→ handleVideoError() increments error count →
→ useEffect detects count >= MAX_VIDEO_ERRORS →
→ reset() clears hook state →
→ User sees "SEE YOUR NEW LIFE!" button again
```

**Progress Bar Calculation (Fixed 2026-02-13):**
Old formula capped at 73%. New formula:
```typescript
const completedPct = (winnerDone ? 50 : 0) + (loserDone ? 50 : 0);
const remainingPct = 100 - completedPct;
const pollFraction = Math.min(pollAttempts / MAX_POLL_ATTEMPTS, 0.9);
let progressPct = completedPct + (remainingPct * pollFraction);
if (!winnerDone || !loserDone) progressPct = Math.min(progressPct, 95);
```

**Files Involved:**
- `src/components/NewLifeVideos.tsx` - Blob URL playback, error tracking, dead URL detection
- `src/hooks/useGrokVideo.ts` - Poll loop, progress calculation, `reset()` function
- `api/video/grok-status.ts` - HEAD validation of replicate URLs, stale detection
- `api/video/grok-generate.ts` - Sequential generation, Kling/Replicate providers

### 9.7 Olivia Video Presenter (Added 2026-02-13)

The Olivia Video Presenter allows users to watch an AI avatar present their Gamma report findings instead of reading the report. Two sub-modes are available:

#### Live Presenter Mode
Real-time avatar overlay on the Gamma report iframe using HeyGen Streaming Avatar API (existing WebRTC endpoint).

```
User clicks "Listen to Presenter" toggle on VisualsTab →
→ ReportPresenter mounts as PIP overlay on iframe →
→ presenterService.ts generates narration segments from comparison data (client-side) →
→ Segments: intro → winner → 6 categories → highlights → consensus → conclusion →
→ HeyGen streaming avatar speaks each segment in sequence →
→ User controls: play/pause, next/prev segment, close
```

**Narration Generation:** Entirely client-side from `AnyComparisonResult` data. No API call needed. Duration estimated at ~150 words/minute.

#### Pre-Rendered Video Mode
Polished, downloadable MP4 via HeyGen's video generation API.

```
User clicks "Generate Video" in ReportPresenter →
→ presenterVideoService.ts orchestrates:
  1. Build narration script (presenterService.ts)
  2. Submit to HeyGen via POST /api/olivia/avatar/heygen-video
  3. Poll GET /api/olivia/avatar/heygen-video?videoId=xxx at 5s intervals
  4. Max 120 attempts (10 min timeout)
→ Return video URL for playback + download
```

**Scene Splitting:** Scripts are split at paragraph boundaries into scenes of ~1500 chars each to comply with HeyGen limits. Max script length: 15,000 chars.

**HeyGen Video API Details:**
- Generation: HeyGen v2 (`POST https://api.heygen.com/v2/video/generate`)
- Status: HeyGen v1 (`GET https://api.heygen.com/v1/video_status.get?video_id=xxx`)
- Branded dark background: `#0a1628`
- Rate limit: standard (30 req/min)

#### Key Files

| File | Purpose |
|------|---------|
| `src/types/presenter.ts` | PresenterSegment, PresentationScript, VideoGenerationState, HeyGenVideoRequest/Response types |
| `src/services/presenterService.ts` | Client-side narration script generator from comparison data |
| `src/services/presenterVideoService.ts` | Video generation orchestration + polling (5s intervals, 120 max attempts) |
| `src/services/oliviaService.ts` | Added `generateHeyGenVideo()` and `checkHeyGenVideoStatus()` client functions |
| `api/olivia/avatar/heygen-video.ts` | Vercel serverless endpoint for HeyGen video generation and status polling |
| `src/components/ReportPresenter.tsx` | Full presenter UI: Live/Video sub-mode tabs, PIP overlay, video player, download |
| `src/components/ReportPresenter.css` | Styles for all presenter states (overlay, controls, video player, progress bar) |
| `src/components/VisualsTab.tsx` | Read/Listen to Presenter toggle integration |
| `src/components/VisualsTab.css` | Toggle button styles |

#### Environment Variables

| Variable | Purpose |
|----------|---------|
| `HEYGEN_API_KEY` | HeyGen API auth — Gamma report video presenter only |
| `HEYGEN_OLIVIA_AVATAR_ID` | Olivia avatar ID — Gamma video presenter ONLY (not chat TTS) |
| `HEYGEN_OLIVIA_VOICE_ID` | Olivia voice ID — Gamma video presenter ONLY (not ElevenLabs/OpenAI) |
| `HEYGEN_CRISTIANO_AVATAR_ID` | Judge Cristiano avatar ID — `7a0ee88ad6814ed9af896f9164407c41` |
| `HEYGEN_CRISTIANO_VOICE_ID` | Judge Cristiano voice ID — video presenter |

### 9.8 Judge Page Collapsible Panels (Added 2026-02-14)

The Judge page now features 3 collapsible panels to reduce visual clutter and improve navigation:

| Panel | Default State | Live Stats in Header |
|-------|--------------|---------------------|
| Media | Open (`panelMediaOpen: true`) | Video status (ready/generating/none) |
| Evidence | Closed (`panelEvidenceOpen: false`) | Score counts, evidence items |
| Verdict | Closed (`panelVerdictOpen: false`) | Winner city, margin |

**Implementation Details:**
- Uses `display: none` CSS (NOT conditional React unmount) — DOM stays mounted, all refs and effects stay alive
- 3 new `useState` hooks: `panelMediaOpen`, `panelEvidenceOpen`, `panelVerdictOpen`
- ~102 lines of CSS added to `JudgeTab.css` for panel headers, toggle icons, and collapse animations
- Panel headers are clickable and show live stats (video status, scores, winner) without needing to expand

**Why `display: none` instead of conditional rendering:**
Conditional unmount would destroy video elements, abort in-flight fetches, and reset internal component state. `display: none` preserves the entire DOM subtree and React fiber tree while hiding content visually.

### 9.9 GoToMyNewCity Video System v2 (Added 2026-02-14)

New component for HeyGen multi-scene relocation video generation.

**Location:** Bottom of JudgeTab, appears when a judge report is loaded.

**Flow:**
```
Judge report loaded → GoToMyNewCity component mounts →
→ User clicks "Generate" →
→ Builds multi-scene storyboard from judge verdict data →
→ Validates script lengths against HeyGen 10,000 char limit →
→ Submits to HeyGen Video Generate v2 API →
→ Polls for completion →
→ Displays video with poster image and CTA to Cluesnomads.com
```

**Key Features:**
- HeyGen Video Generate v2 API with multi-scene storyboard
- Script length validation against HeyGen's 10,000 character limit (error code 400175)
- Poster image displayed before video plays
- Call-to-action button linking to Cluesnomads.com
- Slim storyboard schema to keep prompt under character limit

### 9.10 HeyGen Timeouts + Supabase Query Reliability (Added 2026-02-14)

- Added timeout handling for HeyGen video generation to prevent hanging requests
- Fixed Supabase query reliability issues during HeyGen operations (race conditions when polling status while DB writes are in-flight)
- Expired video URL detection and automatic re-generation logic

### 9.11 Judge Page Video Persistence + Auto-Restore (Added 2026-02-14)

Videos now persist when switching tabs and auto-restore on tab re-entry:

**Behavior:**
- Video URLs are saved to Supabase when generation completes
- On tab switch away from Judge, video state is preserved in memory
- On tab re-entry, if video state is lost (e.g., browser GC), auto-restores from Supabase
- Eliminates the "lost video" problem where users had to re-generate after tab switching

### 9.12 Expired Video URL Fixes (3 commits) (Added 2026-02-14)

Three separate categories of expired video URLs were fixed:

| Provider | Expiration Window | Fix Applied |
|----------|------------------|-------------|
| Replicate | ~24 hours | HEAD request validation + localStorage quota crash guard (`try/catch` around `setItem`) |
| Court Order CDN | Same as Judge Verdict | URL validity check before display; same pattern as Judge fix |
| HeyGen | Variable | Expiration-aware validation and re-fetch logic |

**localStorage Quota Guard:**
All `localStorage.setItem` calls for video URLs are now wrapped in try/catch to prevent `QuotaExceededError` from crashing the app when storage is full.

### 9.13 Video URL Expiration + Industry Standard Timeouts (Added 2026-02-14)

All video providers now use expiration-aware URL handling:
- URLs are validated before display (HEAD request or metadata check)
- Expired URLs trigger re-fetch from provider or show "expired" placeholder
- Timeouts standardized to industry norms across all video generation endpoints

### 9.14 Cristiano HeyGen Video 422 Fix (Added 2026-02-14)

**Problem:** Alignment error between storyboard QA validation and HeyGen render validation. QA passed scripts that the HeyGen render endpoint rejected (HTTP 422) due to different character counting methods.

**Root Cause:** The storyboard QA used JavaScript `string.length` for character counting, but HeyGen's backend counts characters differently (possibly including markup or using UTF-16 code units vs. grapheme clusters).

**Fix:** Aligned the QA validation character counting method with HeyGen's counting method, ensuring scripts that pass QA also pass render validation.

### 9.15 HeyGen 10K Prompt Limit Fixes (3 commits) (Added 2026-02-14)

Three incremental fixes to handle HeyGen's 10,000 character prompt limit (error code 400175):

1. **Database schema:** Added `comparison_id` column to `judge_reports` table to link reports to their comparison context
2. **Slim storyboard schema:** Reduced prompt payload size by removing redundant data fields from the storyboard JSON
3. **Prompt-size pre-check:** Added validation before sending to HeyGen API — if prompt exceeds 10,000 characters, it is trimmed or split before submission

### 9.16 Storyboard QA Word Count + Progress Bar (Added 2026-02-14)

- Word count validation added to storyboard QA to catch overlong scripts before they reach HeyGen
- Video generation progress bar showing real-time status updates during HeyGen video rendering
- Progress bar uses poll-based estimation similar to the Grok video progress formula

### 9.17 Cristiano Video CTA + Poster/Logo (Added 2026-02-14)

Judge verdict video (Cristiano avatar) now includes branding elements:
- "Visit Cluesnomads.com" call-to-action displayed on video
- Poster image shown before video playback begins
- Logo overlay on the video player

### 9.17a Cristiano B-Roll 6-Second Clip Limit (Added 2026-02-15)

**Problem:** HeyGen Video Agent V2 was rendering B-roll scenes as single long clips (16-18 seconds), producing static or repetitive footage.

**Root Cause:** Neither the Stage 1 storyboard builder prompt nor the Stage 2 HeyGen render prompt specified a maximum individual clip duration. HeyGen defaulted to a single continuous clip per scene.

**Fix:** Added explicit B-roll clip duration limits to both stages of the pipeline:
- **Stage 1 (storyboard.ts):** Added `CRITICAL: Each individual B-roll stock footage clip MUST be 6 seconds or less` rule in the B-ROLL STOCK FOOTAGE RULES section, with examples (e.g. 18s scene = 3 clips of 6s each)
- **Stage 2 (render.ts):** Added matching instruction in the STOCK FOOTAGE section of the HeyGen Video Agent prompt
- Ensures B-roll scenes use multiple varied clips instead of a single long clip, resulting in more dynamic and cinematic footage

**Files Changed:**
- `api/cristiano/storyboard.ts` — `buildSystemPrompt()` B-ROLL STOCK FOOTAGE RULES
- `api/cristiano/render.ts` — `buildVideoAgentPrompt()` STOCK FOOTAGE section

### 9.18 Court Order Video Storage (Added 2026-02-11)

Court Order videos can now be uploaded to Supabase Storage for permanent access:
- **Bucket:** `user-videos` (100 MB limit, public reads)
- **Path:** `user-videos/{userId}/{file}`
- **Column:** `court_orders.video_storage_path`
- RLS policies enforce user-owned uploads only

### 9.19 Judge Pre-generation System

**Added:** 2026-01-29

The Judge pre-generation system eliminates the 90+ second wait when users click the Judge tab by generating the report and video in the background immediately after comparison completes.

#### Flow

```
Comparison completes (App.tsx)
    │
    └─→ startJudgePregeneration() [fire-and-forget]
            │
            ├─→ POST /api/judge-report
            │       └─→ Stores in judge_reports table
            │       └─→ Chains to video generation
            │
            └─→ POST /api/avatar/generate-judge-video
                    └─→ TTS audio (ElevenLabs)
                    └─→ Video generation (Replicate Wav2Lip)
                    └─→ Stores in avatar_videos table

User clicks Judge tab (JudgeTab.tsx)
    │
    └─→ checkExistingVideo(comparisonId)
            │
            ├─→ If ready: Instant display
            ├─→ If processing: Show progress + poll
            └─→ If not found: Show "Generate" button
```

#### Key Files

| File | Purpose |
|------|---------|
| `src/services/judgePregenService.ts` | Fire-and-forget service |
| `src/hooks/useJudgeVideo.ts` | `checkExistingVideo()` method |
| `src/components/JudgeTab.tsx` | Cache check on mount |
| `src/App.tsx` | Trigger after comparison |

#### Caching (Updated 2026-02-05 — Dual-Storage)

- **Reports:** Stored in BOTH `localStorage` key `lifescore_judge_reports` AND Supabase `judge_reports` table
- **Videos:** Stored in Supabase `avatar_videos` table with `comparison_id`
- **Court Orders:** Stored in BOTH `localStorage` key `lifescore_court_orders` AND Supabase `court_orders` table

#### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Console polling spam | Video stuck in `processing` | Check Replicate Wav2Lip job status |
| Report not pre-generated | Comparison didn't complete fully | Check `enhancedStatus === 'complete'` before trigger |
| Video shows "Generate" | Cache miss or different comparisonId | Verify comparisonId matches between report and video |

---

## 10. Performance Optimization

### 10.1 Current Bottlenecks

| Issue | Impact | Location |
|-------|--------|----------|
| Sequential category evaluation | 6x slower | useComparison.ts |
| Duplicated Tavily calls | 5x API waste | evaluate.ts |
| No LLM parallelization | 5x slower | evaluate.ts |
| 240s timeout | Slow failures | evaluate.ts:15 |
| Large component (2265 lines) | Slow initial load | EnhancedComparison.tsx |

### 10.2 INP (Interaction to Next Paint) Fixes (Applied 2026-02-14)

**Backdrop-Filter Blur Removal:**
`backdrop-filter: blur()` was identified as a high-severity INP performance issue. It was removed from 8 CSS files:
- Causes GPU-intensive repaints on every interaction
- Login email input had 247ms INP delay caused by blur on the login overlay
- All decorative blur effects replaced with solid/semi-transparent backgrounds
- Files affected: LoginScreen.css, HelpModal.css, and 6 other component CSS files

**Impact:** Login input responsiveness improved from 247ms to <50ms INP. All interactive overlays now meet Core Web Vitals thresholds.

### 10.3 INP Fix — Judge Report Dropdown (Applied 2026-02-14)

**Problem:** Judge report dropdown selector had 354ms Interaction to Next Paint (INP), far exceeding Core Web Vitals threshold.

**Root Cause:** Selecting a report from the dropdown triggered expensive DOM re-renders of the entire judge verdict panel, including re-layout of evidence sections and video elements.

**Fix:** Removed the expensive DOM re-renders on judge report selection. The dropdown now updates the selected report ID in state without triggering a full re-render cascade.

**Impact:** Dropdown response time reduced from 354ms to ~50ms INP.

### 10.4 Recommended Fixes

**Priority 1 - Quick Wins:**
1. Reduce LLM timeout to 120s
2. Increase rate limit from 10 to 50 req/min
3. Skip Opus when agreement > 90%

**Priority 2 - Medium Effort:**
1. Parallelize category evaluation (6x faster)
2. Cache Tavily results per city
3. Split large components
4. Lazy load tabs

**Priority 3 - Caching System:**
1. Create `city_evaluations` table
2. Cache check before API calls
3. Cache write after evaluation
4. Delta updates for stale data

### 10.5 Expected Improvements

| Fix | Time Saved |
|-----|------------|
| Parallel categories | 150s → 30s |
| Cache Tavily | 80% API reduction |
| Skip Opus (agreement) | 30-40s saved |
| Lazy load tabs | 50% faster initial |

---

## 11. Error Handling & Logging

### 11.1 Error Response Format

```typescript
{
  success: false,
  error: {
    code: 'EVALUATION_TIMEOUT',
    message: 'LLM evaluation timed out',
    details: { provider: 'claude', timeout: 240000 }
  }
}
```

### 11.2 Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| RATE_LIMITED | Too many requests | Wait and retry |
| TIMEOUT | Request exceeded limit | Retry with backoff |
| AUTH_FAILED | Invalid API key | Check credentials |
| PROVIDER_ERROR | LLM API error | Try different provider |
| NO_DATA | Metrics unavailable | Check city validity |

### 11.3 Logging Locations

- **Console:** Development debugging
- **Vercel Logs:** Production API calls
- **Supabase:** `api_cost_records` for usage tracking

---

## 12. Deployment & Infrastructure

### 12.1 Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 300  // 5 minutes max
    }
  }
}
```

### 12.2 Environment Variables (Vercel)

**Required (Production):**
- `VITE_SUPABASE_URL` - Supabase project URL (client)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key (client)
- `SUPABASE_URL` - Supabase project URL (server)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server)
- `ANTHROPIC_API_KEY` - Claude API access
- `OPENAI_API_KEY` - GPT-4o and Olivia API access
- `TAVILY_API_KEY` - Web research API
- `STRIPE_SECRET_KEY` - Payment processing (server)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
- `RESEND_API_KEY` - Email alerts and notifications

**Required (Features):**
- `ELEVENLABS_API_KEY` - TTS for Olivia/Emilia/Judge
- `ELEVENLABS_VOICE_ID` - Default voice ID
- `SIMLI_API_KEY` - Primary avatar video generation (server-side only; client fetches via /api/simli-config)
- `KLING_VIDEO_API_KEY` - Primary video generation (Kling AI)
- `KLING_VIDEO_SECRET` - Kling JWT signing (HMAC-SHA256)
- `REPLICATE_API_TOKEN` - Video generation (Wav2Lip/Minimax fallback)
- `GAMMA_API_KEY` - PDF/PPTX report generation
- `RESEND_API_KEY` - Email alerts and notifications
- `EMILIA_ASSISTANT_ID` - OpenAI Assistant ID for Emilia help widget

**Optional:**
- `GEMINI_API_KEY` - Google Gemini evaluator
- `GROK_API_KEY` - xAI Grok evaluator
- `PERPLEXITY_API_KEY` - Perplexity evaluator
- `DID_API_KEY` - D-ID avatar fallback
- `HEYGEN_API_KEY` - HeyGen Gamma report video presenter (streaming + pre-rendered)
- `HEYGEN_OLIVIA_AVATAR_ID` - HeyGen Olivia avatar (Gamma video ONLY, not chat TTS)
- `HEYGEN_OLIVIA_VOICE_ID` - HeyGen Olivia voice (Gamma video ONLY, not ElevenLabs/OpenAI)
- `HEYGEN_CRISTIANO_AVATAR_ID` - HeyGen Judge Cristiano avatar (`7a0ee88ad6814ed9af896f9164407c41`)
- `HEYGEN_CRISTIANO_VOICE_ID` - HeyGen Judge Cristiano voice
- `RESEND_FROM_EMAIL` - Custom sender email
- `XAI_API_KEY` - Alias for GROK_API_KEY
- `KV_REST_API_URL` - Vercel KV cache (server-side only)
- `KV_REST_API_TOKEN` - Vercel KV cache (server-side only)

**Deprecated (No Longer Client-Side):**
- `VITE_SIMLI_API_KEY` → Now server-side, fetched via `/api/simli-config` proxy
- `VITE_SIMLI_FACE_ID` → Now server-side, fetched via `/api/simli-config` proxy
- `VITE_DEV_BYPASS_EMAILS` → Admin check now server-side via `/api/admin-check`
- `VITE_KV_REST_API_*` → Now proxied via `/api/kv-cache`

### 12.3 Timeout Safety Nets (Added 2026-02-14)

Timeouts have been added to multiple serverless endpoints to prevent hanging requests from exhausting Vercel function execution time:

| Endpoint | Timeout Added | Purpose |
|----------|--------------|---------|
| GDPR delete (`/api/user/delete`) | Yes | Prevents hung deletion from blocking function slot |
| Stripe webhook (`/api/stripe/webhook`) | Yes | Prevents slow Stripe processing from timing out silently |
| Report sharing (`/api/report/share`) | Yes | Prevents large report uploads from hanging indefinitely |
| Database operations (various) | Yes | Prevents stuck Supabase queries from consuming function time |

**Pattern:** Each endpoint wraps its core logic in a `Promise.race` with a timeout promise, returning a 504 Gateway Timeout response if the operation exceeds the allowed duration.

### 12.4 Upload Timeout Increases (Added 2026-02-14)

Upload timeouts were increased to prevent failures on large payloads:

| Upload Type | Old Timeout | New Timeout | Reason |
|-------------|------------|-------------|--------|
| Report HTML upload | 60s | 180s | Large HTML reports with embedded images were timing out |
| User video upload | 120s | 240s | High-resolution court order videos exceeding previous limit |

### 12.5 200MB File Size Limit on Reports Bucket (Added 2026-02-14)

The `reports` Supabase Storage bucket now enforces a 200MB maximum file size:
- Previously: No size limit enforced
- Now: 200MB hard limit
- Prevents accidental oversized uploads from consuming storage quota
- Returns a clear error message when limit is exceeded

### 12.6 Build Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

---

## 13. Debugging Procedures

### 13.1 Comparison Not Completing

1. Check Vercel function logs for timeout
2. Verify API keys are valid
3. Check rate limiting status
4. Try single provider instead of enhanced
5. Reduce category batch size

### 13.2 Scores Showing "No Data"

1. Verify Tavily returned results
2. Check LLM response parsing
3. Look for JSON parse errors
4. Check metric ID mappings

### 13.3 Video Generation Stuck

1. Check `grok_videos` table for job status
2. Verify Kling/Replicate API keys
3. Check for JWT expiration
4. Review error_message field

### 13.4 Olivia Not Responding

1. Check OpenAI thread ID validity
2. Verify message limits not exceeded
3. Check for rate limiting
4. Review assistant configuration

---

## 14. Known Issues & Workarounds

### 14.1 Active Issues

| Issue | Workaround | Status |
|-------|------------|--------|
| Perplexity partial failures | Graceful degradation | Investigating |
| Slow enhanced comparison | Use standard mode | Performance fix planned |

### 14.2 Resolved Issues

| Issue | Resolution | Date |
|-------|------------|------|
| Tavily auth errors | Switched to Bearer token | 2026-01-21 |
| FeatureGate blocking | Fails open during auth load | 2026-01-27 |
| Olivia audio issues | Added interrupt functions | 2026-01-27 |
| #48 NewLifeVideos instability | Error count tracking + auto-reset (3 failures) | 2026-02-04 |
| #49 Gemini cold start timeouts | Retry logic with exponential backoff (3 attempts) | 2026-02-04 |
| #50 Cost tracking not persisting | Auto-sync to Supabase on comparison complete | 2026-02-04 |
| Gamma "Generation ID missing" | api/gamma.ts fallback: `status.id \|\| generationId` | 2026-02-05 |
| Judge reports not in Saved tab | SavedComparisons.tsx now reads judge_reports | 2026-02-05 |
| Incomplete save coverage | All 9 save points now write to BOTH localStorage AND Supabase | 2026-02-05 |
| user_preferences schema mismatch | Code upsert now matches actual single-row-per-user table | 2026-02-05 |
| judge_reports schema mismatch | Column names corrected: winner, margin, verdict, full_report | 2026-02-05 |
| judge_reports onConflict wrong | Changed from report_id to (user_id, report_id) constraint | 2026-02-05 |
| Tavily timeout too long | Reduced from 240s to 45s | 2026-02-05 |
| Judge "winner is TIE" bug | Tie handling fixed — no more "winner is TIE" text in video scripts | 2026-02-10 |
| Judge wrong city winner | Score passing fixed in standard mode; winner/loser logic corrected | 2026-02-10 |
| Judge trend DB constraint | Trend values standardized to 'improving' to match DB CHECK constraint | 2026-02-10 |
| Auth bypass on /api/emilia/manuals | JWT auth required; unverified email query param removed | 2026-02-10 |
| 8 unprotected API endpoints | JWT auth added to emilia/thread, avatar/simli-speak, judge-video, +5 others | 2026-02-10 |
| Video progress bar stuck at 73% | New formula: remaining percentage × poll fraction (scales to 95%) | 2026-02-13 |
| Play button not working | Removed readyState >= 2 gate; blob URLs load async so play() called directly | 2026-02-13 |
| Promise.all blocking playback | Switched to Promise.allSettled so one broken video doesn't block the other | 2026-02-13 |
| Expired replicate URLs from cache | HEAD validation on replicate.delivery URLs; auto-marks expired as failed | 2026-02-13 |
| Blob fetch creating garbage blobs | Content-type check before creating blob; dead URLs tracked in state Set | 2026-02-13 |
| grok_videos UNIQUE constraint | UNIQUE constraint now includes status column (database hardening) | 2026-02-10 |
| Parallel video generation timeout | Sequential generation (loser first, then winner); timeout doubled to 240s | 2026-02-13 |
| "Watch Presenter" label incorrect | Renamed to "Listen to Presenter" — voice-only mode, not video watching | 2026-02-14 |
| Login email input 247ms INP delay | Removed backdrop-filter blur from LoginScreen overlay | 2026-02-14 |
| Gamma reports not persisting | Foreign key violation on `comparison_id` — Supabase INSERT silently failed due to fire-and-forget `.then()` pattern | 2026-02-14 |
| backdrop-filter blur causing INP | Removed `backdrop-filter: blur()` from 8 CSS files (GPU-intensive repaints on every interaction) | 2026-02-14 |
| Trophy 🏆 on loser in Gamma report | Added explicit TROPHY PLACEMENT RULE to Gamma prompt + winner marker in data table + explicit Page 2 instructions | 2026-02-14 |
| CostDashboard showing $0.00 | 3-bug fix: field-by-field DB/localStorage merge, appendServiceCost DB sync, Perplexity `stream: false` | 2026-02-14 |
| Judge report dropdown 354ms INP | Removed expensive DOM re-renders on selection; now ~50ms | 2026-02-14 |
| Replicate video URLs expiring after 24h | HEAD request validation + localStorage quota crash guard (try/catch) | 2026-02-14 |
| Court Order CDN URLs expiring | URL validity check before display, same pattern as Judge fix | 2026-02-14 |
| HeyGen video URLs expiring | Expiration-aware validation and re-fetch logic | 2026-02-14 |
| HeyGen video generation hanging | Added timeout handling + Supabase query reliability fixes | 2026-02-14 |
| Videos lost on Judge tab switch | Videos now persist in memory + auto-restore from Supabase on re-entry | 2026-02-14 |
| GDPR/Stripe/share endpoints hanging | Added timeout safety nets to 4 endpoint categories | 2026-02-14 |
| Auth profile fetch retry storm | Added 60-second cooldown after profile fetch failure | 2026-02-14 |
| Report HTML upload timing out | Timeout increased from 60s to 180s | 2026-02-14 |
| User video upload timing out | Timeout increased from 120s to 240s | 2026-02-14 |
| No file size limit on reports bucket | 200MB limit enforced on reports storage bucket | 2026-02-14 |
| Cristiano HeyGen video 422 error | Aligned QA character counting with HeyGen render validation | 2026-02-14 |
| Judge reports lost on cache clear | Supabase fallback when localStorage misses judge report data | 2026-02-14 |
| HeyGen 10K char prompt limit (400175) | Added comparison_id column, slim storyboard schema, prompt-size pre-check | 2026-02-14 |
| Supabase cold start delays | Added warm-up ping on app load + fixed retry logic (PromiseLike vs Promise) | 2026-02-14 |
| No storyboard word count validation | Word count validation + video generation progress bar added | 2026-02-14 |
| Saved judge verdicts missing 6 categories | Load function now restores all 6 freedom category analysis sections | 2026-02-14 |
| Grok timeout on Business category (25 metrics) | Automatic batch splitting for large category payloads | 2026-02-14 |
| Dark mode: unreadable city names in saved reports | City names now use visible color in dark mode | 2026-02-14 |
| Dark mode: date text hard to read | Date text now uses crisp white (#FFFFFF) in dark mode | 2026-02-14 |
| AUDIO badge hidden at bottom of PIP | Badge moved to top-right corner + animated voice wave indicator when playing | 2026-02-14 |
| Mobile: Winner/Loser score cards overflow | Added `@media (max-width: 480px)` rules to Results.css — reduced padding, font-size, gap on `.score-grid` and `.score-box` | 2026-02-15 |
| Mobile: Category % weight badge pushed off-screen | Added `flex-shrink: 0`, `white-space: nowrap` to `.category-weight`; `min-width: 0`, `text-overflow: ellipsis` to `.category-name` in Results.css | 2026-02-15 |
| Mobile: About Clues services table overflows | Added `display: block; overflow-x: auto` to table wrapper + reduced cell padding/font-size in AboutClues.css | 2026-02-15 |
| Mobile: How It Works step 3 modules cut off | Reduced module chip padding, font-size, and grid gap in `@media (max-width: 480px)` in AboutClues.css | 2026-02-15 |
| Mobile: Olivia READY/STOP buttons blocking body | Repositioned `.video-controls-overlay` to bottom edges, reduced button size in AskOlivia.css | 2026-02-15 |
| Mobile: Gamma Read/Listen/Open/Close buttons overflow | Added `flex-direction: column` to `.embedded-header`, `flex-wrap: wrap` to `.embedded-actions` in VisualsTab.css | 2026-02-15 |
| Mobile: Judge doormat triangle + retry button overflow | Reduced silhouette dimensions (80px→40px), icon size, and button padding at 480px/768px breakpoints in JudgeTab.css | 2026-02-15 |
| Mobile: GoToMyNewCity Sovereign badge overflow | Added first-ever `@media (max-width: 480px)` block to GoToMyNewCity.css — footer `flex-wrap`, badge padding/font-size reduction | 2026-02-15 |
| Mobile: Settings CONNECTED button off-screen | Added `flex-wrap: wrap`, `min-width: 0`, `text-overflow: ellipsis` to `.connected-account` in SettingsModal.css | 2026-02-15 |
| Supabase timeout/retry values bloated by rogue agent | Reverted SUPABASE_TIMEOUT_MS from 20s→12s, maxRetries from 3→2 across 11 files. Aligned all withTimeout wrappers (databaseService, reportStorageService, savedComparisons, useTierAccess, JudgeTab). Reduced AuthContext PROFILE_TIMEOUT_MS 24s→15s, SESSION_TIMEOUT_MS 45s→20s. Reduced SavedComparisons SYNC_TIMEOUT_MS 20s→15s. Reduced generate-judge-video DB_TIMEOUT_MS 45s→15s. | 2026-02-15 |
| Resend `from` email wrong sender | Changed default from address to alerts@lifescore.app in api/notify.ts | 2026-02-16 |
| Missing isPasswordRecovery in AuthContext setState | Added isPasswordRecovery to initial setState call in AuthContext.tsx; removed unused import in CitySelector.tsx | 2026-02-16 |
| 3 broken notification flows (CitySelector, GoToMyNewCity, VisualsTab) | Fixed notification not triggering on Compare, Freedom Tour, and Gamma report completion; added error logging to api/notify.ts | 2026-02-16 |
| "VS" text invisible in dark mode | Applied visible text color to VS separator in AdvancedVisuals.css, ContrastDisplays.css, JudgeTab.css, JudgeVideo.css | 2026-02-16 |
| Founder name missing "II" suffix | Added "II" suffix to "John E. Desautels" in package.json, api/shared/types.ts, handoff docs, compliance docs, and DPA agreements | 2026-02-16 |
| Mobile: +/- weight buttons off-screen | Text wrapping instead of truncating in EnhancedComparison.css and Results.css | 2026-02-16 |
| Mobile: LLM provider badges overflow | Badge container now wraps on narrow viewports in EnhancedComparison.css | 2026-02-16 |
| Visuals page labeling confusion | Clarified section labels in AdvancedVisuals.tsx and VisualsTab.tsx to distinguish video types and report sections | 2026-02-16 |
| Gamma report links not clickable | Fixed CSS pointer-events and z-index on report URLs in VisualsTab.css and VisualsTab.tsx | 2026-02-16 |
| Browser not offering to save login credentials | Added proper `<form>` structure, autocomplete attributes, and name attributes to LoginScreen.tsx for browser password manager detection (3 iterations: ab30df4, b33989c, ac6a910) | 2026-02-16 |
| Judge tab stale state after comparison switch | JudgeTab.tsx now resets all state (videos, verdicts, reports) when the active comparison changes | 2026-02-16 |
| Court Order / Freedom Tour toggle tabs (reverted) | Added toggle tabs in JudgeTab.tsx, then reverted — replaced with glassmorphic buttons approach instead | 2026-02-16 |
| Password reset email not sending | Redirect URL in `resetPasswordForEmail()` was mismatched; fixed to use `window.location.origin + '/auth/callback'` in both LoginScreen.tsx and AuthContext.tsx | 2026-02-16 |
| No admin notification on new signups | New endpoint `POST /api/admin/new-signup` sends email to admin (cluesnomads@gmail.com) via Resend when a new user signs up; called from AuthContext.tsx after successful signup | 2026-02-16 |
| Gamma export URLs (PDF/PPTX) expiring | Industry-standard asset materialization: `api/gamma.ts` now downloads PDF/PPTX from Gamma CDN immediately on generation completion and uploads to Supabase Storage (`gamma-exports` public bucket). Returns permanent public URLs instead of ephemeral CDN URLs. Same pattern as `persistVideo.ts`. New DB columns: `pdf_storage_path`, `pptx_storage_path` on both `gamma_reports` and `reports` tables. Migrations: `20260217_add_gamma_export_storage_paths.sql` (columns), `20260217_create_gamma_exports_storage.sql` (bucket). All 4 Gamma iframe embeds (VisualsTab ×2, ReportPresenter, SavedComparisons) now have `onError`/`onLoad` handlers with fallback UI. Full pipeline: API persistence → types → databaseService → savedComparisons → gammaService → UI components. 11 files changed, 35 discrete code changes. | 2026-02-17 |
| Gamma report colored cards losing colors | `solidBoxes` variant relies on inline `color="#HEX"` attributes that Gamma's AI rendering strips during beautification. Fix: replaced 6× category LLM agreement heat map pages with `barStats` (bar LENGTH conveys confidence: 95% Unanimous → 50% Split). PAGE 64 consensus stats → `semiCircle` radial gauges + table. PAGE 51 myth vs reality → structured table with ❌/✅ columns. PAGE 53 hidden costs → `semiCircle` dial gauges (2×2 layout). Visual specs header updated. Same data, zero prompt size increase, varied chart types. Updated in: `gammaService.ts`, Supabase seed migration, `GAMMA_PROMPT_TEMPLATE.md`, `GAMMA_PROMPTS_MANUAL.md`. | 2026-02-17 |
| **SECURITY AUDIT — 47 fixes (2026-02-26)** | Comprehensive security + code quality audit. All changes on branch `claude/coding-session-Jh27y`. Details below. | 2026-02-26 |
| H1: React hooks below conditional return | Moved all React hooks above conditional early return in affected component — React rules of hooks violation caused potential crash | 2026-02-26 |
| S1: API key leaked to browser | `api/avatar/simli-session` was sending the Simli API key in the response body. Removed — client never needed it | 2026-02-26 |
| X1+X2: Open redirect in Stripe endpoints | `success_url` and `cancel_url` in Stripe checkout/portal now validated against app origin — prevents phishing redirects | 2026-02-26 |
| X3: voiceId path injection | `voiceId` parameter in ElevenLabs TTS now validated with regex before URL interpolation — prevents path traversal | 2026-02-26 |
| N4: Tie case blank victory text | When scores are tied, report verdict text now says "evenly matched" instead of showing blank/broken winner text | 2026-02-26 |
| RT1: withTimeout retry broken | `withTimeout` accepted a pre-created promise, so retries reused stale results. Now accepts a factory function for proper retry semantics | 2026-02-26 |
| SD1+SD2: Hardcoded year "2025" | Replaced all hardcoded year strings with `new Date().getFullYear()` — copyright notices and date displays now always current | 2026-02-26 |
| D1: innerHTML XSS vulnerability | `innerHTML`-based HTML entity decoding replaced with safe `DOMParser` approach | 2026-02-26 |
| M1: JSDoc timeout mismatch | JSDoc said 45000ms timeout but code used 12000ms — corrected the documentation comment | 2026-02-26 |
| M3: Hardcoded bypass emails | `grok-generate.ts` had hardcoded admin emails for tier bypass — replaced with shared `getAdminEmails()` | 2026-02-26 |
| B4: `var` scoping bug | `var gpt4oTavilyCredits` in evaluate.ts replaced with `let` — prevents accidental hoisting across scope | 2026-02-26 |
| DC1: Dead `byProvider` Map | Unused `byProvider` Map accumulator removed from rateLimiter.ts | 2026-02-26 |
| DC3: Dead `gitHubUsername` state | Unused `gitHubUsername` state variable removed from SavedComparisons.tsx | 2026-02-26 |
| P2: OG/Twitter image relative URLs | Social meta tags now use absolute URLs (`https://clueslifescore.com/...`) — previews work on all platforms | 2026-02-26 |
| S4: Secret masking too loose | Admin env-check endpoint now masks secrets more aggressively (shorter reveal length) | 2026-02-26 |
| S5: Admin emails copy-pasted in 10 files | Created shared `getAdminEmails()` in `api/shared/auth.ts` — migrated 9 API files to use it | 2026-02-26 |
| EN1+EN2: Missing env var docs | Added missing `VITE_*` variables to `.env.example`; marked `EMILIA_ASSISTANT_ID` as required | 2026-02-26 |
| EN3: Inconsistent Resend from-address | Standardized `from` address to `alerts@lifescore.app` in check-quotas.ts email sends | 2026-02-26 |
| C2: CORS missing on admin endpoint | `sync-emilia-knowledge` was missing CORS mode — added shared CORS helper | 2026-02-26 |
| C3: CORS too open on auth endpoints | Tightened CORS from `*` (any origin) to same-app restricted origin on 3 auth-protected endpoints | 2026-02-26 |
| A12: gun-comparison unprotected | Added JWT auth to `/api/olivia/gun-comparison` | 2026-02-26 |
| A13: olivia/context unprotected | Added JWT auth to `/api/olivia/context` | 2026-02-26 |
| A14: emilia/thread unprotected | Added JWT auth to `/api/emilia/thread` | 2026-02-26 |
| A15: simli-speak unprotected | Added JWT auth to `/api/avatar/simli-speak` | 2026-02-26 |
| A16: video-status unprotected | Added JWT auth to `/api/avatar/video-status` | 2026-02-26 |
| A17: olivia/avatar/heygen unprotected | Added JWT auth to `/api/olivia/avatar/heygen` streaming endpoint | 2026-02-26 |
| A18+A19: heygen-video + DID streams unprotected | Added JWT auth to both HeyGen video and D-ID streams endpoints | 2026-02-26 |
| A27: grok-status unprotected | Added JWT auth to `/api/video/grok-status` polling endpoint | 2026-02-26 |
| A28: grok-generate IDOR vulnerability | Added JWT auth + **fixed IDOR** — userId from request body overridden with authenticated user's ID, preventing spoofing | 2026-02-26 |
| A30: evaluate unprotected | Added JWT auth to `/api/evaluate` — the main comparison engine | 2026-02-26 |
| A31: judge unprotected | Added JWT auth to `/api/judge` Opus consensus endpoint | 2026-02-26 |
| A33: gamma unprotected | Added JWT auth to `/api/gamma` report generation endpoint | 2026-02-26 |
| A34: judge-video unprotected | Added JWT auth to `/api/judge-video` | 2026-02-26 |
| RL2: check-quotas unprotected | Added JWT auth to `/api/usage/check-quotas` | 2026-02-26 |
| RL3: elevenlabs unprotected | Added JWT auth to `/api/usage/elevenlabs` | 2026-02-26 |
| AC4: prompts GET unprotected | Added JWT auth to GET `/api/prompts` | 2026-02-26 |
| A11: invideo-override unprotected | Added JWT auth to `/api/video/invideo-override` | 2026-02-26 |
| CL1-CL6: 87 debug console.log removed | Removed 87 debug `console.log` statements from 10 component files: JudgeTab (44), CourtOrderVideo (10), VisualsTab (10), AskOlivia (7), SavedComparisons (5), + 11 from 5 smaller components | 2026-02-26 |

---

## 15. Monitoring & Alerts

### 15.1 Key Metrics to Monitor

- API response times
- Error rates by endpoint
- LLM provider availability
- Tavily credit usage
- Video generation success rate

### 15.2 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 5% | > 15% |
| Response time | > 60s | > 180s |
| Provider failures | 2 in 5 min | 5 in 5 min |

---

## 16. Security Considerations

### 16.1 API Key Security

- Never log API keys
- Don't store user-provided keys
- Use environment variables for system keys
- Rotate keys quarterly

### 16.2 Data Protection

- RLS enabled on all tables
- User data isolated by user_id
- GDPR compliance logging
- 30-day deletion queue

### 16.3 JWT Auth Requirements (Added 2026-02-10, Major Expansion 2026-02-26)

Nearly all API endpoints now require JWT authentication headers. The 2026-02-26 security audit added auth to 20+ previously unprotected endpoints, bringing total authenticated endpoints to **38+**.

**Comparison & Scoring — ALL now authenticated:**

| Endpoint | Auth Added |
|----------|-----------|
| `POST /api/evaluate` | 2026-02-26 — Main LLM evaluation engine |
| `POST /api/judge` | 2026-02-26 — Opus consensus builder |
| `POST /api/gamma` | 2026-02-26 — Report generation |
| `POST /api/judge-video` | 2026-02-10 |
| `POST /api/judge-report` | Already authenticated |

**Video Generation — ALL now authenticated:**

| Endpoint | Auth Added |
|----------|-----------|
| `POST /api/video/grok-generate` | 2026-02-26 — **Also fixed IDOR**: userId from body now overridden with authenticated user ID |
| `GET/POST /api/video/grok-status` | 2026-02-26 |
| `GET/POST/DELETE /api/video/invideo-override` | 2026-02-26 |
| `POST /api/avatar/generate-judge-video` | Already authenticated |
| `GET /api/avatar/video-status` | 2026-02-26 |
| `POST /api/avatar/simli-speak` | 2026-02-10 |

**Olivia Assistant — ALL now authenticated:**

| Endpoint | Auth Added |
|----------|-----------|
| `POST /api/olivia/chat` | Already authenticated |
| `POST /api/olivia/context` | 2026-02-26 |
| `POST /api/olivia/gun-comparison` | 2026-02-26 |
| `POST /api/olivia/tts` | Already authenticated |
| `POST /api/olivia/avatar/streams` | 2026-02-26 |
| `POST /api/olivia/avatar/heygen` | 2026-02-26 |
| `POST/GET /api/olivia/avatar/heygen-video` | 2026-02-26 |

**Emilia Help — ALL now authenticated:**

| Endpoint | Auth Added |
|----------|-----------|
| `POST /api/emilia/thread` | 2026-02-26 (was 2026-02-10, re-verified) |
| `POST /api/emilia/message` | Already authenticated |
| `POST /api/emilia/speak` | Already authenticated |
| `GET /api/emilia/manuals` | 2026-02-10 — auth bypass fixed |

**Usage & Quota — ALL now authenticated:**

| Endpoint | Auth Added |
|----------|-----------|
| `GET/POST /api/usage/check-quotas` | 2026-02-26 |
| `GET /api/usage/elevenlabs` | 2026-02-26 |

**Admin — ALL require Admin role:**

| Endpoint | Auth Added |
|----------|-----------|
| `GET /api/admin-check` | Already authenticated |
| `GET /api/admin/env-check` | Already authenticated |
| `POST /api/admin/sync-olivia-knowledge` | Already authenticated |
| `POST /api/admin/sync-emilia-knowledge` | Already authenticated |
| `GET/PUT /api/prompts` | 2026-02-26 (GET was unprotected) |

**Endpoints that intentionally do NOT require auth:**

| Endpoint | Reason |
|----------|--------|
| `POST /api/stripe/webhook` | Uses Stripe signature verification instead |
| `POST /api/avatar/video-webhook` | Replicate webhook callback |
| `GET /api/health` | Public health check |
| `GET /api/simli-config` | Returns sanitized config only |

**Admin Check Caching:**
- Admin status cached with 5-minute TTL + 1-hour grace period
- Prevents admin lockout during Supabase timeouts
- Tier cache survives transient database failures

### 16.4 Rate Limiting

```typescript
// api/shared/rateLimit.ts
const LIMITS = {
  standard: { windowMs: 60000, maxRequests: 30 },
  heavy: { windowMs: 60000, maxRequests: 10 }  // Recommend: 50
};
```

### 16.5 CORS Hardening (Added 2026-02-26)

Three endpoints had CORS tightened from `Access-Control-Allow-Origin: *` (any website) to same-app restricted origin. All auth-protected endpoints now only accept requests from the LIFE SCORE application domain.

Additionally, the `sync-emilia-knowledge` admin endpoint was missing CORS configuration entirely — now uses the shared CORS helper.

### 16.6 XSS & Injection Fixes (Added 2026-02-26)

| Fix | File | Description |
|-----|------|-------------|
| D1 | Client-side | `innerHTML`-based HTML entity decoding replaced with safe `DOMParser` |
| X3 | `api/olivia/tts.ts` | `voiceId` parameter validated with regex before URL path interpolation |
| X1+X2 | Stripe endpoints | `success_url` and `cancel_url` validated against app origin |

### 16.7 Shared Auth Module (Added 2026-02-26)

Admin email addresses were previously hardcoded in 10+ API files. A shared `getAdminEmails()` function was created in `api/shared/auth.ts` and all files migrated to use it. This ensures admin access changes propagate instantly across all endpoints.

### 16.8 Console Log Cleanup (Added 2026-02-26)

87 debug `console.log` statements removed from 10 frontend component files. These were leaking internal state, comparison IDs, API response data, and video URLs to the browser console in production. Remaining `console.log` calls are intentional operational logging (errors, warnings).

| File | Removed |
|------|---------|
| JudgeTab.tsx | 44 |
| CourtOrderVideo.tsx | 10 |
| VisualsTab.tsx | 10 |
| AskOlivia.tsx | 7 |
| SavedComparisons.tsx | 5 |
| 5 smaller components | 11 |

---

---

## 17. API Quota Monitoring System

**Added:** 2026-01-30

Comprehensive quota tracking for all 16 API providers with admin-configurable limits, color-coded warnings, and email alerts.

### 17.1 All 16 Tracked Providers

| Provider Key | Display Name | Icon | Quota Type | Default Limit | Pricing |
|--------------|--------------|------|------------|---------------|---------|
| `anthropic_sonnet` | Claude Sonnet 4.5 | 🎵 | dollars | $50.00 | $3/1M input, $15/1M output |
| `anthropic_opus` | Claude Opus 4.5 | 🧠 | dollars | $100.00 | $15/1M input, $75/1M output |
| `openai_gpt4o` | GPT-4o | 🤖 | dollars | $50.00 | $2.50/1M input, $10/1M output |
| `openai_olivia` | GPT-4 Turbo (Olivia) | 💬 | dollars | $30.00 | $10/1M input, $30/1M output |
| `gemini` | Gemini 3 Pro | 💎 | dollars | $25.00 | $1.25/1M input, $5/1M output |
| `grok` | Grok 4 | 🚀 | dollars | $30.00 | $3/1M input, $15/1M output |
| `perplexity` | Perplexity Sonar | 🔍 | dollars | $25.00 | $1/1M input, $5/1M output |
| `tavily` | Tavily Research | 🔎 | credits | 5,000 | ~$0.01/credit |
| `elevenlabs` | ElevenLabs TTS | 🔊 | characters | 100,000 | $0.18/1K chars |
| `openai_tts` | OpenAI TTS | 🗣️ | dollars | $10.00 | $0.015/1K chars |
| `simli` | Simli Avatar | 🎭 | seconds | 3,600 | $0.02/sec |
| `d_id` | D-ID Avatar | 👤 | credits | 20 | ~$0.025/sec |
| `heygen` | HeyGen Avatar | 🎥 | seconds | 600 | $0.032/sec |
| `replicate` | Replicate Wav2Lip | 🎬 | dollars | $10.00 | $0.0014/sec |
| `kling` | Kling AI Video | 🖼️ | credits | 100 | ~$0.05/image |
| `gamma` | Gamma Reports | 📊 | credits | 50 | ~$0.50/generation |

### 17.2 Warning Thresholds

| Level | Percentage | Color | Action |
|-------|------------|-------|--------|
| Green | 0-49% | 🟢 | Normal operation |
| Yellow | 50-69% | 🟡 | Email alert sent |
| Orange | 70-84% | 🟠 | Email alert sent |
| Red | 85-99% | 🔴 | Email alert sent |
| Exceeded | 100%+ | ⚫ | Email alert + fallback activated |

### 17.3 Database Tables

**api_quota_settings** - Admin-configurable limits:
- provider_key TEXT UNIQUE (e.g., 'elevenlabs')
- display_name TEXT (e.g., 'ElevenLabs TTS')
- quota_type TEXT ('dollars', 'tokens', 'characters', 'credits', 'requests', 'seconds')
- monthly_limit DECIMAL (e.g., 100.00)
- warning_yellow/orange/red DECIMAL (0.50, 0.70, 0.85)
- current_usage DECIMAL (updated by API calls)
- alerts_enabled BOOLEAN
- fallback_provider_key TEXT

**api_quota_alert_log** - Email history

### 17.4 API Endpoints

- GET /api/usage/check-quotas - Returns all quota statuses
- POST /api/usage/check-quotas - Updates usage and triggers alerts
- GET /api/usage/elevenlabs - Real-time ElevenLabs subscription usage

### 17.5 Email Alerts

**Recipients:** brokerpinellas@gmail.com, cluesnomads@gmail.com
**Provider:** Resend API
**Domain:** clueslifescore.com (verified)

### 17.6 Fallback Chain

| Primary | Fallback | Trigger |
|---------|----------|---------|
| ElevenLabs TTS | OpenAI TTS | 401/429 error |
| Simli Avatar | D-ID Avatar | Quota exceeded |
| D-ID Avatar | Replicate | Quota exceeded |

### 17.7 CostDashboard Integration

Access via 💰 icon in app header. Shows color-coded quota cards for all 16 providers.

---

## 18. TTS Fallback System

**Added:** 2026-01-30

Automatic fallback from ElevenLabs to OpenAI TTS when quota exceeded.

### 18.1 Voice Assignments

| Character | OpenAI Voice ID |
|-----------|-----------------|
| Olivia | `nova` (warm, conversational female) |
| Emilia | `shimmer` (softer, expressive female) |
| Cristiano (Judge) | `onyx` (deep, authoritative male) |

**Important:** Olivia and Emilia use DIFFERENT voices.

### 18.2 Implementation Files

| File | Character | Voice |
|------|-----------|-------|
| api/olivia/tts.ts | Olivia | nova |
| api/emilia/speak.ts | Emilia | shimmer |
| api/judge-video.ts | Cristiano | onyx |

### 18.3 OpenAI TTS Pricing

tts-1 (standard): $0.015 / 1K characters

---

## 19. Dual-Storage Save Architecture

**Added:** 2026-02-05 (Session 8/9)

All user data now saves to BOTH localStorage (offline-first, instant) AND Supabase (cloud backup, cross-device sync). Every `localStorage.setItem` and every Supabase call is wrapped in try/catch so one failing doesn't block the other.

### 19.1 Save Map

| Data | localStorage Key | Supabase Table | Service Function |
|------|-----------------|---------------|-----------------|
| Standard Comparisons | `lifescore_saved_comparisons` | `comparisons` | `saveComparisonLocal()` |
| Enhanced Comparisons | `lifescore_saved_enhanced` | `comparisons` | `saveEnhancedComparisonLocal()` |
| Gamma Reports | `lifescore_saved_gamma_reports` | `gamma_reports` | `saveGammaReport()` |
| Judge Reports | `lifescore_judge_reports` | `judge_reports` | `saveJudgeReport()` |
| Court Orders | `lifescore_court_orders` | `court_orders` | `saveCourtOrder()` |
| Weight Presets | `lifescore_weights` | `user_preferences.weight_presets` | `saveUserPreferenceToDb()` |
| Law/Lived Prefs | `lifescore_lawlived` | `user_preferences.law_lived_preferences` | `saveUserPreferenceToDb()` |
| Excluded Categories | `lifescore_excluded_categories` | `user_preferences.excluded_categories` | `saveUserPreferenceToDb()` |
| Dealbreakers | `lifescore_dealbreakers` | `user_preferences.dealbreakers` | `saveUserPreferenceToDb()` |

### 19.2 Central Service File

**`src/services/savedComparisons.ts`** — All save/load/delete functions live here.

### 19.3 Error Handling Pattern

```typescript
// Every save follows this pattern:
try {
  localStorage.setItem(key, JSON.stringify(data));
} catch (e) {
  console.warn(`[Save] localStorage failed for ${key}:`, e);
}

try {
  const user = await getCurrentUser();
  if (user) {
    await supabase.from(table).upsert({ user_id: user.id, ...data });
  }
} catch (e) {
  console.warn(`[Save] Supabase failed for ${table}:`, e);
}
```

### 19.4 Judge Report Persistence — Supabase Fallback (Added 2026-02-14)

When loading a judge report, the system now falls back to Supabase when localStorage misses the data:

**Lookup Order:**
1. Check `localStorage` key `lifescore_judge_reports` for the `comparisonId`
2. If not found: Query `supabase.from('judge_reports')` with `user_id` and `comparison_id`
3. If found in Supabase: Backfill into localStorage for future instant access

**Impact:** Judge reports now survive browser cache clearing, incognito sessions, and cross-device access. Previously, clearing browser data meant losing all judge report state.

### 19.5 Missing 6 Category Sections in Saved Judge Verdicts (Added 2026-02-14)

**Problem:** Loading a saved judge verdict only restored the executive summary. The 6 freedom category analysis sections (Financial, Personal, Social, Political, Digital, Physical) were missing.

**Root Cause:** The save function was only persisting the top-level verdict fields (`winner`, `margin`, `verdict`) and not the nested `category_analysis` array containing the 6 detailed sections.

**Fix:** The save and load functions now correctly serialize and deserialize all 6 freedom category analysis sections alongside the executive summary.

### 19.6 Debugging Save Issues

| Symptom | Check |
|---------|-------|
| Data not persisting | Check browser devtools > Application > localStorage |
| Data not syncing to cloud | Check console for `[Save] Supabase failed` warnings |
| Data missing on new device | Verify user is logged in (Supabase auth) |
| Duplicate entries | Check upsert onConflict constraints in databaseService.ts |

### 19.7 Key Files

| File | Role |
|------|------|
| `src/services/savedComparisons.ts` | Central save service (all 9 save points) |
| `src/services/databaseService.ts` | Supabase CRUD operations |
| `src/components/JudgeTab.tsx` | Judge report saves |
| `src/services/judgePregenService.ts` | Judge pre-generation saves |
| `src/components/SavedComparisons.tsx` | Reads all saved data for display |

---

## 20. App Prompts System (Added 2026-02-10)

### 20.1 Overview

All 50 system prompts used across the application are cataloged in the `app_prompts` database table and viewable/editable through the Help Modal > Prompts tab (admin only).

### 20.2 Prompt Categories

| Category | Count | Purpose |
|----------|-------|---------|
| evaluate | 11 | LLM evaluation prompts for city comparison |
| judge | 8 | Judge verdict and analysis prompts |
| olivia | 7 | Olivia AI assistant system prompts |
| gamma | 8 | Report generation prompts |
| video | 8 | Video generation prompts (Kling/Replicate) |
| invideo | 8 | Cinematic video override prompts |

### 20.3 Key Files

| File | Purpose |
|------|---------|
| `api/prompts.ts` | GET/POST/PUT for managing prompts (admin only) |
| `src/components/ManualViewer.tsx` | Integrated with app_prompts DB for real-time editing |
| `supabase/migrations/20260210_create_app_prompts.sql` | Table schema |
| `supabase/migrations/20260212_seed_all_prompts.sql` | 50 reference prompts seeded |

**Note:** Most prompts are dynamically generated in TypeScript code at runtime. The database entries are read-only references that admins can view and customize.

### 20.4 Gamma Standard Report Prompt — Trophy Placement Rule (Added 2026-02-14)

The Gamma standard report prompt (`formatComparisonForGamma()` in `gammaService.ts`) includes explicit trophy placement logic to prevent the Gamma AI from incorrectly placing the 🏆 next to the losing city.

**Three safeguards:**
1. **TROPHY PLACEMENT RULE** in the critical instructions header — tells Gamma to ONLY place 🏆 next to the winner by name
2. **🏆 WINNER marker** in the data table — the winning city's row includes `🏆 WINNER` text
3. **Explicit Page 2 instruction** — the report structure section names the winner and loser with their scores, directing trophy placement

**Root cause:** Gamma AI was interpreting the data table (which listed both cities without markers) and independently deciding where to place the trophy, often incorrectly placing it next to the second city regardless of scores.

---

## 21. Dark Mode Fixes for Saved Reports (Added 2026-02-14)

Two dark mode readability issues were fixed in the saved reports view:

| Element | Problem | Fix |
|---------|---------|-----|
| City names | Unreadable dark text on dark background | City names now use a visible color that contrasts with dark mode backgrounds |
| Date text | Low contrast gray text | Date text now uses crisp white (`#FFFFFF`) in dark mode for maximum readability |

**Affected Components:** SavedComparisons display, any component rendering city names and dates from saved comparison data.

---

## 22. AUDIO Badge + Voice Wave Indicator (Added 2026-02-14)

The PIP (Picture-in-Picture) player for the Report Presenter received two visual improvements:

**Badge Relocation:**
- Previously: AUDIO badge was at the bottom of the PIP player, often obscured by video controls
- Now: Badge is positioned at the top-right corner of the PIP player for immediate visibility

**Animated Voice Wave Indicator:**
- When audio is actively playing, an animated voice wave (CSS animation) appears next to the AUDIO badge
- Provides clear visual feedback that the presenter is speaking
- Animation stops when audio pauses or ends

**Files Affected:**
- `src/components/ReportPresenter.tsx` — Badge positioning and wave indicator logic
- `src/components/ReportPresenter.css` — Badge position styles and `@keyframes` voice wave animation

---

## 24. Notification System (Added 2026-02-16)

### 24.1 Architecture

Fire-and-forget notification system for long-running tasks (comparisons, Judge verdicts, video generation, Gamma reports).

```
User triggers task → NotifyMeModal → "Wait Here" or "Notify Me & Go"
→ job created in `jobs` table (status: pending)
→ task runs as normal (status: processing)
→ on completion: notification row in `notifications` table
→ bell icon updates (30s poll) + email via Resend (if opted in)
```

### 24.2 Database Tables

**`jobs` table:**
- Persistent job queue for long-running tasks
- Columns: id (UUID PK), user_id (FK profiles), type (comparison|judge|video|gamma|court_order|freedom_tour), status (pending|processing|completed|failed), metadata (JSONB), created_at, updated_at
- RLS: users can only see their own jobs
- Trigger: auto-updates updated_at

**`notifications` table:**
- In-app bell + email notification records
- Columns: id (UUID PK), user_id (FK profiles), job_id (FK jobs, nullable), type (text), title (text), body (text), channel (in_app|email|both), read (boolean, default false), created_at
- RLS: users can only see their own notifications

**`profiles.phone` column:** Added for future SMS notification support.

### 24.3 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| POST /api/notify | POST | Create notification (in-app + email via Resend) |

**Server-side helper:** `api/shared/notifyJob.ts` — fire-and-forget helper that creates in-app notification and sends email in parallel without blocking the calling endpoint.

### 24.4 Frontend Components

| Component | Purpose |
|-----------|---------|
| `NotificationBell.tsx` + `.css` | Bell icon in header with unread badge + dropdown |
| `NotifyMeModal.tsx` + `.css` | "Wait Here" vs "Notify Me & Go" modal |

### 24.5 Custom Hooks

| Hook | Purpose |
|------|---------|
| `useNotifications.ts` | Polls `notifications` table every 30 seconds for unread count |
| `useJobTracker.ts` | Creates jobs, updates status, triggers notification on completion |

### 24.6 Integration Points

NotifyMeModal is integrated into:
- `CitySelector.tsx` — Compare button (comparison jobs)
- `JudgeTab.tsx` — Judge Verdict generation
- `VisualsTab.tsx` — Gamma report generation
- `CourtOrderVideo.tsx` — Court Order video generation
- `GoToMyNewCity.tsx` — Freedom Tour video generation

Server-side notifications triggered in:
- `api/judge-report.ts` — on Judge report completion
- `api/video/grok-generate.ts` — on video generation completion

### 24.7 Email Configuration

- **Service:** Resend
- **From address:** alerts@lifescore.app
- **Trigger:** Only when user opts in via "Notify Me & Go" with email channel

---

## 23. Codebase Statistics (Added 2026-02-15)

<!-- CODEBASE_STATS_START — regenerate with: claude "run codebase stats" -->

**Snapshot Date:** 2026-02-15

### 23.1 Grand Totals

| Metric | Count |
|--------|-------|
| **Source lines of code** | **~117,429** |
| **Total files** (excl. node_modules, .git) | **443** |
| **Total folders** | **41** |
| **Database tables** | **23** |
| **Storage buckets** | **3** |

### 23.2 Lines of Code by File Type

| File Type | Files | Lines |
|-----------|-------|-------|
| TypeScript / TSX | 176 | 76,284 |
| CSS | 50 | 35,502 |
| SQL (migrations) | 38 | 5,555 |
| JavaScript | 2 | 88 |
| Markdown (docs) | 132 | ~47,000 |
| JSON config | 9 | 301 |

### 23.3 Frontend Breakdown (`src/`)

| Area | Files | Lines |
|------|-------|-------|
| Components (`.tsx` + `.css`) | 94 | 55,675 |
| Services | 17 | 12,214 |
| Hooks | 19 | 5,875 |
| Data (static datasets) | 5 | 5,016 |
| Types | 12 | 3,050 |
| Utils | 6 | 2,016 |
| App root (`App.tsx`, `App.css`, `main.tsx`, `index.css`) | 4 | 2,361 |
| Lib / Shared / Contexts / Constants | 7 | 1,512 |
| Styles (`globals.css`, `dark-mode.css`) | 2 | 893 |
| **Frontend total** | **168** | **~86,752** |

### 23.4 Backend Breakdown (`api/`)

| Subdirectory | Files | Lines | Purpose |
|--------------|-------|-------|---------|
| `api/` (root) | 11 | 4,659 | Core endpoints (evaluate, judge, gamma, health) |
| `api/olivia/` | 10 | 4,720 | Olivia AI assistant (chat, TTS, avatars, evidence) |
| `api/shared/` | 8 | 3,393 | Auth, CORS, metrics, rate limiting, types |
| `api/video/` | 3 | 1,932 | Grok video generate/status, InVideo override |
| `api/emilia/` | 4 | 1,358 | Emilia help assistant (message, speak, thread, manuals) |
| `api/avatar/` | 5 | 1,348 | Avatar video generation (Simli, judge video) |
| `api/cristiano/` | 2 | 1,158 | Cristiano video presenter (render, storyboard) |
| `api/stripe/` | 4 | 832 | Payments (checkout, portal, subscription, webhook) |
| `api/admin/` | 3 | 613 | Admin tools (env-check, knowledge sync) |
| `api/usage/` | 2 | 461 | Usage monitoring (quotas, ElevenLabs) |
| `api/user/` | 2 | 415 | User management (GDPR delete, export) |
| `api/consent/` | 1 | 155 | GDPR consent logging |
| **Backend total** | **55** | **~21,044** | |

### 23.5 Database Tables (Supabase PostgreSQL)

23 unique tables across 38 migration files:

| # | Table | Purpose |
|---|-------|---------|
| 1 | `profiles` | User profiles |
| 2 | `subscriptions` | Stripe subscription state |
| 3 | `comparisons` | City comparison results |
| 4 | `reports` | Saved report metadata |
| 5 | `judge_reports` | Judge consensus reports |
| 6 | `gamma_reports` | Gamma-generated PDF reports |
| 7 | `olivia_conversations` | Olivia chat threads |
| 8 | `olivia_messages` | Olivia chat messages |
| 9 | `avatar_videos` | Avatar video records |
| 10 | `grok_videos` | Grok-generated city videos |
| 11 | `cristiano_city_videos` | Cristiano presenter videos |
| 12 | `invideo_overrides` | InVideo manual URL overrides |
| 13 | `contrast_image_cache` | Cached contrast images |
| 14 | `usage_tracking` | Per-user usage counters |
| 15 | `api_cost_records` | API call cost tracking |
| 16 | `api_quota_settings` | Per-provider quota thresholds |
| 17 | `api_quota_alert_log` | Quota alert history |
| 18 | `consent_logs` | GDPR consent records |
| 19 | `report_shares` | Shared report links |
| 20 | `report_access_logs` | Report view audit trail |
| 21 | `app_prompts` | Editable LLM prompts |
| 22 | `authorized_manual_access` | Per-user manual permissions |
| 23 | `user_preferences` | User settings (theme, etc.) |

**Storage Buckets:** `avatars`, `judge-videos`, `user-videos`

### 23.6 Source Distribution

| Layer | Lines | % |
|-------|-------|---|
| Frontend (`src/`) | 86,752 | 73.9% |
| Backend (`api/`) | 21,044 | 17.9% |
| Database (`supabase/`) | 5,555 | 4.7% |
| Scripts / Config / Other | 4,078 | 3.5% |

### 23.7 Key Component Counts

- **48** React components
- **46** component CSS files
- **55** serverless API functions
- **19** custom React hooks
- **17** service modules
- **12** TypeScript type definition files
- **38** SQL migration files
- **132** documentation files

<!-- CODEBASE_STATS_END -->

> **Keeping this current:** The stats between the `CODEBASE_STATS_START` / `CODEBASE_STATS_END` markers can be regenerated by running a codebase audit. Update the snapshot date and version in Document Control when refreshing.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
| 2.0 | 2026-01-30 | AI Assistant | Added API Quota Monitoring (§16) and TTS Fallback (§17) |
| 2.1 | 2026-01-30 | Claude Opus 4.5 | Phase 2: Fixed Simli=PRIMARY (§2.4), Added Emilia (§3.4), Usage/Quota (§3.5), Avatar (§3.6) endpoints |
| 2.2 | 2026-01-30 | Claude Opus 4.5 | Phase 3: Version sync with User/CS manuals |
| 2.3 | 2026-02-04 | Claude Opus 4.5 | LLM retry logic (§6.6), cost tracking auto-sync (§6.7), video error handling (§8.5), resolved issues |
| 2.4 | 2026-02-05 | Claude Opus 4.5 | Session 9: Dual-Storage Architecture (§18), court_orders table (§4), schema corrections, AI model names updated, Tavily timeout fix, 8 resolved issues |
| 3.0 | 2026-02-12 | Claude Opus 4.6 | Integrated Coding Standards & Developer Guide as §2 (comment standards, naming conventions, component/service/hook/type guides, data flow diagrams, quick reference). Upgraded §1.3 directory tree. Renumbered §§2-18 to §§3-19. |
| 4.0 | 2026-02-13 | Claude Opus 4.6 | Major update: 21 DB tables (was 18), 3 storage buckets, new app_prompts/invideo_overrides tables, sequential video generation, blob URL playback, expired URL detection, Promise.allSettled, progress bar fix, 12 new resolved issues, JWT auth on 8+ endpoints, admin check caching, Prompts system (§20), new env vars, deprecated VITE_* vars |
| 4.1 | 2026-02-13 | Claude Opus 4.6 | Added Olivia Video Presenter (§9.7): HeyGen pre-rendered video pipeline + live presenter PIP overlay. New API endpoint (§4.8), new services (presenterService, presenterVideoService), new types (presenter.ts), new component (ReportPresenter), VisualsTab Read/Listen toggle |
| 4.2 | 2026-02-14 | Claude Opus 4.6 | 5 bug fixes documented: (1) Gamma trophy placement fix — 3 safeguards added to prompt (§20.4), (2) Gamma persistence fix — foreign key violation resolved, (3) backdrop-filter blur removed from 8 CSS files for INP (§10.2), (4) Login input 247ms INP fix, (5) "Watch" → "Listen to Presenter" rename. 5 new resolved issues (§14.2). |
| 4.3 | 2026-02-14 | Claude Opus 4.6 | Major update: 23 technical changes documented. New sections: Judge collapsible panels (§9.8), GoToMyNewCity video v2 (§9.9), HeyGen timeouts (§9.10), Judge video persistence (§9.11), expired URL fixes for 3 providers (§9.12), video URL expiration (§9.13), Cristiano 422 fix (§9.14), HeyGen 10K limit fixes (§9.15), storyboard QA (§9.16), Cristiano CTA/poster (§9.17). Performance: Judge dropdown INP 354ms→50ms (§10.3). Infrastructure: timeout safety nets (§12.3), upload timeout increases (§12.4), 200MB reports limit (§12.5). Auth: profile fetch retry storm fix (§6.4). LLM: Supabase cold start warm-up + LRU cache (§7.6), Grok batch splitting (§7.10), Cost Dashboard $0 triple-fix (§7.9). Storage: Judge report Supabase fallback (§19.4), missing 6 categories fix (§19.5). UI: dark mode saved reports (§21), AUDIO badge + voice wave (§22). 23 new resolved issues (§14.2). |
| 4.4 | 2026-02-15 | Claude Opus 4.6 | Added Codebase Statistics (§23): full LOC breakdown (~117K source lines), file/folder inventory, frontend/backend/database splits, all 23 table names, component counts. Delimited with CODEBASE_STATS markers for easy re-generation. |
| 4.5 | 2026-02-15 | Claude Opus 4.6 | Cristiano B-roll 6-second clip limit (§9.17a): HeyGen was rendering 16-18s B-roll as single static clips. Added explicit 6s max per clip in both Stage 1 (storyboard prompt) and Stage 2 (render prompt). Supabase app_prompts updated to match. |
| 4.6 | 2026-02-15 | Claude Opus 4.6 | 9 mobile vertical overflow fixes (§14.2): WCAG accessibility updates introduced flex overflow on narrow viewports (≤480px). Fixed across 8 CSS files: Results.css (score cards + category badges), AboutClues.css (services table + module chips), AskOlivia.css (READY/STOP buttons), VisualsTab.css (Read/Listen/Open/Close buttons), JudgeTab.css (doormat triangle + category accordion), GoToMyNewCity.css (Sovereign badge — first-ever mobile rules), SettingsModal.css (CONNECTED button), EnhancedComparison.css (consistency fix). Pattern: `min-width: 0` + `flex-shrink: 0` + `text-overflow: ellipsis` + `flex-wrap: wrap` at mobile breakpoints. |
| 4.7 | 2026-02-15 | Claude Opus 4.6 | Supabase timeout/retry remediation: Reverted rogue agent's bloated values across 11 source files. SUPABASE_TIMEOUT_MS 20s→12s, maxRetries 3→2 (3 total attempts). Updated §7.5 Supabase Retry Logic with correct config. New resolved issue (§14.2). Updated App Schema Manual §6.1 to match. |
| 4.8 | 2026-02-17 | Claude Opus 4.6 | 29-commit audit: Notification system architecture (§24) — jobs/notifications tables, api/notify endpoint, NotificationBell/NotifyMeModal components, useNotifications/useJobTracker hooks. 15 new resolved issues (§14.2): Resend from email, isPasswordRecovery, 3 notification flows, VS dark mode, II suffix, mobile +/- and badges, Visuals labeling, Gamma links, login credentials (3 iterations), Judge stale state, Court Order tabs revert, password reset redirect, admin signup email. |
| 4.9 | 2026-02-17 | Claude Opus 4.6 | Gamma export URL expiration fix (§14.2): Asset materialization pattern — `api/gamma.ts` persists PDF/PPTX exports to Supabase Storage on completion. New DB columns `pdf_storage_path`/`pptx_storage_path`. Iframe error detection on all 4 embed locations. 11 files, 35 changes. |

---

*This manual is confidential and intended for technical support personnel only.*
