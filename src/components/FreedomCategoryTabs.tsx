/**
 * LIFE SCORE - Freedom Category Tabs Component
 *
 * 6-tab navigation for the Court Order Freedom Education section.
 * Shows category icons and names with glassmorphic styling.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React from 'react';
import type { CategoryId, FreedomCategoryTabsProps } from '../types/freedomEducation';
import { FREEDOM_CATEGORIES } from '../types/freedomEducation';
import './FreedomCategoryTabs.css';

// ============================================================================
// COMPONENT
// ============================================================================

const FreedomCategoryTabs: React.FC<FreedomCategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
  categories,
}) => {
  // Get count of winning metrics per category
  const getMetricCount = (categoryId: CategoryId): number => {
    const categoryData = categories.find(c => c.categoryId === categoryId);
    return categoryData?.winningMetrics?.length || 0;
  };

  return (
    <div className="freedom-tabs-container">
      <div className="freedom-tabs">
        {FREEDOM_CATEGORIES.map((category) => {
          const metricCount = getMetricCount(category.id);
          const isActive = activeCategory === category.id;
          const hasMetrics = metricCount > 0;

          return (
            <button
              key={category.id}
              className={`freedom-tab ${isActive ? 'active' : ''} ${!hasMetrics ? 'empty' : ''}`}
              onClick={() => onCategoryChange(category.id)}
              disabled={!hasMetrics}
              title={hasMetrics ? `${category.name} - ${metricCount} winning metrics` : `${category.name} - No advantages`}
            >
              <span className="tab-icon">{category.icon}</span>
              <span className="tab-name">{category.shortName}</span>
              {hasMetrics && (
                <span className="tab-count">{metricCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FreedomCategoryTabs;
