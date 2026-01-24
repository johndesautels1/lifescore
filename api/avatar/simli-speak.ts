/**
 * LIFE SCORE - Simli Speak API
 *
 * Generates TTS audio for Olivia to speak via Simli WebRTC.
 * Audio is returned in PCM Int16 format at 16kHz mono for Simli compatibility.
 *
 * Reference: https://docs.simli.com/api-reference/simli-webrtc
 * Audio Requirements: PCM Int16, 16000 Hz, mono channel
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';

export const config = {
  maxDuration: 60,
};

interface SpeakRequest {
  sessionId?: string;
  text: string;
  emotion?: 'neutral' | 'happy' | 'concerned' | 'empathetic' | 'encouraging';
  speed?: number;
}

// Map emotions to ElevenLabs voice settings
const EMOTION_SETTINGS: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  neutral: { stability: 0.5, similarity_boost: 0.75, style: 0.0 },
  happy: { stability: 0.4, similarity_boost: 0.8, style: 0.3 },
  concerned: { stability: 0.6, similarity_boost: 0.7, style: 0.1 },
  empathetic: { stability: 0.55, similarity_boost: 0.75, style: 0.2 },
  encouraging: { stability: 0.45, similarity_boost: 0.8, style: 0.25 },
};

// Olivia's ElevenLabs voice ID (professional female voice)
const OLIVIA_VOICE_ID = process.env.ELEVENLABS_OLIVIA_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'open')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!elevenLabsKey && !openaiKey) {
    res.status(500).json({
      error: 'TTS not configured',
      message: 'Either ELEVENLABS_API_KEY or OPENAI_API_KEY required',
    });
    return;
  }

  const body = req.body as SpeakRequest;

  if (!body.text) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['text'],
    });
    return;
  }

  try {
    console.log('[SIMLI-SPEAK] Generating audio for:', body.text.substring(0, 50) + '...');

    let audioBuffer: ArrayBuffer;
    let audioDuration: number;

    if (elevenLabsKey) {
      // Use ElevenLabs for high-quality TTS
      const emotionSettings = EMOTION_SETTINGS[body.emotion || 'neutral'];

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${OLIVIA_VOICE_ID}?output_format=pcm_16000`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: body.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: emotionSettings.stability,
              similarity_boost: emotionSettings.similarity_boost,
              style: emotionSettings.style,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SIMLI-SPEAK] ElevenLabs error:', response.status, errorText);
        throw new Error(`ElevenLabs TTS failed: ${response.status}`);
      }

      audioBuffer = await response.arrayBuffer();
      // PCM 16-bit at 16kHz mono = 32000 bytes per second
      audioDuration = audioBuffer.byteLength / 32000;

      console.log('[SIMLI-SPEAK] ElevenLabs audio generated:', audioBuffer.byteLength, 'bytes,', audioDuration.toFixed(2), 's');
    } else {
      // Fallback to OpenAI TTS
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'nova', // Professional female voice
          input: body.text,
          response_format: 'pcm',
          speed: body.speed || 1.0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SIMLI-SPEAK] OpenAI TTS error:', response.status, errorText);
        throw new Error(`OpenAI TTS failed: ${response.status}`);
      }

      // OpenAI returns 24kHz PCM, need to resample to 16kHz
      const originalBuffer = await response.arrayBuffer();
      audioBuffer = resamplePCM(originalBuffer, 24000, 16000);
      audioDuration = audioBuffer.byteLength / 32000;

      console.log('[SIMLI-SPEAK] OpenAI audio generated and resampled:', audioBuffer.byteLength, 'bytes');
    }

    // Convert ArrayBuffer to base64 for JSON transport
    const base64Audio = arrayBufferToBase64(audioBuffer);

    res.status(200).json({
      success: true,
      audioData: base64Audio,
      duration: audioDuration,
      format: 'pcm_s16le',
      sampleRate: 16000,
      channels: 1,
    });

  } catch (error) {
    console.error('[SIMLI-SPEAK] Error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Resample PCM audio from one sample rate to another
 * Simple linear interpolation for downsampling
 */
function resamplePCM(buffer: ArrayBuffer, fromRate: number, toRate: number): ArrayBuffer {
  const inputView = new Int16Array(buffer);
  const ratio = fromRate / toRate;
  const outputLength = Math.floor(inputView.length / ratio);
  const outputBuffer = new ArrayBuffer(outputLength * 2);
  const outputView = new Int16Array(outputBuffer);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputView.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation
    const sample = inputView[srcIndexFloor] * (1 - fraction) + inputView[srcIndexCeil] * fraction;
    outputView[i] = Math.round(sample);
  }

  return outputBuffer;
}
