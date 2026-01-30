/**
 * LIFE SCORE - Emilia Speak API
 * Generate TTS audio using ElevenLabs with OpenAI fallback
 *
 * Primary: ElevenLabs (Rachel voice)
 * Fallback: OpenAI TTS 'shimmer' voice (softer, expressive female)
 *
 * POST /api/emilia/speak
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_TIMEOUT_MS = 30000;

// Default to a friendly female voice if not configured
// Rachel voice ID: 21m00Tcm4TlvDq8ikWAM
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// ============================================================================
// TYPES
// ============================================================================

interface SpeakRequest {
  text: string;
  voiceId?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getElevenLabsKey(): string | null {
  return process.env.ELEVENLABS_API_KEY || null;
}

function getEmiliaVoiceId(): string {
  return process.env.ELEVENLABS_EMILIA_VOICE_ID || DEFAULT_VOICE_ID;
}

/**
 * OpenAI TTS fallback for Emilia (when ElevenLabs fails/quota exceeded)
 * Uses 'shimmer' voice - softer, expressive female (distinct from Olivia's 'nova')
 */
async function generateOpenAIAudio(text: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY not configured for TTS fallback');
  }

  console.log('[EMILIA/speak] Using OpenAI fallback (shimmer voice)');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'shimmer', // Softer, expressive female voice for Emilia
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[EMILIA/speak] OpenAI TTS error:', response.status, errorText);
    throw new Error(`OpenAI TTS failed: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(audioBuffer).toString('base64');

  console.log(`[EMILIA/speak] OpenAI audio generated (${Math.round(audioBuffer.byteLength / 1024)}KB)`);

  return `data:audio/mpeg;base64,${base64}`;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'open', { methods: 'POST, OPTIONS' })) return;

  // Method check
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { text, voiceId } = req.body as SpeakRequest;

  if (!text) {
    res.status(400).json({ error: 'text is required' });
    return;
  }

  // Limit text length to prevent abuse
  if (text.length > 5000) {
    res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    return;
  }

  const elevenLabsKey = getElevenLabsKey();

  if (!elevenLabsKey) {
    console.warn('[EMILIA/speak] ElevenLabs not configured, returning fallback');
    res.status(200).json({
      success: false,
      error: 'TTS not configured',
      fallback: true,
    });
    return;
  }

  try {
    const finalVoiceId = voiceId || getEmiliaVoiceId();

    const response = await fetch(
      `${ELEVENLABS_API_BASE}/text-to-speech/${finalVoiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.7, // Slightly more stable than Olivia
            similarity_boost: 0.8,
            style: 0.2, // Subtle expressiveness
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[EMILIA/speak] ElevenLabs error:', response.status, errorText);

      // Fallback to OpenAI for 401 (invalid key) or 429 (rate limit/quota)
      if (response.status === 401 || response.status === 429) {
        console.log('[EMILIA/speak] ElevenLabs failed, trying OpenAI fallback...');
        const audioUrl = await generateOpenAIAudio(text);
        res.status(200).json({
          success: true,
          audioUrl,
          fallback: 'openai',
        });
        return;
      }

      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Get audio as buffer
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    console.log(`[EMILIA/speak] Generated audio (${Math.round(arrayBuffer.byteLength / 1024)}KB)`);

    res.status(200).json({
      success: true,
      audioUrl: `data:audio/mpeg;base64,${base64}`,
    });
  } catch (error) {
    console.error('[EMILIA/speak] Error:', error);

    // Last resort: try OpenAI fallback
    try {
      const { text: bodyText } = req.body as SpeakRequest;
      if (bodyText) {
        console.log('[EMILIA/speak] Primary TTS failed, attempting OpenAI fallback...');
        const audioUrl = await generateOpenAIAudio(bodyText);
        res.status(200).json({
          success: true,
          audioUrl,
          fallback: 'openai',
        });
        return;
      }
    } catch (fallbackError) {
      console.error('[EMILIA/speak] OpenAI fallback also failed:', fallbackError);
    }

    res.status(500).json({
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : 'Unknown error',
      fallback: true,
    });
  }
}
