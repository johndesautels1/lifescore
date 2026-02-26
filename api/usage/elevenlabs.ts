/**
 * LIFE SCORE - ElevenLabs Usage API
 * Fetches current ElevenLabs subscription usage for monitoring
 *
 * GET /api/usage/elevenlabs
 *
 * Created: 2026-01-30
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

interface ElevenLabsSubscriptionInfo {
  tier: string;
  character_count: number;
  character_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  next_character_count_reset_unix: number;
  voice_limit: number;
  professional_voice_limit: number;
  can_extend_voice_limit: boolean;
  can_use_instant_voice_cloning: boolean;
  can_use_professional_voice_cloning: boolean;
  currency: string;
  status: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Require authentication — usage data should not be public
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  if (!elevenLabsKey) {
    res.status(200).json({
      available: false,
      error: 'ElevenLabs not configured',
    });
    return;
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_BASE}/user/subscription`, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[USAGE/elevenlabs] API error:', response.status, errorText);

      // Special handling for 401 - key is invalid
      if (response.status === 401) {
        res.status(200).json({
          available: false,
          error: 'Invalid API key',
          status: 'invalid_key',
          fallbackActive: true,
        });
        return;
      }

      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json() as ElevenLabsSubscriptionInfo;

    // Calculate usage percentage and warning level
    const percentage = data.character_count / data.character_limit;
    let warningLevel: 'ok' | 'yellow' | 'orange' | 'red' | 'exceeded' = 'ok';

    if (percentage >= 1) warningLevel = 'exceeded';
    else if (percentage >= 0.85) warningLevel = 'red';
    else if (percentage >= 0.7) warningLevel = 'orange';
    else if (percentage >= 0.5) warningLevel = 'yellow';

    // Calculate days until reset
    const now = Math.floor(Date.now() / 1000);
    const secondsUntilReset = data.next_character_count_reset_unix - now;
    const daysUntilReset = Math.ceil(secondsUntilReset / (24 * 60 * 60));

    // Calculate daily usage rate and estimate
    const dayOfMonth = new Date().getDate();
    const dailyRate = dayOfMonth > 0 ? data.character_count / dayOfMonth : 0;
    const estimatedTotalUsage = dailyRate * 30;
    const projectedOverage = Math.max(0, estimatedTotalUsage - data.character_limit);

    res.status(200).json({
      available: true,
      tier: data.tier,
      character_count: data.character_count,
      character_limit: data.character_limit,
      percentage: Math.round(percentage * 100),
      remaining: data.character_limit - data.character_count,
      warningLevel,
      resetUnix: data.next_character_count_reset_unix,
      daysUntilReset,

      // Projections
      dailyRate: Math.round(dailyRate),
      projectedMonthlyUsage: Math.round(estimatedTotalUsage),
      projectedOverage: Math.round(projectedOverage),

      // Fallback info
      fallbackActive: warningLevel === 'exceeded',
      fallbackProvider: 'OpenAI TTS',

      // Additional info
      voiceLimit: data.voice_limit,
      status: data.status,
    });
  } catch (error) {
    console.error('[USAGE/elevenlabs] Error:', error);
    res.status(500).json({
      available: false,
      error: error instanceof Error ? error.message : 'Failed to fetch usage',
    });
  }
}
