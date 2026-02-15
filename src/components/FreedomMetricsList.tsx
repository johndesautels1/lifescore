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
  winnerCity: string;
  loserCity: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric, winnerCity, loserCity }) => {
  const scoreDiff = metric.winnerScore - metric.loserScore;

  return (
    <div className="freedom-metric-card">
      <div className="metric-header">
        <span className="metric-icon">{metric.metricIcon}</span>
        <span className="metric-name">{metric.metricName}</span>
        <div className="metric-scores">
          <span className="score-city-group winner">
            <span className="score-city-label">{winnerCity}</span>
            <span className="winner-score">{metric.winnerScore.toFixed(0)}</span>
          </span>
          <span className="score-separator">vs</span>
          <span className="score-city-group loser">
            <span className="score-city-label">{loserCity}</span>
            <span className="loser-score">{metric.loserScore.toFixed(0)}</span>
          </span>
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
  winnerCity,
  loserCity,
  categoryName,
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
      <div className="freedom-section-header">
        <span className="section-winner-label">{winnerCity}</span>
        <span className="section-category-context">leads in {categoryName}</span>
      </div>
      <div className="freedom-score-legend">
        <span className="legend-winner">{winnerCity}</span>
        <span className="legend-separator">vs</span>
        <span className="legend-loser">{loserCity}</span>
      </div>
      {sortedMetrics.map((metric) => (
        <MetricCard
          key={metric.metricId}
          metric={metric}
          winnerCity={winnerCity}
          loserCity={loserCity}
        />
      ))}
    </div>
  );
};

export default FreedomMetricsList;
