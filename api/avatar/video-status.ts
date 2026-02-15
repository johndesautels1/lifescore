/**
 * LIFE SCORE - Video Status API
 *
 * Checks the status of a judge video generation.
 * Can query by: videoId, comparisonId, or predictionId (direct Replicate query)
 * Tracks usage to api_quota_settings when video completes via polling.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import { persistVideoToStorage } from '../shared/persistVideo.js';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const TIMEOUT_MS = 45000; // 45s for DB + Replicate status check + optional persist

export const config = {
  maxDuration: 60, // Increased from 30s to allow video download+upload to Supabase Storage
};

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Wrap a Supabase query with timeout
 */
async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number = TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const videoId = req.query.videoId as string;
  const comparisonId = req.query.comparisonId as string;
  const predictionId = req.query.predictionId as string;

  // Allow direct Replicate query if predictionId provided
  if (predictionId) {
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
      return;
    }

    try {
      console.log('[VIDEO-STATUS] Direct Replicate query for:', predictionId);

      const response = await fetchWithTimeout(
        `${REPLICATE_API_URL}/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Token ${replicateToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VIDEO-STATUS] Replicate error:', response.status, errorText);
        res.status(response.status).json({
          error: 'Replicate query failed',
          message: errorText,
        });
        return;
      }

      const prediction = await response.json();
      console.log('[VIDEO-STATUS] Replicate status:', prediction.status);

      // Map Replicate status to our status
      let status = 'processing';
      let videoUrl = null;
      let error = null;

      if (prediction.status === 'succeeded' && prediction.output) {
        status = 'completed';
        videoUrl = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;
        console.log('[VIDEO-STATUS] Video URL:', videoUrl);
      } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
        status = 'failed';
        error = prediction.error || `Generation ${prediction.status}`;
      } else if (prediction.status === 'starting' || prediction.status === 'processing') {
        status = 'processing';
      }

      res.status(200).json({
        success: true,
        video: {
          id: predictionId,
          comparisonId: null,
          status,
          videoUrl,
          error,
          replicatePredictionId: predictionId,
          createdAt: prediction.created_at,
          completedAt: prediction.completed_at,
        },
      });
      return;
    } catch (err) {
      console.error('[VIDEO-STATUS] Replicate query error:', err);
      res.status(500).json({
        error: 'Failed to query Replicate',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return;
    }
  }

  // Original database query flow
  if (!videoId && !comparisonId) {
    res.status(400).json({
      error: 'Missing parameter',
      message: 'Provide videoId, comparisonId, or predictionId',
    });
    return;
  }

  try {
    // Fetch from database with timeout
    let query = supabaseAdmin.from('avatar_videos').select('*');

    if (videoId) {
      query = query.eq('id', videoId);
    } else {
      query = query.eq('comparison_id', comparisonId);
    }

    // FIX 2026-01-29: Use maybeSingle() instead of single() to avoid throwing on empty results
    const { data: video, error } = await withTimeout(query.maybeSingle());

    if (error) {
      // Only log actual database errors, not "no rows found"
      console.error('[VIDEO-STATUS] Database error:', error.message);
      res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
      return;
    }

    if (!video) {
      // This is normal - video may not exist yet. Return 200 with exists:false
      // to avoid red 404 errors in DevTools (this is expected state, not an error)
      res.status(200).json({
        success: true,
        exists: false,
        video: null,
        message: 'No video record exists for this comparison yet.',
      });
      return;
    }

    // If still processing, check Replicate
    if (video.status === 'processing' && video.replicate_prediction_id) {
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (replicateToken) {
        try {
          const response = await fetchWithTimeout(
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
              // Extract temporary Replicate URL (expires ~1h)
              const replicateUrl = Array.isArray(prediction.output)
                ? prediction.output[0]
                : prediction.output;

              // Persist video to Supabase Storage (permanent URL)
              const persisted = await persistVideoToStorage(
                replicateUrl,
                video.comparison_id,
                supabaseAdmin
              );

              const videoUrl = persisted?.publicUrl || replicateUrl;
              const storagePath = persisted?.storagePath || null;

              if (!persisted) {
                console.warn('[VIDEO-STATUS] Failed to persist video to storage, using Replicate URL as fallback');
              }

              // Update database with timeout
              const updatePayload: Record<string, unknown> = {
                status: 'completed',
                video_url: videoUrl,
                completed_at: new Date().toISOString(),
              };
              if (storagePath) {
                updatePayload.video_storage_path = storagePath;
              }

              await withTimeout(
                supabaseAdmin
                  .from('avatar_videos')
                  .update(updatePayload)
                  .eq('id', video.id)
              );

              // Track usage to quota system
              // Only track if video was processing (not already completed by webhook)
              // This prevents double-counting when both webhook and polling fire
              if (video.status === 'processing') {
                try {
                  const predictTime = prediction.metrics?.predict_time || 6;
                  const cost = predictTime * 0.0014; // $0.0014/sec for Wav2Lip
                  await withTimeout(
                    supabaseAdmin.rpc('update_provider_usage', {
                      p_provider_key: 'replicate',
                      p_usage_delta: cost,
                    })
                  );
                  console.log(`[VIDEO-STATUS] Tracked Replicate usage: $${cost.toFixed(4)}`);
                } catch (usageErr) {
                  console.warn('[VIDEO-STATUS] Failed to track usage:', usageErr);
                }
              }

              video.status = 'completed';
              video.video_url = videoUrl;
              video.completed_at = new Date().toISOString();
            } else if (prediction.status === 'failed') {
              await withTimeout(
                supabaseAdmin
                  .from('avatar_videos')
                  .update({
                    status: 'failed',
                    error: prediction.error || 'Generation failed',
                  })
                  .eq('id', video.id)
              );

              video.status = 'failed';
              video.error = prediction.error;
            }
          }
        } catch (replicateErr) {
          console.warn('[VIDEO-STATUS] Replicate check failed:', replicateErr);
          // Continue with existing video data
        }
      }
    }

    // FIX: For completed videos with temporary provider URLs (no storage path),
    // attempt to migrate to permanent Supabase Storage. If URL expired, mark as failed.
    if (video.status === 'completed' && video.video_url && !video.video_storage_path) {
      const isTemporaryUrl = video.video_url.includes('replicate.delivery') ||
                             video.video_url.includes('klingai.com');

      if (isTemporaryUrl) {
        console.log('[VIDEO-STATUS] Completed video has temporary URL, attempting migration:', video.id);
        const persisted = await persistVideoToStorage(
          video.video_url,
          video.comparison_id,
          supabaseAdmin
        );

        if (persisted) {
          console.log('[VIDEO-STATUS] Migrated stale URL to permanent storage:', persisted.publicUrl);
          await withTimeout(
            supabaseAdmin
              .from('avatar_videos')
              .update({ video_url: persisted.publicUrl, video_storage_path: persisted.storagePath })
              .eq('id', video.id)
          );
          video.video_url = persisted.publicUrl;
        } else {
          console.warn(`[VIDEO-STATUS] Provider URL expired, marking video ${video.id} as failed`);
          await withTimeout(
            supabaseAdmin
              .from('avatar_videos')
              .update({ status: 'failed', error: 'Provider URL expired before migration' })
              .eq('id', video.id)
          );
          video.status = 'failed';
          video.video_url = null;
          video.error = 'Provider URL expired — please regenerate';
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
