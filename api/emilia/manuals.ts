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
const ADMIN_EMAILS = ['cluesnomads@gmail.com', 'brokerpinellas@gmail.com'];

// ============================================================================
// EMBEDDED CONTENT (Fallback)
// ============================================================================

// Embedded manual content for when files aren't accessible in serverless
const EMBEDDED_MANUALS: Record<string, string> = {
  user: `# LifeScore User Manual

**Version:** 3.0 | **Updated:** 2026-02-13

## Getting Started

### What is LifeScore?
LifeScore (Legal Independence & Freedom Evaluation) is a comprehensive tool that compares cities across 100 freedom metrics to help you make informed decisions about relocation.

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
- Voice responses available (ElevenLabs with OpenAI TTS fallback)

#### Visual Reports
- Generate PDF/PPTX reports via Gamma
- AI-generated "New Life" videos (Freedom vs Imprisonment)
- Judge verdict video with Court Order option
- All saved to both browser and cloud

#### Saved Comparisons
- Comparisons auto-save to both localStorage and Supabase (dual-storage)
- Access from the "Saved" tab
- Export as PDF or share
- Syncs across devices when logged in

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

**Version:** 3.0 | **Updated:** 2026-02-13

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

## Refund Policy

### Eligible Refunds
- Charged in error
- Unable to access service due to our fault
- First 7 days of subscription (one-time)

### Non-Refundable
- Used comparisons
- Partial month after cancellation
- Disagreement with AI results

## Escalation Path

1. **Tier 1**: Email support (most issues)
2. **Tier 2**: Technical team (bugs, errors)
3. **Tier 3**: Management (refunds > $50, legal)
`,

  tech: `# Technical Support Manual

**Version:** 4.0 | **Updated:** 2026-02-13

## System Architecture

### Frontend
- **Framework**: React 19.2 + TypeScript + Vite
- **Hosting**: Vercel Edge Network
- **Styling**: CSS with custom design system

### Backend
- **Platform**: Vercel Serverless Functions (Node.js 20)
- **Database**: Supabase (PostgreSQL) - 21 tables, 3 storage buckets
- **Auth**: Supabase Auth with JWT verification

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
- **Resend**: Email notifications

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
Pending: Google, xAI, Perplexity, D-ID, Tavily, Gamma, Kling AI, Replicate, Simli

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

**Version:** 2.0.0 | **Updated:** 2026-02-13

---

## 1. Database Schema

LIFE SCORE uses **Supabase (PostgreSQL)** with **21 tables** and **3 storage buckets**.

### 1.1 All Tables

| Table | Purpose |
|-------|---------|
| profiles | User accounts (id, email, tier: free/pro/enterprise) |
| comparisons | Saved comparison results (NOT saved_comparisons) |
| subscriptions | Stripe billing records |
| olivia_conversations | Olivia chat threads |
| olivia_messages | Olivia chat messages |
| gamma_reports | Report URLs (with city1, city2 columns) |
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

### 1.2 Storage Buckets
- **avatars** (5 MB) - User profile pictures
- **judge-videos** (50 MB) - Judge avatar video cache
- **user-videos** (100 MB) - Court Order video uploads

---

## 2. API Endpoints (43 total)

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

---

## 3. Key Components (45 total)

### Core: App, Header, Footer, LoginScreen, TabNavigation
### Comparison: CitySelector, EnhancedComparison, Results, SavedComparisons
### AI: AskOlivia, EmiliaChat, OliviaAvatar
### Judge: JudgeTab, JudgeVideo, CourtOrderVideo
### Video: NewLifeVideos (blob URL playback, error detection)
### Reports: VisualsTab, AboutClues
### Settings: SettingsModal, CostDashboard, PricingModal, FeatureGate

---

## 4. Hooks (18 total)

| Hook | Purpose |
|------|---------|
| useTierAccess | Tier limits (SOURCE OF TRUTH) |
| useComparison | Comparison state machine |
| useGrokVideo | Video generation with poll loop |
| useOliviaChat | Olivia conversation |
| useSimli | WebRTC avatar session |
| useTTS | Text-to-speech |
| useEmilia | Emilia help widget |

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
GEMINI_API_KEY, GROK_API_KEY, PERPLEXITY_API_KEY, DID_API_KEY, HEYGEN_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN

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
