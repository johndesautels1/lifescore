/**
 * LIFE SCORE - InVideo Moving Movie Prompt Builder
 *
 * Generates a detailed cinematic prompt for InVideo that tells the full
 * story of a couple's relocation journey — from frustration to discovery
 * to their new life in the winning city.
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
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

// ============================================================================
// TYPES
// ============================================================================

export interface InVideoPromptInput {
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
 */
export function buildInVideoPrompt(input: InVideoPromptInput): string {
  const {
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

  // Build category summary lines
  const categorySummaryLines = categories.map(cat => {
    const winner = cat.winner === 'city1' ? winnerCity : loserCity;
    const diff = Math.abs(cat.winnerScore - cat.loserScore).toFixed(1);
    return `  - ${cat.categoryIcon} ${cat.categoryName}: ${winner} wins by ${diff} points${cat.keyMetrics?.length ? ` (key: ${cat.keyMetrics.join(', ')})` : ''}`;
  }).join('\n');

  // Build freedom contrast sections
  const strengthsList = winnerStrengths.length > 0
    ? winnerStrengths.map(s => `  - ${s}`).join('\n')
    : `  - Greater personal freedoms\n  - Lower regulatory burden\n  - More economic opportunity`;

  const weaknessesList = loserWeaknesses.length > 0
    ? loserWeaknesses.map(w => `  - ${w}`).join('\n')
    : `  - Higher restrictions on personal choices\n  - More bureaucratic overhead\n  - Less individual autonomy`;

  const prompt = `
================================================================================
LIFE SCORE™ MOVING MOVIE — INVIDEO CINEMATIC PROMPT
================================================================================

VIDEO SPECIFICATIONS:
- Duration: 8-10 minutes
- Style: Cinematic, emotional, documentary-style with narrative voiceover
- Aspect Ratio: 16:9 (landscape)
- Quality: 4K cinematic with color grading
- Music: Emotional orchestral score, building from melancholy to triumph
- Voiceover: Warm, professional narrator (male or female)

================================================================================
NARRATIVE DATA (from LIFE SCORE™ Comparison Report)
================================================================================

WINNING CITY: ${winnerCity} (Score: ${winnerScore.toFixed(1)}/100)
LOSING CITY: ${loserCity} (Score: ${loserScore.toFixed(1)}/100)
SCORE DIFFERENCE: ${scoreDiff} points
${judgeSummary ? `\nJUDGE SUMMARY: ${judgeSummary}` : ''}
${judgeRecommendation ? `JUDGE RECOMMENDATION: ${judgeRecommendation}` : ''}

CATEGORY BREAKDOWN:
${categorySummaryLines || '  (Category data not provided — use general freedom narrative)'}

${winnerCity} STRENGTHS:
${strengthsList}

${loserCity} WEAKNESSES:
${weaknessesList}

================================================================================
SCENE-BY-SCENE SCREENPLAY
================================================================================

--- ACT 1: THE STRUGGLE (0:00 - 1:30) ---
Mood: Melancholy, restless, searching
Music: Soft piano, slightly dissonant, building unease

SCENE 1.1 — THE MORNING ROUTINE
Show a young couple in their current home. It's not terrible, but it's not right.
Morning coffee, staring out the window at ${loserCity} (or a generic city if
${loserCity} is the comparison city, not their current home).
Visual: Muted color palette. Gray tones. The couple looks thoughtful, unfulfilled.
They exchange a look that says "there has to be something better."

SCENE 1.2 — THE FRUSTRATION
Montage of their search attempts:
- Scrolling through "Best Places to Live 2026" articles on a laptop (generic, clickbait)
- Flipping through overpriced relocation magazines with stale data and limited metrics
- A social media group where everyone argues about completely different cities
- At work, colleagues at the water cooler each suggesting a different place:
  "Austin!" "Lisbon!" "Dubai!" "Costa Rica!" — all opinions, no data
Visual: Quick cuts, overwhelming, each suggestion contradicts the last.
The couple sits on their couch that evening, more confused than when they started.

--- ACT 2: THE DISCOVERY (1:30 - 3:00) ---
Mood: Curiosity, growing hope
Music: Piano lightens, strings begin to enter softly

SCENE 2.1 — HEARING ABOUT CLUES
The couple discovers CLUES (Comprehensive Location Utility & Evaluation System).
Maybe a friend mentions it. Maybe they see it in an online community.
"Have you tried CLUES? It analyzed 10,000 cities for us."
Visual: The couple's interest is piqued. They pull out their laptop together.

SCENE 2.2 — THE CLUES EXPERIENCE
They go through the main CLUES platform. The AI-powered system asks them smart
questions about what matters most to them. It processes data from thousands of
sources. A progress animation as CLUES narrows 10,000+ metropolitan areas worldwide.
Visual: Beautiful data visualization. Cities appearing and disappearing on a world map.
The funnel narrows: 10,000 → 1,000 → 100 → a handful of finalists.

SCENE 2.3 — THE SMILE
Sitting together — on their porch, over coffee, or in bed with the laptop —
a smile crosses both their faces simultaneously.
CLUES just showed them their top city matches. Real data. AI-validated.
Multi-source analysis. Not random opinions — science.
But now they face a new question: which one? Which of these finalists is THE one?
Visual: Warm lighting beginning to break through the muted palette.

--- ACT 3: GOING DEEPER — THE MODULES (3:00 - 4:00) ---
Mood: Excitement, determination
Music: Strings building, rhythmic pulse enters

SCENE 3.1 — THE CLUES ECOSYSTEM
Brief showcase of the CLUES specialty modules — 20 standalone applications,
each covering a critical life domain:
Healthcare, Nature, Transportation, Religious Beliefs, Political Climate,
Education, Cost of Living, Safety, Culture, and of course — Freedom (LIFE SCORE).
Visual: A dashboard showing module icons. The couple selects the ones that matter
most to their lives.

SCENE 3.2 — MEETING OLIVIA
They activate Olivia, the CLUES-trained international relocation AI agent.
Olivia understands their situation, their priorities, their fears.
She recommends: "Based on your profile, I strongly suggest running a LIFE SCORE
comparison between your two finalist cities — ${winnerCity} and ${loserCity}.
Freedom metrics will be critical for your lifestyle."
Visual: Olivia's avatar on screen, warm and intelligent. The couple nods eagerly.
They can barely wait to get home and run the comparison.

--- ACT 4: THE REVELATION — LIFE SCORE RESULTS (4:00 - 6:00) ---
Mood: Awe, clarity, relief
Music: Full orchestral swell, emotional peaks

SCENE 4.1 — RUNNING THE COMPARISON
The couple logs into clueslifescore.com. They enter ${winnerCity} vs ${loserCity}.
The standard comparison runs first — a single LLM evaluates all 100 freedom metrics.
Visual: The LIFE SCORE interface, data processing, scores appearing.
Their eyes widen.

SCENE 4.2 — THE ENHANCED COMPARISON
They're so excited they run the enhanced comparison — 5 different AI models
(Claude, GPT-4o, Gemini, Grok, Perplexity) independently evaluate all 100 metrics
and reach consensus through mathematical agreement.
Visual: Five AI models working in parallel, scores converging, consensus forming.
The final scores appear:

  ★ ${winnerCity}: ${winnerScore.toFixed(1)}/100
  ✗ ${loserCity}: ${loserScore.toFixed(1)}/100

SCENE 4.3 — THE DINNER REVELATION
Over dinner, they review the full results together.
The data is unequivocal: ${winnerCity} wins by ${scoreDiff} points.

Show the category breakdown with visual emphasis:
${categories.map(cat => {
    const winner = cat.winner === 'city1' ? winnerCity : loserCity;
    return `  ${cat.categoryIcon} ${cat.categoryName}: ${winner} leads (${cat.winnerScore.toFixed(1)} vs ${cat.loserScore.toFixed(1)})`;
  }).join('\n') || '  Show the 6 freedom categories with their comparative scores'}

A peace comes over them. A purpose. A NEW purpose.
Visual: Warm golden lighting. The couple holds hands across the table.
They KNOW. ${winnerCity} is where their new life begins.

SCENE 4.4 — THE JUDGE'S VERDICT
Show the LIFE SCORE Judge delivering the Court Order.
${judgeSummary ? `"${judgeSummary}"` : `The Judge confirms: ${winnerCity} is the clear winner across the freedom metrics that matter most.`}
${judgeRecommendation ? `Judge recommendation: ${judgeRecommendation}` : ''}
Visual: Dramatic courtroom aesthetic. Gavel strikes. The verdict is official.

SCENE 4.5 — THE LOSING CITY CONTRAST
Brief but powerful flashback montage showing what ${loserCity} would have meant:
${weaknessesList}
Visual: Desaturated, slightly dystopian imagery. ${loserNegativeVisuals}.
Government buildings, long queues, restrictive signage, frustrated citizens.
The couple realizes: they almost moved to the wrong place.
LIFE SCORE saved them from a costly, life-altering mistake.

--- ACT 5: THE TRANSITION (6:00 - 7:30) ---
Mood: Bittersweet but hopeful, anticipation
Music: Gentle transition, hopeful melody emerging

SCENE 5.1 — PACKING UP THE OLD LIFE
Montage: Boxes being packed. The old apartment being emptied.
Photos coming off walls. Furniture wrapped.
Visual: Muted but not sad — this is an ending that's also a beginning.

SCENE 5.2 — SAYING GOODBYE
Goodbye party with friends. Hugs. Well wishes. A few tears.
"You're going to love ${winnerCity}."
Visual: Warm, intimate. Real emotion.

SCENE 5.3 — THE DEPARTURE
Moving vans loaded. Final drive through the old neighborhood.
One last look back through the rear window.
A deep breath. A smile. Forward.
Visual: The old life receding in the mirror. The road ahead opens up.

--- ACT 6: THE ARRIVAL (7:30 - 9:00) ---
Mood: Joy, wonder, fresh start
Music: Full triumphant orchestral score, soaring strings

SCENE 6.1 — THE PLANE LANDS
An airplane descends through clouds. The city of ${winnerCity} appears below.
Visual: Saturated, vivid colors. The visual palette completely transforms from
the muted tones of the old life. Everything is bright, alive, beautiful.

SCENE 6.2 — FIRST STEPS IN ${winnerCity.toUpperCase()}
The couple steps out into their new city. Sun shining. Birds singing.
${winnerCity}-specific visuals:
${winnerVisuals}

Show the specific environment that makes ${winnerCity} extraordinary.
Named landmarks and recognizable locations from ${winnerCity}.

SCENE 6.3 — EXPLORING THE NEW HOME
Finding their new neighborhood. The first coffee at a local cafe.
Walking through streets that feel like home already.
Meeting friendly neighbors. The couple exploring together, discovering.
Visual: Wide establishing shots of ${winnerCity}'s beauty, intercut with
intimate moments of the couple falling in love with their new surroundings.

--- ACT 7: LIVING THE DREAM (9:00 - 10:00) ---
Mood: Fulfillment, gratitude, peace
Music: Emotional peak, then gentle resolution

SCENE 7.1 — THE DREAM LIFE MONTAGE
Quick cuts of the couple living their best life in ${winnerCity}:
- Morning yoga / run / surf / ski (match to ${winnerCityType} environment)
- Working from a beautiful home office or co-working space
- Date nights at incredible local restaurants
- Weekend adventures exploring the region
- Building a community of new friends
- Simply sitting together, happy, healthy, at peace
Visual: Every shot radiates freedom, joy, and purpose.

Throughout this montage, elegantly overlay the LIFE SCORE data that made this
possible — the scores, the Judge's findings, the Court Orders — woven into
the visual fabric as beautiful data art:
  ★ ${winnerCity}: ${winnerScore.toFixed(1)}/100
  FREEDOM SCORE VERIFIED BY 5 AI MODELS
${winnerStrengths.length > 0 ? winnerStrengths.map(s => `  ✓ ${s}`).join('\n') : '  ✓ Personal Freedom\n  ✓ Economic Liberty\n  ✓ Low Regulatory Burden'}

SCENE 7.2 — THE FINAL SHOT
The couple on a porch / balcony / beach / mountain lookout in ${winnerCity}.
Golden hour light. They look at each other and smile.
They made the right choice. Data-driven. AI-validated. Life-changing.

Text overlay fades in:
  "Their new life. Scored by data. Chosen with confidence."
  "LIFE SCORE™ by Clues Intelligence"
  "clueslifescore.com"

--- END ---

================================================================================
PRODUCTION NOTES FOR INVIDEO
================================================================================

1. COLOR GRADING:
   - Acts 1-2: Cool, desaturated (the struggle)
   - Act 3: Warming (the discovery)
   - Acts 4-5: Mixed (revelation + transition)
   - Acts 6-7: Warm, vibrant, saturated (the new life)

2. TEXT OVERLAYS:
   - Use elegant, modern sans-serif font
   - Gold accent color (#D4AF37) for LIFE SCORE branding
   - Score displays should feel premium, not clinical

3. PACING:
   - Acts 1-3 move briskly (establishing context)
   - Act 4 slows down (the emotional revelation moment)
   - Act 5 is bittersweet and deliberate
   - Acts 6-7 are energetic and joyful

4. CITY-SPECIFIC ADAPTATION:
   - Winner (${winnerCity}): Use real landmarks, recognizable locations, local culture
   - Loser (${loserCity}): Show generic restrictive/bureaucratic imagery, not
     specific negative shots of the actual city (stay classy)

5. MUSIC LICENSING:
   - Emotional orchestral throughout
   - NO lyrics (distract from visuals)
   - Key emotional peaks at: Discovery of CLUES (2:30), Score reveal (5:00),
     Plane landing (7:30), Final shot (9:45)

================================================================================
INVIDEO API INTEGRATION (FUTURE)
================================================================================

When InVideo launches their API, this prompt can be sent programmatically.
The following fields should be passed as structured data:

{
  "template": "cinematic_relocation_story",
  "duration_minutes": 10,
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
  const { winnerCity, loserCity, winnerScore, loserScore } = input;
  return [
    `LIFE SCORE Moving Movie: ${winnerCity} (${winnerScore.toFixed(1)}) vs ${loserCity} (${loserScore.toFixed(1)})`,
    `Winner: ${winnerCity} by ${(winnerScore - loserScore).toFixed(1)} points`,
    `10-minute cinematic story of a couple's relocation journey`,
    `From frustration → CLUES discovery → LIFE SCORE revelation → new life in ${winnerCity}`,
  ].join('\n');
}
