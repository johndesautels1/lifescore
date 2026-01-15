/**
 * LIFE SCORE™ Enhanced Comparison Components
 * Multi-LLM consensus UI
 */

import React, { useState, useEffect } from 'react';
import type { EnhancedComparisonResult, LLMProvider, LLMAPIKeys, EnhancedComparisonProgress } from '../types/enhancedComparison';
import { LLM_CONFIGS, DEFAULT_ENHANCED_LLMS } from '../types/enhancedComparison';
import { CATEGORIES, getMetricsByCategory, ALL_METRICS } from '../data/metrics';
import { getStoredAPIKeys, saveAPIKeys, runEnhancedComparison, generateDemoEnhancedComparison } from '../services/enhancedComparison';
import { saveEnhancedComparisonLocal, isEnhancedComparisonSaved } from '../services/savedComparisons';
import { getMetricTooltip } from '../data/metricTooltips';
import { DealbreakersWarning, checkDealbreakers } from './DealbreakersWarning';
import { updateOGMetaTags } from '../hooks/useOGMeta';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import './EnhancedComparison.css';

// Metric icons mapping - matches exact shortNames from metrics.ts
const METRIC_ICONS: Record<string, string> = {
  // Personal Freedom (15)
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
  // Housing & Property (20)
  'HOA Prevalence': '🏘️',
  'HOA Power': '📋',
  'Property Tax': '💰',
  'Rent Control': '🔒',
  'Eviction Protection': '🛡️',
  'Zoning': '🗺️',
  'Permits': '📝',
  'STR/Airbnb': '🏠',
  'ADU Laws': '🏗️',
  'Home Business': '💼',
  'Eminent Domain': '⚖️',
  'Squatter Rights': '🏚️',
  'Historic Rules': '🏛️',
  'Foreign Ownership': '🌐',
  'Transfer Tax': '💸',
  'Lawn Rules': '🌱',
  'Exterior Rules': '🎨',
  'Fence Rules': '🧱',
  'Parking Rules': '🅿️',
  'Pet Rules': '🐕',
  // Business & Work (25)
  'Business License': '📄',
  'Occupation License': '🎓',
  'Min Wage': '💵',
  'Right to Work': '✊',
  'Employment Laws': '📜',
  'Paid Leave': '🏖️',
  'Parental Leave': '👶',
  'Non-Compete': '📑',
  'Corp Tax': '🏢',
  'Income Tax': '💳',
  'Sales Tax': '🛒',
  'Gig Work Laws': '📱',
  'Work Visa': '🛂',
  'Remote Work': '💻',
  'Overtime Rules': '⏰',
  'Union Rights': '🤝',
  'Safety Standards': '🦺',
  'Anti-Discrimination': '⚖️',
  'Startup Ease': '🚀',
  'Food Trucks': '🚚',
  'Contractor License': '🔧',
  'Health Mandate': '🏥',
  'Tip Credit': '💵',
  'Banking Access': '🏦',
  'Crypto Laws': '₿',
  // Transportation (15)
  'Transit Quality': '🚇',
  'Walkability': '👟',
  'Bike Infra': '🚲',
  'Car Dependency': '🚗',
  'Rideshare': '🚕',
  'Speed Limits': '⚡',
  'Traffic Cameras': '📷',
  'Toll Roads': '🛣️',
  'Vehicle Inspection': '🔍',
  'License Reqs': '🪪',
  'DUI Laws': '🍸',
  'E-Mobility': '🛴',
  'Airport Access': '✈️',
  'Traffic': '🚦',
  // Policing & Legal (15)
  'Incarceration': '🔒',
  'Police Density': '👮',
  'Asset Forfeiture': '💸',
  'Mandatory Mins': '⏱️',
  'Bail System': '🏛️',
  'Police Oversight': '👁️',
  'Qualified Immunity': '🛡️',
  'Legal Costs': '💳',
  'Court Efficiency': '⚖️',
  'Jury Rights': '🧑‍⚖️',
  'Surveillance': '📹',
  'Search Protections': '🔐',
  'Death Penalty': '⚠️',
  'Prison Standards': '🏢',
  'Expungement': '📋',
  // Speech & Lifestyle (10)
  'Free Speech': '🗣️',
  'Press Freedom': '📰',
  'Internet Freedom': '🌐',
  'Hate Speech Laws': '🚫',
  'Protest Rights': '✊',
  'Religious Freedom': '🙏',
  'Data Privacy': '🔏',
  'Dress Freedom': '👔',
  'Tolerance': '🤝',
  'Defamation Laws': '⚖️'
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
  dealbreakers?: string[];
}

// Helper to calculate top metric differences
interface MetricDifference {
  metricId: string;
  shortName: string;
  icon: string;
  city1Score: number;
  city2Score: number;
  difference: number;
  favoredCity: 'city1' | 'city2';
}

const calculateTopDifferences = (result: EnhancedComparisonResult, count: number = 5): MetricDifference[] => {
  const differences: MetricDifference[] = [];

  result.city1.categories.forEach((city1Cat, catIndex) => {
    const city2Cat = result.city2.categories[catIndex];
    if (!city2Cat) return;

    city1Cat.metrics.forEach((metric1, metricIndex) => {
      const metric2 = city2Cat.metrics[metricIndex];
      if (!metric2) return;

      // Look up the actual metric definition to get the real shortName
      const metricDef = ALL_METRICS.find(m => m.id === metric1.metricId);
      const shortName = metricDef?.shortName || metric1.metricId;

      const diff = Math.abs(metric1.consensusScore - metric2.consensusScore);
      differences.push({
        metricId: metric1.metricId,
        shortName: shortName,
        icon: getMetricIcon(shortName),
        city1Score: metric1.consensusScore,
        city2Score: metric2.consensusScore,
        difference: diff,
        favoredCity: metric1.consensusScore > metric2.consensusScore ? 'city1' : 'city2'
      });
    });
  });

  return differences.sort((a, b) => b.difference - a.difference).slice(0, count);
};

export const EnhancedResults: React.FC<EnhancedResultsProps> = ({ result, dealbreakers = [] }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTopDifferences, setShowTopDifferences] = useState(true);
  const [scoreViewMode, setScoreViewMode] = useState<'lived' | 'lawVsReality'>('lived');

  const winner = result.winner === 'city1' ? result.city1 : result.city2;
  const loser = result.winner === 'city1' ? result.city2 : result.city1;
  const isTie = result.winner === 'tie';

  // Calculate top 5 differences for the summary
  const topDifferences = calculateTopDifferences(result, 5);

  // Check for dealbreaker failures
  const city1AllMetrics = result.city1.categories.flatMap(c => c.metrics);
  const city2AllMetrics = result.city2.categories.flatMap(c => c.metrics);
  const city1FailedDealbreakers = checkDealbreakers(dealbreakers, city1AllMetrics);
  const city2FailedDealbreakers = checkDealbreakers(dealbreakers, city2AllMetrics);

  // Generate winner explanation narrative
  const generateExplanation = (): string => {
    if (isTie) {
      return `Both ${result.city1.city} and ${result.city2.city} scored equally at ${result.city1.totalConsensusScore} points. This is a rare outcome indicating both cities offer similar levels of legal freedom across our 100 metrics.`;
    }

    // Find categories where winner leads most
    const categoryAdvantages = winner.categories.map((wCat, i) => {
      const lCat = loser.categories[i];
      return {
        category: CATEGORIES.find(c => c.id === wCat.categoryId),
        advantage: wCat.averageConsensusScore - (lCat?.averageConsensusScore || 0)
      };
    }).filter(c => c.advantage > 0).sort((a, b) => b.advantage - a.advantage);

    const top3Advantages = categoryAdvantages.slice(0, 3);

    let explanation = `**${winner.city}** emerges as the clear winner with a score of **${winner.totalConsensusScore}** vs ${loser.city}'s ${loser.totalConsensusScore} — a **${result.scoreDifference} point** advantage.\n\n`;

    explanation += `**Where ${winner.city} Shines:**\n`;
    top3Advantages.forEach((adv, i) => {
      if (adv.category) {
        explanation += `${i + 1}. **${adv.category.name}** (+${Math.round(adv.advantage)} points) — ${winner.city} offers significantly more freedom in ${adv.category.description.toLowerCase()}\n`;
      }
    });

    // Find areas where loser does better
    const loserAdvantages = loser.categories.map((lCat, i) => {
      const wCat = winner.categories[i];
      return {
        category: CATEGORIES.find(c => c.id === lCat.categoryId),
        advantage: lCat.averageConsensusScore - (wCat?.averageConsensusScore || 0)
      };
    }).filter(c => c.advantage > 0).sort((a, b) => b.advantage - a.advantage);

    if (loserAdvantages.length > 0) {
      explanation += `\n**Where ${loser.city} Wins:**\n`;
      loserAdvantages.slice(0, 2).forEach((adv, i) => {
        if (adv.category) {
          explanation += `${i + 1}. **${adv.category.name}** (+${Math.round(adv.advantage)} points)\n`;
        }
      });
    }

    explanation += `\n**Bottom Line:** If you value overall legal freedom, ${winner.city} is your better choice. However, if ${loserAdvantages[0]?.category?.name.toLowerCase()} matters most to you, ${loser.city} might be worth considering.`;

    return explanation;
  };

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

            {/* Freedom Delta Badge - Prominent display of score difference */}
            <div className="freedom-delta-badge">
              <span className="delta-icon">⚡</span>
              <span className="delta-value">+{result.scoreDifference}</span>
              <span className="delta-label">FREEDOM DELTA</span>
            </div>

            <p className="winner-difference">
              {winner.city} offers more freedom than {loser.city}
            </p>

            {/* Explain the Winner Button */}
            <button
              className="explain-btn"
              onClick={() => setShowExplanation(!showExplanation)}
            >
              {showExplanation ? '📖 Hide Explanation' : '💡 Explain This Winner'}
            </button>
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

      {/* Winner Explanation */}
      {showExplanation && (
        <div className="winner-explanation card">
          <h3 className="section-title">💡 Why {winner.city} Wins</h3>
          <div className="explanation-content">
            {generateExplanation().split('\n').map((line, i) => {
              if (line.startsWith('**') && line.includes(':**')) {
                return <h4 key={i}>{line.replace(/\*\*/g, '')}</h4>;
              }
              if (line.match(/^\d\./)) {
                return <p key={i} className="explanation-point">{line.replace(/\*\*/g, '')}</p>;
              }
              return <p key={i}>{line.replace(/\*\*/g, '')}</p>;
            })}
          </div>
        </div>
      )}

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

      {/* Dealbreaker Warnings */}
      {city1FailedDealbreakers.length > 0 && (
        <DealbreakersWarning
          cityName={result.city1.city}
          failedDealbreakers={city1FailedDealbreakers}
        />
      )}
      {city2FailedDealbreakers.length > 0 && (
        <DealbreakersWarning
          cityName={result.city2.city}
          failedDealbreakers={city2FailedDealbreakers}
        />
      )}

      {/* Top 5 Differences - Collapsible Quick Summary */}
      <div className="top-differences card">
        <button
          className="section-toggle"
          onClick={() => setShowTopDifferences(!showTopDifferences)}
        >
          <h3 className="section-title">🎯 Top 5 Deciding Factors</h3>
          <span className={`toggle-arrow ${showTopDifferences ? 'expanded' : ''}`}>▼</span>
        </button>

        {showTopDifferences && (
          <>
            <p className="breakdown-subtitle">The metrics with the biggest score differences</p>
            <div className="differences-list">
              {topDifferences.map((diff, index) => {
                const favoredCityName = diff.favoredCity === 'city1' ? result.city1.city : result.city2.city;
                return (
                  <div key={diff.metricId} className="difference-item">
                    <div className="diff-rank">#{index + 1}</div>
                    <div className="diff-metric">
                      <span className="diff-icon">{diff.icon}</span>
                      <span className="diff-name">{diff.shortName}</span>
                    </div>
                    <div className="diff-scores">
                      <span className={`diff-score ${diff.favoredCity === 'city1' ? 'favored' : ''}`}>
                        {Math.round(diff.city1Score)}
                      </span>
                      <span className="diff-vs">vs</span>
                      <span className={`diff-score ${diff.favoredCity === 'city2' ? 'favored' : ''}`}>
                        {Math.round(diff.city2Score)}
                      </span>
                    </div>
                    <div className="diff-delta">
                      <span className="delta-pill">+{Math.round(diff.difference)}</span>
                      <span className="delta-city">{favoredCityName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Category Breakdown - Expandable */}
      <div className="enhanced-categories card">
        <div className="category-header-row">
          <div>
            <h3 className="section-title">Category Breakdown</h3>
            <p className="breakdown-subtitle">Click any category to see detailed metric scores</p>
          </div>
        </div>

        {/* Law vs Reality Toggle - Prominent */}
        <div className={`score-view-toggle-container ${scoreViewMode === 'lawVsReality' ? 'reality-mode' : ''}`}>
          <div className="toggle-header">
            <span className="toggle-icon-large">{scoreViewMode === 'lived' ? '📊' : '⚖️'}</span>
            <span className="toggle-title">Score Display Mode</span>
          </div>
          <div className="toggle-buttons-large">
            <button
              className={`toggle-btn-large ${scoreViewMode === 'lived' ? 'active' : ''}`}
              onClick={() => setScoreViewMode('lived')}
            >
              <span className="btn-icon">📊</span>
              <span className="btn-label">Lived Freedom</span>
              <span className="btn-desc">Blended score (50% Law + 50% Enforcement)</span>
            </button>
            <button
              className={`toggle-btn-large ${scoreViewMode === 'lawVsReality' ? 'active' : ''}`}
              onClick={() => setScoreViewMode('lawVsReality')}
            >
              <span className="btn-icon">⚖️</span>
              <span className="btn-label">Law vs Reality</span>
              <span className="btn-desc">See what the law says vs how it's enforced</span>
            </button>
          </div>
          {scoreViewMode === 'lawVsReality' && (
            <div className="mode-indicator">
              <span className="indicator-badge law">Law</span> = What the law says
              <span className="indicator-sep">|</span>
              <span className="indicator-badge enforce">Reality</span> = How it's actually enforced
              <span className="indicator-sep">|</span>
              <span className="indicator-badge gap">!</span> = Enforcement gap warning
            </div>
          )}
        </div>

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
                <div className={`metric-details ${scoreViewMode === 'lawVsReality' ? 'dual-score-mode' : ''}`}>
                  {/* Header changes based on view mode */}
                  {scoreViewMode === 'lived' ? (
                    <div className="metric-details-header">
                      <span>Metric</span>
                      <span className="metric-header-city">{result.city1.city}</span>
                      <span className="metric-header-city">{result.city2.city}</span>
                    </div>
                  ) : (
                    <div className="metric-details-header dual-header">
                      <span>Metric</span>
                      <div className="dual-header-city">
                        <span className="city-name">{result.city1.city}</span>
                        <div className="dual-labels">
                          <span className="label-law">Law</span>
                          <span className="label-enforce">Reality</span>
                        </div>
                      </div>
                      <div className="dual-header-city">
                        <span className="city-name">{result.city2.city}</span>
                        <div className="dual-labels">
                          <span className="label-law">Law</span>
                          <span className="label-enforce">Reality</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {categoryMetrics.map(metric => {
                    const city1Metric = city1Cat.metrics.find(m => m.metricId === metric.id);
                    const city2Metric = city2Cat.metrics.find(m => m.metricId === metric.id);
                    const score1 = city1Metric?.consensusScore ?? 0;
                    const score2 = city2Metric?.consensusScore ?? 0;
                    const tooltip = getMetricTooltip(metric.shortName);

                    // Dual scores
                    const legal1 = city1Metric?.legalScore ?? score1;
                    const enforce1 = city1Metric?.enforcementScore ?? score1;
                    const legal2 = city2Metric?.legalScore ?? score2;
                    const enforce2 = city2Metric?.enforcementScore ?? score2;

                    // Calculate LLM agreement indicator
                    const confidence1 = city1Metric?.confidenceLevel || 'moderate';
                    const llmCount = city1Metric?.llmScores?.length || 5;
                    const agreementText = confidence1 === 'unanimous' ? `${llmCount}/${llmCount}` :
                                         confidence1 === 'strong' ? `${llmCount-1}/${llmCount}` :
                                         confidence1 === 'moderate' ? `${llmCount-2}/${llmCount}` : `Split`;
                    const agreementClass = confidence1 === 'unanimous' ? 'unanimous' :
                                          confidence1 === 'strong' ? 'strong' :
                                          confidence1 === 'moderate' ? 'moderate' : 'split';

                    return (
                      <div key={metric.id} className={`metric-row ${scoreViewMode === 'lawVsReality' ? 'dual-row' : ''}`}>
                        <div className="metric-info">
                          <span className="metric-icon">{getMetricIcon(metric.shortName)}</span>
                          <div className="metric-name-container">
                            <span className="metric-name">
                              {metric.shortName}
                            </span>
                            {tooltip && (
                              <div className="metric-tooltip">
                                <span className="tooltip-trigger" title={tooltip.whyMatters}>?</span>
                                <div className="tooltip-content">
                                  <strong>Why This Matters:</strong>
                                  <p>{tooltip.whyMatters}</p>
                                </div>
                              </div>
                            )}
                            <span className={`llm-agreement ${agreementClass}`} title={`${agreementText} LLMs agree`}>
                              {agreementText}
                            </span>
                          </div>
                        </div>

                        {/* Lived Freedom Mode - Single Score */}
                        {scoreViewMode === 'lived' ? (
                          <>
                            <div className={`metric-score ${score1 > score2 ? 'winning' : ''}`}>
                              {Math.round(score1)}
                              {city1Metric?.llmScores?.[0]?.confidence && (
                                <span className={`data-quality ${city1Metric.llmScores[0].confidence}`}>
                                  {city1Metric.llmScores[0].confidence === 'high' ? '✓' :
                                   city1Metric.llmScores[0].confidence === 'medium' ? '~' : '?'}
                                </span>
                              )}
                            </div>
                            <div className={`metric-score ${score2 > score1 ? 'winning' : ''}`}>
                              {Math.round(score2)}
                              {city2Metric?.llmScores?.[0]?.confidence && (
                                <span className={`data-quality ${city2Metric.llmScores[0].confidence}`}>
                                  {city2Metric.llmScores[0].confidence === 'high' ? '✓' :
                                   city2Metric.llmScores[0].confidence === 'medium' ? '~' : '?'}
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          /* Law vs Reality Mode - Dual Scores */
                          <>
                            <div className="dual-score-cell">
                              <span className={`law-score ${legal1 > legal2 ? 'winning' : ''}`} title="What the law says">
                                {Math.round(legal1)}
                              </span>
                              <span className={`enforce-score ${enforce1 > enforce2 ? 'winning' : ''} ${enforce1 < legal1 - 10 ? 'gap-warning' : ''}`} title="How it's enforced">
                                {Math.round(enforce1)}
                              </span>
                            </div>
                            <div className="dual-score-cell">
                              <span className={`law-score ${legal2 > legal1 ? 'winning' : ''}`} title="What the law says">
                                {Math.round(legal2)}
                              </span>
                              <span className={`enforce-score ${enforce2 > enforce1 ? 'winning' : ''} ${enforce2 < legal2 - 10 ? 'gap-warning' : ''}`} title="How it's enforced">
                                {Math.round(enforce2)}
                              </span>
                            </div>
                          </>
                        )}
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
            📥 JSON
          </button>
          <button className="btn action-btn export-btn" onClick={() => exportToCSV(result)}>
            📊 CSV
          </button>
          <button className="btn action-btn export-btn" onClick={() => exportToPDF(result)}>
            📄 PDF
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
  dealbreakers?: string[];
}

export const EnhancedComparisonContainer: React.FC<EnhancedComparisonContainerProps> = ({
  city1,
  city2,
  onComplete,
  demoMode = true,
  dealbreakers = []
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

        // Update OG meta tags for social sharing
        const score1Val = demoResult.city1.totalConsensusScore;
        const score2Val = demoResult.city2.totalConsensusScore;
        const delta = Math.abs(score1Val - score2Val);
        const winnerName = demoResult.winner === 'city1' ? city1 : demoResult.winner === 'city2' ? city2 : 'Tie';
        updateOGMetaTags({
          city1,
          city2,
          score1: score1Val,
          score2: score2Val,
          winner: winnerName,
          delta
        });
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

        // Update OG meta tags for social sharing
        const score1Val = enhancedResult.city1.totalConsensusScore;
        const score2Val = enhancedResult.city2.totalConsensusScore;
        const delta = Math.abs(score1Val - score2Val);
        const winnerName = enhancedResult.winner === 'city1' ? city1 : enhancedResult.winner === 'city2' ? city2 : 'Tie';
        updateOGMetaTags({
          city1,
          city2,
          score1: score1Val,
          score2: score2Val,
          winner: winnerName,
          delta
        });
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
    return <EnhancedResults result={result} dealbreakers={dealbreakers} />;
  }

  return null;
};

export default EnhancedComparisonContainer;
