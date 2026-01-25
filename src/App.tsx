/**
 * LIFE SCORE™ Main Application
 * Legal Independence & Freedom Evaluation
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import Header from './components/Header';
import Footer from './components/Footer';
import PricingModal from './components/PricingModal';
import LegalModal, { type LegalPage } from './components/LegalModal';
import CookieConsent from './components/CookieConsent';
import TabNavigation, { type TabId } from './components/TabNavigation';
import CitySelector from './components/CitySelector';
import LoadingState from './components/LoadingState';
import Results from './components/Results';
import SavedComparisons from './components/SavedComparisons';
import VisualsTab from './components/VisualsTab';
import AskOlivia from './components/AskOlivia';
import JudgeTab from './components/JudgeTab';
import OliviaChatBubble from './components/OliviaChatBubble';
import FeatureGate, { UsageMeter } from './components/FeatureGate';
import { useTierAccess } from './hooks/useTierAccess';
import {
  EnhancedModeToggle,
  APIKeyModal,
  EnhancedResults,
  LLMSelector,
  EVALUATOR_LLMS,
  type LLMButtonState
} from "./components/EnhancedComparison";
import type { EvaluatorResult } from './services/llmEvaluators';
import type { LLMMetricScore } from './types/enhancedComparison';
// EvidencePanel is now rendered inside EnhancedResults component
import type { ComparisonResult } from './types/metrics';
import type { LLMAPIKeys, EnhancedComparisonResult, LLMProvider } from './types/enhancedComparison';
import { LLM_CONFIGS } from './types/enhancedComparison';
import type { JudgeOutput } from './services/opusJudge';
import type { VisualReportState } from './types/gamma';
import { getStoredAPIKeys, getAvailableLLMs } from './services/enhancedComparison';
import useComparison from './hooks/useComparison';
import { resetOGMetaTags } from './hooks/useOGMeta';
import { ALL_METRICS } from './shared/metrics';
import './styles/globals.css';
import './App.css';

// Main app content (requires auth)
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { state, compare, reset, loadResult } = useComparison();
  const { checkUsage, incrementUsage } = useTierAccess();
  const [savedKey, setSavedKey] = useState(0);

  // Enhanced mode state
  const [enhancedMode, setEnhancedMode] = useState(false);
  const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<LLMAPIKeys>(getStoredAPIKeys());
  const [enhancedStatus, setEnhancedStatus] = useState<'idle' | 'running' | 'complete'>('idle');
  const [enhancedResult, setEnhancedResult] = useState<EnhancedComparisonResult | null>(null);
  const [pendingCities, setPendingCities] = useState<{ city1: string; city2: string } | null>(null);

  // LIFTED STATE from LLMSelector (for incremental LLM feature)
  const [llmStates, setLLMStates] = useState<Map<LLMProvider, LLMButtonState>>(
    new Map(EVALUATOR_LLMS.map(llm => [llm, { status: 'idle' }]))
  );
  const [judgeResultLifted, setJudgeResultLifted] = useState<JudgeOutput | null>(null);
  const [lastJudgedCount, setLastJudgedCount] = useState(0);

  // Pending LLM to run (for Add More Models feature)
  const [pendingLLMToRun, setPendingLLMToRun] = useState<LLMProvider | null>(null);

  // Dealbreakers state
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  // Custom weights state - used for persona-based scoring (Digital Nomad, Entrepreneur, etc.)
  const [customWeights, setCustomWeights] = useState<Record<string, number> | null>(null);

  // LIFTED STATE: Gamma visual report (persists across tab switches)
  const [gammaReportState, setGammaReportState] = useState<VisualReportState>({
    status: 'idle',
  });
  const [gammaExportFormat, setGammaExportFormat] = useState<'pdf' | 'pptx'>('pdf');
  const [showGammaEmbedded, setShowGammaEmbedded] = useState(false);

  // About section collapse state
  const [showAboutSection, setShowAboutSection] = useState(true);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<TabId>('compare');
  const [savedCount, setSavedCount] = useState(0);

  // Legal modal state
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPage>(null);

  // Pricing modal state
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingHighlight, setPricingHighlight] = useState<{ feature?: string; tier?: 'free' | 'pro' | 'enterprise' }>({});

  const availableLLMs = getAvailableLLMs(apiKeys);

  // Check if we have results (enhanced mode)
  const hasEnhancedResults = enhancedStatus === 'complete' && enhancedResult !== null;

  // Check if we have results (standard mode)
  const hasStandardResults = !enhancedMode && state.status === 'success' && state.result !== null;

  // Combined check for any results
  const hasResults = hasEnhancedResults || hasStandardResults;

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

  // Auto-switch to results tab when comparison completes (BOTH modes)
  useEffect(() => {
    if (hasEnhancedResults || hasStandardResults) {
      setActiveTab('results');
    }
  }, [hasEnhancedResults, hasStandardResults]);

  // SYNC STATE: When toggling to enhanced mode with existing single search result,
  // mark claude-sonnet as completed so user sees the green checkmark
  useEffect(() => {
    if (enhancedMode && state.status === 'success' && state.result) {
      // Check if claude-sonnet is already marked as completed
      const currentSonnetState = llmStates.get('claude-sonnet');
      if (currentSonnetState?.status !== 'completed') {
        // Convert single search result to EvaluatorResult format
        const sonnetScores: LLMMetricScore[] = [];

        // Extract scores from city1 categories
        state.result.city1.categories.forEach(cat => {
          cat.metrics.forEach(metric => {
            sonnetScores.push({
              ...metric,
              llmProvider: 'claude-sonnet',
              city: 'city1' as const
            });
          });
        });

        // Extract scores from city2 categories
        state.result.city2.categories.forEach(cat => {
          cat.metrics.forEach(metric => {
            sonnetScores.push({
              ...metric,
              llmProvider: 'claude-sonnet',
              city: 'city2' as const
            });
          });
        });

        const sonnetResult: EvaluatorResult = {
          provider: 'claude-sonnet',
          success: true,
          scores: sonnetScores,
          latencyMs: 0 // Not tracked in single mode
        };

        // Update llmStates to show claude-sonnet as completed
        setLLMStates(prev => {
          const newMap = new Map(prev);
          newMap.set('claude-sonnet', {
            status: 'completed',
            result: sonnetResult
          });
          return newMap;
        });

        // Also set pending cities from the existing result
        if (!pendingCities) {
          setPendingCities({
            city1: `${state.result.city1.city}, ${state.result.city1.region || ''} ${state.result.city1.country}`.replace(/\s+/g, ' ').trim(),
            city2: `${state.result.city2.city}, ${state.result.city2.region || ''} ${state.result.city2.country}`.replace(/\s+/g, ' ').trim()
          });
        }
      }
    }
  }, [enhancedMode, state.status, state.result, llmStates, pendingCities]);

  // SYNC STATE: When toggling FROM enhanced mode with completed claude-sonnet,
  // the standard mode result should already exist or we keep the enhanced result visible
  useEffect(() => {
    if (!enhancedMode && llmStates.get('claude-sonnet')?.status === 'completed' && !state.result) {
      // If we have enhanced mode results but no standard result, keep enhanced visible
      // This is handled by hasEnhancedResults check elsewhere
    }
  }, [enhancedMode, llmStates, state.result]);

  // Listen for 'openPricing' events from FeatureGate components
  useEffect(() => {
    const handleOpenPricing = (e: CustomEvent<{ feature?: string; requiredTier?: 'free' | 'pro' | 'enterprise' }>) => {
      setPricingHighlight({
        feature: e.detail?.feature,
        tier: e.detail?.requiredTier,
      });
      setShowPricingModal(true);
    };

    window.addEventListener('openPricing', handleOpenPricing as EventListener);
    return () => {
      window.removeEventListener('openPricing', handleOpenPricing as EventListener);
    };
  }, []);

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
      // Enhanced mode has its own gating via FeatureGate component
      // Run enhanced comparison
      setEnhancedStatus('running');
      setEnhancedResult(null);
      setPendingCities({ city1, city2 });
    } else {
      // Standard mode: Check usage limit before running
      const usageResult = await checkUsage('standardComparisons');

      if (!usageResult.allowed) {
        // User has hit their limit - show pricing modal
        setPricingHighlight({
          feature: 'standardComparisons',
          tier: usageResult.requiredTier,
        });
        setShowPricingModal(true);
        return;
      }

      // Increment usage counter before running comparison
      await incrementUsage('standardComparisons');

      // Run the comparison
      await compare(city1, city2);
    }
  };

  const handleReset = () => {
    reset();
    setEnhancedStatus('idle');
    setEnhancedResult(null);
    setPendingCities(null);
    // Reset lifted LLM state
    setLLMStates(new Map(EVALUATOR_LLMS.map(llm => [llm, { status: 'idle' }])));
    setJudgeResultLifted(null);
    setLastJudgedCount(0);
    setPendingLLMToRun(null);
    resetOGMetaTags();
  };

  const handleSaveAPIKeys = (keys: LLMAPIKeys) => {
    setApiKeys(keys);
  };

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="app auth-loading">
        <div className="auth-loading-spinner">
          <div className="spinner-ring"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app">
      <Header onUpgradeClick={() => setShowPricingModal(true)} />

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
              {/* Standard Comparisons Usage Meter - Only show for standard mode */}
              {!enhancedMode && (
                <div className="usage-meter-container">
                  <UsageMeter feature="standardComparisons" showLabel={true} />
                </div>
              )}

              {/* Enhanced Mode Toggle - Gated for Pro+ users */}
              <FeatureGate
                feature="enhancedComparisons"
                showUsage={true}
                blurContent={false}
              >
                <EnhancedModeToggle
                  enabled={enhancedMode}
                  onToggle={setEnhancedMode}
                  onConfigureKeys={() => setShowAPIKeyModal(true)}
                  availableLLMs={availableLLMs}
                />
              </FeatureGate>

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
                    llmStates={llmStates}
                    setLLMStates={setLLMStates}
                    judgeResult={judgeResultLifted}
                    setJudgeResult={setJudgeResultLifted}
                    lastJudgedCount={lastJudgedCount}
                    setLastJudgedCount={setLastJudgedCount}
                    pendingLLMToRun={pendingLLMToRun}
                    clearPendingLLM={() => setPendingLLMToRun(null)}
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
                            judgeResult,
                            customWeights  // Pass user's custom weights for persona-based scoring
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
                    customWeights={customWeights}
                  />
                  
                  {/* ADD MORE MODELS SECTION - Phase 3 Incremental LLM Feature */}
                  {pendingCities && (
                    <div className="add-more-models card">
                      <h3 className="section-title">
                        <span className="section-icon">🤖</span>
                        Add More AI Models
                      </h3>
                      <p className="section-description">
                        Run additional LLMs to strengthen consensus. Judge will auto-update.
                      </p>
                      <div className="llm-add-grid">
                        {EVALUATOR_LLMS.map(llm => {
                          const config = LLM_CONFIGS[llm];
                          const llmState = llmStates.get(llm);
                          const isCompleted = llmState?.status === 'completed';
                          const isRunning = llmState?.status === 'running';
                          const isFailed = llmState?.status === 'failed';
                          
                          return (
                            <button
                              key={llm}
                              className={`llm-add-btn ${isCompleted ? 'completed' : ''} ${isRunning ? 'running' : ''} ${isFailed ? 'failed' : ''}`}
                              disabled={isCompleted || isRunning}
                              onClick={() => {
                                setPendingLLMToRun(llm);  // Track which LLM to run
                                setEnhancedStatus('running');
                                setActiveTab('compare');
                              }}
                              title={isCompleted ? 'Already completed' : isRunning ? 'Running...' : 'Click to add'}
                            >
                              <span className="llm-icon">{config.icon}</span>
                              <span className="llm-name">{config.shortName}</span>
                              <span className="llm-status-indicator">
                                {isCompleted && '✓'}
                                {isRunning && '⏳'}
                                {isFailed && '✗'}
                                {!isCompleted && !isRunning && !isFailed && '+'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="models-count">
                        {Array.from(llmStates.values()).filter(s => s.status === 'completed').length} of {EVALUATOR_LLMS.length} models completed
                      </p>
                    </div>
                  )}
                  
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
                  <Results result={state.result} onSaved={handleSaved} customWeights={customWeights} />
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
            <VisualsTab
              result={enhancedResult || state.result || null}
              reportState={gammaReportState}
              setReportState={setGammaReportState}
              exportFormat={gammaExportFormat}
              setExportFormat={setGammaExportFormat}
              showEmbedded={showGammaEmbedded}
              setShowEmbedded={setShowGammaEmbedded}
            />
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
              ASK OLIVIA TAB
              ============================================================ */}
          {activeTab === 'olivia' && (
            <AskOlivia
              comparisonResult={enhancedResult || state.result || undefined}
            />
          )}

          {/* ============================================================
              JUDGES REPORT TAB - The Final Verdict
              ============================================================ */}
          {activeTab === 'judges-report' && (
            <JudgeTab
              comparisonResult={enhancedResult || state.result || null}
              userId={/* TODO: Get from auth context */ 'guest'}
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
                      framework developed by Clues Intelligence LTD that analyzes legal freedom across
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

      <Footer onOpenLegal={setActiveLegalPage} />

      {/* Legal Modal */}
      <LegalModal page={activeLegalPage} onClose={() => setActiveLegalPage(null)} />

      {/* API Key Configuration Modal */}
      <APIKeyModal
        isOpen={showAPIKeyModal}
        onClose={() => setShowAPIKeyModal(false)}
        onSave={handleSaveAPIKeys}
        initialKeys={apiKeys}
      />

      {/* Olivia Chat Bubble - Shows on all pages EXCEPT Ask Olivia tab */}
      {activeTab !== 'olivia' && (
        <OliviaChatBubble
          comparisonResult={enhancedResult || state.result || undefined}
        />
      )}

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Pricing Modal */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => {
          setShowPricingModal(false);
          setPricingHighlight({});
        }}
        highlightFeature={pricingHighlight.feature}
        highlightTier={pricingHighlight.tier}
      />
    </div>
  );
};

// Root App component with AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
