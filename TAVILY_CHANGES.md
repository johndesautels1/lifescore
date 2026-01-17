# TAVILY INTEGRATION CHANGES - HANDOFF DOCUMENT
## Conversation ID: LS-2026-0117-001
## Created: 2026-01-18

---

## CRITICAL: FIRST ACTION FOR NEXT CLAUDE SESSION

**IMMEDIATELY ASK THE USER:**
> "Please paste or provide Tavily's feedback files/review. I need to see their specific recommendations before making any changes to the Tavily integration."

**DO NOT** make any changes to Tavily code without first receiving and reading Tavily's feedback.

---

## CURRENT TAVILY INTEGRATION SUMMARY

### Files Containing Tavily Code:
| File | Lines | Purpose |
|------|-------|---------|
| `api/evaluate.ts` | 233-262 | Main Tavily search function (server) |
| `api/evaluate.ts` | 273-287 | Claude Sonnet Tavily integration |
| `api/evaluate.ts` | 347-361 | GPT-4o Tavily integration |
| `api/health.ts` | 24 | Environment variable check |
| `src/services/llmEvaluators.ts` | 167-200 | Tavily search function (client) |
| `src/services/llmEvaluators.ts` | 230-248 | Claude Tavily context injection |
| `src/types/enhancedComparison.ts` | 209 | LLMAPIKeys.tavily type definition |
| `src/components/EnhancedComparison.tsx` | 530-535 | Tavily API key input field |

### Current Tavily API Configuration:
- **Endpoint:** `https://api.tavily.com/search`
- **Search Depth:** `advanced`
- **Max Results:** 3 (server) / 5 (client)
- **Include Answer:** false
- **Include Raw Content:** false
- **Timeout:** 180000ms (LLM_TIMEOUT_MS)

### Current Search Queries:
```
${city1} laws regulations freedom 2024 2025
${city2} laws regulations freedom 2024 2025
```

### LLMs Using Tavily:
- Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
- GPT-4o

### LLMs NOT Using Tavily (have native search):
- Gemini 3 Pro (Google Search grounding)
- Grok 4 (native X/Twitter search)
- Perplexity (native web search)

---

## EXISTING TAVILY CODE BLOCKS

### 1. Tavily Search Function (api/evaluate.ts:233-262)
```typescript
async function tavilySearch(query: string, maxResults: number = 3): Promise<{ title: string; url: string; content: string }[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  try {
    const response = await fetchWithTimeout(
      'https://api.tavily.com/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'advanced',
          max_results: maxResults,
          include_answer: false,
          include_raw_content: false
        })
      },
      LLM_TIMEOUT_MS
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch {
    return [];
  }
}
```

### 2. Context Injection (api/evaluate.ts:284-286)
```typescript
tavilyContext = `## WEB SEARCH RESULTS (from Tavily)\n${results.map(r => `- ${r.title}: ${r.content.slice(0, 400)}`).join('\n')}\n\n`;
```

### 3. Claude Addendum (api/evaluate.ts:290-295)
```typescript
const claudeAddendum = `
## CLAUDE-SPECIFIC INSTRUCTIONS
- Use the Tavily web search results above to ground your evaluation in current facts
- You excel at nuanced legal interpretation - distinguish between law text vs enforcement reality
- For ambiguous cases, lean toward the grade that reflects lived experience over technical legality
`;
```

### 4. GPT-4o Addendum (api/evaluate.ts:364-369)
```typescript
const gptAddendum = `
## GPT-4o SPECIFIC INSTRUCTIONS
- Use the Tavily web search results above to verify current legal status
- Focus on factual accuracy - cross-reference multiple sources when available
- Be precise with your letter grades - avoid defaulting to 'C' when evidence points elsewhere
`;
```

---

## KNOWN MINOR INCONSISTENCY

| Location | Max Results | Content Slice |
|----------|-------------|---------------|
| api/evaluate.ts (server) | 3 | 400 chars |
| src/services/llmEvaluators.ts (client) | 5 | 500 chars |

---

## TAVILY'S FEEDBACK

**[PASTE TAVILY'S FEEDBACK BELOW THIS LINE]**

---

## CHANGES TO IMPLEMENT

**[TO BE FILLED AFTER RECEIVING TAVILY'S FEEDBACK]**

---

## APPROVAL REQUIRED

Per README.md court order:
> **NO TIMEOUT OR API CHANGES** may be made without explicit approval from **John Desautels**.

If Tavily's feedback includes timeout changes, API endpoint changes, or model changes, these require John's explicit approval before implementation.

---

## PREVIOUS COMMITS THIS SESSION

| Commit | Description |
|--------|-------------|
| `8a1d440` | Fix Gemini model mismatch: gemini-3-pro → gemini-3-pro-preview |

---
