/**
 * LIFE SCORE - Olivia TTS API
 * Text-to-speech endpoint using ElevenLabs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CONSTANTS
// ============================================================================

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';
const ELEVENLABS_TIMEOUT_MS = 30000; // 30 seconds

// Default voice ID - Olivia's cloned voice (can be overridden via env)
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';

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
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`TTS request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
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
