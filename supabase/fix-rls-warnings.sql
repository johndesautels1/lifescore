-- ═══════════════════════════════════════════════════════════════════════════
-- LIFE SCORE - Supabase RLS & Index Fixes
-- Generated: 2026-01-28
-- Fixes: auth_rls_initplan, multiple_permissive_policies, duplicate_index
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: DROP DUPLICATE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop duplicate indexes (keeping the original, dropping the _new versions)
DROP INDEX IF EXISTS idx_comparisons_user_id_new;
DROP INDEX IF EXISTS idx_olivia_conversations_user_id_new;
DROP INDEX IF EXISTS idx_olivia_messages_conversation_id_new;
DROP INDEX IF EXISTS idx_gamma_reports_user_id_new;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: FIX RLS POLICIES FOR PROFILES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create optimized policies (using subselect for auth.uid())
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: FIX RLS POLICIES FOR COMPARISONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own comparisons" ON comparisons;
DROP POLICY IF EXISTS "Users can create comparisons" ON comparisons;
DROP POLICY IF EXISTS "Users can update own comparisons" ON comparisons;
DROP POLICY IF EXISTS "Users can delete own comparisons" ON comparisons;
DROP POLICY IF EXISTS "Enable read access for users to own comparisons" ON comparisons;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON comparisons;
DROP POLICY IF EXISTS "Enable update access for users to own comparisons" ON comparisons;
DROP POLICY IF EXISTS "Enable delete access for users to own comparisons" ON comparisons;
DROP POLICY IF EXISTS "comparisons_select_policy" ON comparisons;
DROP POLICY IF EXISTS "comparisons_insert_policy" ON comparisons;
DROP POLICY IF EXISTS "comparisons_update_policy" ON comparisons;
DROP POLICY IF EXISTS "comparisons_delete_policy" ON comparisons;

CREATE POLICY "comparisons_select" ON comparisons
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "comparisons_insert" ON comparisons
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "comparisons_update" ON comparisons
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "comparisons_delete" ON comparisons
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: FIX RLS POLICIES FOR OLIVIA_CONVERSATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "Enable read access for users to own conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON olivia_conversations;
DROP POLICY IF EXISTS "Enable update access for users to own conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "Enable delete access for users to own conversations" ON olivia_conversations;
DROP POLICY IF EXISTS "olivia_conversations_select_policy" ON olivia_conversations;
DROP POLICY IF EXISTS "olivia_conversations_insert_policy" ON olivia_conversations;
DROP POLICY IF EXISTS "olivia_conversations_update_policy" ON olivia_conversations;
DROP POLICY IF EXISTS "olivia_conversations_delete_policy" ON olivia_conversations;

CREATE POLICY "olivia_conversations_select" ON olivia_conversations
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "olivia_conversations_insert" ON olivia_conversations
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "olivia_conversations_update" ON olivia_conversations
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "olivia_conversations_delete" ON olivia_conversations
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: FIX RLS POLICIES FOR OLIVIA_MESSAGES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own messages" ON olivia_messages;
DROP POLICY IF EXISTS "Users can create messages" ON olivia_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON olivia_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON olivia_messages;
DROP POLICY IF EXISTS "Enable read access for users to own messages" ON olivia_messages;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON olivia_messages;
DROP POLICY IF EXISTS "Enable update access for users to own messages" ON olivia_messages;
DROP POLICY IF EXISTS "Enable delete access for users to own messages" ON olivia_messages;
DROP POLICY IF EXISTS "olivia_messages_select_policy" ON olivia_messages;
DROP POLICY IF EXISTS "olivia_messages_insert_policy" ON olivia_messages;
DROP POLICY IF EXISTS "olivia_messages_update_policy" ON olivia_messages;
DROP POLICY IF EXISTS "olivia_messages_delete_policy" ON olivia_messages;

CREATE POLICY "olivia_messages_select" ON olivia_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "olivia_messages_insert" ON olivia_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "olivia_messages_update" ON olivia_messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "olivia_messages_delete" ON olivia_messages
  FOR DELETE USING (
    conversation_id IN (
      SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: FIX RLS POLICIES FOR GAMMA_REPORTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "Users can create gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "Users can update own gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "Users can delete own gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "Enable read access for users to own gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON gamma_reports;
DROP POLICY IF EXISTS "Enable update access for users to own gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "Enable delete access for users to own gamma reports" ON gamma_reports;
DROP POLICY IF EXISTS "gamma_reports_select_policy" ON gamma_reports;
DROP POLICY IF EXISTS "gamma_reports_insert_policy" ON gamma_reports;
DROP POLICY IF EXISTS "gamma_reports_update_policy" ON gamma_reports;
DROP POLICY IF EXISTS "gamma_reports_delete_policy" ON gamma_reports;

CREATE POLICY "gamma_reports_select" ON gamma_reports
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "gamma_reports_insert" ON gamma_reports
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "gamma_reports_update" ON gamma_reports
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "gamma_reports_delete" ON gamma_reports
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 7: FIX RLS POLICIES FOR USER_PREFERENCES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can create preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Enable read access for users to own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON user_preferences;
DROP POLICY IF EXISTS "Enable update access for users to own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Enable delete access for users to own preferences" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_select_policy" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_policy" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_policy" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete_policy" ON user_preferences;

CREATE POLICY "user_preferences_select" ON user_preferences
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_insert" ON user_preferences
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_update" ON user_preferences
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_delete" ON user_preferences
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 8: FIX RLS POLICIES FOR JUDGE_REPORTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own judge reports" ON judge_reports;
DROP POLICY IF EXISTS "Users can create judge reports" ON judge_reports;
DROP POLICY IF EXISTS "Users can update own judge reports" ON judge_reports;
DROP POLICY IF EXISTS "Users can delete own judge reports" ON judge_reports;
DROP POLICY IF EXISTS "Enable read access for users to own judge reports" ON judge_reports;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON judge_reports;
DROP POLICY IF EXISTS "Enable update access for users to own judge reports" ON judge_reports;
DROP POLICY IF EXISTS "Enable delete access for users to own judge reports" ON judge_reports;
DROP POLICY IF EXISTS "judge_reports_select_policy" ON judge_reports;
DROP POLICY IF EXISTS "judge_reports_insert_policy" ON judge_reports;
DROP POLICY IF EXISTS "judge_reports_update_policy" ON judge_reports;
DROP POLICY IF EXISTS "judge_reports_delete_policy" ON judge_reports;

CREATE POLICY "judge_reports_select" ON judge_reports
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "judge_reports_insert" ON judge_reports
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "judge_reports_update" ON judge_reports
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "judge_reports_delete" ON judge_reports
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 9: FIX RLS POLICIES FOR SUBSCRIPTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can create subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Enable read access for users to own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON subscriptions;
DROP POLICY IF EXISTS "Enable update access for users to own subscription" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_insert_policy" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_update_policy" ON subscriptions;

CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 10: FIX RLS POLICIES FOR USAGE_TRACKING TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;
DROP POLICY IF EXISTS "Users can create usage records" ON usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON usage_tracking;
DROP POLICY IF EXISTS "Enable read access for users to own usage" ON usage_tracking;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON usage_tracking;
DROP POLICY IF EXISTS "Enable update access for users to own usage" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_select_policy" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_insert_policy" ON usage_tracking;
DROP POLICY IF EXISTS "usage_tracking_update_policy" ON usage_tracking;

CREATE POLICY "usage_tracking_select" ON usage_tracking
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "usage_tracking_insert" ON usage_tracking
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "usage_tracking_update" ON usage_tracking
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 11: FIX RLS POLICIES FOR API_COST_RECORDS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own cost records" ON api_cost_records;
DROP POLICY IF EXISTS "Users can create cost records" ON api_cost_records;
DROP POLICY IF EXISTS "Enable read access for users to own cost records" ON api_cost_records;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON api_cost_records;
DROP POLICY IF EXISTS "api_cost_records_select_policy" ON api_cost_records;
DROP POLICY IF EXISTS "api_cost_records_insert_policy" ON api_cost_records;

CREATE POLICY "api_cost_records_select" ON api_cost_records
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "api_cost_records_insert" ON api_cost_records
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 12: FIX RLS POLICIES FOR CONTRAST_IMAGE_CACHE TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view cached images" ON contrast_image_cache;
DROP POLICY IF EXISTS "Users can create cached images" ON contrast_image_cache;
DROP POLICY IF EXISTS "Users can update cached images" ON contrast_image_cache;
DROP POLICY IF EXISTS "Enable read access for cached images" ON contrast_image_cache;
DROP POLICY IF EXISTS "Enable insert access for cached images" ON contrast_image_cache;
DROP POLICY IF EXISTS "Enable update access for cached images" ON contrast_image_cache;
DROP POLICY IF EXISTS "contrast_image_cache_select_policy" ON contrast_image_cache;
DROP POLICY IF EXISTS "contrast_image_cache_insert_policy" ON contrast_image_cache;
DROP POLICY IF EXISTS "contrast_image_cache_update_policy" ON contrast_image_cache;

-- Cache is shared across users (no user_id), so use authenticated check
CREATE POLICY "contrast_image_cache_select" ON contrast_image_cache
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "contrast_image_cache_insert" ON contrast_image_cache
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "contrast_image_cache_update" ON contrast_image_cache
  FOR UPDATE USING ((SELECT auth.uid()) IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 13: FIX RLS POLICIES FOR GROK_VIDEOS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own videos" ON grok_videos;
DROP POLICY IF EXISTS "Users can create videos" ON grok_videos;
DROP POLICY IF EXISTS "Users can update own videos" ON grok_videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON grok_videos;
DROP POLICY IF EXISTS "Enable read access for users to own videos" ON grok_videos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON grok_videos;
DROP POLICY IF EXISTS "Enable update access for users to own videos" ON grok_videos;
DROP POLICY IF EXISTS "Enable delete access for users to own videos" ON grok_videos;
DROP POLICY IF EXISTS "grok_videos_select_policy" ON grok_videos;
DROP POLICY IF EXISTS "grok_videos_insert_policy" ON grok_videos;
DROP POLICY IF EXISTS "grok_videos_update_policy" ON grok_videos;
DROP POLICY IF EXISTS "grok_videos_delete_policy" ON grok_videos;

CREATE POLICY "grok_videos_select" ON grok_videos
  FOR SELECT USING (user_id = (SELECT auth.uid()));

CREATE POLICY "grok_videos_insert" ON grok_videos
  FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "grok_videos_update" ON grok_videos
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

CREATE POLICY "grok_videos_delete" ON grok_videos
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- Run this after applying fixes to verify no warnings remain
-- ═══════════════════════════════════════════════════════════════════════════

-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 14: FIX FUNCTION SEARCH PATH
-- Added: 2026-01-28
-- ═══════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.get_or_create_usage_period SET search_path = public;
