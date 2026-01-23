/**
 * LIFE SCORE - Judge Video API
 * HeyGen video generation for Christian avatar delivering the Judge's verdict
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

const HEYGEN_API_BASE = 'https://api.heygen.com';
const HEYGEN_TIMEOUT_MS = 60000;

// Christian avatar configuration (set in environment)
const CHRISTIAN_AVATAR_ID = process.env.HEYGEN_CHRISTIAN_AVATAR_ID || process.env.HEYGEN_AVATAR_ID || '';
const CHRISTIAN_VOICE_ID = process.env.HEYGEN_CHRISTIAN_VOICE_ID || process.env.HEYGEN_VOICE_ID || '';

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
    city1Trend: 'rising' | 'stable' | 'declining';
    city2Score: number;
    city2Trend: 'rising' | 'stable' | 'declining';
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
  videoId: string;
}

type JudgeVideoRequest = GenerateVideoRequest | StatusRequest;

interface HeyGenVideoResponse {
  error: null | string;
  data: {
    video_id: string;
  };
}

interface HeyGenStatusResponse {
  error: null | string;
  data: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    video_url?: string;
    thumbnail_url?: string;
    duration?: number;
    error?: string;
  };
}

// ============================================================================
// VIDEO SCRIPT GENERATOR
// ============================================================================

/**
 * Generate a compelling video script from the JudgeReport
 * Designed for Christian avatar to deliver as a 60-90 second verdict
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
  const getTrendDescription = (trend: 'rising' | 'stable' | 'declining'): string => {
    switch (trend) {
      case 'rising': return 'on an upward trajectory';
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

I'm Christian, and I've conducted a comprehensive analysis comparing ${city1} and ${city2} across multiple dimensions of freedom and quality of life.

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
// HEYGEN API FUNCTIONS
// ============================================================================

/**
 * Get HeyGen API key
 */
function getHeyGenKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new Error('HEYGEN_API_KEY not configured');
  }
  return key;
}

/**
 * Generate video using HeyGen's video generation API
 */
async function generateVideo(
  apiKey: string,
  script: string,
  avatarId: string,
  voiceId?: string
): Promise<string> {
  console.log('[JUDGE-VIDEO] Generating video with script length:', script.length);

  const requestBody = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal',
        },
        voice: voiceId ? {
          type: 'text',
          input_text: script,
          voice_id: voiceId,
        } : {
          type: 'text',
          input_text: script,
        },
        background: {
          type: 'color',
          value: '#0a1628', // Dark cockpit background matching LIFE SCORE theme
        },
      },
    ],
    dimension: {
      width: 1280,
      height: 720,
    },
    aspect_ratio: '16:9',
    test: false,
  };

  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/v2/video/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[JUDGE-VIDEO] HeyGen API error:', error);
    throw new Error(`HeyGen video generation failed: ${error}`);
  }

  const data: HeyGenVideoResponse = await response.json();

  if (data.error) {
    throw new Error(`HeyGen error: ${data.error}`);
  }

  console.log('[JUDGE-VIDEO] Video generation started, video_id:', data.data.video_id);
  return data.data.video_id;
}

/**
 * Check video generation status
 */
async function checkVideoStatus(
  apiKey: string,
  videoId: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}> {
  const response = await fetchWithTimeout(
    `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
      },
    },
    HEYGEN_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to check video status: ${error}`);
  }

  const data: HeyGenStatusResponse = await response.json();

  if (data.error) {
    throw new Error(`HeyGen status error: ${data.error}`);
  }

  return {
    status: data.data.status,
    videoUrl: data.data.video_url,
    error: data.data.error,
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
    const apiKey = getHeyGenKey();
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

        if (!CHRISTIAN_AVATAR_ID) {
          res.status(400).json({
            error: 'HEYGEN_CHRISTIAN_AVATAR_ID not configured',
            hint: 'Set HEYGEN_CHRISTIAN_AVATAR_ID in environment variables',
          });
          return;
        }

        // Generate video script from report
        const script = generateVideoScript(body.report);
        console.log('[JUDGE-VIDEO] Generated script:', script.slice(0, 100) + '...');

        // Call HeyGen to generate video
        const videoId = await generateVideo(
          apiKey,
          script,
          CHRISTIAN_AVATAR_ID,
          CHRISTIAN_VOICE_ID || undefined
        );

        res.status(200).json({
          success: true,
          videoId,
          status: 'pending',
          message: 'Video generation started. Poll /api/judge-video with action=status to check progress.',
          script, // Include script for debugging/display
        });
        return;
      }

      case 'status': {
        if (!body.videoId) {
          res.status(400).json({ error: 'videoId is required for status action' });
          return;
        }

        const statusResult = await checkVideoStatus(apiKey, body.videoId);

        // Map HeyGen status to our status
        let videoStatus: 'pending' | 'generating' | 'ready' | 'error';
        switch (statusResult.status) {
          case 'pending':
          case 'processing':
            videoStatus = 'generating';
            break;
          case 'completed':
            videoStatus = 'ready';
            break;
          case 'failed':
            videoStatus = 'error';
            break;
          default:
            videoStatus = 'pending';
        }

        res.status(200).json({
          success: true,
          videoId: body.videoId,
          status: videoStatus,
          heygenStatus: statusResult.status,
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
