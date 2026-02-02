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
};

// Manual titles
const MANUAL_TITLES: Record<string, string> = {
  user: 'User Manual',
  csm: 'Customer Service Manual',
  tech: 'Technical Support Manual',
  legal: 'Legal Compliance',
};

// Manuals that require admin authorization
const RESTRICTED_MANUALS = ['csm', 'tech', 'legal'];

// Hardcoded admin emails (fallback if table doesn't exist yet)
const ADMIN_EMAILS = ['cluesnomads@gmail.com'];

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
- Refresh page and check Saved tab (may have completed)
- Try Standard mode for faster results

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

## Common Errors

### "OPENAI_API_KEY not configured"
- Check Vercel environment variables
- Ensure key is valid and has credits

### "Rate limit exceeded"
- Check Supabase rate limiting
- May need to increase limits

### "Comparison timeout"
- Default timeout is 240 seconds
- Check if AI provider is slow
- Monitor Vercel function logs

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
