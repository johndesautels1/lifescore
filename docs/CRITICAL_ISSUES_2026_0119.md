# CRITICAL ISSUES DISCOVERED - 2026-01-19

## Conversation ID: LIFESCORE-2026-0119-SCORING-AUDIT

**Date:** January 19, 2026 (00:30 Barcelona time)
**Status:** CRITICAL - Scoring system broken, needs complete fix

---

## EXECUTIVE SUMMARY

The scoring system is fundamentally broken. Advanced prompts created on January 18, 2026 (24 hours ago) in the **client-side code** (`src/services/llmEvaluators.ts`) were **NEVER ported** to the **server-side code** (`api/evaluate.ts`) that Vercel actually runs.

Additionally, "Phase 2" changes introduced a critical bug where category options display as `[object Object]` garbage instead of actual values.

---

## ISSUE #1: ADVANCED PROMPTS NEVER PORTED TO SERVER

### What Happened
On 2026-01-18 around 01:00-03:00, detailed prompts were created in `src/services/llmEvaluators.ts`:
- `buildEvaluationPrompt()` with full scoring guidelines
- GPT-4o `systemPrompt` with 0-100 scale definitions
- Gemini `systemInstruction` with safety settings
- Grok system message with search instructions
- Perplexity system message with citation handling

### The Problem
The app switched to using **server-side** `api/evaluate.ts` (Vercel serverless), but these prompts were **NEVER copied over**.

### Current State (BROKEN)
**api/evaluate.ts GPT-4o:**
```typescript
{ role: 'system', content: 'You are an expert legal analyst evaluating freedom metrics. Use the provided web search results to inform your evaluation. Return only valid JSON.' }
```

### Should Be (FROM 24 HOURS AGO)
**src/services/llmEvaluators.ts GPT-4o:**
```typescript
const systemPrompt = `You are an expert legal analyst comparing two cities on freedom metrics.
Use the built-in web_search tool to find current, accurate data about laws and regulations.

## SCORING SCALE (0-100)
- 90-100: Extremely permissive, minimal restrictions (most free)
- 70-89: Generally permissive with some limitations
- 50-69: Moderate restrictions
- 30-49: Significant restrictions
- 0-29: Highly restrictive or prohibited (least free)

## DUAL SCORING SYSTEM
For each metric, provide TWO scores:
1. **Legal Score**: What does the law technically say? Higher = more permissive law
2. **Enforcement Score**: How is the law actually enforced? Higher = more lenient enforcement

## IMPORTANT
- Cite every claim with actual URLs
- Note differences between federal/state/local laws
- If evidence is missing, set confidence="low" and explain why
- Return JSON exactly matching the schema provided`;
```

---

## ISSUE #2: ${options} BUG - CATEGORY OPTIONS NOT DISPLAYED

### Location
`api/evaluate.ts` line 216

### The Bug
```typescript
const options = getCategoryOptionsForPrompt(m.id);  // Returns CategoricalOption[]
return `...
  **CATEGORY OPTIONS:**
${options}`;  // OUTPUTS: [object Object],[object Object],[object Object]
```

### What LLM Receives
```
**CATEGORY OPTIONS (choose EXACTLY one value for each city):**
[object Object],[object Object],[object Object],[object Object],[object Object]
```

### What LLM Should Receive
```
**CATEGORY OPTIONS (choose EXACTLY one value for each city):**
    - "fully_legal": Fully Legal (recreational) → 100 (most free)
    - "medical_only": Medical Only → 75
    - "decriminalized": Decriminalized → 50
    - "illegal_minor": Illegal (minor penalty) → 25
    - "illegal_severe": Illegal (severe penalty) → 0 (least free)
```

### Fix Required
```typescript
${options.map(o => `    - "${o.value}": ${o.label} → ${o.score}`).join('\n')}
```

---

## ISSUE #3: PERPLEXITY JSON SCHEMA FORCES WRONG OUTPUT

### Location
`api/evaluate.ts` lines 839-868

### The Bug
```typescript
response_format: {
  json_schema: {
    schema: {
      properties: {
        city1LegalScore: { type: 'number' },     // FORCES 0-100 numbers
        city2LegalScore: { type: 'number' },     // BUT prompt asks for categories!
```

### The Problem
- Prompt asks for `city1Category: "fully_legal"` (string)
- JSON schema forces `city1LegalScore: number`
- Perplexity returns 0 or 1 (thinks it's boolean/probability)

### Fix Required
Either:
1. Change schema to expect `city1Category: { type: 'string' }`
2. Or keep numeric but add proper scoring guidelines to Perplexity's system prompt

---

## ISSUE #4: INCONSISTENT SCORE FORMATS ACROSS LLMs

### Current State
| LLM | What It Returns | Why |
|-----|-----------------|-----|
| Claude | Random (no guidance) | Sees garbage options |
| GPT-4o | Random numbers | No scoring scale defined |
| Gemini | Letter grades or random | Sees garbage options |
| Grok | 25/50/75/100 (letter fallback) | Falls back to letterToScore |
| Perplexity | 0 or 1 | JSON schema conflict |

### Root Cause
- No consistent scoring scale in prompts
- Category options broken
- LLMs making up their own formats

---

## ISSUE #5: MISSING FIELDS - ONLY 25% RETURNED

### Observation
LLMs only return ~25 of 100 metrics per evaluation.

### Likely Causes
1. LLMs confused by garbage `[object Object]` in prompt
2. No clear instruction on mandatory field count
3. Token limits being hit without completion
4. No validation that all metrics were returned

---

## COMPLETE DATA FLOW (CURRENT - BROKEN)

```
1. Client calls: POST /api/evaluate?provider=claude-sonnet&categoryId=personal_freedom

2. api/evaluate.ts receives request with ~15 metrics for that category

3. If USE_CATEGORY_SCORING=true:
   └── buildCategoryPrompt() called
       └── getCategoryOptionsForPrompt(metricId) returns CategoricalOption[]
       └── BUG: ${options} outputs "[object Object],[object Object]..."
       └── LLM receives GARBAGE for category options

4. If USE_CATEGORY_SCORING=false:
   └── buildBasePrompt() called
       └── Asks for letter grades A/B/C/D/E
       └── Scale IS defined (A=most free, E=least free)

5. LLM processes prompt:
   └── If category mode: Has NO IDEA what options are valid
   └── Makes up values or returns letter grades anyway

6. parseResponse() processes LLM output:
   └── Line 298: if (e.city1Category && e.city2Category)
       └── Uses categoryToScore() → proper scoring
   └── ELSE (fallback):
       └── Line 279-287: getScore() function
       └── If letter grade found: letterToScore() → 0/25/50/75/100
       └── If raw number: Uses number directly (0-100 clamped)

7. Scores returned to client:
   └── Mix of:
       - Category scores (100/75/50/25/0 from categoryToScore)
       - Letter scores (0/25/50/75/100 from letterToScore)
       - Raw numbers (whatever LLM returned)
       - 50 defaults (when parsing fails)

8. Client aggregates scores:
   └── Per metric: average of (legalScore + enforcementScore) / 2
   └── Per category: weighted average of metric scores
   └── Total: weighted average of categories (weights sum to 100%)

9. RESULT: Garbage in, garbage out. Inconsistent, unreliable scores.
```

---

## CORRECT DATA FLOW (AFTER FIX)

```
1. Client calls: POST /api/evaluate?provider=claude-sonnet&categoryId=personal_freedom

2. api/evaluate.ts receives request with ~15 metrics

3. buildCategoryPrompt() called:
   └── For each metric, format options properly:
       ```
       - pf_01_cannabis_legal: Cannabis Legality
         OPTIONS:
         - "fully_legal": Fully Legal (recreational) → 100 (most free)
         - "medical_only": Medical Only → 75
         - "decriminalized": Decriminalized → 50
         - "illegal_minor": Illegal (minor penalty) → 25
         - "illegal_severe": Illegal (severe penalty) → 0 (least free)
       ```

4. Each LLM has proper system prompt with:
   └── Scoring scale definition (0-100 or category values)
   └── Clear instructions on output format
   └── Requirement to evaluate ALL metrics

5. LLM processes prompt:
   └── Sees clear category options with score meanings
   └── Returns: city1Category: "medical_only", city2Category: "fully_legal"

6. parseResponse() processes:
   └── categoryToScore("pf_01_cannabis_legal", "medical_only") → 75
   └── categoryToScore("pf_01_cannabis_legal", "fully_legal") → 100
   └── Different cities get DIFFERENT scores

7. Consistent scores returned to client

8. Aggregation works correctly
```

---

## PROMPTS FROM 24 HOURS AGO (TO BE PORTED)

### 1. Shared buildEvaluationPrompt
```typescript
export function buildEvaluationPrompt(city1, city2, metrics, includeSearchInstructions) {
  // Full prompt with:
  // - Authoritative sources list
  // - Dual scoring (Legal + Enforcement)
  // - 0-100 scale with clear definitions
  // - JSON output format
  // - Scoring guidelines (90-100, 70-89, etc.)
}
```

### 2. GPT-4o System Prompt
```typescript
const systemPrompt = `You are an expert legal analyst...
## SCORING SCALE (0-100)
- 90-100: Extremely permissive, minimal restrictions (most free)
- 70-89: Generally permissive with some limitations
- 50-69: Moderate restrictions
- 30-49: Significant restrictions
- 0-29: Highly restrictive or prohibited (least free)

## DUAL SCORING SYSTEM
For each metric, provide TWO scores:
1. **Legal Score**: What does the law technically say?
2. **Enforcement Score**: How is the law actually enforced?
...`;
```

### 3. Gemini System Instruction
```typescript
const systemInstruction = {
  parts: [{
    text: 'You are an expert legal analyst evaluating freedom metrics for city comparison. Use Google Search grounding to find current, accurate data about laws and regulations. Be factual and cite sources.'
  }]
};
// Plus safety settings: BLOCK_ONLY_HIGH for all categories
```

### 4. Grok System Message
```typescript
{
  role: 'system',
  content: 'You are an expert legal analyst evaluating freedom metrics. Use your real-time web search to find current laws and regulations.'
}
// Plus: search: true flag
```

### 5. Perplexity System Message
```typescript
{
  role: 'system',
  content: 'You are an expert legal analyst evaluating freedom metrics. Use your web search capabilities to find current laws and regulations.'
}
// Plus: return_citations: true
```

---

## FIXES REQUIRED

| # | Issue | File | Line | Fix |
|---|-------|------|------|-----|
| 1 | ${options} bug | api/evaluate.ts | 216 | Format array properly |
| 2 | Missing scoring scale | api/evaluate.ts | All LLM functions | Add detailed system prompts from 24hr ago |
| 3 | Perplexity schema | api/evaluate.ts | 839-868 | Match schema to prompt format |
| 4 | No field validation | api/evaluate.ts | parseResponse | Log missing metrics |
| 5 | Gemini safety settings | api/evaluate.ts | evaluateWithGemini | Add safetySettings |
| 6 | Gemini systemInstruction | api/evaluate.ts | evaluateWithGemini | Add systemInstruction field |

---

## COMMITS REFERENCE

### From 24 hours ago (good prompts):
- `ea8502c` - Tavily Phase 2: Research API + Advanced Answer
- `73bd1d6` - LLM Evaluator Audit Fixes: Claude, GPT-4o, Gemini
- `4b0472b` - Fix Grok evaluator
- `c88ad36` - Fix Perplexity evaluator and shared parser

### Phase 2 (introduced bugs):
- `cca20c5` - Phase 2 COMPLETE (but ${options} bug was already there)
- `a308dc2` - Phase 2: Update parseResponse (added category fallback)

---

## NEXT STEPS

1. Port ALL advanced prompts from `src/services/llmEvaluators.ts` to `api/evaluate.ts`
2. Fix ${options} formatting bug
3. Fix Perplexity JSON schema
4. Add Gemini safety settings and systemInstruction
5. Add validation for missing metrics
6. Test each LLM individually
7. Verify consistent 0-100 scoring across all LLMs

---

## FOR NEXT SESSION

```
CRITICAL: LIFESCORE SCORING SYSTEM COMPLETELY BROKEN

READ THIS FILE FIRST: D:\LifeScore\CRITICAL_ISSUES_2026_0119.md

The server-side api/evaluate.ts is missing all the advanced prompts that were
created in src/services/llmEvaluators.ts 24 hours ago. Additionally, the
${options} bug causes LLMs to see "[object Object]" garbage instead of
actual category options.

MUST FIX:
1. Port prompts from src/services/llmEvaluators.ts to api/evaluate.ts
2. Fix ${options} formatting (line 216)
3. Fix Perplexity JSON schema (lines 839-868)
4. Add Gemini safety settings

Conversation ID: LIFESCORE-2026-0119-SCORING-AUDIT
```
