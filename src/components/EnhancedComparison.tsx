/**
 * LIFE SCORE™ Enhanced Comparison Components
 * Multi-LLM consensus UI
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { EnhancedComparisonResult, LLMProvider, LLMAPIKeys, EnhancedComparisonProgress, EvidenceItem, LLMMetricScore } from '../types/enhancedComparison';
import { LLM_CONFIGS, DEFAULT_ENHANCED_LLMS } from '../types/enhancedComparison';
import { CATEGORIES, getMetricsByCategory, ALL_METRICS } from '../shared/metrics';
import { getStoredAPIKeys, saveAPIKeys } from '../services/enhancedComparison';
import { runSingleEvaluatorBatched, type EvaluatorResult, type CategoryBatchProgress } from '../services/llmEvaluators';
import { type JudgeOutput } from '../services/opusJudge';
import { saveEnhancedComparisonLocal, isEnhancedComparisonSaved } from '../services/savedComparisons';
import { getMetricTooltip } from '../data/metricTooltips';
import { DealbreakersWarning, checkDealbreakers } from './DealbreakersWarning';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { DataSourcesModal } from './DataSourcesModal';
import EvidencePanel from './EvidencePanel';
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
// LLM SELECTOR - Progressive Evaluation
// User selects one LLM at a time, results accumulate
// ============================================================================

// Evaluator LLMs (not including Opus which is judge-only)
export const EVALUATOR_LLMS: LLMProvider[] = ['claude-sonnet', 'gpt-4o', 'gemini-3-pro', 'grok-4', 'perplexity'];

interface LLMSelectorProps {
  city1: string;
  city2: string;
  // Lifted state from App.tsx
  llmStates: Map<LLMProvider, LLMButtonState>;
  setLLMStates: React.Dispatch<React.SetStateAction<Map<LLMProvider, LLMButtonState>>>;
  judgeResult: JudgeOutput | null;
  setJudgeResult: React.Dispatch<React.SetStateAction<JudgeOutput | null>>;
  lastJudgedCount: number;
  setLastJudgedCount: React.Dispatch<React.SetStateAction<number>>;
  // Add More Models feature props
  pendingLLMToRun?: LLMProvider | null;
  clearPendingLLM?: () => void;
  // Callbacks
  onResultsUpdate: (results: Map<LLMProvider, EvaluatorResult>, judgeResult: JudgeOutput | null) => void;
  onStatusChange: (status: 'idle' | 'running' | 'judging' | 'complete') => void;
}

export interface LLMButtonState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  result?: EvaluatorResult;
  categoryProgress?: CategoryBatchProgress[];
}

export const LLMSelector: React.FC<LLMSelectorProps> = ({
  city1,
  city2,
  llmStates,
  setLLMStates,
  judgeResult,
  setJudgeResult,
  lastJudgedCount,
  setLastJudgedCount,
  onResultsUpdate,
  pendingLLMToRun,
  clearPendingLLM,
  onStatusChange
}) => {
  // Local UI state only (not lifted)
  const [isJudging, setIsJudging] = useState(false);
  const [currentLLMProgress, setCurrentLLMProgress] = useState<{ provider: LLMProvider; progress: CategoryBatchProgress[] } | null>(null);
  const apiKeys = getStoredAPIKeys();

  // Count completed LLMs
  const completedCount = Array.from(llmStates.values()).filter(s => s.status === 'completed').length;
  // FIX #7: Allow judge to run with just 1 LLM (was >= 2, now >= 1)
  // This allows results to display even if only one LLM (like Grok) completes
  const hasEnoughForJudge = completedCount >= 1;
  // Phase 3: Check if we need to re-judge (new LLM completed since last judge)
  const needsReJudge = hasEnoughForJudge && completedCount > lastJudgedCount;

  // Memoized runJudge to prevent stale closures
  const runJudge = useCallback(async () => {
    setIsJudging(true);
    onStatusChange('judging');

    try {
      // Gather all completed evaluator results
      const evaluatorResults: EvaluatorResult[] = [];
      llmStates.forEach((state) => {
        if (state.status === 'completed' && state.result) {
          evaluatorResults.push(state.result);
        }
      });

      // Call Opus judge API (will use env vars for API key)
      const response = await fetch('/api/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city1, city2, evaluatorResults })
      });

      if (!response.ok) {
        throw new Error(`Judge API error: ${response.status}`);
      }

      const result = await response.json();

      setJudgeResult(result);
      // Phase 3: Track how many LLMs were included in this judge call
      setLastJudgedCount(completedCount);
      onResultsUpdate(
        new Map(Array.from(llmStates.entries()).filter(([, s]) => s.result).map(([k, s]) => [k, s.result!])),
        result
      );
      onStatusChange('complete');
    } catch (error) {
      console.error('Judge failed:', error);
      // CRITICAL FIX: Update lastJudgedCount on failure to prevent infinite retry loop
      setLastJudgedCount(completedCount);
      // Still mark as complete so UI doesn't hang
      onStatusChange('complete');
    } finally {
      setIsJudging(false);
    }
  }, [llmStates, city1, city2, onResultsUpdate, onStatusChange, completedCount]);

  // Phase 3: Progressive Opus judging - auto-run when 2+ LLMs complete, re-run when more complete
  useEffect(() => {
    if (needsReJudge && !isJudging) {
      runJudge();
    }
  }, [needsReJudge, isJudging, runJudge]);

  // Add More Models feature: auto-trigger pending LLM when coming from Results tab
  useEffect(() => {
    if (pendingLLMToRun && clearPendingLLM) {
      const llmState = llmStates.get(pendingLLMToRun);
      const isIdle = llmState?.status === 'idle';
      const isFailed = llmState?.status === 'failed';
      const isRunning = Array.from(llmStates.values()).some(s => s.status === 'running');

      // Trigger if LLM is idle or failed, and no other LLM is currently running
      if ((isIdle || isFailed) && !isRunning) {
        runLLM(pendingLLMToRun);
        clearPendingLLM();
      } else {
        // Clear if LLM already completed or running
        clearPendingLLM();
      }
    }
  }, [pendingLLMToRun, clearPendingLLM, llmStates]);

  const runLLM = async (provider: LLMProvider) => {
    // Update state to running
    setLLMStates(prev => {
      const next = new Map(prev);
      next.set(provider, { status: 'running' });
      return next;
    });
    onStatusChange('running');

    try {
      // Phase 2: Use batched evaluator with 6 parallel category requests
      const result = await runSingleEvaluatorBatched(
        provider,
        city1,
        city2,
        apiKeys,
        (progress) => {
          setCurrentLLMProgress({ provider, progress });
          // Also update the LLM state with category progress
          setLLMStates(prev => {
            const next = new Map(prev);
            const current = next.get(provider);
            if (current) {
              next.set(provider, { ...current, categoryProgress: progress });
            }
            return next;
          });
        }
      );

      setCurrentLLMProgress(null);

      // PARTIAL SUCCESS FIX: Accept results if either success flag OR we have scores
      const hasUsableData = result.success || (result.scores && result.scores.length > 0);

      setLLMStates(prev => {
        const next = new Map(prev);
        next.set(provider, {
          status: hasUsableData ? 'completed' : 'failed',
          result
        });
        return next;
      });

      // Update parent with current results
      const currentResults = new Map<LLMProvider, EvaluatorResult>();
      llmStates.forEach((state, llm) => {
        if (state.result) currentResults.set(llm, state.result);
      });
      // PARTIAL SUCCESS FIX: Include results with ANY usable data
      if (hasUsableData) currentResults.set(provider, result);
      onResultsUpdate(currentResults, judgeResult);

    } catch (error) {
      setCurrentLLMProgress(null);
      setLLMStates(prev => {
        const next = new Map(prev);
        next.set(provider, { status: 'failed' });
        return next;
      });
    }
  };

  const isAnyRunning = Array.from(llmStates.values()).some(s => s.status === 'running');

  return (
    <div className="llm-selector">
      <div className="llm-selector-header">
        <h3>Select AI Models to Begin</h3>
        <p className="llm-selector-subtitle">
          <strong>Click one or more AI models below to start the comparison.</strong> After 2+ complete, Opus Judge will build consensus.
        </p>
      </div>

      <div className="llm-button-grid">
        {EVALUATOR_LLMS.map(llm => {
          const config = LLM_CONFIGS[llm];
          const state = llmStates.get(llm) || { status: 'idle' };
          const isRunning = state.status === 'running';
          const isCompleted = state.status === 'completed';
          const isFailed = state.status === 'failed';
          const isDisabled = isRunning || isAnyRunning || isJudging;

          return (
            <button
              key={llm}
              className={`llm-btn ${state.status}`}
              onClick={() => runLLM(llm)}
              disabled={isDisabled || isCompleted}
              style={{ '--llm-color': config.color } as React.CSSProperties}
            >
              <span className="llm-icon">{config.icon}</span>
              <span className="llm-name">{config.shortName}</span>
              <span className="llm-status">
                {isRunning && <span className="spinner"></span>}
                {isCompleted && '✓'}
                {isFailed && '✗'}
                {state.status === 'idle' && 'Click to run'}
              </span>
              {/* Show error message on hover/click */}
              {isFailed && state.result?.error && (
                <span className="llm-error-tooltip" title={state.result.error}>
                  ⚠️ {state.result.error.slice(0, 50)}...
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error Summary - Show all failed LLMs and their errors */}
      {Array.from(llmStates.entries()).some(([, s]) => s.status === 'failed' && s.result?.error) && (
        <div className="llm-error-summary" style={{ background: '#fee2e2', border: '1px solid #dc2626', borderRadius: '8px', padding: '12px', marginTop: '12px' }}>
          <h4 style={{ color: '#dc2626', margin: '0 0 8px 0' }}>⚠️ LLM Errors:</h4>
          {Array.from(llmStates.entries())
            .filter(([, s]) => s.status === 'failed' && s.result?.error)
            .map(([provider, s]) => (
              <div key={provider} style={{ color: '#7f1d1d', fontSize: '0.9em', marginBottom: '4px' }}>
                <strong>{LLM_CONFIGS[provider].shortName}:</strong> {s.result?.error}
              </div>
            ))
          }
          <p style={{ color: '#7f1d1d', fontSize: '0.85em', margin: '8px 0 0 0' }}>
            Check that API keys are configured in Vercel Environment Variables.
          </p>
        </div>
      )}

      {/* Progress indicator */}
      <div className="llm-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(completedCount / EVALUATOR_LLMS.length) * 100}%` }}
          />
        </div>
        <span className="progress-text" style={{ color: '#ffffff' }}>
          {completedCount}/{EVALUATOR_LLMS.length} models completed
          {hasEnoughForJudge && !judgeResult && !isJudging && ' • Ready for Opus Judge'}
          {isJudging && !judgeResult && ' • Opus Judge analyzing...'}
          {isJudging && judgeResult && ' • Updating consensus...'}
          {judgeResult && !isJudging && ` • Consensus from ${lastJudgedCount} LLMs`}
        </span>
      </div>

      {/* Category batch progress - Phase 2 */}
      {currentLLMProgress && (
        <div className="category-batch-progress">
          <div className="category-progress-header">
            <span className="llm-icon">{LLM_CONFIGS[currentLLMProgress.provider].icon}</span>
            <span>{LLM_CONFIGS[currentLLMProgress.provider].shortName} - Evaluating Categories</span>
          </div>
          <div className="category-progress-grid">
            {currentLLMProgress.progress.map(cat => (
              <div key={cat.categoryId} className={`category-progress-item ${cat.status}`}>
                <span className="cat-icon">{CATEGORIES.find(c => c.id === cat.categoryId)?.icon}</span>
                <span className="cat-name">{cat.categoryName}</span>
                <span className="cat-status">
                  {cat.status === 'pending' && '⏳'}
                  {cat.status === 'running' && <span className="spinner-small"></span>}
                  {cat.status === 'completed' && '✓'}
                  {cat.status === 'failed' && '✗'}
                </span>
                <span className="cat-metrics">{cat.metricsCount} metrics</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Judge status - Phase 3: Progressive judging */}
      {hasEnoughForJudge && (
        <div className={`judge-status ${judgeResult ? 'complete' : isJudging ? 'running' : 'ready'}`}>
          <span className="judge-icon">🎭</span>
          <span className="judge-text">
            {isJudging && !judgeResult && 'Claude Opus 4.5 is building initial consensus...'}
            {isJudging && judgeResult && `Claude Opus 4.5 is updating consensus with ${completedCount} LLMs...`}
            {judgeResult && !isJudging && `Consensus from ${lastJudgedCount} LLMs • Agreement: ${judgeResult.overallAgreement}%`}
            {!isJudging && !judgeResult && 'Opus Judge will auto-run when ready'}
          </span>
          {judgeResult && !isJudging && completedCount > lastJudgedCount && (
            <span className="judge-hint">(will update when new LLM completes)</span>
          )}
        </div>
      )}
    </div>
  );
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
            <span className="key-models">Claude Opus 4.5 (Judge), Sonnet 4.5</span>
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
              Gemini
            </label>
            <input
              type="password"
              value={keys.gemini || ''}
              onChange={e => setKeys({ ...keys, gemini: e.target.value })}
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

          <div className="api-key-group optional">
            <label>
              <span className="key-icon">🔍</span>
              Tavily (Optional)
            </label>
            <input
              type="password"
              value={keys.tavily || ''}
              onChange={e => setKeys({ ...keys, tavily: e.target.value })}
              placeholder="tvly-..."
            />
            <span className="key-models">Web search for Claude (enhances accuracy)</span>
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
// LLM DISAGREEMENT ANALYSIS SECTION
// ============================================================================

interface LLMDisagreementSectionProps {
  result: EnhancedComparisonResult;
  city1Name: string;
  city2Name: string;
}

// Find metrics with highest disagreement
interface DisputedMetric {
  metricId: string;
  shortName: string;
  icon: string;
  standardDeviation: number;
  city2StandardDeviation: number;
  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  city1Score: number;
  city2Score: number;
  scoreDifference: number;
  city1LlmScores: { provider: LLMProvider; score: number; icon: string }[];
  city2LlmScores: { provider: LLMProvider; score: number; icon: string }[];
}

const findDisputedMetrics = (result: EnhancedComparisonResult, count: number = 5): DisputedMetric[] => {
  const disputed: DisputedMetric[] = [];

  result.city1.categories.forEach((city1Cat, catIndex) => {
    const city2Cat = result.city2.categories[catIndex];
    if (!city2Cat) return;

    city1Cat.metrics.forEach((metric1, metricIndex) => {
      const metric2 = city2Cat.metrics[metricIndex];
      if (!metric2) return;

      // Only include metrics where LLMs had significant disagreement (either city)
      const maxStdDev = Math.max(metric1.standardDeviation, metric2.standardDeviation);
      if (maxStdDev > 10) {
        const metricDef = ALL_METRICS.find(m => m.id === metric1.metricId);
        const shortName = metricDef?.shortName || metric1.metricId;

        // Build LLM scores arrays for BOTH cities
        const city1LlmScores = metric1.llmScores.map(score => ({
          provider: score.llmProvider,
          score: score.normalizedScore,
          icon: LLM_CONFIGS[score.llmProvider]?.icon || '🤖'
        }));

        const city2LlmScores = metric2.llmScores.map(score => ({
          provider: score.llmProvider,
          score: score.normalizedScore,
          icon: LLM_CONFIGS[score.llmProvider]?.icon || '🤖'
        }));

        disputed.push({
          metricId: metric1.metricId,
          shortName,
          icon: getMetricIcon(shortName),
          standardDeviation: metric1.standardDeviation,
          city2StandardDeviation: metric2.standardDeviation,
          confidenceLevel: metric1.confidenceLevel,
          city1Score: metric1.consensusScore,
          city2Score: metric2.consensusScore,
          scoreDifference: Math.abs(metric1.consensusScore - metric2.consensusScore),
          city1LlmScores,
          city2LlmScores
        });
      }
    });
  });

  return disputed
    .sort((a, b) => Math.max(b.standardDeviation, b.city2StandardDeviation) - Math.max(a.standardDeviation, a.city2StandardDeviation))
    .slice(0, count);
};

const LLMDisagreementSection: React.FC<LLMDisagreementSectionProps> = ({ result, city1Name, city2Name }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const disputedMetrics = findDisputedMetrics(result, 5);
  const hasSignificantDisagreement = disputedMetrics.length > 0;

  // Get confidence styling
  const getConfidenceClass = (level: string): string => {
    switch (level) {
      case 'high': return 'confidence-high';
      case 'medium': return 'confidence-medium';
      case 'low': return 'confidence-low';
      default: return 'confidence-medium';
    }
  };

  const getConfidenceLabel = (level: string): string => {
    switch (level) {
      case 'high': return 'High Confidence';
      case 'medium': return 'Moderate Confidence';
      case 'low': return 'Lower Confidence';
      default: return 'Unknown';
    }
  };

  const getMetricConfidenceLabel = (level: 'unanimous' | 'strong' | 'moderate' | 'split'): string => {
    switch (level) {
      case 'unanimous': return 'Unanimous';
      case 'strong': return 'Strong';
      case 'moderate': return 'Moderate';
      case 'split': return 'Split';
    }
  };

  return (
    <div className="disagreement-section card">
      <button
        className="section-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="section-title">
          <span className="title-icon">🧠</span>
          LLM Consensus Analysis - Where LLMs Disagree Most
        </h3>
        <div className="toggle-right">
          <span className={`confidence-badge ${getConfidenceClass(result.overallConsensusConfidence)}`}>
            {getConfidenceLabel(result.overallConsensusConfidence)}
          </span>
          <span className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </button>

      {isExpanded && (
        <div className="disagreement-content">
          {/* Overall Summary - Uses same disputedMetrics as detailed list for consistency (Bug F fix) */}
          <div className="disagreement-summary">
            <div className="summary-icon">📊</div>
            <div className="summary-text">
              {disputedMetrics.length > 0 ? (
                <>
                  <p className="disagreement-intro">
                    {disputedMetrics.length} metric{disputedMetrics.length !== 1 ? 's' : ''} had significant LLM disagreement (σ &gt; 10):
                  </p>
                  <ul className="disagreement-list">
                    {disputedMetrics.slice(0, 5).map(metric => (
                      <li key={metric.metricId}>
                        <span className="metric-bullet-icon">{metric.icon}</span>
                        <span className="metric-bullet-name">{metric.shortName}</span>
                        <span className="metric-bullet-stddev">σ = {Math.round(Math.max(metric.standardDeviation, metric.city2StandardDeviation))}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="disagreement-intro">All metrics showed strong LLM agreement. Scores are highly reliable.</p>
              )}
              <span className="summary-detail">
                Based on {result.llmsUsed.length} AI models with Claude Opus 4.5 as final judge
              </span>
            </div>
          </div>

          {/* LLM Panel - Show who evaluated */}
          <div className="llm-evaluators">
            <span className="evaluators-label">Evaluators:</span>
            <div className="evaluators-list">
              {result.llmsUsed.map(llm => (
                <div key={llm} className="evaluator-chip">
                  <span className="eval-icon">{LLM_CONFIGS[llm].icon}</span>
                  <span className="eval-name">{LLM_CONFIGS[llm].shortName}</span>
                </div>
              ))}
              <div className="evaluator-chip judge">
                <span className="eval-icon">{LLM_CONFIGS['claude-opus'].icon}</span>
                <span className="eval-name">Judge</span>
              </div>
            </div>
          </div>

          {/* Disputed Metrics - Show where LLMs disagreed */}
          {hasSignificantDisagreement && (
            <div className="disputed-metrics">
              <h4 className="disputed-header">
                <span className="header-icon">⚡</span>
                Where LLMs Disagreed Most
              </h4>
              <p className="disputed-subtitle">
                These metrics had the highest score variation between AI evaluators for <strong>{city1Name}</strong> and <strong>{city2Name}</strong>.
                Each LLM scored independently, then Claude Opus reviewed and set the final consensus.
              </p>

              <div className="disputed-list">
                {disputedMetrics.map((metric, index) => (
                  <div key={metric.metricId} className="disputed-item-enhanced">
                    <div className="disputed-item-header">
                      <div className="disputed-rank">#{index + 1}</div>
                      <div className="disputed-info">
                        <div className="disputed-metric-name">
                          <span className="metric-icon">{metric.icon}</span>
                          <span className="metric-name">{metric.shortName}</span>
                          <span className={`confidence-tag ${metric.confidenceLevel}`}>
                            {getMetricConfidenceLabel(metric.confidenceLevel)}
                          </span>
                        </div>
                        <div className="disputed-deviation">
                          σ = {Math.round(Math.max(metric.standardDeviation, metric.city2StandardDeviation))} points max variance
                        </div>
                      </div>
                    </div>

                    {/* Both Cities Scores Side by Side */}
                    <div className="disputed-cities-comparison">
                      {/* City 1 */}
                      <div className="disputed-city-block">
                        <div className="city-block-header">
                          <span className="city-block-name">{city1Name}</span>
                          <span className="city-block-stddev">σ = {Math.round(metric.standardDeviation)}</span>
                        </div>
                        <div className="llm-scores-mini">
                          {metric.city1LlmScores.map((llm, i) => {
                            const config = LLM_CONFIGS[llm.provider];
                            return (
                              <div
                                key={i}
                                className="llm-score-mini"
                                title={`${config?.name || llm.provider}: ${Math.round(llm.score)}/100`}
                              >
                                <span className="mini-llm-name">{config?.shortName || llm.provider}</span>
                                <span className="mini-icon">{llm.icon}</span>
                                <span className="mini-score">{Math.round(llm.score)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="city-consensus">
                          <span className="consensus-label">Consensus</span>
                          <span className={`consensus-value ${metric.city1Score > metric.city2Score ? 'winner' : ''}`}>
                            {Math.round(metric.city1Score)}
                          </span>
                        </div>
                      </div>

                      {/* VS Divider */}
                      <div className="disputed-vs">
                        <span className="vs-text">vs</span>
                        {metric.scoreDifference > 0 && (
                          <span className={`vs-diff ${metric.city1Score > metric.city2Score ? 'city1-leads' : 'city2-leads'}`}>
                            Δ{Math.round(metric.scoreDifference)}
                          </span>
                        )}
                      </div>

                      {/* City 2 */}
                      <div className="disputed-city-block">
                        <div className="city-block-header">
                          <span className="city-block-name">{city2Name}</span>
                          <span className="city-block-stddev">σ = {Math.round(metric.city2StandardDeviation)}</span>
                        </div>
                        <div className="llm-scores-mini">
                          {metric.city2LlmScores.map((llm, i) => {
                            const config = LLM_CONFIGS[llm.provider];
                            return (
                              <div
                                key={i}
                                className="llm-score-mini"
                                title={`${config?.name || llm.provider}: ${Math.round(llm.score)}/100`}
                              >
                                <span className="mini-llm-name">{config?.shortName || llm.provider}</span>
                                <span className="mini-icon">{llm.icon}</span>
                                <span className="mini-score">{Math.round(llm.score)}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="city-consensus">
                          <span className="consensus-label">Consensus</span>
                          <span className={`consensus-value ${metric.city2Score > metric.city1Score ? 'winner' : ''}`}>
                            {Math.round(metric.city2Score)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No significant disagreement */}
          {!hasSignificantDisagreement && (
            <div className="consensus-achieved">
              <span className="consensus-icon">✅</span>
              <p>All AI models showed strong agreement across metrics. The consensus scores are highly reliable.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// LLM AGREEMENT ANALYSIS SECTION (Bug B Fix)
// ============================================================================

interface AgreedMetric {
  metricId: string;
  shortName: string;
  icon: string;
  standardDeviation: number;
  confidenceLevel: 'unanimous' | 'strong' | 'moderate' | 'split';
  city1Score: number;
  city2Score: number;
  scoreDifference: number;
  llmCount: number;
}

const findAgreedMetrics = (result: EnhancedComparisonResult, count: number = 5): AgreedMetric[] => {
  const agreed: AgreedMetric[] = [];

  result.city1.categories.forEach((city1Cat, catIndex) => {
    const city2Cat = result.city2.categories[catIndex];
    if (!city2Cat) return;

    city1Cat.metrics.forEach((metric1, metricIndex) => {
      const metric2 = city2Cat.metrics[metricIndex];
      if (!metric2) return;

      // Only include metrics where LLMs had strong agreement (σ < 5)
      // AND we have at least 2 LLM scores to make it meaningful
      if (metric1.standardDeviation < 5 && metric1.llmScores.length >= 2) {
        const metricDef = ALL_METRICS.find(m => m.id === metric1.metricId);
        const shortName = metricDef?.shortName || metric1.metricId;

        agreed.push({
          metricId: metric1.metricId,
          shortName,
          icon: getMetricIcon(shortName),
          standardDeviation: metric1.standardDeviation,
          confidenceLevel: metric1.confidenceLevel,
          city1Score: metric1.consensusScore,
          city2Score: metric2.consensusScore,
          scoreDifference: Math.abs(metric1.consensusScore - metric2.consensusScore),
          llmCount: metric1.llmScores.length
        });
      }
    });
  });

  // Sort by lowest standard deviation (highest agreement) first
  return agreed
    .sort((a, b) => a.standardDeviation - b.standardDeviation)
    .slice(0, count);
};

interface LLMAgreementSectionProps {
  result: EnhancedComparisonResult;
  city1Name: string;
  city2Name: string;
}

const LLMAgreementSection: React.FC<LLMAgreementSectionProps> = ({ result, city1Name, city2Name }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const agreedMetrics = findAgreedMetrics(result, 8);
  const hasStrongAgreement = agreedMetrics.length > 0;

  // Count total high-confidence metrics
  let totalUnanimous = 0;
  let totalStrong = 0;
  result.city1.categories.forEach(cat => {
    cat.metrics.forEach(m => {
      if (m.confidenceLevel === 'unanimous') totalUnanimous++;
      else if (m.confidenceLevel === 'strong') totalStrong++;
    });
  });

  return (
    <div className="agreement-section card">
      <button
        className="section-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="section-title">
          <span className="title-icon">✅</span>
          Where LLMs Strongly Agreed
        </h3>
        <div className="toggle-right">
          <span className="agreement-count-badge">
            {totalUnanimous + totalStrong} high-confidence metrics
          </span>
          <span className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </button>

      {isExpanded && (
        <div className="agreement-content">
          {/* Agreement Summary */}
          <div className="agreement-summary">
            <div className="summary-icon">🎯</div>
            <div className="summary-text">
              <p className="agreement-intro">
                These metrics have the highest LLM consensus — you can trust these scores with confidence.
              </p>
              <div className="agreement-stats">
                <span className="stat-badge unanimous">
                  <span className="stat-count">{totalUnanimous}</span> Unanimous (σ &lt; 3)
                </span>
                <span className="stat-badge strong">
                  <span className="stat-count">{totalStrong}</span> Strong (σ &lt; 8)
                </span>
              </div>
            </div>
          </div>

          {/* Agreed Metrics List */}
          {hasStrongAgreement && (
            <div className="agreed-metrics">
              <h4 className="agreed-header">
                <span className="header-icon">🏆</span>
                Top High-Confidence Metrics
              </h4>
              <p className="agreed-subtitle">
                All LLMs scored these metrics similarly — these are your most reliable data points.
              </p>

              <div className="agreed-list">
                {agreedMetrics.map((metric, index) => (
                  <div key={metric.metricId} className="agreed-item">
                    <div className="agreed-rank">#{index + 1}</div>
                    <div className="agreed-info">
                      <div className="agreed-metric-name">
                        <span className="metric-icon">{metric.icon}</span>
                        <span className="metric-name">{metric.shortName}</span>
                        <span className={`confidence-tag ${metric.confidenceLevel}`}>
                          {metric.confidenceLevel === 'unanimous' ? '🎯 Unanimous' : '✓ Strong'}
                        </span>
                      </div>
                      <div className="agreed-deviation">
                        σ = {metric.standardDeviation.toFixed(1)} • {metric.llmCount} LLMs agree
                      </div>
                    </div>

                    {/* Both Cities Scores */}
                    <div className="agreed-scores">
                      <div className="city-score-box">
                        <span className="city-name">{city1Name}</span>
                        <span className={`city-score ${metric.city1Score > metric.city2Score ? 'winner' : ''}`}>
                          {Math.round(metric.city1Score)}
                        </span>
                      </div>
                      <div className="score-vs">vs</div>
                      <div className="city-score-box">
                        <span className="city-name">{city2Name}</span>
                        <span className={`city-score ${metric.city2Score > metric.city1Score ? 'winner' : ''}`}>
                          {Math.round(metric.city2Score)}
                        </span>
                      </div>
                    </div>

                    {/* Difference indicator */}
                    {metric.scoreDifference > 0 && (
                      <div className="agreed-difference">
                        <span className={`diff-badge ${metric.city1Score > metric.city2Score ? 'city1-leads' : 'city2-leads'}`}>
                          +{Math.round(metric.scoreDifference)} {metric.city1Score > metric.city2Score ? city1Name : city2Name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No strong agreement - only show if truly zero unanimous/strong metrics */}
          {totalUnanimous === 0 && totalStrong === 0 && (
            <div className="no-strong-agreement">
              <span className="warning-icon">⚠️</span>
              <p>No metrics achieved unanimous LLM agreement. Consider the scores as approximations.</p>
            </div>
          )}

          {/* Trust indicator */}
          <div className="trust-indicator">
            <span className="trust-icon">💡</span>
            <p>
              <strong>Why this matters:</strong> When multiple AI models independently arrive at the same score,
              you can be confident the data accurately reflects real-world conditions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ENHANCED RESULTS DISPLAY
// ============================================================================

interface EnhancedResultsProps {
  result: EnhancedComparisonResult;
  dealbreakers?: string[];
  showEvidence?: boolean;
  onToggleEvidence?: () => void;
  customWeights?: Record<string, number> | null;  // User's persona weights (Digital Nomad, etc.)
}

// Helper to calculate top metric differences
interface MetricDifference {
  metricId: string;
  name: string;
  shortName: string;
  icon: string;
  city1Score: number;
  city2Score: number;
  difference: number;
  favoredCity: 'city1' | 'city2';
  city1Explanation?: string;  // Judge explanation for city 1
  city2Explanation?: string;  // Judge explanation for city 2
  sources: EvidenceItem[];    // Bug D fix: Combined sources from both cities
  city1LlmScores?: LLMMetricScore[];  // Bug G fix: For calculation verification
  city2LlmScores?: LLMMetricScore[];  // Bug G fix: For calculation verification
}

const calculateTopDifferences = (result: EnhancedComparisonResult, count: number = 5): MetricDifference[] => {
  const differences: MetricDifference[] = [];

  result.city1.categories.forEach((city1Cat, catIndex) => {
    const city2Cat = result.city2.categories[catIndex];
    if (!city2Cat) return;

    city1Cat.metrics.forEach((metric1, metricIndex) => {
      const metric2 = city2Cat.metrics[metricIndex];
      if (!metric2) return;

      // Look up the actual metric definition to get the real name
      const metricDef = ALL_METRICS.find(m => m.id === metric1.metricId);
      const name = metricDef?.name || metric1.metricId;
      const shortName = metricDef?.shortName || metric1.metricId;

      // Collect evidence/sources from both cities' LLM scores (Bug D fix)
      const allEvidence: EvidenceItem[] = [];
      metric1.llmScores?.forEach(score => {
        if (score.evidence) allEvidence.push(...score.evidence);
      });
      metric2.llmScores?.forEach(score => {
        if (score.evidence) allEvidence.push(...score.evidence);
      });
      // Deduplicate by URL
      const uniqueSources = Array.from(
        new Map(allEvidence.map(e => [e.url, e])).values()
      );

      const diff = Math.abs(metric1.consensusScore - metric2.consensusScore);
      differences.push({
        metricId: metric1.metricId,
        name: name,
        shortName: shortName,
        icon: getMetricIcon(shortName),
        city1Score: metric1.consensusScore,
        city2Score: metric2.consensusScore,
        difference: diff,
        favoredCity: metric1.consensusScore > metric2.consensusScore ? 'city1' : 'city2',
        city1Explanation: metric1.judgeExplanation,
        city2Explanation: metric2.judgeExplanation,
        sources: uniqueSources,
        city1LlmScores: metric1.llmScores,  // Bug G fix
        city2LlmScores: metric2.llmScores   // Bug G fix
      });
    });
  });

  return differences.sort((a, b) => b.difference - a.difference).slice(0, count);
};

export const EnhancedResults: React.FC<EnhancedResultsProps> = ({ result, dealbreakers = [], customWeights }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showTopDifferences, setShowTopDifferences] = useState(true);
  const [scoreViewMode, setScoreViewMode] = useState<'lived' | 'lawVsReality'>('lived');
  const [showDataSources, setShowDataSources] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<string | null>(null);
  const [showScoringExplanation, setShowScoringExplanation] = useState(false);
  const [expandedDifference, setExpandedDifference] = useState<string | null>(null);

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

        {/* Data Quality Badge */}
        <div className="data-quality-badge-container">
          <span className={`data-quality-badge quality-${result.overallConsensusConfidence}`}>
            <span className="quality-icon">
              {result.overallConsensusConfidence === 'high' ? '✓' : result.overallConsensusConfidence === 'medium' ? '~' : '?'}
            </span>
            <span className="quality-text">
              {result.overallConsensusConfidence === 'high' ? 'High Data Quality' :
               result.overallConsensusConfidence === 'medium' ? 'Moderate Data Quality' : 'Limited Data'}
            </span>
          </span>
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
            <p className="breakdown-subtitle">The metrics with the biggest score differences - click any to learn why</p>
            {/* Column headers for Top 5 */}
            <div className="differences-header">
              <span className="header-rank">#</span>
              <span className="header-metric">Metric</span>
              <span className="header-city1">{result.city1.city}</span>
              <span className="header-city2">{result.city2.city}</span>
              <span className="header-delta">Δ Winner</span>
            </div>
            <div className="differences-list">
              {topDifferences.map((diff, index) => {
                const favoredCityName = diff.favoredCity === 'city1' ? result.city1.city : result.city2.city;
                const isExpanded = expandedDifference === diff.metricId;
                const hasExplanation = diff.city1Explanation || diff.city2Explanation;
                return (
                  <div key={diff.metricId} className={`difference-item ${isExpanded ? 'expanded' : ''} ${hasExplanation ? 'clickable' : ''}`}>
                    <button
                      className="diff-header-btn"
                      onClick={() => hasExplanation && setExpandedDifference(isExpanded ? null : diff.metricId)}
                      disabled={!hasExplanation}
                    >
                      <div className="diff-rank">#{index + 1}</div>
                      <div className="diff-metric">
                        <span className="diff-icon">{diff.icon}</span>
                        <span className="diff-name">{diff.name}</span>
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
                      <div className={`diff-delta ${diff.favoredCity === 'city1' ? 'city1-leads' : 'city2-leads'}`}>
                        <span className="delta-pill">+{Math.round(diff.difference)}</span>
                        <span className="delta-city">{favoredCityName}</span>
                      </div>
                      {hasExplanation && (
                        <span className={`diff-expand-icon ${isExpanded ? 'expanded' : ''}`}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      )}
                    </button>

                    {/* Expanded Explanation Panel */}
                    {isExpanded && hasExplanation && (
                      <div className="diff-explanation-panel">
                        {/* Show single combined analysis if explanations are identical or only one exists */}
                        {(diff.city1Explanation === diff.city2Explanation || !diff.city1Explanation || !diff.city2Explanation) ? (
                          <div className="diff-city-explanation">
                            <h4 className="explanation-city-header">
                              <span className="city-flag">⚖️ Judge's Analysis</span>
                            </h4>
                            <p className="explanation-text">{diff.city1Explanation || diff.city2Explanation}</p>
                            <div className="explanation-scores">
                              <span className="score-badge city1-score">{result.city1.city}: {Math.round(diff.city1Score)}</span>
                              <span className="score-badge city2-score">{result.city2.city}: {Math.round(diff.city2Score)}</span>
                            </div>
                          </div>
                        ) : (
                          /* Show separate explanations only if they're actually different */
                          <>
                            {diff.city1Explanation && (
                              <div className="diff-city-explanation">
                                <h4 className="explanation-city-header">
                                  <span className="city-flag">{result.city1.city}</span>
                                  <span className="city-score">Score: {Math.round(diff.city1Score)}</span>
                                </h4>
                                <p className="explanation-text">{diff.city1Explanation}</p>
                              </div>
                            )}
                            {diff.city2Explanation && (
                              <div className="diff-city-explanation">
                                <h4 className="explanation-city-header">
                                  <span className="city-flag">{result.city2.city}</span>
                                  <span className="city-score">Score: {Math.round(diff.city2Score)}</span>
                                </h4>
                                <p className="explanation-text">{diff.city2Explanation}</p>
                              </div>
                            )}
                          </>
                        )}

                        {/* Bug G fix: Calculation Verification */}
                        {(diff.city1LlmScores?.length || diff.city2LlmScores?.length) && (
                          <div className="diff-calculation-verification">
                            <h4 className="verification-header">🔢 Score Calculation</h4>
                            {diff.city1LlmScores && diff.city1LlmScores.length > 0 && (() => {
                              const scores = diff.city1LlmScores.map(s => s.normalizedScore).sort((a, b) => a - b);
                              const mid = Math.floor(scores.length / 2);
                              const calculatedMedian = scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
                              const isAdjusted = Math.round(calculatedMedian) !== Math.round(diff.city1Score);
                              return (
                                <div className="diff-verification-row">
                                  <span className="diff-verification-label">{result.city1.city}:</span>
                                  <span className="diff-verification-calc">
                                    Median of [{scores.map(s => Math.round(s)).join(', ')}] = <strong>{Math.round(calculatedMedian)}</strong>
                                    {isAdjusted && (
                                      <span className="diff-opus-adjusted"> → {Math.round(diff.city1Score)} (Opus adjusted)</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })()}
                            {diff.city2LlmScores && diff.city2LlmScores.length > 0 && (() => {
                              const scores = diff.city2LlmScores.map(s => s.normalizedScore).sort((a, b) => a - b);
                              const mid = Math.floor(scores.length / 2);
                              const calculatedMedian = scores.length % 2 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
                              const isAdjusted = Math.round(calculatedMedian) !== Math.round(diff.city2Score);
                              return (
                                <div className="diff-verification-row">
                                  <span className="diff-verification-label">{result.city2.city}:</span>
                                  <span className="diff-verification-calc">
                                    Median of [{scores.map(s => Math.round(s)).join(', ')}] = <strong>{Math.round(calculatedMedian)}</strong>
                                    {isAdjusted && (
                                      <span className="diff-opus-adjusted"> → {Math.round(diff.city2Score)} (Opus adjusted)</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Bug D fix: Sources section */}
                        {diff.sources.length > 0 && (
                          <div className="diff-sources-section">
                            <h4 className="sources-header">📚 Sources</h4>
                            <ul className="diff-sources-list">
                              {diff.sources.slice(0, 4).map((source, idx) => (
                                <li key={idx}>
                                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                                    {source.title || (() => { try { return new URL(source.url).hostname; } catch { return source.url; } })()}
                                  </a>
                                  {source.snippet && (
                                    <span className="source-snippet">— {source.snippet.length > 80 ? source.snippet.substring(0, 80) + '...' : source.snippet}</span>
                                  )}
                                </li>
                              ))}
                              {diff.sources.length > 4 && (
                                <li className="more-sources">+{diff.sources.length - 4} more sources</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Score Legend */}
            <div className="score-legend">
              <span className="legend-title">Score Guide:</span>
              <span className="legend-item legend-excellent">90-100 Very Free</span>
              <span className="legend-item legend-good">70-89 Generally Free</span>
              <span className="legend-item legend-moderate">50-69 Moderate</span>
              <span className="legend-item legend-restricted">30-49 Restricted</span>
              <span className="legend-item legend-poor">0-29 Very Restricted</span>
            </div>
          </>
        )}
      </div>

      {/* LLM Agreement Analysis - Bug B Fix */}
      <LLMAgreementSection
        result={result}
        city1Name={result.city1.city}
        city2Name={result.city2.city}
      />

      {/* LLM Disagreement Analysis */}
      <LLMDisagreementSection
        result={result}
        city1Name={result.city1.city}
        city2Name={result.city2.city}
      />

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
            <div
              key={category.id}
              className="enhanced-category"
              ref={(el) => { if (el) categoryRefs.current.set(category.id, el); }}
            >
              <button
                className="category-header-btn"
                onClick={() => {
                  const newExpanded = isExpanded ? null : category.id;
                  setExpandedCategory(newExpanded);
                  // Auto-scroll to section top when expanding
                  if (newExpanded) {
                    setTimeout(() => {
                      const el = categoryRefs.current.get(newExpanded);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 100);
                  }
                }}
              >
                <div className="category-header">
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-weight">({customWeights?.[category.id] ?? category.weight}%)</span>
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
                    <div className="metric-details-header expandable-header">
                      <span>Metric</span>
                      <span className="metric-header-city">{result.city1.city}</span>
                      <span className="metric-header-city">{result.city2.city}</span>
                      <span className="metric-header-delta">Δ</span>
                      <span className="metric-header-llms">LLMs</span>
                      <span className="metric-header-stddev">σ</span>
                      <span className="metric-header-expand"></span>
                    </div>
                  ) : (
                    <div className="metric-details-header dual-header expandable-header">
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
                      <span className="metric-header-delta">Δ</span>
                      <span className="metric-header-llms">LLMs</span>
                      <span className="metric-header-stddev">σ</span>
                      <span className="metric-header-expand"></span>
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
                    const llmCount = city1Metric?.llmScores?.length || 0;
                    const stdDev = city1Metric?.standardDeviation ?? 0;

                    // Score difference (delta)
                    const scoreDelta = score1 - score2;
                    const deltaSign = scoreDelta > 0 ? '+' : '';

                    const isRowExpanded = expandedEvidence === metric.id;

                    // Get all unique LLM providers that scored this metric
                    const allLLMProviders = new Set<LLMProvider>();
                    city1Metric?.llmScores?.forEach(s => allLLMProviders.add(s.llmProvider));
                    city2Metric?.llmScores?.forEach(s => allLLMProviders.add(s.llmProvider));

                    // Build LLM scores map for easy lookup
                    const city1LLMScoresMap = new Map(city1Metric?.llmScores?.map(s => [s.llmProvider, s]) || []);
                    const city2LLMScoresMap = new Map(city2Metric?.llmScores?.map(s => [s.llmProvider, s]) || []);

                    // Calculate median verification
                    const city1Scores = city1Metric?.llmScores?.map(s => s.normalizedScore) || [];
                    const city2Scores = city2Metric?.llmScores?.map(s => s.normalizedScore) || [];
                    const sortedCity1 = [...city1Scores].sort((a, b) => a - b);
                    const sortedCity2 = [...city2Scores].sort((a, b) => a - b);
                    const medianCity1 = sortedCity1.length > 0
                      ? sortedCity1.length % 2 === 0
                        ? (sortedCity1[sortedCity1.length/2 - 1] + sortedCity1[sortedCity1.length/2]) / 2
                        : sortedCity1[Math.floor(sortedCity1.length/2)]
                      : 0;
                    const medianCity2 = sortedCity2.length > 0
                      ? sortedCity2.length % 2 === 0
                        ? (sortedCity2[sortedCity2.length/2 - 1] + sortedCity2[sortedCity2.length/2]) / 2
                        : sortedCity2[Math.floor(sortedCity2.length/2)]
                      : 0;

                    return (
                      <div key={metric.id} className={`metric-row-wrapper ${isRowExpanded ? 'expanded' : ''}`}>
                        {/* Main metric row - clickable to expand */}
                        <button
                          className={`metric-row-expandable ${scoreViewMode === 'lawVsReality' ? 'dual-row' : ''}`}
                          onClick={() => setExpandedEvidence(isRowExpanded ? null : metric.id)}
                          aria-expanded={isRowExpanded}
                        >
                          <div className="metric-info">
                            <span className="metric-icon">{getMetricIcon(metric.shortName)}</span>
                            <div className="metric-name-container">
                              <span className="metric-name">{metric.shortName}</span>
                              {tooltip && (
                                <div className="metric-tooltip" onClick={(e) => e.stopPropagation()}>
                                  <span className="tooltip-trigger" title={tooltip.whyMatters}>?</span>
                                  <div className="tooltip-content">
                                    <strong>Why This Matters:</strong>
                                    <p>{tooltip.whyMatters}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* City 1 Score */}
                          {scoreViewMode === 'lived' ? (
                            <div className={`metric-score ${score1 > score2 ? 'winning' : ''}`}>
                              {Math.round(score1)}
                            </div>
                          ) : (
                            <div className="dual-score-cell">
                              <span className={`law-score ${legal1 > legal2 ? 'winning' : ''}`}>{Math.round(legal1)}</span>
                              <span className={`enforce-score ${enforce1 > enforce2 ? 'winning' : ''}`}>{Math.round(enforce1)}</span>
                            </div>
                          )}

                          {/* City 2 Score */}
                          {scoreViewMode === 'lived' ? (
                            <div className={`metric-score ${score2 > score1 ? 'winning' : ''}`}>
                              {Math.round(score2)}
                            </div>
                          ) : (
                            <div className="dual-score-cell">
                              <span className={`law-score ${legal2 > legal1 ? 'winning' : ''}`}>{Math.round(legal2)}</span>
                              <span className={`enforce-score ${enforce2 > enforce1 ? 'winning' : ''}`}>{Math.round(enforce2)}</span>
                            </div>
                          )}

                          {/* Delta (score difference) */}
                          <div className={`metric-delta ${scoreDelta > 0 ? 'city1-favored' : scoreDelta < 0 ? 'city2-favored' : 'tie'}`}>
                            {scoreDelta !== 0 ? `${deltaSign}${Math.round(scoreDelta)}` : '—'}
                          </div>

                          {/* LLM Count */}
                          <div className="metric-llm-count" title={`${llmCount} LLMs evaluated this metric`}>
                            {llmCount}/{result.llmsUsed.length}
                          </div>

                          {/* Standard Deviation */}
                          <div className={`metric-stddev ${confidence1}`} title={`Standard deviation: ${stdDev.toFixed(1)}`}>
                            σ{stdDev.toFixed(0)}
                          </div>

                          {/* Expand/Collapse Arrow */}
                          <div className={`metric-expand-arrow ${isRowExpanded ? 'expanded' : ''}`}>
                            {isRowExpanded ? '▼' : '▶'}
                          </div>
                        </button>

                        {/* Expanded LLM Breakdown Panel */}
                        {isRowExpanded && (
                          <div className="llm-breakdown-panel">
                            <div className="breakdown-header">
                              <span className="breakdown-title">🧠 LLM Breakdown: {metric.shortName}</span>
                              <button className="breakdown-close" onClick={() => setExpandedEvidence(null)}>×</button>
                            </div>

                            {/* LLM Grid - Side by side comparison */}
                            <div className="llm-grid-container">
                              <table className="llm-breakdown-table">
                                <thead>
                                  <tr>
                                    <th className="llm-col-header">LLM</th>
                                    {Array.from(allLLMProviders).map(provider => {
                                      const config = LLM_CONFIGS[provider];
                                      return (
                                        <th key={provider} className="llm-col-header llm-provider-header">
                                          <span className="llm-header-icon">{config?.icon || '🤖'}</span>
                                          <span className="llm-header-name">{config?.shortName || provider}</span>
                                        </th>
                                      );
                                    })}
                                    <th className="llm-col-header consensus-col">Consensus</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* City 1 Row */}
                                  <tr className="llm-city-row city1-row">
                                    <td className="city-name-cell">{result.city1.city}</td>
                                    {Array.from(allLLMProviders).map(provider => {
                                      const score = city1LLMScoresMap.get(provider);
                                      return (
                                        <td key={provider} className="llm-score-cell">
                                          {score ? Math.round(score.normalizedScore) : '—'}
                                        </td>
                                      );
                                    })}
                                    <td className="consensus-cell">
                                      <span className="consensus-value">{Math.round(score1)}</span>
                                    </td>
                                  </tr>
                                  {/* City 2 Row */}
                                  <tr className="llm-city-row city2-row">
                                    <td className="city-name-cell">{result.city2.city}</td>
                                    {Array.from(allLLMProviders).map(provider => {
                                      const score = city2LLMScoresMap.get(provider);
                                      return (
                                        <td key={provider} className="llm-score-cell">
                                          {score ? Math.round(score.normalizedScore) : '—'}
                                        </td>
                                      );
                                    })}
                                    <td className="consensus-cell">
                                      <span className="consensus-value">{Math.round(score2)}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* Calculation Verification */}
                            <div className="calculation-verification">
                              <div className="verification-row">
                                <span className="verification-label">{result.city1.city}:</span>
                                <span className="verification-calc">
                                  Median of [{sortedCity1.map(s => Math.round(s)).join(', ')}] = <strong>{Math.round(medianCity1)}</strong>
                                  {Math.round(medianCity1) !== Math.round(score1) && (
                                    <span className="opus-adjusted" title="Adjusted by Opus Judge"> → {Math.round(score1)} (Opus adjusted)</span>
                                  )}
                                </span>
                              </div>
                              <div className="verification-row">
                                <span className="verification-label">{result.city2.city}:</span>
                                <span className="verification-calc">
                                  Median of [{sortedCity2.map(s => Math.round(s)).join(', ')}] = <strong>{Math.round(medianCity2)}</strong>
                                  {Math.round(medianCity2) !== Math.round(score2) && (
                                    <span className="opus-adjusted" title="Adjusted by Opus Judge"> → {Math.round(score2)} (Opus adjusted)</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Standard Deviation & Confidence */}
                            <div className="breakdown-stats">
                              <div className="stat-item">
                                <span className="stat-label">Score Variance:</span>
                                <span className="stat-value">σ = {stdDev.toFixed(1)}</span>
                              </div>
                              <div className="stat-item">
                                <span className={`confidence-badge ${confidence1}`}>
                                  {confidence1 === 'unanimous' ? 'Unanimous Agreement' :
                                   confidence1 === 'strong' ? 'Strong Agreement' :
                                   confidence1 === 'moderate' ? 'Moderate Agreement' : 'Split Opinions'}
                                </span>
                              </div>
                            </div>

                            {/* Judge Explanation */}
                            {(city1Metric?.judgeExplanation || city2Metric?.judgeExplanation) && (
                              <div className="judge-explanation-section">
                                <span className="explanation-header">🎭 Opus Judge Analysis:</span>
                                {city1Metric?.judgeExplanation && (
                                  <div className="explanation-item">
                                    <span className="explanation-city">{result.city1.city}:</span>
                                    <p>{city1Metric.judgeExplanation}</p>
                                  </div>
                                )}
                                {city2Metric?.judgeExplanation && (
                                  <div className="explanation-item">
                                    <span className="explanation-city">{result.city2.city}:</span>
                                    <p>{city2Metric.judgeExplanation}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Sources Section */}
                            <div className="breakdown-sources">
                              <span className="sources-header">📚 Sources:</span>
                              {(() => {
                                const allEvidence: EvidenceItem[] = [];
                                city1Metric?.llmScores?.forEach(score => {
                                  if (score.evidence) allEvidence.push(...score.evidence);
                                });
                                city2Metric?.llmScores?.forEach(score => {
                                  if (score.evidence) allEvidence.push(...score.evidence);
                                });
                                const uniqueByUrl = Array.from(new Map(allEvidence.map(e => [e.url, e])).values());

                                if (uniqueByUrl.length === 0) {
                                  return <p className="no-sources">No specific sources cited for this metric.</p>;
                                }

                                return (
                                  <ul className="source-list">
                                    {uniqueByUrl.slice(0, 5).map((ev, idx) => (
                                      <li key={idx}>
                                        <a href={ev.url} target="_blank" rel="noopener noreferrer">
                                          {ev.title || (() => { try { return new URL(ev.url).hostname; } catch { return ev.url; } })()}
                                        </a>
                                        {ev.snippet && (
                                          <span className="source-snippet" title={ev.snippet}>
                                            — {ev.snippet.length > 60 ? ev.snippet.substring(0, 60) + '...' : ev.snippet}
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                    {uniqueByUrl.length > 5 && (
                                      <li className="more-sources">+{uniqueByUrl.length - 5} more sources</li>
                                    )}
                                  </ul>
                                );
                              })()}
                            </div>
                          </div>
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

      {/* Evidence & Citations Panel - Collapsible */}
      <EvidencePanel result={result} />

      {/* Footer */}
      <div className="enhanced-footer card">
        <h4>About Enhanced Comparison</h4>
        <p>
          This enhanced LIFE SCORE™ used <strong>{result.llmsUsed.length} different AI models</strong> to
          independently evaluate {result.processingStats.metricsEvaluated} freedom metrics.
          A specialized judge model reviewed all evaluations to build consensus scores.
        </p>
        
        <div className={`scoring-explanation ${showScoringExplanation ? 'expanded' : 'collapsed'}`}>
          <button
            className="scoring-toggle-btn"
            onClick={() => setShowScoringExplanation(!showScoringExplanation)}
          >
            <h5>How Our Scoring Works</h5>
            <span className={`toggle-arrow ${showScoringExplanation ? 'expanded' : ''}`}>▼</span>
          </button>
          {showScoringExplanation && (
            <div className="scoring-content">
              <p>
                <strong>1. Independent Research:</strong> Multiple AI models with real-time web access independently
                analyze each metric using authoritative sources—laws, statutes, government data, and enforcement records.
              </p>
              <p>
                <strong>2. Evidence-Based Scoring:</strong> Scores are derived from verifiable legal data, not opinions.
                Each metric measures specific regulations and their real-world enforcement.
              </p>
              <p>
                <strong>3. Consensus Building:</strong> A final judge model reviews all independent evaluations,
                weighs the evidence, identifies areas of agreement and disagreement, and produces balanced consensus scores.
              </p>
              <p>
                <strong>4. Full Transparency:</strong> Every score links to the specific sources used, allowing you
                to verify findings. Click the 📄 icon on any metric to see the data behind the numbers.
              </p>
            </div>
          )}
        </div>
        <p>
          <strong>Generated:</strong> {new Date(result.generatedAt).toLocaleString()}
          <br />
          <strong>Comparison ID:</strong> {result.comparisonId}
          {result.processingStats.fromCache && (
            <>
              <br />
              <span className="cache-badge">
                ⚡ Cached Result (saved ~$22 in API costs)
              </span>
            </>
          )}
        </p>
        <button className="btn data-sources-btn" onClick={() => setShowDataSources(true)}>
          📚 View Data Sources
        </button>
      </div>

      {/* Data Sources Modal */}
      <DataSourcesModal isOpen={showDataSources} onClose={() => setShowDataSources(false)} />
    </div>
  );
};

