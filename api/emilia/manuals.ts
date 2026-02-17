/**
 * LIFE SCORE - Emilia Manuals API
 * Serves documentation content for the help center
 *
 * GET /api/emilia/manuals?type=user|csm|tech|legal
 *
 * Access Control:
 * - user: Public (all authenticated users)
 * - csm, tech, legal: Admin only (authorized_manual_access table)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// CONSTANTS
// ============================================================================

// Manual file mappings
const MANUAL_FILES: Record<string, string> = {
  user: 'USER_MANUAL.md',
  csm: 'CUSTOMER_SERVICE_MANUAL.md',
  tech: 'TECHNICAL_SUPPORT_MANUAL.md',
  legal: 'LEGAL_COMPLIANCE_MANUAL.md',
  schema: 'APP_SCHEMA_MANUAL.md',
  equations: 'JUDGE_EQUATIONS_MANUAL.md',
  prompts: 'GAMMA_PROMPTS_MANUAL.md',
};

// Manual titles
const MANUAL_TITLES: Record<string, string> = {
  user: 'User Manual',
  csm: 'Customer Service Manual',
  tech: 'Technical Support Manual',
  legal: 'Legal Compliance',
  schema: 'App Schema & Database',
  equations: 'Judge Mathematical Equations',
  prompts: 'GAMMA Prompt Templates',
};

// Manuals that require admin authorization
const RESTRICTED_MANUALS = ['csm', 'tech', 'legal', 'schema', 'equations', 'prompts'];

// Hardcoded admin emails (fallback if table doesn't exist yet)
const ADMIN_EMAILS = ['cluesnomads@gmail.com', 'brokerpinellas@gmail.com', 'jdes7@aol.com'];

// ============================================================================
// EMBEDDED CONTENT (Fallback)
// ============================================================================

// Embedded manual content for when files aren't accessible in serverless
const EMBEDDED_MANUALS: Record<string, string> = {
  user: `# LifeScore User Manual

**Version:** 3.6 | **Updated:** 2026-02-17

## Getting Started

### What is LifeScore?
LifeScore (Legal Independence & Freedom Evaluation) is a comprehensive tool that compares cities across 100 freedom metrics to help you make informed decisions about relocation.

### Forgot Password / Password Reset

If you've forgotten your password:

1. **Request a Reset Link** — On the Sign In screen, click "Forgot your password?", enter your email, and click "Send Reset Link"
2. **Check Your Email** — Look for an email from noreply@mail.app.supabase.io (check spam/junk). The link expires in 1 hour.
3. **Set New Password** — Click the link, enter your new password (min 6 characters), confirm it, and click "Update Password"
4. **Done** — You'll be automatically signed in. All your saved data (comparisons, reports, etc.) remains untouched.

**Security note:** For privacy, a success message is shown even if the email doesn't exist in our system.

### How to Run a Comparison

1. **Select Your Cities**
   - Choose your first city from the left dropdown (with flag emojis and orange country badges)
   - Choose your second city from the right dropdown
   - Search highlighting helps you find cities as you type

2. **Choose Comparison Mode**
   - **Standard Mode**: Uses Claude Sonnet for fast, accurate analysis
   - **Enhanced Mode**: Uses 5 AI providers (Claude Sonnet 4.5, GPT-4o, Gemini 3 Pro, Grok 4, Perplexity Sonar) with consensus scoring

3. **Run the Comparison**
   - Click "Compare Cities"
   - Standard mode takes 2-3 minutes
   - Enhanced mode takes 5-8 minutes

### Understanding Results

#### Scores
- Each metric is scored 0-100
- Higher scores = more freedom/favorable conditions
- Scores are based on laws, regulations, and real-world enforcement
- Click "How is this scored?" for the 5-stage scoring pipeline explainer

#### Categories
- **Personal Autonomy** (15 metrics): Vice laws, substance policies
- **Housing & Property** (20 metrics): HOA restrictions, taxes, zoning
- **Business & Work** (25 metrics): Licensing, employment laws
- **Transportation** (15 metrics): Car dependency, public transit
- **Policing & Legal** (15 metrics): Enforcement, incarceration
- **Speech & Lifestyle** (10 metrics): Expression, privacy

### Features

#### Olivia AI Assistant
- Chat with Olivia for insights about your comparison
- Available on all pages (bottom-right bubble)
- Voice responses available (ElevenLabs cloned voice with OpenAI TTS fallback)
- **Ask Olivia Help** (chat bubble): OpenAI Assistants API brain, ElevenLabs cloned voice → OpenAI "nova" fallback
- **Ask Olivia page** (video + chat): Same voice wiring as Help chat

#### Visual Reports
- Generate PDF/PPTX reports via Gamma
- **Permanent Downloads (2026-02-17):** PDF/PPTX exports are now permanently stored in Supabase Storage. Old reports with expired CDN links need regeneration.
- **Expired Report Detection (2026-02-17):** If a Gamma embed fails to load, the app shows a clear message instead of a broken page.
- AI-generated "New Life" videos (Freedom vs Imprisonment)
- Judge verdict video with Court Order option
- **Olivia Video Presenter** (HeyGen): Toggle "Listen to Presenter" to have Olivia narrate your Gamma report
  - Live Presenter: Real-time HeyGen streaming avatar overlay (instant)
  - Generate Video: Pre-rendered HeyGen MP4 download (up to 10 min)
  - Uses HEYGEN_OLIVIA_AVATAR_ID + HEYGEN_OLIVIA_VOICE_ID (separate from ElevenLabs/OpenAI)
- All saved to both browser and cloud

#### Saved Comparisons
- Comparisons auto-save to both localStorage and Supabase (dual-storage)
- Access from the "Saved" tab
- Export as PDF or share
- Syncs across devices when logged in

### Comparison Settings (Updated 2026-02-16)
- **Law vs Lived slider** illuminates with a highlighted border when changed from default
- **Worst-Case Mode toggle** glows when active (uses MIN of law/lived scores)
- **Dealbreakers panel** metrics are now alphabetized A-Z within each category
- Page auto-scrolls to top when results appear

### Results Features (Updated 2026-02-16)
- **Explain the Winner toggle** — AI narrative explaining why the winner scored higher (Standard Mode)
- **Confidence interval hover cards** on Judge score cards — shows provider agreement level

### Judge Tab (Updated 2026-02-16)
- **Glassmorphic display screen buttons** at the bottom for Court Order and Freedom Tour access
- **Phone call audio warning** on all video displays (Judge, Court Order, Freedom Tour, Olivia, Grok)
- Fixed stale state when switching between comparisons

### Notifications (Added 2026-02-16)
- Bell icon in header with unread badge
- "Notify Me & Go" modal for long-running tasks (comparisons, Judge, video, Gamma)
- Email notification from alerts@lifescore.app (opt-in)
- 30-second polling for new notifications

### Mobile Warning (Added 2026-02-16)
- Warning modal appears on small screens explaining app is optimized for desktop/tablet
- User can continue on mobile; warning appears once per session

## Troubleshooting

### Comparison Taking Too Long
- Enhanced mode uses multiple AI providers and may take up to 10 minutes
- The system automatically retries failed provider calls up to 3 times
- If stuck beyond 10 minutes, refresh and try again
- Try Standard mode for faster results

### Video Not Playing
- Videos use secure blob URLs for reliable cross-origin playback
- Expired video URLs are auto-detected after 3 failed loads
- Click "SEE YOUR NEW LIFE!" to regenerate fresh videos
- Download button works independently of playback
- Each video plays independently (one failing won't block the other)

### Voice Not Working
- Ensure browser permissions allow audio
- Check volume settings
- Try a different browser

## Account Management

### Subscription Tiers
- **FREE**: 1 comparison/month (1 LLM)
- **NAVIGATOR ($29/mo or $249/yr)**: 1 comparison/month, 15min Olivia, 1 Judge, 1 Gamma
- **SOVEREIGN ($99/mo or $899/yr)**: 1 comparison/month (5 LLMs), 60min Olivia, Enhanced Mode, Grok Videos

### Upgrading
- Click "Upgrade" in the header
- Select your desired tier
- Payment processed via Stripe

## Contact Support
- Email: cluesnomads@gmail.com
- Response time: 24-48 hours
`,

  csm: `# Customer Service Manual

**Version:** 3.5 | **Updated:** 2026-02-17

## Support Overview

### Contact Methods
- **Email**: cluesnomads@gmail.com
- **Response Time**: 24-48 hours (business days)

### Tier Limits

| Feature | FREE | NAVIGATOR ($29/mo, $249/yr) | SOVEREIGN ($99/mo, $899/yr) |
|---------|------|-------|-----------|
| Standard Comparisons | 1/month | 1/month | 1/month |
| Enhanced Mode (5 LLMs) | No | No | 1/month |
| Olivia AI Minutes | 0 | 15 min | 60 min |
| Judge Verdict Videos | No | 1/month | 1/month |
| Gamma Reports | No | 1/month | 1/month |
| Grok/Kling Mood Videos | No | No | 1/month |
| Cloud Sync | No | Yes | Yes |

## Common Issues

### "I can't run more comparisons"
- Check current tier in Account Settings
- Usage resets on billing date
- Upgrade to NAVIGATOR or SOVEREIGN for more

### "My comparison is stuck"
- Enhanced mode can take up to 10 minutes
- System auto-retries failed provider calls 3 times with exponential backoff
- Refresh page and check Saved tab (may have completed)
- Try Standard mode for faster results

### "Videos won't play"
- Videos use secure blob URLs for reliable playback
- Expired URLs auto-detected after 3 failed loads
- Click "SEE YOUR NEW LIFE!" to regenerate
- Download button works independently
- Each video plays independently (one failing won't block other)

### "I was charged incorrectly"
- Verify transaction in Stripe dashboard
- Check subscription start date
- Issue refund if billing error confirmed

### "Results seem wrong"
- All results are AI-generated with sources
- Scores reflect legal frameworks, not opinions
- User can adjust Law vs Lived Reality slider

### "Olivia Presenter not working"
- Ensure a Gamma report is loaded first
- Live Presenter needs stable internet (real-time HeyGen streaming)
- Video generation takes up to 10 minutes; click Retry on failure
- Check ad blockers aren't blocking HeyGen API
- **Note**: The presenter uses HeyGen (HEYGEN_OLIVIA_AVATAR_ID / HEYGEN_OLIVIA_VOICE_ID) — this is separate from Olivia's chat voice (ElevenLabs/OpenAI). A presenter issue does NOT mean chat voice is broken.

### "Olivia Voice not working" (Chat / Ask Olivia)
- This uses ElevenLabs cloned voice → OpenAI "nova" fallback (NOT HeyGen)
- Check ELEVENLABS_API_KEY and ELEVENLABS_OLIVIA_VOICE_ID in Vercel env
- If ElevenLabs quota exceeded, OpenAI TTS auto-kicks in
- HeyGen env vars are irrelevant to the chat voice

### "I can't reset my password" / "Reset email not arriving"
- Confirm the user is entering the correct email address
- Ask them to check spam/junk folder for email from noreply@mail.app.supabase.io
- The reset link expires after 1 hour — they can request a new one
- For security, the app shows a success message even if the email doesn't exist (prevents enumeration)
- If the link opens but the "Set New Password" screen doesn't appear, ask them to clear browser cache and try again
- The password reset flow: LoginScreen → supabase.auth.resetPasswordForEmail() → email link → /auth/callback → PASSWORD_RECOVERY event → ResetPasswordScreen → supabase.auth.updateUser()
- Password reset does NOT affect any saved data (comparisons, reports, subscriptions, etc.)

## Refund Policy

### Eligible Refunds
- Charged in error
- Unable to access service due to our fault
- First 7 days of subscription (one-time)

### Non-Refundable
- Used comparisons
- Partial month after cancellation
- Disagreement with AI results

### "Notifications not working" (Added 2026-02-16)
- Notifications only trigger when user selects "Notify Me & Go" in the modal
- Bell icon polls every 30 seconds; try refreshing the page
- Email notifications sent from alerts@lifescore.app — check spam folder

### "Judge tab shows old data after switching comparisons" (Fixed 2026-02-16)
- Judge state now resets when switching between comparisons

### "Gamma report links not clickable" (Fixed 2026-02-16)
- CSS pointer-events and z-index fixed on report URLs

### "VS text invisible in dark mode" (Fixed 2026-02-16)
- VS separator now visible in dark mode across all comparison views

### "Explain the Winner toggle" (Added 2026-02-16)
- New toggle in standard Results view showing AI narrative explaining the winner
- Direct users to this if they ask "Why did City X win?"

### "Gamma PDF/PPTX download link broken" (Fixed 2026-02-17)
- Export URLs from Gamma's CDN expire after hours/days
- New reports (after 2026-02-17) have permanent Supabase Storage URLs that never expire
- Old reports with expired links need regeneration — comparison data is still saved
- Iframe embeds that fail to load now show a clear fallback message

## Escalation Path

1. **Tier 1**: Email support (most issues)
2. **Tier 2**: Technical team (bugs, errors)
3. **Tier 3**: Management (refunds > $50, legal)
`,

  tech: `# Technical Support Manual

**Version:** 4.8 | **Updated:** 2026-02-17

## System Architecture

### Frontend
- **Framework**: React 19.2 + TypeScript + Vite
- **Hosting**: Vercel Edge Network
- **Styling**: CSS with custom design system

### Backend
- **Platform**: Vercel Serverless Functions (Node.js 20)
- **Database**: Supabase (PostgreSQL) - 23 tables, 6 storage buckets
- **Auth**: Supabase Auth with JWT verification

## Authentication & Password Recovery Architecture

### Auth Flow Overview
- **Provider**: Supabase Auth (GoTrue) — manages auth.users table with bcrypt passwords
- **State Management**: AuthContext.tsx — single React context with onAuthStateChange listener
- **Sign-In Methods**: Email/Password, Google OAuth, GitHub OAuth, Magic Link

### Password Reset Technical Flow
1. LoginScreen.tsx calls AuthContext.resetPassword(email)
2. AuthContext calls supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/auth/callback' })
3. Supabase stores recovery_token (1hr TTL) in auth.users and sends email
4. User clicks link → browser navigates to /auth/callback#access_token=...&type=recovery
5. Supabase JS parses URL hash → fires onAuthStateChange with event='PASSWORD_RECOVERY'
6. AuthContext sets isPasswordRecovery=true, isAuthenticated=true (temp session)
7. App.tsx route gate renders ResetPasswordScreen when isPasswordRecovery is true
8. User submits new password → AuthContext.updatePassword(pw) → supabase.auth.updateUser({ password })
9. Supabase updates encrypted_password, nullifies recovery_token
10. clearPasswordRecovery() resets flag + cleans URL hash → main app loads

### Key Files
| File | Responsibility |
|------|---------------|
| src/contexts/AuthContext.tsx:496-553 | resetPassword(), updatePassword(), clearPasswordRecovery() |
| src/components/LoginScreen.tsx:163-180 | handleForgotPassword() form + success message |
| src/components/ResetPasswordScreen.tsx | New password form with validation (6 char min, match check) |
| src/App.tsx:621-622 | isPasswordRecovery route gate |

### Database Impact
Password reset ONLY modifies auth.users.encrypted_password and auth.users.recovery_token. Zero impact on profiles, comparisons, subscriptions, or any other application table.

### AI Providers
- **Claude Sonnet 4.5**: Primary evaluator
- **GPT-4o**: Enhanced mode evaluator
- **Gemini 3 Pro**: Enhanced mode evaluator
- **Grok 4**: Enhanced mode evaluator
- **Perplexity Sonar**: Enhanced mode evaluator
- **Claude Opus 4.5**: Judge (consensus)
- **Tavily**: Web research (45s timeout)

### External Services
- **Stripe**: Payments
- **ElevenLabs**: Text-to-speech (with OpenAI TTS fallback)
- **Gamma**: Report generation
- **Kling AI**: Primary video generation (JWT HS256 auth)
- **Replicate**: Fallback video generation (Minimax)
- **Simli**: Avatar video (PRIMARY - WebRTC)
- **HeyGen**: Gamma report video presenter (Olivia streaming + MP4) AND Cristiano "Go To My New City" cinematic video (Video Agent V2)
- **Resend**: Email notifications

## CRITICAL: Olivia Voice & Avatar Wiring (Support Reference)

**DO NOT confuse these five separate Olivia systems:**

| Feature | Service | Env Vars | Files |
|---------|---------|----------|-------|
| **Ask Olivia Chat** (Help bubble + Ask Olivia page) | OpenAI Assistants API | OPENAI_API_KEY, OPENAI_ASSISTANT_ID | api/olivia/chat.ts |
| **Olivia Voice** (Chat TTS) | ElevenLabs → OpenAI fallback | ELEVENLABS_API_KEY, ELEVENLABS_OLIVIA_VOICE_ID | api/olivia/tts.ts |
| **Olivia Live Presenter** (Gamma streaming overlay) | HeyGen Streaming API v1 | HEYGEN_API_KEY, HEYGEN_OLIVIA_AVATAR_ID, HEYGEN_OLIVIA_VOICE_ID | api/olivia/avatar/heygen.ts |
| **Olivia Video Presenter** (Gamma pre-rendered MP4) | HeyGen Video API v2 | HEYGEN_API_KEY, HEYGEN_OLIVIA_AVATAR_ID, HEYGEN_OLIVIA_VOICE_ID | api/olivia/avatar/heygen-video.ts |
| **Olivia Cockpit Avatar** (Ask Olivia page TV viewport) | D-ID Streams API | DID_API_KEY, DID_PRESENTER_URL | api/olivia/avatar/streams.ts |

- The ElevenLabs voice is a **cloned voice** specific to Olivia. When ElevenLabs quota runs out, OpenAI "nova" voice kicks in automatically.
- HeyGen has its **own separate voice** (HEYGEN_OLIVIA_VOICE_ID) used for both Live Presenter and Video Presenter.
- D-ID cockpit avatar uses Microsoft Sonia voice (en-GB-SoniaNeural) built into D-ID — no ElevenLabs needed.
- **Cristiano** has his own HeyGen pipeline (HEYGEN_CRISTIANO_AVATAR_ID=\`7a0ee88ad6814ed9af896f9164407c41\`, HEYGEN_CRISTIANO_VOICE_ID, HEYGEN_AVATAR_LOOK_ID) — completely separate from Olivia's HeyGen vars.
- Changing HeyGen vars will NOT affect Ask Olivia chat or voice. Changing ElevenLabs/OpenAI vars will NOT affect the video presenter.

## CRITICAL: Cristiano "Go To My New City" HeyGen Video Wiring (Added 2026-02-15)

**Separate from ALL Olivia systems and from the old ElevenLabs/D-ID Judge pipeline.**

| Feature | Service | Env Vars | Files |
|---------|---------|----------|-------|
| **Cristiano City Tour Video** | HeyGen Video Agent V2 | HEYGEN_API_KEY, HEYGEN_CRISTIANO_AVATAR_ID, HEYGEN_CRISTIANO_VOICE_ID, HEYGEN_AVATAR_LOOK_ID | api/cristiano/render.ts |
| **Storyboard Generation** | Claude Sonnet | ANTHROPIC_API_KEY | api/cristiano/storyboard.ts |

- **2-Stage Pipeline**: Stage 1 (storyboard.ts) generates a 7-scene cinematic storyboard via Claude. Stage 2 (render.ts) submits it to HeyGen Video Agent V2 for rendering with B-roll, overlays, and transitions.
- **B-Roll Clip Limit**: Each individual B-roll clip is capped at 6 seconds max. Scenes longer than 6s use multiple clips (e.g. 18s = 3 clips, 16s = 2-3 clips). Enforced in both Stage 1 and Stage 2 prompts.
- **HEYGEN_AVATAR_LOOK_ID** controls Cristiano's physical appearance variant (suit, setting). This is NOT used by Olivia.
- **Pre-render validation** checks all 3 env vars (avatar ID, voice ID, look ID) before spending HeyGen credits.
- Results cached in Supabase. Status polling via same endpoint (action: 'status').

### Cristiano API Endpoints
- POST /api/cristiano/storyboard — Generate 7-scene storyboard JSON (Stage 1)
- POST /api/cristiano/render — Submit to HeyGen Video Agent + poll status (Stage 2)

## Olivia Video Presenter (Updated 2026-02-15)

### Architecture
- **Live Presenter**: Real-time PIP avatar overlay on Gamma iframe via HeyGen Streaming API v1 (WebRTC)
- **Pre-Rendered Video**: HeyGen v2 video/generate → polling → MP4 download
- **Cockpit Avatar**: D-ID Streams API WebRTC avatar on Ask Olivia page TV viewport (Microsoft Sonia voice, no ElevenLabs)
- Narration script generated client-side from comparison data (no API call)
- Scene splitting at paragraph boundaries (~1500 chars per scene)

### Olivia HeyGen API Endpoints
- POST /api/olivia/avatar/heygen — Live Presenter streaming (actions: create, speak, interrupt, close)
- POST/GET /api/olivia/avatar/heygen-video — Pre-rendered video (actions: generate, status)
- POST /api/olivia/avatar/streams — D-ID cockpit avatar (actions: create, speak, destroy, ice-candidate)
- Rate limit: standard (30 req/min), max script: 15,000 chars

### Video Output Specs
- Resolution: 1920×1080 (16:9)
- Background: #0a1628 (dark branded LIFE SCORE theme)
- Multi-scene: script auto-split at ~1500 char paragraph boundaries

### Key Files
- api/olivia/avatar/heygen.ts (HeyGen streaming avatar endpoint)
- api/olivia/avatar/heygen-video.ts (HeyGen pre-rendered video endpoint)
- api/olivia/avatar/streams.ts (D-ID cockpit avatar endpoint)
- api/olivia/avatar/did.ts (DEPRECATED — D-ID Agents API, not used)
- src/services/presenterService.ts (narration script generator)
- src/services/presenterVideoService.ts (video orchestration + polling)
- src/types/presenter.ts (all presenter types)
- src/components/ReportPresenter.tsx (UI: Live/Video sub-modes)
- src/components/VisualsTab.tsx (Read/Listen toggle)

## Video System (Updated 2026-02-13)

### Generation Flow
- Two actions: new_life_videos (pair) and court_order_video (single)
- Sequential generation: loser first, then winner (NOT parallel)
- Kling AI primary → Replicate Minimax fallback
- Timeout: 240 seconds

### Playback
- Blob URL conversion for CORS-safe playback
- Promise.allSettled for independent play (one failing won't block other)
- Expired replicate URLs auto-detected via HEAD check
- Dead URLs tracked in state; shows regenerate placeholder
- Progress bar: scales smoothly to 95% during generation

### Video Caching
- HEAD validation on replicate.delivery URLs (expire ~24h)
- Auto-marks expired URLs as 'failed' in grok_videos table
- Stale processing records auto-failed after 3 minutes

## Security (Updated 2026-02-10)

- JWT auth required on 8+ previously unprotected endpoints
- Auth bypass fixed on /api/emilia/manuals (was using unverified email param)
- Admin check caching: 5-min TTL + 1-hour grace period
- Database hardening: RLS policies strengthened

## Codebase Statistics (2026-02-15)

| Metric | Count |
|--------|-------|
| **Source lines of code** | **~117,429** |
| **Total files** | **443** |
| **Total folders** | **41** |
| **Database tables** | **23** |

| Layer | Lines | % |
|-------|-------|---|
| Frontend (src/) | 86,752 | 73.9% |
| Backend (api/) | 21,044 | 17.9% |
| Database (supabase/) | 5,555 | 4.7% |
| Scripts / Config / Other | 4,078 | 3.5% |

- **48** React components, **46** CSS files
- **55** serverless API functions
- **19** custom hooks, **17** service modules
- **176** TypeScript files (76,284 lines)
- **50** CSS files (35,502 lines)
- **38** SQL migrations (5,555 lines)

## Common Errors

### "Comparison timeout" / "Failed after 3 attempts"
- System auto-retries 3 times with exponential backoff (1s, 2s, 4s)
- Tavily timeout reduced to 45s for faster failure recovery

### Video not playing
- Blob URLs load asynchronously; readyState gate removed
- Expired URLs auto-detected and reset after 3 failed loads

### Judge "winner is TIE"
- Fixed: tie handling corrected in judge-report.ts
- Trend values standardized to 'improving' for DB constraint

## Notification System (Added 2026-02-16)

### Architecture
User triggers task → NotifyMeModal → job created in \`jobs\` table → task completes → notification in \`notifications\` table → bell updates (30s poll) + email via Resend

### Database Tables
- **jobs**: Persistent job queue (user_id, type, status, metadata)
- **notifications**: In-app bell + email records (user_id, job_id, title, body, channel, read)
- **profiles.phone**: Added for future SMS support

### Components
- NotificationBell.tsx — bell icon with unread badge + dropdown
- NotifyMeModal.tsx — "Wait Here" vs "Notify Me & Go" modal
- MobileWarningModal.tsx — small-screen warning (Added 2026-02-16)
- VideoPhoneWarning.tsx — phone call audio warning overlay (Added 2026-02-16)

### Hooks
- useNotifications.ts — polls notifications every 30s
- useJobTracker.ts — creates jobs, updates status, triggers notification

### API
- POST /api/notify — create notification + email via Resend (from: alerts@lifescore.app)
- POST /api/admin/new-signup — admin email on new user signup

### Resolved Issues (2026-02-16)
- Resend from email → alerts@lifescore.app
- isPasswordRecovery missing in AuthContext setState
- 3 broken notification flows (CitySelector, GoToMyNewCity, VisualsTab)
- VS text invisible in dark mode (4 CSS files)
- Founder name "II" suffix
- Mobile +/- buttons and LLM badges overflow
- Visuals page labeling confusion
- Gamma report links not clickable
- Browser not saving login credentials (3 iterations)
- Judge tab stale state on comparison switch
- Password reset redirect URL mismatch
- Admin email notification on new signup

### Resolved Issues (2026-02-17)
- **Gamma export URLs (PDF/PPTX) expiring** — Asset materialization pattern: api/gamma.ts downloads exports from Gamma CDN on completion, uploads to Supabase Storage (gamma-exports public bucket). Returns permanent public URLs. New DB columns: pdf_storage_path, pptx_storage_path. Iframe error detection on all 4 embed locations. 11 files, 35 changes.
- **Gamma report colored cards losing colors** — solidBoxes variant colors stripped by Gamma AI rendering. Fix: 6× category heat maps → barStats (bar length = confidence %). PAGE 64 → semiCircle gauges + table. PAGE 51 → structured table. PAGE 53 → semiCircle dials. Same data, varied chart types, no prompt size increase.

## Debugging
- Vercel Dashboard > Deployments > Functions
- Supabase Dashboard > Logs
- Console: look for [NewLifeVideos], [GEMINI], [GROK] prefixes
`,

  legal: `# Legal Compliance Manual

**Version:** 1.1 | **Updated:** 2026-02-13

## Company Information

**Company Name:** Clues Intelligence LTD
**Registered Address:**
167-169 Great Portland Street, 5th Floor, London W1W 5PF, United Kingdom

**Admin Contact:** cluesnomads@gmail.com

## GDPR Compliance

### Data We Collect
- Email, name, password (hashed) - Account
- City comparisons - Service delivery
- Olivia conversations - AI chat (until account deletion)
- Emilia help chat - Session-based (browser only, not stored)
- Court Order videos - Supabase Storage (user-videos bucket)
- App prompts - System prompt references (admin-editable, permanent)
- Payment info - Via Stripe
- Usage analytics - Anonymized after 30 days
- IP address - Security (90 day retention)

### Data Subject Rights
- Right to Access: /api/user/export
- Right to Deletion: /api/user/delete
- Right to Rectification: Settings page

## Security Improvements (2026-02-10)

- JWT auth required on 8+ API endpoints (emilia, avatar, judge)
- Auth bypass fixed on /api/emilia/manuals
- Database RLS hardening on reports
- Admin check caching with grace period

## DPA Status

Signed: Supabase, Stripe, OpenAI, Anthropic, ElevenLabs, Resend, Vercel
Pending: Google, xAI, Perplexity, D-ID, HeyGen, Tavily, Gamma, Kling AI, Replicate, Simli

## Annual Calendar

- January: DPA Review, Privacy Policy Review
- April: ICO Fee Renewal
- July: Security Audit
- October: Cookie Audit
- December: Data Retention Cleanup

---
*For full details, see docs/manuals/LEGAL_COMPLIANCE_MANUAL.md*
`,

  schema: `# LIFE SCORE - Complete Application Schema Manual

**Version:** 2.4.0 | **Updated:** 2026-02-17

---

## 1. Authentication & Password Recovery

### Authentication Provider
Supabase Auth (GoTrue) manages all authentication. The auth.users table is Supabase-managed (bcrypt passwords, recovery tokens).

### Supported Sign-In Methods
- Email + Password
- Google OAuth
- GitHub OAuth
- Magic Link (passwordless)

### Password Reset Flow
1. **User clicks "Forgot your password?"** on LoginScreen → AuthContext.resetPassword(email) → supabase.auth.resetPasswordForEmail()
2. **Supabase sends email** with one-time recovery JWT (1hr expiry) to user's email
3. **User clicks email link** → /auth/callback → Supabase JS fires PASSWORD_RECOVERY event
4. **AuthContext sets isPasswordRecovery=true** → App.tsx renders ResetPasswordScreen
5. **User enters new password** → AuthContext.updatePassword() → supabase.auth.updateUser({ password })
6. **Supabase updates auth.users** (new bcrypt hash, recovery_token nullified)
7. **isPasswordRecovery cleared** → user enters main app, fully authenticated

### Key Files
- src/contexts/AuthContext.tsx — auth state + resetPassword/updatePassword/clearPasswordRecovery
- src/components/LoginScreen.tsx — "Forgot your password?" form
- src/components/ResetPasswordScreen.tsx — "Set New Password" form
- src/App.tsx — route gate (isPasswordRecovery → ResetPasswordScreen)

### What Password Reset Does NOT Touch
profiles, user_preferences, comparisons, olivia_conversations, gamma_reports, judge_reports, subscriptions, jobs, notifications — ALL untouched. Only auth.users.encrypted_password changes.

---

## 2. Database Schema

LIFE SCORE uses **Supabase (PostgreSQL)** with **23 tables** and **6 storage buckets**.

### 2.1 All Tables

| Table | Purpose |
|-------|---------|
| profiles | User accounts (id, email, tier: free/pro/enterprise) |
| comparisons | Saved comparison results (NOT saved_comparisons) |
| subscriptions | Stripe billing records |
| olivia_conversations | Olivia chat threads |
| olivia_messages | Olivia chat messages |
| gamma_reports | Report URLs + permanent storage paths (pdf_storage_path, pptx_storage_path added 2026-02-17) |
| user_preferences | Single-row-per-user settings (JSONB columns) |
| usage_tracking | Monthly usage limits |
| consent_logs | GDPR consent records |
| judge_reports | Judge verdicts (unique on user_id, report_id) |
| avatar_videos | Judge video cache |
| api_cost_records | Cost tracking per provider |
| grok_videos | Grok/Kling video cache |
| contrast_image_cache | Olivia contrast images |
| api_quota_settings | Admin quota limits (16 providers) |
| api_quota_alert_log | Email alert history |
| authorized_manual_access | Manual access control |
| court_orders | Court Order video saves (with video_storage_path) |
| app_prompts | 50 system prompts (6 categories) |
| invideo_overrides | Admin cinematic prompt overrides |
| report_shares | Shared report links |
| jobs | Persistent job queue for long-running tasks (Added 2026-02-16) |
| notifications | In-app bell + email notification records (Added 2026-02-16) |

### 1.2 Storage Buckets
- **reports** (200 MB) - HTML reports per user folder (private, RLS-controlled)
- **user-videos** (100 MB) - User-uploaded Court Order videos
- **contrast-images** (5 MB) - Permanent contrast image copies
- **judge-videos** (50 MB) - Persisted Judge avatar videos
- **court-order-videos** (50 MB) - Persisted Court Order videos
- **gamma-exports** (50 MB) - Persisted Gamma PDF/PPTX exports (public)

---

## 2. API Endpoints (46 total)

### Core
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/evaluate | POST | Run city evaluation (Tavily + LLM) |
| /api/judge-report | POST | Generate Judge analysis |

### Video
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/video/grok-generate | POST | Start video generation (Kling/Replicate) |
| /api/video/grok-status | GET | Check video status |

### Olivia
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/olivia/chat | POST | Main chat (OpenAI Assistants API) |
| /api/olivia/context | POST | Transform comparison data into Olivia context |
| /api/olivia/tts | POST | ElevenLabs TTS with OpenAI fallback |
| /api/olivia/field-evidence | POST | Source evidence for specific metrics |
| /api/olivia/gun-comparison | POST | Standalone gun rights comparison |
| /api/olivia/contrast-images | POST | AI contrast images via Flux |
| /api/olivia/avatar/heygen | POST | HeyGen Live Presenter streaming avatar (create, speak, interrupt, close) |
| /api/olivia/avatar/heygen-video | POST/GET | HeyGen pre-rendered video generation + status polling |
| /api/olivia/avatar/streams | POST | D-ID cockpit avatar for Ask Olivia page (create, speak, destroy) |

### Cristiano
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/cristiano/storyboard | POST | Generate 7-scene cinematic storyboard (Claude) |
| /api/cristiano/render | POST | Submit storyboard to HeyGen Video Agent V2 + poll status |

### Emilia
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/emilia/thread | POST | Create thread (JWT auth) |
| /api/emilia/message | POST | Send message |
| /api/emilia/speak | POST | Emilia TTS (ElevenLabs + OpenAI fallback) |
| /api/emilia/manuals | GET | Get docs (JWT auth) |

### Other
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/gamma | POST/GET | Visual reports |
| /api/prompts | GET/POST/PUT | System prompts (admin) |
| /api/stripe/webhook | POST | Stripe events |

### Notifications (Added 2026-02-16)
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/notify | POST | Create in-app notification + email via Resend |
| /api/admin/new-signup | POST | Admin email on new user signup |

---

## 3. Key Components (49 total)

### Core: App, Header, Footer, LoginScreen, TabNavigation
### Comparison: CitySelector, EnhancedComparison, Results, SavedComparisons
### AI: AskOlivia, EmiliaChat, OliviaAvatar
### Judge: JudgeTab, JudgeVideo, CourtOrderVideo
### Video: NewLifeVideos (blob URL playback, error detection)
### Reports: VisualsTab (Read/Listen toggle), ReportPresenter (Olivia video presenter), AboutClues
### Settings: SettingsModal, CostDashboard, PricingModal, FeatureGate
### Notifications (Added 2026-02-16): NotificationBell, NotifyMeModal, MobileWarningModal, VideoPhoneWarning

---

## 4. Hooks (20 total)

| Hook | Purpose |
|------|---------|
| useTierAccess | Tier limits (SOURCE OF TRUTH) |
| useComparison | Comparison state machine |
| useGrokVideo | Video generation with poll loop |
| useOliviaChat | Olivia conversation |
| useSimli | WebRTC avatar session |
| useTTS | Text-to-speech |
| useEmilia | Emilia help widget |
| useNotifications | Polls notifications every 30s (Added 2026-02-16) |
| useJobTracker | Job creation + status + notification trigger (Added 2026-02-16) |

---

## 5. Tier System

**SOURCE OF TRUTH:** src/hooks/useTierAccess.ts

| Feature | FREE | NAVIGATOR ($29) | SOVEREIGN ($99) |
|---------|------|-----------------|-----------------|
| Standard Comparisons | 1/mo | 1/mo | 1/mo |
| Enhanced Mode (5 LLMs) | No | No | 1/mo |
| Olivia Minutes | 0 | 15/mo | 60/mo |
| Judge Videos | 0 | 1/mo | 1/mo |
| Gamma Reports | 0 | 1/mo | 1/mo |
| Grok Videos | 0 | 0 | 1/mo |
| Cloud Sync | No | Yes | Yes |

---

## 6. Environment Variables (61 total)

### Required (Production)
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, TAVILY_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY

### Required (Features)
ELEVENLABS_API_KEY, SIMLI_API_KEY, KLING_VIDEO_API_KEY, KLING_VIDEO_SECRET, REPLICATE_API_TOKEN, GAMMA_API_KEY, EMILIA_ASSISTANT_ID

### Optional
GEMINI_API_KEY, GROK_API_KEY, PERPLEXITY_API_KEY, DID_API_KEY, HEYGEN_API_KEY, HEYGEN_OLIVIA_AVATAR_ID, HEYGEN_OLIVIA_VOICE_ID, HEYGEN_CRISTIANO_AVATAR_ID, HEYGEN_CRISTIANO_VOICE_ID, HEYGEN_AVATAR_LOOK_ID, KV_REST_API_URL, KV_REST_API_TOKEN

### Voice & Avatar Wiring (IMPORTANT)
- **ELEVENLABS_OLIVIA_VOICE_ID** → Olivia chat TTS (cloned voice), falls back to OpenAI "nova"
- **HEYGEN_OLIVIA_AVATAR_ID / HEYGEN_OLIVIA_VOICE_ID** → Olivia Live Presenter (streaming) + Video Presenter (pre-rendered MP4)
- **DID_API_KEY / DID_PRESENTER_URL** → Olivia cockpit avatar on Ask Olivia page (D-ID Streams, Microsoft Sonia voice)
- **HEYGEN_CRISTIANO_AVATAR_ID** → \`7a0ee88ad6814ed9af896f9164407c41\` — Cristiano "Go To My New City" cinematic video (Video Agent V2), paired with HEYGEN_CRISTIANO_VOICE_ID + HEYGEN_AVATAR_LOOK_ID
- **OPENAI_ASSISTANT_ID** → Olivia chat brain (OpenAI Assistants API)
- These are 5 independent systems. Changing one does NOT affect the others.

---

*Full schema: docs/manuals/APP_SCHEMA_MANUAL.md*
`,

  equations: `# LIFE SCORE - Mathematical Equations & Scoring Manual

**Version:** 1.1.0 | **Updated:** 2026-02-13

---

## 1. Base Score Scale (0-100)

### Legal Score Bands
| Score | Meaning |
|-------|---------|
| 90-100 | Fully Legal/Unrestricted |
| 70-89 | Generally Permissive |
| 50-69 | Moderate Restrictions |
| 30-49 | Significant Restrictions |
| 0-29 | Prohibited/Illegal |

### Enforcement Score Bands
| Score | Meaning |
|-------|---------|
| 90-100 | Never/Rarely Enforced |
| 70-89 | Low Priority |
| 50-69 | Selectively Enforced |
| 30-49 | Usually Enforced |
| 0-29 | Strictly Enforced |

---

## 2. Dual-Score System

Each metric produces **4 raw scores**:
- city1LegalScore (0-100)
- city1EnforcementScore (0-100)
- city2LegalScore (0-100)
- city2EnforcementScore (0-100)

### Normalized Score
\`\`\`
normalizedScore = (legalScore × lawWeight + enforcementScore × livedWeight) / 100
Default: lawWeight = 50, livedWeight = 50
\`\`\`

### Conservative Mode (Worst-Case)
\`\`\`
normalizedScore = MIN(legalScore, enforcementScore)
\`\`\`
Uses the **lower** of law vs lived reality — worst-case scenario. Overrides the weighted average when enabled.

---

## 3. Category Weights

| Category | Metrics | Weight |
|----------|--------:|-------:|
| Personal Autonomy | 15 | 20% |
| Housing & Property | 20 | 20% |
| Business & Work | 25 | 20% |
| Transportation | 15 | 15% |
| Legal System | 15 | 15% |
| Speech & Lifestyle | 10 | 10% |

---

## 4. Score Aggregation

\`\`\`
categoryScore = Σ(metricScore × metricWeight) / Σ(metricWeight)
totalScore = Σ(categoryScore × categoryWeight) + winBonus + spreadBonus
Capped at 100
\`\`\`

## 5. Differentiation: winBonus = categoryWins × 2, spreadBonus = maxSpread × 0.5 (winner only)

## 6. Confidence: unanimous (<5 σ), strong (5-11), moderate (12-19), split (≥20)

## 7. Enhanced Mode: 5 LLMs → consensusScore = MEAN(validScores)

## 8. Winner: tie if diff < 1, else higher score wins

---

## 9. THE JUDGE Analysis (Updated 2026-02-13)

Claude Opus 4.5 provides:
- **Trend Analysis**: values normalized to 'improving' (not 'rising') for DB constraint
- **Score Passing**: Judge receives actual scores in both standard and enhanced mode (fixed)
- **Tie Handling**: No more "winner is TIE" in video scripts (fixed)
- **Category Analysis**: Per-category breakdown
- **Override Capability**: Can override scores based on trends

## 10. Video Progress Formula (Added 2026-02-13)

\`\`\`
completedPct = (winnerDone ? 50 : 0) + (loserDone ? 50 : 0)
remainingPct = 100 - completedPct
pollFraction = min(pollAttempts / 120, 0.9)
progressPct = completedPct + (remainingPct × pollFraction)
Cap at 95% while generating
\`\`\`

---

*Full manual: docs/manuals/JUDGE_EQUATIONS_MANUAL.md*
`,
};

// ============================================================================
// AUTHORIZATION HELPER
// ============================================================================

async function isUserAuthorized(userEmail: string | null): Promise<boolean> {
  if (!userEmail) return false;

  // Check hardcoded admin list first
  if (ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
    return true;
  }

  // Check database for authorized users
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[manuals] Supabase not configured, using hardcoded admin list only');
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('authorized_manual_access')
      .select('email')
      .eq('email', userEmail.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('[manuals] Auth check error:', error.message);
    }

    return !!data;
  } catch (err) {
    console.error('[manuals] Auth check failed:', err);
    return false;
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'open', { methods: 'GET, OPTIONS' })) return;

  // Method check
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type } = req.query;

  if (!type || typeof type !== 'string' || !MANUAL_FILES[type]) {
    res.status(400).json({
      error: 'Invalid type',
      message: 'Valid types: user, csm, tech, legal',
    });
    return;
  }

  // Check authorization for restricted manuals — use JWT, not query param email
  if (RESTRICTED_MANUALS.includes(type)) {
    const auth = await requireAuth(req, res);
    if (!auth) return; // 401 already sent

    // Verify the authenticated user's email is authorized
    const isAuthorized = await isUserAuthorized(auth.email);

    if (!isAuthorized) {
      res.status(403).json({
        error: 'Access denied',
        message: 'This manual is restricted to authorized administrators only.',
        restricted: true,
      });
      return;
    }
  }

  try {
    // Try to read from file system first (for local development)
    let content: string;
    let lastUpdated: string;

    try {
      const filePath = path.join(process.cwd(), 'docs', 'manuals', MANUAL_FILES[type]);
      content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      lastUpdated = stats.mtime.toISOString().split('T')[0];
    } catch {
      // File not accessible, use embedded content
      content = EMBEDDED_MANUALS[type] || '# Documentation not available';
      lastUpdated = new Date().toISOString().split('T')[0];
    }

    res.status(200).json({
      success: true,
      type,
      title: MANUAL_TITLES[type],
      content,
      lastUpdated,
    });
  } catch (error) {
    console.error('[EMILIA/manuals] Error:', error);

    res.status(500).json({
      error: 'Failed to load manual',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
