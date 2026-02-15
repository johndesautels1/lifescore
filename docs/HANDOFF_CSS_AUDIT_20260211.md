# HANDOFF: CSS Bleed-Through Audit + Bug Fixes

**Date:** February 11, 2026
**Session ID:** LIFESCORE-AUDIT-20260211-001
**From:** Claude Agent (session claude/lifescore-debug-42MtS)
**To:** Next Claude Agent

---

## CRITICAL: BRANCH INFORMATION

### YOU MUST COMMIT TO THIS EXACT BRANCH:
```
claude/lifescore-debug-42MtS
```

**DO NOT create a new branch. DO NOT commit to `main` or `master`.**

The branch `claude/lifescore-debug-42MtS` is the active development branch. It is:
- Already pushed to `origin/claude/lifescore-debug-42MtS`
- 130+ commits ahead of `origin/main`
- Contains ALL work from today (34 commits) plus prior agent work (98 merged commits)
- **NOT yet merged into main** — that happens ONLY after all fixes are complete and verified

### Git Workflow for Every Fix:
```bash
git checkout claude/lifescore-debug-42MtS
# ... make changes ...
git add <specific-files>
git commit -m "fix(css): description of fix

Co-Authored-By: Claude"
git push -u origin claude/lifescore-debug-42MtS
```

### DO NOT:
- Push to `main` or `master`
- Create a new branch
- Force push
- Merge into main (the human will do this when ready)

---

## TASK 1: Fix All CSS Bleed-Throughs (84 instances across 33 files)

An exhaustive audit of all 46 CSS files has been completed. Below is the complete table of every unscoped CSS selector that can leak styles between components. The fix for each is to scope the selector under its component's wrapper class.

### Fix Strategy

For each unscoped selector, wrap it under the component's root class. Example:

**Before (BROKEN):**
```css
.error-icon {
  font-size: 1.5rem;
}
```

**After (FIXED):**
```css
.olivia-avatar .error-icon {
  font-size: 1.5rem;
}
```

Each CSS file has a known root wrapper class (listed in the table below). Scope ALL unscoped selectors under that wrapper. Also scope any `@media` queries and `[data-theme="dark"]` rules that reference these selectors.

---

### CRITICAL SEVERITY (10 items — Active visual breakage)

| # | Selector | File | Line | Conflicts With | Root Wrapper to Scope Under |
|---|----------|------|------|---------------|---------------------------|
| 1 | `.action-btn` | PricingPage.css | 368 | SavedComparisons.css (32x32 icon vs full-width CTA) | `.pricing-page` |
| 2 | `.action-btn` (dark mode) | CostDashboard.css | 621 | PricingPage.css, SavedComparisons.css | `.cost-dashboard` |
| 3 | `.message-avatar` | EmiliaChat.css | 211 | OliviaChatBubble.css (32px vs 28px) | `.emilia-chat` |
| 4 | `.message-bubble` | EmiliaChat.css | 228 | OliviaChatBubble.css | `.emilia-chat` |
| 5 | `.message-footer` | EmiliaChat.css | 260 | OliviaChatBubble.css | `.emilia-chat` |
| 6 | `.message-time` | EmiliaChat.css | 268 | OliviaChatBubble.css | `.emilia-chat` |
| 7 | `.message-content` | EmiliaChat.css | 245 | OliviaChatBubble.css | `.emilia-chat` |
| 8 | `.score-box` | Results.css | 150 | globals.css | `.results-container` or `.results` |
| 9 | `.card-header` | PricingPage.css | 255 | LoginScreen.css, CostDashboard.css | `.pricing-page` |
| 10 | `.spinner` | LoginScreen.css | 376 | globals.css, VisualsTab.css, NewLifeVideos.css | `.login-screen` |

**Also scope the OliviaChatBubble.css side:**

| # | Selector | File | Line | Root Wrapper |
|---|----------|------|------|-------------|
| 3b | `.message-avatar` | OliviaChatBubble.css | 435 | `.olivia-chat-bubble` |
| 4b | `.message-bubble` | OliviaChatBubble.css | 449 | `.olivia-chat-bubble` |
| 5b | `.message-footer` | OliviaChatBubble.css | 476 | `.olivia-chat-bubble` |
| 6b | `.message-time` | OliviaChatBubble.css | 484 | `.olivia-chat-bubble` |

---

### HIGH SEVERITY (16 items — 3+ files define same selector)

| # | Selector | Files (all need scoping) | Wrapper Classes |
|---|----------|--------------------------|----------------|
| 11 | `.section-title` | CitySelector.css:9, App.css, JudgeTab.css, WeightPresets.css:465, ManualViewer.css:237 | `.city-selector`, `.app`, `.judge-tab`, `.weight-presets`, `.manual-viewer` |
| 12 | `.error-icon` | OliviaChatBubble.css:585, AskOlivia.css, OliviaAvatar.css:138, JudgeVideo.css:237, VisualsTab.css:445, App.css | `.olivia-chat-bubble`, `.ask-olivia`, `.olivia-avatar`, `.judge-video`, `.gamma-section`, `.app` |
| 13 | `.retry-btn` | OliviaAvatar.css:149, JudgeVideo.css:249, VisualsTab.css:458, AskOlivia.css | `.olivia-avatar`, `.judge-video`, `.gamma-section`, `.ask-olivia` |
| 14 | `.progress-bar` | globals.css, LoadingState.css:59, VisualsTab.css:255, UsageWarningBanner.css:207, NewLifeVideos.css:387 | (globals = keep global OR scope), `.loading-state`, `.gamma-section`, `.usage-warning-banner`, `.new-life-videos` |
| 15 | `.progress-fill` | globals.css, LoadingState.css:66, VisualsTab.css:264, NewLifeVideos.css:395 | Same as above |
| 16 | `.btn-icon` | AskOlivia.css:695 (2rem!), JudgeVideo.css:273, NewLifeVideos.css:499, CourtOrderVideo.css:400 | `.ask-olivia`, `.judge-video`, `.new-life-videos`, `.court-order-video` |
| 17 | `.btn-text` | AskOlivia.css:700, NewLifeVideos.css:503 | `.ask-olivia`, `.new-life-videos` |
| 18 | `.generate-btn` | JudgeVideo.css:249, VisualsTab.css:176, NewLifeVideos.css:467, CourtOrderVideo.css | `.judge-video`, `.gamma-section`, `.new-life-videos`, `.court-order-video` |
| 19 | `.error-message` | OliviaAvatar.css:142, JudgeVideo.css:243, VisualsTab.css:437, ContrastDisplays.css | `.olivia-avatar`, `.judge-video`, `.gamma-section`, `.contrast-displays` |
| 20 | `.category-name` | globals.css, Results.css:286, DealbreakersPanel.css:200 | (globals = keep or scope), `.results-container`, `.dealbreakers-panel` |
| 21 | `.category-icon` | Results.css, DealbreakersPanel.css:196, LoadingState.css:84 | `.results-container`, `.dealbreakers-panel`, `.loading-state` |
| 22 | `.section-description` | WeightPresets.css:471, VisualsTab.css:124, SettingsModal.css:208 | `.weight-presets`, `.gamma-section`, `.settings-modal` |
| 23 | `.reset-btn` | WeightPresets.css:482, VisualsTab.css:423 | `.weight-presets`, `.gamma-section` |
| 24 | `.play-btn` | JudgeVideo.css:44, NewLifeVideos.css:467 | `.judge-video`, `.new-life-videos` |
| 25 | `.primary-btn` | VisualsTab.css:186, NewLifeVideos.css:482 | `.gamma-section`, `.new-life-videos` |
| 26 | `.loading-text` | globals.css, AskOlivia.css, ContrastDisplays.css:150 | (globals = keep or scope), `.ask-olivia`, `.contrast-displays` |

---

### MEDIUM SEVERITY (41 items — 2-file conflicts or high-risk generic names)

| # | Selector | File:Line | Conflicts With | Wrapper |
|---|----------|-----------|---------------|---------|
| 27 | `.modal-overlay` | SavedComparisons.css | Any modal | `.saved-comparisons` |
| 28 | `.modal-footer` | PricingModal.css:460 | DataSourcesModal.css:113 | `.pricing-modal` / `.data-sources-modal` |
| 29 | `.modal-header` | PricingModal.css:120 | Generic | `.pricing-modal` |
| 30 | `.modal-title` | PricingModal.css:142 | Generic | `.pricing-modal` |
| 31 | `.modal-subtitle` | PricingModal.css:153 | Generic | `.pricing-modal` |
| 32 | `.modal-close-btn` | PricingModal.css:82 | Generic | `.pricing-modal` |
| 33 | `.toggle-option` | PricingModal.css:174 | Generic | `.pricing-modal` |
| 34 | `.toggle-btn` | PricingPage.css:139 | Generic | `.pricing-page` |
| 35 | `.tier-badge` | SettingsModal.css:518 | Header.css | `.settings-modal` |
| 36 | `.tab-icon` | FreedomCategoryTabs.css:88 | TabNavigation.css | `.freedom-category-tabs` |
| 37 | `.tab-name` | FreedomCategoryTabs.css:93 | TabNavigation.css | `.freedom-category-tabs` |
| 38 | `.tab-count` | FreedomCategoryTabs.css:107 | Generic | `.freedom-category-tabs` |
| 39 | `.time-display` | JudgeVideo.css:64 | CourtOrderVideo.css:257 | `.judge-video` / `.court-order-video` |
| 40 | `.status-message` | JudgeVideo.css:226 | VisualsTab.css:272 | `.judge-video` / `.gamma-section` |
| 41 | `.generating-state` | CourtOrderVideo.css:162 | VisualsTab.css | `.court-order-video` |
| 42 | `.info-text` | CitySelector.css:319 | NewLifeVideos.css:594 | `.city-selector` / `.new-life-videos` |
| 43 | `.section-subtitle` | VisualsTab.css:39 | NewLifeVideos.css:39 | `.gamma-section` / `.new-life-videos` |
| 44 | `.section-icon` | VisualsTab.css:120 | NewLifeVideos.css:35 | `.gamma-section` / `.new-life-videos` |
| 45 | `.section-header` | WeightPresets.css:458 | CostDashboard.css:226 | `.weight-presets` / `.cost-dashboard` |
| 46 | `.secondary-btn` | VisualsTab.css:197 | Generic | `.gamma-section` |
| 47 | `.typing-indicator` | OliviaChatBubble.css:551 | Generic | `.olivia-chat-bubble` |
| 48 | `.expand-icon` | Results.css:308 | SavedComparisons.css | `.results-container` / `.saved-comparisons` |
| 49 | `.save-btn` | Results.css:774 | Generic | `.results-container` |
| 50 | `.share-btn` | CitySelector.css (@media) | Generic | `.city-selector` |
| 51 | `.clear-btn` | DealbreakersPanel.css:110 | Generic | `.dealbreakers-panel` |
| 52 | `.close-btn` | CostDashboard.css:59 | Generic | `.cost-dashboard` |
| 53 | `.dismiss-btn` | UsageWarningBanner.css:253 | Generic | `.usage-warning-banner` |
| 54 | `.popular-section` | CitySelector.css:332 | Generic | `.city-selector` |
| 55 | `.card-price` | PricingPage.css:277 | Generic | `.pricing-page` |
| 56 | `.card-features` | PricingPage.css:324 | Generic | `.pricing-page` |
| 57 | `.card-action` | PricingPage.css:364 | Generic | `.pricing-page` |
| 58 | `.card-icon` | CostDashboard.css:106 | Generic | `.cost-dashboard` |
| 59 | `.card-label` | CostDashboard.css:112 | Generic | `.cost-dashboard` |
| 60 | `.card-value` | CostDashboard.css:127 | Generic | `.cost-dashboard` |
| 61 | `.form-group` | LoginScreen.css:229 | Generic | `.login-screen` |
| 62 | `.no-data` | CostDashboard.css:382 | Generic | `.cost-dashboard` |
| 63 | `.empty-icon` | AdvancedVisuals.css:28 | PromptsManager.css, FreedomMetricsList.css | `.advanced-visuals` |
| 64 | `.quick-label` | EmiliaChat.css:130 | Generic | `.emilia-chat` |
| 65 | `.quick-buttons` | EmiliaChat.css:139 | Generic | `.emilia-chat` |
| 66 | `.message-count` | AskOlivia.css:724 | Generic | `.ask-olivia` |
| 67 | `.pause-btn` | AskOlivia.css:742 | Generic | `.ask-olivia` |

---

### LOW SEVERITY (17 items — Currently unique but unscoped)

**WeightPresets.css** (scope under `.weight-presets`):

| # | Selector | Line |
|---|----------|------|
| 68 | `.slider-row` | 166 |
| 69 | `.slider-label` | 178 |
| 70 | `.slider-name` | 189 |
| 71 | `.slider-control` | 195 |
| 72 | `.slider-value` | 238 |
| 73 | `.toggle-label` | 593 |
| 74 | `.toggle-switch` | 604 |
| 75 | `.toggle-text` | 635 |
| 76 | `.toggle-icon` | 641 |
| 77 | `.toggle-title` | 645 |
| 78 | `.toggle-description` | 651 |

**DealbreakersWarning.css** (scope under `.dealbreakers-warning`):

| # | Selector | Line |
|---|----------|------|
| 79 | `.warning-header` | 19 |
| 80 | `.warning-icon` | 26 |
| 81 | `.warning-title` | 37 |
| 82 | `.warning-text` | 43 |

**OliviaAvatar.css** (scope under `.olivia-avatar`):

| # | Selector | Line |
|---|----------|------|
| 83 | `.status-indicator` | 75 |
| 84 | `.status-text` | 87 |

---

### CLEAN FILES (no changes needed)

These 13 files are properly scoped:

| File | Scope Prefix |
|------|-------------|
| LegalModal.css | `.legal-modal-*` |
| HelpBubble.css | `.help-bubble-*` |
| TabNavigation.css | `.tab-nav-*` |
| Footer.css | `.footer-*` |
| CookieConsent.css | `.cookie-*` |
| FreedomHeroFooter.css | `.freedom-hero-footer` |
| GunComparisonModal.css | `.gun-*` |
| PromptsManager.css | `.prompts-*` / `.prompt-*` |
| HelpModal.css | `.help-modal-*` |
| FreedomMetricsList.css | `.freedom-*` |
| ScoreMethodology.css | `.methodology-*` |
| EvidencePanel.css | `.evidence-*` |
| FeatureGate.css | `.gate-*` |

---

## TASK 2: Bug List (provided by user in next session)

The user will provide a separate list of ~6 additional bugs for you to fix. These are independent of the CSS audit above.

---

## IMPORTANT NOTES FOR THE NEXT AGENT

1. **Branch:** `claude/lifescore-debug-42MtS` — commit here and ONLY here
2. **Do NOT merge into main** — the user will decide when to merge
3. **Each fix = commit + push** — Vercel auto-deploys from pushed branches
4. **globals.css / dark-mode.css decisions:** Some selectors in globals.css are intentionally global (`.container`, `.card`, `.spinner`). For those, the fix is to scope the COMPONENT files, not globals. Only modify globals.css if the selector there is NOT actually needed globally.
5. **Check the JSX wrapper classes** before scoping — open the corresponding `.tsx` file to confirm the actual root className used in the component. The wrapper names listed above are best guesses based on naming conventions. Verify before editing.
6. **`@media` queries and `[data-theme="dark"]` blocks** that reference these selectors also need scoping. Don't forget them.
7. **Test approach:** After each batch of fixes, do a visual check — the app runs on Vercel. No local builds (`npm run build` is forbidden per CLAUDE.md).

---

## REPOSITORY STATE

- **Current HEAD:** `bfac85f` (Fix TS6133: remove unused userVideoStoragePath state)
- **Branch:** `claude/lifescore-debug-42MtS`
- **Remote:** Fully pushed and up to date
- **Working tree:** Clean
- **Total commits on branch (ahead of main):** 130+
- **origin/main HEAD:** `bca02c0` (fix(css): force dark gray text on Standard Report badge)
- **Merge status:** NOT merged — `origin/main` is far behind this branch

---

## SUMMARY

| Task | Items | Status |
|------|-------|--------|
| CSS Bleed-Through Fixes | 84 selectors across 33 files | AUDIT COMPLETE — fixes pending |
| Additional Bug Fixes | ~6 bugs | User will provide list |
| Merge to main | — | DO NOT DO — user decides when |
