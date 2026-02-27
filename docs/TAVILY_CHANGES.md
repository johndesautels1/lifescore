# TAVILY INTEGRATION CHANGES - HANDOFF DOCUMENT
## Conversation ID: LS-2026-0117-001
## Created: 2026-01-18

---

## STATUS: TAVILY FULL INTEGRATION COMPLETE ✅

**Phase 1 Implemented:** 2026-01-18 - Category-level queries + API optimization
**Phase 2 Implemented:** 2026-01-18 - Research API + Project Tracking + Advanced Answer

---

## CURRENT TAVILY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│  1. TAVILY RESEARCH (once per comparison)                   │
│     → Comprehensive baseline report for both cities         │
│     → Model: mini (4-110 credits)                           │
├─────────────────────────────────────────────────────────────┤
│  2. TAVILY SEARCH (per category, 12 queries)                │
│     → Focused queries for each of 6 schema categories       │
│     → 24 credits per LLM (48 total)                         │
├─────────────────────────────────────────────────────────────┤
│  3. LLM CASCADE (Claude Sonnet, GPT-4o)                     │
│     → Process Tavily context + generate evaluations         │
└─────────────────────────────────────────────────────────────┘
```

---

## FILES MODIFIED

| File | Changes |
|------|---------|
| `api/evaluate.ts` | tavilyResearch(), tavilySearch(), TAVILY_HEADERS, Claude + GPT-4o context |
| `src/services/llmEvaluators.ts` | tavilyResearch(), tavilySearch(), TAVILY_HEADERS, Claude context |

---

## TAVILY API CONFIGURATION

### Project Tracking Header (ALL requests):
```typescript
const TAVILY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Project-ID': 'lifescore-freedom-app'
};
```

### Research API (`/research`):
```typescript
{
  api_key: apiKey,
  input: "Compare freedom laws...",
  model: 'mini',           // Cost-effective: 4-110 credits
  citation_format: 'numbered'
}
```

### Search API (`/search`):
```typescript
{
  api_key: apiKey,
  query: "<category query>",
  search_depth: 'advanced',
  max_results: 5,
  include_answer: 'advanced',  // ← Upgraded from 'true'
  include_raw_content: false,
  chunks_per_source: 3,
  topic: 'general',
  start_date: '2024-01-01',  // Fixed start for historical context
  end_date: new Date().toISOString().split('T')[0],  // Dynamic: always current date
  exclude_domains: ['pinterest.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'quora.com', 'yelp.com', 'tripadvisor.com'],
  country: 'US',
  include_usage: true
}
```

### Credit Usage Per Comparison:
| Component | Credits |
|-----------|---------|
| Research API (mini) | 4-110 |
| Search (12 × 2 credits × 2 LLMs) | 48 |
| **Total** | **52-158** |

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
- Gemini 3.1 Pro (Google Search grounding)
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
   - `start_date`/`end_date` - Dynamic end_date (always current), fixed start
   - `exclude_domains` - Block low-quality/opinion-based sources
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
