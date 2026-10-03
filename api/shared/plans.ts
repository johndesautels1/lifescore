/**
 * LIFE SCORE - Plans: the single source of truth for what each plan includes.
 *
 * Imported by BOTH the browser (src/hooks/useTierAccess.ts — what the screens
 * show) and the server (api/shared/entitlements.ts — what the server allows).
 * Before 2026-10-03 each side kept its own copy and they disagreed (the server
 * gave SOVEREIGN unlimited Grok videos, the screens said one a month). There is
 * now exactly one table; a test fails if another copy appears.
 *
 * This file is a LEAF: it imports nothing, so Vercel functions (which must not
 * depend on src/) and the Vite app can both import it safely.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

/** Plan ids as stored in profiles.tier. Display names: FREE, NAVIGATOR, SOVEREIGN. */
export type UserTier = 'free' | 'pro' | 'enterprise';

export const USER_TIERS: readonly UserTier[] = ['free', 'pro', 'enterprise'];

/** Narrow an untrusted value (a DB column, a cache entry) to a plan id. */
export function isUserTier(value: unknown): value is UserTier {
  return value === 'free' || value === 'pro' || value === 'enterprise';
}

/**
 * Monthly allowance per feature. -1 = unlimited, 0 = not included.
 * Booleans are on/off features with no monthly count.
 */
export interface TierLimits {
  standardComparisons: number;      // Comparisons with 1 LLM
  enhancedComparisons: number;      // Comparisons with all LLMs (SOVEREIGN)
  oliviaMinutesPerMonth: number;    // Olivia allowance — counted per message sent (usage column olivia_messages)
  judgeVideos: number;
  gammaReports: number;
  grokVideos: number;
  cristianoVideos: number;          // Cristiano "Go To My New City" HeyGen films
  movies: boolean;                  // "Moving Movies" screenplay + film
  cloudSync: boolean;
  apiAccess: boolean;
}

export type FeatureKey = keyof TierLimits;

/** Features that carry a monthly count (the rest are on/off). */
export type CountedFeature = {
  [K in FeatureKey]: TierLimits[K] extends number ? K : never;
}[FeatureKey];

export const TIER_NAMES: Record<UserTier, string> = {
  free: 'FREE',
  pro: 'NAVIGATOR',
  enterprise: 'SOVEREIGN',
};

/**
 * Plan allowances — ALL COUNTS ARE PER CALENDAR MONTH (UTC).
 * - FREE: $0, 1 comparison with 1 LLM, nothing else
 * - NAVIGATOR: $29, 1 comparison, Olivia, 1 judge video, 1 Gamma report
 * - SOVEREIGN: $99, 1 standard OR 1 enhanced comparison, Olivia, 1 of each video, Gamma, Moving Movies
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    standardComparisons: 1,
    enhancedComparisons: 0,
    oliviaMinutesPerMonth: 0,
    judgeVideos: 0,
    gammaReports: 0,
    grokVideos: 0,
    cristianoVideos: 0,
    movies: false,
    cloudSync: false,
    apiAccess: false,
  },
  pro: {
    standardComparisons: 1,
    enhancedComparisons: 0,
    oliviaMinutesPerMonth: 15,
    judgeVideos: 1,
    gammaReports: 1,
    grokVideos: 0,
    cristianoVideos: 0,
    movies: false,
    cloudSync: true,
    apiAccess: false,
  },
  enterprise: {
    standardComparisons: 1,
    enhancedComparisons: 1,
    oliviaMinutesPerMonth: 60,
    judgeVideos: 1,
    gammaReports: 1,
    grokVideos: 1,
    cristianoVideos: 1,
    movies: true,
    cloudSync: true,
    apiAccess: true,
  },
};

/**
 * Beta testers: unlimited Olivia, judges and visuals; comparison counts come
 * from their own beta_testers row (standard_comparisons_limit /
 * enhanced_comparisons_limit), defaulting to 1 each.
 */
export function betaTesterLimits(row: {
  standardComparisonsLimit?: number | null;
  enhancedComparisonsLimit?: number | null;
}): TierLimits {
  return {
    standardComparisons: row.standardComparisonsLimit ?? 1,
    enhancedComparisons: row.enhancedComparisonsLimit ?? 1,
    oliviaMinutesPerMonth: -1,
    judgeVideos: -1,
    gammaReports: -1,
    grokVideos: -1,
    cristianoVideos: -1,
    movies: false,
    cloudSync: true,
    apiAccess: false,
  };
}

/** Admins get every feature without a count. */
export const ADMIN_LIMITS: TierLimits = {
  standardComparisons: -1,
  enhancedComparisons: -1,
  oliviaMinutesPerMonth: -1,
  judgeVideos: -1,
  gammaReports: -1,
  grokVideos: -1,
  cristianoVideos: -1,
  movies: true,
  cloudSync: true,
  apiAccess: true,
};

/** The usage_tracking column that counts each counted feature. */
export const USAGE_COLUMNS: Record<CountedFeature, string> = {
  standardComparisons: 'standard_comparisons',
  enhancedComparisons: 'enhanced_comparisons',
  oliviaMinutesPerMonth: 'olivia_messages',
  judgeVideos: 'judge_videos',
  gammaReports: 'gamma_reports',
  grokVideos: 'grok_videos',
  cristianoVideos: 'cristiano_videos',
};

export function isCountedFeature(feature: FeatureKey): feature is CountedFeature {
  return typeof TIER_LIMITS.free[feature] === 'number';
}

/** True when the feature is included at all (count ≠ 0, or switched on). */
export function featureIncluded(limits: TierLimits, feature: FeatureKey): boolean {
  const limit = limits[feature];
  return typeof limit === 'boolean' ? limit : limit !== 0;
}

/** The cheapest plan that includes a feature. */
export function requiredTierFor(feature: FeatureKey): UserTier {
  for (const tier of USER_TIERS) {
    if (featureIncluded(TIER_LIMITS[tier], feature)) return tier;
  }
  return 'enterprise';
}

/** First day of the current usage month, UTC, as YYYY-MM-DD (matches usage_tracking.period_start). */
export function currentPeriodStart(now: Date = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}-01`;
}

/**
 * Founder accounts that always have admin access. The server adds any emails in
 * the DEV_BYPASS_EMAILS environment variable (api/shared/auth.ts getAdminEmails).
 */
export const FOUNDER_ADMIN_EMAILS: readonly string[] = [
  'cluesnomads@gmail.com',
  'brokerpinellas@gmail.com',
  'jdes7@aol.com',
  'johndesau7@gmail.com',
];

/** Display prices in USD. The charged prices live in Stripe. */
export const TIER_PRICING: Record<UserTier, { monthly: number; annual: number; name: string; tagline: string }> = {
  free: { monthly: 0, annual: 0, name: 'FREE', tagline: 'Start Your Journey' },
  pro: { monthly: 29, annual: 249, name: 'NAVIGATOR', tagline: 'Chart Your Course' },
  enterprise: { monthly: 99, annual: 899, name: 'SOVEREIGN', tagline: 'Command Your Destiny' },
};
