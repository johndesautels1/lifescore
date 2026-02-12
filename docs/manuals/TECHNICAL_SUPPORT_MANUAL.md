# LifeScore Technical Support Manual

**Version:** 3.0
**Last Updated:** February 12, 2026
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
                     └───────────────┘    └───────────────┘
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
│   │   └── avatar/         #     Olivia avatar streaming (WebRTC)
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
| `CitySelector.tsx` | Typeahead city picker. User selects two cities to compare. |
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
| `JudgeTab.tsx` | AI judge that renders a legal-style verdict. Generates analysis, creates avatar video, shows verdict with reasoning. |
| `JudgeVideo.tsx` | Video player for pre-rendered judge avatar videos. |
| `CourtOrderVideo.tsx` | Formatted court-order-style video report with legal styling. |
| `GunComparisonModal.tsx` | Dedicated modal for comparing gun rights between jurisdictions. |

#### Visual Reports

| Component | What It Does |
|-----------|-------------|
| `VisualsTab.tsx` | Generates PDF/PPTX visual reports via Gamma API. Handles generation, polling, download. |
| `NewLifeVideos.tsx` | Grok-generated video playlist for "New Life" scenarios. |

#### User & Settings

| Component | What It Does |
|-----------|-------------|
| `SettingsModal.tsx` | User preferences — theme, default view, comparison settings. |
| `CostDashboard.tsx` | Shows API usage costs per provider (OpenAI, Tavily, Simli, etc.). |
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
| `oliviaService.ts` | Client-side Olivia chat integration — manages threads, sends messages, handles streaming. |
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
| `useGrokVideo` | Manages Grok video generation — triggers, polls, handles completion. |
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
| OpenAI | `gpt-5.2` | gpt-5.2 | Secondary evaluator |
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
| D-ID | Avatar video (fallback) |

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
| /api/video/grok-generate | POST | Start video generation |
| /api/video/grok-status | GET | Check video status |
| /api/avatar/generate-judge-video | POST | Generate judge video |
| /api/avatar/video-status | GET | Check judge video status |

### 4.4 Emilia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/emilia/thread | POST | Create new conversation thread |
| /api/emilia/message | POST | Send message, get response |
| /api/emilia/speak | POST | TTS with shimmer voice |
| /api/emilia/manuals | GET | Fetch manual content |

**Knowledge Sync:** Run `npx ts-node scripts/sync-emilia-knowledge.ts` after updating manuals.

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

---

## 5. Database Schema

### 5.1 Current Tables (18 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| profiles | User accounts | id, email, tier |
| comparisons | Saved comparisons (NOTE: code references this, not `saved_comparisons`) | city1, city2, scores |
| olivia_conversations | Chat threads | openai_thread_id |
| olivia_messages | Chat messages | role, content |
| gamma_reports | Report URLs | gamma_url, pdf_url, generation_id |
| user_preferences | Single-row-per-user settings (upsert on `user_id`) | weight_presets, dealbreakers, law_lived_preferences, excluded_categories |
| subscriptions | Stripe billing | stripe_subscription_id |
| usage_tracking | Monthly limits | comparisons, messages |
| consent_logs | GDPR compliance | consent_type, action |
| judge_reports | Judge verdicts (unique on `user_id, report_id`) | winner, margin, verdict, full_report |
| avatar_videos | Judge video cache | video_url, status |
| api_cost_records | Cost tracking | provider totals |
| grok_videos | Grok video cache | city_name, video_type |
| contrast_image_cache | Olivia images | cache_key, urls |
| api_quota_settings | Admin quota limits | provider_key, monthly_limit, warning thresholds |
| api_quota_alert_log | Email alert history | provider_key, alert_level, sent_at |
| authorized_manual_access | Manual access control | email, access_level, granted_by |
| court_orders | Court Order video saves *(Added Session 8)* | user_id, comparison_id, winner_city, video_url |

**Schema Notes (Updated 2026-02-05):**
- `user_preferences`: Single-row-per-user design. New JSONB columns: `weight_presets`, `law_lived_preferences`, `excluded_categories`, `dealbreakers`. Upsert on `user_id`.
- `judge_reports`: Column names are `winner`, `margin`, `verdict`, `full_report`. Unique constraint on `(user_id, report_id)`.
- `court_orders`: New table for saved Court Order videos. Unique constraint on `(user_id, comparison_id)`. RLS: users can only CRUD their own.
- `comparisons`: Actual table name is `comparisons`, not `saved_comparisons` as some older docs reference.

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

### 6.2 Session Management

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

### 6.3 Tier Enforcement

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

### 6.4 API Key Handling

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
  maxRetries: 3,           // Up to 3 retry attempts
  initialDelayMs: 1000,    // Start with 1 second delay
  maxDelayMs: 10000,       // Cap at 10 seconds
  backoffMultiplier: 2,    // Double delay each retry
}
SUPABASE_TIMEOUT_MS = 45000  // 45 second timeout per attempt
```

**Retry Behavior:**
- Attempt 1: Immediate
- Attempt 2: Wait 1s, then retry
- Attempt 3: Wait 2s, then retry
- Attempt 4: Wait 4s, then retry (final)
- Total max wait: ~7 seconds + query time

**Retryable Errors:**
- Timeout errors (query took > 45s)
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

### 7.6 LLM Evaluator Retry Logic (Added 2026-02-04)

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

### 7.7 Cost Tracking Auto-Sync (Added 2026-02-04)

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

### 9.2 Grok/Kling Video Flow

```
Client Request → /api/video/grok-generate →
→ Try Kling AI (primary) → Fallback to Replicate Minimax →
→ Store job ID in grok_videos table →
→ Client polls /api/video/grok-status →
→ Return video URL when complete
```

### 9.3 Kling AI JWT Generation

```typescript
// api/video/grok-status.ts:34-62
function generateKlingJWT(accessKey: string, secretKey: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: accessKey,
    exp: Math.floor(Date.now() / 1000) + 1800, // 30 min
    nbf: Math.floor(Date.now() / 1000) - 5
  };
  // Sign with secretKey
}
```

### 9.4 Video Status Values

| Status | Meaning |
|--------|---------|
| pending | Job submitted |
| processing | Video being generated |
| completed | Video ready |
| failed | Generation failed |

### 9.5 Video Error Handling (Added 2026-02-04)

NewLifeVideos component now tracks video load errors and auto-resets when URLs expire (Fix #48).

**Configuration (`src/components/NewLifeVideos.tsx`):**
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

**Logging:**
```
[NewLifeVideos] winner video load error: <event>
[NewLifeVideos] Video error count: 1/3
[NewLifeVideos] Video error count: 2/3
[NewLifeVideos] Video error count: 3/3
[NewLifeVideos] Video error threshold reached - resetting to allow regeneration
```

**Files Involved:**
- `src/components/NewLifeVideos.tsx` - Error tracking and reset
- `src/hooks/useGrokVideo.ts` - `reset()` function clears state

### 9.6 Judge Pre-generation System

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

### 10.2 Recommended Fixes

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

### 10.3 Expected Improvements

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
- `SIMLI_API_KEY` - Primary avatar video generation
- `KLING_VIDEO_API_KEY` - Primary video generation
- `KLING_VIDEO_SECRET` - Kling JWT signing
- `REPLICATE_API_TOKEN` - Video generation (Wav2Lip/Minimax)
- `GAMMA_API_KEY` - PDF/PPTX report generation

**Optional:**
- `GEMINI_API_KEY` - Google Gemini evaluator
- `GROK_API_KEY` - xAI Grok evaluator
- `PERPLEXITY_API_KEY` - Perplexity evaluator
- `DID_API_KEY` - D-ID avatar fallback
- `HEYGEN_API_KEY` - HeyGen avatar fallback
- `RESEND_FROM_EMAIL` - Custom sender email
- `XAI_API_KEY` - Alias for GROK_API_KEY

### 12.3 Build Commands

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
| Video generation delays | Polling with timeout | Infrastructure |

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

### 16.3 Rate Limiting

```typescript
// api/shared/rateLimit.ts
const LIMITS = {
  standard: { windowMs: 60000, maxRequests: 30 },
  heavy: { windowMs: 60000, maxRequests: 10 }  // Recommend: 50
};
```

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
| Christiano (Judge) | `onyx` (deep, authoritative male) |

**Important:** Olivia and Emilia use DIFFERENT voices.

### 18.2 Implementation Files

| File | Character | Voice |
|------|-----------|-------|
| api/olivia/tts.ts | Olivia | nova |
| api/emilia/speak.ts | Emilia | shimmer |
| api/judge-video.ts | Christiano | onyx |

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

### 19.4 Debugging Save Issues

| Symptom | Check |
|---------|-------|
| Data not persisting | Check browser devtools > Application > localStorage |
| Data not syncing to cloud | Check console for `[Save] Supabase failed` warnings |
| Data missing on new device | Verify user is logged in (Supabase auth) |
| Duplicate entries | Check upsert onConflict constraints in databaseService.ts |

### 19.5 Key Files

| File | Role |
|------|------|
| `src/services/savedComparisons.ts` | Central save service (all 9 save points) |
| `src/services/databaseService.ts` | Supabase CRUD operations |
| `src/components/JudgeTab.tsx` | Judge report saves |
| `src/services/judgePregenService.ts` | Judge pre-generation saves |
| `src/components/SavedComparisons.tsx` | Reads all saved data for display |

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

---

*This manual is confidential and intended for technical support personnel only.*
