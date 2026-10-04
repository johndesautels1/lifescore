# LIFE SCORE User Manual

**Last Reviewed:** 4 October 2026
**Document ID:** LS-UM-001

This manual describes LIFE SCORE as it is built today. Tables marked as coming from the app (plans, categories, metrics) are written in from the app's own code every time this manual is opened, so they are always current. Each written section names the screens it describes; when those screens change, the section is brought up to date automatically.

---

## 1. What LIFE SCORE is
<!-- covers: src/components/Header.tsx, src/components/HomeHero.tsx, src/components/CitySelector.tsx -->

LIFE SCORE (Legal Independence & Freedom Evaluation) compares legal and lived freedom between two cities across 100 metrics in six categories. For every metric it scores two things:

- **Law** — what the written law permits or restricts.
- **Lived** — how the rules are actually enforced day to day.

AI models research each metric with live web search, score both cities, and the scores roll up by category into each city's total LIFE SCORE. The city with the higher total wins.

The six categories and their default weights:

<!-- facts:categories -->
<!-- /facts:categories -->

---

## 2. Signing in
<!-- covers: src/components/LoginScreen.tsx, src/components/ResetPasswordScreen.tsx -->

You need an account to use LIFE SCORE; the app opens on the sign-in screen until you sign in.

**Create an account** — choose **Sign Up**, enter your email, a password of at least 6 characters (twice), and optionally your full name, then **Create Account**. The app asks you to confirm your email address: check your inbox (and spam folder) for the verification link before signing in. You can also continue with **Google**.

**Sign in** — choose **Sign In**, enter your email and password, and **Sign In** (or use **Google**). Tick **Remember me** to have the email filled in next time; your browser's password manager can keep the password.

**Forgot your password** — on the sign-in screen choose **Forgot your password?**, enter your email and **Send Reset Link**. The app says: *"Password reset link sent! Please check your email (including spam/junk folder). The link expires in 1 hour."* Open the link from the email; LIFE SCORE opens on **Set New Password**. Enter the new password twice (at least 6 characters) and **Update Password**; after *"Password updated successfully! Redirecting..."* you are taken into the app. **Skip — go to app** leaves your password unchanged. Your comparisons, reports and settings are untouched by a reset.

---

## 3. Finding your way around
<!-- covers: src/components/Header.tsx, src/components/TabNavigation.tsx, src/components/Footer.tsx, src/components/HelpBubble.tsx, src/components/OliviaChatBubble.tsx -->

**The top bar** — on the left, the light/dark theme switch. On the right: your plan badge (or **Upgrade** on the free plan), the notification bell, **Settings**, your name and the sign-out button. Beneath the bar: CLUES INTELLIGENCE LTD, the CLUES line, the phone number and the LIFE SCORE title.

**The tabs** — seven, each with its own 3D icon:

| Tab | What it is for |
|---|---|
| **Compare** | Choose two cities and run a comparison (section 4) |
| **Results** | The scores of the comparison you are viewing (section 5) |
| **Judges Report** | The Judge's written verdict and the videos (section 6) |
| **Visuals** | Visual reports, the Olivia presenter and charts (section 7) |
| **Ask Olivia** | Talk with Olivia, by text or video (section 8) |
| **Saved** | Your saved comparisons and reports (section 9) |
| **About** | About CLUES and the company |

Use the arrow keys, Home and End to move between tabs from the keyboard.

**Always on screen** — the Olivia chat bubble (section 8) and the help button, *"Need help? Ask Emilia"* (section 12).

**The footer** — company and contact details, the legal pages (Privacy, Terms, Cookies, Acceptable Use, Refunds, Do Not Sell or Share My Personal Information, US State Privacy Rights), **Cookie Settings**, **Plans and prices** and **About Clues Intelligence**.

---

## 4. Running a comparison
<!-- covers: src/components/CitySelector.tsx, src/components/NotifyMeModal.tsx, src/components/HomeHero.tsx -->

1. Open **Compare**.
2. Choose **City 1** and **City 2**. Type to search; the list holds 200 metropolitan areas in North America and Europe, each shown with its country's flag. Or pick one of the **Popular Comparisons**.
3. Optionally set your priorities (4.2) and dealbreakers (4.3).
4. Press **Compare LIFE SCORES**. While it runs the button reads *"Analyzing 100 Metrics..."*.
5. The app may ask whether to **Wait Here** or **Notify Me & Go**. If you choose to be notified, you can leave; when the comparison is ready you get a notification in the app (the bell) and, if you chose it, an email.

**Share Link** copies a link that opens LIFE SCORE with the same two cities chosen.

### 4.1 Standard and Enhanced comparisons
<!-- covers: src/components/EnhancedComparison.tsx, src/hooks/useComparison.ts, api/shared/models.ts -->

- **Standard** — one AI model (Claude) researches and scores all 100 metrics. Included on every plan.
- **Enhanced** — five AI models (Claude, GPT, Gemini, Grok and Perplexity) evaluate each metric, and Claude Opus acts as the final judge. Switch it on with the **Enhanced Mode** toggle above the city choice (SOVEREIGN plan). After you press Compare, the button reads *"Select AI Models Below to Begin"*: click one or more of the AI models to start them. Once two or more have finished, the Opus Judge builds the consensus, and it updates as more models finish.

### 4.2 Customize Priorities
<!-- covers: src/components/WeightPresets.tsx -->

Open **Customize Priorities** to decide what matters to you. Everything you set here is saved and applies to every comparison you run.

- **Presets** — Balanced, Digital Nomad, Entrepreneur, Family, Libertarian and Investor each set the six category weights (and their own Law/Lived balance).
- **Fine-tune Weights** — a slider per category (0–50%); the total must come to 100%. **Lock** a category to keep its share while you move the others.
- **Exclude** — untick a category to leave it out entirely; its weight is shared among the rest.
- **Law vs Lived** — how much the written law counts against day-to-day enforcement (default 50/50).
- **Worst-case mode** — use the lower of the Law and Lived scores for every metric.

### 4.3 Dealbreakers
<!-- covers: src/components/DealbreakersPanel.tsx -->

In **Dealbreakers**, mark the metrics you cannot live without, chosen by category (metrics are listed A–Z). Your dealbreakers are saved with your preferences and are checked against both cities in the results.

---

## 5. Reading your results
<!-- covers: src/components/Results.tsx, src/components/ScoreMethodology.tsx, src/components/EvidencePanel.tsx -->

**The winner** — the top card names the winner and its **Total LIFE SCORE** (or *"It's a Tie!"*). **Explain This Winner** opens an explanation of where the winning city leads.

**Category Breakdown** — both cities' scores in each of the six categories. Click a category to see its metrics; click a metric marked ▶ to see each AI model's analysis. Each result shows its confidence (High, Medium or Low).

**How Your LIFE SCORE Is Calculated** — the explainer card describes the method:
- every metric gets a Legal Score and an Enforcement Score (0–100), averaged into the metric's freedom score;
- in Enhanced mode the models' scores are combined with confidence weights (High 1.0×, Medium 0.7×, Low 0.4×);
- the Opus Judge looks at metrics where the models disagree by more than 15 points and may override those scores, with written reasoning;
- metrics roll up into the six categories with your weights; a city earns points for each category it leads by more than 5 points, and half the largest category gap is added to the overall leader.

**Evidence & Citations** — the sources behind the scores, filterable by city: titles, links and quoted passages from the web searches the models ran.

### 5.1 Enhanced results
<!-- covers: src/components/EnhancedComparison.tsx -->

An Enhanced comparison adds the **Consensus LIFE SCORE** and the **Freedom Delta**, and shows where the models agreed and disagreed: **Unanimous** (all within 3 points), **Strong** (within 8 points), the metrics with the widest disagreement, and the most reliable, high-agreement metrics.

---

## 6. The Judge's Report
<!-- covers: src/components/JudgeTab.tsx, api/shared/entitlements.ts -->

Open **Judges Report**, choose the comparison (from the one you just ran, or **Select a Saved Report**, Standard or Enhanced), and press **Generate Judge's Verdict**. Cristiano, the Judge, writes:

- **The Judge's Verdict**, with its confidence;
- a **Summary of Findings** and a **Detailed Category Analysis**;
- an **Executive Summary**, the **Key Factors**, the **Future Outlook** and a personalized recommendation.

Alongside it: score confidence, how many metrics and models were used, overall agreement and the key disagreements. **Save Report** keeps it in your account, **Download PDF** saves it as a file, and **Share** copies a summary.

You can generate the Judge's Report for any comparison you ran in the last 30 days; on a paid plan, for any comparison.

### 6.1 Videos in the Judge's Report
<!-- covers: src/components/JudgeTab.tsx, src/components/CourtOrderVideo.tsx, src/components/GoToMyNewCity.tsx, src/components/MovieGenerator.tsx -->

- **Video Report by Cristiano** — **Generate Video Report** turns the verdict into a video of Cristiano presenting it. **Download Video** saves it.
- **Freedom Video Clip** — a short cinematic clip of life in the winning city (**See Video Clip** / **Play Your Video**). You can save, download and share it.
- **Freedom Journey Movie (Moving Movie)** — **Create My Moving Movie** writes a 12-scene screenplay and makes a film with InVideo AI. When InVideo cannot make it automatically, the screenplay is kept for you (**Open InVideo AI**) and the reason is shown.
- **Go To My New City** — Cristiano's 7-scene cinematic Freedom Tour of your new city (**Watch Freedom Tour**). SOVEREIGN, one a month.

Which videos your plan includes is in section 11. Videos are made by outside services and take a few minutes; the screen shows the progress and lets you cancel or retry.

---

## 7. Visuals
<!-- covers: src/components/VisualsTab.tsx, src/components/ReportPresenter.tsx, src/components/GunComparisonModal.tsx, src/components/NewLifeVideos.tsx -->

**Generate a New Report** creates a visual report of a comparison with Gamma:
- **Report Type** — **Standard (30 pages)** or **Enhanced (82 pages)** (Enhanced needs an Enhanced comparison);
- **Include Gun Rights Comparison** adds 4 pages; gun rights are not scored — facts only, no winner;
- **Export Format** — PDF or PowerPoint.

When it is ready you can **Download PDF** or **Download PPTX**, or **Generate Another**. If you already have a report for that comparison the app says so.

**View Existing Report** opens a saved report, three ways:
- **Read** — the report itself, here or in a new tab;
- **Live Presenter** — Olivia presents the report live, segment by segment (pause, back, next);
- **Generate Video** — an HD 1080p MP4 of Olivia presenting the report, ready to download (a few minutes to render).

**City Life Videos** — two contrasting clips, *Freedom* for the winning city and *Imprisonment* for the other (**See Your New Life!**). Enhanced comparisons only.

---

## 8. Ask Olivia
<!-- covers: src/components/AskOlivia.tsx, src/components/OliviaChatBubble.tsx, api/olivia/chat.ts, api/shared/plans.ts -->

Olivia is LIFE SCORE's AI advisor. She knows the comparison you are viewing and the whole app as it is today: its screens, features, prices and settings.

**On the Ask Olivia tab** — choose a saved comparison from the drop-down, or **General Chat** to talk without one. Type and **Send**, or speak; **Start Video Chat** shows Olivia's live face. **Quick Briefing** gives instant analysis on a topic once a comparison is loaded. The transcript can be saved, downloaded, forwarded or cleared.

**The chat bubble** — on every tab: ask Olivia anything; save, share or print the conversation; stop her voice.

**Your allowance** — every message you send Olivia counts as one from your monthly Olivia allowance (section 11). The free plan does not include Olivia. When the allowance is used up, the bubble says so and offers **Upgrade**.

---

## 9. Saved
<!-- covers: src/components/SavedComparisons.tsx -->

**My Saved Comparisons** lists every comparison you saved (Standard or Enhanced) and your visual reports (Gamma and Judge). For each you can open it, add or edit a note, or delete it; for reports, view, download (PDF/PPTX) or watch the video.

Signed in, your saved items are kept in your account and synced to every device you sign in on. You can also:
- **Export** your saved comparisons to a file, and **Import** them back;
- **Clear All** removes the copies kept on this device (anything saved to your account returns at the next sync);
- **Connect GitHub** to keep a backup copy in a private GitHub Gist (needs a personal access token with the *gist* scope).

---

## 10. Settings and your data
<!-- covers: src/components/SettingsModal.tsx, api/user/export.ts, api/user/delete.ts -->

Open **Settings** from the top bar.

- **Profile** — your full name. To change your email address, contact support.
- **Security** — change your password; see how you sign in.
- **Subscription** — your current plan, **Upgrade Plan**, and Stripe's billing page to change plan, update your card, see invoices or cancel.
- **Data** —
  - how much of this browser's local storage LIFE SCORE uses, and **Clear Local Data** (removes saved items from this device only);
  - **Download My Data** — everything your account holds, as a file;
  - **Delete My Account** — type DELETE MY ACCOUNT to confirm. Your subscription is cancelled first, then your account and all its data are deleted at once.

---

## 11. Plans
<!-- covers: src/components/PricingModal.tsx, api/shared/plans.ts -->

Upgrade from **Upgrade** in the top bar, **Upgrade Plan** in Settings, or **Plans and prices** in the footer. Payment is handled by Stripe; you can cancel at any time from the billing page.

What each plan includes (from the app's own plan list):

<!-- facts:plans -->
<!-- /facts:plans -->

`oliviaMinutesPerMonth` is the Olivia allowance; each message to Olivia counts as one. When a plan feature is not included, the app shows what it needs and offers the upgrade; you can dismiss it and carry on with what your plan includes.

---

## 12. Help and Emilia
<!-- covers: src/components/HelpBubble.tsx, src/components/HelpModal.tsx, src/components/EmiliaChat.tsx, api/emilia/message.ts -->

The help button (*"Need help? Ask Emilia"*) opens **Help**:
- the **User Manual** and the **License** for everyone; the other manuals for administrators;
- **Ask Emilia** — LIFE SCORE's help assistant. Ask how to do something, what a feature does or why something happened; she answers from the manuals and the app itself as it is today. You can download, print, email or clear the conversation.

---

## 13. Privacy, cookies and legal
<!-- covers: src/components/CookieConsent.tsx, src/legal/legalContent.ts, src/components/Footer.tsx -->

On your first visit the cookie banner offers **Essential Only**, **Customize** or **Accept All**. Essential cookies (sign-in and core functions) are always on; functional and analytics cookies are your choice; marketing cookies are not used. Change your choice any time with **Cookie Settings** in the footer.

The legal pages in the footer are the full and current terms: Privacy, Terms, Cookies, Acceptable Use, Refunds, Do Not Sell or Share My Personal Information, and US State Privacy Rights. Your data rights are exercised in **Settings → Data** (download, delete) or by writing to the contact address on the Privacy page.

---

## 14. On a phone
<!-- covers: src/components/MobileWarningModal.tsx, src/components/TabNavigation.tsx -->

LIFE SCORE works on phones; a first-visit notice (*"Desktop Recommended"*) explains that some features are easier on a larger screen — **Got It — Continue on Mobile** closes it. On a narrow screen the tab bar scrolls sideways.

---

## 15. When something goes wrong
<!-- covers: src/main.tsx, src/components/LoginScreen.tsx -->

- **No internet connection** — the app says *"No internet connection — some features may not work"* and *"Back online"* when it returns.
- **A screen fails right after an update** — the app reloads itself once to fetch the new version; if a screen still fails, reload the page.
- **"Please verify your email before signing in"** — open the verification link from the sign-up email (check spam), then sign in.
- **"This email is already registered"** — sign in instead, or reset your password.
- **A video or report did not finish** — use **Retry** or **Try Again** on that screen.
- Anything else — ask Emilia (section 12).

---

## 16. The 100 metrics

Every metric LIFE SCORE scores, by category (from the app's own metric list):

<!-- facts:metrics -->
<!-- /facts:metrics -->

---

*© Clues Intelligence LTD. LIFE SCORE™, CLUES™ and SMART™ are trademarks of Clues Intelligence LTD.*
