# GAMMA API INTEGRATION - LIFE SCORE Visual Reports

**Created:** 2026-01-19
**Status:** Planning
**Issues:** #37-39

---

## OVERVIEW

Gamma API transforms our raw comparison data into beautiful visual storybook presentations with charts, graphs, and city imagery.

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         LIFE SCORE DATA FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ 5 LLMs   │───▶│  Opus    │───▶│  Raw     │───▶│  Gamma API       │  │
│  │ Evaluate │    │  Judge   │    │  Data    │    │  (POST /generate)│  │
│  └──────────┘    └──────────┘    │  Modal   │    └────────┬─────────┘  │
│                                  └──────────┘             │             │
│                                                           ▼             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    GAMMA VISUAL OUTPUT                            │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  • Hero Card (City1 vs City2)                                    │  │
│  │  • 6 Category Cards with Charts                                  │  │
│  │  • Spider/Radar Chart (all categories)                           │  │
│  │  • Winner Summary Card                                           │  │
│  │  • PDF/PPTX Export                                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                       │                                 │
│                                       ▼                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────┐ │
│  │  Visuals Tab    │    │  Ask Olivia Tab │    │  Download PDF/PPTX  │ │
│  │  (Gamma Embed)  │    │  (D-ID/HeyGen)  │    │  (Client Export)    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## GAMMA API REFERENCE

### Base URL
```
https://public-api.gamma.app/v1.0
```

### Authentication
```
Header: X-API-KEY: sk-gamma-xxxxxxxx
```

### Environment Variable
```
GAMMA_API_KEY=sk-gamma-xxxxxxxx
```

---

## ENDPOINTS

### 1. POST /generations - Create Presentation

```bash
curl --request POST \
     --url https://public-api.gamma.app/v1.0/generations \
     --header 'Content-Type: application/json' \
     --header 'X-API-KEY: sk-gamma-xxxxxxxx' \
     --data '{...}'
```

### 2. GET /generations/{id} - Check Status

```bash
curl --request GET \
     --url https://public-api.gamma.app/v1.0/generations/{generationId} \
     --header 'X-API-KEY: sk-gamma-xxxxxxxx' \
     --header 'accept: application/json'
```

### 3. GET /themes - List Available Themes
### 4. GET /folders - List Folders

---

## PARAMETERS REFERENCE

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `inputText` | string | Content for generation (max 100K tokens / ~400K chars) |

### Core Parameters

| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| `textMode` | - | `generate`, `condense`, `preserve` | How to handle inputText |
| `format` | `presentation` | `presentation`, `document`, `social`, `webpage` | Output format |
| `themeId` | workspace default | string | Visual theme ID |
| `numCards` | 10 | 1-60 (Pro), 1-75 (Ultra) | Number of slides |
| `cardSplit` | `auto` | `auto`, `inputTextBreaks` | How to divide content |
| `additionalInstructions` | - | string (1-2000 chars) | Custom instructions |
| `folderIds` | - | string[] | Storage folder IDs |
| `exportAs` | - | `pdf`, `pptx` | Export file format |

### textOptions

| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| `amount` | `medium` | `brief`, `medium`, `detailed`, `extensive` | Text density |
| `tone` | - | string (1-500 chars) | Mood/voice |
| `audience` | - | string (1-500 chars) | Target audience |
| `language` | `en` | language codes | Output language |

### imageOptions

| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| `source` | `aiGenerated` | See table below | Image source |
| `model` | auto | `imagen-4-pro`, `flux-1-pro`, etc. | AI model |
| `style` | - | string (1-500 chars) | Visual style |

**imageOptions.source values:**
| Source | Description |
|--------|-------------|
| `aiGenerated` | AI-generated images (can set model + style) |
| `pictographic` | From Pictographic |
| `unsplash` | Stock from Unsplash |
| `giphy` | GIFs from Giphy |
| `webAllImages` | Web images (unknown license) |
| `webFreeToUse` | Personal use licensed |
| `webFreeToUseCommercially` | Commercial licensed |
| `placeholder` | Empty placeholders |
| `noImages` | No images (use when providing own URLs) |

### cardOptions

| Parameter | Options | Description |
|-----------|---------|-------------|
| `dimensions` | `fluid`, `16x9`, `4x3` (presentation) | Aspect ratio |
| `headerFooter` | object | Header/footer configuration |

**headerFooter positions:** `topLeft`, `topRight`, `topCenter`, `bottomLeft`, `bottomRight`, `bottomCenter`

**headerFooter types:**
- `text`: requires `value`
- `image`: requires `source` (themeLogo/customimage), optional `size` (sm/md/lg/xl), `src` for custom
- `cardNumber`: no config

### sharingOptions

| Parameter | Options | Description |
|-----------|---------|-------------|
| `workspaceAccess` | `noAccess`, `view`, `comment`, `edit`, `fullAccess` | Workspace member access |
| `externalAccess` | `noAccess`, `view`, `comment`, `edit` | External access |
| `emailOptions.recipients` | string[] | Email addresses to share with |
| `emailOptions.access` | `view`, `comment`, `edit`, `fullAccess` | Recipient access level |

---

## LIFE SCORE IMPLEMENTATION

### Recommended Configuration

```json
{
  "inputText": "[Structured comparison data with --- separators]",
  "textMode": "generate",
  "format": "presentation",
  "themeId": "[Clues Intelligence Theme ID]",
  "numCards": 12,
  "cardSplit": "inputTextBreaks",
  "additionalInstructions": "Create visual charts for each category comparison. Include a radar/spider chart comparing all 6 categories. Use professional infographic style. Highlight the winner clearly with score differentials.",
  "exportAs": "pdf",
  "textOptions": {
    "amount": "detailed",
    "tone": "professional, authoritative, data-driven",
    "audience": "digital nomads, expats, relocators, real estate investors",
    "language": "en"
  },
  "imageOptions": {
    "source": "aiGenerated",
    "model": "imagen-4-pro",
    "style": "photorealistic, modern infographics, professional data visualization"
  },
  "cardOptions": {
    "dimensions": "16x9",
    "headerFooter": {
      "topRight": {
        "type": "image",
        "source": "custom",
        "src": "https://lifescore.cluesnomad.com/clues-logo.png",
        "size": "sm"
      },
      "bottomRight": {
        "type": "cardNumber"
      },
      "bottomLeft": {
        "type": "text",
        "value": "LIFE SCORE™ by Clues Intelligence LTD"
      },
      "hideFromFirstCard": true
    }
  },
  "sharingOptions": {
    "workspaceAccess": "view",
    "externalAccess": "view"
  }
}
```

### Input Text Structure

```
# LIFE SCORE™ Comparison: Austin vs Miami
Winner: Austin (72 vs 65)
Score Difference: 7 points
Generated: January 19, 2026

[City images can be embedded as URLs]
---
# Personal Freedom & Autonomy
Austin: 78 | Miami: 71
Winner: Austin (+7)

Key Metrics:
• Cannabis legality: Austin 85 vs Miami 45
• Alcohol regulations: Austin 70 vs Miami 75
• Gambling laws: Austin 60 vs Miami 80

Evidence sources: NORML, state legislature records
---
# Housing & Property Rights
Austin: 65 | Miami: 58
Winner: Austin (+7)

Key Metrics:
• Property tax rates: Austin 55 vs Miami 70
• HOA restrictions: Austin 60 vs Miami 45
• Zoning flexibility: Austin 75 vs Miami 60
---
[Continue for all 6 categories...]
---
# Overall Winner: Austin
Total Score: 72 vs 65
Category Wins: Austin 4, Miami 2, Tie 0

Recommendation: Based on legal freedom metrics, Austin offers
more personal autonomy and business flexibility, while Miami
excels in lifestyle and entertainment options.
```

---

## NEW COMPONENTS REQUIRED

### 1. Gamma Service (`src/services/gammaService.ts`)
- `generateVisualReport(result: EnhancedComparisonResult): Promise<GammaGeneration>`
- `checkGenerationStatus(generationId: string): Promise<GammaStatus>`
- `formatComparisonForGamma(result: EnhancedComparisonResult): string`

### 2. API Endpoint (`api/gamma.ts`)
- POST handler for generation requests
- GET handler for status polling
- Secure API key handling

### 3. Visuals Tab Component (`src/components/VisualsTab.tsx`)
- Gamma iframe/embed display
- Generation status indicator
- Download PDF/PPTX buttons

### 4. Ask Olivia Tab Component (`src/components/AskOliviaTab.tsx`)
- D-ID/HeyGen iframe integration
- Backend data access for Olivia
- Summary/action plan generation

---

## TOOLBAR NAVIGATION UPDATE

Current tabs: Compare | Results | About
New tabs: Compare | Results | **Visuals** | **Ask Olivia** | About

---

## ENVIRONMENT VARIABLES (Vercel)

```
GAMMA_API_KEY=sk-gamma-xxxxxxxx
GAMMA_THEME_ID=[custom theme ID]
GAMMA_FOLDER_ID=[reports folder ID]
```

---

## ASYNC WORKFLOW

1. User completes comparison → Results displayed
2. User clicks "Generate Visual Report" button
3. POST to Gamma API → returns `generationId`
4. Poll GET endpoint until `status: completed`
5. Display Gamma URL in Visuals tab
6. Offer PDF/PPTX download

---

## OLIVIA INTEGRATION POINTS

Olivia (D-ID/GPT/HeyGen) needs access to:
- `EnhancedComparisonResult` - full comparison data
- `GammaGeneration` - visual report URL
- User preferences/history (future)

Backend endpoints for Olivia:
- GET /api/comparison/{id} - fetch comparison data
- GET /api/gamma/{id} - fetch visual report
- POST /api/olivia/summary - generate summary
- POST /api/olivia/action-plan - generate recommendations

---

## NEXT STEPS

1. [ ] Add GAMMA_API_KEY to Vercel environment
2. [ ] Create Clues Intelligence theme in Gamma
3. [ ] Implement `gammaService.ts`
4. [ ] Create `api/gamma.ts` endpoint
5. [ ] Build VisualsTab component
6. [ ] Build AskOliviaTab component
7. [ ] Update TabNavigation with new tabs
8. [ ] Test end-to-end flow
9. [ ] Implement PDF download handling

---

*Document created for LIFE SCORE #37-39 Gamma Integration*
*Clues Intelligence LTD - 2026*
