/**
 * LIFE SCORE - Tier Access Hook
 *
 * Manages feature access based on user subscription tier.
 * Provides tier limits, access checking, and usage tracking.
 *
 * Tiers:
 * - FREE (free): Limited features, 1 comparison/month
 * - NAVIGATOR (pro): $29/month, 1 LLM, 15min Olivia, 1 comparison
 * - SOVEREIGN (enterprise): $99/month, 5 LLMs, 60min Olivia, enhanced mode
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured, withRetry, SUPABASE_TIMEOUT_MS, getAuthHeaders } from '../lib/supabase';
import type { UserTier, UsageTracking } from '../types/database';

// ============================================================================
// TIMEOUT HELPER WITH RETRY
// ============================================================================

/**
 * Wrap a Supabase query with retry logic and timeout.
 * Uses exponential backoff on timeout/network errors.
 */
async function withTimeout<T>(
  queryFn: (() => PromiseLike<T>) | PromiseLike<T>,
  ms: number = SUPABASE_TIMEOUT_MS,
  operationName: string = 'Tier access query'
): Promise<T> {
  const factory = typeof queryFn === 'function' ? queryFn : () => queryFn;
  return withRetry(factory, {
    timeoutMs: ms,
    operationName,
    maxRetries: 3,
  });
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

/**
 * Feature limits per tier
 * -1 = unlimited
 */
export interface TierLimits {
  standardComparisons: number;      // Comparisons with 1 LLM
  enhancedComparisons: number;      // Comparisons with 5 LLMs (Sovereign only)
  oliviaMinutesPerMonth: number;    // Olivia AI voice minutes (0=none, 15=Navigator, 60=Sovereign)
  judgeVideos: number;
  gammaReports: number;
  grokVideos: number;
  cloudSync: boolean;
  apiAccess: boolean;
}

/**
 * Tier display names for UI
 */
export const TIER_NAMES: Record<UserTier, string> = {
  free: 'FREE',
  pro: 'NAVIGATOR',
  enterprise: 'SOVEREIGN',
};

/**
 * Tier limits configuration - ALL LIMITS ARE PER MONTH
 *
 * CORRECT TIER STRUCTURE (Feb 2026):
 * - FREE: $0, 1 LLM, 1 comparison, NO Olivia, NO Gamma
 * - NAVIGATOR: $29, 1 LLM, 1 comparison, 15min Olivia, 1 Gamma
 * - SOVEREIGN: $99, 5 LLMs, 1 standard OR 1 enhanced comparison, 60min Olivia, 1 Gamma
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    standardComparisons: 1,         // 1 comparison/month with 1 LLM
    enhancedComparisons: 0,         // No enhanced mode
    oliviaMinutesPerMonth: 0,       // NO Olivia access
    judgeVideos: 0,                 // NO Judge videos
    gammaReports: 0,                // NO Gamma reports
    grokVideos: 0,                  // NO Grok videos
    cloudSync: false,
    apiAccess: false,
  },
  pro: {
    standardComparisons: 1,         // 1 comparison/month with 1 LLM
    enhancedComparisons: 0,         // No enhanced mode (Sovereign only)
    oliviaMinutesPerMonth: 15,      // 15 minutes/month (3×5min sessions)
    judgeVideos: 1,                 // 1 Judge video/month
    gammaReports: 1,                // 1 Gamma report/month
    grokVideos: 0,                  // NO Grok videos (Sovereign only)
    cloudSync: true,
    apiAccess: false,
  },
  enterprise: {
    standardComparisons: 1,         // 1 standard comparison OR use enhanced
    enhancedComparisons: 1,         // 1 comparison/month with ALL 5 LLMs
    oliviaMinutesPerMonth: 60,      // 60 minutes/month
    judgeVideos: 1,                 // 1 Judge video/month
    gammaReports: 1,                // 1 Gamma report/month (with all 5 LLMs)
    grokVideos: 1,                  // 1 Grok video/month
    cloudSync: true,
    apiAccess: true,
  },
};

/**
 * Map feature keys to usage tracking columns
 */
const FEATURE_TO_COLUMN: Record<string, keyof UsageTracking> = {
  standardComparisons: 'standard_comparisons',
  enhancedComparisons: 'enhanced_comparisons',
  oliviaMinutesPerMonth: 'olivia_messages',
  judgeVideos: 'judge_videos',
  gammaReports: 'gamma_reports',
  grokVideos: 'grok_videos',
};

// ============================================================================
// TYPES
// ============================================================================

export type FeatureKey = keyof TierLimits;

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  upgradeRequired: boolean;
  requiredTier: UserTier;
}

export interface TierAccessHook {
  tier: UserTier;
  tierName: string;
  limits: TierLimits;
  isLoading: boolean;
  isAdmin: boolean;  // Admin bypass - unlimited access to everything
  canAccess: (feature: FeatureKey) => boolean;
  checkUsage: (feature: FeatureKey) => Promise<UsageCheckResult>;
  incrementUsage: (feature: FeatureKey) => Promise<boolean>;
  getRequiredTier: (feature: FeatureKey) => UserTier;
  isUnlimited: (feature: FeatureKey) => boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the minimum tier required for a feature
 */
function getRequiredTierForFeature(feature: FeatureKey): UserTier {
  // Check if free tier has access
  const freeLimit = TIER_LIMITS.free[feature];
  if (typeof freeLimit === 'boolean' ? freeLimit : freeLimit !== 0) {
    return 'free';
  }

  // Check if pro tier has access
  const proLimit = TIER_LIMITS.pro[feature];
  if (typeof proLimit === 'boolean' ? proLimit : proLimit !== 0) {
    return 'pro';
  }

  // Must be enterprise only
  return 'enterprise';
}

/**
 * Get start of current month as ISO date string (YYYY-MM-DD)
 * Uses local timezone to avoid UTC conversion issues
 */
function getCurrentPeriodStart(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// ============================================================================
// HOOK
// ============================================================================

// Admin status cache key — server-side /api/admin-check result cached in localStorage
const ADMIN_CACHE_KEY = 'lifescore_admin_status';
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
// Grace period: if cache expired but server check fails, trust the old value for 1 hour
const ADMIN_CACHE_GRACE_MS = 60 * 60 * 1000;

// Tier cache — survives Supabase outages so users aren't demoted to free
const TIER_CACHE_KEY = 'lifescore_user_tier';

interface AdminCache {
  isAdmin: boolean;
  timestamp: number;
}

/**
 * Read cached admin status from localStorage.
 * Returns null if cache is missing or expired beyond grace period.
 * If within grace period (expired but recent), still returns the value
 * so the user isn't locked out while we try to reach the server.
 */
function getCachedAdminStatus(graceMode = false): boolean | null {
  try {
    const raw = localStorage.getItem(ADMIN_CACHE_KEY);
    if (!raw) return null;
    const parsed: AdminCache = JSON.parse(raw);
    const age = Date.now() - parsed.timestamp;
    // Fresh cache — always trust
    if (age <= ADMIN_CACHE_TTL_MS) return parsed.isAdmin;
    // Grace mode — trust the old value if within grace period
    if (graceMode && age <= ADMIN_CACHE_GRACE_MS) return parsed.isAdmin;
    // Truly expired — remove
    localStorage.removeItem(ADMIN_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache admin status in localStorage.
 */
function setCachedAdminStatus(isAdmin: boolean): void {
  try {
    const entry: AdminCache = { isAdmin, timestamp: Date.now() };
    localStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(entry));
  } catch { /* localStorage not available */ }
}

function getCachedTier(): UserTier | null {
  try {
    const cached = localStorage.getItem(TIER_CACHE_KEY);
    if (cached === 'free' || cached === 'pro' || cached === 'enterprise') {
      return cached;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedTier(tier: UserTier): void {
  try {
    localStorage.setItem(TIER_CACHE_KEY, tier);
  } catch { /* localStorage not available */ }
}

function clearCachedTier(): void {
  try {
    localStorage.removeItem(TIER_CACHE_KEY);
  } catch { /* localStorage not available */ }
}

export function useTierAccess(): TierAccessHook {
  const { profile, user, isLoading: authLoading } = useAuth();

  // Admin status — fetched from server-side /api/admin-check (no emails in client bundle)
  const [isDeveloper, setIsDeveloper] = useState<boolean>(() => {
    // Initialize from cache for instant rendering (avoids flash of wrong tier)
    const cached = getCachedAdminStatus();
    return cached ?? false;
  });

  useEffect(() => {
    if (!user?.id) {
      setIsDeveloper(false);
      return;
    }

    // Check fresh cache first (within 5-min TTL)
    const cached = getCachedAdminStatus();
    if (cached !== null) {
      setIsDeveloper(cached);
      return;
    }

    // Cache expired — fetch from server, but use grace period as fallback
    const graceValue = getCachedAdminStatus(true); // trust old value for up to 1 hour
    if (graceValue === true) {
      // Keep them as admin while we verify in background
      setIsDeveloper(true);
    }

    let cancelled = false;
    (async () => {
      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders.Authorization) {
          // Supabase session unavailable — trust grace value, don't lock out
          // Will retry on next render when auth recovers
          return;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
        const res = await fetch('/api/admin-check', {
          headers: authHeaders,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const isAdmin = data.isAdmin === true;
        setCachedAdminStatus(isAdmin);
        if (!cancelled) setIsDeveloper(isAdmin);
      } catch {
        // On network/timeout error: trust grace value, don't lock out
        // Only set false if there was never a cached true value
        if (!cancelled && graceValue !== true) {
          setIsDeveloper(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // Developer bypass ALWAYS gets enterprise, even if profile isn't loaded yet.
  // Everyone else: use cached tier when profile unavailable (Supabase timeout resilience).
  // Only fall back to 'free' for truly new/unknown users (no cache, no profile).
  const profileTier = profile?.tier;
  const cachedTier = user?.id ? getCachedTier() : null; // Only use cache for authenticated users
  const tier: UserTier = isDeveloper
    ? 'enterprise'
    : profileTier
      ? profileTier
      : cachedTier || 'free'; // Use cached tier if profile unavailable, then free as last resort

  // Cache the tier whenever we get it from the profile (so it survives Supabase outages)
  useEffect(() => {
    if (profileTier) {
      setCachedTier(profileTier);
    }
  }, [profileTier]);

  // Clear tier cache on sign-out (no user = no cached tier)
  useEffect(() => {
    if (!user?.id) {
      clearCachedTier();
    }
  }, [user?.id]);

  const tierName = TIER_NAMES[tier];
  const limits = TIER_LIMITS[tier];

  /**
   * Check if user can access a feature (ignoring usage limits)
   */
  const canAccess = (feature: FeatureKey): boolean => {
    const limit = limits[feature];
    if (typeof limit === 'boolean') {
      return limit;
    }
    return limit !== 0;
  };

  /**
   * Check if feature has unlimited usage for current tier
   */
  const isUnlimited = (feature: FeatureKey): boolean => {
    const limit = limits[feature];
    return typeof limit === 'number' && limit === -1;
  };

  /**
   * Get required tier for a feature
   */
  const getRequiredTier = (feature: FeatureKey): UserTier => {
    return getRequiredTierForFeature(feature);
  };

  /**
   * Check current usage against limits
   */
  const checkUsage = async (feature: FeatureKey): Promise<UsageCheckResult> => {
    const limit = limits[feature];

    // Boolean features (like cloudSync)
    if (typeof limit === 'boolean') {
      return {
        allowed: limit,
        used: 0,
        limit: limit ? -1 : 0,
        remaining: limit ? -1 : 0,
        upgradeRequired: !limit,
        requiredTier: getRequiredTier(feature),
      };
    }

    // Feature not available at this tier
    if (limit === 0) {
      return {
        allowed: false,
        used: 0,
        limit: 0,
        remaining: 0,
        upgradeRequired: true,
        requiredTier: getRequiredTier(feature),
      };
    }

    // Unlimited access
    if (limit === -1) {
      return {
        allowed: true,
        used: 0,
        limit: -1,
        remaining: -1,
        upgradeRequired: false,
        requiredTier: tier,
      };
    }

    // Check actual usage from database
    // Use user.id (from auth session) instead of profile.id — auth session survives
    // even when profile fetch times out due to Supabase connectivity issues
    const userId = profile?.id || user?.id;
    if (!isSupabaseConfigured() || !userId) {
      // Fail-closed: deny if we can't verify usage AND have no user ID at all
      return {
        allowed: false,
        used: 0,
        limit,
        remaining: 0,
        upgradeRequired: false,
        requiredTier: tier,
      };
    }

    try {
      const periodStart = getCurrentPeriodStart();
      const column = FEATURE_TO_COLUMN[feature];

      if (!column) {
        // Unknown feature, allow
        return {
          allowed: true,
          used: 0,
          limit,
          remaining: limit,
          upgradeRequired: false,
          requiredTier: tier,
        };
      }

      const { data, error } = await withTimeout(() =>
        supabase
          .from('usage_tracking')
          .select('*')
          .eq('user_id', userId)
          .eq('period_start', periodStart)
          .maybeSingle()
      );

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine
        console.error('[useTierAccess] Error fetching usage:', error);
      }

      // Get the usage count for this feature
      const usageData = data as Record<string, number> | null;
      const used = usageData?.[column] ?? 0;
      const remaining = limit - used;
      const allowed = remaining > 0;

      return {
        allowed,
        used,
        limit,
        remaining: Math.max(0, remaining),
        upgradeRequired: !allowed,
        requiredTier: allowed ? tier : getRequiredTier(feature),
      };
    } catch (error) {
      console.error('[useTierAccess] Usage check error:', error);
      // Fail-closed: deny on error to prevent unlimited free access when DB is down
      return {
        allowed: false,
        used: 0,
        limit,
        remaining: 0,
        upgradeRequired: false,
        requiredTier: tier,
      };
    }
  };

  /**
   * Increment usage counter for a feature
   * Returns true if increment was successful, false if limit exceeded
   */
  const incrementUsage = async (feature: FeatureKey): Promise<boolean> => {
    // First check if we have capacity
    const usageCheck = await checkUsage(feature);
    if (!usageCheck.allowed) {
      return false;
    }

    // Use user.id (auth session) as fallback when profile hasn't loaded
    const userId = profile?.id || user?.id;

    // If unlimited or Supabase not configured, just return true
    if (usageCheck.limit === -1 || !isSupabaseConfigured() || !userId) {
      return true;
    }

    try {
      const periodStart = getCurrentPeriodStart();
      // Calculate last day of current month (local timezone)
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const periodEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const column = FEATURE_TO_COLUMN[feature];
      if (!column) {
        return true;
      }

      // Upsert usage record (with 45s timeout)
      const { error } = await withTimeout(() =>
        supabase.rpc('increment_usage', {
          p_user_id: userId,
          p_feature: column,
          p_amount: 1,
        })
      );

      if (error) {
        // Fallback: try direct upsert
        console.warn('[useTierAccess] RPC failed, trying direct upsert:', error);

        const { data: existing } = await withTimeout(() =>
          supabase
            .from('usage_tracking')
            .select('*')
            .eq('user_id', userId)
            .eq('period_start', periodStart)
            .maybeSingle()
        );

        if (existing) {
          // Update existing record
          const existingData = existing as Record<string, unknown>;
          const currentValue = (existingData[column] as number) || 0;
          await withTimeout(() =>
            supabase
              .from('usage_tracking')
              .update({ [column]: currentValue + 1 })
              .eq('id', existingData.id as string)
          );
        } else {
          // Insert new record
          await withTimeout(() =>
            supabase.from('usage_tracking').insert({
              user_id: userId,
              period_start: periodStart,
              period_end: periodEnd,
              [column]: 1,
            })
          );
        }
      }

      return true;
    } catch (error) {
      console.error('[useTierAccess] Increment usage error:', error);
      // Fail open - don't block user due to tracking error
      return true;
    }
  };

  return {
    tier,
    tierName,
    limits,
    isLoading: authLoading,
    isAdmin: isDeveloper,  // Admin bypass flag - FeatureGate checks this for unlimited access
    canAccess,
    checkUsage,
    incrementUsage,
    getRequiredTier,
    isUnlimited,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Get tier pricing info for display
 */
export const TIER_PRICING = {
  free: {
    monthly: 0,
    annual: 0,
    name: 'FREE',
    tagline: 'Start Your Journey',
  },
  pro: {
    monthly: 29,
    annual: 249,
    name: 'NAVIGATOR',
    tagline: 'Chart Your Course',
  },
  enterprise: {
    monthly: 99,
    annual: 899,
    name: 'SOVEREIGN',
    tagline: 'Command Your Destiny',
  },
};

export default useTierAccess;
