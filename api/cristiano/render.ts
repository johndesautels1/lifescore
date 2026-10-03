/**
 * LIFE SCORE - Cristiano "Go To My New City" HeyGen Render Orchestrator
 * Stage 2 of the 2-stage video pipeline.
 *
 * Takes the validated 7-scene storyboard JSON from Stage 1 (storyboard.ts),
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
import { requireFeature, consumeOrDeny, refundFeature, type Entitled } from '../shared/entitlements.js';
import { agentSession, agentVideo, startAgentFilm } from '../shared/heygen/videoAgent.js';

export const config = {
  maxDuration: 300,  // Vercel Pro: 5 min — HeyGen API submission + Supabase cache + validation
};

// ============================================================================
// CONSTANTS
// ============================================================================

// HeyGen's v3 video agent, through the questionnaire engine's wiring, verbatim
// (api/shared/heygen/videoAgent.ts). The v1 /video_agent/generate and
// /video_status.get endpoints this route used are gone from it.
//
// Cristiano's face and voice: the SAME two settings the engine's judge page and
// film agent read (film.ts presenterId / agentVoiceId) — no built-in defaults.
const CRISTIANO_LOOK_ID = (process.env.HEYGEN_AVATAR_LOOK_ID ?? '').trim();
const CRISTIANO_VOICE_ID = (process.env.HEYGEN_CRISTIANO_VOICE_ID ?? '').trim();

/** A HeyGen session or video id: letters, digits, '_' and '-'. */
const HEYGEN_ID = /^[A-Za-z0-9_-]{1,128}$/;

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

/**
 * Pre-render validation: ensure all hard requirements are met before
 * spending HeyGen credits.
 */
function preRenderValidation(storyboard: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!CRISTIANO_LOOK_ID) {
    errors.push('HEYGEN_AVATAR_LOOK_ID not configured in environment');
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

    // Word count for 105-120s narration at ~2 words/sec. Target 200-250, hard cap 300.
    // Hard-fail at extremes; allow some flex for natural pacing.
    const allVoiceover = scenes.map(s => String(s.voiceover || '')).join(' ');
    const wordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 170 || wordCount > 320) {
      errors.push(`Word count ${wordCount} outside 170-320 range`);
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
  const avatarLine = CRISTIANO_LOOK_ID ? `\nAVATAR: Use avatar_id "${CRISTIANO_LOOK_ID}".` : '';
  const voiceLine = CRISTIANO_VOICE_ID ? ` Use voice_id "${CRISTIANO_VOICE_ID}".` : '';

  const prompt = `Create a 105–120 second cinematic city tour video for CLUES Life Score "Go To My New City."
${avatarLine}${voiceLine}

Follow the Storyboard JSON exactly: scene order, timing, captions.

Captions ON. On-screen text: max 6 words/line, max 2 lines.

OVERLAY RULES (keep simple):
- A-ROLL scenes: Show Freedom Score badge centered on screen. No other overlays.
- B-ROLL scenes: Show active category name + score as a lower-third caption. One overlay max.
- Reserve lower-right 15% for CLUES logo/QR box (always visible).
Do NOT stack multiple overlays in the same scene.

STYLE: Cinematic, premium, modern. Moving shots only. Openness, mobility, sunlight, safety, choice. Avoid grim police, protests, surveillance, propaganda.

STOCK FOOTAGE: Use generic cinematic terms + city name (e.g. "modern downtown Portland", "waterfront Copenhagen"). Do NOT request hyper-specific landmarks. Footage must feel like the actual city area.
CRITICAL: Each individual B-roll stock footage clip MUST be 6 seconds or less. Use multiple clips per B-roll scene (e.g. 18s scene = 3 clips, 16s scene = 2-3 clips). Never use a single clip longer than 6 seconds.

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
  heygenSessionId: string;
  heygenVideoId: string | null;
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
        heygen_session_id: params.heygenSessionId,
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

    if (!HEYGEN_ID.test(heygenVideoId)) return;
    // New films are found by their agent session; films made before 2026-10-03 by their video id.
    await supabaseAdmin
      .from('cristiano_city_videos')
      .update(updateData)
      .or(`heygen_session_id.eq.${heygenVideoId},heygen_video_id.eq.${heygenVideoId}`);
  } catch (err) {
    console.warn('[RENDER] Cache update failed:', err);
  }
}

/**
 * Where a film stands, by the handle the screen holds (the agent session for new
 * films; the video id for films made before 2026-10-03). The engine's two-step
 * read (film.ts): the session names a video only once the agent has planned it;
 * then the video is asked for its file. An unknown or transient answer is
 * "rendering", never "failed" — a film still being made is never thrown away.
 */
async function filmStatus(handle: string): Promise<Record<string, unknown>> {
  if (!HEYGEN_ID.test(handle)) return { videoId: handle, status: 'failed', error: 'Unknown film.' };

  const { data: row } = await supabaseAdmin
    .from('cristiano_city_videos')
    .select('heygen_session_id, heygen_video_id')
    .or(`heygen_session_id.eq.${handle},heygen_video_id.eq.${handle}`)
    .limit(1)
    .maybeSingle();

  let videoId: string | null = row?.heygen_video_id ?? null;
  const sessionId: string | null = row?.heygen_session_id ?? null;

  if (videoId === null && sessionId !== null) {
    const session = await agentSession(sessionId);
    if (!session.ok) return { videoId: handle, status: 'rendering', note: session.failure.message };
    if (session.value.error !== null) {
      await updateCache(handle, { status: 'failed', error: session.value.error });
      return { videoId: handle, status: 'failed', error: session.value.error };
    }
    if (session.value.videoId === null) return { videoId: handle, status: 'rendering', note: 'Planning your film.' };
    videoId = session.value.videoId;
    await supabaseAdmin.from('cristiano_city_videos').update({ heygen_video_id: videoId }).eq('heygen_session_id', sessionId);
  }

  const state = await agentVideo(videoId ?? handle);
  if (!state.ok) return { videoId: handle, status: 'rendering', note: state.failure.message };
  if (state.value.status === 'failed') {
    const error = state.value.error ?? 'The film service could not finish it.';
    await updateCache(handle, { status: 'failed', error });
    return { videoId: handle, status: 'failed', error };
  }
  if (state.value.status !== 'completed' || state.value.url === null) {
    return { videoId: handle, status: 'processing', note: state.value.error ?? 'Filming.' };
  }
  await updateCache(handle, {
    status: 'completed',
    videoUrl: state.value.url,
    durationSeconds: state.value.seconds ?? undefined,
  });
  return {
    videoId: handle,
    status: 'completed',
    videoUrl: state.value.url,
    durationSeconds: state.value.seconds ?? undefined,
  };
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

  // Set once a new film has been counted, so a failed submission gives it back.
  let counted: Entitled | null = null;

  try {

    // ══════════════════════════════════════════════════════════════════════
    // GET: Status polling
    // ══════════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const statusAuth = await requireAuth(req, res);
      if (!statusAuth) return;
      const videoId = req.query.videoId as string;
      if (!videoId) {
        res.status(400).json({ error: 'videoId query parameter is required' });
        return;
      }

      res.status(200).json(await filmStatus(videoId));
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST: Render or status
    // ══════════════════════════════════════════════════════════════════════

    const body = (req.body || {}) as RenderRequest;

    if (!body.action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    // Rendering needs a plan that includes Cristiano films (a new film is counted
    // below, after the cache checks); checking status only needs a sign-in.
    const entitled = body.action === 'render' ? await requireFeature(req, res, 'cristianoVideos') : null;
    const auth = entitled ? entitled.auth : await requireAuth(req, res);
    if (!auth) return;

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
              heygenVideoId: inProgress.heygen_session_id ?? inProgress.heygen_video_id,
              status: inProgress.status,
              createdAt: inProgress.created_at,
            },
          });
          return;
        }

        if (!entitled || !(await consumeOrDeny(res, entitled, 'cristianoVideos'))) return;
        counted = entitled;

        // Build the Video Agent prompt
        const videoAgentPrompt = buildVideoAgentPrompt(body.storyboard);

        console.log('[RENDER] Submitting to HeyGen Video Agent for:', body.winnerCity);
        console.log('[RENDER] Prompt length:', videoAgentPrompt.length, 'chars');

        // Submit to HeyGen's v3 video agent — the engine's call, with Cristiano's
        // own face and voice as fields (film.ts startAgentFilm).
        const started = await startAgentFilm({
          prompt: videoAgentPrompt,
          ...(CRISTIANO_LOOK_ID ? { avatarId: CRISTIANO_LOOK_ID } : {}),
          ...(CRISTIANO_VOICE_ID ? { voiceId: CRISTIANO_VOICE_ID } : {}),
        });
        if (!started.ok) {
          throw new Error(started.failure.message);
        }
        const heygenSessionId = started.value.sessionId;
        const heygenVideoId = started.value.videoId;
        console.log('[RENDER] Video Agent session started:', heygenSessionId, 'video:', heygenVideoId ?? '(not yet named)');
        counted = null; // the film is under way — the count stands

        // Calculate word count for cache
        const scenes = body.storyboard.scenes as Array<Record<string, unknown>> | undefined;
        const allVoiceover = scenes?.map(s => String(s.voiceover || '')).join(' ') || '';
        const wordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;

        // Cache the record
        const cacheId = await saveToCache({
          cityName: body.winnerCity,
          country: body.winnerCountry,
          region: body.winnerRegion,
          heygenSessionId,
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
            id: cacheId || heygenSessionId,
            cityName: body.winnerCity,
            // The handle the screen polls: the agent session (the video id comes later).
            heygenVideoId: heygenSessionId,
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

        res.status(200).json(await filmStatus(body.heygenVideoId));
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${body.action}` });
    }
  } catch (error) {
    console.error('[RENDER] Error:', error);
    if (counted) await refundFeature(counted.auth.userId, 'cristianoVideos', counted.access.limits);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Cristiano render request failed',
    });
  }
}
