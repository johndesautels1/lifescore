# City-Centric Data Architecture Proposal

**Date:** January 26, 2026
**Status:** PROPOSED - For Future Discussion
**Priority:** HIGH - Required for scaling

---

## The Problem

### Issue 1: Slow Searches (10-15 minutes)
Enhanced comparisons with 5 LLMs take 10-15 minutes. Users get frustrated and abandon the app.

### Issue 2: localStorage Doesn't Scale
Current architecture stores comparisons in browser localStorage. This:
- Doesn't persist across devices
- Limited to ~5MB
- Lost when user clears browser
- No sharing between users

### Issue 3: Redundant Work
Every comparison re-evaluates cities from scratch:
```
User A: "New York vs London" → 15 min LLM work → stored as comparison blob
User B: "New York vs London" → 15 min LLM work AGAIN
User C: "New York vs Austin" → 15 min for BOTH (even though NY already done)
```

---

## The Solution: City-Centric Storage

**Key Insight:** Store city data independently, not as comparison pairs.

### New Flow
```
User A: "New York vs London" → 15 min → Store NY + London SEPARATELY
User B: "New York vs London" → INSTANT (both cached)
User C: "New York vs Austin" → 7 min Austin only (NY cached)
User D: "London vs Austin"  → INSTANT (both cached)
```

---

## Proposed Database Schema

### New Table: `cities`
```sql
CREATE TABLE cities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name           TEXT NOT NULL,           -- Normalized: "new york"
  city_name_display   TEXT NOT NULL,           -- Display: "New York"
  country             TEXT NOT NULL,
  region              TEXT,                     -- State/Province

  -- All 100 metrics stored as JSONB
  metrics_data        JSONB NOT NULL,          -- Full CityScore object

  -- Freshness tracking
  last_evaluated_at   TIMESTAMPTZ NOT NULL,    -- When LLMs last evaluated
  last_crawl_at       TIMESTAMPTZ,             -- When web crawl last ran
  data_version        INT DEFAULT 1,           -- Schema version

  -- Metadata
  evaluation_source   TEXT,                    -- 'enhanced_5llm', 'standard', etc.
  llms_used           TEXT[],                  -- ['claude-sonnet', 'gpt-4o', ...]
  confidence_score    DECIMAL(5,2),            -- Overall data confidence

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(city_name, country)
);

-- Index for fast lookups
CREATE INDEX idx_cities_lookup ON cities(city_name, country);
CREATE INDEX idx_cities_freshness ON cities(last_evaluated_at);
```

### Simplified: `comparisons` table
```sql
CREATE TABLE comparisons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id),  -- Optional

  -- References to cached city data
  city1_id            UUID REFERENCES cities(id) NOT NULL,
  city2_id            UUID REFERENCES cities(id) NOT NULL,

  -- Comparison results (computed from city data)
  winner              TEXT CHECK (winner IN ('city1', 'city2', 'tie')),
  score_difference    DECIMAL(5,2),
  category_winners    JSONB,                   -- Per-category winners

  -- User preferences used for this comparison
  user_preferences    JSONB,                   -- law_lived_ratio, weights, etc.

  created_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(city1_id, city2_id, user_id)
);
```

---

## Data Freshness Strategy

### Freshness Tiers
| Age | Status | Action |
|-----|--------|--------|
| < 7 days | Fresh | Use immediately |
| 7-30 days | Stale | Use, but trigger background refresh |
| > 30 days | Expired | Must refresh before comparison |

### Quick Web Crawl (Seconds, not minutes)
For "stale" data, run a quick web crawl to check for:
- Recent regulatory changes
- News about law changes
- Policy updates

If no significant changes detected → use cached data
If changes detected → update only affected metrics

---

## Service Layer Changes

### New Service: `cityDataService.ts`
```typescript
interface CityDataService {
  // Get city from cache or evaluate
  getCityData(city: string, country: string): Promise<CityScore>;

  // Check if city data exists and is fresh
  isCityFresh(city: string, country: string): Promise<boolean>;

  // Force refresh city data
  refreshCityData(city: string, country: string): Promise<CityScore>;

  // Quick web crawl for updates
  checkForUpdates(city: string, country: string): Promise<UpdateCheckResult>;

  // Background refresh job
  refreshStaleCities(): Promise<void>;
}
```

### Modified Comparison Flow
```typescript
async function runComparison(city1: string, city2: string): Promise<ComparisonResult> {
  // 1. Check cache for both cities (parallel)
  const [city1Data, city2Data] = await Promise.all([
    cityDataService.getCityData(city1, country1),
    cityDataService.getCityData(city2, country2),
  ]);

  // 2. If either missing/expired, evaluate only that city
  // This is where the 10-15 min happens - but only for NEW cities

  // 3. Compute comparison from cached city data (instant)
  const result = computeComparison(city1Data, city2Data, userPreferences);

  // 4. Store comparison reference (not full data)
  await saveComparisonReference(city1Data.id, city2Data.id, result);

  return result;
}
```

---

## Migration Strategy

### Phase 1: Add cities table (no breaking changes)
1. Create `cities` table in Supabase
2. Add `cityDataService.ts`
3. On each comparison, save city data to new table
4. Existing flow continues to work

### Phase 2: Read from cache
1. Before LLM evaluation, check `cities` table
2. If fresh data exists, skip LLM calls
3. Massive time savings for repeat cities

### Phase 3: Background refresh
1. Cron job to refresh stale cities
2. Web crawl integration for update detection
3. Remove localStorage dependency

### Phase 4: Optimize comparisons table
1. Migrate to reference-based storage
2. Clean up old blob-based records
3. Full city-centric architecture

---

## Expected Impact

### Performance
| Scenario | Current | With Caching |
|----------|---------|--------------|
| New city pair | 10-15 min | 10-15 min |
| Repeat city pair | 10-15 min | **< 5 sec** |
| One new, one cached | 10-15 min | **5-7 min** |
| Popular cities | 10-15 min | **< 5 sec** |

### Storage
- ~50KB per city (100 metrics as JSON)
- 10,000 cities = ~500MB database storage
- Covers most global cities users would search

### Cost Savings
- Each LLM evaluation costs ~$2-5 in API calls
- Caching eliminates 80%+ of redundant evaluations
- ROI: Massive at scale

---

## Open Questions

1. **Freshness threshold** - 7 days? 30 days? Configurable per metric?
2. **Web crawl implementation** - Which service? Cost?
3. **Background jobs** - Vercel cron? Separate worker?
4. **Cache invalidation** - How to handle major regulatory changes?
5. **User-specific preferences** - How to handle different law/lived ratios?

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/cityDataService.ts` | NEW - City caching logic |
| `src/hooks/useComparison.ts` | Check cache before LLM calls |
| `src/services/databaseService.ts` | Add city CRUD operations |
| `src/types/database.ts` | Add City types |
| `supabase/migrations/` | New cities table |

---

## Next Steps

1. Review and approve this architecture
2. Create Supabase migration for `cities` table
3. Implement `cityDataService.ts`
4. Modify `useComparison.ts` to check cache first
5. Test with popular city pairs
6. Monitor cache hit rates

---

*This document is for planning purposes. Implementation requires team discussion and approval.*
