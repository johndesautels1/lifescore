/**
 * LIFE SCORE - Cristiano "Go To My New City" Storyboard Builder
 * Stage 1 of the 2-stage video pipeline.
 *
 * Takes a Winner Package JSON (freedom scores, categories, city data)
 * and calls an LLM to generate a 7-scene storyboard JSON following
 * the locked format template (105-120s, ~220-270 words, all 6 categories).
 *
 * The storyboard is validated against hard requirements before returning.
 * Stage 2 (render.ts) takes this storyboard and sends it to HeyGen Video Agent.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';

export const config = {
  maxDuration: 300,  // Vercel Pro: 5 min — LLM storyboard can retry (2×90s) + validation
};

// ============================================================================
// CONSTANTS
// ============================================================================

const LLM_TIMEOUT_MS = 90000; // 90 seconds for storyboard generation

// The 6 freedom categories (must all appear as primary_category across 7 scenes)
const REQUIRED_CATEGORIES = [
  'Personal Autonomy',
  'Housing, Property & HOA Control',
  'Business & Work Regulation',
  'Transportation & Daily Movement',
  'Policing, Courts & Enforcement',
  'Speech, Lifestyle & Culture',
];

const REQUIRED_DISCLAIMER = 'Lifestyle scoring, not legal advice.';

// ============================================================================
// TYPES
// ============================================================================

interface WinnerPackage {
  winning_city_name: string;
  winning_region?: string;
  winning_country: string;
  freedom_score_overall: number;
  category_scores: {
    personal_autonomy: number;
    housing_property_hoa: number;
    business_work: number;
    transportation_movement: number;
    policing_courts: number;
    speech_lifestyle_culture: number;
  };
  top_neighborhoods?: Array<{
    name: string;
    one_liner_reason: string;
    signature_visual: string;
  }>;
  signature_city_highlights?: string[];
  watchouts?: string[];
  executive_summary?: {
    rationale?: string;
    key_factors?: string[];
    future_outlook?: string;
  };
  category_winners?: Record<string, string>;
}

interface StoryboardScene {
  scene?: number;             // Optional — array index implies order
  type: 'A_ROLL' | 'B_ROLL';
  duration_seconds: number;
  primary_category: string;
  overlay: string;            // Per-scene overlay text e.g. "Freedom Score: 82%" or "Personal Autonomy: 78%"
  visual_direction: string;
  voiceover: string;
  on_screen_text: string[];
  stock_search_keywords: string[];
  transition?: string;        // Optional — stripped before HeyGen, cinematic default applied
}

interface Storyboard {
  video_meta: {
    series_title: string;
    episode_title: string;
    target_duration_seconds: number;
    target_word_count: number;
    music_mood: string;
    font_style: string;
    safe_area_note?: string;    // Removed from schema — overlay instructions handle this
  };
  overlay_system?: {           // Deprecated — per-scene overlay field replaces this
    freedom_score_badge?: { text: string; position: string };
    category_strip?: { position: string; categories: string[]; scores_placeholder: string };
    logo_qr_reserved_box?: { position: string; note: string };
    caption_style?: { enabled: boolean; max_words_per_line: number; max_lines: number };
  };
  scenes: StoryboardScene[];
  neighborhoods: Array<{
    name: string;
    freedom_reason_one_liner: string;
    signature_visual?: string;  // Optional — stripped before HeyGen
  }>;
  ending_disclaimer: string;
  thumbnail?: {                 // Optional — stripped before HeyGen
    title_text: string;
    subtitle_text: string;
    visual_concept: string;
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
    categoriesCovered: string[];
    neighborhoodCount: number;
    disclaimerPresent: boolean;
  };
}

// ============================================================================
// SYSTEM PROMPT - The Storyboard Builder
// ============================================================================

function buildSystemPrompt(): string {
  return `You are the CLUES "Go To My New City" Storyboard Builder.
Generate a premium cinematic 105–120 second video plan led by an avatar judge narrator named Cristiano.
Theme: FREEDOM. Every scene must reinforce both legal freedom and lived freedom.
OUTPUT FORMAT: Return ONLY valid JSON that matches the schema provided below. No extra text.

HARD RULES:
- Total scenes: 7
- Total duration: 105–120 seconds
- Total voiceover: 200–250 words (HARD CAP: never exceed 300)
- Scenes 1 and 7 are A-ROLL (Cristiano on camera speaking)
- Scenes 2–6 are B-ROLL (cinematic city footage with captions)
- Every scene must specify one primary freedom category (from the 6)
- Across all scenes, all 6 categories must be highlighted at least once
- On-screen text: max 6 words per line, max 2 lines at a time
- Captions ON, clean modern font
- End with: "Lifestyle scoring, not legal advice."

OVERLAY STRATEGY (keep simple — ONE key visual per scene):
- Each scene MUST include an "overlay" field with the exact text to display.
- A-ROLL scenes (1 & 7): overlay = "Freedom Score: [OVERALL]%" (use the actual overall score)
- B-ROLL scenes (2–6): overlay = "[primary_category]: [SCORE]%" (use the primary_category assigned to that scene and its matching score)
- Do NOT stack multiple overlays. One overlay per scene maximum.
- Reserve lower-right 15% for CLUES logo + QR box (always visible).

TONE:
Modern, welcoming, progressive, authoritative (judge-like but friendly).
Avoid legal advice language. Do not claim "guarantees." Use "tends to," "often," "designed to," "typically."

SCENE TIMING TEMPLATE (follow exactly):
1. 12s A-roll intro + Freedom Score badge + city title → primary_category: "Personal Autonomy"
2. 18s city aerial + freedom framing → primary_category: "Housing, Property & HOA Control"
3. 16s business & work life → primary_category: "Business & Work Regulation"
4. 16s transportation & movement → primary_category: "Transportation & Daily Movement"
5. 16s policing, courts, civic order → primary_category: "Policing, Courts & Enforcement"
6. 16s MAP + 3–4 neighborhoods "Freedom Hotspots" → primary_category: "Speech, Lifestyle & Culture"
7. 12s A-roll verdict + "Cristiano's Orders" list + CTA + disclaimer → primary_category: "Personal Autonomy"

CRITICAL: Each of the 6 required categories MUST appear as "primary_category" in at least one scene.
The mapping above guarantees all 6 are covered. Follow it exactly.
     Cristiano MUST end with: "For additional information on our Clues Ecosystem and family of applications and services, go to Cluesnomads.com"

SCENE 7 ON-SCREEN HEADER: "Cristiano's Orders" with 3–5 bullets max, mapped to winning city's strongest categories:
- "Move freely." (Transportation & Daily Movement)
- "Live loudly." (Speech, Lifestyle & Culture)
- "Own with clarity." (Housing/Property/HOA)
- "Work without friction." (Business & Work)
- "Choose autonomy daily." (Personal Autonomy)

SCENE 7 CLOSING CTA (MANDATORY — Cristiano must say this verbatim):
"For additional information on our Clues Ecosystem and family of applications and services, go to Cluesnomads.com"
On-screen text: "Cluesnomads.com"
Do NOT substitute any other website URL. The ONLY website mentioned must be Cluesnomads.com.

B-ROLL STOCK FOOTAGE RULES:
CRITICAL: Each individual B-roll stock footage clip MUST be 6 seconds or less. If a B-roll scene is longer than 6 seconds, use MULTIPLE clips (e.g. an 18s scene = 3 clips of 6s each, a 16s scene = 2-3 clips). Never use a single clip longer than 6 seconds.
Use GENERIC cinematic terms first, then the specific city/area name. This helps find footage fast while keeping it location-relevant.
- Pattern: "[generic descriptor] [city name]" e.g. "modern downtown Portland", "waterfront neighborhood Copenhagen"
- Personal Autonomy: "vibrant street market [city]", "sunny public park [city]", "outdoor cafe district [city]"
- Housing/Property/HOA: "residential neighborhood [city]", "modern apartment building [city]", "tree-lined street [city]"
- Business/Work: "modern coworking space", "cafe with laptops [city]", "sleek office building [city]"
- Transportation: "bike lane [city]", "modern transit station [city]", "walkable downtown [city]"
- Policing/Courts: "civic building [city]", "clean public plaza [city]", "orderly downtown [city]"
- Speech/Culture: "art district [city]", "outdoor festival [city]", "bookshop street [city]"

IMPORTANT: Do NOT request hyper-specific landmarks (e.g. "Intel Ronler Acres campus"). Instead use generic-but-local terms (e.g. "modern tech campus Hillsboro Oregon"). The footage must feel like the actual city area, not a generic placeholder.

ALWAYS prefer footage that implies: openness, mobility, sunlight, visibility, safety, choice, access
AVOID: grim police visuals, protests as default, surveillance closeups, heavy militarized imagery, propaganda

CONCISENESS RULES (critical — output is sent to HeyGen which has a 10,000 char limit):
- visual_direction: 1 brief sentence max (~60-100 chars). Describe the shot concisely.
- stock_search_keywords: max 4 keywords per scene
- on_screen_text: max 2 items per scene
- Do NOT include "transition" — cinematic transitions are applied automatically
- Do NOT include "thumbnail" — thumbnails are generated separately

JSON SCHEMA TO FOLLOW:
{
  "video_meta": {
    "series_title": "CLUES Freedom Tour",
    "episode_title": "Go To My New City: [CITY]",
    "target_duration_seconds": 112,
    "target_word_count": 225,
    "music_mood": "cinematic_uplifting_subtle",
    "font_style": "modern_sans"
  },
  "scenes": [
    {
      "type": "A_ROLL",
      "duration_seconds": 12,
      "primary_category": "Personal Autonomy",
      "overlay": "Freedom Score: 82%",
      "visual_direction": "Cristiano on camera, city silhouette background. Freedom Score badge animates in.",
      "voiceover": "...",
      "on_screen_text": ["Freedom Score: 82%", "[CITY]"],
      "stock_search_keywords": ["skyline [city]", "aerial downtown [city]"]
    },
    {
      "type": "B_ROLL",
      "duration_seconds": 18,
      "primary_category": "Personal Autonomy",
      "overlay": "Personal Autonomy: 78%",
      "visual_direction": "Aerial sweep of [city] downtown, sunlit streets.",
      "voiceover": "...",
      "on_screen_text": ["Personal Autonomy", "78%"],
      "stock_search_keywords": ["aerial downtown [city]", "sunny public park [city]"]
    }
  ],
  "neighborhoods": [
    { "name": "[NEIGHBORHOOD]", "freedom_reason_one_liner": "..." }
  ],
  "ending_disclaimer": "Lifestyle scoring, not legal advice."
}`;
}

// ============================================================================
// QA VALIDATION
// ============================================================================

function validateStoryboard(storyboard: Storyboard): QAResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check scene count
  const sceneCount = storyboard.scenes?.length || 0;
  if (sceneCount !== 7) {
    errors.push(`Expected 7 scenes, got ${sceneCount}`);
  }

  // 2. Check total duration (105-120s target, hard limits 100-125s)
  const totalDuration = storyboard.scenes?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
  if (totalDuration < 100 || totalDuration > 125) {
    errors.push(`Total duration ${totalDuration}s outside 100-125s range`);
  } else if (totalDuration < 105 || totalDuration > 120) {
    warnings.push(`Total duration ${totalDuration}s slightly outside 105-120s target`);
  }

  // 3. Check word count — ideal 200-250, hard cap 300.
  // Natural narration pace ~2 words/sec = 200-250 words for 105-120s.
  // Hard-fail at extremes; warn for minor drift.
  const allVoiceover = storyboard.scenes?.map(s => s.voiceover || '').join(' ') || '';
  const totalWordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;
  if (totalWordCount < 150 || totalWordCount > 340) {
    errors.push(`Word count ${totalWordCount} far outside 200-250 range`);
  } else if (totalWordCount < 180 || totalWordCount > 280) {
    warnings.push(`Word count ${totalWordCount} slightly outside 200-250 range`);
  }

  // 4. Check all 6 categories appear — primary_category field first, then voiceover/overlay fallback
  const categoriesCovered = new Set(storyboard.scenes?.map(s => s.primary_category) || []);
  const missingFromPrimary = REQUIRED_CATEGORIES.filter(c => !categoriesCovered.has(c));

  // For paired scenes (3 & 5), the second category may only appear in voiceover/overlay text.
  // Check if "missing" categories are mentioned in the full voiceover or overlay fields.
  const fullText = storyboard.scenes?.map(s =>
    `${s.voiceover || ''} ${s.overlay || ''} ${(s.on_screen_text || []).join(' ')}`
  ).join(' ').toLowerCase() || '';

  const trulyMissing = missingFromPrimary.filter(cat => {
    // Check if any significant keyword from the category name appears in the text
    const keywords = cat.toLowerCase().split(/[,&/\s]+/).filter(w => w.length > 3);
    return !keywords.some(kw => fullText.includes(kw));
  });

  if (trulyMissing.length > 0) {
    errors.push(`Missing categories (not in primary_category or voiceover): ${trulyMissing.join(', ')}`);
  }
  if (missingFromPrimary.length > 0 && trulyMissing.length === 0) {
    warnings.push(`Categories only in voiceover (not primary_category): ${missingFromPrimary.join(', ')}`);
  }

  // 5. Check A-roll scenes (1 and 7)
  if (storyboard.scenes?.[0]?.type !== 'A_ROLL') {
    errors.push('Scene 1 must be A_ROLL');
  }
  if (sceneCount === 7 && storyboard.scenes?.[6]?.type !== 'A_ROLL') {
    errors.push('Scene 7 must be A_ROLL');
  }

  // 6. Check neighborhoods (3-4)
  const neighborhoodCount = storyboard.neighborhoods?.length || 0;
  if (neighborhoodCount < 3 || neighborhoodCount > 4) {
    if (neighborhoodCount < 2 || neighborhoodCount > 5) {
      errors.push(`Expected 3-4 neighborhoods, got ${neighborhoodCount}`);
    } else {
      warnings.push(`Expected 3-4 neighborhoods, got ${neighborhoodCount}`);
    }
  }

  // 7. Check disclaimer
  const disclaimerPresent = storyboard.ending_disclaimer === REQUIRED_DISCLAIMER ||
    allVoiceover.includes(REQUIRED_DISCLAIMER) ||
    storyboard.scenes?.some(s =>
      s.on_screen_text?.some(t => t.includes('Lifestyle scoring'))
    ) || false;
  if (!disclaimerPresent) {
    errors.push(`Missing required disclaimer: "${REQUIRED_DISCLAIMER}"`);
  }

  // 8. Check scene timing template
  const expectedTimings = [12, 18, 16, 16, 16, 16, 12];
  if (sceneCount === 7) {
    storyboard.scenes.forEach((scene, i) => {
      if (Math.abs(scene.duration_seconds - expectedTimings[i]) > 2) {
        warnings.push(`Scene ${i + 1} is ${scene.duration_seconds}s (expected ~${expectedTimings[i]}s)`);
      }
    });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    stats: {
      sceneCount,
      totalDuration,
      totalWordCount,
      categoriesCovered: Array.from(categoriesCovered),
      neighborhoodCount,
      disclaimerPresent,
    },
  };
}

// ============================================================================
// LLM CALL
// ============================================================================

async function generateStoryboard(
  winnerPackage: WinnerPackage,
  qaFeedback?: string[]
): Promise<Storyboard> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt = buildSystemPrompt();

  let userPrompt = `Generate a cinematic 105-120 second Freedom Tour storyboard for this winning city.

INPUT DATA (Winner Package JSON):
${JSON.stringify(winnerPackage, null, 2)}

Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation.`;

  // On retry, include QA feedback so the LLM can correct specific issues
  if (qaFeedback && qaFeedback.length > 0) {
    userPrompt += `\n\nIMPORTANT — Your previous attempt failed QA validation with these errors:\n${qaFeedback.map(e => `- ${e}`).join('\n')}\nFix these issues in your new output. Pay special attention to the 200-250 word count target for voiceover. NEVER exceed 300 words total.`;
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
        max_tokens: 8192,
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

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonText = rawText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let storyboard: Storyboard;
  try {
    storyboard = JSON.parse(jsonText);
  } catch (parseErr) {
    console.error('[STORYBOARD] JSON parse error. Raw text:', rawText.substring(0, 500));
    throw new Error('LLM returned invalid JSON for storyboard');
  }

  return storyboard;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app')) return;

  // Rate limiting - heavy preset (LLM call)
  if (!applyRateLimit(req.headers, 'cristiano-storyboard', 'heavy', res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Auth required
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const { winnerPackage } = req.body as { winnerPackage: WinnerPackage };

    if (!winnerPackage?.winning_city_name) {
      res.status(400).json({ error: 'winnerPackage with winning_city_name is required' });
      return;
    }

    if (!winnerPackage.freedom_score_overall && winnerPackage.freedom_score_overall !== 0) {
      res.status(400).json({ error: 'winnerPackage.freedom_score_overall is required' });
      return;
    }

    if (!winnerPackage.category_scores) {
      res.status(400).json({ error: 'winnerPackage.category_scores is required' });
      return;
    }

    console.log('[STORYBOARD] Generating storyboard for:', winnerPackage.winning_city_name);

    // Generate storyboard via LLM
    const storyboard = await generateStoryboard(winnerPackage);

    // Run QA validation
    const qa = validateStoryboard(storyboard);

    console.log('[STORYBOARD] QA result:', {
      passed: qa.passed,
      errors: qa.errors.length,
      warnings: qa.warnings.length,
      stats: qa.stats,
    });

    if (!qa.passed) {
      // Retry up to 2 more times with QA feedback so LLM can self-correct
      let bestStoryboard = storyboard;
      let bestQa = qa;
      const MAX_RETRIES = 2;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        console.warn(`[STORYBOARD] QA failed, retry ${attempt}/${MAX_RETRIES}. Errors:`, bestQa.errors);

        const retryStoryboard = await generateStoryboard(winnerPackage, bestQa.errors);
        const retryQa = validateStoryboard(retryStoryboard);

        console.log(`[STORYBOARD] Retry ${attempt} QA:`, {
          passed: retryQa.passed,
          errors: retryQa.errors.length,
          warnings: retryQa.warnings.length,
        });

        // Keep the attempt with fewer errors
        if (retryQa.errors.length < bestQa.errors.length) {
          bestStoryboard = retryStoryboard;
          bestQa = retryQa;
        }

        if (retryQa.passed) {
          res.status(200).json({
            success: true,
            storyboard: retryStoryboard,
            qa: retryQa,
            retried: true,
            attempts: attempt + 1,
          });
          return;
        }
      }

      // All retries failed — return best-effort storyboard with warnings instead of hard error.
      // The render stage can still attempt to use it; partial coverage is better than no video.
      console.warn('[STORYBOARD] All retries exhausted. Returning best-effort storyboard with', bestQa.errors.length, 'errors');
      res.status(200).json({
        success: true,
        bestEffort: true,
        storyboard: bestStoryboard,
        qa: bestQa,
        retried: true,
        attempts: MAX_RETRIES + 1,
      });
      return;
    }

    res.status(200).json({
      success: true,
      storyboard,
      qa,
      retried: false,
    });
  } catch (error) {
    console.error('[STORYBOARD] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Storyboard generation failed',
    });
  }
}
