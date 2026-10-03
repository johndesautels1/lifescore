/**
 * LIFE SCORE - HeyGen Video Generation API
 * Pre-rendered avatar video: Olivia presenting the report.
 *
 * Unlike the streaming avatar (heygen.ts), this creates a polished,
 * downloadable video with Olivia presenting the report.
 *
 * PRIMARY (2026-10-03): HeyGen v3 — POST /v3/videos, GET /v3/videos/{id} —
 * through the shared judge-page wiring (api/shared/heygen/heygenVideo.ts), with
 * Olivia's own avatar and voice. HeyGen retires its v1/v2 addresses on
 * 1 November 2026 (developers.heygen.com, endpoint version comparison).
 *
 * BACK-UP: the v2 multi-scene call this route always made (below, unchanged),
 * used when v3 refuses, when the script is longer than v3 takes in one piece,
 * or when HeyGen does not list Olivia's look among the account's own — the
 * shared wiring's self-repair picks another of the account's looks when an
 * avatar is missing, and another presenter's face must never read Olivia's words.
 *
 * Flow:
 *   1. Client sends 'generate' with full narration script
 *   2. We submit to HeyGen v3 (/v3/videos), else v2 (/v2/video/generate)
 *   3. Client polls 'status' until completed
 *   4. Returns video URL for playback/download
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../../shared/rateLimit.js';
import { handleCors } from '../../shared/cors.js';
import { requireFeature } from '../../shared/entitlements.js';
import { fetchWithTimeout } from '../../shared/fetchWithTimeout.js';
import {
  MAX_SCRIPT_CHARS,
  isHeyGenError,
  listOwnLooks,
  submitVideo,
  videoState,
} from '../../shared/heygen/heygenVideo.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const HEYGEN_API_V2 = 'https://api.heygen.com/v2';
const HEYGEN_API_V1 = 'https://api.heygen.com/v1';
const HEYGEN_TIMEOUT_MS = 60000;

// Olivia avatar & voice defaults
const DEFAULT_AVATAR_ID = process.env.HEYGEN_OLIVIA_AVATAR_ID || '';
const DEFAULT_VOICE_ID = process.env.HEYGEN_OLIVIA_VOICE_ID || '';

// Max script length (HeyGen limit ~5000 chars per scene for reliable generation)
const MAX_SCRIPT_LENGTH = 15000;

// ============================================================================
// TYPES
// ============================================================================

interface VideoGenerateRequest {
  action: 'generate' | 'status';
  videoId?: string;
  script?: string;
  avatarId?: string;
  voiceId?: string;
  title?: string;
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

/** What the screen is told about a video (unchanged contract). */
interface PresenterVideoStatus {
  videoId: string;
  status: 'generating' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  error?: string;
}

// ============================================================================
// PRIMARY: HeyGen v3
// ============================================================================

/**
 * Submit on v3, or say why not (the caller then uses the v2 back-up).
 * Never throws.
 */
async function submitOnV3(
  script: string,
  avatarId: string,
  voiceId: string,
  title?: string
): Promise<{ ok: true; videoId: string } | { ok: false; reason: string }> {
  if (script.length > MAX_SCRIPT_CHARS) {
    return { ok: false, reason: `script is ${script.length} chars; v3 takes ${MAX_SCRIPT_CHARS} in one piece` };
  }
  try {
    // Olivia's avatar and voice are passed on every call, so the shared wiring
    // never needs (or reads) the judge's own settings.
    const looks = await listOwnLooks({ avatarId, voiceId });
    if (!looks.some((look) => look.id === avatarId)) {
      return { ok: false, reason: `avatar ${avatarId} is not among the account's own v3 looks` };
    }
    const { videoId, avatarUsed } = await submitVideo(script, {
      avatarId,
      voiceId,
      title: title || 'LIFE SCORE — Olivia presents the report',
    });
    if (avatarUsed !== avatarId) {
      console.error('[HEYGEN-VIDEO] v3 filmed with a different avatar than Olivia:', avatarUsed);
    }
    return { ok: true, videoId };
  } catch (err) {
    return { ok: false, reason: isHeyGenError(err) ? `${err.kind}: ${err.message}` : String(err) };
  }
}

/** v3 status in the screen's words. */
async function statusOnV3(videoId: string): Promise<PresenterVideoStatus> {
  // The shared wiring checks a face and voice are configured before any call;
  // Olivia's are named so the judge's settings are never needed here.
  const state = await videoState(videoId, { avatarId: DEFAULT_AVATAR_ID, voiceId: DEFAULT_VOICE_ID });
  return {
    videoId,
    status: state.status === 'completed' ? 'completed'
      : state.status === 'failed' ? 'failed'
      : state.status === 'processing' ? 'processing'
      : 'generating',
    videoUrl: state.videoUrl,
    thumbnailUrl: state.thumbnailUrl,
    durationSeconds: state.seconds,
    error: state.error,
  };
}

// ============================================================================
// BACK-UP: HeyGen v2 (retired by HeyGen on 1 November 2026)
// ============================================================================

function getHeyGenKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new Error('HEYGEN_API_KEY not configured');
  }
  return key;
}

/**
 * Split a long script into scenes of ~1500 chars each (natural paragraph breaks).
 * HeyGen works best with multiple shorter scenes rather than one massive input.
 */
function splitScriptIntoScenes(script: string): string[] {
  const MAX_SCENE_LENGTH = 1500;
  const paragraphs = script.split(/\n\n+/);
  const scenes: string[] = [];
  let currentScene = '';

  for (const paragraph of paragraphs) {
    if (currentScene.length + paragraph.length + 2 > MAX_SCENE_LENGTH && currentScene.length > 0) {
      scenes.push(currentScene.trim());
      currentScene = paragraph;
    } else {
      currentScene += (currentScene ? '\n\n' : '') + paragraph;
    }
  }

  if (currentScene.trim()) {
    scenes.push(currentScene.trim());
  }

  return scenes.length > 0 ? scenes : [script];
}

/**
 * Submit video generation to HeyGen v2
 */
async function generateVideo(
  apiKey: string,
  script: string,
  avatarId: string,
  voiceId: string,
  title?: string
): Promise<string> {
  const scenes = splitScriptIntoScenes(script);

  const videoInputs = scenes.map((sceneText) => ({
    character: {
      type: 'avatar',
      avatar_id: avatarId,
      avatar_style: 'normal',
    },
    voice: {
      type: 'text',
      input_text: sceneText,
      voice_id: voiceId,
    },
    background: {
      type: 'color' as const,
      value: '#0a1628', // Dark branded background matching LIFE SCORE theme
    },
  }));

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

  console.log('[HEYGEN-VIDEO] Generating v2 video with', scenes.length, 'scenes');

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
 * Check v2 video generation status (v1 status address)
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

/** v1 status in the screen's words. */
async function statusOnV1(apiKey: string, videoId: string): Promise<PresenterVideoStatus> {
  const status = await checkVideoStatus(apiKey, videoId);
  return {
    videoId: status.video_id,
    status: status.status === 'completed' ? 'completed'
      : status.status === 'failed' ? 'failed'
      : status.status === 'processing' ? 'processing'
      : 'generating',
    videoUrl: status.video_url || undefined,
    thumbnailUrl: status.thumbnail_url || undefined,
    durationSeconds: status.duration || undefined,
    error: status.error || undefined,
  };
}

/** Status from v3; a video v3 cannot report on is asked of the v1 address. */
async function presenterStatus(apiKey: string, videoId: string): Promise<PresenterVideoStatus> {
  try {
    return await statusOnV3(videoId);
  } catch (err) {
    console.warn('[HEYGEN-VIDEO] v3 status unavailable, asking v1:', isHeyGenError(err) ? `${err.kind}: ${err.message}` : err);
    return statusOnV1(apiKey, videoId);
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

  // Rate limiting - use standard preset (video gen is expensive but polling is frequent)
  if (!applyRateLimit(req.headers, 'heygen-video', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Require authentication — uses HeyGen video generation credits
  const auth = (await requireFeature(req, res, 'oliviaMinutesPerMonth'))?.auth ?? null;
  if (!auth) return;

  try {
    const apiKey = getHeyGenKey();

    // Support GET for status polling (simpler client code)
    if (req.method === 'GET') {
      const videoId = req.query.videoId as string;
      if (!videoId) {
        res.status(400).json({ error: 'videoId query parameter is required' });
        return;
      }

      const status = await presenterStatus(apiKey, videoId);
      console.log('[HEYGEN-VIDEO] Status for', videoId, ':', status.status);
      res.status(200).json(status);
      return;
    }

    // POST - generate or status
    const { action, videoId, script, avatarId, voiceId, title } = req.body as VideoGenerateRequest;

    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    switch (action) {
      case 'generate': {
        if (!script) {
          res.status(400).json({ error: 'script is required for generate action' });
          return;
        }

        if (script.length > MAX_SCRIPT_LENGTH) {
          res.status(400).json({
            error: `Script too long (${script.length} chars). Maximum is ${MAX_SCRIPT_LENGTH} chars.`,
          });
          return;
        }

        const effectiveAvatarId = avatarId || DEFAULT_AVATAR_ID;
        const effectiveVoiceId = voiceId || DEFAULT_VOICE_ID;

        if (!effectiveAvatarId) {
          res.status(400).json({ error: 'HEYGEN_OLIVIA_AVATAR_ID not configured and no avatarId provided' });
          return;
        }

        if (!effectiveVoiceId) {
          res.status(400).json({ error: 'HEYGEN_OLIVIA_VOICE_ID not configured and no voiceId provided. Set HEYGEN_OLIVIA_VOICE_ID in Vercel environment variables.' });
          return;
        }

        console.log('[HEYGEN-VIDEO] Using avatar:', effectiveAvatarId, 'voice:', effectiveVoiceId, 'chars:', script.length);

        let generatedVideoId: string;
        const primary = await submitOnV3(script, effectiveAvatarId, effectiveVoiceId, title);
        if (primary.ok) {
          generatedVideoId = primary.videoId;
          console.log('[HEYGEN-VIDEO] Video submitted on v3:', generatedVideoId);
        } else {
          console.warn('[HEYGEN-VIDEO] v3 not used (' + primary.reason + '); using the v2 back-up');
          generatedVideoId = await generateVideo(apiKey, script, effectiveAvatarId, effectiveVoiceId, title);
          console.log('[HEYGEN-VIDEO] Video submitted on v2:', generatedVideoId);
        }

        res.status(200).json({
          videoId: generatedVideoId,
          status: 'generating',
        });
        return;
      }

      case 'status': {
        if (!videoId) {
          res.status(400).json({ error: 'videoId is required for status action' });
          return;
        }

        const status = await presenterStatus(apiKey, videoId);
        console.log('[HEYGEN-VIDEO] Status:', status.status);
        res.status(200).json(status);
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[HEYGEN-VIDEO] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'HeyGen video request failed',
    });
  }
}
