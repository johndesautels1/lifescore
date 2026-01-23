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
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(comparisons));
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
 * Save a comparison locally
 */
export function saveComparisonLocal(result: ComparisonResult, nickname?: string): SavedComparison {
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
  return saved;
}

/**
 * Delete a comparison locally
 */
export function deleteComparisonLocal(id: string): boolean {
  const comparisons = getLocalComparisons();
  const filtered = comparisons.filter(c => c.id !== id);

  if (filtered.length === comparisons.length) {
    return false;
  }

  saveLocalComparisons(filtered);
  return true;
}

/**
 * Update nickname locally
 */
export function updateNicknameLocal(id: string, nickname: string): boolean {
  const comparisons = getLocalComparisons();
  const comparison = comparisons.find(c => c.id === id);

  if (!comparison) return false;

  comparison.nickname = nickname;
  comparison.synced = false;
  saveLocalComparisons(comparisons);
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
  localStorage.setItem(ENHANCED_STORAGE_KEY, JSON.stringify(comparisons));
}

/**
 * Save an enhanced comparison locally
 */
export function saveEnhancedComparisonLocal(result: EnhancedComparisonResult, nickname?: string): SavedEnhancedComparison {
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
  return saved;
}

/**
 * Check if enhanced comparison is saved
 */
export function isEnhancedComparisonSaved(comparisonId: string): boolean {
  return getLocalEnhancedComparisons().some(c => c.id === comparisonId);
}

/**
 * Delete an enhanced comparison locally
 */
export function deleteEnhancedComparisonLocal(id: string): boolean {
  const comparisons = getLocalEnhancedComparisons();
  const filtered = comparisons.filter(c => c.id !== id);

  if (filtered.length === comparisons.length) {
    return false;
  }

  saveLocalEnhancedComparisons(filtered);
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
