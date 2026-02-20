/**
 * LIFE SCORE™ City Selector Component
 * Clues Intelligence LTD
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
import { NotifyMeModal } from './NotifyMeModal';
import { useJobTracker } from '../hooks/useJobTracker';
import type { LawLivedRatio, CategoryId } from '../types/metrics';
import type { NotifyChannel } from '../types/database';
import { getFlagUrl } from '../utils/countryFlags';
import { toastInfo } from '../utils/toast';
import './CitySelector.css';

// Country → short code for badges
const COUNTRY_CODES: Record<string, string> = {
  'USA': 'US', 'Canada': 'CA',
  'UK': 'UK', 'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES',
  'Netherlands': 'NL', 'Belgium': 'BE', 'Austria': 'AT', 'Switzerland': 'CH',
  'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK', 'Finland': 'FI', 'Iceland': 'IS',
  'Ireland': 'IE', 'Portugal': 'PT', 'Greece': 'GR', 'Poland': 'PL',
  'Czech Republic': 'CZ', 'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG',
  'Croatia': 'HR', 'Slovakia': 'SK', 'Slovenia': 'SI', 'Estonia': 'EE',
  'Latvia': 'LV', 'Lithuania': 'LT', 'Luxembourg': 'LU', 'Malta': 'MT',
  'Cyprus': 'CY', 'Monaco': 'MC',
};

const getCountryCode = (country: string): string => COUNTRY_CODES[country] || country.slice(0, 2).toUpperCase();

// Highlight matching text in search results
const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

// Helper to find metro by formatted string (e.g., "Tampa, Florida, USA")
const findMetroByFormatted = (formatted: string): Metro | undefined => {
  if (!formatted) return undefined;
  const cityPart = formatted.split(',')[0].trim().toLowerCase();
  return ALL_METROS.find(m => m.city.toLowerCase() === cityPart);
};

interface CitySelectorProps {
  onCompare: (city1: string, city2: string) => void;
  isLoading: boolean;
  enhancedWaiting?: boolean; // True when enhanced mode is waiting for user to click LLM buttons
  onDealbreakersChange?: (dealbreakers: string[]) => void;
  onWeightsChange?: (weights: CategoryWeights) => void;
  onLawLivedChange?: (ratio: LawLivedRatio) => void;        // Law vs Lived ratio change
  onConservativeModeChange?: (enabled: boolean) => void;    // Conservative mode toggle
  onExcludedCategoriesChange?: (excluded: Set<CategoryId>) => void;  // Category exclusion change
  onJobCreated?: (jobId: string, city1: string, city2: string) => void;  // Notify parent when a notification job is created
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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

  // Get filtered metros based on tab and search, sorted alphabetically
  const getFilteredMetros = (): Metro[] => {
    let metros: Metro[];
    switch (activeTab) {
      case 'na':
        metros = [...NORTH_AMERICAN_METROS].sort((a, b) => a.city.localeCompare(b.city));
        break;
      case 'eu':
        metros = [...EUROPEAN_METROS].sort((a, b) => a.city.localeCompare(b.city));
        break;
      default:
        metros = [...ALL_METROS].sort((a, b) => a.city.localeCompare(b.city));
    }
    return searchQuery ? searchMetros(searchQuery, metros) : metros;
  };

  const filteredMetros = getFilteredMetros();

  const handleSelect = (metro: Metro) => {
    onChange(metro);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (!disabled) {
      if (isOpen) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      } else {
        setIsOpen(true);
        setHighlightedIndex(-1);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredMetros.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredMetros.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredMetros.length) {
          handleSelect(filteredMetros[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.metro-option');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery, activeTab]);

  return (
    <div className="metro-dropdown" ref={dropdownRef}>
      <label htmlFor={id}>{label}</label>
      <button
        type="button"
        className={`metro-select-btn ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="metro-select-value">
          {value ? (
            <>
              <img className="metro-flag-img" src={getFlagUrl(value.country)} alt={value.country} width={20} height={15} />
              <span className="metro-country-badge">{getCountryCode(value.country)}</span>
              {' '}{formatMetro(value)}
            </>
          ) : 'Select a city...'}
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
              onKeyDown={handleKeyDown}
              className="metro-search-input"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls={`${id}-listbox`}
              aria-activedescendant={highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
            />
          </div>

          <div className="metro-tabs">
            <button
              type="button"
              className={`metro-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              🌎 All ({searchQuery ? filteredMetros.length : 200})
            </button>
            <button
              type="button"
              className={`metro-tab ${activeTab === 'na' ? 'active' : ''}`}
              onClick={() => setActiveTab('na')}
            >
              🇺🇸 N. America
            </button>
            <button
              type="button"
              className={`metro-tab ${activeTab === 'eu' ? 'active' : ''}`}
              onClick={() => setActiveTab('eu')}
            >
              🇪🇺 Europe
            </button>
          </div>

          {searchQuery && (
            <div className="metro-search-count">
              {filteredMetros.length} {filteredMetros.length === 1 ? 'city' : 'cities'} found
            </div>
          )}

          <div className="metro-list" ref={listRef} role="listbox" id={`${id}-listbox`}>
            {filteredMetros.length === 0 ? (
              <div className="metro-no-results">No cities match "{searchQuery}"</div>
            ) : (
              filteredMetros.map((metro, index) => (
                <button
                  key={`${metro.city}-${metro.country}-${index}`}
                  id={`${id}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={value?.city === metro.city && value?.country === metro.country}
                  className={`metro-option ${value?.city === metro.city && value?.country === metro.country ? 'selected' : ''} ${highlightedIndex === index ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(metro)}
                >
                  <div className="metro-details">
                    <span className="metro-city">
                      <HighlightMatch text={metro.city} query={searchQuery} />
                    </span>
                    {metro.region && (
                      <span className="metro-region">{metro.region}</span>
                    )}
                  </div>
                  <img
                    className="metro-flag-img"
                    src={getFlagUrl(metro.country)}
                    alt={metro.country}
                    width={20}
                    height={15}
                    loading="lazy"
                  />
                  <span className="metro-country-badge">{getCountryCode(metro.country)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const CitySelector: React.FC<CitySelectorProps> = ({
  onCompare,
  isLoading,
  enhancedWaiting,
  onDealbreakersChange,
  onWeightsChange,
  onLawLivedChange,
  onConservativeModeChange,
  onExcludedCategoriesChange,
  onJobCreated
}) => {
  const [metro1, setMetro1] = useState<Metro>(DEFAULT_METRO1);
  const [metro2, setMetro2] = useState<Metro>(DEFAULT_METRO2);
  const [showShareCopied, setShowShareCopied] = useState(false);
  const [activePopularIndex, setActivePopularIndex] = useState<number | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const { createJob } = useJobTracker();

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
      setShowNotifyModal(true);
    }
  };

  const handleWaitHere = () => {
    if (metro1 && metro2) {
      onCompare(formatMetro(metro1), formatMetro(metro2));
    }
  };

  const handleNotifyMe = async (channels: NotifyChannel[]) => {
    if (!metro1 || !metro2) return;
    const city1 = formatMetro(metro1);
    const city2 = formatMetro(metro2);

    // Create a job in the database
    const jobId = await createJob({
      type: 'comparison',
      payload: { city1, city2 },
      notifyVia: channels,
    });

    // Still trigger the comparison — the existing flow runs as normal
    onCompare(city1, city2);

    if (jobId) {
      onJobCreated?.(jobId, city1, city2);
      toastInfo(`We'll notify you when ${metro1.city} vs ${metro2.city} is ready.`);
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
      <h2 className="section-title">Compare Legal &amp; Lived Freedom Between Any Two Cities</h2>
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
        <WeightPresets
          onWeightsChange={onWeightsChange}
          onLawLivedChange={onLawLivedChange}
          onConservativeModeChange={onConservativeModeChange}
          onExcludedCategoriesChange={onExcludedCategoriesChange}
        />
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
          {enhancedWaiting ? (
            <>⬇️ Select AI Models Below to Begin</>
          ) : isLoading ? (
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
          aria-label="Copy shareable link"
        >
          {showShareCopied ? '✓ Copied!' : '🔗 Share Link'}
        </button>
      </div>

      <p className="info-text bottom-info">
        Analysis uses our proprietary weighted average multi variant Life score technology to verify and evaluate all 100 freedom metrics.
      </p>

      {/* Notify Me Modal */}
      <NotifyMeModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        onWaitHere={handleWaitHere}
        onNotifyMe={handleNotifyMe}
        taskLabel="City Comparison"
        estimatedSeconds={90}
      />
    </div>
  );
};

export default CitySelector;
