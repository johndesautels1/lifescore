-- ============================================================================
-- LIFE SCORE - record the row-level security policies production runs
-- ============================================================================
-- Found 4 Oct 2026: on ten core tables production's policies were rewritten by
-- hand (one policy per command, `(SELECT auth.uid())` evaluated once per
-- query) and never saved as a migration, so a database built from the
-- migrations had the older, broader set — including "Users can update own
-- usage", which would let a user raise their own allowance.
--
-- This records production as it is. On production it changes nothing: the
-- older policies are already gone, and each live policy is created only if
-- missing. On a fresh database it replaces the older set with the live one.
-- The server's service-role key passes every policy, so the dropped
-- "Service role can manage …" policies were never needed.
--
-- Clues Intelligence LTD
-- ============================================================================

-- The older policies (gone in production)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Users can insert own comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Users can update own comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Users can delete own comparisons" ON public.comparisons;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.olivia_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.olivia_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.olivia_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.olivia_conversations;
DROP POLICY IF EXISTS "Users can view own messages" ON public.olivia_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.olivia_messages;
DROP POLICY IF EXISTS "Users can view own gamma reports" ON public.gamma_reports;
DROP POLICY IF EXISTS "Users can insert own gamma reports" ON public.gamma_reports;
DROP POLICY IF EXISTS "Users can delete own gamma reports" ON public.gamma_reports;
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Service role can manage usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can view own cost records" ON public.api_cost_records;
DROP POLICY IF EXISTS "Users can insert own cost records" ON public.api_cost_records;
DROP POLICY IF EXISTS "Users can update own cost records" ON public.api_cost_records;
DROP POLICY IF EXISTS "Users can delete own cost records" ON public.api_cost_records;
DROP POLICY IF EXISTS "Service role can manage all cost records" ON public.api_cost_records;
DROP POLICY IF EXISTS "Users can view own videos" ON public.grok_videos;
DROP POLICY IF EXISTS "Completed videos are reusable" ON public.grok_videos;
DROP POLICY IF EXISTS "Service role full access" ON public.grok_videos;

-- The live policies (created only where missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_cost_records' AND policyname = 'api_cost_records_insert') THEN
    CREATE POLICY api_cost_records_insert ON public.api_cost_records FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_cost_records' AND policyname = 'api_cost_records_select') THEN
    CREATE POLICY api_cost_records_select ON public.api_cost_records FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparisons' AND policyname = 'comparisons_delete') THEN
    CREATE POLICY comparisons_delete ON public.comparisons FOR DELETE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparisons' AND policyname = 'comparisons_insert') THEN
    CREATE POLICY comparisons_insert ON public.comparisons FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparisons' AND policyname = 'comparisons_select') THEN
    CREATE POLICY comparisons_select ON public.comparisons FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comparisons' AND policyname = 'comparisons_update') THEN
    CREATE POLICY comparisons_update ON public.comparisons FOR UPDATE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gamma_reports' AND policyname = 'gamma_reports_delete') THEN
    CREATE POLICY gamma_reports_delete ON public.gamma_reports FOR DELETE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gamma_reports' AND policyname = 'gamma_reports_insert') THEN
    CREATE POLICY gamma_reports_insert ON public.gamma_reports FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gamma_reports' AND policyname = 'gamma_reports_select') THEN
    CREATE POLICY gamma_reports_select ON public.gamma_reports FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'gamma_reports' AND policyname = 'gamma_reports_update') THEN
    CREATE POLICY gamma_reports_update ON public.gamma_reports FOR UPDATE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_conversations' AND policyname = 'olivia_conversations_delete') THEN
    CREATE POLICY olivia_conversations_delete ON public.olivia_conversations FOR DELETE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_conversations' AND policyname = 'olivia_conversations_insert') THEN
    CREATE POLICY olivia_conversations_insert ON public.olivia_conversations FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_conversations' AND policyname = 'olivia_conversations_select') THEN
    CREATE POLICY olivia_conversations_select ON public.olivia_conversations FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_conversations' AND policyname = 'olivia_conversations_update') THEN
    CREATE POLICY olivia_conversations_update ON public.olivia_conversations FOR UPDATE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_delete') THEN
    CREATE POLICY user_preferences_delete ON public.user_preferences FOR DELETE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_insert') THEN
    CREATE POLICY user_preferences_insert ON public.user_preferences FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_select') THEN
    CREATE POLICY user_preferences_select ON public.user_preferences FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_preferences' AND policyname = 'user_preferences_update') THEN
    CREATE POLICY user_preferences_update ON public.user_preferences FOR UPDATE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grok_videos' AND policyname = 'grok_videos_delete') THEN
    CREATE POLICY grok_videos_delete ON public.grok_videos FOR DELETE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grok_videos' AND policyname = 'grok_videos_insert') THEN
    CREATE POLICY grok_videos_insert ON public.grok_videos FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grok_videos' AND policyname = 'grok_videos_select') THEN
    CREATE POLICY grok_videos_select ON public.grok_videos FOR SELECT USING ((user_id IS NULL) OR (user_id = (SELECT auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'grok_videos' AND policyname = 'grok_videos_update') THEN
    CREATE POLICY grok_videos_update ON public.grok_videos FOR UPDATE USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_messages' AND policyname = 'olivia_messages_delete') THEN
    CREATE POLICY olivia_messages_delete ON public.olivia_messages FOR DELETE USING (conversation_id IN (SELECT olivia_conversations.id FROM public.olivia_conversations WHERE olivia_conversations.user_id = (SELECT auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_messages' AND policyname = 'olivia_messages_insert') THEN
    CREATE POLICY olivia_messages_insert ON public.olivia_messages FOR INSERT WITH CHECK (conversation_id IN (SELECT olivia_conversations.id FROM public.olivia_conversations WHERE olivia_conversations.user_id = (SELECT auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_messages' AND policyname = 'olivia_messages_select') THEN
    CREATE POLICY olivia_messages_select ON public.olivia_messages FOR SELECT USING (conversation_id IN (SELECT olivia_conversations.id FROM public.olivia_conversations WHERE olivia_conversations.user_id = (SELECT auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'olivia_messages' AND policyname = 'olivia_messages_update') THEN
    CREATE POLICY olivia_messages_update ON public.olivia_messages FOR UPDATE USING (conversation_id IN (SELECT olivia_conversations.id FROM public.olivia_conversations WHERE olivia_conversations.user_id = (SELECT auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert') THEN
    CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select') THEN
    CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update') THEN
    CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscriptions' AND policyname = 'subscriptions_select') THEN
    CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'usage_tracking' AND policyname = 'usage_tracking_select') THEN
    CREATE POLICY usage_tracking_select ON public.usage_tracking FOR SELECT USING (user_id = (SELECT auth.uid()));
  END IF;
END $$;
