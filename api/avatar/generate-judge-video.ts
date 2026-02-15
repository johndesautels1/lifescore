/**
 * LIFE SCORE - Judge Video Generation API
 *
 * Generates Cristiano judge videos using Replicate Wav2Lip.
 * Flow: Script → TTS Audio → Upload to Storage → Wav2Lip → Video
 *
 * Uses Wav2Lip: ~6 seconds, $0.005/video, reliable
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { persistVideoToStorage } from '../shared/persistVideo.js';
import crypto from 'crypto';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Wav2Lip model - fast, cheap, reliable lip-sync
// ~6 seconds generation time, $0.005 per run on L40S GPU
const WAV2LIP_VERSION = 'skytells-research/wav2lip:22b1ecf6252b8adcaeadde30bb672b199c125b7d3c98607db70b66eea21d75ae';

// Cristiano judge avatar image (PNG/JPG for Wav2Lip)
const CRISTIANO_IMAGE_URL = process.env.CRISTIANO_IMAGE_URL ||
  'https://replicate.delivery/pbxt/OUrlfPYTJP3dttVkSYXUps6yUmzZbLTdVdrut77q48Tx7GfI/enhanced_avatar_max.png';

// ElevenLabs voice for Cristiano (authoritative male voice)
// Updated 2026-01-27: Custom Cristiano voice via Simli
const CRISTIANO_VOICE_ID = process.env.ELEVENLABS_CRISTIANO_VOICE_ID || 'ZpwpoMoU84OhcbA2YBBV'; // Cristiano Judge voice

export const config = {
  maxDuration: 120, // 2 minutes for TTS + Replicate submission
};

// Supabase client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

interface GenerateRequest {
  comparisonId?: string;
  script: string;
  city1: string;
  city2: string;
  winner: string;
  winnerScore: number;
  loserScore: number;
}

// Generate comparison hash for cache lookup
function generateComparisonId(city1: string, city2: string, winner: string): string {
  const data = `${city1.toLowerCase()}-${city2.toLowerCase()}-${winner.toLowerCase()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Generate TTS audio using ElevenLabs
 * Returns MP3 buffer for Replicate compatibility
 */
async function generateTTSAudio(script: string): Promise<{ buffer: Buffer; duration: number }> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const TTS_TIMEOUT_MS = 45000; // 45 seconds for TTS generation

  if (!elevenLabsKey && !openaiKey) {
    throw new Error('No TTS API key configured (ELEVENLABS_API_KEY or OPENAI_API_KEY required)');
  }

  console.log('[JUDGE-VIDEO] Generating TTS audio, script length:', script.length);
  console.log('[JUDGE-VIDEO] ElevenLabs key exists:', !!elevenLabsKey, 'length:', elevenLabsKey?.length || 0);
  console.log('[JUDGE-VIDEO] Voice ID:', CRISTIANO_VOICE_ID);

  // Try ElevenLabs first, fallback to OpenAI if it fails (quota exceeded, etc)
  if (elevenLabsKey) {
    const elevenLabsController = new AbortController();
    const elevenLabsTimeoutId = setTimeout(() => elevenLabsController.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${CRISTIANO_VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: script,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.75,
              style: 0.1,
              use_speaker_boost: true,
            },
          }),
          signal: elevenLabsController.signal,
        }
      );

      clearTimeout(elevenLabsTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[JUDGE-VIDEO] ElevenLabs error:', response.status, errorText);
        // Fall through to OpenAI fallback
        throw new Error(`ElevenLabs failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const estimatedDuration = (script.length / 5) / 150 * 60;
      console.log('[JUDGE-VIDEO] ElevenLabs audio generated:', buffer.length, 'bytes');
      return { buffer, duration: estimatedDuration };
    } catch (elevenLabsError) {
      clearTimeout(elevenLabsTimeoutId);
      console.warn('[JUDGE-VIDEO] ElevenLabs failed, trying OpenAI fallback:', elevenLabsError);
      if (!openaiKey) {
        throw elevenLabsError; // No fallback available
      }
      // Fall through to OpenAI
    }
  }

  // OpenAI TTS fallback (or primary if no ElevenLabs key)
  if (openaiKey) {
    const openaiController = new AbortController();
    const openaiTimeoutId = setTimeout(() => openaiController.abort(), TTS_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          voice: 'onyx', // Deep authoritative male voice
          input: script,
          response_format: 'mp3',
        }),
        signal: openaiController.signal,
      });

      clearTimeout(openaiTimeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[JUDGE-VIDEO] OpenAI TTS error:', response.status, errorText);
        throw new Error(`OpenAI TTS failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const estimatedDuration = (script.length / 5) / 150 * 60;

      console.log('[JUDGE-VIDEO] OpenAI audio generated:', buffer.length, 'bytes');
      return { buffer, duration: estimatedDuration };
    } catch (openaiError) {
      clearTimeout(openaiTimeoutId);
      throw openaiError;
    }
  }

  throw new Error('No TTS provider available');
}

/**
 * Upload audio to Supabase Storage and get public URL
 * Includes timeout handling to prevent hanging on DB issues
 */
async function uploadAudioToStorage(buffer: Buffer, comparisonId: string): Promise<string> {
  const fileName = `judge-audio/${comparisonId}-${Date.now()}.mp3`;
  const UPLOAD_TIMEOUT_MS = 45000; // 45 seconds

  console.log('[JUDGE-VIDEO] Uploading audio to Supabase Storage:', fileName, 'size:', buffer.length);

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const { error: uploadError } = await supabaseAdmin.storage
      .from('Avatars')
      .upload(fileName, buffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    clearTimeout(timeoutId);

    if (uploadError) {
      console.error('[JUDGE-VIDEO] Storage upload error:', uploadError);
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('Avatars')
      .getPublicUrl(fileName);

    console.log('[JUDGE-VIDEO] Audio uploaded successfully, URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : 'Unknown upload error';
    console.error('[JUDGE-VIDEO] Storage upload failed:', errorMsg);
    throw new Error(`Storage upload failed: ${errorMsg}`);
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — reject unauthenticated requests
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken) {
    console.error('[JUDGE-VIDEO] REPLICATE_API_TOKEN not configured');
    res.status(500).json({
      error: 'Replicate not configured',
      message: 'REPLICATE_API_TOKEN environment variable required',
    });
    return;
  }

  const body = req.body as GenerateRequest;

  if (!body.script || !body.city1 || !body.city2 || !body.winner) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['script', 'city1', 'city2', 'winner'],
    });
    return;
  }

  const comparisonId = body.comparisonId || generateComparisonId(body.city1, body.city2, body.winner);

  try {
    // Helper for DB operations with timeout
    const withTimeout = async <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
      ]);
    };

    const DB_TIMEOUT_MS = 45000; // 45s timeout for DB queries

    // Check cache first (with timeout - don't let DB issues block video generation)
    // Using maybeSingle() instead of single() to avoid error when no rows exist
    const cacheResult = await withTimeout(
      supabaseAdmin
        .from('avatar_videos')
        .select('*')
        .eq('comparison_id', comparisonId)
        .eq('status', 'completed')
        .maybeSingle(),
      DB_TIMEOUT_MS,
      { data: null, error: { message: 'Cache lookup timeout' } }
    );

    const { data: cached, error: cacheError } = cacheResult;

    // Cache hit - return existing video
    if (cached) {
      let videoUrl = cached.video_url;

      // Auto-migrate: if cached URL is a temporary Replicate CDN URL, persist to storage
      if (videoUrl && videoUrl.includes('replicate.delivery') && !cached.video_storage_path) {
        console.log('[JUDGE-VIDEO] Cache hit has stale Replicate URL, migrating to storage...');
        const persisted = await persistVideoToStorage(videoUrl, cached.comparison_id, supabaseAdmin);
        if (persisted) {
          videoUrl = persisted.publicUrl;
          // Update DB in background (don't block the response)
          supabaseAdmin
            .from('avatar_videos')
            .update({ video_url: persisted.publicUrl, video_storage_path: persisted.storagePath })
            .eq('id', cached.id)
            .then(({ error: migErr }) => {
              if (migErr) console.warn('[JUDGE-VIDEO] Migration update failed:', migErr.message);
              else console.log('[JUDGE-VIDEO] Migrated cached video to permanent storage');
            });
        } else {
          console.warn('[JUDGE-VIDEO] Migration failed (Replicate URL may have expired), returning stale URL');
        }
      }

      console.log('[JUDGE-VIDEO] Cache hit:', comparisonId);
      res.status(200).json({
        success: true,
        cached: true,
        video: {
          id: cached.id,
          comparisonId: cached.comparison_id,
          status: 'completed',
          videoUrl,
          script: cached.script,
          durationSeconds: cached.duration_seconds,
          createdAt: cached.created_at,
          completedAt: cached.completed_at,
        },
      });
      return;
    }

    // Only log actual errors, not "no rows found"
    if (cacheError && cacheError.message !== 'Cache lookup timeout') {
      console.warn('[JUDGE-VIDEO] Cache lookup error:', cacheError.message);
    }

    // Check if already processing (with timeout)
    // Using maybeSingle() - returns null if no processing job exists
    const processingResult = await withTimeout(
      supabaseAdmin
        .from('avatar_videos')
        .select('*')
        .eq('comparison_id', comparisonId)
        .in('status', ['pending', 'processing'])
        .maybeSingle(),
      DB_TIMEOUT_MS,
      { data: null, error: { message: 'Processing check timeout' } }
    );

    const { data: processing } = processingResult;

    if (processing) {
      console.log('[JUDGE-VIDEO] Already processing:', comparisonId);
      res.status(200).json({
        success: true,
        cached: false,
        video: {
          id: processing.id,
          comparisonId: processing.comparison_id,
          status: processing.status,
          script: processing.script,
          createdAt: processing.created_at,
          replicatePredictionId: processing.replicate_prediction_id,
        },
      });
      return;
    }

    console.log('[JUDGE-VIDEO] Starting generation for:', comparisonId);

    // Step 1: Generate TTS audio from script
    const { buffer: audioBuffer, duration: audioDuration } = await generateTTSAudio(body.script);

    // Step 2: Upload audio to Supabase Storage to get public URL
    const audioUrl = await uploadAudioToStorage(audioBuffer, comparisonId);

    // Step 3: Submit to Replicate Wav2Lip
    console.log('[JUDGE-VIDEO] Submitting to Replicate Wav2Lip...');

    // Use stable production URL for webhook (VERCEL_URL changes per deployment)
    const webhookUrl = process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/avatar/video-webhook`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/avatar/video-webhook`
        : null;

    // Build input for Wav2Lip
    // Wav2Lip params: face (image), audio, pads, smooth, fps, out_height
    // UPDATED 2026-02-03: Adjusted settings for more natural appearance
    // - Wider pads for better face capture
    // - Higher fps (30) for smoother motion
    // - Higher resolution (720p)
    // NOTE: resize_factor removed - not supported by this Wav2Lip version
    const replicateInput = {
      face: CRISTIANO_IMAGE_URL,
      audio: audioUrl,
      pads: '0 15 5 5',       // Wider capture area (top, bottom, left, right)
      smooth: true,
      fps: 30,                // Smoother playback
      out_height: 720,        // Higher resolution
    };

    // Build request body with version hash
    const replicateBody: Record<string, unknown> = {
      version: WAV2LIP_VERSION.split(':')[1], // Extract version hash
      input: replicateInput,
    };

    // Only add webhook if we have a URL
    if (webhookUrl) {
      replicateBody.webhook = webhookUrl;
      replicateBody.webhook_events_filter = ['start', 'completed'];
    }

    // Submit to Replicate predictions API (no deployment needed - Wav2Lip is fast)
    const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(replicateBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JUDGE-VIDEO] Wav2Lip submission failed:', response.status, errorText);
      res.status(response.status).json({
        error: 'Failed to start video generation',
        message: errorText,
      });
      return;
    }

    const prediction = await response.json();
    console.log('[JUDGE-VIDEO] Prediction started:', prediction.id, 'status:', prediction.status);

    // Store in database (if table exists)
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('avatar_videos')
      .insert({
        comparison_id: comparisonId,
        video_url: '',
        audio_url: audioUrl,
        script: body.script,
        city1: body.city1,
        city2: body.city2,
        winner: body.winner,
        winner_score: body.winnerScore,
        loser_score: body.loserScore,
        replicate_prediction_id: prediction.id,
        status: 'processing',
        duration_seconds: audioDuration,
      })
      .select()
      .single();

    if (insertError) {
      // Log but don't fail - table might not exist yet
      console.warn('[JUDGE-VIDEO] Insert warning (table may not exist):', insertError.message);
    }

    res.status(200).json({
      success: true,
      cached: false,
      video: {
        id: inserted?.id || prediction.id,
        comparisonId,
        status: 'processing',
        replicatePredictionId: prediction.id,
        script: body.script,
        audioUrl,
        estimatedDuration: audioDuration,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[JUDGE-VIDEO] Error:', error);
    res.status(500).json({
      error: 'Failed to generate video',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
// Redeploy trigger 1769736808
