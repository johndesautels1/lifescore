/**
 * LIFE SCORE™ Dealbreakers Panel
 * Let users mark must-have metrics that will trigger warnings
 */

import React, { useState, useEffect, useRef } from 'react';
import { CATEGORIES, ALL_METRICS } from '../shared/metrics';
import { saveUserPreferenceToDb } from '../services/savedComparisons';
import './DealbreakersPanel.css';

// Metric icons mapping
const METRIC_ICONS: Record<string, string> = {
  'Cannabis': '🌿', 'Alcohol Laws': '🍺', 'Gambling': '🎰', 'Sex Work Laws': '💋',
  'Drug Penalties': '💊', 'Abortion Access': '⚕️', 'LGBTQ+ Rights': '🏳️‍🌈',
  'Assisted Dying': '🕊️', 'Smoking Laws': '🚬', 'Public Drinking': '🍻',
  'Helmet Laws': '⛑️', 'Seatbelt Laws': '🚗', 'Jaywalking': '🚶', 'Curfews': '🌙',
  'Noise Laws': '🔊', 'HOA Prevalence': '🏘️', 'HOA Power': '📋', 'Property Tax': '💰',
  'Rent Control': '🔒', 'Eviction Protection': '🛡️', 'Zoning': '🗺️', 'Permits': '📝',
  'STR/Airbnb': '🏠', 'ADU Laws': '🏗️', 'Home Business': '💼', 'Eminent Domain': '⚖️',
  'Squatter Rights': '🏚️', 'Historic Rules': '🏛️', 'Foreign Ownership': '🌐',
  'Transfer Tax': '💸', 'Lawn Rules': '🌱', 'Exterior Rules': '🎨', 'Fence Rules': '🧱',
  'Parking Rules': '🅿️', 'Pet Rules': '🐕', 'Business License': '📄',
  'Occupation License': '🎓', 'Min Wage': '💵', 'Right to Work': '✊',
  'Employment Laws': '📜', 'Paid Leave': '🏖️', 'Parental Leave': '👶',
  'Non-Compete': '📑', 'Corp Tax': '🏢', 'Income Tax': '💳', 'Sales Tax': '🛒',
  'Gig Work Laws': '📱', 'Work Visa': '🛂', 'Remote Work': '💻', 'Overtime Rules': '⏰',
  'Union Rights': '🤝', 'Safety Standards': '🦺', 'Anti-Discrimination': '⚖️',
  'Startup Ease': '🚀', 'Food Trucks': '🚚', 'Contractor License': '🔧',
  'Health Mandate': '🏥', 'Tip Credit': '💵', 'Banking Access': '🏦', 'Crypto Laws': '₿',
  'Transit Quality': '🚇', 'Walkability': '👟', 'Bike Infra': '🚲', 'Car Dependency': '🚗',
  'Rideshare': '🚕', 'Speed Limits': '⚡', 'Traffic Cameras': '📷', 'Toll Roads': '🛣️',
  'Vehicle Inspection': '🔍', 'License Reqs': '🪪', 'DUI Laws': '🍸', 'E-Mobility': '🛴',
  'Airport Access': '✈️', 'Traffic': '🚦', 'Incarceration': '🔒', 'Police Density': '👮',
  'Asset Forfeiture': '💸', 'Mandatory Mins': '⏱️', 'Bail System': '🏛️',
  'Police Oversight': '👁️', 'Qualified Immunity': '🛡️', 'Legal Costs': '💳',
  'Court Efficiency': '⚖️', 'Jury Rights': '🧑‍⚖️', 'Surveillance': '📹',
  'Search Protections': '🔐', 'Death Penalty': '⚠️', 'Prison Standards': '🏢',
  'Expungement': '📋', 'Free Speech': '🗣️', 'Press Freedom': '📰',
  'Internet Freedom': '🌐', 'Hate Speech Laws': '🚫', 'Protest Rights': '✊',
  'Religious Freedom': '🙏', 'Data Privacy': '🔏', 'Dress Freedom': '👔',
  'Tolerance': '🤝', 'Defamation Laws': '⚖️'
};

const STORAGE_KEY = 'lifescore_dealbreakers';

interface DealbreakersProps {
  onDealbreakersChange: (dealbreakers: string[]) => void;
  initialDealbreakers?: string[];
}

export const DealbreakersPanel: React.FC<DealbreakersProps> = ({
  onDealbreakersChange,
  initialDealbreakers = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDealbreakers, setSelectedDealbreakers] = useState<string[]>(initialDealbreakers);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  // Bug audit ML6 (as in WeightPresets): the save effect ran on the first render,
  // before the saved list had loaded, and wrote the starting list to the database,
  // then the real one: two racing writes on every visit. Saving now waits for the
  // load, and skips a write when nothing changed from what was loaded or saved.
  const [hydrated, setHydrated] = useState(false);
  const lastSavedRef = useRef<string | undefined>(undefined);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    lastSavedRef.current = stored ?? undefined;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSelectedDealbreakers(parsed);
        onDealbreakersChange(parsed);
      } catch {
        // Invalid JSON, ignore
      }
    }
    // The loaded list reaches state on the next render; saving may start then.
    setHydrated(true);
  }, []);

  // Save to localStorage + database when changed
  useEffect(() => {
    if (!hydrated) return;
    onDealbreakersChange(selectedDealbreakers);
    const json = JSON.stringify(selectedDealbreakers);
    if (json === lastSavedRef.current) return;
    lastSavedRef.current = json;
    try {
      localStorage.setItem(STORAGE_KEY, json);
    } catch (err) {
      console.error('[DealbreakersPanel] Failed to save dealbreakers:', err);
    }
    saveUserPreferenceToDb('dealbreakers', selectedDealbreakers);
  }, [hydrated, selectedDealbreakers, onDealbreakersChange]);

  const toggleDealbreaker = (metricId: string) => {
    setSelectedDealbreakers(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else if (prev.length < 5) {
        return [...prev, metricId];
      }
      return prev; // Max 5 dealbreakers
    });
  };

  const clearAll = () => {
    setSelectedDealbreakers([]);
  };

  const getMetricsByCategory = (categoryId: string) => {
    return ALL_METRICS
      .filter(m => m.categoryId === categoryId)
      .sort((a, b) => a.shortName.localeCompare(b.shortName));
  };

  return (
    <div className="dealbreakers-panel">
      <button
        className="dealbreakers-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="toggle-icon" aria-hidden="true">🚨</span>
        <span className="toggle-text">
          Dealbreakers
          {selectedDealbreakers.length > 0 && (
            <span className="dealbreaker-count">{selectedDealbreakers.length}/5</span>
          )}
        </span>
        <span className="toggle-arrow">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="dealbreakers-content">
          <p className="dealbreakers-description">
            Select up to <strong>5 must-have metrics</strong>. If a city scores below 50 on any of these,
            you'll see a warning. These are YOUR non-negotiables.
          </p>

          {selectedDealbreakers.length > 0 && (
            <div className="selected-dealbreakers">
              <div className="selected-header">
                <span>Your Dealbreakers:</span>
                <button className="clear-btn" onClick={clearAll}>Clear All</button>
              </div>
              <div className="selected-list">
                {selectedDealbreakers.map(metricId => {
                  const metric = ALL_METRICS.find(m => m.id === metricId);
                  if (!metric) return null;
                  return (
                    <button
                      type="button"
                      key={metricId}
                      className="selected-chip"
                      onClick={() => toggleDealbreaker(metricId)}
                      aria-label={`Remove ${metric.shortName} dealbreaker`}
                    >
                      {METRIC_ICONS[metric.shortName] || '📊'} {metric.shortName}
                      <span className="remove-x" aria-hidden="true">×</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="category-list">
            {CATEGORIES.map(category => {
              const categoryMetrics = getMetricsByCategory(category.id);
              const isOpen = expandedCategory === category.id;
              const selectedInCategory = categoryMetrics.filter(m =>
                selectedDealbreakers.includes(m.id)
              ).length;

              return (
                <div key={category.id} className="category-section">
                  <button
                    className="category-toggle"
                    onClick={() => setExpandedCategory(isOpen ? null : category.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="category-info">
                      <span className="category-icon">{category.icon}</span>
                      <span className="category-name">{category.name}</span>
                      {selectedInCategory > 0 && (
                        <span className="category-selected">({selectedInCategory})</span>
                      )}
                    </span>
                    <span className="category-arrow">{isOpen ? '−' : '+'}</span>
                  </button>

                  {isOpen && (
                    <div className="metrics-grid">
                      {categoryMetrics.map(metric => {
                        const isSelected = selectedDealbreakers.includes(metric.id);
                        const isDisabled = !isSelected && selectedDealbreakers.length >= 5;

                        return (
                          <button
                            key={metric.id}
                            className={`metric-chip ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => !isDisabled && toggleDealbreaker(metric.id)}
                            disabled={isDisabled}
                            title={metric.description}
                          >
                            <span className="chip-icon">
                              {METRIC_ICONS[metric.shortName] || '📊'}
                            </span>
                            <span className="chip-name">{metric.shortName}</span>
                            {isSelected && <span className="chip-check">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DealbreakersPanel;
