/**
 * LIFE SCORE - Video Webhook API
 *
 * Receives webhook callbacks from Replicate when video generation completes.
 * Updates the avatar_videos table with the result.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

export const config = {
  maxDuration: 30,
};

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

interface ReplicateWebhook {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  created_at: string;
  completed_at?: string;
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

  const webhook = req.body as ReplicateWebhook;

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
    // Find the video record by replicate prediction ID
    const { data: video, error: findError } = await supabaseAdmin
      .from('avatar_videos')
      .select('*')
      .eq('replicate_prediction_id', webhook.id)
      .single();

    if (findError || !video) {
      console.warn('[VIDEO-WEBHOOK] Video not found for prediction:', webhook.id);
      // Still return 200 to acknowledge the webhook
      res.status(200).json({ received: true, found: false });
      return;
    }

    if (webhook.status === 'succeeded' && webhook.output) {
      // Extract video URL from output
      const videoUrl = Array.isArray(webhook.output)
        ? webhook.output[0]
        : webhook.output;

      console.log('[VIDEO-WEBHOOK] Success! Video URL:', videoUrl);

      // Update database with completed status
      const { error: updateError } = await supabaseAdmin
        .from('avatar_videos')
        .update({
          status: 'completed',
          video_url: videoUrl,
          completed_at: webhook.completed_at || new Date().toISOString(),
        })
        .eq('id', video.id);

      if (updateError) {
        console.error('[VIDEO-WEBHOOK] Update error:', updateError);
      }

      res.status(200).json({
        received: true,
        success: true,
        videoId: video.id,
        videoUrl,
      });
    } else if (webhook.status === 'failed' || webhook.status === 'canceled') {
      console.error('[VIDEO-WEBHOOK] Generation failed:', webhook.error);

      // Update database with failed status
      const { error: updateError } = await supabaseAdmin
        .from('avatar_videos')
        .update({
          status: 'failed',
          error: webhook.error || `Generation ${webhook.status}`,
        })
        .eq('id', video.id);

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
// Deploy trigger: Sun, Jan 25, 2026  6:51:07 PM
