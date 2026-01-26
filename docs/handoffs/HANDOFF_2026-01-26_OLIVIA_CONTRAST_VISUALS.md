# HANDOFF: Olivia Contrast Visualization Screens

**Date:** 2026-01-26
**Conversation ID:** LIFESCORE-2026-01-26-MOBILE-UI-B
**Priority:** MEDIUM - New feature for Ask Olivia
**Status:** PLANNED - Ready for implementation

---

## Feature Overview

Add two AI-generated image display screens below Olivia's main viewport - one for City A (left) and one for City B (right). When Olivia discusses specific metrics or differences, these screens show contrasting images depicting the real-world lived experience in each city.

**Example:** If discussing cannabis laws:
- City A screen (high score): Person enjoying coffee with a smoke in a cafe, freedom banner
- City B screen (low score): Scared person behind bars in a prison cell

---

## UI Layout

```
┌─────────────────────────────────────────────────────────┐
│                    COCKPIT HEADER                        │
├─────────────────────────────────────────────────────────┤
│              [ OLIVIA MAIN VIEWPORT ]                    │
│                  (existing TV screen)                    │
├─────────────────────────────────────────────────────────┤
│   ┌──────────────────┐     ┌──────────────────┐         │
│   │    CITY A        │     │    CITY B        │         │
│   │   [AI Generated  │     │   [AI Generated  │         │
│   │   Freedom Scene] │     │   Restriction]   │         │
│   └──────────────────┘     └──────────────────┘         │
├─────────────────────────────────────────────────────────┤
│              (rest of UI moved down slightly)            │
└─────────────────────────────────────────────────────────┘
```

---

## Technical Decisions

### Image Generation: Flux (via Replicate)
- **Speed:** ~5-8 seconds per image
- **Quality:** Excellent photorealism
- **Cost:** ~$0.003-0.005 per image (10x cheaper than DALL-E)
- **Reason:** Already used by Gamma reports, proven in codebase

---

## Files to Create

| File | Purpose |
|------|---------|
| `api/olivia/contrast-images.ts` | Flux image generation endpoint |
| `src/components/ContrastDisplays.tsx` | Dual display UI component |
| `src/components/ContrastDisplays.css` | Premium bezel styling |
| `src/hooks/useContrastImages.ts` | State management hook |
| `src/services/contrastImageService.ts` | Prompt templates for 100 metrics |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AskOlivia.tsx` | Add ContrastDisplays below viewport |
| `src/components/AskOlivia.css` | Layout adjustments for new screens |

---

## Implementation Steps

1. Create API endpoint for Flux image generation
2. Create ContrastDisplays React component with premium bezel styling
3. Create useContrastImages hook for state management
4. Create prompt templates for key metrics (start with top 20 differences)
5. Integrate into AskOlivia.tsx below main viewport
6. Add caching to avoid regenerating same images
7. Test on mobile (stack vertically on small screens)

---

## Prompt to Start Next Conversation

```
Read d:\lifescore\docs\handoffs\HANDOFF_2026-01-26_OLIVIA_CONTRAST_VISUALS.md and implement the Olivia Contrast Visualization Screens feature. Start with the API endpoint and ContrastDisplays component.
```

---

## Full Plan File

See: `C:\Users\broke\.claude\plans\jaunty-cooking-lightning.md`
