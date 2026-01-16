/**
 * LIFE SCORE™ City Selector Component
 * John E. Desautels & Associates
 *
 * Searchable dropdown with 200 metropolitan areas (100 NA + 100 EU)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ALL_METROS,
  NORTH_AMERICAN_METROS,
  EUROPEAN_METROS,
  formatMetro,
  searchMetros,
  type Metro
} from '../data/metros';
import { parseURLParams, updateURL } from '../hooks/useURLParams';
import { DealbreakersPanel } from './DealbreakersPanel';
import { WeightPresets, type CategoryWeights } from './WeightPresets';
import './CitySelector.css';

// Helper to find metro by formatted string (e.g., "Tampa, Florida, USA")
const findMetroByFormatted = (formatted: string): Metro | undefined => {
  if (!formatted) return undefined;
  const cityPart = formatted.split(',')[0].trim().toLowerCase();
  return ALL_METROS.find(m => m.city.toLowerCase() === cityPart);
};

interface CitySelectorProps {
  onCompare: (city1: string, city2: string) => void;
  isLoading: boolean;
  onDealbreakersChange?: (dealbreakers: string[]) => void;
  onWeightsChange?: (weights: CategoryWeights) => void;
}

interface PopularComparison {
  metro1: Metro;
  metro2: Metro;
  label: string;
}

// Find metros by city name for popular comparisons
const findMetro = (cityName: string): Metro | undefined => {
  return ALL_METROS.find(m => m.city.toLowerCase() === cityName.toLowerCase());
};

const POPULAR_COMPARISONS: PopularComparison[] = [
  { metro1: findMetro('Tampa')!, metro2: findMetro('London')!, label: 'Tampa vs London' },
  { metro1: findMetro('New York')!, metro2: findMetro('Amsterdam')!, label: 'NYC vs Amsterdam' },
  { metro1: findMetro('Los Angeles')!, metro2: findMetro('Barcelona')!, label: 'LA vs Barcelona' },
  { metro1: findMetro('Miami')!, metro2: findMetro('Lisbon')!, label: 'Miami vs Lisbon' },
  { metro1: findMetro('Denver')!, metro2: findMetro('Berlin')!, label: 'Denver vs Berlin' },
  { metro1: findMetro('Austin')!, metro2: findMetro('Dublin')!, label: 'Austin vs Dublin' },
  { metro1: findMetro('San Francisco')!, metro2: findMetro('Stockholm')!, label: 'SF vs Stockholm' },
  { metro1: findMetro('Chicago')!, metro2: findMetro('Paris')!, label: 'Chicago vs Paris' },
].filter(c => c.metro1 && c.metro2);

// Default selections
const DEFAULT_METRO1 = findMetro('Tampa') || NORTH_AMERICAN_METROS[0];
const DEFAULT_METRO2 = findMetro('London') || EUROPEAN_METROS[0];

// Metro Dropdown Component
interface MetroDropdownProps {
  id: string;
  label: string;
  value: Metro | null;
  onChange: (metro: Metro) => void;
  disabled: boolean;
}

const MetroDropdown: React.FC<MetroDropdownProps> = ({ id, label, value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'na' | 'eu'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get filtered metros based on tab and search
  const getFilteredMetros = (): Metro[] => {
    let metros: Metro[];
    switch (activeTab) {
      case 'na':
        metros = NORTH_AMERICAN_METROS;
        break;
      case 'eu':
        metros = EUROPEAN_METROS;
        break;
      default:
        metros = ALL_METROS;
    }
    return searchQuery ? searchMetros(searchQuery, metros) : metros;
  };

  const filteredMetros = getFilteredMetros();

  const handleSelect = (metro: Metro) => {
    onChange(metro);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className="metro-dropdown" ref={dropdownRef}>
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        className={`metro-select-btn ${isOpen ? 'open' : ''}`}
        onClick={handleOpen}
        disabled={disabled}
      >
        <span className="metro-select-value">
          {value ? formatMetro(value) : 'Select a city...'}
        </span>
        <span className="metro-select-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="metro-dropdown-menu">
          <div className="metro-search-box">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="metro-search-input"
            />
          </div>

          <div className="metro-tabs">
            <button
              type="button"
              className={`metro-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All (200)
            </button>
            <button
              type="button"
              className={`metro-tab ${activeTab === 'na' ? 'active' : ''}`}
              onClick={() => setActiveTab('na')}
            >
              N. America (100)
            </button>
            <button
              type="button"
              className={`metro-tab ${activeTab === 'eu' ? 'active' : ''}`}
              onClick={() => setActiveTab('eu')}
            >
              Europe (100)
            </button>
          </div>

          <div className="metro-list">
            {filteredMetros.length === 0 ? (
              <div className="metro-no-results">No cities found</div>
            ) : (
              filteredMetros.map((metro, index) => (
                <button
                  key={`${metro.city}-${metro.country}-${index}`}
                  type="button"
                  className={`metro-option ${value?.city === metro.city && value?.country === metro.country ? 'selected' : ''}`}
                  onClick={() => handleSelect(metro)}
                >
                  <span className="metro-city">{metro.city}</span>
                  <span className="metro-location">
                    {metro.region ? `${metro.region}, ${metro.country}` : metro.country}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CitySelector: React.FC<CitySelectorProps> = ({ onCompare, isLoading, onDealbreakersChange, onWeightsChange }) => {
  const [metro1, setMetro1] = useState<Metro>(DEFAULT_METRO1);
  const [metro2, setMetro2] = useState<Metro>(DEFAULT_METRO2);
  const [showShareCopied, setShowShareCopied] = useState(false);
  const [activePopularIndex, setActivePopularIndex] = useState<number | null>(null);

  // Load cities from URL params on mount
  useEffect(() => {
    const params = parseURLParams();
    if (params.cityA) {
      const foundMetro = findMetroByFormatted(params.cityA);
      if (foundMetro) setMetro1(foundMetro);
    }
    if (params.cityB) {
      const foundMetro = findMetroByFormatted(params.cityB);
      if (foundMetro) setMetro2(foundMetro);
    }
  }, []);

  // Update URL when cities change
  useEffect(() => {
    if (metro1 && metro2) {
      updateURL({
        cityA: formatMetro(metro1),
        cityB: formatMetro(metro2),
      });
    }
  }, [metro1, metro2]);

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (metro1 && metro2) {
      onCompare(formatMetro(metro1), formatMetro(metro2));
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareCopied(true);
      setTimeout(() => setShowShareCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowShareCopied(true);
      setTimeout(() => setShowShareCopied(false), 2000);
    }
  };

  const handlePopularClick = (comparison: PopularComparison, index: number) => {
    setMetro1(comparison.metro1);
    setMetro2(comparison.metro2);
    setActivePopularIndex(index);
  };

  return (
    <div className="city-selector-card card">
      <h2 className="section-title">Compare Legal Freedom Between Any Two Cities</h2>
      <p className="selector-subtitle">Choose from 200 major metropolitan areas across North America and Europe</p>

      <form onSubmit={handleSubmit}>
        <div className="city-inputs">
          <MetroDropdown
            id="city1"
            label="City 1"
            value={metro1}
            onChange={setMetro1}
            disabled={isLoading}
          />

          <MetroDropdown
            id="city2"
            label="City 2"
            value={metro2}
            onChange={setMetro2}
            disabled={isLoading}
          />
        </div>

      </form>

      <div className="popular-section">
        <h3>Popular Comparisons</h3>
        <div className="popular-grid">
          {POPULAR_COMPARISONS.map((comparison, index) => (
            <button
              key={index}
              type="button"
              className={`popular-btn ${activePopularIndex === index ? 'active' : ''}`}
              onClick={() => handlePopularClick(comparison, index)}
              disabled={isLoading}
            >
              {comparison.label}
            </button>
          ))}
        </div>
      </div>

      {/* Weight Presets */}
      {onWeightsChange && (
        <WeightPresets onWeightsChange={onWeightsChange} />
      )}

      {/* Dealbreakers Panel */}
      {onDealbreakersChange && (
        <DealbreakersPanel onDealbreakersChange={onDealbreakersChange} />
      )}

      {/* Compare Actions - Moved below Dealbreakers */}
      <div className="compare-actions bottom-actions">
        <button
          type="button"
          className="btn btn-primary btn-compare"
          disabled={isLoading || !metro1 || !metro2}
          onClick={handleSubmit}
        >
          {isLoading ? (
            <>
              <span className="btn-spinner"></span>
              Analyzing 100 Metrics...
            </>
          ) : (
            <>🔍 Compare LIFE SCORES</>
          )}
        </button>

        <button
          type="button"
          className="btn btn-share"
          onClick={handleCopyShareLink}
          title="Copy shareable link"
        >
          {showShareCopied ? '✓ Copied!' : '🔗 Share Link'}
        </button>
      </div>

      <p className="info-text bottom-info">
        Analysis uses Multiple LLMs with our proprietary weighted average LIFE score technology to verify all 100 legal freedom metrics.
        <br />
        <span className="info-highlight">No fabricated data - only verified facts.</span>
      </p>
    </div>
  );
};

export default CitySelector;
