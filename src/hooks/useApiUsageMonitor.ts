/**
 * LIFE SCORE - API Usage Monitor Hook
 * Tracks API usage across providers and surfaces warnings
 *
 * Created: 2026-01-30
 */

import { useState, useEffect, useCallback } from 'react';
import {
  API_PROVIDER_QUOTAS,
  USAGE_STORAGE_KEY,
  USAGE_STORAGE_VERSION,
  getUsageStatus,
  getWarningLevel,
  type ProviderUsage,
  type UsageWarning,
  type UsageSnapshot,
  type StoredUsageData,
  type ElevenLabsUsageResponse,
} from '../types/apiUsage';

// ============================================================================
// HOOK
// ============================================================================

export interface UseApiUsageMonitorReturn {
  // Current state
  snapshot: UsageSnapshot | null;
  warnings: UsageWarning[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshUsage: () => Promise<void>;
  recordUsage: (provider: string, units: number, context?: string) => void;
  clearMonthlyUsage: () => void;
  dismissWarning: (provider: string) => void;

  // Helpers
  getProviderUsage: (provider: string) => ProviderUsage | null;
  hasActiveWarnings: boolean;
  criticalWarnings: UsageWarning[];
}

export function useApiUsageMonitor(): UseApiUsageMonitorReturn {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [warnings, setWarnings] = useState<UsageWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  // Get current month key
  const getMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Load stored usage data
  const loadStoredUsage = useCallback((): StoredUsageData => {
    try {
      const stored = localStorage.getItem(USAGE_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as StoredUsageData;
        if (data.version === USAGE_STORAGE_VERSION) {
          return data;
        }
      }
    } catch (e) {
      console.warn('[useApiUsageMonitor] Failed to load stored usage:', e);
    }

    // Return default
    return {
      version: USAGE_STORAGE_VERSION,
      lastSync: 0,
      monthlyUsage: {},
      recentCalls: [],
    };
  }, []);

  // Save usage data
  const saveStoredUsage = useCallback((data: StoredUsageData) => {
    try {
      localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[useApiUsageMonitor] Failed to save usage:', e);
    }
  }, []);

  // Fetch ElevenLabs usage from API
  const fetchElevenLabsUsage = useCallback(async (): Promise<number | null> => {
    try {
      const response = await fetch('/api/usage/elevenlabs');
      if (!response.ok) {
        console.warn('[useApiUsageMonitor] ElevenLabs usage API not available');
        return null;
      }
      const data = await response.json() as ElevenLabsUsageResponse;
      return data.character_count;
    } catch (e) {
      console.warn('[useApiUsageMonitor] Failed to fetch ElevenLabs usage:', e);
      return null;
    }
  }, []);

  // Build snapshot from stored data
  const buildSnapshot = useCallback((stored: StoredUsageData, elevenLabsActual?: number): UsageSnapshot => {
    const monthKey = getMonthKey();
    const monthData = stored.monthlyUsage[monthKey]?.providers || {};
    const now = Date.now();

    const providers: Record<string, ProviderUsage> = {};
    const newWarnings: UsageWarning[] = [];

    for (const [providerKey, config] of Object.entries(API_PROVIDER_QUOTAS)) {
      let used = monthData[providerKey] || 0;

      // Use actual ElevenLabs data if available
      if (providerKey === 'elevenlabs' && elevenLabsActual !== undefined && elevenLabsActual !== null) {
        used = elevenLabsActual;
      }

      const percentage = used / config.monthlyQuota;
      const status = getUsageStatus(percentage);

      // Calculate estimated days remaining
      const currentDay = new Date().getDate();
      const dailyRate = currentDay > 0 ? used / currentDay : 0;
      const estimatedDaysRemaining = dailyRate > 0
        ? Math.floor((config.monthlyQuota - used) / dailyRate)
        : null;

      providers[providerKey] = {
        provider: providerKey,
        used,
        quota: config.monthlyQuota,
        percentage,
        status,
        lastUpdated: now,
        estimatedDaysRemaining,
      };

      // Generate warning if needed and not dismissed
      if (status !== 'ok' && !dismissedWarnings.has(providerKey)) {
        const level = getWarningLevel(status);
        let message: string;

        switch (level) {
          case 'exceeded':
            message = `${config.displayName} quota exceeded! Using fallback.`;
            break;
          case 'critical':
            message = `${config.displayName} at ${Math.round(percentage * 100)}% - will exceed soon!`;
            break;
          case 'warning':
            message = `${config.displayName} at ${Math.round(percentage * 100)}% - consider reducing usage.`;
            break;
          default:
            message = `${config.displayName} at ${Math.round(percentage * 100)}% of monthly quota.`;
        }

        newWarnings.push({
          provider: providerKey,
          displayName: config.displayName,
          icon: config.icon,
          level,
          message,
          percentage,
          fallbackAvailable: !!config.fallbackProvider,
          fallbackProvider: config.fallbackProvider,
          timestamp: now,
        });
      }
    }

    // Sort warnings by severity
    newWarnings.sort((a, b) => {
      const order = { exceeded: 0, critical: 1, warning: 2, info: 3 };
      return order[a.level] - order[b.level];
    });

    // Determine overall status
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (newWarnings.some(w => w.level === 'exceeded' || w.level === 'critical')) {
      overallStatus = 'critical';
    } else if (newWarnings.some(w => w.level === 'warning')) {
      overallStatus = 'warning';
    }

    return {
      timestamp: now,
      providers,
      warnings: newWarnings,
      overallStatus,
    };
  }, [dismissedWarnings]);

  // Refresh usage data
  const refreshUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const stored = loadStoredUsage();

      // Fetch real ElevenLabs usage if available
      const elevenLabsUsage = await fetchElevenLabsUsage();

      const newSnapshot = buildSnapshot(stored, elevenLabsUsage ?? undefined);
      setSnapshot(newSnapshot);
      setWarnings(newSnapshot.warnings);

      // Update last sync time
      stored.lastSync = Date.now();
      saveStoredUsage(stored);
    } catch (e) {
      console.error('[useApiUsageMonitor] Refresh failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to refresh usage');
    } finally {
      setIsLoading(false);
    }
  }, [loadStoredUsage, fetchElevenLabsUsage, buildSnapshot, saveStoredUsage]);

  // Record usage for a provider
  const recordUsage = useCallback((provider: string, units: number, context?: string) => {
    const stored = loadStoredUsage();
    const monthKey = getMonthKey();

    // Initialize month if needed
    if (!stored.monthlyUsage[monthKey]) {
      stored.monthlyUsage[monthKey] = { month: monthKey, providers: {} };
    }

    // Add to provider total
    const current = stored.monthlyUsage[monthKey].providers[provider] || 0;
    stored.monthlyUsage[monthKey].providers[provider] = current + units;

    // Add to recent calls (keep last 100)
    stored.recentCalls.unshift({
      provider,
      timestamp: Date.now(),
      units,
      context,
    });
    stored.recentCalls = stored.recentCalls.slice(0, 100);

    saveStoredUsage(stored);

    // Rebuild snapshot with new data
    const newSnapshot = buildSnapshot(stored);
    setSnapshot(newSnapshot);
    setWarnings(newSnapshot.warnings);

    console.log(`[useApiUsageMonitor] Recorded ${units} ${provider} units`);
  }, [loadStoredUsage, saveStoredUsage, buildSnapshot]);

  // Clear monthly usage (for testing or reset)
  const clearMonthlyUsage = useCallback(() => {
    const stored = loadStoredUsage();
    const monthKey = getMonthKey();
    delete stored.monthlyUsage[monthKey];
    saveStoredUsage(stored);
    refreshUsage();
  }, [loadStoredUsage, saveStoredUsage, refreshUsage]);

  // Dismiss a warning
  const dismissWarning = useCallback((provider: string) => {
    setDismissedWarnings(prev => new Set([...prev, provider]));
    setWarnings(prev => prev.filter(w => w.provider !== provider));
  }, []);

  // Get usage for a specific provider
  const getProviderUsage = useCallback((provider: string): ProviderUsage | null => {
    return snapshot?.providers[provider] || null;
  }, [snapshot]);

  // Load on mount
  useEffect(() => {
    refreshUsage();

    // Refresh every 5 minutes
    const interval = setInterval(refreshUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshUsage]);

  return {
    snapshot,
    warnings,
    isLoading,
    error,
    refreshUsage,
    recordUsage,
    clearMonthlyUsage,
    dismissWarning,
    getProviderUsage,
    hasActiveWarnings: warnings.length > 0,
    criticalWarnings: warnings.filter(w => w.level === 'critical' || w.level === 'exceeded'),
  };
}

export default useApiUsageMonitor;
