# TAVILY INTEGRATION CHANGES - HANDOFF DOCUMENT
## Conversation ID: LS-2026-0117-001
## Created: 2026-01-18

---

## STATUS: TAVILY OPTIMIZATIONS IMPLEMENTED ✅

**Implemented:** 2026-01-18 (Conversation ID: LS-2026-0117-001)

---

## UPDATED TAVILY INTEGRATION SUMMARY

### Files Modified:
| File | Lines | Changes |
|------|-------|---------|
| `api/evaluate.ts` | 233-277 | Updated tavilySearch with new parameters |
| `api/evaluate.ts` | 288-333 | Claude Sonnet: 12 category-level queries + new context injection |
| `api/evaluate.ts` | 385-430 | GPT-4o: 12 category-level queries + new context injection |
| `src/services/llmEvaluators.ts` | 166-215 | Updated tavilySearch with new parameters |
| `src/services/llmEvaluators.ts` | 245-281 | Claude: 12 category-level queries + new context injection |

### NEW Tavily API Configuration:
- **Endpoint:** `https://api.tavily.com/search`
- **Search Depth:** `advanced`
- **Max Results:** 5 (standardized)
- **Include Answer:** `true` ← NEW (LLM-generated synthesis)
- **Include Raw Content:** `false`
- **Chunks Per Source:** 3 ← NEW (pre-chunked snippets)
- **Topic:** `general`
- **Date Range:** 2024-01-01 to 2026-01-17 ← NEW
- **Include Domains:** freedomhouse.org, heritage.org, cato.org, fraserinstitute.org ← NEW
- **Country:** US ← NEW
- **Include Usage:** `true` ← NEW (credit tracking)
- **Timeout:** 180000ms (LLM_TIMEOUT_MS) - UNCHANGED per user request

### NEW Category-Level Search Queries (12 total per LLM):
```typescript
// personal_freedom (15 metrics)
`${city1} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`
`${city2} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025`

// housing_property (20 metrics)
`${city1} property rights zoning HOA land use housing regulations 2025`
`${city2} property rights zoning HOA land use housing regulations 2025`

// business_work (25 metrics)
`${city1} business regulations taxes licensing employment labor laws 2025`
`${city2} business regulations taxes licensing employment labor laws 2025`

// transportation (15 metrics)
`${city1} transportation vehicle regulations transit parking driving laws 2025`
`${city2} transportation vehicle regulations transit parking driving laws 2025`

// policing_legal (15 metrics)
`${city1} criminal justice police enforcement legal rights civil liberties 2025`
`${city2} criminal justice police enforcement legal rights civil liberties 2025`

// speech_lifestyle (10 metrics)
`${city1} freedom speech expression privacy lifestyle regulations 2025`
`${city2} freedom speech expression privacy lifestyle regulations 2025`
```

### Credit Usage:
- **Per LLM:** 12 queries × 2 credits (advanced) = 24 credits
- **Per Comparison:** 48 credits total (Claude Sonnet + GPT-4o)

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

## TAVILY'S FEEDBACK (Received 2026-01-18)

### Key Recommendations Implemented:
1. **API Configuration Updates:**
   - `include_answer: true` - Get LLM-generated synthesis
   - `chunks_per_source: 3` - Pre-chunked relevant snippets
   - `start_date`/`end_date` - Recent data only
   - `include_domains` - Target authoritative freedom sources
   - `country: 'US'` - Boost US results
   - `include_usage: true` - Track credit consumption

2. **Query Optimization:**
   - Changed from 2 broad queries to 12 category-level focused queries
   - Queries aligned with existing 6-category schema (100 metrics)
   - Under 400 characters per query (Tavily best practice)

3. **Context Injection Improvement:**
   - Removed manual `.slice()` truncation (chunks_per_source handles it)
   - Added Tavily's LLM-generated summary (`data.answer`)
   - Include full URLs for citation tracking

4. **LLM Addendum Updates:**
   - Both Claude and GPT-4o addendums now reference "summary answer above"
   - Cross-reference instructions added

### NOT Implemented (User Decision):
- **Timeout:** Kept at 180000ms (user explicitly declined Tavily's 60s recommendation)

---

## IMPLEMENTATION COMPLETE ✅

All changes implemented 2026-01-18. Ready for testing.

---

## PREVIOUS COMMITS THIS SESSION

| Commit | Description |
|--------|-------------|
| `8a1d440` | Fix Gemini model mismatch: gemini-3-pro → gemini-3-pro-preview |
| (pending) | Tavily optimization: category-level queries + new API parameters |

---
