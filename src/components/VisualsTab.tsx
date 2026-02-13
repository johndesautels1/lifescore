/**
 * LIFE SCORE™ Visuals Tab
 * Combined view of in-app charts and Gamma visual report generation
 * Supports both Simple (ComparisonResult) and Enhanced (EnhancedComparisonResult) modes
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import FeatureGate from './FeatureGate';
import { useTierAccess } from '../hooks/useTierAccess';
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

  // Determine which comparison to use: Selected from dropdown > Prop
  const getActiveComparison = (): AnyComparisonResult | null => {
    if (selectedComparisonId) {
      // Look up in saved comparisons
      const savedStd = savedComparisons.find(c => c.result.comparisonId === selectedComparisonId);
      if (savedStd) return savedStd.result;
      const savedEnh = savedEnhanced.find(c => c.result.comparisonId === selectedComparisonId);
      if (savedEnh) return savedEnh.result;
    }
    return propResult;
  };

  const result = getActiveComparison();

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

  // Report view mode: read (iframe) or presenter (Olivia video overlay)
  const [reportViewMode, setReportViewMode] = useState<ReportViewMode>('read');

  // Load saved reports from localStorage, then sync from Supabase as fallback
  useEffect(() => {
    const localReports = getSavedGammaReports();
    setSavedReports(localReports);

    // If localStorage is empty, try syncing from Supabase (handles lost localStorage)
    if (localReports.length === 0) {
      syncGammaReportsFromSupabase().then((synced) => {
        if (synced.length > 0) {
          console.log('[VisualsTab] Synced', synced.length, 'Gamma reports from Supabase');
          setSavedReports(synced);
        }
      }).catch(err => {
        console.error('[VisualsTab] Supabase sync failed:', err);
      });
    }
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
      const effectiveComparisonId = result.comparisonId || `LIFE-${Date.now()}-${result.city1.city.slice(0, 3).toUpperCase()}`;
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

    // FIX: Generate fallback comparisonId if missing
    const effectiveComparisonId = result.comparisonId || `LIFE-${Date.now()}-${result.city1.city.slice(0,3).toUpperCase()}`;

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
      generationId: reportState.generationId,
    });

    console.log('[VisualsTab] Report saved successfully:', savedReport);

    setIsReportSaved(true);
    setSaveMessage('Report saved to your library!');
    setTimeout(() => setSaveMessage(null), 3000);
  }, [result, reportState]);

  const handleGenerateReport = useCallback(async () => {
    if (!result) return;

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
  }, []);

  const hasSavedComparisons = savedComparisons.length > 0 || savedEnhanced.length > 0;

  if (!result && !hasSavedComparisons && savedReports.length === 0) {
    return (
      <div className="visuals-tab">
        <div className="no-results-message card">
          <h3>No Comparison Data</h3>
          <p>Run a city comparison first to see visualizations and generate reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="visuals-tab">
      {/* Report Selection Dropdown */}
      {hasSavedComparisons && (
        <div className="report-selector-section">
          <label className="report-selector-label">Select Report:</label>
          <select
            className="report-selector-dropdown"
            value={selectedComparisonId ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedComparisonId(value === '' ? null : value);
              // Reset report state when switching comparisons
              if (value !== selectedComparisonId) {
                setReportState({ status: 'idle' });
                setIsReportSaved(false);
              }
            }}
          >
            <option value="">
              {propResult
                ? `Current: ${propResult.city1.city} vs ${propResult.city2.city}`
                : 'Select a saved report'}
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
          </select>
        </div>
      )}

      {/* Choose Existing Gamma Report Dropdown - ALWAYS visible */}
      <div className="report-selector-section gamma-report-selector">
        <label className="report-selector-label">View Existing Gamma Report:</label>
        {savedReports.length > 0 ? (
          <select
            className="report-selector-dropdown"
            value=""
            onChange={(e) => {
              const reportId = e.target.value;
              if (!reportId) return;
              const report = savedReports.find(r => r.id === reportId);
              if (report) {
                setViewingReport(report);
              }
            }}
          >
            <option value="">Select a report to view ({savedReports.length} saved)...</option>
            {savedReports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.city1} vs {report.city2} — {new Date(report.savedAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        ) : (
          <div className="no-saved-reports-msg">
            No saved Gamma reports yet. Reports are auto-saved when generated.
          </div>
        )}
      </div>

      {/* No result selected message */}
      {!result && !viewingReport && (
        <div className="no-results-message card">
          <h3>Select a Report</h3>
          <p>Choose a saved comparison from the dropdown above to generate visualizations, or select an existing Gamma report.</p>
        </div>
      )}

      {/* Gamma Report Generation Section */}
      {result && (
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
                onClick={handleGenerateReport}
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
            {!showEmbedded ? (
              <>
                <div className="success-message">
                  <span className="success-icon">✓</span>
                  Report generated successfully!
                </div>

                {/* Save Report Button */}
                <div className="save-report-section">
                  {saveMessage && (
                    <span className={`save-message ${saveMessage.startsWith('Error') ? 'error' : ''}`}>
                      {saveMessage}
                    </span>
                  )}
                  <button
                    className={`save-report-btn ${isReportSaved || isAlreadySaved ? 'saved' : ''} ${!reportState.gammaUrl ? 'disabled-url' : ''}`}
                    onClick={handleSaveReport}
                    disabled={isReportSaved || isAlreadySaved}
                    title={!reportState.gammaUrl ? 'Report URL not available - please regenerate' : 'Save this report to your library'}
                  >
                    {isReportSaved || isAlreadySaved ? '✓ Saved to Library' : !reportState.gammaUrl ? '⚠️ URL Missing' : '💾 Save Report'}
                  </button>
                </div>

                <div className="report-links">
                  {reportState.gammaUrl && (
                    <button
                      className="report-link view-link"
                      onClick={() => setShowEmbedded(true)}
                    >
                      View Report
                    </button>
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
                </div>
                <button
                  className="reset-btn secondary-btn"
                  onClick={handleReset}
                >
                  Generate Another
                </button>
              </>
            ) : (
              <div className="embedded-report">
                <div className="embedded-header">
                  <h3>LIFE SCORE™ Visual Report</h3>
                  <div className="embedded-actions">
                    {/* Read / Watch Presenter Toggle */}
                    <div className="report-view-toggle">
                      <button
                        className={`view-toggle-btn ${reportViewMode === 'read' ? 'active' : ''}`}
                        onClick={() => setReportViewMode('read')}
                      >
                        📖 Read
                      </button>
                      <button
                        className={`view-toggle-btn ${reportViewMode === 'presenter' ? 'active' : ''}`}
                        onClick={() => setReportViewMode('presenter')}
                      >
                        🎬 Watch Presenter
                      </button>
                    </div>
                    <a
                      href={reportState.gammaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="external-link-btn"
                    >
                      Open External ↗
                    </a>
                    <button
                      className="close-embed-btn"
                      onClick={() => { setShowEmbedded(false); setReportViewMode('read'); }}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                {reportViewMode === 'presenter' && result && reportState.gammaUrl ? (
                  <ReportPresenter
                    result={result}
                    gammaUrl={reportState.gammaUrl}
                    onClose={() => setReportViewMode('read')}
                  />
                ) : (
                  <iframe
                    src={reportState.gammaUrl?.replace('/docs/', '/embed/')}
                    className="gamma-embed-frame"
                    title="LIFE SCORE Visual Report"
                    allowFullScreen
                  />
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

      {/* Saved Reports Library */}
      {savedReports.length > 0 && !viewingReport && (
        <div className="saved-reports-section card">
          <h3 className="section-title">
            <span className="section-icon">📁</span>
            Saved Reports ({savedReports.length})
          </h3>
          <div className="saved-reports-list">
            {savedReports.map((report) => (
              <div key={report.id} className="saved-report-item">
                <div className="report-info">
                  <span className="report-cities">{report.city1} vs {report.city2}</span>
                  <span className="report-date">{new Date(report.savedAt).toLocaleDateString()}</span>
                </div>
                <div className="report-actions">
                  <button
                    className="report-action-btn view"
                    onClick={() => setViewingReport(report)}
                    title="View report"
                  >
                    View
                  </button>
                  {report.pdfUrl && (
                    <a
                      href={report.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="report-action-btn download"
                      title="Download PDF"
                    >
                      PDF
                    </a>
                  )}
                  {report.pptxUrl && (
                    <a
                      href={report.pptxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="report-action-btn download"
                      title="Download PowerPoint"
                    >
                      PPTX
                    </a>
                  )}
                  <button
                    className="report-action-btn delete"
                    onClick={() => {
                      if (window.confirm(`Delete report for ${report.city1} vs ${report.city2}?`)) {
                        deleteGammaReport(report.id);
                        setReportsRefreshKey(k => k + 1);
                      }
                    }}
                    title="Delete report"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Viewing a saved report */}
      {viewingReport && (
        <div className="saved-report-viewer card">
          <div className="embedded-header">
            <h3>{viewingReport.city1} vs {viewingReport.city2} — Saved Report</h3>
            <div className="embedded-actions">
              {/* Read / Watch Presenter Toggle */}
              {result && (
                <div className="report-view-toggle">
                  <button
                    className={`view-toggle-btn ${reportViewMode === 'read' ? 'active' : ''}`}
                    onClick={() => setReportViewMode('read')}
                  >
                    📖 Read
                  </button>
                  <button
                    className={`view-toggle-btn ${reportViewMode === 'presenter' ? 'active' : ''}`}
                    onClick={() => setReportViewMode('presenter')}
                  >
                    🎬 Watch Presenter
                  </button>
                </div>
              )}
              <a
                href={viewingReport.gammaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="external-link-btn"
              >
                Open External ↗
              </a>
              <button
                className="close-embed-btn"
                onClick={() => { setViewingReport(null); setReportViewMode('read'); }}
              >
                ✕ Close
              </button>
            </div>
          </div>
          {reportViewMode === 'presenter' && result && viewingReport.gammaUrl ? (
            <ReportPresenter
              result={result}
              gammaUrl={viewingReport.gammaUrl}
              onClose={() => setReportViewMode('read')}
            />
          ) : (
            <iframe
              src={viewingReport.gammaUrl?.replace('/docs/', '/embed/')}
              className="gamma-embed-frame"
              title="LIFE SCORE Saved Report"
              allowFullScreen
            />
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
    </div>
  );
};

export default VisualsTab;
