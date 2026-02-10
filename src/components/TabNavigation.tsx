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

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(t => t.id === tabs[index].id);
    let nextTab: Tab | undefined;

    if (e.key === 'ArrowRight') {
      nextTab = enabledTabs[(currentEnabledIndex + 1) % enabledTabs.length];
    } else if (e.key === 'ArrowLeft') {
      nextTab = enabledTabs[(currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length];
    } else if (e.key === 'Home') {
      nextTab = enabledTabs[0];
    } else if (e.key === 'End') {
      nextTab = enabledTabs[enabledTabs.length - 1];
    }

    if (nextTab) {
      e.preventDefault();
      startTransition(() => {
        onTabChange(nextTab!.id);
      });
      const tabEl = document.querySelector(`[data-tab-id="${nextTab.id}"]`) as HTMLElement;
      tabEl?.focus();
    }
  };

  return (
    <nav className="tab-navigation" aria-label="Main navigation">
      <div className="tab-list" role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!tab.disabled) {
                startTransition(() => {
                  onTabChange(tab.id);
                });
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={tab.disabled}
            aria-selected={activeTab === tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
          >
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="tab-badge" aria-label={`${tab.badge} items`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default TabNavigation;
