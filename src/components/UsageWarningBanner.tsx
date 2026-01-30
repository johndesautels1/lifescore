/**
 * LIFE SCORE - API Usage Warning Banner
 * Displays warnings when API quotas are approaching limits
 *
 * Created: 2026-01-30
 */

import React, { useState } from 'react';
import { useApiUsageMonitor } from '../hooks/useApiUsageMonitor';
import { formatQuotaValue, API_PROVIDER_QUOTAS } from '../types/apiUsage';
import './UsageWarningBanner.css';

interface UsageWarningBannerProps {
  /** Only show critical warnings (red/exceeded) */
  criticalOnly?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Position: 'top' | 'bottom' | 'inline' */
  position?: 'top' | 'bottom' | 'inline';
  /** Called when user clicks to view full dashboard */
  onViewDashboard?: () => void;
}

export const UsageWarningBanner: React.FC<UsageWarningBannerProps> = ({
  criticalOnly = false,
  compact = false,
  position = 'top',
  onViewDashboard,
}) => {
  const {
    warnings,
    criticalWarnings,
    snapshot,
    isLoading,
    dismissWarning,
    refreshUsage,
  } = useApiUsageMonitor();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Determine which warnings to show
  const displayWarnings = criticalOnly ? criticalWarnings : warnings;

  // Don't render if no warnings or minimized
  if (displayWarnings.length === 0 || isMinimized) {
    // Show small indicator if minimized with warnings
    if (isMinimized && displayWarnings.length > 0) {
      return (
        <button
          className={`usage-warning-minimized ${position}`}
          onClick={() => setIsMinimized(false)}
          title={`${displayWarnings.length} API usage warning(s)`}
        >
          <span className="warning-icon">⚠️</span>
          <span className="warning-count">{displayWarnings.length}</span>
        </button>
      );
    }
    return null;
  }

  // Get the most severe warning for the banner color
  const severity = displayWarnings[0]?.level || 'info';

  return (
    <div className={`usage-warning-banner ${severity} ${position} ${compact ? 'compact' : ''}`}>
      <div className="banner-header">
        <div className="banner-title">
          <span className="banner-icon">
            {severity === 'exceeded' ? '🚨' :
             severity === 'critical' ? '⚠️' :
             severity === 'warning' ? '⚡' : 'ℹ️'}
          </span>
          <span className="banner-text">
            {severity === 'exceeded' ? 'API Quota Exceeded' :
             severity === 'critical' ? 'Critical: API Quota Low' :
             severity === 'warning' ? 'API Usage Warning' : 'API Usage Notice'}
          </span>
          <span className="warning-count-badge">{displayWarnings.length}</span>
        </div>

        <div className="banner-actions">
          {!compact && (
            <button
              className="expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
          <button
            className="refresh-btn"
            onClick={refreshUsage}
            disabled={isLoading}
            title="Refresh usage data"
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
          <button
            className="minimize-btn"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            ➖
          </button>
        </div>
      </div>

      {/* Summary line (always visible) */}
      <div className="banner-summary">
        {displayWarnings.slice(0, 2).map((w, i) => (
          <span key={w.provider} className={`summary-item ${w.level}`}>
            {w.icon} {w.displayName}: {Math.round(w.percentage * 100)}%
            {i < Math.min(displayWarnings.length - 1, 1) && ' • '}
          </span>
        ))}
        {displayWarnings.length > 2 && (
          <span className="summary-more">+{displayWarnings.length - 2} more</span>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="banner-details">
          {displayWarnings.map(warning => {
            const config = API_PROVIDER_QUOTAS[warning.provider];
            const usage = snapshot?.providers[warning.provider];

            return (
              <div key={warning.provider} className={`warning-item ${warning.level}`}>
                <div className="warning-main">
                  <span className="warning-provider">
                    {warning.icon} {warning.displayName}
                  </span>
                  <div className="warning-progress">
                    <div
                      className="progress-bar"
                      style={{ width: `${Math.min(warning.percentage * 100, 100)}%` }}
                    />
                  </div>
                  <span className="warning-stats">
                    {usage && config && (
                      <>
                        {formatQuotaValue(usage.used, config.quotaType)} / {formatQuotaValue(config.monthlyQuota, config.quotaType)}
                      </>
                    )}
                  </span>
                </div>

                <div className="warning-message">{warning.message}</div>

                {warning.fallbackAvailable && (
                  <div className="warning-fallback">
                    ✓ Fallback available: {warning.fallbackProvider}
                  </div>
                )}

                {usage?.estimatedDaysRemaining !== null && usage?.estimatedDaysRemaining !== undefined && (
                  <div className="warning-estimate">
                    At current rate: ~{usage.estimatedDaysRemaining} days until quota exhausted
                  </div>
                )}

                <button
                  className="dismiss-btn"
                  onClick={() => dismissWarning(warning.provider)}
                  title="Dismiss this warning"
                >
                  ✕
                </button>
              </div>
            );
          })}

          {onViewDashboard && (
            <button className="view-dashboard-btn" onClick={onViewDashboard}>
              📊 View Full Cost Dashboard
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UsageWarningBanner;
