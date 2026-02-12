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
  type APICallCost,
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
import { toastConfirm } from '../utils/toast';
import './CostDashboard.css';

interface CostDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [costs, setCosts] = useState<ComparisonCostBreakdown[]>([]);
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<ComparisonCostBreakdown | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataSource, setDataSource] = useState<'database' | 'local'>('local');

  const dbConfigured = isSupabaseConfigured();

  // Convert a DB ApiCostRecord to ComparisonCostBreakdown for display
  const dbRecordToBreakdown = (record: ApiCostRecord): ComparisonCostBreakdown => {
    const makeCallCost = (provider: string, model: string, total: number, context: string): APICallCost[] =>
      total > 0 ? [{ provider, model, inputTokens: 0, outputTokens: 0, inputCost: 0, outputCost: 0, totalCost: total, timestamp: new Date(record.created_at).getTime(), context }] : [];

    const opusJudge: APICallCost | null = record.opus_judge_total > 0
      ? { provider: 'claude-opus', model: 'claude-opus-4-5', inputTokens: 0, outputTokens: 0, inputCost: 0, outputCost: 0, totalCost: record.opus_judge_total, timestamp: new Date(record.created_at).getTime(), context: 'judge' }
      : null;

    return {
      comparisonId: record.comparison_id,
      city1: record.city1_name,
      city2: record.city2_name,
      mode: record.mode,
      timestamp: new Date(record.created_at).getTime(),
      claudeSonnet: makeCallCost('claude-sonnet', 'claude-sonnet-4-5', record.claude_sonnet_total, 'evaluation'),
      gpt4o: makeCallCost('gpt-4o', 'gpt-4o', record.gpt4o_total, 'evaluation'),
      gemini: makeCallCost('gemini-3-pro', 'gemini-3-pro', record.gemini_total, 'evaluation'),
      grok: makeCallCost('grok-4', 'grok-4', record.grok_total, 'evaluation'),
      perplexity: makeCallCost('perplexity', 'perplexity-sonar', record.perplexity_total, 'evaluation'),
      evaluatorTotal: record.claude_sonnet_total + record.gpt4o_total + record.gemini_total + record.grok_total + record.perplexity_total,
      opusJudge,
      judgeTotal: record.opus_judge_total,
      tavilyResearch: null,
      tavilySearches: [],
      tavilyTotal: record.tavily_total,
      gamma: null,
      gammaTotal: record.gamma_total,
      olivia: [],
      oliviaTotal: record.olivia_total,
      tts: [],
      ttsTotal: record.tts_total,
      avatar: [],
      avatarTotal: record.avatar_total,
      kling: [],
      klingTotal: record.kling_total,
      grandTotal: record.grand_total,
    };
  };

  // Build a CostSummary from an array of breakdowns
  const buildSummary = (items: ComparisonCostBreakdown[]): CostSummary => {
    const enhancedCount = items.filter(c => c.mode === 'enhanced').length;
    const simpleCount = items.filter(c => c.mode === 'simple').length;
    const gt = items.reduce((s, c) => s + (c.grandTotal || 0), 0);
    return {
      totalComparisons: items.length,
      simpleComparisons: simpleCount,
      enhancedComparisons: enhancedCount,
      grandTotal: gt,
      tavilyCost: items.reduce((s, c) => s + (c.tavilyTotal || 0), 0),
      claudeSonnetCost: items.reduce((s, c) => s + c.claudeSonnet.reduce((a, x) => a + x.totalCost, 0), 0),
      gpt4oCost: items.reduce((s, c) => s + c.gpt4o.reduce((a, x) => a + x.totalCost, 0), 0),
      geminiCost: items.reduce((s, c) => s + c.gemini.reduce((a, x) => a + x.totalCost, 0), 0),
      grokCost: items.reduce((s, c) => s + c.grok.reduce((a, x) => a + x.totalCost, 0), 0),
      perplexityCost: items.reduce((s, c) => s + c.perplexity.reduce((a, x) => a + x.totalCost, 0), 0),
      claudeOpusCost: items.reduce((s, c) => s + (c.opusJudge?.totalCost || 0), 0),
      gammaCost: items.reduce((s, c) => s + (c.gammaTotal || 0), 0),
      oliviaCost: items.reduce((s, c) => s + (c.oliviaTotal || 0), 0),
      ttsCost: items.reduce((s, c) => s + (c.ttsTotal || 0), 0),
      avatarCost: items.reduce((s, c) => s + (c.avatarTotal || 0), 0),
      klingCost: items.reduce((s, c) => s + (c.klingTotal || 0), 0),
      totalEvaluatorCost: items.reduce((s, c) => s + (c.evaluatorTotal || 0), 0),
      totalJudgeCost: items.reduce((s, c) => s + (c.judgeTotal || 0), 0),
      totalGammaCost: items.reduce((s, c) => s + (c.gammaTotal || 0), 0),
      totalOliviaCost: items.reduce((s, c) => s + (c.oliviaTotal || 0), 0),
      totalTTSCost: items.reduce((s, c) => s + (c.ttsTotal || 0), 0),
      totalAvatarCost: items.reduce((s, c) => s + (c.avatarTotal || 0), 0),
      totalKlingCost: items.reduce((s, c) => s + (c.klingTotal || 0), 0),
      avgCostPerEnhanced: enhancedCount > 0 ? gt / enhancedCount : 0,
      avgCostPerSimple: simpleCount > 0 ? gt / simpleCount : 0,
    };
  };

  // Load cost data from database (if authenticated) or localStorage
  const loadCosts = useCallback(async () => {
    setIsLoading(true);

    // Always load localStorage data first (fast, offline-capable)
    const localCosts = getStoredCosts();

    // If user is authenticated and DB is configured, load from database
    if (user && dbConfigured) {
      try {
        const { data, error } = await getUserApiCosts(user.id, { limit: 100 });
        if (!error && data.length > 0) {
          setDataSource('database');
          setLastSaved(new Date(data[0].created_at));

          // Merge: DB records as primary, supplement with local-only records
          const dbBreakdowns = data.map(dbRecordToBreakdown);
          const dbComparisonIds = new Set(data.map(r => r.comparison_id));
          const localOnly = localCosts.filter(c => !dbComparisonIds.has(c.comparisonId));
          const merged = [...dbBreakdowns, ...localOnly];
          setCosts(merged);
          setSummary(buildSummary(merged));
        } else {
          // No DB data — use local
          setCosts(localCosts);
          setSummary(calculateCostSummary());
          if (localCosts.length > 0) {
            setDataSource('local');
          }
        }
      } catch (err) {
        console.warn('[CostDashboard] Failed to load from database, using local:', err);
        setCosts(localCosts);
        setSummary(calculateCostSummary());
        setDataSource('local');
      }
    } else {
      setCosts(localCosts);
      setSummary(calculateCostSummary());
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

  const handleClearData = () => {
    const deleteSource = user && dbConfigured ? 'database and browser' : 'browser';
    toastConfirm(`Delete ALL cost tracking data from your ${deleteSource}? This cannot be undone.`, async () => {
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
    });
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
      'Kling Cost',
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
      (c.klingTotal || 0).toFixed(2),
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
              <div className="provider-row">
                <span className="provider-icon">🖼️</span>
                <span className="provider-name">Kling AI (Image Generation)</span>
                <span className="provider-cost">{formatCost(summary.klingCost)}</span>
                <span className="provider-pct">
                  {summary.grandTotal > 0 ? ((summary.klingCost / summary.grandTotal) * 100).toFixed(1) : 0}%
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
              {/* Top row: Show Pricing and Export - centered */}
              <div className="section-actions-top">
                <button className="action-btn pricing" onClick={() => setShowPricing(!showPricing)}>
                  {showPricing ? 'Hide Pricing' : 'Show Pricing'}
                </button>
                <button className="action-btn" onClick={handleExportCSV} disabled={costs.length === 0}>
                  📥 Export
                </button>
              </div>
              {/* Bottom row: Save to Database and Delete All */}
              <div className="section-actions-bottom">
                <button className="action-btn save" onClick={handleSaveData} disabled={costs.length === 0 || isSaving || isLoading}>
                  {isSaving ? '⏳ Saving...' : user && dbConfigured ? '💾 Save to Database' : '💾 Save Data'}
                </button>
                <button className="action-btn danger" onClick={handleClearData} disabled={costs.length === 0 || isSaving || isLoading}>
                  🗑️ Delete All
                </button>
              </div>
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
                    <td>🎬 Replicate Wav2Lip</td>
                    <td colSpan={2}>$0.0014/sec</td>
                  </tr>
                  <tr>
                    <td>🖼️ Kling AI</td>
                    <td colSpan={2}>$0.05/image</td>
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
                        <div className="detail-item">
                          <span className="detail-label">Kling</span>
                          <span className="detail-value">
                            {formatCost(cost.klingTotal || 0)}
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
