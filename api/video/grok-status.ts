/**
 * LIFE SCORE - Grok Video Status API
 *
 * Checks the status of a city clip: Kling 3 through fal, or the Replicate Minimax back-up.
 * Can query by: videoId or predictionId (direct provider query)
 * Also supports cache checking via POST.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serviceDb } from '../shared/supabaseAdmin.js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { persistVideoToStorage } from '../shared/persistVideo.js';
import { readReplicatePrediction } from '../shared/videoReplies.js';
import { checkKlingClip } from '../shared/falKling.js';
import { isExpiringClipUrl } from '../shared/clipHosts.js';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';

// Storage bucket for persisting court order / grok videos
const COURT_ORDER_BUCKET = 'court-order-videos';

export const config = {
  maxDuration: 60, // Increased from 30s: DB query + provider API + persist-to-storage
};

const supabaseAdmin = serviceDb;

// ============================================================================
// PROVIDER STATUS CHECKS (Kling 3 through fal: checkKlingClip, api/shared/falKling.ts)
// ============================================================================


async function checkReplicateStatus(predictionId: string): Promise<{
  status: string;
  videoUrl: string | null;
  error: string | null;
}> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    return { status: 'failed', videoUrl: null, error: 'Replicate not configured' };
  }

  try {
    const response = await fetch(
      `${REPLICATE_API_URL}/predictions/${predictionId}`,
      {
        headers: {
          'Authorization': `Token ${replicateToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GROK-STATUS] Replicate error:', response.status, errorText);
      return { status: 'processing', videoUrl: null, error: null };
    }

    const prediction = readReplicatePrediction(await response.json());

    if (prediction.status === 'succeeded' && prediction.output) {
      const videoUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
      return { status: 'completed', videoUrl, error: null };
    } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
      return {
        status: 'failed',
        videoUrl: null,
        error: prediction.error || `Generation ${prediction.status}`,
      };
    }

    return { status: 'processing', videoUrl: null, error: null };
  } catch (err) {
    console.error('[GROK-STATUS] Replicate query error:', err);
    return { status: 'processing', videoUrl: null, error: null };
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, POST, OPTIONS' })) return;

  // Require authentication — queries user video data
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Prevent browser/CDN caching - status polling must always get fresh data
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // ========================================================================
  // POST - Cache check
  // ========================================================================
  if (req.method === 'POST') {
    const { action, city1, city2, videoType } = req.body;

    if (action !== 'check_cache') {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    try {
      if (videoType === 'new_life') {
        // Check for both loser and winner videos (loser first for consistency)
        const [loserResult, winnerResult] = await Promise.all([
          supabaseAdmin
            .from('grok_videos')
            .select('*')
            .eq('city_name', city2.toLowerCase())
            .eq('video_type', 'loser_mood')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from('grok_videos')
            .select('*')
            .eq('city_name', city1.toLowerCase())
            .eq('video_type', 'winner_mood')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (winnerResult.data && loserResult.data) {
          // FIX: For cached entries with temporary provider URLs, try to migrate to permanent storage.
          // If migration fails (URL expired), invalidate the cache entry.
          for (const entry of [winnerResult.data, loserResult.data]) {
            const isTemporaryUrl = !entry.video_storage_path && isExpiringClipUrl(entry.video_url);

            if (isTemporaryUrl) {
              const cacheKey = `${entry.city_name}-${entry.video_type}-${entry.id.substring(0, 8)}`;
              const persisted = await persistVideoToStorage(
                entry.video_url,
                cacheKey,
                supabaseAdmin,
                COURT_ORDER_BUCKET
              );

              if (persisted) {
                // Migration succeeded — update DB and use permanent URL
                await supabaseAdmin
                  .from('grok_videos')
                  .update({ video_url: persisted.publicUrl, video_storage_path: persisted.storagePath })
                  .eq('id', entry.id);
                entry.video_url = persisted.publicUrl;
                console.log('[GROK-STATUS] Cache entry migrated to permanent storage:', entry.id);
              } else {
                // URL expired — invalidate this cache entry
                console.warn(`[GROK-STATUS] Cached provider URL expired, invalidating video ${entry.id}`);
                await supabaseAdmin
                  .from('grok_videos')
                  .update({ status: 'failed', error_message: 'Provider URL expired before migration' })
                  .eq('id', entry.id);
                res.status(200).json({ hasCached: false });
                return;
              }
            }
          }

          res.status(200).json({
            hasCached: true,
            videos: {
              winner: winnerResult.data,
              loser: loserResult.data,
            },
          });
          return;
        }

        res.status(200).json({ hasCached: false });
        return;
      }

      if (videoType === 'court_order') {
        const { data: courtOrder } = await supabaseAdmin
          .from('grok_videos')
          .select('*')
          .eq('city_name', city1.toLowerCase())
          .eq('video_type', 'perfect_life')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (courtOrder) {
          res.status(200).json({
            hasCached: true,
            videos: courtOrder,
          });
          return;
        }

        res.status(200).json({ hasCached: false });
        return;
      }

      res.status(400).json({ error: 'Invalid videoType' });
    } catch (err) {
      console.error('[GROK-STATUS] Cache check error:', err);
      res.status(200).json({ hasCached: false });
    }
    return;
  }

  // ========================================================================
  // GET - Status check
  // ========================================================================
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const videoId = req.query.videoId as string;
  const predictionId = req.query.predictionId as string;

  if (!videoId && !predictionId) {
    res.status(400).json({
      error: 'Missing parameter',
      message: 'Provide videoId or predictionId',
    });
    return;
  }

  try {
    // Direct prediction query if predictionId provided
    if (predictionId && !videoId) {
      // Kling 3 first; a request fal does not know may be a Replicate back-up clip
      const kling = await checkKlingClip(predictionId);
      const providerStatus = kling.gone ? await checkReplicateStatus(predictionId) : kling;

      res.status(200).json({
        success: true,
        video: {
          id: predictionId,
          status: providerStatus.status,
          videoUrl: providerStatus.videoUrl,
          errorMessage: providerStatus.error,
        },
      });
      return;
    }

    // Database query by videoId
    // FIX 2026-01-29: Use maybeSingle() to avoid "Cannot coerce" error on empty results
    const { data: video, error } = await supabaseAdmin
      .from('grok_videos')
      .select('*')
      .eq('id', videoId)
      .maybeSingle();

    if (error) {
      console.error('[GROK-STATUS] Database error:', error.message);
      res.status(500).json({ error: 'Database error', message: error.message });
      return;
    }

    if (!video) {
      res.status(404).json({
        success: false,
        error: 'Video not found',
        message: 'No database record found',
      });
      return;
    }

    // If still processing, check provider status
    if (video.status === 'processing' && video.prediction_id) {
      // Auto-fail clips stuck for too long (10 minutes, Kling 3 or Replicate)
      const MAX_PROCESSING_MS = 10 * 60 * 1000;
      const ageMs = video.created_at ? Date.now() - new Date(video.created_at).getTime() : 0;

      if (ageMs > MAX_PROCESSING_MS) {
        const stuckMinutes = Math.round(ageMs / 60000);
        console.warn(`[GROK-STATUS] Prediction stuck for ${stuckMinutes}min (provider: ${video.provider}), auto-failing`);
        await supabaseAdmin
          .from('grok_videos')
          .update({
            status: 'failed',
            error_message: `Generation timed out after ${stuckMinutes} minutes (${video.provider} stuck)`,
          })
          .eq('id', video.id);

        video.status = 'failed';
        video.error_message = `Generation timed out after ${stuckMinutes} minutes (${video.provider} stuck)`;
      }

      let providerStatus: { status: string; videoUrl: string | null; error: string | null };

      // Only poll provider if not already auto-failed
      if (video.status === 'processing') {
        if (video.provider === 'kling3') {
          providerStatus = await checkKlingClip(video.prediction_id);
        } else if (video.provider === 'replicate') {
          providerStatus = await checkReplicateStatus(video.prediction_id);
        } else {
          // Clips started on Kling's own service or the old Grok route (both retired 4 Oct 2026)
          providerStatus = { status: 'failed', videoUrl: null, error: `This clip was started on a video service LifeScore no longer uses (${video.provider}). Please make it again.` };
        }
      } else {
        providerStatus = { status: video.status, videoUrl: null, error: video.error_message };
      }

      // Update database if completed or failed
      if (providerStatus.status === 'completed' && providerStatus.videoUrl) {
        // FIX: Persist provider CDN video to permanent Supabase Storage BEFORE saving URL.
        // Provider URLs (Replicate ~1h, Kling varies) expire — this makes them permanent.
        let finalVideoUrl = providerStatus.videoUrl;
        let storagePath: string | null = null;
        const cacheKey = `${video.city_name}-${video.video_type}-${video.id.substring(0, 8)}`;

        const persisted = await persistVideoToStorage(
          providerStatus.videoUrl,
          cacheKey,
          supabaseAdmin,
          COURT_ORDER_BUCKET
        );

        if (persisted) {
          finalVideoUrl = persisted.publicUrl;
          storagePath = persisted.storagePath;
          console.log('[GROK-STATUS] Video persisted to permanent storage:', persisted.publicUrl);
        } else {
          // Persist failed — still save the provider URL (better than nothing)
          console.warn('[GROK-STATUS] Storage persist failed, saving provider URL as fallback');
        }

        await supabaseAdmin
          .from('grok_videos')
          .update({
            status: 'completed',
            video_url: finalVideoUrl,
            video_storage_path: storagePath,
            completed_at: new Date().toISOString(),
          })
          .eq('id', video.id);

        video.status = 'completed';
        video.video_url = finalVideoUrl;
        video.completed_at = new Date().toISOString();
      } else if (providerStatus.status === 'failed') {
        await supabaseAdmin
          .from('grok_videos')
          .update({
            status: 'failed',
            error_message: providerStatus.error || 'Generation failed',
          })
          .eq('id', video.id);

        video.status = 'failed';
        video.error_message = providerStatus.error;
      }
    }

    // FIX: For completed videos with temporary provider URLs (no storage path),
    // attempt to migrate to permanent storage. If the URL has already expired, mark as failed.
    if (video.status === 'completed' && video.video_url && !video.video_storage_path) {
      const isTemporaryUrl = isExpiringClipUrl(video.video_url);

      if (isTemporaryUrl) {
        console.log('[GROK-STATUS] Completed video has temporary URL, attempting migration:', video.id);
        const cacheKey = `${video.city_name}-${video.video_type}-${video.id.substring(0, 8)}`;
        const persisted = await persistVideoToStorage(
          video.video_url,
          cacheKey,
          supabaseAdmin,
          COURT_ORDER_BUCKET
        );

        if (persisted) {
          // Migration succeeded — update DB with permanent URL
          console.log('[GROK-STATUS] Migrated stale URL to permanent storage:', persisted.publicUrl);
          await supabaseAdmin
            .from('grok_videos')
            .update({ video_url: persisted.publicUrl, video_storage_path: persisted.storagePath })
            .eq('id', video.id);
          video.video_url = persisted.publicUrl;
        } else {
          // Migration failed — URL has expired, mark as failed
          console.warn(`[GROK-STATUS] Provider URL expired, marking video ${video.id} as failed`);
          await supabaseAdmin
            .from('grok_videos')
            .update({ status: 'failed', error_message: 'Provider URL expired before migration' })
            .eq('id', video.id);
          video.status = 'failed';
          video.video_url = null;
          video.error_message = 'Provider URL expired before migration';
        }
      }
    }

    res.status(200).json({
      success: true,
      video: {
        id: video.id,
        userId: video.user_id,
        comparisonId: video.comparison_id,
        cityName: video.city_name,
        videoType: video.video_type,
        prompt: video.prompt,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        durationSeconds: video.duration_seconds,
        status: video.status,
        provider: video.provider,
        errorMessage: video.error_message,
        createdAt: video.created_at,
        completedAt: video.completed_at,
      },
    });
  } catch (error) {
    console.error('[GROK-STATUS] Error:', error);
    res.status(500).json({
      error: 'Failed to get status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
