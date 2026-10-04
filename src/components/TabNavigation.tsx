/**
 * LIFE SCORE™ Tab Navigation
 * Horizontal toolbar tabs for section navigation.
 *
 * Each tab carries a rendered 3D icon (src/components/icons3d) that tilts toward
 * the pointer, lifts off its shadow and catches a glint on its own metal; the
 * chosen tab floats on a pool of gold light, and a gold marker slides to it.
 * John, 4 Oct 2026: the emoji tabs looked "cheap 2d and cartoonish"; he approved
 * this look from the sample ("yes approved", "i love your idea").
 */

import React, { startTransition, useLayoutEffect, useRef } from 'react';
import Icon3D from './icons3d/Icon3D';
import { ICONS_3D, type Icon3DName } from './icons3d/icons3d';
import { useSpringTilt } from '../hooks/useSpringTilt';
import './TabNavigation.css';

export type TabId = 'compare' | 'results' | 'visuals' | 'olivia' | 'saved' | 'judges-report' | 'about';

export interface Tab {
  id: TabId;
  label: string;
  icon: Icon3DName;
  disabled?: boolean;
  badge?: string | number;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasResults?: boolean; // FIX #55: Now optional, kept for backwards compatibility
  savedCount?: number;
}

/** Tilt at a tab's edge, in degrees. */
const TAB_TILT_DEG = 18;
/** The gold marker spans this share of the chosen tab's width. */
const BEAM_SHARE = 0.62;

interface TabButtonProps {
  tab: Tab;
  active: boolean;
  onSelect: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/** One tab: its 3D icon on a stage (light pool, contact shadow, glint), its label, its badge. */
const TabButton: React.FC<TabButtonProps> = ({ tab, active, onSelect, onKeyDown }) => {
  const tiltRef = useSpringTilt<HTMLButtonElement>(TAB_TILT_DEG);
  const glintStyle = { '--icon': `url("${ICONS_3D[tab.icon]}")` } as React.CSSProperties;

  return (
    <button
      ref={tiltRef}
      data-tab-id={tab.id}
      className={`tab-item ${active ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      disabled={tab.disabled}
      aria-selected={active}
      role="tab"
      id={`tab-${tab.id}`}
      aria-controls={`tabpanel-${tab.id}`}
      tabIndex={active ? 0 : -1}
    >
      <span className="tab-stage" aria-hidden="true">
        <span className="tab-pool" />
        <span className="tab-contact" />
        <span className="tab-obj">
          <span className="tab-floater">
            <Icon3D name={tab.icon} size={44} className="tab-icon" />
            <span className="tab-glint" style={glintStyle} />
          </span>
        </span>
      </span>
      <span className="tab-label">{tab.label}</span>
      {tab.badge !== undefined && (
        <span className="tab-badge" aria-label={`${tab.badge} items`}>{tab.badge}</span>
      )}
    </button>
  );
};

const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  hasResults: _hasResults, // FIX #55: Unused - tabs always accessible
  savedCount = 0
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const beamRef = useRef<HTMLSpanElement>(null);

  const tabs: Tab[] = [
    {
      id: 'compare',
      label: 'Compare',
      icon: 'magnifier',
    },
    {
      id: 'results',
      label: 'Results',
      icon: 'chart',
      // FIX #55: Always accessible - ResultsTab handles no-data state with saved report selector
    },
    {
      id: 'judges-report',
      label: 'Judges Report',
      icon: 'document',
      // Always accessible - JudgeTab handles no-data state with saved report selector
    },
    {
      id: 'visuals',
      label: 'Visuals',
      icon: 'picture',
      // FIX #55: Always accessible - VisualsTab handles no-data state with saved report selector
    },
    {
      id: 'olivia',
      label: 'Ask Olivia',
      icon: 'mic',
    },
    {
      id: 'saved',
      label: 'Saved',
      icon: 'bookmark',
      badge: savedCount > 0 ? savedCount : undefined,
    },
    {
      id: 'about',
      label: 'About',
      icon: 'compass',
    },
  ];

  // The gold marker follows the chosen tab: placed from the tab's own box after
  // layout, and again whenever the bar changes width. A direct style write, so
  // moving it never re-renders the bar.
  useLayoutEffect(() => {
    const list = listRef.current;
    const beam = beamRef.current;
    if (!list || !beam) return;
    const place = () => {
      const on = list.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
      if (!on) return;
      const width = on.offsetWidth * BEAM_SHARE;
      beam.style.width = `${width.toFixed(1)}px`;
      beam.style.transform = `translateX(${(on.offsetLeft + (on.offsetWidth - width) / 2).toFixed(1)}px)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeTab]);

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
      const target = nextTab;
      startTransition(() => {
        onTabChange(target.id);
      });
      const tabEl = document.querySelector(`[data-tab-id="${target.id}"]`) as HTMLElement;
      tabEl?.focus();
    }
  };

  return (
    <nav className="tab-navigation" aria-label="Main navigation">
      <div className="tab-list" role="tablist" ref={listRef}>
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onSelect={() => {
              if (!tab.disabled) {
                startTransition(() => {
                  onTabChange(tab.id);
                });
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
        ))}
        <span className="tab-beam" ref={beamRef} aria-hidden="true" />
      </div>
    </nav>
  );
};

export default TabNavigation;
