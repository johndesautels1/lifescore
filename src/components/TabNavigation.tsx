/**
 * LIFE SCORE™ Tab Navigation
 * Horizontal toolbar tabs for section navigation
 */

import React, { startTransition } from 'react';
import './TabNavigation.css';

export type TabId = 'compare' | 'results' | 'visuals' | 'olivia' | 'saved' | 'judges-report' | 'about';

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
  hasResults?: boolean; // FIX #55: Now optional, kept for backwards compatibility
  savedCount?: number;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  hasResults: _hasResults, // FIX #55: Unused - tabs always accessible
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
      // FIX #55: Always accessible - ResultsTab handles no-data state with saved report selector
    },
    {
      id: 'judges-report',
      label: 'Judges Report',
      icon: '📋',
      // Always accessible - JudgeTab handles no-data state with saved report selector
    },
    {
      id: 'visuals',
      label: 'Visuals',
      icon: '📈',
      // FIX #55: Always accessible - VisualsTab handles no-data state with saved report selector
    },
    {
      id: 'olivia',
      label: 'Ask Olivia',
      icon: '🎙️',
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
            onClick={() => {
              if (!tab.disabled) {
                startTransition(() => {
                  onTabChange(tab.id);
                });
              }
            }}
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
