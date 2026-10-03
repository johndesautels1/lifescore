/**
 * LIFE SCORE - Olivia TTS API (FALLBACK)
 *
 * Text-to-speech endpoint using ElevenLabs with OpenAI fallback.
 * This is a FALLBACK for when D-ID streaming is unavailable.
 *
 * Primary voice: Microsoft Sonia (en-GB-SoniaNeural) via D-ID with lip-sync
 * Fallback 1: ElevenLabs (audio only, no lip-sync)
 * Fallback 2: OpenAI TTS 'nova' voice (if ElevenLabs fails/quota exceeded)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from '../shared/rateLimit.js';
import { handleCors } from '../shared/cors.js';
import { requireFeature } from '../shared/entitlements.js';
import { openaiSpeech } from '../shared/openai.js';
import { elevenLabsConfigured, elevenLabsSpeech, failureStatus } from '../shared/elevenlabs.js';

// ============================================================================
// CONSTANTS
// ============================================================================

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
  speed?: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Throws when ElevenLabs is not configured, so the handler's catch uses the OpenAI back-up. */
function requireElevenLabs(): void {
  if (!elevenLabsConfigured()) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }
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

/**
 * OpenAI TTS fallback for Olivia (when ElevenLabs fails/quota exceeded)
 * Uses 'nova' voice - warm, conversational female
 */
async function generateOpenAIAudio(text: string, speed: number = 1.0): Promise<{ audioUrl: string; durationMs: number }> {
  console.log('[OLIVIA/TTS] Using OpenAI fallback (nova voice)');

  const spoken = await openaiSpeech({
    character: 'olivia',
    text,
    format: 'mp3',
    quality: 'standard',
    speed: speed || 1.0,
    timeoutMs: 30_000,
    label: 'OLIVIA/TTS tts',
  });
  if (!spoken.ok) {
    console.error('[OLIVIA/TTS] OpenAI TTS error:', spoken.message);
    throw new Error(`OpenAI TTS failed: ${spoken.message}`);
  }

  const audioUrl = `data:audio/mpeg;base64,${spoken.audio.toString('base64')}`;

  // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
  const estimatedDurationMs = (text.length / 5 / 150) * 60 * 1000;

  console.log('[OLIVIA/TTS] OpenAI audio generated, size:', spoken.audio.length);

  return { audioUrl, durationMs: Math.round(estimatedDurationMs) };
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app')) return;

  // Rate limiting - standard preset for TTS
  if (!applyRateLimit(req.headers, 'olivia-tts', 'standard', res)) {
    return; // 429 already sent
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Sign-in + the plan must include Olivia (NAVIGATOR and up).
  const entitled = await requireFeature(req, res, 'oliviaMinutesPerMonth');
  if (!entitled) return;

  try {
    requireElevenLabs();
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

    // FIX X3: Validate voiceId format to prevent URL path injection
    if (!/^[a-zA-Z0-9_-]+$/.test(voiceId)) {
      res.status(400).json({ error: 'Invalid voiceId format' });
      return;
    }

    // Truncate if needed
    const processedText = truncateText(text.trim());
    console.log('[OLIVIA/TTS] Generating speech for', processedText.length, 'characters');

    // Call ElevenLabs API
    const spoken = await elevenLabsSpeech({
      voiceId,
      text: processedText,
      modelId,
      voiceSettings: {
        stability,
        similarity_boost: similarityBoost,
        speed: req.body.speed || 1.0,
      },
      outputFormat,
      accept: 'audio/mpeg',
      timeoutMs: ELEVENLABS_TIMEOUT_MS,
      label: 'OLIVIA/TTS voice',
    });

    if (!spoken.ok) {
      console.error('[OLIVIA/TTS] ElevenLabs error:', spoken.message);

      // Fallback to OpenAI for 401 (invalid key) or 429 (rate limit/quota)
      const status = failureStatus(spoken);
      if (status === 401 || status === 429) {
        console.log('[OLIVIA/TTS] ElevenLabs failed, trying OpenAI fallback...');
        const fallbackResult = await generateOpenAIAudio(processedText, req.body.speed || 1.0);
        res.status(200).json({
          audioUrl: fallbackResult.audioUrl,
          durationMs: fallbackResult.durationMs,
          fallback: 'openai',
          // FIX #73: Return usage data for cost tracking
          usage: {
            provider: 'openai',
            characterCount: processedText.length,
          },
        });
        return;
      }

      throw new Error(`TTS generation failed: ${spoken.message}`);
    }

    // Get audio data
    const audioBuffer = spoken.audio;
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Estimate duration (rough: ~150 words per minute, ~5 chars per word)
    const estimatedDurationMs = (processedText.length / 5 / 150) * 60 * 1000;

    console.log('[OLIVIA/TTS] Generated audio, size:', audioBuffer.byteLength);

    res.status(200).json({
      audioUrl,
      durationMs: Math.round(estimatedDurationMs),
      // FIX #73: Return usage data for cost tracking
      usage: {
        provider: 'elevenlabs',
        characterCount: processedText.length,
      },
    });
  } catch (error) {
    console.error('[OLIVIA/TTS] Error:', error);

    // Last resort: try OpenAI fallback
    try {
      const { text } = req.body as TTSRequest;
      if (text) {
        console.log('[OLIVIA/TTS] Primary TTS failed, attempting OpenAI fallback...');
        const processedFallbackText = truncateText(text.trim());
        const fallbackResult = await generateOpenAIAudio(processedFallbackText, req.body.speed || 1.0);
        res.status(200).json({
          audioUrl: fallbackResult.audioUrl,
          durationMs: fallbackResult.durationMs,
          fallback: 'openai',
          // FIX #73: Return usage data for cost tracking
          usage: {
            provider: 'openai',
            characterCount: processedFallbackText.length,
          },
        });
        return;
      }
    } catch (fallbackError) {
      console.error('[OLIVIA/TTS] OpenAI fallback also failed:', fallbackError);
    }

    res.status(500).json({
      error: error instanceof Error ? error.message : 'TTS generation failed',
    });
  }
}
