/**
 * LIFE SCORE™ Main Application
 * Legal Independence & Freedom Evaluation
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useCallback, useEffect, useReducer, Suspense } from 'react';
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
import { toastSuccess, toastError, toastInfo } from './utils/toast';

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

// ============================================================================
// PERF #1: useReducer for modal/UI state (was 8 separate useState = 8 re-renders)
// ============================================================================
interface ModalState {
  showPricingModal: boolean;
  pricingHighlight: { feature?: string; tier?: 'free' | 'pro' | 'enterprise' };
  showCostDashboard: boolean;
  showSettingsModal: boolean;
  activeLegalPage: LegalPage;
  showAboutSection: boolean;
}

type ModalAction =
  | { type: 'OPEN_PRICING'; highlight?: { feature?: string; tier?: 'free' | 'pro' | 'enterprise' } }
  | { type: 'CLOSE_PRICING' }
  | { type: 'OPEN_COST_DASHBOARD' }
  | { type: 'CLOSE_COST_DASHBOARD' }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'CLOSE_SETTINGS' }
  | { type: 'OPEN_SETTINGS_THEN_PRICING' }
  | { type: 'SET_LEGAL_PAGE'; page: LegalPage }
  | { type: 'TOGGLE_ABOUT' };

const modalInitialState: ModalState = {
  showPricingModal: false,
  pricingHighlight: {},
  showCostDashboard: false,
  showSettingsModal: false,
  activeLegalPage: null,
  showAboutSection: true,
};

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'OPEN_PRICING':
      return { ...state, showPricingModal: true, pricingHighlight: action.highlight || {} };
    case 'CLOSE_PRICING':
      return { ...state, showPricingModal: false, pricingHighlight: {} };
    case 'OPEN_COST_DASHBOARD':
      return { ...state, showCostDashboard: true };
    case 'CLOSE_COST_DASHBOARD':
      return { ...state, showCostDashboard: false };
    case 'OPEN_SETTINGS':
      return { ...state, showSettingsModal: true };
    case 'CLOSE_SETTINGS':
      return { ...state, showSettingsModal: false };
    case 'OPEN_SETTINGS_THEN_PRICING':
      return { ...state, showSettingsModal: false, showPricingModal: true };
    case 'SET_LEGAL_PAGE':
      return { ...state, activeLegalPage: action.page };
    case 'TOGGLE_ABOUT':
      return { ...state, showAboutSection: !state.showAboutSection };
    default:
      return state;
  }
}

// ============================================================================
// PERF #1: useReducer for enhanced comparison state (was 11 useState = 11 re-renders on reset)
// ============================================================================
interface EnhancedState {
  enhancedMode: boolean;
  enhancedStatus: 'idle' | 'running' | 'complete';
  enhancedResult: EnhancedComparisonResult | null;
  pendingCities: { city1: string; city2: string } | null;
  judgeResult: JudgeOutput | null;
  lastJudgedCount: number;
  selectedSavedJudgeReport: SavedJudgeReport | null;
  pendingLLMToRun: LLMProvider | null;
  failuresAcknowledged: boolean;
}

type EnhancedAction =
  | { type: 'SET_MODE'; enabled: boolean }
  | { type: 'START_COMPARISON'; cities: { city1: string; city2: string } }
  | { type: 'SET_RESULT'; result: EnhancedComparisonResult }
  | { type: 'SET_STATUS'; status: 'idle' | 'running' | 'complete' }
  | { type: 'CLEAR_RESULT' }
  | { type: 'SET_JUDGE_RESULT'; result: JudgeOutput | null }
  | { type: 'SET_LAST_JUDGED_COUNT'; count: number }
  | { type: 'SET_SAVED_JUDGE_REPORT'; report: SavedJudgeReport | null }
  | { type: 'SET_PENDING_LLM'; llm: LLMProvider | null }
  | { type: 'SET_PENDING_CITIES'; cities: { city1: string; city2: string } }
  | { type: 'ACKNOWLEDGE_FAILURES' }
  | { type: 'RESET_FAILURES_ACK' }
  | { type: 'LOAD_ENHANCED_SAVED'; result: EnhancedComparisonResult }
  | { type: 'LOAD_STANDARD_SAVED' }
  | { type: 'VIEW_JUDGE_REPORT'; report: SavedJudgeReport }
  | { type: 'CLEAR_STALE_STATE' }
  | { type: 'FULL_RESET' };

const enhancedInitialState: EnhancedState = {
  enhancedMode: false,
  enhancedStatus: 'idle',
  enhancedResult: null,
  pendingCities: null,
  judgeResult: null,
  lastJudgedCount: 0,
  selectedSavedJudgeReport: null,
  pendingLLMToRun: null,
  failuresAcknowledged: false,
};

function enhancedReducer(state: EnhancedState, action: EnhancedAction): EnhancedState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, enhancedMode: action.enabled };
    case 'START_COMPARISON':
      return {
        ...state,
        enhancedStatus: 'running',
        enhancedResult: null,
        pendingCities: action.cities,
        failuresAcknowledged: false,
      };
    case 'SET_RESULT':
      return { ...state, enhancedResult: action.result, enhancedStatus: 'complete' };
    case 'SET_STATUS':
      return { ...state, enhancedStatus: action.status };
    case 'CLEAR_RESULT':
      return { ...state, enhancedResult: null };
    case 'SET_JUDGE_RESULT':
      return { ...state, judgeResult: action.result };
    case 'SET_LAST_JUDGED_COUNT':
      return { ...state, lastJudgedCount: action.count };
    case 'SET_SAVED_JUDGE_REPORT':
      return { ...state, selectedSavedJudgeReport: action.report };
    case 'SET_PENDING_LLM':
      return { ...state, pendingLLMToRun: action.llm };
    case 'SET_PENDING_CITIES':
      return { ...state, pendingCities: action.cities };
    case 'ACKNOWLEDGE_FAILURES':
      return { ...state, failuresAcknowledged: true };
    case 'RESET_FAILURES_ACK':
      return { ...state, failuresAcknowledged: false };
    case 'LOAD_ENHANCED_SAVED':
      return {
        ...state,
        enhancedMode: true,
        enhancedResult: action.result,
        enhancedStatus: 'complete',
        judgeResult: null,
        selectedSavedJudgeReport: null,
      };
    case 'LOAD_STANDARD_SAVED':
      return {
        ...state,
        enhancedMode: false,
        enhancedStatus: 'idle',
        enhancedResult: null,
        judgeResult: null,
        selectedSavedJudgeReport: null,
      };
    case 'VIEW_JUDGE_REPORT':
      return {
        ...state,
        enhancedResult: null,
        selectedSavedJudgeReport: action.report,
      };
    case 'CLEAR_STALE_STATE':
      return {
        ...state,
        judgeResult: null,
        selectedSavedJudgeReport: null,
        enhancedResult: null,
      };
    case 'FULL_RESET':
      return {
        ...enhancedInitialState,
        enhancedMode: state.enhancedMode, // Preserve mode toggle
      };
    default:
      return state;
  }
}

// Main app content (requires auth)
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, session } = useAuth();
  const { state, compare, reset, loadResult } = useComparison();
  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
  const [savedKey, setSavedKey] = useState(0);

  // PERF #1: Modal/UI state — single reducer instead of 8 useState
  const [modals, dispatchModal] = useReducer(modalReducer, modalInitialState);

  // PERF #1: Enhanced comparison state — single reducer instead of 11 useState
  const [enhanced, dispatchEnhanced] = useReducer(enhancedReducer, enhancedInitialState);

  // API keys (read once from localStorage — keys now managed via Vercel env vars)
  const [apiKeys] = useState<LLMAPIKeys>(getStoredAPIKeys);

  // LIFTED STATE from LLMSelector (Map type doesn't work well in reducers)
  const [llmStates, setLLMStates] = useState<Map<LLMProvider, LLMButtonState>>(
    new Map(EVALUATOR_LLMS.map(llm => [llm, { status: 'idle' }]))
  );

  // Scoring preferences (kept as useState — set independently by CitySelector)
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);
  const [customWeights, setCustomWeights] = useState<Record<string, number> | null>(null);
  const [lawLivedRatio, setLawLivedRatio] = useState<LawLivedRatio>({ law: 50, lived: 50 });
  const [conservativeMode, setConservativeMode] = useState(false);

  // Gamma visual report state (kept separate — set by VisualsTab child)
  const [gammaReportState, setGammaReportState] = useState<VisualReportState>({ status: 'idle' });
  const [gammaExportFormat, setGammaExportFormat] = useState<'pdf' | 'pptx'>('pdf');
  const [showGammaEmbedded, setShowGammaEmbedded] = useState(false);

  // Tab navigation and saved count
  const [activeTab, setActiveTab] = useState<TabId>('compare');
  const [savedCount, setSavedCount] = useState(0);

  // Destructure for convenience (preserves original variable names across JSX)
  const {
    enhancedMode, enhancedStatus, enhancedResult, pendingCities,
    judgeResult: judgeResultLifted, lastJudgedCount,
    selectedSavedJudgeReport, pendingLLMToRun, failuresAcknowledged,
  } = enhanced;

  const {
    showPricingModal, pricingHighlight,
    showCostDashboard, showSettingsModal, activeLegalPage,
    showAboutSection,
  } = modals;

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
  // FIX: Read from correct localStorage keys (was 'lifescore_comparisons' which doesn't exist)
  useEffect(() => {
    let count = 0;
    try {
      const standard = localStorage.getItem('lifescore_saved_comparisons');
      if (standard) {
        const parsed = JSON.parse(standard);
        if (Array.isArray(parsed)) count += parsed.length;
      }
      const enhanced = localStorage.getItem('lifescore_saved_enhanced');
      if (enhanced) {
        const parsed = JSON.parse(enhanced);
        if (Array.isArray(parsed)) count += parsed.length;
      }
    } catch {
      // Ignore parse errors
    }
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
      dispatchEnhanced({ type: 'RESET_FAILURES_ACK' });
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
          dispatchEnhanced({ type: 'SET_PENDING_CITIES', cities: {
            city1: `${state.result.city1.city}, ${state.result.city1.region || ''} ${state.result.city1.country}`.replace(/\s+/g, ' ').trim(),
            city2: `${state.result.city2.city}, ${state.result.city2.region || ''} ${state.result.city2.country}`.replace(/\s+/g, ' ').trim()
          } });
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
      dispatchModal({ type: 'OPEN_PRICING', highlight: {
        feature: e.detail?.feature,
        tier: e.detail?.requiredTier,
      }});
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
      toastError('Failed to load comparison — data is missing');
      return;
    }

    if (!result.city1 || !result.city2) {
      console.error('[App] handleLoadSavedComparison: result missing city data', result);
      toastError('Failed to load comparison — city data is incomplete');
      return;
    }

    console.log('[App] Loading saved comparison:', result.comparisonId, result.city1.city, 'vs', result.city2.city);

    // FIX 2026-02-08: Clear stale judge state to prevent data contamination
    // FIX 7.4: Use type guard instead of unsafe casts for detecting enhanced comparisons
    // FIX 2026-02-08: Set enhancedMode to match loaded report type - user clicks, report loads, no hoops
    if (isEnhancedComparisonResult(result)) {
      console.log('[App] Loading as ENHANCED comparison');
      dispatchEnhanced({ type: 'LOAD_ENHANCED_SAVED', result: result as unknown as EnhancedComparisonResult });
      // Also set base result for components that need it
      loadResult(result);
    } else {
      console.log('[App] Loading as standard comparison');
      dispatchEnhanced({ type: 'LOAD_STANDARD_SAVED' });
      loadResult(result);
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
    dispatchEnhanced({ type: 'VIEW_JUDGE_REPORT', report });
    // Switch to the judges-report tab
    setActiveTab('judges-report');
  }, []);

  const handleCompare = useCallback(async (city1: string, city2: string) => {
    // FIX 2026-02-08: Clear ALL stale state on new compare to prevent data contamination
    // CRITICAL: enhancedResult must be cleared for BOTH modes to prevent Bern/Mesa showing for Baltimore/Bratislava
    dispatchEnhanced({ type: 'CLEAR_STALE_STATE' });

    if (enhancedMode) {
      // ADMIN BYPASS: Skip usage checks for admin users
      if (!isAdmin) {
        // Enhanced mode: Check usage limit before running
        const usageResult = await checkUsage('enhancedComparisons');

        if (!usageResult.allowed) {
          // User has hit their limit - show pricing modal
          toastInfo('Enhanced comparison limit reached — upgrade for more');
          dispatchModal({ type: 'OPEN_PRICING', highlight: {
            feature: 'enhancedComparisons',
            tier: usageResult.requiredTier,
          }});
          return;
        }

        // Increment usage counter before running enhanced comparison
        await incrementUsage('enhancedComparisons');
      }

      // Run enhanced comparison
      toastInfo(`Starting enhanced comparison: ${city1.split(',')[0]} vs ${city2.split(',')[0]}`);
      dispatchEnhanced({ type: 'START_COMPARISON', cities: { city1, city2 } });
    } else {
      // ADMIN BYPASS: Skip usage checks for admin users
      if (!isAdmin) {
        // Standard mode: Check usage limit before running
        const usageResult = await checkUsage('standardComparisons');

        if (!usageResult.allowed) {
          // User has hit their limit - show pricing modal
          toastInfo('Comparison limit reached — upgrade for more');
          dispatchModal({ type: 'OPEN_PRICING', highlight: {
            feature: 'standardComparisons',
            tier: usageResult.requiredTier,
          }});
          return;
        }

        // Increment usage counter before running comparison
        await incrementUsage('standardComparisons');
      }

      // Run the comparison with user's scoring preferences
      try {
        await compare(city1, city2, { lawLivedRatio, conservativeMode, customWeights });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Comparison failed';
        toastError(msg);
      }
    }
  }, [enhancedMode, isAdmin, checkUsage, incrementUsage, compare, lawLivedRatio, conservativeMode, customWeights]);

  // PERF #1: handleReset was 10 separate setState calls → now 1 dispatch + 1 setState + 1 reset
  const handleReset = useCallback(() => {
    reset();
    dispatchEnhanced({ type: 'FULL_RESET' });
    // Reset lifted LLM state (Map — kept as useState)
    setLLMStates(new Map(EVALUATOR_LLMS.map(llm => [llm, { status: 'idle' }])));
    resetOGMetaTags();
  }, [reset]);

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
      {/* A17: Skip-to-content link for keyboard users */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      <Header
        onUpgradeClick={() => dispatchModal({ type: 'OPEN_PRICING' })}
        onCostDashboardClick={() => dispatchModal({ type: 'OPEN_COST_DASHBOARD' })}
        onSettingsClick={() => dispatchModal({ type: 'OPEN_SETTINGS' })}
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasResults={hasResults}
        savedCount={savedCount}
      />

      <main className="main-content" id="main-content">
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
                  onToggle={(enabled: boolean) => dispatchEnhanced({ type: 'SET_MODE', enabled })}
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
                    setJudgeResult={((result: JudgeOutput | null) => dispatchEnhanced({ type: 'SET_JUDGE_RESULT', result })) as React.Dispatch<React.SetStateAction<JudgeOutput | null>>}
                    lastJudgedCount={lastJudgedCount}
                    setLastJudgedCount={((count: number) => dispatchEnhanced({ type: 'SET_LAST_JUDGED_COUNT', count })) as React.Dispatch<React.SetStateAction<number>>}
                    pendingLLMToRun={pendingLLMToRun}
                    clearPendingLLM={() => dispatchEnhanced({ type: 'SET_PENDING_LLM', llm: null })}
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
                                    enforcementScore: score.normalizedScore,
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

                            dispatchEnhanced({ type: 'SET_RESULT', result });
                            console.log('[App] State updated - tab should switch now');
                            toastSuccess(`Comparison complete: ${result.city1?.city} vs ${result.city2?.city}`);

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
                            toastError('Error building results — showing partial data');
                            // FIX: Still set a minimal result so results page shows
                            dispatchEnhanced({ type: 'SET_RESULT', result: {
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
                            } as any });
                          }
                        }).catch(importError => {
                          console.error('Error importing opusJudge module:', importError);
                          toastError('Error loading result module — showing partial data');
                          // FIX: Set minimal result so results page shows
                          dispatchEnhanced({ type: 'SET_RESULT', result: {
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
                          } as any });
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
                        toastInfo('Judge unavailable — showing results from ' + llmResults.size + ' LLMs');
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
                    onClick={() => dispatchEnhanced({ type: 'ACKNOWLEDGE_FAILURES' })}
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
                                dispatchEnhanced({ type: 'SET_PENDING_LLM', llm });
                                dispatchEnhanced({ type: 'SET_STATUS', status: 'running' });
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
              onSavedReportLoaded={() => dispatchEnhanced({ type: 'SET_SAVED_JUDGE_REPORT', report: null })}
            />
          )}

          {/* ============================================================
              ABOUT TAB
              ============================================================ */}
          {activeTab === 'about' && (
            <div className="about-section card">
              <button
                className="section-toggle"
                onClick={() => dispatchModal({ type: 'TOGGLE_ABOUT' })}
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

      <Footer onOpenLegal={(page: LegalPage) => dispatchModal({ type: 'SET_LEGAL_PAGE', page })} />

      {/* Legal Modal */}
      <LegalModal page={activeLegalPage} onClose={() => dispatchModal({ type: 'SET_LEGAL_PAGE', page: null })} />

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
          dispatchModal({ type: 'CLOSE_PRICING' });
        }}
        highlightFeature={pricingHighlight.feature}
        highlightTier={pricingHighlight.tier}
      />

      {/* Admin Cost Dashboard */}
      <CostDashboard
        isOpen={showCostDashboard}
        onClose={() => dispatchModal({ type: 'CLOSE_COST_DASHBOARD' })}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => dispatchModal({ type: 'CLOSE_SETTINGS' })}
        onUpgradeClick={() => {
          dispatchModal({ type: 'OPEN_SETTINGS_THEN_PRICING' });
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
