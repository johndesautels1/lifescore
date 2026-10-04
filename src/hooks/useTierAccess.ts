/**
 * LIFE SCORE - Tier Access Hook
 *
 * Manages feature access based on user subscription tier.
 * Provides tier limits, access checking, and usage tracking.
 *
 * Tiers:
 * - FREE (free): Limited features, 1 comparison/month
 * - NAVIGATOR (pro): $29/month, 1 LLM, 15 Olivia messages, 1 comparison
 * - SOVEREIGN (enterprise): $99/month, 5 LLMs, 60 Olivia messages, enhanced mode
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured, getAuthHeaders, withQueryTimeout, type SupabaseQuery } from '../lib/supabase';
import {
  ADMIN_LIMITS,
  FOUNDER_ADMIN_EMAILS,
  TIER_LIMITS,
  TIER_NAMES,
  USAGE_COLUMNS,
  betaTesterLimits,
  currentPeriodStart,
  isCountedFeature,
  requiredTierFor,
  type FeatureKey,
  type TierLimits,
  type UserTier,
} from '../../api/shared/plans';

// Plans are defined once, in api/shared/plans.ts (the server enforces the same table).
export { TIER_LIMITS, TIER_NAMES, TIER_PRICING } from '../../api/shared/plans';
export type { FeatureKey, TierLimits } from '../../api/shared/plans';

/** This file's Supabase queries: time limit and retries from src/lib/supabase.ts, named in the logs. */
const withTimeout = <T,>(query: SupabaseQuery<T>): Promise<T> => withQueryTimeout(query, 'Tier access query');

// ============================================================================
// BETA TESTER CONFIGURATION
// ============================================================================

/**
 * Beta tester access config returned from /api/beta-check
 */
export interface BetaAccessConfig {
  paymentBypass: boolean;
  standardComparisonsLimit: number;
  enhancedComparisonsLimit: number;
  reportOrdering: boolean;
  askEmeiliaCustomerService: boolean;
  askEmeiliaOtherCategories: boolean;
  askEmeiliaChat: boolean;
  askOliviaChatUnlimited: boolean;
  askOliviaPageInfoUnlimited: boolean;
  visualsVideoPresenter: boolean;
  visualsLivePresenter: boolean;
  judgesFullAccess: boolean;
}

// ============================================================================
// TYPES
// ============================================================================

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
  isBetaTester: boolean;  // Beta tester - custom access profile
  betaAccess: BetaAccessConfig | null;  // Granular beta access config
  canAccess: (feature: FeatureKey) => boolean;
  checkUsage: (feature: FeatureKey) => Promise<UsageCheckResult>;
  getRequiredTier: (feature: FeatureKey) => UserTier;
  isUnlimited: (feature: FeatureKey) => boolean;
}

// ============================================================================
// HOOK
// ============================================================================

// Founder admin emails (api/shared/plans.ts) — guaranteed full access even if /api/admin-check fails.
// The server grants the same accounts admin access, so screens and server agree.

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

// Beta tester cache — same pattern as admin, 5-min TTL + 1-hour grace
const BETA_CACHE_KEY = 'lifescore_beta_status';

interface BetaCache {
  isBetaTester: boolean;
  access: BetaAccessConfig | null;
  timestamp: number;
}

function getCachedBetaStatus(graceMode = false): BetaCache | null {
  try {
    const raw = localStorage.getItem(BETA_CACHE_KEY);
    if (!raw) return null;
    const parsed: BetaCache = JSON.parse(raw);
    const age = Date.now() - parsed.timestamp;
    if (age <= ADMIN_CACHE_TTL_MS) return parsed;
    if (graceMode && age <= ADMIN_CACHE_GRACE_MS) return parsed;
    localStorage.removeItem(BETA_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

function setCachedBetaStatus(isBetaTester: boolean, access: BetaAccessConfig | null): void {
  try {
    const entry: BetaCache = { isBetaTester, access, timestamp: Date.now() };
    localStorage.setItem(BETA_CACHE_KEY, JSON.stringify(entry));
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

  // Admin status — hardcoded emails always pass, then falls back to /api/admin-check
  const isHardcodedAdmin = !!user?.email && FOUNDER_ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [isDeveloper, setIsDeveloper] = useState<boolean>(() => {
    if (isHardcodedAdmin) return true;
    const cached = getCachedAdminStatus();
    return cached ?? false;
  });

  useEffect(() => {
    // Hardcoded admin emails — always admin, skip API call entirely
    if (isHardcodedAdmin) {
      setIsDeveloper(true);
      setCachedAdminStatus(true);
      return;
    }

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

  // Beta tester status — fetched from server-side /api/beta-check
  const [isBetaTester, setIsBetaTester] = useState<boolean>(() => {
    const cached = getCachedBetaStatus();
    return cached?.isBetaTester ?? false;
  });
  const [betaAccess, setBetaAccess] = useState<BetaAccessConfig | null>(() => {
    const cached = getCachedBetaStatus();
    return cached?.access ?? null;
  });

  useEffect(() => {
    if (!user?.id) {
      setIsBetaTester(false);
      setBetaAccess(null);
      return;
    }

    // Check fresh cache first
    const cached = getCachedBetaStatus();
    if (cached !== null) {
      setIsBetaTester(cached.isBetaTester);
      setBetaAccess(cached.access);
      return;
    }

    // Grace period fallback
    const graceValue = getCachedBetaStatus(true);
    if (graceValue?.isBetaTester) {
      setIsBetaTester(true);
      setBetaAccess(graceValue.access);
    }

    let cancelled = false;
    (async () => {
      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders.Authorization) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch('/api/beta-check', {
          headers: authHeaders,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const beta = data.isBetaTester === true;
        const access = beta ? (data.access as BetaAccessConfig) : null;
        setCachedBetaStatus(beta, access);
        if (!cancelled) {
          setIsBetaTester(beta);
          setBetaAccess(access);
        }
      } catch {
        if (!cancelled && !graceValue?.isBetaTester) {
          setIsBetaTester(false);
          setBetaAccess(null);
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
  // Beta testers get custom limits; admins get enterprise; everyone else gets tier limits
  const limits: TierLimits = isDeveloper ? ADMIN_LIMITS
    : isBetaTester ? betaTesterLimits({
        standardComparisonsLimit: betaAccess?.standardComparisonsLimit,
        enhancedComparisonsLimit: betaAccess?.enhancedComparisonsLimit,
      })
    : TIER_LIMITS[tier];

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
    return requiredTierFor(feature);
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
      const periodStart = currentPeriodStart();
      const column = isCountedFeature(feature) ? USAGE_COLUMNS[feature] : undefined;

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
      console.warn('[useTierAccess] Usage check error, retrying once:', error);
      // Retry once before fail-closed denial
      try {
        const periodStart = currentPeriodStart();
        const column = isCountedFeature(feature) ? USAGE_COLUMNS[feature] : undefined;
        if (column) {
          const { data: retryData } = await withTimeout(() =>
            supabase
              .from('usage_tracking')
              .select('*')
              .eq('user_id', userId)
              .eq('period_start', periodStart)
              .maybeSingle()
          );
          const retryUsage = retryData as Record<string, number> | null;
          const used = retryUsage?.[column] ?? 0;
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
        }
      } catch (retryError) {
        console.error('[useTierAccess] Retry also failed:', retryError);
      }
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

  return {
    tier,
    tierName,
    limits,
    isLoading: authLoading,
    isAdmin: isDeveloper,  // Admin bypass flag - FeatureGate checks this for unlimited access
    isBetaTester,          // Beta tester flag - custom access profile
    betaAccess,            // Granular beta access config (Emeilia categories, etc.)
    canAccess,
    checkUsage,
    getRequiredTier,
    isUnlimited,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export default useTierAccess;
