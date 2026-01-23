/**
 * LIFE SCORE - Judge Video API
 * D-ID Talks API for Christian avatar delivering the Judge's verdict
 *
 * IMPORTANT: Uses SEPARATE env vars from Olivia to prevent config mixing:
 * - DID_API_KEY (shared - same D-ID account)
 * - DID_JUDGE_PRESENTER_URL (Judge-specific avatar image)
 * - DID_JUDGE_VOICE_ID (Judge-specific voice - male)
 *
 * Olivia uses:
 * - DID_PRESENTER_URL (Olivia's avatar)
 * - DID_AGENT_ID (Olivia's agent)
 * - Microsoft Sonia voice (female)
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
// These env vars are ONLY for Judge/Christian - never used by Olivia
const JUDGE_PRESENTER_URL = process.env.DID_JUDGE_PRESENTER_URL || '';
const JUDGE_VOICE_ID = process.env.DID_JUDGE_VOICE_ID || 'en-US-GuyNeural'; // Default male voice

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
 * Uses JUDGE-SPECIFIC presenter and voice (not Olivia's)
 */
async function createTalk(
  authHeader: string,
  script: string,
  presenterUrl: string,
  voiceId: string
): Promise<string> {
  console.log('[JUDGE-VIDEO] Creating talk with D-ID, script length:', script.length);
  console.log('[JUDGE-VIDEO] Using presenter:', presenterUrl.slice(0, 50) + '...');
  console.log('[JUDGE-VIDEO] Using voice:', voiceId);

  const requestBody = {
    source_url: presenterUrl,
    script: {
      type: 'text',
      input: script,
      provider: {
        type: 'microsoft',
        voice_id: voiceId,
      },
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
    console.error('[JUDGE-VIDEO] D-ID API error:', error);
    throw new Error(`D-ID video generation failed: ${error}`);
  }

  const data: DIDTalkResponse = await response.json();

  if (!data.id) {
    throw new Error('D-ID did not return a talk ID');
  }

  console.log('[JUDGE-VIDEO] Talk created, id:', data.id);
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
            hint: 'Set DID_JUDGE_PRESENTER_URL in Vercel with Christian avatar image URL',
          });
          return;
        }

        // Generate video script from report
        const script = generateVideoScript(body.report);
        console.log('[JUDGE-VIDEO] Generated script:', script.slice(0, 100) + '...');

        // Call D-ID to create talk (video)
        const talkId = await createTalk(
          authHeader,
          script,
          JUDGE_PRESENTER_URL,
          JUDGE_VOICE_ID
        );

        res.status(200).json({
          success: true,
          talkId,
          status: 'pending',
          message: 'Video generation started. Poll /api/judge-video with action=status to check progress.',
          script, // Include script for debugging/display
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
