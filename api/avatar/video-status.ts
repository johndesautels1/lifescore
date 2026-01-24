/**
 * LIFE SCORE - Video Status API
 *
 * Checks the status of a judge video generation.
 * Polls Replicate if still processing.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

export const config = {
  maxDuration: 30,
};

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const videoId = req.query.videoId as string;
  const comparisonId = req.query.comparisonId as string;

  if (!videoId && !comparisonId) {
    res.status(400).json({
      error: 'Missing parameter',
      message: 'Provide either videoId or comparisonId',
    });
    return;
  }

  try {
    // Fetch from database
    let query = supabaseAdmin.from('avatar_videos').select('*');

    if (videoId) {
      query = query.eq('id', videoId);
    } else {
      query = query.eq('comparison_id', comparisonId);
    }

    const { data: video, error } = await query.single();

    if (error || !video) {
      res.status(404).json({
        error: 'Video not found',
      });
      return;
    }

    // If still processing, check Replicate
    if (video.status === 'processing' && video.replicate_prediction_id) {
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (replicateToken) {
        const response = await fetch(
          `${REPLICATE_API_URL}/predictions/${video.replicate_prediction_id}`,
          {
            headers: {
              'Authorization': `Token ${replicateToken}`,
            },
          }
        );

        if (response.ok) {
          const prediction = await response.json();

          if (prediction.status === 'succeeded' && prediction.output) {
            // Update database
            const videoUrl = Array.isArray(prediction.output)
              ? prediction.output[0]
              : prediction.output;

            await supabaseAdmin
              .from('avatar_videos')
              .update({
                status: 'completed',
                video_url: videoUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('id', video.id);

            video.status = 'completed';
            video.video_url = videoUrl;
            video.completed_at = new Date().toISOString();
          } else if (prediction.status === 'failed') {
            await supabaseAdmin
              .from('avatar_videos')
              .update({
                status: 'failed',
                error: prediction.error || 'Generation failed',
              })
              .eq('id', video.id);

            video.status = 'failed';
            video.error = prediction.error;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      video: {
        id: video.id,
        comparisonId: video.comparison_id,
        status: video.status,
        videoUrl: video.video_url,
        script: video.script,
        durationSeconds: video.duration_seconds,
        createdAt: video.created_at,
        completedAt: video.completed_at,
        error: video.error,
      },
    });
  } catch (error) {
    console.error('[VIDEO-STATUS] Error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
