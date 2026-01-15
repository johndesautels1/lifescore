/**
 * LIFE SCORE™ Tab Navigation
 * Horizontal toolbar tabs for section navigation
 */

import React from 'react';
import './TabNavigation.css';

export type TabId = 'compare' | 'results' | 'visuals' | 'saved' | 'about';

export interface Tab {
  id: TabId;
  label: string;
  icon: string;
  disabled?: boolean;
  badge?: string | number;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasResults: boolean;
  savedCount?: number;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  hasResults,
  savedCount = 0
}) => {
  const tabs: Tab[] = [
    {
      id: 'compare',
      label: 'Compare',
      icon: '🔍',
    },
    {
      id: 'results',
      label: 'Results',
      icon: '📊',
      disabled: !hasResults,
    },
    {
      id: 'visuals',
      label: 'Visuals',
      icon: '📈',
      disabled: !hasResults,
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: '💾',
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'about',
      label: 'About',
      icon: 'ℹ️',
    },
  ];

  return (
    <nav className="tab-navigation">
      <div className="tab-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="tab-badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default TabNavigation;
