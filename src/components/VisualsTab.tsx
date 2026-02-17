/**
 * LIFE SCORE™ Visuals Tab
 * Combined view of in-app charts and Gamma visual report generation
 * Supports both Simple (ComparisonResult) and Enhanced (EnhancedComparisonResult) modes
 *
 * Fixes applied (2026-02-17):
 *  #1  Merged two confusing dropdowns into one unified selector
 *  #2  Mutual exclusivity — viewingReport and generation embed can't coexist
 *  #3  Presenter warns when saved report cities don't match active comparison
 *  #4  Mode selector always visible when a Gamma URL exists
 *  #5  Embed URL via shared GammaIframe (was duplicated 3×)
 *  #6  Iframe error handler via shared GammaIframe (was copy-pasted 3×)
 *  #7  Sandbox attribute on third-party iframes
 *  #8  getActiveComparison memoized
 *  #9  Save button disabled when URL missing
 *  #10 Removed duplicate saved reports list (unified dropdown covers it)
 *  #11 Surfaced Read / Live Presenter / Generate Video as top-level modes
 */

import React, { useState, useCallback, useMemo, useEffect, useTransition, useRef } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import type { VisualReportState } from '../types/gamma';
import {
  generateAndWaitForReport,
  generateEnhancedAndWaitForReport,
  getStatusMessage,
  type AnyComparisonResult
} from '../services/gammaService';
import { useGunComparison, type GunComparisonData } from '../hooks/useGunComparison';
import {
  saveGammaReport,
  hasGammaReportForComparison,
  getLocalComparisons,
  getLocalEnhancedComparisons,
  getSavedGammaReports,
  syncGammaReportsFromSupabase,
  deleteGammaReport,
  type SavedGammaReport,
} from '../services/savedComparisons';
import NewLifeVideos from './NewLifeVideos';
import ReportPresenter from './ReportPresenter';
import GammaIframe from './GammaIframe';
import FeatureGate from './FeatureGate';
import { NotifyMeModal } from './NotifyMeModal';
import { useJobTracker } from '../hooks/useJobTracker';
import { useTierAccess } from '../hooks/useTierAccess';
import { toastInfo } from '../utils/toast';
import type { NotifyChannel } from '../types/database';
import type { ReportViewMode } from '../types/presenter';
import './VisualsTab.css';

// Type for judge report data (matches gammaService)
interface JudgeReportData {
  executiveSummary?: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
  categoryAnalysis?: Array<{
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }>;
  freedomEducation?: {
    categories: Array<{
      categoryId: string;
      categoryName: string;
      categoryIcon: string;
      winningMetrics: Array<{
        metricId: string;
        metricName: string;
        winnerScore: number;
        loserScore: number;
        realWorldExample: string;
      }>;
      heroStatement: string;
    }>;
    winnerCity: string;
    loserCity: string;
  };
  summaryOfFindings?: {
    city1Score: number;
    city1Trend: 'improving' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'improving' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };
}

interface VisualsTabProps {
  result: AnyComparisonResult | null;
  // Optional: for backward compatibility, accept enhanced result separately
  enhancedResult?: EnhancedComparisonResult | null;
  simpleResult?: ComparisonResult | null;
  // Optional: Judge report data for enhanced reports
  judgeReport?: JudgeReportData | null;
  // LIFTED STATE: Gamma report state (persists across tab switches)
  reportState?: VisualReportState;
  setReportState?: React.Dispatch<React.SetStateAction<VisualReportState>>;
  exportFormat?: 'pdf' | 'pptx';
  setExportFormat?: React.Dispatch<React.SetStateAction<'pdf' | 'pptx'>>;
  showEmbedded?: boolean;
  setShowEmbedded?: React.Dispatch<React.SetStateAction<boolean>>;
}

// Type guard to check if result is EnhancedComparisonResult
function isEnhancedResult(result: AnyComparisonResult | null): result is EnhancedComparisonResult {
  if (!result) return false;
  return 'llmsUsed' in result;
}

const VisualsTab: React.FC<VisualsTabProps> = ({
  result: propResult,
  judgeReport: propsJudgeReport,
  reportState: propsReportState,
  setReportState: propsSetReportState,
  exportFormat: propsExportFormat,
  setExportFormat: propsSetExportFormat,
  showEmbedded: propsShowEmbedded,
  setShowEmbedded: propsSetShowEmbedded,
}) => {
  const { checkUsage, incrementUsage, isAdmin } = useTierAccess();
  const { createJob, completeJobAndNotify } = useJobTracker();
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const pendingJobRef = useRef<string | null>(null);

  // Enhanced report options
  const [reportType, setReportType] = useState<'standard' | 'enhanced'>('standard');
  const [includeGunRights, setIncludeGunRights] = useState(false);

  // Gun comparison hook for enhanced reports
  const { data: gunData, fetchComparison: fetchGunComparison, status: gunStatus } = useGunComparison();

  // Selected comparison from dropdown (null = use prop)
  const [selectedComparisonId, setSelectedComparisonId] = useState<string | null>(null);

  // Load saved comparisons with refresh mechanism
  const [comparisonsRefreshKey, setComparisonsRefreshKey] = useState(0);
  const refreshComparisons = useCallback(() => setComparisonsRefreshKey(k => k + 1), []);

  const savedComparisons = useMemo(() => getLocalComparisons(), [comparisonsRefreshKey]);
  const savedEnhanced = useMemo(() => getLocalEnhancedComparisons(), [comparisonsRefreshKey]);

  // Listen for storage events to refresh when data changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lifescore_saved_comparisons' || e.key === 'lifescore_saved_enhanced') {
        refreshComparisons();
      }
      if (e.key === 'lifescore_saved_gamma_reports') {
        setReportsRefreshKey(k => k + 1);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshComparisons]);

  // FIX #8: Memoize comparison lookup instead of running on every render
  const result = useMemo((): AnyComparisonResult | null => {
    if (selectedComparisonId) {
      const savedStd = savedComparisons.find(c => c.result.comparisonId === selectedComparisonId);
      if (savedStd) return savedStd.result;
      const savedEnh = savedEnhanced.find(c => c.result.comparisonId === selectedComparisonId);
      if (savedEnh) return savedEnh.result;
    }
    return propResult;
  }, [selectedComparisonId, savedComparisons, savedEnhanced, propResult]);

  // Local state fallback for backward compatibility
  const [localReportState, setLocalReportState] = useState<VisualReportState>({
    status: 'idle',
  });
  const [localExportFormat, setLocalExportFormat] = useState<'pdf' | 'pptx'>('pdf');
  const [localShowEmbedded, setLocalShowEmbedded] = useState(false);

  // Use props if provided, otherwise use local state
  const reportState = propsReportState ?? localReportState;
  const setReportState = propsSetReportState ?? setLocalReportState;
  const exportFormat = propsExportFormat ?? localExportFormat;
  const setExportFormat = propsSetExportFormat ?? setLocalExportFormat;
  const showEmbedded = propsShowEmbedded ?? localShowEmbedded;
  const setShowEmbedded = propsSetShowEmbedded ?? setLocalShowEmbedded;

  // Save report state
  const [isReportSaved, setIsReportSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Saved reports library state
  const [savedReports, setSavedReports] = useState<SavedGammaReport[]>([]);
  const [viewingReport, setViewingReport] = useState<SavedGammaReport | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);

  // FIX #11: Report view mode now has 3 options: read | live | video
  const [reportViewMode, setReportViewMode] = useState<ReportViewMode>('read');
  // INP fix: mark presenter mount/unmount as a non-urgent transition
  const [isPending, startTransition] = useTransition();

  // Load saved reports from localStorage, then always sync from Supabase
  useEffect(() => {
    const localReports = getSavedGammaReports();
    setSavedReports(localReports);

    // Always sync from Supabase — merges any reports saved on other devices
    // or reports that were lost from localStorage (browser cleanup, etc.)
    syncGammaReportsFromSupabase().then((synced) => {
      if (synced.length > 0) {
        console.log('[VisualsTab] Synced', synced.length, 'Gamma reports (local + Supabase merged)');
        setSavedReports(synced);
      }
    }).catch(err => {
      console.error('[VisualsTab] Supabase sync failed:', err);
    });
  }, [reportsRefreshKey, isReportSaved]);

  // Auto-save Gamma reports when generation completes
  useEffect(() => {
    // Log conditions for debugging persistence issues
    if (reportState.status === 'completed') {
      console.log('[VisualsTab] Auto-save check:', {
        status: reportState.status,
        hasGammaUrl: !!reportState.gammaUrl,
        hasGenerationId: !!reportState.generationId,
        hasResult: !!result,
        isReportSaved,
      });
    }

    if (
      reportState.status === 'completed' &&
      reportState.gammaUrl &&
      reportState.generationId &&
      result &&
      !isReportSaved
    ) {
      const effectiveComparisonId = result.comparisonId || crypto.randomUUID();
      const alreadyExists = hasGammaReportForComparison(effectiveComparisonId);

      console.log('[VisualsTab] Auto-save:', { effectiveComparisonId, alreadyExists });

      if (!alreadyExists) {
        console.log('[VisualsTab] Auto-saving Gamma report for:', effectiveComparisonId);
        saveGammaReport({
          comparisonId: effectiveComparisonId,
          city1: result.city1.city,
          city2: result.city2.city,
          gammaUrl: reportState.gammaUrl,
          pdfUrl: reportState.pdfUrl,
          pptxUrl: reportState.pptxUrl,
          pdfStoragePath: reportState.pdfStoragePath,
          pptxStoragePath: reportState.pptxStoragePath,
          generationId: reportState.generationId,
        });
        setIsReportSaved(true);
        setReportsRefreshKey(k => k + 1);
        console.log('[VisualsTab] Auto-save complete. Verifying localStorage:', getSavedGammaReports().length, 'reports');
      } else {
        // Report already exists — mark as saved so we don't keep checking
        setIsReportSaved(true);
      }
    }
  }, [reportState.status, reportState.gammaUrl, reportState.generationId, result, isReportSaved]);

  // Check if report is already saved when component mounts or report changes
  const comparisonId = result?.comparisonId || '';
  const isAlreadySaved = comparisonId ? hasGammaReportForComparison(comparisonId) : false;

  // Find the matching saved report for current comparison (for "View Existing Report")
  const existingReport = isAlreadySaved
    ? savedReports.find(r => r.comparisonId === comparisonId) || null
    : null;

  // FIX #3: Check if current result matches the viewing report's cities
  const resultMatchesViewingReport = useMemo(() => {
    if (!result || !viewingReport) return false;
    return (
      result.city1.city === viewingReport.city1 &&
      result.city2.city === viewingReport.city2
    );
  }, [result, viewingReport]);

  const handleSaveReport = useCallback(() => {
    if (!result) {
      setSaveMessage('Error: No comparison data available');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    if (!reportState.gammaUrl) {
      setSaveMessage('Error: Report URL not available. Please regenerate the report.');
      setTimeout(() => setSaveMessage(null), 5000);
      console.error('[VisualsTab] Save failed: gammaUrl is undefined. Report state:', reportState);
      return;
    }

    if (!reportState.generationId) {
      setSaveMessage('Error: Generation ID missing. Please regenerate the report.');
      setTimeout(() => setSaveMessage(null), 5000);
      console.error('[VisualsTab] Save failed: generationId is undefined. Report state:', reportState);
      return;
    }

    // FIX: Generate fallback comparisonId if missing (must be UUID for Supabase FK)
    const effectiveComparisonId = result.comparisonId || crypto.randomUUID();

    console.log('[VisualsTab] Saving report:', {
      comparisonId: effectiveComparisonId,
      city1: result.city1.city,
      city2: result.city2.city,
      gammaUrl: reportState.gammaUrl,
      generationId: reportState.generationId,
    });

    const savedReport = saveGammaReport({
      comparisonId: effectiveComparisonId,
      city1: result.city1.city,
      city2: result.city2.city,
      gammaUrl: reportState.gammaUrl,
      pdfUrl: reportState.pdfUrl,
      pptxUrl: reportState.pptxUrl,
      pdfStoragePath: reportState.pdfStoragePath,
      pptxStoragePath: reportState.pptxStoragePath,
      generationId: reportState.generationId,
    });

    console.log('[VisualsTab] Report saved successfully:', savedReport);

    setIsReportSaved(true);
    setSaveMessage('Report saved to your library!');
    setTimeout(() => setSaveMessage(null), 3000);
  }, [result, reportState]);

  const handleGenerateReport = useCallback(async () => {
    if (!result) return;

    // FIX #2: Clear any saved report being viewed when generating
    setViewingReport(null);

    // ADMIN BYPASS: Skip usage checks for admin users
    if (!isAdmin) {
      // Check usage limits before generating Gamma report
      const usageResult = await checkUsage('gammaReports');
      if (!usageResult.allowed) {
        console.log('[VisualsTab] Gamma report limit reached:', usageResult);
        setReportState({ status: 'error', error: 'Monthly Gamma report limit reached. Please upgrade to continue.' });
        return;
      }

      // Increment usage counter before starting generation
      await incrementUsage('gammaReports');
      console.log('[VisualsTab] Incremented gammaReports usage');
    }

    try {
      setReportState({ status: 'generating', progress: 0 });

      // Determine which generation function to use
      const isEnhanced = reportType === 'enhanced' && isEnhancedResult(result);

      if (isEnhanced) {
        // Enhanced 82-page report
        console.log('[VisualsTab] Generating enhanced 82-page report');

        // Fetch gun data if requested and not already cached
        let gunDataToUse: GunComparisonData | undefined = undefined;
        if (includeGunRights) {
          if (gunData) {
            gunDataToUse = gunData;
          } else if (gunStatus !== 'loading') {
            // Fetch gun comparison data
            await fetchGunComparison(result.city1.city, result.city2.city);
            gunDataToUse = gunData || undefined;
          }
        }

        const finalState = await generateEnhancedAndWaitForReport(
          result as EnhancedComparisonResult,
          exportFormat,
          propsJudgeReport || undefined,
          gunDataToUse,
          (state) => setReportState(state)
        );

        setReportState({
          status: 'completed',
          generationId: finalState.generationId,
          gammaUrl: finalState.url,
          pdfUrl: finalState.pdfUrl,
          pptxUrl: finalState.pptxUrl,
          pdfStoragePath: finalState.pdfStoragePath,
          pptxStoragePath: finalState.pptxStoragePath,
          progress: 100,
        });
      } else {
        // Standard 35-page report (existing behavior)
        console.log('[VisualsTab] Generating standard report');

        const finalState = await generateAndWaitForReport(
          result,
          exportFormat,
          (state) => setReportState(state)
        );

        setReportState({
          status: 'completed',
          generationId: finalState.generationId,
          gammaUrl: finalState.url,
          pdfUrl: finalState.pdfUrl,
          pptxUrl: finalState.pptxUrl,
          pdfStoragePath: finalState.pdfStoragePath,
          pptxStoragePath: finalState.pptxStoragePath,
          progress: 100,
        });
      }
    } catch (error) {
      setReportState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }, [result, exportFormat, reportType, includeGunRights, gunData, gunStatus, fetchGunComparison, propsJudgeReport, checkUsage, incrementUsage, isAdmin, setReportState]);

  const handleReset = useCallback(() => {
    setReportState({ status: 'idle' });
    setIsReportSaved(false);
    setShowEmbedded(false);
    startTransition(() => setReportViewMode('read'));
  }, [setReportState, setShowEmbedded]);

  // FIX #11: Enter a specific view mode
  const enterMode = useCallback((mode: ReportViewMode) => {
    setShowEmbedded(true);
    startTransition(() => setReportViewMode(mode));
  }, [setShowEmbedded]);

  const handleGammaWaitHere = () => {
    handleGenerateReport();
  };

  const handleGammaNotifyMe = async (channels: NotifyChannel[]) => {
    const city1 = result?.city1?.city || '';
    const city2 = result?.city2?.city || '';
    const jobId = await createJob({
      type: 'gamma_report',
      payload: { city1, city2 },
      notifyVia: channels,
    });
    if (jobId) {
      pendingJobRef.current = jobId;
      toastInfo(`We'll notify you when your Gamma report is ready.`);
    }
    handleGenerateReport();
  };

  // Fire pending notification when Gamma report generation completes
  useEffect(() => {
    if (reportState.status === 'completed' && pendingJobRef.current) {
      const jobId = pendingJobRef.current;
      pendingJobRef.current = null;
      const city1 = result?.city1?.city || '';
      const city2 = result?.city2?.city || '';
      completeJobAndNotify(
        jobId,
        { city1, city2, gammaUrl: reportState.gammaUrl },
        `Gamma Report Ready: ${city1} vs ${city2}`,
        `Your visual report for ${city1} vs ${city2} is ready to view.`,
        '/?tab=visuals'
      );
    }
  }, [reportState.status, reportState.gammaUrl, result, completeJobAndNotify]);

  const hasSavedComparisons = savedComparisons.length > 0 || savedEnhanced.length > 0;
  const hasAnything = !!result || hasSavedComparisons || savedReports.length > 0;

  if (!hasAnything) {
    return (
      <div className="visuals-tab">
        <div className="no-results-message card">
          <h3>No Comparison Data</h3>
          <p>Run a city comparison first to see visualizations and generate reports.</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SHARED: Mode selector buttons used in both completed state & saved viewer
  // FIX #4, #11: Always visible when a Gamma URL exists
  // ============================================================================
  const renderModeSelector = (
    gammaUrl: string,
    presenterAvailable: boolean,
    onClose: () => void,
  ) => (
    <div className="embedded-header">
      <div className="embedded-actions">
        <div className="report-view-toggle">
          <button
            className={`view-toggle-btn ${reportViewMode === 'read' ? 'active' : ''}`}
            onClick={() => enterMode('read')}
          >
            📖 Read
          </button>
          <button
            className={`view-toggle-btn ${reportViewMode === 'live' ? 'active' : ''} ${isPending ? 'loading' : ''}`}
            onClick={() => enterMode('live')}
            disabled={!presenterAvailable}
            title={!presenterAvailable ? 'Load a matching comparison to enable presenter' : 'Olivia presents the report live'}
          >
            {isPending && reportViewMode === 'live' ? '...' : '🎙️ Live Presenter'}
          </button>
          <button
            className={`view-toggle-btn ${reportViewMode === 'video' ? 'active' : ''} ${isPending ? 'loading' : ''}`}
            onClick={() => enterMode('video')}
            disabled={!presenterAvailable}
            title={!presenterAvailable ? 'Load a matching comparison to enable video' : 'Generate a polished video with Olivia'}
          >
            {isPending && reportViewMode === 'video' ? '...' : '🎬 Watch Video'}
          </button>
        </div>
        <a
          href={gammaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="external-link-btn"
        >
          Open External ↗
        </a>
        <button
          className="close-embed-btn"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // SHARED: Render content area based on current mode
  // ============================================================================
  const renderModeContent = (
    gammaUrl: string,
    comparisonResult: AnyComparisonResult | null,
    onPresenterClose: () => void,
  ) => {
    if (reportViewMode === 'live' && comparisonResult && gammaUrl) {
      return (
        <ReportPresenter
          result={comparisonResult}
          gammaUrl={gammaUrl}
          onClose={onPresenterClose}
          initialSubMode="live"
        />
      );
    }
    if (reportViewMode === 'video' && comparisonResult && gammaUrl) {
      return (
        <ReportPresenter
          result={comparisonResult}
          gammaUrl={gammaUrl}
          onClose={onPresenterClose}
          initialSubMode="video"
        />
      );
    }
    // Default: read mode — GammaIframe (FIX #5, #6, #7)
    return (
      <GammaIframe
        gammaUrl={gammaUrl}
        onLoadError={onPresenterClose}
      />
    );
  };

  return (
    <div className="visuals-tab">
      {/* ================================================================
          FIX #1 & #10: UNIFIED SELECTOR — single dropdown for comparisons + saved reports
          ================================================================ */}
      {(hasSavedComparisons || savedReports.length > 0) && (
        <div className="report-selector-section">
          <label className="report-selector-label">📊 Select Report:</label>
          <select
            className="report-selector-dropdown"
            value={viewingReport ? `gamma:${viewingReport.id}` : selectedComparisonId ?? ''}
            onChange={(e) => {
              const value = e.target.value;

              if (value.startsWith('gamma:')) {
                // Selected a saved Gamma report
                const reportId = value.replace('gamma:', '');
                const report = savedReports.find(r => r.id === reportId);
                if (report) {
                  setViewingReport(report);
                  setSelectedComparisonId(null);
                  startTransition(() => setReportViewMode('read'));
                }
              } else {
                // Selected a comparison (or cleared)
                setViewingReport(null);
                setSelectedComparisonId(value === '' ? null : value);
                if (value !== selectedComparisonId) {
                  setReportState({ status: 'idle' });
                  setIsReportSaved(false);
                  setShowEmbedded(false);
                }
              }
            }}
          >
            <option value="">
              {propResult
                ? `Current: ${propResult.city1.city} vs ${propResult.city2.city}`
                : 'Select a comparison or report'}
            </option>
            {savedEnhanced.length > 0 && (
              <optgroup label="Enhanced Comparisons">
                {savedEnhanced.map((saved) => (
                  <option key={saved.id} value={saved.result.comparisonId}>
                    {saved.result.city1.city} vs {saved.result.city2.city}
                    {saved.nickname ? ` (${saved.nickname})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {savedComparisons.length > 0 && (
              <optgroup label="Standard Comparisons">
                {savedComparisons.map((saved) => (
                  <option key={saved.id} value={saved.result.comparisonId}>
                    {saved.result.city1.city} vs {saved.result.city2.city}
                    {saved.nickname ? ` (${saved.nickname})` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            {savedReports.length > 0 && (
              <optgroup label="Saved Gamma Reports">
                {savedReports.map((report) => (
                  <option key={report.id} value={`gamma:${report.id}`}>
                    {report.city1} vs {report.city2} — {new Date(report.savedAt).toLocaleDateString()}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {/* No result selected message */}
      {!result && !viewingReport && (
        <div className="no-results-message card">
          <h3>Select a Report</h3>
          <p>Choose a saved comparison or Gamma report from the dropdown above.</p>
        </div>
      )}

      {/* ================================================================
          GAMMA REPORT GENERATION SECTION
          FIX #2: Hidden when viewing a saved report (mutual exclusivity)
          ================================================================ */}
      {result && !viewingReport && (
      <div className="gamma-section card">
        <h3 className="section-title">
          <span className="section-icon">📊</span>
          Generate Visual Report
        </h3>
        <p className="section-description">
          Create a professional presentation of your {result.city1.city} vs {result.city2.city} comparison.
        </p>

        {/* Existing Report Banner — shown when a saved report matches this comparison */}
        {reportState.status === 'idle' && existingReport && (
          <div className="existing-report-banner">
            <div className="existing-report-info">
              <span className="existing-report-icon">✓</span>
              <span className="existing-report-text">
                You already have a report for this comparison
                <span className="existing-report-date">
                  (saved {new Date(existingReport.savedAt).toLocaleDateString()})
                </span>
              </span>
            </div>
            <div className="existing-report-actions">
              <button
                className="existing-report-btn view"
                onClick={() => setViewingReport(existingReport)}
              >
                View Existing Report
              </button>
              {existingReport.pdfUrl && (
                <a
                  href={existingReport.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="existing-report-btn download"
                >
                  PDF
                </a>
              )}
              {existingReport.pptxUrl && (
                <a
                  href={existingReport.pptxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="existing-report-btn download"
                >
                  PPTX
                </a>
              )}
            </div>
          </div>
        )}

        {reportState.status === 'idle' && (
          <FeatureGate feature="gammaReports" showUsage={true} blurContent={false}>
            <div className="generate-controls">
              {/* Report Type Toggle */}
              <div className="report-type-selector">
                <label>Report Type:</label>
                <div className="report-type-options">
                  <button
                    className={`type-btn ${reportType === 'standard' ? 'active' : ''}`}
                    onClick={() => setReportType('standard')}
                  >
                    Standard (35 pages)
                  </button>
                  <button
                    className={`type-btn ${reportType === 'enhanced' ? 'active' : ''}`}
                    onClick={() => setReportType('enhanced')}
                    disabled={!isEnhancedResult(result)}
                    title={!isEnhancedResult(result) ? 'Requires Enhanced Comparison (multi-LLM)' : 'Generate comprehensive 82-page report'}
                  >
                    Enhanced (82 pages)
                  </button>
                </div>
                {!isEnhancedResult(result) && (
                  <p className="type-hint">Enhanced report requires multi-LLM comparison</p>
                )}
              </div>

              {/* Gun Rights Checkbox (only for enhanced) */}
              {reportType === 'enhanced' && isEnhancedResult(result) && (
                <div className="gun-rights-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeGunRights}
                      onChange={(e) => setIncludeGunRights(e.target.checked)}
                    />
                    <span>Include Gun Rights Comparison (adds 4 pages)</span>
                  </label>
                  <p className="gun-hint">Gun rights are unscored - facts only, no winner declared</p>
                </div>
              )}

              <div className="format-selector">
                <label>Export Format:</label>
                <div className="format-options">
                  <button
                    className={`format-btn ${exportFormat === 'pdf' ? 'active' : ''}`}
                    onClick={() => setExportFormat('pdf')}
                  >
                    PDF
                  </button>
                  <button
                    className={`format-btn ${exportFormat === 'pptx' ? 'active' : ''}`}
                    onClick={() => setExportFormat('pptx')}
                  >
                    PowerPoint
                  </button>
                </div>
              </div>
              <button
                className="generate-btn primary-btn"
                onClick={() => setShowNotifyModal(true)}
              >
                {reportType === 'enhanced' ? 'Generate Enhanced Report' : 'Generate Report'}
              </button>
            </div>
          </FeatureGate>
        )}

        {(reportState.status === 'generating' || reportState.status === 'polling') && (
          <div className="generating-state">
            {/* Spinner + Percentage */}
            <div className="progress-header">
              <div className="spinner"></div>
              <span className="progress-percentage">{reportState.progress || 0}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${reportState.progress || 0}%` }}
              />
            </div>
            <p className="status-message">
              {reportState.statusMessage || getStatusMessage(reportState)}
            </p>
            {reportType === 'enhanced' && (
              <p className="enhanced-hint">Enhanced reports take longer due to 82 pages of content</p>
            )}
          </div>
        )}

        {reportState.status === 'completed' && (
          <div className="completed-state">
            <div className="success-message">
              <span className="success-icon">✓</span>
              Report generated successfully!
            </div>

            {/* Save Report Button — FIX #9: disabled when URL missing */}
            <div className="save-report-section">
              {saveMessage && (
                <span className={`save-message ${saveMessage.startsWith('Error') ? 'error' : ''}`}>
                  {saveMessage}
                </span>
              )}
              <button
                className={`save-report-btn ${isReportSaved || isAlreadySaved ? 'saved' : ''} ${!reportState.gammaUrl ? 'disabled-url' : ''}`}
                onClick={handleSaveReport}
                disabled={isReportSaved || isAlreadySaved || !reportState.gammaUrl}
                title={!reportState.gammaUrl ? 'Report URL not available - please regenerate' : 'Save this report to your library'}
              >
                {isReportSaved || isAlreadySaved ? '✓ Saved to Library' : !reportState.gammaUrl ? '⚠️ URL Missing' : '💾 Save Report'}
              </button>
            </div>

            {/* Download links row */}
            <div className="report-links">
              {reportState.pdfUrl && (
                <a
                  href={reportState.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="report-link download-link"
                >
                  Download PDF
                </a>
              )}
              {reportState.pptxUrl && (
                <a
                  href={reportState.pptxUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="report-link download-link"
                >
                  Download PPTX
                </a>
              )}
              <button
                className="reset-btn secondary-btn"
                onClick={handleReset}
              >
                Generate Another
              </button>
            </div>

            {/* FIX #4, #11: Mode selector + embedded content */}
            {reportState.gammaUrl && (
              <div className="embedded-report">
                {renderModeSelector(
                  reportState.gammaUrl,
                  !!result, // presenter available if we have comparison data
                  () => { setShowEmbedded(false); startTransition(() => setReportViewMode('read')); },
                )}
                {showEmbedded && renderModeContent(
                  reportState.gammaUrl,
                  result,
                  () => startTransition(() => setReportViewMode('read')),
                )}
              </div>
            )}
          </div>
        )}

        {reportState.status === 'error' && (
          <div className="error-state">
            <div className="error-message">
              <span className="error-icon">!</span>
              {reportState.error}
            </div>
            <button
              className="retry-btn secondary-btn"
              onClick={handleReset}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
      )}

      {/* ================================================================
          VIEWING A SAVED REPORT
          FIX #2: Mutual exclusivity with generation section
          FIX #3: Warns if result cities don't match saved report
          ================================================================ */}
      {viewingReport && (
        <div className="saved-report-viewer card">
          <div className="saved-report-viewer-title">
            <h3>{viewingReport.city1} vs {viewingReport.city2} — Saved Report</h3>
            {/* FIX #3: Mismatch warning */}
            {result && !resultMatchesViewingReport && (
              <p className="city-mismatch-warning">
                Active comparison ({result.city1.city} vs {result.city2.city}) doesn't match this report.
                Presenter narration won't be accurate.
              </p>
            )}
            {/* Delete button for the viewed report */}
            <button
              className="report-action-btn delete"
              onClick={() => {
                if (window.confirm(`Delete report for ${viewingReport.city1} vs ${viewingReport.city2}?`)) {
                  deleteGammaReport(viewingReport.id);
                  setViewingReport(null);
                  setReportsRefreshKey(k => k + 1);
                }
              }}
              title="Delete report"
            >
              ✕ Delete
            </button>
          </div>

          {/* Download links for saved report */}
          {(viewingReport.pdfUrl || viewingReport.pptxUrl) && (
            <div className="report-links" style={{ marginBottom: '0.75rem' }}>
              {viewingReport.pdfUrl && (
                <a href={viewingReport.pdfUrl} target="_blank" rel="noopener noreferrer" className="report-link download-link">
                  Download PDF
                </a>
              )}
              {viewingReport.pptxUrl && (
                <a href={viewingReport.pptxUrl} target="_blank" rel="noopener noreferrer" className="report-link download-link">
                  Download PPTX
                </a>
              )}
            </div>
          )}

          {/* FIX #4, #11: Mode selector always visible for saved reports */}
          {renderModeSelector(
            viewingReport.gammaUrl,
            !!result && resultMatchesViewingReport, // FIX #3: disable presenter on mismatch
            () => { setViewingReport(null); startTransition(() => setReportViewMode('read')); },
          )}

          {/* Content area */}
          {renderModeContent(
            viewingReport.gammaUrl,
            result && resultMatchesViewingReport ? result : null,
            () => startTransition(() => setReportViewMode('read')),
          )}
        </div>
      )}

      {/* In-App Visualizations - Only for Enhanced mode */}
      {result && (
        isEnhancedResult(result) ? (
          <div className="in-app-visuals">
            <NewLifeVideos result={result} />
          </div>
        ) : (
          <div className="in-app-visuals">
            <h3 className="section-title">
              <span className="section-icon">🎬</span>
              City Life Videos
            </h3>
            <div className="simple-mode-notice">
              <p>City life videos are available in Enhanced Mode (multi-LLM comparison).</p>
              <p>Use the "Generate Report" button above to create a visual presentation of your comparison.</p>
            </div>
          </div>
        )
      )}
      {/* Notify Me Modal */}
      <NotifyMeModal
        isOpen={showNotifyModal}
        onClose={() => setShowNotifyModal(false)}
        onWaitHere={handleGammaWaitHere}
        onNotifyMe={handleGammaNotifyMe}
        taskLabel="Gamma Report"
        estimatedSeconds={90}
      />
    </div>
  );
};

export default VisualsTab;
