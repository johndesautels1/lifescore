/**
 * LIFE SCORE - Grok Video Status API
 *
 * Checks the status of Grok video generation.
 * Can query by: videoId or predictionId (direct provider query)
 * Also supports cache checking via POST.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1';

export const config = {
  maxDuration: 30,
};

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// ============================================================================
// PROVIDER STATUS CHECKS
// ============================================================================

async function checkGrokStatus(predictionId: string): Promise<{
  status: string;
  videoUrl: string | null;
  error: string | null;
}> {
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!grokApiKey) {
    return { status: 'failed', videoUrl: null, error: 'Grok API not configured' };
  }

  try {
    const response = await fetch(`${GROK_API_URL}/videos/${predictionId}`, {
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[GROK-STATUS] Grok API error:', response.status, errorText);
      return { status: 'processing', videoUrl: null, error: null };
    }

    const result = await response.json();

    if (result.status === 'completed' && result.video_url) {
      return { status: 'completed', videoUrl: result.video_url, error: null };
    } else if (result.status === 'failed') {
      return { status: 'failed', videoUrl: null, error: result.error || 'Generation failed' };
    }

    return { status: 'processing', videoUrl: null, error: null };
  } catch (err) {
    console.warn('[GROK-STATUS] Grok status check failed:', err);
    return { status: 'processing', videoUrl: null, error: null };
  }
}

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

    const prediction = await response.json();

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
  if (handleCors(req, res, 'open', { methods: 'GET, POST, OPTIONS' })) return;

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
        // Check for both winner and loser videos
        const [winnerResult, loserResult] = await Promise.all([
          supabaseAdmin
            .from('grok_videos')
            .select('*')
            .eq('city_name', city1.toLowerCase())
            .eq('video_type', 'winner_mood')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from('grok_videos')
            .select('*')
            .eq('city_name', city2.toLowerCase())
            .eq('video_type', 'loser_mood')
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (winnerResult.data && loserResult.data) {
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
      // Try Grok first, then Replicate
      let providerStatus = await checkGrokStatus(predictionId);

      // If Grok doesn't have it, try Replicate
      if (providerStatus.status === 'processing' || providerStatus.error?.includes('not configured')) {
        providerStatus = await checkReplicateStatus(predictionId);
      }

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
    const { data: video, error } = await supabaseAdmin
      .from('grok_videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error || !video) {
      console.log('[GROK-STATUS] Video not found:', videoId);
      res.status(404).json({
        error: 'Video not found',
        message: 'No database record found',
      });
      return;
    }

    // If still processing, check provider status
    if (video.status === 'processing' && video.prediction_id) {
      let providerStatus: { status: string; videoUrl: string | null; error: string | null };

      if (video.provider === 'grok') {
        providerStatus = await checkGrokStatus(video.prediction_id);
      } else {
        providerStatus = await checkReplicateStatus(video.prediction_id);
      }

      // Update database if completed or failed
      if (providerStatus.status === 'completed' && providerStatus.videoUrl) {
        await supabaseAdmin
          .from('grok_videos')
          .update({
            status: 'completed',
            video_url: providerStatus.videoUrl,
            completed_at: new Date().toISOString(),
          })
          .eq('id', video.id);

        video.status = 'completed';
        video.video_url = providerStatus.videoUrl;
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
