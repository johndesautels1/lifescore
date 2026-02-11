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

## Getting Started

### What is LifeScore?
LifeScore (Legal Independence & Freedom Evaluation) is a comprehensive tool that compares cities across 100 freedom metrics to help you make informed decisions about relocation.

### How to Run a Comparison

1. **Select Your Cities**
   - Choose your first city from the left dropdown
   - Choose your second city from the right dropdown
   - You can search by city name or country

2. **Choose Comparison Mode**
   - **Standard Mode**: Uses Claude Sonnet for fast, accurate analysis
   - **Enhanced Mode**: Uses 5 AI providers (Claude, GPT-4o, Gemini, Grok, Perplexity) with consensus scoring

3. **Run the Comparison**
   - Click "Compare Cities"
   - Standard mode takes 2-3 minutes
   - Enhanced mode takes 5-8 minutes

### Understanding Results

#### Scores
- Each metric is scored 0-100
- Higher scores = more freedom/favorable conditions
- Scores are based on laws, regulations, and real-world enforcement

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
- Voice responses available

#### Visual Reports
- Generate PDF/PPTX reports via Gamma
- AI-generated videos showing city contrasts
- Judge video with final verdict

#### Saved Comparisons
- Comparisons auto-save to your account
- Access from the "Saved" tab
- Export as PDF or share

## Troubleshooting

### Comparison Taking Too Long
- Enhanced mode uses multiple AI providers and may take up to 10 minutes
- The system automatically retries failed provider calls up to 3 times (Fix #49)
- If stuck beyond 10 minutes, refresh and try again
- Try Standard mode for faster results

### No Results Showing
- Check your internet connection
- Clear browser cache and refresh
- Contact support if issue persists

### Voice Not Working
- Ensure browser permissions allow audio
- Check volume settings
- Try a different browser

### Video Not Playing
- Videos automatically reset after 3 failed load attempts (Fix #48)
- Click "SEE YOUR NEW LIFE!" button to regenerate expired videos
- Try a different browser if issues persist

## Account Management

### Subscription Tiers
- **FREE**: 1 comparison/month (1 LLM)
- **NAVIGATOR ($29/mo)**: 1 comparison/month, 15min Olivia, 1 Judge, 1 Gamma
- **SOVEREIGN ($99/mo)**: 1 comparison/month (5 LLMs), 60min Olivia, Enhanced Mode

### Upgrading
- Click "Upgrade" in the header
- Select your desired tier
- Payment processed via Stripe

### Cancellation
- Go to Account Settings
- Click "Manage Subscription"
- Select "Cancel Plan"

## Contact Support
- Email: support@cluesintelligence.com
- Response time: 24-48 hours
`,

  csm: `# Customer Service Manual

## Support Overview

### Contact Methods
- **Email**: support@cluesintelligence.com
- **Response Time**: 24-48 hours (business days)

### Tier Limits

| Tier | Comparisons | Olivia | Price |
|------|-------------|--------|-------|
| FREE | 1/month | 0 | $0 |
| NAVIGATOR | 1/month | 15 min | $29/month |
| SOVEREIGN | 1/month (5 LLMs) | 60 min | $99/month |

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
- Cost data is automatically synced to database (Fix #50)

### "I was charged incorrectly"
- Verify transaction in Stripe dashboard
- Check subscription start date
- Issue refund if billing error confirmed

### "Voice/audio isn't working"
- Check browser audio permissions
- Verify volume isn't muted
- Try different browser

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

### Processing Refunds
1. Verify claim in Stripe
2. Confirm eligibility
3. Process via Stripe dashboard
4. Notify user via email

## Escalation Path

1. **Tier 1**: Email support (most issues)
2. **Tier 2**: Technical team (bugs, errors)
3. **Tier 3**: Management (refunds > $100, legal)
`,

  tech: `# Technical Support Manual

## System Architecture

### Frontend
- **Framework**: React 19.2 + TypeScript + Vite
- **Hosting**: Vercel Edge Network
- **Styling**: CSS with custom design system

### Backend
- **Platform**: Vercel Serverless Functions (Node.js)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

### AI Providers
- **Claude Sonnet 4.5**: Primary evaluator
- **GPT-4o**: Enhanced mode evaluator
- **Gemini 3 Pro**: Enhanced mode evaluator
- **Grok 4**: Enhanced mode evaluator
- **Perplexity**: Enhanced mode evaluator
- **Claude Opus 4.5**: Judge (consensus)
- **Tavily**: Web research

### External Services
- **Stripe**: Payments
- **ElevenLabs**: Text-to-speech
- **Gamma**: Report generation
- **Kling/Minimax**: Video generation

## API Endpoints

### Evaluation
- \`POST /api/evaluate\`: Run city evaluation
- \`POST /api/judge\`: Run Opus consensus

### Olivia (AI Assistant)
- \`POST /api/olivia/chat\`: Chat with Olivia
- \`POST /api/olivia/tts\`: Generate voice

### Emilia (Help)
- \`POST /api/emilia/thread\`: Create chat thread
- \`POST /api/emilia/message\`: Send message
- \`POST /api/emilia/speak\`: Generate TTS
- \`GET /api/emilia/manuals\`: Get documentation

### User
- \`POST /api/user/delete\`: Delete account
- \`GET /api/user/export\`: Export data

## Retry Logic (Fix #49 - 2026-02-04)

Gemini and Grok providers now have automatic retry:
- Max attempts: 3
- Backoff: 1s → 2s → 4s (exponential)
- Retries on: 5xx errors, empty responses, JSON parse failures
- No retry on: 4xx client errors

## Cost Tracking Auto-Sync (Fix #50 - 2026-02-04)

Cost data now auto-syncs to Supabase:
- Flow: storeCostBreakdown() → toApiCostRecordInsert() → saveApiCostRecord()
- Non-blocking (failures don't affect comparison)
- Uses UPSERT to handle duplicates

## Video Error Handling (Fix #48 - 2026-02-04)

NewLifeVideos now handles expired URLs:
- Tracks load errors per video element
- Auto-resets after 3 failed loads
- Users can regenerate videos cleanly

## Common Errors

### "OPENAI_API_KEY not configured"
- Check Vercel environment variables
- Ensure key is valid and has credits

### "Rate limit exceeded"
- Check Supabase rate limiting
- May need to increase limits

### "Comparison timeout" / "Failed after 3 attempts"
- Default timeout is 240 seconds
- System now auto-retries 3 times with exponential backoff
- If all retries fail, check AI provider status
- Monitor Vercel function logs for [GEMINI] or [GROK] retry messages

### "Database connection error"
- Check Supabase status page
- Verify connection string in env vars
- Check connection pool limits

## Debugging

### View Logs
- Vercel Dashboard > Deployments > Functions
- Supabase Dashboard > Logs

### Test Endpoints
- Use Postman or curl
- Check response codes and bodies
- Verify request headers

### Monitor Performance
- Vercel Analytics
- Supabase Dashboard
- AI provider dashboards

## Environment Variables

### Required
- \`OPENAI_API_KEY\`: OpenAI API access
- \`ANTHROPIC_API_KEY\`: Claude access
- \`SUPABASE_URL\`: Database URL
- \`SUPABASE_ANON_KEY\`: Public key
- \`SUPABASE_SERVICE_ROLE_KEY\`: Admin key

### Optional
- \`ELEVENLABS_API_KEY\`: TTS
- \`GAMMA_API_KEY\`: Reports
- \`KLING_API_KEY\`: Videos
- \`EMILIA_ASSISTANT_ID\`: Emilia assistant
- \`ELEVENLABS_EMILIA_VOICE_ID\`: Emilia voice
`,

  legal: `# Legal Compliance Manual

## Company Information

**Company Name:** Clues Intelligence LTD
**Registered Address:**
167-169 Great Portland Street
5th Floor
London W1W 5PF
United Kingdom

**Admin Contact:** cluesnomads@gmail.com

## Regulatory Status

### ICO Registration (UK)
- **Required:** YES (UK company processing personal data)
- **Status:** Complete before launch
- **URL:** https://ico.org.uk/for-organisations/register/

### EU Representative
- **Required:** NO (UK company post-Brexit)

### DUNS Number
- **Required:** NO (only for US govt contracts)

## GDPR Compliance

### Data We Collect
- Email, name, password (hashed) - Account
- City comparisons - Service delivery
- Payment info - Via Stripe
- IP address - Security (90 day retention)

### Data Subject Rights
- Right to Access: /api/user/export
- Right to Deletion: /api/user/delete
- Right to Rectification: Settings page

## US State Compliance

Currently DEFERRED - below all thresholds.
Review at 10K users or $1M ARR.

## Data Protection Officer

Formal DPO NOT required for LIFE SCORE.
Privacy Contact: cluesnomads@gmail.com

## Annual Compliance Calendar

- January: DPA Review, Privacy Policy Review
- April: ICO Fee Renewal
- July: Security Audit
- October: Cookie Audit
- December: Data Retention Cleanup

## Authorized Access

This manual is restricted to authorized administrators only.

---
*For full details, see docs/manuals/LEGAL_COMPLIANCE_MANUAL.md*
`,

  schema: `# LIFE SCORE - Complete Application Schema Manual

**Version:** 1.0.0 | **Updated:** 2026-02-03

---

## 1. Database Schema

LIFE SCORE uses **Supabase (PostgreSQL)** with 17+ tables.

### 1.1 Core Tables

#### profiles
User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK, FK(auth.users) |
| email | TEXT | User email |
| full_name | TEXT | Display name |
| tier | TEXT | 'free', 'pro', 'enterprise' |
| avatar_url | TEXT | Profile picture |
| created_at | TIMESTAMPTZ | Account creation |

#### subscriptions
Stripe subscription records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK(profiles) |
| stripe_customer_id | TEXT | Stripe customer ID |
| stripe_subscription_id | TEXT | Stripe sub ID |
| status | TEXT | active, canceled, past_due |
| current_period_end | TIMESTAMPTZ | Billing period end |

#### saved_comparisons
Stored city comparison results.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK(profiles) |
| comparison_id | TEXT | LIFE-CITY1-CITY2-TIMESTAMP |
| city1_name | TEXT | First city |
| city2_name | TEXT | Second city |
| city1_score | NUMERIC | Total score city 1 |
| city2_score | NUMERIC | Total score city 2 |
| winner | TEXT | 'city1', 'city2', 'tie' |
| full_result | JSONB | Complete data |
| is_enhanced | BOOLEAN | Multi-LLM mode |

#### judge_reports
THE JUDGE's comprehensive verdicts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| user_id | UUID | FK(profiles) |
| comparison_id | TEXT | Source comparison |
| report_id | TEXT | LIFE-JDG-DATE-USER-HASH |
| summary_of_findings | JSONB | Scores and trends |
| executive_summary | JSONB | Recommendation |
| video_status | TEXT | pending/generating/ready/error |

---

## 2. API Endpoints

### Comparison Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/evaluate | POST | Generate comparison |
| /api/judge-report | POST | Generate Judge analysis |

### Olivia Chat Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/olivia/chat | POST | Main chat |
| /api/olivia/context | POST | Build context |
| /api/olivia/field-evidence | POST | Get evidence |

### Emilia Help Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/emilia/create-thread | POST | Create thread |
| /api/emilia/message | POST | Send message |
| /api/emilia/manuals | GET | Get docs |

### Other Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/gamma | POST/GET | Visual reports |
| /api/stripe/webhook | POST | Stripe events |
| /api/stripe/create-checkout | POST | Checkout session |

---

## 3. Component Architecture

### Core Components
- App.tsx - Main container
- Header.tsx - Navigation
- CitySelector.tsx - City input
- Results.tsx - Comparison display

### AI Assistant Components
- AskOlivia.tsx - Olivia chat
- EmiliaChat.tsx - Emilia help
- OliviaAvatar.tsx - Avatar display

### Judge & Video
- JudgeTab.tsx - Judge container
- JudgeVideo.tsx - Video player

### Subscription
- PricingPage.tsx - Pricing
- FeatureGate.tsx - Tier locking

---

## 4. State Management

### AuthContext
Provides authentication state.

\`\`\`typescript
interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
\`\`\`

### Custom Hooks

| Hook | Purpose |
|------|---------|
| useTierAccess | Tier limits (SOURCE OF TRUTH) |
| useComparison | Comparison state |
| useOliviaChat | Olivia conversation |
| useEmilia | Emilia help |

### localStorage Keys

| Key | Purpose |
|-----|---------|
| lifescore_user | Demo mode user |
| lifescore_saved_comparisons | Offline cache |
| lifescore_theme | Theme preference |
| lifescore_olivia_thread | Olivia thread ID |

---

## 5. Type Definitions

### Core Types

\`\`\`typescript
type UserTier = 'free' | 'pro' | 'enterprise';

type CategoryId =
  | 'personal_freedom'
  | 'housing_property'
  | 'business_work'
  | 'transportation'
  | 'policing_legal'
  | 'speech_lifestyle';

interface ComparisonResult {
  comparisonId: string;
  city1: CityScore;
  city2: CityScore;
  winner: 'city1' | 'city2' | 'tie';
  scoreDifference: number;
  generatedAt: string;
}
\`\`\`

---

## 6. External Integrations

### AI/LLM Providers
- **OpenAI**: Olivia, Emilia, evaluation
- **Anthropic**: THE JUDGE (Opus 4.5)
- **Perplexity**: Evidence search
- **Google**: Gemini for consensus
- **xAI**: Grok videos

### Video Services
- **HeyGen**: Talking head videos
- **D-ID**: Real-time streaming
- **ElevenLabs**: TTS for Olivia

### Other
- **Gamma**: PDF/PPTX reports
- **Stripe**: Payments
- **Supabase**: Database, Auth

---

## 7. Tier System

**SOURCE OF TRUTH:** src/hooks/useTierAccess.ts

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|------|-----------|-----------|
| Comparisons/day | 3 | 20 | Unlimited |
| Enhanced mode | No | Yes | Yes |
| Judge reports | No | 5/month | Unlimited |
| Olivia chats/day | 10 | 50 | Unlimited |
| Gamma reports | No | 3/month | 10/month |
| HeyGen videos | No | No | 5/month |

---

## 8. Environment Variables

### Required
\`\`\`
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
\`\`\`

### Optional
\`\`\`
PERPLEXITY_API_KEY
HEYGEN_API_KEY
DID_API_KEY
ELEVENLABS_API_KEY
GAMMA_API_KEY
GROQ_API_KEY
GOOGLE_API_KEY
\`\`\`

---

## 9. Metrics Summary

**100 metrics** across **6 categories**:

| Category | Metrics | Weight |
|----------|--------:|-------:|
| Personal Autonomy | 15 | 20% |
| Housing & Property | 20 | 20% |
| Business & Work | 25 | 20% |
| Transportation | 15 | 15% |
| Legal System | 15 | 15% |
| Speech & Lifestyle | 10 | 10% |

---

*Full schema: docs/manuals/APP_SCHEMA_MANUAL.md*
`,

  equations: `# LIFE SCORE - Mathematical Equations & Scoring Manual

**Version:** 1.0.0 | **Updated:** 2026-02-03

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

### Normalized Score Calculation

**Standard Mode:**
\`\`\`
normalizedScore = (legalScore × lawWeight + enforcementScore × livedWeight) / 100
Default: lawWeight = 50, livedWeight = 50
\`\`\`

**Conservative Mode:**
\`\`\`
normalizedScore = MIN(legalScore, enforcementScore)
\`\`\`

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
| **TOTAL** | **100** | **100%** |

---

## 4. Score Aggregation

### Category Score
\`\`\`
categoryScore = Σ(metricScore × metricWeight) / Σ(metricWeight)
categoryContribution = categoryScore × (categoryWeight / 100)
\`\`\`

### Total Score
\`\`\`
totalScore = Σ(categoryContribution) for all 6 categories
\`\`\`

---

## 5. Score Differentiation

### Category Win Bonus
\`\`\`
CATEGORY_WIN_BONUS = 2 points per category won
Win threshold: lead by >5 points in category
\`\`\`

### Max Spread Bonus
\`\`\`
MAX_SPREAD_MULTIPLIER = 0.5
Winner gets: maxCategorySpread × 0.5
\`\`\`

### Final Score
\`\`\`
finalScore = MIN(100, baseScore + winBonus + spreadBonus)
\`\`\`

---

## 6. Confidence Levels

Based on LLM score standard deviation:

| Level | StdDev | Meaning |
|-------|--------|---------|
| unanimous | < 5 | All LLMs agree |
| strong | 5-11 | High agreement |
| moderate | 12-19 | Some disagreement |
| split | >= 20 | Significant disagreement |

### Standard Deviation
\`\`\`
σ = √(Σ(score - mean)² / n)
\`\`\`

### Agreement Percentage
\`\`\`
agreementPct = MAX(0, 100 - σ × 2)
\`\`\`

---

## 7. Enhanced Mode (5 LLMs)

**Providers:**
1. Claude Sonnet 4.5
2. GPT-4o
3. Gemini 3 Pro
4. Grok 4
5. Perplexity Sonar

### Consensus Score
\`\`\`
consensusScore = MEAN(validScores from all LLMs)
\`\`\`

---

## 8. Winner Determination

\`\`\`
scoreDiff = |city1Score - city2Score|

if scoreDiff < 1: winner = 'tie'
else if city1Score > city2Score: winner = 'city1'
else: winner = 'city2'
\`\`\`

### Category Winner
\`\`\`
if |cat1 - cat2| < 2: 'tie'
else: higher score wins
\`\`\`

---

## 9. THE JUDGE Analysis

Claude Opus 4.5 provides:
- **Trend Analysis**: rising, stable, declining
- **Category Analysis**: Per-category breakdown
- **Executive Summary**: Final recommendation
- **Override Capability**: Can override scores based on trends

---

## 10. Master Formula

\`\`\`
TOTAL_SCORE = Σ [
  (Σ [metricScore × metricWeight] / Σ [metricWeight]) × categoryWeight
] + winBonus + spreadBonus

Capped at 100
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

  const { type, email } = req.query;

  if (!type || typeof type !== 'string' || !MANUAL_FILES[type]) {
    res.status(400).json({
      error: 'Invalid type',
      message: 'Valid types: user, csm, tech, legal',
    });
    return;
  }

  // Check authorization for restricted manuals
  if (RESTRICTED_MANUALS.includes(type)) {
    const userEmail = typeof email === 'string' ? email : null;
    const isAuthorized = await isUserAuthorized(userEmail);

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
