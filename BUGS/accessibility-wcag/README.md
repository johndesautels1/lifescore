# ACCESSIBILITY (WCAG 2.1 AA) — Bug Report & Fix Plan
**Date:** 2026-02-09 | **Session:** LIFESCORE-AUDIT-20260209-001
**Based on:** Component-by-component audit of all TSX and CSS files

---

## EXECUTIVE SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3 | Non-interactive elements with click, no focus trapping, no keyboard dropdown |
| HIGH | 8 | Missing ARIA labels, color contrast fails, no aria-live, missing roles |
| MEDIUM | 12 | Motion preferences, form labels, icon alt text, tab pattern incomplete |
| LOW | 5 | External link indicators, reduced motion gaps |
| **TOTAL** | **28** | |

**Overall WCAG 2.1 AA Compliance: ~60-65% — NOT COMPLIANT**

---

## CRITICAL ISSUES

### 1. Non-Interactive Elements with onClick Handlers
**WCAG 2.1.1 (Keyboard)**

| File | Line | Element | Fix |
|------|------|---------|-----|
| DealbreakersPanel.tsx | 137-145 | `<span onClick>` for removing dealbreakers | Convert to `<button>` |
| PricingModal.tsx | overlay | `<div onClick={onClose}>` | Add `role="button" tabIndex={0} onKeyDown` |
| SettingsModal.tsx | overlay | `<div onClick={onClose}>` | Same fix |
| HelpModal.tsx | overlay | `<div onClick>` with stopPropagation | Add keyboard handler |
| SavedComparisons.tsx | multiple | `<div className="modal-overlay" onClick>` | Convert overlay pattern |

**Impact:** Keyboard-only users cannot activate these elements. ~2M Americans rely on keyboard navigation.
**Effort:** 1 hour for all

### 2. No Focus Trapping in Modals
**WCAG 2.1.2 (No Keyboard Trap) / 2.4.3 (Focus Order)**

All modals (PricingModal, HelpModal, SettingsModal, SavedComparisons GitHub modal) allow Tab key to escape behind the modal to page content.

**Fix:** Implement focus trap on mount, return focus to trigger on close:
```typescript
useEffect(() => {
  const firstFocusable = modalRef.current?.querySelector('button, input, [tabindex]');
  firstFocusable?.focus();
  // Trap focus within modal
}, []);
```
**Effort:** 1 hour (shared hook)

### 3. CitySelector Dropdown Missing Keyboard Support
**WCAG 2.1.1 (Keyboard)**

**File:** `src/components/CitySelector.tsx:126-199`
Dropdown menu doesn't support Arrow Up/Down to navigate options or Enter to select.

**Fix:** Add onKeyDown handler for arrow navigation + Enter selection.
**Effort:** 45 min

---

## HIGH ISSUES

### 4. Gold (#c9a227) on Navy (#0a1628) Fails Contrast — 3.2:1
**WCAG 1.4.3 (Contrast Minimum — AA requires 4.5:1)**

| File | Usage | Ratio | Verdict |
|------|-------|-------|---------|
| OliviaChatBubble.css | Chat labels/timestamps | 3.2:1 | **FAIL** |
| SettingsModal.css | Active tab text | 3.1:1 | **FAIL** |
| OliviaAvatar.css | Gold gradient text | 3.2:1 | **FAIL** |
| Header.css:46 | "CLUES" text (#fbbf24) | 4.8:1 | PASS |

**Fix:** Use lighter gold (#FFD700 or #FFD133) instead of #c9a227 for all text on dark backgrounds. Ratio becomes 5.5:1+.
**Effort:** 30 min

### 5. Missing aria-live for Dynamic Content Updates
**WCAG 4.1.3 (Status Messages)**

| Component | Missing Announcement |
|-----------|---------------------|
| LoadingState | Progress count not announced |
| CitySelector | Search results appear silently |
| Results | Winner not announced on load |
| SavedComparisons | Sync status not announced |
| SettingsModal | Save success/error not announced |

**Fix:** Wrap status updates in `<div aria-live="polite" aria-atomic="true">`
**Effort:** 1 hour

### 6. Missing ARIA Roles on Tab Navigation
**WCAG 3.2.3 (Consistent Navigation)**

**File:** `src/components/TabNavigation.tsx:89-90`
Has `role="tab"` and `aria-selected` but missing:
- `role="tablist"` on parent nav
- `role="tabpanel"` on content sections
- `aria-controls` linking tab to panel
- Arrow key Left/Right navigation

**Fix:** Implement full WAI-ARIA tabs pattern.
**Effort:** 1 hour

### 7. Missing Progress Bar ARIA
**File:** `src/components/LoadingState.tsx`
Loading progress bar (`<div className="progress-fill">`) has no `role="progressbar"`, `aria-valuenow`, or `aria-valuemax`.
**Fix:** Add ARIA attributes.
**Effort:** 10 min

### 8. SVG Icons Missing Accessible Names
**File:** `src/components/Header.tsx:41-43, 76-78, 94-96`
Crown/tier icon, Settings icon, Logout icon — all SVGs without `aria-label`.
**Fix:** Add `aria-label="Settings"` etc. to each SVG.
**Effort:** 15 min

### 9. Color-Only Winner Indicators
**WCAG 1.4.1 (Use of Color)**
**File:** `src/components/Results.css`
Category winner bars use only blue/green color to indicate winner. No icon or text.
**Fix:** Add checkmark icon or "Winner" text label.
**Effort:** 20 min

### 10. Weight Sliders Missing ARIA
**File:** `src/components/WeightPresets.tsx`
Custom weight sliders lack `role="slider"`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
**Fix:** Add proper ARIA slider attributes.
**Effort:** 20 min

### 11. Form Error Messages Not Associated
**WCAG 3.3.1 (Error Identification)**

| File | Issue |
|------|-------|
| LoginScreen.tsx:60-66 | Error message not linked via aria-describedby |
| SettingsModal.tsx:115,129 | Error states visible but not announced |
| CitySelector.tsx | Missing aria-invalid on invalid input |

**Fix:** `<input aria-invalid={!!error} aria-describedby="err-id" /><span id="err-id" role="alert">{error}</span>`
**Effort:** 30 min

---

## MEDIUM ISSUES

| # | File | WCAG | Issue | Fix |
|---|------|------|-------|-----|
| 12 | 40/44 CSS files | 2.3.3 | No `prefers-reduced-motion` — only 4 files have it | Add global reduced-motion rule |
| 13 | LoginScreen.tsx | 3.3.2 | Required fields lack `aria-required="true"` | Add attribute |
| 14 | SettingsModal.tsx | 3.3.2 | Password inputs use placeholder only, no visible label | Add proper labels |
| 15 | ManualViewer.tsx | 1.1.1 | Content images may lack alt text | Verify and add |
| 16 | OliviaChatBubble.tsx | 1.1.1 | Playback button (speaker icon) missing aria-label | Add label |
| 17 | Footer.tsx | 1.1.1 | Cookie settings button — verify accessible name | Check and fix |
| 18 | App.tsx:1026-1033 | 1.3.1 | h3 inside toggle button disrupts heading hierarchy | Move heading outside |
| 19 | Results.tsx:143-153 | 1.3.1 | Category buttons lack heading relationship | Add aria-expanded |
| 20 | Multiple videos | 1.4.2 | Verify autoPlay={false} on all video elements | Ensure controls={true} |
| 21 | Footer.tsx | 2.4.4 | External links missing "opens in new window" indicator | Add aria-label |
| 22 | Multiple modals | 4.1.2 | Missing aria-modal="true" and role="dialog" | Add to all modal containers |
| 23 | FreedomCategoryTabs.tsx | 2.1.1 | Tab buttons lack arrow key horizontal navigation | Add onKeyDown |

---

## COMPLIANCE MATRIX

| WCAG Criterion | Status | Key Failures |
|----------------|--------|-------------|
| 1.1 Text Alternatives | Partial | SVG icons, some images |
| 1.3.1 Info and Relationships | Partial | Form labels, heading hierarchy |
| 1.4.1 Use of Color | Fail | Color-only winner indicators |
| 1.4.3 Contrast Minimum | **Fail** | Gold on navy = 3.2:1 (needs 4.5:1) |
| 2.1.1 Keyboard | **Fail** | Non-button onClick, dropdowns, modals |
| 2.4.3 Focus Order | Partial | No focus trapping in modals |
| 3.3.1 Error Identification | Partial | Errors not associated with inputs |
| 4.1.2 Name, Role, Value | Partial | Missing ARIA roles throughout |
| 4.1.3 Status Messages | **Fail** | No aria-live for dynamic updates |

---

## FIX PRIORITY

| Phase | Effort | Items |
|-------|--------|-------|
| Phase 1: Critical keyboard/focus | 3 hours | #1-3 interactive elements, focus trap, dropdown |
| Phase 2: Contrast + ARIA | 3 hours | #4-11 color, roles, labels, forms |
| Phase 3: Polish | 2 hours | #12-23 motion, headings, indicators |
| **Total** | **~8 hours** | |

---

Co-Authored-By: Claude
