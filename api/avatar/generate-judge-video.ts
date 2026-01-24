/**
 * LIFE SCORE - Judge Video Generation API
 *
 * Generates Christiano judge videos using Replicate MuseTalk.
 * Caches results in Supabase to avoid regenerating.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import crypto from 'crypto';

const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const MUSETALK_MODEL = 'cjwbw/musetalk:latest'; // or use sadtalker
const CHRISTIANO_IMAGE_URL = process.env.CHRISTIANO_IMAGE_URL || 'https://your-domain.com/christiano.jpg';

export const config = {
  maxDuration: 120,
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
    // Check cache first
    const { data: cached } = await supabaseAdmin
      .from('avatar_videos')
      .select('*')
      .eq('comparison_id', comparisonId)
      .eq('status', 'completed')
      .single();

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

    // Check if already processing
    const { data: processing } = await supabaseAdmin
      .from('avatar_videos')
      .select('*')
      .eq('comparison_id', comparisonId)
      .in('status', ['pending', 'processing'])
      .single();

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
        },
      });
      return;
    }

    console.log('[JUDGE-VIDEO] Starting generation:', comparisonId);

    // First, generate TTS audio using browser TTS or ElevenLabs
    // For MVP, we'll use a simple approach - Replicate models can accept text
    // In production, generate audio first then pass URL

    // Create prediction on Replicate
    const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${replicateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3',
        input: {
          source_image: CHRISTIANO_IMAGE_URL,
          driven_audio: body.script, // Note: SadTalker needs audio URL, not text
          enhancer: 'gfpgan',
          preprocess: 'crop',
        },
        webhook: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/avatar/video-webhook`,
        webhook_events_filter: ['completed'],
      }),
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
    console.log('[JUDGE-VIDEO] Prediction started:', prediction.id);

    // Store in database
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('avatar_videos')
      .insert({
        comparison_id: comparisonId,
        video_url: '', // Will be updated when complete
        script: body.script,
        city1: body.city1,
        city2: body.city2,
        winner: body.winner,
        winner_score: body.winnerScore,
        loser_score: body.loserScore,
        replicate_prediction_id: prediction.id,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[JUDGE-VIDEO] Insert error:', insertError);
    }

    res.status(200).json({
      success: true,
      cached: false,
      video: {
        id: inserted?.id || prediction.id,
        comparisonId,
        status: 'processing',
        script: body.script,
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
