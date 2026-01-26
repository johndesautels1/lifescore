/**
 * useContrastImages Hook
 *
 * Manages state for AI-generated contrast images that visualize
 * the lived experience differences between cities.
 *
 * Features:
 * - Automatic image generation when metrics are discussed
 * - Client-side caching to avoid regeneration
 * - Loading states with proper UX
 * - Error handling with graceful degradation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  generateContrastImages,
  buildContrastRequest,
  detectVisualizationTriggers,
  getMetricTemplate,
  type ContrastImageResult,
  type ContrastRequest,
} from '../services/contrastImageService';

export type ContrastImageStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface ContrastImageState {
  status: ContrastImageStatus;
  images: ContrastImageResult | null;
  error: string | null;
  currentTopic: string | null;
  currentMetricId: string | null;
}

export interface UseContrastImagesOptions {
  cityA?: { name: string; score?: number };
  cityB?: { name: string; score?: number };
  autoDetect?: boolean; // Auto-detect triggers from messages
}

export interface UseContrastImagesReturn {
  // State
  status: ContrastImageStatus;
  images: ContrastImageResult | null;
  error: string | null;
  currentTopic: string | null;
  isLoading: boolean;

  // Actions
  generateImages: (metricId: string, customRequest?: Partial<ContrastRequest>) => Promise<void>;
  detectAndGenerate: (message: string) => Promise<string[]>;
  clearImages: () => void;
  preloadMetric: (metricId: string) => void;
}

// Client-side cache for generated images
const imageCache = new Map<string, ContrastImageResult>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes client-side cache
const cacheTimestamps = new Map<string, number>();

function getCacheKey(metricId: string, cityA: string, cityB: string): string {
  return `${metricId}_${cityA.toLowerCase()}_${cityB.toLowerCase()}`;
}

function getFromCache(key: string): ContrastImageResult | null {
  const timestamp = cacheTimestamps.get(key);
  if (!timestamp || Date.now() - timestamp > CACHE_TTL) {
    imageCache.delete(key);
    cacheTimestamps.delete(key);
    return null;
  }
  return imageCache.get(key) || null;
}

function saveToCache(key: string, result: ContrastImageResult): void {
  imageCache.set(key, result);
  cacheTimestamps.set(key, Date.now());
}

export function useContrastImages(
  options: UseContrastImagesOptions = {}
): UseContrastImagesReturn {
  const { cityA, cityB, autoDetect = true } = options;

  const [state, setState] = useState<ContrastImageState>({
    status: 'idle',
    images: null,
    error: null,
    currentTopic: null,
    currentMetricId: null,
  });

  // Track pending requests to avoid duplicates
  const pendingRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Generate images for a specific metric
  const generateImages = useCallback(
    async (metricId: string, customRequest?: Partial<ContrastRequest>) => {
      // Need both cities to generate contrast
      if (!cityA?.name || !cityB?.name) {
        console.warn('[useContrastImages] Cannot generate: missing city data');
        return;
      }

      // Avoid duplicate requests
      if (pendingRef.current === metricId) {
        return;
      }

      // Check client cache first
      const cacheKey = getCacheKey(metricId, cityA.name, cityB.name);
      const cached = getFromCache(cacheKey);

      if (cached) {
        console.log(`[useContrastImages] Client cache hit for ${metricId}`);
        const template = getMetricTemplate(metricId);
        setState({
          status: 'ready',
          images: cached,
          error: null,
          currentTopic: template?.topic || metricId,
          currentMetricId: metricId,
        });
        return;
      }

      pendingRef.current = metricId;

      // Build the request
      const request = customRequest
        ? {
            topic: customRequest.topic || metricId,
            metricId,
            cityA: customRequest.cityA || {
              name: cityA.name,
              score: cityA.score || 50,
              context: '',
            },
            cityB: customRequest.cityB || {
              name: cityB.name,
              score: cityB.score || 50,
              context: '',
            },
          }
        : buildContrastRequest(
            metricId,
            { name: cityA.name, score: cityA.score || 50 },
            { name: cityB.name, score: cityB.score || 50 }
          );

      if (!request) {
        console.warn(`[useContrastImages] No template found for ${metricId}`);
        pendingRef.current = null;
        return;
      }

      // Update state to loading
      setState(prev => ({
        ...prev,
        status: 'loading',
        error: null,
        currentTopic: request.topic,
        currentMetricId: metricId,
      }));

      try {
        console.log(`[useContrastImages] Generating images for ${request.topic}`);
        const result = await generateContrastImages(request);

        if (!mountedRef.current) return;

        // Save to client cache
        saveToCache(cacheKey, result);

        setState({
          status: 'ready',
          images: result,
          error: null,
          currentTopic: request.topic,
          currentMetricId: metricId,
        });
      } catch (err) {
        console.error('[useContrastImages] Generation failed:', err);

        if (!mountedRef.current) return;

        setState(prev => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to generate images',
        }));
      } finally {
        pendingRef.current = null;
      }
    },
    [cityA, cityB]
  );

  // Detect triggers in a message and generate first match
  const detectAndGenerate = useCallback(
    async (message: string): Promise<string[]> => {
      if (!autoDetect || !cityA?.name || !cityB?.name) {
        return [];
      }

      const triggers = detectVisualizationTriggers(message);

      if (triggers.length > 0) {
        // Generate images for the first trigger
        await generateImages(triggers[0]);
      }

      return triggers;
    },
    [autoDetect, cityA, cityB, generateImages]
  );

  // Clear current images
  const clearImages = useCallback(() => {
    setState({
      status: 'idle',
      images: null,
      error: null,
      currentTopic: null,
      currentMetricId: null,
    });
  }, []);

  // Preload a metric (start generation in background)
  const preloadMetric = useCallback(
    (metricId: string) => {
      if (!cityA?.name || !cityB?.name) return;

      const cacheKey = getCacheKey(metricId, cityA.name, cityB.name);
      if (getFromCache(cacheKey)) return; // Already cached

      // Generate in background without updating visible state
      const request = buildContrastRequest(
        metricId,
        { name: cityA.name, score: cityA.score || 50 },
        { name: cityB.name, score: cityB.score || 50 }
      );

      if (request) {
        generateContrastImages(request)
          .then(result => {
            saveToCache(cacheKey, result);
            console.log(`[useContrastImages] Preloaded ${metricId}`);
          })
          .catch(err => {
            console.warn(`[useContrastImages] Preload failed for ${metricId}:`, err);
          });
      }
    },
    [cityA, cityB]
  );

  return {
    status: state.status,
    images: state.images,
    error: state.error,
    currentTopic: state.currentTopic,
    isLoading: state.status === 'loading',
    generateImages,
    detectAndGenerate,
    clearImages,
    preloadMetric,
  };
}

// Export cache utilities for testing/debugging
export const contrastImageCache = {
  get: getFromCache,
  set: saveToCache,
  clear: () => {
    imageCache.clear();
    cacheTimestamps.clear();
  },
  size: () => imageCache.size,
};
