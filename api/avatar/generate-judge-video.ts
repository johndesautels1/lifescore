/**
 * LIFE SCORE - Judge Video Generation API
 *
 * Generates Christiano judge videos using Replicate SadTalker.
 * Flow: Script → TTS Audio → Upload to Storage → SadTalker → Video
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import crypto from 'crypto';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// SadTalker model - produces high quality lip-sync videos
const SADTALKER_VERSION = 'cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3';

// Christiano judge avatar image
// Updated 2026-01-27: New Replicate avatar
const CHRISTIANO_IMAGE_URL = process.env.CHRISTIANO_IMAGE_URL ||
  'https://replicate.delivery/pbxt/OU2q0kEZmrGm3EB3eWU8AQ5MvYtoL4qu3sezEwj8P5FKix3o/Cristiano.mp4';

// ElevenLabs voice for Christiano (authoritative male voice)
// Updated 2026-01-27: Custom Christiano voice via Simli
const CHRISTIANO_VOICE_ID = process.env.ELEVENLABS_CHRISTIANO_VOICE_ID || 'ZpwpoMoU84OhcbA2YBBV'; // Christiano Judge voice

export const config = {
  maxDuration: 120, // 2 minutes for TTS + Replicate submission
};

// Supabase client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
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

  if (!elevenLabsKey && !openaiKey) {
    throw new Error('No TTS API key configured (ELEVENLABS_API_KEY or OPENAI_API_KEY required)');
  }

  console.log('[JUDGE-VIDEO] Generating TTS audio, script length:', script.length);

  if (elevenLabsKey) {
    // ElevenLabs - returns MP3 by default
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${CHRISTIANO_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
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
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JUDGE-VIDEO] ElevenLabs error:', response.status, errorText);
      throw new Error(`ElevenLabs TTS failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Estimate duration: ~150 words per minute, ~5 chars per word
    const estimatedDuration = (script.length / 5) / 150 * 60;

    console.log('[JUDGE-VIDEO] ElevenLabs audio generated:', buffer.length, 'bytes');
    return { buffer, duration: estimatedDuration };
  } else {
    // OpenAI TTS fallback
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
    });

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
  }
}

/**
 * Upload audio to Supabase Storage and get public URL
 * Includes timeout handling to prevent hanging on DB issues
 */
async function uploadAudioToStorage(buffer: Buffer, comparisonId: string): Promise<string> {
  const fileName = `judge-audio/${comparisonId}-${Date.now()}.mp3`;
  const UPLOAD_TIMEOUT_MS = 15000; // 15 seconds

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
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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

    const DB_TIMEOUT_MS = 5000; // 5 second timeout for DB queries

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
      console.log('[JUDGE-VIDEO] Cache hit:', comparisonId);
      res.status(200).json({
        success: true,
        cached: true,
        video: {
          id: cached.id,
          comparisonId: cached.comparison_id,
          status: 'completed',
          videoUrl: cached.video_url,
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

    // Step 3: Submit to Replicate SadTalker
    console.log('[JUDGE-VIDEO] Submitting to Replicate SadTalker...');

    // Use stable production URL for webhook (VERCEL_URL changes per deployment)
    const webhookUrl = process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL}/api/avatar/video-webhook`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/avatar/video-webhook`
        : null;

    const replicateBody: Record<string, unknown> = {
      version: SADTALKER_VERSION.split(':')[1], // Just the version hash
      input: {
        source_image: CHRISTIANO_IMAGE_URL,
        driven_audio: audioUrl,
        use_enhancer: true,           // GFPGAN face enhancement for cleaner output
        preprocess: 'full',           // Full image, no zoom cropping
        still_mode: true,             // Fewer head motions, more natural
        use_ref_video: false,
        use_eyeblink: true,           // Natural eye blinks
        pose_style: 5,                // Subtle natural head movement
        batch_size: 2,
        size_of_image: 512,           // Higher resolution for smoother output
        expression_scale: 0.6,        // Smoother expressions (user adjusted from 0.5)
        facerender: 'facevid2vid',
      },
    };

    // Only add webhook if we have a URL
    if (webhookUrl) {
      replicateBody.webhook = webhookUrl;
      replicateBody.webhook_events_filter = ['start', 'completed'];
    }

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
      console.error('[JUDGE-VIDEO] Replicate error:', response.status, errorText);
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
