# LIFE SCORE - Complete Application Schema Manual

**Version:** 1.1.0
**Generated:** 2026-02-04
**Conversation ID:** LS-SCHEMA-20260204
**Purpose:** Comprehensive technical reference for Emilia help system and developers

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [API Endpoints](#2-api-endpoints)
3. [Component Architecture](#3-component-architecture)
4. [State Management](#4-state-management)
5. [Type Definitions](#5-type-definitions)
6. [Services Layer](#6-services-layer)
7. [External Integrations](#7-external-integrations)
8. [Tier System](#8-tier-system)
9. [Environment Variables](#9-environment-variables)
10. [File Structure](#10-file-structure)

---

## 1. Database Schema

LIFE SCORE uses **Supabase (PostgreSQL)** with 17+ tables for data persistence.

### 1.1 Core Tables

#### `profiles`
User profiles linked to Supabase Auth.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK(auth.users) | User ID from Supabase Auth |
| email | TEXT | NOT NULL | User email |
| full_name | TEXT | | Display name |
| tier | TEXT | DEFAULT 'free' | Subscription tier: 'free', 'pro', 'enterprise' |
| avatar_url | TEXT | | Profile picture URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMPTZ | | Last profile update |

**RLS Policies:**
- Users can read/update only their own profile
- Auto-created via trigger on auth.users insert

---

#### `subscriptions`
Stripe subscription records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Subscription record ID |
| user_id | UUID | FK(profiles), UNIQUE | User this subscription belongs to |
| stripe_customer_id | TEXT | | Stripe customer ID (cus_xxx) |
| stripe_subscription_id | TEXT | UNIQUE | Stripe subscription ID (sub_xxx) |
| stripe_price_id | TEXT | | Active price ID |
| status | TEXT | | Stripe status: active, canceled, past_due, etc. |
| current_period_start | TIMESTAMPTZ | | Billing period start |
| current_period_end | TIMESTAMPTZ | | Billing period end |
| cancel_at_period_end | BOOLEAN | DEFAULT FALSE | Will cancel at period end |
| canceled_at | TIMESTAMPTZ | | When cancellation was requested |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| updated_at | TIMESTAMPTZ | | Last update |

---

#### `user_preferences`
User customization settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Preference record ID |
| user_id | UUID | FK(profiles), UNIQUE | User ID |
| theme | TEXT | DEFAULT 'system' | 'light', 'dark', 'system' |
| language | TEXT | DEFAULT 'en' | UI language |
| weight_preset | TEXT | DEFAULT 'balanced' | Metric weighting preset |
| custom_weights | JSONB | | Custom category weights |
| dealbreakers | JSONB | | User's dealbreaker metrics |
| notifications_enabled | BOOLEAN | DEFAULT TRUE | Email notifications |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

---

### 1.2 Comparison Tables

#### `saved_comparisons`
Stored city comparison results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Comparison ID |
| user_id | UUID | FK(profiles) | Owner (NULL for anonymous) |
| comparison_id | TEXT | UNIQUE, NOT NULL | Format: LIFE-CITY1-CITY2-TIMESTAMP |
| city1_name | TEXT | NOT NULL | First city name |
| city1_country | TEXT | NOT NULL | First city country |
| city2_name | TEXT | NOT NULL | Second city name |
| city2_country | TEXT | NOT NULL | Second city country |
| city1_score | NUMERIC | | Total score city 1 |
| city2_score | NUMERIC | | Total score city 2 |
| winner | TEXT | | 'city1', 'city2', or 'tie' |
| full_result | JSONB | | Complete comparison data |
| is_enhanced | BOOLEAN | DEFAULT FALSE | Multi-LLM enhanced mode |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_saved_comparisons_user_id` on user_id
- `idx_saved_comparisons_comparison_id` on comparison_id

---

#### `comparison_metrics`
Individual metric scores for comparisons.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record ID |
| comparison_id | UUID | FK(saved_comparisons) | Parent comparison |
| metric_id | TEXT | NOT NULL | Metric identifier |
| category_id | TEXT | NOT NULL | Category identifier |
| city1_score | NUMERIC | | City 1 metric score |
| city2_score | NUMERIC | | City 2 metric score |
| city1_evidence | JSONB | | Sources for city 1 |
| city2_evidence | JSONB | | Sources for city 2 |
| confidence | TEXT | | 'high', 'medium', 'low' |

---

### 1.3 Judge & Video Tables

#### `judge_reports`
THE JUDGE's comprehensive verdicts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Report ID |
| user_id | UUID | FK(profiles) | Report owner |
| comparison_id | TEXT | FK(saved_comparisons) | Source comparison |
| report_id | TEXT | UNIQUE | Format: LIFE-JDG-DATE-USERID-HASH |
| city1 | TEXT | NOT NULL | First city |
| city2 | TEXT | NOT NULL | Second city |
| summary_of_findings | JSONB | | Scores and trends |
| category_analysis | JSONB | | Per-category analysis |
| executive_summary | JSONB | | Recommendation and rationale |
| video_status | TEXT | DEFAULT 'pending' | 'pending', 'generating', 'ready', 'error' |
| video_url | TEXT | | HeyGen video URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

#### `grok_videos`
Grok-generated avatar videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Video record ID |
| user_id | UUID | FK(profiles) | Video owner |
| comparison_id | TEXT | | Related comparison |
| video_type | TEXT | NOT NULL | 'court_order', 'new_life', etc. |
| prompt | TEXT | | Generation prompt |
| grok_video_url | TEXT | | Grok video URL |
| audio_url | TEXT | | TTS audio URL |
| status | TEXT | DEFAULT 'pending' | Generation status |
| error_message | TEXT | | Error details if failed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| completed_at | TIMESTAMPTZ | | When generation finished |

---

#### `avatar_videos`
HeyGen/D-ID generated talking head videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Video record ID |
| user_id | UUID | FK(profiles) | Video owner |
| comparison_id | TEXT | | Related comparison |
| provider | TEXT | NOT NULL | 'heygen', 'd-id', 'simli' |
| video_id | TEXT | | Provider's video ID |
| video_url | TEXT | | Final video URL |
| script | TEXT | | Video script/text |
| avatar_id | TEXT | | Avatar used |
| voice_id | TEXT | | Voice used |
| status | TEXT | DEFAULT 'pending' | 'pending', 'processing', 'ready', 'error' |
| duration_seconds | INTEGER | | Video length |
| cost_credits | NUMERIC | | Credits consumed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| completed_at | TIMESTAMPTZ | | |

---

### 1.4 Usage & Cost Tracking

#### `api_usage`
API call tracking for rate limiting and analytics.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Usage record ID |
| user_id | UUID | FK(profiles) | User making request |
| endpoint | TEXT | NOT NULL | API endpoint path |
| method | TEXT | | HTTP method |
| status_code | INTEGER | | Response status |
| latency_ms | INTEGER | | Response time |
| tokens_used | INTEGER | | LLM tokens consumed |
| cost_usd | NUMERIC | | Estimated cost |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `idx_api_usage_user_date` on (user_id, created_at)

---

#### `api_cost_records`
Detailed cost tracking per API provider.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Cost record ID |
| user_id | UUID | FK(profiles) | User |
| provider | TEXT | NOT NULL | 'openai', 'anthropic', 'perplexity', etc. |
| model | TEXT | | Model used |
| operation | TEXT | | Operation type |
| input_tokens | INTEGER | | Input token count |
| output_tokens | INTEGER | | Output token count |
| cost_usd | NUMERIC(10,6) | | Actual cost |
| request_id | TEXT | | Provider request ID |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Auto-Sync (Added 2026-02-04 - Fix #50):**
Cost records are now automatically synced to Supabase after each comparison completes:
- Flow: `storeCostBreakdown()` → `toApiCostRecordInsert()` → `saveApiCostRecord()`
- Uses UPSERT (on conflict: user_id, comparison_id)
- Non-blocking: sync failures don't affect comparison results
- Files: `src/App.tsx`, `src/utils/costCalculator.ts`, `src/services/databaseService.ts`

---

#### `api_quota_settings`
Admin-configurable API quotas.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Settings record ID |
| tier | TEXT | UNIQUE, NOT NULL | 'free', 'pro', 'enterprise' |
| daily_comparison_limit | INTEGER | | Max comparisons/day |
| daily_chat_limit | INTEGER | | Max Olivia chats/day |
| daily_judge_limit | INTEGER | | Max Judge reports/day |
| monthly_cost_limit_usd | NUMERIC | | Monthly spending cap |
| enabled | BOOLEAN | DEFAULT TRUE | Quota enforcement enabled |
| updated_at | TIMESTAMPTZ | | |
| updated_by | UUID | FK(profiles) | Admin who updated |

---

### 1.5 Authorization Tables

#### `authorized_manual_access`
Controls access to Emilia help system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record ID |
| user_id | UUID | FK(profiles), UNIQUE | Authorized user |
| authorized_by | UUID | FK(profiles) | Admin who granted access |
| reason | TEXT | | Authorization reason |
| expires_at | TIMESTAMPTZ | | Expiration (NULL = permanent) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

---

## 2. API Endpoints

All endpoints are Vercel serverless functions in `/api/`.

### 2.1 Comparison Endpoints

#### `POST /api/evaluate`
Generate city comparison scores.

**Request:**
```typescript
{
  city1: {
    name: string;
    country: string;
    region?: string;
  };
  city2: {
    name: string;
    country: string;
    region?: string;
  };
  userId?: string;
  useEnhanced?: boolean;  // Multi-LLM consensus mode
  customWeights?: Record<CategoryId, number>;
}
```

**Response:**
```typescript
{
  success: boolean;
  result: {
    comparisonId: string;
    city1: CityScore;
    city2: CityScore;
    winner: 'city1' | 'city2' | 'tie';
    scoreDifference: number;
    generatedAt: string;
    llmsUsed?: string[];  // Enhanced mode
    overallConsensusConfidence?: 'high' | 'medium' | 'low';
  };
  latencyMs: number;
}
```

**Rate Limit:** 10/min (free), 30/min (pro), 100/min (enterprise)

**Retry Logic (Added 2026-02-04 - Fix #49):**
Gemini and Grok providers now include automatic retry with exponential backoff:
- Max attempts: 3
- Backoff: 1s → 2s → 4s
- Retries on: 5xx errors, empty responses, JSON parse failures
- No retry on: 4xx client errors (invalid key, bad request)
- File: `api/evaluate.ts`

---

#### `POST /api/judge-report`
Generate THE JUDGE's comprehensive analysis.

**Request:**
```typescript
{
  comparisonResult: ComparisonResult;
  userId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  report: {
    reportId: string;
    city1: string;
    city2: string;
    summaryOfFindings: {
      city1Score: number;
      city1Trend: 'rising' | 'stable' | 'declining';
      city2Score: number;
      city2Trend: 'rising' | 'stable' | 'declining';
      overallConfidence: 'high' | 'medium' | 'low';
    };
    categoryAnalysis: CategoryAnalysis[];
    executiveSummary: {
      recommendation: 'city1' | 'city2' | 'tie';
      rationale: string;
      keyFactors: string[];
      futureOutlook: string;
      confidenceLevel: 'high' | 'medium' | 'low';
    };
    videoStatus: 'pending' | 'generating' | 'ready' | 'error';
  };
  latencyMs: number;
}
```

**Model:** Claude Opus 4.5
**Rate Limit:** 5/hour (heavy preset)

---

### 2.2 Olivia Chat Endpoints

#### `POST /api/olivia/chat`
Main chat endpoint using OpenAI Assistants API.

**Request:**
```typescript
{
  threadId?: string;  // Existing thread or create new
  message: string;
  context?: LifeScoreContext;  // Comparison data
  textSummary?: string;  // Pre-built context summary
  generateAudio?: boolean;
}
```

**Response:**
```typescript
{
  threadId: string;
  messageId: string;
  response: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

**Features:**
- Automatic thread management
- Function calling for field evidence lookup
- Citation stripping from responses
- Active run cancellation handling

---

#### `POST /api/olivia/context`
Build context summary for Olivia.

**Request:**
```typescript
{
  comparisonResult: ComparisonResult;
  includeEvidence?: boolean;
}
```

**Response:**
```typescript
{
  textSummary: string;  // Formatted markdown for Olivia
  tokenEstimate: number;
}
```

---

#### `POST /api/olivia/field-evidence`
Get evidence sources for specific metrics.

**Request:**
```typescript
{
  comparisonId: string;
  metricId: string;
  city?: string;
}
```

**Response:**
```typescript
{
  metricId: string;
  metricName: string;
  evidence: {
    city: string;
    sources: Source[];
    score: number;
  }[];
}
```

---

### 2.3 Emilia Help Endpoints

#### `POST /api/emilia/create-thread`
Create new Emilia conversation thread.

**Response:**
```typescript
{
  success: boolean;
  threadId: string;
}
```

---

#### `POST /api/emilia/message`
Send message to Emilia and get response.

**Request:**
```typescript
{
  threadId: string;
  message: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  response: {
    id: string;
    content: string;
    createdAt: string;
  };
}
```

---

### 2.4 Gamma Report Endpoint

#### `POST /api/gamma`
Generate visual PDF/PPTX report.

**Request:**
```typescript
{
  prompt: string;  // Comparison data as prompt
  exportAs?: 'pdf' | 'pptx';
}
```

**Response:**
```typescript
{
  generationId: string;
  status: 'pending';
  warnings?: string;
  usage: {
    generationsUsed: number;
  };
}
```

---

#### `GET /api/gamma?generationId=xxx`
Check generation status.

**Response:**
```typescript
{
  generationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;  // Gamma doc URL
  pdfUrl?: string;
  pptxUrl?: string;
  error?: string;
}
```

---

### 2.5 Stripe Endpoints

#### `POST /api/stripe/create-checkout`
Create Stripe checkout session.

**Request:**
```typescript
{
  priceId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
}
```

**Response:**
```typescript
{
  sessionId: string;
  url: string;
}
```

---

#### `POST /api/stripe/webhook`
Stripe webhook handler.

**Events Handled:**
- `checkout.session.completed` - Activate subscription
- `customer.subscription.created` - Create subscription record
- `customer.subscription.updated` - Update tier/status
- `customer.subscription.deleted` - Downgrade to free
- `invoice.payment_failed` - Mark as past_due

---

### 2.6 Video Endpoints

#### `POST /api/grok-video`
Generate Grok video content.

**Request:**
```typescript
{
  comparisonId: string;
  videoType: 'court_order' | 'new_life';
  city1: string;
  city2: string;
  winner: string;
  executiveSummary?: string;
}
```

---

#### `POST /api/heygen/generate`
Generate HeyGen talking head video.

**Request:**
```typescript
{
  script: string;
  avatarId?: string;
  voiceId?: string;
}
```

---

## 3. Component Architecture

### 3.1 Core Components

| Component | File | Purpose |
|-----------|------|---------|
| `App` | `src/App.tsx` | Main app container, routing, providers |
| `Header` | `src/components/Header.tsx` | Navigation, user menu, theme toggle |
| `Footer` | `src/components/Footer.tsx` | Legal links, copyright |
| `TabNavigation` | `src/components/TabNavigation.tsx` | Main tab switching |

### 3.2 Comparison Components

| Component | File | Purpose |
|-----------|------|---------|
| `CitySelector` | `src/components/CitySelector.tsx` | City input with autocomplete |
| `Results` | `src/components/Results.tsx` | Main comparison results display |
| `EnhancedComparison` | `src/components/EnhancedComparison.tsx` | Multi-LLM consensus view |
| `EvidencePanel` | `src/components/EvidencePanel.tsx` | Source citations display |
| `ContrastDisplays` | `src/components/ContrastDisplays.tsx` | Side-by-side city views |
| `DealbreakersPanel` | `src/components/DealbreakersPanel.tsx` | Dealbreaker alerts |
| `DealbreakersWarning` | `src/components/DealbreakersWarning.tsx` | Warning modal |
| `WeightPresets` | `src/components/WeightPresets.tsx` | Category weight customization |
| `SavedComparisons` | `src/components/SavedComparisons.tsx` | History list |

### 3.3 AI Assistant Components

| Component | File | Purpose |
|-----------|------|---------|
| `AskOlivia` | `src/components/AskOlivia.tsx` | Olivia chat interface |
| `OliviaChatBubble` | `src/components/OliviaChatBubble.tsx` | Floating chat bubble |
| `OliviaAvatar` | `src/components/OliviaAvatar.tsx` | Animated avatar display |
| `EmiliaChat` | `src/components/EmiliaChat.tsx` | Emilia help chat |
| `HelpModal` | `src/components/HelpModal.tsx` | Help documentation modal |
| `HelpBubble` | `src/components/HelpBubble.tsx` | Contextual help tooltips |
| `ManualViewer` | `src/components/ManualViewer.tsx` | Documentation viewer |

### 3.4 Judge & Video Components

| Component | File | Purpose |
|-----------|------|---------|
| `JudgeTab` | `src/components/JudgeTab.tsx` | THE JUDGE tab container |
| `JudgeVideo` | `src/components/JudgeVideo.tsx` | Judge video player |
| `CourtOrderVideo` | `src/components/CourtOrderVideo.tsx` | Court order video |
| `NewLifeVideos` | `src/components/NewLifeVideos.tsx` | Lifestyle videos (Fix #48: auto-reset on expired URLs) |

**NewLifeVideos Error Handling (Added 2026-02-04 - Fix #48):**
Videos now track load errors and auto-reset when URLs expire:
- Error threshold: 3 failed loads
- Behavior: After 3 errors, state resets to allow regeneration
- Files: `src/components/NewLifeVideos.tsx`, `src/hooks/useGrokVideo.ts`

### 3.5 Subscription Components

| Component | File | Purpose |
|-----------|------|---------|
| `PricingPage` | `src/components/PricingPage.tsx` | Full pricing page |
| `PricingModal` | `src/components/PricingModal.tsx` | Upgrade modal |
| `FeatureGate` | `src/components/FeatureGate.tsx` | Tier-based feature locking |
| `UsageWarningBanner` | `src/components/UsageWarningBanner.tsx` | Usage limit warnings |
| `CostDashboard` | `src/components/CostDashboard.tsx` | Cost tracking display |

### 3.6 Utility Components

| Component | File | Purpose |
|-----------|------|---------|
| `LoadingState` | `src/components/LoadingState.tsx` | Loading indicators |
| `ThemeToggle` | `src/components/ThemeToggle.tsx` | Dark/light mode switch |
| `LoginScreen` | `src/components/LoginScreen.tsx` | Authentication UI |
| `SettingsModal` | `src/components/SettingsModal.tsx` | User settings |
| `CookieConsent` | `src/components/CookieConsent.tsx` | GDPR cookie banner |
| `LegalModal` | `src/components/LegalModal.tsx` | Terms/Privacy display |
| `DataSourcesModal` | `src/components/DataSourcesModal.tsx` | Data attribution |
| `AdvancedVisuals` | `src/components/AdvancedVisuals.tsx` | Charts and graphs |
| `VisualsTab` | `src/components/VisualsTab.tsx` | Gamma report viewer |

---

## 4. State Management

### 4.1 React Contexts

#### `AuthContext`
**File:** `src/contexts/AuthContext.tsx`

**State:**
```typescript
interface AuthState {
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  error: string | null;
}
```

**Methods:**
- `signInWithEmail(email, password)`
- `signInWithGoogle()`
- `signInWithGitHub()`
- `signInWithMagicLink(email)`
- `signUp(email, password, fullName?)`
- `resetPassword(email)`
- `signOut()`
- `updateProfile(updates)`
- `updatePreferences(updates)`
- `refreshProfile()`

**Modes:**
- **Supabase Mode:** Full auth with database
- **Demo Mode:** Fallback with localStorage when Supabase not configured

---

### 4.2 Custom Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useTierAccess` | `src/hooks/useTierAccess.ts` | **SOURCE OF TRUTH** for tier limits |
| `useComparison` | `src/hooks/useComparison.ts` | Comparison state and API calls |
| `useOliviaChat` | `src/hooks/useOliviaChat.ts` | Olivia conversation management |
| `useEmilia` | `src/hooks/useEmilia.ts` | Emilia help system |
| `useTTS` | `src/hooks/useTTS.ts` | Text-to-speech for Olivia |
| `useVoiceRecognition` | `src/hooks/useVoiceRecognition.ts` | Speech input |
| `useAvatarProvider` | `src/hooks/useAvatarProvider.ts` | Avatar service abstraction |
| `useDIDStream` | `src/hooks/useDIDStream.ts` | D-ID streaming video |
| `useSimli` | `src/hooks/useSimli.ts` | Simli avatar integration |
| `useJudgeVideo` | `src/hooks/useJudgeVideo.ts` | Judge video generation |
| `useGrokVideo` | `src/hooks/useGrokVideo.ts` | Grok video generation |
| `useContrastImages` | `src/hooks/useContrastImages.ts` | City comparison images |
| `useApiUsageMonitor` | `src/hooks/useApiUsageMonitor.ts` | Usage tracking |
| `useURLParams` | `src/hooks/useURLParams.ts` | URL state management |
| `useOGMeta` | `src/hooks/useOGMeta.ts` | Open Graph meta tags |

---

### 4.3 localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `lifescore_user` | User | Demo mode user data |
| `lifescore_saved_comparisons` | SavedComparison[] | Offline comparison cache |
| `lifescore_theme` | 'light' \| 'dark' \| 'system' | Theme preference |
| `lifescore_weight_preset` | string | Category weight preset |
| `lifescore_custom_weights` | Record<CategoryId, number> | Custom weights |
| `lifescore_dealbreakers` | string[] | Dealbreaker metric IDs |
| `lifescore_olivia_thread` | string | Current Olivia thread ID |
| `lifescore_cookie_consent` | boolean | GDPR consent |
| `lifescore_last_cities` | {city1, city2} | Recently compared cities |

---

## 5. Type Definitions

### 5.1 Core Types (`src/types/database.ts`)

```typescript
// User tier levels
export type UserTier = 'free' | 'pro' | 'enterprise';

// User profile from database
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  tier: UserTier;
  avatar_url: string | null;
  created_at: string;
}

// User preferences
export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  weight_preset: string;
  custom_weights: Record<string, number> | null;
  dealbreakers: string[] | null;
  notifications_enabled: boolean;
}

// Saved comparison
export interface SavedComparison {
  id: string;
  user_id: string | null;
  comparison_id: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  city1_score: number;
  city2_score: number;
  winner: 'city1' | 'city2' | 'tie';
  full_result: ComparisonResult;
  is_enhanced: boolean;
  created_at: string;
}
```

### 5.2 Metrics Types (`src/types/metrics.ts`)

```typescript
// Category identifiers
export type CategoryId =
  | 'personal_freedom'
  | 'housing_property'
  | 'business_work'
  | 'transportation'
  | 'policing_legal'
  | 'speech_lifestyle';

// Category definition
export interface Category {
  id: CategoryId;
  name: string;
  shortName: string;
  description: string;
  metricCount: number;
  weight: number;  // Percentage (0-100, total = 100)
  icon: string;
}

// Metric definition
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  categoryId: CategoryId;
  scoringDirection: 'higher_is_better' | 'lower_is_better';
  scoringCriteria: ScoringCriteria;
  weight: number;
  sources?: string[];
}

// Scoring criteria types
export type ScoringCriteria =
  | { type: 'categorical'; options: CategoricalOption[] }
  | { type: 'scale'; levels: ScaleLevel[] }
  | { type: 'boolean'; trueScore: number; falseScore: number }
  | { type: 'range'; minValue: number; maxValue: number };

export interface CategoricalOption {
  value: string;
  label: string;
  score: number;
}
```

### 5.3 Comparison Types (`src/types/enhancedComparison.ts`)

```typescript
// City score result
export interface CityScore {
  city: string;
  country: string;
  region?: string;
  categories: CategoryScore[];
  totalScore: number;
  normalizedScore: number;
}

// Category score
export interface CategoryScore {
  categoryId: CategoryId;
  categoryName: string;
  metrics: MetricScore[];
  categoryScore: number;
  weight: number;
}

// Individual metric score
export interface MetricScore {
  metricId: string;
  metricName: string;
  score: number;
  rawValue?: string;
  legalScore?: number;
  enforcementScore?: number;
  confidence?: 'high' | 'medium' | 'low';
  sources?: string[];
}

// Full comparison result
export interface ComparisonResult {
  comparisonId: string;
  city1: CityScore;
  city2: CityScore;
  winner: 'city1' | 'city2' | 'tie';
  scoreDifference: number;
  generatedAt: string;

  // Enhanced mode fields
  llmsUsed?: string[];
  overallConsensusConfidence?: 'high' | 'medium' | 'low';
  disagreementSummary?: string;
}
```

### 5.4 Judge Types (`src/types/judge.ts`)

```typescript
export interface JudgeReport {
  reportId: string;
  generatedAt: string;
  userId: string;
  comparisonId: string;
  city1: string;
  city2: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'generating' | 'ready' | 'error';

  summaryOfFindings: {
    city1Score: number;
    city1Trend: 'rising' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'rising' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };

  categoryAnalysis: {
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }[];

  executiveSummary: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}
```

### 5.5 Avatar Types (`src/types/avatar.ts`)

```typescript
export type AvatarProvider = 'heygen' | 'd-id' | 'simli' | 'none';

export interface AvatarConfig {
  provider: AvatarProvider;
  avatarId: string;
  voiceId: string;
  style?: 'natural' | 'professional' | 'casual';
}

export interface AvatarSession {
  sessionId: string;
  provider: AvatarProvider;
  status: 'connecting' | 'connected' | 'speaking' | 'idle' | 'error';
  streamUrl?: string;
}
```

### 5.6 API Usage Types (`src/types/apiUsage.ts`)

```typescript
export interface ApiUsageRecord {
  endpoint: string;
  timestamp: Date;
  tokensUsed: number;
  costUsd: number;
  provider: string;
  model?: string;
}

export interface UsageSummary {
  period: 'daily' | 'monthly';
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  byProvider: Record<string, {
    calls: number;
    tokens: number;
    costUsd: number;
  }>;
}
```

---

## 6. Services Layer

### 6.1 Core Services

| Service | File | Purpose |
|---------|------|---------|
| `supabase` | `src/lib/supabase.ts` | Supabase client, retry logic |
| `savedComparisons` | `src/services/savedComparisons.ts` | Comparison persistence |
| `rateLimit` | `api/shared/rateLimit.ts` | API rate limiting |
| `cors` | `api/shared/cors.ts` | CORS handling |
| `fetchWithTimeout` | `api/shared/fetchWithTimeout.ts` | Timeout wrapper |
| `metrics` | `src/shared/metrics.ts` | Metric definitions |

### 6.2 savedComparisons Service

**File:** `src/services/savedComparisons.ts`

```typescript
// Save comparison to localStorage and optionally Supabase
export async function saveComparison(result: ComparisonResult): Promise<void>

// Get all saved comparisons
export function getSavedComparisons(): SavedComparison[]

// Delete comparison
export async function deleteComparison(comparisonId: string): Promise<void>

// Sync local comparisons with database
export async function fullDatabaseSync(): Promise<SyncResult>
```

### 6.3 Supabase Client

**File:** `src/lib/supabase.ts`

```typescript
// Configured Supabase client
export const supabase: SupabaseClient

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean

// Retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T>

// Timeout constant
export const SUPABASE_TIMEOUT_MS = 15000
```

---

## 7. External Integrations

### 7.1 AI/LLM Providers

| Provider | Purpose | Models Used |
|----------|---------|-------------|
| **OpenAI** | Olivia chat, Emilia, evaluation | GPT-4o, GPT-4o-mini |
| **Anthropic** | THE JUDGE, enhanced evaluation | Claude Opus 4.5, Claude Sonnet |
| **Perplexity** | Web search for evidence | Sonar models |
| **Groq** | Fast inference, video scripts | LLaMA models |
| **Google** | Gemini for multi-LLM consensus | Gemini 2.0 Flash |
| **xAI** | Grok for video content | Grok-2 |

### 7.2 Video/Avatar Services

| Service | Purpose | Features |
|---------|---------|----------|
| **HeyGen** | Talking head videos | Avatar library, voice cloning |
| **D-ID** | Real-time avatar streaming | WebRTC streaming |
| **Simli** | Interactive avatars | Low-latency responses |
| **ElevenLabs** | Text-to-speech | Natural voices for Olivia |

### 7.3 Document Generation

| Service | Purpose |
|---------|---------|
| **Gamma** | Visual PDF/PPTX reports |

### 7.4 Payment Processing

| Service | Purpose |
|---------|---------|
| **Stripe** | Subscription billing |

### 7.5 Infrastructure

| Service | Purpose |
|---------|---------|
| **Supabase** | Database, auth, storage |
| **Vercel** | Hosting, serverless functions |

---

## 8. Tier System

### 8.1 Tier Definitions

**SOURCE OF TRUTH:** `src/hooks/useTierAccess.ts`

| Feature | FREE | NAVIGATOR ($19/mo) | SOVEREIGN ($49/mo) |
|---------|------|--------------------|--------------------|
| Comparisons/day | 3 | 20 | Unlimited |
| Enhanced mode | No | Yes | Yes |
| THE JUDGE reports | No | 5/month | Unlimited |
| Olivia chats/day | 10 | 50 | Unlimited |
| Gamma reports | No | 3/month | 10/month |
| HeyGen videos | No | No | 5/month |
| Priority support | No | Email | Priority |
| API access | No | No | Yes |
| Custom weights | Limited | Full | Full |
| Evidence panel | Basic | Full | Full |
| Export formats | None | PDF | PDF, PPTX, CSV |

### 8.2 useTierAccess Hook

```typescript
export function useTierAccess() {
  const { profile } = useAuth();
  const tier = profile?.tier || 'free';

  return {
    tier,
    isPro: tier === 'pro' || tier === 'enterprise',
    isEnterprise: tier === 'enterprise',

    // Feature checks
    canUseEnhanced: tier !== 'free',
    canUseJudge: tier !== 'free',
    canUseGamma: tier !== 'free',
    canUseVideos: tier === 'enterprise',

    // Limits
    limits: TIER_LIMITS[tier],

    // Usage tracking
    checkLimit: (feature: string) => boolean,
    incrementUsage: (feature: string) => void,
  };
}
```

### 8.3 Tier Limits Object

```typescript
export const TIER_LIMITS = {
  free: {
    comparisonsPerDay: 3,
    chatsPerDay: 10,
    judgeReportsPerMonth: 0,
    gammaReportsPerMonth: 0,
    videosPerMonth: 0,
    customWeightSlots: 1,
  },
  pro: {
    comparisonsPerDay: 20,
    chatsPerDay: 50,
    judgeReportsPerMonth: 5,
    gammaReportsPerMonth: 3,
    videosPerMonth: 0,
    customWeightSlots: 5,
  },
  enterprise: {
    comparisonsPerDay: Infinity,
    chatsPerDay: Infinity,
    judgeReportsPerMonth: Infinity,
    gammaReportsPerMonth: 10,
    videosPerMonth: 5,
    customWeightSlots: 20,
  },
};
```

---

## 9. Environment Variables

### 9.1 Required Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_KEY=xxx  # Server-side only

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_ASSISTANT_ID=asst_xxx  # Olivia
EMILIA_ASSISTANT_ID=asst_xxx  # Emilia

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_NAVIGATOR_MONTHLY=price_xxx
STRIPE_PRICE_NAVIGATOR_ANNUAL=price_xxx
STRIPE_PRICE_SOVEREIGN_MONTHLY=price_xxx
STRIPE_PRICE_SOVEREIGN_ANNUAL=price_xxx
```

### 9.2 Optional Variables

```bash
# Perplexity (evidence search)
PERPLEXITY_API_KEY=pplx-xxx

# HeyGen (avatar videos)
HEYGEN_API_KEY=xxx

# D-ID (streaming avatars)
DID_API_KEY=xxx

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx  # Olivia's voice

# Gamma (visual reports)
GAMMA_API_KEY=xxx
GAMMA_TEMPLATE_ID=xxx
GAMMA_THEME_ID=xxx
GAMMA_FOLDER_ID=xxx

# Groq (fast inference)
GROQ_API_KEY=xxx

# xAI (Grok videos)
XAI_API_KEY=xxx

# Google (Gemini)
GOOGLE_API_KEY=xxx

# Simli (interactive avatars)
SIMLI_API_KEY=xxx
```

### 9.3 Vercel System Variables

```bash
VERCEL_URL  # Auto-set by Vercel
NEXT_PUBLIC_BASE_URL  # Production URL override
```

---

## 10. File Structure

```
lifescore/
├── api/                          # Vercel serverless functions
│   ├── evaluate.ts               # Main comparison endpoint
│   ├── judge-report.ts           # THE JUDGE analysis
│   ├── gamma.ts                  # Visual report generation
│   ├── grok-video.ts             # Grok video generation
│   │
│   ├── olivia/                   # Olivia chat endpoints
│   │   ├── chat.ts               # Main chat
│   │   ├── context.ts            # Context builder
│   │   └── field-evidence.ts     # Evidence lookup
│   │
│   ├── emilia/                   # Emilia help endpoints
│   │   ├── create-thread.ts      # Thread creation
│   │   └── message.ts            # Message handling
│   │
│   ├── stripe/                   # Payment endpoints
│   │   ├── create-checkout.ts    # Checkout session
│   │   └── webhook.ts            # Webhook handler
│   │
│   └── shared/                   # Shared API utilities
│       ├── cors.ts               # CORS handling
│       ├── rateLimit.ts          # Rate limiting
│       ├── fetchWithTimeout.ts   # Timeout wrapper
│       ├── metrics.ts            # Metric definitions (shared)
│       └── types.ts              # Shared types
│
├── src/                          # Frontend source
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Global styles
│   │
│   ├── components/               # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── CitySelector.tsx
│   │   ├── Results.tsx
│   │   ├── EnhancedComparison.tsx
│   │   ├── JudgeTab.tsx
│   │   ├── AskOlivia.tsx
│   │   ├── EmiliaChat.tsx
│   │   ├── PricingPage.tsx
│   │   ├── FeatureGate.tsx
│   │   └── ... (37 total)
│   │
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx       # Authentication state
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useTierAccess.ts      # Tier system (SOURCE OF TRUTH)
│   │   ├── useComparison.ts      # Comparison logic
│   │   ├── useOliviaChat.ts      # Olivia chat
│   │   ├── useEmilia.ts          # Emilia help
│   │   └── ... (15 total)
│   │
│   ├── lib/                      # Utility libraries
│   │   ├── supabase.ts           # Supabase client
│   │   └── stripe.ts             # Stripe client
│   │
│   ├── services/                 # Business logic services
│   │   └── savedComparisons.ts   # Comparison persistence
│   │
│   ├── shared/                   # Shared between client/server
│   │   ├── metrics.ts            # Metric definitions
│   │   └── types.ts              # Shared types
│   │
│   ├── data/                     # Static data
│   │   ├── metrics.ts            # 100 metric definitions
│   │   ├── cities.ts             # City database
│   │   └── presets.ts            # Weight presets
│   │
│   ├── types/                    # TypeScript types
│   │   ├── database.ts           # Database types
│   │   ├── metrics.ts            # Metric types
│   │   ├── enhancedComparison.ts # Comparison types
│   │   ├── judge.ts              # Judge types
│   │   ├── olivia.ts             # Olivia types
│   │   ├── avatar.ts             # Avatar types
│   │   ├── gamma.ts              # Gamma types
│   │   ├── apiUsage.ts           # Usage tracking types
│   │   └── grokVideo.ts          # Grok video types
│   │
│   └── assets/                   # Static assets
│       ├── icons/
│       └── images/
│
├── supabase/                     # Supabase config
│   └── migrations/               # Database migrations
│       ├── 001_initial_schema.sql
│       ├── 002_subscriptions_and_usage.sql
│       ├── 003_avatar_videos.sql
│       ├── 20260125_create_judge_tables.sql
│       ├── 20260126_create_api_cost_records.sql
│       ├── 20260127_create_grok_videos.sql
│       ├── 20260130_create_api_quota_settings.sql
│       └── 20260202_create_authorized_manual_access.sql
│
├── docs/                         # Documentation
│   ├── handoffs/                 # Session handoff documents
│   ├── manuals/                  # User and technical manuals
│   │   └── APP_SCHEMA_MANUAL.md  # THIS FILE
│   └── architecture/             # Architecture diagrams
│
├── scripts/                      # Build/utility scripts
│   └── verify-metrics.ts         # Metric validation
│
├── public/                       # Static public files
│   ├── favicon.ico
│   └── og-image.png
│
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── vercel.json                   # Vercel deployment config
├── tailwind.config.js            # Tailwind CSS config
└── .env.example                  # Environment template
```

---

## Appendix A: Metrics Summary

LIFE SCORE evaluates cities across **100 metrics** in **6 categories**:

| Category | ID | Metrics | Weight |
|----------|----|---------:|-------:|
| Personal Autonomy | personal_freedom | 15 | 20% |
| Housing & Property | housing_property | 20 | 20% |
| Business & Work | business_work | 25 | 20% |
| Transportation | transportation | 15 | 15% |
| Legal System | policing_legal | 15 | 15% |
| Speech & Lifestyle | speech_lifestyle | 10 | 10% |
| **Total** | | **100** | **100%** |

---

## Appendix B: API Rate Limits

| Preset | Requests/Min | Burst | Endpoints |
|--------|-------------:|------:|-----------|
| standard | 60 | 10 | General endpoints |
| light | 30 | 5 | Olivia chat, Gamma |
| heavy | 5 | 2 | Judge reports, evaluate |
| unlimited | No limit | N/A | Internal endpoints |

---

## Appendix C: Error Codes

| Code | HTTP Status | Description |
|------|------------:|-------------|
| AUTH_REQUIRED | 401 | Authentication required |
| TIER_LIMIT | 403 | Feature requires higher tier |
| RATE_LIMITED | 429 | Too many requests |
| INVALID_INPUT | 400 | Invalid request data |
| NOT_FOUND | 404 | Resource not found |
| PROVIDER_ERROR | 502 | External API error |
| TIMEOUT | 504 | Request timed out |
| INTERNAL_ERROR | 500 | Server error |

---

## Document Info

- **Generated by:** Claude Opus 4.5
- **For:** LIFE SCORE TODO 12.1 - Emilia Help System
- **Conversation ID:** LS-SCHEMA-20260203
- **Last Updated:** 2026-02-03
