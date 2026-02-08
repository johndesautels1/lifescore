/**
 * Saved Comparisons Component
 * View and manage saved city comparisons with GitHub sync
 */

import React, { useState, useEffect } from 'react';
import type { ComparisonResult } from '../types/metrics';
import {
  getLocalComparisons,
  getLocalEnhancedComparisons,
  deleteComparisonLocal,
  deleteEnhancedComparisonLocal,
  updateNicknameLocal,
  connectGitHub,
  disconnectGitHub,
  syncToGitHub,
  pullFromGitHub,
  getSyncStatus,
  exportToJSON,
  importFromJSON,
  clearAllLocal,
  getSavedGammaReports,
  syncGammaReportsFromSupabase,
  deleteGammaReport,
  clearAllGammaReports,
  getSavedJudgeReports,
  syncJudgeReportsFromSupabase,
  deleteSavedJudgeReport,
  clearAllJudgeReports,
  isValidComparisonResult,
  fullDatabaseSync,
  type SavedComparison,
  type SavedGammaReport,
  type SavedJudgeReport
} from '../services/savedComparisons';
import './SavedComparisons.css';

interface SavedComparisonsProps {
  onLoadComparison: (result: ComparisonResult) => void;
  onViewJudgeReport?: (report: SavedJudgeReport) => void;  // FIX 2026-02-08: Add callback to view Judge reports
  currentComparisonId?: string;
}

// Extended type to track if comparison is enhanced
interface DisplayComparison extends SavedComparison {
  isEnhanced?: boolean;
}

const SavedComparisons: React.FC<SavedComparisonsProps> = ({
  onLoadComparison,
  onViewJudgeReport,
  currentComparisonId
}) => {
  const [comparisons, setComparisons] = useState<DisplayComparison[]>([]);
  const [gammaReports, setGammaReports] = useState<SavedGammaReport[]>([]);
  const [judgeReports, setJudgeReports] = useState<SavedJudgeReport[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);  // Default expanded to show sync spinner
  const [showGammaReports, setShowGammaReports] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [gitHubToken, setGitHubToken] = useState('');
  const [, setGitHubUsername] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingNickname, setEditingNickname] = useState<string | null>(null);
  const [nicknameValue, setNicknameValue] = useState('');

  const [isSyncing, setIsSyncing] = useState(false);

  // Load comparisons on mount - sync from Supabase first
  useEffect(() => {
    syncAndLoadComparisons();
  }, []);

  // FIX: Sync reports AND comparisons from Supabase to ensure cross-device consistency
  const syncAndLoadComparisons = async () => {
    setIsSyncing(true);
    console.log('[SavedComparisons] Starting full sync from Supabase...');

    try {
      // FIX Session-19: FIRST sync actual comparisons (including Enhanced) from Supabase
      // This was missing before - Enhanced comparisons from other devices weren't being pulled!
      const dbSyncResult = await fullDatabaseSync();
      console.log('[SavedComparisons] Database sync result:', dbSyncResult);

      // Then sync Gamma and Judge reports in parallel
      const [gammaFromDb, judgeFromDb] = await Promise.all([
        syncGammaReportsFromSupabase(),
        syncJudgeReportsFromSupabase()
      ]);

      // Now load everything (localStorage is now updated with Supabase data)
      loadComparisons();

      // Use the synced data directly
      setGammaReports(gammaFromDb);
      setJudgeReports(judgeFromDb);

      const totalReports = gammaFromDb.length + judgeFromDb.length;
      const totalComparisons = dbSyncResult.pulled + dbSyncResult.pushed;
      console.log('[SavedComparisons] ✓ Full sync complete:',
        dbSyncResult.pulled, 'comparisons pulled,',
        dbSyncResult.pushed, 'pushed,',
        gammaFromDb.length, 'gamma,',
        judgeFromDb.length, 'judge reports');

      if (totalComparisons > 0 || totalReports > 0) {
        showMessage('success', `Synced ${dbSyncResult.pulled} comparisons + ${totalReports} reports`);
      } else {
        showMessage('error', 'No data found - are you logged in?');
      }
    } catch (err) {
      console.error('[SavedComparisons] Sync error:', err);
      showMessage('error', 'Sync failed - check connection');
      // Fall back to localStorage only
      loadComparisons();
    } finally {
      setIsSyncing(false);
    }
  };

  const loadComparisons = () => {
    // FIX 2026-01-26: Load BOTH standard and enhanced comparisons
    const standardComparisons = getLocalComparisons().map(c => ({ ...c, isEnhanced: false }));

    // FIX 7.4: Use type guard instead of unsafe cast - filter out invalid entries
    const enhancedComparisons = getLocalEnhancedComparisons()
      .filter(c => isValidComparisonResult(c.result))
      .map(c => ({
        ...c,
        // Safe cast after type guard validation
        result: c.result as unknown as ComparisonResult,
        isEnhanced: true
      }));

    // Merge and sort by savedAt date (newest first)
    const allComparisons = [...standardComparisons, ...enhancedComparisons]
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

    console.log('[SavedComparisons] Loaded', standardComparisons.length, 'standard +', enhancedComparisons.length, 'enhanced comparisons');

    setComparisons(allComparisons);
    setGammaReports(getSavedGammaReports());
    setJudgeReports(getSavedJudgeReports());
    setSyncStatus(getSyncStatus());
  };

  const handleDeleteGammaReport = (id: string) => {
    if (window.confirm('Delete this saved report?')) {
      deleteGammaReport(id);
      loadComparisons();
      showMessage('success', 'Report deleted');
    }
  };

  const handleDeleteJudgeReport = (reportId: string) => {
    if (window.confirm('Delete this saved report?')) {
      deleteSavedJudgeReport(reportId);
      loadComparisons();
      showMessage('success', 'Report deleted');
    }
  };

  const handleClearAllGammaReports = () => {
    if (window.confirm('Delete ALL saved visual reports? This cannot be undone.')) {
      clearAllGammaReports();
      clearAllJudgeReports();
      loadComparisons();
      showMessage('success', 'All reports cleared');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleDelete = async (id: string, isEnhanced?: boolean) => {
    if (window.confirm('Delete this saved comparison?')) {
      // FIX 2026-01-26: Delete from correct storage based on comparison type
      // FIX 2026-01-26: Await async delete operations before reloading
      if (isEnhanced) {
        await deleteEnhancedComparisonLocal(id);
      } else {
        await deleteComparisonLocal(id);
      }
      loadComparisons();
      showMessage('success', 'Comparison deleted');
    }
  };

  const handleLoad = (comparison: DisplayComparison) => {
    // FIX 2026-01-26: Comprehensive defensive checks for saved reports loading

    // Check 1: Ensure comparison object exists
    if (!comparison) {
      showMessage('error', 'Unable to load: comparison data is missing');
      console.error('[SavedComparisons] comparison is undefined');
      return;
    }

    // Check 2: Ensure result exists
    if (!comparison.result) {
      showMessage('error', 'Unable to load: report data is missing');
      console.error('[SavedComparisons] comparison.result is undefined:', comparison.id);
      return;
    }

    // Check 3: Ensure city1 exists with required fields
    if (!comparison.result.city1 || typeof comparison.result.city1 !== 'object') {
      showMessage('error', 'Unable to load: City 1 data is corrupted');
      console.error('[SavedComparisons] Missing/invalid city1:', comparison.result);
      return;
    }

    // Check 4: Ensure city2 exists with required fields
    if (!comparison.result.city2 || typeof comparison.result.city2 !== 'object') {
      showMessage('error', 'Unable to load: City 2 data is corrupted');
      console.error('[SavedComparisons] Missing/invalid city2:', comparison.result);
      return;
    }

    // Check 5: Ensure city names exist (critical for display)
    if (!comparison.result.city1.city || !comparison.result.city2.city) {
      showMessage('error', 'Unable to load: city names are missing');
      console.error('[SavedComparisons] Missing city names:', comparison.result.city1, comparison.result.city2);
      return;
    }

    // Check 6: Ensure comparisonId exists (needed for tracking)
    if (!comparison.result.comparisonId) {
      showMessage('error', 'Unable to load: report ID is missing');
      console.error('[SavedComparisons] Missing comparisonId:', comparison.result);
      return;
    }

    try {
      console.log('[SavedComparisons] Loading comparison:', comparison.result.comparisonId,
        comparison.result.city1.city, 'vs', comparison.result.city2.city);
      onLoadComparison(comparison.result);
      setIsExpanded(false);
      showMessage('success', `Loaded: ${comparison.result.city1.city} vs ${comparison.result.city2.city}`);
    } catch (err) {
      showMessage('error', 'Failed to load comparison - please try again');
      console.error('[SavedComparisons] Error calling onLoadComparison:', err);
    }
  };

  const handleEditNickname = (id: string, currentNickname?: string) => {
    setEditingNickname(id);
    setNicknameValue(currentNickname || '');
  };

  const handleSaveNickname = (id: string) => {
    updateNicknameLocal(id, nicknameValue);
    setEditingNickname(null);
    loadComparisons();
  };

  const handleConnectGitHub = async () => {
    if (!gitHubToken.trim()) {
      showMessage('error', 'Please enter your Personal Access Token');
      return;
    }

    const result = await connectGitHub(gitHubToken.trim());
    if (result.success) {
      setGitHubUsername(result.username || null);
      setShowGitHubModal(false);
      setGitHubToken('');
      loadComparisons();
      showMessage('success', result.message);
    } else {
      showMessage('error', result.message);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (window.confirm('Disconnect from GitHub? Your local comparisons will be kept.')) {
      await disconnectGitHub(false);
      setGitHubUsername(null);
      loadComparisons();
      showMessage('success', 'Disconnected from GitHub');
    }
  };

  const handleSync = async () => {
    showMessage('success', 'Syncing to GitHub...');
    const result = await syncToGitHub();
    loadComparisons();
    showMessage(result.success ? 'success' : 'error', result.message);
  };

  const handlePull = async () => {
    showMessage('success', 'Pulling from GitHub...');
    const result = await pullFromGitHub();
    loadComparisons();
    showMessage(result.success ? 'success' : 'error', result.message);
  };

  const handleExport = () => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifescore_comparisons_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage('success', 'Comparisons exported');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const result = importFromJSON(json);
      loadComparisons();
      showMessage(result.success ? 'success' : 'error', result.message);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleClearAll = () => {
    if (window.confirm('Delete ALL saved comparisons? This cannot be undone.')) {
      clearAllLocal();
      loadComparisons();
      showMessage('success', 'All comparisons cleared');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getWinnerText = (comparison: SavedComparison) => {
    const { result } = comparison;
    if (result.winner === 'tie') return 'Tie';
    const winner = result.winner === 'city1' ? result.city1 : result.city2;
    return `${winner.city} wins`;
  };

  if (comparisons.length === 0 && !isExpanded) {
    return null; // Don't show if no saved comparisons
  }

  return (
    <div className="saved-comparisons">
      <button
        className="saved-header-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="saved-header-left">
          <span className="saved-icon">📁</span>
          <span className="saved-title">My Saved Comparisons</span>
          <span className="saved-count">{comparisons.length}</span>
          {isSyncing && <span className="sync-indicator" title="Syncing from cloud...">⟳</span>}
        </div>
        <div className="saved-header-right">
          {syncStatus.connected && (
            <span className="github-badge" title="Connected to GitHub">
              <span className="github-icon">⬡</span>
              {syncStatus.hasPendingChanges && <span className="sync-dot" title="Unsynced changes" />}
            </span>
          )}
          <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="saved-content">
          {/* Status Message */}
          {statusMessage && (
            <div className={`status-message ${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}

          {/* Database Sync Spinner */}
          {isSyncing && (
            <div className="sync-spinner-overlay">
              <div className="sync-spinner-container">
                <div className="sync-spinner"></div>
                <span className="sync-spinner-text">Database Sync in Progress...</span>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="saved-toolbar">
            <div className="toolbar-left">
              {/* Cloud Sync Button - Always visible */}
              <button
                className="toolbar-btn cloud-sync-btn"
                onClick={syncAndLoadComparisons}
                disabled={isSyncing}
                title="Sync reports from cloud"
              >
                {isSyncing ? '⟳ Syncing...' : '☁️ Sync Cloud'}
              </button>
              {syncStatus.connected ? (
                <>
                  <button className="toolbar-btn sync-btn" onClick={handleSync} title="Sync to GitHub">
                    ⬆ Push
                  </button>
                  <button className="toolbar-btn pull-btn" onClick={handlePull} title="Pull from GitHub">
                    ⬇ Pull
                  </button>
                  <button className="toolbar-btn disconnect-btn" onClick={handleDisconnectGitHub} title="Disconnect GitHub">
                    Disconnect
                  </button>
                </>
              ) : (
                <button className="toolbar-btn github-connect-btn" onClick={() => setShowGitHubModal(true)}>
                  <span className="github-icon">⬡</span> Connect GitHub
                </button>
              )}
            </div>
            <div className="toolbar-right">
              <button className="toolbar-btn" onClick={handleExport} title="Export to file">
                📤 Export
              </button>
              <label className="toolbar-btn import-btn" title="Import from file">
                📥 Import
                <input type="file" accept=".json" onChange={handleImport} hidden />
              </label>
              {comparisons.length > 0 && (
                <button className="toolbar-btn clear-btn" onClick={handleClearAll} title="Clear all">
                  🗑️ Clear All
                </button>
              )}
            </div>
          </div>

          {/* Tab Toggle: Comparisons vs Reports */}
          <div className="saved-tabs">
            <button
              className={`saved-tab ${!showGammaReports ? 'active' : ''}`}
              onClick={() => setShowGammaReports(false)}
            >
              📊 Comparisons ({comparisons.length})
            </button>
            <button
              className={`saved-tab ${showGammaReports ? 'active' : ''}`}
              onClick={() => setShowGammaReports(true)}
            >
              📑 Visual Reports ({gammaReports.length + judgeReports.length})
            </button>
          </div>

          {/* Comparisons List */}
          {!showGammaReports && (
            comparisons.length === 0 ? (
              <div className="no-saved">
                <p>No saved comparisons yet.</p>
                <p className="no-saved-hint">Complete a comparison and click "Save" to add it here.</p>
              </div>
            ) : (
              <div className="saved-list">
                {comparisons.map((comparison) => (
                  <div
                    key={comparison.id}
                    className={`saved-item ${comparison.id === currentComparisonId ? 'current' : ''}`}
                  >
                    <div className="saved-item-main">
                      <div className="saved-item-cities">
                        {editingNickname === comparison.id ? (
                          <div className="nickname-edit">
                            <input
                              type="text"
                              value={nicknameValue}
                              onChange={(e) => setNicknameValue(e.target.value)}
                              placeholder="Add a nickname..."
                              autoFocus
                            />
                            <button onClick={() => handleSaveNickname(comparison.id)}>✓</button>
                            <button onClick={() => setEditingNickname(null)}>✕</button>
                          </div>
                        ) : (
                          <>
                            {comparison.nickname && (
                              <span className="saved-nickname">{comparison.nickname}</span>
                            )}
                            <span className="saved-cities-text">
                              {comparison.result.city1.city} vs {comparison.result.city2.city}
                            </span>
                            {/* FIX 2026-02-08: Clear Enhanced/Standard badges with text */}
                            {comparison.isEnhanced ? (
                              <span className="report-type-badge enhanced" title="Multi-LLM Enhanced Comparison">
                                <span className="badge-icon">⚡</span>
                                <span className="badge-text">Enhanced</span>
                              </span>
                            ) : (
                              <span className="report-type-badge standard" title="Standard Single-LLM Comparison">
                                <span className="badge-icon">📊</span>
                                <span className="badge-text">Standard</span>
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="saved-item-meta">
                        <span className={`saved-winner ${comparison.result.winner}`}>
                          {getWinnerText(comparison)}
                        </span>
                        <span className="saved-scores">
                          {Math.round((comparison.result.city1 as any)?.totalScore || (comparison.result.city1 as any)?.totalConsensusScore || 0)} - {Math.round((comparison.result.city2 as any)?.totalScore || (comparison.result.city2 as any)?.totalConsensusScore || 0)}
                        </span>
                        <span className="saved-date">{formatDate(comparison.savedAt)}</span>
                        {!comparison.synced && syncStatus.connected && (
                          <span className="unsynced-badge" title="Not synced">●</span>
                        )}
                      </div>
                    </div>
                    <div className="saved-item-actions">
                      <button
                        className="action-btn view-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('[SavedComparisons] View button clicked for:', comparison.id);
                          handleLoad(comparison);
                        }}
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          console.log('[SavedComparisons] View button touched for:', comparison.id);
                          handleLoad(comparison);
                        }}
                        title="View comparison"
                        aria-label={`View ${comparison.result?.city1?.city || 'City 1'} vs ${comparison.result?.city2?.city || 'City 2'}`}
                      >
                        👁️
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEditNickname(comparison.id, comparison.nickname)}
                        title="Edit nickname"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(comparison.id, comparison.isEnhanced)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Visual Reports List (Gamma + Judge) */}
          {showGammaReports && (
            gammaReports.length === 0 && judgeReports.length === 0 ? (
              <div className="no-saved">
                <p>No saved visual reports yet.</p>
                <p className="no-saved-hint">Generate a Gamma report in the Visuals tab or a Judge verdict in the Judge tab to add it here.</p>
              </div>
            ) : (
              <>
                <div className="gamma-reports-toolbar">
                  <span className="gamma-reports-count">{gammaReports.length + judgeReports.length} saved report{(gammaReports.length + judgeReports.length) !== 1 ? 's' : ''}</span>
                  <button className="toolbar-btn clear-btn" onClick={handleClearAllGammaReports}>
                    🗑️ Clear All
                  </button>
                </div>
                <div className="saved-list gamma-reports-list">
                  {/* Gamma Reports */}
                  {gammaReports.map((report) => (
                    <div key={report.id} className="saved-item gamma-report-item">
                      <div className="saved-item-main">
                        <div className="saved-item-cities">
                          <span className="gamma-report-icon">📊</span>
                          <span className="saved-cities-text">
                            {report.city1} vs {report.city2}
                          </span>
                        </div>
                        <div className="saved-item-meta">
                          <span className="saved-date">{formatDate(report.savedAt)}</span>
                        </div>
                      </div>
                      <div className="saved-item-actions gamma-report-actions">
                        <a
                          href={report.gammaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-btn view-btn"
                          title="View Report"
                          aria-label={`View ${report.city1} vs ${report.city2} report`}
                          onClick={() => console.log('[SavedComparisons] Opening Gamma report:', report.gammaUrl)}
                        >
                          👁️
                        </a>
                        {report.pdfUrl && (
                          <a
                            href={report.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn download-btn"
                            title="Download PDF"
                          >
                            📄
                          </a>
                        )}
                        {report.pptxUrl && (
                          <a
                            href={report.pptxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn download-btn"
                            title="Download PPTX"
                          >
                            📑
                          </a>
                        )}
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteGammaReport(report.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Judge Reports */}
                  {judgeReports.map((report) => (
                    <div key={report.reportId} className="saved-item gamma-report-item">
                      <div className="saved-item-main">
                        <div className="saved-item-cities">
                          <span className="gamma-report-icon">&#9878;</span>
                          <span className="saved-cities-text">
                            {report.city1} vs {report.city2}
                          </span>
                          <span className="enhanced-badge" title="Judge Verdict">Judge</span>
                        </div>
                        <div className="saved-item-meta">
                          <span className={`saved-winner ${report.executiveSummary.recommendation}`}>
                            {report.executiveSummary.recommendation === 'city1' ? `${report.city1} wins` :
                             report.executiveSummary.recommendation === 'city2' ? `${report.city2} wins` : 'Tie'}
                          </span>
                          <span className="saved-scores">
                            {report.summaryOfFindings.city1Score} - {report.summaryOfFindings.city2Score}
                          </span>
                          <span className="saved-date">{formatDate(report.generatedAt)}</span>
                        </div>
                      </div>
                      <div className="saved-item-actions gamma-report-actions">
                        {/* FIX 2026-02-08: Add View button for Judge reports */}
                        {onViewJudgeReport && (
                          <button
                            className="action-btn view-btn"
                            onClick={() => onViewJudgeReport(report)}
                            title="View Judge Report"
                          >
                            👁️
                          </button>
                        )}
                        {report.videoUrl && report.videoStatus === 'ready' && (
                          <a
                            href={report.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="action-btn view-btn"
                            title="Watch Video"
                          >
                            🎬
                          </a>
                        )}
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteJudgeReport(report.reportId)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* GitHub Connect Modal */}
      {showGitHubModal && (
        <div className="modal-overlay" onClick={() => setShowGitHubModal(false)}>
          <div className="github-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Connect to GitHub</h3>
            <p className="modal-description">
              Store your saved comparisons in a private GitHub Gist for cloud backup and cross-device sync.
            </p>

            <div className="token-instructions">
              <h4>Create a Personal Access Token:</h4>
              <ol>
                <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">GitHub Token Settings</a></li>
                <li>Click "Generate new token (classic)"</li>
                <li>Give it a name like "LIFE SCORE Sync"</li>
                <li>Select the <strong>gist</strong> scope</li>
                <li>Generate and copy the token</li>
              </ol>
            </div>

            <div className="token-input-group">
              <label>Personal Access Token</label>
              <input
                type="password"
                value={gitHubToken}
                onChange={(e) => setGitHubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowGitHubModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConnectGitHub}>
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedComparisons;
