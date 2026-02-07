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
import { supabase, isSupabaseConfigured, getCurrentUser, withRetry, SUPABASE_TIMEOUT_MS } from '../lib/supabase';

/**
 * Wrap a Supabase query with retry logic and timeout.
 * Uses exponential backoff on timeout/network errors.
 */
async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = SUPABASE_TIMEOUT_MS,
  operationName: string = 'Saved comparisons query'
): Promise<T> {
  return withRetry(() => promise, {
    timeoutMs: ms,
    operationName,
    maxRetries: 3,
  });
}
import {
  saveComparison as dbSaveComparison,
  getUserComparisons as dbGetUserComparisons,
  deleteComparison as dbDeleteComparison,
  updateComparison as dbUpdateComparison,
  saveGammaReport as dbSaveGammaReport,
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
// JUDGE REPORT TYPES (lightweight — avoids importing JudgeTab's full type)
// ============================================================================

export interface SavedJudgeReport {
  reportId: string;
  generatedAt: string;
  comparisonId: string;
  city1: string;
  city2: string;
  videoUrl?: string;
  videoStatus: string;
  summaryOfFindings: {
    city1Score: number;
    city2Score: number;
    overallConfidence: string;
  };
  executiveSummary: {
    recommendation: string;
    rationale: string;
  };
}

// ============================================================================
// COURT ORDER TYPES
// ============================================================================

export interface SavedCourtOrder {
  comparisonId: string;
  winnerCity: string;
  winnerScore: number;
  videoUrl: string;
  savedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOCAL_STORAGE_KEY = 'lifescore_saved_comparisons';
const ENHANCED_STORAGE_KEY = 'lifescore_saved_enhanced';
const GAMMA_REPORTS_KEY = 'lifescore_saved_gamma_reports';
const JUDGE_REPORTS_KEY = 'lifescore_judge_reports';
const COURT_ORDERS_KEY = 'lifescore_court_orders';
const GITHUB_CONFIG_KEY = 'lifescore_github_config';
const GIST_FILENAME = 'lifescore_comparisons.json';
const GIST_DESCRIPTION = 'LIFE SCORE™ Saved City Comparisons';
const GITHUB_TIMEOUT_MS = 60000; // 60 seconds for GitHub API calls
const MAX_SAVED = 100; // Standard comparisons
const MAX_SAVED_ENHANCED = 20; // Enhanced comparisons are much larger (~200KB each)

/**
 * Safely save to localStorage with quota handling
 * If quota exceeded, removes oldest items until it fits
 */
function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn(`[savedComparisons] localStorage quota exceeded for ${key}, attempting cleanup...`);

      // Try to make room by removing oldest items
      try {
        const data = JSON.parse(value);
        if (Array.isArray(data) && data.length > 1) {
          // Remove oldest 20% of items
          const removeCount = Math.max(1, Math.floor(data.length * 0.2));
          const trimmed = data.slice(0, data.length - removeCount);
          localStorage.setItem(key, JSON.stringify(trimmed));
          console.log(`[savedComparisons] Removed ${removeCount} oldest items to free space`);
          return true;
        }
      } catch {
        // If cleanup fails, clear the key entirely
        console.error(`[savedComparisons] Cleanup failed, clearing ${key}`);
        localStorage.removeItem(key);
      }
    }
    console.error(`[savedComparisons] Failed to save to localStorage:`, error);
    return false;
  }
}

// ============================================================================
// TYPE GUARDS FOR DATA VALIDATION
// ============================================================================

/**
 * Type guard to validate a SavedComparison object
 * FIX 7.4 & 7.6: Proper validation instead of unsafe casts
 */
export function isValidSavedComparison(obj: unknown): obj is SavedComparison {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;

  // Required fields
  if (!c.id || typeof c.id !== 'string') return false;
  if (!c.savedAt || typeof c.savedAt !== 'string') return false;
  if (!c.result || typeof c.result !== 'object') return false;

  // Validate result has required city data
  const result = c.result as Record<string, unknown>;
  if (!result.comparisonId) return false;
  if (!result.city1 || typeof result.city1 !== 'object') return false;
  if (!result.city2 || typeof result.city2 !== 'object') return false;

  // Validate cities have required fields
  const city1 = result.city1 as Record<string, unknown>;
  const city2 = result.city2 as Record<string, unknown>;
  if (!city1.city || typeof city1.city !== 'string') return false;
  if (!city2.city || typeof city2.city !== 'string') return false;

  return true;
}

/**
 * Type guard to validate a SavedEnhancedComparison object
 */
export function isValidSavedEnhancedComparison(obj: unknown): obj is SavedEnhancedComparison {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;

  // Required fields
  if (!c.id || typeof c.id !== 'string') return false;
  if (!c.savedAt || typeof c.savedAt !== 'string') return false;
  if (!c.result || typeof c.result !== 'object') return false;

  // Validate result has required city data
  const result = c.result as Record<string, unknown>;
  if (!result.comparisonId) return false;
  if (!result.city1 || typeof result.city1 !== 'object') return false;
  if (!result.city2 || typeof result.city2 !== 'object') return false;

  // Validate cities have required fields
  const city1 = result.city1 as Record<string, unknown>;
  const city2 = result.city2 as Record<string, unknown>;
  if (!city1.city || typeof city1.city !== 'string') return false;
  if (!city2.city || typeof city2.city !== 'string') return false;

  return true;
}

/**
 * Type guard to validate a ComparisonResult object
 */
export function isValidComparisonResult(obj: unknown): obj is ComparisonResult {
  if (!obj || typeof obj !== 'object') return false;
  const r = obj as Record<string, unknown>;

  if (!r.comparisonId) return false;
  if (!r.city1 || typeof r.city1 !== 'object') return false;
  if (!r.city2 || typeof r.city2 !== 'object') return false;

  const city1 = r.city1 as Record<string, unknown>;
  const city2 = r.city2 as Record<string, unknown>;
  if (!city1.city || typeof city1.city !== 'string') return false;
  if (!city2.city || typeof city2.city !== 'string') return false;

  return true;
}

/**
 * Type guard to detect if a ComparisonResult is actually an EnhancedComparisonResult
 * FIX 7.4: Safe detection without unsafe casts
 */
export function isEnhancedComparisonResult(result: ComparisonResult): result is ComparisonResult & { llmsUsed: unknown[] } {
  if (!result || typeof result !== 'object') return false;
  const r = result as unknown as Record<string, unknown>;

  // Enhanced comparisons have llmsUsed array
  if ('llmsUsed' in r && Array.isArray(r.llmsUsed) && r.llmsUsed.length > 0) {
    return true;
  }

  // Or totalConsensusScore on city objects
  if (result.city1 && typeof result.city1 === 'object') {
    const city1 = result.city1 as unknown as Record<string, unknown>;
    if ('totalConsensusScore' in city1 && typeof city1.totalConsensusScore === 'number') {
      return true;
    }
  }

  return false;
}

// ============================================================================
// LOCAL STORAGE OPERATIONS
// ============================================================================

/**
 * Get all saved comparisons from localStorage
 * FIX 7.6: Added corruption detection, validation, and auto-cleanup
 */
export function getLocalComparisons(): SavedComparison[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.error('[savedComparisons] localStorage data is not an array, clearing corrupted data');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return [];
    }

    // Filter out corrupted entries using type guard
    const valid = parsed.filter((item: unknown) => {
      const isValid = isValidSavedComparison(item);
      if (!isValid) {
        console.warn('[savedComparisons] Filtering corrupted entry:', item);
      }
      return isValid;
    });

    // If we filtered any entries, save the cleaned data back
    if (valid.length !== parsed.length) {
      console.warn(`[savedComparisons] Filtered ${parsed.length - valid.length} corrupted entries, saving cleaned data`);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch (error) {
    console.error('[savedComparisons] localStorage corrupted, clearing:', error);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    return [];
  }
}

/**
 * Save comparisons to localStorage
 */
function saveLocalComparisons(comparisons: SavedComparison[]): void {
  const trimmed = comparisons.slice(0, MAX_SAVED);
  const success = safeLocalStorageSet(LOCAL_STORAGE_KEY, JSON.stringify(trimmed));
  if (success) {
    console.log('[savedComparisons] Saved', trimmed.length, 'comparisons to localStorage');
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
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('[savedComparisons] Failed to save GitHub config:', err);
  }
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
        // FIX 2026-01-29: Use maybeSingle() - record may not exist
        const { data } = await withTimeout(
          supabase
            .from('comparisons')
            .select('id')
            .eq('user_id', user.id)
            .eq('comparison_id', id)
            .maybeSingle()
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
        // FIX 2026-01-29: Use maybeSingle() - record may not exist
        const { data } = await withTimeout(
          supabase
            .from('comparisons')
            .select('id')
            .eq('user_id', user.id)
            .eq('comparison_id', id)
            .maybeSingle()
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
 * FIX 7.6: Added corruption detection, validation, and auto-cleanup
 */
export function getLocalEnhancedComparisons(): SavedEnhancedComparison[] {
  try {
    const stored = localStorage.getItem(ENHANCED_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.error('[savedComparisons] Enhanced localStorage data is not an array, clearing corrupted data');
      localStorage.removeItem(ENHANCED_STORAGE_KEY);
      return [];
    }

    // Filter out corrupted entries using type guard
    const valid = parsed.filter((item: unknown) => {
      const isValid = isValidSavedEnhancedComparison(item);
      if (!isValid) {
        console.warn('[savedComparisons] Filtering corrupted enhanced entry:', item);
      }
      return isValid;
    });

    // If we filtered any entries, save the cleaned data back
    if (valid.length !== parsed.length) {
      console.warn(`[savedComparisons] Filtered ${parsed.length - valid.length} corrupted enhanced entries, saving cleaned data`);
      localStorage.setItem(ENHANCED_STORAGE_KEY, JSON.stringify(valid));
    }

    return valid;
  } catch (error) {
    console.error('[savedComparisons] Enhanced localStorage corrupted, clearing:', error);
    localStorage.removeItem(ENHANCED_STORAGE_KEY);
    return [];
  }
}

/**
 * Save enhanced comparisons to localStorage
 */
function saveLocalEnhancedComparisons(comparisons: SavedEnhancedComparison[]): void {
  // Enforce lower limit for enhanced comparisons (they're ~200KB each)
  const trimmed = comparisons.slice(0, MAX_SAVED_ENHANCED);
  if (comparisons.length > MAX_SAVED_ENHANCED) {
    console.log(`[savedComparisons] Trimmed enhanced comparisons from ${comparisons.length} to ${MAX_SAVED_ENHANCED}`);
  }

  const success = safeLocalStorageSet(ENHANCED_STORAGE_KEY, JSON.stringify(trimmed));
  if (success) {
    console.log('[savedComparisons] Saved', trimmed.length, 'enhanced comparisons to localStorage');
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
  // NON-BLOCKING: Don't wait for database sync - return immediately after localStorage save
  if (isSupabaseConfigured()) {
    // Fire-and-forget with timeout to prevent hanging
    (async () => {
      const timeoutMs = 10000; // 10 second timeout for database sync
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database sync timeout')), timeoutMs)
      );

      try {
        await Promise.race([
          (async () => {
            const user = await getCurrentUser();
            if (user) {
              const { error } = await dbSaveComparison(user.id, result as unknown as Record<string, unknown>, nickname);
              if (error) {
                console.error('[savedComparisons] Database save enhanced failed:', error);
              } else {
                console.log('[savedComparisons] Enhanced comparison saved to database:', result.comparisonId);
              }
            }
          })(),
          timeoutPromise
        ]);
      } catch (err) {
        console.error('[savedComparisons] Database sync error for enhanced:', err);
      }
    })();
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
        // FIX 2026-01-29: Use maybeSingle() - record may not exist
        const { data } = await withTimeout(
          supabase
            .from('comparisons')
            .select('id')
            .eq('user_id', user.id)
            .eq('comparison_id', id)
            .maybeSingle()
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
 * FIX: Sync Gamma reports FROM Supabase to localStorage
 * This ensures reports saved on other devices appear on this device
 */
export async function syncGammaReportsFromSupabase(): Promise<SavedGammaReport[]> {
  console.log('[savedComparisons] Syncing Gamma reports from Supabase...');

  // Get current localStorage reports
  const localReports = getSavedGammaReports();
  const localIds = new Set(localReports.map(r => r.generationId));

  try {
    if (!isSupabaseConfigured()) {
      console.log('[savedComparisons] Supabase not configured, using localStorage only');
      return localReports;
    }

    const user = await getCurrentUser();
    if (!user) {
      console.log('[savedComparisons] No authenticated user, using localStorage only');
      return localReports;
    }

    // Fetch from Supabase with timeout
    const { data, error } = await withTimeout(
      supabase
        .from('gamma_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      10000,
      'Gamma reports sync'
    );

    if (error) {
      console.error('[savedComparisons] Failed to fetch Gamma reports from Supabase:', error);
      return localReports;
    }

    if (!data || data.length === 0) {
      console.log('[savedComparisons] No Gamma reports in Supabase');
      return localReports;
    }

    console.log('[savedComparisons] Found', data.length, 'Gamma reports in Supabase');

    // Convert Supabase records to SavedGammaReport format and merge
    let newReportsAdded = 0;
    for (const record of data) {
      // Skip if we already have this report locally (by generationId)
      if (localIds.has(record.gamma_generation_id)) {
        continue;
      }

      // Add to local reports
      const newReport: SavedGammaReport = {
        id: `gamma_${record.id}`,
        comparisonId: record.comparison_id,
        city1: record.city1 || 'Unknown',
        city2: record.city2 || 'Unknown',
        gammaUrl: record.gamma_url,
        pdfUrl: record.pdf_url || undefined,
        pptxUrl: record.pptx_url || undefined,
        generationId: record.gamma_generation_id,
        savedAt: record.created_at,
      };

      localReports.push(newReport);
      localIds.add(record.gamma_generation_id);
      newReportsAdded++;
    }

    if (newReportsAdded > 0) {
      // Sort by savedAt descending
      localReports.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

      // Trim and save back to localStorage
      const trimmed = localReports.slice(0, MAX_GAMMA_REPORTS);
      saveGammaReportsLocal(trimmed);

      console.log('[savedComparisons] ✓ Synced', newReportsAdded, 'new Gamma reports from Supabase');
      return trimmed;
    }

    console.log('[savedComparisons] All Supabase reports already in localStorage');
    return localReports;

  } catch (err) {
    console.error('[savedComparisons] Gamma sync error:', err);
    return localReports;
  }
}

/**
 * Save Gamma reports to localStorage
 */
function saveGammaReportsLocal(reports: SavedGammaReport[]): void {
  try {
    localStorage.setItem(GAMMA_REPORTS_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error('[savedComparisons] Failed to save Gamma reports to localStorage:', err);
  }
}

/**
 * Save a Gamma report locally AND to Supabase database
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

  // Also save to Supabase database if user is authenticated
  // FIX: Improved error handling and logging for Supabase save
  try {
    if (isSupabaseConfigured()) {
      console.log('[savedComparisons] Supabase configured, attempting DB save...');
      getCurrentUser().then(user => {
        if (user) {
          console.log('[savedComparisons] User authenticated, saving to Supabase:', {
            userId: user.id,
            comparisonId: report.comparisonId,
            generationId: report.generationId,
          });
          dbSaveGammaReport(
            user.id,
            report.comparisonId,
            report.generationId,
            report.gammaUrl,
            report.pdfUrl,
            report.pptxUrl
          ).then(({ data, error }) => {
            if (error) {
              console.error('[savedComparisons] Gamma DB save failed:', error);
              console.error('[savedComparisons] Save params:', { userId: user.id, comparisonId: report.comparisonId });
            } else {
              console.log('[savedComparisons] ✓ Gamma report saved to Supabase database:', id, data);
            }
          }).catch(err => {
            console.error('[savedComparisons] Gamma DB save error:', err);
          });
        } else {
          console.log('[savedComparisons] No authenticated user, skipping Supabase save (local only)');
        }
      }).catch(err => {
        console.error('[savedComparisons] getCurrentUser error for Gamma save:', err);
      });
    } else {
      console.log('[savedComparisons] Supabase not configured, saved to localStorage only');
    }
  } catch (err) {
    console.error('[savedComparisons] Gamma DB save outer error:', err);
  }

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
// JUDGE REPORT STORAGE
// ============================================================================

/**
 * Get all saved Judge reports from localStorage
 */
export function getSavedJudgeReports(): SavedJudgeReport[] {
  try {
    const stored = localStorage.getItem(JUDGE_REPORTS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedJudgeReport[];
  } catch (error) {
    console.error('Error loading Judge reports:', error);
    return [];
  }
}

const MAX_JUDGE_REPORTS = 20;

/**
 * FIX: Sync Judge reports FROM Supabase to localStorage
 * This ensures reports saved on other devices appear on this device
 */
export async function syncJudgeReportsFromSupabase(): Promise<SavedJudgeReport[]> {
  console.log('[savedComparisons] Syncing Judge reports from Supabase...');

  const localReports = getSavedJudgeReports();
  const localIds = new Set(localReports.map(r => r.reportId));

  try {
    if (!isSupabaseConfigured()) {
      console.log('[savedComparisons] Supabase not configured, using localStorage only');
      return localReports;
    }

    const user = await getCurrentUser();
    if (!user) {
      console.log('[savedComparisons] No authenticated user, using localStorage only');
      return localReports;
    }

    // Fetch from Supabase with timeout
    const { data, error } = await withTimeout(
      supabase
        .from('judge_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      10000,
      'Judge reports sync'
    );

    if (error) {
      console.error('[savedComparisons] Failed to fetch Judge reports from Supabase:', error);
      return localReports;
    }

    if (!data || data.length === 0) {
      console.log('[savedComparisons] No Judge reports in Supabase');
      return localReports;
    }

    console.log('[savedComparisons] Found', data.length, 'Judge reports in Supabase');

    // Convert Supabase records to SavedJudgeReport format and merge
    let newReportsAdded = 0;
    for (const record of data) {
      // Skip if we already have this report locally
      if (localIds.has(record.report_id)) {
        continue;
      }

      // Parse the full_report JSON if it exists
      let fullReport = record.full_report;
      if (typeof fullReport === 'string') {
        try {
          fullReport = JSON.parse(fullReport);
        } catch {
          fullReport = null;
        }
      }

      // Build SavedJudgeReport from Supabase record
      const newReport: SavedJudgeReport = {
        reportId: record.report_id,
        comparisonId: record.comparison_id,
        city1: record.city1 || 'Unknown',
        city2: record.city2 || 'Unknown',
        winner: record.winner || 'tie',
        margin: record.margin || 0,
        verdict: record.verdict || '',
        executiveSummary: fullReport?.executiveSummary || { recommendation: 'tie', confidenceLevel: 'medium', keyInsight: '' },
        summaryOfFindings: fullReport?.summaryOfFindings || { city1Score: 0, city2Score: 0, marginOfVictory: 0, closestCategories: [], biggestDifferences: [] },
        categoryBreakdown: fullReport?.categoryBreakdown || [],
        finalVerdict: fullReport?.finalVerdict || { recommendation: '', reasoning: '' },
        videoUrl: record.video_url || undefined,
        videoStatus: record.video_status || 'none',
        generatedAt: record.created_at,
      };

      localReports.push(newReport);
      localIds.add(record.report_id);
      newReportsAdded++;
    }

    if (newReportsAdded > 0) {
      // Sort by generatedAt descending
      localReports.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

      // Trim and save back to localStorage
      const trimmed = localReports.slice(0, MAX_JUDGE_REPORTS);
      try {
        localStorage.setItem(JUDGE_REPORTS_KEY, JSON.stringify(trimmed));
      } catch (err) {
        console.error('[savedComparisons] Failed to save synced Judge reports:', err);
      }

      console.log('[savedComparisons] ✓ Synced', newReportsAdded, 'new Judge reports from Supabase');
      return trimmed;
    }

    console.log('[savedComparisons] All Supabase Judge reports already in localStorage');
    return localReports;

  } catch (err) {
    console.error('[savedComparisons] Judge sync error:', err);
    return localReports;
  }
}

/**
 * Save a Judge report to localStorage AND Supabase database
 */
export function saveJudgeReport(report: SavedJudgeReport): void {
  try {
    const reports = getSavedJudgeReports();
    // Check if report already exists (update it)
    const existingIndex = reports.findIndex(r => r.reportId === report.reportId);
    if (existingIndex >= 0) {
      reports[existingIndex] = report;
    } else {
      reports.unshift(report);
    }
    // Trim if too many
    const trimmed = reports.slice(0, MAX_JUDGE_REPORTS);
    localStorage.setItem(JUDGE_REPORTS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[savedComparisons] Failed to save judge report:', error);
  }

  // Also save to Supabase database if user is authenticated
  try {
    if (isSupabaseConfigured()) {
      getCurrentUser().then(user => {
        if (user) {
          // Column mapping matches actual judge_reports table schema
          const winnerCity = report.executiveSummary.recommendation === 'city1'
            ? report.city1
            : report.executiveSummary.recommendation === 'city2'
              ? report.city2
              : 'TIE';
          const winnerScore = report.executiveSummary.recommendation === 'city1'
            ? report.summaryOfFindings.city1Score
            : report.summaryOfFindings.city2Score;
          const margin = Math.abs(
            report.summaryOfFindings.city1Score - report.summaryOfFindings.city2Score
          );

          supabase
            .from('judge_reports')
            .upsert({
              user_id: user.id,
              report_id: report.reportId,
              city1: report.city1,
              city2: report.city2,
              city1_score: report.summaryOfFindings.city1Score,
              city2_score: report.summaryOfFindings.city2Score,
              winner: winnerCity,
              winner_score: winnerScore,
              margin,
              verdict: report.executiveSummary.rationale,
              full_report: report,
              video_url: report.videoUrl || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,report_id' })
            .then(({ error }) => {
              if (error) {
                console.error('[savedComparisons] Judge DB save failed:', error);
              } else {
                console.log('[savedComparisons] Judge report saved to database:', report.reportId);
              }
            });
        }
      }).catch(err => {
        console.error('[savedComparisons] getCurrentUser error for Judge save:', err);
      });
    }
  } catch (err) {
    console.error('[savedComparisons] Judge DB save outer error:', err);
  }
}

/**
 * Delete a Judge report by reportId
 */
export function deleteSavedJudgeReport(reportId: string): boolean {
  const reports = getSavedJudgeReports();
  const filtered = reports.filter(r => r.reportId !== reportId);

  if (filtered.length === reports.length) {
    return false;
  }

  try {
    localStorage.setItem(JUDGE_REPORTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[savedComparisons] Failed to delete Judge report from localStorage:', err);
  }
  return true;
}

/**
 * Clear all Judge reports
 */
export function clearAllJudgeReports(): void {
  localStorage.removeItem(JUDGE_REPORTS_KEY);
}

// ============================================================================
// COURT ORDER STORAGE
// ============================================================================

const MAX_COURT_ORDERS = 50;

/**
 * Get all saved Court Orders from localStorage
 */
export function getSavedCourtOrders(): SavedCourtOrder[] {
  try {
    const stored = localStorage.getItem(COURT_ORDERS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedCourtOrder[];
  } catch (error) {
    console.error('[savedComparisons] Error loading Court Orders:', error);
    return [];
  }
}

/**
 * Save a Court Order to localStorage AND Supabase database
 */
export function saveCourtOrder(order: SavedCourtOrder): void {
  // Save to localStorage
  try {
    const orders = getSavedCourtOrders();
    const existingIndex = orders.findIndex(o => o.comparisonId === order.comparisonId);
    if (existingIndex >= 0) {
      orders[existingIndex] = order;
    } else {
      orders.unshift(order);
    }
    const trimmed = orders.slice(0, MAX_COURT_ORDERS);
    localStorage.setItem(COURT_ORDERS_KEY, JSON.stringify(trimmed));
    console.log('[savedComparisons] Court Order saved to localStorage:', order.comparisonId);
  } catch (error) {
    console.error('[savedComparisons] Failed to save Court Order to localStorage:', error);
  }

  // Also save to Supabase database if user is authenticated
  try {
    if (isSupabaseConfigured()) {
      getCurrentUser().then(user => {
        if (user) {
          supabase
            .from('court_orders')
            .upsert({
              user_id: user.id,
              comparison_id: order.comparisonId,
              winner_city: order.winnerCity,
              winner_score: order.winnerScore,
              video_url: order.videoUrl,
              saved_at: order.savedAt,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,comparison_id' })
            .then(({ error }) => {
              if (error) {
                console.error('[savedComparisons] Court Order DB save failed:', error);
              } else {
                console.log('[savedComparisons] Court Order saved to database:', order.comparisonId);
              }
            });
        }
      }).catch(err => {
        console.error('[savedComparisons] getCurrentUser error for Court Order save:', err);
      });
    }
  } catch (err) {
    console.error('[savedComparisons] Court Order DB save outer error:', err);
  }
}

/**
 * Delete a Court Order by comparisonId
 */
export function deleteSavedCourtOrder(comparisonId: string): boolean {
  const orders = getSavedCourtOrders();
  const filtered = orders.filter(o => o.comparisonId !== comparisonId);

  if (filtered.length === orders.length) {
    return false;
  }

  try {
    localStorage.setItem(COURT_ORDERS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[savedComparisons] Failed to delete Court Order from localStorage:', err);
  }
  return true;
}

/**
 * Clear all Court Orders
 */
export function clearAllCourtOrders(): void {
  localStorage.removeItem(COURT_ORDERS_KEY);
}

// ============================================================================
// USER PREFERENCE DB SAVE UTILITY
// ============================================================================

/**
 * Save a user preference to Supabase database (fire-and-forget).
 * Used for weight presets, dealbreakers, and other user settings.
 * localStorage is the primary store; DB is the cloud backup.
 *
 * The user_preferences table is a single-row-per-user design.
 * Valid keys map directly to JSONB columns: weight_presets,
 * law_lived_preferences, excluded_categories, dealbreakers.
 */
export function saveUserPreferenceToDb(key: string, value: unknown): void {
  try {
    if (isSupabaseConfigured()) {
      getCurrentUser().then(user => {
        if (user) {
          supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              [key]: value,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .then(({ error }) => {
              if (error) {
                console.error(`[savedComparisons] DB pref save failed for '${key}':`, error);
              } else {
                console.log(`[savedComparisons] Preference '${key}' saved to database`);
              }
            });
        }
      }).catch(err => {
        console.error(`[savedComparisons] getCurrentUser error for pref '${key}':`, err);
      });
    }
  } catch (err) {
    console.error(`[savedComparisons] saveUserPreferenceToDb outer error for '${key}':`, err);
  }
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
 * FIX 7.5: Mutex lock to prevent race conditions during database sync
 * Prevents multiple simultaneous sync operations from corrupting data
 */
let databaseSyncLock = false;

/**
 * Load comparisons from Supabase database and merge with localStorage
 * Called when user logs in or opens the app while logged in
 * FIX 7.5: Added mutex lock to prevent race conditions
 */
export async function pullFromDatabase(): Promise<{ success: boolean; message: string; added: number }> {
  // FIX 7.5: Check mutex lock
  if (databaseSyncLock) {
    console.log('[savedComparisons] Database sync already in progress, skipping pullFromDatabase');
    return { success: false, message: 'Sync already in progress', added: 0 };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Database not configured.', added: 0 };
  }

  // FIX 7.5: Acquire lock
  databaseSyncLock = true;

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
  } finally {
    // FIX 7.5: Always release lock
    databaseSyncLock = false;
  }
}

/**
 * Sync all unsynced local comparisons to Supabase database
 * Called when user logs in or manually triggers sync
 * FIX 7.5: Added mutex lock to prevent race conditions
 */
export async function syncToDatabase(): Promise<{ success: boolean; message: string; synced: number }> {
  // FIX 7.5: Check mutex lock
  if (databaseSyncLock) {
    console.log('[savedComparisons] Database sync already in progress, skipping syncToDatabase');
    return { success: false, message: 'Sync already in progress', synced: 0 };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Database not configured.', synced: 0 };
  }

  // FIX 7.5: Acquire lock
  databaseSyncLock = true;

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
  } finally {
    // FIX 7.5: Always release lock
    databaseSyncLock = false;
  }
}

/**
 * Full bidirectional sync: pull from database, then push unsynced local changes
 * Called when user logs in
 * Note: Does not use mutex lock directly as it calls pullFromDatabase and syncToDatabase which have their own locks
 */
export async function fullDatabaseSync(): Promise<{ success: boolean; message: string; pulled: number; pushed: number }> {
  // FIX 7.5: Check mutex lock at start to prevent multiple concurrent full syncs
  if (databaseSyncLock) {
    console.log('[savedComparisons] Database sync already in progress, skipping fullDatabaseSync');
    return { success: false, message: 'Sync already in progress', pulled: 0, pushed: 0 };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Database not configured.', pulled: 0, pushed: 0 };
  }

  // FIX 7.5: Acquire lock for full sync duration
  databaseSyncLock = true;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: 'User not logged in.', pulled: 0, pushed: 0 };
    }

    // FIX 7.5: Release lock before calling sub-functions (they have their own locking)
    // Actually, keep lock held for entire operation to prevent interleaving
    // Sub-functions will see lock is held and skip their own locking check - we need internal versions

    // Inline the pull logic (without lock check since we hold the lock)
    const { data: dbComparisons, error: pullError } = await dbGetUserComparisons(user.id, { limit: MAX_SAVED });

    let pullAdded = 0;
    if (!pullError && dbComparisons) {
      const localComparisons = getLocalComparisons();
      const localEnhanced = getLocalEnhancedComparisons();
      const mergedMap = new Map<string, SavedComparison>();
      const mergedEnhancedMap = new Map<string, SavedEnhancedComparison>();

      localComparisons.forEach(c => mergedMap.set(c.id, c));
      localEnhanced.forEach(c => mergedEnhancedMap.set(c.id, c));

      for (const dbComp of dbComparisons) {
        const compResult = dbComp.comparison_result as Record<string, unknown>;
        const isEnhanced = 'llmsUsed' in compResult && Array.isArray(compResult.llmsUsed);
        const comparisonId = dbComp.comparison_id;

        if (isEnhanced) {
          if (!mergedEnhancedMap.has(comparisonId)) pullAdded++;
          mergedEnhancedMap.set(comparisonId, {
            id: comparisonId,
            result: compResult as unknown as EnhancedComparisonResult,
            savedAt: dbComp.created_at,
            nickname: dbComp.nickname || undefined,
          });
        } else {
          if (!mergedMap.has(comparisonId)) pullAdded++;
          mergedMap.set(comparisonId, {
            id: comparisonId,
            result: compResult as unknown as ComparisonResult,
            savedAt: dbComp.created_at,
            nickname: dbComp.nickname || undefined,
            synced: true,
          });
        }
      }

      const mergedStandard = Array.from(mergedMap.values())
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        .slice(0, MAX_SAVED);
      const mergedEnhancedArr = Array.from(mergedEnhancedMap.values())
        .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        .slice(0, MAX_SAVED);

      saveLocalComparisons(mergedStandard);
      saveLocalEnhancedComparisons(mergedEnhancedArr);
    }

    // Inline the sync logic (without lock check since we hold the lock)
    let syncedCount = 0;
    const localComparisons = getLocalComparisons();
    const localEnhanced = getLocalEnhancedComparisons();

    for (const local of localComparisons) {
      if (!local.synced) {
        const { error } = await dbSaveComparison(user.id, local.result as unknown as Record<string, unknown>, local.nickname);
        if (!error) {
          local.synced = true;
          syncedCount++;
        }
      }
    }

    for (const local of localEnhanced) {
      const { error } = await dbSaveComparison(user.id, local.result as unknown as Record<string, unknown>, local.nickname);
      if (!error) syncedCount++;
    }

    saveLocalComparisons(localComparisons);

    console.log(`[savedComparisons] Full sync complete: pulled ${pullAdded}, pushed ${syncedCount}`);
    return {
      success: true,
      message: `Sync complete: ${pullAdded} pulled, ${syncedCount} pushed`,
      pulled: pullAdded,
      pushed: syncedCount
    };
  } catch (error) {
    console.error('[savedComparisons] Full sync error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Sync failed', pulled: 0, pushed: 0 };
  } finally {
    // FIX 7.5: Always release lock
    databaseSyncLock = false;
  }
}
