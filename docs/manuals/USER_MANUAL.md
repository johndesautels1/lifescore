# LifeScore User Manual

**Version:** 2.5
**Last Updated:** February 5, 2026
**Document ID:** LS-UM-001

---

## Table of Contents

1. [Welcome to LifeScore](#1-welcome-to-lifescore)
2. [Getting Started](#2-getting-started)
3. [Your Dashboard](#3-your-dashboard)
4. [Running a Comparison](#4-running-a-comparison)
5. [Understanding Your Results](#5-understanding-your-results)
6. [Olivia AI Assistant](#6-olivia-ai-assistant)
7. [Judge Evaluation](#7-judge-evaluation)
8. [Visuals & Videos](#8-visuals--videos)
9. [Reports & Exports](#9-reports--exports)
10. [Account Settings](#10-account-settings)
11. [Subscription Plans](#11-subscription-plans)
12. [Troubleshooting](#12-troubleshooting)
13. [Privacy & Data](#13-privacy--data)
14. [Frequently Asked Questions](#14-frequently-asked-questions)
15. [Cost Dashboard & Usage Monitoring](#15-cost-dashboard--usage-monitoring)
16. [Emilia Help Assistant](#16-emilia-help-assistant)

---

## 1. Welcome to LifeScore

### What is LifeScore?

LifeScore is an AI-powered platform that helps you compare cities based on personal freedom and quality of life metrics. Whether you're considering a move, evaluating retirement destinations, or simply curious about how cities stack up, LifeScore provides data-driven insights to inform your decision.

### How It Works

1. **Select two cities** you want to compare
2. **Our AI analyzes** 100 freedom-focused metrics
3. **Review detailed scores** across six life categories
4. **Explore evidence** from authoritative sources
5. **Get personalized insights** from Olivia, your AI assistant

### The Freedom Score

Each city receives a Freedom Score from 0-100, calculated across:

| Category | Weight | What It Measures |
|----------|--------|------------------|
| Personal Autonomy | 20% | Drug laws, gambling, reproductive rights, LGBTQ+ protections |
| Housing & Property | 20% | Zoning flexibility, HOA restrictions, property rights |
| Business & Work | 20% | Business licensing, employment laws, tax burden |
| Transportation | 15% | Vehicle regulations, transit access, parking laws |
| Legal System | 15% | Police practices, incarceration rates, civil liberties |
| Speech & Lifestyle | 10% | Expression freedom, privacy laws, lifestyle autonomy |

---

## 2. Getting Started

### Creating Your Account

1. Visit **clueslifescore.com**
2. Click the **Sign Up** tab
3. Enter your information:
   - **Full Name** (optional)
   - **Email Address**
   - **Password** (minimum 6 characters)
   - **Confirm Password**
4. Click **Create Account**
5. Check your email (including spam folder) for the verification link
6. Click the verification link to activate your account

### Logging In

1. Click the **Sign In** tab
2. Enter your email and password
3. Click **Sign In**
4. If you forgot your password, click "Forgot your password?" to receive a reset link

### Theme Selection

Use the theme toggle button to switch between light and dark mode. Your preference is saved automatically.

---

## 3. Your Dashboard

### Dashboard Overview

Your dashboard shows:

| Section | Description |
|---------|-------------|
| **New Comparison** | Start a fresh city comparison |
| **Recent Comparisons** | Your last 5 comparisons |
| **Favorites** | Saved comparisons you've starred |
| **Usage Stats** | How many features you've used this month |

### Navigation

| Tab | What You'll Find |
|-----|------------------|
| **Compare** | City selection and comparison results |
| **Results** | Detailed breakdown after comparison |
| **Judge** | AI judge verdict and analysis |
| **Visuals** | Video comparisons and imagery |
| **Reports** | PDF/PPTX report generation |
| **Ask Olivia** | AI assistant for questions |
| **History** | All past comparisons |
| **Settings** | Account and preferences |

---

## 4. Running a Comparison

### Step 1: Select Your Cities

1. Click **New Comparison** or use the city selectors
2. **City 1:** Search or browse to select your first city
3. **City 2:** Select the city you want to compare against
4. Currently available: **200 cities** (North America + Europe)

### Step 2: Choose Comparison Mode

**Standard Mode (Default):**
- Uses one AI provider (Claude)
- Results in 2-3 minutes
- Included in all tiers

**Enhanced Mode:**
- Uses multiple AI providers (up to 5)
- Includes Judge consensus evaluation
- Results in 5-8 minutes
- Requires SOVEREIGN tier
- Optional: Use your own API keys for additional control

### Step 3: Adjust Settings (Optional)

**Law vs. Lived Slider:**
- Move left to weight *written laws* more heavily
- Move right to weight *actual enforcement* more heavily
- Default: 50/50 balance

**Category Weights:**
- Customize which categories matter most to you
- Use preset personas or create custom weights

### Step 4: Run Comparison

1. Click **Compare Cities**
2. Watch the progress indicator
3. Results appear automatically when complete

---

## 5. Understanding Your Results

### The Score Card

After comparison, you'll see:

```
┌─────────────────────────────────────────┐
│     MIAMI, FL          vs      AUSTIN, TX
│        72.4                      68.9
│      WINNER
└─────────────────────────────────────────┘
```

### Score Breakdown

**Overall Score:** Combined weighted average (0-100)
- 80-100: Excellent freedom environment
- 60-79: Good freedom environment
- 40-59: Moderate restrictions
- 20-39: Significant restrictions
- 0-19: Highly restrictive

### Category Results

Each category shows:
- **Category Score:** Average of all metrics in that category
- **Law Score:** Based on written legislation
- **Lived Score:** Based on actual enforcement
- **Trend:** Is this score improving or declining?

### Individual Metrics

Click any category to expand and see all metrics:

| Metric | Description | Score |
|--------|-------------|-------|
| Cannabis Legal Status | Recreational/Medical/Decriminalized/Illegal | 85 |
| HOA Prevalence | How common HOAs are | 45 |
| Business License Burden | Ease of starting a business | 72 |

### Evidence Panel

For each metric, click **View Evidence** to see:
- Source citations with links
- Relevant quotes from sources
- Date of information
- Confidence level

### Score Methodology (Added 2026-02-05)

Click **"How is this scored?"** to see a glass-morphic explainer card showing the 5-stage scoring pipeline:

1. **Tavily Research** — Web search gathers current legal data for both cities
2. **LLM Evaluation** — AI providers independently score each metric (0-100)
3. **Law vs Lived Split** — Scores separated into written law and actual enforcement
4. **Category Weighting** — Your custom category weights are applied
5. **Consensus (Enhanced only)** — The Judge resolves disagreements between providers

---

## 6. Olivia AI Assistant

### Who is Olivia?

Olivia is your AI assistant who can:
- Answer questions about your comparison
- Explain specific metrics
- Provide personalized recommendations
- Speak responses aloud (voice mode)

### Accessing Olivia

1. Click the **Ask Olivia** tab
2. Or click the Olivia icon in the corner

### Using Olivia

**Text Chat:**
- Type your question in the chat box
- Press Enter or click Send
- Olivia responds with detailed answers

**Voice Mode:**
- Enable voice in settings
- Olivia speaks her responses
- Great for hands-free use

### Voice Quality

Olivia uses ElevenLabs for high-quality voice synthesis. During high-traffic periods or when quota limits are reached, the system automatically switches to OpenAI TTS (Nova voice), which may sound slightly different but maintains full functionality.

### Sample Questions to Ask

- "Why did Austin score lower on personal freedom?"
- "Which city is better for starting a business?"
- "Explain the housing regulations difference"
- "What are the main factors in Miami's favor?"
- "Should I consider other cities similar to Austin?"

### Usage Limits

| Tier | Monthly Olivia Time |
|------|---------------------|
| FREE | 0 min |
| NAVIGATOR | 15 min |
| SOVEREIGN | 60 min |

---

## 7. Judge Evaluation

### What is Judge Mode?

When you run an Enhanced comparison, multiple AI providers evaluate your cities independently. The **Judge** (Claude Opus) reviews all evaluations and provides:

- Final consensus scores
- Resolution of disagreements
- Confidence assessment
- Key deciding factors

### Accessing Judge Results

1. Complete an Enhanced comparison
2. Click the **Judge** tab
3. View the verdict

### Understanding the Verdict

```
┌─────────────────────────────────────────┐
│           JUDGE'S VERDICT               │
│                                         │
│   Recommendation: MIAMI, FL             │
│   Confidence: HIGH                      │
│   Score Difference: +3.5 points         │
│                                         │
│   Key Factors:                          │
│   1. More permissive personal freedom   │
│   2. Lower business regulation burden   │
│   3. Better property rights protections │
└─────────────────────────────────────────┘
```

### Judge Video

SOVEREIGN tier users can generate a video of the Judge explaining the verdict:
1. Click **Generate Judge Video**
2. Wait 90-180 seconds for generation
3. Watch the animated verdict

### Saving Judge Reports (Added 2026-02-05)

Judge reports are automatically saved to both your browser (localStorage) and the cloud (Supabase). This means:
- Reports are available instantly on the same device (offline-capable)
- Reports sync to the cloud for access on other devices
- View all saved Judge reports in the **Visual Reports / Saved** tab

---

## 8. Visuals & Videos

### The Visuals Tab

The Visuals tab shows AI-generated content representing each city:

**Freedom Video (Winner):**
- Positive, optimistic imagery
- Represents the "winning" city's freedom

**Imprisonment Video (Loser):**
- Contrasting imagery
- Represents restrictions of the "losing" city

### Video Generation

Videos are generated by **Kling AI**, our primary video generation provider:
- Creates mood-based "Freedom" and "Imprisonment" videos
- Generation takes 90-180 seconds
- Videos are cached for instant replay on subsequent views

### Video Controls

- **Play/Pause:** Control playback
- **Stop Video:** End current video
- **Mute/Unmute:** Toggle audio

### Contrast Images

Olivia can generate side-by-side images comparing specific aspects:
- Click **Generate Contrast Images**
- Choose a topic (housing, business, lifestyle)
- View AI-generated comparison imagery

### Video Availability

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|------|-----------|-----------|
| Judge Videos | No | 1/month | 1/month |
| Grok Videos | No | No | Yes |

---

## 9. Reports & Exports

### Gamma Reports

Generate professional presentation-style reports:

1. Complete a comparison
2. Click the **Reports** tab
3. Click **Generate Report**
4. Wait for generation (30-60 seconds)
5. Download as PDF or PPTX

### Report Contents

- Executive summary
- City overview
- Category-by-category breakdown
- Visual charts and graphs
- Source citations
- Recommendations

### Saving Comparisons

1. Click the **Star** icon to favorite a comparison
2. Add a nickname for easy reference
3. Access favorites from your dashboard

**Cloud Sync (Added 2026-02-05):** All saved data — comparisons, Gamma reports, Judge reports, Court Order videos, weight presets, law/lived preferences, excluded categories, and dealbreakers — is now automatically saved to both your browser and the cloud. If you sign in on a different device, your data will be available. If cloud sync fails, your data is still safely stored locally.

### Export Options

| Format | Best For |
|--------|----------|
| PDF | Viewing, printing, sharing |
| PPTX | Presentations, editing |

---

## 10. Account Settings

### Accessing Settings

1. Click your avatar in the top right
2. Select **Settings**

### Profile Settings

| Setting | Description |
|---------|-------------|
| Display Name | Your name shown in the app |
| Avatar | Profile picture |
| Email | Your login email |

### Preferences

| Setting | Options |
|---------|---------|
| Currency | USD, EUR, GBP, CAD, AUD, etc. |
| Units | Imperial / Metric |
| Theme | Light / Dark / Auto |
| Notifications | Email on/off |

### Olivia Settings

| Setting | Description |
|---------|-------------|
| Voice Enabled | Olivia speaks responses |
| Auto-Speak | Automatic voice responses |
| Voice Selection | Choose Olivia's voice |

### API Keys (Advanced)

For Enhanced mode with your own keys:
1. Go to **Settings > API Keys**
2. Enter your API keys for desired providers
3. Keys are used only during your session
4. We never store your API keys

---

## 11. Subscription Plans

### Pricing Overview

| Tier | Monthly | Annual | Annual Savings |
|------|---------|--------|----------------|
| **FREE** | $0 | $0 | - |
| **NAVIGATOR** | $29 | $249 | 28% ($99 saved) |
| **SOVEREIGN** | $99 | $899 | 24% ($289 saved) |

---

### Core Comparison Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **Standard Comparisons** | 1/month | 1/month | 1/month |
| **Enhanced Comparisons** | ❌ | ❌ | 1/month |
| **LLM Providers Used** | 1 (Claude) | 1 (Claude) | 5 (All providers) |
| **Enhanced Mode (5-LLM Consensus)** | ❌ | ❌ | ✅ |

*LLM Providers in Enhanced Mode: Claude, GPT-4o, Gemini, Grok, Perplexity*

---

### AI Assistant Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **Olivia AI Access** | ❌ | ✅ | ✅ |
| **Olivia Minutes/Month** | 0 | 15 min | 60 min |
| **Olivia Voice Responses** | ❌ | ✅ | ✅ |
| **Emilia Help Widget** | ✅ | ✅ | ✅ |

---

### Video & Visual Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **Judge Verdict Videos** | ❌ | 1/month | 1/month |
| **Grok/Kling Mood Videos** | ❌ | ❌ | 1/month |
| **AI Contrast Images** | ❌ | ✅ | ✅ |

*Mood videos show "Freedom" imagery for winner, "Imprisonment" for comparison*

---

### Report & Export Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **Gamma Reports** | ❌ | 1/month | 1/month |
| **PDF Export** | ❌ | ✅ | ✅ |
| **PPTX Export** | ❌ | ✅ | ✅ |
| **Full Evidence Citations** | Basic | Full | Full |

---

### Data & Storage Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **Cloud Sync (Supabase)** | ❌ | ✅ | ✅ |
| **Local Browser Storage** | ✅ | ✅ | ✅ |
| **Dual-Storage (local + cloud)** | ❌ | ✅ | ✅ |
| **Comparison History** | Local only | Cloud synced | Cloud synced |
| **Saved Favorites** | Local only | Cloud synced | Cloud synced |

*Dual-Storage saves all data to both your browser and the cloud simultaneously. If one fails, the other still works.*

---

### Technical & API Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **API Access** | ❌ | ❌ | ✅ |
| **Use Own API Keys** | ❌ | ❌ | ✅ |
| **Custom Category Weights** | ✅ | ✅ | ✅ |
| **Law vs Lived Slider** | ✅ | ✅ | ✅ |

---

### Support Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| **Help Center (Self-Service)** | ✅ | ✅ | ✅ |
| **Email Support** | ❌ | ✅ | ✅ |
| **Chat Support** | ❌ | ✅ | ✅ |
| **Phone Support** | ❌ | ❌ | ✅ |
| **Video Support (Screen Share)** | ❌ | ❌ | ✅ |
| **Dedicated Tech Support** | 0 min | 0 min | 60 min/month |

---

### Upgrading Your Plan

1. Go to **Settings > Subscription**
2. Click **Upgrade**
3. Select your new plan
4. Enter payment information
5. Upgrade takes effect immediately

### Canceling Your Subscription

1. Go to **Settings > Subscription**
2. Click **Cancel Subscription**
3. Confirm cancellation
4. Access continues until billing period ends
5. Account reverts to FREE tier

### Billing

- Monthly billing on your signup date
- Annual billing available (save up to 28%)
- Payment via credit/debit card (Stripe)
- Receipts sent via email

---

## 12. Troubleshooting

### Comparison Won't Complete

**Symptoms:** Progress bar stuck, timeout error

**Solutions:**
1. Wait up to 10 minutes for Enhanced mode
2. Refresh the page and try again
3. Try Standard mode instead
4. Check your internet connection
5. Contact support if persistent

**Note:** The system now includes automatic retry for Gemini and Grok providers (up to 3 attempts with increasing delays). Tavily web search timeout has been reduced to 45 seconds for faster failure recovery.

### Scores Seem Wrong

**Symptoms:** Results don't match expectations

**What to do:**
1. Check the Evidence panel for sources
2. Review Law vs. Lived distinction
3. Adjust category weights if needed
4. Note that enforcement varies locally
5. Report specific concerns to support

### Olivia Not Responding

**Symptoms:** No response, error message

**Solutions:**
1. Check message limit (upgrade if exceeded)
2. Refresh the page
3. Try a simpler question
4. Clear browser cache
5. Try different browser

### Video Won't Play

**Symptoms:** Loading indefinitely, playback error

**Solutions:**
1. Wait 5 minutes for generation
2. Check browser supports video
3. Try different browser
4. Ensure stable internet
5. Disable ad blockers

**Note:** Videos now include automatic error detection. If a video URL has expired (common with cached videos), the system detects load failures and automatically resets after 3 attempts, allowing you to regenerate a fresh video by clicking "SEE YOUR NEW LIFE!"

### Can't Log In

**Symptoms:** Login fails, account locked

**Solutions:**
1. Use "Forgot Password"
2. Check email for verification link
3. Try social login instead
4. Clear browser cookies
5. Contact support for unlock

---

## 13. Privacy & Data

### What Data We Collect

| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Account info | Authentication | Until deletion |
| Comparisons | History & favorites | Until deletion |
| Chat history | Olivia context | Until deletion |
| Usage data | Analytics | Anonymized after 90 days |

### Your Rights (GDPR)

- **Access:** Request copy of your data
- **Portability:** Export in standard format
- **Deletion:** Request complete removal
- **Correction:** Update incorrect information

### Data Requests

1. Go to **Settings > Privacy**
2. Click **Request Data Export** or **Delete Account**
3. Confirm via email
4. Processed within 30 days

### Third-Party Services

We use:
- **Supabase:** Database & authentication
- **Stripe:** Payment processing
- **AI Providers:** Analysis (data not stored)
- **Vercel:** Hosting

---

## 14. Frequently Asked Questions

### General

**Q: How current is the data?**
A: Our AI searches for the most recent information, typically within 12-24 months. Check the Evidence panel for source dates.

**Q: Can I compare more than two cities?**
A: Currently, comparisons are between two cities. Run multiple comparisons to evaluate more options.

**Q: Why aren't [City Name] available?**
A: We currently support 200 cities in North America and Europe. International expansion is planned.

### Scoring

**Q: Why do Law and Lived scores differ?**
A: Law scores reflect written legislation. Lived scores reflect actual enforcement, which may be stricter or more lenient.

**Q: What if I disagree with a score?**
A: Check the Evidence panel for sources. If you find errors, report them through the feedback form.

**Q: How are category weights determined?**
A: Default weights reflect general priorities. You can customize weights to match your personal priorities.

### Technical

**Q: Which browsers are supported?**
A: Chrome, Firefox, Safari, Edge (latest versions). Mobile browsers supported.

**Q: Is there a mobile app?**
A: Currently web-only. The site is mobile-responsive.

**Q: Can I use my own API keys?**
A: Yes, in Enhanced mode (SOVEREIGN). Enter keys in Settings > API Keys.

**Q: What is Enhanced Mode and how does it work?**
A: Enhanced Mode uses up to 5 AI providers simultaneously (Claude Sonnet 4.5, GPT-5.2, Gemini 3 Pro, Grok 4, Perplexity Sonar) to evaluate cities. Each provider scores independently, then Claude Opus 4.5 acts as "The Judge" to analyze disagreements and provide consensus scores. This delivers more reliable, balanced results. Requires SOVEREIGN tier.

**Q: Why would I use Enhanced Mode over Standard Mode?**
A: Enhanced Mode provides multi-LLM consensus scoring, which reduces individual AI bias and catches edge cases a single model might miss. The Judge feature highlights where AI providers disagree and explains the reasoning. Best for important relocation decisions.

**Q: How long does Enhanced Mode take?**
A: Enhanced Mode typically takes 5-8 minutes vs 2-3 minutes for Standard Mode. The extra time allows all 5 AI providers to complete their analysis and for the Judge to evaluate disagreements.

### Billing

**Q: Can I get a refund?**
A: Within 7 days of first subscription. Contact support for refund requests.

**Q: What happens if payment fails?**
A: 7-day grace period, then account reverts to FREE.

**Q: Is my payment information secure?**
A: Yes, processed by Stripe. We never see your full card number.

---

## 15. Cost Dashboard & Usage Monitoring

### What is the Cost Dashboard?

The Cost Dashboard shows real-time API usage across all providers. Access it by clicking the 💰 icon in the app header.

### Understanding Quota Colors

| Color | Usage Level | Meaning |
|-------|-------------|---------|
| 🟢 Green | 0-49% | Normal - plenty of quota remaining |
| 🟡 Yellow | 50-69% | Caution - over half used |
| 🟠 Orange | 70-84% | Warning - approaching limit |
| 🔴 Red | 85-99% | Critical - near limit |
| ⚫ Exceeded | 100%+ | Limit reached - fallback active |

### Quota Alerts

When quotas reach warning levels, you'll receive email alerts at:
- support@clueslifescore.com (your registered email)

### Fallback Behavior

When a provider exceeds its quota:
- **TTS:** ElevenLabs → OpenAI TTS automatically
- **Avatar:** Simli → D-ID → Replicate automatically
- You may notice slight quality or voice differences during fallback

---

## 16. Emilia Help Assistant

### Who is Emilia?

Emilia is a help widget assistant (different from Olivia). She appears as a floating help button and can:
- Answer quick questions about using LifeScore
- Guide you through features
- Provide contextual help

### Emilia vs. Olivia

| Feature | Emilia | Olivia |
|---------|--------|--------|
| Purpose | App help & guidance | Comparison analysis |
| Location | Floating widget | Dedicated tab |
| Voice | Shimmer (softer) | Nova (warm) |
| Context | App navigation | Your comparison data |

---

## Getting Help

**Need assistance?**

- **Help Center:** help.clueslifescore.com
- **Email:** support@clueslifescore.com
- **In-App:** Ask Olivia
- **Feedback:** Report issues in Settings

---

*Thank you for choosing LifeScore. We're committed to helping you find your ideal city.*

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
| 2.0 | 2026-01-30 | Claude Opus 4.5 | Phase 1 fixes: domain names, password requirements, tier limits |
| 2.1 | 2026-01-30 | Claude Opus 4.5 | Phase 2: Added Cost Dashboard (§15), Emilia Help Assistant (§16) |
| 2.2 | 2026-01-30 | Claude Opus 4.5 | Phase 3: TTS fallback info, Kling AI docs, video timing fix, annual pricing |
| 2.3 | 2026-02-02 | Claude Opus 4.5 | Fixed tier limits to match code: NAVIGATOR 1 comparison, SOVEREIGN 1 comparison/1 Gamma/1 Judge |
| 2.4 | 2026-02-02 | Claude Opus 4.5 | Added comprehensive feature tables: 8 categories, 30+ features with detailed tier breakdown |
| 2.5 | 2026-02-05 | Claude Opus 4.5 | Session 9: Score Methodology explainer (§5), Judge report cloud save (§7), dual-storage data sync (§9, §11), video auto-reset troubleshooting (§12), updated AI model names (§14), retry/timeout notes |
