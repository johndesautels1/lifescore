/**
 * LIFE SCORE™ Visuals Tab
 * Combined view of in-app charts and Gamma visual report generation
 * Supports both Simple (ComparisonResult) and Enhanced (EnhancedComparisonResult) modes
 */

import React, { useState, useCallback } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import type { VisualReportState } from '../types/gamma';
import { generateAndWaitForReport, getStatusMessage, type AnyComparisonResult } from '../services/gammaService';
import { saveGammaReport, hasGammaReportForComparison } from '../services/savedComparisons';
import AdvancedVisuals from './AdvancedVisuals';
import './VisualsTab.css';

interface VisualsTabProps {
  result: AnyComparisonResult | null;
  // Optional: for backward compatibility, accept enhanced result separately
  enhancedResult?: EnhancedComparisonResult | null;
  simpleResult?: ComparisonResult | null;
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
  result,
  reportState: propsReportState,
  setReportState: propsSetReportState,
  exportFormat: propsExportFormat,
  setExportFormat: propsSetExportFormat,
  showEmbedded: propsShowEmbedded,
  setShowEmbedded: propsSetShowEmbedded,
}) => {
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

  // Check if report is already saved when component mounts or report changes
  const comparisonId = result?.comparisonId || '';
  const isAlreadySaved = comparisonId ? hasGammaReportForComparison(comparisonId) : false;

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

    saveGammaReport({
      comparisonId: result.comparisonId,
      city1: result.city1.city,
      city2: result.city2.city,
      gammaUrl: reportState.gammaUrl,
      pdfUrl: reportState.pdfUrl,
      pptxUrl: reportState.pptxUrl,
      generationId: reportState.generationId,
    });

    setIsReportSaved(true);
    setSaveMessage('Report saved to your library!');
    setTimeout(() => setSaveMessage(null), 3000);
  }, [result, reportState]);

  const handleGenerateReport = useCallback(async () => {
    if (!result) return;

    try {
      setReportState({ status: 'generating', progress: 0 });

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
    } catch (error) {
      setReportState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }, [result, exportFormat]);

  const handleReset = useCallback(() => {
    setReportState({ status: 'idle' });
  }, []);

  if (!result) {
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
      {/* Gamma Report Generation Section */}
      <div className="gamma-section card">
        <h3 className="section-title">
          <span className="section-icon">📊</span>
          Generate Visual Report
        </h3>
        <p className="section-description">
          Create a professional presentation of your {result.city1.city} vs {result.city2.city} comparison.
        </p>

        {reportState.status === 'idle' && (
          <div className="generate-controls">
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
              Generate Report
            </button>
          </div>
        )}

        {(reportState.status === 'generating' || reportState.status === 'polling') && (
          <div className="generating-state">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${reportState.progress || 0}%` }}
              />
            </div>
            <p className="status-message">{getStatusMessage(reportState)}</p>
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
                      onClick={() => setShowEmbedded(false)}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
                <iframe
                  src={reportState.gammaUrl?.replace('/docs/', '/embed/')}
                  className="gamma-embed-frame"
                  title="LIFE SCORE Visual Report"
                  allowFullScreen
                />
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

      {/* In-App Visualizations - Only for Enhanced mode */}
      {isEnhancedResult(result) ? (
        <div className="in-app-visuals">
          <h3 className="section-title">
            <span className="section-icon">📈</span>
            Interactive Charts
          </h3>
          <AdvancedVisuals result={result} />
        </div>
      ) : (
        <div className="in-app-visuals">
          <h3 className="section-title">
            <span className="section-icon">📈</span>
            Interactive Charts
          </h3>
          <div className="simple-mode-notice">
            <p>Advanced interactive charts are available in Enhanced Mode (multi-LLM comparison).</p>
            <p>Use the "Generate Report" button above to create a visual presentation of your comparison.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualsTab;
