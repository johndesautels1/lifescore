# LifeScore Tavily API Analysis

**Version:** 1.0
**Last Updated:** January 28, 2026
**Document ID:** LS-TAVILY-001

---

## Executive Summary

This document analyzes LifeScore's current Tavily API usage and provides recommendations for optimization and additional API integration.

**Current State:**
- Using: Research API + Search API
- Not Using: Extract API, Agent API, Graph API
- Cost: ~$120/month at 100 comparisons
- Opportunity: 40-50% cost reduction possible

---

## Table of Contents

1. [Current Tavily Usage](#1-current-tavily-usage)
2. [APIs Currently Used](#2-apis-currently-used)
3. [APIs NOT Used](#3-apis-not-used)
4. [Optimization Opportunities](#4-optimization-opportunities)
5. [Recommendations](#5-recommendations)
6. [Implementation Guide](#6-implementation-guide)

---

## 1. Current Tavily Usage

### Overview

LifeScore uses Tavily as its primary web research API to gather current legal information for city comparisons.

### Files Using Tavily

| File | Lines | Purpose |
|------|-------|---------|
| `api/evaluate.ts` | 485-531 | `tavilyResearch()` function |
| `api/evaluate.ts` | 534-587 | `tavilySearch()` function |
| `api/evaluate.ts` | 598-653 | Claude integration |
| `api/evaluate.ts` | 735-795 | GPT-4o integration |
| `api/evaluate.ts` | 1204-1259 | Perplexity integration |
| `src/utils/costCalculator.ts` | 67-82 | Pricing config |
| `docs/TAVILY_CHANGES.md` | Full | Documentation |

### Authentication

```typescript
const getTavilyHeaders = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,  // Bearer token auth
  'X-Project-ID': 'lifescore-freedom-app'
});
```

---

## 2. APIs Currently Used

### 2.1 Research API (`/research`)

**Endpoint:** `https://api.tavily.com/research`

**Usage:**
- Called ONCE per comparison
- Generates comprehensive baseline report
- Compares legal frameworks between two cities

**Parameters Used:**
```typescript
{
  query: `Compare legal freedom between ${city1} and ${city2}...`,
  model: 'mini',  // Cost-effective
  max_results: 10
}
```

**Cost:** 4-110 credits per call (average ~30)

**Response:** Full research report with citations

---

### 2.2 Search API (`/search`)

**Endpoint:** `https://api.tavily.com/search`

**Usage:**
- Called 12 times per LLM evaluation
- 2 cities × 6 categories = 12 queries
- Each LLM provider makes independent calls

**Parameters Used:**
```typescript
{
  query: "<category-specific query>",
  search_depth: 'advanced',
  max_results: 5,
  include_answer: 'advanced',      // LLM synthesis
  include_raw_content: false,
  chunks_per_source: 3,
  topic: 'general',
  start_date: '2024-01-01',
  end_date: '<current date>',
  exclude_domains: [
    'pinterest.com', 'facebook.com', 'twitter.com',
    'instagram.com', 'tiktok.com', 'reddit.com',
    'quora.com', 'yelp.com', 'tripadvisor.com'
  ],
  include_usage: true
}
```

**Cost:** ~2-3 credits per query

**Category Queries:**

| Category | Query Pattern |
|----------|---------------|
| personal_freedom | `{city} personal freedom drugs alcohol cannabis gambling abortion LGBTQ laws 2025` |
| housing_property | `{city} property rights zoning HOA land use housing regulations 2025` |
| business_work | `{city} business regulations taxes licensing employment labor laws 2025` |
| transportation | `{city} transportation vehicle regulations transit parking driving laws 2025` |
| policing_legal | `{city} criminal justice police enforcement legal rights civil liberties 2025` |
| speech_lifestyle | `{city} freedom speech expression privacy lifestyle regulations 2025` |

---

## 3. APIs NOT Used

### 3.1 Extract API (`/extract`)

**What It Does:**
- Extracts and parses content from specific URLs
- Returns structured content from web pages
- Can process multiple URLs in one call

**Potential Use Cases:**
1. **Cache source content** - Store full text from authoritative sources
2. **Primary source verification** - Get complete legal documents
3. **Evidence enhancement** - Provide fuller context for citations

**Why Not Currently Used:**
- Search API provides snippets
- Adds complexity to flow
- Additional cost per extraction

**Recommendation:** ADD for source caching (see Section 5)

---

### 3.2 Agent API (Multi-turn Research)

**What It Does:**
- Iterative, multi-turn research mode
- Can ask follow-up questions
- Recursive investigation of sub-topics

**Potential Use Cases:**
1. **Disagreement resolution** - When LLMs disagree, investigate deeper
2. **Complex legal questions** - Multi-step legal research
3. **Automated fact-checking** - Verify conflicting claims

**Why Not Currently Used:**
- Higher complexity
- Uncertain cost model
- Current flow works adequately

**Recommendation:** CONSIDER for Phase 2 (disagreement handling)

---

### 3.3 Graph API (Knowledge Graph)

**What It Does:**
- Navigate relationships between entities
- Find connected legal concepts
- Map regulatory dependencies

**Potential Use Cases:**
1. **Related laws discovery** - Find laws that affect each other
2. **Precedent mapping** - Connect court cases to regulations
3. **Regulatory cascade** - Understand how one law affects others

**Why Not Currently Used:**
- Highly specialized
- Unclear benefit for current use case
- May be overkill for city comparisons

**Recommendation:** NOT NEEDED currently

---

## 4. Optimization Opportunities

### 4.1 Reduce Duplicate Tavily Calls

**Current Problem:**
- Each LLM provider makes independent Tavily calls
- 5 providers × 12 queries = 60 Tavily calls per comparison
- Same data fetched 5 times

**Solution:**
```typescript
// Fetch Tavily data ONCE
const tavilyData = await fetchAllTavilyData(city1, city2);

// Pass to all providers
const [claude, gpt, gemini] = await Promise.all([
  evaluateWithClaude(city1, city2, metrics, tavilyData),
  evaluateWithGPT4o(city1, city2, metrics, tavilyData),
  evaluateWithGemini(city1, city2, metrics, tavilyData)
]);
```

**Savings:** 60 calls → 12 calls (80% reduction)

---

### 4.2 Cache Research API Results

**Current Problem:**
- Research API called every comparison
- Same city pairs re-researched repeatedly

**Solution:**
```typescript
async function getCachedResearch(city1, city2) {
  const cacheKey = `research:${city1}:${city2}`;

  // Check cache (30-day TTL)
  const cached = await supabase
    .from('city_evaluations')
    .select('tavily_summary')
    .eq('cache_key', cacheKey)
    .single();

  if (cached) return cached.tavily_summary;

  // Fetch and cache
  const research = await tavilyResearch(city1, city2);
  await saveToCache(cacheKey, research);
  return research;
}
```

**Savings:** Skip Research API for repeat comparisons (50%+ reduction)

---

### 4.3 Consolidate Search Queries

**Current Problem:**
- 12 separate queries per comparison
- Each query covers one category per city

**Solution:**
- Combine related queries
- Use broader queries with more results

```typescript
// Instead of 12 queries, use 6 broader ones
const queries = [
  `${city1} ${city2} personal freedom drugs gambling abortion LGBTQ laws comparison 2025`,
  `${city1} ${city2} property rights zoning HOA housing comparison 2025`,
  // ... 4 more combined queries
];
```

**Savings:** 12 calls → 6 calls (50% reduction)

---

### 4.4 Use Extract API for Source Caching

**Opportunity:**
- When Search API returns high-quality URLs
- Extract and cache full content
- Reuse for future queries about same city

```typescript
// After search, extract top sources
const topUrls = searchResults
  .filter(r => r.relevance > 0.8)
  .map(r => r.url);

const extracted = await tavilyExtract(topUrls);
await cacheExtractedContent(cityName, extracted);
```

**Benefit:** Better evidence, reduced future API calls

---

## 5. Recommendations

### Priority 1: Share Tavily Data Across Providers (HIGH)

**Impact:** 80% reduction in Tavily calls
**Effort:** 3-4 hours
**Implementation:**
1. Fetch all Tavily data before LLM calls
2. Pass cached data to each provider function
3. Remove Tavily calls from individual provider functions

---

### Priority 2: Cache Research API Results (HIGH)

**Impact:** 50%+ reduction for repeat comparisons
**Effort:** 2-3 hours
**Implementation:**
1. Add `tavily_summary` to city cache
2. Check cache before Research API call
3. Cache new research results

---

### Priority 3: Consolidate Search Queries (MEDIUM)

**Impact:** 30-40% reduction in search calls
**Effort:** 2-3 hours
**Implementation:**
1. Design combined query patterns
2. Update query generation logic
3. Test result quality

---

### Priority 4: Add Extract API (LOW)

**Impact:** Better source caching, improved evidence
**Effort:** 4-6 hours
**Implementation:**
1. Identify high-value URLs worth extracting
2. Implement extraction after search
3. Cache extracted content
4. Use cached content for evidence display

---

## 6. Implementation Guide

### Step 1: Shared Tavily Fetch

**File:** `api/evaluate.ts`

```typescript
// Add before provider evaluation functions

interface TavilyData {
  research: ResearchResult;
  searches: SearchResult[];
}

async function fetchSharedTavilyData(
  city1: string,
  city2: string,
  apiKey: string
): Promise<TavilyData> {
  const [research, ...searches] = await Promise.all([
    tavilyResearch(city1, city2, apiKey),
    ...generateCategoryQueries(city1, city2).map(q =>
      tavilySearch(q, apiKey)
    )
  ]);

  return { research, searches };
}
```

---

### Step 2: Modify Provider Functions

**File:** `api/evaluate.ts`

```typescript
// Before (in each provider function)
async function evaluateWithClaude(city1, city2, metrics, apiKey) {
  const tavilyData = await fetchTavilyData(city1, city2);  // REMOVE
  // ...
}

// After
async function evaluateWithClaude(city1, city2, metrics, tavilyData, apiKey) {
  // Use passed tavilyData instead of fetching
  const prompt = buildPromptWithContext(city1, city2, metrics, tavilyData);
  // ...
}
```

---

### Step 3: Update API Handler

**File:** `api/evaluate.ts`

```typescript
// In main handler
async function handleEvaluate(req, res) {
  const { city1, city2, provider } = req.body;

  // Step 1: Check cache for Tavily data
  let tavilyData = await getCachedTavilyData(city1, city2);

  if (!tavilyData) {
    // Step 2: Fetch Tavily data ONCE
    tavilyData = await fetchSharedTavilyData(city1, city2, apiKey);

    // Step 3: Cache for future use
    await cacheTavilyData(city1, city2, tavilyData);
  }

  // Step 4: Pass to provider (no Tavily calls inside)
  const result = await evaluateWithProvider(
    provider, city1, city2, metrics, tavilyData
  );

  return res.json(result);
}
```

---

### Step 4: Add Extract API (Optional)

**File:** `api/shared/tavilyExtract.ts`

```typescript
export async function tavilyExtract(
  urls: string[],
  apiKey: string
): Promise<ExtractResult[]> {
  const response = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: getTavilyHeaders(apiKey),
    body: JSON.stringify({
      urls,
      include_raw_content: true
    })
  });

  return response.json();
}

// Usage after search
async function extractAndCacheTopSources(
  searchResults: SearchResult[],
  cityName: string,
  apiKey: string
) {
  const topUrls = searchResults
    .filter(r => r.score > 0.8)
    .slice(0, 3)
    .map(r => r.url);

  if (topUrls.length === 0) return;

  const extracted = await tavilyExtract(topUrls, apiKey);

  for (const content of extracted) {
    await supabase
      .from('source_content_cache')
      .upsert({
        url: content.url,
        city_name: cityName,
        content: content.content,
        extracted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
  }
}
```

---

## Cost Analysis

### Current Costs (per comparison)

| API | Calls | Credits/Call | Total Credits |
|-----|-------|--------------|---------------|
| Research | 1 | 30 avg | 30 |
| Search (Claude) | 12 | 2.5 avg | 30 |
| Search (GPT-4o) | 12 | 2.5 avg | 30 |
| Search (Gemini) | 0 | - | 0 |
| Search (Grok) | 0 | - | 0 |
| Search (Perplexity) | 12 | 2.5 avg | 30 |
| **Total** | **37** | | **~120 credits** |

### After Optimization

| API | Calls | Credits/Call | Total Credits |
|-----|-------|--------------|---------------|
| Research | 1 (cached) | 0-30 | 0-30 |
| Search (shared) | 12 | 2.5 avg | 30 |
| **Total** | **13** | | **~30-60 credits** |

### Monthly Savings

| Scenario | Current | After | Savings |
|----------|---------|-------|---------|
| 100 comparisons | $120 | $30-60 | $60-90/mo |
| 500 comparisons | $600 | $150-300 | $300-450/mo |
| 1000 comparisons | $1,200 | $300-600 | $600-900/mo |

---

## Summary

### What We're Using
- ✅ Research API - comprehensive reports
- ✅ Search API - category-specific queries

### What We Should Add
- ⏳ Shared Tavily data across providers (Priority 1)
- ⏳ Research API caching (Priority 2)
- ⏳ Query consolidation (Priority 3)
- ⏳ Extract API for source caching (Priority 4)

### What We Don't Need
- ❌ Agent API - too complex for current needs
- ❌ Graph API - not relevant for city comparisons

### Expected Impact
- 50-75% reduction in Tavily costs
- Faster evaluations (less API waiting)
- Better caching for repeat queries

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
