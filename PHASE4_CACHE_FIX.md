# Phase 4: Cache City Order Bug Fix

## Problem
In `src/services/cache.ts`, the cache key sorts cities alphabetically (lines 94-101):
```typescript
const [a, b] = [city1, city2].sort();
return `...comparison:${a}:${b}:${llmsHash}`;
```

This means "Austin vs Denver" and "Denver vs Austin" use the SAME cache key.
But the cached result has city1/city2 in their original order.

Result: If "Austin vs Denver" is cached first, then "Denver vs Austin" returns
the same cached result where city1=Austin, city2=Denver - **WRONG ORDER**.

## Fix

### Step 1: Add ComparisonCacheEntry interface (after line 71)

```typescript
// Phase 4: Extended cache entry that tracks original city order
// This fixes the bug where "Austin vs Denver" and "Denver vs Austin"
// would return the same cached result with wrong city order
interface ComparisonCacheEntry {
  data: EnhancedComparisonResult;
  originalCity1: string;  // City as city1 when cached
  originalCity2: string;  // City as city2 when cached
}
```

### Step 2: Update getComparison() method (around line 358)

Change from:
```typescript
async getComparison(key: ComparisonCacheKey): Promise<EnhancedComparisonResult | null> {
  const storage = await this.getStorage();
  const cacheKey = generateComparisonKey(key);
  const entry = await storage.get<EnhancedComparisonResult>(cacheKey);

  if (entry) {
    this.stats.hits++;
    console.log(`[CACHE HIT] Comparison: ${key.city1} vs ${key.city2}`);
    return entry.data;
  }
  // ...
}
```

To:
```typescript
async getComparison(key: ComparisonCacheKey): Promise<EnhancedComparisonResult | null> {
  const storage = await this.getStorage();
  const cacheKey = generateComparisonKey(key);
  const entry = await storage.get<ComparisonCacheEntry>(cacheKey);

  if (entry) {
    this.stats.hits++;
    console.log(`[CACHE HIT] Comparison: ${key.city1} vs ${key.city2}`);

    // Phase 4: Check if city order matches, swap if needed
    const cached = entry.data;
    const needsSwap = cached.originalCity1 !== key.city1;

    if (needsSwap) {
      console.log(`[CACHE] Swapping cities: cached was ${cached.originalCity1} vs ${cached.originalCity2}`);
      return this.swapCityOrder(cached.data);
    }

    return cached.data;
  }

  this.stats.misses++;
  console.log(`[CACHE MISS] Comparison: ${key.city1} vs ${key.city2}`);
  return null;
}
```

### Step 3: Update setComparison() method (around line 374)

Change from:
```typescript
async setComparison(key: ComparisonCacheKey, result: EnhancedComparisonResult): Promise<void> {
  const storage = await this.getStorage();
  const cacheKey = generateComparisonKey(key);

  await storage.set(cacheKey, {
    data: result,
    timestamp: Date.now(),
    ttl: CACHE_CONFIG.COMPARISON_TTL,
    version: CACHE_CONFIG.VERSION
  });
  // ...
}
```

To:
```typescript
async setComparison(key: ComparisonCacheKey, result: EnhancedComparisonResult): Promise<void> {
  const storage = await this.getStorage();
  const cacheKey = generateComparisonKey(key);

  // Phase 4: Store original city order with the result
  const cacheEntry: ComparisonCacheEntry = {
    data: result,
    originalCity1: key.city1,
    originalCity2: key.city2
  };

  await storage.set(cacheKey, {
    data: cacheEntry,
    timestamp: Date.now(),
    ttl: CACHE_CONFIG.COMPARISON_TTL,
    version: CACHE_CONFIG.VERSION
  });

  console.log(`[CACHE SET] Comparison: ${key.city1} vs ${key.city2}`);
}
```

### Step 4: Add swapCityOrder() helper method to CacheManager class

```typescript
/**
 * Phase 4: Swap city1 and city2 data in a comparison result
 * Used when cache hit is for reversed city order
 */
private swapCityOrder(result: EnhancedComparisonResult): EnhancedComparisonResult {
  return {
    ...result,
    city1: result.city2,
    city2: result.city1,
    city1Score: result.city2Score,
    city2Score: result.city1Score,
    categories: result.categories.map(cat => ({
      ...cat,
      city1Score: cat.city2Score,
      city2Score: cat.city1Score,
      metrics: cat.metrics?.map(m => ({
        ...m,
        city1Score: m.city2Score,
        city2Score: m.city1Score,
        city1Evidence: m.city2Evidence,
        city2Evidence: m.city1Evidence
      }))
    }))
  };
}
```

## Testing

1. Run comparison: Austin vs Denver
2. Verify cache SET logged
3. Run comparison: Denver vs Austin
4. Verify cache HIT logged with "Swapping cities" message
5. Verify city1=Denver, city2=Austin in the result
