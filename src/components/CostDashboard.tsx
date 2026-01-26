/**
 * LIFE SCORE™ Admin Cost Dashboard
 * Displays API cost breakdown for monitoring and profitability analysis
 * Data persists to Supabase database for authenticated users
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getStoredCosts,
  calculateCostSummary,
  clearStoredCosts,
  storeCostBreakdown,
  formatCost,
  toApiCostRecordInsert,
  type ComparisonCostBreakdown,
  type CostSummary
} from '../utils/costCalculator';
import {
  saveApiCostRecord,
  getUserApiCosts,
  deleteAllApiCosts,
} from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import type { ApiCostRecord } from '../types/database';
import './CostDashboard.css';

interface CostDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [costs, setCosts] = useState<ComparisonCostBreakdown[]>([]);
  const [_dbCosts, setDbCosts] = useState<ApiCostRecord[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<ComparisonCostBreakdown | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataSource, setDataSource] = useState<'database' | 'local'>('local');

  const dbConfigured = isSupabaseConfigured();

  // Load cost data from database (if authenticated) or localStorage
  const loadCosts = useCallback(async () => {
    setIsLoading(true);

    // Always load localStorage data first (fast, offline-capable)
    const localCosts = getStoredCosts();
    setCosts(localCosts);
    setSummary(calculateCostSummary());

    // If user is authenticated and DB is configured, load from database
    if (user && dbConfigured) {
      try {
        const { data, error } = await getUserApiCosts(user.id, { limit: 100 });
        if (!error && data.length > 0) {
          setDbCosts(data);
          setDataSource('database');
          setLastSaved(new Date(data[0].created_at));
        } else if (localCosts.length > 0) {
          setDataSource('local');
        }
      } catch (err) {
        console.warn('[CostDashboard] Failed to load from database, using local:', err);
        setDataSource('local');
      }
    } else {
      setDataSource('local');
      if (localCosts.length > 0) {
        setLastSaved(new Date());
      }
    }

    setIsLoading(false);
  }, [user, dbConfigured]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCosts();
    }
  }, [isOpen, loadCosts]);

  const handleClearData = async () => {
    const deleteSource = user && dbConfigured ? 'database and browser' : 'browser';
    if (window.confirm(`⚠️ DELETE ALL DATA?\n\nThis will permanently delete all cost tracking data from your ${deleteSource}.\n\nThis action cannot be undone.`)) {
      setIsSaving(true);

      // Always clear localStorage
      clearStoredCosts();
      setCosts([]);

      // If user is authenticated, also delete from database
      if (user && dbConfigured) {
        try {
          const { error } = await deleteAllApiCosts(user.id);
          if (error) {
            console.error('[CostDashboard] Failed to delete from database:', error);
            setSaveMessage('✗ Cleared local data, but database deletion failed');
          } else {
            setDbCosts([]);
            setSaveMessage('✓ All data deleted from database and browser');
          }
        } catch (err) {
          console.error('[CostDashboard] Database deletion error:', err);
          setSaveMessage('✗ Cleared local data, but database deletion failed');
        }
      } else {
        setSaveMessage('✓ All data deleted from browser storage');
      }

      setSummary(calculateCostSummary());
      setLastSaved(null);
      setDataSource('local');
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  const handleSaveData = async () => {
    if (costs.length === 0) {
      setSaveMessage('✗ No data to save');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }

    setIsSaving(true);

    try {
      // Always save to localStorage first (offline backup)
      clearStoredCosts();
      costs.forEach(cost => storeCostBreakdown(cost));

      // If user is authenticated and DB configured, save to database
      if (user && dbConfigured) {
        let successCount = 0;
        let errorCount = 0;

        for (const cost of costs) {
          try {
            const record = toApiCostRecordInsert(cost, user.id);
            const { error } = await saveApiCostRecord(record);
            if (error) {
              console.error('[CostDashboard] Failed to save record:', cost.comparisonId, error);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            console.error('[CostDashboard] Error saving record:', err);
            errorCount++;
          }
        }

        if (errorCount === 0) {
          setSaveMessage(`✓ ${successCount} records saved to database`);
          setDataSource('database');
        } else if (successCount > 0) {
          setSaveMessage(`⚠️ ${successCount} saved, ${errorCount} failed`);
        } else {
          setSaveMessage('✗ Failed to save to database (saved locally)');
        }

        // Reload from database to get updated records
        await loadCosts();
      } else {
        setSaveMessage('✓ Data saved to browser storage');
        setDataSource('local');
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('[CostDashboard] Save error:', error);
      setSaveMessage('✗ Failed to save data');
    }

    setIsSaving(false);
    setTimeout(() => setSaveMessage(null), 4000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Comparison ID',
      'City 1',
      'City 2',
      'Mode',
      'Date',
      'Tavily Cost',
      'Claude Sonnet Cost',
      'GPT-4o Cost',
      'Gemini Cost',
      'Grok Cost',
      'Perplexity Cost',
      'Opus Judge Cost',
      'Gamma Cost',
      'Olivia Cost',
      'TTS Cost',
      'Avatar Cost',
      'Grand Total'
    ];

    const rows = costs.map(c => [
      c.comparisonId,
      c.city1,
      c.city2,
      c.mode,
      new Date(c.timestamp).toISOString(),
      c.tavilyTotal.toFixed(2),
      c.claudeSonnet.reduce((s, x) => s + x.totalCost, 0).toFixed(2),
      c.gpt4o.reduce((s, x) => s + x.totalCost, 0).toFixed(2),
      c.gemini.reduce((s, x) => s + x.totalCost, 0).toFixed(2),
      c.grok.reduce((s, x) => s + x.totalCost, 0).toFixed(2),
      c.perplexity.reduce((s, x) => s + x.totalCost, 0).toFixed(2),
      (c.opusJudge?.totalCost || 0).toFixed(2),
      (c.gammaTotal || 0).toFixed(2),
      (c.oliviaTotal || 0).toFixed(2),
      (c.ttsTotal || 0).toFixed(2),
      (c.avatarTotal || 0).toFixed(2),
      c.grandTotal.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifescore-costs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="cost-dashboard-overlay" onClick={onClose}>
      <div className="cost-dashboard" onClick={e => e.stopPropagation()}>
        <div className="dashboard-header">
          <div className="header-title-section">
            <h2>Cost Tracking Dashboard</h2>
            {isLoading ? (
              <span className="last-saved" style={{ color: '#6b7280' }}>
                Loading data...
              </span>
            ) : lastSaved ? (
              <span className="last-saved">
                💾 {dataSource === 'database' ? 'Saved to database' : 'Saved locally'} • {lastSaved.toLocaleString()}
              </span>
            ) : user && dbConfigured ? (
              <span className="last-saved" style={{ color: '#f59e0b' }}>
                ⚠️ Not saved to database - click "Save Data" to persist
              </span>
            ) : (
              <span className="last-saved" style={{ color: '#6b7280' }}>
                Local storage only (sign in to save to cloud)
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="summary-section">
            <h3>Cost Summary</h3>
            <div className="summary-cards">
              <div className="summary-card total">
                <span className="card-icon">💰</span>
                <span className="card-label">Grand Total</span>
                <span className="card-value">{formatCost(summary.grandTotal)}</span>
              </div>
              <div className="summary-card">
                <span className="card-icon">📊</span>
                <span className="card-label">Total Comparisons</span>
                <span className="card-value">{summary.totalComparisons}</span>
              </div>
              <div className="summary-card">
                <span className="card-icon">⚡</span>
                <span className="card-label">Enhanced</span>
                <span className="card-value">{summary.enhancedComparisons}</span>
              </div>
              <div className="summary-card">
                <span className="card-icon">📈</span>
                <span className="card-label">Avg Enhanced Cost</span>
                <span className="card-value">{formatCost(summary.avgCostPerEnhanced)}</span>
              </div>
            </div>

            {/* Provider Breakdown */}
            <h3>Cost by Provider</h3>
            <div className="provider-breakdown">
              <div className="provider-row">
                <span className="provider-icon">🔎</span>
                <span className="provider-name">Tavily (Research + Search)</span>
                <span className="provider-cost">{formatCost(summary.tavilyCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.tavilyCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">🎵</span>
                <span className="provider-name">Claude Sonnet 4.5</span>
                <span className="provider-cost">{formatCost(summary.claudeSonnetCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.claudeSonnetCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">🤖</span>
                <span className="provider-name">GPT-4o</span>
                <span className="provider-cost">{formatCost(summary.gpt4oCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.gpt4oCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">💎</span>
                <span className="provider-name">Gemini 3 Pro</span>
                <span className="provider-cost">{formatCost(summary.geminiCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.geminiCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">🚀</span>
                <span className="provider-name">Grok 4</span>
                <span className="provider-cost">{formatCost(summary.grokCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.grokCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">🔍</span>
                <span className="provider-name">Perplexity Sonar</span>
                <span className="provider-cost">{formatCost(summary.perplexityCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.perplexityCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row highlight">
                <span className="provider-icon">🧠</span>
                <span className="provider-name">Claude Opus 4.5 (Judge)</span>
                <span className="provider-cost">{formatCost(summary.claudeOpusCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.claudeOpusCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">📊</span>
                <span className="provider-name">Gamma (Reports)</span>
                <span className="provider-cost">{formatCost(summary.gammaCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.gammaCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">💬</span>
                <span className="provider-name">Olivia (Chat Assistant)</span>
                <span className="provider-cost">{formatCost(summary.oliviaCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.oliviaCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">🔊</span>
                <span className="provider-name">TTS (ElevenLabs + OpenAI)</span>
                <span className="provider-cost">{formatCost(summary.ttsCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.ttsCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="provider-row">
                <span className="provider-icon">🎥</span>
                <span className="provider-name">Avatar (HeyGen + D-ID + Simli + Replicate)</span>
                <span className="provider-cost">{formatCost(summary.avatarCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.avatarCost / summary.grandTotal) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>

            {/* Profitability Section */}
            <h3>Profitability Analysis</h3>
            <div className="profitability">
              <div className="profit-row">
                <span>Avg Cost per Enhanced Comparison:</span>
                <strong>{formatCost(summary.avgCostPerEnhanced)}</strong>
              </div>
              <div className="profit-row">
                <span>Break-even price (20% margin):</span>
                <strong>{formatCost(summary.avgCostPerEnhanced * 1.25)}</strong>
              </div>
              <div className="profit-row">
                <span>Suggested price (50% margin):</span>
                <strong>{formatCost(summary.avgCostPerEnhanced * 2)}</strong>
              </div>
              <div className="profit-row">
                <span>Suggested price (100% margin):</span>
                <strong>{formatCost(summary.avgCostPerEnhanced * 3)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Recent Comparisons Table */}
        <div className="comparisons-section">
          <div className="section-header">
            <h3>Recent Comparisons ({costs.length})</h3>
            <div className="section-actions">
              <button className="action-btn" onClick={() => setShowPricing(!showPricing)}>
                {showPricing ? 'Hide Pricing' : 'Show Pricing'}
              </button>
              <button className="action-btn" onClick={handleExportCSV} disabled={costs.length === 0}>
                📥 Export CSV
              </button>
              <button className="action-btn save" onClick={handleSaveData} disabled={costs.length === 0 || isSaving || isLoading}>
                {isSaving ? '⏳ Saving...' : user && dbConfigured ? '💾 Save to Database' : '💾 Save Data'}
              </button>
              <button className="action-btn danger" onClick={handleClearData} disabled={costs.length === 0 || isSaving || isLoading}>
                🗑️ Delete All
              </button>
            </div>
          </div>
          {saveMessage && (
            <div className={`save-status ${saveMessage.includes('✓') ? 'success' : 'error'}`}>
              {saveMessage}
            </div>
          )}

          {/* Pricing Reference */}
          {showPricing && (
            <div className="pricing-table">
              <h4>API Pricing Reference (per 1M tokens)</h4>
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Input</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🧠 Claude Opus 4.5</td>
                    <td>$15.00</td>
                    <td>$75.00</td>
                  </tr>
                  <tr>
                    <td>🎵 Claude Sonnet 4.5</td>
                    <td>$3.00</td>
                    <td>$15.00</td>
                  </tr>
                  <tr>
                    <td>🤖 GPT-4o</td>
                    <td>$2.50</td>
                    <td>$10.00</td>
                  </tr>
                  <tr>
                    <td>💎 Gemini 3 Pro</td>
                    <td>$1.25</td>
                    <td>$5.00</td>
                  </tr>
                  <tr>
                    <td>🚀 Grok 4</td>
                    <td>$3.00</td>
                    <td>$15.00</td>
                  </tr>
                  <tr>
                    <td>🔍 Perplexity Sonar</td>
                    <td>$1.00</td>
                    <td>$5.00</td>
                  </tr>
                  <tr>
                    <td>🔎 Tavily</td>
                    <td colSpan={2}>~$0.01/credit (varies by plan)</td>
                  </tr>
                  <tr>
                    <td>📊 Gamma</td>
                    <td colSpan={2}>~$0.50/generation (varies by plan)</td>
                  </tr>
                  <tr>
                    <td>💬 GPT-4 Turbo (Olivia)</td>
                    <td>$10.00</td>
                    <td>$30.00</td>
                  </tr>
                  <tr>
                    <td>🔊 ElevenLabs TTS</td>
                    <td colSpan={2}>$0.18/1K chars</td>
                  </tr>
                  <tr>
                    <td>🗣️ OpenAI TTS</td>
                    <td colSpan={2}>$0.015/1K chars ($0.030 HD)</td>
                  </tr>
                  <tr>
                    <td>🎥 HeyGen Avatar</td>
                    <td colSpan={2}>$0.032/sec</td>
                  </tr>
                  <tr>
                    <td>👤 D-ID Avatar</td>
                    <td colSpan={2}>$0.025/sec</td>
                  </tr>
                  <tr>
                    <td>🎭 Simli Avatar</td>
                    <td colSpan={2}>$0.02/sec</td>
                  </tr>
                  <tr>
                    <td>🎬 Replicate SadTalker</td>
                    <td colSpan={2}>$0.0023/sec</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {costs.length === 0 ? (
            <div className="no-data">
              <span className="no-data-icon">📭</span>
              <p>No cost data recorded yet.</p>
              <p className="hint">Run some comparisons to start tracking costs.</p>
            </div>
          ) : (
            <div className="comparisons-list">
              {costs.slice(0, 20).map((cost, idx) => (
                <div
                  key={cost.comparisonId + idx}
                  className={`comparison-item ${selectedComparison?.comparisonId === cost.comparisonId ? 'selected' : ''}`}
                  onClick={() => setSelectedComparison(selectedComparison?.comparisonId === cost.comparisonId ? null : cost)}
                >
                  <div className="comparison-main">
                    <span className="comparison-cities">
                      {cost.city1} vs {cost.city2}
                    </span>
                    <span className={`comparison-mode ${cost.mode}`}>
                      {cost.mode}
                    </span>
                    <span className="comparison-date">
                      {new Date(cost.timestamp).toLocaleDateString()}
                    </span>
                    <span className="comparison-cost">
                      {formatCost(cost.grandTotal)}
                    </span>
                  </div>

                  {/* Expanded Detail */}
                  {selectedComparison?.comparisonId === cost.comparisonId && (
                    <div className="comparison-detail">
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="detail-label">Tavily</span>
                          <span className="detail-value">{formatCost(cost.tavilyTotal)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Claude Sonnet</span>
                          <span className="detail-value">
                            {formatCost(cost.claudeSonnet.reduce((s, c) => s + c.totalCost, 0))}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">GPT-4o</span>
                          <span className="detail-value">
                            {formatCost(cost.gpt4o.reduce((s, c) => s + c.totalCost, 0))}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gemini</span>
                          <span className="detail-value">
                            {formatCost(cost.gemini.reduce((s, c) => s + c.totalCost, 0))}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Grok</span>
                          <span className="detail-value">
                            {formatCost(cost.grok.reduce((s, c) => s + c.totalCost, 0))}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Perplexity</span>
                          <span className="detail-value">
                            {formatCost(cost.perplexity.reduce((s, c) => s + c.totalCost, 0))}
                          </span>
                        </div>
                        <div className="detail-item highlight">
                          <span className="detail-label">Opus Judge</span>
                          <span className="detail-value">
                            {formatCost(cost.opusJudge?.totalCost || 0)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gamma</span>
                          <span className="detail-value">
                            {formatCost(cost.gammaTotal || 0)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Olivia</span>
                          <span className="detail-value">
                            {formatCost(cost.oliviaTotal || 0)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">TTS</span>
                          <span className="detail-value">
                            {formatCost(cost.ttsTotal || 0)}
                          </span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Avatar</span>
                          <span className="detail-value">
                            {formatCost(cost.avatarTotal || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Token breakdown for expanded item */}
                      <div className="token-breakdown">
                        <h5>Token Usage</h5>
                        <div className="token-grid">
                          {cost.claudeSonnet.length > 0 && (
                            <div className="token-item">
                              <span>Sonnet:</span>
                              <span>
                                {cost.claudeSonnet.reduce((s, c) => s + c.inputTokens, 0).toLocaleString()} in /
                                {cost.claudeSonnet.reduce((s, c) => s + c.outputTokens, 0).toLocaleString()} out
                              </span>
                            </div>
                          )}
                          {cost.opusJudge && (
                            <div className="token-item">
                              <span>Opus:</span>
                              <span>
                                {cost.opusJudge.inputTokens.toLocaleString()} in /
                                {cost.opusJudge.outputTokens.toLocaleString()} out
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {costs.length > 20 && (
                <p className="more-hint">Showing 20 of {costs.length} comparisons. Export CSV for full data.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostDashboard;
