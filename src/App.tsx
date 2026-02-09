/**
 * LIFE SCORE™ Main Application
 * Legal Independence & Freedom Evaluation
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useCallback, useEffect, Suspense } from 'react';
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
import JudgeTab from './components/JudgeTab';

// Phase 2 Performance: Lazy load tab components (2026-02-02)
const SavedComparisons = React.lazy(() => import('./components/SavedComparisons'));
const VisualsTab = React.lazy(() => import('./components/VisualsTab'));
const AskOlivia = React.lazy(() => import('./components/AskOlivia'));
import OliviaChatBubble from './components/OliviaChatBubble';
import FeatureGate, { UsageMeter } from './components/FeatureGate';
import CostDashboard from './components/CostDashboard';
import HelpBubble from './components/HelpBubble';
import SettingsModal from './components/SettingsModal';
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
import { LLM_CONFIGS, type LLMMetricScore } from './types/enhancedComparison';
// EvidencePanel is now rendered inside EnhancedResults component
import type { ComparisonResult, LawLivedRatio } from './types/metrics';
import type { LLMAPIKeys, EnhancedComparisonResult, LLMProvider } from './types/enhancedComparison';
import type { JudgeOutput } from './services/opusJudge';
import type { VisualReportState } from './types/gamma';
import { getStoredAPIKeys, getAvailableLLMs } from './services/enhancedComparison';
import { isEnhancedComparisonResult, isEnhancedComparisonSaved, saveEnhancedComparisonLocal, type SavedJudgeReport } from './services/savedComparisons';
import { startJudgePregeneration } from './services/judgePregenService';
import useComparison from './hooks/useComparison';
import { resetOGMetaTags } from './hooks/useOGMeta';
import { ALL_METRICS } from './shared/metrics';
import {
  createCostBreakdown,
  finalizeCostBreakdown,
  storeCostBreakdown,
  calculateLLMCost,
  calculateTavilyCost,
  formatCostBreakdownLog,
  toApiCostRecordInsert,
  type APICallCost
} from './utils/costCalculator';
import { saveApiCostRecord } from './services/databaseService';
import './styles/globals.css';
import './App.css';

// Main app content (requires auth)
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, session } = useAuth();
  const { state, compare, reset, loadResult } = useComparison();
  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
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

  // FIX 2026-02-08: Selected saved Judge report to load in JudgeTab
  const [selectedSavedJudgeReport, setSelectedSavedJudgeReport] = useState<SavedJudgeReport | null>(null);

  // Pending LLM to run (for Add More Models feature)
  const [pendingLLMToRun, setPendingLLMToRun] = useState<LLMProvider | null>(null);

  // Category failures tracking - user must acknowledge before seeing results
  const [failuresAcknowledged, setFailuresAcknowledged] = useState(false);

  // Dealbreakers state
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);

  // Custom weights state - used for persona-based scoring (Digital Nomad, Entrepreneur, etc.)
  const [customWeights, setCustomWeights] = useState<Record<string, number> | null>(null);

  // Law vs Lived preference state - controls how legal and enforcement scores are combined
  const [lawLivedRatio, setLawLivedRatio] = useState<LawLivedRatio>({ law: 50, lived: 50 });
  const [conservativeMode, setConservativeMode] = useState(false);

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

  // Cost dashboard state (admin feature)
  const [showCostDashboard, setShowCostDashboard] = useState(false);

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const availableLLMs = getAvailableLLMs(apiKeys);

  // Check if we have results (enhanced mode)
  const hasEnhancedResults = enhancedStatus === 'complete' && enhancedResult !== null;

  // Check if we have results (standard mode)
  const hasStandardResults = !enhancedMode && state.status === 'success' && state.result !== null;

  // Combined check for any results
  const hasResults = hasEnhancedResults || hasStandardResults;

  // Check if any LLM has REAL category failures (not just partial success)
  // Only flag if: status is explicitly 'failed' OR less than 50% of metrics returned
  const hasCategoryFailures = Array.from(llmStates.values()).some(state => {
    if (!state.categoryProgress) return false;
    // Only check LLMs that have actually completed (not idle/running)
    if (state.status !== 'completed' && state.status !== 'failed') return false;
    return state.categoryProgress.some(cat =>
      cat.status === 'failed' ||
      // Only flag as failure if LESS THAN HALF of metrics returned (real failure, not minor variance)
      (cat.successCount !== undefined && cat.successCount < cat.metricsCount * 0.5)
    );
  });

  // Update saved count on mount and when savedKey changes
  useEffect(() => {
    let count = 0;
    try {
      const standard = localStorage.getItem('lifescore_saved_comparisons');
      if (standard) count += JSON.parse(standard).length;
    } catch { /* ignore parse errors */ }
    try {
      const enhanced = localStorage.getItem('lifescore_saved_enhanced');
      if (enhanced) count += JSON.parse(enhanced).length;
    } catch { /* ignore parse errors */ }
    setSavedCount(count);
  }, [savedKey]);

  // Auto-switch to results tab when comparison completes (BOTH modes)
  // BUT: If there are category failures, require user to click "SEE RESULTS" first
  useEffect(() => {
    if (hasEnhancedResults || hasStandardResults) {
      // If there are failures, only switch if user acknowledged them
      if (hasCategoryFailures && !failuresAcknowledged) {
        // Don't auto-switch - user must click "SEE RESULTS" button
        return;
      }
      setActiveTab('results');
    }
  }, [hasEnhancedResults, hasStandardResults, hasCategoryFailures, failuresAcknowledged]);

  // Reset failures acknowledgment when starting a new comparison
  useEffect(() => {
    if (enhancedStatus === 'running') {
      setFailuresAcknowledged(false);
    }
  }, [enhancedStatus]);

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
              legalScore: metric.legalScore ?? undefined,
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
              legalScore: metric.legalScore ?? undefined,
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
    // FIX 2026-01-26: Add defensive checks to prevent crashes when loading saved comparisons
    if (!result) {
      console.error('[App] handleLoadSavedComparison called with null/undefined result');
      return;
    }

    if (!result.city1 || !result.city2) {
      console.error('[App] handleLoadSavedComparison: result missing city data', result);
      return;
    }

    console.log('[App] Loading saved comparison:', result.comparisonId, result.city1.city, 'vs', result.city2.city);

    // FIX 2026-02-08: Clear stale judge state to prevent data contamination
    setJudgeResultLifted(null);
    setSelectedSavedJudgeReport(null);

    // FIX 7.4: Use type guard instead of unsafe casts for detecting enhanced comparisons
    // FIX 2026-02-08: Set enhancedMode to match loaded report type - user clicks, report loads, no hoops
    if (isEnhancedComparisonResult(result)) {
      console.log('[App] Loading as ENHANCED comparison');
      setEnhancedMode(true);
      setEnhancedResult(result as unknown as EnhancedComparisonResult);
      setEnhancedStatus('complete');
      // Also set base result for components that need it
      loadResult(result);
    } else {
      console.log('[App] Loading as standard comparison');
      setEnhancedMode(false);
      loadResult(result);
      setEnhancedStatus('idle');
      setEnhancedResult(null);
    }

    // FIX 2026-01-25: Switch to results tab after loading saved comparison
    setActiveTab('results');
  }, [loadResult]);

  const handleSaved = useCallback(() => {
    setSavedKey(prev => prev + 1);
  }, []);

  // FIX 2026-02-08: Handler to view a saved Judge report
  // FIX 2026-02-08: Clear stale state to prevent contamination from previous comparisons
  const handleViewJudgeReport = useCallback((report: SavedJudgeReport) => {
    console.log('[App] View Judge report:', report.reportId, report.city1, 'vs', report.city2);
    // CRITICAL: Clear stale comparison state to prevent Berlin/Tampa showing for Kansas City/Edinburgh
    setEnhancedResult(null);
    // Store the selected report so JudgeTab can load it directly
    setSelectedSavedJudgeReport(report);
    // Switch to the judges-report tab
    setActiveTab('judges-report');
  }, []);

  const handleCompare = async (city1: string, city2: string) => {
    // FIX 2026-02-08: Clear ALL stale state on new compare to prevent data contamination
    // CRITICAL: enhancedResult must be cleared for BOTH modes to prevent Bern/Mesa showing for Baltimore/Bratislava
    setJudgeResultLifted(null);
    setSelectedSavedJudgeReport(null);
    setEnhancedResult(null);

    if (enhancedMode) {
      // ADMIN BYPASS: Skip usage checks for admin users
      if (!isAdmin) {
        // Enhanced mode: Check usage limit before running
        const usageResult = await checkUsage('enhancedComparisons');

        if (!usageResult.allowed) {
          // User has hit their limit - show pricing modal
          setPricingHighlight({
            feature: 'enhancedComparisons',
            tier: usageResult.requiredTier,
          });
          setShowPricingModal(true);
          return;
        }

        // Increment usage counter before running enhanced comparison
        await incrementUsage('enhancedComparisons');
      }

      // Run enhanced comparison
      setEnhancedStatus('running');
      setEnhancedResult(null);
      setPendingCities({ city1, city2 });
    } else {
      // ADMIN BYPASS: Skip usage checks for admin users
      if (!isAdmin) {
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
      }

      // Run the comparison with user's scoring preferences
      await compare(city1, city2, { lawLivedRatio, conservativeMode, customWeights });
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
    // FIX 2026-02-08: Also clear saved judge report state
    setSelectedSavedJudgeReport(null);
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
      <Header
        onUpgradeClick={() => setShowPricingModal(true)}
        onCostDashboardClick={() => setShowCostDashboard(true)}
        onSettingsClick={() => setShowSettingsModal(true)}
      />

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
                onLawLivedChange={setLawLivedRatio}
                onConservativeModeChange={setConservativeMode}
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
                      console.log('[App] onResultsUpdate called | llmResults:', llmResults.size, '| judgeResult:', !!judgeResult);

                      // Helper function to build and set result
                      const buildAndSetResult = (
                        effectiveJudgeResult: JudgeOutput | null,
                        isPartial: boolean = false
                      ) => {
                        import('./services/opusJudge').then(({ buildEnhancedResultFromJudge }) => {
                          try {
                            // If no judge result, create a minimal one from LLM data
                            let finalJudgeResult = effectiveJudgeResult;

                            if (!finalJudgeResult || !finalJudgeResult.city1Consensuses || !finalJudgeResult.city2Consensuses) {
                              console.warn('[App] Building fallback judge result from LLM data (partial results)');
                              // Build minimal judge result from LLM scores
                              const llmResultsArray = Array.from(llmResults.values());
                              const city1Consensuses: any[] = [];
                              const city2Consensuses: any[] = [];

                              // Aggregate scores by metric
                              llmResultsArray.forEach(evalResult => {
                                if (!evalResult.success && (!evalResult.scores || evalResult.scores.length === 0)) return;

                                evalResult.scores?.forEach((score: LLMMetricScore) => {
                                  const consensus = {
                                    metricId: score.metricId,
                                    llmScores: [score],
                                    consensusScore: score.normalizedScore,
                                    legalScore: score.legalScore || score.normalizedScore,
                                    enforcementScore: score.enforcementScore || score.normalizedScore,
                                    confidenceLevel: 'moderate' as const,
                                    standardDeviation: 0,
                                    judgeExplanation: `Based on ${evalResult.provider} evaluation (partial - judge unavailable)`
                                  };

                                  if (score.city === 'city1') {
                                    const existing = city1Consensuses.find(c => c.metricId === score.metricId);
                                    if (!existing) city1Consensuses.push(consensus);
                                  } else if (score.city === 'city2') {
                                    const existing = city2Consensuses.find(c => c.metricId === score.metricId);
                                    if (!existing) city2Consensuses.push(consensus);
                                  }
                                });
                              });

                              finalJudgeResult = {
                                city1Consensuses,
                                city2Consensuses,
                                overallAgreement: 50, // Unknown without judge
                                disagreementAreas: [],
                                judgeLatencyMs: 0
                              };
                            }

                            const result = buildEnhancedResultFromJudge(
                              pendingCities.city1,
                              pendingCities.city2,
                              Array.from(llmResults.values()),
                              finalJudgeResult,
                              customWeights
                            );

                            // Add warning if partial results
                            if (isPartial) {
                              (result as any).warning = 'Partial results: Some LLMs failed to return complete data. Showing available metrics.';
                            }

                            console.log('[App] Enhanced result built successfully:', {
                              city1: result.city1?.city,
                              city2: result.city2?.city,
                              winner: result.winner,
                              totalScore1: result.city1?.totalConsensusScore,
                              totalScore2: result.city2?.totalConsensusScore,
                              isPartial
                            });

                            // === COST TRACKING ===
                            try {
                              const costBreakdown = createCostBreakdown(
                                result.comparisonId,
                                pendingCities.city1,
                                pendingCities.city2,
                                'enhanced'
                              );

                              llmResults.forEach((evalResult, provider) => {
                                if (evalResult.usage?.tokens) {
                                  const { inputTokens, outputTokens } = evalResult.usage.tokens;
                                  const pricingKey = provider === 'claude-sonnet' ? 'claude-sonnet-4-5' :
                                                     provider === 'gpt-4o' ? 'gpt-4o' :
                                                     provider === 'gemini-3-pro' ? 'gemini-3-pro' :
                                                     provider === 'grok-4' ? 'grok-4' :
                                                     provider === 'perplexity' ? 'perplexity-sonar' : null;

                                  if (pricingKey) {
                                    const costs = calculateLLMCost(pricingKey as any, inputTokens, outputTokens);
                                    const apiCall: APICallCost = {
                                      provider,
                                      model: pricingKey,
                                      inputTokens,
                                      outputTokens,
                                      inputCost: costs.inputCost,
                                      outputCost: costs.outputCost,
                                      totalCost: costs.totalCost,
                                      timestamp: Date.now(),
                                      context: 'evaluation'
                                    };

                                    if (provider === 'claude-sonnet') costBreakdown.claudeSonnet.push(apiCall);
                                    else if (provider === 'gpt-4o') costBreakdown.gpt4o.push(apiCall);
                                    else if (provider === 'gemini-3-pro') costBreakdown.gemini.push(apiCall);
                                    else if (provider === 'grok-4') costBreakdown.grok.push(apiCall);
                                    else if (provider === 'perplexity') costBreakdown.perplexity.push(apiCall);
                                  }
                                }
                              });

                              if (effectiveJudgeResult?.usage?.opusTokens) {
                                const { inputTokens, outputTokens } = effectiveJudgeResult.usage.opusTokens;
                                const judgeCosts = calculateLLMCost('claude-opus-4-5', inputTokens, outputTokens);
                                costBreakdown.opusJudge = {
                                  provider: 'claude-opus',
                                  model: 'claude-opus-4-5',
                                  inputTokens,
                                  outputTokens,
                                  inputCost: judgeCosts.inputCost,
                                  outputCost: judgeCosts.outputCost,
                                  totalCost: judgeCosts.totalCost,
                                  timestamp: Date.now(),
                                  context: 'judge'
                                };
                              }

                              // FIX #73: Estimate Tavily research/search costs
                              // Each enhanced comparison uses ~1 research call (~30 credits)
                              // and ~15 search calls across providers (~3 credits each = ~45 credits)
                              const activeProviders = llmResults.size;
                              if (activeProviders > 0) {
                                const researchCredits = 30;
                                const researchCost = calculateTavilyCost('research', researchCredits);
                                costBreakdown.tavilyResearch = {
                                  type: 'research',
                                  creditsUsed: researchCredits,
                                  cost: researchCost,
                                  timestamp: Date.now(),
                                  query: `${pendingCities.city1} vs ${pendingCities.city2} research`,
                                };

                                // Each provider does ~3 search queries
                                const searchCreditsPerProvider = 9; // ~3 searches * 3 credits each
                                for (let i = 0; i < activeProviders; i++) {
                                  const searchCost = calculateTavilyCost('search', searchCreditsPerProvider);
                                  costBreakdown.tavilySearches.push({
                                    type: 'search',
                                    creditsUsed: searchCreditsPerProvider,
                                    cost: searchCost,
                                    timestamp: Date.now(),
                                  });
                                }
                              }

                              const finalBreakdown = finalizeCostBreakdown(costBreakdown);
                              storeCostBreakdown(finalBreakdown);
                              console.log('[App] Cost tracking stored:', formatCostBreakdownLog(finalBreakdown));

                              // FIX #50: Auto-sync cost data to Supabase database
                              if (user?.id) {
                                const dbRecord = toApiCostRecordInsert(finalBreakdown, user.id);
                                saveApiCostRecord(dbRecord)
                                  .then(({ data, error }) => {
                                    if (error) {
                                      console.warn('[App] Cost DB sync failed (non-fatal):', error.message);
                                    } else {
                                      console.log('[App] Cost data auto-synced to Supabase:', data?.comparison_id);
                                    }
                                  })
                                  .catch(err => console.warn('[App] Cost DB sync error (non-fatal):', err));
                              }
                            } catch (costError) {
                              console.error('[App] Cost tracking error (non-fatal):', costError);
                            }
                            // === END COST TRACKING ===

                            setEnhancedResult(result);
                            setEnhancedStatus('complete');
                            console.log('[App] State updated - tab should switch now');

                            // === JUDGE PRE-GENERATION ===
                            if (!isPartial) {
                              try {
                                const userId = user?.id || 'guest';
                                console.log('[App] Starting Judge pre-generation in background...');
                                startJudgePregeneration(result, userId, session?.access_token);
                              } catch (pregenError) {
                                console.error('[App] Judge pre-generation error (non-fatal):', pregenError);
                              }
                            }
                            // === END JUDGE PRE-GENERATION ===

                            // === FIX #56: AUTO-SAVE WHEN ADDING LLM TO SAVED REPORT ===
                            // If this comparison was previously saved, auto-save the updated version
                            if (result.comparisonId && isEnhancedComparisonSaved(result.comparisonId)) {
                              console.log('[App] Comparison was previously saved - auto-saving updated results');
                              saveEnhancedComparisonLocal(result)
                                .then(() => {
                                  console.log('[App] Auto-save successful for comparison:', result.comparisonId);
                                  handleSaved(); // Trigger refresh of saved comparisons list
                                })
                                .catch((saveError) => {
                                  console.warn('[App] Auto-save failed (non-fatal):', saveError);
                                });
                            }
                            // === END AUTO-SAVE ===
                          } catch (buildError) {
                            console.error('[App] Error building enhanced result:', buildError);
                            // FIX: Still set a minimal result so results page shows
                            setEnhancedResult({
                              city1: { city: pendingCities.city1.split(',')[0], country: 'Unknown', categories: [], totalConsensusScore: 0, overallAgreement: 0 },
                              city2: { city: pendingCities.city2.split(',')[0], country: 'Unknown', categories: [], totalConsensusScore: 0, overallAgreement: 0 },
                              winner: 'tie',
                              scoreDifference: 0,
                              categoryWinners: {} as any,
                              comparisonId: `LIFE-ERR-${Date.now()}`,
                              generatedAt: new Date().toISOString(),
                              llmsUsed: Array.from(llmResults.keys()),
                              judgeModel: 'claude-opus',
                              overallConsensusConfidence: 'low',
                              disagreementSummary: 'Error building results - partial data shown',
                              processingStats: { totalTimeMs: 0, llmTimings: {} as any, metricsEvaluated: 0 },
                              warning: `Error building results: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`
                            } as any);
                            setEnhancedStatus('complete');
                          }
                        }).catch(importError => {
                          console.error('Error importing opusJudge module:', importError);
                          // FIX: Set minimal result so results page shows
                          setEnhancedResult({
                            city1: { city: pendingCities.city1.split(',')[0], country: 'Unknown', categories: [], totalConsensusScore: 0, overallAgreement: 0 },
                            city2: { city: pendingCities.city2.split(',')[0], country: 'Unknown', categories: [], totalConsensusScore: 0, overallAgreement: 0 },
                            winner: 'tie',
                            scoreDifference: 0,
                            categoryWinners: {} as any,
                            comparisonId: `LIFE-ERR-${Date.now()}`,
                            generatedAt: new Date().toISOString(),
                            llmsUsed: Array.from(llmResults.keys()),
                            judgeModel: 'claude-opus',
                            overallConsensusConfidence: 'low',
                            disagreementSummary: 'Module import error - partial data shown',
                            processingStats: { totalTimeMs: 0, llmTimings: {} as any, metricsEvaluated: 0 },
                            warning: 'Error loading result builder module'
                          } as any);
                          setEnhancedStatus('complete');
                        });
                      };

                      if (judgeResult && llmResults.size > 0) {
                        // Normal path: Judge result available
                        const hasValidStructure = judgeResult.city1Consensuses && judgeResult.city2Consensuses;

                        if (!hasValidStructure) {
                          console.warn('[App] Judge result has invalid structure - building partial result');
                        }

                        console.log('[App] Judge result received, building enhanced result...', {
                          city1Consensuses: judgeResult.city1Consensuses?.length,
                          city2Consensuses: judgeResult.city2Consensuses?.length,
                          overallAgreement: judgeResult.overallAgreement
                        });

                        buildAndSetResult(judgeResult, !hasValidStructure);
                      } else if (llmResults.size > 0 && !judgeResult) {
                        // FIX: Judge failed but we have LLM results - build partial result
                        console.warn('[App] Judge failed but LLM results available - building partial result from', llmResults.size, 'LLMs');
                        buildAndSetResult(null, true);
                      }
                    }}
                    onStatusChange={(status) => {
                      console.log('[App] LLM status changed:', status, '| enhancedResult:', !!enhancedResult, '| enhancedStatus:', enhancedStatus);
                      if (status === 'complete' && !enhancedResult) {
                        // If complete but no result yet, something went wrong
                        console.warn('[App] Status complete but no result - judge may have failed. Check console for errors.');
                      }
                    }}
                  />
                </div>
              )}

              {/* Category Failures Warning - Require acknowledgment before showing results */}
              {enhancedMode && enhancedStatus === 'complete' && hasCategoryFailures && !failuresAcknowledged && (
                <div className="category-failures-warning">
                  <div className="warning-icon">⚠️</div>
                  <h3>Some Data May Be Incomplete</h3>
                  <p>
                    One or more metric categories did not return complete data.
                    The results may be missing some metrics.
                  </p>
                  <div className="warning-details">
                    {Array.from(llmStates.entries()).map(([provider, state]) => {
                      if (!state.categoryProgress) return null;
                      // Only show LLMs that completed/failed, not idle/running
                      if (state.status !== 'completed' && state.status !== 'failed') return null;
                      const failedCats = state.categoryProgress.filter(cat =>
                        cat.status === 'failed' ||
                        // Match the hasCategoryFailures logic: less than 50% = real failure
                        (cat.successCount !== undefined && cat.successCount < cat.metricsCount * 0.5)
                      );
                      if (failedCats.length === 0) return null;
                      return (
                        <div key={provider} className="llm-failures">
                          <strong>{LLM_CONFIGS[provider].shortName}:</strong>
                          {failedCats.map(cat => (
                            <span key={cat.categoryId} className="failed-category">
                              {cat.categoryName}: {cat.successCount ?? 0}/{cat.metricsCount} metrics
                            </span>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="btn btn-primary see-results-btn"
                    onClick={() => setFailuresAcknowledged(true)}
                  >
                    I Understand — SEE RESULTS
                  </button>
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
                    onSaved={handleSaved}
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

              {/* FIX #55: No results yet - with helpful navigation options */}
              {!hasResults && !(state.status === 'success' && state.result) && (
                <div className="no-results card">
                  <div className="no-results-icon">📊</div>
                  <h3>No Results Yet</h3>
                  <p>Run a new comparison or load a saved one to see results</p>
                  <div className="no-results-actions">
                    <button className="btn btn-primary" onClick={() => setActiveTab('compare')}>
                      🔍 New Comparison
                    </button>
                    <button className="btn btn-secondary" onClick={() => setActiveTab('saved')}>
                      💾 Load Saved
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ============================================================
              VISUALS TAB
              ============================================================ */}
          {activeTab === 'visuals' && (
            <Suspense fallback={<div className="tab-loading">Loading Visuals...</div>}>
              <VisualsTab
                result={(enhancedMode ? enhancedResult : state.result) || null}
                reportState={gammaReportState}
                setReportState={setGammaReportState}
                exportFormat={gammaExportFormat}
                setExportFormat={setGammaExportFormat}
                showEmbedded={showGammaEmbedded}
                setShowEmbedded={setShowGammaEmbedded}
              />
            </Suspense>
          )}

          {/* ============================================================
              SAVED TAB
              ============================================================ */}
          {activeTab === 'saved' && (
            <Suspense fallback={<div className="tab-loading">Loading Saved...</div>}>
              <SavedComparisons
                key={savedKey}
                onLoadComparison={handleLoadSavedComparison}
                onViewJudgeReport={handleViewJudgeReport}
                currentComparisonId={state.result?.comparisonId}
              />
            </Suspense>
          )}

          {/* ============================================================
              ASK OLIVIA TAB - Gated for NAVIGATOR+ (FREE users have 0 minutes)
              ============================================================ */}
          {activeTab === 'olivia' && (
            <FeatureGate
              feature="oliviaMinutesPerMonth"
              blurContent={true}
              showUsage={true}
              lockedTitle="Upgrade to Access Olivia"
              lockedMessage="Chat with Olivia AI to get personalized insights about your city comparison. Available for Navigator and Sovereign members."
            >
              <Suspense fallback={<div className="tab-loading">Loading Olivia...</div>}>
                <AskOlivia
                  comparisonResult={enhancedMode ? enhancedResult : state.result}
                />
              </Suspense>
            </FeatureGate>
          )}

          {/* ============================================================
              JUDGES REPORT TAB - The Final Verdict
              ============================================================ */}
          {activeTab === 'judges-report' && (
            <JudgeTab
              comparisonResult={(enhancedMode ? enhancedResult : state.result) || null}
              userId={user?.id || 'guest'}
              savedJudgeReport={selectedSavedJudgeReport}
              onSavedReportLoaded={() => setSelectedSavedJudgeReport(null)}
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
                      framework developed by Clues Intelligence LTD that analyzes both <em>legal freedom</em> (written law)
                      and <em>lived freedom</em> (enforcement reality) across
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
          comparisonResult={enhancedMode ? enhancedResult : state.result}
        />
      )}

      {/* Cookie Consent Banner */}
      <CookieConsent />

      {/* Emilia Help Bubble - Shows on all pages */}
      <HelpBubble />

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

      {/* Admin Cost Dashboard */}
      <CostDashboard
        isOpen={showCostDashboard}
        onClose={() => setShowCostDashboard(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpgradeClick={() => {
          setShowSettingsModal(false);
          setShowPricingModal(true);
        }}
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
// Build trigger 1769517331
// Deployment trigger: 2026-01-29_10:12:26
