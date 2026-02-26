# LifeScore User Manual

**Version:** 3.8
**Last Updated:** February 26, 2026
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
17. [Notifications](#17-notifications-added-2026-02-16)

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
4. Your browser will offer to **save your credentials** for faster future logins (password manager compatible)
5. If you forgot your password, click "Forgot your password?" to receive a reset link

### Forgot Password / Password Reset

If you've forgotten your password, here's the complete step-by-step flow:

**Step 1: Request a Reset Link**
1. On the Sign In screen, click **"Forgot your password?"**
2. The form switches to **Reset Password** mode
3. Enter your email address
4. Click **Send Reset Link**
5. You'll see: *"Password reset link sent! Please check your email (including spam/junk folder). The link expires in 1 hour."*

**Step 2: Check Your Email**
1. Open your email inbox (check spam/junk if you don't see it)
2. Look for an email from **noreply@mail.app.supabase.io** with subject "Reset Your Password"
3. Click the reset link in the email
4. The link redirects you back to LifeScore automatically

**Step 3: Set Your New Password**
1. LifeScore detects the password recovery link and shows the **Set New Password** screen
2. Enter your new password (minimum 6 characters)
3. Re-enter the password to confirm
4. Use the eye icon to toggle password visibility
5. Click **Update Password**
6. You'll see: *"Password updated successfully! Redirecting..."*
7. After 2 seconds, you're automatically signed into the app

**Important Notes:**
- The reset link expires after **1 hour** — request a new one if it expires
- For security, you'll receive a success message even if the email doesn't exist in our system (this prevents email enumeration)
- Your saved comparisons, reports, Judge verdicts, and all other data remain **completely untouched** during a password reset — only the password itself changes
- If you don't want to reset after clicking the link, click **"Skip — go to app"** to enter the app without changing your password

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
2. **City 1:** Search or browse to select your first city — cities show flag emojis and orange country badges for easy identification
3. **City 2:** Select the city you want to compare against
4. Currently available: **200 cities** (North America + Europe)
5. Search highlighting helps you find cities as you type

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
- The section **illuminates with a highlighted border** when you change it from the default, so you can see at a glance that you've customized it

**Worst-Case Mode Toggle:**
- When enabled, uses the **lower** of Law and Lived scores (worst-case scenario)
- The toggle **glows/illuminates when active** to make the active state clearly visible
- Overrides the Law vs Lived slider with MIN(law, lived) for each metric

**Category Weights:**
- Customize which categories matter most to you
- Use preset personas or create custom weights

**Dealbreakers Panel:**
- Mark specific metrics as dealbreakers (must-haves)
- Metrics are listed **alphabetically A-Z within each category** for easy scanning
- Dealbreaker metrics are highlighted and weighted more heavily in the final score

### Step 4: Run Comparison

1. Click **Compare Cities**
2. Watch the progress indicator
3. Results appear automatically when complete
4. The page **auto-scrolls to the top** so you immediately see the score cards

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

### Explain the Winner (Added 2026-02-16)

Below the score cards, a toggle labeled **"Explain the Winner"** lets you view a detailed AI-generated narrative explaining:
- Why the winning city scored higher
- The key categories and metrics that drove the difference
- Notable strengths and weaknesses of each city

This feature is available in **Standard Mode** (not just Enhanced) and provides the same quality of explanation as the Judge verdict, but directly in the Results view.

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

### Collapsible Panels (Updated 2026-02-14)

The Judge page now uses **three collapsible panels** to reduce scroll clutter and help you focus on the information you need:

| Panel | Default State | Contents | Header Summary |
|-------|--------------|----------|----------------|
| **Media Panel** | Open | Video Viewport + Action Buttons | Video playback status |
| **Evidence Panel** | Collapsed | Summary of Findings + Category Analysis (all 6 categories) | Score highlights |
| **Verdict Panel** | Collapsed | Executive Summary + Court Order + GoToMyNewCity | Winner name |

**How to use:**
- Click any panel's header bar to expand or collapse it
- Each panel header displays live summary stats so you can see key information without expanding
- All panels remember their state during your session

### Confidence Interval Hover Cards (Added 2026-02-16)

The Judge tab score cards now feature **confidence interval hover cards**. When you hover over (or tap on mobile) any score card, a tooltip appears showing:
- The confidence level (unanimous, strong, moderate, or split)
- The score range across all AI providers
- How much the providers agreed or disagreed

This helps you understand how reliable each score is — a "unanimous" confidence means all AI providers agreed closely, while "split" means significant disagreement.

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

### Phone Call Audio Warning (Added 2026-02-16)

All video displays across the app (Judge Video, Court Order, Freedom Tour, Olivia Presenter, Grok Videos, and Olivia Avatar) now include a **phone call audio warning**. If you are on an active phone call while viewing a video, a warning overlay appears reminding you that playing audio may interrupt your call. This applies to:
- Judge verdict videos
- Court Order videos
- GoToMyNewCity (Freedom Tour) videos
- Olivia presenter and avatar videos
- Grok/Kling mood videos
- Report presenter videos

### Judge Video

SOVEREIGN tier users can generate a video of the Judge explaining the verdict:
1. Click **Generate Judge Video**
2. Wait 90-180 seconds for generation
3. Watch the animated verdict

### Display Screen Buttons (Added 2026-02-16)

At the bottom of the Judge tab, two **glassmorphic (frosted-glass) buttons** provide quick access to:
- **Court Order** — Generate or view the Court Order video for the winning city
- **Freedom Tour** — Generate or view the GoToMyNewCity cinematic relocation video

These buttons feature a modern glassmorphic design with blur effect and hover animations.

### Court Order Videos (Added 2026-02-11)

The Judge can generate a Court Order video for the winning city — a cinematic "perfect life" video:
- Click **Generate Court Order** in the Judge tab (or use the glassmorphic button at the bottom)
- Video is generated by Kling AI (90-180 seconds)
- Videos are saved to cloud storage for permanent access
- SOVEREIGN tier only

### GoToMyNewCity Video (Added 2026-02-14)

At the bottom of the Judge page (inside the Verdict panel), you'll find the **"Go To My New City"** video — a personalized, multi-scene cinematic relocation video for the winning city. This video is generated by HeyGen and features:

- An intro scene with Cluesnomads.com branding
- Multiple storyboard scenes showcasing your winning city
- A call-to-action directing you to Cluesnomads.com for next steps

The GoToMyNewCity video only appears when a judge report is loaded. It provides an inspiring visual preview of life in the city the Judge recommends.

### Auto-Restore Videos on Tab Switch (Fixed 2026-02-14)

Previously, videos on the Judge page would disappear if you switched to another tab and came back. This has been fixed:
- Video URLs are now auto-restored from Supabase when you re-enter the Judge tab
- No need to regenerate — your videos persist across tab switches

### Judge Report Category Sections (Fixed 2026-02-14)

When loading saved judge verdicts, all **6 freedom category sections** now appear correctly in the Evidence panel. Previously, only the executive summary loaded and the individual category analysis sections were missing.

### Judge Dropdown Performance (Fixed 2026-02-14)

The judge report dropdown selector now responds in approximately 50ms (previously 354ms). Expensive DOM re-renders on selection have been removed for a snappier experience.

### Saving Judge Reports (Updated 2026-02-14)

Judge reports are automatically saved to both your browser (localStorage) and the cloud (Supabase). This means:
- Reports are available instantly on the same device (offline-capable)
- Reports sync to the cloud for access on other devices
- View all saved Judge reports in the **Visual Reports / Saved** tab
- Tie results are now handled correctly — no more "winner is TIE" text
- **Tie victory text fix (2026-02-26):** When two cities score within 1 point of each other, the report verdict now says "evenly matched" instead of showing blank winner text
- **Supabase fallback (Added 2026-02-14):** If a Judge report is missing from localStorage (e.g., after clearing browser cache), the system automatically falls back to Supabase to retrieve it. Your reports survive browser cache clearing.

### Saving Gamma Reports (Updated 2026-02-14)

Gamma reports now reliably persist between sessions. Previously, reports could silently fail to save due to a database foreign key constraint. This has been fixed — all Gamma reports are now correctly saved to both localStorage and Supabase for cross-device access.

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

- **Play/Pause:** Control playback (both videos play simultaneously)
- **Download:** Save individual videos to your device
- **Stop Video:** End current video
- **Mute/Unmute:** Toggle audio

**Video Reliability:** Videos are now served via secure blob URLs for reliable cross-origin playback. If a cached video has expired, the system automatically detects the failure and lets you regenerate with the "SEE YOUR NEW LIFE!" button.

### Olivia Video Presenter (Added 2026-02-13)

On the Visuals tab, after a Gamma report is generated or loaded from saved reports, you'll see a **Read / Listen to Presenter** toggle. This lets you choose how to consume your report:

**Read Mode (Default):** View the full Gamma report in an embedded viewer.

**Listen to Presenter Mode:** Olivia presents your report findings as an AI video avatar.

#### Live Presenter
- Olivia appears as a picture-in-picture avatar overlay on your report
- She narrates the key findings: introduction, winner announcement, category breakdowns, key differences, and conclusion
- **Controls:** Play/Pause, Next/Previous segment, Close
- Available instantly — no generation wait time

#### Generate Video
- Creates a polished, downloadable MP4 video of Olivia presenting your full report
- Click **Generate Video** and wait for processing (up to 10 minutes)
- A progress bar shows generation status
- Once complete, watch directly or download the MP4
- Great for sharing with others or keeping a permanent video summary

### AUDIO Badge & Voice Wave Indicator (Added 2026-02-14)

The PIP (picture-in-picture) video player now features an improved audio experience:
- The **AUDIO badge** has moved from the bottom to the **top-right** of the PIP video player for better visibility
- A new **animated voice wave indicator** appears when audio is actively playing, giving you visual feedback that the presenter is speaking

### Storyboard Progress Bar (Added 2026-02-14)

When generating videos, a new **progress bar** now shows real-time status of the video generation process. This replaces the old spinner with a clear visual indication of how far along your video is. The system also validates storyboard QA word counts before rendering begins.

### Cristiano Judge Video Improvements (Updated 2026-02-14)

The Cristiano judge verdict video has been enhanced:
- A **"Visit Cluesnomads.com"** call-to-action is now displayed during the verdict
- A **poster image** and **logo overlay** appear on the video player for professional branding
- Fixed a 422 alignment error between storyboard QA and render validation that could cause generation failures

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

- Executive summary with winner trophy designation
- City overview with scores and category wins
- Category-by-category breakdown
- Visual charts and graphs
- Source citations
- Recommendations

**Trophy Placement (Fixed 2026-02-14):** The 🏆 trophy in Gamma reports now correctly appears next to the **winning** city only. Previously, the trophy could appear next to the losing city due to a prompt formatting issue.

**Permanent Downloads (Added 2026-02-17):** PDF and PPTX export files are now permanently stored. Previously, download links could expire after a few hours because they pointed to Gamma's temporary CDN. Now, export files are automatically saved to permanent storage when your report completes — download links will always work, even months later. If you see a broken download link on an older report, simply regenerate the report from the Visuals tab.

**Expired Report Detection (Added 2026-02-17):** If a Gamma report embed can no longer load (e.g., the hosted document was removed), the app now shows a clear message instead of a broken page, with instructions to regenerate or use your saved PDF/PPTX exports.

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

### Dark Mode Improvements (Fixed 2026-02-14, Updated 2026-02-16)

Dark mode now displays saved reports correctly:
- **Saved report city names** are now clearly readable in dark mode (previously had poor contrast)
- **Saved report dates** now use crisp white text in dark mode for easy reading
- **"VS" text** between city names is now clearly visible in dark mode across all comparison views (AdvancedVisuals, ContrastDisplays, JudgeTab, JudgeVideo) — previously invisible against dark backgrounds (Fixed 2026-02-16)

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

**Symptoms:** Loading indefinitely, playback error, play button unresponsive

**Solutions:**
1. Wait up to 3 minutes for initial generation
2. If the play button doesn't respond, the video URL may have expired — wait for automatic reset
3. After 3 failed load attempts, the system auto-resets and shows "SEE YOUR NEW LIFE!" to regenerate
4. Try downloading the video directly (download button works independently of playback)
5. Check browser supports video; try different browser
6. Ensure stable internet connection
7. Disable ad blockers

**How it works:** Videos use secure blob URLs for reliable playback. The system detects expired or broken video URLs automatically, tracks failures, and resets after 3 attempts so you can regenerate fresh videos.

**Video URL Expiration (Updated 2026-02-14):** All video providers (Replicate, HeyGen, Kling) now have expiration-aware URL handling. The system performs a HEAD request to validate cached video URLs before displaying them. If a URL has expired, the video is automatically re-fetched or regenerated — no manual action needed. Additionally, localStorage quota crash protection has been added, so large video caches won't cause browser errors.

### Olivia Presenter Not Working

**Symptoms:** Presenter doesn't appear, video won't generate, avatar not speaking

**Note:** The video presenter uses HeyGen (separate from Olivia's chat voice). A presenter issue does NOT mean the Ask Olivia chat or voice is broken.

**Solutions:**
1. Ensure a Gamma report is loaded first — the presenter needs report data
2. For Live Presenter: check internet connection (avatar uses real-time HeyGen streaming)
3. For Video Generation: allow up to 10 minutes for processing
4. If generation fails, click **Retry** to try again
5. Check browser supports video playback; try different browser
6. Ensure ad blockers aren't blocking HeyGen API calls

### Can't Log In

**Symptoms:** Login fails, account locked

**Solutions:**
1. Use "Forgot Password"
2. Check email for verification link
3. Try social login instead
4. Clear browser cookies
5. Contact support for unlock

### Mobile Warning Modal (Added 2026-02-16)

When visiting LifeScore on a small screen (phone), a **warning modal** appears explaining that the app is optimized for desktop/tablet. The modal offers:
- A brief explanation that some features work best on larger screens
- A button to **continue anyway** on mobile
- The warning only appears once per session

### Mobile Display Issues

**Symptoms:** Content cut off on the right side, buttons pushed off-screen, text overlapping on mobile phones

**Fixed (2026-02-15):** Nine mobile display issues have been resolved. If you previously experienced any of the following on phones (screens ≤480px wide), these are now fixed:

| Area | What Was Broken | Status |
|------|----------------|--------|
| Results page winner/loser cards | Score cards too wide for screen | Fixed |
| Category breakdown % badges | Weight badges pushed off right edge | Fixed |
| About > Services table | Table wider than screen | Fixed |
| About > How It Works modules | Module chips cut off | Fixed |
| Ask Olivia READY/STOP buttons | Buttons obscured Olivia's response area | Fixed |
| Gamma Report viewer buttons | Read/Listen/Open/Close buttons overflowed | Fixed |
| Judge doormat + retry button | Triangle icon and retry button too large | Fixed |
| Judge verdict Sovereign badge | Badge and "THE JUDGE" text cut off | Fixed |
| Account Settings CONNECTED button | Connected status pushed off-screen | Fixed |
| Enhanced Mode +/- weight buttons | Buttons pushed off-screen on narrow phones | Fixed (2026-02-16) |
| Enhanced Mode LLM provider badges | Badge pills overflowing container on mobile | Fixed (2026-02-16) |

**If you still see display issues on mobile:** Try a hard refresh (pull down on mobile, or Ctrl+Shift+R on desktop). If problems persist, contact support with a screenshot and your device/browser info.

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

### Security (Updated 2026-02-26)

Your data is protected by multiple security layers:
- **Authenticated APIs:** All 38+ API endpoints require you to be logged in — no anonymous access to any user data or functionality
- **Row Level Security:** Database policies ensure you can only see your own comparisons, reports, and settings
- **No data leaks:** Internal debug information has been removed from production (87 debug statements cleaned up)
- **Input validation:** All user inputs are validated before processing to prevent injection attacks
- **CORS protection:** The API only accepts requests from the official LIFE SCORE application

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

**Q: Why did my video disappear after switching tabs?**
A: This issue has been fixed as of February 2026. Videos on the Judge page now auto-restore when you return to the tab. The system retrieves video URLs from Supabase so you don't lose your generated content.

**Q: Why are there collapsible panels on the Judge page?**
A: The Judge page was redesigned with collapsible panels (Media, Evidence, Verdict) to reduce scroll clutter. Click any panel header to expand or collapse it. Each header shows summary stats so you can see key information at a glance.

**Q: What is the "Go To My New City" video?**
A: This is a personalized cinematic relocation video for the winning city, shown at the bottom of the Judge Verdict panel. It features multiple scenes with Cluesnomads.com branding and only appears when a judge report is loaded.

**Q: The copyright or date shows the wrong year**
A: Fixed as of February 2026. All year displays now update automatically. Refresh the page to see the current year.

**Q: When cities tie, the report text looks blank or broken**
A: Fixed as of February 2026. Tie results now show "evenly matched" with a balanced analysis of both cities, rather than blank winner text.

### Technical

**Q: Which browsers are supported?**
A: Chrome, Firefox, Safari, Edge (latest versions). Mobile browsers supported.

**Q: Is there a mobile app?**
A: Currently web-only. The site is mobile-responsive.

**Q: Can I use my own API keys?**
A: Yes, in Enhanced mode (SOVEREIGN). Enter keys in Settings > API Keys.

**Q: What is Enhanced Mode and how does it work?**
A: Enhanced Mode uses up to 5 AI providers simultaneously (Claude Sonnet 4.5, GPT-4o, Gemini 3 Pro, Grok 4, Perplexity Sonar) to evaluate cities. Each provider scores independently, then Claude Opus 4.5 acts as "The Judge" to analyze disagreements and provide consensus scores. This delivers more reliable, balanced results. Requires SOVEREIGN tier.

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

### Cost Dashboard Accuracy (Fixed 2026-02-14)

Previously, the Cost Dashboard could show $0.00 for Gamma, Olivia, TTS, Avatar, and Perplexity services. This occurred because database records were saved before post-comparison services finished running. The fix now performs a field-by-field merge, taking the higher value from either localStorage or the database, and auto-syncs corrected values back to the database. Perplexity API also now correctly returns token usage data.

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
- cluesnomads@gmail.com (your registered email)

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
- Access 8 help tabs: User Manual, Customer Service, Tech Support, Legal, App Schema, Judge Equations, Prompts, APIs

### Help Tabs

The Emilia help system includes multiple tabs for different types of information:

| Tab | Content |
|-----|---------|
| User Manual | This document — how to use LifeScore |
| Customer Service | Support procedures and escalation |
| Tech Support | Technical architecture and debugging |
| Legal | Privacy, GDPR, and compliance |
| App Schema | Database tables, API endpoints, components |
| Judge Equations | Scoring formulas and algorithms |
| Prompts | All 50 system prompts (admin view — shows how AI evaluations are configured) |
| APIs | Environment variables and service configurations |

### Emilia vs. Olivia

| Feature | Emilia | Olivia |
|---------|--------|--------|
| Purpose | App help & guidance | Comparison analysis |
| Location | Floating widget | Dedicated tab |
| Voice | Shimmer (softer) | Nova (warm) |
| Context | App navigation | Your comparison data |

---

## 17. Notifications (Added 2026-02-16)

### Notification Bell

A notification bell icon appears in the app header. When you have unread notifications, a badge with the count appears on the bell. Click it to see your recent notifications in a dropdown.

### "Notify Me" for Long-Running Tasks

When you start a task that takes time (comparisons, Judge verdicts, video generation, Gamma reports), a modal appears offering two choices:

| Option | What Happens |
|--------|-------------|
| **Wait Here** | Stay on the page and watch the progress bar |
| **Notify Me & Go** | Navigate away freely — you'll get a notification when it's done |

If you choose "Notify Me & Go":
1. The task continues running in the background
2. When complete, the bell icon updates with a new unread notification
3. Click the bell to see the notification and jump to your results
4. If you opted in to email notifications, you'll also receive an email from alerts@lifescore.app

### Notification Types

| Notification | Trigger |
|-------------|---------|
| Comparison complete | Standard or Enhanced comparison finishes |
| Judge verdict ready | Judge analysis completes |
| Video generated | Grok/Kling mood video finishes rendering |
| Gamma report ready | Gamma report generation completes |
| Court Order video ready | Court Order video finishes rendering |
| Freedom Tour video ready | GoToMyNewCity video finishes rendering |

### Managing Notifications

- Click the **bell icon** to view all notifications
- Unread notifications appear with a highlight
- The unread count badge updates in real time (polled every 30 seconds)
- Notifications include a timestamp showing when the task completed
- When you have no notifications, the dropdown shows an orange "No notifications yet" message

---

## Getting Help

**Need assistance?**

- **Help Center:** help.clueslifescore.com
- **Email:** cluesnomads@gmail.com
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
| 3.0 | 2026-02-13 | Claude Opus 4.6 | Court Order videos (§7), blob URL video playback, video troubleshooting rewrite (§12), city selector with country badges (§4), Emilia help tabs detail (§16), Prompts tab documentation, Judge tie handling fix |
| 3.1 | 2026-02-13 | Claude Opus 4.6 | Added Olivia Video Presenter (§8): Read/Listen toggle, Live PIP avatar presenter, pre-rendered HeyGen video with download. Presenter troubleshooting (§12). |
| 3.2 | 2026-02-14 | Claude Opus 4.6 | 5 bug fixes: (1) Trophy 🏆 now correctly placed on winner not loser in Gamma reports (§9), (2) Gamma reports persistence fix — foreign key constraint resolved (§7, §9), (3) backdrop-filter blur removed from 8 CSS files for INP performance, (4) 247ms INP fix on login email input, (5) "Watch Presenter" renamed to "Listen to Presenter" (§8). |
| 3.3 | 2026-02-14 | Claude Opus 4.6 | Major Judge page redesign: collapsible panels (§7), GoToMyNewCity multi-scene video (§7), auto-restore videos on tab switch (§7), missing 6 category sections fix (§7), Judge dropdown INP fix (§7). Video URL expiration handling for all providers (§12). Cost Dashboard $0.00 fix (§15). Cristiano video CTA + poster (§8). AUDIO badge + voice wave indicator (§8). Storyboard progress bar (§8). Dark mode fixes for saved reports (§10). Judge report Supabase fallback (§7). Expired video URL HEAD-request validation (§12). localStorage quota crash protection. |
| 3.4 | 2026-02-15 | Claude Opus 4.6 | 9 mobile vertical overflow fixes (§12): Results score cards, category % badges, About services table, How It Works modules, Olivia READY/STOP buttons, Gamma viewer buttons, Judge doormat/retry, Sovereign badge, Settings CONNECTED button. All scoped to ≤480px viewports. New "Mobile Display Issues" troubleshooting section. |
| 3.5 | 2026-02-17 | Claude Opus 4.6 | Full "Forgot Password" flow documented (§2): 3-step walkthrough covering reset request, email link, new password form, and data safety notes. Updated App Schema Manual with complete Authentication & Password Recovery architecture (§1.0). Updated CSM and Tech manuals with password reset troubleshooting and architecture. |
| 3.6 | 2026-02-17 | Claude Opus 4.6 | 29-commit audit: Notifications system (§17) with bell icon, "Notify Me" modal, email alerts. Explain the Winner toggle (§5). Confidence interval hover cards (§7). Glassmorphic Judge buttons (§7). Phone call audio warning (§7). Mobile warning modal (§12). Law vs Lived / Worst-Case illumination (§4). Dealbreakers A-Z sort (§4). Auto-scroll to top (§4). VS text dark mode fix (§10). Mobile +/- buttons and LLM badges fix (§12). Visuals labeling fix. Gamma links fix. Login credential storage fix. Judge stale state fix. Password reset redirect fix. Admin signup email. |
| 3.7 | 2026-02-17 | Claude Opus 4.6 | Gamma export URL expiration fix (§9): Permanent Downloads note — PDF/PPTX exports now permanently stored in Supabase Storage. Expired Report Detection note — iframe error handling shows fallback message. |
| 3.8 | 2026-02-26 | Claude Opus 4.6 | Security audit session (47 fixes): New Security subsection in Privacy & Data (§13) documenting 38+ authenticated endpoints, CORS hardening, debug cleanup. Tie victory text fix in Judge reports (§7). New FAQs for wrong year display and tie case. All user-facing data now requires authentication. |
