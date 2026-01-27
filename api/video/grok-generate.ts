/**
 * LIFE SCORE - Grok Video Generation API
 *
 * Generates videos using Grok Imagine API with Replicate fallback.
 * Supports "New Life Videos" (winner/loser pair) and "Court Order" (perfect life).
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config = {
  maxDuration: 120, // 2 minutes for video generation submission
};

// Grok API configuration
const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1';
const GROK_VIDEO_ENDPOINT = '/videos/generations'; // TBD - confirm exact endpoint

// Replicate fallback - text-to-video model
const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const REPLICATE_VIDEO_MODEL = 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438';

// Supabase client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// ============================================================================
// TYPES
// ============================================================================

type VideoType = 'winner_mood' | 'loser_mood' | 'perfect_life';
type CityType = 'beach' | 'mountain' | 'urban' | 'desert' | 'general';

interface NewLifeVideosRequest {
  action: 'new_life_videos';
  userId: string;
  comparisonId: string;
  winnerCity: string;
  loserCity: string;
  winnerCityType?: CityType;
  loserCityType?: CityType;
}

interface CourtOrderVideoRequest {
  action: 'court_order_video';
  userId: string;
  comparisonId: string;
  winnerCity: string;
  cityType?: CityType;
}

type GenerateRequest = NewLifeVideosRequest | CourtOrderVideoRequest;

interface GrokVideoRecord {
  id: string;
  user_id: string;
  comparison_id: string;
  city_name: string;
  video_type: VideoType;
  prompt: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  status: string;
  provider: string;
  error_message: string | null;
  prediction_id: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function generatePrompt(cityName: string, videoType: VideoType, cityType: CityType = 'general'): string {
  const templates = {
    winner_mood: `Happy person enjoying freedom in ${cityName}. Sunny day, relaxed atmosphere, minimal government presence, people freely going about their business, vibrant local economy, low stress environment. 8 seconds, cinematic quality.`,

    loser_mood: `Stressed person in ${cityName} overwhelmed by regulations. Government buildings, bureaucratic offices, long lines, paperwork piling up, frustrated citizens, heavy tax burden visible, restricted freedoms. 8 seconds, cinematic quality.`,

    perfect_life: {
      beach: `Crystal white sand beach at golden hour sunset, gentle waves crashing, palm trees swaying, person relaxing in paradise, ${cityName} coastline, ultimate freedom and peace. 10 seconds, cinematic 4K quality.`,
      mountain: `Cozy cabin overlooking lush green valley and pristine lake, person enjoying hot chocolate on deck, snow-capped peaks in distance, ${cityName} mountain serenity, fresh air and freedom. 10 seconds, cinematic 4K quality.`,
      urban: `Rooftop bar at sunset overlooking ${cityName} skyline, person toasting to success, city lights beginning to glow, vibrant nightlife energy, cosmopolitan freedom and opportunity. 10 seconds, cinematic 4K quality.`,
      desert: `Desert sunset with dramatic red rock formations near ${cityName}, person on scenic overlook, wide open spaces, endless horizon, ultimate freedom and adventure. 10 seconds, cinematic 4K quality.`,
      general: `Beautiful scenic view of ${cityName} at golden hour, person enjoying the moment of freedom and new beginnings, peaceful atmosphere, cinematic quality. 10 seconds.`,
    },
  };

  if (videoType === 'perfect_life') {
    return templates.perfect_life[cityType] || templates.perfect_life.general;
  }

  return templates[videoType];
}

function detectCityType(cityName: string): CityType {
  const nameLower = cityName.toLowerCase();

  const keywords = {
    beach: ['beach', 'coast', 'ocean', 'shore', 'tropical', 'island', 'bay', 'harbor', 'pier', 'seaside', 'miami', 'san diego', 'honolulu', 'santa monica', 'malibu'],
    mountain: ['mountain', 'alpine', 'ski', 'elevation', 'rocky', 'peak', 'summit', 'valley', 'highland', 'denver', 'boulder', 'aspen', 'vail', 'park city', 'salt lake'],
    urban: ['downtown', 'metro', 'city center', 'skyline', 'metropolitan', 'urban', 'midtown', 'new york', 'chicago', 'los angeles', 'san francisco', 'seattle', 'boston'],
    desert: ['desert', 'arid', 'southwest', 'canyon', 'mesa', 'dry', 'phoenix', 'vegas', 'tucson', 'scottsdale', 'albuquerque', 'sedona'],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => nameLower.includes(word))) {
      return type as CityType;
    }
  }

  return 'general';
}

function generateCacheKey(cityName: string, videoType: VideoType): string {
  const data = `${cityName.toLowerCase()}-${videoType}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// ============================================================================
// VIDEO GENERATION - GROK PRIMARY
// ============================================================================

async function generateWithGrok(prompt: string): Promise<{ predictionId: string; status: string } | null> {
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!grokApiKey) {
    console.log('[GROK-VIDEO] No Grok API key, skipping Grok provider');
    return null;
  }

  try {
    console.log('[GROK-VIDEO] Attempting Grok video generation...');

    const response = await fetch(`${GROK_API_URL}${GROK_VIDEO_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: 10, // 10 seconds
        style: 'cinematic',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[GROK-VIDEO] Grok API error:', response.status, errorText);
      return null; // Fall back to Replicate
    }

    const result = await response.json();
    console.log('[GROK-VIDEO] Grok generation started:', result.id);

    return {
      predictionId: result.id,
      status: result.status || 'processing',
    };
  } catch (error) {
    console.warn('[GROK-VIDEO] Grok generation failed:', error);
    return null; // Fall back to Replicate
  }
}

// ============================================================================
// VIDEO GENERATION - REPLICATE FALLBACK
// ============================================================================

async function generateWithReplicate(prompt: string): Promise<{ predictionId: string; status: string }> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    throw new Error('No video generation provider available (REPLICATE_API_TOKEN required)');
  }

  console.log('[GROK-VIDEO] Using Replicate fallback for video generation');

  // Use Stable Video Diffusion or similar text-to-video model
  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: REPLICATE_VIDEO_MODEL.split(':')[1],
      input: {
        prompt,
        num_frames: 25, // ~1 second at 25fps, adjust as needed
        fps: 8,
        motion_bucket_id: 127, // Default motion
        cond_aug: 0.02,
        decoding_t: 14,
        video_length: 'short', // Adjust based on model
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GROK-VIDEO] Replicate error:', response.status, errorText);
    throw new Error(`Replicate video generation failed: ${response.status}`);
  }

  const prediction = await response.json();
  console.log('[GROK-VIDEO] Replicate prediction started:', prediction.id);

  return {
    predictionId: prediction.id,
    status: prediction.status || 'processing',
  };
}

// ============================================================================
// TIER ACCESS & USAGE TRACKING
// ============================================================================

interface TierLimits {
  grokVideos: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: { grokVideos: 0 },       // No access
  pro: { grokVideos: 0 },        // No access (Sovereign only)
  enterprise: { grokVideos: -1 }, // Unlimited
};

/**
 * Get user's tier and check if they have grok video access
 */
async function checkUserTierAccess(userId: string): Promise<{
  allowed: boolean;
  tier: string;
  limit: number;
  used: number;
  remaining: number;
  reason?: string;
}> {
  try {
    // Get user profile to check tier
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.warn('[GROK-VIDEO] Could not fetch user profile:', profileError?.message);
      return {
        allowed: false,
        tier: 'free',
        limit: 0,
        used: 0,
        remaining: 0,
        reason: 'Could not verify user tier',
      };
    }

    const tier = profile.tier || 'free';
    const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const limit = tierLimits.grokVideos;

    // If limit is 0, no access at this tier
    if (limit === 0) {
      return {
        allowed: false,
        tier,
        limit: 0,
        used: 0,
        remaining: 0,
        reason: `Grok videos require SOVEREIGN tier. Current tier: ${tier.toUpperCase()}`,
      };
    }

    // If limit is -1, unlimited access
    if (limit === -1) {
      return {
        allowed: true,
        tier,
        limit: -1,
        used: 0,
        remaining: -1,
      };
    }

    // Check current usage for this billing period
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: usage, error: usageError } = await supabaseAdmin
      .from('usage_tracking')
      .select('grok_videos')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .single();

    const used = usage?.grok_videos || 0;
    const remaining = limit - used;

    if (remaining <= 0) {
      return {
        allowed: false,
        tier,
        limit,
        used,
        remaining: 0,
        reason: `Grok video limit reached (${used}/${limit} this month)`,
      };
    }

    return {
      allowed: true,
      tier,
      limit,
      used,
      remaining,
    };
  } catch (err) {
    console.error('[GROK-VIDEO] Tier check error:', err);
    return {
      allowed: false,
      tier: 'free',
      limit: 0,
      used: 0,
      remaining: 0,
      reason: 'Error checking tier access',
    };
  }
}

/**
 * Increment grok_videos usage count (call only for NON-CACHED generations)
 * Count: 1 for new_life_videos pair, 1 for court_order_video
 */
async function incrementUsage(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Check if record exists
    const { data: existing } = await supabaseAdmin
      .from('usage_tracking')
      .select('id, grok_videos')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .single();

    if (existing) {
      // Update existing record
      const { error } = await supabaseAdmin
        .from('usage_tracking')
        .update({ grok_videos: (existing.grok_videos || 0) + 1 })
        .eq('id', existing.id);

      if (error) {
        console.error('[GROK-VIDEO] Usage update error:', error.message);
        return false;
      }
    } else {
      // Insert new record
      const { error } = await supabaseAdmin
        .from('usage_tracking')
        .insert({
          user_id: userId,
          period_start: periodStart,
          period_end: periodEnd,
          grok_videos: 1,
        });

      if (error) {
        console.error('[GROK-VIDEO] Usage insert error:', error.message);
        return false;
      }
    }

    console.log('[GROK-VIDEO] Usage incremented for user:', userId);
    return true;
  } catch (err) {
    console.error('[GROK-VIDEO] Usage increment failed:', err);
    return false;
  }
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function checkCache(cityName: string, videoType: VideoType): Promise<GrokVideoRecord | null> {
  const cacheKey = generateCacheKey(cityName, videoType);

  try {
    const { data, error } = await supabaseAdmin
      .from('grok_videos')
      .select('*')
      .eq('city_name', cityName.toLowerCase())
      .eq('video_type', videoType)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GROK-VIDEO] Cache check error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[GROK-VIDEO] Cache check failed:', err);
    return null;
  }
}

async function checkProcessing(userId: string, comparisonId: string, videoType: VideoType): Promise<GrokVideoRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('grok_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('comparison_id', comparisonId)
      .eq('video_type', videoType)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (error) {
      console.warn('[GROK-VIDEO] Processing check error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[GROK-VIDEO] Processing check failed:', err);
    return null;
  }
}

async function insertVideoRecord(record: Partial<GrokVideoRecord>): Promise<GrokVideoRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('grok_videos')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.warn('[GROK-VIDEO] Insert error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[GROK-VIDEO] Insert failed:', err);
    return null;
  }
}

// ============================================================================
// VIDEO GENERATION ORCHESTRATION
// ============================================================================

async function generateSingleVideo(
  userId: string,
  comparisonId: string,
  cityName: string,
  videoType: VideoType,
  cityType: CityType
): Promise<{
  video: Partial<GrokVideoRecord>;
  cached: boolean;
  reused: boolean;
}> {
  // Check cache first (reuse across users for same city)
  const cached = await checkCache(cityName, videoType);
  if (cached) {
    console.log('[GROK-VIDEO] Cache hit for:', cityName, videoType);
    return { video: cached, cached: true, reused: cached.user_id !== userId };
  }

  // Check if already processing for this user
  const processing = await checkProcessing(userId, comparisonId, videoType);
  if (processing) {
    console.log('[GROK-VIDEO] Already processing for:', cityName, videoType);
    return { video: processing, cached: false, reused: false };
  }

  // Generate prompt
  const prompt = generatePrompt(cityName, videoType, cityType);

  // Try Grok first, then Replicate
  let result = await generateWithGrok(prompt);
  let provider = 'grok';

  if (!result) {
    result = await generateWithReplicate(prompt);
    provider = 'replicate';
  }

  // Insert record
  const record = await insertVideoRecord({
    user_id: userId,
    comparison_id: comparisonId,
    city_name: cityName.toLowerCase(),
    video_type: videoType,
    prompt,
    video_url: null,
    thumbnail_url: null,
    duration_seconds: videoType === 'perfect_life' ? 10 : 8,
    status: 'processing',
    provider,
    error_message: null,
    prediction_id: result.predictionId,
    created_at: new Date().toISOString(),
    completed_at: null,
  });

  return {
    video: record || {
      id: result.predictionId,
      user_id: userId,
      comparison_id: comparisonId,
      city_name: cityName.toLowerCase(),
      video_type: videoType,
      prompt,
      status: 'processing',
      provider,
      prediction_id: result.predictionId,
      created_at: new Date().toISOString(),
    },
    cached: false,
    reused: false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as GenerateRequest;

  if (!body.action || !body.userId || !body.comparisonId) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['action', 'userId', 'comparisonId'],
    });
    return;
  }

  try {
    // ========================================================================
    // TIER ACCESS CHECK (applies to all actions)
    // ========================================================================
    const tierAccess = await checkUserTierAccess(body.userId);

    if (!tierAccess.allowed) {
      console.log('[GROK-VIDEO] Access denied for user:', body.userId, tierAccess.reason);
      res.status(403).json({
        error: 'Access denied',
        reason: tierAccess.reason,
        tier: tierAccess.tier,
        limit: tierAccess.limit,
        used: tierAccess.used,
        remaining: tierAccess.remaining,
        upgradeRequired: true,
      });
      return;
    }

    console.log('[GROK-VIDEO] Access granted for user:', body.userId, 'tier:', tierAccess.tier);

    // ========================================================================
    // NEW LIFE VIDEOS (Winner + Loser pair)
    // ========================================================================
    if (body.action === 'new_life_videos') {
      const { winnerCity, loserCity, winnerCityType, loserCityType } = body as NewLifeVideosRequest;

      if (!winnerCity || !loserCity) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['winnerCity', 'loserCity'],
        });
        return;
      }

      console.log('[GROK-VIDEO] Generating New Life videos:', winnerCity, 'vs', loserCity);

      // Generate both videos in parallel
      const [winnerResult, loserResult] = await Promise.all([
        generateSingleVideo(
          body.userId,
          body.comparisonId,
          winnerCity,
          'winner_mood',
          winnerCityType || detectCityType(winnerCity)
        ),
        generateSingleVideo(
          body.userId,
          body.comparisonId,
          loserCity,
          'loser_mood',
          loserCityType || detectCityType(loserCity)
        ),
      ]);

      // Increment usage: count 1 for the winner+loser pair (only if NOT fully cached)
      const fullyFromCache = winnerResult.cached && loserResult.cached;
      if (!fullyFromCache) {
        await incrementUsage(body.userId);
        console.log('[GROK-VIDEO] Usage counted: 1 for new_life_videos pair');
      } else {
        console.log('[GROK-VIDEO] No usage counted - fully cached');
      }

      res.status(200).json({
        success: true,
        cached: fullyFromCache,
        usageCounted: !fullyFromCache,
        videos: {
          winner: {
            id: winnerResult.video.id,
            userId: winnerResult.video.user_id,
            comparisonId: winnerResult.video.comparison_id,
            cityName: winnerResult.video.city_name,
            videoType: 'winner_mood',
            prompt: winnerResult.video.prompt,
            videoUrl: winnerResult.video.video_url,
            thumbnailUrl: winnerResult.video.thumbnail_url,
            durationSeconds: winnerResult.video.duration_seconds || 8,
            status: winnerResult.video.status,
            provider: winnerResult.video.provider,
            errorMessage: winnerResult.video.error_message,
            createdAt: winnerResult.video.created_at,
            completedAt: winnerResult.video.completed_at,
          },
          loser: {
            id: loserResult.video.id,
            userId: loserResult.video.user_id,
            comparisonId: loserResult.video.comparison_id,
            cityName: loserResult.video.city_name,
            videoType: 'loser_mood',
            prompt: loserResult.video.prompt,
            videoUrl: loserResult.video.video_url,
            thumbnailUrl: loserResult.video.thumbnail_url,
            durationSeconds: loserResult.video.duration_seconds || 8,
            status: loserResult.video.status,
            provider: loserResult.video.provider,
            errorMessage: loserResult.video.error_message,
            createdAt: loserResult.video.created_at,
            completedAt: loserResult.video.completed_at,
          },
        },
      });
      return;
    }

    // ========================================================================
    // COURT ORDER VIDEO (Perfect Life)
    // ========================================================================
    if (body.action === 'court_order_video') {
      const { winnerCity, cityType } = body as CourtOrderVideoRequest;

      if (!winnerCity) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['winnerCity'],
        });
        return;
      }

      console.log('[GROK-VIDEO] Generating Court Order video for:', winnerCity);

      const result = await generateSingleVideo(
        body.userId,
        body.comparisonId,
        winnerCity,
        'perfect_life',
        cityType || detectCityType(winnerCity)
      );

      // Increment usage: count 1 for court order (only if NOT cached)
      if (!result.cached) {
        await incrementUsage(body.userId);
        console.log('[GROK-VIDEO] Usage counted: 1 for court_order_video');
      } else {
        console.log('[GROK-VIDEO] No usage counted - cached');
      }

      res.status(200).json({
        success: true,
        cached: result.cached,
        usageCounted: !result.cached,
        video: {
          id: result.video.id,
          userId: result.video.user_id,
          comparisonId: result.video.comparison_id,
          cityName: result.video.city_name,
          videoType: 'perfect_life',
          prompt: result.video.prompt,
          videoUrl: result.video.video_url,
          thumbnailUrl: result.video.thumbnail_url,
          durationSeconds: result.video.duration_seconds || 10,
          status: result.video.status,
          provider: result.video.provider,
          errorMessage: result.video.error_message,
          createdAt: result.video.created_at,
          completedAt: result.video.completed_at,
        },
      });
      return;
    }

    // Unknown action
    res.status(400).json({
      error: 'Unknown action',
      validActions: ['new_life_videos', 'court_order_video'],
    });
  } catch (error) {
    console.error('[GROK-VIDEO] Error:', error);
    res.status(500).json({
      error: 'Failed to generate video',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
