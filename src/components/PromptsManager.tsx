/**
 * LIFE SCORE™ Prompts Manager Component
 *
 * Read-only viewer of the prompt copies in the app_prompts table, with
 * sub-tab navigation. Displayed in the Help Modal under the "Prompts" tab.
 *
 * Sub-tabs: Evaluate | Judge | Olivia | Gamma | Video | InVideo
 *
 * John, 4 Oct 2026 ("Say so, read-only"): nothing in the app reads app_prompts —
 * the prompts that run are built in the code (fault GR4 in
 * docs/MASTER_BUG_AUDIT_20260220.md) — so the screen says these are reference
 * copies and no longer offers editing; api/prompts.ts refuses edits too.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '../lib/supabase';
import { toastSuccess, toastError } from '../utils/toast';
import './PromptsManager.css';

// ============================================================================
// TYPES
// ============================================================================

interface AppPrompt {
  id: string;
  category: string;
  prompt_key: string;
  display_name: string;
  description: string | null;
  prompt_text: string;
  version: number;
  last_edited_by: string | null;
  updated_at: string;
}

// Sub-tab configuration — ordered by evaluation pipeline flow
const PROMPT_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'evaluate', label: 'Evaluate', icon: '🔬' },
  { id: 'judge', label: 'Judge', icon: '⚖️' },
  { id: 'olivia', label: 'Olivia', icon: '🎙️' },
  { id: 'gamma', label: 'Gamma', icon: '📊' },
  { id: 'video', label: 'Video', icon: '🎥' },
  { id: 'invideo', label: 'InVideo', icon: '🎬' },
];

// ============================================================================
// COMPONENT
// ============================================================================

const PromptsManager: React.FC = () => {
  // State
  const [activeCategory, setActiveCategory] = useState('evaluate');
  const [prompts, setPrompts] = useState<AppPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch prompts for active category
  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/prompts?category=${encodeURIComponent(activeCategory)}`, {
        headers: authHeaders,
      });
      if (!response.ok) throw new Error('Failed to load prompts');

      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error('[PromptsManager] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Copy prompt to clipboard
  const handleCopy = async (prompt: AppPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.prompt_text);
      setCopiedId(prompt.id);
      toastSuccess('Prompt copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toastError('Failed to copy');
    }
  };

  // Format date
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="prompts-manager">
      {/* What these are */}
      <div className="prompts-notice" role="note">
        <strong>Reference copies — not used by the app.</strong>{' '}
        The prompts that run are built in the code, so these copies can be out of date and cannot be edited here.
        The Judge Equations, Gamma Prompts and Technical Support manuals describe the prompts in use.
      </div>

      {/* Sub-tab navigation */}
      <div className="prompts-subtabs">
        {PROMPT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`prompts-subtab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="subtab-icon">{cat.icon}</span>
            <span className="subtab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="prompts-content">
        {isLoading ? (
          <div className="prompts-loading">
            <div className="prompts-spinner"></div>
            <span>Loading prompts...</span>
          </div>
        ) : error ? (
          <div className="prompts-error">
            <span>Failed to load prompts</span>
            <button onClick={fetchPrompts}>Retry</button>
          </div>
        ) : prompts.length === 0 ? (
          <div className="prompts-empty">
            <span className="empty-icon">📝</span>
            <p>No prompts in this category yet.</p>
            <p className="empty-hint">
              Prompts will appear here once added to the database.
            </p>
          </div>
        ) : (
          <div className="prompts-list">
            {prompts.map(prompt => (
              <div key={prompt.id} className="prompt-card">
                {/* Prompt header */}
                <div className="prompt-card-header">
                  <div className="prompt-card-info">
                    <h3 className="prompt-card-title">{prompt.display_name}</h3>
                    {prompt.description && (
                      <p className="prompt-card-desc">{prompt.description}</p>
                    )}
                    <div className="prompt-card-meta">
                      <span>v{prompt.version}</span>
                      <span className="meta-dot">·</span>
                      <span>{formatDate(prompt.updated_at)}</span>
                      {prompt.last_edited_by && (
                        <>
                          <span className="meta-dot">·</span>
                          <span>{prompt.last_edited_by}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="prompt-card-actions">
                    <button
                      className={`prompt-action-btn copy-btn ${copiedId === prompt.id ? 'copied' : ''}`}
                      onClick={() => handleCopy(prompt)}
                      title="Copy to clipboard"
                    >
                      {copiedId === prompt.id ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>

                {/* Prompt content */}
                <pre className="prompt-card-text">{prompt.prompt_text}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptsManager;
