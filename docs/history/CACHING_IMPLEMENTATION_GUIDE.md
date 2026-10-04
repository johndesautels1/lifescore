# LifeScore Caching Implementation Guide

**Version:** 1.0
**Last Updated:** January 28, 2026
**Document ID:** LS-CACHE-001
**Priority:** HIGH - Performance Critical

---

## Executive Summary

This document provides a phased implementation plan for adding city evaluation caching to LifeScore. The caching system will dramatically reduce API costs and loading times by storing evaluation results in Supabase and reusing them for future comparisons.

**Expected Improvements:**
- 95% faster for cached city pairs
- 80% reduction in Tavily API costs
- 50% reduction in LLM API costs
- Better user experience

---

## Table of Contents

1. [Current Problem](#1-current-problem)
2. [Solution Overview](#2-solution-overview)
3. [Phase 1: Basic Caching](#3-phase-1-basic-caching)
4. [Phase 2: Delta Updates](#4-phase-2-delta-updates)
5. [Phase 3: Pre-Caching](#5-phase-3-pre-caching)
6. [Phase 4: Media Caching](#6-phase-4-media-caching)
7. [Database Schema](#7-database-schema)
8. [API Changes](#8-api-changes)
9. [Frontend Changes](#9-frontend-changes)
10. [Testing Plan](#10-testing-plan)
11. [Rollback Plan](#11-rollback-plan)

---

## 1. Current Problem

### The Pain Point

Every comparison triggers:
- 1 Tavily Research call (4-110 credits)
- 12 Tavily Search calls (24+ credits)
- 100 metric evaluations per LLM provider
- 5 LLM providers in enhanced mode
- Total time: 3-6 minutes
- Total cost: $0.50-$2.00 per comparison

### Why This Hurts

1. **Repeated Work:** If 10 users compare Miami vs Austin, we do the same work 10 times
2. **Slow Experience:** Users wait 3-6 minutes even for popular city pairs
3. **High Costs:** API costs scale linearly with usage
4. **Wasted Resources:** Same legal research repeated constantly

### Current Data Flow

```
User A: Miami vs Austin → Full API calls → 5 minutes → Results
User B: Miami vs Austin → Full API calls → 5 minutes → Same results
User C: Miami vs Denver → Full API calls → 5 minutes → Partial overlap (Miami)
```

---

## 2. Solution Overview

### The Vision

```
User A: Miami vs Austin → Full API calls → Cache results → 5 minutes
User B: Miami vs Austin → Cache HIT → 5 seconds
User C: Miami vs Denver → Miami: Cache HIT, Denver: API calls → 2.5 minutes
```

### Key Principles

1. **Global Cache:** All users benefit from all evaluations
2. **City-Level Storage:** Cache individual cities, not city pairs
3. **Freshness Control:** Configurable cache expiration (30-90 days)
4. **Delta Updates:** Only fetch what changed since last evaluation
5. **Graceful Fallback:** If cache fails, fall back to full API calls

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      REQUEST FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   User Request (City A vs City B)                           │
│            │                                                 │
│            ▼                                                 │
│   ┌─────────────────┐                                       │
│   │  Cache Check    │                                       │
│   │  (Supabase)     │                                       │
│   └────────┬────────┘                                       │
│            │                                                 │
│     ┌──────┴──────┐                                         │
│     │             │                                         │
│     ▼             ▼                                         │
│  CACHE HIT    CACHE MISS                                    │
│  (< 5 sec)    (Full eval)                                   │
│     │             │                                         │
│     │             ▼                                         │
│     │    ┌─────────────────┐                               │
│     │    │  Tavily + LLM   │                               │
│     │    │  Evaluation     │                               │
│     │    └────────┬────────┘                               │
│     │             │                                         │
│     │             ▼                                         │
│     │    ┌─────────────────┐                               │
│     │    │  Save to Cache  │                               │
│     │    │  (Supabase)     │                               │
│     │    └────────┬────────┘                               │
│     │             │                                         │
│     └──────┬──────┘                                         │
│            │                                                 │
│            ▼                                                 │
│   Return Results to User                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1: Basic Caching

**Timeline:** 2 days
**Priority:** CRITICAL

### 3.1 Create Database Table

```sql
-- Run in Supabase SQL Editor
CREATE TABLE city_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- City identification
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,  -- State/province

  -- Evaluation metadata
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  llm_provider TEXT NOT NULL,
  evaluation_version TEXT DEFAULT 'v1.0',

  -- Cached data (JSONB for flexibility)
  metrics_data JSONB NOT NULL,      -- All 100 metric scores
  evidence_data JSONB,               -- Source citations
  category_scores JSONB,             -- Pre-calculated averages
  tavily_summary TEXT,               -- Research API response

  -- Cache management
  hit_count INTEGER DEFAULT 0,       -- Track popularity
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(city_name, country, llm_provider)
);

-- Indexes for fast lookup
CREATE INDEX idx_city_eval_lookup ON city_evaluations(city_name, country, llm_provider);
CREATE INDEX idx_city_eval_expires ON city_evaluations(expires_at);
CREATE INDEX idx_city_eval_popular ON city_evaluations(hit_count DESC);

-- Enable RLS
ALTER TABLE city_evaluations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read completed evaluations
CREATE POLICY "Public read access for evaluations"
  ON city_evaluations FOR SELECT
  USING (true);

-- Policy: Service role can manage
CREATE POLICY "Service role full access"
  ON city_evaluations FOR ALL
  USING (auth.role() = 'service_role');
```

### 3.2 Create Cache Service

**File:** `api/shared/cityCache.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CachedEvaluation {
  city_name: string;
  country: string;
  metrics_data: MetricScore[];
  evidence_data: Evidence[];
  category_scores: CategoryScore[];
  evaluated_at: string;
  llm_provider: string;
}

/**
 * Check if city evaluation exists in cache
 */
export async function getCachedEvaluation(
  cityName: string,
  country: string,
  provider: string
): Promise<CachedEvaluation | null> {
  const { data, error } = await supabase
    .from('city_evaluations')
    .select('*')
    .eq('city_name', cityName)
    .eq('country', country)
    .eq('llm_provider', provider)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  // Increment hit count
  await supabase
    .from('city_evaluations')
    .update({
      hit_count: data.hit_count + 1,
      last_accessed_at: new Date().toISOString()
    })
    .eq('id', data.id);

  return data;
}

/**
 * Save evaluation to cache
 */
export async function cacheEvaluation(
  cityName: string,
  country: string,
  provider: string,
  metricsData: MetricScore[],
  evidenceData: Evidence[],
  categoryScores: CategoryScore[],
  tavilySummary?: string
): Promise<void> {
  const { error } = await supabase
    .from('city_evaluations')
    .upsert({
      city_name: cityName,
      country: country,
      llm_provider: provider,
      metrics_data: metricsData,
      evidence_data: evidenceData,
      category_scores: categoryScores,
      tavily_summary: tavilySummary,
      evaluated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      onConflict: 'city_name,country,llm_provider'
    });

  if (error) {
    console.error('Cache save failed:', error);
    // Don't throw - caching is not critical
  }
}

/**
 * Invalidate cache for a city (e.g., after known legal changes)
 */
export async function invalidateCityCache(
  cityName: string,
  country: string
): Promise<void> {
  await supabase
    .from('city_evaluations')
    .delete()
    .eq('city_name', cityName)
    .eq('country', country);
}
```

### 3.3 Modify Evaluate Endpoint

**File:** `api/evaluate.ts` (modifications)

```typescript
import { getCachedEvaluation, cacheEvaluation } from './shared/cityCache';

// At the start of the evaluate function:
async function handleEvaluate(req, res) {
  const { city1, city2, category, provider } = req.body;

  // Step 1: Check cache for both cities
  const [city1Cache, city2Cache] = await Promise.all([
    getCachedEvaluation(city1, 'USA', provider),
    getCachedEvaluation(city2, 'USA', provider)
  ]);

  let city1Scores, city2Scores;
  let city1Evidence, city2Evidence;

  // Step 2: Use cache or fetch
  if (city1Cache) {
    console.log(`Cache HIT for ${city1}`);
    city1Scores = city1Cache.metrics_data;
    city1Evidence = city1Cache.evidence_data;
  } else {
    console.log(`Cache MISS for ${city1} - fetching...`);
    const result = await evaluateCity(city1, category, provider);
    city1Scores = result.scores;
    city1Evidence = result.evidence;

    // Cache for future use
    await cacheEvaluation(city1, 'USA', provider, city1Scores, city1Evidence, []);
  }

  // Same for city2...
  if (city2Cache) {
    console.log(`Cache HIT for ${city2}`);
    city2Scores = city2Cache.metrics_data;
    city2Evidence = city2Cache.evidence_data;
  } else {
    console.log(`Cache MISS for ${city2} - fetching...`);
    const result = await evaluateCity(city2, category, provider);
    city2Scores = result.scores;
    city2Evidence = result.evidence;

    await cacheEvaluation(city2, 'USA', provider, city2Scores, city2Evidence, []);
  }

  // Step 3: Return combined results
  return res.json({
    success: true,
    city1: { scores: city1Scores, evidence: city1Evidence, cached: !!city1Cache },
    city2: { scores: city2Scores, evidence: city2Evidence, cached: !!city2Cache }
  });
}
```

### 3.4 Add Cache Status to Response

Frontend should know when data came from cache:

```typescript
interface EvaluationResponse {
  success: boolean;
  city1: {
    scores: MetricScore[];
    evidence: Evidence[];
    cached: boolean;           // NEW
    cachedAt?: string;         // NEW
  };
  city2: {
    scores: MetricScore[];
    evidence: Evidence[];
    cached: boolean;           // NEW
    cachedAt?: string;         // NEW
  };
}
```

---

## 4. Phase 2: Delta Updates

**Timeline:** 1-2 days
**Priority:** MEDIUM

### 4.1 Concept

When cache exists but is aging (30+ days), check for legal changes:

```
1. Load cached data (instant)
2. Show to user immediately
3. Background: Ask Tavily "Legal changes in {city} since {cache_date}?"
4. If changes found → Update affected metrics only
5. Refresh cache
```

### 4.2 Implementation

```typescript
async function deltaUpdate(
  cityName: string,
  cachedAt: Date,
  currentData: CachedEvaluation
): Promise<MetricScore[] | null> {
  // Ask Tavily for changes since cache date
  const changeQuery = `${cityName} new laws regulations passed since ${cachedAt.toISOString().split('T')[0]}`;

  const changes = await tavilySearch(changeQuery, 10);

  if (!changes.results || changes.results.length === 0) {
    // No changes detected - cache is still valid
    return null;
  }

  // Identify which categories might be affected
  const affectedCategories = detectAffectedCategories(changes.results);

  if (affectedCategories.length === 0) {
    return null;
  }

  // Re-evaluate only affected metrics
  const updatedScores = await evaluateMetrics(
    cityName,
    currentData.metrics_data.filter(m =>
      affectedCategories.includes(m.categoryId)
    )
  );

  // Merge with existing scores
  const mergedScores = currentData.metrics_data.map(score => {
    const update = updatedScores.find(u => u.metricId === score.metricId);
    return update || score;
  });

  return mergedScores;
}
```

### 4.3 Background Refresh Job

Create a Vercel cron job to refresh stale caches:

```typescript
// api/cron/refresh-cache.ts
export const config = {
  schedule: '0 3 * * *'  // Run at 3 AM daily
};

export default async function handler(req, res) {
  // Find evaluations older than 60 days but not expired
  const { data: staleEvaluations } = await supabase
    .from('city_evaluations')
    .select('*')
    .lt('evaluated_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
    .gt('expires_at', new Date().toISOString())
    .order('hit_count', { ascending: false })
    .limit(10);  // Refresh top 10 most popular

  for (const eval of staleEvaluations) {
    await deltaUpdate(eval.city_name, new Date(eval.evaluated_at), eval);
  }

  res.json({ refreshed: staleEvaluations.length });
}
```

---

## 5. Phase 3: Pre-Caching

**Timeline:** 1 day
**Priority:** LOW

### 5.1 Pre-Cache Popular Cities

Run initial evaluations for top 50 cities before users request them:

```typescript
const TOP_CITIES = [
  { name: 'Miami', country: 'USA', region: 'FL' },
  { name: 'Austin', country: 'USA', region: 'TX' },
  { name: 'Denver', country: 'USA', region: 'CO' },
  // ... top 50
];

async function preCacheTopCities() {
  for (const city of TOP_CITIES) {
    const exists = await getCachedEvaluation(city.name, city.country, 'claude');

    if (!exists) {
      console.log(`Pre-caching ${city.name}...`);
      const result = await evaluateCity(city.name, 'all', 'claude');
      await cacheEvaluation(city.name, city.country, 'claude', result.scores, result.evidence, []);

      // Rate limit to avoid API costs spike
      await sleep(5000);
    }
  }
}
```

### 5.2 Warm Cache on Deploy

Add to Vercel build:

```json
// vercel.json
{
  "buildCommand": "npm run build && npm run warm-cache"
}
```

---

## 6. Phase 4: Media Caching

**Timeline:** 1-2 days
**Priority:** LOW

### 6.1 Cache Generated Videos

Store video URLs with city evaluations:

```sql
ALTER TABLE city_evaluations
ADD COLUMN freedom_video_url TEXT,
ADD COLUMN imprisonment_video_url TEXT,
ADD COLUMN videos_generated_at TIMESTAMPTZ;
```

### 6.2 Cache Gamma Reports

Store report URLs:

```sql
ALTER TABLE city_evaluations
ADD COLUMN gamma_pdf_url TEXT,
ADD COLUMN gamma_pptx_url TEXT,
ADD COLUMN report_generated_at TIMESTAMPTZ;
```

---

## 7. Database Schema

### Complete Schema

```sql
-- Main city evaluation cache
CREATE TABLE city_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- City identification
  city_name TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,

  -- Evaluation metadata
  evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  llm_provider TEXT NOT NULL,
  evaluation_version TEXT DEFAULT 'v1.0',

  -- Core cached data
  metrics_data JSONB NOT NULL,
  evidence_data JSONB,
  category_scores JSONB,
  tavily_summary TEXT,

  -- Media cache (Phase 4)
  freedom_video_url TEXT,
  imprisonment_video_url TEXT,
  gamma_pdf_url TEXT,
  gamma_pptx_url TEXT,

  -- Analytics
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_by_user_id UUID,

  -- Constraints
  UNIQUE(city_name, country, llm_provider)
);

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_evaluations()
RETURNS void AS $$
BEGIN
  DELETE FROM city_evaluations
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 8. API Changes

### Modified Endpoints

| Endpoint | Change |
|----------|--------|
| POST /api/evaluate | Add cache check/save logic |
| GET /api/cache/status | NEW - Check cache status for cities |
| POST /api/cache/invalidate | NEW - Admin: Invalidate city cache |
| GET /api/cache/stats | NEW - Admin: Cache hit rates |

### New Response Fields

```typescript
// Added to evaluation response
{
  cached: boolean;
  cachedAt: string;
  cacheExpires: string;
  deltaUpdated: boolean;
}
```

---

## 9. Frontend Changes

### Show Cache Status

```tsx
// In comparison results
{result.cached && (
  <div className="cache-indicator">
    <span className="cache-badge">⚡ Cached</span>
    <span className="cache-date">
      Last updated: {formatDate(result.cachedAt)}
    </span>
  </div>
)}
```

### Loading State Updates

```tsx
// Show faster loading for cached results
{isCached ? (
  <LoadingIndicator message="Loading cached results..." fast />
) : (
  <LoadingIndicator message="Evaluating metrics..." />
)}
```

---

## 10. Testing Plan

### Unit Tests

1. Cache read returns correct data
2. Cache write stores correctly
3. Cache expiration works
4. Cache hit increments counter
5. Invalid cache returns null

### Integration Tests

1. Full comparison uses cache on second request
2. Mixed cache (one city cached, one not)
3. Cache invalidation clears data
4. Delta update detects changes

### Performance Tests

1. Cached response < 1 second
2. Cache write doesn't block response
3. 1000 concurrent cache reads

### Manual Testing

1. Compare Miami vs Austin twice
2. Verify second comparison is instant
3. Check cache stats show hit
4. Wait 90+ days, verify expiration

---

## 11. Rollback Plan

### If Caching Causes Issues

1. **Disable cache reads:** Set `CACHE_ENABLED=false` env var
2. **Fallback to API:** Code always falls back if cache fails
3. **Clear cache:** Run `DELETE FROM city_evaluations;`
4. **Revert code:** Deploy previous version

### Monitoring

- Alert if cache hit rate < 20%
- Alert if cache errors > 5%
- Monitor cache table size

---

## Implementation Checklist

### Phase 1 (Day 1-2)
- [ ] Create `city_evaluations` table
- [ ] Create `cityCache.ts` service
- [ ] Modify `/api/evaluate` for cache check
- [ ] Add cache write after evaluation
- [ ] Add cache status to response
- [ ] Test with single city pair

### Phase 2 (Day 3-4)
- [ ] Implement delta update logic
- [ ] Create background refresh cron
- [ ] Test delta detection
- [ ] Monitor refresh job

### Phase 3 (Day 5)
- [ ] Create top cities list
- [ ] Implement pre-cache script
- [ ] Add to build process
- [ ] Verify pre-cached cities

### Phase 4 (Day 6-7)
- [ ] Add media columns to schema
- [ ] Cache video URLs
- [ ] Cache report URLs
- [ ] Test media retrieval

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-28 | AI Assistant | Initial creation |
