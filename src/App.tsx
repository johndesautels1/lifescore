/**
 * LIFE SCORE™ Main Application
 * Legal Independence & Freedom Evaluation
 *
 * John E. Desautels & Associates
 * © 2025 All Rights Reserved
 */

import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import TabNavigation, { type TabId } from './components/TabNavigation';
import CitySelector from './components/CitySelector';
import LoadingState from './components/LoadingState';
import Results from './components/Results';
import SavedComparisons from './components/SavedComparisons';
import AdvancedVisuals from './components/AdvancedVisuals';
import {
  EnhancedModeToggle,
  APIKeyModal,
  EnhancedResults,
  LLMSelector
} from './components/EnhancedComparison';
import EvidencePanel from './components/EvidencePanel';
import type { ComparisonResult } from './types/metrics';
import type { LLMAPIKeys, EnhancedComparisonResult } from './types/enhancedComparison';
import { getStoredAPIKeys, getAvailableLLMs } from './services/enhancedComparison';
import useComparison from './hooks/useComparison';
import { resetOGMetaTags } from './hooks/useOGMeta';
import { ALL_METRICS } from './data/metrics';
import './styles/globals.css';
import './App.css';

const App: React.FC = () => {
  const { state, compare, reset, loadResult } = useComparison();
  const [savedKey, setSavedKey] = useState(0);

  // Enhanced mode state
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<LLMAPIKeys>(getStoredAPIKeys());
  const [enhancedStatus, setEnhancedStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [enhancedResult, setEnhancedResult] = useState<EnhancedComparisonResult | null>(null);
  const [pendingCities, setPendingCities] = useState<{ city1: string; city2: string } | null>(null);
  const [showEvidencePanel, setShowEvidencePanel] = useState(true); // Evidence panel visibility

  // Dealbreakers state
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  // Custom weights state (reserved for future weighted scoring)
  const [, setCustomWeights] = useState<Record<string, number> | null>(null);

  // About section collapse state
  const [showAboutSection, setShowAboutSection] = useState(true);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabId>('compare');
  const [savedCount, setSavedCount] = useState(0);

  const availableLLMs = getAvailableLLMs(apiKeys);

  // Check if we have results
  const hasResults = enhancedStatus === 'complete' && enhancedResult !== null;

  // Update saved count on mount and when savedKey changes
  useEffect(() => {
    const saved = localStorage.getItem('lifescore_comparisons');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setSavedCount(0);
      }
    }
  }, [savedKey]);

  // Auto-switch to results tab when comparison completes
  useEffect(() => {
    if (hasResults) {
      setActiveTab('results');
    }
  }, [hasResults]);

  const handleLoadSavedComparison = useCallback((result: ComparisonResult) => {
    loadResult(result);
    setEnhancedStatus('idle');
    setEnhancedResult(null);
  }, [loadResult]);

  const handleSaved = useCallback(() => {
    setSavedKey(prev => prev + 1);
  }, []);

  const handleCompare = async (city1: string, city2: string) => {
    if (enhancedMode) {
      // Run enhanced comparison
      setEnhancedStatus('running');
      setEnhancedResult(null);
      setPendingCities({ city1, city2 });
    } else {
      await compare(city1, city2);
    }
  };

  const handleEnhancedComplete = (result: EnhancedComparisonResult) => {
    setEnhancedResult(result);
    setEnhancedStatus('complete');
  };

  const handleReset = () => {
    reset();
    setEnhancedStatus('idle');
    setEnhancedResult(null);
    setPendingCities(null);
    setShowEvidencePanel(true); // Reset panel visibility for next comparison
    resetOGMetaTags();
  };

  const handleSaveAPIKeys = (keys: LLMAPIKeys) => {
    setApiKeys(keys);
  };

  return (
    <div className="app">
      <Header />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasResults={hasResults}
        savedCount={savedCount}
      />

      <main className="main-content">
        <div className="container">
          {/* Live Badge - Always visible */}
          <div className="live-badge">
            ⚡ LIVE - 100 Freedom Metrics | Real-Time LLM Evaluation
          </div>

          {/* ============================================================
              COMPARE TAB
              ============================================================ */}
          {activeTab === 'compare' && (
            <>
              {/* Enhanced Mode Toggle */}
              <EnhancedModeToggle
                enabled={enhancedMode}
                onToggle={setEnhancedMode}
                onConfigureKeys={() => setShowAPIKeyModal(true)}
                availableLLMs={availableLLMs}
              />

              {/* City Selector */}
              <CitySelector
                onCompare={handleCompare}
                isLoading={state.status === 'loading' || enhancedStatus === 'running'}
                enhancedWaiting={enhancedMode && enhancedStatus === 'running' && pendingCities !== null}
                onDealbreakersChange={setDealbreakers}
                onWeightsChange={setCustomWeights}
              />

              {/* Standard Loading State */}
              {!enhancedMode && state.status === 'loading' && state.progress && (
                <LoadingState
                  currentCategory={state.progress.currentCategory}
                  metricsProcessed={state.progress.metricsProcessed}
                  totalMetrics={state.progress.totalMetrics}
                  currentMetric={state.progress.currentMetric}
                />
              )}

              {/* Enhanced Comparison - LLM Selector */}
              {enhancedMode && enhancedStatus === 'running' && pendingCities && (
                <div className="enhanced-comparison-flow">
                  <div className="comparison-cities-header">
                    <h2>{pendingCities.city1.split(',')[0]} vs {pendingCities.city2.split(',')[0]}</h2>
                    <p className="cities-subtitle">Select AI models to evaluate this comparison</p>
                  </div>
                  <LLMSelector
                    city1={pendingCities.city1}
                    city2={pendingCities.city2}
                    onResultsUpdate={(llmResults, judgeResult) => {
                      if (judgeResult && llmResults.size > 0) {
                        // Build EnhancedComparisonResult from LLM results and judge output
                        console.log('Judge result received, building enhanced result...');

                        // Import the builder function and construct result
                        import('./services/opusJudge').then(({ buildEnhancedResultFromJudge }) => {
                          const result = buildEnhancedResultFromJudge(
                            pendingCities.city1,
                            pendingCities.city2,
                            Array.from(llmResults.values()),
                            judgeResult
                          );
                          setEnhancedResult(result);
                          setEnhancedStatus('complete');
                        });
                      }
                    }}
                    onStatusChange={(status) => {
                      console.log('LLM status changed:', status);
                      if (status === 'complete' && !enhancedResult) {
                        // If complete but no result yet, judge may still be processing
                        console.log('Waiting for judge result...');
                      }
                    }}
                  />
                </div>
              )}

              {/* Error State */}
              {state.status === 'error' && (
                <div className="error-card card">
                  <div className="error-icon">❌</div>
                  <h3>Analysis Failed</h3>
                  <p>{state.error}</p>
                  <button className="btn btn-primary" onClick={handleReset}>
                    Try Again
                  </button>
                </div>
              )}
            </>
          )}

          {/* ============================================================
              RESULTS TAB
              ============================================================ */}
          {activeTab === 'results' && (
            <>
              {/* Enhanced Comparison Results - FIX: Use EnhancedResults directly to avoid duplicate evaluation */}
              {enhancedMode && enhancedStatus === 'complete' && enhancedResult && (
                <>
                  <EnhancedResults
                    result={enhancedResult}
                    dealbreakers={dealbreakers}
                  />
                  <div className="new-comparison">
                    <button className="btn btn-secondary" onClick={() => { handleReset(); setActiveTab('compare'); }}>
                      ← New Comparison
                    </button>
                  </div>
                </>
              )}

              {/* Standard Results */}
              {!enhancedMode && state.status === 'success' && state.result && (
                <>
                  <Results result={state.result} onSaved={handleSaved} />
                  <div className="new-comparison">
                    <button className="btn btn-secondary" onClick={() => { handleReset(); setActiveTab('compare'); }}>
                      ← New Comparison
                    </button>
                  </div>
                </>
              )}

              {/* No results yet */}
              {!hasResults && !(state.status === 'success' && state.result) && (
                <div className="no-results card">
                  <div className="no-results-icon">📊</div>
                  <h3>No Results Yet</h3>
                  <p>Run a comparison to see results here</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('compare')}>
                    Go to Compare
                  </button>
                </div>
              )}
            </>
          )}

          {/* ============================================================
              VISUALS TAB
              ============================================================ */}
          {activeTab === 'visuals' && (
            <AdvancedVisuals result={enhancedResult} />
          )}

          {/* ============================================================
              SAVED TAB
              ============================================================ */}
          {activeTab === 'saved' && (
            <SavedComparisons
              key={savedKey}
              onLoadComparison={handleLoadSavedComparison}
              currentComparisonId={state.result?.comparisonId}
            />
          )}

          {/* ============================================================
              ABOUT TAB
              ============================================================ */}
          {activeTab === 'about' && (
            <div className="about-section card">
              <button
                className="section-toggle"
                onClick={() => setShowAboutSection(!showAboutSection)}
              >
                <h3 className="section-title">About LIFE SCORE™</h3>
                <span className={`toggle-arrow ${showAboutSection ? 'expanded' : ''}`}>▼</span>
              </button>

              {showAboutSection && (
                <>
                  <div className="about-content">
                    <p>
                      <strong>LIFE SCORE™ (Legal Independence & Freedom Evaluation)</strong> is a comprehensive
                      framework developed by John E. Desautels & Associates that analyzes legal freedom across
                      <span className="highlight"> 100 specific metrics</span> in six key categories:
                    </p>

                    <div className="category-summary">
                      <div className="category-item">
                        <span className="cat-icon">🗽</span>
                        <div className="cat-info">
                          <strong>Personal Autonomy</strong>
                          <span>15 metrics - Vice laws, substance policies, personal choices</span>
                        </div>
                      </div>

                      <div className="category-item">
                        <span className="cat-icon">🏠</span>
                        <div className="cat-info">
                          <strong>Housing & Property Rights</strong>
                          <span>20 metrics - HOA restrictions, property taxes, zoning</span>
                        </div>
                      </div>

                      <div className="category-item">
                        <span className="cat-icon">💼</span>
                        <div className="cat-info">
                          <strong>Business & Work Regulation</strong>
                          <span>25 metrics - Licensing, employment laws, regulatory burden</span>
                        </div>
                      </div>

                      <div className="category-item">
                        <span className="cat-icon">🚇</span>
                        <div className="cat-info">
                          <strong>Transportation & Movement</strong>
                          <span>15 metrics - Car dependency, public transit, mobility freedom</span>
                        </div>
                      </div>

                      <div className="category-item">
                        <span className="cat-icon">⚖️</span>
                        <div className="cat-info">
                          <strong>Policing & Legal System</strong>
                          <span>15 metrics - Enforcement, incarceration, legal costs</span>
                        </div>
                      </div>

                      <div className="category-item">
                        <span className="cat-icon">🎭</span>
                        <div className="cat-info">
                          <strong>Speech & Lifestyle</strong>
                          <span>10 metrics - Free expression, cultural norms, privacy</span>
                        </div>
                      </div>
                    </div>

                    <p className="methodology">
                      Unlike other "freedom indexes" that rely on subjective ratings, LIFE SCORE™ uses Multiple LLMs
                      with our proprietary weighted average LIFE score technology to verify each metric with actual laws, regulations, and current data.
                      <span className="highlight"> No fabricated data.</span> Every score
                      is backed by verifiable sources.
                    </p>

                    <p className="part-of">
                      This tool is part of the <strong className="brand-text">CLUES™</strong> (Comprehensive
                      Location & Utility Evaluation System) platform, helping individuals make informed decisions
                      about international relocation based on real data, not assumptions.
                    </p>
                  </div>

                  <div className="metrics-count">
                    <div className="count-box">
                      <span className="count-number">{ALL_METRICS.length}</span>
                      <span className="count-label">Total Metrics</span>
                    </div>
                    <div className="count-box">
                      <span className="count-number">6</span>
                      <span className="count-label">Categories</span>
                    </div>
                    <div className="count-box">
                      <span className="count-number">∞</span>
                      <span className="count-label">Cities Comparable</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Evidence Panel - LLM Web Search Citations */}
      <EvidencePanel
        result={enhancedResult}
        isVisible={showEvidencePanel && enhancedMode && enhancedStatus === 'complete'}
        onClose={() => setShowEvidencePanel(false)}
      />

      <Footer />

      {/* API Key Configuration Modal */}
      <APIKeyModal
        isOpen={showAPIKeyModal}
        onClose={() => setShowAPIKeyModal(false)}
        onSave={handleSaveAPIKeys}
        initialKeys={apiKeys}
      />
    </div>
  );
};

export default App;
