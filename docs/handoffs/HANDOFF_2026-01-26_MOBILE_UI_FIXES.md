# HANDOFF: Mobile UI Fixes
**Date:** 2026-01-26
**Conversation ID:** d47cc2cb-2041-4df1-8a93-6d93e7fe4416
**Priority:** HIGH - User-reported mobile UI issues blocking usability

---

## CRITICAL: 6 Mobile UI Issues To Fix

### Issue #1: TOP 5 DECIDING FACTORS Table Overflow
**Location:** `src/components/EnhancedComparison.tsx` and `src/components/EnhancedComparison.css`
**Problem:** After enhanced search returns, the "TOP 5 DECIDING FACTORS" section with columns METRIC | CITY A | CITY B | WINNER has text that scrolls off screen to the right. Text is twice as wide as the screen allows.
**Fix Required:**
- Find the table/grid for "top differences" or "deciding factors"
- Add `word-wrap: break-word`, `overflow-wrap: break-word`
- Add `max-width: 100%` to container
- Consider horizontal scroll wrapper OR reduce column widths on mobile
- Search for: `.top-differences`, `.deciding-factors`, `.diff-table`

### Issue #2: City A / City B Tabs Too Big
**Location:** Results data page sections - likely `src/components/EnhancedComparison.css` or `src/components/Results.css`
**Problem:** The City A and City B tabs that display in results sections are too large and overshoot the page to the right and slightly left on mobile.
**Fix Required:**
- Find tab styles (search for `.city-tab`, `.result-tab`, `.city-toggle`)
- Add `max-width: 100%` to tab container
- Reduce font-size and padding on mobile (480px breakpoint)
- Ensure `box-sizing: border-box` on tabs

### Issue #3: "Score Display Mode" Not Centered
**Location:** Category Breakdown section card - `src/components/EnhancedComparison.css`
**Problem:** The text "Score Display Mode" needs to be centered on mobile but looks fine on desktop.
**Fix Required:**
- Find `.score-display-mode` or similar class
- Add mobile media query with `text-align: center`
- Only apply to mobile breakpoint (max-width: 768px or 480px)

### Issue #4: Law vs Reality Table Overflow & Header Overlap
**Location:** City A/B data fields table - `src/components/EnhancedComparison.css`
**Problem:**
1. Data in the Law vs Reality table spools off screen to the right
2. The header text "Law vs Reality" for both cities overlaps on mobile
**Fix Required:**
- Wrap table in horizontal scroll container: `overflow-x: auto`
- Fix header overlap - reduce font size or stack vertically on mobile
- Search for: `.law-reality`, `.dual-score`, `.enforcement-table`
- Add `white-space: nowrap` prevention or column width constraints

### Issue #5: Light/Dark Toggle Position
**Location:** `src/components/Header.tsx` and `src/components/Header.css`
**Problem:** The light/dark toggle on home page blocks header text on mobile when screen is horizontal/landscape.
**Fix Required:**
- Move toggle from top-right to top-left on BOTH desktop and mobile
- Update CSS positioning
- Ensure it doesn't overlap with other header elements

### Issue #6: Olivia Display Screen Too Large
**Location:** `src/components/AskOlivia.tsx` and `src/components/AskOlivia.css`
**Problem:** The display screen where Olivia is shown (default screen text and graphics) is still too big for the mobile screen.
**Fix Required:**
- Scale the Olivia TV/display container to 70% of current size
- Use `transform: scale(0.7)` or reduce width/height by 30%
- Apply relative to screen size using `min()` or viewport units
- Search for: `.olivia-tv`, `.olivia-display`, `.avatar-container`

---

## Files To Modify

| File | Issues |
|------|--------|
| `src/components/EnhancedComparison.css` | #1, #2, #3, #4 |
| `src/components/EnhancedComparison.tsx` | #1 (if structure changes needed) |
| `src/components/Header.css` | #5 |
| `src/components/Header.tsx` | #5 (if JSX order changes) |
| `src/components/AskOlivia.css` | #6 |
| `src/components/Results.css` | #2 (possibly) |

---

## Testing Checklist

After fixing, test on:
- [ ] Mobile portrait (375px width)
- [ ] Mobile landscape (667px width)
- [ ] Tablet (768px width)
- [ ] Desktop (1200px+ width)

For each issue:
- [ ] #1 - TOP 5 DECIDING FACTORS fits on screen, text wraps
- [ ] #2 - City A/B tabs don't overflow
- [ ] #3 - "Score Display Mode" centered on mobile
- [ ] #4 - Law vs Reality table scrollable, headers don't overlap
- [ ] #5 - Toggle is top-left, doesn't block header
- [ ] #6 - Olivia display is 70% size, fits mobile screen

---

## Recent Commits This Session

```
a4d6da7 Fix TypeScript errors and mobile LLM button overflow
8c41b94 Fix unused variable TypeScript error in CostDashboard
6be68ca Add Stripe environment variables to .env.example
1e820f0 Add Supabase database persistence for API cost tracking
```

---

## What Was Fixed This Session

1. **API Cost Dashboard** - Now saves to Supabase database (not just localStorage)
2. **Stripe Integration** - Environment variables documented, SQL migrations provided
3. **TypeScript Errors** - Fixed `normalizedScore` and `totalScore` property errors in `api/judge-report.ts`
4. **Mobile LLM Buttons** - Fixed overflow on `.llm-selector` container

---

## DO NOT TOUCH

- Gemini API code - User reports it was working before, investigate carefully if needed
- Error handling - User explicitly said no more error handling changes
- Any API endpoint logic unless directly related to UI

---

## Build Command

```bash
cd d:/lifescore && npm run build
```

Must pass with no TypeScript errors before committing.
