-- ============================================================================
-- LIFE SCORE - columns production has that no migration made
-- ============================================================================
-- Found 4 Oct 2026 comparing the migrations with production. On production
-- every statement here changes nothing; a database built from the migrations
-- gets what production has.
--
--   - user_preferences: weight_presets, dealbreakers, excluded_categories and
--     law_lived_preferences were added by hand. The code saves the user's
--     weights, dealbreakers and category choices there
--     (src/services/savedComparisons.ts).
--   - judge_reports: 20260124_create_judge_reports and
--     20260125_create_judge_tables both create the table "IF NOT EXISTS", so a
--     database built in file order gets 20260124's shape (city1_name,
--     city2_name, no winner / verdict / key_findings / video_id, no
--     (user_id, report_id) key). Production has 20260125's shape, which the
--     code writes (src/components/JudgeTab.tsx, src/services/savedComparisons.ts
--     upserts on user_id,report_id).
--
-- Applied to production 4 Oct 2026 under John's approval of the same day.
--
-- Clues Intelligence LTD
-- ============================================================================

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS weight_presets JSONB,
  ADD COLUMN IF NOT EXISTS dealbreakers JSONB,
  ADD COLUMN IF NOT EXISTS excluded_categories JSONB,
  ADD COLUMN IF NOT EXISTS law_lived_preferences JSONB;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'judge_reports' AND column_name = 'city1_name')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'judge_reports' AND column_name = 'city1') THEN
    ALTER TABLE public.judge_reports RENAME COLUMN city1_name TO city1;
    ALTER TABLE public.judge_reports RENAME COLUMN city2_name TO city2;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.judge_reports'::regclass AND conname = 'unique_user_report') THEN
    ALTER TABLE public.judge_reports ADD CONSTRAINT unique_user_report UNIQUE (user_id, report_id);
  END IF;
END $$;

ALTER TABLE public.judge_reports
  ADD COLUMN IF NOT EXISTS winner TEXT,
  ADD COLUMN IF NOT EXISTS winner_score NUMERIC,
  ADD COLUMN IF NOT EXISTS margin NUMERIC,
  ADD COLUMN IF NOT EXISTS key_findings JSONB,
  ADD COLUMN IF NOT EXISTS verdict TEXT,
  ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES public.avatar_videos(id) ON DELETE SET NULL;
