# CRITICAL HANDOFF: GAMMA API INTEGRATION

**Session ID:** LIFESCORE-2026-0120-B
**Date:** January 19, 2026
**Priority:** HIGHEST - This is the visual heart of the Clues product
**Status:** Documentation complete, implementation ready to begin

---

## DO NOT SKIP THIS SECTION

**READ THESE FILES FIRST:**
1. `D:\LifeScore\GAMMA_API_INTEGRATION.md` - Complete API reference (500+ lines)
2. `D:\LifeScore\README.md` - Architecture overview section
3. This handoff document

**CRITICAL:** The Gamma integration transforms bland comparison data into beautiful visual storybook presentations. This is NOT optional - it's the core differentiator of the Clues product.

---

## WHAT WAS COMPLETED THIS SESSION

### Issues Fixed
| Issue | Description | Commit |
|-------|-------------|--------|
| #19 | Saved button persistence | `1e94321` |
| #23-29 | Rebrand to Clues Intelligence LTD | `3ae6461` |

### Documentation Created
| File | Purpose | Lines |
|------|---------|-------|
| `GAMMA_API_INTEGRATION.md` | Complete Gamma API reference | 500+ |
| `README.md` Gamma section | Architecture overview | 50+ |
| This handoff | Implementation guide | 400+ |

### Commits This Session
```
93dc1d6 Update Gamma API docs: Templates API + List endpoints
5f34b7b Add Gamma API integration documentation (#37-39)
ff6fb6a Update README: Mark #23-29 as FIXED
3ae6461 Fix #23-29: Rebrand to Clues Intelligence LTD
b41e952 Update README: Mark #19 as FIXED
1e94321 Fix #19: Saved button persistence - deterministic comparison IDs
```

---

## GAMMA API COMPLETE REFERENCE

### Base URL
```
https://public-api.gamma.app/v1.0
```

### Authentication
```
Header: X-API-KEY: sk-gamma-xxxxxxxx
Environment Variable: GAMMA_API_KEY
```

### All Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generations` | POST | Create presentation from scratch |
| `/generations/{id}` | GET | Check generation status |
| `/generations/from-template` | POST | Create from template (BETA) - **RECOMMENDED** |
| `/themes` | GET | List available themes |
| `/folders` | GET | List storage folders |

---

## TWO APPROACHES: Regular vs Templates

### Regular API (`POST /generations`)

**When to use:** Custom one-off presentations

**Required Parameters:**
- `inputText` (string, required) - Content with `\n---\n` for card breaks

**Key Parameters:**
```json
{
  "inputText": "Content here with --- separators",
  "textMode": "generate|condense|preserve",
  "format": "presentation|document|social|webpage",
  "themeId": "theme-id-string",
  "numCards": 10,
  "cardSplit": "auto|inputTextBreaks",
  "additionalInstructions": "Custom instructions (1-2000 chars)",
  "exportAs": "pdf|pptx",
  "textOptions": {
    "amount": "brief|medium|detailed|extensive",
    "tone": "professional, data-driven (1-500 chars)",
    "audience": "digital nomads, expats (1-500 chars)",
    "language": "en"
  },
  "imageOptions": {
    "source": "aiGenerated|unsplash|noImages|etc",
    "model": "imagen-4-pro|flux-1-pro",
    "style": "photorealistic, infographic (1-500 chars)"
  },
  "cardOptions": {
    "dimensions": "fluid|16x9|4x3",
    "headerFooter": {
      "topRight": { "type": "image", "source": "custom", "src": "url", "size": "sm" },
      "bottomRight": { "type": "cardNumber" },
      "bottomLeft": { "type": "text", "value": "LIFE SCORE™" },
      "hideFromFirstCard": true
    }
  },
  "sharingOptions": {
    "workspaceAccess": "view|comment|edit|fullAccess",
    "externalAccess": "noAccess|view|comment|edit"
  }
}
```

### Templates API (`POST /generations/from-template`) - RECOMMENDED

**When to use:** Uniform, branded reports (LIFE SCORE should use this)

**Why Templates:**
- Consistent layout every report
- Branding locked into template
- Faster generation
- Lower token usage
- Just inject data via prompt

**Required Parameters:**
- `gammaId` (string, required) - Template ID from Gamma app
- `prompt` (string, required) - Data + instructions to inject

**Example:**
```json
{
  "gammaId": "g_lifescore_comparison_v1",
  "prompt": "Create report for Austin vs Miami:\nWinner: Austin (72 vs 65)\nPersonal Freedom: Austin 78, Miami 71...",
  "exportAs": "pdf",
  "imageOptions": {
    "model": "imagen-4-pro",
    "style": "professional infographics"
  }
}
```

---

## LIFE SCORE VISUAL REPORT STRUCTURE

### Data Flow
```
┌─────────────────────────────────────────────────────────────────────┐
│                     LIFE SCORE VISUAL PIPELINE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────┐   ┌─────────┐   ┌──────────┐   ┌─────────────────────┐ │
│  │ 5 LLMs  │──▶│  Opus   │──▶│ Raw Data │──▶│ formatForGamma()    │ │
│  │Evaluate │   │ Judge   │   │ Modal    │   │ (transform data)    │ │
│  └─────────┘   └─────────┘   └──────────┘   └──────────┬──────────┘ │
│                                                         │            │
│                                                         ▼            │
│                                              ┌─────────────────────┐ │
│                                              │ POST /from-template │ │
│                                              │ gammaId + prompt    │ │
│                                              └──────────┬──────────┘ │
│                                                         │            │
│                                                         ▼            │
│                                              ┌─────────────────────┐ │
│                                              │ Poll GET /gen/{id}  │ │
│                                              │ until completed     │ │
│                                              └──────────┬──────────┘ │
│                                                         │            │
│                              ┌───────────────┬──────────┴──────────┐ │
│                              ▼               ▼                     ▼ │
│                      ┌────────────┐  ┌─────────────┐  ┌───────────┐ │
│                      │ Visuals    │  │ Ask Olivia  │  │ Download  │ │
│                      │ Tab        │  │ Tab         │  │ PDF/PPTX  │ │
│                      │ (embed)    │  │ (D-ID/GPT)  │  │           │ │
│                      └────────────┘  └─────────────┘  └───────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Master Template Card Structure (Create in Gamma App)

```
Card 1:  HERO
         - "[City1] vs [City2]" title
         - Winner badge with score differential
         - City images side by side
         - Overall scores: 72 vs 65

Card 2:  RADAR CHART
         - All 6 categories visualized
         - City1 color vs City2 color
         - Visual legend

Card 3:  PERSONAL FREEDOM
         - Category scores: 78 vs 71
         - Bar chart of top metrics
         - Key evidence bullets

Card 4:  HOUSING & PROPERTY
         - Category scores
         - Bar chart
         - Evidence

Card 5:  BUSINESS & WORK
         - Category scores
         - Bar chart
         - Evidence

Card 6:  TRANSPORTATION
         - Category scores
         - Bar chart
         - Evidence

Card 7:  POLICING & COURTS
         - Category scores
         - Bar chart
         - Evidence

Card 8:  SPEECH & LIFESTYLE
         - Category scores
         - Bar chart
         - Evidence

Card 9:  WINNER SUMMARY
         - Final verdict declaration
         - Score breakdown table
         - Key differentiators
         - Recommendation

Card 10: CLUES ECOSYSTEM CTA
         - "Want deeper analysis? Ask Olivia"
         - Links to other Clues products
         - Contact information
         - Clues Intelligence LTD branding
```

---

## FILES TO CREATE

### 1. `src/services/gammaService.ts`

```typescript
// Gamma API integration service
// - formatComparisonForGamma(result: EnhancedComparisonResult): string
// - generateVisualReport(result, options): Promise<GammaGeneration>
// - checkGenerationStatus(generationId): Promise<GammaStatus>
// - getThemes(): Promise<GammaTheme[]>
// - getFolders(): Promise<GammaFolder[]>
```

### 2. `api/gamma.ts` (Vercel serverless)

```typescript
// POST handler - create generation
// GET handler - check status
// Secure API key from env
// Rate limiting
```

### 3. `src/components/VisualsTab.tsx`

```typescript
// Display Gamma embed/iframe
// "Generate Report" button
// Generation progress indicator
// Download PDF/PPTX buttons
// Share options
```

### 4. `src/components/AskOliviaTab.tsx`

```typescript
// D-ID/HeyGen iframe embed
// Backend data access for Olivia
// Summary generation
// Action plan generation
// Clues ecosystem recommendations
```

### 5. `src/types/gamma.ts`

```typescript
interface GammaGenerationRequest {
  gammaId?: string;
  inputText?: string;
  prompt?: string;
  textMode?: 'generate' | 'condense' | 'preserve';
  format?: 'presentation' | 'document' | 'social' | 'webpage';
  themeId?: string;
  numCards?: number;
  cardSplit?: 'auto' | 'inputTextBreaks';
  additionalInstructions?: string;
  exportAs?: 'pdf' | 'pptx';
  textOptions?: GammaTextOptions;
  imageOptions?: GammaImageOptions;
  cardOptions?: GammaCardOptions;
  sharingOptions?: GammaSharingOptions;
}

interface GammaGenerationResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  pdfUrl?: string;
  pptxUrl?: string;
  error?: string;
}
```

---

## ENVIRONMENT VARIABLES TO ADD (Vercel)

```
GAMMA_API_KEY=sk-gamma-xxxxxxxx
GAMMA_TEMPLATE_ID=[create template, get ID]
GAMMA_FOLDER_ID=[optional - for organizing reports]
GAMMA_THEME_ID=[optional - if not using template theme]
```

---

## IMPLEMENTATION ORDER

1. **Create master template in Gamma app** (manual, in browser)
   - Design 10-card structure
   - Set Clues branding
   - Get `gammaId`

2. **Add environment variables to Vercel**
   - GAMMA_API_KEY
   - GAMMA_TEMPLATE_ID

3. **Create `src/types/gamma.ts`**
   - Type definitions for all API requests/responses

4. **Create `src/services/gammaService.ts`**
   - `formatComparisonForGamma()` - transform EnhancedComparisonResult to prompt
   - `generateVisualReport()` - call POST /from-template
   - `checkGenerationStatus()` - poll GET /generations/{id}

5. **Create `api/gamma.ts`**
   - Serverless endpoint for Gamma API calls
   - Secure API key handling

6. **Create `src/components/VisualsTab.tsx`**
   - UI for viewing/generating reports
   - Embed Gamma presentation
   - Download buttons

7. **Update `src/components/TabNavigation.tsx`**
   - Add "Visuals" tab
   - Add "Ask Olivia" tab

8. **Create `src/components/AskOliviaTab.tsx`**
   - D-ID/HeyGen integration (separate implementation)

9. **Test end-to-end flow**
   - Complete comparison → Generate report → View in Visuals tab → Download PDF

---

## OLIVIA INTEGRATION POINTS

Olivia (D-ID/GPT/HeyGen AI assistant) needs backend access to:

1. **Comparison Data**
   - `EnhancedComparisonResult` object
   - All scores, evidence, categories
   - Winner determination logic

2. **Visual Report**
   - Gamma URL
   - PDF download URL
   - Report metadata

3. **User Context** (future)
   - User preferences
   - Previous comparisons
   - Saved reports

**Backend endpoints for Olivia:**
```
GET  /api/comparison/{id}     - Fetch comparison data
GET  /api/gamma/{id}          - Fetch visual report
POST /api/olivia/summary      - Generate AI summary
POST /api/olivia/action-plan  - Generate recommendations
```

---

## CRITICAL REMINDERS

### DO NOT:
- Change timeout values without permission
- Change API model names without permission
- Change API key names without permission
- Skip the template approach (it's more reliable)
- Hardcode API keys in client code

### DO:
- Use Templates API (`/from-template`) for consistent reports
- Poll status endpoint until `completed`
- Handle export URL expiration (download immediately or store)
- Add proper error handling for API failures
- Test with real comparison data

---

## QUICK START FOR NEXT SESSION

```
Continue LIFE SCORE Gamma integration (#37-39).

READ FIRST:
1. D:\LifeScore\GAMMA_API_INTEGRATION.md - Full API reference
2. D:\LifeScore\HANDOFF_GAMMA_INTEGRATION.md - This file
3. D:\LifeScore\README.md - Architecture overview

CONTEXT:
- Gamma API documentation is COMPLETE
- Templates API (Beta) is RECOMMENDED approach
- Need to create master template in Gamma app first
- Then implement: gammaService.ts → api/gamma.ts → VisualsTab.tsx

IMPLEMENTATION ORDER:
1. Create template in Gamma app (manual)
2. Add GAMMA_API_KEY to Vercel
3. Create src/types/gamma.ts
4. Create src/services/gammaService.ts
5. Create api/gamma.ts
6. Create src/components/VisualsTab.tsx
7. Update TabNavigation.tsx
8. Test end-to-end

DO NOT START CODING WITHOUT:
- GAMMA_API_KEY configured
- Template created with gammaId
- Understanding the full API reference

Conversation ID: LIFESCORE-2026-0120-GAMMA
```

---

## GIT STATUS AT HANDOFF

```
Branch: main
Latest commit: 93dc1d6
All changes pushed to: https://github.com/johndesautels1/lifescore.git
Working tree: clean
```

---

**This integration is CRITICAL to Clues Intelligence LTD. Handle with maximum care.**

*Clues Intelligence LTD - 2026*
