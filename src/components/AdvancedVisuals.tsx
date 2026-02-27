/**
 * LIFE SCORE™ Advanced Visuals
 * Chart and graph visualizations for comparison data
 *
 * Visualization Types (to be implemented):
 * - Spider/Radar Chart: Category comparison
 * - Bar Charts: Metric-by-metric comparison
 * - Line Charts: Score distribution across categories
 * - Speedometer/Gauge: Overall freedom score
 * - Pie Charts: Category breakdown
 * - Data Tables: Detailed metric tables
 */

import React, { useState, useMemo } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import { CATEGORIES } from '../shared/metrics';
import { getMetricDisplayName } from '../shared/metricDisplayNames';
import './AdvancedVisuals.css';

// ============================================================================
// DATA STRUCTURES FOR VISUALIZATIONS
// ============================================================================

export interface SpiderChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

export interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

export interface GaugeData {
  value: number;
  min: number;
  max: number;
  label: string;
  color: string;
}

export interface PieChartData {
  labels: string[];
  data: number[];
  colors: string[];
}

export interface TableData {
  headers: string[];
  rows: (string | number)[][];
}

// Visual type selection
type VisualType = 'spider' | 'bar' | 'line' | 'gauge' | 'pie' | 'table';

interface AdvancedVisualsProps {
  result: EnhancedComparisonResult | null;
}

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Transform comparison result to Spider/Radar chart data
 * Shows category scores for both cities
 */
export function prepareSpiderChartData(result: EnhancedComparisonResult): SpiderChartData {
  const labels = result.city1.categories.map(cat => {
    const category = CATEGORIES.find(c => c.id === cat.categoryId);
    return category?.name || cat.categoryId;
  });

  return {
    labels,
    datasets: [
      {
        label: result.city1.city,
        data: result.city1.categories.map(cat => Math.round(cat.averageConsensusScore ?? 0)),
        color: '#D4AF37', // Gold for city1
      },
      {
        label: result.city2.city,
        data: result.city2.categories.map(cat => Math.round(cat.averageConsensusScore ?? 0)),
        color: '#0047AB', // Cobalt for city2
      },
    ],
  };
}

/**
 * Transform comparison result to Bar chart data
 * Shows top differences between cities
 */
export function prepareBarChartData(result: EnhancedComparisonResult, topN: number = 10): BarChartData {
  // Flatten all metrics with their differences
  const allMetrics: { id: string; name: string; city1: number; city2: number; diff: number }[] = [];

  result.city1.categories.forEach((cat, catIdx) => {
    cat.metrics.forEach((metric, metricIdx) => {
      const city2Score = result.city2.categories[catIdx].metrics[metricIdx].consensusScore ?? 0;
      const city1Score = metric.consensusScore ?? 0;
      allMetrics.push({
        id: metric.metricId,
        name: getMetricDisplayName(metric.metricId),
        city1: city1Score,
        city2: city2Score,
        diff: Math.abs(city1Score - city2Score),
      });
    });
  });

  // Sort by difference and take top N
  const topMetrics = allMetrics.sort((a, b) => b.diff - a.diff).slice(0, topN);

  return {
    labels: topMetrics.map(m => m.name),
    datasets: [
      {
        label: result.city1.city,
        data: topMetrics.map(m => Math.round(m.city1)),
        color: '#D4AF37',
      },
      {
        label: result.city2.city,
        data: topMetrics.map(m => Math.round(m.city2)),
        color: '#0047AB',
      },
    ],
  };
}

/**
 * Transform comparison result to Line chart data
 * Shows score progression across all metrics in a category
 */
export function prepareLineChartData(result: EnhancedComparisonResult, categoryId?: string): LineChartData {
  const categoryIndex = categoryId
    ? result.city1.categories.findIndex(c => c.categoryId === categoryId)
    : 0;

  const category1 = result.city1.categories[categoryIndex];
  const category2 = result.city2.categories[categoryIndex];

  if (!category1 || !category2) {
    return { labels: [], datasets: [] };
  }

  return {
    labels: category1.metrics.map(m => getMetricDisplayName(m.metricId)),
    datasets: [
      {
        label: result.city1.city,
        data: category1.metrics.map(m => Math.round(m.consensusScore ?? 0)),
        color: '#D4AF37',
      },
      {
        label: result.city2.city,
        data: category2.metrics.map(m => Math.round(m.consensusScore ?? 0)),
        color: '#0047AB',
      },
    ],
  };
}

/**
 * Transform comparison result to Gauge/Speedometer data
 * Shows overall freedom score for a city
 */
export function prepareGaugeData(result: EnhancedComparisonResult, cityNum: 1 | 2): GaugeData {
  const city = cityNum === 1 ? result.city1 : result.city2;
  const isWinner = (result.winner === 'city1' && cityNum === 1) ||
                   (result.winner === 'city2' && cityNum === 2);

  return {
    value: city.totalConsensusScore,
    min: 0,
    max: 100,
    label: city.city,
    color: isWinner ? '#D4AF37' : '#0047AB',
  };
}

/**
 * Transform comparison result to Pie chart data
 * Shows category score distribution for a city
 */
export function preparePieChartData(result: EnhancedComparisonResult, cityNum: 1 | 2): PieChartData {
  const city = cityNum === 1 ? result.city1 : result.city2;

  const categoryColors = [
    '#D4AF37', // Gold
    '#0047AB', // Cobalt
    '#F7931E', // Orange
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#EC4899', // Pink
  ];

  return {
    labels: city.categories.map(cat => {
      const category = CATEGORIES.find(c => c.id === cat.categoryId);
      return category?.name || cat.categoryId;
    }),
    data: city.categories.map(cat => Math.round(cat.averageConsensusScore ?? 0)),
    colors: categoryColors,
  };
}

/**
 * Transform comparison result to Table data
 * Full metric breakdown
 */
export function prepareTableData(result: EnhancedComparisonResult): TableData {
  const headers = ['Category', 'Metric', result.city1.city, result.city2.city, 'Difference', 'Winner'];
  const rows: (string | number)[][] = [];

  result.city1.categories.forEach((cat, catIdx) => {
    const categoryName = CATEGORIES.find(c => c.id === cat.categoryId)?.name || cat.categoryId;

    cat.metrics.forEach((metric, metricIdx) => {
      const city2Score = result.city2.categories[catIdx].metrics[metricIdx].consensusScore ?? 0;
      const city1Score = metric.consensusScore ?? 0;
      const diff = city1Score - city2Score;
      const winner = diff > 0 ? result.city1.city : diff < 0 ? result.city2.city : 'Tie';

      rows.push([
        categoryName,
        getMetricDisplayName(metric.metricId),
        Math.round(city1Score),
        Math.round(city2Score),
        (diff > 0 ? '+' : '') + Math.round(diff),
        winner,
      ]);
    });
  });

  return { headers, rows };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdvancedVisuals: React.FC<AdvancedVisualsProps> = ({ result }) => {
  const [activeVisual, setActiveVisual] = useState<VisualType>('spider');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Prepare all chart data
  const chartData = useMemo(() => {
    if (!result) return null;

    return {
      spider: prepareSpiderChartData(result),
      bar: prepareBarChartData(result, 10),
      line: prepareLineChartData(result, selectedCategory || undefined),
      gauge1: prepareGaugeData(result, 1),
      gauge2: prepareGaugeData(result, 2),
      pie1: preparePieChartData(result, 1),
      pie2: preparePieChartData(result, 2),
      table: prepareTableData(result),
    };
  }, [result, selectedCategory]);

  if (!result) {
    return (
      <div className="advanced-visuals card">
        <div className="visuals-empty">
          <span className="empty-icon">📈</span>
          <h3>No Data Available</h3>
          <p>Run a comparison to see advanced visualizations</p>
        </div>
      </div>
    );
  }

  const visualTypes: { id: VisualType; label: string; icon: string }[] = [
    { id: 'spider', label: 'Radar', icon: '🕸️' },
    { id: 'bar', label: 'Bar', icon: '📊' },
    { id: 'line', label: 'Line', icon: '📈' },
    { id: 'gauge', label: 'Gauge', icon: '⏱️' },
    { id: 'pie', label: 'Pie', icon: '🥧' },
    { id: 'table', label: 'Table', icon: '📋' },
  ];

  return (
    <div className="advanced-visuals card">
      <div className="visuals-header">
        <h3 className="section-title">📈 Advanced Visuals</h3>
        <p className="visuals-subtitle">
          Interactive charts comparing {result.city1.city} vs {result.city2.city}
        </p>
      </div>

      {/* Visual Type Selector */}
      <div className="visual-type-selector">
        {visualTypes.map((type) => (
          <button
            key={type.id}
            className={`visual-type-btn ${activeVisual === type.id ? 'active' : ''}`}
            onClick={() => setActiveVisual(type.id)}
          >
            <span className="type-icon">{type.icon}</span>
            <span className="type-label">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Category Filter (for line chart) */}
      {activeVisual === 'line' && (
        <div className="category-filter">
          <label>Category:</label>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Chart Container - Placeholder for actual charts */}
      <div className="chart-container">
        {activeVisual === 'spider' && chartData && (
          <div className="chart-placeholder spider-placeholder">
            <div className="placeholder-icon">🕸️</div>
            <h4>Radar Chart</h4>
            <p>Category comparison across {chartData.spider.labels.length} dimensions</p>
            <div className="data-preview">
              <div className="preview-legend">
                <span className="legend-item city1">● {chartData.spider.datasets[0].label}</span>
                <span className="legend-item city2">● {chartData.spider.datasets[1].label}</span>
              </div>
              <div className="preview-values">
                {chartData.spider.labels.map((label, i) => (
                  <div key={label} className="preview-row">
                    <span className="preview-label">{label}</span>
                    <span className="preview-score city1">{chartData.spider.datasets[0].data[i]}</span>
                    <span className="preview-score city2">{chartData.spider.datasets[1].data[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeVisual === 'bar' && chartData && (
          <div className="chart-placeholder bar-placeholder">
            <div className="placeholder-icon">📊</div>
            <h4>Bar Chart</h4>
            <p>Top {chartData.bar.labels.length} metrics with biggest differences</p>
            <div className="data-preview">
              <div className="preview-legend">
                <span className="legend-item city1">● {chartData.bar.datasets[0].label}</span>
                <span className="legend-item city2">● {chartData.bar.datasets[1].label}</span>
              </div>
              <div className="mini-bars">
                {chartData.bar.labels.slice(0, 5).map((label, i) => (
                  <div key={label} className="mini-bar-row">
                    <span className="bar-label">{label}</span>
                    <div className="bar-visual">
                      <div
                        className="bar city1"
                        style={{ width: `${chartData.bar.datasets[0].data[i]}%` }}
                      />
                      <div
                        className="bar city2"
                        style={{ width: `${chartData.bar.datasets[1].data[i]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeVisual === 'line' && chartData && (
          <div className="chart-placeholder line-placeholder">
            <div className="placeholder-icon">📈</div>
            <h4>Line Chart</h4>
            <p>Score progression across metrics in selected category</p>
            <div className="data-preview">
              <div className="preview-legend">
                <span className="legend-item city1">● {chartData.line.datasets[0]?.label}</span>
                <span className="legend-item city2">● {chartData.line.datasets[1]?.label}</span>
              </div>
              <div className="line-preview">
                {chartData.line.labels.slice(0, 8).map((label, i) => (
                  <div key={label} className="line-point">
                    <span className="point-label">{label}</span>
                    <span className="point-value city1">{chartData.line.datasets[0]?.data[i]}</span>
                    <span className="point-value city2">{chartData.line.datasets[1]?.data[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeVisual === 'gauge' && chartData && (
          <div className="chart-placeholder gauge-placeholder">
            <div className="placeholder-icon">⏱️</div>
            <h4>Freedom Gauges</h4>
            <p>Overall freedom score speedometers</p>
            <div className="gauge-preview">
              <div className="gauge-item">
                <div className="gauge-circle city1">
                  <span className="gauge-value">{chartData.gauge1.value}</span>
                </div>
                <span className="gauge-label">{chartData.gauge1.label}</span>
              </div>
              <div className="gauge-vs">VS</div>
              <div className="gauge-item">
                <div className="gauge-circle city2">
                  <span className="gauge-value">{chartData.gauge2.value}</span>
                </div>
                <span className="gauge-label">{chartData.gauge2.label}</span>
              </div>
            </div>
          </div>
        )}

        {activeVisual === 'pie' && chartData && (
          <div className="chart-placeholder pie-placeholder">
            <div className="placeholder-icon">🥧</div>
            <h4>Category Distribution</h4>
            <p>Score breakdown by category for each city</p>
            <div className="pie-preview">
              <div className="pie-city">
                <h5>{result.city1.city}</h5>
                <div className="pie-segments">
                  {chartData.pie1.labels.map((label, i) => (
                    <div key={label} className="segment-row">
                      <span
                        className="segment-color"
                        style={{ backgroundColor: chartData.pie1.colors[i] }}
                      />
                      <span className="segment-label">{label}</span>
                      <span className="segment-value">{chartData.pie1.data[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pie-city">
                <h5>{result.city2.city}</h5>
                <div className="pie-segments">
                  {chartData.pie2.labels.map((label, i) => (
                    <div key={label} className="segment-row">
                      <span
                        className="segment-color"
                        style={{ backgroundColor: chartData.pie2.colors[i] }}
                      />
                      <span className="segment-label">{label}</span>
                      <span className="segment-value">{chartData.pie2.data[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeVisual === 'table' && chartData && (
          <div className="chart-placeholder table-placeholder">
            <div className="placeholder-icon">📋</div>
            <h4>Data Table</h4>
            <p>Complete metric breakdown ({chartData.table.rows.length} metrics)</p>
            <div className="table-preview">
              <table>
                <thead>
                  <tr>
                    {chartData.table.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.table.rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {chartData.table.rows.length > 5 && (
                <div className="table-more">
                  + {chartData.table.rows.length - 5} more metrics...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Coming Soon Notice */}
      <div className="visuals-notice">
        <span className="notice-icon">🚧</span>
        <span>Interactive charts coming soon. Data structure ready for visualization library integration.</span>
      </div>
    </div>
  );
};

export default AdvancedVisuals;
