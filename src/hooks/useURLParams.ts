/**
 * LIFE SCORE™ URL Parameters Hook
 * Enables instant sharing via URL state
 */

import { useCallback } from 'react';

export interface URLParamsState {
  cityA?: string;
  cityB?: string;
  enhanced?: boolean;
}

/**
 * Parse URL parameters into state object
 */
export const parseURLParams = (): URLParamsState => {
  const params = new URLSearchParams(window.location.search);
  return {
    cityA: params.get('cityA') || undefined,
    cityB: params.get('cityB') || undefined,
    enhanced: params.get('enhanced') === 'true',
  };
};

/**
 * Build URL with current state
 */
export const buildShareURL = (params: URLParamsState): string => {
  const url = new URL(window.location.origin + window.location.pathname);

  if (params.cityA) url.searchParams.set('cityA', params.cityA);
  if (params.cityB) url.searchParams.set('cityB', params.cityB);
  if (params.enhanced) url.searchParams.set('enhanced', 'true');

  return url.toString();
};

/**
 * Update browser URL without reload
 */
export const updateURL = (params: URLParamsState): void => {
  const url = buildShareURL(params);
  window.history.replaceState({}, '', url);
};

/**
 * Hook for managing URL parameter state
 */
export const useURLParams = () => {
  // Get initial params from URL
  const getParams = useCallback((): URLParamsState => {
    return parseURLParams();
  }, []);

  // Set params to URL
  const setParams = useCallback((params: URLParamsState): void => {
    updateURL(params);
  }, []);

  // Copy share URL to clipboard
  const copyShareURL = useCallback(async (params: URLParamsState): Promise<boolean> => {
    const url = buildShareURL(params);
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    getParams,
    setParams,
    copyShareURL,
    buildShareURL,
  };
};

export default useURLParams;
