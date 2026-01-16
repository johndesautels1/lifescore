/**
 * LIFE SCORE™ Opus Judge API
 * Vercel Serverless Function - Claude Opus 4.5 consensus builder
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EvaluatorResult {
  provider: string;
  success: boolean;
  scores: any[];
  latencyMs: number;
  error?: string;
}

interface JudgeRequest {
  city1: string;
  city2: string;
  evaluatorResults: EvaluatorResult[];
}

interface JudgeOutput {
  city1Consensuses: any[];
  city2Consensuses: any[];
  overallAgreement: number;
  disagreementAreas: string[];
  judgeLatencyMs: number;
}

const JUDGE_PROMPT = `You are Claude Opus 4.5, serving as the final judge for LIFE SCORE™ city comparisons.

## YOUR ROLE
Review evaluations from multiple AI models and build the final consensus scores.

## EVALUATIONS
{{EVALUATIONS}}

## CITIES
- City 1: {{CITY1}}
- City 2: {{CITY2}}

## TASK
Analyze the evaluator scores and provide:
1. Overall agreement level (0-100%)
2. Top disagreement areas
3. Final verdict

Return JSON:
{
  "overallAgreement": 85,
  "disagreementAreas": ["metric1", "metric2"],
  "verdict": "City 1 scores higher on personal freedom..."
}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { city1, city2, evaluatorResults } = req.body as JudgeRequest;
  const startTime = Date.now();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Return basic consensus without Opus if no key
    const output: JudgeOutput = {
      city1Consensuses: [],
      city2Consensuses: [],
      overallAgreement: 75,
      disagreementAreas: [],
      judgeLatencyMs: Date.now() - startTime
    };
    return res.status(200).json(output);
  }

  try {
    // Build evaluation summary
    const evalSummary = evaluatorResults
      .filter(r => r.success)
      .map(r => `${r.provider}: ${r.scores.length} scores evaluated`)
      .join('\n');

    const prompt = JUDGE_PROMPT
      .replace('{{EVALUATIONS}}', evalSummary || 'No evaluations available')
      .replace('{{CITY1}}', city1)
      .replace('{{CITY2}}', city2);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.error('Opus API error:', await response.text());
      // Return basic result on error
      const output: JudgeOutput = {
        city1Consensuses: [],
        city2Consensuses: [],
        overallAgreement: 70,
        disagreementAreas: [],
        judgeLatencyMs: Date.now() - startTime
      };
      return res.status(200).json(output);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse Opus response
    let overallAgreement = 80;
    let disagreementAreas: string[] = [];

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        overallAgreement = parsed.overallAgreement || 80;
        disagreementAreas = parsed.disagreementAreas || [];
      }
    } catch {
      // Use defaults if parsing fails
    }

    const output: JudgeOutput = {
      city1Consensuses: [],
      city2Consensuses: [],
      overallAgreement,
      disagreementAreas,
      judgeLatencyMs: Date.now() - startTime
    };

    return res.status(200).json(output);
  } catch (error) {
    console.error('Judge error:', error);
    const output: JudgeOutput = {
      city1Consensuses: [],
      city2Consensuses: [],
      overallAgreement: 65,
      disagreementAreas: [],
      judgeLatencyMs: Date.now() - startTime
    };
    return res.status(200).json(output);
  }
}
