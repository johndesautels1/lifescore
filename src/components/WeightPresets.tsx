/**
 * LIFE SCORE™ Weight Presets & Sliders
 * Let users customize category importance and Law vs Lived Reality weighting
 */

import React, { useState, useEffect } from 'react';
import { CATEGORIES } from '../shared/metrics';
import type { CategoryId, LawLivedRatio } from '../types/metrics';
import { saveUserPreferenceToDb } from '../services/savedComparisons';
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
const STORAGE_KEY_EXCLUDED = 'lifescore_excluded_categories';

export interface CategoryWeights {
  [key: string]: number;
}

interface WeightPresetsProps {
  onWeightsChange: (weights: CategoryWeights) => void;
  onLawLivedChange?: (ratio: LawLivedRatio) => void;         // Callback for law/lived ratio change
  onConservativeModeChange?: (enabled: boolean) => void;     // Callback for conservative mode toggle
  onExcludedCategoriesChange?: (excluded: Set<CategoryId>) => void;  // Callback for excluded categories
}

/**
 * Redistribute weights when categories are excluded
 * Excluded categories get 0, remaining categories scale up proportionally to sum to 100
 */
function redistributeWeights(
  baseWeights: Record<CategoryId, number>,
  excludedCategories: Set<CategoryId>
): Record<CategoryId, number> {
  const allCategoryIds = Object.keys(baseWeights) as CategoryId[];
  const activeCategories = allCategoryIds.filter(id => !excludedCategories.has(id));

  // If all excluded, return zeros (shouldn't happen normally)
  if (activeCategories.length === 0) {
    const result: Record<CategoryId, number> = {} as Record<CategoryId, number>;
    allCategoryIds.forEach(id => { result[id] = 0; });
    return result;
  }

  // Calculate total weight of active categories
  const activeTotal = activeCategories.reduce((sum, id) => sum + baseWeights[id], 0);

  // Build redistributed weights
  const redistributed: Record<CategoryId, number> = {} as Record<CategoryId, number>;

  // Active categories get scaled up proportionally
  activeCategories.forEach(id => {
    redistributed[id] = activeTotal > 0
      ? Math.round((baseWeights[id] / activeTotal) * 100)
      : Math.round(100 / activeCategories.length);
  });

  // Excluded categories get 0
  excludedCategories.forEach(id => {
    redistributed[id] = 0;
  });

  // Fix rounding errors to ensure sum is exactly 100
  const total = Object.values(redistributed).reduce((a, b) => a + b, 0);
  if (total !== 100 && activeCategories.length > 0) {
    const diff = 100 - total;
    redistributed[activeCategories[0]] += diff;
  }

  return redistributed;
}

export const WeightPresets: React.FC<WeightPresetsProps> = ({
  onWeightsChange,
  onLawLivedChange,
  onConservativeModeChange,
  onExcludedCategoriesChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [customWeights, setCustomWeights] = useState<CategoryWeights>(PRESETS[0].weights);
  const [isCustom, setIsCustom] = useState(false);

  // Law vs Lived Reality preference state
  const [lawLivedRatio, setLawLivedRatio] = useState<LawLivedRatio>(PRESETS[0].lawLivedRatio);
  const [isLawLivedCustom, setIsLawLivedCustom] = useState(false);

  // Conservative mode (use MIN of law/lived)
  const [conservativeMode, setConservativeMode] = useState(false);

  // Category exclusion state
  const [excludedCategories, setExcludedCategories] = useState<Set<CategoryId>>(new Set());

  // Category lock state — locked categories keep their % when other sliders are adjusted
  const [lockedCategories, setLockedCategories] = useState<Set<CategoryId>>(new Set());

  // Base weights before redistribution (used when toggling exclusions)
  const [baseWeights, setBaseWeights] = useState<CategoryWeights>(PRESETS[0].weights);

  // Load from localStorage on mount
  useEffect(() => {
    // Load excluded categories first (needed for weight redistribution)
    let loadedExcluded = new Set<CategoryId>();
    const storedExcluded = localStorage.getItem(STORAGE_KEY_EXCLUDED);
    if (storedExcluded) {
      try {
        const parsed = JSON.parse(storedExcluded);
        loadedExcluded = new Set(parsed as CategoryId[]);
        setExcludedCategories(loadedExcluded);
        onExcludedCategoriesChange?.(loadedExcluded);
      } catch {
        // Keep empty set
      }
    }

    // Load category weights
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBaseWeights(parsed.baseWeights || parsed.weights);
        setSelectedPreset(parsed.presetId);
        setIsCustom(parsed.isCustom);
        // Redistribute weights based on exclusions
        const redistributed = redistributeWeights(
          parsed.baseWeights || parsed.weights,
          loadedExcluded
        );
        setCustomWeights(redistributed);
        onWeightsChange(redistributed);
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

  // Save to localStorage + database when changed
  useEffect(() => {
    const data = {
      weights: customWeights,
      baseWeights: baseWeights,
      presetId: selectedPreset,
      isCustom
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[WeightPresets] Failed to save weights:', err);
    }
    saveUserPreferenceToDb('weight_presets', data);
  }, [customWeights, baseWeights, selectedPreset, isCustom]);

  // Save Law/Lived preferences to localStorage + database
  useEffect(() => {
    const data = {
      ratio: lawLivedRatio,
      isCustom: isLawLivedCustom,
      conservativeMode
    };
    try {
      localStorage.setItem(STORAGE_KEY_LAWLIVED, JSON.stringify(data));
    } catch (err) {
      console.error('[WeightPresets] Failed to save Law/Lived preferences:', err);
    }
    saveUserPreferenceToDb('law_lived_preferences', data);
  }, [lawLivedRatio, isLawLivedCustom, conservativeMode]);

  // Save excluded categories to localStorage + database
  useEffect(() => {
    const data = Array.from(excludedCategories);
    try {
      localStorage.setItem(STORAGE_KEY_EXCLUDED, JSON.stringify(data));
    } catch (err) {
      console.error('[WeightPresets] Failed to save excluded categories:', err);
    }
    saveUserPreferenceToDb('excluded_categories', data);
  }, [excludedCategories]);

  const handlePresetSelect = (preset: WeightPreset) => {
    setSelectedPreset(preset.id);
    setBaseWeights(preset.weights);
    setIsCustom(false);
    setLockedCategories(new Set()); // Clear locks when switching presets

    // Redistribute weights based on current exclusions
    const redistributed = redistributeWeights(preset.weights, excludedCategories);
    setCustomWeights(redistributed);
    onWeightsChange(redistributed);

    // Also update Law/Lived ratio to match preset (unless user has customized it)
    if (!isLawLivedCustom) {
      setLawLivedRatio(preset.lawLivedRatio);
      onLawLivedChange?.(preset.lawLivedRatio);
    }
  };

  // Handle category exclusion toggle
  const handleExclusionToggle = (categoryId: CategoryId) => {
    const newExcluded = new Set(excludedCategories);
    if (newExcluded.has(categoryId)) {
      newExcluded.delete(categoryId);
    } else {
      newExcluded.add(categoryId);
    }

    // Prevent excluding all categories
    if (newExcluded.size >= CATEGORIES.length) {
      return;
    }

    setExcludedCategories(newExcluded);
    onExcludedCategoriesChange?.(newExcluded);

    // Redistribute weights
    const redistributed = redistributeWeights(baseWeights as Record<CategoryId, number>, newExcluded);
    setCustomWeights(redistributed);
    onWeightsChange(redistributed);
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

  const handleLockToggle = (categoryId: CategoryId) => {
    const newLocked = new Set(lockedCategories);
    if (newLocked.has(categoryId)) {
      newLocked.delete(categoryId);
    } else {
      newLocked.add(categoryId);
    }
    setLockedCategories(newLocked);
  };

  const handleSliderChange = (categoryId: CategoryId, value: number) => {
    const newBaseWeights = { ...baseWeights };
    newBaseWeights[categoryId] = value;

    // Calculate how much weight is left for adjustable (non-excluded, non-locked, not current) categories
    const lockedTotal = Array.from(lockedCategories)
      .filter(id => id !== categoryId && !excludedCategories.has(id))
      .reduce((sum, id) => sum + (newBaseWeights[id] || 0), 0);

    const adjustableKeys = Object.keys(newBaseWeights).filter(
      k => k !== categoryId && !excludedCategories.has(k as CategoryId) && !lockedCategories.has(k as CategoryId)
    ) as CategoryId[];

    const remainingForAdjustable = 100 - value - lockedTotal;
    const oldAdjustableTotal = adjustableKeys.reduce((sum, k) => sum + (baseWeights[k] || 0), 0);

    if (adjustableKeys.length > 0 && remainingForAdjustable >= 0) {
      if (oldAdjustableTotal > 0) {
        const ratio = remainingForAdjustable / oldAdjustableTotal;
        adjustableKeys.forEach(key => {
          newBaseWeights[key] = Math.round((baseWeights[key] || 0) * ratio);
        });
      } else {
        const each = Math.floor(remainingForAdjustable / adjustableKeys.length);
        adjustableKeys.forEach(key => { newBaseWeights[key] = each; });
      }
    }

    // Fix rounding errors — adjust first adjustable category
    const newTotal = Object.values(newBaseWeights).reduce((a, b) => a + b, 0);
    if (newTotal !== 100 && adjustableKeys.length > 0) {
      const diff = 100 - newTotal;
      newBaseWeights[adjustableKeys[0]] += diff;
    }

    setBaseWeights(newBaseWeights);

    // Redistribute with exclusions
    const redistributed = redistributeWeights(newBaseWeights as Record<CategoryId, number>, excludedCategories);
    setCustomWeights(redistributed);
    setIsCustom(true);
    setSelectedPreset('custom');
    onWeightsChange(redistributed);
  };

  const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);

  return (
    <div className="weight-presets">
      <button
        className="presets-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="toggle-icon" aria-hidden="true">⚙️</span>
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
          <div className="presets-instructions">
            <h4 className="instructions-title">Your Score, Your Priorities</h4>
            <p className="instructions-lead">
              Every person values freedom differently. Customize how LIFE SCORE weights each category
              so the results reflect <strong>what matters most to you</strong>.
            </p>
            <ul className="instructions-list">
              <li><strong>Pick a preset persona</strong> below (Balanced, Digital Nomad, Entrepreneur, etc.) to instantly apply a curated weighting profile.</li>
              <li><strong>Drag any category slider</strong> from <strong>0% to 50%</strong> to increase or decrease its importance. The other categories auto-adjust so everything totals 100%.</li>
              <li><strong>Exclude entire categories</strong> by unchecking them &mdash; their weight redistributes to the remaining categories automatically.</li>
              <li><strong>Adjust Law vs Lived Reality</strong> to control whether your score emphasizes what the law says on paper or how things actually work day-to-day (0&ndash;100% slider).</li>
              <li><strong>Enable Worst-Case Mode</strong> to use whichever score is lower (law or lived) for each metric &mdash; showing your true floor of freedom.</li>
            </ul>
            <p className="instructions-note">
              All preferences are saved automatically and apply to every comparison you run.
            </p>
          </div>

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

          {/* Weight Sliders with Category Exclusion */}
          <div className="weight-sliders">
            <div className="sliders-header">
              <span>Fine-tune Weights</span>
              <span className={`total-weight ${totalWeight !== 100 ? 'error' : ''}`}>
                Total: {totalWeight}%
              </span>
            </div>
            <p className="sliders-hint">
              Uncheck a category to exclude it entirely. Its weight redistributes to others.
            </p>

            {CATEGORIES.map(category => {
              const isExcluded = excludedCategories.has(category.id);
              const isLocked = lockedCategories.has(category.id);
              return (
                <div key={category.id} className={`slider-row ${isExcluded ? 'excluded' : ''} ${isLocked ? 'locked' : ''}`}>
                  <div className="slider-label">
                    <label className="exclusion-checkbox" title={isExcluded ? 'Click to include' : 'Click to exclude'}>
                      <input
                        type="checkbox"
                        checked={!isExcluded}
                        onChange={() => handleExclusionToggle(category.id)}
                        className="exclusion-input"
                      />
                      <span className="exclusion-checkmark"></span>
                    </label>
                    <span className={`slider-icon ${isExcluded ? 'excluded' : ''}`}>{category.icon}</span>
                    <span className={`slider-name ${isExcluded ? 'excluded' : ''}`}>{category.name}</span>
                    {isExcluded && <span className="excluded-badge">Excluded</span>}
                  </div>
                  <div className="slider-control">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={customWeights[category.id] || 0}
                      onChange={(e) => handleSliderChange(category.id, parseInt(e.target.value))}
                      className="weight-slider"
                      disabled={isExcluded || isLocked}
                      aria-label={`${category.name} weight`}
                      aria-valuemin={0}
                      aria-valuemax={50}
                      aria-valuenow={customWeights[category.id] || 0}
                      aria-valuetext={isExcluded ? 'Excluded' : `${customWeights[category.id] || 0}%`}
                    />
                    <span className={`slider-value ${isExcluded ? 'excluded' : ''}`}>
                      {isExcluded ? '—' : `${customWeights[category.id] || 0}%`}
                    </span>
                    {!isExcluded && (
                      <label className="lock-checkbox" title={isLocked ? 'Unlock adjustment' : 'Lock adjustment %'}>
                        <input
                          type="checkbox"
                          checked={isLocked}
                          onChange={() => handleLockToggle(category.id)}
                          className="lock-input"
                        />
                        <span className={`lock-icon ${isLocked ? 'locked' : ''}`}>
                          {isLocked ? '🔒' : '🔓'}
                        </span>
                      </label>
                    )}
                  </div>
                </div>
              );
            })}

            {excludedCategories.size > 0 && (
              <div className="exclusion-summary">
                <span className="summary-icon">ℹ️</span>
                <span>
                  {excludedCategories.size} categor{excludedCategories.size === 1 ? 'y' : 'ies'} excluded.
                  Weights redistributed to {CATEGORIES.length - excludedCategories.size} active categories.
                </span>
              </div>
            )}
          </div>

          {/* NEW: Law vs Lived Reality Slider */}
          <div className={`law-lived-section${isLawLivedCustom ? ' active' : ''}`}>
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
            <div className={`conservative-mode${conservativeMode ? ' active' : ''}`}>
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
