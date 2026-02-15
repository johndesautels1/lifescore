/**
 * LIFE SCORE™ Environment Configuration Panel
 *
 * Admin-only panel that displays all environment variables used by the app.
 * Grouped by category with status indicators (configured/missing).
 * Fetches server-side env status from /api/admin/env-check.
 *
 * Displayed in the Help Modal under the "APIs" tab.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '../lib/supabase';
import './EnvConfigPanel.css';

// ============================================================================
// TYPES
// ============================================================================

interface EnvVarStatus {
  name: string;
  description: string;
  category: string;
  side: 'server' | 'client';
  configured: boolean;
  preview: string;
}

// ============================================================================
// CLIENT-SIDE VITE_* VARIABLES (readable from bundle)
// ============================================================================

function getClientVars(): EnvVarStatus[] {
  const clientDefs: { name: string; description: string }[] = [
    { name: 'VITE_SUPABASE_URL', description: 'Supabase project URL (client bundle)' },
    { name: 'VITE_SUPABASE_ANON_KEY', description: 'Supabase anonymous key (client bundle)' },
    { name: 'VITE_DEMO_ENABLED', description: 'Enable demo mode (true/false)' },
    { name: 'VITE_APP_URL', description: 'Base app URL for reports' },
    { name: 'VITE_ERROR_REPORTING_URL', description: 'Error reporting endpoint' },
    { name: 'VITE_AVATAR_PROVIDER', description: 'Avatar provider (simli/did/heygen)' },
  ];

  return clientDefs.map(d => {
    const val = (import.meta.env as Record<string, string | undefined>)[d.name] || '';
    return {
      name: d.name,
      description: d.description,
      category: 'Client-Side (VITE)',
      side: 'client' as const,
      configured: val.length > 0,
      preview: val ? maskLocal(val) : '',
    };
  });
}

function maskLocal(val: string): string {
  if (!val) return '';
  if (val.length <= 8) return val.substring(0, 2) + '***';
  return val.substring(0, 4) + '***' + val.substring(val.length - 2);
}

// ============================================================================
// COMPONENT
// ============================================================================

const EnvConfigPanel: React.FC = () => {
  const [serverVars, setServerVars] = useState<EnvVarStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedVars, setRevealedVars] = useState<Set<string>>(new Set());

  // Knowledge base sync state
  const [syncingOlivia, setSyncingOlivia] = useState(false);
  const [syncingEmilia, setSyncingEmilia] = useState(false);
  const [syncResult, setSyncResult] = useState<{ target: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/admin/env-check', { headers });
        if (!res.ok) {
          setError(res.status === 403 ? 'Admin access required' : 'Failed to load');
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          // Filter out client-side vars from server response (we read those locally)
          setServerVars(data.variables.filter((v: EnvVarStatus) => v.side === 'server'));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Network error');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const clientVars = getClientVars();
  const allVars = [...serverVars, ...clientVars];

  // Group by category
  const grouped = allVars.reduce<Record<string, EnvVarStatus[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  const totalConfigured = allVars.filter(v => v.configured).length;
  const totalVars = allVars.length;

  const toggleReveal = (name: string) => {
    setRevealedVars(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSync = useCallback(async (target: 'olivia' | 'emilia') => {
    const setLoading = target === 'olivia' ? setSyncingOlivia : setSyncingEmilia;
    setLoading(true);
    setSyncResult(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/sync-${target}-knowledge`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const label = target === 'olivia' ? 'Olivia' : 'Emilia';
        setSyncResult({ target, success: true, message: `${label} knowledge base synced successfully` });
      } else {
        setSyncResult({ target, success: false, message: data.error || 'Sync failed' });
      }
    } catch {
      setSyncResult({ target, success: false, message: 'Network error — could not reach server' });
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="env-config-panel">
        <div className="env-loading">
          <div className="env-loading-spinner" />
          <span>Loading environment status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="env-config-panel">
        <div className="env-error">
          <span className="env-error-icon">!</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="env-config-panel">
      {/* Summary Header */}
      <div className="env-summary">
        <div className="env-summary-title">
          <span className="env-summary-icon">&#x1F512;</span>
          Environment Variables
        </div>
        <div className="env-summary-stats">
          <span className="env-stat configured">{totalConfigured} configured</span>
          <span className="env-stat-divider">/</span>
          <span className="env-stat total">{totalVars} total</span>
          {totalVars - totalConfigured > 0 && (
            <span className="env-stat missing">{totalVars - totalConfigured} missing</span>
          )}
        </div>
        <p className="env-summary-note">
          All API keys are managed via Vercel environment variables.
          This panel shows current configuration status as an emergency reference.
        </p>
      </div>

      {/* Knowledge Base Sync */}
      <div className="env-category env-sync-section">
        <div className="env-category-header">
          <h4 className="env-category-title">AI Knowledge Base Sync</h4>
        </div>
        <p className="env-sync-description">
          Push updated manuals to OpenAI Assistants. Run after editing any documentation.
        </p>
        <div className="env-sync-buttons">
          <button
            className="env-sync-btn"
            onClick={() => handleSync('emilia')}
            disabled={syncingEmilia}
          >
            {syncingEmilia ? (
              <><span className="env-sync-spinner" /> Syncing Emilia...</>
            ) : (
              <>Sync Emilia (6 manuals)</>
            )}
          </button>
          <button
            className="env-sync-btn"
            onClick={() => handleSync('olivia')}
            disabled={syncingOlivia}
          >
            {syncingOlivia ? (
              <><span className="env-sync-spinner" /> Syncing Olivia...</>
            ) : (
              <>Sync Olivia (knowledge base)</>
            )}
          </button>
        </div>
        {syncResult && (
          <div className={`env-sync-result ${syncResult.success ? 'success' : 'error'}`}>
            {syncResult.success ? '✓' : '!'} {syncResult.message}
          </div>
        )}
      </div>

      {/* Category Groups */}
      {Object.entries(grouped).map(([category, vars]) => {
        const catConfigured = vars.filter(v => v.configured).length;
        return (
          <div key={category} className="env-category">
            <div className="env-category-header">
              <h4 className="env-category-title">{category}</h4>
              <span className={`env-category-badge ${catConfigured === vars.length ? 'all-set' : 'partial'}`}>
                {catConfigured}/{vars.length}
              </span>
            </div>
            <div className="env-var-list">
              {vars.map(v => (
                <div key={v.name} className={`env-var-row ${v.configured ? 'configured' : 'missing'}`}>
                  <div className="env-var-status">
                    {v.configured ? (
                      <span className="env-dot green" title="Configured" />
                    ) : (
                      <span className="env-dot red" title="Not configured" />
                    )}
                  </div>
                  <div className="env-var-info">
                    <code className="env-var-name">{v.name}</code>
                    <span className="env-var-desc">{v.description}</span>
                  </div>
                  <div className="env-var-preview">
                    {v.configured && v.preview && (
                      <button
                        className="env-reveal-btn"
                        onClick={() => toggleReveal(v.name)}
                        title={revealedVars.has(v.name) ? 'Hide' : 'Show preview'}
                      >
                        {revealedVars.has(v.name) ? (
                          <code className="env-preview-text">{v.preview}</code>
                        ) : (
                          <span className="env-hidden-icon">&#x1F441;</span>
                        )}
                      </button>
                    )}
                    {!v.configured && (
                      <span className="env-not-set">NOT SET</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EnvConfigPanel;
