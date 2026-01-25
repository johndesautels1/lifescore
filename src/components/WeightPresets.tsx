/**
 * LIFE SCORE™ Weight Presets & Sliders
 * Let users customize category importance and Law vs Lived Reality weighting
 */

import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../shared/metrics';
import type { CategoryId, LawLivedRatio } from '../types/metrics';
import './WeightPresets.css';

// Weight presets for different user personas
interface WeightPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  weights: Record<CategoryId, number>;
  lawLivedRatio: LawLivedRatio;  // NEW: Law vs Lived weighting per persona
}

const PRESETS: WeightPreset[] = [
  {
    id: 'balanced',
    name: 'Balanced',
    icon: '⚖️',
    description: 'Equal weight to all categories',
    weights: {
      personal_freedom: 20,
      housing_property: 20,
      business_work: 20,
      transportation: 15,
      policing_legal: 15,
      speech_lifestyle: 10
    },
    lawLivedRatio: { law: 50, lived: 50 }  // Equal weight to written law and lived reality
  },
  {
    id: 'digital_nomad',
    name: 'Digital Nomad',
    icon: '💻',
    description: 'Remote work, mobility, lifestyle freedom',
    weights: {
      personal_freedom: 25,
      housing_property: 10,
      business_work: 25,
      transportation: 20,
      policing_legal: 10,
      speech_lifestyle: 10
    },
    lawLivedRatio: { law: 30, lived: 70 }  // Cares more about actual daily experience
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    icon: '🚀',
    description: 'Business ease, taxes, regulations',
    weights: {
      personal_freedom: 10,
      housing_property: 15,
      business_work: 35,
      transportation: 10,
      policing_legal: 15,
      speech_lifestyle: 15
    },
    lawLivedRatio: { law: 70, lived: 30 }  // Needs legal framework for contracts/business
  },
  {
    id: 'family',
    name: 'Family',
    icon: '👨‍👩‍👧‍👦',
    description: 'Safety, property, stability',
    weights: {
      personal_freedom: 10,
      housing_property: 30,
      business_work: 15,
      transportation: 20,
      policing_legal: 20,
      speech_lifestyle: 5
    },
    lawLivedRatio: { law: 60, lived: 40 }  // Wants legal protections + safe environment
  },
  {
    id: 'libertarian',
    name: 'Libertarian',
    icon: '🗽',
    description: 'Maximum personal & economic freedom',
    weights: {
      personal_freedom: 30,
      housing_property: 20,
      business_work: 20,
      transportation: 5,
      policing_legal: 20,
      speech_lifestyle: 5
    },
    lawLivedRatio: { law: 40, lived: 60 }  // Actions matter more than words on paper
  },
  {
    id: 'investor',
    name: 'Investor',
    icon: '📈',
    description: 'Property rights, taxes, asset protection',
    weights: {
      personal_freedom: 5,
      housing_property: 35,
      business_work: 30,
      transportation: 5,
      policing_legal: 20,
      speech_lifestyle: 5
    },
    lawLivedRatio: { law: 80, lived: 20 }  // Legal asset protection is paramount
  }
];

const STORAGE_KEY = 'lifescore_weights';
const STORAGE_KEY_LAWLIVED = 'lifescore_lawlived';

export interface CategoryWeights {
  [key: string]: number;
}

interface WeightPresetsProps {
  onWeightsChange: (weights: CategoryWeights) => void;
  onLawLivedChange?: (ratio: LawLivedRatio) => void;         // NEW: Callback for law/lived ratio change
  onConservativeModeChange?: (enabled: boolean) => void;     // NEW: Callback for conservative mode toggle
}

export const WeightPresets: React.FC<WeightPresetsProps> = ({
  onWeightsChange,
  onLawLivedChange,
  onConservativeModeChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [customWeights, setCustomWeights] = useState<CategoryWeights>(PRESETS[0].weights);
  const [isCustom, setIsCustom] = useState(false);

  // NEW: Law vs Lived Reality preference state
  const [lawLivedRatio, setLawLivedRatio] = useState<LawLivedRatio>(PRESETS[0].lawLivedRatio);
  const [isLawLivedCustom, setIsLawLivedCustom] = useState(false);

  // NEW: Conservative mode (use MIN of law/lived)
  const [conservativeMode, setConservativeMode] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    // Load category weights
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomWeights(parsed.weights);
        setSelectedPreset(parsed.presetId);
        setIsCustom(parsed.isCustom);
        onWeightsChange(parsed.weights);
      } catch {
        onWeightsChange(PRESETS[0].weights);
      }
    } else {
      onWeightsChange(PRESETS[0].weights);
    }

    // Load Law/Lived preferences
    const storedLawLived = localStorage.getItem(STORAGE_KEY_LAWLIVED);
    if (storedLawLived) {
      try {
        const parsed = JSON.parse(storedLawLived);
        setLawLivedRatio(parsed.ratio);
        setIsLawLivedCustom(parsed.isCustom);
        setConservativeMode(parsed.conservativeMode || false);
        onLawLivedChange?.(parsed.ratio);
        onConservativeModeChange?.(parsed.conservativeMode || false);
      } catch {
        onLawLivedChange?.(PRESETS[0].lawLivedRatio);
      }
    } else {
      onLawLivedChange?.(PRESETS[0].lawLivedRatio);
    }
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      weights: customWeights,
      presetId: selectedPreset,
      isCustom
    }));
  }, [customWeights, selectedPreset, isCustom]);

  // Save Law/Lived preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LAWLIVED, JSON.stringify({
      ratio: lawLivedRatio,
      isCustom: isLawLivedCustom,
      conservativeMode
    }));
  }, [lawLivedRatio, isLawLivedCustom, conservativeMode]);

  const handlePresetSelect = (preset: WeightPreset) => {
    setSelectedPreset(preset.id);
    setCustomWeights(preset.weights);
    setIsCustom(false);
    onWeightsChange(preset.weights);

    // Also update Law/Lived ratio to match preset (unless user has customized it)
    if (!isLawLivedCustom) {
      setLawLivedRatio(preset.lawLivedRatio);
      onLawLivedChange?.(preset.lawLivedRatio);
    }
  };

  // NEW: Handle Law/Lived slider change
  const handleLawLivedChange = (lawValue: number) => {
    const newRatio: LawLivedRatio = { law: lawValue, lived: 100 - lawValue };
    setLawLivedRatio(newRatio);
    setIsLawLivedCustom(true);
    onLawLivedChange?.(newRatio);
  };

  // NEW: Reset Law/Lived to preset default
  const resetLawLivedToPreset = () => {
    const preset = PRESETS.find(p => p.id === selectedPreset) || PRESETS[0];
    setLawLivedRatio(preset.lawLivedRatio);
    setIsLawLivedCustom(false);
    onLawLivedChange?.(preset.lawLivedRatio);
  };

  // NEW: Handle conservative mode toggle
  const handleConservativeModeChange = (enabled: boolean) => {
    setConservativeMode(enabled);
    onConservativeModeChange?.(enabled);
  };

  const handleSliderChange = (categoryId: CategoryId, value: number) => {
    // Ensure total stays at 100 by adjusting other weights proportionally
    const currentTotal = Object.values(customWeights).reduce((a, b) => a + b, 0);
    const otherTotal = currentTotal - customWeights[categoryId];
    const newOtherTotal = 100 - value;

    const newWeights = { ...customWeights };
    newWeights[categoryId] = value;

    // Adjust other weights proportionally
    if (otherTotal > 0 && newOtherTotal >= 0) {
      const ratio = newOtherTotal / otherTotal;
      Object.keys(newWeights).forEach(key => {
        if (key !== categoryId) {
          newWeights[key as CategoryId] = Math.round(newWeights[key as CategoryId] * ratio);
        }
      });
    }

    // Fix rounding errors
    const newTotal = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (newTotal !== 100) {
      const diff = 100 - newTotal;
      const firstOther = Object.keys(newWeights).find(k => k !== categoryId) as CategoryId;
      if (firstOther) {
        newWeights[firstOther] += diff;
      }
    }

    setCustomWeights(newWeights);
    setIsCustom(true);
    setSelectedPreset('custom');
    onWeightsChange(newWeights);
  };

  const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="weight-presets">
      <button
        className="presets-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="toggle-icon">⚙️</span>
        <span className="toggle-text">
          Customize Priorities
          {selectedPreset !== 'balanced' && !isCustom && (
            <span className="preset-badge">
              {PRESETS.find(p => p.id === selectedPreset)?.icon} {PRESETS.find(p => p.id === selectedPreset)?.name}
            </span>
          )}
          {isCustom && <span className="preset-badge">🎛️ Custom</span>}
        </span>
        <span className="toggle-arrow">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="presets-content">
          <p className="presets-description">
            Choose a preset or customize weights to match <strong>your priorities</strong>.
            The score will recalculate based on what matters most to you.
          </p>

          {/* Preset Buttons */}
          <div className="preset-grid">
            {PRESETS.map(preset => (
              <button
                key={preset.id}
                className={`preset-btn ${selectedPreset === preset.id && !isCustom ? 'selected' : ''}`}
                onClick={() => handlePresetSelect(preset)}
                title={preset.description}
              >
                <span className="preset-icon">{preset.icon}</span>
                <span className="preset-name">{preset.name}</span>
              </button>
            ))}
          </div>

          {/* Weight Sliders */}
          <div className="weight-sliders">
            <div className="sliders-header">
              <span>Fine-tune Weights</span>
              <span className={`total-weight ${totalWeight !== 100 ? 'error' : ''}`}>
                Total: {totalWeight}%
              </span>
            </div>

            {CATEGORIES.map(category => (
              <div key={category.id} className="slider-row">
                <div className="slider-label">
                  <span className="slider-icon">{category.icon}</span>
                  <span className="slider-name">{category.name}</span>
                </div>
                <div className="slider-control">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={customWeights[category.id] || 0}
                    onChange={(e) => handleSliderChange(category.id, parseInt(e.target.value))}
                    className="weight-slider"
                  />
                  <span className="slider-value">{customWeights[category.id] || 0}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* NEW: Law vs Lived Reality Slider */}
          <div className="law-lived-section">
            <div className="section-header">
              <span className="section-title">Law vs Lived Reality</span>
              {isLawLivedCustom && (
                <button
                  className="reset-btn"
                  onClick={resetLawLivedToPreset}
                  title="Reset to preset default"
                >
                  Reset
                </button>
              )}
            </div>
            <p className="section-description">
              Balance between what the <strong>law says</strong> vs how things <strong>actually work</strong> in daily life.
            </p>

            <div className="law-lived-slider">
              <div className="slider-endpoints">
                <span className="endpoint-label">
                  <span className="endpoint-icon">📜</span>
                  <span>Law ({lawLivedRatio.law}%)</span>
                </span>
                <span className="endpoint-label">
                  <span className="endpoint-icon">🏙️</span>
                  <span>Lived ({lawLivedRatio.lived}%)</span>
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={lawLivedRatio.law}
                onChange={(e) => handleLawLivedChange(parseInt(e.target.value))}
                className="law-lived-range"
                disabled={conservativeMode}
              />
              <div className="slider-scale">
                <span>Written Law</span>
                <span>Daily Reality</span>
              </div>
            </div>

            {/* Conservative Mode Toggle */}
            <div className="conservative-mode">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={conservativeMode}
                  onChange={(e) => handleConservativeModeChange(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-switch"></span>
                <span className="toggle-text">
                  <span className="toggle-icon">🛡️</span>
                  <span className="toggle-title">Worst-Case Mode</span>
                </span>
              </label>
              <p className="toggle-description">
                Use whichever is <strong>LOWER</strong> (Law or Lived) for each metric.
                Shows your "floor" of freedom.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightPresets;
