# LIFE SCORE Scoring System Redesign

## Document Purpose
This document captures the complete analysis and redesign plan for the LIFE SCORE scoring system, developed through collaborative consultation with multiple LLMs (Claude Opus, Gemini 3 Pro, GPT-4o, and pending input from Grok, Perplexity, and Sonnet).

**Created:** 2026-01-18
**Status:** Planning Phase - Awaiting Full LLM Consensus

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Current Architecture](#current-architecture)
3. [Root Cause Analysis](#root-cause-analysis)
4. [LLM Consensus Table](#llm-consensus-table)
5. [Proposed Solution](#proposed-solution)
6. [GPT-4o's Rewritten Prompt](#gpt-4os-rewritten-prompt)
7. [Implementation Blueprint](#implementation-blueprint)
8. [Files Affected](#files-affected)
9. [Open Questions](#open-questions)

---

## Problem Statement

### Symptom
Two-city comparison results frequently show **identical or near-identical scores** even when comparing cities with meaningfully different freedom profiles (e.g., Austin, TX vs Denver, CO).

### Impact
- Users see both cities scoring 65 vs 65 when real-world differences exist
- Undermines credibility of the entire comparison system
- Makes the tool appear broken or unreliable

---

## Current Architecture

### Data Flow (Current - Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LLM PROMPT SENT                                              │
│    Asks for generic A/B/C/D/E letter grades                     │
│    Does NOT pass metric-specific scoringCriteria                │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LETTER GRADE CONVERSION (THE BROKEN LINK)                    │
│    A=100, B=75, C=50, D=25, E=0                                 │
│    IGNORES metric-specific scores (e.g., 100/60/40/20/0)        │
│    Only 5 possible values - extremely coarse                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. NORMALIZED = (Legal + Enforcement) / 2                        │
│    Different profiles can average to same score                 │
│    City A: Legal=75, Enforcement=25 → 50                        │
│    City B: Legal=50, Enforcement=50 → 50                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CACHE BUG                                                     │
│    City order sorted alphabetically                             │
│    "Austin vs Denver" = "Denver vs Austin" (WRONG)              │
└──────────────────────────────────────────────────────────────────┘
```

### Key Files (Current)

| File | Purpose | Problem |
|------|---------|---------|
| `api/evaluate.ts` | LLM prompt builder + response parser | Asks for A-E grades, uses hardcoded conversion |
| `src/data/metrics.ts` | 100 metric definitions with `scoringCriteria` | **Has detailed criteria but NOT USED** |
| `src/services/cache.ts` | Caching layer | Sorts cities alphabetically (bug) |
| `src/services/opusJudge.ts` | Consensus builder | Uses median, defaults to 50 |
| `src/hooks/useComparison.ts` | Client-side scoring | Averages legal + enforcement |

---

## Root Cause Analysis

### The Core Problem (GPT-4o's Insight)
> "Your scoring system was already good. Your data model was already good. **The prompt was the only broken link.**"

### Six Contributing Factors

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | **Cache sorts cities alphabetically** | `cache.ts:94-101` | Same result for "A vs B" and "B vs A" |
| 2 | **Prompt asks for generic A-E grades** | `evaluate.ts:111-178` | Ignores metric-specific criteria |
| 3 | **Hardcoded letter→score conversion** | `evaluate.ts:87-99` | A=100, B=75, C=50, D=25, E=0 only |
| 4 | **scoringCriteria not passed to prompt** | `evaluate.ts:32-44` | LLM can't see allowed category values |
| 5 | **Default to 50 everywhere** | Multiple files | Missing data = identical scores |
| 6 | **Median collapses variation** | `opusJudge.ts:126-131` | Outliers ignored |

### What Already Exists (But Isn't Used)

Each of the 100 metrics in `src/data/metrics.ts` has detailed `scoringCriteria`:

```javascript
// Example: Cannabis metric has NON-UNIFORM scores
{
  id: 'pf_01_cannabis_legal',
  scoringCriteria: {
    type: 'categorical',
    options: [
      { value: 'fully_legal', label: 'Fully Legal (recreational)', score: 100 },
      { value: 'medical_only', label: 'Medical Only', score: 60 },        // NOT 75!
      { value: 'decriminalized', label: 'Decriminalized', score: 40 },    // NOT 50!
      { value: 'illegal_minor', label: 'Illegal (minor penalty)', score: 20 },
      { value: 'illegal_severe', label: 'Illegal (severe penalty)', score: 0 }
    ]
  }
}
```

**The LLM prompt never sees these options.** It just asks for "A, B, C, D, or E" and converts with a generic scale.

---

## LLM Consensus Table

### Participating LLMs

| LLM | Status | Role |
|-----|--------|------|
| **Claude Opus 4.5** | ✅ Complete | Architecture analysis, code audit |
| **GPT-4o** | ✅ Complete | Prompt engineering, implementation blueprint |
| **Gemini 3 Pro** | ✅ Complete | 4-phase methodology, classifier approach |
| **Grok 4** | ✅ Complete | Real-time data strategy, novel ideas |
| **Perplexity** | ⏳ Pending | Research/verification perspective |
| **Claude Sonnet** | ✅ Complete | Implementation details, testing strategy, 6 novel ideas |

### Recommendation Matrix

#### Prompt Architecture

| Aspect | Claude Opus | Gemini 3 Pro | GPT-4o | Grok 4 |
|--------|-------------|--------------|--------|--------|
| **Keep A-E grades?** | No | No | No | No |
| **Pass scoringCriteria?** | Yes | Yes (numbered list) | Yes (value: label format) | Yes (bullet list - parses efficiently) |
| **LLM Role** | Expert analyst | "Legal Data Classifier" | Policy analyst | Evidence-based classifier |
| **Output format** | Category keys | Value keys | `city1Category` / `city2Category` | `city1Category` / `city2Category` |
| **JSON enforcement** | Yes | Strict | Strict | Strict + retry if invalid |
| **Temperature** | Not specified | 0 | Not specified | 0.2-0.4 (test 0.2 for stricter) |

#### Server-Side Changes

| Component | Claude Opus | Gemini 3 Pro | GPT-4o | Grok 4 |
|-----------|-------------|--------------|--------|--------|
| **Score lookup** | `options.find()` | Lookup function | `options.find(o => o.value === category)?.score` | Same + default to `uncategorized` |
| **Remove letterToScore()** | Yes | Yes | Yes | Yes |
| **Shared metrics location** | Not specified | `scoringAnchors.json` | `src/shared/metrics.ts` | Not specified |
| **Validation** | Not detailed | Strict constraint | Retry once, else mark unknown | Retry with "Output valid JSON only", log for review |
| **Cache fix** | Preserve order | Not mentioned | Normalize key | 7-30 day TTL, refresh on low confidence |
| **Search setting** | N/A | N/A | N/A | Selective per metric (not blanket) |

#### Nuance Handling

| Approach | Claude Opus | Gemini 3 Pro | GPT-4o | Grok 4 |
|----------|-------------|--------------|--------|--------|
| **Primary method** | Opus 2nd pass for ties | Rationale field | Opus 2nd pass | Sentiment analysis + secondary classifier |
| **Trigger conditions** | Same bucket | N/A | Same category OR low confidence OR sources disagree | Same category but reasoning differs |
| **Keyword modifiers** | Optional for 10-20 metrics | Not recommended | Not recommended for all 100 | Not recommended - use X sentiment instead |
| **Adjustment range** | ±10 points | N/A | ±5 or ±10 points | ±5-15 based on X sentiment ratio |
| **Novel approach** | N/A | N/A | N/A | 50 X posts sentiment score as crowd-sourced layer |

### Areas of Strong Agreement

| Topic | Consensus |
|-------|-----------|
| ✅ Stop using A-E letter grades | All 4 agree |
| ✅ Pass scoringCriteria.options to prompt | All 4 agree |
| ✅ LLM returns category VALUE KEY | All 4 agree |
| ✅ Server looks up score from metrics.ts | All 4 agree |
| ✅ Include sources/evidence in output | All 4 agree |
| ✅ Include reasoning/rationale | All 4 agree |
| ✅ Separation of concerns (LLM=classify, App=score) | All 4 agree (GPT-4o explicit) |
| ✅ Classifier approach is correct fix | All 4 agree - "elegant", "smart", "fixes root cause" |

### Areas Needing Resolution

| Topic | Options | Decision |
|-------|---------|----------|
| Shared metrics file location | `src/shared/metrics.ts` vs `scoringAnchors.json` | TBD |
| Mean vs Median for consensus | Mean preserves outliers, Median robust | TBD |
| Cache key strategy | Preserve order vs Sort+store order | TBD |
| Confidence format | `"high"/"medium"/"low"` vs `0-1 numeric` | TBD |
| Add `uncategorized` fallback option | Grok suggests yes (score: 50) | TBD |
| Add `transitional` option for pending laws | Grok suggests yes (score: 50) | TBD |
| X/Twitter sentiment weighting | Grok suggests 20-30% weight | TBD |

---

## Grok 4's Complete Input

### Overall Assessment
> "I fully agree with the classifier approach. Shifting from subjective letter grades to selecting predefined category values is a smart evolution—it leverages the strengths of LLMs for pattern matching and evidence-based classification while ensuring deterministic, metric-specific scoring on the server side."

### Grok-Specific Configuration

| Setting | Recommendation | Rationale |
|---------|----------------|-----------|
| **Temperature** | 0.2-0.4 (test 0.2) | Low range promotes deterministic outputs |
| **Search** | Selective per metric | Enable for time-sensitive metrics, disable for static |
| **max_tokens** | 4096-8192 per category | Cap to avoid bloated outputs |
| **stream** | `false` | For full responses |
| **X operators** | `from:verified filter:safe` | Quality control on X data |

### Grok's Optimized Prompt Structure

```
## Metric: {metric.id} - {metric.name}
Description: {metric.description}
Scoring Direction: Higher value = more freedom

Classify EXACTLY ONE category value from these options for {city1} and {city2}:
{options.map(o => `- ${o.value}: ${o.label}`).join('\n')}

Output format (JSON only):
{
  "metricId": "{metric.id}",
  "city1Category": "exact_value_here",
  "city2Category": "exact_value_here",
  "confidence": "high|medium|low",
  "reasoning": "Concise explanation with evidence...",
  "sources": ["url1", "url2"]
}

Rules:
- Base classification on current {year} laws and enforcement.
- Prioritize official sources (gov sites, statutes) but cross-verify with real-time data if dynamic.
- If ambiguous, choose the closest match and note in reasoning.
- No additional text outside JSON.
```

### Real-Time Data Strategy

| Aspect | Grok's Recommendation |
|--------|----------------------|
| **Recency requirement** | "Sources must be from the last 12 months; flag older data as low confidence" |
| **Prompt addition** | "Verify status as of {current_date}. Search for changes since 2024." |
| **X/Twitter integration** | Query: `{city} {metric keywords} enforcement experience since:2025-01-01` |
| **X data weighting** | 20-30% alongside official sources |
| **Cache TTL** | 7-30 days, refresh if confidence low or "change detected" flag |

### Edge Case Handling

| Edge Case | Grok's Solution |
|-----------|-----------------|
| **No fit category** | Add `{ value: 'uncategorized', label: 'Does Not Fit', score: 50 }` to all metrics |
| **Rapidly changing laws** | Classify conservatively (current status), flag low confidence, allow re-query |
| **Pending legislation** | Add `{ value: 'transitional', label: 'Pending Legislation', score: 50 }` |
| **Same category different reasoning** | Secondary classifier prompt for sub-nuances, ±10 adjustment |
| **International/territories** | Expand options if needed |

### Novel Ideas (Unique to Grok)

| Idea | Description | Value |
|------|-------------|-------|
| **Dynamic Category Augmentation** | LLM proposes subcategories in reasoning (e.g., `medical_only_strict` vs `medical_only_lax`), Opus incorporates as temporary overrides | Evolves criteria over time without manual updates |
| **Sentiment Analysis Integration** | Analyze 50 recent X posts for sentiment ratio, adjust ±5-15 for same-category ties | Crowd-sourced dimension others can't replicate |
| **Multi-Modal Evidence** | Reference visual evidence (parking signs, zoning maps) in reasoning | Enriches context |
| **Chain-of-Thought with Forks** | Branched reasoning: legal text → enforcement anecdotes → recent changes | Exploits Grok's parallel processing |

### Implementation Notes

| Aspect | Grok's Advice |
|--------|---------------|
| **Token management** | Batch by category to stay under 16k tokens |
| **API tweaks** | Add `stream: false`, monitor `usage` in responses |
| **Validation** | Parse JSON strictly; if invalid, retry with "Output valid JSON only" |
| **Parallelization** | Beyond categories if needed (per metric for high-volume) |
| **Cost estimate** | ~5-10k tokens per comparison - efficient |

---

## Claude Sonnet's Complete Input

### Overall Assessment
Sonnet reviewed GPT-4o's prompt and identified 3 issues, then provided comprehensive implementation details.

### Issues Found in GPT-4o's Prompt

| Issue | Problem | Sonnet's Fix |
|-------|---------|--------------|
| **#1: Token Explosion** | 100 metrics × 5 options × labels = 15K+ tokens | Use value keys only, not labels: `Valid categories: ${options.map(o => o.value).join(', ')}` |
| **#2: Missing Fallback** | Prompt doesn't specify what to do when data unavailable | Add explicit fallback protocol: return `insufficient_data` or `transitional` |
| **#3: Redundant Evidence** | Both `sources[]` and `cityEvidence[]` = duplication | Remove `sources[]`, keep only structured `cityEvidence[]` |

### Token Budget Analysis

| Format | Tokens/Comparison | Cost Impact |
|--------|-------------------|-------------|
| Current (A-E) | 33K | Baseline |
| GPT-4o verbose | 94.8K | ⚠️ 3× increase |
| Sonnet condensed | 45.6K | ~$1.50 savings |

### Improved `categoryToScore()` Function

```typescript
// Build lookup once at module load (O(1) instead of O(n))
const METRIC_SCORE_LOOKUP = new Map(
  ALL_METRICS.flatMap(metric =>
    metric.scoringCriteria.options.map(option => [
      `${metric.id}:${option.value}`,
      option.score
    ])
  )
);

interface ScoreResult {
  score: number | null;
  error?: 'INVALID_METRIC' | 'INVALID_CATEGORY';
}

function categoryToScore(metricId: string, category: string): ScoreResult {
  const metric = ALL_METRICS.find(m => m.id === metricId);
  if (!metric) return { score: null, error: 'INVALID_METRIC' };

  const lookupKey = `${metricId}:${category}`;
  const score = METRIC_SCORE_LOOKUP.get(lookupKey);

  if (score === undefined) return { score: null, error: 'INVALID_CATEGORY' };

  return { score }; // score can be number OR null (for fallbacks)
}
```

### 5-Phase Implementation Path

| Phase | Focus | Key Actions |
|-------|-------|-------------|
| **1: Foundation** | No breaking changes | Create `src/shared/metrics.ts`, update imports |
| **2: Parallel** | Both systems running | Add `categoryToScore()` alongside `letterToScore()`, env toggle |
| **3: Prompt** | Switchable | New prompt + parser that handles both formats |
| **4: Testing** | Validation | Austin vs Denver test, A/B comparison, error monitoring |
| **5: Cutover** | Production | Enable flag, monitor 24-48h, remove old code |

### Validation Logic

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: Array<{ metricId: string; issue: string; received?: string }>;
  needsRetry: boolean;      // < 30% errors = retry
  needsHumanReview: boolean; // >= 30% errors or has insufficient_data
}
```

### Testing Strategy

| Test Case | Purpose | Expected Outcome |
|-----------|---------|------------------|
| Austin vs Denver | Original problematic case | Scores now differ |
| Portland vs Burlington | Sparse data cities | Some `insufficient_data` |
| SF vs Dallas | Clear differences | Strong differentiation |
| Mock invalid category | Validator test | `needsRetry: true` |

### 6 Novel Ideas (Unique to Sonnet)

| # | Idea | Description |
|---|------|-------------|
| 1 | **Score Confidence Weighting** | High: 1.0×, Medium: 0.85×, Low: 0.65× - prevents low-confidence guesses from swinging totals |
| 2 | **Metric-Specific Timeouts** | Tag `researchComplexity`: simple/moderate/complex, calculate dynamic timeouts |
| 3 | **Progressive Granularity** | Phase 1: Quick classify, Phase 2: Nuance pass on close calls, Phase 3: Opus judge |
| 4 | **Category-Specific Prompts** | Domain-specific enhancers (personal_freedom, economic_freedom, etc.) |
| 5 | **Diff-Based Updates** | Track `lawsLastChangedAt`, only re-evaluate when laws change (70-90% cost reduction) |
| 6 | **LLM-Specific Optimizations** | Different temp, batch size, prompt style per provider |

### Final Recommendations

**Critical Path (Do First):**
1. Add fallback categories (`insufficient_data`, `transitional`) to ALL metrics
2. Condense prompt format (Sonnet's version, not GPT-4o's verbose)
3. Implement `categoryToScore()` with Map lookup
4. Add validation with error type distinction
5. Use environment variable for gradual rollout

**Red Flags to Watch:**
- Token costs: Monitor first week
- Validation failures: If >5%, investigate prompt clarity
- Timeout errors: If any batch >60s, split it
- Cache bugs: Verify city order normalization

---

## Proposed Solution

### Phase 1: Core Fix (All LLMs Agree)

| Step | Change | Effort |
|------|--------|--------|
| 1 | Fix cache bug (preserve city order context) | 30 min |
| 2 | Move metrics to shared location (`src/shared/metrics.ts`) | 1 hour |
| 3 | Update prompt to pass `scoringCriteria.options` | 2 hours |
| 4 | Change prompt to request category VALUE KEYS | 1 hour |
| 5 | Update parser to expect `city1Category`/`city2Category` | 1 hour |
| 6 | Create score lookup: `options.find(o => o.value === category)?.score` | 1 hour |
| 7 | Add validation: retry once if invalid key, else mark unknown | 1 hour |
| 8 | Add UI legend explaining score meaning | 1 hour |

**Estimated Total: 8-10 hours**

### Phase 2: Nuance Layer (Optional)

| Approach | When to Use | Effort |
|----------|-------------|--------|
| Opus 2nd pass | Same category + low confidence + source disagreement | 4-6 hours |
| Keyword modifiers | 10-20 high-impact metrics only | 8-12 hours |

---

## GPT-4o's Rewritten Prompt

### Full Code (Drop-in Replacement)

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

### Required Changes to Support This Prompt

1. **EvaluationRequest interface** must include `scoringCriteria`:
```typescript
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
    scoringCriteria: {  // ADD THIS
      type: string;
      options: Array<{
        value: string;
        label: string;
        score: number;
      }>;
    };
  }>;
}
```

2. **Parser** must expect new field names:
```typescript
// OLD
city1Legal: "B"
city1Enforcement: "C"

// NEW
city1Category: "medical_only"
city2Category: "fully_legal"
```

3. **Score lookup** replaces letterToScore():
```typescript
// OLD
function letterToScore(grade: string): number {
  const map = { 'A': 100, 'B': 75, 'C': 50, 'D': 25, 'E': 0 };
  return map[grade] ?? 50;
}

// NEW
function categoryToScore(metricId: string, category: string): number | null {
  const metric = ALL_METRICS.find(m => m.id === metricId);
  const option = metric?.scoringCriteria.options.find(o => o.value === category);
  return option?.score ?? null;  // null triggers validation/retry
}
```

---

## Implementation Blueprint

### GPT-4o's Minimal Code-Change Plan

| Step | File(s) | Change |
|------|---------|--------|
| 1 | `src/data/metrics.ts` → `src/shared/metrics.ts` | Move to shared location |
| 2 | `api/evaluate.ts`, `src/...` | Import from shared |
| 3 | `api/evaluate.ts` | Update prompt builder (use GPT-4o's rewrite) |
| 4 | `api/evaluate.ts` | Update parser for `city1Category`/`city2Category` |
| 5 | `api/evaluate.ts` | Replace `letterToScore()` with `categoryToScore()` |
| 6 | `api/evaluate.ts` | Add validation + retry logic |
| 7 | `src/services/cache.ts` | Fix city order bug |
| 8 | `src/components/Results.tsx` | Add score legend UI |

### Gemini's 4-Phase Approach

| Phase | Focus | Key Actions |
|-------|-------|-------------|
| **Phase 1: Data Input** | Payload | Pass `scoringCriteria.options` as numbered list |
| **Phase 2: Logic** | Classification | LLM = "Legal Data Classifier", returns value key |
| **Phase 3: Parser** | Server | Lookup key → score, return `valueKey` + `rationale` |
| **Phase 4: Optimization** | Performance | `thinking_level: "high"`, `temperature: 0`, parallelize |

---

## Files Affected

### Must Change

| File | Changes Required |
|------|------------------|
| `api/evaluate.ts` | Prompt rewrite, parser update, score lookup |
| `src/data/metrics.ts` | Move to `src/shared/metrics.ts` |
| `src/services/cache.ts` | Fix city order bug |
| `src/hooks/useComparison.ts` | Update to use new response format |
| `src/services/opusJudge.ts` | Update consensus building |

### May Change

| File | Potential Changes |
|------|-------------------|
| `src/types/enhancedComparison.ts` | New interfaces for category-based scoring |
| `src/components/Results.tsx` | Score legend UI |
| `src/components/EnhancedComparison.tsx` | Display category labels |

---

## Open Questions

### For Remaining LLMs (Grok, Perplexity, Sonnet)

1. **Grok**: Given your real-time data capabilities, how would you approach ensuring category classifications stay current with rapidly changing laws?

2. **Perplexity**: From a research/verification standpoint, how should we validate that LLM-selected categories are accurate?

3. **Sonnet**: What's the most efficient implementation path given the codebase structure?

### Architecture Decisions Pending

| Question | Options | Leaning |
|----------|---------|---------|
| Shared metrics file format | `.ts` module vs `.json` file | `.ts` (type safety) |
| Confidence format | String enum vs numeric 0-1 | String (matches current) |
| Mean vs Median consensus | Mean (sensitive) vs Median (robust) | TBD |
| Enforcement score handling | Keep separate vs merge with legal | TBD |

---

## Next Steps

1. ✅ Document current state (this file)
2. ⏳ Gather input from Grok, Perplexity, Sonnet
3. ⏳ Finalize architecture decisions
4. ⏳ Create implementation task list
5. ⏳ Begin Phase 1 implementation

---

## Appendix: Current Prompt (For Reference)

```javascript
// api/evaluate.ts lines 111-178 (CURRENT - TO BE REPLACED)

function buildBasePrompt(city1: string, city2: string, metrics: EvaluationRequest['metrics']): string {
  const metricsList = metrics.map(m => `
- ${m.id}: ${m.name}
  Description: ${m.description}
  Direction: ${m.scoringDirection === 'higher_is_better' ? 'Higher grade = more freedom' : 'Lower grade = more freedom'}
`).join('\n');

  return `You are an expert legal analyst evaluating freedom metrics for city comparison.

## TASK
Evaluate the following metrics for two cities. For EACH metric, provide TWO letter grades (A/B/C/D/E):
1. **Legal Grade**: What does the law technically say?
2. **Enforcement Grade**: How is the law actually enforced in practice?

## CITIES TO COMPARE (Year: ${new Date().getFullYear()})
- City 1: ${city1}
- City 2: ${city2}

## LETTER GRADE SCALE

**Legal Score (What the law says):**
| Grade | Meaning |
|-------|---------|
| A | Fully legal/permitted - no restrictions |
| B | Mostly legal - minor limitations only |
| C | Moderate restrictions - some limits |
| D | Restricted - significant legal barriers |
| E | Prohibited/Illegal - severe penalties |

**Enforcement Score (How it's actually enforced):**
| Grade | Meaning |
|-------|---------|
| A | Never enforced - authorities ignore completely |
| B | Rarely enforced - low priority, warnings only |
| C | Selectively enforced - depends on situation |
| D | Usually enforced - regular citations/arrests |
| E | Strictly enforced - zero tolerance |

## METRICS TO EVALUATE
${metricsList}

## OUTPUT FORMAT
Return a JSON object with this EXACT structure:
{
  "evaluations": [
    {
      "metricId": "metric_id_here",
      "city1Legal": "B",
      "city1Enforcement": "C",
      "city2Legal": "D",
      "city2Enforcement": "D",
      "confidence": "high",
      "reasoning": "Brief explanation of key difference",
      "sources": ["https://example.com/law-source"],
      "city1Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}],
      "city2Evidence": [{"title": "Source Title", "url": "https://...", "snippet": "Relevant quote"}]
    }
  ]
}

## CRITICAL RULES
1. Use ONLY letters A, B, C, D, or E - no numbers
2. Evaluate BOTH cities for EACH metric
3. Consider 2026 laws and current enforcement trends
4. Return ONLY the JSON object, no other text
5. MUST include sources - URLs to laws, government sites, news articles backing your evaluation
6. Include city1Evidence and city2Evidence with title, url, and relevant snippet for each city`;
}
```

---

*This document will be updated as additional LLM input is received.*
