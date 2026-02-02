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

```bash
curl -X GET https://public-api.gamma.app/v1.0/themes \
     -H "X-API-KEY: sk-gamma-xxxxxxxx"
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string (optional) | Search by name (case-insensitive) |
| `limit` | integer (optional) | Items per page (max 50) |
| `after` | string (optional) | Cursor for pagination |

**Response:**
```json
{
  "data": [
    {
      "id": "abcdefghi",
      "name": "Prism",
      "type": "custom",
      "colorKeywords": ["light", "blue", "pink"],
      "toneKeywords": ["playful", "friendly"]
    }
  ],
  "hasMore": true,
  "nextCursor": "abc123def456"
}
```

**Theme types:**
- `standard` - Global themes available to all
- `custom` - Workspace-specific themes

### 4. GET /folders - List Folders

```bash
curl -X GET https://public-api.gamma.app/v1.0/folders \
     -H "X-API-KEY: sk-gamma-xxxxxxxx"
```

**Query Parameters:** Same as themes (`query`, `limit`, `after`)

**Response:**
```json
{
  "data": [
    { "id": "abc123def456", "name": "LIFE SCORE Reports" }
  ],
  "hasMore": false,
  "nextCursor": null
}
```

### 5. POST /generations/from-template - Create from Template (BETA)

```bash
curl --request POST \
     --url https://public-api.gamma.app/v1.0/generations/from-template \
     --header 'Content-Type: application/json' \
     --header 'X-API-KEY: sk-gamma-xxxxxxxx' \
     --data '{ "gammaId": "g_xxx", "prompt": "..." }'
```

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

## TEMPLATES API (BETA) - RECOMMENDED FOR LIFE SCORE

The Templates API allows us to create a master template once, then inject data for consistent reports.

### Endpoint

```bash
POST https://public-api.gamma.app/v1.0/generations/from-template
```

### Why Templates > Regular API

| Aspect | Regular API | Templates API |
|--------|-------------|---------------|
| Structure | AI decides layout | **Template defines layout** |
| Consistency | Varies each time | **Uniform every report** |
| Branding | Must specify each call | **Locked into template** |
| Speed | More AI processing | **Faster generation** |
| Token usage | Higher | **Lower (structure pre-defined)** |

### Template API Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `gammaId` | **Yes** | Template ID (from Gamma app) |
| `prompt` | **Yes** | Data + instructions to inject |
| `themeId` | No | Override template theme |
| `folderIds` | No | Storage folders |
| `exportAs` | No | `pdf` or `pptx` |
| `imageOptions.model` | No | AI image model |
| `imageOptions.style` | No | Image style (1-500 chars) |
| `sharingOptions` | No | Same as regular API |

### Finding gammaId

1. Open template in Gamma app
2. Copy from URL or settings panel
3. Format: `g_abcdef123456ghi`

### Example Request

```json
{
  "gammaId": "g_lifescore_comparison_v1",
  "prompt": "Create LIFE SCORE comparison report:\n\nCities: Austin, TX vs Miami, FL\nWinner: Austin (72 vs 65)\n\nPersonal Freedom: Austin 78, Miami 71\n- Cannabis: Austin 85, Miami 45\n- Alcohol: Austin 70, Miami 75\n\nHousing & Property: Austin 65, Miami 58\n...\n\nUse these city images:\nhttps://example.com/austin.jpg\nhttps://example.com/miami.jpg",
  "exportAs": "pdf",
  "imageOptions": {
    "model": "imagen-4-pro",
    "style": "professional infographics, data visualization"
  }
}
```

### Master Template Design (Create in Gamma App)

**Card 1: Hero**
- Title placeholder: "[City1] vs [City2]"
- Winner badge area
- Overall scores display
- City imagery slots

**Card 2: Radar Chart**
- All 6 categories compared
- Visual legend

**Cards 3-8: Category Breakdowns**
- Category name + scores
- Top 3 metrics highlighted
- Bar chart comparison
- Evidence sources

**Card 9: Winner Summary**
- Final verdict
- Key takeaways
- Score differential

**Card 10: Clues CTA**
- "Ask Olivia" prompt
- More reports available
- Clues ecosystem links

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
        "src": "https://clueslifescore.com/clues-logo.png",
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
