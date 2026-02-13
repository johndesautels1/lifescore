/**
 * LIFE SCORE - HeyGen Video Generation API
 * Pre-rendered avatar video using HeyGen's Video Generation API v2
 *
 * Unlike the streaming avatar (heygen.ts), this creates a polished,
 * downloadable video with Olivia presenting the report.
 *
 * Flow:
 *   1. Client sends 'generate' with full narration script
 *   2. We submit to HeyGen /v2/video/generate
 *   3. Client polls 'status' until completed
 *   4. Returns video URL for playback/download
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../../shared/rateLimit.js';
import { handleCors } from '../../shared/cors.js';
import { fetchWithTimeout } from '../../shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const HEYGEN_API_V2 = 'https://api.heygen.com/v2';
const HEYGEN_API_V1 = 'https://api.heygen.com/v1';
const HEYGEN_TIMEOUT_MS = 60000;

// Avatar & voice defaults (same env vars as streaming endpoint)
const DEFAULT_AVATAR_ID = process.env.HEYGEN_AVATAR_ID || '';
const DEFAULT_VOICE_ID = process.env.HEYGEN_VOICE_ID || '';

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
 * Submit video generation to HeyGen
 */
async function generateVideo(
  apiKey: string,
  script: string,
  avatarId: string,
  voiceId?: string,
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
      voice_id: voiceId || undefined,
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

  console.log('[HEYGEN-VIDEO] Generating video with', scenes.length, 'scenes');

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

  try {
    const apiKey = getHeyGenKey();

    // Support GET for status polling (simpler client code)
    if (req.method === 'GET') {
      const videoId = req.query.videoId as string;
      if (!videoId) {
        res.status(400).json({ error: 'videoId query parameter is required' });
        return;
      }

      const status = await checkVideoStatus(apiKey, videoId);
      console.log('[HEYGEN-VIDEO] Status for', videoId, ':', status.status);

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

        if (!DEFAULT_AVATAR_ID && !avatarId) {
          res.status(400).json({ error: 'HEYGEN_AVATAR_ID not configured and no avatarId provided' });
          return;
        }

        const generatedVideoId = await generateVideo(
          apiKey,
          script,
          avatarId || DEFAULT_AVATAR_ID,
          voiceId || DEFAULT_VOICE_ID || undefined,
          title
        );

        console.log('[HEYGEN-VIDEO] Video submitted:', generatedVideoId);

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

        const status = await checkVideoStatus(apiKey, videoId);
        console.log('[HEYGEN-VIDEO] Status:', status.status);

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
        res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('[HEYGEN-VIDEO] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'HeyGen video request failed',
    });
  }
}
