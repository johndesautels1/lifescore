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
import AdvancedVisuals from './AdvancedVisuals';
import './VisualsTab.css';

interface VisualsTabProps {
  result: AnyComparisonResult | null;
  // Optional: for backward compatibility, accept enhanced result separately
  enhancedResult?: EnhancedComparisonResult | null;
  simpleResult?: ComparisonResult | null;
}

// Type guard to check if result is EnhancedComparisonResult
function isEnhancedResult(result: AnyComparisonResult | null): result is EnhancedComparisonResult {
  if (!result) return false;
  return 'llmsUsed' in result;
}

const VisualsTab: React.FC<VisualsTabProps> = ({ result }) => {
  const [reportState, setReportState] = useState<VisualReportState>({
    status: 'idle',
  });
  const [exportFormat, setExportFormat] = useState<'pdf' | 'pptx'>('pdf');

  const handleGenerateReport = useCallback(async () => {
    if (!result) return;

    try {
      setReportState({ status: 'generating', progress: 0 });

      const finalState = await generateAndWaitForReport(
        result,
        exportFormat,
        (state) => setReportState(state)
      );

      // Construct Gamma URL from generationId if not provided
      const gammaUrl = finalState.url || `https://gamma.app/docs/${finalState.generationId}`;
      
      setReportState({
        status: 'completed',
        generationId: finalState.generationId,
        gammaUrl: gammaUrl,
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
            <div className="success-message">
              <span className="success-icon">✓</span>
              Report generated successfully!
            </div>
            <div className="report-links">
              {reportState.gammaUrl ? (
                <a
                  href={reportState.gammaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="report-link view-link"
                >
                  View Report
                </a>
              ) : (
                <span className="report-link view-link loading-link">
                  Loading report link...
                </span>
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
            </div>
            <button
              className="reset-btn secondary-btn"
              onClick={handleReset}
            >
              Generate Another
            </button>
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
