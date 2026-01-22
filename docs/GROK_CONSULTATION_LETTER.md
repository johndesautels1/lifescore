# Consultation Request for Grok 4

## Context

We are building **LIFE SCORE** - a city freedom comparison tool that evaluates 100 legal freedom metrics across 6 categories to help users compare two cities. The system uses 5 LLMs (Claude Sonnet, GPT-4o, Gemini 3 Pro, Grok 4, Perplexity) as evaluators, with Claude Opus 4.5 as the final judge to build consensus.

We have identified a critical scoring problem and are consulting multiple LLMs to design the fix. Claude Opus, GPT-4o, and Gemini 3 Pro have already provided input. We need your perspective, particularly given Grok's real-time data capabilities and unique processing approach.

---

## The Problem

**Symptom:** Two cities frequently show identical or near-identical scores (e.g., Austin 65 vs Denver 65) even when they have meaningfully different freedom profiles in reality.

**Root Cause:** The LLM prompt asks for generic A/B/C/D/E letter grades, which get converted to a hardcoded scale (A=100, B=75, C=50, D=25, E=0). This **ignores** the detailed, metric-specific scoring criteria we already have defined.

---

## Current Architecture (Broken)

### What We Have Defined (But Don't Use)

Each of our 100 metrics has detailed `scoringCriteria` with specific category values and NON-UNIFORM scores:

```javascript
// Example: Cannabis Legality metric
{
  id: 'pf_01_cannabis_legal',
  name: 'Cannabis Legality',
  description: 'Legal status of recreational cannabis use and possession',
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

// Example: Alcohol Restrictions metric (different scale!)
{
  id: 'pf_02_alcohol_restrictions',
  scoringCriteria: {
    type: 'scale',
    levels: [
      { level: 5, label: 'Minimal Restrictions', score: 100 },
      { level: 4, label: 'Light Restrictions', score: 80 },
      { level: 3, label: 'Moderate Restrictions', score: 60 },
      { level: 2, label: 'Heavy Restrictions', score: 40 },
      { level: 1, label: 'Severe Restrictions', score: 20 }
    ]
  }
}
```

### What the Current Prompt Does (Wrong)

```javascript
// Current prompt asks for generic grades:
"Rate city1Legal as A/B/C/D/E"
"Rate city1Enforcement as A/B/C/D/E"

// Then converts with hardcoded scale:
A → 100, B → 75, C → 50, D → 25, E → 0
```

**Problems:**
1. Cannabis "medical_only" should be 60, but if LLM says "B" (closest match), we get 75
2. Cannabis "decriminalized" should be 40, but "C" gives us 50
3. Two cities both rated "C" for different reasons both get 50 (appear identical)
4. Only 5 possible scores across ALL metrics - no nuance

---

## The Agreed Solution (Claude Opus + GPT-4o + Gemini)

### Core Principle
**Make the LLM a CLASSIFIER, not a GRADER.**

Instead of asking for letter grades, we:
1. Pass the metric's actual `scoringCriteria.options` to the LLM prompt
2. Ask the LLM to select the ONE category value that best matches reality
3. Server looks up the score from our predefined criteria
4. LLM provides reasoning and sources for auditability

### New Prompt Structure (GPT-4o's Rewrite)

```javascript
// For each metric, inject its specific options:
`
### pf_01_cannabis_legal: Cannabis Legality
Description: Legal status of recreational cannabis use and possession
Scoring Direction: Higher value = more freedom

Allowed category values (choose ONE exactly):
- fully_legal: Fully Legal (recreational)
- medical_only: Medical Only
- decriminalized: Decriminalized
- illegal_minor: Illegal (minor penalty)
- illegal_severe: Illegal (severe penalty)
`

// LLM returns:
{
  "metricId": "pf_01_cannabis_legal",
  "city1Category": "medical_only",   // NOT a letter grade!
  "city2Category": "fully_legal",
  "confidence": "high",
  "reasoning": "City1 has medical-only program with strict requirements...",
  "sources": ["https://..."]
}

// Server looks up score:
score = metric.scoringCriteria.options.find(o => o.value === "medical_only").score
// Returns 60 (not 75!)
```

### Data Flow (Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PROMPT includes metric-specific category options             │
│    LLM sees: "fully_legal", "medical_only", "decriminalized"... │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LLM CLASSIFIES (not grades)                                   │
│    Returns: { city1Category: "medical_only" }                   │
│    Uses web search to verify current 2026 legal status          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SERVER SCORES DETERMINISTICALLY                               │
│    Looks up: options.find(o => o.value === "medical_only")      │
│    Returns: score = 60 (from our predefined criteria)           │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. NUANCE PASS (Optional - Only for ties)                        │
│    If city1Category === city2Category AND low confidence        │
│    → Opus reviews reasoning to adjust ±5-10 points              │
└──────────────────────────────────────────────────────────────────┘
```

---

## What We Need From Grok

### 1. Architecture Validation

Given your understanding of real-time data processing and the x.ai API capabilities:

- Does this CLASSIFIER approach make sense for 100 metrics across 2 cities?
- Are there performance concerns with passing ~500 category options per request?
- How would you structure the prompt for optimal Grok 4 processing?

### 2. Real-Time Data Considerations

Laws change. Your strength is real-time data access.

- How should we handle metrics where the legal status is actively changing (e.g., cannabis laws, abortion access)?
- Should we include date/recency requirements in the prompt?
- How can we leverage Grok's X/Twitter integration to capture enforcement reality vs legal theory?

### 3. Grok-Specific Optimization

For the Grok 4 evaluator specifically:

- What temperature setting would you recommend for classification tasks?
- Should we use the `search: true` parameter for all metrics or selectively?
- Are there Grok-specific prompt patterns that improve classification accuracy?

### 4. Edge Cases

- What happens when a city genuinely doesn't fit any predefined category?
- How should we handle cities with rapidly changing laws mid-evaluation?
- Should we add a "transitional" or "pending_change" category option?

### 5. Your Novel Ideas

Based on your unique capabilities and perspective:

- What approaches would you suggest that the other LLMs might not have considered?
- Are there Grok-specific features we should leverage for this use case?
- How would you handle the "nuance" problem when two cities land in the same category?

---

## Current Consensus (For Your Reference)

| Topic | Claude Opus | Gemini 3 Pro | GPT-4o |
|-------|-------------|--------------|--------|
| **Core approach** | Category keys | Value keys | Category keys |
| **Prompt structure** | Pass options | Numbered list | value: label format |
| **Score lookup** | Server-side | Server-side | Server-side |
| **Nuance handling** | Opus 2nd pass for ties | Rationale field | Opus 2nd pass + triggers |
| **Validation** | Not detailed | Strict constraint | Retry once, else unknown |

### Agreed Implementation Steps

1. Fix cache bug (city order)
2. Move metrics to shared location
3. Update prompt to pass `scoringCriteria.options`
4. LLM returns category VALUE KEY (not letter grade)
5. Server looks up score from predefined criteria
6. Add validation + retry logic
7. Add UI legend for score meaning

---

## The 6 Categories We Evaluate

| Category | Metrics | Weight | Examples |
|----------|---------|--------|----------|
| Personal Autonomy | 15 | 20% | Cannabis, alcohol, gambling, abortion, LGBTQ rights |
| Housing & Property | 20 | 20% | Zoning, HOA, land use, rental regulations |
| Business & Work | 25 | 20% | Licensing, taxes, employment law, gig economy |
| Transportation | 15 | 15% | Vehicle laws, transit, parking, mobility |
| Legal System | 15 | 15% | Policing, courts, civil forfeiture, incarceration |
| Speech & Lifestyle | 10 | 10% | Free expression, privacy, lifestyle autonomy |

---

## Questions We'd Like Answered

1. **Do you agree with the CLASSIFIER approach?** If not, what alternative would you suggest?

2. **How should Grok 4 be configured** for this classification task? (temperature, search settings, timeout handling)

3. **What prompt modifications** would optimize results specifically for Grok's processing model?

4. **How do we handle real-time data freshness** for rapidly changing legal landscapes?

5. **What's your view on the nuance problem** - when both cities fall into the same category but have meaningful differences?

6. **Any novel ideas** we haven't considered?

---

## Technical Details (For Reference)

### Current Grok Evaluator Code

```javascript
// api/evaluate.ts - Grok 4 evaluation function
async function evaluateWithGrok(city1: string, city2: string, metrics: EvaluationRequest['metrics']): Promise<EvaluationResponse> {
  const apiKey = process.env.XAI_API_KEY;

  const grokAddendum = `
## GROK-SPECIFIC INSTRUCTIONS
- Use your native X/Twitter search to find real enforcement experiences from residents
- Prioritize recent posts (2024-2026) about actual encounters with laws and police
- X posts often reveal enforcement reality that differs from official policy
- Weight anecdotal enforcement data alongside official legal sources
`;

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-4',
      messages: [
        { role: 'system', content: 'You are an expert legal analyst...' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 16384,
      temperature: 0.3,
      search: true  // Enable real-time search
    })
  });

  // ... parse response
}
```

### API Constraints

- Vercel Pro timeout: 300 seconds
- We parallelize 6 category calls to fit within limits
- Each category has 10-25 metrics
- Total: 100 metrics per comparison

---

## Your Response Format

Please structure your response with:

1. **Overall Assessment** - Your view on the proposed approach
2. **Grok-Specific Recommendations** - Configuration, prompt, settings
3. **Real-Time Data Strategy** - How to leverage Grok's strengths
4. **Edge Case Handling** - Your suggestions
5. **Novel Ideas** - Anything unique you'd contribute
6. **Implementation Notes** - Any technical considerations

---

We appreciate your input. This collaborative approach across multiple LLMs ensures we build the most robust scoring system possible.

*Document prepared for Grok 4 consultation - January 2026*
