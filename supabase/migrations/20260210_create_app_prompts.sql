-- ============================================================================
-- LIFE SCORE - Editable Prompts Storage
-- Created: 2026-02-10
--
-- Stores all app prompts in a central, admin-editable table.
-- Prompts are organized by category (sub-tab) and key (unique identifier).
-- Admin can edit prompts in the Help Modal > Prompts tab.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization
  category TEXT NOT NULL,             -- Sub-tab: 'invideo', 'judge', 'olivia', 'gamma', 'evaluate', etc.
  prompt_key TEXT NOT NULL,           -- Unique key within category: 'moving_movie', 'court_order', etc.
  display_name TEXT NOT NULL,         -- Human-readable name shown in UI

  -- Content
  prompt_text TEXT NOT NULL,          -- The actual prompt content (can be very long)
  description TEXT,                   -- Brief description of what this prompt does

  -- Metadata
  version INTEGER DEFAULT 1,          -- Incremented on each edit
  last_edited_by TEXT,                -- Admin email who last edited
  is_active BOOLEAN DEFAULT true,     -- Soft delete

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one active prompt per category+key
  CONSTRAINT unique_active_prompt UNIQUE (category, prompt_key)
);

-- Index for fast lookup by category (sub-tab view)
CREATE INDEX IF NOT EXISTS idx_prompts_category
  ON public.app_prompts (category, is_active)
  WHERE is_active = true;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.app_prompts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active prompts
CREATE POLICY "Anyone can read active prompts"
  ON public.app_prompts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service role has full access (API endpoints use service key)
CREATE POLICY "Service role full access prompts"
  ON public.app_prompts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUTO-UPDATE TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_prompt_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_prompts_updated_at
  BEFORE UPDATE ON public.app_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_prompt_updated_at();

-- ============================================================================
-- SEED: Default InVideo Moving Movie Prompt
-- ============================================================================
INSERT INTO public.app_prompts (category, prompt_key, display_name, description, prompt_text, last_edited_by)
VALUES (
  'invideo',
  'moving_movie',
  'Moving Movie — Full Screenplay v2',
  '10-minute cinematic prompt for InVideo. 2nd-person voice ("you/your"), scores shown ONCE, same couple throughout, freedom/regulation focus, user name personalization. 7-act relocation story.',
  '== LIFE SCORE™ MOVING MOVIE — INVIDEO CINEMATIC PROMPT v2 ==

VIDEO SPECIFICATIONS:
- Duration: EXACTLY 10 MINUTES (10:00). Not 9:30, not 10:30. Exactly 10:00.
- Style: Cinematic, emotional, documentary-style with 2ND-PERSON narrative voiceover
- Aspect Ratio: 16:9 (landscape)
- Quality: 4K cinematic with color grading
- Music: Emotional orchestral score, building from melancholy to triumph
- Voiceover: Warm, professional narrator speaking DIRECTLY TO THE VIEWER
  using "you" and "your" throughout. NEVER use 3rd person.
  Address the viewer by name: "{{USER_NAME}}"

⚠️ CRITICAL PRODUCTION RULES:

1. SCORE ACCURACY: Scores appear ONCE on screen during Act 4 reveal.
   After that, say "your LIFE SCORE" or "your freedom score" — never
   repeat the numbers. Do NOT round, estimate, or invent different scores.

2. CASTING CONTINUITY: Use the SAME primary couple in EVERY scene.
   Friends/family/neighbors may be different. The main couple = same two
   actors from Act 1 through Act 7. No switching.

3. VOICE: ALL narration is 2nd person ("You wake up..." / "Your score...").
   Use {{USER_NAME}} by name at key emotional moments.

4. FREEDOM FOCUS: LIFE SCORE measures 100 legal freedom metrics across
   6 categories. Weave "freedom" and "regulatory burden vs. liberty"
   throughout the narrative. The losing city = restrictive, regulated.
   The winning city = open, free, full of possibility.

VARIABLES (replaced dynamically):
- {{USER_NAME}} — Viewer''s real name (e.g. "Bob Jones")
- {{WINNER_CITY}} — The winning city name
- {{LOSER_CITY}} — The losing city name
- {{WINNER_SCORE}} — Winner score out of 100
- {{LOSER_SCORE}} — Loser score out of 100
- {{SCORE_DIFF}} — Point difference
- {{JUDGE_SUMMARY}} — Judge verdict summary
- {{CATEGORY_BREAKDOWN}} — 6 freedom category scores
- {{WINNER_STRENGTHS}} — Key winning city freedom advantages
- {{LOSER_WEAKNESSES}} — Laws & regulations that restrict your life
- {{WINNER_VISUALS}} — City-type specific visuals

--- ACT 1: YOUR STRUGGLE (0:00 – 1:20) ---
Mood: Melancholy, restless, searching
Music: Soft piano, slightly dissonant, building unease

SCENE 1.1 — YOUR MORNING ROUTINE
Open on you in your current home. Morning coffee, staring out the window
at {{LOSER_CITY}}. Gray, heavy. Something isn''t right.
Voiceover: "{{USER_NAME}}, you''ve been searching for the right place...
but everywhere you look, it''s just noise."

SCENE 1.2 — YOUR FRUSTRATION
Montage of your search attempts:
- Scrolling "Best Places to Live" articles — generic, useless
- Overpriced relocation magazines with stale data
- Social media groups where everyone argues
- Colleagues: "Austin!" "Lisbon!" "Dubai!" — all opinions, no data
You sit on your couch, more confused than when you started.

--- ACT 2: YOUR DISCOVERY (1:20 – 2:40) ---
Mood: Curiosity, growing hope
Music: Piano lightens, strings enter softly

SCENE 2.1 — YOU HEAR ABOUT CLUES
You discover CLUES (Comprehensive Location Utility & Evaluation System).
"Have you tried CLUES? It analyzed over 10,000 cities for us."

SCENE 2.2 — YOUR CLUES EXPERIENCE
The AI-powered CLUES platform narrows 10,000+ metros to your finalists.
Beautiful data visualization: cities on a world map, funnel narrowing.

SCENE 2.3 — YOUR FIRST SMILE
A smile crosses your face. Real data. AI-validated.
But which finalist is THE one?

--- ACT 3: YOUR MODULES (2:40 – 3:50) ---
Mood: Excitement, determination
Music: Strings building, rhythmic pulse

SCENE 3.1 — THE CLUES ECOSYSTEM
20 specialty modules including Freedom (LIFE SCORE) — 100 legal metrics
measuring how free you are to live your life.

SCENE 3.2 — YOU MEET OLIVIA
Olivia recommends: "Run a LIFE SCORE comparison between {{WINNER_CITY}}
and {{LOSER_CITY}}. The freedom metrics — 100 legal measurements —
will be critical for your lifestyle."

--- ACT 4: YOUR REVELATION (3:50 – 6:00) ---
Mood: Awe, clarity, relief
Music: Full orchestral swell

SCENE 4.1 — YOU RUN THE COMPARISON
You log into clueslifescore.com. LIFE SCORE evaluates 100 legal freedom
metrics across 6 categories.

SCENE 4.2 — THE ENHANCED COMPARISON
5 AI models reach consensus. ★ THE SCORES APPEAR ON SCREEN (ONCE ONLY):
  ★ {{WINNER_CITY}}: {{WINNER_SCORE}} / 100
  ✗ {{LOSER_CITY}}: {{LOSER_SCORE}} / 100
Voiceover: "{{USER_NAME}}, your LIFE SCORE results are in."
⚠️ NEVER show these numbers again. Say "your LIFE SCORE" from now on.

SCENE 4.3 — YOUR DINNER REVELATION
{{WINNER_CITY}} wins by {{SCORE_DIFF}} points across 100 legal metrics.
{{CATEGORY_BREAKDOWN}}
You hold hands across the table. You KNOW.

SCENE 4.4 — THE JUDGE''S VERDICT
{{JUDGE_SUMMARY}}
Dramatic courtroom aesthetic. Gavel strikes.

SCENE 4.5 — WHY {{LOSER_CITY}} FAILS YOUR FREEDOM
{{LOSER_CITY}}''s regulatory nightmare:
{{LOSER_WEAKNESSES}}
Restrictive zoning, excessive permits, heavy-handed ordinances,
bureaucratic barriers chipping away at your autonomy.
Government buildings, long queues, regulatory red tape.
You almost moved to the wrong place. LIFE SCORE saved you.

--- ACT 5: YOUR TRANSITION (6:00 – 7:20) ---
Mood: Bittersweet, hopeful
Music: Gentle transition

SCENE 5.1 — PACKING UP YOUR OLD LIFE
Boxes packed. Apartment emptied. An ending that is a beginning.

SCENE 5.2 — YOUR GOODBYES
Goodbye party. Hugs. "You''re going to love {{WINNER_CITY}}."

SCENE 5.3 — YOUR DEPARTURE
Final drive through old neighborhood. One last look back. Forward.
Voiceover: "{{USER_NAME}}, the old life is behind you now."

--- ACT 6: YOUR ARRIVAL (7:20 – 8:40) ---
Mood: Joy, wonder, fresh start
Music: Triumphant orchestral, soaring strings

SCENE 6.1 — YOUR PLANE LANDS
{{WINNER_CITY}} appears below. Vivid saturated colors.

SCENE 6.2 — YOUR FIRST STEPS IN {{WINNER_CITY}}
{{WINNER_VISUALS}}
Real landmarks from {{WINNER_CITY}}. This is YOUR city now.

SCENE 6.3 — EXPLORING YOUR NEW HOME
New neighborhood, first coffee, friendly neighbors.

--- ACT 7: YOUR DREAM LIFE (8:40 – 10:00) ---
Mood: Fulfillment, gratitude, peace
Music: Emotional peak, gentle resolution

SCENE 7.1 — YOUR NEW LIFE MONTAGE
Every shot radiates freedom, joy, purpose.
{{WINNER_STRENGTHS}}
"100 LEGAL METRICS. ONE CLEAR WINNER."

SCENE 7.2 — THE FINAL SHOT
Golden hour. You look at each other and smile.
"{{USER_NAME}}, welcome to your new life."
"LIFE SCORE™ — 100 Freedom Metrics. Your Future, Quantified."
"clueslifescore.com"

--- END (EXACTLY 10:00) ---

--- PRODUCTION NOTES ---
Duration: Act 1=1:20, Act 2=1:20, Act 3=1:10, Act 4=2:10, Act 5=1:20, Act 6=1:20, Act 7=1:20 = 10:00
Casting: SAME couple in ALL scenes. No switching actors.
Voice: 2nd person only. Use {{USER_NAME}} at opening, reveal, departure, final shot.
Scores: Shown ONCE in Act 4. Say "your LIFE SCORE" after that.
Color: Cool Acts 1-2, warming Act 3, mixed Acts 4-5, vivid Acts 6-7.
Font: Elegant sans-serif. Gold #D4AF37 for branding.
Music: Orchestral, no lyrics. Peaks at 2:20, 4:30, 7:20, 9:45.',
  'cluesnomads@gmail.com'
) ON CONFLICT (category, prompt_key) DO NOTHING;
