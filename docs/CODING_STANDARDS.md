# LIFE SCORE - Coding Standards & Codebase Guide

**Company:** Clues Intelligence LTD
**Product:** LIFE SCORE (Legal Independence & Freedom Evaluation)
**Last Updated:** 2026-02-12

---

## Table of Contents

1. [Comment Standards](#1-comment-standards)
2. [Codebase Architecture](#2-codebase-architecture)
3. [Component Guide](#3-component-guide)
4. [API Endpoints Guide](#4-api-endpoints-guide)
5. [Services Guide](#5-services-guide)
6. [Hooks Guide](#6-hooks-guide)
7. [Database Schema Guide](#7-database-schema-guide)
8. [Type System Guide](#8-type-system-guide)
9. [Data Flow](#9-data-flow)
10. [Naming Conventions](#10-naming-conventions)

---

## 1. Comment Standards

### 1.1 File Headers (Required on every file)

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

### 1.2 Section Dividers

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

### 1.3 Function Comments

**Public / exported functions** - always document with JSDoc:

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

**Private / internal functions** - a brief comment is sufficient:

```typescript
/** Normalizes city name for cache key lookup. */
function normalizeCityKey(name: string): string { ... }
```

**Trivial getters/setters** - no comment needed.

### 1.4 Inline Comments

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

### 1.5 Fix & Session Markers

When fixing bugs or making changes tied to a specific session/issue, use this format:

```typescript
// FIX #<number>: Brief description of what was fixed and why
// Example:
// FIX #73: Import cost tracking utilities — was causing undefined errors on CostDashboard

// SESSION <id>: Brief description of what was added/changed
// Example:
// SESSION LIFESCORE-AUDIT-20260123-001: Added GDPR consent logging
```

### 1.6 TODO / FIXME / HACK

Use these markers consistently so they can be grep'd:

```typescript
// TODO: Description of future work needed
// FIXME: Description of known bug that needs fixing
// HACK: Description of workaround — explain WHY it's a hack and what the proper fix would be
// PERF: Performance-related note (optimization applied or needed)
// SECURITY: Security-sensitive code that needs extra review attention
```

### 1.7 SQL Migration Comments

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

### 1.8 CSS Comments

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

### 1.9 What NOT to Comment

- Obvious code (`const count = 0; // initialize count to zero`)
- Closing braces (`} // end if`, `} // end function`)
- Auto-generated code unless modified
- Commented-out code — delete it, git has history

---

## 2. Codebase Architecture

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

## 3. Component Guide

### Core Application

| Component | What It Does |
|-----------|-------------|
| `App.tsx` | Root component. Manages tabs, auth gate, lazy-loading of tab content. |
| `LoginScreen.tsx` | Supabase auth — email/password login, signup, password reset. |
| `Header.tsx` | Top navigation bar with logo, user menu, theme toggle. |
| `Footer.tsx` | Bottom bar with legal links and copyright. |
| `TabNavigation.tsx` | Main tab switcher (Compare, Results, Visuals, Judge, Olivia, etc.). |

### Comparison Engine

| Component | What It Does |
|-----------|-------------|
| `CitySelector.tsx` | Typeahead city picker. User selects two cities to compare. |
| `EnhancedComparison.tsx` | The main comparison view. Orchestrates multi-LLM evaluation, shows metric scores, evidence panels, consensus voting. Largest component (~2,400 lines). |
| `Results.tsx` | Displays scored metric table after comparison completes. |
| `SavedComparisons.tsx` | Lists user's saved comparisons with search, delete, re-open. |
| `DealbreakersWarning.tsx` | Warns when a category weight exceeds safe thresholds. |
| `WeightPresets.tsx` | Predefined category weight configurations. |
| `ScoreMethodology.tsx` | Explains how the 100-metric scoring system works. |

### AI Assistants

| Component | What It Does |
|-----------|-------------|
| `AskOlivia.tsx` | Full chat interface with Olivia (AI assistant). Sends messages, displays responses, handles TTS and avatar streaming. |
| `OliviaChatBubble.tsx` | Individual chat message bubble with avatar and formatting. |
| `OliviaAvatar.tsx` | Simli WebRTC video player — renders Olivia's face in real-time. |
| `EmiliaChat.tsx` | Lightweight help widget. Uses OpenAI assistant for support questions. |

### Judge & Legal

| Component | What It Does |
|-----------|-------------|
| `JudgeTab.tsx` | AI judge that renders a legal-style verdict. Generates analysis, creates avatar video, shows verdict with reasoning. |
| `JudgeVideo.tsx` | Video player for pre-rendered judge avatar videos. |
| `CourtOrderVideo.tsx` | Formatted court-order-style video report with legal styling. |
| `GunComparisonModal.tsx` | Dedicated modal for comparing gun rights between jurisdictions. |

### Visual Reports

| Component | What It Does |
|-----------|-------------|
| `VisualsTab.tsx` | Generates PDF/PPTX visual reports via Gamma API. Handles generation, polling, download. |
| `NewLifeVideos.tsx` | Grok-generated video playlist for "New Life" scenarios. |

### User & Settings

| Component | What It Does |
|-----------|-------------|
| `SettingsModal.tsx` | User preferences — theme, default view, comparison settings. |
| `CostDashboard.tsx` | Shows API usage costs per provider (OpenAI, Tavily, Simli, etc.). |
| `PricingModal.tsx` / `PricingPage.tsx` | Subscription tier display and Stripe checkout trigger. |
| `FeatureGate.tsx` | Wraps features that require a specific tier. Shows upgrade prompt if locked. |
| `CookieConsent.tsx` | GDPR cookie consent banner. |

### UI Utilities

| Component | What It Does |
|-----------|-------------|
| `ErrorBoundary.tsx` | Catches React render errors, shows fallback UI. |
| `LoadingState.tsx` | Skeleton loading placeholders. |
| `ThemeToggle.tsx` | Dark/light mode switch. |
| `HelpModal.tsx` / `HelpBubble.tsx` | Contextual help overlays. |
| `LegalModal.tsx` | Legal/compliance information display. |
| `UsageWarningBanner.tsx` | Shows warning when user approaches API quota limits. |

---

## 4. API Endpoints Guide

### Core Comparison

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/evaluate` | POST | Runs city comparison. Calls Tavily for research, sends to LLM for scoring, returns `ComparisonResult`. The heart of the product. |
| `/api/judge` | POST | Generates AI judge verdict for a comparison. Uses Claude Opus. |
| `/api/judge-report` | POST | Creates detailed legal-style analysis report. |
| `/api/judge-video` | POST | Generates judge avatar video via Replicate Wav2Lip. |
| `/api/test-llm` | POST | Quick connectivity test to verify LLM API keys work. |

### Olivia AI Assistant

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/olivia/chat` | POST | Sends user message to Olivia, returns AI response. Uses OpenAI threads. |
| `/api/olivia/context` | POST | Fetches comparison context for Olivia to reference during chat. |
| `/api/olivia/tts` | POST | Converts Olivia's text response to speech audio (ElevenLabs). |
| `/api/olivia/field-evidence` | POST | Olivia researches a specific legal topic via Tavily. |
| `/api/olivia/gun-comparison` | POST | Olivia analyzes gun rights differences between cities. |
| `/api/olivia/contrast-images` | POST | Generates visual contrast images for two cities. |

### Avatar & Video

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/avatar/simli-session` | POST | Creates a Simli WebRTC session for real-time avatar streaming. |
| `/api/avatar/simli-speak` | POST | Sends text to Simli for avatar speech synthesis. |
| `/api/avatar/generate-judge-video` | POST | Triggers Wav2Lip video generation on Replicate. |
| `/api/avatar/video-status` | GET | Polls video generation progress. |
| `/api/avatar/video-webhook` | POST | Receives completion callback from Replicate/Simli. |
| `/api/video/grok-generate` | POST | Generates city comparison video via Grok. |
| `/api/video/grok-status` | GET | Polls Grok video generation status. |

### Billing (Stripe)

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/stripe/create-checkout-session` | POST | Creates Stripe checkout for subscription purchase. |
| `/api/stripe/create-portal-session` | POST | Opens Stripe customer portal for subscription management. |
| `/api/stripe/get-subscription` | GET | Returns current user's subscription tier and status. |
| `/api/stripe/webhook` | POST | Handles Stripe events (payment success, cancellation, etc.). |

### User & GDPR

| Endpoint | Method | What It Does |
|----------|--------|-------------|
| `/api/user/delete` | DELETE | Permanently deletes user account and all data (GDPR right to erasure). |
| `/api/user/export` | GET | Exports all user data as JSON (GDPR data portability). |
| `/api/consent/log` | POST | Records user consent events (cookie, terms, privacy). |

### Shared Utilities (`api/shared/`)

| File | What It Does |
|------|-------------|
| `auth.ts` | Extracts and validates Supabase JWT from request headers. |
| `cors.ts` | CORS middleware — sets allowed origins, methods, headers. |
| `fetchWithTimeout.ts` | Fetch wrapper with configurable timeout (prevents hung requests). |
| `metrics.ts` | Scoring logic shared between frontend and backend. |
| `rateLimit.ts` | Per-user rate limiting middleware using Supabase quota tables. |
| `types.ts` | Shared TypeScript types for API request/response shapes. |

---

## 5. Services Guide

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

---

## 6. Hooks Guide

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

---

## 7. Database Schema Guide

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User accounts (synced from Supabase Auth) | `id` (UUID), `email`, `tier`, `created_at` |
| `comparisons` | Saved city comparisons | `user_id`, `city1_name`, `city2_name`, `winner`, `comparison_result` (JSONB) |
| `user_preferences` | User settings (theme, defaults) | `user_id` (UNIQUE), `theme`, `view_mode` |

### AI & Chat

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `olivia_conversations` | Chat threads with Olivia | `user_id`, `openai_thread_id`, `title`, `message_count` |
| `olivia_messages` | Individual chat messages | `conversation_id`, `role`, `content`, `audio_url` |

### Reports & Media

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `gamma_reports` | Visual reports (PDF/PPTX) | `user_id`, `city1`, `city2`, `status`, `gamma_url` |
| `judge_reports` | Detailed legal analysis | `user_id`, `comparison_id`, `verdict`, `analysis` |
| `judge_verdicts` | Quick judge verdicts | `user_id`, `city1`, `city2`, `winner`, `reasoning` |
| `avatar_videos` | Judge avatar videos | `comparison_hash`, `video_url`, `provider`, `status` |
| `grok_videos` | Grok-generated videos | `user_id`, `prompt`, `video_url`, `status` |

### Sharing & Access

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `report_shares` | Shareable report links | `shared_by`, `report_id`, `share_token`, `expires_at` |
| `report_access_logs` | Tracks who viewed shared reports | `share_id`, `viewer_ip`, `accessed_at` |

### Billing & Usage

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `api_cost_records` | Per-request cost tracking | `user_id`, `provider`, `cost`, `tokens_used` |
| `api_quota_settings` | Rate limits per provider | `provider`, `daily_limit`, `monthly_limit` |
| `api_quota_alert_log` | Quota breach alerts | `provider`, `alert_type`, `triggered_at` |

### Compliance

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `consent_logs` | GDPR consent events | `user_id`, `consent_type`, `granted`, `timestamp` |
| `authorized_manual_access` | Documentation access permissions | `user_id`, `manual_id`, `granted_by` |

### Cache

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `contrast_image_cache` | Cached contrast images | `city1`, `city2`, `image_url`, `expires_at` |

### Storage Buckets (Supabase Storage)

| Bucket | Stores |
|--------|--------|
| `report_pdfs` | Generated PDF/PPTX visual reports |
| `videos` | User-uploaded videos |
| `grok_videos` | Grok-generated video outputs |
| `contrast_images` | City contrast/heatmap images |
| `judge_videos` | Judge avatar video files |
| `user_avatars` | Profile pictures |

---

## 8. Type System Guide

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

---

## 9. Data Flow

### City Comparison (main flow)

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

### Authentication Flow

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

### Billing Flow

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

---

## 10. Naming Conventions

### Files

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

### Code

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

### Branches

| Type | Convention | Example |
|------|-----------|---------|
| Feature | `feature/<description>` | `feature/olivia-chat` |
| Fix | `fix/<description>` | `fix/judge-timeout` |
| Claude sessions | `claude/<auto-generated>` | `claude/lifescore-debug-42MtS` |

---

## Quick Reference: Where Things Live

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

*Maintained by Clues Intelligence LTD. Update this document when adding new structures to the codebase.*
