# MOBILE UI/UX AUDIT — Comprehensive Bug Report & Fix Plan
**Date:** 2026-02-09
**Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Line-by-line reading of all 45 CSS files + TSX component review
**Scope:** Every component at 768px, 480px, and 320px breakpoints

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL (S1) | 8 | Functionality broken — buttons hidden, content unreachable |
| HIGH (S2) | 15 | Major misalignment — data not aligned to headers, content clipped |
| MEDIUM (S3) | 22 | Visual polish — centering issues, inconsistent sizing, readability |
| LOW (S4) | 12 | Minor — cosmetic refinements, dark mode edge cases |
| **TOTAL** | **57** | |

---

## TABLE OF CONTENTS

1. [CRITICAL: Eye Button Missing on Mobile (SavedComparisons)](#bug-1)
2. [CRITICAL: JudgeTab Action Buttons Unreadable (0.38rem font)](#bug-2)
3. [CRITICAL: EnhancedComparison City Headers Misaligned to Score Columns](#bug-3)
4. [CRITICAL: Header Elements Overlap at < 320px](#bug-4)
5. [CRITICAL: SettingsModal Exceeds Viewport on Small Phones](#bug-5)
6. [CRITICAL: Tab Badge Count Always Shows 0 (Wrong localStorage Key)](#bug-6)
7. [CRITICAL: EnhancedComparison Grid Columns Too Narrow for City Names](#bug-7)
8. [CRITICAL: EmiliaChat Nav Bar Not Sticky — Scrolls Out of View](#bug-8)
9. [HIGH: SavedComparisons Report Type Badges Not Uniformly Sized](#bug-9)
10. [HIGH: TabNavigation Badge Size Inconsistent Across Tabs](#bug-10)
11. [HIGH: Results Category Bars Become Single Column — Labels Misaligned](#bug-11)
12. [HIGH: EnhancedComparison Dual Score Mode Headers Not Centered](#bug-12)
13. [HIGH: AskOlivia Cockpit Header 3-Column Grid Collapses Poorly](#bug-13)
14. [HIGH: JudgeTab Findings Grid City Cards Stack Without VS Separator](#bug-14)
15. [HIGH: SavedComparisons Toolbar Buttons Stretch Full Width](#bug-15)
16. [HIGH: EnhancedComparison Metric Details 7-Column Grid Unreadable](#bug-16)
17. [HIGH: Results Metric Name Truncated at 480px](#bug-17)
18. [HIGH: PricingModal Content Unreachable Below Fold](#bug-18)
19. [HIGH: FreedomMetricsList Max-Height Too Short on Mobile](#bug-19)
20. [HIGH: CitySelector Input Fields Overflow on Small Screens](#bug-20)
21. [HIGH: EnhancedComparison LLM Score Breakdown Cards Overflow](#bug-21)
22. [HIGH: JudgeTab Report Selector Dropdown Truncated on 480px](#bug-22)
23. [HIGH: EnhancedComparison Disputed Metrics LLM Mini Scores Unreadable](#bug-23)
24. [MEDIUM through LOW: Remaining 34 issues listed in bulk table below](#remaining)

---

<a id="bug-1"></a>
## BUG #1 — CRITICAL: Eye (View) Button Missing on Mobile Saved Page

**File:** `src/components/SavedComparisons.css:452-464` + `:884-956`
**Reported by:** User (Claude 4.5 tried 5 times to fix, made it worse)
**Breakpoint:** 480px vertical

### Root Cause Analysis
The `.saved-comparisons` container at line 10 has `overflow: hidden`. On mobile, `.saved-item` switches to `flex-direction: column` (line 885). The `.saved-item-actions` container was previously set to `height: 7px` (visible in the comment at line 454 — "Fixed: was 7px"). While the height was fixed to 32px, the parent `.saved-comparisons` `overflow: hidden` can still clip items when combined with certain content heights.

Additionally, 5 layers of `!important` overrides (lines 891, 899-901, 929, 939-956) indicate cascading failed fixes. The buttons have competing rules:
- Default: `width: 32px; height: 32px` (line 453-454)
- 768px: `min-width: 40px; min-height: 40px` with `!important` (line 898-904)
- 480px: `width: 44px !important; height: 44px !important` (line 940-941)

### What the User Sees
On mobile vertical (< 480px), the eye icon button is either:
- Invisible (clipped by overflow)
- Present but not receiving click events (z-index/layer issue)
- Visually present but squished between other elements

### Fix Plan
```css
/* Step 1: Remove overflow: hidden from parent */
.saved-comparisons {
  overflow: visible; /* Was: hidden — this clips action buttons on mobile */
}

/* Step 2: Remove ALL !important overrides - clean slate */
/* Step 3: Use a single, consistent responsive rule: */
@media (max-width: 768px) {
  .saved-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .saved-item-actions {
    display: flex;
    justify-content: center;
    width: 100%;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .action-btn {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    font-size: 1.2rem;
    flex-shrink: 0;
    touch-action: manipulation;
  }
}
```

**Risk:** LOW — only affects SavedComparisons layout
**Effort:** 30 min

---

<a id="bug-2"></a>
## BUG #2 — CRITICAL: JudgeTab Action Buttons Have 0.38rem Font Size

**File:** `src/components/JudgeTab.css:1692` (768px breakpoint)
**Breakpoint:** 768px

### Root Cause
```css
/* Line 1692 */
.action-btn {
  font-size: 0.38rem;  /* ~6px — UNREADABLE */
}
```
At 480px it gets worse: `font-size: 0.32rem` (line 1805) — approximately 5px.

The `.btn-text` inside has `font-size: 0.85rem` which OVERRIDES the parent, so the text itself is legible, but the button padding/gap at `0.2rem` makes the overall button extremely cramped.

### What the User Sees
Judge tab action buttons (Save, Forward, Download Report, Download Video) appear as tiny, barely-tappable elements on mobile.

### Fix Plan
```css
@media (max-width: 768px) {
  .judge-tab .action-btn {
    font-size: 0.75rem;  /* Was: 0.38rem */
    padding: 0.6rem 0.75rem;
    gap: 0.35rem;
    min-height: 44px;  /* Touch target minimum */
  }
}

@media (max-width: 480px) {
  .judge-tab .action-btn {
    font-size: 0.7rem;  /* Was: 0.32rem */
    padding: 0.5rem 0.6rem;
    gap: 0.25rem;
  }
}
```

**Risk:** LOW — scoped to `.judge-tab .action-btn`
**Effort:** 15 min

---

<a id="bug-3"></a>
## BUG #3 — CRITICAL: Enhanced Comparison City Headers Misaligned to Score Columns

**File:** `src/components/EnhancedComparison.css:3135-3155`
**Breakpoint:** 768px and below

### Root Cause
The enhanced metric details header uses a 7-column grid:
```css
/* Line 3137 */
.metric-details-header.expandable-header {
  grid-template-columns: 1fr 55px 55px 40px 40px 40px 30px;
}
```

The city name headers (`metric-header-city`) sit in the 55px columns. With city names like "San Francisco" or "Kuala Lumpur", the text truncates or overflows. The header columns don't visually align with the score data below because:
1. The header and row grids use `grid-template-columns` that don't match when content wraps
2. `max-width: 100px` on `.metric-header-city` (in base styles) hard-caps the display width
3. At 768px, columns shrink to 55px — city names become unreadable abbreviations

### What the User Sees
- City A and City B column headers are truncated ("San Fr..." or "Kuala...")
- Score numbers don't line up under the city headers
- On expanded rows, data shifts left/right of its header

### Fix Plan
```css
/* Option A: Two-row layout on mobile — name on top, scores below */
@media (max-width: 768px) {
  .metric-details-header.expandable-header {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  /* Hide non-essential columns (delta, llm-count, stddev) in header */
  .metric-details-header.expandable-header .metric-header-delta,
  .metric-details-header.expandable-header .metric-header-llms,
  .metric-details-header.expandable-header .metric-header-stddev,
  .metric-details-header.expandable-header .metric-header-expand {
    display: none;
  }

  .metric-header-city {
    max-width: none;
    font-size: 0.8rem;
    text-align: center;
    padding: 0.5rem;
  }

  /* Metric rows: name spans full width, scores below */
  .metric-row-expandable {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
  }

  .metric-row-expandable .metric-info {
    grid-column: 1 / -1;
  }

  /* Move extra stats into expanded panel */
  .metric-row-expandable .metric-delta,
  .metric-row-expandable .metric-llm-count,
  .metric-row-expandable .metric-stddev {
    display: none;
  }
}
```

**Risk:** MEDIUM — changes layout of enhanced results table
**Effort:** 2 hours (needs TSX changes for conditional rendering of hidden columns in expanded panel)

---

<a id="bug-4"></a>
## BUG #4 — CRITICAL: Header Elements Overlap at < 320px

**File:** `src/components/Header.css:144-165`
**Breakpoint:** < 320px

### Root Cause
`.header-left` and `.header-right` both use `position: absolute` with fixed offsets:
```css
.header-left { position: absolute; top: 1rem; left: 1rem; }
.header-right { position: absolute; top: 1rem; right: 1rem; transform: scale(0.75); }
```

On screens narrower than ~320px, these overlap the centered title text. The `max-width: 280px` on `.header-right` at 768px prevents wrapping but forces clipping. At 480px the same absolute positioning is used with tighter offsets (0.5rem) but no `max-width` constraint.

### What the User Sees
Theme toggle (left) and user account/upgrade buttons (right) overlap the company name and LIFE SCORE title on very narrow phones.

### Fix Plan
```css
@media (max-width: 360px) {
  .header-left, .header-right {
    position: static;
    transform: none;
  }

  .header-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.5rem;
  }

  .header-left { order: 1; }
  .header-right { order: 2; transform: scale(0.7); transform-origin: center; }

  .company-name, .clues-branding, .life-score-title {
    order: 3;
    width: 100%;
  }
}
```

**Risk:** LOW
**Effort:** 45 min

---

<a id="bug-5"></a>
## BUG #5 — CRITICAL: SettingsModal Exceeds Viewport on Small Phones

**File:** `src/components/SettingsModal.css:591-630`
**Breakpoint:** 480px

### Root Cause
```css
@media (max-width: 480px) {
  .settings-modal {
    max-height: 100vh;       /* Uses full viewport */
    border-radius: 16px 16px 0 0;
    margin-top: auto;        /* Pushes to bottom like a sheet */
  }
}
```

The modal takes 100vh but the content inside has `padding-bottom: 2rem` (line 617). Combined with the header (1.25rem padding) and tabs (0.875rem padding), the scrollable content area can be less than 60% of the viewport. The features list at the bottom of the Subscription tab is cut off.

Additionally, `.settings-tabs` has `overflow-x: auto` with `justify-content: flex-start` — tabs scroll horizontally but there's no visual indicator (scrollbar is hidden on WebKit mobile).

### What the User Sees
- Bottom of Settings content is clipped, especially the Subscription features list
- Tab labels disappear (replaced by icons only via `span { display: none }` at line 611) — but icon-only tabs are ambiguous

### Fix Plan
```css
@media (max-width: 480px) {
  .settings-modal {
    max-height: 95vh;  /* Leave 5vh for safe area / notch */
    border-radius: 16px 16px 0 0;
  }

  .settings-content {
    padding-bottom: 3rem;  /* Enough space for last items */
    -webkit-overflow-scrolling: touch;
  }

  /* Add horizontal scroll indicator for tabs */
  .settings-tabs {
    position: relative;
  }

  .settings-tabs::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(to right, transparent, var(--bg-primary));
    pointer-events: none;
  }
}
```

**Risk:** LOW
**Effort:** 20 min

---

<a id="bug-6"></a>
## BUG #6 — CRITICAL: Tab Badge Count Always Shows 0

**File:** `src/App.tsx:162`
**Not a CSS bug — included because it directly affects mobile UI trust**

### Root Cause
```typescript
// App.tsx line 162
const saved = localStorage.getItem('lifescore_comparisons');  // WRONG KEY
```

Actual keys are:
- Standard: `lifescore_saved_comparisons` (savedComparisons.ts:123)
- Enhanced: `lifescore_saved_enhanced` (savedComparisons.ts:124)

The badge always reads an empty/nonexistent key, showing 0 even when reports are saved.

### What the User Sees
Saved tab badge always shows 0 on mobile AND desktop, making them think saves failed.

### Fix Plan
```typescript
const standardSaved = localStorage.getItem('lifescore_saved_comparisons');
const enhancedSaved = localStorage.getItem('lifescore_saved_enhanced');
let count = 0;
try { count += JSON.parse(standardSaved || '[]').length; } catch {}
try { count += JSON.parse(enhancedSaved || '[]').length; } catch {}
setSavedCount(count);
```

**Risk:** LOW
**Effort:** 10 min

---

<a id="bug-7"></a>
## BUG #7 — CRITICAL: Enhanced Metric Header City Columns Too Narrow

**File:** `src/components/EnhancedComparison.css` — base metric-header-city styles
**Breakpoint:** All mobile

### Root Cause
In the standard (non-dual) mode, `.metric-details-header` uses:
```css
grid-template-columns: 1fr 55px 55px 40px 40px 40px 30px;
```
City names like "San Francisco, CA" get 55px. This is ~3-4 characters visible.

### Fix Plan
Change to responsive column widths:
```css
@media (max-width: 768px) {
  .metric-details-header.expandable-header {
    grid-template-columns: 1fr minmax(60px, auto) minmax(60px, auto) 30px;
  }
  /* Move delta/llm-count/stddev into expandable panel */
}
```

**Risk:** MEDIUM
**Effort:** 1.5 hours

---

<a id="bug-8"></a>
## BUG #8 — CRITICAL: EmiliaChat Nav Bar Not Sticky

**File:** `src/components/EmiliaChat.css:24-28`
**Breakpoint:** All mobile

### Root Cause
```css
.emilia-chat-nav {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: #1e293b;
  /* Missing: position: sticky; top: 0; z-index: 10; */
}
```

The nav bar (containing the Back button) scrolls out of view when the user scrolls through chat messages. On mobile, the user has to scroll all the way back to the top to navigate away.

### Fix Plan
```css
.emilia-chat-nav {
  position: sticky;
  top: 0;
  z-index: 10;
}
```

**Risk:** NONE
**Effort:** 5 min

---

<a id="bug-9"></a>
## BUG #9 — HIGH: Saved Comparisons Report Type Badges Not Uniform Size

**File:** `src/components/SavedComparisons.css:360-398`
**Breakpoint:** All screens

### Root Cause
`.report-type-badge` has no fixed width. Enhanced badge (`.report-type-badge.enhanced`) and Standard badge (`.report-type-badge.standard`) have different text lengths ("ENHANCED" vs "STANDARD"), causing different badge widths in the saved list. This creates a jagged, unaligned appearance.

### Fix Plan
```css
.report-type-badge {
  min-width: 110px;  /* Ensure uniform width */
  justify-content: center;
  text-align: center;
}
```

**Risk:** NONE
**Effort:** 5 min

---

<a id="bug-10"></a>
## BUG #10 — HIGH: Tab Navigation Badge Size Inconsistent

**File:** `src/components/TabNavigation.css:81-93`
**Breakpoint:** All screens

### Root Cause
`.tab-badge` uses `min-width: 18px` with `padding: 0.15rem 0.4rem`. Single-digit (e.g., "3") and double-digit (e.g., "12") badges render at different widths. Tabs with badges push the icon/label off-center compared to tabs without badges.

### Fix Plan
```css
.tab-badge {
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.35rem;
}
```

**Risk:** NONE
**Effort:** 5 min

---

<a id="bug-11"></a>
## BUG #11 — HIGH: Results Category Bars Single-Column Misalignment

**File:** `src/components/Results.css:486-488`
**Breakpoint:** 768px

### Root Cause
```css
@media (max-width: 768px) {
  .category-bars {
    grid-template-columns: 1fr;  /* Stacks city bars vertically */
  }
}
```

When bars stack vertically, there's no visual indication which bar belongs to which city. The `.bar-city` label is small (0.875rem) and the same color for both cities.

### Fix Plan
```css
@media (max-width: 768px) {
  .bar-container {
    position: relative;
    padding-left: 0.5rem;
    border-left: 3px solid;
  }

  .bar-container:nth-child(odd) {
    border-color: var(--sapphire);  /* City 1 color */
  }

  .bar-container:nth-child(even) {
    border-color: var(--orange);    /* City 2 color */
  }
}
```

**Risk:** LOW
**Effort:** 20 min

---

<a id="bug-12"></a>
## BUG #12 — HIGH: Enhanced Comparison Dual Score Mode Headers Not Centered

**File:** `src/components/EnhancedComparison.css:3143-3145`
**Breakpoint:** 768px

### Root Cause
Dual-score mode (legal + enforcement) uses:
```css
.metric-details-header.dual-header.expandable-header {
  grid-template-columns: 1fr 80px 80px 40px 40px 40px 30px;
}
```
The 80px columns are wider than single-score 55px columns, but the headers "CITY A LEGAL" and "CITY A ENFORCE" still get truncated. The text is center-aligned but the column itself is not centered over the corresponding data.

### Fix Plan
Reuse the mobile two-row approach from Bug #3 for dual-score mode as well. On mobile, show only the primary score in the row, and reveal Legal/Enforcement split in the expanded panel.

**Risk:** MEDIUM
**Effort:** 1.5 hours

---

<a id="bug-13"></a>
## BUG #13 — HIGH: AskOlivia Cockpit Header Collapses Poorly

**File:** `src/components/AskOlivia.css:1387-1410`
**Breakpoint:** 768px

### Root Cause
The cockpit header switches from `grid-template-columns: 1fr auto 1fr` to `1fr` (single column). All three sections (status cluster, Olivia wordmark, time) stack vertically. This creates a very tall header (~200px+) on mobile, pushing the actual content (viewport/chat) below the fold.

### Fix Plan
```css
@media (max-width: 768px) {
  .cockpit-header {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }

  .cockpit-center {
    grid-column: 1 / -1;
    order: -1;  /* Move title to top */
  }

  /* Hide status cluster on mobile to save space */
  .status-cluster {
    display: none;
  }
}
```

**Risk:** LOW — hides non-essential status info on mobile
**Effort:** 30 min

---

<a id="bug-14"></a>
## BUG #14 — HIGH: JudgeTab Findings Grid Cities Stack Without VS

**File:** `src/components/JudgeTab.css:1597-1608`
**Breakpoint:** 1024px

### Root Cause
```css
@media (max-width: 1024px) {
  .findings-grid {
    grid-template-columns: 1fr;  /* Stacks city cards */
  }

  .finding-card.versus {
    flex-direction: row;  /* VS becomes horizontal */
  }
}
```

The VS card with confidence badge becomes a thin horizontal strip between the two city cards. The flow is: City 1 → VS row → City 2, but the VS row is visually disconnected.

### Fix Plan
```css
@media (max-width: 1024px) {
  .finding-card.versus {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
  }

  .versus-text {
    font-size: 1rem;
  }
}
```

**Risk:** NONE
**Effort:** 10 min

---

<a id="bug-15"></a>
## BUG #15 — HIGH: SavedComparisons Toolbar Buttons Full-Width Stretch

**File:** `src/components/SavedComparisons.css:874-882`
**Breakpoint:** 768px

### Root Cause
```css
@media (max-width: 768px) {
  .saved-toolbar {
    flex-direction: column;
    align-items: stretch;  /* Buttons stretch to full width */
  }
}
```

The Export, Import, Clear buttons (which have `min-width: 7.15rem`) stretch to 100% width. They look disproportionately large compared to their content.

### Fix Plan
```css
@media (max-width: 768px) {
  .saved-toolbar {
    flex-direction: column;
    align-items: center;  /* Center instead of stretch */
  }

  .toolbar-left, .toolbar-right {
    justify-content: center;
    flex-wrap: wrap;
  }

  .toolbar-right .toolbar-btn {
    min-width: auto;
    flex: 0 1 auto;
  }
}
```

**Risk:** NONE
**Effort:** 10 min

---

<a id="bug-16"></a>
## BUG #16 — HIGH: Enhanced Metric Details 7-Column Grid Unreadable at 480px

**File:** `src/components/EnhancedComparison.css:3135-3200`
**Breakpoint:** 480px (NO 480px breakpoint exists for this grid)

### Root Cause
The 768px breakpoint reduces columns to `1fr 55px 55px 40px 40px 40px 30px` but there is **no 480px breakpoint** for the expandable metric grid. On a 375px phone, 7 columns at those widths = 305px minimum, leaving only 70px for the metric name column. Text becomes unreadable.

### Fix Plan
Add a 480px breakpoint that collapses to a simplified 2-column or stacked layout (same approach as Bug #3).

**Risk:** MEDIUM
**Effort:** 1 hour

---

<a id="bug-17"></a>
## BUG #17 — HIGH: Results Metric Name Truncated at 480px

**File:** `src/components/Results.css:498-501, 530-537`
**Breakpoint:** 480px

### Root Cause
At 480px, the header hides the metric column entirely:
```css
.metric-details-header span:first-child {
  display: none;  /* Hides "METRIC" label */
}
```
The grid becomes 2-column (`1fr 1fr`). Metric names now span full width on their own row with `grid-column: 1 / -1`. This is correctly handled, BUT the metric info flexbox (`flex-direction: row; flex-wrap: wrap`) at 768px conflicts with the 480px grid override, causing metric names + weight badges to wrap oddly.

### Fix Plan
Ensure the 480px override explicitly resets the metric-info direction:
```css
@media (max-width: 480px) {
  .metric-row .metric-info {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
}
```

**Risk:** LOW
**Effort:** 15 min

---

<a id="bug-18"></a>
## BUG #18 — HIGH: PricingModal Content Unreachable Below Fold

**File:** `src/components/PricingModal.css`
**Breakpoint:** 480px

### Root Cause
The pricing modal uses fixed max-height without adequate scroll behavior. The pricing cards use `min-height` values that push content below the visible area on short phone screens.

### Fix Plan
Ensure `overflow-y: auto` on the content area and reduce `min-height` on pricing cards at 480px.

**Risk:** LOW
**Effort:** 20 min

---

<a id="bug-19"></a>
## BUG #19 — HIGH: FreedomMetricsList Max-Height Too Short

**File:** `src/components/FreedomMetricsList.css:216-219`
**Breakpoint:** 480px

### Root Cause
```css
@media (max-width: 480px) {
  .freedom-metrics-list {
    max-height: 180px;  /* Only ~3 items visible */
  }
}
```

On the JudgeTab, the winning metrics list shows only 2-3 items before requiring scroll. Combined with the glass-card styling, users may not realize the list is scrollable.

### Fix Plan
```css
@media (max-width: 480px) {
  .freedom-metrics-list {
    max-height: 250px;  /* Show ~4-5 items */
  }
}
```

**Risk:** NONE
**Effort:** 5 min

---

<a id="bug-20"></a>
## BUG #20 — HIGH: CitySelector Input Fields Overflow

**File:** `src/components/CitySelector.css`
**Breakpoint:** 480px

### Root Cause
City selector inputs use `min-width` values that exceed the mobile viewport when combined with padding and borders.

### Fix Plan
Add `max-width: 100%; box-sizing: border-box;` to all input elements at 480px.

**Risk:** LOW
**Effort:** 15 min

---

<a id="bug-21"></a>
## BUG #21 — HIGH: EnhancedComparison LLM Score Breakdown Overflow

**File:** `src/components/EnhancedComparison.css:4314-4332`
**Breakpoint:** 480px

### Root Cause
`.llm-scores-breakdown` uses `flex-wrap: wrap` but individual `.llm-score-item` has `min-width: 58px`. With 5 LLMs, that's 290px + gaps, which wraps to 2 rows on most phones. The second row often overflows the parent container because the parent has `overflow: hidden`.

### Fix Plan
```css
@media (max-width: 480px) {
  .llm-scores-breakdown {
    justify-content: center;
  }

  .llm-score-item {
    min-width: 50px;
    padding: 0.35rem 0.5rem;
  }
}
```

**Risk:** LOW
**Effort:** 10 min

---

<a id="bug-22"></a>
## BUG #22 — HIGH: JudgeTab Report Selector Dropdown Truncated

**File:** `src/components/JudgeTab.css:256-275`
**Breakpoint:** 480px

### Root Cause
```css
@media (max-width: 768px) {
  .report-selector-bar .judge-report-dropdown {
    max-width: 100%;
  }
}
```
This is correct, but the dropdown options contain long city pair names (e.g., "San Francisco vs Kuala Lumpur — Enhanced") that truncate on 480px with no tooltip or wrapping.

### Fix Plan
Add `text-overflow: ellipsis` with a wider default, and ensure the select element respects `box-sizing: border-box`.

**Risk:** LOW
**Effort:** 10 min

---

<a id="bug-23"></a>
## BUG #23 — HIGH: Enhanced Disputed Metrics Mini Scores Unreadable

**File:** `src/components/EnhancedComparison.css:4276-4295`
**Breakpoint:** 768px

### Root Cause
Disputed metric LLM mini-score cards shrink to:
```css
.llm-score-mini {
  padding: 0.25rem 0.35rem;
  min-width: 40px;
}
.llm-score-mini .mini-llm-name { font-size: 0.5rem; }  /* 8px */
.llm-score-mini .mini-score { font-size: 0.7rem; }      /* 11px */
```

At 0.5rem, the LLM names ("Claude", "GPT-4o") are practically invisible.

### Fix Plan
```css
@media (max-width: 768px) {
  .llm-score-mini .mini-llm-name {
    font-size: 0.6rem;  /* 9.6px minimum */
  }

  .llm-score-mini .mini-icon {
    font-size: 0.8rem;
  }

  .llm-score-mini {
    min-width: 48px;
  }
}
```

**Risk:** LOW
**Effort:** 10 min

---

<a id="remaining"></a>
## REMAINING ISSUES — Medium and Low Severity

| # | File | Issue | Severity | Fix |
|---|------|-------|----------|-----|
| 24 | Results.css:144 | `.score-label` has `!important` on color — blocks dark mode override | S3 | Remove `!important` |
| 25 | Results.css:285-287 | `.bar-city` and `.bar-score` use `!important` — prevents theming | S3 | Remove `!important` |
| 26 | Results.css:369 | `.metric-name` color `#F7931E !important` — can't override in dark mode | S3 | Use theme variable |
| 27 | EnhancedComparison.css:67-68 | `.llm-selector-header h3` forced white — illegible on light mode | S3 | Use `var(--sapphire)` |
| 28 | Header.css:163 | `transform: scale(0.75)` on header-right — makes touch targets 25% smaller than they appear | S3 | Use actual smaller sizes instead of scale |
| 29 | TabNavigation.css:158-160 | Tab label at 480px is `0.55rem` (8.8px) — barely readable | S3 | Increase to 0.6rem minimum |
| 30 | AskOlivia.css:34 | `--steel-gray: #ffffff` overrides purpose of variable name | S4 | Use `--text-color` or rename |
| 31 | AskOlivia.css:769 | Chat box fixed at `300px` wide — doesn't match button widths above | S3 | Use `width: 100%; max-width: 300px` |
| 32 | JudgeTab.css:1621-1625 | Judge header at 768px uses `grid-template-columns: 1fr 1fr` — hides center wordmark | S3 | Show wordmark spanning full width above |
| 33 | JudgeTab.css:1760-1768 | Multiple sections share same `padding-left/right: 0.75rem` override — use shared class | S4 | Refactor to shared `.judge-section-mobile` |
| 34 | SavedComparisons.css:910-912 | `.saved-tabs` becomes column at 768px — wastes vertical space | S3 | Keep horizontal with smaller padding |
| 35 | SavedComparisons.css:427 | Nickname edit input has `width: 200px` — overflows on 320px phones | S3 | Change to `width: 100%; max-width: 200px` |
| 36 | EnhancedComparison.css:77-78 | LLM button grid: 5 cols desktop → 3 cols 768px → 2 cols 480px — good progression, but no 320px rule | S4 | Add `grid-template-columns: 1fr 1fr` at 320px |
| 37 | EmiliaChat.css:24 | `.emilia-chat-nav` not sticky — user can't navigate back without scrolling | S2 | Add `position: sticky; top: 0; z-index: 10` |
| 38 | EmiliaChat.css:597-598 | Action button text hidden on mobile — icon-only ambiguous | S3 | Add `aria-label` for accessibility |
| 39 | VisualsTab.css | No 480px breakpoint defined | S3 | Add breakpoint for chart containers |
| 40 | AdvancedVisuals.css | Chart containers don't constrain width at 480px | S3 | Add `max-width: 100%; overflow-x: auto` |
| 41 | CookieConsent.css | Banner buttons stack poorly at 320px | S4 | Add flex-wrap |
| 42 | DataSourcesModal.css | Modal content not scrollable on short screens | S3 | Add `overflow-y: auto; max-height: 80vh` |
| 43 | DealbreakersPanel.css | Panel exceeds viewport at 480px | S3 | Add responsive max-width |
| 44 | DealbreakersWarning.css | Warning modal too wide on mobile | S3 | Add `max-width: 90vw` |
| 45 | GunComparisonModal.css | No mobile breakpoints at all | S3 | Add 768px and 480px responsive rules |
| 46 | HelpModal.css | Similar to SettingsModal — content clipped at bottom on short phones | S3 | Match SettingsModal fix |
| 47 | LegalModal.css | Long legal text not scrollable in modal | S3 | Ensure `overflow-y: auto` on content |
| 48 | LoadingState.css | Loading spinner centered but text below wraps poorly at 320px | S4 | Reduce font size at 320px |
| 49 | ManualViewer.css | PDF viewer has fixed height that clips on mobile | S3 | Use `max-height: 70vh` |
| 50 | NewLifeVideos.css | Video grid doesn't reflow to single column at 480px | S3 | Add `grid-template-columns: 1fr` at 480px |
| 51 | OliviaAvatar.css | Avatar scale transform causes layout shift | S4 | Use actual size instead of transform |
| 52 | OliviaChatBubble.css | Bubble arrow position breaks at 480px | S4 | Hide arrow on mobile |
| 53 | CourtOrderVideo.css | Video container overflow at 480px | S3 | Add `max-width: 100%` |
| 54 | JudgeVideo.css | No mobile-specific sizing | S4 | Inherit from JudgeTab responsive rules |
| 55 | ScoreMethodology.css | Table overflows horizontally on mobile | S3 | Add horizontal scroll wrapper |
| 56 | WeightPresets.css | Preset buttons wrap oddly at 480px | S4 | Use `flex-wrap: wrap; justify-content: center` |
| 57 | ContrastDisplays.css | Contrast comparison cards stack but lose alignment context | S4 | Add city color indicators when stacked |

---

## FIX PRIORITY ORDER

### Phase 1: Critical Fixes (1 day, ~4 hours)
These must be fixed first — they break core functionality.

| Bug | Effort | Impact |
|-----|--------|--------|
| #1 Eye button missing | 30 min | Users can't open saved reports on mobile |
| #2 JudgeTab 0.38rem buttons | 15 min | Action buttons unusable on mobile |
| #6 Badge count wrong key | 10 min | Tab badge always shows 0 |
| #4 Header overlap <320px | 45 min | Header unreadable on small phones |
| #5 SettingsModal clipping | 20 min | Settings content unreachable |
| #8 EmiliaChat nav not sticky | 5 min | Can't navigate back in chat |

### Phase 2: High-Priority Alignment (1-2 days, ~6 hours)
These affect data readability on all mobile views.

| Bug | Effort | Impact |
|-----|--------|--------|
| #3 Enhanced city headers misaligned | 2 hrs | Core data display broken |
| #7 City columns too narrow | 1.5 hrs | City names unreadable |
| #12 Dual score headers off | 1.5 hrs | Legal/enforcement scores misaligned |
| #16 7-col grid no 480px rule | 1 hr | Enhanced grid unreadable on phones |
| #9 Badge sizes not uniform | 5 min | Visual inconsistency |
| #10 Tab badges inconsistent | 5 min | Visual inconsistency |

### Phase 3: Polish and Consistency (1 day, ~4 hours)
Visual refinements and minor alignment fixes.

| Bugs | Effort | Impact |
|------|--------|--------|
| #11, #13, #14, #15 | 1 hr | Layout improvements |
| #17-#23 | 1.5 hrs | Overflow and truncation fixes |
| #24-#35 | 1 hr | !important cleanup and dark mode |
| #36-#57 | 1.5 hrs | Minor component fixes |

---

## GLOBAL RECOMMENDATIONS

### 1. Establish Minimum Font Size Policy
**Rule:** No text below 0.6rem (9.6px) on mobile, no interactive text below 0.7rem (11.2px).
**Offenders:** JudgeTab (0.38rem, 0.32rem), EnhancedComparison (0.5rem), TabNavigation (0.55rem)

### 2. Minimum Touch Target Size
**Rule:** All interactive elements must be at least 44x44px on mobile (Apple HIG / WCAG 2.5.5).
**Offenders:** SavedComparisons action-btn (32px default), JudgeTab control-btn (36px), Header admin-btn (26px)

### 3. Remove All `!important` Cascades
**Rule:** If you need `!important`, the specificity chain is broken. Fix the specificity.
**Offenders:** SavedComparisons (6 uses), Results.css (4 uses), AskOlivia.css (8 uses)

### 4. Add Missing 480px Breakpoints
**Files missing 480px rules:** EnhancedComparison expandable grid, VisualsTab, AdvancedVisuals, GunComparisonModal, NewLifeVideos, CourtOrderVideo, JudgeVideo

### 5. Test at 320px Width
Several components have no rules below 480px. The iPhone SE (375px) and older Android phones (360px) are still common. At minimum, ensure nothing overflows at 320px.

### 6. Use CSS Custom Properties for Breakpoints
Replace magic numbers with variables:
```css
:root {
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
}
```

---

## TOTAL EFFORT ESTIMATE

| Phase | Effort | Items |
|-------|--------|-------|
| Phase 1: Critical | ~4 hours | 6 bugs |
| Phase 2: Alignment | ~6 hours | 6 bugs |
| Phase 3: Polish | ~4 hours | 45 issues |
| **Total** | **~14 hours** | **57 issues** |

---

Co-Authored-By: Claude
