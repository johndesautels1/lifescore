/**
 * LIFE SCORE™ City Selector Component
 * John E. Desautels & Associates
 */

import React, { useState } from 'react';
import './CitySelector.css';

interface CitySelectorProps {
  onCompare: (city1: string, city2: string) => void;
  isLoading: boolean;
}

interface PopularComparison {
  city1: string;
  city2: string;
  label: string;
}

const POPULAR_COMPARISONS: PopularComparison[] = [
  { city1: 'Tampa Bay, Florida, USA', city2: 'London, England, UK', label: 'Tampa vs London' },
  { city1: 'New York City, New York, USA', city2: 'Amsterdam, Netherlands', label: 'NYC vs Amsterdam' },
  { city1: 'Los Angeles, California, USA', city2: 'Barcelona, Spain', label: 'LA vs Barcelona' },
  { city1: 'Miami, Florida, USA', city2: 'Lisbon, Portugal', label: 'Miami vs Lisbon' },
  { city1: 'Denver, Colorado, USA', city2: 'Berlin, Germany', label: 'Denver vs Berlin' },
  { city1: 'Austin, Texas, USA', city2: 'Dublin, Ireland', label: 'Austin vs Dublin' },
  { city1: 'San Francisco, California, USA', city2: 'Singapore', label: 'SF vs Singapore' },
  { city1: 'Chicago, Illinois, USA', city2: 'Paris, France', label: 'Chicago vs Paris' },
];

export const CitySelector: React.FC<CitySelectorProps> = ({ onCompare, isLoading }) => {
  const [city1, setCity1] = useState('Tampa Bay, Florida, USA');
  const [city2, setCity2] = useState('London, England, UK');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city1.trim() && city2.trim()) {
      onCompare(city1.trim(), city2.trim());
    }
  };

  const handlePopularClick = (comparison: PopularComparison) => {
    setCity1(comparison.city1);
    setCity2(comparison.city2);
  };

  return (
    <div className="city-selector-card card">
      <h2 className="section-title">Compare Legal Freedom Between Any Two Cities</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="city-inputs">
          <div className="input-group">
            <label htmlFor="city1">City 1</label>
            <input
              type="text"
              id="city1"
              value={city1}
              onChange={(e) => setCity1(e.target.value)}
              placeholder="e.g., Tampa Bay, Florida, USA"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="city2">City 2</label>
            <input
              type="text"
              id="city2"
              value={city2}
              onChange={(e) => setCity2(e.target.value)}
              placeholder="e.g., London, England, UK"
              disabled={isLoading}
              required
            />
          </div>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary btn-compare"
          disabled={isLoading || !city1.trim() || !city2.trim()}
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
      </form>
      
      <p className="info-text">
        Analysis uses Claude AI with real-time web search to verify all 100 legal freedom metrics.
        <br />
        <span className="info-highlight">No fabricated data - only verified facts.</span>
      </p>
      
      <div className="popular-section">
        <h3>Popular Comparisons</h3>
        <div className="popular-grid">
          {POPULAR_COMPARISONS.map((comparison, index) => (
            <button
              key={index}
              type="button"
              className="popular-btn"
              onClick={() => handlePopularClick(comparison)}
              disabled={isLoading}
            >
              {comparison.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CitySelector;
