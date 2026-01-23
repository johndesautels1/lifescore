# HANDOFF: Olivia AI Enhancement

**Date:** 2026-01-23
**Conversation ID:** LIFESCORE-AUDIT-20260123-001
**Status:** Ready to implement

---

## Problem Statement

Olivia (Ask Olivia AI assistant) has limitations:
1. **Knows categories but not individual fields** - Can discuss 6 high-level categories but fails on specific metric deep-dives
2. **Can't discuss specific web sources** - URLs are passed but not the actual content/quotes
3. **Doesn't know Gamma report content** - Generated report never sent to Olivia
4. **Robotic personality** - System prompt too formal

---

## Chosen Solution: Enhanced Context Injection

Inject MORE data into Olivia's context:
- All evidence items with actual quotes (not just URLs)
- Per-field talking points and knowledge
- Gamma report key sections
- Warmer personality prompt

---

## Implementation Plan

### Phase 1: Expand Evidence Injection
**File:** `api/olivia/context.ts`

Current (line ~400):
```typescript
evidence.slice(0, 10).forEach((e) => {
  contextStr += `- [${e.metricName}] ${s.url}\n`;
});
```

Change to:
```typescript
evidence.forEach((e) => {
  contextStr += `### ${e.metricName}\n`;
  e.sources.forEach((s) => {
    contextStr += `- **${s.title}** (${s.url})\n`;
    contextStr += `  > "${s.snippet}"\n`;
  });
});
```

### Phase 2: Create Field Knowledge Database
**New File:** `src/data/fieldKnowledge.ts`

Create talking points for all 100 metrics:
```typescript
export const FIELD_KNOWLEDGE: Record<string, FieldKnowledge> = {
  'pf_01_cannabis_legal': {
    talkingPoints: [
      "Recreational vs medical distinction",
      "Home cultivation rights",
      "Possession limits",
      "Social consumption venues"
    ],
    keySourceTypes: ["NORML", "State legislature"],
    commonQuestions: ["Can I grow my own?", "What are limits?"]
  },
  // ... 99 more fields
};
```

### Phase 3: Inject Gamma Report Content
**File:** `src/services/oliviaService.ts`

When building context, include Gamma sections:
```typescript
if (gammaReport) {
  contextStr += `\n## DETAILED ANALYSIS REPORT\n\n`;
  contextStr += gammaReport.executiveSummary;
  contextStr += gammaReport.categoryBreakdowns;
}
```

### Phase 4: Personality Tuning
**Location:** OpenAI Dashboard → Assistant Settings

Update system prompt to:
```
You are Olivia, a warm and knowledgeable relocation advisor with genuine
enthusiasm for helping people find their ideal city. Speak conversationally,
use analogies, share insights like a trusted friend who happens to be an
expert on freedom laws. When discussing specific metrics, paint a picture
of what daily life looks like under those laws. Be specific with numbers
but explain what they mean in practice. You have deep knowledge of:
- All 100 LIFE SCORE metrics and what they mean for daily life
- The specific sources and evidence behind each score
- The full comparison report including category breakdowns
- Common questions people have about each metric
```

---

## Files to Modify

| File | Purpose |
|------|---------|
| `api/olivia/context.ts` | Expand evidence injection |
| `src/services/oliviaService.ts` | Pass Gamma content |
| `src/types/olivia.ts` | Add FieldKnowledge types |
| NEW: `src/data/fieldKnowledge.ts` | 100-field knowledge base |
| OpenAI Dashboard | Update Assistant prompt |

---

## Token Budget (GPT-4 128K context)

| Component | Est. Tokens |
|-----------|-------------|
| Current context | ~4,000 |
| Full evidence | ~6,000 |
| Field knowledge (relevant) | ~3,000 |
| Gamma excerpt | ~3,000 |
| **Total** | **~16,000** |

Plenty of room within limits.

---

## Key Files to Read First

1. `api/olivia/context.ts` - Current context builder
2. `src/services/oliviaService.ts` - Client-side API
3. `src/types/olivia.ts` - Type definitions
4. `docs/OLIVIA_KNOWLEDGE_BASE.md` - Existing Olivia docs

---

## Resume Command

```
Resume Olivia Enhancement.

Conversation ID: LIFESCORE-OLIVIA-ENHANCE-20260124
Repo: D:\LifeScore

Read: D:\LifeScore\docs\handoffs\HANDOFF_OLIVIA_ENHANCEMENT_20260123.md

STATUS: Ready to implement Phase 1-4 of Enhanced Context Injection
```

---

## Session Summary (2026-01-23)

This session completed:
- [x] DPA signing (6/11 vendors)
- [x] Temp file cleanup (186+ files organized)
- [x] Source attribution fix (single search)
- [x] Footer alignment fix
- [x] Olivia architecture analysis
- [x] Enhancement plan created

**Commits:**
- `c4ff996` - DPA documents and compliance updates
- `dad3316` - Source attribution fix
- `799a009` - Footer alignment fix
