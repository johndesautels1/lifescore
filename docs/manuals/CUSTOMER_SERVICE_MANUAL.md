# LifeScore Customer Service Manual

**Version:** 3.3
**Last Updated:** February 14, 2026
**Document ID:** LS-CSM-001

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Product Overview](#2-product-overview)
3. [Subscription Tiers](#3-subscription-tiers)
4. [Common Customer Inquiries](#4-common-customer-inquiries)
5. [Troubleshooting Guide](#5-troubleshooting-guide)
6. [Account Management](#6-account-management)
7. [Billing & Payments](#7-billing--payments)
8. [Feature Explanations](#8-feature-explanations)
9. [Escalation Procedures](#9-escalation-procedures)
10. [Communication Templates](#10-communication-templates)
11. [FAQs](#11-faqs)
12. [Glossary](#12-glossary)

---

## 1. Introduction

### 1.1 Purpose of This Manual

This manual provides customer service representatives with comprehensive guidance for supporting LifeScore users. It covers product features, common issues, troubleshooting steps, and escalation procedures.

### 1.2 Company Mission

LifeScore helps users make informed decisions about where to live by comparing cities across 100 freedom-focused metrics. Our AI-powered platform evaluates legal frameworks and real-world enforcement to provide actionable insights.

### 1.3 Support Channels

| Channel | Availability | Response Time |
|---------|--------------|---------------|
| Email Support (cluesnomads@gmail.com) | 24/7 | 24 hours |
| Live Chat | 9 AM - 9 PM EST | Immediate |
| Help Center (help.clueslifescore.com) | 24/7 (Self-service) | N/A |

---

## 2. Product Overview

### 2.1 What is LifeScore?

LifeScore is a web application that compares cities based on personal freedom metrics. Users select two cities and receive detailed analysis across six categories:

1. **Personal Autonomy** (20%) - Drugs, gambling, abortion, LGBTQ rights
2. **Housing & Property** (20%) - Zoning, HOA restrictions, land use
3. **Business & Work** (20%) - Licensing, employment laws, taxes
4. **Transportation** (15%) - Vehicle regulations, transit options
5. **Legal System** (15%) - Police enforcement, criminal justice
6. **Speech & Lifestyle** (10%) - Expression, privacy, cultural autonomy

### 2.2 How Scoring Works

Each city receives two scores per metric:
- **Legal Score (Law):** What the written law says (0-100)
- **Enforcement Score (Lived):** How laws are actually enforced (0-100)

Users can adjust the Law vs. Lived ratio to weight their results.

### 2.3 Available Cities

Currently, LifeScore supports **200 metropolitan areas**:
- 100 North American cities (USA + Canada)
- 100 European cities

*International expansion is planned for future releases.*

---

## 3. Subscription Tiers

### 3.1 Pricing Overview

| Tier | Monthly | Annual | Annual Savings |
|------|---------|--------|----------------|
| **FREE** | $0 | $0 | - |
| **NAVIGATOR** | $29 | $249 | 28% ($99 saved) |
| **SOVEREIGN** | $99 | $899 | 24% ($289 saved) |

### 3.2 Core Comparison Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| Standard Comparisons | 1/month | 1/month | 1/month |
| Enhanced Comparisons | ❌ | ❌ | 1/month |
| LLM Providers | 1 (Claude) | 1 (Claude) | 5 (All) |
| Enhanced Mode | ❌ | ❌ | ✅ |

### 3.3 AI Assistant Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| Olivia AI Access | ❌ | ✅ | ✅ |
| Olivia Minutes/Month | 0 | 15 min | 60 min |
| Olivia Voice Mode | ❌ | ✅ | ✅ |
| Emilia Help Widget | ✅ | ✅ | ✅ |

### 3.4 Video & Visual Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| Judge Verdict Videos | ❌ | 1/month | 1/month |
| Grok/Kling Mood Videos | ❌ | ❌ | 1/month |
| AI Contrast Images | ❌ | ✅ | ✅ |

### 3.5 Report & Export Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| Gamma Reports | ❌ | 1/month | 1/month |
| PDF Export | ❌ | ✅ | ✅ |
| PPTX Export | ❌ | ✅ | ✅ |
| Full Evidence Citations | Basic | Full | Full |

### 3.6 Data & Storage Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| Cloud Sync (Supabase) | ❌ | ✅ | ✅ |
| Local Browser Storage | ✅ | ✅ | ✅ |
| Dual-Storage (local + cloud) | ❌ | ✅ | ✅ |
| Comparison History | Local | Cloud | Cloud |

**Dual-Storage System (Added 2026-02-05):** All user data now saves to BOTH localStorage (offline-first, instant access) AND Supabase (cloud backup, cross-device sync). This covers comparisons, Gamma reports, Judge reports, Court Order videos, weight presets, law/lived preferences, excluded categories, and dealbreakers. If cloud sync fails, data is still safely stored locally.

### 3.7 Technical & API Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| API Access | ❌ | ❌ | ✅ |
| Use Own API Keys | ❌ | ❌ | ✅ |
| Custom Category Weights | ✅ | ✅ | ✅ |

### 3.8 Support Features

| Feature | FREE | NAVIGATOR | SOVEREIGN |
|---------|:----:|:---------:|:---------:|
| Help Center | ✅ | ✅ | ✅ |
| Email Support | ❌ | ✅ | ✅ |
| Chat Support | ❌ | ✅ | ✅ |
| Phone Support | ❌ | ❌ | ✅ |
| Video Support | ❌ | ❌ | ✅ |
| Tech Support Time | 0 | 0 | 60 min/month |

### 3.9 Upgrade Paths

| Current Tier | Available Upgrades |
|--------------|-------------------|
| FREE | NAVIGATOR, SOVEREIGN |
| NAVIGATOR | SOVEREIGN |
| SOVEREIGN | N/A (highest tier) |

### 3.10 Comparison Types

**Standard Comparison:**
- Uses Claude Sonnet 4.5 only
- Faster results (~2-3 minutes)
- Basic evidence display

**Enhanced Comparison:**
- Uses multiple LLM providers (up to 5)
- Consensus scoring with judge evaluation
- Detailed evidence from all sources
- Takes longer (~5-8 minutes)

### 3.3 Upgrade Paths

| Current Tier | Available Upgrades |
|--------------|-------------------|
| FREE | NAVIGATOR, SOVEREIGN |
| NAVIGATOR | SOVEREIGN |
| SOVEREIGN | N/A (highest tier) |

---

## 4. Common Customer Inquiries

### 4.1 "Why is my comparison taking so long?"

**Expected Response:**
"Enhanced comparisons analyze your cities across 100 metrics using multiple AI providers. This thorough analysis typically takes 5-8 minutes. You can track progress in the loading indicator. If it exceeds 10 minutes, please try refreshing the page."

**Root Causes:**
- Enhanced mode uses 5 LLM providers sequentially
- Each provider evaluates 100 metrics across 6 categories
- Network latency with AI providers
- High server load during peak times

### 4.2 "My results don't match my expectations"

**Expected Response:**
"LifeScore evaluates legal frameworks and their enforcement, which may differ from personal perceptions. Each score is backed by cited sources you can review in the Evidence panel. If you believe specific data is incorrect, please share the metric and we'll investigate."

**Actions:**
1. Direct user to expand the Evidence section for specific metrics
2. Explain Law vs. Lived scoring distinction
3. Note that enforcement varies by neighborhood/district
4. Offer to log feedback for data team review

### 4.3 "How current is your data?"

**Expected Response:**
"Our AI providers search for the most current legal information available, typically within the last 12-24 months. Laws passed or changed very recently may take time to appear in search results. Each evaluation includes source dates in the Evidence panel."

### 4.4 "Can you add [City Name]?"

**Expected Response:**
"Thank you for the suggestion! We're continuously expanding our city coverage. I've logged your request for [City Name]. Our team reviews city requests monthly and prioritizes based on user demand."

**Action:** Log city request in feedback system with user details.

### 4.5 "Where did the Judge page content go? It looks different."

**Expected Response:**
"We've redesigned the Judge page with collapsible panels to reduce clutter. Your content is all still there — it's organized into three panels: Media (video player), Evidence (findings and category analysis), and Verdict (executive summary and Court Order). Click any panel's header bar to expand or collapse it. The Media panel is open by default; the Evidence and Verdict panels are collapsed."

**Actions:**
1. Explain the three-panel layout (Media, Evidence, Verdict)
2. Note that each panel header shows live summary stats
3. Reassure user that no content was removed — it's reorganized

### 4.6 "My video disappeared after I switched tabs"

**Expected Response:**
"This issue has been resolved. Videos on the Judge page now auto-restore when you return to the tab. The system retrieves your video URLs from the cloud automatically. If you're still experiencing this, try refreshing the page — the video should reload from your saved data."

**Root Cause (resolved):** Video URLs were stored only in component state and lost on tab switch. Fix: auto-restore from Supabase on re-entry.

### 4.7 "The Judge page only shows the executive summary, not the category breakdown"

**Expected Response:**
"This was a known issue that has been fixed. When loading saved judge verdicts, all 6 freedom category sections now appear correctly in the Evidence panel. Please refresh the page or reload your saved report. If the issue persists, try clearing your browser cache and reloading."

### 4.8 "The Cost Dashboard shows $0.00 for everything"

**Expected Response:**
"This was a display issue where cost data wasn't captured for services that run after the initial comparison saves. This has been fixed — the dashboard now merges data from multiple sources and takes the highest recorded values. Please refresh the Cost Dashboard. If values still show $0.00 after a new comparison, please contact support."

**Root Cause (resolved):** Database records were saved before post-comparison services (Gamma, Olivia, TTS, Avatar, Perplexity) finished running. Fix: field-by-field merge from localStorage + auto-sync back to DB.

### 4.9 "I can't read city names or dates on saved reports in dark mode"

**Expected Response:**
"Thank you for reporting this. We've fixed the dark mode styling for saved reports — city names and dates now display with proper contrast. Please refresh the page to see the fix. If text is still hard to read, try toggling dark mode off and on again in Settings."

---

## 5. Troubleshooting Guide

### 5.1 Login Issues

| Issue | Solution |
|-------|----------|
| "Invalid email or password" | Verify email spelling; use "Forgot Password" link |
| "Email not verified" | Check spam folder; resend verification email |
| "Account locked" | Wait 30 minutes or contact support for unlock |
| Google/GitHub SSO failure | Clear cookies; try incognito mode |
| Login feels slow/unresponsive | Fixed 2026-02-14 — removed backdrop-filter blur that caused 247ms input delay |

### 5.2 Comparison Failures

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Evaluation timed out" | AI provider slow/unavailable | System auto-retries 3 times; if still failing, try again in 5 minutes |
| "Failed after 3 attempts" | Persistent provider issues | Wait 5 minutes and retry; the system attempted multiple retries automatically |
| "Rate limit exceeded" | Too many requests | Wait 1 minute, retry |
| "API error" | Provider temporarily down | Try different comparison |
| "No data available" | Metrics couldn't be evaluated | Contact support |

**Note (Updated 2026-02-04):** Enhanced mode now includes automatic retry with exponential backoff for Gemini and Grok providers. The system will retry up to 3 times with increasing delays (1s, 2s, 4s) before reporting a failure.

**Note (Updated 2026-02-05):** Tavily web search timeout reduced from 240s to 45s for faster failure recovery. All save operations are now wrapped in try/catch to prevent silent failures.

### 5.3 Olivia AI Issues

| Issue | Solution |
|-------|----------|
| Olivia not responding | Check internet; refresh page |
| Voice not playing | Check device volume; enable audio in browser |
| Incorrect answers | Report via feedback; AI has knowledge limitations |
| "Usage limit reached" | Upgrade tier or wait for monthly reset |

### 5.4 Video Generation Issues

| Issue | Solution |
|-------|----------|
| Video stuck on "Generating" | Allow up to 3 minutes; videos generate sequentially (loser first, then winner) |
| Play button not responding | The video URL may have expired — system detects this automatically and resets after 3 attempts |
| Video playback error | System auto-resets after 3 failed load attempts; click "SEE YOUR NEW LIFE!" to regenerate |
| "Video generation failed" | Retry; if persistent, contact support |
| Video shows blank/expired | Wait for auto-reset (after 3 errors) then regenerate |
| Only one video plays | Both videos use independent playback — one failing won't block the other |
| Progress bar stuck at 73% | Fixed — progress now scales smoothly to 95% during generation |
| Download works but playback doesn't | Try clicking play again; blob URLs load asynchronously |
| Video disappeared after tab switch | Fixed — videos now auto-restore from Supabase on tab re-entry |
| Court Order video broken/expired | Fixed — Court Order videos no longer use expiring provider CDN URLs |
| HeyGen presenter video expired | Fixed — HeyGen URLs now validated before display; auto re-fetched if expired |
| Browser crashed with quota error | Fixed — localStorage quota overflow is now caught gracefully |
| Storyboard generation fails with 422 | Fixed — storyboard QA and render validation alignment corrected |

**Note (Updated 2026-02-13):** Video playback has been significantly improved:
- Videos use secure blob URLs for cross-origin playback
- Expired CDN URLs (common after 24h) are auto-detected
- Each video plays independently (one failing won't block the other)
- Progress bar now smoothly tracks from 0% to 95% during generation
- Download button works independently of playback

**Note (Updated 2026-02-14):** Comprehensive video URL expiration handling added:
- **All providers covered:** Replicate, HeyGen, and Kling video URLs are now validated before display
- **HEAD request validation:** Cached video URLs are tested with a HEAD request before being shown to the user
- **Auto re-fetch:** Expired URLs trigger automatic re-generation — no manual user action needed
- **localStorage quota protection:** Large video caches no longer crash the browser; quota errors are caught gracefully
- **Court Order videos:** Fixed issue where Court Order videos used expiring provider CDN URLs
- **HeyGen URLs:** Fixed HeyGen video URL expiration that caused broken presenter videos
- **Storyboard progress bar:** New real-time progress bar during video generation with word-count QA validation
- **Cristiano video:** Added "Visit Cluesnomads.com" CTA, poster image, and logo overlay; fixed 422 storyboard/render alignment error

### 5.5 Gamma Report Issues

| Issue | Solution |
|-------|----------|
| Report not generating | Ensure comparison completed first |
| "Generation ID missing" error | Fixed in Session 8 — the system now uses fallback ID from status response |
| PDF download fails | Try PPTX format instead; clear cache |
| Report shows wrong data | Regenerate from fresh comparison |

**Note (Updated 2026-02-05):** The "Generation ID missing" error has been resolved. Gamma reports and Judge reports are now also saved to Supabase (cloud backup) and visible in the Visual Reports / Saved tab.

**Note (Updated 2026-02-14):** Two Gamma report issues fixed:
- **Persistence fix:** Reports previously failed to save to the database due to a foreign key constraint on `comparison_id`. The save was fire-and-forget so errors were silently swallowed. Now fixed with proper error handling.
- **Trophy placement fix:** The 🏆 trophy emoji in the Executive Summary was incorrectly placed next to the losing city instead of the winner. The Gamma AI prompt now explicitly marks which city is the winner with clear trophy placement rules.

### 5.6 Judge Page Issues (Added 2026-02-14)

| Issue | Solution |
|-------|----------|
| Judge page looks different / panels collapsed | Redesigned with collapsible panels — click header bars to expand Media, Evidence, or Verdict sections |
| Only executive summary shows, no categories | Fixed — all 6 category sections now load correctly; refresh page |
| Videos disappeared after tab switch | Fixed — videos auto-restore from Supabase on tab re-entry |
| Judge dropdown selector feels slow | Fixed — response time reduced from 354ms to ~50ms |
| Judge report missing after cache clear | Fixed — system falls back to Supabase when localStorage is empty |
| GoToMyNewCity video not appearing | Only shows when a judge report is loaded; check Verdict panel |

### 5.7 Cost Dashboard Issues (Added 2026-02-14)

| Issue | Solution |
|-------|----------|
| All costs show $0.00 | Fixed — field-by-field merge now captures post-comparison service costs; run a new comparison |
| Perplexity cost shows $0.00 | Fixed — Perplexity API now correctly returns token usage data |
| Historical comparisons show $0.00 | Expected for comparisons run before the fix; only new comparisons will show correct costs |

### 5.8 Dark Mode Issues (Added 2026-02-14)

| Issue | Solution |
|-------|----------|
| Saved report city names unreadable | Fixed — proper contrast applied in dark mode |
| Saved report dates hard to read | Fixed — crisp white text now used in dark mode |
| Other dark mode text issues | Report specific elements to support for investigation |

---

## 6. Account Management

### 6.1 Account Creation

Users can create accounts via:
- Email + password
- Google OAuth
- GitHub OAuth

**Requirements:**
- Valid email address
- Password: minimum 6 characters

### 6.2 Profile Settings

Users can modify:
- Display name
- Avatar
- Preferred currency (USD, EUR, GBP, etc.)
- Preferred units (Imperial/Metric)
- Email notification preferences
- Theme (Light/Dark/Auto)

### 6.3 Data Export

Under GDPR, users can request:
- Full data export (JSON format)
- Account deletion (processed within 30 days)

**Process:** Settings > Privacy > Request Data Export

### 6.4 Account Deletion

**Warning:** Account deletion is permanent and includes:
- All comparison history
- Saved reports
- Olivia conversation history
- Subscription cancellation (no refund)

**Process:** Settings > Privacy > Delete Account > Confirm

---

## 7. Billing & Payments

### 7.1 Payment Methods

- Credit/Debit cards (Visa, Mastercard, Amex)
- Processed via Stripe

### 7.2 Billing Cycle

- Monthly subscriptions bill on the same day each month
- Annual subscriptions bill yearly (NAVIGATOR $249/yr saves 28%, SOVEREIGN $899/yr saves 24%)

### 7.3 Common Billing Issues

| Issue | Solution |
|-------|----------|
| Payment declined | Verify card details; contact bank |
| Double charged | Screenshot required; investigate in Stripe |
| Subscription not active | Check email for payment failure notice |
| Can't cancel | Settings > Subscription > Cancel |

### 7.4 Refund Policy

- **Within 7 days of first subscription:** Full refund available
- **After 7 days:** Pro-rated refund at company discretion
- **Feature issues:** Case-by-case evaluation

### 7.5 Cancellation

- Cancellation takes effect at end of billing period
- Access continues until period ends
- No partial refunds for early cancellation

---

## 8. Feature Explanations

### 8.1 Standard vs. Enhanced Comparison

**Standard:**
- Single AI provider (Claude Sonnet)
- Faster results
- Basic evidence display
- Good for quick checks

**Enhanced:**
- Multiple AI providers evaluate independently
- Judge AI resolves disagreements
- Comprehensive evidence from all sources
- Best for important decisions

### 8.2 Olivia AI Assistant

Olivia is an AI assistant that can:
- Answer questions about comparison results
- Explain specific metrics
- Provide recommendations based on user priorities
- Generate spoken responses (voice mode)

**Limitations:**
- Cannot access external websites
- Knowledge based on training data
- May occasionally provide incorrect information

### 8.3 Judge Page Layout (Updated 2026-02-14)

The Judge page now uses a **collapsible panel layout** with three sections:

| Panel | Default | Contents |
|-------|---------|----------|
| **Media Panel** | Open | Video viewport + action buttons |
| **Evidence Panel** | Collapsed | Summary of Findings + all 6 category analysis sections |
| **Verdict Panel** | Collapsed | Executive Summary + Court Order + GoToMyNewCity video |

Each panel header shows live summary stats (video status, scores, winner name). Users click the header bar to expand/collapse.

**Common support issue:** Users may report "content is missing" — direct them to click the collapsed panel headers to expand and see their content.

### 8.4 Judge Videos (Updated 2026-02-14)

Animated video summaries featuring:
- AI judge character (Cristiano)
- Verbal explanation of winner
- Key factors highlighted
- **"Visit Cluesnomads.com"** call-to-action overlay
- **Poster image** and **logo overlay** on video player
- 30-60 second duration

### 8.4 Gamma Reports

Professional presentation-style reports including:
- Executive summary
- Category breakdowns
- Visual charts
- Exportable to PDF/PPTX

### 8.5 Grok Videos (SOVEREIGN only)

AI-generated lifestyle videos powered by **Kling AI** (primary) with **Replicate Minimax** fallback:
- "Freedom" mood video for winning city
- "Imprisonment" mood video for losing city
- Videos generated sequentially (loser first, then winner) for reliability
- Generation takes up to 3 minutes
- City type auto-detection (beach, mountain, urban, desert, european, tropical) for optimized prompts
- Cached for instant replay on subsequent views; expired URLs auto-detected

### 8.6 Score Methodology Explainer (Added 2026-02-05)

A glass-morphic card in the results view explains the 5-stage scoring pipeline:
1. **Tavily Research** — Web search gathers current legal data
2. **LLM Evaluation** — AI providers score each metric
3. **Law vs Lived Split** — Separates written law from enforcement
4. **Category Weighting** — User-adjustable category weights applied
5. **Consensus (Enhanced)** — Judge resolves multi-LLM disagreements

Users can click "How is this scored?" to see this breakdown.

### 8.7 GoToMyNewCity Video (Added 2026-02-14)

A personalized multi-scene cinematic relocation video for the winning city, displayed at the bottom of the Judge Verdict panel:
- Generated by HeyGen with multiple storyboard scenes
- Features intro, city showcase scenes, and call-to-action with Cluesnomads.com branding
- Only appears when a judge report is loaded
- SOVEREIGN tier only

**Common support issues:**
| Issue | Solution |
|-------|----------|
| GoToMyNewCity video not showing | Ensure a judge report is loaded first — video only appears with an active verdict |
| Video generation stuck | Allow up to 10 minutes; HeyGen multi-scene videos take longer than single-scene |

### 8.8 Court Order Videos (Updated 2026-02-14)

Saved Court Order videos from the Judge's verdict:
- Generated by Kling AI (primary) for the winning city's "perfect life" scenario
- Saved to both localStorage and Supabase (cloud backup)
- Videos can be uploaded to permanent cloud storage (user-videos bucket)
- Accessible from the Visual Reports / Saved tab
- **URL expiration fix (2026-02-14):** Court Order videos previously used expiring provider CDN URLs. Now validated with HEAD requests before display; expired URLs trigger automatic re-fetch
- SOVEREIGN tier only

### 8.9 Olivia Video Presenter (Updated 2026-02-14)

Olivia can now present Gamma report findings as an AI avatar video:

**Two modes:**
- **Live Presenter:** Real-time avatar overlay on the report — instant, no generation wait
- **Pre-Rendered Video:** Polished MP4 video of Olivia presenting — takes up to 10 minutes to generate, downloadable

**PIP Enhancements (Added 2026-02-14):**
- **AUDIO badge** repositioned from bottom to **top-right** of PIP video player for better visibility
- **Animated voice wave indicator** appears when audio is actively playing, providing visual feedback that the presenter is speaking

**How to access:**
1. Go to the Visuals tab
2. Generate or load a saved Gamma report
3. Click the **Listen to Presenter** toggle (switches from Read mode)
4. Choose Live Presenter or Generate Video

**Tier Availability:** Available to all users who can generate Gamma reports (NAVIGATOR and SOVEREIGN).

**Important:** The video presenter uses **HeyGen** (`HEYGEN_OLIVIA_AVATAR_ID` / `HEYGEN_OLIVIA_VOICE_ID`) — this is completely separate from Olivia's chat voice (ElevenLabs/OpenAI). A presenter issue does NOT mean the Ask Olivia chat or voice is broken, and vice versa.

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Presenter toggle not showing | Ensure a Gamma report is loaded first |
| Live avatar not speaking | Check internet connection; avatar uses real-time HeyGen streaming |
| Video generation stuck | Allow up to 10 minutes; click Retry if it fails |
| Video won't play | Try different browser; check ad blockers |
| Download button not working | Wait for generation to complete (progress bar must reach 100%) |
| Olivia chat voice broken but presenter works | Separate systems — check ElevenLabs/OpenAI keys, not HeyGen |
| Presenter broken but chat voice works | Separate systems — check HeyGen keys, not ElevenLabs/OpenAI |

### 8.10 Cost Dashboard (Updated 2026-02-14)

Admin panel showing real-time API quota usage across all 16 providers. Access via the 💰 icon in the header.

**Key Information:**
- Color-coded quota indicators (green/yellow/orange/red)
- Automatic fallback activation when quotas exceeded
- Email alerts sent at warning thresholds

**$0.00 Display Fix (2026-02-14):** The Cost Dashboard previously showed $0.00 for Gamma, Olivia, TTS, Avatar, and Perplexity because database records were saved before those services completed. Fix: field-by-field merge taking higher values from localStorage + auto-sync back to DB. Perplexity API now correctly returns token usage data.

**If a customer reports $0.00 values:** Ask them to run a new comparison. The fix applies automatically. Historical data may still show $0.00 for comparisons run before the fix.

### 8.11 Emilia Help Assistant

Emilia is the in-app help widget (separate from Olivia):
- Floating help button in bottom corner
- Answers questions about app features
- Uses shimmer voice (OpenAI TTS fallback)
- Does NOT have access to comparison data

**Common Support Issues:**

| Issue | Solution |
|-------|----------|
| Emilia not appearing | Check if widget blocked by ad blocker |
| Voice not playing | Check browser audio permissions |
| Wrong answers | Emilia is for app help, redirect to Olivia for comparison questions |

---

## 9. Escalation Procedures

### 9.1 Escalation Levels

| Level | Handler | Timeframe | Issues |
|-------|---------|-----------|--------|
| L1 | Customer Service Rep | Immediate | Common issues, FAQs |
| L2 | Senior Support | 24 hours | Complex issues, refunds |
| L3 | Technical Support | 48 hours | Bugs, API errors |
| L4 | Engineering Team | 72 hours | Critical bugs, outages |

### 9.2 When to Escalate

**Escalate to L2:**
- Customer requests supervisor
- Refund request over $50
- Account security concerns
- Repeated failed resolutions

**Escalate to L3:**
- Consistent technical errors
- Data discrepancies
- API failures not resolved by retry
- Performance issues affecting multiple users

**Escalate to L4:**
- Site-wide outages
- Security breaches
- Critical data loss
- Payment system failures

### 9.3 Escalation Template

```
ESCALATION REQUEST

Customer: [Name/Email]
Tier: [FREE/NAVIGATOR/SOVEREIGN]
Issue: [Brief description]
Steps Taken: [What you tried]
Escalation Reason: [Why escalating]
Priority: [Low/Medium/High/Critical]
Attachments: [Screenshots, logs, etc.]
```

---

## 10. Communication Templates

### 10.1 Welcome Email Response

```
Subject: Welcome to LifeScore!

Hi [Name],

Thank you for joining LifeScore! We're excited to help you find your ideal city.

Quick Start:
1. Select two cities to compare
2. View your detailed Freedom Score results
3. Chat with Olivia for personalized insights

Your [TIER] plan includes:
- [X] comparisons per month
- [X] Olivia minutes (if applicable)
- [List other tier-specific features]

Need help? Reply to this email or visit our Help Center.

Best,
The LifeScore Team
```

### 10.2 Issue Acknowledgment

```
Subject: Re: [Original Subject]

Hi [Name],

Thank you for contacting LifeScore support. I understand you're experiencing [issue summary].

I'm looking into this now and will have an update for you within [timeframe].

In the meantime, you might try:
- [Suggested workaround if applicable]

Thank you for your patience!

Best,
[Your Name]
LifeScore Support
```

### 10.3 Issue Resolution

```
Subject: Re: [Original Subject] - RESOLVED

Hi [Name],

Great news! The issue with [description] has been resolved.

What was happening: [Brief explanation]
What we did: [Solution applied]

You should now be able to [expected behavior]. Please try again and let me know if you encounter any further issues.

Thank you for your patience and for being a LifeScore member!

Best,
[Your Name]
LifeScore Support
```

### 10.4 Refund Approval

```
Subject: Your LifeScore Refund

Hi [Name],

Your refund request has been approved.

Amount: $[X.XX]
Processing Time: 5-10 business days
Original Payment Method: [Card ending in XXXX]

Your subscription has been cancelled and you'll retain access until [date].

We're sorry LifeScore didn't meet your needs. If you have feedback on how we can improve, we'd love to hear it.

Best,
[Your Name]
LifeScore Support
```

### 10.5 Quota Warning Response Template

```
Subject: Re: API Quota Warning

Hi [Name],

You received an automated alert because your LifeScore usage reached [X]% of the [Provider] monthly quota.

What this means:
- Your account is still fully functional
- If the quota is exceeded, automatic fallback providers will be used
- Service quality may vary slightly during fallback

What you can do:
- Continue using LifeScore normally (fallbacks handle quota limits)
- Quotas reset on the 1st of each month
- Contact us if you have questions about your usage

Best,
[Your Name]
LifeScore Support
```

---

## 11. FAQs

### General

**Q: Is LifeScore free?**
A: LifeScore offers a FREE tier with 1 comparison per month. Paid tiers (NAVIGATOR $29/mo, SOVEREIGN $99/mo) offer more features and higher limits.

**Q: How accurate is the data?**
A: Our AI analyzes current legal information from authoritative sources. Each metric includes citations you can verify. Accuracy depends on available public data.

**Q: Can I compare international cities?**
A: Currently, we support 200 cities in North America and Europe. International expansion is planned.

**Q: Why did my video disappear after switching tabs?**
A: This was a known issue that has been fixed (2026-02-14). Videos on the Judge page now auto-restore from Supabase when you return to the tab. If a customer still reports this, ask them to refresh the page.

**Q: The Judge page looks different / I can't find my content**
A: The Judge page was redesigned with collapsible panels (2026-02-14). Content is organized into Media, Evidence, and Verdict panels. The Evidence and Verdict panels are collapsed by default — click the header bar to expand. No content was removed.

**Q: My Judge report only shows the executive summary, where are the categories?**
A: This was a bug fixed on 2026-02-14. All 6 freedom category sections now load correctly when viewing saved judge verdicts. Ask the customer to refresh or reload their saved report.

**Q: What is the "Go To My New City" video?**
A: A new personalized multi-scene cinematic video (added 2026-02-14) showing the winning city as a relocation destination. It appears at the bottom of the Judge Verdict panel when a report is loaded. Features Cluesnomads.com branding. SOVEREIGN tier only.

**Q: My Cost Dashboard shows $0.00 for some services**
A: This was a display bug fixed on 2026-02-14. Costs for Gamma, Olivia, TTS, Avatar, and Perplexity were not captured because the database saved before those services ran. The fix merges data from multiple sources. Ask the customer to run a new comparison — the fix applies automatically.

**Q: Saved report text is hard to read in dark mode**
A: Fixed on 2026-02-14. City names and dates in saved reports now display with proper contrast in dark mode. Ask the customer to refresh the page.

**Q: My Judge report disappeared after clearing browser cache**
A: Fixed on 2026-02-14. Judge reports now fall back to Supabase when localStorage is empty. The report should auto-load from the cloud. If it doesn't appear, ask the customer to check their internet connection and try the saved reports dropdown.

### Technical

**Q: Why do Law and Lived scores differ?**
A: Law scores reflect written legislation. Lived scores reflect actual enforcement. A city may have strict laws rarely enforced, or lenient laws strictly enforced.

**Q: What AI providers does LifeScore use?**
A: Claude Sonnet 4.5 (Anthropic), GPT-4o (OpenAI), Gemini 3 Pro (Google), Grok 4 (xAI), and Perplexity Sonar (Perplexity). Enhanced mode uses all five providers for consensus, with Claude Opus 4.5 as the final Judge.

**Q: How long does a comparison take?**
A: Standard: 2-3 minutes. Enhanced: 5-8 minutes. Video generation: 90-180 seconds.

### Billing

**Q: When will I be charged?**
A: Monthly subscriptions charge on signup and renew on the same day each month.

**Q: Can I switch tiers mid-cycle?**
A: Upgrades take effect immediately with pro-rated billing. Downgrades take effect at next billing cycle.

**Q: What happens if my payment fails?**
A: You'll receive an email notification. Access continues for 7 days while we retry. After 7 days, account reverts to FREE.

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **Comparison** | Side-by-side analysis of two cities |
| **Cost Dashboard** | Admin panel showing API quota usage across all providers |
| **Emilia** | In-app help widget assistant (separate from Olivia) |
| **Enhanced Mode** | Multi-LLM evaluation with consensus scoring |
| **Evidence** | Source citations supporting metric scores |
| **Fallback** | Backup provider activated when primary exceeds quota |
| **Freedom Score** | Overall city rating (0-100) |
| **Gamma Report** | PDF/PPTX presentation of results |
| **Judge** | AI (Claude Opus) that resolves LLM disagreements |
| **Law Score** | Rating based on written legislation |
| **Lived Score** | Rating based on actual enforcement |
| **LLM** | Large Language Model (AI provider) |
| **Metric** | Individual measurement within a category |
| **Olivia** | AI assistant for Q&A and guidance |
| **Quota** | Monthly usage limit for an API provider |
| **Standard Mode** | Single-LLM (Claude) evaluation |
| **Tavily** | Web search API for legal research |
| **Tier** | Subscription level (FREE/NAVIGATOR/SOVEREIGN) |
| **TTS** | Text-to-Speech - converts text to spoken audio |
| **Kling AI** | Primary video generation provider for Judge lifestyle videos |
| **Annual Subscription** | Yearly billing option with discounted rates (NAVIGATOR $249/yr, SOVEREIGN $899/yr) |
| **Court Order** | Judge verdict video saved for the winning city (Grok/Kling AI) |
| **Dual-Storage** | Save architecture writing to both localStorage and Supabase simultaneously |
| **Score Methodology** | 5-stage pipeline explainer card shown in results view |
| **App Prompts** | 50 system prompts across 6 categories, viewable/editable by admins in Help Modal > Prompts tab |
| **Blob URL** | Secure local video URL created from remote CDN content for reliable cross-origin playback |
| **Sequential Generation** | Videos generated one at a time (loser first, then winner) for reliability |
| **Olivia Presenter** | AI avatar video presenter that narrates Gamma report findings (live or pre-rendered) |
| **Live Presenter** | Real-time avatar overlay on Gamma report using HeyGen streaming |
| **Pre-Rendered Video** | Polished MP4 video of Olivia presenting report, generated by HeyGen |
| **PIP (Picture-in-Picture)** | Small avatar overlay that appears on top of the report iframe |
| **Collapsible Panel** | Expandable/collapsible UI section on the Judge page (Media, Evidence, Verdict) |
| **GoToMyNewCity** | Multi-scene cinematic relocation video for the winning city, shown in Judge Verdict panel |
| **HEAD Request Validation** | Server check to verify a video URL is still valid before displaying it to the user |
| **Voice Wave Indicator** | Animated visual feedback on PIP player showing when audio is actively playing |
| **Storyboard QA** | Word count and content validation step before video rendering begins |
| **Field-by-Field Merge** | Cost Dashboard technique that takes the higher value from localStorage vs database for each cost field |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
| 2.0 | 2026-01-30 | Claude Opus 4.5 | Phase 1 fixes: domain names, support channels, tier limits |
| 2.1 | 2026-01-30 | Claude Opus 4.5 | Phase 2: Added Cost Dashboard (§8.6), Emilia (§8.7), Quota Template (§10.5), glossary terms |
| 2.2 | 2026-01-30 | Claude Opus 4.5 | Phase 3: Kling AI docs, video timing fix, annual pricing, live chat clarification |
| 2.3 | 2026-02-02 | Claude Opus 4.5 | Fixed tier limits to match code: NAVIGATOR 1 comparison, SOVEREIGN 1 comparison/1 Gamma/1 Judge |
| 2.4 | 2026-02-04 | Claude Opus 4.5 | Fixed #48 video auto-reset, #49 Gemini retry, #50 cost tracking; updated §5.2 and §5.4 troubleshooting |
| 2.5 | 2026-02-05 | Claude Opus 4.5 | Session 9: Dual-storage save system, Tavily timeout fix, Gamma generationId fix, Score Methodology (§8.6), Court Orders (§8.7), updated AI model names, new glossary entries |
| 3.0 | 2026-02-13 | Claude Opus 4.6 | Video playback overhaul: blob URLs, sequential generation, expired URL detection, independent playback, progress bar fix (§5.4). Court Order permanent storage (§8.7). Grok Videos detail (§8.5). New glossary terms. |
| 3.1 | 2026-02-13 | Claude Opus 4.6 | Added Olivia Video Presenter (§8.8): live avatar + pre-rendered video mode with troubleshooting. New glossary terms (Olivia Presenter, Live Presenter, Pre-Rendered Video, PIP). Section renumbering (§8.9→8.10, §8.9→8.11). |
| 3.2 | 2026-02-14 | Claude Opus 4.6 | 5 bug fixes: (1) Gamma trophy 🏆 now placed on winner not loser (§5.5), (2) Gamma persistence — foreign key fix (§5.5), (3) backdrop-filter blur removed from 8 CSS files for INP, (4) Login input 247ms INP delay fixed (§5.1), (5) "Watch Presenter" → "Listen to Presenter" rename. |
| 3.3 | 2026-02-14 | Claude Opus 4.6 | Major Judge page update: collapsible panels (§8.3), GoToMyNewCity video (§8.7), auto-restore videos on tab switch, missing 6 category sections fix, Judge dropdown INP fix. Video URL expiration: HEAD request validation for all providers, Court Order URL fix, HeyGen URL fix, localStorage quota protection (§5.4). Cost Dashboard $0.00 fix (§8.10). Cristiano video CTA + poster (§8.4). AUDIO badge + voice wave (§8.9). Storyboard progress bar. Dark mode saved reports fix. Judge report Supabase fallback. New customer inquiries (§4.5-4.9). New FAQs (§11). New glossary terms (§12). |

---

*This manual is confidential and intended for internal customer service use only.*
