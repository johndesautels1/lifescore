/**
 * LIFE SCORE™ Comparison Hook
 * Manages comparison state and API calls
 */

import { useState, useCallback } from 'react';
import type { ComparisonState, CategoryId, ComparisonResult } from '../types/metrics';
import { generateDemoComparison } from '../api/scoring';
import { ALL_METRICS, CATEGORIES } from '../data/metrics';

// ============================================================================
// HOOK CONFIGURATION
// ============================================================================

interface UseComparisonOptions {
  useDemoMode?: boolean; // Use demo data instead of real API
  apiEndpoint?: string;  // Custom API endpoint
}

interface UseComparisonReturn {
  state: ComparisonState;
  compare: (city1: string, city2: string) => Promise<void>;
  reset: () => void;
  loadResult: (result: ComparisonResult) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useComparison(options: UseComparisonOptions = {}): UseComparisonReturn {
  const { useDemoMode = true } = options; // Default to demo mode for now
  
  const [state, setState] = useState<ComparisonState>({
    status: 'idle'
  });

  /**
   * Run comparison between two cities
   */
  const compare = useCallback(async (city1: string, city2: string) => {
    // Start loading
    setState({
      status: 'loading',
      progress: {
        currentCategory: 'personal_freedom',
        metricsProcessed: 0,
        totalMetrics: ALL_METRICS.length
      }
    });

    try {
      if (useDemoMode) {
        // Demo mode: Simulate progress with delays
        await simulateDemoProgress(setState);
        
        // Generate demo comparison
        const result = generateDemoComparison(city1, city2);
        
        setState({
          status: 'success',
          result
        });
      } else {
        // Real API mode (to be implemented)
        // This would call the Claude API with web search
        throw new Error('Real API mode not yet implemented. Please use demo mode.');
      }
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  }, [useDemoMode]);

  /**
   * Reset state to initial
   */
  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  /**
   * Load a saved comparison result directly
   */
  const loadResult = useCallback((result: ComparisonResult) => {
    setState({
      status: 'success',
      result
    });
  }, []);

  return {
    state,
    compare,
    reset,
    loadResult
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Simulate progress for demo mode
 */
async function simulateDemoProgress(
  setState: React.Dispatch<React.SetStateAction<ComparisonState>>
): Promise<void> {
  const categories = CATEGORIES;
  let metricsProcessed = 0;
  
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    const categoryMetricCount = category.metricCount;
    
    // Update to current category
    setState(prev => ({
      ...prev,
      progress: {
        currentCategory: category.id as CategoryId,
        metricsProcessed,
        totalMetrics: ALL_METRICS.length,
        currentMetric: `${category.shortName} metrics...`
      }
    }));
    
    // Simulate processing each metric in category
    for (let j = 0; j < categoryMetricCount; j++) {
      await delay(50 + Math.random() * 100); // 50-150ms per metric
      metricsProcessed++;
      
      setState(prev => ({
        ...prev,
        progress: {
          ...prev.progress!,
          metricsProcessed,
          currentMetric: `Analyzing metric ${j + 1}/${categoryMetricCount}...`
        }
      }));
    }
    
    // Brief pause between categories
    await delay(200);
  }
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default useComparison;
