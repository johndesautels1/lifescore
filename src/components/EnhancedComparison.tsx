/**
 * LIFE SCORE™ Enhanced Comparison Components
 * Multi-LLM consensus UI
 */

import React, { useState, useEffect } from 'react';
import type { EnhancedComparisonResult, LLMProvider, LLMAPIKeys, EnhancedComparisonProgress } from '../types/enhancedComparison';
import { LLM_CONFIGS, DEFAULT_ENHANCED_LLMS } from '../types/enhancedComparison';
import { CATEGORIES, getMetricsByCategory } from '../data/metrics';
import { getStoredAPIKeys, saveAPIKeys, runEnhancedComparison, generateDemoEnhancedComparison } from '../services/enhancedComparison';
import { saveEnhancedComparisonLocal, isEnhancedComparisonSaved } from '../services/savedComparisons';
import './EnhancedComparison.css';

// Metric icons mapping
const METRIC_ICONS: Record<string, string> = {
  // Personal Freedom
  'Cannabis': '🌿',
  'Alcohol Laws': '🍺',
  'Gambling': '🎰',
  'Sex Work Laws': '💋',
  'Drug Penalties': '💊',
  'Abortion Access': '⚕️',
  'LGBTQ+ Rights': '🏳️‍🌈',
  'Assisted Dying': '🕊️',
  'Smoking Laws': '🚬',
  'Public Drinking': '🍻',
  'Helmet Laws': '⛑️',
  'Seatbelt Laws': '🚗',
  'Jaywalking': '🚶',
  'Curfews': '🌙',
  'Noise Laws': '🔊',
  // Housing & Property
  'HOA Prevalence': '🏘️',
  'HOA Power': '📋',
  'Property Tax Rate': '💰',
  'Zoning Flexibility': '🗺️',
  'Short-Term Rentals': '🏠',
  'Rent Control': '🔒',
  'Eviction Laws': '📜',
  'ADU Rules': '🏗️',
  'Home Business': '💼',
  'Solar Rights': '☀️',
  'Rainwater': '💧',
  'Fence Rules': '🧱',
  'Paint Colors': '🎨',
  'Lawn Requirements': '🌱',
  'Vehicle Parking': '🚙',
  'Livestock': '🐔',
  'Tree Removal': '🌳',
  'Building Permits': '📝',
  'Historic Rules': '🏛️',
  'Eminent Domain': '⚖️',
  // Business & Work
  'Business License': '📄',
  'Professional License': '🎓',
  'Food Permits': '🍽️',
  'Alcohol License': '🍷',
  'Home Occupation': '🏡',
  'Street Vending': '🛒',
  'Signage Rules': '🪧',
  'Operating Hours': '🕐',
  'Hiring Freedom': '👥',
  'Firing Freedom': '📤',
  'Min Wage Gap': '💵',
  'Benefits Mandates': '🏥',
  'Union Rules': '✊',
  'Non-Compete': '📑',
  'Freelance Laws': '💻',
  'Gig Economy': '📱',
  'Child Labor': '👶',
  'Overtime Rules': '⏰',
  'Break Mandates': '☕',
  'Leave Laws': '🏖️',
  'Privacy Laws': '🔐',
  'Drug Testing': '🧪',
  'Tax Complexity': '📊',
  'Regulatory Burden': '📚',
  'Inspection Freq': '🔍',
  // Transportation
  'Car Dependency': '🚗',
  'Public Transit': '🚇',
  'Bike Infra': '🚲',
  'Walkability': '👟',
  'Ride Share': '🚕',
  'E-Scooters': '🛴',
  'License Ease': '🪪',
  'Vehicle Inspect': '🔧',
  'Emissions Rules': '💨',
  'Parking Rules': '🅿️',
  'Traffic Enforce': '🚨',
  'Speed Limits': '⚡',
  'DUI Threshold': '🍸',
  'Phone Laws': '📵',
  'Road Quality': '🛣️',
  // Policing & Legal
  'Police Presence': '👮',
  'Civil Forfeiture': '💸',
  'Incarceration': '🔒',
  'Cash Bail': '🏦',
  'Public Defender': '⚖️',
  'Court Fees': '💳',
  'Warrant Rules': '📃',
  'Stop & Frisk': '🛑',
  'Surveillance': '📹',
  'Data Privacy': '🔏',
  'Protest Rights': '✊',
  'Qualified Immunity': '🛡️',
  'Complaint Process': '📝',
  'Body Cameras': '📷',
  'Use of Force': '⚠️',
  // Speech & Lifestyle
  'Speech Laws': '🗣️',
  'Press Freedom': '📰',
  'Assembly Rights': '👥',
  'Religious Freedom': '🙏',
  'Gun Rights': '🔫',
  'Knife Laws': '🔪',
  'Dress Codes': '👔',
  'Nudity Laws': '🩱',
  'Homeschool': '📚',
  'Curriculum': '🎒'
};

const getMetricIcon = (shortName: string): string => {
  return METRIC_ICONS[shortName] || '📊';
};

// ============================================================================
// API KEY CONFIGURATION MODAL
// ============================================================================

interface APIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: LLMAPIKeys) => void;
  initialKeys: LLMAPIKeys;
}

export const APIKeyModal: React.FC<APIKeyModalProps> = ({ isOpen, onClose, onSave, initialKeys }) => {
  const [keys, setKeys] = useState<LLMAPIKeys>(initialKeys);

  useEffect(() => {
    setKeys(initialKeys);
  }, [initialKeys]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAPIKeys(keys);
    onSave(keys);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="api-key-modal" onClick={e => e.stopPropagation()}>
        <h3>Configure LLM API Keys</h3>
        <p className="modal-description">
          Enter your API keys to enable enhanced multi-LLM comparison.
          Keys are stored locally in your browser.
        </p>

        <div className="api-key-list">
          <div className="api-key-group">
            <label>
              <span className="key-icon">🎭</span>
              Anthropic (Claude)
            </label>
            <input
              type="password"
              value={keys.anthropic || ''}
              onChange={e => setKeys({ ...keys, anthropic: e.target.value })}
              placeholder="sk-ant-..."
            />
            <span className="key-models">Claude Opus 4.5 (Judge), Sonnet 4</span>
          </div>

          <div className="api-key-group">
            <label>
              <span className="key-icon">🤖</span>
              OpenAI
            </label>
            <input
              type="password"
              value={keys.openai || ''}
              onChange={e => setKeys({ ...keys, openai: e.target.value })}
              placeholder="sk-..."
            />
            <span className="key-models">GPT-4o</span>
          </div>

          <div className="api-key-group">
            <label>
              <span className="key-icon">💎</span>
              Google
            </label>
            <input
              type="password"
              value={keys.google || ''}
              onChange={e => setKeys({ ...keys, google: e.target.value })}
              placeholder="AI..."
            />
            <span className="key-models">Gemini 3 Pro</span>
          </div>

          <div className="api-key-group">
            <label>
              <span className="key-icon">𝕏</span>
              xAI
            </label>
            <input
              type="password"
              value={keys.xai || ''}
              onChange={e => setKeys({ ...keys, xai: e.target.value })}
              placeholder="xai-..."
            />
            <span className="key-models">Grok 4</span>
          </div>

          <div className="api-key-group">
            <label>
              <span className="key-icon">🔮</span>
              Perplexity
            </label>
            <input
              type="password"
              value={keys.perplexity || ''}
              onChange={e => setKeys({ ...keys, perplexity: e.target.value })}
              placeholder="pplx-..."
            />
            <span className="key-models">Sonar Reasoning Pro</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Keys</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ENHANCED MODE TOGGLE
// ============================================================================

interface EnhancedModeToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onConfigureKeys: () => void;
  availableLLMs: LLMProvider[];
}

export const EnhancedModeToggle: React.FC<EnhancedModeToggleProps> = ({
  enabled,
  onToggle,
  onConfigureKeys,
  availableLLMs
}) => {
  return (
    <div className="enhanced-mode-toggle">
      <div className="toggle-header">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => onToggle(e.target.checked)}
          />
          <span className="toggle-slider"></span>
          <span className="toggle-text">
            <span className="toggle-icon">🚀</span>
            Enhanced Mode
          </span>
        </label>
        <button className="configure-btn" onClick={onConfigureKeys} title="Configure API Keys">
          ⚙️
        </button>
      </div>

      {enabled && (
        <div className="toggle-info">
          <p>5 LLMs will evaluate each metric, with Claude Opus as final judge.</p>
          <div className="available-llms">
            {DEFAULT_ENHANCED_LLMS.map(llm => {
              const config = LLM_CONFIGS[llm];
              const isAvailable = availableLLMs.includes(llm);
              return (
                <span
                  key={llm}
                  className={`llm-badge ${isAvailable ? 'available' : 'unavailable'}`}
                  title={isAvailable ? 'API key configured' : 'API key not configured'}
                >
                  {config.icon} {config.shortName}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ENHANCED PROGRESS DISPLAY
// ============================================================================

interface EnhancedProgressProps {
  progress: EnhancedComparisonProgress;
}

export const EnhancedProgress: React.FC<EnhancedProgressProps> = ({ progress }) => {
  const getPhaseText = () => {
    switch (progress.phase) {
      case 'initializing': return 'Initializing enhanced comparison...';
      case 'evaluating': return `Evaluating with ${progress.currentLLM ? LLM_CONFIGS[progress.currentLLM]?.name : 'LLMs'}...`;
      case 'judging': return 'Claude Opus is building consensus...';
      case 'complete': return 'Analysis complete!';
    }
  };

  return (
    <div className="enhanced-progress">
      <div className="progress-phase">{getPhaseText()}</div>

      <div className="llm-progress-grid">
        {DEFAULT_ENHANCED_LLMS.map(llm => {
          const config = LLM_CONFIGS[llm];
          const isComplete = progress.llmsCompleted.includes(llm);
          const isCurrent = progress.currentLLM === llm;

          return (
            <div
              key={llm}
              className={`llm-progress-item ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <span className="llm-icon">{config.icon}</span>
              <span className="llm-name">{config.shortName}</span>
              {isComplete && <span className="check-icon">✓</span>}
              {isCurrent && <span className="spinner-small"></span>}
            </div>
          );
        })}
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar"
          style={{ width: `${(progress.llmsCompleted.length / DEFAULT_ENHANCED_LLMS.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// ENHANCED RESULTS DISPLAY
// ============================================================================

interface EnhancedResultsProps {
  result: EnhancedComparisonResult;
}

export const EnhancedResults: React.FC<EnhancedResultsProps> = ({ result }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const winner = result.winner === 'city1' ? result.city1 : result.city2;
  const loser = result.winner === 'city1' ? result.city2 : result.city1;
  const isTie = result.winner === 'tie';

  useEffect(() => {
    setIsSaved(isEnhancedComparisonSaved(result.comparisonId));
  }, [result.comparisonId]);

  const handleSave = () => {
    saveEnhancedComparisonLocal(result);
    setIsSaved(true);
    setSaveMessage('Comparison saved!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleShare = async () => {
    const shareText = `LIFE SCORE™ Comparison: ${result.city1.city} (${result.city1.totalConsensusScore}) vs ${result.city2.city} (${result.city2.totalConsensusScore}) - Winner: ${winner.city}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LIFE SCORE™ Comparison',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      setSaveMessage('Copied to clipboard!');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(result, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifescore-${result.city1.city}-vs-${result.city2.city}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="enhanced-results">
      {/* Winner Hero */}
      <div className={`enhanced-winner-hero ${isTie ? 'tie' : ''}`}>
        <div className="consensus-badge">
          <span className="badge-icon">🧠</span>
          <span className="badge-text">Multi-LLM Consensus</span>
          <span className={`confidence-${result.overallConsensusConfidence}`}>
            {result.overallConsensusConfidence.toUpperCase()} CONFIDENCE
          </span>
        </div>

        {!isTie ? (
          <>
            <div className="winner-trophy">🏆</div>
            <h2 className="winner-city">{winner.city}, {winner.country}</h2>
            <div className="winner-score">{winner.totalConsensusScore}</div>
            <p className="winner-label">CONSENSUS LIFE SCORE™</p>
            <p className="winner-difference">
              {result.scoreDifference} points ahead of {loser.city}
            </p>
          </>
        ) : (
          <>
            <div className="winner-trophy">⚖️</div>
            <h2 className="winner-city">Consensus: It's a Tie!</h2>
            <div className="winner-score">{result.city1.totalConsensusScore}</div>
            <p className="winner-label">Both cities scored equally</p>
          </>
        )}

        <div className="llms-used">
          <span className="llms-label">Evaluated by:</span>
          <div className="llm-icons">
            {result.llmsUsed.map(llm => (
              <span key={llm} className="llm-icon-small" title={LLM_CONFIGS[llm].name}>
                {LLM_CONFIGS[llm].icon}
              </span>
            ))}
            <span className="judge-badge" title="Final judge">
              {LLM_CONFIGS['claude-opus'].icon} Judge
            </span>
          </div>
        </div>
      </div>

      {/* Score Comparison */}
      <div className="enhanced-score-grid card">
        <div className={`score-box ${result.winner === 'city1' ? 'winner' : ''}`}>
          <h3>{result.city1.city}, {result.city1.country}</h3>
          <div className="consensus-score">{result.city1.totalConsensusScore}</div>
          <div className="agreement-meter">
            <span className="agreement-label">LLM Agreement:</span>
            <div className="agreement-bar">
              <div
                className="agreement-fill"
                style={{ width: `${result.city1.overallAgreement}%` }}
              />
            </div>
            <span className="agreement-value">{result.city1.overallAgreement}%</span>
          </div>
        </div>

        <div className={`score-box ${result.winner === 'city2' ? 'winner' : ''}`}>
          <h3>{result.city2.city}, {result.city2.country}</h3>
          <div className="consensus-score">{result.city2.totalConsensusScore}</div>
          <div className="agreement-meter">
            <span className="agreement-label">LLM Agreement:</span>
            <div className="agreement-bar">
              <div
                className="agreement-fill"
                style={{ width: `${result.city2.overallAgreement}%` }}
              />
            </div>
            <span className="agreement-value">{result.city2.overallAgreement}%</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown - Expandable */}
      <div className="enhanced-categories card">
        <h3 className="section-title">Category Breakdown</h3>
        <p className="breakdown-subtitle">Click any category to see detailed metric scores</p>

        {CATEGORIES.map(category => {
          const city1Cat = result.city1.categories.find(c => c.categoryId === category.id);
          const city2Cat = result.city2.categories.find(c => c.categoryId === category.id);
          const catWinner = result.categoryWinners[category.id];
          const isExpanded = expandedCategory === category.id;
          const categoryMetrics = getMetricsByCategory(category.id);

          return (
            <div key={category.id} className="enhanced-category">
              <button
                className="category-header-btn"
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
              >
                <div className="category-header">
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-weight">({category.weight}%)</span>
                </div>
                <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
              </button>

              <div className="category-scores">
                <div className={`cat-score ${catWinner === 'city1' ? 'winner' : ''}`}>
                  <span className="city-name">{result.city1.city}</span>
                  <span className="score-value">{city1Cat?.averageConsensusScore || 0}%</span>
                </div>

                <div className={`cat-score ${catWinner === 'city2' ? 'winner' : ''}`}>
                  <span className="city-name">{result.city2.city}</span>
                  <span className="score-value">{city2Cat?.averageConsensusScore || 0}%</span>
                </div>
              </div>

              {/* Expanded Metric Details */}
              {isExpanded && city1Cat && city2Cat && (
                <div className="metric-details">
                  <div className="metric-details-header">
                    <span>Metric</span>
                    <span className="metric-header-city">{result.city1.city}</span>
                    <span className="metric-header-city">{result.city2.city}</span>
                  </div>

                  {categoryMetrics.map(metric => {
                    const city1Metric = city1Cat.metrics.find(m => m.metricId === metric.id);
                    const city2Metric = city2Cat.metrics.find(m => m.metricId === metric.id);
                    const score1 = city1Metric?.consensusScore ?? 0;
                    const score2 = city2Metric?.consensusScore ?? 0;

                    return (
                      <div key={metric.id} className="metric-row">
                        <div className="metric-info">
                          <span className="metric-icon">{getMetricIcon(metric.shortName)}</span>
                          <span className="metric-name" title={metric.description}>
                            {metric.shortName}
                          </span>
                        </div>
                        <div className={`metric-score ${score1 > score2 ? 'winning' : ''}`}>
                          {Math.round(score1)}
                        </div>
                        <div className={`metric-score ${score2 > score1 ? 'winning' : ''}`}>
                          {Math.round(score2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="enhanced-actions card">
        {saveMessage && (
          <span className="save-message">{saveMessage}</span>
        )}
        <div className="action-buttons">
          <button
            className={`btn action-btn save-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={isSaved}
          >
            {isSaved ? '✓ Saved' : '💾 Save'}
          </button>
          <button className="btn action-btn share-btn" onClick={handleShare}>
            📤 Share
          </button>
          <button className="btn action-btn export-btn" onClick={handleExport}>
            📥 Export JSON
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="enhanced-footer card">
        <h4>About Enhanced Comparison</h4>
        <p>
          This enhanced LIFE SCORE™ used <strong>{result.llmsUsed.length} different AI models</strong> to
          independently evaluate {result.processingStats.metricsEvaluated} freedom metrics.
          Claude Opus 4.5 served as the final judge to build consensus scores.
        </p>
        <p>
          <strong>Generated:</strong> {new Date(result.generatedAt).toLocaleString()}
          <br />
          <strong>Comparison ID:</strong> {result.comparisonId}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ENHANCED COMPARISON CONTAINER
// ============================================================================

interface EnhancedComparisonContainerProps {
  city1: string;
  city2: string;
  onComplete: (result: EnhancedComparisonResult) => void;
  demoMode?: boolean;
}

export const EnhancedComparisonContainer: React.FC<EnhancedComparisonContainerProps> = ({
  city1,
  city2,
  onComplete,
  demoMode = true
}) => {
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState<EnhancedComparisonProgress | null>(null);
  const [result, setResult] = useState<EnhancedComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runComparison();
  }, [city1, city2]);

  const runComparison = async () => {
    setStatus('running');
    setError(null);

    try {
      if (demoMode) {
        // Simulate progress for demo
        for (let i = 0; i < DEFAULT_ENHANCED_LLMS.length; i++) {
          setProgress({
            phase: 'evaluating',
            currentLLM: DEFAULT_ENHANCED_LLMS[i],
            llmsCompleted: DEFAULT_ENHANCED_LLMS.slice(0, i),
            metricsProcessed: i * 20,
            totalMetrics: 100
          });
          await new Promise(r => setTimeout(r, 400));
        }

        setProgress({
          phase: 'judging',
          llmsCompleted: DEFAULT_ENHANCED_LLMS,
          metricsProcessed: 100,
          totalMetrics: 100
        });
        await new Promise(r => setTimeout(r, 600));

        const demoResult = generateDemoEnhancedComparison(city1, city2);
        setResult(demoResult);
        setStatus('complete');
        onComplete(demoResult);
      } else {
        const apiKeys = getStoredAPIKeys();
        const enhancedResult = await runEnhancedComparison({
          city1,
          city2,
          apiKeys,
          onProgress: setProgress
        });
        setResult(enhancedResult);
        setStatus('complete');
        onComplete(enhancedResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  if (status === 'running' && progress) {
    return <EnhancedProgress progress={progress} />;
  }

  if (status === 'error') {
    return (
      <div className="enhanced-error card">
        <h3>Error Running Enhanced Comparison</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={runComparison}>
          Try Again
        </button>
      </div>
    );
  }

  if (status === 'complete' && result) {
    return <EnhancedResults result={result} />;
  }

  return null;
};

export default EnhancedComparisonContainer;
