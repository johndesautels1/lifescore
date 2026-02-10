/**
 * LIFE SCORE - Report Storage Service
 * Session 16: Supabase Database Architecture Upgrade
 *
 * Handles:
 * - Saving report HTML to Supabase Storage
 * - Saving report metadata to database
 * - Retrieving reports with HTML content
 * - Report sharing via token system
 * - Access logging for analytics
 */

import { supabase, isSupabaseConfigured, withRetry, SUPABASE_TIMEOUT_MS } from '../lib/supabase';
import type {
  Report,
  ReportInsert,
  ReportUpdate,
  ReportWithHtml,
  ReportShare,
  ReportShareInsert,
  ReportAccessLogInsert,
  ReportSummary,
  ReportType,
} from '../types/database';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = 'reports';
const DEFAULT_SHARE_EXPIRY_DAYS = 30;
const DEFAULT_MAX_VIEWS = 100;

// ============================================================================
// HELPER: Timeout wrapper with retry
// ============================================================================

async function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number = SUPABASE_TIMEOUT_MS,
  operationName: string = 'Report query'
): Promise<T> {
  return withRetry(() => promise, {
    timeoutMs: ms,
    operationName,
    maxRetries: 3,
  });
}

function requireDatabase(): void {
  if (!isSupabaseConfigured()) {
    throw new Error('Database not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }
}

// ============================================================================
// REPORT SAVING
// ============================================================================

export interface SaveReportData {
  reportType: ReportType;
  city1Name: string;
  city1Country: string;
  city2Name: string;
  city2Country: string;
  winner: string;
  winnerScore: number;
  loserScore: number;
  scoreDifference: number;
  gammaDocId?: string;
  gammaUrl?: string;
  durationSeconds: number;
  pageCount: number;
  confidence?: number;
}

/**
 * Save report HTML to Supabase Storage and metadata to database.
 * This is the main function to call after Gamma generates a report.
 *
 * @param userId - The user ID
 * @param reportData - Report metadata
 * @param htmlContent - The full HTML content of the report
 * @returns The saved report record
 */
export async function saveReport(
  userId: string,
  reportData: SaveReportData,
  htmlContent: string
): Promise<{ data: Report | null; error: Error | null }> {
  requireDatabase();

  const reportId = crypto.randomUUID();
  const fileName = `${userId}/${reportId}.html`;

  try {
    // 1. Upload HTML to storage
    const { error: storageError } = await withTimeout(
      supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, htmlContent, {
          contentType: 'text/html',
          cacheControl: '3600',
          upsert: false
        }),
      60000, // 60 second timeout for upload
      'Upload report HTML'
    );

    if (storageError) {
      console.error('[ReportStorage] Storage upload failed:', storageError);
      throw storageError;
    }

    console.log('[ReportStorage] HTML uploaded to:', fileName);

    // 2. Save metadata to database
    const insert: ReportInsert = {
      user_id: userId,
      report_type: reportData.reportType,
      version: 'v4.0',
      city1_name: reportData.city1Name,
      city1_country: reportData.city1Country,
      city2_name: reportData.city2Name,
      city2_country: reportData.city2Country,
      winner: reportData.winner,
      winner_score: reportData.winnerScore,
      loser_score: reportData.loserScore,
      score_difference: reportData.scoreDifference,
      gamma_doc_id: reportData.gammaDocId || null,
      gamma_url: reportData.gammaUrl || null,
      html_storage_path: fileName,
      status: 'completed',
      generation_duration_seconds: reportData.durationSeconds,
      page_count: reportData.pageCount,
      llm_consensus_confidence: reportData.confidence || null,
    };

    const { data, error } = await withTimeout(
      supabase
        .from('reports')
        .insert(insert)
        .select()
        .single()
    );

    if (error) {
      console.error('[ReportStorage] Database insert failed:', error);
      // Try to clean up uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([fileName]);
      throw error;
    }

    console.log('[ReportStorage] Report saved:', data.id);
    return { data: data as Report, error: null };

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Create a report record for a report that's still generating.
 * Call this at the start of report generation, then update when complete.
 */
export async function createPendingReport(
  userId: string,
  reportData: Omit<SaveReportData, 'durationSeconds' | 'pageCount'>
): Promise<{ data: Report | null; error: Error | null }> {
  requireDatabase();

  const insert: ReportInsert = {
    user_id: userId,
    report_type: reportData.reportType,
    version: 'v4.0',
    city1_name: reportData.city1Name,
    city1_country: reportData.city1Country,
    city2_name: reportData.city2Name,
    city2_country: reportData.city2Country,
    winner: reportData.winner,
    winner_score: reportData.winnerScore,
    loser_score: reportData.loserScore,
    score_difference: reportData.scoreDifference,
    gamma_doc_id: reportData.gammaDocId || null,
    gamma_url: reportData.gammaUrl || null,
    status: 'generating',
  };

  const { data, error } = await withTimeout(
    supabase
      .from('reports')
      .insert(insert)
      .select()
      .single()
  );

  return {
    data: data as Report | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Update a report with completion data and HTML content.
 */
export async function completeReport(
  reportId: string,
  userId: string,
  htmlContent: string,
  durationSeconds: number,
  pageCount: number
): Promise<{ data: Report | null; error: Error | null }> {
  requireDatabase();

  const fileName = `${userId}/${reportId}.html`;

  try {
    // Upload HTML
    const { error: storageError } = await withTimeout(
      supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, htmlContent, {
          contentType: 'text/html',
          cacheControl: '3600',
          upsert: true
        }),
      60000,
      'Upload report HTML'
    );

    if (storageError) throw storageError;

    // Update database record
    const update: ReportUpdate = {
      status: 'completed',
      html_storage_path: fileName,
      generation_completed_at: new Date().toISOString(),
      generation_duration_seconds: durationSeconds,
      page_count: pageCount,
    };

    const { data, error } = await withTimeout(
      supabase
        .from('reports')
        .update(update)
        .eq('id', reportId)
        .select()
        .single()
    );

    if (error) throw error;

    return { data: data as Report, error: null };

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Mark a report as failed.
 */
export async function failReport(
  reportId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(
    supabase
      .from('reports')
      .update({ status: 'failed' })
      .eq('id', reportId)
  );

  return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// REPORT RETRIEVAL
// ============================================================================

/**
 * Get a report by ID (metadata only, no HTML).
 */
export async function getReport(
  reportId: string
): Promise<{ data: Report | null; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(
    supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single()
  );

  return {
    data: data as Report | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get a report with its HTML content.
 * Also logs the access for analytics.
 */
export async function getReportWithHtml(
  reportId: string,
  logAccess: boolean = true
): Promise<{ data: ReportWithHtml | null; error: Error | null }> {
  requireDatabase();

  try {
    // Get metadata
    const { data: report, error: reportError } = await withTimeout(
      supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()
    );

    if (reportError || !report) {
      return {
        data: null,
        error: reportError ? new Error(reportError.message) : new Error('Report not found')
      };
    }

    // Fetch HTML from storage
    if (!report.html_storage_path) {
      return {
        data: null,
        error: new Error('Report HTML not found in storage')
      };
    }

    const { data: htmlData, error: storageError } = await withTimeout(
      supabase.storage
        .from(STORAGE_BUCKET)
        .download(report.html_storage_path),
      30000,
      'Download report HTML'
    );

    if (storageError || !htmlData) {
      return {
        data: null,
        error: storageError ? new Error(storageError.message) : new Error('Failed to download HTML')
      };
    }

    const html = await htmlData.text();

    // Log access if requested
    if (logAccess) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logReportAccess(reportId, user.id, 'view');
      }
    }

    return {
      data: { ...(report as Report), html },
      error: null
    };

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Get all reports for a user.
 */
export async function getUserReports(
  userId: string,
  options: { limit?: number; offset?: number; reportType?: ReportType } = {}
): Promise<{ data: Report[]; error: Error | null }> {
  requireDatabase();

  let query = supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.reportType) {
    query = query.eq('report_type', options.reportType);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await withTimeout(query);

  return {
    data: (data as Report[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get report summaries for user dashboard (lightweight).
 */
export async function getUserReportSummaries(
  userId: string,
  limit: number = 20
): Promise<{ data: ReportSummary[]; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(
    supabase
      .from('reports')
      .select('id, report_type, city1_name, city2_name, winner, winner_score, loser_score, page_count, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  );

  return {
    data: (data as ReportSummary[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Delete a report (removes from storage and database).
 */
export async function deleteReport(
  reportId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  // Get report to find storage path
  const { data: report } = await supabase
    .from('reports')
    .select('html_storage_path')
    .eq('id', reportId)
    .single();

  // Delete from storage if exists
  if (report?.html_storage_path) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([report.html_storage_path]);
  }

  // Delete from database (cascades to access_logs and shares)
  const { error } = await withTimeout(
    supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
  );

  return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// REPORT SHARING
// ============================================================================

/**
 * Create a share link for a report.
 *
 * @param reportId - The report to share
 * @param userId - The user sharing the report
 * @param options - Share configuration
 * @returns Share URL
 */
export async function shareReport(
  reportId: string,
  userId: string,
  options: {
    expiresInDays?: number;
    maxViews?: number;
    requiresEmail?: boolean;
    allowedEmails?: string[];
  } = {}
): Promise<{ data: { shareUrl: string; share: ReportShare } | null; error: Error | null }> {
  requireDatabase();

  const shareToken = crypto.randomUUID();
  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + DEFAULT_SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const insert: ReportShareInsert = {
    report_id: reportId,
    shared_by: userId,
    share_token: shareToken,
    expires_at: expiresAt,
    max_views: options.maxViews || DEFAULT_MAX_VIEWS,
    requires_email: options.requiresEmail || false,
    allowed_emails: options.allowedEmails || null,
  };

  const { data, error } = await withTimeout(
    supabase
      .from('report_shares')
      .insert(insert)
      .select()
      .single()
  );

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  // Use environment variable or default domain
  const baseUrl = import.meta.env.VITE_APP_URL || 'https://clueslifescore.com';
  const shareUrl = `${baseUrl}/shared/${shareToken}`;

  return {
    data: {
      shareUrl,
      share: data as ReportShare
    },
    error: null
  };
}

/**
 * Get a shared report by token (for public access).
 */
export async function getSharedReport(
  shareToken: string
): Promise<{ data: ReportWithHtml | null; error: Error | null }> {
  requireDatabase();

  try {
    // Get share record via public view (excludes password_hash for safety)
    const { data: share, error: shareError } = await withTimeout(
      supabase
        .from('report_shares_public' as any)
        .select('id, report_id, share_token, expires_at, max_views, view_count, requires_email, allowed_emails, created_at, last_accessed_at')
        .eq('share_token', shareToken)
        .single()
    );

    if (shareError || !share) {
      return {
        data: null,
        error: new Error('Share link not found or invalid')
      };
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return {
        data: null,
        error: new Error('This share link has expired')
      };
    }

    // Check view limit
    if (share.max_views && share.view_count >= share.max_views) {
      return {
        data: null,
        error: new Error('This share link has reached its maximum views')
      };
    }

    // Increment view count and update last accessed
    await supabase
      .from('report_shares')
      .update({
        view_count: share.view_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', share.id);

    // Get full report (skip access logging for shared view, we track it separately)
    const { data: report, error: reportError } = await getReportWithHtml(share.report_id, false);

    if (reportError || !report) {
      return {
        data: null,
        error: reportError || new Error('Report not found')
      };
    }

    // Log shared access
    await logReportAccess(share.report_id, null, 'view', shareToken);

    return { data: report, error: null };

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Get all shares for a report.
 */
export async function getReportShares(
  reportId: string
): Promise<{ data: ReportShare[]; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(
    supabase
      .from('report_shares')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at', { ascending: false })
  );

  return {
    data: (data as ReportShare[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Delete a share link.
 */
export async function deleteShare(
  shareId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(
    supabase
      .from('report_shares')
      .delete()
      .eq('id', shareId)
  );

  return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// ACCESS LOGGING
// ============================================================================

/**
 * Log a report access event.
 */
export async function logReportAccess(
  reportId: string,
  userId: string | null,
  accessType: 'view' | 'download' | 'share' | 'embed',
  shareToken?: string
): Promise<void> {
  try {
    const insert: ReportAccessLogInsert = {
      report_id: reportId,
      user_id: userId,
      access_type: accessType,
      share_token: shareToken || null,
    };

    await supabase.from('report_access_logs').insert(insert);
  } catch (error) {
    // Don't throw on logging failures
    console.warn('[ReportStorage] Failed to log access:', error);
  }
}

/**
 * Get access analytics for a report.
 */
export async function getReportAnalytics(
  reportId: string
): Promise<{
  data: {
    totalViews: number;
    uniqueViewers: number;
    downloads: number;
    shares: number;
    recentAccess: Array<{ accessed_at: string; access_type: string }>;
  } | null;
  error: Error | null;
}> {
  requireDatabase();

  try {
    const { data: logs, error } = await withTimeout(
      supabase
        .from('report_access_logs')
        .select('*')
        .eq('report_id', reportId)
        .order('accessed_at', { ascending: false })
    );

    if (error) throw error;

    const accessLogs = logs || [];

    return {
      data: {
        totalViews: accessLogs.filter(l => l.access_type === 'view').length,
        uniqueViewers: new Set(accessLogs.filter(l => l.user_id).map(l => l.user_id)).size,
        downloads: accessLogs.filter(l => l.access_type === 'download').length,
        shares: accessLogs.filter(l => l.access_type === 'share').length,
        recentAccess: accessLogs.slice(0, 10).map(l => ({
          accessed_at: l.accessed_at,
          access_type: l.access_type
        }))
      },
      error: null
    };

  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Saving
  saveReport,
  createPendingReport,
  completeReport,
  failReport,

  // Retrieval
  getReport,
  getReportWithHtml,
  getUserReports,
  getUserReportSummaries,
  deleteReport,

  // Sharing
  shareReport,
  getSharedReport,
  getReportShares,
  deleteShare,

  // Analytics
  logReportAccess,
  getReportAnalytics,
};
