/**
 * LIFE SCORE - Tier Access Hook
 *
 * Manages feature access based on user subscription tier.
 * Provides tier limits, access checking, and usage tracking.
 *
 * Tiers:
 * - EXPLORER (free): Limited features
 * - NAVIGATOR (pro): Full features with monthly limits
 * - SOVEREIGN (enterprise): Unlimited access
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured, SUPABASE_TIMEOUT_MS } from '../lib/supabase';
import type { UserTier, UsageTracking } from '../types/database';

// ============================================================================
// TIMEOUT HELPER
// ============================================================================

/**
 * Wrap a Supabase query with 45s timeout - rejects on timeout
 * Handles Supabase free tier cold starts which can be slow
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number = SUPABASE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase query timeout after ${ms}ms`)), ms)
    ),
  ]);
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

/**
 * Feature limits per tier
 * -1 = unlimited
 */
export interface TierLimits {
  standardComparisons: number;
  enhancedComparisons: number;
  oliviaMessagesPerDay: number;
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
  free: 'EXPLORER',
  pro: 'NAVIGATOR',
  enterprise: 'SOVEREIGN',
};

/**
 * Tier limits configuration
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    standardComparisons: 3,
    enhancedComparisons: 0,
    oliviaMessagesPerDay: 5,
    judgeVideos: 0,
    gammaReports: 0,
    grokVideos: 0,       // Free users: no access
    cloudSync: false,
    apiAccess: false,
  },
  pro: {
    standardComparisons: -1, // Unlimited
    enhancedComparisons: 10,
    oliviaMessagesPerDay: 50, // 50 messages per day
    judgeVideos: 3,
    gammaReports: 5,
    grokVideos: 0,       // Pro users: no access (Sovereign only)
    cloudSync: true,
    apiAccess: false,
  },
  enterprise: {
    standardComparisons: -1,
    enhancedComparisons: -1,
    oliviaMessagesPerDay: -1,
    judgeVideos: -1,
    gammaReports: -1,
    grokVideos: -1,      // Sovereign: unlimited
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
  oliviaMessagesPerDay: 'olivia_messages',
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

// Developer bypass emails - comma separated in env var
const DEV_BYPASS_EMAILS = (import.meta.env.VITE_DEV_BYPASS_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

export function useTierAccess(): TierAccessHook {
  const { profile, user, isLoading: authLoading } = useAuth();

  // Developer bypass - grant enterprise access to specified emails
  const isDeveloper = user?.email && DEV_BYPASS_EMAILS.includes(user.email.toLowerCase());
  const tier: UserTier = isDeveloper ? 'enterprise' : (profile?.tier || 'free');

  if (isDeveloper) {
    console.log('[useTierAccess] Developer bypass active for:', user?.email);
  }
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
    if (!isSupabaseConfigured() || !profile?.id) {
      // Fail open - allow if we can't check
      return {
        allowed: true,
        used: 0,
        limit,
        remaining: limit,
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

      const { data, error } = await withTimeout(
        supabase
          .from('usage_tracking')
          .select('*')
          .eq('user_id', profile.id)
          .eq('period_start', periodStart)
          .single()
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
      // Fail open
      return {
        allowed: true,
        used: 0,
        limit,
        remaining: limit,
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

    // If unlimited or Supabase not configured, just return true
    if (usageCheck.limit === -1 || !isSupabaseConfigured() || !profile?.id) {
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
      const { error } = await withTimeout(
        supabase.rpc('increment_usage', {
          p_user_id: profile.id,
          p_feature: column,
          p_amount: 1,
        })
      );

      if (error) {
        // Fallback: try direct upsert
        console.warn('[useTierAccess] RPC failed, trying direct upsert:', error);

        const { data: existing } = await withTimeout(
          supabase
            .from('usage_tracking')
            .select('*')
            .eq('user_id', profile.id)
            .eq('period_start', periodStart)
            .single()
        );

        if (existing) {
          // Update existing record
          const existingData = existing as Record<string, unknown>;
          const currentValue = (existingData[column] as number) || 0;
          await withTimeout(
            supabase
              .from('usage_tracking')
              .update({ [column]: currentValue + 1 })
              .eq('id', existingData.id as string)
          );
        } else {
          // Insert new record
          await withTimeout(
            supabase.from('usage_tracking').insert({
              user_id: profile.id,
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
    name: 'EXPLORER',
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
