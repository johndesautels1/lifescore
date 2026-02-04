# LifeScore Technical Support Manual

**Version:** 2.3
**Last Updated:** February 4, 2026
**Document ID:** LS-TSM-001

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [API Reference](#3-api-reference)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [LLM Provider Integration](#6-llm-provider-integration)
7. [Tavily Integration](#7-tavily-integration)
8. [Video Generation Pipeline](#8-video-generation-pipeline)
9. [Performance Optimization](#9-performance-optimization)
10. [Error Handling & Logging](#10-error-handling--logging)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Debugging Procedures](#12-debugging-procedures)
13. [Known Issues & Workarounds](#13-known-issues--workarounds)
14. [Monitoring & Alerts](#14-monitoring--alerts)
15. [Security Considerations](#15-security-considerations)
16. [API Quota Monitoring System](#16-api-quota-monitoring-system)
17. [TTS Fallback System](#17-tts-fallback-system)

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
D:\lifescore\
├── api/                    # Vercel serverless functions
│   ├── evaluate.ts         # Main comparison endpoint
│   ├── judge.ts            # Opus consensus evaluation
│   ├── gamma.ts            # Report generation
│   ├── olivia/             # AI assistant endpoints
│   ├── video/              # Video generation
│   └── shared/             # Shared utilities
├── src/
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   ├── data/               # Static data (metros.ts)
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── docs/                   # Documentation
├── supabase/               # Database migrations
└── public/                 # Static assets
```

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool |
| Tailwind CSS | 3.x | Styling (if used) |

### 2.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Vercel Functions | - | Serverless API |
| Supabase | - | Database + Auth |

### 2.3 AI Providers

| Provider | Model | Use Case |
|----------|-------|----------|
| Anthropic | Claude Sonnet 4.5 | Primary evaluator |
| Anthropic | Claude Opus 4.5 | Judge/consensus |
| OpenAI | GPT-4o | Secondary evaluator |
| Google | Gemini 3 Pro | Evaluator with Google Search |
| xAI | Grok 4 | Evaluator with X search |
| Perplexity | Sonar Reasoning Pro | Research evaluator |
| Tavily | Search + Research | Web research |

### 2.4 Media Services

| Service | Purpose |
|---------|---------|
| Replicate | Video generation (Minimax) |
| Kling AI | Primary video generation |
| ElevenLabs | Text-to-speech |
| Gamma | PDF/PPTX report generation |
| Simli | Avatar video (PRIMARY) |
| D-ID | Avatar video (fallback) |

---

## 3. API Reference

### 3.1 Core Endpoints

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

### 3.2 Olivia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/olivia/thread | POST | Create conversation |
| /api/olivia/message | POST | Send message |
| /api/olivia/speak | POST | Generate TTS |
| /api/olivia/contrast-images | POST | Generate comparison images |

### 3.3 Video Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/video/grok-generate | POST | Start video generation |
| /api/video/grok-status | GET | Check video status |
| /api/avatar/generate-judge-video | POST | Generate judge video |
| /api/avatar/video-status | GET | Check judge video status |

### 3.4 Emilia Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/emilia/thread | POST | Create new conversation thread |
| /api/emilia/message | POST | Send message, get response |
| /api/emilia/speak | POST | TTS with shimmer voice |
| /api/emilia/manuals | GET | Fetch manual content |

**Knowledge Sync:** Run `npx ts-node scripts/sync-emilia-knowledge.ts` after updating manuals.

### 3.5 Usage/Quota Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/usage/check-quotas | GET | Get all quota statuses |
| /api/usage/check-quotas | POST | Update usage, trigger alerts |
| /api/usage/elevenlabs | GET | Real-time ElevenLabs usage |

### 3.6 Avatar Endpoints (Additional)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/avatar/simli-speak | POST | Simli avatar with audio |

---

## 4. Database Schema

### 4.1 Current Tables (17 total)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| profiles | User accounts | id, email, tier |
| comparisons | Saved comparisons | city1, city2, scores |
| olivia_conversations | Chat threads | openai_thread_id |
| olivia_messages | Chat messages | role, content |
| gamma_reports | Report URLs | gamma_url, pdf_url |
| user_preferences | Settings | theme, defaults |
| subscriptions | Stripe billing | stripe_subscription_id |
| usage_tracking | Monthly limits | comparisons, messages |
| consent_logs | GDPR compliance | consent_type, action |
| judge_reports | Judge verdicts | recommendation, factors |
| avatar_videos | Judge video cache | video_url, status |
| api_cost_records | Cost tracking | provider totals |
| grok_videos | Grok video cache | city_name, video_type |
| contrast_image_cache | Olivia images | cache_key, urls |
| api_quota_settings | Admin quota limits | provider_key, monthly_limit, warning thresholds |
| api_quota_alert_log | Email alert history | provider_key, alert_level, sent_at |
| authorized_manual_access | Manual access control | email, access_level, granted_by |

### 4.2 Missing Schema (Needs Creation)

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

### 4.3 Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only read/write their own data
- Service role has full access
- Some tables (avatar_videos, grok_videos) allow public read for completed items

---

## 5. Authentication & Authorization

### 5.1 Auth Flow

```
User Login → Supabase Auth → JWT Token →
→ Stored in localStorage → Sent in headers
```

### 5.2 Session Management

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

### 5.3 Tier Enforcement

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

### 5.4 API Key Handling

User-provided API keys are:
- Passed in request body (not stored)
- Used for that request only
- Never logged or persisted
- Enable "Enhanced Mode" features

---

## 6. LLM Provider Integration

### 6.1 Provider Configuration

| Provider | Endpoint | Auth Method |
|----------|----------|-------------|
| Anthropic | https://api.anthropic.com/v1/messages | x-api-key header |
| OpenAI | https://api.openai.com/v1/chat/completions | Bearer token |
| Google | https://generativelanguage.googleapis.com/v1beta | API key param |
| xAI | https://api.x.ai/v1/chat/completions | Bearer token |
| Perplexity | https://api.perplexity.ai/chat/completions | Bearer token |

### 6.2 Timeout Settings

#### Server-Side (API Routes)
```typescript
// api/evaluate.ts
const LLM_TIMEOUT_MS = 240000; // 240 seconds for LLM evaluations

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

### 6.3 Token Pricing

| Provider | Input (per 1M) | Output (per 1M) |
|----------|---------------|-----------------|
| Claude Sonnet 4.5 | $3.00 | $15.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |
| GPT-4o | $2.50 | $10.00 |
| Gemini 3 Pro | $1.25 | $5.00 |
| Grok 4 | $3.00 | $15.00 (estimated) |
| Perplexity | $1.00 | $5.00 |

### 6.4 Error Handling

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

### 6.5 Supabase Retry Logic (Added 2026-01-29)

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

### 6.6 LLM Evaluator Retry Logic (Added 2026-02-04)

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

### 6.7 Cost Tracking Auto-Sync (Added 2026-02-04)

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

## 7. Tavily Integration

### 7.1 APIs Used

**Research API (`/research`):**
- One call per comparison
- Generates comprehensive report
- Cost: 4-110 credits

**Search API (`/search`):**
- 12 calls per LLM evaluation (2 cities × 6 categories)
- Focused category queries
- Cost: ~2-3 credits each

### 7.2 Authentication

```typescript
const getTavilyHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'X-Project-ID': 'lifescore-freedom-app'
});
```

### 7.3 Search Configuration

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

### 7.4 APIs NOT Used (Opportunities)

- **Extract API:** Could cache source content
- **Agent API:** Could resolve LLM disagreements
- **Graph API:** Could map regulatory relationships

---

## 8. Video Generation Pipeline

### 8.1 Judge Video Flow

```
Script Generation (LLM) → TTS Audio (ElevenLabs) →
→ Upload to Supabase → Video Generation (Replicate Wav2Lip) →
→ Poll for completion → Return URL
```

### 8.2 Grok/Kling Video Flow

```
Client Request → /api/video/grok-generate →
→ Try Kling AI (primary) → Fallback to Replicate Minimax →
→ Store job ID in grok_videos table →
→ Client polls /api/video/grok-status →
→ Return video URL when complete
```

### 8.3 Kling AI JWT Generation

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

### 8.4 Video Status Values

| Status | Meaning |
|--------|---------|
| pending | Job submitted |
| processing | Video being generated |
| completed | Video ready |
| failed | Generation failed |

### 8.5 Video Error Handling (Added 2026-02-04)

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

### 8.6 Judge Pre-generation System

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

#### Caching

- **Reports:** Stored in `localStorage` key `lifescore_judge_reports`
- **Videos:** Stored in Supabase `avatar_videos` table with `comparison_id`

#### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Console polling spam | Video stuck in `processing` | Check Replicate Wav2Lip job status |
| Report not pre-generated | Comparison didn't complete fully | Check `enhancedStatus === 'complete'` before trigger |
| Video shows "Generate" | Cache miss or different comparisonId | Verify comparisonId matches between report and video |

---

## 9. Performance Optimization

### 9.1 Current Bottlenecks

| Issue | Impact | Location |
|-------|--------|----------|
| Sequential category evaluation | 6x slower | useComparison.ts |
| Duplicated Tavily calls | 5x API waste | evaluate.ts |
| No LLM parallelization | 5x slower | evaluate.ts |
| 240s timeout | Slow failures | evaluate.ts:15 |
| Large component (2265 lines) | Slow initial load | EnhancedComparison.tsx |

### 9.2 Recommended Fixes

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

### 9.3 Expected Improvements

| Fix | Time Saved |
|-----|------------|
| Parallel categories | 150s → 30s |
| Cache Tavily | 80% API reduction |
| Skip Opus (agreement) | 30-40s saved |
| Lazy load tabs | 50% faster initial |

---

## 10. Error Handling & Logging

### 10.1 Error Response Format

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

### 10.2 Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| RATE_LIMITED | Too many requests | Wait and retry |
| TIMEOUT | Request exceeded limit | Retry with backoff |
| AUTH_FAILED | Invalid API key | Check credentials |
| PROVIDER_ERROR | LLM API error | Try different provider |
| NO_DATA | Metrics unavailable | Check city validity |

### 10.3 Logging Locations

- **Console:** Development debugging
- **Vercel Logs:** Production API calls
- **Supabase:** `api_cost_records` for usage tracking

---

## 11. Deployment & Infrastructure

### 11.1 Vercel Configuration

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

### 11.2 Environment Variables (Vercel)

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

### 11.3 Build Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

---

## 12. Debugging Procedures

### 12.1 Comparison Not Completing

1. Check Vercel function logs for timeout
2. Verify API keys are valid
3. Check rate limiting status
4. Try single provider instead of enhanced
5. Reduce category batch size

### 12.2 Scores Showing "No Data"

1. Verify Tavily returned results
2. Check LLM response parsing
3. Look for JSON parse errors
4. Check metric ID mappings

### 12.3 Video Generation Stuck

1. Check `grok_videos` table for job status
2. Verify Kling/Replicate API keys
3. Check for JWT expiration
4. Review error_message field

### 12.4 Olivia Not Responding

1. Check OpenAI thread ID validity
2. Verify message limits not exceeded
3. Check for rate limiting
4. Review assistant configuration

---

## 13. Known Issues & Workarounds

### 13.1 Active Issues

| Issue | Workaround | Status |
|-------|------------|--------|
| Perplexity partial failures | Graceful degradation | Investigating |
| Slow enhanced comparison | Use standard mode | Performance fix planned |
| Video generation delays | Polling with timeout | Infrastructure |

### 13.2 Resolved Issues

| Issue | Resolution | Date |
|-------|------------|------|
| Tavily auth errors | Switched to Bearer token | 2026-01-21 |
| FeatureGate blocking | Fails open during auth load | 2026-01-27 |
| Olivia audio issues | Added interrupt functions | 2026-01-27 |
| #48 NewLifeVideos instability | Error count tracking + auto-reset (3 failures) | 2026-02-04 |
| #49 Gemini cold start timeouts | Retry logic with exponential backoff (3 attempts) | 2026-02-04 |
| #50 Cost tracking not persisting | Auto-sync to Supabase on comparison complete | 2026-02-04 |

---

## 14. Monitoring & Alerts

### 14.1 Key Metrics to Monitor

- API response times
- Error rates by endpoint
- LLM provider availability
- Tavily credit usage
- Video generation success rate

### 14.2 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate | > 5% | > 15% |
| Response time | > 60s | > 180s |
| Provider failures | 2 in 5 min | 5 in 5 min |

---

## 15. Security Considerations

### 15.1 API Key Security

- Never log API keys
- Don't store user-provided keys
- Use environment variables for system keys
- Rotate keys quarterly

### 15.2 Data Protection

- RLS enabled on all tables
- User data isolated by user_id
- GDPR compliance logging
- 30-day deletion queue

### 15.3 Rate Limiting

```typescript
// api/shared/rateLimit.ts
const LIMITS = {
  standard: { windowMs: 60000, maxRequests: 30 },
  heavy: { windowMs: 60000, maxRequests: 10 }  // Recommend: 50
};
```

---

---

## 16. API Quota Monitoring System

**Added:** 2026-01-30

Comprehensive quota tracking for all 16 API providers with admin-configurable limits, color-coded warnings, and email alerts.

### 16.1 All 16 Tracked Providers

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

### 16.2 Warning Thresholds

| Level | Percentage | Color | Action |
|-------|------------|-------|--------|
| Green | 0-49% | 🟢 | Normal operation |
| Yellow | 50-69% | 🟡 | Email alert sent |
| Orange | 70-84% | 🟠 | Email alert sent |
| Red | 85-99% | 🔴 | Email alert sent |
| Exceeded | 100%+ | ⚫ | Email alert + fallback activated |

### 16.3 Database Tables

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

### 16.4 API Endpoints

- GET /api/usage/check-quotas - Returns all quota statuses
- POST /api/usage/check-quotas - Updates usage and triggers alerts
- GET /api/usage/elevenlabs - Real-time ElevenLabs subscription usage

### 16.5 Email Alerts

**Recipients:** brokerpinellas@gmail.com, cluesnomads@gmail.com
**Provider:** Resend API
**Domain:** clueslifescore.com (verified)

### 16.6 Fallback Chain

| Primary | Fallback | Trigger |
|---------|----------|---------|
| ElevenLabs TTS | OpenAI TTS | 401/429 error |
| Simli Avatar | D-ID Avatar | Quota exceeded |
| D-ID Avatar | Replicate | Quota exceeded |

### 16.7 CostDashboard Integration

Access via 💰 icon in app header. Shows color-coded quota cards for all 16 providers.

---

## 17. TTS Fallback System

**Added:** 2026-01-30

Automatic fallback from ElevenLabs to OpenAI TTS when quota exceeded.

### 17.1 Voice Assignments

| Character | OpenAI Voice ID |
|-----------|-----------------|
| Olivia | `nova` (warm, conversational female) |
| Emilia | `shimmer` (softer, expressive female) |
| Christiano (Judge) | `onyx` (deep, authoritative male) |

**Important:** Olivia and Emilia use DIFFERENT voices.

### 17.2 Implementation Files

| File | Character | Voice |
|------|-----------|-------|
| api/olivia/tts.ts | Olivia | nova |
| api/emilia/speak.ts | Emilia | shimmer |
| api/judge-video.ts | Christiano | onyx |

### 17.3 OpenAI TTS Pricing

tts-1 (standard): $0.015 / 1K characters

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
| 2.0 | 2026-01-30 | AI Assistant | Added API Quota Monitoring (§16) and TTS Fallback (§17) |
| 2.1 | 2026-01-30 | Claude Opus 4.5 | Phase 2: Fixed Simli=PRIMARY (§2.4), Added Emilia (§3.4), Usage/Quota (§3.5), Avatar (§3.6) endpoints |
| 2.2 | 2026-01-30 | Claude Opus 4.5 | Phase 3: Version sync with User/CS manuals |

---

*This manual is confidential and intended for technical support personnel only.*
