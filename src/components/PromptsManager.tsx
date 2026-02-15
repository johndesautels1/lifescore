/**
 * LIFE SCORE™ Prompts Manager Component
 *
 * Admin-editable prompts viewer with sub-tab navigation.
 * Displayed in the Help Modal under the "Prompts" tab.
 *
 * Sub-tabs: Evaluate | Judge | Olivia | Gamma | Video | InVideo
 * Admin can view and edit prompts inline.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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

const ADMIN_EMAILS = ['cluesnomads@gmail.com', 'brokerpinellas@gmail.com'];

// ============================================================================
// COMPONENT
// ============================================================================

const PromptsManager: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;

  // State
  const [activeCategory, setActiveCategory] = useState('evaluate');
  const [prompts, setPrompts] = useState<AppPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch prompts for active category
  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/prompts?category=${encodeURIComponent(activeCategory)}`);
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

  // Start editing a prompt
  const handleStartEdit = (prompt: AppPrompt) => {
    setEditingId(prompt.id);
    setEditText(prompt.prompt_text);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Save edited prompt
  const handleSaveEdit = async (promptId: string) => {
    if (!editText.trim()) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toastError('You must be logged in');
        return;
      }

      const response = await fetch('/api/prompts', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: promptId,
          prompt_text: editText,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      const result = await response.json();

      // Update local state
      setPrompts(prev => prev.map(p =>
        p.id === promptId
          ? { ...p, prompt_text: result.prompt.prompt_text, version: result.prompt.version, last_edited_by: result.prompt.last_edited_by, updated_at: result.prompt.updated_at }
          : p
      ));

      setEditingId(null);
      setEditText('');
      toastSuccess('Prompt saved successfully!');
    } catch (err) {
      console.error('[PromptsManager] Save error:', err);
      toastError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

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
      {/* Sub-tab navigation */}
      <div className="prompts-subtabs">
        {PROMPT_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`prompts-subtab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => { setActiveCategory(cat.id); setEditingId(null); }}
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
                    {isAdmin && editingId !== prompt.id && (
                      <button
                        className="prompt-action-btn edit-btn"
                        onClick={() => handleStartEdit(prompt)}
                        title="Edit prompt"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt content / editor */}
                {editingId === prompt.id ? (
                  <div className="prompt-editor">
                    <textarea
                      className="prompt-editor-textarea"
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={20}
                    />
                    <div className="prompt-editor-actions">
                      <button
                        className="prompt-editor-btn save-btn"
                        onClick={() => handleSaveEdit(prompt.id)}
                        disabled={isSaving || !editText.trim()}
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        className="prompt-editor-btn cancel-btn"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <pre className="prompt-card-text">{prompt.prompt_text}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptsManager;
