/**
 * LIFE SCORE - Judge Video API (D-ID Fallback)
 * D-ID Talks API for Cristiano avatar delivering the Judge's verdict
 *
 * Updated 2026-01-30: Added OpenAI TTS fallback when ElevenLabs fails
 *
 * Voice Priority:
 * 1. ElevenLabs Cristiano (ZpwpoMoU84OhcbA2YBBV)
 * 2. OpenAI TTS 'onyx' voice (deep, authoritative male)
 *
 * Primary: Replicate Wav2Lip + ElevenLabs (api/avatar/generate-judge-video.ts)
 * Fallback: D-ID + ElevenLabs/OpenAI (this file)
 *
 * Actions:
 * - generate: Create video from JudgeReport
 * - status: Check video generation status
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { fetchWithTimeout } from './shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DID_API_BASE = 'https://api.d-id.com';
const DID_TIMEOUT_MS = 60000;

// JUDGE-SPECIFIC config (completely separate from Olivia)
const JUDGE_PRESENTER_URL = process.env.DID_JUDGE_PRESENTER_URL || '';

// ElevenLabs Cristiano voice - same as Replicate implementation for consistency
const CRISTIANO_VOICE_ID = process.env.ELEVENLABS_CRISTIANO_VOICE_ID || 'ZpwpoMoU84OhcbA2YBBV';

// ============================================================================
// ELEVENLABS TTS (for voice consistency with Replicate)
// ============================================================================

/**
 * Generate TTS audio using OpenAI with 'onyx' voice (fallback)
 * Returns base64 audio for D-ID consumption
 */
async function generateOpenAIAudio(script: string): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OPENAI_API_KEY not configured for TTS fallback');
  }

  console.log('[JUDGE-VIDEO-DID] Using OpenAI fallback (onyx voice)');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'onyx', // Deep, authoritative male voice for Judge Cristiano
      input: script,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[JUDGE-VIDEO-DID] OpenAI TTS error:', response.status, errorText);
    throw new Error(`OpenAI TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(arrayBuffer).toString('base64');

  console.log('[JUDGE-VIDEO-DID] OpenAI audio generated, base64 length:', base64Audio.length);
  return base64Audio;
}

/**
 * Generate TTS audio using ElevenLabs with Cristiano's voice
 * Falls back to OpenAI 'onyx' voice if ElevenLabs fails
 * Returns base64 audio for D-ID consumption
 */
async function generateElevenLabsAudio(script: string): Promise<string> {
  const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

  // If no ElevenLabs key, go straight to OpenAI
  if (!elevenLabsKey) {
    console.log('[JUDGE-VIDEO-DID] No ElevenLabs key, using OpenAI fallback');
    return generateOpenAIAudio(script);
  }

  console.log('[JUDGE-VIDEO-DID] Generating ElevenLabs audio, script length:', script.length);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${CRISTIANO_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: script,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.1,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[JUDGE-VIDEO-DID] ElevenLabs error:', response.status, errorText);

      // Fallback to OpenAI for 401 (invalid key) or 429 (rate limit/quota)
      if (response.status === 401 || response.status === 429) {
        console.log('[JUDGE-VIDEO-DID] ElevenLabs failed, trying OpenAI fallback...');
        return generateOpenAIAudio(script);
      }

      throw new Error(`ElevenLabs TTS failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    console.log('[JUDGE-VIDEO-DID] ElevenLabs audio generated, base64 length:', base64Audio.length);
    return base64Audio;
  } catch (error) {
    console.error('[JUDGE-VIDEO-DID] ElevenLabs error, trying OpenAI fallback:', error);
    return generateOpenAIAudio(script);
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface JudgeReport {
  reportId: string;
  generatedAt: string;
  userId: string;
  comparisonId: string;
  city1: string;
  city2: string;
  videoUrl?: string;
  videoStatus: 'pending' | 'generating' | 'ready' | 'error';
  summaryOfFindings: {
    city1Score: number;
    city1Trend: 'improving' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'improving' | 'stable' | 'declining';
    overallConfidence: 'high' | 'medium' | 'low';
  };
  categoryAnalysis: {
    categoryId: string;
    categoryName: string;
    city1Analysis: string;
    city2Analysis: string;
    trendNotes: string;
  }[];
  executiveSummary: {
    recommendation: 'city1' | 'city2' | 'tie';
    rationale: string;
    keyFactors: string[];
    futureOutlook: string;
    confidenceLevel: 'high' | 'medium' | 'low';
  };
}

interface GenerateVideoRequest {
  action: 'generate';
  report: JudgeReport;
}

interface StatusRequest {
  action: 'status';
  talkId: string;
}

type JudgeVideoRequest = GenerateVideoRequest | StatusRequest;

interface DIDTalkResponse {
  id: string;
  status: 'created' | 'started' | 'done' | 'error';
  result_url?: string;
  error?: { description: string };
}

// ============================================================================
// VIDEO SCRIPT GENERATOR
// ============================================================================

/**
 * Generate a compelling video script from the JudgeReport
 * Designed for Cristiano avatar to deliver as a 60-90 second verdict
 */
function generateVideoScript(report: JudgeReport): string {
  const { city1, city2, summaryOfFindings, executiveSummary } = report;

  // Determine winner text
  let winnerText: string;
  if (executiveSummary.recommendation === 'city1') {
    winnerText = city1;
  } else if (executiveSummary.recommendation === 'city2') {
    winnerText = city2;
  } else {
    winnerText = 'a virtual tie between both cities';
  }

  // Trend descriptions
  const getTrendDescription = (trend: 'improving' | 'stable' | 'declining'): string => {
    switch (trend) {
      case 'improving': return 'on an upward trajectory';
      case 'declining': return 'showing signs of decline';
      case 'stable': return 'holding steady';
    }
  };

  // Confidence phrase
  const getConfidencePhrase = (level: 'high' | 'medium' | 'low'): string => {
    switch (level) {
      case 'high': return 'with high confidence';
      case 'medium': return 'with moderate confidence';
      case 'low': return 'though the margin is narrow';
    }
  };

  // Build the script
  const script = `
Welcome to the LIFE SCORE Judge's Verdict.

I'm Cristiano, and I've conducted a comprehensive analysis comparing ${city1} and ${city2} across multiple dimensions of freedom and quality of life.

${city1} achieved a score of ${summaryOfFindings.city1Score.toFixed(1)}, and is ${getTrendDescription(summaryOfFindings.city1Trend)}.

${city2} earned a score of ${summaryOfFindings.city2Score.toFixed(1)}, and is ${getTrendDescription(summaryOfFindings.city2Trend)}.

After careful deliberation, my verdict is: ${winnerText}, ${getConfidencePhrase(executiveSummary.confidenceLevel)}.

${executiveSummary.rationale.slice(0, 300)}

The key factors in this decision include: ${executiveSummary.keyFactors.slice(0, 3).join(', ')}.

Looking ahead: ${executiveSummary.futureOutlook.slice(0, 200)}

This has been the LIFE SCORE Judge's Verdict. Make informed decisions about where you live and work.
`.trim();

  return script;
}

// ============================================================================
// D-ID API FUNCTIONS
// ============================================================================

/**
 * Get D-ID API key and encode for Basic auth
 * SHARED with Olivia - same D-ID account
 */
function getDIDAuthHeader(): string {
  const key = process.env.DID_API_KEY;
  if (!key) {
    throw new Error('DID_API_KEY not configured');
  }
  // If key already contains colon (username:password format), use as-is
  // Otherwise, treat as password-only with empty username
  const credentials = key.includes(':') ? key : `:${key}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Create a talk (video) using D-ID Talks API
 * Uses ElevenLabs audio for Cristiano voice consistency
 */
async function createTalk(
  authHeader: string,
  script: string,
  presenterUrl: string,
  audioBase64: string
): Promise<string> {
  console.log('[JUDGE-VIDEO-DID] Creating talk with D-ID + ElevenLabs audio');
  console.log('[JUDGE-VIDEO-DID] Using presenter:', presenterUrl.slice(0, 50) + '...');
  console.log('[JUDGE-VIDEO-DID] Using Cristiano voice:', CRISTIANO_VOICE_ID);

  // Use audio type with base64 ElevenLabs audio instead of D-ID's built-in TTS
  const requestBody = {
    source_url: presenterUrl,
    script: {
      type: 'audio',
      audio: `data:audio/mpeg;base64,${audioBase64}`,
    },
    config: {
      stitch: true, // Smoother video
    },
  };

  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(requestBody),
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[JUDGE-VIDEO-DID] D-ID API error:', error);
    throw new Error(`D-ID video generation failed: ${error}`);
  }

  const data: DIDTalkResponse = await response.json();

  if (!data.id) {
    throw new Error('D-ID did not return a talk ID');
  }

  console.log('[JUDGE-VIDEO-DID] Talk created, id:', data.id);
  return data.id;
}

/**
 * Check talk (video) generation status
 */
async function getTalkStatus(
  authHeader: string,
  talkId: string
): Promise<{
  status: 'pending' | 'generating' | 'ready' | 'error';
  videoUrl?: string;
  error?: string;
}> {
  const response = await fetchWithTimeout(
    `${DID_API_BASE}/talks/${talkId}`,
    {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    },
    DID_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check talk status: ${error}`);
  }

  const data: DIDTalkResponse = await response.json();

  // Map D-ID status to our status
  let videoStatus: 'pending' | 'generating' | 'ready' | 'error';
  switch (data.status) {
    case 'created':
      videoStatus = 'pending';
      break;
    case 'started':
      videoStatus = 'generating';
      break;
    case 'done':
      videoStatus = 'ready';
      break;
    case 'error':
      videoStatus = 'error';
      break;
    default:
      videoStatus = 'pending';
  }

  return {
    status: videoStatus,
    videoUrl: data.result_url,
    error: data.error?.description,
  };
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'open')) return;

  // Rate limiting - heavy preset (video generation is expensive)
  if (!applyRateLimit(req.headers, 'judge-video', 'heavy', res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const authHeader = getDIDAuthHeader();
    const body = req.body as JudgeVideoRequest;

    if (!body.action) {
      res.status(400).json({ error: 'action is required (generate or status)' });
      return;
    }

    console.log('[JUDGE-VIDEO] Action:', body.action);

    switch (body.action) {
      case 'generate': {
        if (!body.report) {
          res.status(400).json({ error: 'report is required for generate action' });
          return;
        }

        if (!JUDGE_PRESENTER_URL) {
          res.status(400).json({
            error: 'DID_JUDGE_PRESENTER_URL not configured',
            hint: 'Set DID_JUDGE_PRESENTER_URL in Vercel with Cristiano avatar image URL',
          });
          return;
        }

        // Generate video script from report
        const script = generateVideoScript(body.report);
        console.log('[JUDGE-VIDEO-DID] Generated script:', script.slice(0, 100) + '...');

        // Step 1: Generate ElevenLabs audio with Cristiano voice
        const audioBase64 = await generateElevenLabsAudio(script);

        // Step 2: Call D-ID with the ElevenLabs audio
        const talkId = await createTalk(
          authHeader,
          script,
          JUDGE_PRESENTER_URL,
          audioBase64
        );

        res.status(200).json({
          success: true,
          talkId,
          status: 'pending',
          message: 'Video generation started with ElevenLabs Cristiano voice. Poll /api/judge-video with action=status to check progress.',
          script,
          voice: CRISTIANO_VOICE_ID,
        });
        return;
      }

      case 'status': {
        if (!body.talkId) {
          res.status(400).json({ error: 'talkId is required for status action' });
          return;
        }

        const statusResult = await getTalkStatus(authHeader, body.talkId);

        res.status(200).json({
          success: true,
          talkId: body.talkId,
          status: statusResult.status,
          videoUrl: statusResult.videoUrl,
          error: statusResult.error,
        });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${(body as any).action}` });
    }
  } catch (error) {
    console.error('[JUDGE-VIDEO] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Video generation failed',
    });
  }
}
