/**
 * LIFE SCORE - Video Webhook API
 *
 * Receives webhook callbacks from Replicate when video generation completes.
 * Updates the avatar_videos table with the result.
 * Tracks usage to api_quota_settings for cost monitoring.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from '../shared/supabaseAdmin.js';
import { handleCors } from '../shared/cors.js';
import { persistVideoToStorage } from '../shared/persistVideo.js';
import { readRawBody } from '../shared/rawBody.js';
import { replicateWebhookHeaders, replicateWebhookSecret, verifyReplicateWebhook } from '../shared/replicateWebhook.js';
import { readReplicatePrediction } from '../shared/videoReplies.js';
import { timeLimit } from '../shared/timeout.js';

const TIMEOUT_MS = 45000; // 45s — required for DB + video download from Replicate CDN + upload to Supabase Storage

export const config = {
  maxDuration: 60, // Increased from 30s to allow video download+upload to Supabase Storage
  // Replicate's signature covers the body as sent, so it is read raw (api/shared/rawBody.ts).
  api: {
    bodyParser: false,
  },
};

const supabaseAdmin = serviceDb;

/** This file's work gives up after TIMEOUT_MS (api/shared/timeout.ts). */
const withTimeout = timeLimit(TIMEOUT_MS);

// Wav2Lip costs ~$0.0014/sec on L40S GPU, typically ~6 seconds = ~$0.005/run
const WAV2LIP_COST_PER_RUN = 0.005;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Only Replicate may report a judge video finished: anyone else could swap in
  // any video, which every user comparing the same two cities would then see.
  const secret = await replicateWebhookSecret();
  if (!secret) {
    console.error('[VIDEO-WEBHOOK] Cannot check the signature: no signing secret (REPLICATE_API_TOKEN, or Replicate unreachable)');
    res.status(503).json({ error: 'Webhook verification unavailable' });
    return;
  }
  const rawBody = await readRawBody(req);
  const check = verifyReplicateWebhook(replicateWebhookHeaders(req.headers), rawBody, secret, Math.floor(Date.now() / 1000));
  if (!check.ok) {
    console.warn('[VIDEO-WEBHOOK] Refused an unverified call:', check.reason);
    res.status(401).json({ error: 'Invalid webhook signature' });
    return;
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }
  const webhook = readReplicatePrediction(body);

  console.log('[VIDEO-WEBHOOK] Received:', {
    id: webhook.id,
    status: webhook.status,
    hasOutput: !!webhook.output,
    error: webhook.error,
  });

  if (!webhook.id) {
    res.status(400).json({ error: 'Missing prediction ID' });
    return;
  }

  try {
    // Find the video record by replicate prediction ID with timeout
    // FIX 2026-01-29: Use maybeSingle() - video may not exist
    const { data: video, error: findError } = await withTimeout(
      supabaseAdmin
        .from('avatar_videos')
        .select('*')
        .eq('replicate_prediction_id', webhook.id)
        .maybeSingle()
    );

    if (findError || !video) {
      console.warn('[VIDEO-WEBHOOK] Video not found for prediction:', webhook.id);
      // Still return 200 to acknowledge the webhook
      res.status(200).json({ received: true, found: false });
      return;
    }

    if (webhook.status === 'succeeded' && webhook.output) {
      // Extract video URL from Replicate output (temporary CDN URL, expires ~1h)
      const replicateUrl = Array.isArray(webhook.output)
        ? webhook.output[0]
        : webhook.output;

      console.log('[VIDEO-WEBHOOK] Success! Replicate URL:', replicateUrl);

      // Persist video to Supabase Storage (permanent URL)
      // Must happen immediately — Replicate URLs expire after ~1 hour
      const persisted = await persistVideoToStorage(
        replicateUrl,
        video.comparison_id,
        supabaseAdmin
      );

      // Use permanent URL if persistence succeeded, fall back to Replicate URL
      const videoUrl = persisted?.publicUrl || replicateUrl;
      const storagePath = persisted?.storagePath || null;

      if (!persisted) {
        console.warn('[VIDEO-WEBHOOK] Failed to persist video to storage, using Replicate URL as fallback');
      }

      // Update database with completed status (with timeout)
      const updatePayload: Record<string, unknown> = {
        status: 'completed',
        video_url: videoUrl,
        completed_at: webhook.completed_at || new Date().toISOString(),
      };
      if (storagePath) {
        updatePayload.video_storage_path = storagePath;
      }

      const { error: updateError } = await withTimeout(
        supabaseAdmin
          .from('avatar_videos')
          .update(updatePayload)
          .eq('id', video.id)
      );

      if (updateError) {
        console.error('[VIDEO-WEBHOOK] Update error:', updateError);
      }

      // Track usage to quota system (with timeout)
      try {
        // Calculate cost based on predict_time if available, otherwise use flat rate
        const predictTime = webhook.metrics?.predict_time || 6; // default 6 seconds
        const cost = predictTime * 0.0014; // $0.0014/sec for Wav2Lip on L40S

        await withTimeout(
          supabaseAdmin.rpc('update_provider_usage', {
            p_provider_key: 'replicate',
            p_usage_delta: cost,
          })
        );
        console.log(`[VIDEO-WEBHOOK] Tracked Replicate usage: $${cost.toFixed(4)} (${predictTime}s)`);
      } catch (usageErr) {
        console.warn('[VIDEO-WEBHOOK] Failed to track usage:', usageErr);
        // Don't fail the webhook for usage tracking errors
      }

      res.status(200).json({
        received: true,
        success: true,
        videoId: video.id,
        videoUrl,
        persisted: !!persisted,
      });
    } else if (webhook.status === 'failed' || webhook.status === 'canceled') {
      console.error('[VIDEO-WEBHOOK] Generation failed:', webhook.error);

      // Update database with failed status (with timeout)
      const { error: updateError } = await withTimeout(
        supabaseAdmin
          .from('avatar_videos')
          .update({
            status: 'failed',
            error: webhook.error || `Generation ${webhook.status}`,
          })
          .eq('id', video.id)
      );

      if (updateError) {
        console.error('[VIDEO-WEBHOOK] Update error:', updateError);
      }

      res.status(200).json({
        received: true,
        success: false,
        videoId: video.id,
        error: webhook.error,
      });
    } else {
      // Still processing
      console.log('[VIDEO-WEBHOOK] Still processing:', webhook.status);
      res.status(200).json({
        received: true,
        status: webhook.status,
      });
    }
  } catch (error) {
    console.error('[VIDEO-WEBHOOK] Error:', error);
    // Still return 200 to acknowledge the webhook
    res.status(200).json({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
