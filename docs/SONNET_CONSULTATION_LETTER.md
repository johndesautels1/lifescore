# Consultation Request for Claude Sonnet

## Context

We are building **LIFE SCORE** - a city freedom comparison tool that evaluates 100 legal freedom metrics across 6 categories. We've identified a critical scoring problem and have consulted 4 LLMs so far:

- **Claude Opus 4.5**: Architecture analysis, root cause identification
- **GPT-4o**: Full prompt rewrite, implementation blueprint
- **Gemini 3.1 Pro**: 4-phase methodology
- **Grok 4**: Real-time data strategy, novel ideas

**We need your perspective on implementation details and practical coding considerations.**

---

## The Problem (Solved - Consensus Reached)

**Symptom:** Two cities frequently show identical scores (e.g., Austin 65 vs Denver 65) even when they have different freedom profiles.

**Root Cause:** The LLM prompt asks for generic A/B/C/D/E letter grades, which get converted to hardcoded scores (A=100, B=75, C=50, D=25, E=0). This **ignores** the detailed, metric-specific `scoringCriteria` we already have defined.

**GPT-4o's Insight:** "Your scoring system was already good. Your data model was already good. **The prompt was the only broken link.**"

---

## Unanimous Agreement (4/4 LLMs)

All four LLMs agree on this approach:

| Decision | Consensus |
|----------|-----------|
| Stop using A-E letter grades | ✅ All agree |
| Pass `scoringCriteria.options` to prompt | ✅ All agree |
| LLM returns category VALUE KEY (e.g., `"medical_only"`) | ✅ All agree |
| Server looks up score from predefined criteria | ✅ All agree |
| Include sources and reasoning | ✅ All agree |
| Separation of concerns (LLM=classify, App=score) | ✅ All agree |

---

## What We Have (Existing Data Structure)

Each of our 100 metrics has detailed `scoringCriteria` with NON-UNIFORM scores:

```javascript
// src/data/metrics.ts - Example metric
{
  id: 'pf_01_cannabis_legal',
  name: 'Cannabis Legality',
  description: 'Legal status of recreational cannabis use and possession',
  weight: 7,
  scoringDirection: 'higher_is_better',
  scoringCriteria: {
    type: 'categorical',
    options: [
      { value: 'fully_legal', label: 'Fully Legal (recreational)', score: 100 },
      { value: 'medical_only', label: 'Medical Only', score: 60 },
      { value: 'decriminalized', label: 'Decriminalized', score: 40 },
      { value: 'illegal_minor', label: 'Illegal (minor penalty)', score: 20 },
      { value: 'illegal_severe', label: 'Illegal (severe penalty)', score: 0 }
    ]
  }
}
```

**The prompt currently doesn't pass these options to the LLM.** Instead, it asks for A/B/C/D/E and uses a generic conversion.

---

## GPT-4o's Rewritten Prompt (Proposed)

```javascript
function buildBasePrompt(
  city1: string,
  city2: string,
  metrics: EvaluationRequest['metrics']
): string {

  const metricsList = metrics.map(m => {
    const options = m.scoringCriteria.options
      .map(o => `- ${o.value}: ${o.label}`)
      .join('\n');

    return `
### ${m.id}: ${m.name}
Description: ${m.description}
Scoring Direction: ${m.scoringDirection === 'higher_is_better'
      ? 'Higher value = more freedom'
      : 'Lower value = more freedom'}

Allowed category values (choose ONE exactly):
${options}
`;
  }).join('\n');

  return `
You are an expert legal and policy analyst evaluating real-world freedom metrics for two cities.

Your job is to classify each metric using the EXACT category values provided.
Do NOT invent new values. Do NOT use letter grades.

────────────────────────────────────────────
CITIES TO COMPARE (Year: ${new Date().getFullYear()})
• City 1: ${city1}
• City 2: ${city2}
────────────────────────────────────────────

## TASK

For EACH metric:
1. Select the correct category value for City 1
2. Select the correct category value for City 2
3. Provide brief reasoning
4. Provide sources for both cities

You must base answers on:
• Current laws
• Government or official sources
• Reliable journalism or legal summaries
• Real-world enforcement (not theory only)

────────────────────────────────────────────
## METRICS TO EVALUATE
${metricsList}
────────────────────────────────────────────

## OUTPUT FORMAT (STRICT JSON ONLY)

Return exactly this structure:

{
  "evaluations": [
    {
      "metricId": "pf_01_cannabis_legal",
      "city1Category": "medical_only",
      "city2Category": "fully_legal",
      "confidence": "high | medium | low",
      "reasoning": "Brief explanation of the legal and practical differences",
      "sources": [
        "https://official-source.example",
        "https://reputable-news.example"
      ],
      "city1Evidence": [
        {
          "title": "Source title",
          "url": "https://...",
          "snippet": "Relevant quoted text"
        }
      ],
      "city2Evidence": [
        {
          "title": "Source title",
          "url": "https://...",
          "snippet": "Relevant quoted text"
        }
      ]
    }
  ]
}

────────────────────────────────────────────
## STRICT RULES

1. Use ONLY the provided category values — no letters, no numbers
2. Do NOT invent categories
3. Do NOT include explanatory text outside JSON
4. If uncertain, choose the closest legally accurate category
5. Sources must be real and relevant
6. One object per metric
7. Output MUST be valid JSON
`;
}
```

---

## Proposed Implementation (GPT-4o's Blueprint)

| Step | File(s) | Change |
|------|---------|--------|
| 1 | `src/data/metrics.ts` → `src/shared/metrics.ts` | Move to shared location |
| 2 | `api/evaluate.ts`, `src/...` | Import from shared |
| 3 | `api/evaluate.ts` | Update prompt builder (GPT-4o's rewrite above) |
| 4 | `api/evaluate.ts` | Update parser for `city1Category`/`city2Category` |
| 5 | `api/evaluate.ts` | Replace `letterToScore()` with `categoryToScore()` |
| 6 | `api/evaluate.ts` | Add validation + retry logic |
| 7 | `src/services/cache.ts` | Fix city order bug |
| 8 | `src/components/Results.tsx` | Add score legend UI |

### Score Lookup (New Function)

```javascript
// Replace letterToScore() with this:
function categoryToScore(metricId: string, category: string): number | null {
  const metric = ALL_METRICS.find(m => m.id === metricId);
  const option = metric?.scoringCriteria.options.find(o => o.value === category);
  return option?.score ?? null;  // null triggers validation/retry
}
```

---

## Current Code That Needs Changing

### 1. EvaluationRequest Interface (Currently Missing scoringCriteria)

```typescript
// api/evaluate.ts - CURRENT
interface EvaluationRequest {
  provider: LLMProvider;
  city1: string;
  city2: string;
  metrics: Array<{
    id: string;
    name: string;
    description: string;
    categoryId: string;
    scoringDirection: string;
    // MISSING: scoringCriteria
  }>;
}
```

### 2. letterToScore Function (To Be Replaced)

```javascript
// api/evaluate.ts lines 87-99 - CURRENT (TO DELETE)
function letterToScore(grade: string | undefined): number {
  if (!grade) return 50; // Default to C
  const map: Record<string, number> = {
    'A': 100, 'a': 100,
    'B': 75,  'b': 75,
    'C': 50,  'c': 50,
    'D': 25,  'd': 25,
    'E': 0,   'e': 0,
    'F': 0,   'f': 0
  };
  return map[grade.trim()] ?? 50;
}
```

### 3. parseResponse Function (Needs Update)

Currently expects:
```javascript
city1Legal: "B",
city1Enforcement: "C"
```

Needs to expect:
```javascript
city1Category: "medical_only",
city2Category: "fully_legal"
```

---

## Additional Ideas from Other LLMs

### From Grok 4:
- Add `{ value: 'uncategorized', score: 50 }` fallback to all metrics
- Add `{ value: 'transitional', score: 50 }` for pending legislation
- Selective `search: true` (only for time-sensitive metrics)
- Temperature: 0.2-0.4 for deterministic classification

### From GPT-4o:
- Add categoryKey validator: if invalid → retry once → else mark `needsReview: true`
- Create `src/shared/metrics.ts` for server+client import
- Confidence triggers for Opus nuance pass: same category OR low confidence OR sources disagree

### From Gemini:
- LLM role = "Legal Data Classifier" (not Grader)
- `thinking_level: "high"` for Gemini 3.1 Pro
- Parallelize 6 category calls for 300s Vercel timeout

---

## What We Need From Sonnet

Given your strengths in fast iteration and practical implementation:

### 1. Code Review
- Review GPT-4o's rewritten prompt - any issues or improvements?
- Review the `categoryToScore()` function - edge cases?
- How should we handle the parser transition cleanly?

### 2. Implementation Path
- What's the most efficient order to make these changes?
- Should we do a gradual migration or a clean swap?
- Any TypeScript type safety concerns?

### 3. Practical Considerations
- Token budget: With ~500 options across 100 metrics, will prompts exceed limits?
- Should we batch by category (10-25 metrics) or differently?
- How to handle the shared metrics import for both Vercel serverless and Vite client?

### 4. Validation Logic
- Best pattern for retry on invalid category?
- How to structure the `needsReview` flagging?
- Should validation happen in parser or separate function?

### 5. Testing Strategy
- How would you test this change before full deployment?
- What metrics/cities would make good test cases?
- How to verify scores are now properly differentiated?

### 6. Your Novel Ideas
- Anything the other 4 LLMs missed?
- Simpler approaches we haven't considered?
- Potential pitfalls in this implementation?

---

## Files to Reference

| File | Purpose |
|------|---------|
| `api/evaluate.ts` | LLM evaluation endpoint (prompt builder, parser) |
| `src/data/metrics.ts` | 100 metric definitions with `scoringCriteria` |
| `src/services/cache.ts` | Caching (has city order bug) |
| `src/services/opusJudge.ts` | Consensus builder |
| `src/hooks/useComparison.ts` | Client-side comparison hook |
| `src/types/enhancedComparison.ts` | TypeScript interfaces |

---

## Constraints

- Vercel Pro timeout: 300 seconds
- We parallelize 6 category calls (10-25 metrics each)
- Total: 100 metrics per comparison
- 5 LLM evaluators + 1 Opus judge
- ~$22 per full comparison (want to maintain or reduce)

---

## Your Response Format

Please structure your response with:

1. **Code Review** - Issues with GPT-4o's prompt or proposed functions
2. **Implementation Path** - Recommended order of changes
3. **Practical Considerations** - Token limits, batching, imports
4. **Validation Logic** - Your recommended approach
5. **Testing Strategy** - How to verify the fix works
6. **Novel Ideas** - Anything we missed

---

## Full Documentation

For complete context including all LLM responses, see:
`D:\LifeScore\SCORING_SYSTEM_REDESIGN.md`

---

*Document prepared for Claude Sonnet consultation - January 2026*
