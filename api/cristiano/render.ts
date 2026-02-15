/**
 * LIFE SCORE - Cristiano "Go To My New City" HeyGen Render Orchestrator
 * Stage 2 of the 2-stage video pipeline.
 *
 * Takes the validated 7-scene Storyboard JSON from Stage 1 (storyboard.ts),
 * formats it into a comprehensive prompt for the HeyGen Video Agent V2,
 * and submits for rendering. Supports status polling and Supabase caching.
 *
 * Endpoint: POST https://api.heygen.com/v1/video_agent/generate
 * The Video Agent auto-assembles B-roll, overlays, and transitions from
 * the creative instructions in the prompt. This is what produces the
 * premium cinematic city tour with stock footage.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';

export const config = {
  maxDuration: 300,  // Vercel Pro: 5 min — HeyGen API submission + Supabase cache + validation
};

// ============================================================================
// CONSTANTS
// ============================================================================

const HEYGEN_VIDEO_AGENT_URL = 'https://api.heygen.com/v1/video_agent/generate';
const HEYGEN_STATUS_URL = 'https://api.heygen.com/v1/video_status.get';
const HEYGEN_TIMEOUT_MS = 120000;  // 120s for HeyGen API calls (submission + status)

// Cristiano avatar, voice & look (from env)
const CRISTIANO_AVATAR_ID = process.env.HEYGEN_CRISTIANO_AVATAR_ID || '';
const CRISTIANO_VOICE_ID = process.env.HEYGEN_CRISTIANO_VOICE_ID || 'DzUwifXFzrD4THQLxNun';
const AVATAR_LOOK_ID = process.env.HEYGEN_AVATAR_LOOK_ID || '';

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// ============================================================================
// TYPES
// ============================================================================

interface RenderRequest {
  action: 'render' | 'status';
  // For render:
  storyboard?: Record<string, unknown>;
  winnerPackage?: Record<string, unknown>;
  winnerCity?: string;
  winnerCountry?: string;
  winnerRegion?: string;
  freedomScore?: number;
  // For status:
  videoId?: string;
  heygenVideoId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getHeyGenKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new Error('HEYGEN_API_KEY not configured');
  }
  return key;
}

/**
 * Pre-render validation: ensure all hard requirements are met before
 * spending HeyGen credits.
 */
function preRenderValidation(storyboard: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!CRISTIANO_AVATAR_ID) {
    errors.push('HEYGEN_CRISTIANO_AVATAR_ID not configured in environment');
  }
  if (!CRISTIANO_VOICE_ID) {
    errors.push('HEYGEN_CRISTIANO_VOICE_ID not configured in environment');
  }

  const scenes = storyboard.scenes as Array<Record<string, unknown>> | undefined;
  if (!scenes || scenes.length !== 7) {
    errors.push(`Expected 7 scenes, got ${scenes?.length || 0}`);
  }

  if (scenes) {
    const totalDuration = scenes.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);
    if (totalDuration < 100 || totalDuration > 125) {
      errors.push(`Total duration ${totalDuration}s outside 100-125s range`);
    }

    // Word count for 105-120s narration at ~2 words/sec = 210-240 ideal.
    // Hard-fail at extremes; allow some flex for natural pacing.
    const allVoiceover = scenes.map(s => String(s.voiceover || '')).join(' ');
    const wordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 180 || wordCount > 320) {
      errors.push(`Word count ${wordCount} outside 180-320 range`);
    }

    const categories = new Set(scenes.map(s => String(s.primary_category || '')));
    const required = [
      'Personal Autonomy',
      'Housing, Property & HOA Control',
      'Business & Work Regulation',
      'Transportation & Daily Movement',
      'Policing, Courts & Enforcement',
      'Speech, Lifestyle & Culture',
    ];
    const missing = required.filter(c => !categories.has(c));
    if (missing.length > 0) {
      errors.push(`Missing categories: ${missing.join(', ')}`);
    }

    if (scenes[0]?.type !== 'A_ROLL') errors.push('Scene 1 must be A_ROLL');
    if (scenes[6]?.type !== 'A_ROLL') errors.push('Scene 7 must be A_ROLL');
  }

  // FIX 2026-02-14: Align neighborhood tolerance with storyboard.ts Stage 1 QA (2-5 allowed).
  const neighborhoods = storyboard.neighborhoods as Array<unknown> | undefined;
  if (!neighborhoods || neighborhoods.length < 2 || neighborhoods.length > 5) {
    errors.push(`Expected 2-5 neighborhoods, got ${neighborhoods?.length || 0}`);
  }

  // FIX 2026-02-14: Flexible disclaimer check — match storyboard.ts logic.
  // LLM may embed disclaimer in voiceover or on-screen text instead of the top-level field.
  const disclaimer = 'Lifestyle scoring, not legal advice.';
  const hasDisclaimer =
    storyboard.ending_disclaimer === disclaimer ||
    (scenes || []).some(s => String(s.voiceover || '').includes('Lifestyle scoring')) ||
    (scenes || []).some(s =>
      (s.on_screen_text as string[] || []).some((t: string) => t.includes('Lifestyle scoring'))
    );
  if (!hasDisclaimer) {
    errors.push('Missing or incorrect ending disclaimer');
  }

  // FIX 2026-02-14: Estimate HeyGen prompt size before spending credits.
  // buildVideoAgentPrompt strips fields + adds ~750 chars of instructions.
  // Catch oversized storyboards here with a clear error instead of a 400 from HeyGen.
  const estimatedJsonSize = JSON.stringify(storyboard).length;
  // After stripping (thumbnail, video_meta, ending_disclaimer,
  // per-scene: scene/primary_category/transition, neighborhood: signature_visual)
  // rough estimate: stripped JSON ≈ 60-70% of full JSON
  const estimatedPromptSize = Math.round(estimatedJsonSize * 0.65) + 750;
  if (estimatedPromptSize > 10000) {
    errors.push(`Estimated HeyGen prompt ~${estimatedPromptSize} chars exceeds 10,000 limit. Storyboard JSON is too large (${estimatedJsonSize} chars raw). Reduce visual_direction length or voiceover word count.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format the storyboard JSON into a comprehensive prompt for HeyGen Video Agent.
 * CRITICAL: HeyGen Video Agent has a 10,000 character prompt limit.
 * Strips fields HeyGen doesn't need and uses compact JSON to stay under the cap.
 */
function buildVideoAgentPrompt(storyboard: Record<string, unknown>): string {
  // Strip top-level fields HeyGen doesn't need
  const slim = { ...storyboard };
  delete slim.thumbnail;         // HeyGen doesn't generate thumbnails
  delete slim.overlay_system;    // Instructions already cover overlay layout
  delete slim.video_meta;        // Timing is in individual scenes
  delete slim.ending_disclaimer; // Already stated verbatim in fixed instructions below

  // Strip per-scene fields that are redundant or internal-only
  // - scene: array index implies order
  // - primary_category: our internal scoring label, visual_direction already conveys theme
  // - transition: fixed instructions already specify cinematic transitions
  // KEEP: overlay — HeyGen needs this for per-scene dynamic overlay text
  if (Array.isArray(slim.scenes)) {
    slim.scenes = (slim.scenes as Array<Record<string, unknown>>).map(s => {
      const { scene, primary_category, transition, ...keep } = s;
      return keep;
    });
  }

  // Strip signature_visual from neighborhoods — HeyGen infers from keywords/voiceover
  if (Array.isArray(slim.neighborhoods)) {
    slim.neighborhoods = (slim.neighborhoods as Array<Record<string, unknown>>).map(n => {
      const { signature_visual, ...keep } = n;
      return keep;
    });
  }

  // Compact JSON (no pretty-print)
  let json = JSON.stringify(slim);

  // Safety net: if JSON is still too large, progressively truncate visual_direction
  const PROMPT_OVERHEAD = 950; // chars for fixed instruction text + avatar/voice/look ID lines
  const MAX_JSON_LENGTH = 10000 - PROMPT_OVERHEAD;
  if (json.length > MAX_JSON_LENGTH && Array.isArray(slim.scenes)) {
    console.warn(`[RENDER] JSON is ${json.length} chars (budget ${MAX_JSON_LENGTH}), truncating visual_direction`);
    const MAX_VD = 120; // truncate visual_direction to 120 chars per scene
    slim.scenes = (slim.scenes as Array<Record<string, unknown>>).map(s => {
      const vd = String(s.visual_direction || '');
      if (vd.length > MAX_VD) {
        return { ...s, visual_direction: vd.slice(0, MAX_VD) + '...' };
      }
      return s;
    });
    json = JSON.stringify(slim);
  }

  // Belt-and-suspenders: embed avatar/voice/look IDs directly in the prompt
  // so HeyGen picks them up regardless of whether it reads them from config.
  const avatarLine = CRISTIANO_AVATAR_ID ? `\nAVATAR: Use avatar_id "${CRISTIANO_AVATAR_ID}".` : '';
  const voiceLine = CRISTIANO_VOICE_ID ? ` Use voice_id "${CRISTIANO_VOICE_ID}".` : '';
  const lookLine = AVATAR_LOOK_ID ? ` Use look_id "${AVATAR_LOOK_ID}".` : '';

  const prompt = `Create a 105–120 second cinematic city tour video for CLUES Life Score "Go To My New City."
${avatarLine}${voiceLine}${lookLine}

Follow the Storyboard JSON exactly: scene order, timing, captions.

Captions ON. On-screen text: max 6 words/line, max 2 lines.

OVERLAY RULES (keep simple):
- A-ROLL scenes: Show Freedom Score badge centered on screen. No other overlays.
- B-ROLL scenes: Show active category name + score as a lower-third caption. One overlay max.
- Reserve lower-right 15% for CLUES logo/QR box (always visible).
Do NOT stack multiple overlays in the same scene.

STYLE: Cinematic, premium, modern. Moving shots only. Openness, mobility, sunlight, safety, choice. Avoid grim police, protests, surveillance, propaganda.

STOCK FOOTAGE: Use generic cinematic terms + city name (e.g. "modern downtown Portland", "waterfront Copenhagen"). Do NOT request hyper-specific landmarks. Footage must feel like the actual city area.

SCENES: 1 & 7 = A-ROLL (Cristiano on camera). 2–6 = B-ROLL (city footage). Cinematic transitions between scenes.

Storyboard:
${json}

End with: "Lifestyle scoring, not legal advice."

MANDATORY CTA in final scene: "For additional information on our Clues Ecosystem and family of applications and services, go to Cluesnomads.com"
On-screen: "Cluesnomads.com". No other URL.`;

  console.log(`[RENDER] Prompt length: ${prompt.length} chars (limit 10000)`);
  if (prompt.length > 9500) {
    console.warn(`[RENDER] Prompt approaching limit at ${prompt.length} chars`);
  }
  if (prompt.length > 10000) {
    console.error(`[RENDER] Prompt EXCEEDS 10000 char limit at ${prompt.length} chars!`);
  }

  return prompt;
}

/**
 * Check Supabase cache for completed video
 */
async function checkCache(cityName: string): Promise<{
  cached: boolean;
  video?: Record<string, unknown>;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cristiano_city_videos')
      .select('*')
      .ilike('city_name', cityName.trim())
      .eq('status', 'completed')
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[RENDER] Cache lookup error:', error.message);
      return { cached: false };
    }

    if (data) {
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log('[RENDER] Cache expired for:', cityName);
        return { cached: false };
      }

      console.log('[RENDER] Cache hit for:', cityName);
      return {
        cached: true,
        video: {
          id: data.id,
          cityName: data.city_name,
          videoUrl: data.video_url,
          thumbnailUrl: data.thumbnail_url,
          durationSeconds: data.duration_seconds,
          sceneCount: data.scene_count,
          wordCount: data.word_count,
          freedomScore: data.freedom_score,
          status: 'completed',
          createdAt: data.created_at,
        },
      };
    }

    return { cached: false };
  } catch (err) {
    console.warn('[RENDER] Cache check failed:', err);
    return { cached: false };
  }
}

/**
 * Save video record to Supabase
 */
async function saveToCache(params: {
  cityName: string;
  country?: string;
  region?: string;
  heygenVideoId: string;
  storyboard: Record<string, unknown>;
  winnerPackage?: Record<string, unknown>;
  sceneCount: number;
  wordCount: number;
  freedomScore?: number;
  userId?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cristiano_city_videos')
      .insert({
        city_name: params.cityName.trim().toLowerCase(),
        country: params.country || null,
        region: params.region || null,
        heygen_video_id: params.heygenVideoId,
        storyboard: params.storyboard,
        winner_package: params.winnerPackage || null,
        scene_count: params.sceneCount,
        word_count: params.wordCount,
        freedom_score: params.freedomScore || null,
        generated_by: params.userId || null,
        status: 'rendering',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[RENDER] Cache insert error:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.warn('[RENDER] Cache save failed:', err);
    return null;
  }
}

/**
 * Update cached video record
 */
async function updateCache(
  heygenVideoId: string,
  updates: {
    status: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    error?: string;
  }
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {
      status: updates.status,
    };

    if (updates.videoUrl) updateData.video_url = updates.videoUrl;
    if (updates.thumbnailUrl) updateData.thumbnail_url = updates.thumbnailUrl;
    if (updates.durationSeconds) updateData.duration_seconds = updates.durationSeconds;
    if (updates.error) updateData.error = updates.error;
    if (updates.status === 'completed') updateData.completed_at = new Date().toISOString();

    await supabaseAdmin
      .from('cristiano_city_videos')
      .update(updateData)
      .eq('heygen_video_id', heygenVideoId);
  } catch (err) {
    console.warn('[RENDER] Cache update failed:', err);
  }
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

  // Rate limiting
  if (!applyRateLimit(req.headers, 'cristiano-render', 'standard', res)) {
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getHeyGenKey();

    // ══════════════════════════════════════════════════════════════════════
    // GET: Status polling
    // ══════════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const videoId = req.query.videoId as string;
      if (!videoId) {
        res.status(400).json({ error: 'videoId query parameter is required' });
        return;
      }

      const statusResponse = await fetchWithTimeout(
        `${HEYGEN_STATUS_URL}?video_id=${encodeURIComponent(videoId)}`,
        {
          method: 'GET',
          headers: { 'X-Api-Key': apiKey },
        },
        HEYGEN_TIMEOUT_MS
      );

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        throw new Error(`HeyGen status check failed (${statusResponse.status}): ${errorText}`);
      }

      const statusData = await statusResponse.json();
      const status = statusData.data;

      console.log('[RENDER] Status for', videoId, ':', status.status);

      // Update cache on completion or failure
      if (status.status === 'completed' || status.status === 'failed') {
        await updateCache(videoId, {
          status: status.status,
          videoUrl: status.video_url || undefined,
          thumbnailUrl: status.thumbnail_url || undefined,
          durationSeconds: status.duration || undefined,
          error: status.error || undefined,
        });
      }

      res.status(200).json({
        videoId: status.video_id,
        status: status.status === 'completed' ? 'completed'
          : status.status === 'failed' ? 'failed'
          : status.status === 'processing' ? 'processing'
          : 'rendering',
        videoUrl: status.video_url || undefined,
        thumbnailUrl: status.thumbnail_url || undefined,
        durationSeconds: status.duration || undefined,
        error: status.error || undefined,
      });
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST: Render or status
    // ══════════════════════════════════════════════════════════════════════

    // Auth required for rendering
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const body = req.body as RenderRequest;

    if (!body.action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    switch (body.action) {
      case 'render': {
        if (!body.storyboard) {
          res.status(400).json({ error: 'storyboard is required for render action' });
          return;
        }

        if (!body.winnerCity) {
          res.status(400).json({ error: 'winnerCity is required for render action' });
          return;
        }

        // Pre-render validation (abort before spending credits)
        const validation = preRenderValidation(body.storyboard);
        if (!validation.valid) {
          console.error('[RENDER] Pre-render validation failed:', validation.errors);
          res.status(422).json({
            error: 'Storyboard failed pre-render validation',
            validationErrors: validation.errors,
          });
          return;
        }

        // Check cache first
        const cacheResult = await checkCache(body.winnerCity);
        if (cacheResult.cached && cacheResult.video) {
          console.log('[RENDER] Returning cached video for:', body.winnerCity);
          res.status(200).json({
            success: true,
            cached: true,
            video: cacheResult.video,
          });
          return;
        }

        // Check if already rendering for this city
        const { data: inProgress } = await supabaseAdmin
          .from('cristiano_city_videos')
          .select('*')
          .ilike('city_name', body.winnerCity.trim())
          .in('status', ['rendering', 'processing'])
          .maybeSingle();

        if (inProgress) {
          console.log('[RENDER] Already rendering for:', body.winnerCity);
          res.status(200).json({
            success: true,
            cached: false,
            inProgress: true,
            video: {
              id: inProgress.id,
              cityName: inProgress.city_name,
              heygenVideoId: inProgress.heygen_video_id,
              status: inProgress.status,
              createdAt: inProgress.created_at,
            },
          });
          return;
        }

        // Build the Video Agent prompt
        const videoAgentPrompt = buildVideoAgentPrompt(body.storyboard);

        console.log('[RENDER] Submitting to HeyGen Video Agent for:', body.winnerCity);
        console.log('[RENDER] Prompt length:', videoAgentPrompt.length, 'chars');

        // Submit to HeyGen Video Agent
        // avatar_id and look_id go in config; voice_id is NOT accepted by Video Agent V2
        // (causes 400: "Extra inputs are not permitted"). Voice is set via the avatar's
        // default in HeyGen dashboard (ElevenLabs DzUwifXFzrD4THQLxNun). It's also
        // embedded in the prompt text as a hint.
        // IMPORTANT: These must be inside `config`, NOT top-level (causes 400).
        const configObj: Record<string, unknown> = {
          avatar_id: CRISTIANO_AVATAR_ID,
          duration_sec: 120,
          orientation: 'landscape',
        };
        if (AVATAR_LOOK_ID) {
          configObj.look_id = AVATAR_LOOK_ID;
        }

        console.log('[RENDER] Config:', JSON.stringify(configObj));

        const renderResponse = await fetchWithTimeout(
          HEYGEN_VIDEO_AGENT_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': apiKey,
            },
            body: JSON.stringify({
              prompt: videoAgentPrompt,
              config: configObj,
            }),
          },
          HEYGEN_TIMEOUT_MS
        );

        if (!renderResponse.ok) {
          const errorText = await renderResponse.text();
          throw new Error(`HeyGen Video Agent failed (${renderResponse.status}): ${errorText}`);
        }

        const renderData = await renderResponse.json();
        const heygenVideoId = renderData.data?.video_id || renderData.video_id;

        if (!heygenVideoId) {
          throw new Error('No video_id returned from HeyGen Video Agent');
        }

        console.log('[RENDER] Video Agent job submitted:', heygenVideoId);

        // Calculate word count for cache
        const scenes = body.storyboard.scenes as Array<Record<string, unknown>> | undefined;
        const allVoiceover = scenes?.map(s => String(s.voiceover || '')).join(' ') || '';
        const wordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;

        // Cache the record
        const cacheId = await saveToCache({
          cityName: body.winnerCity,
          country: body.winnerCountry,
          region: body.winnerRegion,
          heygenVideoId,
          storyboard: body.storyboard,
          winnerPackage: body.winnerPackage,
          sceneCount: scenes?.length || 7,
          wordCount,
          freedomScore: body.freedomScore,
          userId: auth.userId,
        });

        res.status(200).json({
          success: true,
          cached: false,
          video: {
            id: cacheId || heygenVideoId,
            cityName: body.winnerCity,
            heygenVideoId,
            status: 'rendering',
            sceneCount: scenes?.length || 7,
            wordCount,
            createdAt: new Date().toISOString(),
          },
        });
        return;
      }

      case 'status': {
        if (!body.heygenVideoId) {
          res.status(400).json({ error: 'heygenVideoId is required for status action' });
          return;
        }

        const statusResponse = await fetchWithTimeout(
          `${HEYGEN_STATUS_URL}?video_id=${encodeURIComponent(body.heygenVideoId)}`,
          {
            method: 'GET',
            headers: { 'X-Api-Key': apiKey },
          },
          HEYGEN_TIMEOUT_MS
        );

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          throw new Error(`HeyGen status check failed (${statusResponse.status}): ${errorText}`);
        }

        const statusData = await statusResponse.json();
        const status = statusData.data;

        // Update cache
        if (status.status === 'completed' || status.status === 'failed') {
          await updateCache(body.heygenVideoId, {
            status: status.status,
            videoUrl: status.video_url || undefined,
            thumbnailUrl: status.thumbnail_url || undefined,
            durationSeconds: status.duration || undefined,
            error: status.error || undefined,
          });
        }

        res.status(200).json({
          videoId: status.video_id,
          status: status.status === 'completed' ? 'completed'
            : status.status === 'failed' ? 'failed'
            : status.status === 'processing' ? 'processing'
            : 'rendering',
          videoUrl: status.video_url || undefined,
          thumbnailUrl: status.thumbnail_url || undefined,
          durationSeconds: status.duration || undefined,
          error: status.error || undefined,
        });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${body.action}` });
    }
  } catch (error) {
    console.error('[RENDER] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Cristiano render request failed',
    });
  }
}
