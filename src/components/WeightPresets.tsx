/**
 * LIFE SCORE™ Weight Presets & Sliders
 * Let users customize category importance
 */

import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../shared/metrics';
import type { CategoryId } from '../types/metrics';
import './WeightPresets.css';

// Weight presets for different user personas
interface WeightPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  weights: Record<CategoryId, number>;
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
    }
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
    }
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
    }
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
    }
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
    }
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
    }
  }
];

const STORAGE_KEY = 'lifescore_weights';

export interface CategoryWeights {
  [key: string]: number;
}

interface WeightPresetsProps {
  onWeightsChange: (weights: CategoryWeights) => void;
}

export const WeightPresets: React.FC<WeightPresetsProps> = ({ onWeightsChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [customWeights, setCustomWeights] = useState<CategoryWeights>(PRESETS[0].weights);
  const [isCustom, setIsCustom] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomWeights(parsed.weights);
        setSelectedPreset(parsed.presetId);
        setIsCustom(parsed.isCustom);
        onWeightsChange(parsed.weights);
      } catch {
        // Invalid JSON, use defaults
        onWeightsChange(PRESETS[0].weights);
      }
    } else {
      onWeightsChange(PRESETS[0].weights);
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

  const handlePresetSelect = (preset: WeightPreset) => {
    setSelectedPreset(preset.id);
    setCustomWeights(preset.weights);
    setIsCustom(false);
    onWeightsChange(preset.weights);
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
        </div>
      )}
    </div>
  );
};

export default WeightPresets;
