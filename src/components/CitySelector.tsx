/**
 * LIFE SCORE™ City Selector Component
 * Clues Intelligence LTD
 *
 * Searchable dropdown: 200 popular metropolitan areas (100 NA + 100 EU) listed,
 * and any city in the world by search - the built-in world list (GeoNames,
 * 15,000+ people; src/data/worldCities.ts) and, on request, Google beyond it
 * (src/services/placesSearch.ts). John, 4 Oct 2026: "compare any 2 cities in
 * the world".
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
import { NotifyMeModal, getSavedNotifyPreference } from './NotifyMeModal';
import { useJobTracker } from '../hooks/useJobTracker';
import type { LawLivedRatio, CategoryId } from '../types/metrics';
import type { NotifyChannel } from '../types/database';
import { getFlagUrl, countryIso } from '../utils/countryFlags';
import { loadWorldCities, searchWorldCities, type WorldCity } from '../data/worldCities';
import { searchPlacesEverywhere } from '../services/placesSearch';
import { toastInfo } from '../utils/toast';
import './CitySelector.css';

// Country → short code for badges (any country; the UK shows as "UK")
const getCountryCode = (metro: Metro): string => {
  const iso = countryIso(metro.country, metro.countryCode).toUpperCase();
  return iso === 'GB' ? 'UK' : iso;
};

/** Same city: name and country code match (the popular list says "USA", the world list "United States"). */
const sameCity = (a: Metro, b: Metro): boolean =>
  a.city.toLowerCase() === b.city.toLowerCase() && countryIso(a.country, a.countryCode) === countryIso(b.country, b.countryCode);

/** How many world-list cities a search shows at most. */
const WORLD_RESULTS_LIMIT = 50;

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

// Helper to find metro by formatted string (e.g., "Tampa, Florida, USA"). A city
// outside the popular list (world list or Google) is rebuilt from its parts.
const findMetroByFormatted = (formatted: string): Metro | undefined => {
  if (!formatted) return undefined;
  const parts = formatted.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length === 0 || parts.some(part => part.length > 100)) return undefined;
  const rebuilt: Metro = parts.length >= 3
    ? { city: parts[0], region: parts.slice(1, -1).join(', '), country: parts[parts.length - 1] }
    : { city: parts[0], country: parts[1] ?? '' };
  const known = ALL_METROS.find(m => m.city.toLowerCase() === parts[0].toLowerCase()
    && (parts.length === 1 || sameCity(m, rebuilt)));
  if (known) return known;
  return rebuilt.country ? rebuilt : undefined;
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
  // The world list (fetched the first time the menu opens) and Google's answer
  const [world, setWorld] = useState<WorldCity[] | null>(null);
  const [worldFailed, setWorldFailed] = useState(false);
  const [everywhere, setEverywhere] = useState<{
    query: string;
    status: 'loading' | 'done' | 'off' | 'error';
    cities: Metro[];
  } | null>(null);
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

  // Fetch the world list (about 0.5 MB) the first time someone types a search
  const wantsWorld = isOpen && searchQuery.trim().length >= 2;
  useEffect(() => {
    if (!wantsWorld || world || worldFailed) return;
    let cancelled = false;
    loadWorldCities()
      .then((cities) => { if (!cancelled) setWorld(cities); })
      .catch(() => { if (!cancelled) setWorldFailed(true); });
    return () => { cancelled = true; };
  }, [wantsWorld, world, worldFailed]);

  /** Ask Google for cities beyond the built-in list (only when the user asks). */
  const searchEverywhere = async () => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    setEverywhere({ query, status: 'loading', cities: [] });
    const result = await searchPlacesEverywhere(query);
    if (!result.ok) setEverywhere({ query, status: 'error', cities: [] });
    else if (!result.configured) setEverywhere({ query, status: 'off', cities: [] });
    else setEverywhere({ query, status: 'done', cities: result.cities });
  };

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
    if (!searchQuery) return metros;
    const found = searchMetros(searchQuery, metros);
    if (activeTab !== 'all') return found;
    // Any city in the world: the world list, then Google's answer for this search
    const more: Metro[] = [
      ...(world ? searchWorldCities(world, searchQuery, WORLD_RESULTS_LIMIT) : []),
      ...(everywhere?.status === 'done' && everywhere.query === searchQuery.trim() ? everywhere.cities : []),
    ];
    for (const city of more) {
      if (!found.some(existing => sameCity(existing, city))) found.push(city);
    }
    return found;
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
        } else if (filteredMetros.length === 0 && activeTab === 'all') {
          void searchEverywhere();
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
              <img className="metro-flag-img" src={getFlagUrl(value.country, value.countryCode)} alt={value.country} width={20} height={15} />
              <span className="metro-country-badge">{getCountryCode(value)}</span>
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
              placeholder="Search any city in the world..."
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
              🌎 All{searchQuery ? ` (${filteredMetros.length})` : ''}
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
              <div className="metro-no-results">
                {searchQuery.trim().length >= 2 && activeTab === 'all' && !world && !worldFailed
                  ? 'Searching the world list…'
                  : `No cities match "${searchQuery}"`}
              </div>
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
                    src={getFlagUrl(metro.country, metro.countryCode)}
                    alt={metro.country}
                    width={20}
                    height={15}
                    loading="lazy"
                  />
                  <span className="metro-country-badge">{getCountryCode(metro)}</span>
                </button>
              ))
            )}
          </div>

          {/* Beyond the built-in list: Google, only when the user asks */}
          {activeTab === 'all' && searchQuery.trim().length >= 2 && (
            <div className="metro-everywhere">
              {everywhere?.query === searchQuery.trim() && everywhere.status !== 'loading' ? (
                <span className="metro-everywhere-note" role="status">
                  {everywhere.status === 'off' && 'Searching everywhere is not switched on yet - pick from the list.'}
                  {everywhere.status === 'error' && 'Searching everywhere is unavailable right now.'}
                  {everywhere.status === 'done' && (everywhere.cities.length === 0
                    ? `Google found no city called "${everywhere.query}".`
                    : 'More cities from Google are in the list above.')}
                </span>
              ) : (
                <button
                  type="button"
                  className="metro-everywhere-btn"
                  onClick={() => void searchEverywhere()}
                  disabled={everywhere?.status === 'loading'}
                >
                  {everywhere?.status === 'loading' ? 'Searching everywhere…' : `🔍 Not listed? Search everywhere for "${searchQuery.trim()}"`}
                </button>
              )}
            </div>
          )}

          <div className="metro-credits">
            City data: <a href="https://www.geonames.org" target="_blank" rel="noopener noreferrer">GeoNames</a> (CC BY 4.0)
            {everywhere?.status === 'done' && everywhere.cities.length > 0 && ' · powered by Google'}
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
      // Skip modal if user already chose "Wait Here" this session
      try {
        if (sessionStorage.getItem('lifescore-wait-choice') === 'wait') {
          onCompare(formatMetro(metro1), formatMetro(metro2));
          return;
        }
      } catch { /* sessionStorage unavailable — show modal as normal */ }

      // Skip modal if user saved "Remember my preference"
      const saved = getSavedNotifyPreference();
      if (saved) {
        if (saved.choice === 'wait') {
          handleWaitHere();
        } else {
          handleNotifyMe(saved.channels);
        }
        return;
      }
      setShowNotifyModal(true);
    }
  };

  const handleWaitHere = () => {
    try { sessionStorage.setItem('lifescore-wait-choice', 'wait'); } catch { /* ignore */ }
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
      <p className="selector-subtitle">Pick from 200 popular cities, or type to search any city in the world</p>

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

      {isLoading && (
        <div className="inline-loading-indicator">
          <span className="btn-spinner"></span>
          <span>Comparing {metro1?.city} vs {metro2?.city}...</span>
        </div>
      )}

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
