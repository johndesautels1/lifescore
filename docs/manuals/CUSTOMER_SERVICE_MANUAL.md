# LifeScore Customer Service Manual

**Version:** 2.2
**Last Updated:** January 30, 2026
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
| Email Support (support@clueslifescore.com) | 24/7 | 24 hours |
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
| Cloud Sync | ❌ | ✅ | ✅ |
| Local Browser Storage | ✅ | ✅ | ✅ |
| Comparison History | Local | Cloud | Cloud |

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

---

## 5. Troubleshooting Guide

### 5.1 Login Issues

| Issue | Solution |
|-------|----------|
| "Invalid email or password" | Verify email spelling; use "Forgot Password" link |
| "Email not verified" | Check spam folder; resend verification email |
| "Account locked" | Wait 30 minutes or contact support for unlock |
| Google/GitHub SSO failure | Clear cookies; try incognito mode |

### 5.2 Comparison Failures

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Evaluation timed out" | AI provider slow/unavailable | Retry in 5 minutes |
| "Rate limit exceeded" | Too many requests | Wait 1 minute, retry |
| "API error" | Provider temporarily down | Try different comparison |
| "No data available" | Metrics couldn't be evaluated | Contact support |

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
| Video stuck on "Generating" | Allow up to 90-180 seconds; refresh if longer |
| Video playback error | Try different browser; check internet speed |
| "Video generation failed" | Retry; if persistent, contact support |

### 5.5 Gamma Report Issues

| Issue | Solution |
|-------|----------|
| Report not generating | Ensure comparison completed first |
| PDF download fails | Try PPTX format instead; clear cache |
| Report shows wrong data | Regenerate from fresh comparison |

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

### 8.3 Judge Videos

Animated video summaries featuring:
- AI judge character (Christiano)
- Verbal explanation of winner
- Key factors highlighted
- 30-60 second duration

### 8.4 Gamma Reports

Professional presentation-style reports including:
- Executive summary
- Category breakdowns
- Visual charts
- Exportable to PDF/PPTX

### 8.5 Grok Videos (SOVEREIGN only)

AI-generated lifestyle videos powered by **Kling AI** (primary video generation provider):
- "Freedom" mood video for winning city
- "Imprisonment" mood video for losing city
- Contrast visualization
- Generation takes 90-180 seconds

### 8.6 Cost Dashboard

Admin panel showing real-time API quota usage across all 16 providers. Access via the 💰 icon in the header.

**Key Information:**
- Color-coded quota indicators (green/yellow/orange/red)
- Automatic fallback activation when quotas exceeded
- Email alerts sent at warning thresholds

### 8.7 Emilia Help Assistant

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

### Technical

**Q: Why do Law and Lived scores differ?**
A: Law scores reflect written legislation. Lived scores reflect actual enforcement. A city may have strict laws rarely enforced, or lenient laws strictly enforced.

**Q: What AI providers does LifeScore use?**
A: Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), Grok (xAI), and Perplexity. Enhanced mode uses multiple providers for consensus.

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

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
| 2.0 | 2026-01-30 | Claude Opus 4.5 | Phase 1 fixes: domain names, support channels, tier limits |
| 2.1 | 2026-01-30 | Claude Opus 4.5 | Phase 2: Added Cost Dashboard (§8.6), Emilia (§8.7), Quota Template (§10.5), glossary terms |
| 2.2 | 2026-01-30 | Claude Opus 4.5 | Phase 3: Kling AI docs, video timing fix, annual pricing, live chat clarification |
| 2.3 | 2026-02-02 | Claude Opus 4.5 | Fixed tier limits to match code: NAVIGATOR 1 comparison, SOVEREIGN 1 comparison/1 Gamma/1 Judge |

---

*This manual is confidential and intended for internal customer service use only.*
