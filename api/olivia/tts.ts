/**
 * LIFE SCORE - Olivia TTS API (FALLBACK)
 *
 * Text-to-speech endpoint using ElevenLabs.
 * This is a FALLBACK for when D-ID streaming is unavailable.
 *
 * Primary voice: Microsoft Sonia (en-GB-SoniaNeural) via D-ID with lip-sync
 * Fallback voice: ElevenLabs (audio only, no lip-sync)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_TIMEOUT_MS = 60000; // 60 seconds

// Default voice ID - Olivia's voice (uses ELEVENLABS_OLIVIA_VOICE_ID env var)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_OLIVIA_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || 'W0Zh57R76zl4xEJ4vCd2';

// Default model - multilingual v2 for best quality
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

// ============================================================================
// TYPES
// ============================================================================

interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
  stability?: number;
  similarityBoost?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get ElevenLabs API key
 */
function getElevenLabsKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }
  return key;
}

/**
 * Truncate text if too long (ElevenLabs has limits)
 */
function truncateText(text: string, maxChars: number = 5000): string {
  if (text.length <= maxChars) return text;

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxChars);
  const lastSentence = truncated.lastIndexOf('.');
  if (lastSentence > maxChars * 0.8) {
    return truncated.substring(0, lastSentence + 1);
  }

  return truncated + '...';
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - open for TTS
  if (handleCors(req, res, 'open')) return;

  // Rate limiting - standard preset for TTS
  if (!applyRateLimit(req.headers, 'olivia-tts', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = getElevenLabsKey();
    const {
      text,
      voiceId = DEFAULT_VOICE_ID,
      modelId = DEFAULT_MODEL_ID,
      outputFormat = 'mp3_44100_128',
      stability = 0.5,
      similarityBoost = 0.8,
    } = req.body as TTSRequest;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    // Truncate if needed
    const processedText = truncateText(text.trim());
    console.log('[OLIVIA/TTS] Generating speech for', processedText.length, 'characters');

    // Call ElevenLabs API
    const response = await fetchWithTimeout(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: processedText,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      },
      ELEVENLABS_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OLIVIA/TTS] ElevenLabs error:', response.status, errorText);

      if (response.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      }
      if (response.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded');
      }

      throw new Error(`TTS generation failed: ${response.status}`);
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
    const estimatedDurationMs = (processedText.length / 5 / 150) * 60 * 1000;

    console.log('[OLIVIA/TTS] Generated audio, size:', audioBuffer.byteLength);

    res.status(200).json({
      audioUrl,
      durationMs: Math.round(estimatedDurationMs),
    });
  } catch (error) {
    console.error('[OLIVIA/TTS] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'TTS generation failed',
    });
  }
}
