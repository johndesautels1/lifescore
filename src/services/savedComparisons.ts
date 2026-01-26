/**
 * Saved Comparisons Service
 * Dual storage: localStorage (offline) + GitHub Gists (cloud sync)
 *
 * Clues Intelligence LTD
 * © 2025 All Rights Reserved
 */

import type { ComparisonResult } from '../types/metrics';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import { fetchWithTimeout } from '../lib/fetchWithTimeout';
import { supabase, isSupabaseConfigured, getCurrentUser, SUPABASE_TIMEOUT_MS } from '../lib/supabase';

/**
 * Wrap a Supabase query with 45s timeout
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number = SUPABASE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase query timeout after ${ms}ms`)), ms)
    ),
  ]);
}
import {
  saveComparison as dbSaveComparison,
  getUserComparisons as dbGetUserComparisons,
  deleteComparison as dbDeleteComparison,
  updateComparison as dbUpdateComparison,
} from './databaseService';

// ============================================================================
// TYPES
// ============================================================================

export interface SavedComparison {
  id: string;
  result: ComparisonResult;
  savedAt: string;
  nickname?: string;
  synced?: boolean; // True if synced to GitHub
}

export interface GitHubConfig {
  accessToken: string;
  gistId?: string; // Created on first sync
}

export interface StorageState {
  comparisons: SavedComparison[];
  github?: GitHubConfig;
  lastSyncedAt?: string;
}

export interface SavedEnhancedComparison {
  id: string;
  result: EnhancedComparisonResult;
  savedAt: string;
  nickname?: string;
}

// ============================================================================
// GAMMA REPORT TYPES
// ============================================================================

export interface SavedGammaReport {
  id: string;                    // Unique report ID
  comparisonId: string;          // Links to the comparison this report is for
  city1: string;
  city2: string;
  gammaUrl: string;              // URL to the Gamma presentation
  pdfUrl?: string;               // Optional PDF download URL
  pptxUrl?: string;              // Optional PPTX download URL
  generationId: string;          // Gamma's generation ID
  savedAt: string;
  nickname?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCAL_STORAGE_KEY = 'lifescore_saved_comparisons';
const ENHANCED_STORAGE_KEY = 'lifescore_saved_enhanced';
const GAMMA_REPORTS_KEY = 'lifescore_saved_gamma_reports';
const GITHUB_CONFIG_KEY = 'lifescore_github_config';
const GIST_FILENAME = 'lifescore_comparisons.json';
const GIST_DESCRIPTION = 'LIFE SCORE™ Saved City Comparisons';
const GITHUB_TIMEOUT_MS = 60000; // 60 seconds for GitHub API calls
const MAX_SAVED = 100;

// ============================================================================
// LOCAL STORAGE OPERATIONS
// ============================================================================

/**
 * Get all saved comparisons from localStorage
 */
export function getLocalComparisons(): SavedComparison[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedComparison[];
  } catch (error) {
    console.error('Error loading local comparisons:', error);
    return [];
  }
}

/**
 * Save comparisons to localStorage
 */
function saveLocalComparisons(comparisons: SavedComparison[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(comparisons));
    console.log('[savedComparisons] Saved', comparisons.length, 'comparisons to localStorage');
  } catch (error) {
    console.error('[savedComparisons] Failed to save to localStorage:', error);
  }
}

/**
 * Get GitHub config from localStorage
 */
export function getGitHubConfig(): GitHubConfig | null {
  try {
    const stored = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as GitHubConfig;
  } catch {
    return null;
  }
}

/**
 * Save GitHub config to localStorage
 */
export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Clear GitHub config
 */
export function clearGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
}

// ============================================================================
// LOCAL CRUD OPERATIONS
// ============================================================================

/**
 * Save a comparison locally AND to Supabase database if user is authenticated
 */
export async function saveComparisonLocal(result: ComparisonResult, nickname?: string): Promise<SavedComparison> {
  const comparisons = getLocalComparisons();

  const existingIndex = comparisons.findIndex(c => c.id === result.comparisonId);

  const saved: SavedComparison = {
    id: result.comparisonId,
    result,
    savedAt: new Date().toISOString(),
    nickname,
    synced: false
  };

  if (existingIndex >= 0) {
    comparisons[existingIndex] = saved;
  } else {
    comparisons.unshift(saved);
    if (comparisons.length > MAX_SAVED) {
      comparisons.pop();
    }
  }

  saveLocalComparisons(comparisons);

  // Also save to Supabase database if user is authenticated
  if (isSupabaseConfigured()) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { error } = await dbSaveComparison(user.id, result as unknown as Record<string, unknown>, nickname);
        if (error) {
          console.error('[savedComparisons] Database save failed:', error);
        } else {
          // Mark as synced
          saved.synced = true;
          const updatedComparisons = getLocalComparisons();
          const idx = updatedComparisons.findIndex(c => c.id === result.comparisonId);
          if (idx >= 0) {
            updatedComparisons[idx].synced = true;
            saveLocalComparisons(updatedComparisons);
          }
          console.log('[savedComparisons] Saved to database:', result.comparisonId);
        }
      }
    } catch (err) {
      console.error('[savedComparisons] Database sync error:', err);
    }
  }

  return saved;
}

/**
 * Save a comparison locally (sync version for backwards compatibility)
 */
export function saveComparisonLocalSync(result: ComparisonResult, nickname?: string): SavedComparison {
  const comparisons = getLocalComparisons();

  const existingIndex = comparisons.findIndex(c => c.id === result.comparisonId);

  const saved: SavedComparison = {
    id: result.comparisonId,
    result,
    savedAt: new Date().toISOString(),
    nickname,
    synced: false
  };

  if (existingIndex >= 0) {
    comparisons[existingIndex] = saved;
  } else {
    comparisons.unshift(saved);
    if (comparisons.length > MAX_SAVED) {
      comparisons.pop();
    }
  }

  saveLocalComparisons(comparisons);

  // Fire and forget database save
  if (isSupabaseConfigured()) {
    getCurrentUser().then(user => {
      if (user) {
        dbSaveComparison(user.id, result as unknown as Record<string, unknown>, nickname)
          .then(({ error }) => {
            if (error) {
              console.error('[savedComparisons] Database save failed:', error);
            } else {
              console.log('[savedComparisons] Saved to database:', result.comparisonId);
            }
          });
      }
    }).catch(console.error);
  }

  return saved;
}

/**
 * Delete a comparison locally AND from Supabase database if user is authenticated
 */
export async function deleteComparisonLocal(id: string): Promise<boolean> {
  console.log('[savedComparisons] deleteComparisonLocal called with id:', id);
  const comparisons = getLocalComparisons();
  console.log('[savedComparisons] Current comparisons count:', comparisons.length);
  const filtered = comparisons.filter(c => c.id !== id);
  console.log('[savedComparisons] After filter count:', filtered.length);

  if (filtered.length === comparisons.length) {
    console.log('[savedComparisons] Comparison not found, nothing to delete');
    return false;
  }

  saveLocalComparisons(filtered);
  console.log('[savedComparisons] Delete successful, saved to localStorage');

  // Also delete from Supabase database if user is authenticated
  if (isSupabaseConfigured()) {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Find the database record by comparison_id
        const { data } = await withTimeout(
          supabase
            .from('comparisons')
            .select('id')
            .eq('user_id', user.id)
            .eq('comparison_id', id)
            .single()
        );

        if (data) {
          await dbDeleteComparison(data.id);
          console.log('[savedComparisons] Deleted from database:', id);
        }
      }
    } catch (err) {
      console.error('[savedComparisons] Database delete error:', err);
    }
  }

  return true;
}

/**
 * Update nickname locally AND in Supabase database if user is authenticated
 */
export async function updateNicknameLocal(id: string, nickname: string): Promise<boolean> {
  const comparisons = getLocalComparisons();
  const comparison = comparisons.find(c => c.id === id);

  if (!comparison) return false;

  comparison.nickname = nickname;
  comparison.synced = false;
  saveLocalComparisons(comparisons);

  // Also update in Supabase database if user is authenticated
  if (isSupabaseConfigured()) {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Find the database record by comparison_id
        const { data } = await withTimeout(
          supabase
            .from('comparisons')
            .select('id')
            .eq('user_id', user.id)
            .eq('comparison_id', id)
            .single()
        );

        if (data) {
          await dbUpdateComparison(data.id, { nickname });
          comparison.synced = true;
          saveLocalComparisons(comparisons);
          console.log('[savedComparisons] Updated nickname in database:', id);
        }
      }
    } catch (err) {
      console.error('[savedComparisons] Database nickname update error:', err);
    }
  }

  return true;
}

/**
 * Check if comparison is saved
 */
export function isComparisonSaved(comparisonId: string): boolean {
  return getLocalComparisons().some(c => c.id === comparisonId);
}

/**
 * Clear all local comparisons
 */
export function clearAllLocal(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

// ============================================================================
// ENHANCED COMPARISON STORAGE
// ============================================================================

/**
 * Get all saved enhanced comparisons from localStorage
 */
export function getLocalEnhancedComparisons(): SavedEnhancedComparison[] {
  try {
    const stored = localStorage.getItem(ENHANCED_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedEnhancedComparison[];
  } catch (error) {
    console.error('Error loading enhanced comparisons:', error);
    return [];
  }
}

/**
 * Save enhanced comparisons to localStorage
 */
function saveLocalEnhancedComparisons(comparisons: SavedEnhancedComparison[]): void {
  try {
    localStorage.setItem(ENHANCED_STORAGE_KEY, JSON.stringify(comparisons));
    console.log('[savedComparisons] Saved', comparisons.length, 'enhanced comparisons to localStorage');
  } catch (error) {
    console.error('[savedComparisons] Failed to save enhanced to localStorage:', error);
  }
}

/**
 * Save an enhanced comparison locally AND to Supabase database if user is authenticated
 */
export async function saveEnhancedComparisonLocal(result: EnhancedComparisonResult, nickname?: string): Promise<SavedEnhancedComparison> {
  const comparisons = getLocalEnhancedComparisons();

  const existingIndex = comparisons.findIndex(c => c.id === result.comparisonId);

  const saved: SavedEnhancedComparison = {
    id: result.comparisonId,
    result,
    savedAt: new Date().toISOString(),
    nickname
  };

  if (existingIndex >= 0) {
    comparisons[existingIndex] = saved;
  } else {
    comparisons.unshift(saved);
    if (comparisons.length > MAX_SAVED) {
      comparisons.pop();
    }
  }

  saveLocalEnhancedComparisons(comparisons);

  // Also save to Supabase database if user is authenticated
  if (isSupabaseConfigured()) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const { error } = await dbSaveComparison(user.id, result as unknown as Record<string, unknown>, nickname);
        if (error) {
          console.error('[savedComparisons] Database save enhanced failed:', error);
        } else {
          console.log('[savedComparisons] Enhanced comparison saved to database:', result.comparisonId);
        }
      }
    } catch (err) {
      console.error('[savedComparisons] Database sync error for enhanced:', err);
    }
  }

  return saved;
}

/**
 * Save an enhanced comparison locally (sync version for backwards compatibility)
 */
export function saveEnhancedComparisonLocalSync(result: EnhancedComparisonResult, nickname?: string): SavedEnhancedComparison {
  const comparisons = getLocalEnhancedComparisons();

  const existingIndex = comparisons.findIndex(c => c.id === result.comparisonId);

  const saved: SavedEnhancedComparison = {
    id: result.comparisonId,
    result,
    savedAt: new Date().toISOString(),
    nickname
  };

  if (existingIndex >= 0) {
    comparisons[existingIndex] = saved;
  } else {
    comparisons.unshift(saved);
    if (comparisons.length > MAX_SAVED) {
      comparisons.pop();
    }
  }

  saveLocalEnhancedComparisons(comparisons);

  // Fire and forget database save
  if (isSupabaseConfigured()) {
    getCurrentUser().then(user => {
      if (user) {
        dbSaveComparison(user.id, result as unknown as Record<string, unknown>, nickname)
          .then(({ error }) => {
            if (error) {
              console.error('[savedComparisons] Database save enhanced failed:', error);
            } else {
              console.log('[savedComparisons] Enhanced comparison saved to database:', result.comparisonId);
            }
          });
      }
    }).catch(console.error);
  }

  return saved;
}

/**
 * Check if enhanced comparison is saved
 */
export function isEnhancedComparisonSaved(comparisonId: string): boolean {
  return getLocalEnhancedComparisons().some(c => c.id === comparisonId);
}

/**
 * Delete an enhanced comparison locally AND from Supabase database
 */
export async function deleteEnhancedComparisonLocal(id: string): Promise<boolean> {
  console.log('[savedComparisons] deleteEnhancedComparisonLocal called with id:', id);
  const comparisons = getLocalEnhancedComparisons();
  console.log('[savedComparisons] Current enhanced comparisons count:', comparisons.length);
  const filtered = comparisons.filter(c => c.id !== id);
  console.log('[savedComparisons] After filter count:', filtered.length);

  if (filtered.length === comparisons.length) {
    console.log('[savedComparisons] Enhanced comparison not found, nothing to delete');
    return false;
  }

  saveLocalEnhancedComparisons(filtered);
  console.log('[savedComparisons] Enhanced delete successful, saved to localStorage');

  // Also delete from Supabase database if user is authenticated
  if (isSupabaseConfigured()) {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Find the database record by comparison_id
        const { data } = await withTimeout(
          supabase
            .from('comparisons')
            .select('id')
            .eq('user_id', user.id)
            .eq('comparison_id', id)
            .single()
        );

        if (data) {
          await dbDeleteComparison(data.id);
          console.log('[savedComparisons] Deleted enhanced from database:', id);
        }
      }
    } catch (err) {
      console.error('[savedComparisons] Database delete enhanced error:', err);
    }
  }

  return true;
}

// ============================================================================
// GAMMA REPORT STORAGE
// ============================================================================

const MAX_GAMMA_REPORTS = 50;

/**
 * Get all saved Gamma reports from localStorage
 */
export function getSavedGammaReports(): SavedGammaReport[] {
  try {
    const stored = localStorage.getItem(GAMMA_REPORTS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedGammaReport[];
  } catch (error) {
    console.error('Error loading Gamma reports:', error);
    return [];
  }
}

/**
 * Save Gamma reports to localStorage
 */
function saveGammaReportsLocal(reports: SavedGammaReport[]): void {
  localStorage.setItem(GAMMA_REPORTS_KEY, JSON.stringify(reports));
}

/**
 * Save a Gamma report locally
 */
export function saveGammaReport(report: Omit<SavedGammaReport, 'id' | 'savedAt'>): SavedGammaReport {
  const reports = getSavedGammaReports();

  // Generate unique ID
  const id = `gamma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const saved: SavedGammaReport = {
    ...report,
    id,
    savedAt: new Date().toISOString(),
  };

  // Add to beginning of array
  reports.unshift(saved);

  // Trim if too many
  if (reports.length > MAX_GAMMA_REPORTS) {
    reports.pop();
  }

  saveGammaReportsLocal(reports);
  return saved;
}

/**
 * Get Gamma reports for a specific comparison
 */
export function getGammaReportsForComparison(comparisonId: string): SavedGammaReport[] {
  return getSavedGammaReports().filter(r => r.comparisonId === comparisonId);
}

/**
 * Check if a Gamma report exists for a comparison
 */
export function hasGammaReportForComparison(comparisonId: string): boolean {
  return getSavedGammaReports().some(r => r.comparisonId === comparisonId);
}

/**
 * Delete a Gamma report
 */
export function deleteGammaReport(id: string): boolean {
  const reports = getSavedGammaReports();
  const filtered = reports.filter(r => r.id !== id);

  if (filtered.length === reports.length) {
    return false;
  }

  saveGammaReportsLocal(filtered);
  return true;
}

/**
 * Update nickname for a Gamma report
 */
export function updateGammaReportNickname(id: string, nickname: string): boolean {
  const reports = getSavedGammaReports();
  const report = reports.find(r => r.id === id);

  if (!report) return false;

  report.nickname = nickname;
  saveGammaReportsLocal(reports);
  return true;
}

/**
 * Clear all Gamma reports
 */
export function clearAllGammaReports(): void {
  localStorage.removeItem(GAMMA_REPORTS_KEY);
}

// ============================================================================
// GITHUB GIST OPERATIONS
// ============================================================================

/**
 * Create a new GitHub Gist for storing comparisons
 */
async function createGist(token: string, comparisons: SavedComparison[]): Promise<string> {
  const response = await fetchWithTimeout(
    'https://api.github.com/gists',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false, // Secret gist
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify({ comparisons, lastUpdated: new Date().toISOString() }, null, 2)
          }
        }
      })
    },
    GITHUB_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create Gist');
  }

  const gist = await response.json();
  return gist.id;
}

/**
 * Update existing GitHub Gist
 */
async function updateGist(token: string, gistId: string, comparisons: SavedComparison[]): Promise<void> {
  const response = await fetchWithTimeout(
    `https://api.github.com/gists/${gistId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify({ comparisons, lastUpdated: new Date().toISOString() }, null, 2)
          }
        }
      })
    },
    GITHUB_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update Gist');
  }
}

/**
 * Fetch comparisons from GitHub Gist
 */
async function fetchGist(token: string, gistId: string): Promise<SavedComparison[]> {
  const response = await fetchWithTimeout(
    `https://api.github.com/gists/${gistId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    },
    GITHUB_TIMEOUT_MS
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Gist not found - it may have been deleted');
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch Gist');
  }

  const gist = await response.json();
  const file = gist.files[GIST_FILENAME];

  if (!file) {
    return [];
  }

  const data = JSON.parse(file.content);
  return data.comparisons || [];
}

/**
 * Delete GitHub Gist
 */
async function deleteGist(token: string, gistId: string): Promise<void> {
  const response = await fetchWithTimeout(
    `https://api.github.com/gists/${gistId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    },
    GITHUB_TIMEOUT_MS
  );

  if (!response.ok && response.status !== 404) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete Gist');
  }
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Sync local comparisons to GitHub
 */
export async function syncToGitHub(): Promise<{ success: boolean; message: string }> {
  const config = getGitHubConfig();

  if (!config?.accessToken) {
    return { success: false, message: 'GitHub not connected. Please connect your GitHub account first.' };
  }

  try {
    const localComparisons = getLocalComparisons();

    if (config.gistId) {
      // Update existing gist
      await updateGist(config.accessToken, config.gistId, localComparisons);
    } else {
      // Create new gist
      const gistId = await createGist(config.accessToken, localComparisons);
      config.gistId = gistId;
      saveGitHubConfig(config);
    }

    // Mark all as synced
    const syncedComparisons = localComparisons.map(c => ({ ...c, synced: true }));
    saveLocalComparisons(syncedComparisons);

    return { success: true, message: `Synced ${localComparisons.length} comparisons to GitHub` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Sync failed' };
  }
}

/**
 * Pull comparisons from GitHub and merge with local
 */
export async function pullFromGitHub(): Promise<{ success: boolean; message: string; added: number }> {
  const config = getGitHubConfig();

  if (!config?.accessToken || !config.gistId) {
    return { success: false, message: 'GitHub not connected or no data to pull.', added: 0 };
  }

  try {
    const remoteComparisons = await fetchGist(config.accessToken, config.gistId);
    const localComparisons = getLocalComparisons();

    // Merge: remote wins for conflicts, add new from both
    const mergedMap = new Map<string, SavedComparison>();

    // Add local first
    localComparisons.forEach(c => mergedMap.set(c.id, c));

    // Remote overwrites and adds new
    let addedCount = 0;
    remoteComparisons.forEach(c => {
      if (!mergedMap.has(c.id)) {
        addedCount++;
      }
      mergedMap.set(c.id, { ...c, synced: true });
    });

    // Sort by savedAt descending
    const merged = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, MAX_SAVED);

    saveLocalComparisons(merged);

    return { success: true, message: `Pulled ${remoteComparisons.length} comparisons from GitHub`, added: addedCount };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Pull failed', added: 0 };
  }
}

/**
 * Connect GitHub account with Personal Access Token
 */
export async function connectGitHub(accessToken: string): Promise<{ success: boolean; message: string; username?: string }> {
  try {
    // Verify token by fetching user info
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      return { success: false, message: 'Invalid token. Please check your Personal Access Token.' };
    }

    const user = await response.json();

    // Save config
    const config: GitHubConfig = { accessToken };
    saveGitHubConfig(config);

    return { success: true, message: `Connected as ${user.login}`, username: user.login };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
}

/**
 * Disconnect GitHub account
 */
export async function disconnectGitHub(deleteRemote: boolean = false): Promise<void> {
  const config = getGitHubConfig();

  if (deleteRemote && config?.accessToken && config.gistId) {
    try {
      await deleteGist(config.accessToken, config.gistId);
    } catch (error) {
      console.error('Failed to delete remote Gist:', error);
    }
  }

  clearGitHubConfig();
}

/**
 * Check if GitHub is connected
 */
export function isGitHubConnected(): boolean {
  const config = getGitHubConfig();
  return !!config?.accessToken;
}

/**
 * Get sync status
 */
export function getSyncStatus(): { connected: boolean; hasPendingChanges: boolean; gistId?: string } {
  const config = getGitHubConfig();
  const comparisons = getLocalComparisons();
  const hasPendingChanges = comparisons.some(c => !c.synced);

  return {
    connected: !!config?.accessToken,
    hasPendingChanges,
    gistId: config?.gistId
  };
}

// ============================================================================
// EXPORT/IMPORT
// ============================================================================

/**
 * Export comparisons as JSON file
 */
export function exportToJSON(): string {
  const comparisons = getLocalComparisons();
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    comparisons
  }, null, 2);
}

/**
 * Import comparisons from JSON
 */
export function importFromJSON(json: string): { success: boolean; message: string; count: number } {
  try {
    const data = JSON.parse(json);
    const imported = data.comparisons as SavedComparison[];

    if (!Array.isArray(imported)) {
      return { success: false, message: 'Invalid format: no comparisons array found', count: 0 };
    }

    const existing = getLocalComparisons();
    const existingIds = new Set(existing.map(c => c.id));

    let addedCount = 0;
    imported.forEach(comparison => {
      if (!existingIds.has(comparison.id)) {
        existing.push({ ...comparison, synced: false });
        addedCount++;
      }
    });

    // Sort and trim
    existing.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    const trimmed = existing.slice(0, MAX_SAVED);

    saveLocalComparisons(trimmed);

    return { success: true, message: `Imported ${addedCount} new comparisons`, count: addedCount };
  } catch (error) {
    return { success: false, message: 'Invalid JSON file', count: 0 };
  }
}

// ============================================================================
// SUPABASE DATABASE SYNC OPERATIONS
// ============================================================================

/**
 * Load comparisons from Supabase database and merge with localStorage
 * Called when user logs in or opens the app while logged in
 */
export async function pullFromDatabase(): Promise<{ success: boolean; message: string; added: number }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Database not configured.', added: 0 };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'User not logged in.', added: 0 };
    }

    const { data: dbComparisons, error } = await dbGetUserComparisons(user.id, { limit: MAX_SAVED });

    if (error) {
      return { success: false, message: error.message, added: 0 };
    }

    const localComparisons = getLocalComparisons();
    const localEnhanced = getLocalEnhancedComparisons();

    // Merge database comparisons into local storage
    const mergedMap = new Map<string, SavedComparison>();
    const mergedEnhancedMap = new Map<string, SavedEnhancedComparison>();

    // Add local first
    localComparisons.forEach(c => mergedMap.set(c.id, c));
    localEnhanced.forEach(c => mergedEnhancedMap.set(c.id, c));

    // Add database comparisons (database wins for conflicts)
    let addedCount = 0;
    for (const dbComp of dbComparisons) {
      const compResult = dbComp.comparison_result as Record<string, unknown>;
      const isEnhanced = 'llmsUsed' in compResult && Array.isArray(compResult.llmsUsed);
      const comparisonId = dbComp.comparison_id;

      if (isEnhanced) {
        if (!mergedEnhancedMap.has(comparisonId)) {
          addedCount++;
        }
        mergedEnhancedMap.set(comparisonId, {
          id: comparisonId,
          result: compResult as unknown as EnhancedComparisonResult,
          savedAt: dbComp.created_at,
          nickname: dbComp.nickname || undefined,
        });
      } else {
        if (!mergedMap.has(comparisonId)) {
          addedCount++;
        }
        mergedMap.set(comparisonId, {
          id: comparisonId,
          result: compResult as unknown as ComparisonResult,
          savedAt: dbComp.created_at,
          nickname: dbComp.nickname || undefined,
          synced: true,
        });
      }
    }

    // Sort and save
    const mergedStandard = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, MAX_SAVED);

    const mergedEnhanced = Array.from(mergedEnhancedMap.values())
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      .slice(0, MAX_SAVED);

    saveLocalComparisons(mergedStandard);
    saveLocalEnhancedComparisons(mergedEnhanced);

    console.log(`[savedComparisons] Pulled ${dbComparisons.length} from database, added ${addedCount} new`);
    return {
      success: true,
      message: `Pulled ${dbComparisons.length} comparisons from database`,
      added: addedCount
    };
  } catch (error) {
    console.error('[savedComparisons] Database pull error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Pull failed', added: 0 };
  }
}

/**
 * Sync all unsynced local comparisons to Supabase database
 * Called when user logs in or manually triggers sync
 */
export async function syncToDatabase(): Promise<{ success: boolean; message: string; synced: number }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Database not configured.', synced: 0 };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'User not logged in.', synced: 0 };
    }

    const localComparisons = getLocalComparisons();
    const localEnhanced = getLocalEnhancedComparisons();
    let syncedCount = 0;

    // Sync unsynced standard comparisons
    for (const local of localComparisons) {
      if (!local.synced) {
        const { error } = await dbSaveComparison(
          user.id,
          local.result as unknown as Record<string, unknown>,
          local.nickname
        );
        if (!error) {
          local.synced = true;
          syncedCount++;
        } else {
          console.error('[savedComparisons] Failed to sync:', local.id, error);
        }
      }
    }

    // Sync enhanced comparisons
    for (const local of localEnhanced) {
      const { error } = await dbSaveComparison(
        user.id,
        local.result as unknown as Record<string, unknown>,
        local.nickname
      );
      if (!error) {
        syncedCount++;
      } else {
        console.error('[savedComparisons] Failed to sync enhanced:', local.id, error);
      }
    }

    // Update local storage with synced flags
    saveLocalComparisons(localComparisons);

    console.log(`[savedComparisons] Synced ${syncedCount} comparisons to database`);
    return {
      success: true,
      message: `Synced ${syncedCount} comparisons to database`,
      synced: syncedCount
    };
  } catch (error) {
    console.error('[savedComparisons] Database sync error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Sync failed', synced: 0 };
  }
}

/**
 * Full bidirectional sync: pull from database, then push unsynced local changes
 * Called when user logs in
 */
export async function fullDatabaseSync(): Promise<{ success: boolean; message: string; pulled: number; pushed: number }> {
  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Database not configured.', pulled: 0, pushed: 0 };
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'User not logged in.', pulled: 0, pushed: 0 };
    }

    // First pull from database
    const pullResult = await pullFromDatabase();

    // Then sync any unsynced local changes
    const syncResult = await syncToDatabase();

    console.log(`[savedComparisons] Full sync complete: pulled ${pullResult.added}, pushed ${syncResult.synced}`);
    return {
      success: true,
      message: `Sync complete: ${pullResult.added} pulled, ${syncResult.synced} pushed`,
      pulled: pullResult.added,
      pushed: syncResult.synced
    };
  } catch (error) {
    console.error('[savedComparisons] Full sync error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Sync failed', pulled: 0, pushed: 0 };
  }
}
