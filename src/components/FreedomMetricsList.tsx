/**
 * LIFE SCORE - Freedom Metrics List Component
 *
 * Displays winning metrics for a category with scores and
 * AI-generated real-world examples.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React from 'react';
import type { FreedomMetricsListProps, FreedomExample } from '../types/freedomEducation';
import './FreedomMetricsList.css';

// ============================================================================
// METRIC CARD SUB-COMPONENT
// ============================================================================

interface MetricCardProps {
  metric: FreedomExample;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const scoreDiff = metric.winnerScore - metric.loserScore;

  return (
    <div className="freedom-metric-card">
      <div className="metric-header">
        <span className="metric-icon">{metric.metricIcon}</span>
        <span className="metric-name">{metric.metricName}</span>
        <div className="metric-scores">
          <span className="winner-score">{metric.winnerScore.toFixed(0)}</span>
          <span className="score-separator">vs</span>
          <span className="loser-score">{metric.loserScore.toFixed(0)}</span>
        </div>
      </div>
      <div className="metric-example">
        <span className="example-icon">💡</span>
        <span className="example-text">{metric.realWorldExample}</span>
      </div>
      {scoreDiff >= 20 && (
        <div className="metric-advantage">
          +{scoreDiff.toFixed(0)} advantage
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const FreedomMetricsList: React.FC<FreedomMetricsListProps> = ({
  metrics,
  winnerCity: _winnerCity, // Reserved for future use
}) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="freedom-metrics-empty">
        <span className="empty-icon">📊</span>
        <p>No winning metrics in this category</p>
      </div>
    );
  }

  // Sort by score difference (biggest advantages first)
  const sortedMetrics = [...metrics].sort(
    (a, b) => (b.winnerScore - b.loserScore) - (a.winnerScore - a.loserScore)
  );

  return (
    <div className="freedom-metrics-list">
      {sortedMetrics.map((metric) => (
        <MetricCard
          key={metric.metricId}
          metric={metric}
        />
      ))}
    </div>
  );
};

export default FreedomMetricsList;
