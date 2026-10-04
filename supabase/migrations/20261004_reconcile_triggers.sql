-- ============================================================================
-- LIFE SCORE - triggers: the live database and the migrations agree
-- ============================================================================
-- Found 4 Oct 2026 comparing the migrations' functions and triggers with
-- production:
--   - update_judge_reports_updated_at (20260125_create_judge_tables) and
--     update_beta_testers_updated_at (20260303_create_beta_testers) were never
--     created live, so editing a judge report or a beta tester left its
--     updated_at unchanged. Created here.
--   - update_conversation_on_message and its trigger on olivia_messages were
--     made by hand in production and are in no migration. Recorded here as
--     they are live (no change there). It adds 1 to message_count; the
--     update_message_count trigger, which fires after it (triggers fire in
--     name order), then recounts, so the stored count is right either way.
--
-- Adds only; safe to re-run. Applied to production 4 Oct 2026 under John's
-- approval of the same day ("adds the missing pieces, deletes nothing").
--
-- Clues Intelligence LTD
-- ============================================================================

CREATE OR REPLACE TRIGGER update_judge_reports_updated_at
  BEFORE UPDATE ON public.judge_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_beta_testers_updated_at
  BEFORE UPDATE ON public.beta_testers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE olivia_conversations
  SET
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER trg_update_conversation_on_message
  AFTER INSERT ON public.olivia_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();
