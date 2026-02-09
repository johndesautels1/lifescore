/**
 * LIFE SCORE™ Caching Service
 * Aggressive caching to reduce API costs (~$22/comparison)
 *
 * Cache Strategy:
 * - Per-metric scores: 30-day TTL
 * - Full comparison results: 7-day TTL
 * - Per-LLM raw responses: 30-day TTL
 *
 * Storage:
 * - Production: Vercel KV (Redis)
 * - Development: localStorage fallback
 */

import type { LLMProvider, EnhancedComparisonResult, MetricConsensus } from '../types/enhancedComparison';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  // TTL in milliseconds
  METRIC_TTL: 30 * 24 * 60 * 60 * 1000,      // 30 days
  COMPARISON_TTL: 7 * 24 * 60 * 60 * 1000,   // 7 days
  LLM_RESPONSE_TTL: 30 * 24 * 60 * 60 * 1000, // 30 days

  // Cache key prefixes
  PREFIX: 'lifescore',
  VERSION: 'v1',

  // Timeout for KV operations (10 seconds)
  KV_TIMEOUT_MS: 10000
};

// ============================================================================
// TYPES
// ============================================================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

export interface MetricCacheKey {
  city: string;
  metricId: string;
  llmProvider?: LLMProvider;
}

export interface ComparisonCacheKey {
  city1: string;
  city2: string;
  llmsUsed: LLMProvider[];
}

// Phase 4: Extended cache entry that tracks original city order
// This fixes the bug where "Austin vs Denver" and "Denver vs Austin"
// would return the same cached result with wrong city order
interface ComparisonCacheEntry {
  data: EnhancedComparisonResult;
  originalCity1: string;  // City as city1 when cached
  originalCity2: string;  // City as city2 when cached
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

function normalizeCity(city: string): string {
  return city.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
}

function generateMetricKey(key: MetricCacheKey): string {
  const city = normalizeCity(key.city);
  const metric = key.metricId.toLowerCase();
  const llm = key.llmProvider || 'consensus';
  return `${CACHE_CONFIG.PREFIX}:${CACHE_CONFIG.VERSION}:metric:${city}:${metric}:${llm}`;
}

function generateComparisonKey(key: ComparisonCacheKey): string {
  const city1 = normalizeCity(key.city1);
  const city2 = normalizeCity(key.city2);
  // Sort cities for consistent key regardless of order
  const [a, b] = [city1, city2].sort();
  const llmsHash = key.llmsUsed.sort().join('_');
  return `${CACHE_CONFIG.PREFIX}:${CACHE_CONFIG.VERSION}:comparison:${a}:${b}:${llmsHash}`;
}

function generateLLMResponseKey(city1: string, city2: string, provider: LLMProvider): string {
  const c1 = normalizeCity(city1);
  const c2 = normalizeCity(city2);
  const [a, b] = [c1, c2].sort();
  return `${CACHE_CONFIG.PREFIX}:${CACHE_CONFIG.VERSION}:llm:${a}:${b}:${provider}`;
}

// ============================================================================
// STORAGE ABSTRACTION
// ============================================================================

interface CacheStorage {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

// LocalStorage implementation (development/fallback)
class LocalStorageCache implements CacheStorage {
  // FIX: Guard flag to prevent recursive clearExpired() calls
  // Concurrent set() calls could both trigger clearExpired() simultaneously,
  // iterating keys while another call modifies localStorage
  private isClearing = false;

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entry = JSON.parse(stored) as CacheEntry<T>;

      // Check if expired
      if (Date.now() > entry.timestamp + entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      // Check version compatibility
      if (entry.version !== CACHE_CONFIG.VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      return entry;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // localStorage might be full - clear old entries
      // FIX: Check guard flag to prevent recursive clearExpired() calls
      if (!this.isClearing) {
        console.warn('Cache storage full, clearing old entries');
        await this.clearExpired();
      }
      try {
        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // Still full - give up silently
      }
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    keys.forEach(key => localStorage.removeItem(key));
  }

  async keys(): Promise<string[]> {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_CONFIG.PREFIX)) {
        allKeys.push(key);
      }
    }
    return allKeys;
  }

  async clearExpired(): Promise<number> {
    // FIX: Guard against recursive calls from concurrent set() operations
    if (this.isClearing) return 0;
    this.isClearing = true;

    try {
      const keys = await this.keys();
      let cleared = 0;

      for (const key of keys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry = JSON.parse(stored) as CacheEntry<unknown>;
            if (Date.now() > entry.timestamp + entry.ttl) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch {
          localStorage.removeItem(key);
          cleared++;
        }
      }

      return cleared;
    } finally {
      this.isClearing = false;
    }
  }
}

// Vercel KV implementation (production)
class VercelKVCache implements CacheStorage {
  private baseUrl: string;
  private token: string;

  constructor() {
    // These would be set via environment variables in production
    this.baseUrl = import.meta.env.VITE_KV_REST_API_URL || '';
    this.token = import.meta.env.VITE_KV_REST_API_TOKEN || '';
  }

  private get isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await fetchWithTimeout(
        `${this.baseUrl}/get/${key}`,
        { headers: { Authorization: `Bearer ${this.token}` } },
        CACHE_CONFIG.KV_TIMEOUT_MS
      );

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.result) return null;

      const entry = JSON.parse(data.result) as CacheEntry<T>;

      // Check version
      if (entry.version !== CACHE_CONFIG.VERSION) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.isConfigured) return;

    try {
      const ttlSeconds = Math.ceil(entry.ttl / 1000);
      await fetchWithTimeout(
        `${this.baseUrl}/set/${key}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: JSON.stringify(entry),
            ex: ttlSeconds // TTL in seconds for Redis
          })
        },
        CACHE_CONFIG.KV_TIMEOUT_MS
      );
    } catch (error) {
      console.warn('Failed to write to Vercel KV:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.isConfigured) return;

    try {
      await fetchWithTimeout(
        `${this.baseUrl}/del/${key}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.token}` }
        },
        CACHE_CONFIG.KV_TIMEOUT_MS
      );
    } catch {
      // Ignore deletion errors
    }
  }

  async clear(): Promise<void> {
    // Not implemented for KV - would need SCAN + DEL
    console.warn('Clear not implemented for Vercel KV');
  }

  async keys(): Promise<string[]> {
    // Not implemented for KV - would need SCAN
    return [];
  }
}

// ============================================================================
// CACHE MANAGER
// ============================================================================

class CacheManager {
  private primary: CacheStorage;
  private fallback: CacheStorage;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };

  constructor() {
    this.primary = new VercelKVCache();
    this.fallback = new LocalStorageCache();
  }

  private async getStorage(): Promise<CacheStorage> {
    // In browser, always use localStorage
    // In production with KV configured, use KV
    if (typeof window !== 'undefined') {
      return this.fallback;
    }
    return this.primary;
  }

  // ----- METRIC CACHING -----

  async getMetricScore(key: MetricCacheKey): Promise<MetricConsensus | null> {
    const storage = await this.getStorage();
    const cacheKey = generateMetricKey(key);
    const entry = await storage.get<MetricConsensus>(cacheKey);

    if (entry) {
      this.stats.hits++;
      return entry.data;
    }

    this.stats.misses++;
    return null;
  }

  async setMetricScore(key: MetricCacheKey, score: MetricConsensus): Promise<void> {
    const storage = await this.getStorage();
    const cacheKey = generateMetricKey(key);

    await storage.set(cacheKey, {
      data: score,
      timestamp: Date.now(),
      ttl: CACHE_CONFIG.METRIC_TTL,
      version: CACHE_CONFIG.VERSION
    });
  }

  // ----- COMPARISON CACHING -----

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
  /**
   * Phase 4: Swap city1 and city2 data in a comparison result
   * Used when cache hit is for reversed city order
   *
   * FIX: Now recursively swaps ALL nested city references including:
   * - LLMMetricScore.city ('city1' <-> 'city2')
   * - EvidenceItem.city (actual city name strings)
   * - scoreDifference (negated)
   */
  private swapCityOrder(result: EnhancedComparisonResult): EnhancedComparisonResult {
    // Swap winner value
    const swapWinner = (w: 'city1' | 'city2' | 'tie'): 'city1' | 'city2' | 'tie' => {
      if (w === 'city1') return 'city2';
      if (w === 'city2') return 'city1';
      return 'tie';
    };

    // Original city names for evidence swapping
    const originalCity1Name = result.city1.city;
    const originalCity2Name = result.city2.city;

    // Swap categoryWinners values
    const swappedCategoryWinners: Record<string, 'city1' | 'city2' | 'tie'> = {};
    for (const [key, value] of Object.entries(result.categoryWinners)) {
      swappedCategoryWinners[key] = swapWinner(value);
    }

    // Deep-swap city references in categories and their nested metrics
    const swapCategories = (categories: EnhancedComparisonResult['city1']['categories']) => {
      return categories.map(cat => ({
        ...cat,
        metrics: cat.metrics.map(metric => ({
          ...metric,
          llmScores: metric.llmScores.map(score => ({
            ...score,
            // Swap 'city1' <-> 'city2' position markers
            city: score.city === 'city1' ? 'city2' as const
              : score.city === 'city2' ? 'city1' as const
              : score.city,
            // Swap actual city names in evidence items
            evidence: score.evidence?.map(ev => ({
              ...ev,
              city: ev.city === originalCity1Name ? originalCity2Name
                : ev.city === originalCity2Name ? originalCity1Name
                : ev.city
            }))
          }))
        }))
      }));
    };

    // Swap the city objects and fix all nested references
    const swappedCity1 = {
      ...result.city2,
      categories: swapCategories(result.city2.categories)
    };
    const swappedCity2 = {
      ...result.city1,
      categories: swapCategories(result.city1.categories)
    };

    return {
      ...result,
      city1: swappedCity1,
      city2: swappedCity2,
      winner: swapWinner(result.winner),
      scoreDifference: -result.scoreDifference,
      categoryWinners: swappedCategoryWinners as typeof result.categoryWinners
    };
  }




  // ----- LLM RESPONSE CACHING -----

  async getLLMResponse<T>(city1: string, city2: string, provider: LLMProvider): Promise<T | null> {
    const storage = await this.getStorage();
    const cacheKey = generateLLMResponseKey(city1, city2, provider);
    const entry = await storage.get<T>(cacheKey);

    if (entry) {
      this.stats.hits++;
      console.log(`[CACHE HIT] LLM Response: ${provider} for ${city1} vs ${city2}`);
      return entry.data;
    }

    this.stats.misses++;
    return null;
  }

  async setLLMResponse<T>(city1: string, city2: string, provider: LLMProvider, response: T): Promise<void> {
    const storage = await this.getStorage();
    const cacheKey = generateLLMResponseKey(city1, city2, provider);

    await storage.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      ttl: CACHE_CONFIG.LLM_RESPONSE_TTL,
      version: CACHE_CONFIG.VERSION
    });

    console.log(`[CACHE SET] LLM Response: ${provider} for ${city1} vs ${city2}`);
  }

  // ----- UTILITIES -----

  getStats(): CacheStats {
    return { ...this.stats };
  }

  async clearAll(): Promise<void> {
    const storage = await this.getStorage();
    await storage.clear();
    this.stats = { hits: 0, misses: 0, size: 0 };
  }

  async clearExpired(): Promise<number> {
    const storage = this.fallback as LocalStorageCache;
    if (storage.clearExpired) {
      return storage.clearExpired();
    }
    return 0;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const cache = new CacheManager();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a cached comparison exists
 */
export async function hasCachedComparison(city1: string, city2: string, llmsUsed: LLMProvider[]): Promise<boolean> {
  const result = await cache.getComparison({ city1, city2, llmsUsed });
  return result !== null;
}

/**
 * Get cache age in human-readable format
 */
export function getCacheAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ageMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  return 'Just now';
}

/**
 * Calculate estimated cost savings from cache
 */
export function calculateCostSavings(hits: number): { saved: number; formatted: string } {
  const costPerComparison = 22; // $22 per comparison
  const saved = hits * costPerComparison;
  return {
    saved,
    formatted: `$${saved.toFixed(2)}`
  };
}
