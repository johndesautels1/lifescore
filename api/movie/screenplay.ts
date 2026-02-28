/**
 * LIFE SCORE - Movie Screenplay Generator
 * Stage 1 of the InVideo Moving Movie pipeline.
 *
 * Takes full comparison data (both cities, all scores, judge verdict) and
 * generates a 12-scene cinematic screenplay for a 10-minute InVideo movie.
 *
 * The screenplay tells the user's complete freedom journey:
 *   Act 1: The Struggle (Scenes 1-2) — life in the old/restrictive city
 *   Act 2: The Discovery (Scenes 3-4) — finding CLUES & LIFE SCORE
 *   Act 3: The Revelation (Scenes 5-7) — comparison results, verdict, contrast
 *   Act 4: The Journey (Scenes 8-9) — packing up, traveling
 *   Act 5: The New Life (Scenes 10-12) — arrival, freedom, epilogue
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';

export const config = {
  maxDuration: 300,  // Vercel Pro: 5 min — LLM screenplay can retry
};

// ============================================================================
// CONSTANTS
// ============================================================================

const LLM_TIMEOUT_MS = 280000;  // 280s — just under Vercel Pro 300s limit (LLM may retry)

// ============================================================================
// TYPES
// ============================================================================

export interface MovieComparisonInput {
  // User personalization
  userName?: string;

  // Winner city
  winnerCity: string;
  winnerCountry: string;
  winnerRegion?: string;
  winnerScore: number;
  winnerCityType?: 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';

  // Loser city
  loserCity: string;
  loserCountry: string;
  loserRegion?: string;
  loserScore: number;
  loserCityType?: 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';

  // Category breakdown
  categories?: Array<{
    categoryName: string;
    categoryIcon: string;
    winnerScore: number;
    loserScore: number;
    winner: 'city1' | 'city2';
    keyMetrics?: string[];
  }>;

  // Judge findings
  judgeSummary?: string;
  judgeRecommendation?: string;

  // Freedom narrative data
  winnerStrengths?: string[];
  loserWeaknesses?: string[];
}

export interface ScreenplayScene {
  sceneNumber: number;
  title: string;
  act: string;
  timeStart: string;           // e.g. "0:00"
  timeEnd: string;             // e.g. "0:50"
  durationSeconds: number;
  mood: string;
  musicDirection: string;
  voiceover: string;           // Full narration text for this scene
  visualDirection: string;     // Cinematic direction for InVideo
  onScreenText: string[];      // Text overlays
  colorGrade: string;          // e.g. "cool_desaturated" or "warm_vibrant"
  stockKeywords: string[];     // Search terms for InVideo stock footage
  primaryCategory?: string;    // Freedom category highlighted (if applicable)
}

export interface Screenplay {
  meta: {
    title: string;
    subtitle: string;
    duration: '10:00';
    totalScenes: 12;
    totalWordCount: number;
    winnerCity: string;
    loserCity: string;
    userName?: string;
    musicOverall: string;
    voicePerspective: '2nd_person';
  };
  scenes: ScreenplayScene[];
  productionNotes: {
    castingContinuity: string;
    colorGradingArc: string;
    scoreMention: string;
    ctaText: string;
    disclaimer: string;
  };
}

interface QAResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    sceneCount: number;
    totalDuration: number;
    totalWordCount: number;
  };
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(): string {
  return `You are the LIFE SCORE Moving Movie Screenplay Generator.

You generate a 12-scene cinematic screenplay for a 10-minute movie that tells the complete story of a person's freedom journey — from being trapped in a restrictive city to discovering LIFE SCORE, comparing cities, getting the verdict, and starting their new free life.

OUTPUT: Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation.

NARRATIVE RULES:
1. ALL narration is 2ND PERSON — "you" / "your" / address viewer directly.
2. NEVER use the viewer's real name. Always say "you" or "your" — the video uses stock footage of actors, so naming a real person while showing a stranger is jarring and breaks immersion.
3. The story has a clear emotional arc: melancholy → curiosity → excitement → awe → bittersweet → joy → fulfillment.
4. FREEDOM is the central theme — weave it throughout every scene.
5. Same couple/protagonist throughout all 12 scenes — casting continuity is essential.

SCORE RULES:
- Show exact scores ON SCREEN only ONCE (Scene 5: The Revelation).
- After Scene 5, reference scores as "your LIFE SCORE" or "your freedom score" — never repeat numbers.
- Never invent, round, or alter the scores provided.

SCENE STRUCTURE (12 scenes, total EXACTLY 10:00):

Scene 1: "The Weight" (0:00-0:50, 50s) — ACT 1: STRUGGLE
  User wakes in their current city. Gray, heavy, oppressive. Something isn't right.
  Mood: Melancholy. Color: Cool desaturated.

Scene 2: "The Search" (0:50-1:40, 50s) — ACT 1: STRUGGLE
  Montage of failed searches: generic "best places to live" articles, conflicting advice,
  social media arguments. Everyone has an opinion, nobody has data.
  Mood: Frustration. Color: Cool desaturated.

Scene 3: "The Discovery" (1:40-2:30, 50s) — ACT 2: DISCOVERY
  User finds CLUES — Comprehensive Location Utility & Evaluation System.
  AI-powered. 10,000+ cities. Real data. Not opinions.
  Mood: Curiosity, hope. Color: Warming.

Scene 4: "The Comparison" (2:30-3:30, 60s) — ACT 2: DISCOVERY
  User runs LIFE SCORE comparison. 5 AI models (Claude, GPT-4o, Gemini, Grok, Perplexity)
  independently evaluate 100 freedom metrics and reach consensus.
  Mood: Excitement, anticipation. Color: Warming.

Scene 5: "The Revelation" (3:30-4:40, 70s) — ACT 3: REVELATION
  ★ THE BIG MOMENT — Scores appear on screen (ONLY TIME numbers shown).
  Full category breakdown. The data is clear. The winner is obvious.
  Mood: Awe, clarity. Color: Dramatic contrast.

Scene 6: "The Judge's Verdict" (4:40-5:30, 50s) — ACT 3: REVELATION
  The LIFE SCORE Judge delivers the Court Order. Gavel strikes. Official ruling.
  Judge confirms the winner across all freedom metrics.
  Mood: Authority, finality. Color: Dramatic.

Scene 7: "The Dark Path" (5:30-6:10, 40s) — ACT 3: REVELATION
  What life in the losing city would have looked like — restrictive regulations,
  bureaucratic nightmare, freedom eroded one law at a time.
  LIFE SCORE saved you from a costly, life-altering mistake.
  Mood: Dystopian, cautionary. Color: Desaturated, gray.

Scene 8: "The Decision" (6:10-6:50, 40s) — ACT 4: JOURNEY
  Packing up. Photos off walls. Goodbye party. Hugs. Bittersweet.
  Mood: Bittersweet hope. Color: Warm golden.

Scene 9: "The Journey" (6:50-7:30, 40s) — ACT 4: JOURNEY
  Driving away. Airport. Plane descending through clouds.
  The winning city appears below.
  Mood: Anticipation, wonder. Color: Transitioning bright.

Scene 10: "The Arrival" (7:30-8:20, 50s) — ACT 5: NEW LIFE
  First steps in the new city. Sun shining. Colors vivid. Everything transforms.
  City-specific landmarks and recognizable locations.
  Mood: Joy, wonder. Color: Fully saturated, vibrant.

Scene 11: "The New Life" (8:20-9:20, 60s) — ACT 5: NEW LIFE
  Living montage: morning routines, working from beautiful spaces, exploring,
  meeting new friends, date nights, weekend adventures. Simply being FREE.
  Overlay the freedom strengths that make this city special.
  Mood: Fulfillment, gratitude. Color: Warm, vibrant.

Scene 12: "Freedom" (9:20-10:00, 40s) — ACT 5: EPILOGUE
  Golden hour. Final shot of protagonist content in their new city.
  "Welcome to your new life. A life of freedom, chosen with confidence."
  LIFE SCORE branding. CTA: Cluesnomads.com
  Disclaimer: "Lifestyle scoring, not legal advice."
  Mood: Peace, resolution. Color: Golden warm.

TOTAL: 600 seconds (10:00 exactly).

WORD COUNT: Target 1400-1800 words total voiceover across all 12 scenes (~2.5 words/sec average).

CITY VISUAL ADAPTATION:
- beach: turquoise waters, white sand, palm trees, surfers, seaside promenades, golden sunsets
- mountain: snow-capped peaks, alpine meadows, hiking trails, cozy cabins, crisp mountain air
- urban: gleaming skyline, rooftop terraces, vibrant nightlife, art galleries, food markets
- desert: red rock formations, endless horizons, spectacular sunsets, canyon drives
- european: cobblestone streets, sidewalk cafes, flower balconies, Vespa scooters, open-air markets
- tropical: lush gardens, waterfalls, infinity pools, exotic birds, vibrant colored buildings
- general: beautiful parks, tree-lined boulevards, friendly neighborhoods, local restaurants

JSON SCHEMA:
{
  "meta": {
    "title": "LIFE SCORE Moving Movie",
    "subtitle": "From [LoserCity] to [WinnerCity]: A Freedom Journey",
    "duration": "10:00",
    "totalScenes": 12,
    "totalWordCount": <number>,
    "winnerCity": "<name>",
    "loserCity": "<name>",
    "userName": "<name or null>",
    "musicOverall": "Emotional orchestral, building from melancholy to triumph",
    "voicePerspective": "2nd_person"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "The Weight",
      "act": "ACT 1: STRUGGLE",
      "timeStart": "0:00",
      "timeEnd": "0:50",
      "durationSeconds": 50,
      "mood": "Melancholy, restless",
      "musicDirection": "Soft piano, slightly dissonant",
      "voiceover": "...",
      "visualDirection": "...",
      "onScreenText": ["..."],
      "colorGrade": "cool_desaturated",
      "stockKeywords": ["...", "...", "..."],
      "primaryCategory": "Personal Autonomy"
    }
    // ... 12 scenes total
  ],
  "productionNotes": {
    "castingContinuity": "Same couple/protagonist in every scene. Supporting cast may vary.",
    "colorGradingArc": "Cool desaturated (1-2) → Warming (3-4) → Dramatic (5-7) → Golden warm (8-9) → Vibrant (10-12)",
    "scoreMention": "Exact scores shown ONCE in Scene 5. After that, say 'your LIFE SCORE' only.",
    "ctaText": "For additional information on our Clues Ecosystem and family of applications and services, go to Cluesnomads.com",
    "disclaimer": "Lifestyle scoring, not legal advice."
  }
}`;
}

// ============================================================================
// QA VALIDATION
// ============================================================================

function validateScreenplay(screenplay: Screenplay): QAResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check scene count
  const sceneCount = screenplay.scenes?.length || 0;
  if (sceneCount !== 12) {
    errors.push(`Expected 12 scenes, got ${sceneCount}`);
  }

  // 2. Check total duration
  const totalDuration = screenplay.scenes?.reduce(
    (sum, s) => sum + (s.durationSeconds || 0), 0
  ) || 0;
  if (totalDuration < 580 || totalDuration > 620) {
    errors.push(`Total duration ${totalDuration}s outside 580-620s range (target 600s)`);
  } else if (totalDuration < 590 || totalDuration > 610) {
    warnings.push(`Total duration ${totalDuration}s slightly off from 600s target`);
  }

  // 3. Check word count
  const allVoiceover = screenplay.scenes?.map(s => s.voiceover || '').join(' ') || '';
  const totalWordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;
  if (totalWordCount < 1000 || totalWordCount > 2200) {
    errors.push(`Word count ${totalWordCount} far outside 1400-1800 range`);
  } else if (totalWordCount < 1300 || totalWordCount > 1900) {
    warnings.push(`Word count ${totalWordCount} slightly outside 1400-1800 range`);
  }

  // 4. Check scene titles exist
  const missingTitles = screenplay.scenes?.filter(s => !s.title || !s.voiceover);
  if (missingTitles && missingTitles.length > 0) {
    errors.push(`${missingTitles.length} scenes missing title or voiceover`);
  }

  // 5. Check production notes
  if (!screenplay.productionNotes?.disclaimer) {
    warnings.push('Missing disclaimer in production notes');
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    stats: {
      sceneCount,
      totalDuration,
      totalWordCount,
    },
  };
}

// ============================================================================
// LLM CALL
// ============================================================================

async function generateScreenplay(
  input: MovieComparisonInput,
  qaFeedback?: string[]
): Promise<Screenplay> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt = buildSystemPrompt();

  let userPrompt = `Generate a 12-scene, 10-minute cinematic screenplay for this city comparison.

COMPARISON DATA:
${JSON.stringify(input, null, 2)}

Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation.`;

  if (qaFeedback && qaFeedback.length > 0) {
    userPrompt += `\n\nIMPORTANT — Your previous attempt failed QA with these errors:\n${qaFeedback.map(e => `- ${e}`).join('\n')}\nFix these issues. Pay attention to scene count (12) and total duration (600s).`;
  }

  const response = await fetchWithTimeout(
    'https://api.anthropic.com/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 16384,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    },
    LLM_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM call failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text || '';

  // Extract JSON (handle potential markdown wrapping)
  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let screenplay: Screenplay;
  try {
    screenplay = JSON.parse(jsonText);
  } catch {
    console.error('[MOVIE-SCREENPLAY] JSON parse error. Raw text:', rawText.substring(0, 500));
    throw new Error('LLM returned invalid JSON for screenplay');
  }

  return screenplay;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;
  if (!applyRateLimit(req.headers, 'movie-screenplay', 'heavy', res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { comparisonInput } = req.body as { comparisonInput: MovieComparisonInput };

    if (!comparisonInput?.winnerCity || !comparisonInput?.loserCity) {
      res.status(400).json({ error: 'comparisonInput with winnerCity and loserCity is required' });
      return;
    }

    if (!comparisonInput.winnerScore && comparisonInput.winnerScore !== 0) {
      res.status(400).json({ error: 'comparisonInput.winnerScore is required' });
      return;
    }

    console.log('[MOVIE-SCREENPLAY] Generating for:', comparisonInput.winnerCity, 'vs', comparisonInput.loserCity);

    // Generate screenplay via LLM
    let screenplay = await generateScreenplay(comparisonInput);
    let qa = validateScreenplay(screenplay);

    console.log('[MOVIE-SCREENPLAY] QA result:', {
      passed: qa.passed,
      errors: qa.errors.length,
      warnings: qa.warnings.length,
      stats: qa.stats,
    });

    // Retry up to 2 times if QA fails
    if (!qa.passed) {
      const MAX_RETRIES = 2;
      let bestScreenplay = screenplay;
      let bestQa = qa;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.warn(`[MOVIE-SCREENPLAY] QA failed, retry ${attempt}/${MAX_RETRIES}`);

        const retryScreenplay = await generateScreenplay(comparisonInput, bestQa.errors);
        const retryQa = validateScreenplay(retryScreenplay);

        if (retryQa.errors.length < bestQa.errors.length) {
          bestScreenplay = retryScreenplay;
          bestQa = retryQa;
        }

        if (retryQa.passed) {
          res.status(200).json({
            success: true,
            screenplay: retryScreenplay,
            qa: retryQa,
            retried: true,
            attempts: attempt + 1,
          });
          return;
        }
      }

      // Return best-effort
      console.warn('[MOVIE-SCREENPLAY] All retries exhausted. Returning best-effort.');
      screenplay = bestScreenplay;
      qa = bestQa;
    }

    res.status(200).json({
      success: true,
      screenplay,
      qa,
      retried: !qa.passed,
      bestEffort: !qa.passed,
    });
  } catch (error) {
    console.error('[MOVIE-SCREENPLAY] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Screenplay generation failed',
    });
  }
}
