# LIFE SCORE Customer Service Manual

**Last Reviewed:** 4 October 2026
**Document ID:** LS-CSM-001
**For:** administrators and support staff (restricted in the admin panel)

How to answer LIFE SCORE customers accurately. What the product does is in the User Manual; this manual covers who we are, what each plan includes, the questions customers ask, the messages they see and what to do, account and privacy requests, billing and refunds, and escalation. Tables marked as coming from the app are written in from its code every time this manual is opened. Each written section names the code it describes and is brought up to date automatically when that code changes.

---

## 1. The company and how customers reach us
<!-- covers: src/legal/legalFacts.ts, src/shared/companyContact.ts -->

- **Company:** Clues Intelligence LTD, registered in England and Wales, company number 16966151 (D-U-N-S 234489716).
- **Registered office:** 167–169 Great Portland Street, 5th Floor, London W1W 5PF, United Kingdom. US office: 290 41st Ave, St. Pete Beach, FL 33706, USA.
- **Support and legal email:** info@cluesintelligence.com — the address every legal page gives.
- **Phone:** +1 (727) 452-3506.
- **In the app:** Emilia, the help assistant (the help button, *"Need help? Ask Emilia"*), answers from the manuals and the app itself; Olivia answers questions about a comparison.

There is no live chat line and no separate help-centre website. Customers write to the email above or ask Emilia.

**Reply times we promise** (from the legal pages): refund requests within 2 business days; privacy requests within 45 days; privacy appeals within 60 days.

---

## 2. What each plan includes
<!-- covers: api/shared/plans.ts, src/components/PricingModal.tsx -->

<!-- facts:plans -->
<!-- /facts:plans -->

Points customers ask about:

- **Allowances reset on the 1st of each month.**
- **Olivia** — the plans show "15 min" and "60 min" of Olivia; the app counts each message the customer sends as one from that allowance.
- **Enhanced comparisons** need SOVEREIGN. A standard comparison uses Claude; an enhanced one uses five AI models with Claude Opus as judge.
- **Annual plans:** NAVIGATOR $249/year, SOVEREIGN $899/year.

**Beta testers** (invited, listed in the `beta_testers` table by email): comparisons as set on their row (1 standard and 1 enhanced unless raised), unlimited Olivia, judge videos, visual reports, city clips and Cristiano videos; Moving Movies are not included.

**Administrators** (the founders' list in `api/shared/plans.ts` plus any address in the `DEV_BYPASS_EMAILS` setting) have every feature without limits.

---

## 3. What customers ask, and the answer
<!-- covers: src/components/CitySelector.tsx, src/components/NotifyMeModal.tsx, src/components/Results.tsx, api/shared/entitlements.ts, src/components/SavedComparisons.tsx -->

**"How long does a comparison take?"** — the app estimates about 90 seconds for a standard comparison; an enhanced one runs five models and takes longer. Customers can choose **Notify Me & Go** and get an in-app notification (and an email if they chose it) when it is ready.

**"Can you add my city?"** — comparisons cover the 200 metropolitan areas in the city list (North America and Europe). New cities are added by the team; note the request and escalate it as a product request.

**"How current is the data?"** — every comparison researches each metric with live web search at the time it runs. Results reflect what the sources said that day; the Evidence & Citations panel shows them.

**"My results don't match my expectations."** — the scores and the reasoning behind every metric are shown; point the customer to **Evidence & Citations**, to the per-model analysis (click a metric marked ▶), and to **Customize Priorities**, which changes the category weights and the Law vs Lived balance. A result the customer did not expect is not a fault (Refund Policy, "A note on results").

**"Why was my Judge's Report refused?"** — on the free plan the Judge's Report can be generated for a comparison run in the last 30 days; on a paid plan, for any comparison.

**"Where did my saved comparison go?"** — saved items sync to the account on every device. **Clear All** on the Saved tab removes only the copies on that device; account copies come back at the next sync. A comparison that was never saved is not kept.

**"Is my data secure? Who can see my comparisons?"** — only the customer. The database lets each customer read only their own comparisons, reports, Olivia conversations, preferences, plan and usage. City films and cached city research are shared between customers and hold no personal information. Payments are handled by Stripe; we never see card numbers.

---

## 4. Messages customers see, and what to do
<!-- covers: api/shared/entitlements.ts, src/components/LoginScreen.tsx, src/hooks/useComparison.ts, api/olivia/chat.ts, src/hooks/useJudgeVideo.ts, src/hooks/useGrokVideo.ts, src/main.tsx -->

| The customer sees | What it means | What to do |
|---|---|---|
| *"This feature needs the NAVIGATOR plan."* (or SOVEREIGN) | Their plan does not include it | Explain the plans (section 2); they can upgrade from the app |
| *"You have used this month's allowance (x of y). It resets on the 1st, or upgrade for more."* | Monthly limit reached | Wait for the 1st or upgrade. If a failure used up the allowance, credit it back (section 6) |
| *"We could not check your plan just now. Please try again in a minute."* | The plan check could not reach the database | Ask them to retry; if it persists, escalate (technical) |
| *"This comparison session has expired. Please run the comparison again."* | The comparison's access window passed | Run the comparison again |
| *"Please verify your email before signing in."* | Email not confirmed | Open the verification link from the sign-up email (check spam) |
| *"This email is already registered."* | Account exists | Sign in, or reset the password |
| *"Password must be at least 6 characters"* | Password too short | Choose a longer one |
| *"All evaluation categories failed — please try again"* / *"Comparison failed: …"* | The AI research failed | Retry; if it repeats, escalate (technical) with the cities and time |
| *"Olivia could not answer just now. Please try again."* | Olivia's answer failed (the message is not counted) | Retry |
| *"Olivia is unavailable right now. Please try again shortly."* | Olivia's knowledge could not load | Escalate (technical) |
| *"The video is taking too long. Please try again."* / *"Video generation timed out"* | A video did not finish in time | Retry from the same screen; if repeated, escalate |
| *"Could not check on the video. Please try again."* | Status checks kept failing | Retry; escalate if repeated |
| *"No internet connection — some features may not work"* | The device went offline | Reconnect; the app says *"Back online"* |

A screen that fails right after we release an update reloads itself once to load the new version; if it still fails, ask the customer to reload the page.

---

## 5. Account and privacy requests
<!-- covers: src/components/SettingsModal.tsx, api/user/export.ts, api/user/delete.ts, src/legal/legalContent.ts -->

Customers handle most requests themselves in **Settings**:

| Request | Where |
|---|---|
| Change name | Settings → Profile |
| Change email address | Not in the app: the customer writes to info@cluesintelligence.com from the current address; escalate to an administrator to change it |
| Change password | Settings → Security, or **Forgot your password?** on the sign-in screen |
| Copy of their data (access, portability) | Settings → Data → **Download My Data** (one JSON file) |
| Delete the account | Settings → Data → **Delete My Account** (type DELETE MY ACCOUNT). The subscription is cancelled first, then the account and all its data are deleted at once |
| Opt out of sale or sharing | Footer → **Do Not Sell or Share My Personal Information** (we do not sell or share data; the opt-out is recorded, and Global Privacy Control signals are honoured) |
| Cookie choices | Footer → **Cookie Settings** |

**Requests by email** (GDPR, CCPA/CPRA and other US state laws): verify that the request comes from the account's email address before acting; respond within 45 days. Someone the customer authorises in writing may make the request. If we decline, we say why; the customer may appeal by writing with "Privacy Appeal" in the subject, answered in writing within 60 days. The full rules are the **Privacy** and **US State Privacy Rights** pages in the app.

**Trademark and licensing questions** — LIFE SCORE™, CLUES™, SMART™ and the personas Olivia, Cristiano and Emilia belong to Clues Intelligence LTD (the **License** manual). Escalate any request to use them, or to license the technology, to the founders.

---

## 6. Billing and refunds
<!-- covers: src/legal/legalContent.ts, src/components/SettingsModal.tsx, api/shared/plans.ts -->

Payments run through Stripe. Customers change plan, update their card, see invoices and cancel on Stripe's billing page: **Settings → Subscription → Manage Subscription**.

The Refund Policy (in the app's footer) is the rule:
- **Monthly plans** — cancel any time; access continues to the end of the paid month; the current month is not refunded.
- **Annual plans** — cancel within 14 days of purchase for a full refund, less the value of reports and videos already generated; after 14 days, access continues to the end of the paid year without a refund.
- **Billing errors** (an unauthorised or duplicate charge) — refunded in full.
- **A failure on our side** (a report or video that failed) — credit it back to the allowance or refund it. A delivered report with significant errors reported within 7 days — investigate, then repair, replace or refund.
- **Not refundable** (subject to statutory rights): reports and videos already generated, subscriptions cancelled after the window, accounts ended for breaking the terms, promotional purchases.
- Statutory consumer rights (UK Consumer Rights Act 2015, EU law, Australian Consumer Law) always apply.

**How a customer asks:** by writing to info@cluesintelligence.com from the account email with the date of the charge or the item. Reply within 2 business days. Approved refunds go to the original payment method and usually arrive in 5–10 business days. Refunds are issued from the Stripe dashboard.

**Crediting back an allowance** — an administrator lowers the customer's count for the month in the `usage_tracking` table (columns: `standard_comparisons`, `enhanced_comparisons`, `olivia_messages`, `judge_videos`, `gamma_reports`, `grok_videos`, `cristiano_videos`).

---

## 7. Escalation
<!-- covers: src/legal/legalFacts.ts -->

| Level | Who | For |
|---|---|---|
| 1 | Support | Questions answered by this manual and the User Manual |
| 2 | Administrator | Account changes (email address), allowance credits, refunds, beta access |
| 3 | Technical (Tech Support Manual) | Repeated failures, *"could not check your plan"*, Olivia unavailable, anything that looks like a fault |
| 4 | Founders | Legal, privacy disputes, trademark and licensing, press |

Escalate with: the customer's account email, what they did, the exact message they saw, the date and time, and the cities or report involved.

---

## 8. Reply templates

**Acknowledgment**
> Thank you for contacting LIFE SCORE. We have received your message about [issue] and will reply within 2 business days. — LIFE SCORE Support, info@cluesintelligence.com

**Resolution**
> Hello [name], [what we found and what we did]. If anything is still not right, reply to this email. — LIFE SCORE Support

**Refund approved**
> Hello [name], we have refunded [amount] for [item/charge] to your original payment method. It usually arrives within 5–10 business days. — LIFE SCORE Support

**Allowance reached**
> Hello [name], your [feature] allowance for this month is used ([x] of [y]). It resets on the 1st, or you can upgrade from **Upgrade** in the app. — LIFE SCORE Support

---

## 9. Glossary

- **Law score / Lived score** — what the written law allows, and how it is enforced day to day; each metric gets both.
- **Standard comparison** — one AI model (Claude) scores all 100 metrics.
- **Enhanced comparison** — five AI models score them and Claude Opus judges the consensus (SOVEREIGN).
- **Judge's Report** — Cristiano's written verdict on a comparison.
- **Freedom Video Clip** — a short clip of life in the winning city.
- **Moving Movie** — a film made with InVideo from a 12-scene screenplay (SOVEREIGN).
- **Freedom Tour** — Cristiano's 7-scene film of the new city (SOVEREIGN, one a month).
- **Gamma report** — the visual report (35 or 82 pages) on the Visuals tab.
- **Olivia** — the AI advisor. **Emilia** — the help assistant. **Cristiano** — the Judge.
- **Allowance** — what a plan includes each month; resets on the 1st.
