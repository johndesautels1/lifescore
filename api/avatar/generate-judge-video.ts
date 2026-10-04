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
import { serviceDb } from '../shared/supabaseAdmin.js';
import { openaiSpeech } from '../shared/openai.js';
import { elevenLabsSpeech } from '../shared/elevenlabs.js';
import { handleCors } from '../shared/cors.js';
import { requireFeature, consumeOrDeny, refundFeature } from '../shared/entitlements.js';
import { persistVideoToStorage } from '../shared/persistVideo.js';
import { describeHeyGenFailure, submitVideo, videoConfigured } from '../shared/heygen/heygenVideo.js';
import { readReplicatePrediction } from '../shared/videoReplies.js';
import crypto from 'crypto';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';

/** Time limit for Replicate accepting a judge-video prediction. */
const REPLICATE_CREATE_TIMEOUT_MS = 30_000;

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
const supabaseAdmin = serviceDb;

/** The avatar_videos columns this route reads back. */
interface AvatarVideoRow {
  id: string;
  comparison_id: string;
  status: string;
  video_url: string | null;
  video_storage_path: string | null;
  script: string | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
  replicate_prediction_id: string | null;
}

/** A row lookup's answer, or the stand-in used when the lookup times out. */
interface RowLookup {
  data: AvatarVideoRow | null;
  error: { message: string } | null;
}

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
    const spoken = await elevenLabsSpeech({
      voiceId: CRISTIANO_VOICE_ID,
      text: script,
      voiceSettings: { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
      accept: 'audio/mpeg',
      timeoutMs: TTS_TIMEOUT_MS,
      label: 'JUDGE-VIDEO voice',
    });
    if (spoken.ok) {
      const buffer = Buffer.from(spoken.audio);
      const estimatedDuration = (script.length / 5) / 150 * 60;
      console.log('[JUDGE-VIDEO] ElevenLabs audio generated:', buffer.length, 'bytes');
      return { buffer, duration: estimatedDuration };
    }
    console.warn('[JUDGE-VIDEO] ElevenLabs failed, trying OpenAI fallback:', spoken.message);
    if (!openaiKey) {
      throw new Error(`ElevenLabs failed: ${spoken.message}`); // No fallback available
    }
    // Fall through to OpenAI
  }

  // OpenAI TTS fallback (or primary if no ElevenLabs key)
  if (openaiKey) {
    const spoken = await openaiSpeech({
      character: 'cristiano',
      text: script,
      format: 'mp3',
      quality: 'hd',
      timeoutMs: TTS_TIMEOUT_MS,
      label: 'JUDGE-VIDEO tts',
    });
    if (!spoken.ok) {
      console.error('[JUDGE-VIDEO] OpenAI TTS error:', spoken.message);
      throw new Error(`OpenAI TTS failed: ${spoken.message}`);
    }
    const estimatedDuration = (script.length / 5) / 150 * 60;
    console.log('[JUDGE-VIDEO] OpenAI audio generated:', spoken.audio.length, 'bytes');
    return { buffer: spoken.audio, duration: estimatedDuration };
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

  // Sign-in + the plan must include judge videos. A cached video is free; a new
  // one counts one judge video (below, after the cache and in-progress checks).
  const entitled = await requireFeature(req, res, 'judgeVideos');
  if (!entitled) return;
  let counted = false;

  // HeyGen is the primary; Replicate is the back-up. Refuse only when neither is set up.
  const replicateToken = process.env.REPLICATE_API_TOKEN;
  if (!replicateToken && !videoConfigured()) {
    console.error('[JUDGE-VIDEO] Neither HeyGen nor REPLICATE_API_TOKEN is configured');
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
    const withTimeout = async <T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> => {
      return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
      ]);
    };

    const DB_TIMEOUT_MS = 15000; // 15s — pure DB queries (cache lookup, processing check), no file transfers

    // Check cache first (with timeout - don't let DB issues block video generation)
    // Using maybeSingle() instead of single() to avoid error when no rows exist
    const cacheResult = await withTimeout<RowLookup>(
      supabaseAdmin
        .from('avatar_videos')
        .select('*')
        .eq('comparison_id', comparisonId)
        .eq('status', 'completed')
        .maybeSingle<AvatarVideoRow>(),
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
          // Saved before answering: on Vercel, work left running after the reply
          // can be frozen and never finish, which would leave the old address stored.
          const { error: migErr } = await supabaseAdmin
            .from('avatar_videos')
            .update({ video_url: persisted.publicUrl, video_storage_path: persisted.storagePath })
            .eq('id', cached.id)
            .abortSignal(AbortSignal.timeout(DB_TIMEOUT_MS));
          if (migErr) console.warn('[JUDGE-VIDEO] Migration update failed:', migErr.message);
          else console.log('[JUDGE-VIDEO] Migrated cached video to permanent storage');
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
    const processingResult = await withTimeout<RowLookup>(
      supabaseAdmin
        .from('avatar_videos')
        .select('*')
        .eq('comparison_id', comparisonId)
        .in('status', ['pending', 'processing'])
        .maybeSingle<AvatarVideoRow>(),
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

    if (!(await consumeOrDeny(res, entitled, 'judgeVideos'))) return;
    counted = true;

    console.log('[JUDGE-VIDEO] Starting generation for:', comparisonId);

    // ── PRIMARY: HeyGen, the questionnaire engine's judge-page wiring, verbatim
    //    (api/shared/heygen/heygenVideo.ts; his look HEYGEN_AVATAR_LOOK_ID and voice
    //    HEYGEN_CRISTIANO_VOICE_ID, the same settings the engine reads). HeyGen
    //    speaks for itself: no TTS, no audio upload. Polled by /api/avatar/video-status.
    // ── BACK-UP: his previous Replicate lip-sync, unchanged, below — used when
    //    HeyGen is not configured or refuses the submission.
    if (videoConfigured()) {
      try {
        const { videoId: heygenVideoId, avatarUsed } = await submitVideo(body.script, { title: "LIFE SCORE — the judge's film" });
        console.log('[JUDGE-VIDEO] HeyGen render submitted:', heygenVideoId, 'avatar:', avatarUsed);
        const { data: heygenRow, error: heygenInsertError } = await supabaseAdmin
          .from('avatar_videos')
          .insert({
            comparison_id: comparisonId,
            video_url: '',
            script: body.script,
            city1: body.city1,
            city2: body.city2,
            winner: body.winner,
            winner_score: body.winnerScore,
            loser_score: body.loserScore,
            heygen_video_id: heygenVideoId,
            status: 'processing',
          })
          .select()
          .single();
        if (heygenInsertError) console.warn('[JUDGE-VIDEO] HeyGen row insert warning:', heygenInsertError.message);
        res.status(200).json({
          success: true,
          cached: false,
          provider: 'heygen',
          video: {
            id: heygenRow?.id || heygenVideoId,
            comparisonId,
            status: 'processing',
            script: body.script,
            createdAt: heygenRow?.created_at || new Date().toISOString(),
          },
        });
        return;
      } catch (heygenError) {
        const failure = describeHeyGenFailure(heygenError);
        console.warn('[JUDGE-VIDEO] HeyGen could not take the render, using the Replicate back-up:', failure.status, failure.message);
      }
    } else {
      console.warn('[JUDGE-VIDEO] HeyGen not configured (HEYGEN_API_KEY / HEYGEN_AVATAR_LOOK_ID / HEYGEN_CRISTIANO_VOICE_ID), using the Replicate back-up');
    }

    if (!replicateToken) {
      await refundFeature(entitled.auth.userId, 'judgeVideos', entitled.access.limits);
      counted = false;
      res.status(503).json({ error: 'The judge video could not be started. Please try again shortly.' });
      return;
    }

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
    const response = await fetchWithTimeout(`${REPLICATE_API_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(replicateBody),
    }, REPLICATE_CREATE_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JUDGE-VIDEO] Wav2Lip submission failed:', response.status, errorText);
      await refundFeature(entitled.auth.userId, 'judgeVideos', entitled.access.limits);
      res.status(response.status).json({
        error: 'Failed to start video generation',
        message: errorText,
      });
      return;
    }

    const prediction = readReplicatePrediction(await response.json());
    if (!prediction.id) {
      // Without an id the video can never be polled, so the user is not charged.
      console.error('[JUDGE-VIDEO] Wav2Lip accepted the job but sent no prediction id');
      await refundFeature(entitled.auth.userId, 'judgeVideos', entitled.access.limits);
      res.status(502).json({ error: 'Failed to start video generation', message: 'The video service sent no job id.' });
      return;
    }
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
    if (counted) await refundFeature(entitled.auth.userId, 'judgeVideos', entitled.access.limits);
    res.status(500).json({
      error: 'Failed to generate video',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
// Redeploy trigger 1769736808
