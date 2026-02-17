/**
 * LIFE SCORE - Database Service
 * Unified service for all database operations
 *
 * Handles:
 * - Comparisons (save, load, delete)
 * - Olivia conversations (create, resume, messages)
 * - Gamma reports
 * - User preferences
 */

import { supabase, isSupabaseConfigured, withRetry, SUPABASE_TIMEOUT_MS } from '../lib/supabase';
import type {
  Comparison,
  ComparisonInsert,
  ComparisonUpdate,
  OliviaConversation,
  OliviaConversationInsert,
  OliviaMessage,
  OliviaMessageInsert,
  GammaReport,
  GammaReportInsert,
  ComparisonWithRelations,
  ConversationWithMessages,
  ApiCostRecord,
  ApiCostRecordInsert,
  Report,
  ReportWithHtml,
  ReportShare,
  ReportSummary,
} from '../types/database';

// Import report storage service functions
import {
  saveReport,
  createPendingReport,
  completeReport,
  failReport,
  getReport,
  getReportWithHtml,
  getUserReports,
  getUserReportSummaries,
  deleteReport,
  shareReport,
  getSharedReport,
  getReportShares,
  deleteShare,
  logReportAccess,
  getReportAnalytics,
} from './reportStorageService';

// ============================================================================
// HELPER: Timeout wrapper with retry for Supabase queries
// ============================================================================

/**
 * Wrap a Supabase query with retry logic and timeout.
 * Uses exponential backoff on timeout/network errors.
 */
async function withTimeout<T>(
  queryFn: (() => PromiseLike<T>) | PromiseLike<T>,
  ms: number = SUPABASE_TIMEOUT_MS,
  operationName: string = 'Database query'
): Promise<T> {
  // Accept both factory functions and raw promises for backwards compatibility.
  // Factory functions enable true retry (re-execute query on each attempt).
  // Raw promises still work but retries will await the same resolved/rejected result.
  const factory = typeof queryFn === 'function' ? queryFn : () => queryFn;
  return withRetry(factory, {
    timeoutMs: ms,
    operationName,
    maxRetries: 2, // 3 total attempts — aligned with supabase.ts RETRY_CONFIG
  });
}

// ============================================================================
// HELPER: Check if database is available
// ============================================================================

function requireDatabase(): void {
  if (!isSupabaseConfigured()) {
    throw new Error('Database not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  }
}

// ============================================================================
// COMPARISONS
// ============================================================================

/**
 * Save a comparison to the database
 */
export async function saveComparison(
  userId: string,
  comparisonResult: Record<string, unknown>,
  nickname?: string
): Promise<{ data: Comparison | null; error: Error | null }> {
  requireDatabase();

  // Extract city data from result with proper typing
  interface CityData {
    city?: string;
    country?: string;
    normalizedScore?: number;
    totalConsensusScore?: number;
  }
  const city1 = comparisonResult.city1 as CityData | undefined;
  const city2 = comparisonResult.city2 as CityData | undefined;

  const insert: ComparisonInsert = {
    user_id: userId,
    comparison_id: (comparisonResult.comparisonId as string) || crypto.randomUUID(),
    city1_name: city1?.city || 'Unknown',
    city1_country: city1?.country || 'Unknown',
    city1_score: city1?.normalizedScore || city1?.totalConsensusScore || null,
    city2_name: city2?.city || 'Unknown',
    city2_country: city2?.country || 'Unknown',
    city2_score: city2?.normalizedScore || city2?.totalConsensusScore || null,
    winner: comparisonResult.winner as 'city1' | 'city2' | 'tie' || null,
    score_difference: comparisonResult.scoreDifference as number || null,
    comparison_result: comparisonResult,
    nickname,
  };

  const { data, error } = await withTimeout(() =>
    supabase
      .from('comparisons')
      .upsert(insert, { onConflict: 'user_id,comparison_id' })
      .select()
      .maybeSingle()
  );

  return {
    data: data as Comparison | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get all comparisons for a user
 */
export async function getUserComparisons(
  userId: string,
  options: { limit?: number; offset?: number; favoritesOnly?: boolean } = {}
): Promise<{ data: Comparison[]; error: Error | null }> {
  requireDatabase();

  let query = supabase
    .from('comparisons')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.favoritesOnly) {
    query = query.eq('is_favorite', true);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data, error } = await withTimeout(() => query);

  return {
    data: (data as Comparison[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get a single comparison by ID
 */
export async function getComparison(
  comparisonId: string
): Promise<{ data: Comparison | null; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(() =>
    supabase
      .from('comparisons')
      .select('*')
      .eq('id', comparisonId)
      .maybeSingle()
  );

  return {
    data: data as Comparison | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get comparison with related Olivia conversations and Gamma reports
 */
export async function getComparisonWithRelations(
  comparisonId: string
): Promise<{ data: ComparisonWithRelations | null; error: Error | null }> {
  requireDatabase();

  const { data: comparison, error: compError } = await withTimeout(() =>
    supabase
      .from('comparisons')
      .select('*')
      .eq('id', comparisonId)
      .maybeSingle()
  );

  if (compError || !comparison) {
    return { data: null, error: compError ? new Error(compError.message) : null };
  }

  // Fetch related conversations and gamma reports in parallel with timeout
  const [conversationsResult, gammaResult] = await Promise.all([
    withTimeout(() =>
      supabase
        .from('olivia_conversations')
        .select('*')
        .eq('comparison_id', comparisonId)
        .order('created_at', { ascending: false })
    ),
    withTimeout(() =>
      supabase
        .from('gamma_reports')
        .select('*')
        .eq('comparison_id', comparisonId)
        .order('created_at', { ascending: false })
    ),
  ]);

  return {
    data: {
      ...(comparison as Comparison),
      olivia_conversations: conversationsResult.data as OliviaConversation[] || [],
      gamma_reports: gammaResult.data as GammaReport[] || [],
    },
    error: null,
  };
}

/**
 * Update a comparison
 */
export async function updateComparison(
  comparisonId: string,
  updates: ComparisonUpdate
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(() =>
    supabase
      .from('comparisons')
      .update(updates)
      .eq('id', comparisonId)
  );

  return { error: error ? new Error(error.message) : null };
}

/**
 * Delete a comparison
 */
export async function deleteComparison(
  comparisonId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(() =>
    supabase
      .from('comparisons')
      .delete()
      .eq('id', comparisonId)
  );

  return { error: error ? new Error(error.message) : null };
}

/**
 * Toggle favorite status
 */
export async function toggleComparisonFavorite(
  comparisonId: string,
  isFavorite: boolean
): Promise<{ error: Error | null }> {
  return updateComparison(comparisonId, { is_favorite: isFavorite });
}

// ============================================================================
// OLIVIA CONVERSATIONS
// ============================================================================

/**
 * Create a new Olivia conversation
 */
export async function createOliviaConversation(
  userId: string,
  openaiThreadId: string,
  comparisonId?: string,
  title?: string
): Promise<{ data: OliviaConversation | null; error: Error | null }> {
  requireDatabase();

  const insert: OliviaConversationInsert = {
    user_id: userId,
    openai_thread_id: openaiThreadId,
    comparison_id: comparisonId || null,
    title: title || null,
  };

  const { data, error } = await withTimeout(() =>
    supabase
      .from('olivia_conversations')
      .insert(insert)
      .select()
      .maybeSingle()
  );

  return {
    data: data as OliviaConversation | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get user's Olivia conversations
 */
export async function getUserConversations(
  userId: string,
  options: { limit?: number; activeOnly?: boolean } = {}
): Promise<{ data: OliviaConversation[]; error: Error | null }> {
  requireDatabase();

  let query = supabase
    .from('olivia_conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (options.activeOnly) {
    query = query.eq('is_active', true);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await withTimeout(() => query);

  return {
    data: (data as OliviaConversation[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Find existing conversation for a comparison
 */
export async function findConversationForComparison(
  userId: string,
  comparisonId: string
): Promise<{ data: OliviaConversation | null; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(() =>
    supabase
      .from('olivia_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('comparison_id', comparisonId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  return {
    data: data as OliviaConversation | null,
    error: error && error.code !== 'PGRST116' ? new Error(error.message) : null,
  };
}

/**
 * Get conversation with messages
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<{ data: ConversationWithMessages | null; error: Error | null }> {
  requireDatabase();

  const { data: conversation, error: convError } = await withTimeout(() =>
    supabase
      .from('olivia_conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()
  );

  if (convError || !conversation) {
    return { data: null, error: convError ? new Error(convError.message) : null };
  }

  const { data: messages } = await withTimeout(() =>
    supabase
      .from('olivia_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
  );

  // Optionally fetch linked comparison
  let comparison: Comparison | undefined;
  if (conversation.comparison_id) {
    const { data: comp } = await withTimeout(() =>
      supabase
        .from('comparisons')
        .select('*')
        .eq('id', conversation.comparison_id)
        .maybeSingle()
    );
    comparison = comp as Comparison;
  }

  return {
    data: {
      ...(conversation as OliviaConversation),
      messages: (messages as OliviaMessage[]) || [],
      comparison,
    },
    error: null,
  };
}

/**
 * Add a message to a conversation
 */
export async function addOliviaMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  openaiMessageId?: string,
  audioUrl?: string
): Promise<{ data: OliviaMessage | null; error: Error | null }> {
  requireDatabase();

  const insert: OliviaMessageInsert = {
    conversation_id: conversationId,
    role,
    content,
    openai_message_id: openaiMessageId || null,
    audio_url: audioUrl || null,
  };

  const { data, error } = await withTimeout(() =>
    supabase
      .from('olivia_messages')
      .insert(insert)
      .select()
      .maybeSingle()
  );

  return {
    data: data as OliviaMessage | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(() =>
    supabase
      .from('olivia_conversations')
      .update({ title })
      .eq('id', conversationId)
  );

  return { error: error ? new Error(error.message) : null };
}

/**
 * Archive a conversation (mark as inactive)
 */
export async function archiveConversation(
  conversationId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(() =>
    supabase
      .from('olivia_conversations')
      .update({ is_active: false })
      .eq('id', conversationId)
  );

  return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// HELPERS: UUID validation
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a proper UUID.
 * Some tables (gamma_reports) use UUID columns for comparison_id.
 */
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

// ============================================================================
// GAMMA REPORTS
// ============================================================================

/**
 * Save a Gamma report
 */
export async function saveGammaReport(
  userId: string,
  comparisonId: string,
  gammaGenerationId: string,
  gammaUrl: string,
  pdfUrl?: string,
  pptxUrl?: string,
  nickname?: string,
  city1?: string,  // FIX: Add city names for cross-device sync
  city2?: string,  // FIX: Add city names for cross-device sync
  pdfStoragePath?: string,   // Permanent Supabase Storage path for PDF export
  pptxStoragePath?: string   // Permanent Supabase Storage path for PPTX export
): Promise<{ data: GammaReport | null; error: Error | null }> {
  requireDatabase();

  // FIX: gamma_reports.comparison_id is UUID type with FK to comparisons(id).
  // Non-UUID comparison IDs cause 400 errors, and random UUIDs cause FK violations
  // because the UUID doesn't exist in comparisons table. Pass NULL when invalid —
  // the column is nullable and city1/city2 + generationId are sufficient to identify.
  const safeComparisonId = isValidUUID(comparisonId) ? comparisonId : null;
  if (!safeComparisonId) {
    console.warn(`[DB] comparison_id "${comparisonId}" is not a UUID — saving with NULL (FK-safe)`);
  }

  const insert: GammaReportInsert = {
    user_id: userId,
    comparison_id: safeComparisonId,
    gamma_generation_id: gammaGenerationId,
    gamma_url: gammaUrl,
    pdf_url: pdfUrl || null,
    pptx_url: pptxUrl || null,
    pdf_storage_path: pdfStoragePath || null,
    pptx_storage_path: pptxStoragePath || null,
    nickname: nickname || null,
    city1: city1 || null,
    city2: city2 || null,
  };

  const { data, error } = await withTimeout(() =>
    supabase
      .from('gamma_reports')
      .insert(insert)
      .select()
      .maybeSingle()
  );

  return {
    data: data as GammaReport | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get Gamma reports for a comparison
 */
export async function getGammaReportsForComparison(
  comparisonId: string
): Promise<{ data: GammaReport[]; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(() =>
    supabase
      .from('gamma_reports')
      .select('*')
      .eq('comparison_id', comparisonId)
      .order('created_at', { ascending: false })
  );

  return {
    data: (data as GammaReport[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get all Gamma reports for a user
 */
export async function getUserGammaReports(
  userId: string,
  limit: number = 20
): Promise<{ data: GammaReport[]; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(() =>
    supabase
      .from('gamma_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
  );

  return {
    data: (data as GammaReport[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

// ============================================================================
// SYNC UTILITIES
// ============================================================================

/**
 * Sync local comparisons to database (for migration)
 */
export async function syncLocalToDatabase(
  userId: string,
  localComparisons: Array<{ result: Record<string, unknown>; nickname?: string }>
): Promise<{ synced: number; errors: number }> {
  requireDatabase();

  let synced = 0;
  let errors = 0;

  for (const local of localComparisons) {
    const { error } = await saveComparison(userId, local.result, local.nickname);
    if (error) {
      errors++;
      console.error('[DB] Sync error:', error);
    } else {
      synced++;
    }
  }

  return { synced, errors };
}

/**
 * Export all user data (for GDPR compliance)
 */
export async function exportUserData(userId: string): Promise<{
  profile: any;
  comparisons: Comparison[];
  conversations: OliviaConversation[];
  messages: OliviaMessage[];
  gammaReports: GammaReport[];
}> {
  requireDatabase();

  // FIX: Add LIMIT to prevent unbounded queries on large accounts
  const EXPORT_LIMIT = 1000;
  const [profile, comparisons, conversations, gammaReports] = await Promise.all([
    withTimeout(() => supabase.from('profiles').select('*').eq('id', userId).maybeSingle()),
    withTimeout(() => supabase.from('comparisons').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(EXPORT_LIMIT)),
    withTimeout(() => supabase.from('olivia_conversations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(EXPORT_LIMIT)),
    withTimeout(() => supabase.from('gamma_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(EXPORT_LIMIT)),
  ]);

  // Get messages for all conversations
  const conversationIds = (conversations.data || []).map((c: any) => c.id);
  const messages = conversationIds.length > 0
    ? await withTimeout(() => supabase.from('olivia_messages').select('*').in('conversation_id', conversationIds).limit(EXPORT_LIMIT * 10))
    : { data: [] };

  return {
    profile: profile.data,
    comparisons: (comparisons.data as Comparison[]) || [],
    conversations: (conversations.data as OliviaConversation[]) || [],
    messages: (messages.data as OliviaMessage[]) || [],
    gammaReports: (gammaReports.data as GammaReport[]) || [],
  };
}

// ============================================================================
// API COST TRACKING
// ============================================================================

/**
 * Save an API cost record to the database
 */
export async function saveApiCostRecord(
  record: ApiCostRecordInsert
): Promise<{ data: ApiCostRecord | null; error: Error | null }> {
  requireDatabase();

  const { data, error } = await withTimeout(() =>
    supabase
      .from('api_cost_records')
      .upsert(record, { onConflict: 'user_id,comparison_id' })
      .select()
      .maybeSingle()
  );

  return {
    data: data as ApiCostRecord | null,
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get all API cost records for a user
 */
export async function getUserApiCosts(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ data: ApiCostRecord[]; error: Error | null }> {
  requireDatabase();

  let query = supabase
    .from('api_cost_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
  }

  const { data, error } = await withTimeout(() => query);

  return {
    data: (data as ApiCostRecord[]) || [],
    error: error ? new Error(error.message) : null,
  };
}

/**
 * Get API cost summary for a user
 */
export async function getApiCostSummary(
  userId: string
): Promise<{
  data: {
    totalRecords: number;
    grandTotal: number;
    byProvider: Record<string, number>;
  } | null;
  error: Error | null;
}> {
  requireDatabase();

  const { data, error } = await withTimeout(() =>
    supabase
      .from('api_cost_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500)
  );

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const records = (data as ApiCostRecord[]) || [];

  const summary = {
    totalRecords: records.length,
    grandTotal: records.reduce((sum, r) => sum + (r.grand_total || 0), 0),
    byProvider: {
      tavily: records.reduce((sum, r) => sum + (r.tavily_total || 0), 0),
      claude_sonnet: records.reduce((sum, r) => sum + (r.claude_sonnet_total || 0), 0),
      gpt4o: records.reduce((sum, r) => sum + (r.gpt4o_total || 0), 0),
      gemini: records.reduce((sum, r) => sum + (r.gemini_total || 0), 0),
      grok: records.reduce((sum, r) => sum + (r.grok_total || 0), 0),
      perplexity: records.reduce((sum, r) => sum + (r.perplexity_total || 0), 0),
      opus_judge: records.reduce((sum, r) => sum + (r.opus_judge_total || 0), 0),
      gamma: records.reduce((sum, r) => sum + (r.gamma_total || 0), 0),
      olivia: records.reduce((sum, r) => sum + (r.olivia_total || 0), 0),
      tts: records.reduce((sum, r) => sum + (r.tts_total || 0), 0),
      avatar: records.reduce((sum, r) => sum + (r.avatar_total || 0), 0),
    },
  };

  return { data: summary, error: null };
}

/**
 * Delete all API cost records for a user
 */
export async function deleteAllApiCosts(
  userId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(() =>
    supabase
      .from('api_cost_records')
      .delete()
      .eq('user_id', userId)
  );

  return { error: error ? new Error(error.message) : null };
}

/**
 * Delete a single API cost record
 */
export async function deleteApiCostRecord(
  recordId: string
): Promise<{ error: Error | null }> {
  requireDatabase();

  const { error } = await withTimeout(() =>
    supabase
      .from('api_cost_records')
      .delete()
      .eq('id', recordId)
  );

  return { error: error ? new Error(error.message) : null };
}

// ============================================================================
// EXPORTS
// ============================================================================

// ============================================================================
// RE-EXPORT REPORT STORAGE FUNCTIONS
// ============================================================================

// Re-export all report storage functions for unified access
export {
  saveReport,
  createPendingReport,
  completeReport,
  failReport,
  getReport,
  getReportWithHtml,
  getUserReports,
  getUserReportSummaries,
  deleteReport,
  shareReport,
  getSharedReport,
  getReportShares,
  deleteShare,
  logReportAccess,
  getReportAnalytics,
};

// Re-export types
export type { Report, ReportWithHtml, ReportShare, ReportSummary };

export default {
  // Comparisons
  saveComparison,
  getUserComparisons,
  getComparison,
  getComparisonWithRelations,
  updateComparison,
  deleteComparison,
  toggleComparisonFavorite,

  // Conversations
  createOliviaConversation,
  getUserConversations,
  findConversationForComparison,
  getConversationWithMessages,
  addOliviaMessage,
  updateConversationTitle,
  archiveConversation,

  // Gamma (legacy - use new reports system)
  saveGammaReport,
  getGammaReportsForComparison,
  getUserGammaReports,

  // Reports (new storage system)
  saveReport,
  createPendingReport,
  completeReport,
  failReport,
  getReport,
  getReportWithHtml,
  getUserReports,
  getUserReportSummaries,
  deleteReport,
  shareReport,
  getSharedReport,
  getReportShares,
  deleteShare,
  logReportAccess,
  getReportAnalytics,

  // API Costs
  saveApiCostRecord,
  getUserApiCosts,
  getApiCostSummary,
  deleteAllApiCosts,
  deleteApiCostRecord,

  // Sync
  syncLocalToDatabase,
  exportUserData,
};
