/**
 * useGunComparison Hook
 *
 * Fetches and caches the standalone gun rights comparison
 * between two cities. Completely isolated from the 100-metric system.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface GunLawCategory {
  label: string;
  cityA: string;
  cityB: string;
}

export interface GunComparisonData {
  cityA: string;
  cityB: string;
  categories: GunLawCategory[];
  summary: string;
  disclaimer: string;
}

export type GunComparisonStatus = 'idle' | 'loading' | 'ready' | 'error';

// Bounded in-memory cache with LRU eviction
const MAX_CACHE_SIZE = 50;
const cache = new Map<string, GunComparisonData>();

function cacheSet(key: string, value: GunComparisonData): void {
  if (cache.size >= MAX_CACHE_SIZE && !cache.has(key)) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.delete(key);
  cache.set(key, value);
}

function getCacheKey(cityA: string, cityB: string): string {
  return `gun_${cityA.toLowerCase()}_${cityB.toLowerCase()}`;
}

export function useGunComparison() {
  const [status, setStatus] = useState<GunComparisonStatus>('idle');
  const [data, setData] = useState<GunComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchComparison = useCallback(async (cityA: string, cityB: string): Promise<GunComparisonData | null> => {
    // Check cache first
    const key = getCacheKey(cityA, cityB);
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setStatus('ready');
      setError(null);
      return cached;
    }

    // Abort any pending request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/olivia/gun-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityA, cityB }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const result: GunComparisonData = await response.json();
      cacheSet(key, result);
      setData(result);
      setStatus('ready');
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return null;
      const message = err instanceof Error ? err.message : 'Failed to fetch gun comparison';
      setError(message);
      setStatus('error');
      return null;
    }
  }, []);

  // Abort in-flight requests on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setData(null);
    setError(null);
  }, []);

  return {
    status,
    data,
    error,
    isLoading: status === 'loading',
    fetchComparison,
    reset,
  };
}
