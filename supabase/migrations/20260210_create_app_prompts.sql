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
  'Moving Movie — Full Screenplay',
  'Complete 10-minute cinematic prompt for InVideo. Uses city names, scores, categories, and Judge findings to build a 7-act relocation story.',
  '== LIFE SCORE™ MOVING MOVIE — INVIDEO CINEMATIC PROMPT ==

VIDEO SPECIFICATIONS:
- Duration: 8-10 minutes
- Style: Cinematic, emotional, documentary-style with narrative voiceover
- Aspect Ratio: 16:9 (landscape)
- Quality: 4K cinematic with color grading
- Music: Emotional orchestral score, building from melancholy to triumph
- Voiceover: Warm, professional narrator

VARIABLES (replaced dynamically):
- {{WINNER_CITY}} — The winning city name
- {{LOSER_CITY}} — The losing city name
- {{WINNER_SCORE}} — Winner score out of 100
- {{LOSER_SCORE}} — Loser score out of 100
- {{SCORE_DIFF}} — Point difference
- {{JUDGE_SUMMARY}} — Judge verdict summary
- {{CATEGORY_BREAKDOWN}} — 6 freedom category scores
- {{WINNER_STRENGTHS}} — Key winning city advantages
- {{LOSER_WEAKNESSES}} — Key losing city disadvantages
- {{WINNER_VISUALS}} — City-type specific visuals (beach/mountain/urban/european/etc.)

--- ACT 1: THE STRUGGLE (0:00 - 1:30) ---
Mood: Melancholy, restless, searching
Music: Soft piano, slightly dissonant, building unease

SCENE 1.1 — THE MORNING ROUTINE
A young couple in their current home. Morning coffee, staring out the window.
Muted color palette. Gray tones. They look thoughtful, unfulfilled.
They exchange a look that says "there has to be something better."

SCENE 1.2 — THE FRUSTRATION
Montage of failed search attempts:
- Scrolling "Best Places to Live" articles (generic, clickbait)
- Overpriced relocation magazines with stale data
- Social media groups where everyone argues
- Water cooler colleagues: "Austin!" "Lisbon!" "Dubai!" — all opinions, no data
Quick cuts, overwhelming. More confused than when they started.

--- ACT 2: THE DISCOVERY (1:30 - 3:00) ---
Mood: Curiosity, growing hope
Music: Piano lightens, strings enter softly

SCENE 2.1 — HEARING ABOUT CLUES
They discover CLUES (Comprehensive Location Utility & Evaluation System).
A friend mentions it or they find it online.
"It analyzed 10,000 cities for us."

SCENE 2.2 — THE CLUES EXPERIENCE
The main CLUES platform. AI asks smart questions about priorities.
Beautiful data visualization: world map, cities narrowing.
10,000 → 1,000 → 100 → a handful of finalists.

SCENE 2.3 — THE SMILE
On their porch, over coffee, or in bed with the laptop —
a smile crosses both faces. CLUES showed real data-driven matches.
But which finalist is THE one?

--- ACT 3: THE MODULES (3:00 - 4:00) ---
Mood: Excitement, determination
Music: Strings building, rhythmic pulse

SCENE 3.1 — THE CLUES ECOSYSTEM
20 specialty modules: Healthcare, Nature, Transport, Religion, Politics,
Education, Cost of Living, Safety, Culture, Freedom (LIFE SCORE).
Dashboard with module icons. They select what matters.

SCENE 3.2 — MEETING OLIVIA
Olivia, the AI relocation agent, recommends:
"Run a LIFE SCORE comparison between {{WINNER_CITY}} and {{LOSER_CITY}}.
Freedom metrics will be critical for your lifestyle."
They can barely wait.

--- ACT 4: THE REVELATION (4:00 - 6:00) ---
Mood: Awe, clarity, relief
Music: Full orchestral swell

SCENE 4.1 — RUNNING THE COMPARISON
clueslifescore.com. Standard comparison first. Eyes widen.

SCENE 4.2 — THE ENHANCED COMPARISON
5 AI models (Claude, GPT-4o, Gemini, Grok, Perplexity) reach consensus.
★ {{WINNER_CITY}}: {{WINNER_SCORE}}/100
✗ {{LOSER_CITY}}: {{LOSER_SCORE}}/100

SCENE 4.3 — THE DINNER REVELATION
Over dinner, the data is clear: {{WINNER_CITY}} wins by {{SCORE_DIFF}} points.
Category breakdown with visual emphasis:
{{CATEGORY_BREAKDOWN}}
A peace comes over them. A purpose. A NEW purpose.
Golden lighting. Hands held across the table.

SCENE 4.4 — THE JUDGE''S VERDICT
LIFE SCORE Judge delivers the Court Order:
{{JUDGE_SUMMARY}}
Dramatic courtroom aesthetic. Gavel strikes. Verdict official.

SCENE 4.5 — THE LOSING CITY CONTRAST
Brief flashback showing what {{LOSER_CITY}} would have meant:
{{LOSER_WEAKNESSES}}
Desaturated, restrictive imagery. Government buildings, long queues.
They almost moved to the wrong place. LIFE SCORE saved them.

--- ACT 5: THE TRANSITION (6:00 - 7:30) ---
Mood: Bittersweet, hopeful
Music: Gentle transition, hopeful melody

SCENE 5.1 — PACKING UP
Boxes packed. Apartment emptied. Photos off walls.
Muted but not sad — an ending that is a beginning.

SCENE 5.2 — SAYING GOODBYE
Party with friends. Hugs. Well wishes.
"You are going to love {{WINNER_CITY}}."

SCENE 5.3 — THE DEPARTURE
Moving vans. Final drive through old neighborhood.
One last look back. Deep breath. Smile. Forward.

--- ACT 6: THE ARRIVAL (7:30 - 9:00) ---
Mood: Joy, wonder, fresh start
Music: Triumphant orchestral, soaring strings

SCENE 6.1 — THE PLANE LANDS
{{WINNER_CITY}} appears below. Vivid saturated colors.
The visual palette completely transforms.

SCENE 6.2 — FIRST STEPS
Sun shining. Birds singing.
{{WINNER_VISUALS}}
Named landmarks from {{WINNER_CITY}}.

SCENE 6.3 — EXPLORING
New neighborhood. First coffee at local cafe. Friendly neighbors.
Wide establishing shots intercut with intimate couple moments.

--- ACT 7: LIVING THE DREAM (9:00 - 10:00) ---
Mood: Fulfillment, gratitude, peace
Music: Emotional peak, gentle resolution

SCENE 7.1 — DREAM LIFE MONTAGE
Morning exercise, home office, date nights, weekend adventures.
Every shot radiates freedom, joy, purpose.
Elegant data overlays:
★ {{WINNER_CITY}}: {{WINNER_SCORE}}/100
FREEDOM SCORE VERIFIED BY 5 AI MODELS
{{WINNER_STRENGTHS}}

SCENE 7.2 — THE FINAL SHOT
Golden hour. The couple smiles.
"Their new life. Scored by data. Chosen with confidence."
"LIFE SCORE™ by Clues Intelligence"
"clueslifescore.com"

--- PRODUCTION NOTES ---
Color: Cool/muted Acts 1-2, warming Act 3, mixed Acts 4-5, vivid Acts 6-7
Font: Elegant sans-serif. Gold #D4AF37 for branding.
Music: Orchestral, no lyrics. Peaks at 2:30, 5:00, 7:30, 9:45.',
  'cluesnomads@gmail.com'
) ON CONFLICT (category, prompt_key) DO NOTHING;
