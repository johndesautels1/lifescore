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

import { supabase, isSupabaseConfigured, SUPABASE_TIMEOUT_MS } from '../lib/supabase';
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
} from '../types/database';

// ============================================================================
// HELPER: Timeout wrapper for Supabase queries (45s)
// ============================================================================

/**
 * Wrap a Supabase query with 45s timeout - rejects on timeout
 * Handles Supabase free tier cold starts which can be slow
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number = SUPABASE_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Supabase query timeout after ${ms}ms`)), ms)
    ),
  ]);
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

  const { data, error } = await withTimeout(
    supabase
      .from('comparisons')
      .upsert(insert, { onConflict: 'user_id,comparison_id' })
      .select()
      .single()
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

  const { data, error } = await withTimeout(query);

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

  const { data, error } = await withTimeout(
    supabase
      .from('comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single()
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

  const { data: comparison, error: compError } = await withTimeout(
    supabase
      .from('comparisons')
      .select('*')
      .eq('id', comparisonId)
      .single()
  );

  if (compError || !comparison) {
    return { data: null, error: compError ? new Error(compError.message) : null };
  }

  // Fetch related conversations and gamma reports in parallel with timeout
  const [conversationsResult, gammaResult] = await Promise.all([
    withTimeout(
      supabase
        .from('olivia_conversations')
        .select('*')
        .eq('comparison_id', comparisonId)
        .order('created_at', { ascending: false })
    ),
    withTimeout(
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

  const { error } = await withTimeout(
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

  const { error } = await withTimeout(
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

  const { data, error } = await withTimeout(
    supabase
      .from('olivia_conversations')
      .insert(insert)
      .select()
      .single()
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

  const { data, error } = await withTimeout(query);

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

  const { data, error } = await withTimeout(
    supabase
      .from('olivia_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('comparison_id', comparisonId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
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

  const { data: conversation, error: convError } = await withTimeout(
    supabase
      .from('olivia_conversations')
      .select('*')
      .eq('id', conversationId)
      .single()
  );

  if (convError || !conversation) {
    return { data: null, error: convError ? new Error(convError.message) : null };
  }

  const { data: messages } = await withTimeout(
    supabase
      .from('olivia_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
  );

  // Optionally fetch linked comparison
  let comparison: Comparison | undefined;
  if (conversation.comparison_id) {
    const { data: comp } = await withTimeout(
      supabase
        .from('comparisons')
        .select('*')
        .eq('id', conversation.comparison_id)
        .single()
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

  const { data, error } = await withTimeout(
    supabase
      .from('olivia_messages')
      .insert(insert)
      .select()
      .single()
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

  const { error } = await withTimeout(
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

  const { error } = await withTimeout(
    supabase
      .from('olivia_conversations')
      .update({ is_active: false })
      .eq('id', conversationId)
  );

  return { error: error ? new Error(error.message) : null };
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
  nickname?: string
): Promise<{ data: GammaReport | null; error: Error | null }> {
  requireDatabase();

  const insert: GammaReportInsert = {
    user_id: userId,
    comparison_id: comparisonId,
    gamma_generation_id: gammaGenerationId,
    gamma_url: gammaUrl,
    pdf_url: pdfUrl || null,
    pptx_url: pptxUrl || null,
    nickname: nickname || null,
  };

  const { data, error } = await withTimeout(
    supabase
      .from('gamma_reports')
      .insert(insert)
      .select()
      .single()
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

  const { data, error } = await withTimeout(
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

  const { data, error } = await withTimeout(
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

  const [profile, comparisons, conversations, gammaReports] = await Promise.all([
    withTimeout(supabase.from('profiles').select('*').eq('id', userId).single()),
    withTimeout(supabase.from('comparisons').select('*').eq('user_id', userId)),
    withTimeout(supabase.from('olivia_conversations').select('*').eq('user_id', userId)),
    withTimeout(supabase.from('gamma_reports').select('*').eq('user_id', userId)),
  ]);

  // Get messages for all conversations
  const conversationIds = (conversations.data || []).map((c: any) => c.id);
  const messages = conversationIds.length > 0
    ? await withTimeout(supabase.from('olivia_messages').select('*').in('conversation_id', conversationIds))
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
// EXPORTS
// ============================================================================

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

  // Gamma
  saveGammaReport,
  getGammaReportsForComparison,
  getUserGammaReports,

  // Sync
  syncLocalToDatabase,
  exportUserData,
};
