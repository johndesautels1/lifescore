/**
 * LIFE SCORE - Cristiano "Go To My New City" Storyboard Builder
 * Stage 1 of the 2-stage video pipeline.
 *
 * Takes a Winner Package JSON (freedom scores, categories, city data)
 * and calls an LLM to generate a 9-scene Storyboard JSON following
 * the locked format template (120s, 260-310 words, all 6 categories).
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

// The 6 freedom categories (must all appear as primary_category across 9 scenes)
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
  scene: number;
  type: 'A_ROLL' | 'B_ROLL';
  duration_seconds: number;
  primary_category: string;
  visual_direction: string;
  voiceover: string;
  on_screen_text: string[];
  stock_search_keywords: string[];
  transition: string;
}

interface Storyboard {
  video_meta: {
    series_title: string;
    episode_title: string;
    target_duration_seconds: number;
    target_word_count: number;
    music_mood: string;
    font_style: string;
    safe_area_note: string;
  };
  overlay_system: {
    freedom_score_badge: { text: string; position: string };
    category_strip: { position: string; categories: string[]; scores_placeholder: string };
    logo_qr_reserved_box: { position: string; note: string };
    caption_style: { enabled: boolean; max_words_per_line: number; max_lines: number };
  };
  scenes: StoryboardScene[];
  neighborhoods: Array<{
    name: string;
    freedom_reason_one_liner: string;
    signature_visual: string;
  }>;
  ending_disclaimer: string;
  thumbnail: {
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
Generate a premium cinematic 120-second video plan led by an avatar judge narrator named Cristiano.
Theme: FREEDOM. Every scene must reinforce both legal freedom and lived freedom.
OUTPUT FORMAT: Return ONLY valid JSON that matches the schema provided below. No extra text.
HARD RULES:
- Total scenes: 9
- Total duration: 120 seconds ± 5 seconds
- Total voiceover: 260–310 words
- Scenes 1 and 9 are A-ROLL (Cristiano on camera speaking)
- Scenes 2–8 are B-ROLL (cinematic city footage), with overlays and captions
- Include a map moment in Scene 8 introducing 3–4 neighborhoods as "Freedom Hotspots"
- Every scene must specify one primary freedom category (from the 6)
- Across all scenes, all 6 categories must be highlighted at least once
- On-screen text: max 6 words per line, max 2 lines at a time
- Captions ON, clean modern font
- Include lower-right "CLUES logo + QR box reserved area" in every scene
- End with: "Lifestyle scoring, not legal advice."
TONE:
Modern, welcoming, progressive, authoritative (judge-like but friendly).
Avoid legal advice language. Do not claim "guarantees." Use "tends to," "often," "designed to," "typically."

SCENE TIMING TEMPLATE (follow exactly):
1. 12s A-roll intro + title + Freedom Score
2. 14s city identity + aerial + freedom framing
3. 14s Personal Autonomy (parks/health/space)
4. 14s Housing/Property control (homes, light, livability)
5. 14s Business/work regulation (work-from-anywhere vibe)
6. 14s Transportation/daily movement (transit + cycling + walk)
7. 14s Policing/courts/enforcement (predictability + civic trust)
8. 14s MAP + 3–4 neighborhoods "Freedom Hotspots"
9. 10s A-roll verdict + "Cristiano's Orders" list + CTA + disclaimer
     Cristiano MUST end with: "For additional information on our Clues Ecosystem and family of applications and services, go to Cluesnomads.com"

SCENE 9 ON-SCREEN HEADER: "Cristiano's Orders" with 3–5 bullets max, mapped to winning city's strongest categories:
- "Move freely." (Transportation & Daily Movement)
- "Live loudly." (Speech, Lifestyle & Culture)
- "Own with clarity." (Housing/Property/HOA)
- "Work without friction." (Business & Work)
- "Choose autonomy daily." (Personal Autonomy)

SCENE 9 CLOSING CTA (MANDATORY — Cristiano must say this verbatim):
"For additional information on our Clues Ecosystem and family of applications and services, go to Cluesnomads.com"
On-screen text: "Cluesnomads.com"
Do NOT substitute any other website URL. The ONLY website mentioned must be Cluesnomads.com.

B-ROLL VISUAL LANGUAGE (use for stock_search_keywords):
- Personal Autonomy: diverse people, street life, open-air markets, parks, self-expression, wellness
- Housing/Property/HOA: exterior streetscapes, variety of housing types, light-filled interiors, balconies, human-scale neighborhoods
- Business/Work: coworking, cafes with laptops, small shops, modern offices, makers/creative studios
- Transportation/Daily Movement: metro/tram entrances, bike lanes, walkable streets, ferries, calm intersections
- Policing/Courts/Enforcement: civic buildings, courthouse exteriors, "order & predictability" visuals (clean public space, signage), avoid "police intimidation"
- Speech/Lifestyle/Culture: bookstores, art, music, festivals, inclusive public spaces, museums, community gatherings

ALWAYS prefer footage that implies: openness, mobility, sunlight, visibility, safety, choice, access
AVOID: grim police visuals, protests as default, surveillance closeups, heavy militarized imagery, propaganda

JSON SCHEMA TO FOLLOW:
{
  "video_meta": {
    "series_title": "CLUES Freedom Tour",
    "episode_title": "Go To My New City: [CITY]",
    "target_duration_seconds": 120,
    "target_word_count": 290,
    "music_mood": "cinematic_uplifting_subtle",
    "font_style": "modern_sans",
    "safe_area_note": "Reserve lower-right 15% for CLUES logo + QR box."
  },
  "overlay_system": {
    "freedom_score_badge": { "text": "Freedom Score: [OVERALL]%", "position": "top-left" },
    "category_strip": {
      "position": "top",
      "categories": ["Personal Autonomy", "Housing, Property & HOA Control", "Business & Work Regulation", "Transportation & Daily Movement", "Policing, Courts & Enforcement", "Speech, Lifestyle & Culture"],
      "scores_placeholder": "[CATEGORY SCORES]"
    },
    "logo_qr_reserved_box": { "position": "bottom-right", "note": "Always visible; do not place captions under it." },
    "caption_style": { "enabled": true, "max_words_per_line": 6, "max_lines": 2 }
  },
  "scenes": [
    {
      "scene": 1,
      "type": "A_ROLL",
      "duration_seconds": 12,
      "primary_category": "Personal Autonomy",
      "visual_direction": "Cristiano on camera, clean studio/neutral background, subtle city silhouette or abstract lines. Title card animates in.",
      "voiceover": "...",
      "on_screen_text": ["Freedom Tour:", "[CITY]"],
      "stock_search_keywords": [],
      "transition": "cinematic_fade"
    }
  ],
  "neighborhoods": [
    { "name": "[NEIGHBORHOOD]", "freedom_reason_one_liner": "...", "signature_visual": "..." }
  ],
  "ending_disclaimer": "Lifestyle scoring, not legal advice.",
  "thumbnail": {
    "title_text": "Go To My New City",
    "subtitle_text": "[CITY] Freedom Tour",
    "visual_concept": "Cristiano portrait + faint skyline + Freedom Score badge"
  }
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
  if (sceneCount !== 9) {
    errors.push(`Expected 9 scenes, got ${sceneCount}`);
  }

  // 2. Check total duration (115-125s)
  const totalDuration = storyboard.scenes?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
  if (totalDuration < 115 || totalDuration > 125) {
    errors.push(`Total duration ${totalDuration}s outside 115-125s range`);
  }

  // 3. Check word count — ideal 260-310, hard limits aligned with render.ts Stage 2
  // Natural narration pace for 120s is ~2-3 words/sec = 240-360 words.
  // Hard-fail only at extremes; warn for minor drift.
  const allVoiceover = storyboard.scenes?.map(s => s.voiceover || '').join(' ') || '';
  const totalWordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;
  if (totalWordCount < 220 || totalWordCount > 380) {
    errors.push(`Word count ${totalWordCount} far outside 260-310 range`);
  } else if (totalWordCount < 250 || totalWordCount > 340) {
    warnings.push(`Word count ${totalWordCount} slightly outside 260-310 range`);
  }

  // 4. Check all 6 categories appear as primary_category
  const categoriesCovered = new Set(storyboard.scenes?.map(s => s.primary_category) || []);
  const missingCategories = REQUIRED_CATEGORIES.filter(c => !categoriesCovered.has(c));
  if (missingCategories.length > 0) {
    errors.push(`Missing primary categories: ${missingCategories.join(', ')}`);
  }

  // 5. Check A-roll scenes (1 and 9)
  if (storyboard.scenes?.[0]?.type !== 'A_ROLL') {
    errors.push('Scene 1 must be A_ROLL');
  }
  if (sceneCount === 9 && storyboard.scenes?.[8]?.type !== 'A_ROLL') {
    errors.push('Scene 9 must be A_ROLL');
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
  const expectedTimings = [12, 14, 14, 14, 14, 14, 14, 14, 10];
  if (sceneCount === 9) {
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

  let userPrompt = `Generate a cinematic 120-second Freedom Tour storyboard for this winning city.

INPUT DATA (Winner Package JSON):
${JSON.stringify(winnerPackage, null, 2)}

Return ONLY valid JSON matching the schema. No markdown, no backticks, no explanation.`;

  // On retry, include QA feedback so the LLM can correct specific issues
  if (qaFeedback && qaFeedback.length > 0) {
    userPrompt += `\n\nIMPORTANT — Your previous attempt failed QA validation with these errors:\n${qaFeedback.map(e => `- ${e}`).join('\n')}\nFix these issues in your new output. Pay special attention to the 260-310 word count target for voiceover.`;
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
      // If critical errors, attempt one retry with QA feedback so LLM can self-correct
      console.warn('[STORYBOARD] QA failed, attempting retry with feedback. Errors:', qa.errors);

      const retryStoryboard = await generateStoryboard(winnerPackage, qa.errors);
      const retryQa = validateStoryboard(retryStoryboard);

      if (!retryQa.passed) {
        console.error('[STORYBOARD] Retry also failed. Errors:', retryQa.errors);
        res.status(422).json({
          error: 'Storyboard failed QA validation after retry',
          qa: retryQa,
        });
        return;
      }

      // Retry passed
      res.status(200).json({
        success: true,
        storyboard: retryStoryboard,
        qa: retryQa,
        retried: true,
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
