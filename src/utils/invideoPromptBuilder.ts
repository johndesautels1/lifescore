/**
 * LIFE SCORE - InVideo Moving Movie Prompt Builder
 *
 * Generates a detailed cinematic prompt for InVideo that tells YOUR full
 * story of relocation — from frustration to discovery to your new life
 * in the winning city.
 *
 * Usage:
 * - TODAY: Copy-paste output into InVideo's manual editor
 * - FUTURE: Send via InVideo API when their endpoint is available
 *
 * The prompt adapts dynamically based on:
 * - Winning & losing city names, scores, and city type (beach/mountain/urban/etc.)
 * - All 6 freedom category breakdowns with specific metric data
 * - Judge verdict summary and Court Order findings
 * - Category winners/losers for nuanced narrative contrast
 * - Your actual name for personalized narration
 *
 * IMPORTANT — Score Consistency:
 * Scores are stated ONCE in the data block and referenced as
 * "your score" / "your LIFE SCORE" thereafter. InVideo must NEVER
 * invent, round, or alter the numbers provided.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

// ============================================================================
// TYPES
// ============================================================================

export interface InVideoPromptInput {
  // User personalization
  userName?: string; // e.g. "Bob Jones" — used for personalized narration

  // Cities
  winnerCity: string;
  loserCity: string;
  winnerScore: number;
  loserScore: number;

  // Category breakdowns (from freedomEducation or comparison result)
  categories?: CategoryBreakdown[];

  // Judge findings (from judge report)
  judgeSummary?: string;
  judgeRecommendation?: string;

  // Optional: city environment hints for visual adaptation
  winnerCityType?: 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';
  loserCityType?: 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';

  // Optional: specific losing metrics to highlight (the "freedom traps")
  loserWeaknesses?: string[];
  winnerStrengths?: string[];
}

export interface CategoryBreakdown {
  categoryName: string;
  categoryIcon: string;
  winnerScore: number;
  loserScore: number;
  winner: 'city1' | 'city2';  // which city won this category
  keyMetrics?: string[];       // notable metric names
}

// ============================================================================
// CITY ENVIRONMENT VISUALS
// ============================================================================

const CITY_VISUALS: Record<string, string> = {
  beach: 'crystal turquoise waters, pristine white sand beaches, palm trees swaying, surfers riding waves, seaside promenades, sailboats on the horizon, golden sunsets over the ocean',
  mountain: 'snow-capped peaks, alpine meadows, cozy log cabins, mountain streams, ski lifts against blue sky, hiking trails through wildflowers, crisp mountain air, eagles soaring',
  urban: 'gleaming skyline, rooftop terraces, vibrant nightlife, bustling cafes, art galleries, neon lights, food markets, penthouse views at golden hour',
  desert: 'dramatic red rock formations, endless horizons, spectacular sunsets, wide open spaces, starry night skies, cactus silhouettes, canyon drives, desert wildflowers',
  european: 'cobblestone streets, sidewalk cafes, church bells ringing, flower-filled balconies, Vespa scooters, open-air markets, riverside walks, centuries-old architecture',
  tropical: 'lush tropical gardens, exotic birds, waterfalls, infinity pools, volcanic landscapes, orchid-lined paths, ocean breezes, vibrant colored buildings',
  general: 'beautiful parks, tree-lined boulevards, friendly neighborhoods, local restaurants, community gathering spaces, scenic overlooks, welcoming atmosphere',
};

const NEGATIVE_CITY_VISUALS: Record<string, string> = {
  beach: 'overcrowded beaches, tourist traps, eroded coastline, faded boardwalk, pollution warnings, parking chaos',
  mountain: 'isolated roads, harsh winters, avalanche warnings, limited services, ice-covered windshields',
  urban: 'traffic gridlock, smog, crowded subways, construction noise, tiny apartments, high-rise shadows',
  desert: 'scorching heat waves, dust storms, barren landscapes, water restrictions, cracked earth',
  european: 'bureaucratic offices, long queues, paperwork mountains, cramped flats, gray rainy streets',
  tropical: 'humidity, mosquitoes, flooding, infrastructure decay, isolation from mainland',
  general: 'gray skies, monotonous suburbs, chain restaurants, empty parking lots, cookie-cutter houses',
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

/**
 * Build the full InVideo Moving Movie prompt.
 *
 * Returns a structured prompt string ready for copy-paste into InVideo
 * or for future API submission.
 *
 * All narration uses 2nd-person ("you" / "your") and references the user
 * by name when available.
 */
export function buildInVideoPrompt(input: InVideoPromptInput): string {
  const {
    userName,
    winnerCity,
    loserCity,
    winnerScore,
    loserScore,
    categories = [],
    judgeSummary,
    judgeRecommendation,
    winnerCityType = 'general',
    loserCityType = 'general',
    loserWeaknesses = [],
    winnerStrengths = [],
  } = input;

  const winnerVisuals = CITY_VISUALS[winnerCityType] || CITY_VISUALS.general;
  const loserNegativeVisuals = NEGATIVE_CITY_VISUALS[loserCityType] || NEGATIVE_CITY_VISUALS.general;
  const scoreDiff = (winnerScore - loserScore).toFixed(1);

  // User name handling — fallback to "you" if no name provided
  const nameGreeting = userName ? `${userName}, your` : 'Your';

  // Build category summary lines
  const categorySummaryLines = categories.map(cat => {
    const winner = cat.winner === 'city1' ? winnerCity : loserCity;
    const diff = Math.abs(cat.winnerScore - cat.loserScore).toFixed(1);
    return `  - ${cat.categoryIcon} ${cat.categoryName}: ${winner} wins by ${diff} points${cat.keyMetrics?.length ? ` (key: ${cat.keyMetrics.join(', ')})` : ''}`;
  }).join('\n');

  // Build freedom contrast sections
  const strengthsList = winnerStrengths.length > 0
    ? winnerStrengths.map(s => `  - ${s}`).join('\n')
    : `  - Greater personal freedoms and individual liberties\n  - Lower regulatory burden — fewer laws restricting daily life\n  - More economic opportunity and financial autonomy`;

  const weaknessesList = loserWeaknesses.length > 0
    ? loserWeaknesses.map(w => `  - ${w}`).join('\n')
    : `  - Oppressive regulatory framework — excessive laws governing personal choices\n  - Heavy bureaucratic overhead — permits, licenses, and red tape for basic activities\n  - Less individual autonomy — government overreach into personal decisions`;

  const prompt = `
================================================================================
LIFE SCORE™ MOVING MOVIE — INVIDEO CINEMATIC PROMPT
================================================================================

VIDEO SPECIFICATIONS:
- Duration: EXACTLY 10 MINUTES (10:00). Not 9:30, not 10:30. Exactly 10:00.
- Style: Cinematic, emotional, documentary-style with 2ND-PERSON narrative voiceover
- Aspect Ratio: 16:9 (landscape)
- Quality: 4K cinematic with color grading
- Music: Emotional orchestral score, building from melancholy to triumph
- Voiceover: Warm, professional narrator speaking DIRECTLY TO THE VIEWER
  using "you" and "your" throughout. NEVER use 3rd person ("they", "the couple").
  ${userName ? `Address the viewer by name: "${userName}"` : 'Address the viewer as "you"'}

⚠️ CRITICAL PRODUCTION RULES — READ BEFORE STARTING:

1. SCORE ACCURACY: The scores below are the ONLY correct numbers. Use them
   EXACTLY as written. Do NOT round, estimate, or change them at any point
   in the video. When referencing scores after the reveal scene, say
   "your LIFE SCORE" or "your freedom score" — do NOT repeat the numbers
   again. The numbers appear ONCE on screen during the reveal (Act 4)
   and NEVER again.

2. CASTING CONTINUITY: Use the SAME primary couple (two actors) in EVERY
   scene from beginning to end. They are the consistent thread of this story.
   Friends, family, neighbors, and colleagues may be different people, but
   the main couple MUST be the same two individuals throughout all 7 acts.
   No switching actors. No different couples. Same two people, same wardrobe
   continuity (age-appropriate changes for different scenes are fine).

3. VOICE PERSPECTIVE: ALL narration is 2nd person. Speak directly to the
   viewer: "You wake up..." / "Your LIFE SCORE reveals..." / "You step off
   the plane into your new city..."
   ${userName ? `Use "${userName}" by name at key emotional moments.` : ''}

4. CITY UNIQUENESS: This video is specifically about ${winnerCity} vs
   ${loserCity}. Every visual, landmark, and cultural reference must be
   authentic to THESE specific cities. Do NOT use generic stock footage
   that could be "any city." Show real, recognizable locations.

5. FREEDOM FOCUS: LIFE SCORE measures 100 legal freedom metrics across
   6 categories. This is a FREEDOM score — it measures how free you are
   to live your life without government overreach, excessive regulation,
   and restrictive laws. Weave this theme throughout the narrative.

================================================================================
NARRATIVE DATA (from LIFE SCORE™ Comparison Report)
================================================================================

WINNING CITY: ${winnerCity}
  Freedom Score: ${winnerScore.toFixed(1)} out of 100

LOSING CITY: ${loserCity}
  Freedom Score: ${loserScore.toFixed(1)} out of 100

SCORE DIFFERENCE: ${scoreDiff} points in favor of ${winnerCity}
${userName ? `\nVIEWER NAME: ${userName}` : ''}
${judgeSummary ? `\nJUDGE SUMMARY: ${judgeSummary}` : ''}
${judgeRecommendation ? `JUDGE RECOMMENDATION: ${judgeRecommendation}` : ''}

CATEGORY BREAKDOWN (6 Freedom Categories, 100 Legal Metrics Total):
${categorySummaryLines || '  (Category data not provided — use general freedom narrative)'}

${winnerCity} FREEDOM STRENGTHS:
${strengthsList}

${loserCity} FREEDOM WEAKNESSES (Laws & Regulations That Restrict Your Life):
${weaknessesList}

⚠️ REMINDER: The scores above are stated ONCE. After the reveal in Act 4,
reference them as "your LIFE SCORE" or "your freedom score" — never repeat
the actual numbers. This prevents any inconsistency.

================================================================================
SCENE-BY-SCENE SCREENPLAY (2ND PERSON — "YOU" / "YOUR")
================================================================================

--- ACT 1: YOUR STRUGGLE (0:00 – 1:20) ---
Mood: Melancholy, restless, searching
Music: Soft piano, slightly dissonant, building unease

SCENE 1.1 — YOUR MORNING ROUTINE
Open on you in your current home. Morning coffee, staring out the window
at ${loserCity}. The city looks gray, heavy. You feel it — something isn't
right. You've felt it for months. The weight of a place that doesn't fit.
Visual: Muted color palette. Cool gray tones. You look thoughtful, unfulfilled.
You exchange a look with your partner that says "there has to be something better."

SCENE 1.2 — YOUR FRUSTRATION
Montage of your search attempts:
- You scroll through "Best Places to Live 2026" articles — generic, clickbait, useless
- You flip through overpriced relocation magazines with stale data and limited metrics
- You find a social media group where everyone argues about different cities
- At work, colleagues at the water cooler each suggest a different place:
  "Austin!" "Lisbon!" "Dubai!" "Costa Rica!" — all opinions, no data, no science
Visual: Quick cuts, overwhelming, each suggestion contradicts the last.
You sit on your couch that evening, more confused than when you started.
${userName ? `Voiceover: "${userName}, you've been searching for the right place... but everywhere you look, it's just noise."` : 'Voiceover: "You\'ve been searching for the right place... but everywhere you look, it\'s just noise."'}

--- ACT 2: YOUR DISCOVERY (1:20 – 2:40) ---
Mood: Curiosity, growing hope
Music: Piano lightens, strings begin to enter softly

SCENE 2.1 — YOU HEAR ABOUT CLUES
You discover CLUES — the Comprehensive Location Utility & Evaluation System.
Maybe a friend mentions it. Maybe you see it in an online community.
"Have you tried CLUES? It analyzed over 10,000 cities for us."
Visual: Your interest is piqued. You pull out your laptop.

SCENE 2.2 — YOUR CLUES EXPERIENCE
You go through the CLUES platform. The AI-powered system asks you smart
questions about what matters most in your life. It processes data from
thousands of sources. A progress animation as CLUES narrows 10,000+
metropolitan areas worldwide down to your personal finalists.
Visual: Beautiful data visualization. Cities appearing and disappearing
on a world map. The funnel narrows: 10,000 → 1,000 → 100 → your finalists.

SCENE 2.3 — YOUR FIRST SMILE
Sitting with your partner — on your porch, over coffee, or in bed with
the laptop — a smile crosses both your faces simultaneously.
CLUES just showed you your top city matches. Real data. AI-validated.
Multi-source analysis. Not random opinions — science.
But now you face a new question: which one? Which finalist is THE one?
Visual: Warm lighting beginning to break through the muted palette.

--- ACT 3: GOING DEEPER — YOUR MODULES (2:40 – 3:50) ---
Mood: Excitement, determination
Music: Strings building, rhythmic pulse enters

SCENE 3.1 — THE CLUES ECOSYSTEM
Brief showcase of the CLUES specialty modules — 20 standalone applications,
each covering a critical life domain:
Healthcare, Nature, Transportation, Religious Beliefs, Political Climate,
Education, Cost of Living, Safety, Culture, and the one that changes
everything for you — Freedom (LIFE SCORE).
Visual: A dashboard showing module icons. You select the ones that matter
most to your life.

SCENE 3.2 — YOU MEET OLIVIA
You activate Olivia, the CLUES-trained international relocation AI agent.
Olivia understands your situation, your priorities, your fears.
She recommends: "Based on your profile, I strongly suggest running a
LIFE SCORE comparison between your two finalist cities — ${winnerCity}
and ${loserCity}. The freedom metrics — 100 legal measurements of how free
you are to live your life — will be critical for your lifestyle."
Visual: Olivia's avatar on screen, warm and intelligent. You nod eagerly.

--- ACT 4: YOUR REVELATION — LIFE SCORE RESULTS (3:50 – 6:00) ---
Mood: Awe, clarity, relief
Music: Full orchestral swell, emotional peaks

SCENE 4.1 — YOU RUN THE COMPARISON
You log into clueslifescore.com. You enter ${winnerCity} vs ${loserCity}.
LIFE SCORE evaluates 100 legal freedom metrics across 6 categories:
personal autonomy, economic liberty, property rights, social freedoms,
regulatory burden, and civic participation.
Visual: The LIFE SCORE interface processing data. Your eyes widen.

SCENE 4.2 — THE ENHANCED COMPARISON
You're so excited you run the enhanced comparison — 5 different AI models
(Claude, GPT-4o, Gemini, Grok, Perplexity) independently evaluate all
100 freedom metrics and reach consensus through mathematical agreement.
Visual: Five AI models working in parallel, scores converging.

★ THE SCORES APPEAR ON SCREEN (this is the ONLY time numbers are shown):

  ★ ${winnerCity}: ${winnerScore.toFixed(1)} / 100
  ✗ ${loserCity}: ${loserScore.toFixed(1)} / 100
  Difference: ${scoreDiff} points

${userName ? `Voiceover: "${userName}, your LIFE SCORE results are in. And they change everything."` : 'Voiceover: "Your LIFE SCORE results are in. And they change everything."'}

⚠️ PRODUCTION NOTE: These scores are shown on screen ONCE here.
For the remainder of the video, reference "your LIFE SCORE" or
"your freedom score" WITHOUT repeating the numbers.

SCENE 4.3 — YOUR DINNER REVELATION
Over dinner, you review the full results together.
The data is unequivocal: ${winnerCity} wins by ${scoreDiff} points
across 100 legal freedom metrics.

Show the category breakdown with visual emphasis:
${categories.map(cat => {
    const winner = cat.winner === 'city1' ? winnerCity : loserCity;
    return `  ${cat.categoryIcon} ${cat.categoryName}: ${winner} leads (${cat.winnerScore.toFixed(1)} vs ${cat.loserScore.toFixed(1)})`;
  }).join('\n') || '  Show the 6 freedom categories with their comparative scores'}

A peace comes over you. A purpose. A NEW purpose.
Visual: Warm golden lighting. You hold hands across the table.
You KNOW. ${winnerCity} is where your new life begins.

SCENE 4.4 — THE JUDGE'S VERDICT
The LIFE SCORE Judge delivers the Court Order — the official ruling
on which city offers you more freedom.
${judgeSummary ? `"${judgeSummary}"` : `The Judge confirms: ${winnerCity} is the clear winner across the freedom metrics that matter most to your life.`}
${judgeRecommendation ? `Judge recommendation: ${judgeRecommendation}` : ''}
Visual: Dramatic courtroom aesthetic. Gavel strikes. The verdict is official.

SCENE 4.5 — THE LOSING CITY: WHY ${loserCity.toUpperCase()} FAILS YOUR FREEDOM
This is where you see what ${loserCity} would have really meant for your life.
Not just a lower score — a fundamentally less free existence:

${loserCity}'s regulatory nightmare:
${weaknessesList}

LIFE SCORE measured 100 specific laws and regulations that directly affect
your daily freedom. In ${loserCity}, too many of those metrics work AGAINST
you — restrictive zoning laws, excessive business permits, heavy-handed
local ordinances, personal choice restrictions, and bureaucratic barriers
that chip away at your autonomy one regulation at a time.

Visual: Desaturated, slightly dystopian imagery. ${loserNegativeVisuals}.
Government buildings with imposing facades. Long queues at permit offices.
Restrictive signage. People looking frustrated dealing with red tape.
Stack of regulatory documents. Fines and penalties notices.
You realize: you almost moved to the wrong place.
LIFE SCORE — and its 100 freedom metrics — saved you from a costly,
life-altering mistake.

--- ACT 5: YOUR TRANSITION (6:00 – 7:20) ---
Mood: Bittersweet but hopeful, anticipation
Music: Gentle transition, hopeful melody emerging

SCENE 5.1 — PACKING UP YOUR OLD LIFE
Montage: Boxes being packed. Your apartment being emptied.
Photos coming off walls. Furniture wrapped.
Visual: Muted but not sad — this is an ending that's also a beginning.

SCENE 5.2 — YOUR GOODBYES
Goodbye party with your friends. Hugs. Well wishes. A few tears.
"You're going to love ${winnerCity}."
Visual: Warm, intimate. Real emotion.

SCENE 5.3 — YOUR DEPARTURE
Moving vans loaded. Your final drive through the old neighborhood.
One last look back through the rear window.
A deep breath. A smile. Forward.
${userName ? `Voiceover: "${userName}, the old life is behind you now. What's ahead is everything you've been searching for."` : 'Voiceover: "The old life is behind you now. What\'s ahead is everything you\'ve been searching for."'}
Visual: The old life receding in the mirror. The road ahead opens up.

--- ACT 6: YOUR ARRIVAL (7:20 – 8:40) ---
Mood: Joy, wonder, fresh start
Music: Full triumphant orchestral score, soaring strings

SCENE 6.1 — YOUR PLANE LANDS
Your airplane descends through clouds. The city of ${winnerCity} appears below.
Visual: Saturated, vivid colors. The visual palette completely transforms from
the muted tones of your old life. Everything is bright, alive, beautiful.

SCENE 6.2 — YOUR FIRST STEPS IN ${winnerCity.toUpperCase()}
You step out into your new city. Sun shining. Birds singing.
${winnerCity}-specific visuals:
${winnerVisuals}

Show the specific environment that makes ${winnerCity} extraordinary.
Named landmarks and recognizable locations from ${winnerCity}.
This is YOUR city now. The freedom metrics proved it.

SCENE 6.3 — EXPLORING YOUR NEW HOME
You find your new neighborhood. Your first coffee at a local cafe.
Walking through streets that already feel like home.
Meeting friendly neighbors. Exploring together, discovering.
Visual: Wide establishing shots of ${winnerCity}'s beauty, intercut with
intimate moments of you falling in love with your new surroundings.

--- ACT 7: YOUR DREAM LIFE (8:40 – 10:00) ---
Mood: Fulfillment, gratitude, peace
Music: Emotional peak, then gentle resolution

SCENE 7.1 — YOUR NEW LIFE MONTAGE
Quick cuts of you living your best life in ${winnerCity}:
- Morning yoga / run / surf / ski (match to ${winnerCityType} environment)
- Working from a beautiful home office or co-working space
- Date nights at incredible local restaurants
- Weekend adventures exploring the region
- Building a community of new friends
- Simply sitting together, happy, healthy, FREE
Visual: Every shot radiates freedom, joy, and purpose.

Elegantly overlay your LIFE SCORE freedom strengths in ${winnerCity}:
${winnerStrengths.length > 0 ? winnerStrengths.map(s => `  ✓ ${s}`).join('\n') : '  ✓ Personal Freedom — your choices, your life\n  ✓ Economic Liberty — build wealth without barriers\n  ✓ Low Regulatory Burden — live without red tape'}

  "FREEDOM SCORE VERIFIED BY 5 AI MODELS"
  "100 LEGAL METRICS. ONE CLEAR WINNER."

SCENE 7.2 — THE FINAL SHOT
You and your partner on a porch / balcony / beach / mountain lookout in ${winnerCity}.
Golden hour light. You look at each other and smile.
You made the right choice. Data-driven. AI-validated. Life-changing.

${userName ? `Voiceover: "${userName}, welcome to your new life. A life of freedom, chosen with confidence."` : 'Voiceover: "Welcome to your new life. A life of freedom, chosen with confidence."'}

Text overlay fades in:
  "${nameGreeting} new life. Scored by data. Chosen with confidence."
  "LIFE SCORE™ — 100 Freedom Metrics. Your Future, Quantified."
  "Clues Intelligence — clueslifescore.com"

--- END (EXACTLY 10:00) ---

================================================================================
PRODUCTION NOTES FOR INVIDEO
================================================================================

1. DURATION CONTROL:
   EXACTLY 10 MINUTES. Budget per act:
   - Act 1 (Struggle): 1:20
   - Act 2 (Discovery): 1:20
   - Act 3 (Modules): 1:10
   - Act 4 (Revelation): 2:10
   - Act 5 (Transition): 1:20
   - Act 6 (Arrival): 1:20
   - Act 7 (Dream Life): 1:20
   Total: 10:00

2. CASTING — SAME COUPLE THROUGHOUT:
   Cast ONE couple (two actors) who appear in EVERY scene. They are the
   consistent visual thread of this story. Do NOT switch to different
   couples or different actors between scenes. Supporting cast (friends,
   family, neighbors, colleagues) can be different people — but the main
   couple must be the SAME two individuals from Act 1 through Act 7.
   Wardrobe changes between acts are fine and expected.

3. COLOR GRADING:
   - Acts 1-2: Cool, desaturated (the struggle and search)
   - Act 3: Warming (the discovery of tools)
   - Act 4: Mixed — dramatic for scores, warm for dinner scene
   - Act 5: Bittersweet golden tones (transition)
   - Acts 6-7: Warm, vibrant, fully saturated (the new life)

4. VOICE & PERSPECTIVE:
   ALL narration is 2ND PERSON — speaking directly to the viewer.
   "You wake up..." / "Your score reveals..." / "You step off the plane..."
   ${userName ? `Use "${userName}" by name at key emotional beats (opening, score reveal, departure, final shot).` : ''}
   NEVER use 3rd person ("the couple", "they", "he/she").

5. SCORE CONSISTENCY:
   Scores appear on screen ONCE during the Act 4 reveal:
     ${winnerCity}: ${winnerScore.toFixed(1)} / 100
     ${loserCity}: ${loserScore.toFixed(1)} / 100
   After that, reference as "your LIFE SCORE" or "your freedom score."
   NEVER show or say different numbers at any other point in the video.

6. FREEDOM THEME:
   LIFE SCORE is a FREEDOM score. It measures 100 legal metrics that
   determine how free you are to live your life — from business regulations
   to personal choice laws to property rights. Weave the word "freedom"
   and the concept of regulatory burden vs. liberty throughout the narrative.
   The losing city should feel restrictive, regulated, and bureaucratic.
   The winning city should feel open, free, and full of possibility.

7. TEXT OVERLAYS:
   - Use elegant, modern sans-serif font
   - Gold accent color (#D4AF37) for LIFE SCORE branding
   - Score displays should feel premium, not clinical

8. PACING:
   - Acts 1-3 move briskly (establishing context)
   - Act 4 slows down (the emotional revelation moment)
   - Act 5 is bittersweet and deliberate
   - Acts 6-7 are energetic and joyful

9. CITY-SPECIFIC ADAPTATION:
   - Winner (${winnerCity}): Use REAL landmarks, recognizable locations, local culture
   - Loser (${loserCity}): Show regulatory/bureaucratic imagery — NOT negative
     shots of the actual city (stay classy), but convey the oppressive legal
     environment through government buildings, permit offices, regulatory signs

10. MUSIC LICENSING:
    - Emotional orchestral throughout
    - NO lyrics (distract from visuals and voiceover)
    - Key emotional peaks at: Discovery of CLUES (2:20), Score reveal (4:30),
      Plane landing (7:20), Final shot (9:45)

================================================================================
INVIDEO API INTEGRATION (FUTURE)
================================================================================

When InVideo launches their API, this prompt can be sent programmatically.
The following fields should be passed as structured data:

{
  "template": "cinematic_relocation_story",
  "duration_minutes": 10,
  "duration_strict": true,
  "viewer_name": ${JSON.stringify(userName || null)},
  "winner_city": "${winnerCity}",
  "loser_city": "${loserCity}",
  "winner_score": ${winnerScore.toFixed(1)},
  "loser_score": ${loserScore.toFixed(1)},
  "winner_city_type": "${winnerCityType}",
  "loser_city_type": "${loserCityType}",
  "categories": ${JSON.stringify(categories.map(c => ({
    name: c.categoryName,
    icon: c.categoryIcon,
    winner_score: c.winnerScore,
    loser_score: c.loserScore,
  })), null, 2)},
  "judge_summary": ${JSON.stringify(judgeSummary || null)},
  "judge_recommendation": ${JSON.stringify(judgeRecommendation || null)},
  "production_rules": {
    "same_couple_throughout": true,
    "voice_perspective": "2nd_person",
    "score_shown_once": true,
    "freedom_theme": true
  },
  "branding": {
    "company": "Clues Intelligence LTD",
    "product": "LIFE SCORE",
    "website": "clueslifescore.com",
    "accent_color": "#D4AF37"
  }
}

================================================================================
`.trim();

  return prompt;
}

/**
 * Build a shorter prompt summary for quick copy-paste or API preview.
 */
export function buildInVideoPromptSummary(input: InVideoPromptInput): string {
  const { userName, winnerCity, loserCity, winnerScore, loserScore } = input;
  const nameLabel = userName ? ` for ${userName}` : '';
  return [
    `LIFE SCORE Moving Movie${nameLabel}: ${winnerCity} (${winnerScore.toFixed(1)}) vs ${loserCity} (${loserScore.toFixed(1)})`,
    `Winner: ${winnerCity} by ${(winnerScore - loserScore).toFixed(1)} points across 100 freedom metrics`,
    `10-minute cinematic story of YOUR relocation journey (2nd person, same couple throughout)`,
    `From frustration → CLUES discovery → LIFE SCORE revelation → your new life in ${winnerCity}`,
  ].join('\n');
}
