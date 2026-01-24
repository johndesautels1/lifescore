/**
 * LIFE SCORE™ Feature Gate Component
 *
 * Wraps premium features with tier-based access control.
 * Shows a lock overlay with upgrade prompt for unauthorized users.
 *
 * Usage:
 * <FeatureGate feature="enhancedComparisons" requiredTier="pro">
 *   <EnhancedModeSelector />
 * </FeatureGate>
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import { useTierAccess, TIER_NAMES, type FeatureKey } from '../hooks/useTierAccess';
import type { UserTier } from '../types/database';
import './FeatureGate.css';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureGateProps {
  /** The feature to check access for */
  feature: FeatureKey;
  /** Minimum tier required (optional - auto-detected from feature) */
  requiredTier?: UserTier;
  /** Content to render when access is granted */
  children: React.ReactNode;
  /** Custom message to show when locked */
  lockedMessage?: string;
  /** Custom title for the lock overlay */
  lockedTitle?: string;
  /** Whether to blur the content (true) or hide it completely (false) */
  blurContent?: boolean;
  /** Callback when upgrade is clicked */
  onUpgradeClick?: () => void;
  /** Show usage remaining (for limited features) */
  showUsage?: boolean;
  /** Allow users to dismiss the gate overlay (default: true) */
  allowDismiss?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

// ============================================================================
// FEATURE DESCRIPTIONS
// ============================================================================

const FEATURE_DESCRIPTIONS: Record<FeatureKey, { title: string; description: string }> = {
  standardComparisons: {
    title: 'Standard Comparisons',
    description: 'Compare cities using our curated freedom metrics.',
  },
  enhancedComparisons: {
    title: 'Enhanced Mode',
    description: 'Multi-LLM consensus analysis with 5 AI evaluators and Claude Opus judging.',
  },
  oliviaMessagesPerDay: {
    title: 'Ask Olivia',
    description: 'Chat with Olivia, your AI advisor, for personalized insights.',
  },
  judgeVideos: {
    title: 'Judge Video Reports',
    description: 'Professional video verdicts delivered by Christian, the Judge.',
  },
  gammaReports: {
    title: 'Visual Reports',
    description: 'Beautiful PDF and PowerPoint presentations of your comparisons.',
  },
  cloudSync: {
    title: 'Cloud Sync',
    description: 'Save and sync your comparisons across all your devices.',
  },
  apiAccess: {
    title: 'API Access',
    description: 'Integrate LIFE SCORE data into your own applications.',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  requiredTier,
  children,
  lockedMessage,
  lockedTitle,
  blurContent = true,
  onUpgradeClick,
  showUsage = false,
  allowDismiss = true,
  onDismiss,
}) => {
  const { tier, canAccess, checkUsage, getRequiredTier, isUnlimited } = useTierAccess();
  const [usageInfo, setUsageInfo] = useState<{
    used: number;
    limit: number;
    remaining: number;
  } | null>(null);
  const [isLimited, setIsLimited] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Determine the required tier
  const actualRequiredTier = requiredTier || getRequiredTier(feature);
  const featureInfo = FEATURE_DESCRIPTIONS[feature];

  // Check if feature is accessible
  const hasAccess = canAccess(feature);

  // Check usage limits
  useEffect(() => {
    if (hasAccess && showUsage && !isUnlimited(feature)) {
      checkUsage(feature).then((result) => {
        if (result.limit > 0) {
          setUsageInfo({
            used: result.used,
            limit: result.limit,
            remaining: result.remaining,
          });
          setIsLimited(!result.allowed);
        }
      });
    }
  }, [hasAccess, showUsage, feature]);

  // Handle upgrade button click
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default: scroll to pricing or open pricing modal
      // For now, we'll dispatch a custom event that the app can listen to
      window.dispatchEvent(new CustomEvent('openPricing', { detail: { feature, requiredTier: actualRequiredTier } }));
    }
  };

  // Handle dismiss button click
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // If user has access and not limited, render children normally
  if (hasAccess && !isLimited) {
    return (
      <>
        {children}
        {showUsage && usageInfo && (
          <div className="feature-usage-badge">
            <span className="usage-text">
              {usageInfo.remaining === -1
                ? 'Unlimited'
                : `${usageInfo.remaining} remaining`}
            </span>
          </div>
        )}
      </>
    );
  }

  // If dismissed, render children without overlay (but still blurred/disabled)
  if (isDismissed) {
    return (
      <div className="feature-gate dismissed">
        <div className={`gated-content ${blurContent ? 'blurred' : 'hidden'}`}>
          {children}
        </div>
      </div>
    );
  }

  // Render locked state
  return (
    <div className="feature-gate">
      {/* Blurred or hidden content */}
      <div className={`gated-content ${blurContent ? 'blurred' : 'hidden'}`}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="gate-overlay">
        <div className="gate-card">
          {/* Dismiss button */}
          {allowDismiss && (
            <button
              className="gate-dismiss-btn"
              onClick={handleDismiss}
              aria-label="Dismiss"
              title="Continue with free features"
            >
              ✕
            </button>
          )}

          <div className="gate-icon">
            {isLimited ? '⏱️' : '🔒'}
          </div>

          <h4 className="gate-title">
            {isLimited
              ? 'Limit Reached'
              : lockedTitle || `Upgrade to ${TIER_NAMES[actualRequiredTier]}`}
          </h4>

          <p className="gate-message">
            {isLimited
              ? `You've used all ${usageInfo?.limit} ${featureInfo.title.toLowerCase()} this month.`
              : lockedMessage || featureInfo.description}
          </p>

          <button className="gate-upgrade-btn" onClick={handleUpgrade}>
            <span className="btn-icon">✨</span>
            <span className="btn-text">
              {isLimited ? 'Upgrade for Unlimited' : 'Unlock This Feature'}
            </span>
          </button>

          <div className="gate-tier-info">
            <span className="current-tier">Current: {TIER_NAMES[tier]}</span>
            <span className="tier-arrow">→</span>
            <span className="required-tier">{TIER_NAMES[actualRequiredTier]}</span>
          </div>

          {allowDismiss && (
            <button className="gate-continue-btn" onClick={handleDismiss}>
              Continue with free features
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SIMPLE GATE COMPONENT
// ============================================================================

/**
 * Simple inline gate that just shows/hides content
 */
export const SimpleGate: React.FC<{
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ feature, children, fallback }) => {
  const { canAccess } = useTierAccess();

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  return fallback ? <>{fallback}</> : null;
};

// ============================================================================
// USAGE METER COMPONENT
// ============================================================================

/**
 * Display usage meter for a feature
 */
export const UsageMeter: React.FC<{
  feature: FeatureKey;
  showLabel?: boolean;
  compact?: boolean;
}> = ({ feature, showLabel = true, compact = false }) => {
  const { checkUsage, isUnlimited } = useTierAccess();
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);

  useEffect(() => {
    if (!isUnlimited(feature)) {
      checkUsage(feature).then((result) => {
        if (result.limit > 0) {
          setUsage({ used: result.used, limit: result.limit });
        }
      });
    }
  }, [feature]);

  if (!usage) {
    return null;
  }

  const percentage = Math.min((usage.used / usage.limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isExhausted = percentage >= 100;

  return (
    <div className={`usage-meter ${compact ? 'compact' : ''}`}>
      {showLabel && (
        <div className="meter-label">
          <span className="meter-feature">{FEATURE_DESCRIPTIONS[feature].title}</span>
          <span className="meter-count">
            {usage.used}/{usage.limit}
          </span>
        </div>
      )}
      <div className="meter-bar">
        <div
          className={`meter-fill ${isWarning ? 'warning' : ''} ${isExhausted ? 'exhausted' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default FeatureGate;
