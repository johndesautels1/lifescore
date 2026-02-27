# LIFE SCORE - Complete Application Schema Manual

**Version:** 2.6.0
**Last Updated:** 2026-02-26
**Purpose:** Comprehensive technical reference for Emilia help system and developers
**Auto-Generated From:** Codebase introspection of ~250 commits ahead of main

---

## Table of Contents

1. [Authentication & Password Recovery](#1-authentication--password-recovery)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [Component Architecture](#4-component-architecture)
5. [State Management](#5-state-management)
6. [Type Definitions](#6-type-definitions)
7. [Services Layer](#7-services-layer)
8. [External Integrations](#8-external-integrations)
9. [Tier System](#9-tier-system)
10. [Environment Variables](#10-environment-variables)
11. [File Structure](#11-file-structure)

---

## 1. Authentication & Password Recovery

### 1.1 Authentication Provider

LIFE SCORE uses **Supabase Auth (GoTrue)** for all authentication. Supabase manages the `auth.users` table internally — passwords are bcrypt-hashed and never exposed to client code.

**Supported Sign-In Methods:**
- Email + Password
- Google OAuth
- GitHub OAuth
- Magic Link (passwordless email)

**Key Files:**
| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Central auth state, sign-in/sign-up/reset methods, `onAuthStateChange` listener |
| `src/components/LoginScreen.tsx` | Sign In, Sign Up, and Forgot Password forms |
| `src/components/ResetPasswordScreen.tsx` | "Set New Password" form shown after clicking email reset link |
| `src/App.tsx` | Route gate: shows `ResetPasswordScreen` when `isPasswordRecovery` is true |

### 1.2 Supabase `auth.users` Table (Managed)

This table is fully managed by Supabase — it does NOT appear in your migrations. Relevant columns:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, referenced by `profiles.id` |
| email | TEXT | User's email address |
| encrypted_password | TEXT | Bcrypt hash of the user's password |
| raw_user_meta_data | JSONB | Sign-up metadata (`full_name`, `avatar_url`) |
| recovery_token | TEXT | One-time password reset token (nullable, 1hr TTL) |
| recovery_sent_at | TIMESTAMPTZ | When the reset email was sent |
| email_confirmed_at | TIMESTAMPTZ | When email was verified |
| created_at | TIMESTAMPTZ | Account creation |
| updated_at | TIMESTAMPTZ | Last auth change |

### 1.3 Auto-Provisioning on Sign-Up

When a new user is created in `auth.users`, a database trigger fires automatically:

```
TRIGGER: on_auth_user_created (AFTER INSERT ON auth.users)
  → FUNCTION: handle_new_user() [SECURITY DEFINER]
    → INSERT INTO profiles (id, email, full_name, avatar_url)
    → INSERT INTO user_preferences (user_id)
```

**Source:** `supabase/migrations/001_initial_schema.sql:320-343`

This ensures every authenticated user immediately has a `profiles` row and a `user_preferences` row — no manual setup required.

### 1.4 Password Reset Flow (Complete)

```
STEP 1: USER REQUESTS RESET
────────────────────────────
LoginScreen.tsx  →  AuthContext.resetPassword(email)
                    →  supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: window.location.origin + '/auth/callback'
                       })

  Supabase:
    1. Looks up email in auth.users
    2. Generates a one-time recovery JWT (1-hour expiry)
    3. Stores recovery_token + recovery_sent_at in auth.users
    4. Sends email via Supabase mail service:
       From: noreply@mail.app.supabase.io
       Link: https://lifescore.vercel.app/auth/callback#access_token=...&type=recovery
    5. Returns success even if email doesn't exist (prevents enumeration)

  UI shows: "Password reset link sent! Check your email (including spam)."


STEP 2: USER CLICKS EMAIL LINK
───────────────────────────────
Browser navigates to: /auth/callback#access_token=...&type=recovery

  Supabase JS client auto-parses the URL hash fragment.
  supabase.auth.onAuthStateChange() fires with:
    event  = 'PASSWORD_RECOVERY'
    session = { access_token, refresh_token, user }

  AuthContext.tsx:339-349 handles this:
    → isPasswordRecovery = true
    → isAuthenticated = true (temporary session)

  App.tsx:621-622 route gate:
    if (isPasswordRecovery) → renders <ResetPasswordScreen />


STEP 3: USER SETS NEW PASSWORD
───────────────────────────────
ResetPasswordScreen.tsx shows:
  [New Password]        (min 6 chars)
  [Confirm Password]    (must match)
  [Update Password]     (submit)
  [Skip — go to app]    (bypass)

On submit → AuthContext.updatePassword(newPassword)
  → supabase.auth.updateUser({ password: newPassword })

  Supabase:
    1. Hashes new password with bcrypt
    2. Updates auth.users.encrypted_password
    3. Nullifies auth.users.recovery_token (consumed)

  AuthContext:
    → isPasswordRecovery = false
    → Cleans URL hash fragment
    → User is now fully authenticated with the new password

  UI shows: "Password updated successfully! Redirecting..."
  After 2s → clearPasswordRecovery() → main app loads
```

### 1.5 What the Database Does (and Doesn't Do) During Password Reset

| Table | Affected? | What Happens |
|-------|-----------|--------------|
| `auth.users` | YES | `encrypted_password` updated, `recovery_token` consumed |
| `profiles` | NO | Untouched — same user, same data |
| `user_preferences` | NO | Untouched |
| `comparisons` | NO | Untouched — all saved comparisons preserved |
| `olivia_conversations` | NO | Untouched |
| `olivia_messages` | NO | Untouched |
| `gamma_reports` | NO | Untouched |
| `judge_reports` | NO | Untouched |
| `subscriptions` | NO | Untouched — billing continues normally |
| `jobs` | NO | Untouched |
| `notifications` | NO | Untouched |

**Password reset changes ONLY the password hash. All user data remains intact.**

### 1.6 Auth State Properties

The `AuthContext` exposes these auth-related state properties:

| Property | Type | Description |
|----------|------|-------------|
| `isAuthenticated` | boolean | User has a valid session |
| `isPasswordRecovery` | boolean | User clicked a reset link and needs to set a new password |
| `isLoading` | boolean | Auth operation in progress |
| `isConfigured` | boolean | Supabase URL + key are present |
| `user` | User \| null | Supabase user object |
| `session` | Session \| null | Current JWT session |

**Auth Methods:**

| Method | Signature | Purpose |
|--------|-----------|---------|
| `signInWithEmail` | `(email, password) → { error }` | Email/password sign-in |
| `signUp` | `(email, password, fullName?) → { error }` | Create new account |
| `resetPassword` | `(email) → { error }` | Send password reset email |
| `updatePassword` | `(newPassword) → { error }` | Set new password during recovery |
| `clearPasswordRecovery` | `() → void` | Exit recovery mode, clean URL hash |
| `signInWithGoogle` | `() → void` | Google OAuth redirect |
| `signInWithGitHub` | `() → void` | GitHub OAuth redirect |
| `signInWithMagicLink` | `(email) → { error }` | Passwordless email login |
| `signOut` | `() → void` | Sign out, clear session |

---

## 2. Database Schema

LIFE SCORE uses **Supabase (PostgreSQL)** with **23 tables**, **6 storage buckets**, **15 database functions**, and **13 triggers**. All tables have Row Level Security (RLS) enabled.

### 2.1 Core User Tables

#### `profiles`
User profiles linked to Supabase Auth. Auto-created via trigger on auth.users insert.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, FK(auth.users) | User ID from Supabase Auth |
| email | TEXT | | User email |
| full_name | TEXT | | Display name |
| avatar_url | TEXT | | Profile picture URL |
| tier | TEXT | DEFAULT 'free' | 'free', 'pro', 'enterprise' |
| preferred_currency | TEXT | DEFAULT 'USD' | Currency preference |
| preferred_units | TEXT | DEFAULT 'imperial' | Units preference |
| email_notifications | BOOLEAN | DEFAULT true | Email notification preference |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation |
| updated_at | TIMESTAMPTZ | | Last profile update |

**RLS:** Users can read/update only their own profile.

---

#### `user_preferences`
User customization settings. Single-row-per-user design.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Row ID |
| user_id | UUID | FK(profiles), UNIQUE | User ID |
| favorite_cities | JSONB | DEFAULT '[]' | Saved favorite cities |
| theme | TEXT | DEFAULT 'dark' | 'light', 'dark', 'auto' |
| default_view | TEXT | DEFAULT 'grid' | 'grid', 'list', 'table' |
| olivia_auto_speak | BOOLEAN | DEFAULT true | Auto-play Olivia TTS |
| olivia_voice_enabled | BOOLEAN | DEFAULT true | Enable voice output |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

---

#### `subscriptions`
Stripe subscription records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Subscription record ID |
| user_id | UUID | FK(profiles) | User this subscription belongs to |
| stripe_customer_id | TEXT | NOT NULL | Stripe customer ID (cus_xxx) |
| stripe_subscription_id | TEXT | UNIQUE, NOT NULL | Stripe subscription ID (sub_xxx) |
| stripe_price_id | TEXT | NOT NULL | Active price ID |
| status | TEXT | NOT NULL | active, canceled, incomplete, past_due, trialing, unpaid, paused |
| current_period_start | TIMESTAMPTZ | NOT NULL | Billing period start |
| current_period_end | TIMESTAMPTZ | NOT NULL | Billing period end |
| cancel_at_period_end | BOOLEAN | DEFAULT false | Will cancel at period end |
| canceled_at | TIMESTAMPTZ | | When cancellation was requested |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Indexes:** user_id, stripe_customer_id, status='active' partial, (user_id, status) composite.

---

### 2.2 Comparison Tables

#### `comparisons`
Stored city comparison results. (Previously documented as `saved_comparisons` — the actual table name is `comparisons`.)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Comparison ID |
| user_id | UUID | FK(profiles) | Owner |
| comparison_id | TEXT | NOT NULL | Format: LIFE-CITY1-CITY2-TIMESTAMP |
| city1_name | TEXT | NOT NULL | First city name |
| city1_country | TEXT | NOT NULL | First city country |
| city1_score | NUMERIC(5,2) | | Total score city 1 |
| city2_name | TEXT | NOT NULL | Second city name |
| city2_country | TEXT | NOT NULL | Second city country |
| city2_score | NUMERIC(5,2) | | Total score city 2 |
| winner | TEXT | CHECK | 'city1', 'city2', 'tie' |
| score_difference | NUMERIC(5,2) | | Absolute difference |
| comparison_result | JSONB | NOT NULL | Complete comparison data |
| nickname | TEXT | | User-assigned name |
| notes | TEXT | | User notes |
| is_favorite | BOOLEAN | DEFAULT false | Starred comparison |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Unique Constraint:** (user_id, comparison_id)
**Indexes:** user_id, created_at, cities, favorite, (user_id, created_at DESC) composite.

---

### 2.3 AI Assistant Tables

#### `olivia_conversations`
Olivia AI chat threads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Conversation ID |
| user_id | UUID | FK(profiles) | Owner |
| comparison_id | UUID | FK(comparisons), ON DELETE SET NULL | Related comparison |
| openai_thread_id | TEXT | NOT NULL | OpenAI thread identifier |
| title | TEXT | | Conversation title |
| message_count | INTEGER | DEFAULT 0 | Auto-updated via trigger |
| last_message_at | TIMESTAMPTZ | | Last activity |
| is_active | BOOLEAN | DEFAULT true | Active conversation |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

---

#### `olivia_messages`
Chat message history for Olivia.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Message ID |
| conversation_id | UUID | FK(olivia_conversations) | Parent conversation |
| role | TEXT | CHECK | 'user', 'assistant', 'system' |
| content | TEXT | NOT NULL | Message text |
| openai_message_id | TEXT | | OpenAI message reference |
| audio_url | TEXT | | TTS audio URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**RLS:** Users can read/insert messages in conversations they own (via EXISTS subquery).

---

### 2.4 Judge & Report Tables

#### `judge_reports`
THE JUDGE's comprehensive verdicts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Row ID |
| user_id | UUID | FK(auth.users) | Report owner |
| report_id | TEXT | UNIQUE, NOT NULL | Format: LIFE-JDG-DATE-USERID-HASH |
| city1_name | TEXT | NOT NULL | First city |
| city2_name | TEXT | NOT NULL | Second city |
| city1_score | NUMERIC(5,2) | | City 1 total score |
| city1_trend | TEXT | CHECK | 'rising', 'stable', 'declining', 'improving' |
| city2_score | NUMERIC(5,2) | | City 2 total score |
| city2_trend | TEXT | CHECK | 'rising', 'stable', 'declining', 'improving' |
| overall_confidence | TEXT | CHECK | 'high', 'medium', 'low' |
| recommendation | TEXT | CHECK | 'city1', 'city2', 'tie' |
| rationale | TEXT | | Executive summary rationale |
| key_factors | JSONB | DEFAULT '[]' | Key decision factors |
| future_outlook | TEXT | | Future trend analysis |
| confidence_level | TEXT | CHECK | 'high', 'medium', 'low' |
| category_analysis | JSONB | DEFAULT '[]' | Per-category analysis |
| full_report | JSONB | NOT NULL | Complete JudgeReport object |
| video_url | TEXT | | Court order video URL |
| video_status | TEXT | DEFAULT 'pending' | 'pending', 'generating', 'ready', 'error' |
| comparison_id | TEXT | | Related comparison ID |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

---

#### `gamma_reports`
Gamma-generated visual PDF/PPTX reports.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Row ID |
| user_id | UUID | FK(profiles) | Owner |
| comparison_id | UUID | FK(comparisons) | Source comparison |
| gamma_generation_id | TEXT | NOT NULL | Gamma generation ID |
| gamma_url | TEXT | NOT NULL | Gamma document URL (hosted on gamma.app) |
| pdf_url | TEXT | | PDF download URL (permanent Supabase Storage URL after 2026-02-17) |
| pptx_url | TEXT | | PPTX download URL (permanent Supabase Storage URL after 2026-02-17) |
| pdf_storage_path | TEXT | | Supabase Storage path for persisted PDF export (never expires) |
| pptx_storage_path | TEXT | | Supabase Storage path for persisted PPTX export (never expires) |
| nickname | TEXT | | User-assigned name |
| city1 | TEXT | | First city |
| city2 | TEXT | | Second city |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Persistence Fix (2026-02-14):** The `comparison_id` column has a foreign key reference to `comparisons(id)`. Previously, INSERT operations silently failed because the code was passing UUIDs that didn't exist in the `comparisons` table (the comparison_id format didn't match). The fire-and-forget `.then()` pattern swallowed the Postgres FK violation error. Now fixed with proper error handling and correct ID resolution.

**Export URL Expiration Fix (2026-02-17):** Gamma CDN export URLs (PDF/PPTX) expire after hours/days. The `api/gamma.ts` endpoint now downloads exports immediately on generation completion and uploads to Supabase Storage (`gamma-exports` public bucket, `{generationId}.{format}` path). The `pdf_url`/`pptx_url` columns now store permanent Supabase Storage public URLs. The `pdf_storage_path`/`pptx_storage_path` columns track the Storage paths for cleanup/migration. Migrations: `20260217_add_gamma_export_storage_paths.sql` (DB columns), `20260217_create_gamma_exports_storage.sql` (Storage bucket).

---

#### `reports`
Enhanced report metadata and storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Report ID |
| user_id | UUID | FK(auth.users) | Owner |
| report_type | TEXT | DEFAULT 'enhanced' | 'standard', 'enhanced' |
| version | TEXT | DEFAULT 'v4.0' | Report format version |
| city1_name | TEXT | NOT NULL | First city |
| city1_country | TEXT | NOT NULL | |
| city2_name | TEXT | NOT NULL | Second city |
| city2_country | TEXT | NOT NULL | |
| winner | TEXT | NOT NULL | Winning city |
| winner_score | INTEGER | NOT NULL, 0-100 | Winner's score |
| loser_score | INTEGER | NOT NULL, 0-100 | Loser's score |
| score_difference | INTEGER | NOT NULL | Score gap |
| gamma_doc_id | TEXT | | Gamma document ID |
| gamma_url | TEXT | | Gamma URL |
| pdf_url | TEXT | | PDF URL (permanent after 2026-02-17) |
| pdf_storage_path | TEXT | | Supabase Storage path for persisted PDF |
| pptx_storage_path | TEXT | | Supabase Storage path for persisted PPTX |
| html_storage_path | TEXT | | Supabase storage path |
| status | TEXT | DEFAULT 'generating' | 'generating', 'completed', 'failed' |
| page_count | INTEGER | | Number of pages |
| total_metrics | INTEGER | DEFAULT 100 | Metrics evaluated |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | DEFAULT NOW() + 6 months | Auto-expiry |

---

#### `report_shares`
Report sharing links.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Share ID |
| report_id | UUID | FK(reports) | Report being shared |
| shared_by | UUID | FK(auth.users) | Creator |
| share_token | TEXT | UNIQUE, NOT NULL | Public share token |
| expires_at | TIMESTAMPTZ | | Expiry date |
| max_views | INTEGER | | View limit |
| view_count | INTEGER | DEFAULT 0 | Current views |
| requires_email | BOOLEAN | DEFAULT false | Email-gated access |
| allowed_emails | TEXT[] | | Allowed viewer emails |
| password_hash | TEXT | | Password protection |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**RLS:** Owners see all fields. Public view `report_shares_public` excludes `password_hash`.

---

#### `report_access_logs`
Report analytics and audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Log ID |
| report_id | UUID | FK(reports) | Report accessed |
| user_id | UUID | FK(auth.users), nullable | Viewer (null = anonymous) |
| accessed_at | TIMESTAMPTZ | DEFAULT NOW() | |
| access_type | TEXT | CHECK | 'view', 'download', 'share', 'embed' |
| ip_address | INET | | Viewer IP |
| user_agent | TEXT | | Browser info |
| share_token | TEXT | | Token used to access |

---

### 2.5 Video Tables

#### `grok_videos`
Video generation records for New Life Videos and Court Orders. Primary provider: Kling AI; fallback: Replicate Minimax.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Video record ID |
| user_id | UUID | FK(auth.users) | Video owner |
| comparison_id | TEXT | NOT NULL | Related comparison |
| city_name | TEXT | NOT NULL | City for this video |
| video_type | TEXT | CHECK | 'winner_mood', 'loser_mood', 'perfect_life' |
| prompt | TEXT | NOT NULL | Generation prompt |
| video_url | TEXT | | CDN video URL |
| thumbnail_url | TEXT | | Thumbnail URL |
| duration_seconds | NUMERIC | DEFAULT 8 | Video length |
| provider | TEXT | DEFAULT 'grok' | 'grok', 'replicate' (also used for 'kling') |
| prediction_id | TEXT | | Provider task/prediction ID |
| status | TEXT | DEFAULT 'pending' | 'pending', 'processing', 'completed', 'failed' |
| error_message | TEXT | | Error details |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| completed_at | TIMESTAMPTZ | | |

**Unique Index:** (city_name, video_type WHERE status='completed') — one completed video per city+type.
**Cache Logic:** Videos are reused across users for the same city/type. Replicate delivery URLs expire ~24h and are auto-invalidated via HEAD check.

---

#### `avatar_videos`
Cached Judge verdict videos (Replicate Wav2Lip).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Video record ID |
| comparison_id | TEXT | UNIQUE, NOT NULL | Related comparison |
| video_url | TEXT | NOT NULL | Video URL |
| thumbnail_url | TEXT | | Thumbnail |
| script | TEXT | NOT NULL | Video script |
| duration_seconds | INTEGER | | Video length |
| replicate_prediction_id | TEXT | | Replicate prediction ID |
| city1 | TEXT | NOT NULL | First city |
| city2 | TEXT | NOT NULL | Second city |
| winner | TEXT | NOT NULL | Winning city |
| winner_score | INTEGER | | Winner's score |
| loser_score | INTEGER | | Loser's score |
| status | TEXT | DEFAULT 'pending' | 'pending', 'processing', 'completed', 'failed' |
| error | TEXT | | Error message |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| completed_at | TIMESTAMPTZ | | |
| expires_at | TIMESTAMPTZ | DEFAULT NOW() + 30 days | Auto-expiry |

---

#### `invideo_overrides`
Admin-uploaded cinematic video replacements for Court Order videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Override ID |
| comparison_id | TEXT | nullable | NULL = city-level default |
| city_name | TEXT | NOT NULL | City this override applies to |
| video_url | TEXT | NOT NULL | InVideo movie URL |
| video_title | TEXT | | Video title |
| duration_seconds | NUMERIC | | Length |
| thumbnail_url | TEXT | | Thumbnail |
| uploaded_by | TEXT | NOT NULL | Admin email |
| is_active | BOOLEAN | DEFAULT true | Active override |
| generation_prompt | TEXT | | Prompt used for generation |
| source | TEXT | DEFAULT 'manual' | 'manual', 'api' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Lookup Priority:** comparison-specific > city-wide > none.

---

### 2.6 Usage & Cost Tracking

#### `usage_tracking`
Feature usage per billing period.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record ID |
| user_id | UUID | FK(profiles) | User |
| period_start | DATE | NOT NULL | Billing period start |
| period_end | DATE | NOT NULL | Billing period end |
| standard_comparisons | INTEGER | DEFAULT 0 | Standard mode comparisons |
| enhanced_comparisons | INTEGER | DEFAULT 0 | Enhanced mode comparisons |
| olivia_messages | INTEGER | DEFAULT 0 | Olivia chat messages |
| judge_videos | INTEGER | DEFAULT 0 | Judge videos generated |
| gamma_reports | INTEGER | DEFAULT 0 | Gamma reports generated |
| grok_videos | INTEGER | DEFAULT 0 | Grok/Kling videos generated |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Unique Constraint:** (user_id, period_start)
**DB Functions:** `get_or_create_usage_period(UUID)`, `increment_usage(UUID, TEXT, INTEGER)`

---

#### `api_cost_records`
Detailed cost tracking per comparison and provider.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record ID |
| user_id | UUID | FK(profiles) | User |
| comparison_id | TEXT | NOT NULL | Related comparison |
| city1_name | TEXT | NOT NULL | First city |
| city2_name | TEXT | NOT NULL | Second city |
| mode | TEXT | CHECK | 'simple', 'enhanced' |
| tavily_total | DECIMAL(10,6) | DEFAULT 0 | Tavily research cost |
| claude_sonnet_total | DECIMAL(10,6) | DEFAULT 0 | Claude cost |
| gpt4o_total | DECIMAL(10,6) | DEFAULT 0 | GPT-4o cost |
| gemini_total | DECIMAL(10,6) | DEFAULT 0 | Gemini cost |
| grok_total | DECIMAL(10,6) | DEFAULT 0 | Grok cost |
| perplexity_total | DECIMAL(10,6) | DEFAULT 0 | Perplexity cost |
| opus_judge_total | DECIMAL(10,6) | DEFAULT 0 | Opus Judge cost |
| gamma_total | DECIMAL(10,6) | DEFAULT 0 | Gamma report cost |
| olivia_total | DECIMAL(10,6) | DEFAULT 0 | Olivia chat cost |
| tts_total | DECIMAL(10,6) | DEFAULT 0 | ElevenLabs TTS cost |
| avatar_total | DECIMAL(10,6) | DEFAULT 0 | Avatar video cost |
| kling_total | DECIMAL(10,6) | DEFAULT 0 | Kling video cost |
| grand_total | DECIMAL(10,6) | DEFAULT 0 | Sum of all costs |
| cost_breakdown | JSONB | DEFAULT '{}' | Detailed breakdown |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Unique Constraint:** (user_id, comparison_id)
**Auto-Sync:** Cost records are automatically synced to Supabase after each comparison completes via `storeCostBreakdown()` → `toApiCostRecordInsert()` → `saveApiCostRecord()`. Additionally, cost records are auto-synced from the `CostDashboard` component: when the dashboard loads, it merges DB + localStorage records field-by-field (taking `max(DB value, localStorage value)` for each service cost). Patched records with a higher `grandTotal` are automatically re-saved to Supabase.

---

#### `api_quota_settings`
Admin-configurable per-provider API quotas with alert thresholds.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record ID |
| provider_key | TEXT | UNIQUE, NOT NULL | Provider identifier |
| display_name | TEXT | NOT NULL | Human-readable name |
| icon | TEXT | DEFAULT '📊' | Display icon |
| quota_type | TEXT | CHECK | 'dollars', 'tokens', 'characters', 'credits', 'requests', 'seconds' |
| monthly_limit | DECIMAL(12,2) | DEFAULT 0 | Monthly cap |
| warning_yellow | DECIMAL(3,2) | DEFAULT 0.50 | Yellow alert threshold (50%) |
| warning_orange | DECIMAL(3,2) | DEFAULT 0.70 | Orange alert threshold (70%) |
| warning_red | DECIMAL(3,2) | DEFAULT 0.85 | Red alert threshold (85%) |
| current_usage | DECIMAL(12,2) | DEFAULT 0 | Current month usage |
| usage_month | TEXT | | Current month (YYYY-MM) |
| alerts_enabled | BOOLEAN | DEFAULT true | Alert emails enabled |
| is_active | BOOLEAN | DEFAULT true | Provider active |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Seeded Providers (16):** Anthropic, OpenAI, Google Gemini, xAI Grok, Perplexity, Tavily, ElevenLabs, Simli, D-ID, HeyGen, Replicate, Kling, Gamma.
**DB Functions:** `get_quota_status()`, `update_provider_usage()`, `reset_monthly_usage()`

---

### 2.7 Compliance & System Tables

#### `consent_logs`
GDPR audit trail for user consent actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Log ID |
| user_id | UUID | FK(auth.users), nullable | User (null for anonymous) |
| anonymous_id | TEXT | | Anonymous tracking ID |
| consent_type | TEXT | NOT NULL | Consent category |
| consent_action | TEXT | NOT NULL | 'granted', 'denied', 'withdrawn' |
| consent_categories | JSONB | DEFAULT '{}' | Category details |
| ip_address | INET | | Client IP |
| user_agent | TEXT | | Browser info |
| page_url | TEXT | | Page where consent given |
| policy_version | TEXT | DEFAULT '1.0' | Policy version |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | | Consent expiry |

---

#### `contrast_image_cache`
Cached AI-generated contrast images for Olivia.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Cache ID |
| cache_key | TEXT | UNIQUE, NOT NULL | Lookup key |
| city_a_url | TEXT | | City A image URL |
| city_a_caption | TEXT | | City A caption |
| city_a_storage_path | TEXT | | Supabase Storage path |
| city_b_url | TEXT | | City B image URL |
| city_b_caption | TEXT | | City B caption |
| city_b_storage_path | TEXT | | Supabase Storage path |
| topic | TEXT | | Comparison topic |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| expires_at | TIMESTAMPTZ | DEFAULT NOW() + 30 days | Auto-expiry |

**DB Function:** `cleanup_expired_contrast_images()` — deletes expired cache entries and storage files.

---

#### `app_prompts`
Admin-editable prompts for all AI interactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Prompt ID |
| category | TEXT | NOT NULL | evaluate, judge, olivia, gamma, video, invideo |
| prompt_key | TEXT | NOT NULL | Unique key within category |
| display_name | TEXT | NOT NULL | Human-readable name |
| prompt_text | TEXT | NOT NULL | The actual prompt content |
| description | TEXT | | What this prompt does |
| version | INTEGER | DEFAULT 1 | Auto-incremented on update |
| last_edited_by | TEXT | | Admin who last edited |
| is_active | BOOLEAN | DEFAULT true | Active prompt |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Unique Constraint:** (category, prompt_key)
**Seeded Prompts:** 28 total — evaluate (11), judge (3), olivia (4), video (9), invideo (2+), gamma (1).

---

#### `authorized_manual_access`
Controls access to admin documentation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Record ID |
| email | TEXT | UNIQUE, NOT NULL | Authorized email |
| role | TEXT | DEFAULT 'admin' | Access level |
| is_active | BOOLEAN | DEFAULT true | Currently authorized |
| added_by | TEXT | | Who authorized |
| notes | TEXT | | Authorization notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | | |

**Seeded:** cluesnomads@gmail.com (owner), brokerpinellas@gmail.com (admin).

---

### 2.8 Job & Notification Tables (Added 2026-02-16)

#### `jobs`
Persistent job queue for long-running tasks (comparisons, Judge verdicts, video generation, Gamma reports).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Job ID |
| user_id | UUID | FK(profiles), NOT NULL | Job owner |
| type | TEXT | NOT NULL | comparison, judge, video, gamma, court_order, freedom_tour |
| status | TEXT | NOT NULL, DEFAULT 'pending' | pending, processing, completed, failed |
| metadata | JSONB | DEFAULT '{}' | Task-specific data (city names, report IDs, etc.) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Job creation |
| updated_at | TIMESTAMPTZ | | Last status change |

**RLS:** Users can only see/update their own jobs.
**Trigger:** auto-updates `updated_at` on status change.
**Indexes:** user_id, status, (user_id, status) composite.

---

#### `notifications`
In-app bell notifications and email notification records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Notification ID |
| user_id | UUID | FK(profiles), NOT NULL | Notification recipient |
| job_id | UUID | FK(jobs), nullable | Related job (if applicable) |
| type | TEXT | NOT NULL | Notification type identifier |
| title | TEXT | NOT NULL | Notification title |
| body | TEXT | | Notification message body |
| channel | TEXT | NOT NULL, DEFAULT 'in_app' | in_app, email, both |
| read | BOOLEAN | DEFAULT false | Whether user has seen it |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**RLS:** Users can only see/update their own notifications.
**Indexes:** user_id, (user_id, read) composite for unread count queries.

---

#### `profiles.phone` column
Added TEXT column to profiles table for future SMS notification support.

---

### 2.9 Storage Buckets

| Bucket | Access | Purpose | Limits |
|--------|--------|---------|--------|
| `reports` | Public reads, RLS writes | HTML reports per user folder (`{userId}/*`) | 200MB, text/html MIME |
| `user-videos` | Public reads, RLS writes | User-uploaded Court Order videos (`{userId}/{comparisonId}-{ts}.mp4`) | 100MB, video/* MIME |
| `contrast-images` | Public reads, service-role writes | Permanent contrast image copies (`{key}_a.webp`, `{key}_b.webp`) | 5MB, image/* MIME |
| `judge-videos` | Public reads, service-role writes | Persisted Judge avatar videos (`{comparisonId}.mp4`) | 50MB, video/mp4+webm |
| `court-order-videos` | Public reads, service-role writes | Persisted Court Order videos (`{comparisonId}.mp4`) | 50MB, video/mp4+webm |
| `gamma-exports` | Public reads, service-role writes | Persisted Gamma PDF/PPTX exports (`{generationId}.pdf`) | 50MB, application/pdf+pptx |

---

## 3. API Endpoints

All endpoints are Vercel serverless functions in `/api/`. **46 endpoints total.**

### 3.1 Comparison & Scoring (3)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/evaluate` | Yes (JWT) | LLM evaluation scoring cities across 100 metrics with cached Tavily research |
| POST | `/api/judge` | Yes (JWT) | Claude Opus consensus builder computing final scores from evaluator results |
| POST | `/api/judge-report` | Yes (JWT) | Claude Opus comprehensive analysis with holistic freedom analysis and recommendations |

### 3.2 Video Generation (7)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/video/grok-generate` | Yes (JWT) | Generate videos via Kling AI (primary) with Replicate fallback. **IDOR fix 2026-02-26:** userId overridden with auth user ID |
| GET, POST | `/api/video/grok-status` | Yes (JWT) | Check video generation status; POST supports cache checking |
| GET, POST, DELETE | `/api/video/invideo-override` | Yes (JWT) + Admin (POST/DELETE) | Admin-managed InVideo overrides for Court Order videos |
| POST | `/api/avatar/generate-judge-video` | Yes (JWT) | Generate Cristiano judge videos via Replicate Wav2Lip |
| GET | `/api/avatar/video-status` | Yes (JWT) | Check judge video generation status |
| POST | `/api/avatar/video-webhook` | No (webhook) | Replicate webhook callback for video completion |
| POST | `/api/judge-video` | Yes (JWT) | D-ID fallback avatar endpoint for Judge verdict |

### 3.3 Avatar & Streaming (5)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/avatar/simli-session` | Yes (JWT) | Returns Simli WebRTC session credentials (API key no longer leaked in response — S1 fix 2026-02-26) |
| POST | `/api/avatar/simli-speak` | Yes (JWT) | TTS audio in PCM Int16 format for Simli playback |
| POST | `/api/olivia/avatar/streams` | Yes (JWT) | D-ID Streams API for WebRTC avatar |
| POST | `/api/olivia/avatar/heygen` | Yes (JWT) | HeyGen Streaming Avatar API |
| POST, GET | `/api/olivia/avatar/heygen-video` | Yes (JWT) | HeyGen pre-rendered video generation + status polling for Olivia presenter |

### 3.4 Olivia AI Assistant (6)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/olivia/chat` | Yes (JWT) | Main chat via OpenAI Assistants API |
| POST | `/api/olivia/context` | Yes (JWT) | Transform comparison data into Olivia context |
| POST | `/api/olivia/field-evidence` | Yes (JWT) | Source evidence for specific metrics |
| POST | `/api/olivia/gun-comparison` | Yes (JWT) | Standalone unscored gun rights comparison |
| POST | `/api/olivia/tts` | Yes (JWT) | ElevenLabs TTS with OpenAI fallback. voiceId validated with regex (X3 fix 2026-02-26) |
| POST | `/api/olivia/contrast-images` | Yes (JWT) | AI contrast images via Flux (Replicate) |

### 3.5 Emilia Help Assistant (4)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/emilia/thread` | Yes (JWT) | Create new Emilia conversation thread |
| POST | `/api/emilia/message` | Yes (JWT) | Send message to Emilia and get response |
| POST | `/api/emilia/speak` | Yes (JWT) | TTS for Emilia voice (ElevenLabs + OpenAI fallback) |
| GET | `/api/emilia/manuals` | Yes (JWT) + Admin for restricted | Serve documentation content; admin-only for restricted manuals |

### 3.6 Stripe Billing (4)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/stripe/create-checkout-session` | No | Create Stripe Checkout session for Navigator/Sovereign |
| POST | `/api/stripe/create-portal-session` | No | Create Stripe Customer Portal session |
| GET | `/api/stripe/get-subscription` | No | Get current subscription status |
| POST | `/api/stripe/webhook` | No (signature) | Handle Stripe lifecycle events |

### 3.7 Admin (5)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/admin-check` | Yes + Admin | Check if user has admin/developer bypass status |
| GET | `/api/admin/env-check` | Yes + Admin | Show all environment variable configuration status (secrets masked — S4 fix 2026-02-26) |
| POST | `/api/admin/sync-olivia-knowledge` | Yes + Admin | Upload knowledge base to OpenAI Assistant |
| POST | `/api/admin/sync-emilia-knowledge` | Yes + Admin | Upload Emilia knowledge base to OpenAI Assistant (CORS fix C2 2026-02-26) |
| GET, PUT | `/api/prompts` | Yes (JWT) + Admin (PUT) | Admin-editable prompt management (GET was unprotected — AC4 fix 2026-02-26) |

### 3.8 User Data (2)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| DELETE | `/api/user/delete` | Rate-limited | GDPR Article 17 — Right to Erasure |
| POST | `/api/user/export` | Rate-limited | GDPR Article 20 — Right to Data Portability |

### 3.9 Utility & Infrastructure (5)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET, POST | `/api/gamma` | Yes (JWT) | Generate Gamma visual reports and check status. On completion, persists PDF/PPTX exports to Supabase Storage (permanent URLs). Returns `pdfStoragePath`/`pptxStoragePath` in response. |
| POST | `/api/kv-cache` | Yes (JWT) | Server-side proxy for Vercel KV operations |
| GET | `/api/simli-config` | Yes (JWT) | Return Simli credentials (keep API key out of client bundle) |
| GET | `/api/health` | No | API health check |
| POST | `/api/test-llm` | No (rate-limited) | Test each LLM API connection |

### 3.10 Usage, Quota & Consent (3)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET, POST | `/api/usage/check-quotas` | Yes (JWT) | Check all provider quotas and send email alerts |
| GET | `/api/usage/elevenlabs` | Yes (JWT) | Fetch ElevenLabs subscription usage |
| POST | `/api/consent/log` | No (rate-limited) | GDPR consent audit logging |

### 3.11 Notifications (Added 2026-02-16) (2)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/notify` | JWT | Create in-app notification + send email via Resend |
| POST | `/api/admin/new-signup` | JWT | Send admin email notification on new user signup |

---

## 4. Component Architecture

**49 components** in `src/components/`.

### 4.1 Core Layout

| Component | Purpose |
|-----------|---------|
| `Header.tsx` | Navigation, user menu, theme toggle |
| `Footer.tsx` | Legal links, copyright |
| `TabNavigation.tsx` | Horizontal toolbar tabs for section switching |
| `LoginScreen.tsx` | Sign In, Sign Up, Password Reset with Remember Me |
| `ErrorBoundary.tsx` | Catches and handles component errors |

### 4.2 Comparison & Results

| Component | Purpose |
|-----------|---------|
| `CitySelector.tsx` | Searchable dropdown with 200 cities, flags, search highlighting |
| `Results.tsx` | Main comparison results display with scores and winner |
| `EnhancedComparison.tsx` | Multi-LLM consensus UI combining 5 evaluator results |
| `EvidencePanel.tsx` | Collapsible panel with LLM web search citations |
| `ContrastDisplays.tsx` | Side-by-side AI-generated contrast images |
| `AdvancedVisuals.tsx` | Charts and graph visualizations |
| `LoadingState.tsx` | Progress during 100-metric analysis with category tracking |
| `ScoreMethodology.tsx` | Explains complete scoring pipeline (AI → Consensus → Judge → Weighting) |

### 4.3 Customization

| Component | Purpose |
|-----------|---------|
| `WeightPresets.tsx` | Category importance and Law vs Lived Reality weighting |
| `DealbreakersPanel.tsx` | Mark must-have metrics that trigger warnings |
| `DealbreakersWarning.tsx` | Warning modal when city fails dealbreaker metrics |
| `GunComparisonModal.tsx` | Standalone unscored gun rights comparison |

### 4.4 AI Assistants

| Component | Purpose |
|-----------|---------|
| `AskOlivia.tsx` | Premium Olivia AI assistant with avatar and voice |
| `OliviaChatBubble.tsx` | Floating chat interface (expandable/collapsible) |
| `OliviaAvatar.tsx` | Real-time photorealistic Simli AI avatar |
| `EmiliaChat.tsx` | AI help chat using OpenAI Assistants API |
| `HelpBubble.tsx` | Floating Emilia teal help button (bottom-left) |
| `HelpModal.tsx` | 8-tab documentation modal with chat integration |
| `ManualViewer.tsx` | Markdown documentation renderer |
| `PromptsManager.tsx` | Admin-editable prompts with sub-tabs per category |
| `EnvConfigPanel.tsx` | Admin panel showing all env var configuration status |

### 4.5 Judge & Reports

| Component | Purpose |
|-----------|---------|
| `JudgeTab.tsx` | THE JUDGE tab with Claude Opus analysis, video, recommendations — 3 collapsible panels: Media, Evidence, Verdict |
| `GoToMyNewCity.tsx` | HeyGen multi-scene relocation video at bottom of Judge page (storyboard-based, validated per-scene) |
| `JudgeVideo.tsx` | Cristiano judge video player with Replicate progress tracking |
| `CourtOrderVideo.tsx` | Court Order LCD player with InVideo override + user upload |
| `NewLifeVideos.tsx` | Side-by-side winner/loser videos with blob URL CORS bypass |
| `FreedomCategoryTabs.tsx` | 6-tab navigation for Court Order Freedom Education |
| `FreedomHeroFooter.tsx` | AI-generated hero statement per category tab |
| `FreedomMetricsList.tsx` | Winning metrics with scores and real-world examples |
| `VisualsTab.tsx` | Gamma report viewer with saved reports library + Read/Listen to Presenter toggle |
| `ReportPresenter.tsx` | Olivia video presenter: Live PIP avatar overlay + pre-rendered HeyGen video with download |

### 4.6 Subscription & Settings

| Component | Purpose |
|-----------|---------|
| `PricingPage.tsx` | Three-tier pricing with Stripe integration |
| `PricingModal.tsx` | Glassmorphic upgrade overlay |
| `FeatureGate.tsx` | Tier-based feature locking with blur overlay |
| `UsageWarningBanner.tsx` | API quota approaching warnings |
| `CostDashboard.tsx` | Admin cost dashboard with per-provider breakdown |
| `SettingsModal.tsx` | Profile, password, and preference management |

### 4.7 Utility

| Component | Purpose |
|-----------|---------|
| `ThemeToggle.tsx` | Light/dark mode with localStorage persistence |
| `CookieConsent.tsx` | GDPR/CCPA cookie consent banner |
| `LegalModal.tsx` | Privacy Policy, Terms, Cookie Policy display |
| `DataSourcesModal.tsx` | Authoritative data source attribution |
| `AboutClues.tsx` | About Clues section with 6 sub-tabs |
| `SavedComparisons.tsx` | Comparison history list with Connect GitHub |

### 4.8 Notifications (Added 2026-02-16)

| Component | Purpose |
|-----------|---------|
| `NotificationBell.tsx` | Bell icon in header with unread badge + dropdown list |
| `NotifyMeModal.tsx` | "Wait Here" vs "Notify Me & Go" modal for long-running tasks |
| `MobileWarningModal.tsx` | Warning modal for small-screen visitors (Added 2026-02-16) |
| `VideoPhoneWarning.tsx` | Phone call audio warning overlay for all video displays (Added 2026-02-16) |

---

## 5. State Management

### 5.1 React Context

**`AuthContext.tsx`** — Single context providing authentication state and methods.

**State:** supabaseUser, session, profile, preferences, isLoading, isAuthenticated, isConfigured, error

**Methods:** signInWithEmail, signInWithGoogle, signInWithGitHub, signInWithMagicLink, signUp, resetPassword, signOut, updateProfile, updatePreferences, refreshProfile

**Modes:** Supabase Mode (full auth) / Demo Mode (localStorage fallback)

### 5.2 Custom Hooks (18)

| Hook | Purpose |
|------|---------|
| `useTierAccess.ts` | **SOURCE OF TRUTH** for tier limits and feature access |
| `useComparison.ts` | Comparison state and API call orchestration |
| `useOliviaChat.ts` | Olivia conversation with database persistence |
| `useEmilia.ts` | Emilia chat with thread management and TTS |
| `useTTS.ts` | Text-to-speech audio playback |
| `useVoiceRecognition.ts` | Web Speech API voice input |
| `useAvatarProvider.ts` | Unified avatar interface (Simli primary, D-ID backup) |
| `useSimli.ts` | Simli AI WebRTC sessions via simli-client SDK |
| `useDIDStream.ts` | D-ID Streams API WebRTC with rate limiting |
| `useJudgeVideo.ts` | Judge video generation via Replicate with caching |
| `useGrokVideo.ts` | Grok/Kling video generation with polling and progress |
| `useContrastImages.ts` | AI contrast images for Olivia comparisons |
| `useGunComparison.ts` | Standalone gun rights comparison fetching and caching |
| `useApiUsageMonitor.ts` | API usage tracking and quota warnings |
| `useURLParams.ts` | URL state for shareable comparisons |
| `useOGMeta.ts` | Dynamic Open Graph meta tags for social sharing |
| `useDraggable.ts` | Drag-to-reposition for floating UI elements |
| `useFocusTrap.ts` | Focus trap within modals/dialogs |
| `useNotifications.ts` | Polls notifications table every 30s for unread count (Added 2026-02-16) |
| `useJobTracker.ts` | Creates jobs, updates status, triggers notification on completion (Added 2026-02-16) |

---

## 6. Type Definitions

**21 type files** in `src/types/` (split into domain files for maintainability).

| File | Key Types |
|------|-----------|
| `database.ts` | **Barrel** — re-exports all database types from 5 domain files below |
| `database-core.ts` | UserTier, Profile, UserPreferences, UsageTracking |
| `database-features.ts` | SavedComparison, ComparisonMetadata |
| `database-jobs.ts` | Job, Notification, NotifyChannel |
| `database-reports.ts` | GammaReport, JudgeReportRecord |
| `database-costs.ts` | ApiCostRecord, CostSummary |
| `metrics.ts` | CategoryId (6 categories), Category, MetricDefinition, ScoringCriteria |
| `enhancedComparison.ts` | CityScore, CategoryScore, MetricScore, ComparisonResult |
| `judge.ts` | JudgeReport, CategoryAnalysis, ExecutiveSummary |
| `avatar.ts` | AvatarProvider ('simli' \| 'd-id' \| 'heygen' \| 'none'), AvatarConfig, AvatarSession |
| `grokVideo.ts` | GrokVideo, GrokVideoPair, GrokVideoStatus |
| `gamma.ts` | GammaGenerationRequest, GammaGenerationStatus |
| `olivia.ts` | **Barrel** — re-exports all Olivia types from 4 domain files below |
| `olivia-chat.ts` | OliviaMessage, OliviaConversation, OliviaResponse |
| `olivia-state.ts` | OliviaContext, OliviaUIState |
| `olivia-actions.ts` | OliviaAction, OliviaCommand |
| `olivia-avatar.ts` | OliviaAvatarConfig, OliviaAvatarState |
| `freedomEducation.ts` | FreedomEducationData, CategoryTab definitions for Court Order |
| `apiUsage.ts` | ApiUsageRecord, UsageSummary, QuotaStatus |
| `presenter.ts` | PresenterSegment, PresentationScript, PresenterState, ReportViewMode, VideoGenerationState, HeyGenVideoRequest/Response |
| `index.ts` | Re-exports all types from single entry point |

---

## 7. Services Layer

**16 services** in `src/services/`.

| Service | Purpose |
|---------|---------|
| `savedComparisons.ts` | Dual-storage (localStorage + Supabase) for comparisons, reports, judge reports |
| `databaseService.ts` | Unified Supabase operations for conversations, preferences, sync |
| `gammaService.ts` | Client-side Gamma API wrapper for report generation |
| `grokVideoService.ts` | Client-side wrapper for Grok/Kling video generation + polling |
| `oliviaService.ts` | Client-side wrapper for Olivia chat, TTS, context, and HeyGen video generation |
| `presenterService.ts` | Client-side narration script generator from comparison data (no API call) |
| `presenterVideoService.ts` | HeyGen video generation orchestration with 5s polling, 10-min timeout |
| `opusJudge.ts` | Opus Judge client helpers and utility functions |
| `llmEvaluators.ts` | Client-side evaluation via Vercel serverless functions |
| `enhancedComparison.ts` | API key management for enhanced comparison |
| `judgePregenService.ts` | Non-blocking background Judge Report + Video generation |
| `contrastImageService.ts` | Prompt templates for AI contrast images |
| `reportStorageService.ts` | Save report HTML to Supabase Storage + metadata to DB (upload timeout: 180s) |
| `videoStorageService.ts` | Upload user videos to Supabase Storage with RLS (upload timeout: 240s) |
| `rateLimiter.ts` | Rate limit handling with exponential backoff across providers |
| `cache.ts` | Aggressive caching to reduce API costs with TTL management |

### 7.1 Utility Libraries

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client init, retry logic, withTimeout helper (12s timeout, 2 retries = 3 attempts), cold start warm-up ping on app load, LRU cache expansion, retry fix (PromiseLike → Promise.resolve) |
| `src/lib/fetchWithTimeout.ts` | Reusable fetch wrapper with AbortController |
| `src/lib/errorTracking.ts` | Lightweight error capture (extensible to Sentry/LogRocket) |

### 7.2 Utility Functions

| File | Purpose |
|------|---------|
| `src/utils/costCalculator.ts` | **Barrel** — re-exports from 2 domain files below |
| `src/utils/costCalculator-pricing.ts` | Provider-specific pricing constants and rate tables |
| `src/utils/costCalculator-functions.ts` | Cost calculation logic, formatters, aggregation |
| `src/utils/exportUtils.ts` | CSV and PDF export functionality |
| `src/utils/countryFlags.ts` | Country flag images via flagcdn.com CDN |
| `src/utils/freedomEducationUtils.ts` | Data transform for Freedom Education tabs |
| `src/utils/invideoPromptBuilder.ts` | Cinematic prompt generation for InVideo relocation stories |
| `src/utils/toast.tsx` | Toast notification wrapper (react-hot-toast) |

### 7.3 Shared API Utilities

| File | Purpose |
|------|---------|
| `api/shared/auth.ts` | Auth middleware (requireAuth, getAdminEmails) |
| `api/shared/cors.ts` | CORS handling with same-app verification |
| `api/shared/rateLimit.ts` | Server-side rate limiting (standard, light, heavy presets) |
| `api/shared/fetchWithTimeout.ts` | Server-side timeout wrapper |
| `api/shared/metrics.ts` | Metric scoring functions shared between client/server |
| `api/shared/metrics-data.ts` | **Barrel** — re-exports metric definitions from 6 category files below |
| `api/shared/metrics-data-personal-freedom.ts` | Personal Freedom metrics (15 metrics) |
| `api/shared/metrics-data-housing-property.ts` | Housing & Property metrics (20 metrics) |
| `api/shared/metrics-data-business-work.ts` | Business & Work metrics (25 metrics) |
| `api/shared/metrics-data-transportation.ts` | Transportation metrics (15 metrics) |
| `api/shared/metrics-data-policing-legal.ts` | Policing & Legal metrics (15 metrics) |
| `api/shared/metrics-data-speech-lifestyle.ts` | Speech & Lifestyle metrics (10 metrics) |
| `api/shared/notifyJob.ts` | Job completion notification helper |
| `api/shared/persistVideo.ts` | Video persistence to Supabase Storage |
| `api/shared/types.ts` | Shared TypeScript types |

---

## 8. External Integrations

### 8.1 AI/LLM Providers

| Provider | Purpose | Models Used |
|----------|---------|-------------|
| **OpenAI** | Olivia chat, Emilia help, evaluation | GPT-4o, GPT-4o-mini |
| **Anthropic** | THE JUDGE, enhanced evaluation | Claude Opus 4.5, Claude Sonnet 4.5 |
| **Google** | Multi-LLM consensus | Gemini 3 Pro |
| **xAI** | Enhanced evaluation | Grok 4 |
| **Perplexity** | Real-time web search evaluation | Sonar models |
| **Tavily** | Web research for evidence gathering | Tavily Search API |

### 8.2 Video Providers

| Service | Purpose | Models/Features |
|---------|---------|-----------------|
| **Kling AI** | Primary video generation (New Life Videos, Court Orders) | kling-v2-6, 5-10s clips, JWT auth (HS256) |
| **Replicate** | Video fallback + Judge avatar generation | Minimax Video-01, Wav2Lip |
| **Simli AI** | Real-time Olivia avatar | WebRTC streaming, PCM audio |
| **D-ID** | Fallback avatar streaming | WebRTC Streams API |
| **HeyGen** | Avatar streaming + pre-rendered video presenter | Streaming Avatar API, Video Generate v2, Video Status v1 |
| **InVideo** | Admin cinematic movie overrides | Cinema-quality Court Order replacements |

### 8.3 Audio

| Service | Purpose |
|---------|---------|
| **ElevenLabs** | Primary TTS for Olivia, Emilia, Cristiano voices |
| **OpenAI TTS** | Fallback TTS when ElevenLabs unavailable |
| **Web Speech API** | Browser-native voice input |

### 8.4 Document Generation

| Service | Purpose |
|---------|---------|
| **Gamma** | Visual PDF/PPTX reports (35-page standard, 82-page enhanced) |

### 8.5 Payment & Email

| Service | Purpose |
|---------|---------|
| **Stripe** | Subscription billing (Navigator $29/mo, Sovereign $99/mo) |
| **Resend** | Email notifications and quota alerts |

### 8.6 Infrastructure

| Service | Purpose |
|---------|---------|
| **Supabase** | PostgreSQL database, auth, storage buckets, RLS |
| **Vercel** | Hosting, serverless functions (Node.js 20), KV cache, edge network |
| **Vercel KV** | Server-side key-value cache for Tavily research results |

---

## 9. Tier System

### 9.1 Tier Definitions

**SOURCE OF TRUTH:** `src/hooks/useTierAccess.ts`

| Feature | FREE ($0) | NAVIGATOR ($29/mo) | SOVEREIGN ($99/mo) |
|---------|-----------|---------------------|---------------------|
| LLMs used | 1 (Claude Sonnet) | 1 (Claude Sonnet) | 5 (Claude, GPT-4o, Gemini, Grok, Perplexity) |
| Standard comparisons/mo | 1 | 1 | 1 |
| Enhanced comparisons/mo | 0 | 0 | 1 |
| Olivia AI minutes/mo | 0 | 15 | 60 |
| Judge videos/mo | 0 | 1 | 1 |
| Gamma reports/mo | 0 | 1 | 1 |
| Grok/Kling videos/mo | 0 | 0 | 1 |
| Cloud sync | No | Yes | Yes |
| API access | No | No | Yes |

**DB Mapping:** free → 'free', NAVIGATOR → 'pro', SOVEREIGN → 'enterprise'

### 9.2 Developer Bypass

Emails in `DEV_BYPASS_EMAILS` env var + hardcoded `cluesnomads@gmail.com` and `brokerpinellas@gmail.com` get enterprise-level access regardless of subscription.

---

## 10. Environment Variables

### 10.1 Client-Side (VITE_*)

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `VITE_DEMO_ENABLED` | Enable demo mode |
| `VITE_APP_URL` | Application base URL |
| `VITE_ERROR_REPORTING_URL` | Error reporting endpoint |
| `VITE_AVATAR_PROVIDER` | Avatar provider (simli, did, heygen) |

### 10.2 Server-Side — Database & Auth

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Server-side Supabase URL |
| `SUPABASE_SERVICE_KEY` | Service role key (never exposed to client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Alias for SUPABASE_SERVICE_KEY |
| `SUPABASE_ANON_KEY` | Anon key for server-side fallback |

### 10.3 Server-Side — LLM Providers

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | GPT-4o evaluator, Olivia, Emilia |
| `OPENAI_ASSISTANT_ID` | Olivia assistant ID |
| `EMILIA_ASSISTANT_ID` | Emilia help assistant ID |
| `ANTHROPIC_API_KEY` | Claude Opus/Sonnet |
| `GEMINI_API_KEY` | Google Gemini |
| `XAI_API_KEY` | xAI Grok (alias: GROK_API_KEY) |
| `PERPLEXITY_API_KEY` | Perplexity web search |
| `TAVILY_API_KEY` | Tavily research API |

### 10.4 Server-Side — Video & Avatar

| Variable | Purpose |
|----------|---------|
| `KLING_VIDEO_API_KEY` | Kling AI video generation |
| `KLING_VIDEO_SECRET` | Kling AI secret for JWT signing |
| `REPLICATE_API_TOKEN` | Replicate (video fallback + Wav2Lip) |
| `SIMLI_API_KEY` | Simli AI avatar |
| `SIMLI_FACE_ID` | Simli face/avatar ID |
| `DID_API_KEY` | D-ID fallback avatar |
| `DID_PRESENTER_URL` | Olivia avatar image |
| `DID_JUDGE_PRESENTER_URL` | Cristiano avatar image |
| `HEYGEN_API_KEY` | HeyGen API — Gamma report video presenter only |
| `HEYGEN_OLIVIA_AVATAR_ID` | HeyGen Olivia avatar — Gamma video ONLY (not chat TTS) |
| `HEYGEN_OLIVIA_VOICE_ID` | HeyGen Olivia voice — Gamma video ONLY (not ElevenLabs/OpenAI) |
| `HEYGEN_CRISTIANO_AVATAR_ID` | HeyGen Judge Cristiano avatar — `7a0ee88ad6814ed9af896f9164407c41` |
| `HEYGEN_CRISTIANO_VOICE_ID` | HeyGen Judge Cristiano voice — video presenter |
| `CRISTIANO_IMAGE_URL` | Judge avatar source image |
| `REPLICATE_API_TOKEN` | Replicate (video fallback + Wav2Lip) |
| `WEBHOOK_BASE_URL` | Video generation webhook URL |

### 10.5 Server-Side — TTS

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | ElevenLabs TTS |
| `ELEVENLABS_VOICE_ID` | Default voice |
| `ELEVENLABS_OLIVIA_VOICE_ID` | Olivia voice |
| `ELEVENLABS_CRISTIANO_VOICE_ID` | Judge Cristiano voice |
| `ELEVENLABS_EMILIA_VOICE_ID` | Emilia help voice |

### 10.6 Server-Side — Gamma, Stripe, Email

| Variable | Purpose |
|----------|---------|
| `GAMMA_API_KEY` | Gamma visual reports |
| `GAMMA_TEMPLATE_ID` | Template ID (optional) |
| `GAMMA_THEME_ID` | Theme ID (optional) |
| `GAMMA_FOLDER_ID` | Folder ID (optional) |
| `STRIPE_SECRET_KEY` | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing |
| `STRIPE_PRICE_NAVIGATOR_MONTHLY` | Navigator monthly price ID |
| `STRIPE_PRICE_NAVIGATOR_ANNUAL` | Navigator annual price ID |
| `STRIPE_PRICE_SOVEREIGN_MONTHLY` | Sovereign monthly price ID |
| `STRIPE_PRICE_SOVEREIGN_ANNUAL` | Sovereign annual price ID |
| `RESEND_API_KEY` | Email service |
| `RESEND_FROM_EMAIL` | Sender email (default: cluesnomads@gmail.com) |

### 10.7 Server-Side — Infrastructure & Admin

| Variable | Purpose |
|----------|---------|
| `KV_REST_API_URL` | Vercel KV cache URL |
| `KV_REST_API_TOKEN` | Vercel KV cache token |
| `DEV_BYPASS_EMAILS` | Comma-separated admin/dev bypass emails |
| `VERCEL_URL` | Auto-set by Vercel |
| `VERCEL_ENV` | Auto-set: production, preview, development |
| `NEXT_PUBLIC_BASE_URL` | Production URL override |
| `USE_CATEGORY_SCORING` | Feature flag for category scoring |

---

## 11. File Structure

```
lifescore/
├── api/                              # Vercel serverless functions (44 endpoints)
│   ├── evaluate.ts                   # Main comparison endpoint
│   ├── judge.ts                      # Opus consensus builder
│   ├── judge-report.ts               # Comprehensive Judge analysis
│   ├── judge-video.ts                # D-ID fallback Judge avatar
│   ├── gamma.ts                      # Gamma visual report generation
│   ├── health.ts                     # API health check
│   ├── test-llm.ts                   # LLM connection testing
│   ├── admin-check.ts                # Admin status check
│   ├── simli-config.ts               # Simli credentials proxy
│   ├── kv-cache.ts                   # Vercel KV proxy
│   ├── prompts.ts                    # Admin prompt management
│   │
│   ├── avatar/                       # Avatar video endpoints
│   │   ├── generate-judge-video.ts   # Replicate Wav2Lip generation
│   │   ├── video-status.ts           # Generation status check
│   │   ├── video-webhook.ts          # Replicate webhook
│   │   ├── simli-session.ts          # Simli WebRTC credentials
│   │   └── simli-speak.ts            # Simli TTS audio
│   │
│   ├── video/                        # Grok/Kling video endpoints
│   │   ├── grok-generate.ts          # Kling AI + Replicate fallback
│   │   ├── grok-status.ts            # Status + cache check
│   │   └── invideo-override.ts       # Admin InVideo overrides
│   │
│   ├── olivia/                       # Olivia AI assistant
│   │   ├── chat.ts                   # Main chat (OpenAI Assistants)
│   │   ├── context.ts                # Context builder
│   │   ├── field-evidence.ts         # Evidence lookup
│   │   ├── gun-comparison.ts         # Unscored gun comparison
│   │   ├── tts.ts                    # ElevenLabs + OpenAI TTS
│   │   ├── contrast-images.ts        # Flux AI contrast images
│   │   └── avatar/                   # Avatar streaming
│   │       ├── streams.ts            # D-ID WebRTC
│   │       ├── heygen.ts             # HeyGen streaming
│   │       ├── heygen-video.ts       # HeyGen pre-rendered video generation
│   │       └── did.ts                # D-ID Agents (deprecated)
│   │
│   ├── emilia/                       # Emilia help assistant
│   │   ├── thread.ts                 # Thread creation
│   │   ├── message.ts                # Message handling
│   │   ├── speak.ts                  # Emilia TTS
│   │   └── manuals.ts                # Documentation serving + embedded fallback
│   │
│   ├── stripe/                       # Payment processing
│   │   ├── create-checkout-session.ts
│   │   ├── create-portal-session.ts
│   │   ├── get-subscription.ts
│   │   └── webhook.ts
│   │
│   ├── admin/                        # Admin endpoints
│   │   ├── env-check.ts              # Env var status
│   │   └── sync-olivia-knowledge.ts  # Knowledge base upload
│   │
│   ├── usage/                        # Usage monitoring
│   │   ├── check-quotas.ts           # Provider quota checking
│   │   └── elevenlabs.ts             # ElevenLabs usage
│   │
│   ├── user/                         # GDPR user data
│   │   ├── delete.ts                 # Right to Erasure
│   │   └── export.ts                 # Data Portability
│   │
│   ├── consent/                      # GDPR consent
│   │   └── log.ts                    # Consent audit logging
│   │
│   └── shared/                       # Shared API utilities
│       ├── auth.ts                   # Auth middleware (requireAuth, getAdminEmails)
│       ├── cors.ts                   # CORS handling
│       ├── rateLimit.ts              # Rate limiting
│       ├── fetchWithTimeout.ts       # Timeout wrapper
│       ├── metrics.ts                # Metric scoring functions
│       ├── metrics-data.ts           # Barrel — re-exports from 6 category files:
│       │   ├── metrics-data-personal-freedom.ts
│       │   ├── metrics-data-housing-property.ts
│       │   ├── metrics-data-business-work.ts
│       │   ├── metrics-data-transportation.ts
│       │   ├── metrics-data-policing-legal.ts
│       │   └── metrics-data-speech-lifestyle.ts
│       ├── notifyJob.ts              # Job completion notifications
│       ├── persistVideo.ts           # Video persistence
│       └── types.ts                  # Shared types
│
├── src/                              # Frontend source
│   ├── App.tsx                       # Main app, routing, providers
│   ├── App.css                       # App-level styles
│   ├── main.tsx                      # Entry point
│   ├── index.css                     # Global styles
│   │
│   ├── styles/                       # Global stylesheets (split)
│   │   ├── globals.css               # Barrel — imports from:
│   │   │   ├── globals-base.css      #   Base reset + typography
│   │   │   ├── globals-components.css #   Shared component styles
│   │   │   └── globals-utilities.css  #   Utility classes
│   │   └── dark-mode.css             # Dark mode overrides
│   │
│   ├── components/                   # React components (46)
│   │   ├── EnhancedComparison.tsx    # Main comparison view
│   │   ├── EnhancedComparison.css    # Barrel — imports from:
│   │   │   ├── EnhancedComparison-actions.css
│   │   │   ├── EnhancedComparison-consensus.css
│   │   │   ├── EnhancedComparison-controls.css
│   │   │   ├── EnhancedComparison-metrics.css
│   │   │   ├── EnhancedComparison-responsive.css
│   │   │   └── EnhancedComparison-results.css
│   │   ├── JudgeTab.css              # Barrel — imports from:
│   │   │   ├── JudgeTab-analysis.css
│   │   │   ├── JudgeTab-footer.css
│   │   │   ├── JudgeTab-layout.css
│   │   │   ├── JudgeTab-panels.css
│   │   │   └── JudgeTab-video.css
│   │   ├── AskOlivia.css             # Barrel — imports from:
│   │   │   ├── AskOlivia-controls.css
│   │   │   ├── AskOlivia-header.css
│   │   │   ├── AskOlivia-panels.css
│   │   │   └── AskOlivia-responsive.css
│   │   ├── VisualsTab.css            # Barrel — imports from:
│   │   │   ├── VisualsTab-content.css
│   │   │   ├── VisualsTab-reports.css
│   │   │   ├── VisualsTab-saved.css
│   │   │   └── VisualsTab-selectors.css
│   │   ├── SavedComparisons.css      # Barrel — imports from:
│   │   │   ├── SavedComparisons-list.css
│   │   │   ├── SavedComparisons-modals.css
│   │   │   └── SavedComparisons-viewer.css
│   │   ├── Results.css               # Barrel — imports from:
│   │   │   ├── Results-categories.css
│   │   │   ├── Results-header.css
│   │   │   └── Results-responsive.css
│   │   ├── WeightPresets.css          # Barrel — imports from:
│   │   │   ├── WeightPresets-base.css
│   │   │   ├── WeightPresets-exclusion.css
│   │   │   └── WeightPresets-law.css
│   │   ├── AboutClues.css             # Barrel — imports from:
│   │   │   ├── AboutClues-content.css
│   │   │   ├── AboutClues-features.css
│   │   │   └── AboutClues-layout.css
│   │   ├── ScoreMethodology.css       # Barrel — imports from:
│   │   │   ├── ScoreMethodology-dark.css
│   │   │   ├── ScoreMethodology-responsive.css
│   │   │   └── ScoreMethodology-stages.css
│   │   ├── SettingsModal.css          # Barrel — imports from:
│   │   │   ├── SettingsModal-forms.css
│   │   │   ├── SettingsModal-layout.css
│   │   │   └── SettingsModal-responsive.css
│   │   ├── OliviaChatBubble.css       # Barrel — imports from:
│   │   │   ├── OliviaChatBubble-fab.css
│   │   │   ├── OliviaChatBubble-panel.css
│   │   │   └── OliviaChatBubble-responsive.css
│   │   ├── LoginScreen.css            # Barrel — imports from:
│   │   │   ├── LoginScreen-auth.css
│   │   │   ├── LoginScreen-controls.css
│   │   │   └── LoginScreen-layout.css
│   │   ├── ReportPresenter.css        # Barrel — imports from:
│   │   │   ├── ReportPresenter-controls.css
│   │   │   ├── ReportPresenter-overlay.css
│   │   │   └── ReportPresenter-video.css
│   │   └── CostDashboard.css          # Barrel — imports from:
│   │       ├── CostDashboard-layout.css
│   │       ├── CostDashboard-tables.css
│   │       └── CostDashboard-theme.css
│   │
│   ├── contexts/                     # React contexts (1)
│   │   └── AuthContext.tsx
│   ├── hooks/                        # Custom hooks (18)
│   ├── services/                     # Business logic (16)
│   ├── lib/                          # Utility libraries (3)
│   │
│   ├── utils/                        # Utility functions
│   │   ├── costCalculator.ts         # Barrel — re-exports from:
│   │   │   ├── costCalculator-pricing.ts   # Provider pricing constants
│   │   │   └── costCalculator-functions.ts # Calculation logic
│   │   ├── exportUtils.ts
│   │   ├── countryFlags.ts
│   │   ├── freedomEducationUtils.ts
│   │   ├── invideoPromptBuilder.ts
│   │   └── toast.tsx
│   │
│   ├── types/                        # TypeScript types (21 files)
│   │   ├── index.ts                  # Master barrel
│   │   ├── database.ts               # Barrel — re-exports from:
│   │   │   ├── database-core.ts      #   UserTier, Profile, UserPreferences
│   │   │   ├── database-features.ts  #   SavedComparison, metadata
│   │   │   ├── database-jobs.ts      #   Job, Notification, NotifyChannel
│   │   │   ├── database-reports.ts   #   GammaReport, JudgeReportRecord
│   │   │   └── database-costs.ts     #   ApiCostRecord, CostSummary
│   │   ├── olivia.ts                 # Barrel — re-exports from:
│   │   │   ├── olivia-chat.ts        #   OliviaMessage, Conversation, Response
│   │   │   ├── olivia-state.ts       #   OliviaContext, UIState
│   │   │   ├── olivia-actions.ts     #   OliviaAction, Command
│   │   │   └── olivia-avatar.ts      #   OliviaAvatarConfig, State
│   │   ├── metrics.ts
│   │   ├── enhancedComparison.ts
│   │   ├── judge.ts
│   │   ├── avatar.ts
│   │   ├── grokVideo.ts
│   │   ├── gamma.ts
│   │   ├── freedomEducation.ts
│   │   ├── apiUsage.ts
│   │   └── presenter.ts
│   │
│   └── data/                         # Static data (split into category files)
│       ├── metrics.ts                # Barrel — re-exports from:
│       │   ├── metrics-personal-freedom.ts
│       │   ├── metrics-housing-property.ts
│       │   ├── metrics-business-work.ts
│       │   ├── metrics-transportation.ts
│       │   ├── metrics-policing-legal.ts
│       │   └── metrics-speech-lifestyle.ts
│       ├── fieldKnowledge.ts         # Barrel — re-exports from:
│       │   ├── fieldKnowledge-personal-freedom.ts
│       │   ├── fieldKnowledge-housing-property.ts
│       │   ├── fieldKnowledge-business-work.ts
│       │   ├── fieldKnowledge-transportation.ts
│       │   ├── fieldKnowledge-policing-legal.ts
│       │   └── fieldKnowledge-speech-lifestyle.ts
│       ├── metricTooltips.ts
│       └── metros.ts
│
├── supabase/                         # Database migrations (32 files)
│   └── migrations/
│
├── docs/                             # Documentation
│   ├── manuals/                      # Emilia help manuals (7 files)
│   └── legal/                        # Legal compliance + DPAs
│
├── scripts/                          # Build/utility scripts
├── public/                           # Static assets (icons, PWA manifest)
│
├── package.json
├── vite.config.ts                    # Vite + chunk splitting config
├── tsconfig.json
├── vercel.json                       # Vercel deployment + function configs
└── CLAUDE.md                         # Claude Code instructions
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

## Appendix B: API Rate Limit Presets

| Preset | Requests/Min | Burst | Used By |
|--------|-------------:|------:|---------|
| standard | 60 | 10 | General endpoints |
| light | 30 | 5 | Olivia chat, Gamma, avatar |
| heavy | 5 | 2 | Judge reports, evaluate |
| unlimited | No limit | N/A | Internal, webhook |

---

## Appendix C: Database Functions

| Function | Purpose |
|----------|---------|
| `update_updated_at_column()` | Auto-update timestamp trigger (shared) |
| `handle_new_user()` | Create profile + preferences on signup |
| `update_conversation_message_count()` | Auto-update message count on new message |
| `cleanup_expired_videos()` | Delete expired avatar videos |
| `cleanup_expired_contrast_images()` | Delete expired contrast cache + storage |
| `get_or_create_usage_period(UUID)` | Get/create usage record for current month |
| `increment_usage(UUID, TEXT, INT)` | Atomically increment usage counter |
| `get_quota_status()` | All providers with usage % and status color |
| `update_provider_usage(TEXT, DECIMAL)` | Increment provider usage, auto-reset monthly |
| `reset_monthly_usage()` | Reset all provider usage for new month |
| `find_invideo_override(TEXT, TEXT)` | Find override: comparison > city > null |
| `find_cached_grok_video(TEXT, TEXT)` | Find reusable video by city+type |
| `get_user_grok_video_count(UUID)` | Monthly video generation count |
| `increment_share_view_count(UUID)` | Atomic share view count increment |
| `update_prompt_updated_at()` | Auto-increment version on prompt update |

---

## Document Info

- **Generated by:** Claude Opus 4.6
- **For:** LIFE SCORE Ask Emilia Help System
- **Last Updated:** 2026-02-27
- **Verified Against:** ~280 commits
- **Total Codebase:** 44 API endpoints, 47 components, 18 hooks, 16 services, 21 type files, 21 DB tables, 61 env vars
- **2026-02-27 Update:** Updated file structure to reflect 22-file refactoring (31,494 lines split into 78 domain files with barrel re-exports). Updated type definitions (12→21 files), utility functions, shared API utilities, and full file tree.
- **2026-02-17 Update:** Gamma export URL expiration fix — new `pdf_storage_path`/`pptx_storage_path` columns on `gamma_reports` and `reports` tables, `/api/gamma` endpoint now persists exports to Supabase Storage on completion
