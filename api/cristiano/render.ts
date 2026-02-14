/**
 * LIFE SCORE - Cristiano "Go To My New City" HeyGen Render Orchestrator
 * Stage 2 of the 2-stage video pipeline.
 *
 * Takes the validated 9-scene Storyboard JSON from Stage 1 (storyboard.ts),
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

// Cristiano avatar & voice (from env)
const CRISTIANO_AVATAR_ID = process.env.HEYGEN_CHRISTIAN_AVATAR_ID || '';
const CRISTIANO_VOICE_ID = process.env.HEYGEN_CHRISTIAN_VOICE_ID || '';

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
    errors.push('HEYGEN_CHRISTIAN_AVATAR_ID not configured in environment');
  }
  if (!CRISTIANO_VOICE_ID) {
    errors.push('HEYGEN_CHRISTIAN_VOICE_ID not configured in environment');
  }

  const scenes = storyboard.scenes as Array<Record<string, unknown>> | undefined;
  if (!scenes || scenes.length !== 9) {
    errors.push(`Expected 9 scenes, got ${scenes?.length || 0}`);
  }

  if (scenes) {
    const totalDuration = scenes.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);
    if (totalDuration < 110 || totalDuration > 130) {
      errors.push(`Total duration ${totalDuration}s outside 110-130s range`);
    }

    // FIX 2026-02-14: Align word count tolerance with storyboard.ts Stage 1 QA.
    // Natural narration pace for 120s is ~2-3 words/sec = 240-360 words.
    // Hard-fail only at extremes to avoid rejecting perfectly usable storyboards.
    const allVoiceover = scenes.map(s => String(s.voiceover || '')).join(' ');
    const wordCount = allVoiceover.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 220 || wordCount > 380) {
      errors.push(`Word count ${wordCount} outside 220-380 range`);
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
    if (scenes[8]?.type !== 'A_ROLL') errors.push('Scene 9 must be A_ROLL');
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

  return { valid: errors.length === 0, errors };
}

/**
 * Format the storyboard JSON into a comprehensive prompt for HeyGen Video Agent.
 * CRITICAL: HeyGen Video Agent has a 10,000 character prompt limit.
 * Uses compact JSON and trimmed instructions to stay under the cap.
 */
function buildVideoAgentPrompt(storyboard: Record<string, unknown>): string {
  // Strip fields HeyGen doesn't need to reduce JSON size
  const slim = { ...storyboard };
  // Remove thumbnail — HeyGen doesn't generate thumbnails
  delete slim.thumbnail;
  // Remove overlay_system — instructions already cover it
  delete slim.overlay_system;
  // Remove video_meta — timing is in scenes already
  delete slim.video_meta;

  // Compact JSON (no pretty-print) saves ~1,600 chars
  const json = JSON.stringify(slim);

  const prompt = `Create a ~120-second cinematic city tour video for CLUES Life Score "Go To My New City."

AVATAR LOCK:
- Avatar ID: ${CRISTIANO_AVATAR_ID} (Cristiano). Do not substitute.
- Voice ID: ${CRISTIANO_VOICE_ID}. Do not substitute.

Follow the Storyboard JSON exactly: scene timing, captions, overlays, categories.

Captions ON. On-screen text: max 6 words/line, max 2 lines. Reserve lower-right 15% for logo/QR.

Overlays: top-left Freedom Score badge, top category strip (6 categories), bottom-right logo/QR box.

STYLE: Cinematic, premium, modern. Moving shots only. Imply openness, mobility, sunlight, safety, choice. Avoid grim police, protests, surveillance, propaganda.

SCENES: 1 & 9 = A-ROLL (Cristiano on camera). 2-8 = B-ROLL (city footage + overlays).

Storyboard:
${json}

Use generic cinematic city footage if specific stock unavailable. Keep timing identical. End with: "Lifestyle scoring, not legal advice."`;

  // Safety check — log warning if approaching limit
  if (prompt.length > 9500) {
    console.warn(`[RENDER] Prompt is ${prompt.length} chars (limit 10000). Consider shorter voiceover.`);
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
        const renderResponse = await fetchWithTimeout(
          HEYGEN_VIDEO_AGENT_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': apiKey,
            },
            body: JSON.stringify({ prompt: videoAgentPrompt }),
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
          sceneCount: scenes?.length || 9,
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
            sceneCount: scenes?.length || 9,
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
