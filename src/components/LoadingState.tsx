/**
 * LIFE SCORE™ Loading State Component
 * Shows progress while analyzing 100 metrics
 */

import React from 'react';
import type { CategoryId } from '../types/metrics';
import { CATEGORIES } from '../shared/metrics';
import './LoadingState.css';

interface LoadingStateProps {
  currentCategory?: CategoryId;
  metricsProcessed: number;
  totalMetrics: number;
  currentMetric?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  currentCategory,
  metricsProcessed,
  totalMetrics,
  currentMetric
}) => {
  const progressPercent = totalMetrics > 0 
    ? Math.round((metricsProcessed / totalMetrics) * 100) 
    : 0;
  
  const currentCategoryData = currentCategory 
    ? CATEGORIES.find(c => c.id === currentCategory)
    : null;

  return (
    <div className="loading-state card">
      <div className="loading-header">
        <div className="loading-icon">🔍</div>
        <h2>Analyzing Legal &amp; Lived Freedom Metrics</h2>
        <p>Using Multiple LLMs with proprietary weighted average LIFE score technology</p>
      </div>
      
      <div className="progress-section">
        <div className="progress-stats">
          <span className="progress-count">
            {metricsProcessed} of {totalMetrics} metrics
          </span>
          <span className="progress-percent">{progressPercent}%</span>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      {currentCategoryData && (
        <div className="current-category">
          <span className="category-icon">{currentCategoryData.icon}</span>
          <span className="category-name">{currentCategoryData.name}</span>
        </div>
      )}
      
      {currentMetric && (
        <div className="current-metric">
          <span className="metric-label">Verifying:</span>
          <span className="metric-name">{currentMetric}</span>
        </div>
      )}
      
      <div className="loading-categories">
        {CATEGORIES.map((category) => {
          const isComplete = currentCategory 
            ? CATEGORIES.findIndex(c => c.id === currentCategory) > CATEGORIES.findIndex(c => c.id === category.id)
            : false;
          const isCurrent = category.id === currentCategory;
          
          return (
            <div 
              key={category.id}
              className={`category-pill ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <span className="pill-icon">{category.icon}</span>
              <span className="pill-name">{category.shortName}</span>
              {isComplete && <span className="pill-check">✓</span>}
            </div>
          );
        })}
      </div>
      
      <div className="loading-disclaimer">
        <p>
          Results may take 2-5 minutes for comprehensive analysis.
        </p>
      </div>
    </div>
  );
};

export default LoadingState;
