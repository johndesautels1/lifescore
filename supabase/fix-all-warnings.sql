-- ═══════════════════════════════════════════════════════════════════════════
-- LIFE SCORE - COMPLETE Supabase Fixes
-- Generated: 2026-01-28
-- Run this ONCE to fix ALL linter warnings
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: FIX ALL FUNCTION SEARCH PATHS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER FUNCTION public.handle_new_user SET search_path = public;
ALTER FUNCTION public.increment_usage SET search_path = public;
ALTER FUNCTION public.update_conversation_message_count SET search_path = public;
ALTER FUNCTION public.update_conversation_on_message SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.get_or_create_usage_period SET search_path = public;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: DROP ALL DUPLICATE INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- First, let's see what indexes exist and drop duplicates
DROP INDEX IF EXISTS idx_comparisons_user_id_new;
DROP INDEX IF EXISTS idx_olivia_conversations_user_id_new;
DROP INDEX IF EXISTS idx_olivia_messages_conversation_id_new;
DROP INDEX IF EXISTS idx_gamma_reports_user_id_new;

-- Additional duplicate indexes on olivia tables
DROP INDEX IF EXISTS olivia_conversations_user_id_idx;
DROP INDEX IF EXISTS olivia_messages_conversation_id_idx;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: DROP ALL EXISTING POLICIES (COMPLETE WIPE)
-- ═══════════════════════════════════════════════════════════════════════════

-- profiles
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- comparisons
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparisons'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.comparisons', r.policyname);
  END LOOP;
END $$;

-- olivia_conversations
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_conversations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.olivia_conversations', r.policyname);
  END LOOP;
END $$;

-- olivia_messages
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.olivia_messages', r.policyname);
  END LOOP;
END $$;

-- gamma_reports
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gamma_reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.gamma_reports', r.policyname);
  END LOOP;
END $$;

-- user_preferences
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_preferences', r.policyname);
  END LOOP;
END $$;

-- judge_reports
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'judge_reports'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.judge_reports', r.policyname);
  END LOOP;
END $$;

-- subscriptions
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', r.policyname);
  END LOOP;
END $$;

-- usage_tracking
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_tracking'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usage_tracking', r.policyname);
  END LOOP;
END $$;

-- api_cost_records
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_cost_records'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.api_cost_records', r.policyname);
  END LOOP;
END $$;

-- contrast_image_cache
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contrast_image_cache'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.contrast_image_cache', r.policyname);
  END LOOP;
END $$;

-- grok_videos
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grok_videos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.grok_videos', r.policyname);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: CREATE CLEAN OPTIMIZED POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = (SELECT auth.uid()));
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = (SELECT auth.uid()));

-- COMPARISONS
CREATE POLICY "comparisons_select" ON comparisons FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "comparisons_insert" ON comparisons FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "comparisons_update" ON comparisons FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY "comparisons_delete" ON comparisons FOR DELETE USING (user_id = (SELECT auth.uid()));

-- OLIVIA_CONVERSATIONS
CREATE POLICY "olivia_conversations_select" ON olivia_conversations FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "olivia_conversations_insert" ON olivia_conversations FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "olivia_conversations_update" ON olivia_conversations FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY "olivia_conversations_delete" ON olivia_conversations FOR DELETE USING (user_id = (SELECT auth.uid()));

-- OLIVIA_MESSAGES (joins to conversations)
CREATE POLICY "olivia_messages_select" ON olivia_messages FOR SELECT
  USING (conversation_id IN (SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "olivia_messages_insert" ON olivia_messages FOR INSERT
  WITH CHECK (conversation_id IN (SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "olivia_messages_update" ON olivia_messages FOR UPDATE
  USING (conversation_id IN (SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "olivia_messages_delete" ON olivia_messages FOR DELETE
  USING (conversation_id IN (SELECT id FROM olivia_conversations WHERE user_id = (SELECT auth.uid())));

-- GAMMA_REPORTS
CREATE POLICY "gamma_reports_select" ON gamma_reports FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "gamma_reports_insert" ON gamma_reports FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "gamma_reports_update" ON gamma_reports FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY "gamma_reports_delete" ON gamma_reports FOR DELETE USING (user_id = (SELECT auth.uid()));

-- USER_PREFERENCES
CREATE POLICY "user_preferences_select" ON user_preferences FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "user_preferences_insert" ON user_preferences FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "user_preferences_update" ON user_preferences FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY "user_preferences_delete" ON user_preferences FOR DELETE USING (user_id = (SELECT auth.uid()));

-- JUDGE_REPORTS
CREATE POLICY "judge_reports_select" ON judge_reports FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "judge_reports_insert" ON judge_reports FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "judge_reports_update" ON judge_reports FOR UPDATE USING (user_id = (SELECT auth.uid()));
CREATE POLICY "judge_reports_delete" ON judge_reports FOR DELETE USING (user_id = (SELECT auth.uid()));

-- SUBSCRIPTIONS
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- USAGE_TRACKING
CREATE POLICY "usage_tracking_select" ON usage_tracking FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "usage_tracking_insert" ON usage_tracking FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "usage_tracking_update" ON usage_tracking FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- API_COST_RECORDS
CREATE POLICY "api_cost_records_select" ON api_cost_records FOR SELECT USING (user_id = (SELECT auth.uid()));
CREATE POLICY "api_cost_records_insert" ON api_cost_records FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- CONTRAST_IMAGE_CACHE (shared cache - restrict to authenticated users with proper check)
CREATE POLICY "contrast_image_cache_select" ON contrast_image_cache FOR SELECT
  USING (EXISTS (SELECT 1 FROM auth.users WHERE id = (SELECT auth.uid())));
CREATE POLICY "contrast_image_cache_insert" ON contrast_image_cache FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM auth.users WHERE id = (SELECT auth.uid())));
CREATE POLICY "contrast_image_cache_update" ON contrast_image_cache FOR UPDATE
  USING (EXISTS (SELECT 1 FROM auth.users WHERE id = (SELECT auth.uid())));

-- GROK_VIDEOS (check if has user_id or is shared)
CREATE POLICY "grok_videos_select" ON grok_videos FOR SELECT
  USING (user_id IS NULL OR user_id = (SELECT auth.uid()));
CREATE POLICY "grok_videos_insert" ON grok_videos FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "grok_videos_update" ON grok_videos FOR UPDATE
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "grok_videos_delete" ON grok_videos FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Refresh the linter page to verify all warnings are resolved.
-- ═══════════════════════════════════════════════════════════════════════════
