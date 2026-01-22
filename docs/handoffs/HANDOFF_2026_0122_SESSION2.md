# LIFE SCORE - HANDOFF SESSION 2
**Conversation ID:** `LIFESCORE-OLIVIA-2026-0122-S2`
**Date:** January 22, 2026
**Previous Session:** `LIFESCORE-OLIVIA-2026-0122`
**Status:** D-ID Video Avatar Working - Need Enhanced Context for OpenAI

---

## CRITICAL BUG TO FIX FIRST

**Letter "C" not working in Olivia chat input**
- User reports the letter "c" doesn't type in the Ask Olivia text input
- Likely a CSS or JavaScript event handler issue
- Check `AskOlivia.tsx` text input and any keypress handlers

---

## IMMEDIATE TASK: OPTION A - Enhanced Context Builder

### Goal
Make Olivia know ALL 100 metrics from the user's LIFE SCORE comparison, not just top 10.

### Current State
- Context builder at `/api/olivia/context.ts` works
- Only sends top 10 metrics to save tokens
- Token limit is 8000

### What Needs to Change

**File:** `api/olivia/context.ts`

1. **Increase token limit:** 8000 → 16000 (or dynamic based on model)

2. **Include ALL 100 metrics:**
```typescript
// Current (line 189):
const topMetrics = allMetricDiffs.slice(0, 10);

// Change to:
const topMetrics = allMetricDiffs; // All metrics
```

3. **Add metric display names** (from gammaService.ts METRIC_DISPLAY_NAMES)

4. **Generate text summary for Gamma-like context:**
```typescript
function generateReportSummary(context: LifeScoreContext): string {
  let summary = `# LIFE SCORE Comparison Report\n\n`;
  summary += `## ${context.comparison.city1.name} vs ${context.comparison.city2.name}\n\n`;
  summary += `**Winner:** ${context.comparison.winner} by ${context.comparison.scoreDifference} points\n\n`;

  // Add all categories
  summary += `## Category Breakdown\n`;
  context.categories.forEach(cat => {
    summary += `### ${cat.name}\n`;
    summary += `- ${context.comparison.city1.name}: ${cat.city1Score}/100\n`;
    summary += `- ${context.comparison.city2.name}: ${cat.city2Score}/100\n`;
    cat.topMetrics.forEach(m => {
      summary += `  - ${m.name}: ${m.city1Score} vs ${m.city2Score}\n`;
    });
  });

  return summary;
}
```

5. **Update chat.ts to use larger context in system message**

### Files to Modify
| File | Changes |
|------|---------|
| `api/olivia/context.ts` | Include all 100 metrics, add summary generator |
| `api/olivia/chat.ts` | Increase context in system message |
| `src/services/gammaService.ts` | Export METRIC_DISPLAY_NAMES for reuse |

---

## COMPLETED THIS SESSION

### D-ID Video Avatar Integration
- `data-mode="full"` with `data-target-id` for viewport embedding
- Olivia appears in TV viewport on Ask Olivia page
- D-ID's built-in chat hidden via CSS
- Our cockpit controls → OpenAI Assistant → D-ID speaks response

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│  ALL PAGES (except Ask Olivia)                              │
│  - OliviaChatBubble (gold "O" button)                       │
│  - Text chat with OpenAI Assistant                          │
│  - Custom component, NOT D-ID                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ASK OLIVIA COCKPIT PAGE                                    │
│  - D-ID video avatar in TV viewport                         │
│  - Our controls (text input, voice, transcript)             │
│  - OpenAI Assistant for brain (with comparison context)     │
│  - D-ID speaks the responses                                │
└─────────────────────────────────────────────────────────────┘
```

### Commits This Session
```
603de90 - feat: Hide D-ID chat, use our OpenAI brain with D-ID avatar speak
b9bd969 - fix: Handle both CityScore and CityConsensusScore types
bd928c7 - feat: Pass comparison context to D-ID agent via data-context
903f3b9 - fix: Use D-ID full mode with target-id for viewport embedding
de83def - fix: Use fabio mode and move D-ID widget into viewport
1a096bd - fix: Switch to D-ID Agent widget embedded in viewport
7e8d473 - feat: Enhanced mobile responsive styles for Ask Olivia
592e381 - feat: D-ID Streams API for real video avatar in Ask Olivia cockpit
```

---

## ENVIRONMENT VARIABLES (Vercel)

```
# OpenAI (Olivia's brain)
OPENAI_API_KEY=sk-...
OPENAI_ASSISTANT_ID=asst_3wbVjyY629u7fDylaK0s5gsM

# D-ID (Video Avatar)
DID_API_KEY=email:key
DID_AGENT_ID=v2_agt_jwRjOIM4

# ElevenLabs (Voice - backup)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb

# Tavily (Research)
TAVILY_API_KEY=...
```

---

## FILE STRUCTURE

```
api/
├── olivia/
│   ├── chat.ts          # OpenAI Assistant chat endpoint
│   ├── context.ts       # Context builder (MODIFY THIS)
│   ├── tts.ts           # ElevenLabs TTS
│   └── avatar/
│       ├── did.ts       # D-ID Agents API
│       ├── heygen.ts    # HeyGen API (unused)
│       └── streams.ts   # D-ID Streams API (unused)

src/
├── components/
│   ├── AskOlivia.tsx    # Cockpit page with D-ID video
│   ├── AskOlivia.css    # Cockpit styling + D-ID overrides
│   ├── OliviaChatBubble.tsx  # Floating chat (other pages)
│   └── OliviaChatBubble.css
├── hooks/
│   ├── useOliviaChat.ts # Chat state management
│   ├── useVoiceRecognition.ts
│   ├── useTTS.ts
│   └── useDIDStream.ts  # WebRTC hook (unused)
├── services/
│   ├── oliviaService.ts # Frontend API wrapper
│   └── gammaService.ts  # Gamma report generation
└── types/
    └── olivia.ts        # Olivia type definitions
```

---

## START NEW SESSION WITH:

```
Read D:\LifeScore\HANDOFF_2026_0122_SESSION2.md

Then immediately:
1. Fix the letter "C" bug in Ask Olivia chat input
2. Implement Option A: Enhanced Context Builder
   - Include ALL 100 metrics in context
   - Generate text summary for Olivia
   - Increase token limit to 16000
3. Test that Olivia can answer detailed questions about any metric
```

---

## KNOWN ISSUES

1. **Letter "C" not typing** in Ask Olivia text input - needs debugging
2. **D-ID speak API** not fully working - falls back to browser TTS
3. **Gamma report content** not included in context (only URL)

---

**END OF HANDOFF**
