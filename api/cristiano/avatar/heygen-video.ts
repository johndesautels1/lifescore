/**
 * LIFE SCORE - Cristiano HeyGen Video Generation API
 * Multi-scene pre-rendered avatar video using HeyGen's Video Generation API v2
 *
 * Unlike Olivia's presenter video (single background, report overlay),
 * Cristiano's "Go To My New City" video uses multiple scenes with
 * different backgrounds and scenery types (A, B, C) to create a
 * cinematic city presentation.
 *
 * Flow:
 *   1. Client sends 'generate' with structured scenes array
 *   2. Check Supabase cache by winning city name
 *   3. If no cache hit, submit to HeyGen /v2/video/generate
 *   4. Client polls 'status' until completed
 *   5. Cache completed video URL in Supabase for reuse
 *
 * Sovereign plan only, 1 video/month per user.
 *
 * Clues Intelligence LTD
 * (c) 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit } from '../../shared/rateLimit.js';
import { handleCors } from '../../shared/cors.js';
import { requireAuth } from '../../shared/auth.js';
import { fetchWithTimeout } from '../../shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const HEYGEN_API_V2 = 'https://api.heygen.com/v2';
const HEYGEN_API_V1 = 'https://api.heygen.com/v1';
const HEYGEN_TIMEOUT_MS = 60000;

// Cristiano avatar & voice defaults
const DEFAULT_AVATAR_ID = process.env.HEYGEN_CHRISTIAN_AVATAR_ID || '';
const DEFAULT_VOICE_ID = process.env.HEYGEN_CHRISTIAN_VOICE_ID || '';

// Max script length per scene
const MAX_SCENE_LENGTH = 2000;
const MAX_TOTAL_SCRIPT_LENGTH = 15000;

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export const config = {
  maxDuration: 60,
};

// ============================================================================
// SCENE BACKGROUND THEMES
// ============================================================================

/**
 * Each scene type gets a distinct background to create visual variety.
 * Colors are chosen to match the emotional tone of each scene.
 */
const SCENE_BACKGROUNDS: Record<string, { type: 'color'; value: string }> = {
  // Scene A: Introduction - Deep navy (authority, trust)
  intro: { type: 'color', value: '#0a1628' },
  // Scene B: Verdict recap - Dark burgundy (judicial, formal)
  verdict: { type: 'color', value: '#1a0a14' },
  // Scene C: Category highlights - Teal/dark green (growth, opportunity)
  category: { type: 'color', value: '#0a1a1a' },
  // Scene D: Daily life / future outlook - Warm dark gold (aspiration)
  lifestyle: { type: 'color', value: '#1a1408' },
  // Scene E: Getting started - Sunrise purple (new beginnings)
  action: { type: 'color', value: '#140a1a' },
  // Default fallback
  default: { type: 'color', value: '#0a1628' },
};

// ============================================================================
// TYPES
// ============================================================================

interface VideoScene {
  sceneType: string;       // 'intro' | 'verdict' | 'category' | 'lifestyle' | 'action'
  narration: string;       // Text for Cristiano to speak
  title?: string;          // Scene title (metadata only)
}

interface VideoGenerateRequest {
  action: 'generate' | 'status';
  videoId?: string;         // For status checks
  // For generation:
  scenes?: VideoScene[];    // Multi-scene structured input
  script?: string;          // Fallback: single script (auto-split)
  winnerCity: string;
  loserCity?: string;
  winnerScore?: number;
  loserScore?: number;
  title?: string;
  avatarId?: string;
  voiceId?: string;
}

interface HeyGenVideoGenerateResponse {
  error: string | null;
  data: {
    video_id: string;
  };
}

interface HeyGenVideoStatusResponse {
  code: number;
  data: {
    video_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    video_url: string | null;
    thumbnail_url: string | null;
    duration: number | null;
    error: string | null;
  };
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
 * Build HeyGen video_inputs from structured scenes.
 * Each scene gets its own background based on sceneType.
 */
function buildVideoInputs(
  scenes: VideoScene[],
  avatarId: string,
  voiceId: string
): Array<Record<string, unknown>> {
  return scenes.map((scene) => {
    const bg = SCENE_BACKGROUNDS[scene.sceneType] || SCENE_BACKGROUNDS.default;

    return {
      character: {
        type: 'avatar',
        avatar_id: avatarId,
        avatar_style: 'normal',
      },
      voice: {
        type: 'text',
        input_text: scene.narration,
        voice_id: voiceId,
      },
      background: {
        type: bg.type,
        value: bg.value,
      },
    };
  });
}

/**
 * Fallback: Split a single script into scenes by paragraph breaks
 */
function splitScriptIntoScenes(script: string): VideoScene[] {
  const paragraphs = script.split(/\n\n+/);
  const sceneTypes = ['intro', 'verdict', 'category', 'lifestyle', 'action'];
  const scenes: VideoScene[] = [];
  let currentScene = '';
  let sceneIndex = 0;

  for (const paragraph of paragraphs) {
    if (currentScene.length + paragraph.length + 2 > MAX_SCENE_LENGTH && currentScene.length > 0) {
      scenes.push({
        sceneType: sceneTypes[Math.min(sceneIndex, sceneTypes.length - 1)],
        narration: currentScene.trim(),
      });
      currentScene = paragraph;
      sceneIndex++;
    } else {
      currentScene += (currentScene ? '\n\n' : '') + paragraph;
    }
  }

  if (currentScene.trim()) {
    scenes.push({
      sceneType: sceneTypes[Math.min(sceneIndex, sceneTypes.length - 1)],
      narration: currentScene.trim(),
    });
  }

  return scenes.length > 0 ? scenes : [{ sceneType: 'intro', narration: script }];
}

/**
 * Submit multi-scene video generation to HeyGen
 */
async function generateVideo(
  apiKey: string,
  scenes: VideoScene[],
  avatarId: string,
  voiceId: string,
  title?: string
): Promise<string> {
  const videoInputs = buildVideoInputs(scenes, avatarId, voiceId);

  const requestBody: Record<string, unknown> = {
    video_inputs: videoInputs,
    dimension: {
      width: 1920,
      height: 1080,
    },
    aspect_ratio: '16:9',
    test: false,
  };

  if (title) {
    requestBody.title = title;
  }

  console.log('[CRISTIANO-HEYGEN] Generating video with', scenes.length, 'scenes');

  const response = await fetchWithTimeout(
    `${HEYGEN_API_V2}/video/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeyGen video generation failed (${response.status}): ${errorText}`);
  }

  const data: HeyGenVideoGenerateResponse = await response.json();

  if (data.error) {
    throw new Error(`HeyGen error: ${data.error}`);
  }

  return data.data.video_id;
}

/**
 * Check video generation status
 */
async function checkVideoStatus(
  apiKey: string,
  videoId: string
): Promise<HeyGenVideoStatusResponse['data']> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_V1}/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
      },
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeyGen status check failed (${response.status}): ${errorText}`);
  }

  const data: HeyGenVideoStatusResponse = await response.json();
  return data.data;
}

/**
 * Check Supabase cache for an existing completed video for this city
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
      console.warn('[CRISTIANO-HEYGEN] Cache lookup error:', error.message);
      return { cached: false };
    }

    if (data) {
      // Check if not expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.log('[CRISTIANO-HEYGEN] Cache expired for:', cityName);
        return { cached: false };
      }

      console.log('[CRISTIANO-HEYGEN] Cache hit for:', cityName);
      return {
        cached: true,
        video: {
          id: data.id,
          cityName: data.city_name,
          videoUrl: data.video_url,
          thumbnailUrl: data.thumbnail_url,
          durationSeconds: data.duration_seconds,
          sceneCount: data.scene_count,
          status: 'completed',
          createdAt: data.created_at,
        },
      };
    }

    return { cached: false };
  } catch (err) {
    console.warn('[CRISTIANO-HEYGEN] Cache check failed:', err);
    return { cached: false };
  }
}

/**
 * Save video record to Supabase cache
 */
async function saveToCache(params: {
  cityName: string;
  heygenVideoId: string;
  script: string;
  sceneCount: number;
  loserCity?: string;
  winnerScore?: number;
  loserScore?: number;
  userId?: string;
  status?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cristiano_city_videos')
      .insert({
        city_name: params.cityName.trim().toLowerCase(),
        heygen_video_id: params.heygenVideoId,
        script: params.script,
        scene_count: params.sceneCount,
        loser_city: params.loserCity,
        winner_score: params.winnerScore,
        loser_score: params.loserScore,
        generated_by: params.userId || null,
        status: params.status || 'processing',
        video_url: params.videoUrl || null,
        thumbnail_url: params.thumbnailUrl || null,
        duration_seconds: params.durationSeconds || null,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[CRISTIANO-HEYGEN] Cache insert error:', error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.warn('[CRISTIANO-HEYGEN] Cache save failed:', err);
    return null;
  }
}

/**
 * Update cached video with completed status
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
    console.warn('[CRISTIANO-HEYGEN] Cache update failed:', err);
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
  if (!applyRateLimit(req.headers, 'cristiano-heygen-video', 'standard', res)) {
    return;
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getHeyGenKey();

    // ══════════════════════════════════════════════════════════════════════
    // GET: Status polling (simpler client code)
    // ══════════════════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      const videoId = req.query.videoId as string;
      if (!videoId) {
        res.status(400).json({ error: 'videoId query parameter is required' });
        return;
      }

      const status = await checkVideoStatus(apiKey, videoId);
      console.log('[CRISTIANO-HEYGEN] Status for', videoId, ':', status.status);

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
          : 'generating',
        videoUrl: status.video_url || undefined,
        thumbnailUrl: status.thumbnail_url || undefined,
        durationSeconds: status.duration || undefined,
        error: status.error || undefined,
      });
      return;
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST: Generate or status
    // ══════════════════════════════════════════════════════════════════════

    // Auth required for generation
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const body = req.body as VideoGenerateRequest;

    if (!body.action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    switch (body.action) {
      case 'generate': {
        if (!body.winnerCity) {
          res.status(400).json({ error: 'winnerCity is required for generate action' });
          return;
        }

        // Check cache first
        const cacheResult = await checkCache(body.winnerCity);
        if (cacheResult.cached && cacheResult.video) {
          console.log('[CRISTIANO-HEYGEN] Returning cached video for:', body.winnerCity);
          res.status(200).json({
            success: true,
            cached: true,
            video: cacheResult.video,
          });
          return;
        }

        // Check if already processing for this city
        const { data: processing } = await supabaseAdmin
          .from('cristiano_city_videos')
          .select('*')
          .ilike('city_name', body.winnerCity.trim())
          .in('status', ['pending', 'processing'])
          .maybeSingle();

        if (processing) {
          console.log('[CRISTIANO-HEYGEN] Already processing for:', body.winnerCity);
          res.status(200).json({
            success: true,
            cached: false,
            video: {
              id: processing.id,
              cityName: processing.city_name,
              heygenVideoId: processing.heygen_video_id,
              status: processing.status,
              createdAt: processing.created_at,
            },
          });
          return;
        }

        // Build scenes from structured input or fallback script
        let scenes: VideoScene[];
        if (body.scenes && body.scenes.length > 0) {
          scenes = body.scenes;
        } else if (body.script) {
          if (body.script.length > MAX_TOTAL_SCRIPT_LENGTH) {
            res.status(400).json({
              error: `Script too long (${body.script.length} chars). Maximum is ${MAX_TOTAL_SCRIPT_LENGTH}.`,
            });
            return;
          }
          scenes = splitScriptIntoScenes(body.script);
        } else {
          res.status(400).json({ error: 'scenes or script is required for generate action' });
          return;
        }

        const effectiveAvatarId = body.avatarId || DEFAULT_AVATAR_ID;
        const effectiveVoiceId = body.voiceId || DEFAULT_VOICE_ID;

        if (!effectiveAvatarId) {
          res.status(400).json({
            error: 'HEYGEN_CHRISTIAN_AVATAR_ID not configured. Set it in Vercel environment variables.',
          });
          return;
        }

        if (!effectiveVoiceId) {
          res.status(400).json({
            error: 'HEYGEN_CHRISTIAN_VOICE_ID not configured. Set it in Vercel environment variables.',
          });
          return;
        }

        console.log('[CRISTIANO-HEYGEN] Using avatar:', effectiveAvatarId, 'voice:', effectiveVoiceId);

        // Concatenate all scene narration for script storage
        const fullScript = scenes.map(s => s.narration).join('\n\n');
        const videoTitle = body.title || `LIFE SCORE: Go To ${body.winnerCity}`;

        // Submit to HeyGen
        const heygenVideoId = await generateVideo(
          apiKey,
          scenes,
          effectiveAvatarId,
          effectiveVoiceId,
          videoTitle
        );

        console.log('[CRISTIANO-HEYGEN] Video submitted:', heygenVideoId);

        // Cache the record
        const cacheId = await saveToCache({
          cityName: body.winnerCity,
          heygenVideoId,
          script: fullScript,
          sceneCount: scenes.length,
          loserCity: body.loserCity,
          winnerScore: body.winnerScore,
          loserScore: body.loserScore,
          userId: auth.userId,
          status: 'processing',
        });

        res.status(200).json({
          success: true,
          cached: false,
          video: {
            id: cacheId || heygenVideoId,
            cityName: body.winnerCity,
            heygenVideoId,
            status: 'generating',
            sceneCount: scenes.length,
            createdAt: new Date().toISOString(),
          },
        });
        return;
      }

      case 'status': {
        if (!body.videoId) {
          res.status(400).json({ error: 'videoId is required for status action' });
          return;
        }

        const status = await checkVideoStatus(apiKey, body.videoId);
        console.log('[CRISTIANO-HEYGEN] Status:', status.status);

        // Update cache
        if (status.status === 'completed' || status.status === 'failed') {
          await updateCache(body.videoId, {
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
            : 'generating',
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
    console.error('[CRISTIANO-HEYGEN] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Cristiano HeyGen video request failed',
    });
  }
}
