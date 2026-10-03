/**
 * LIFE SCORE - Gun Rights Comparison API
 *
 * Standalone, unscored comparison of gun laws between two cities.
 * This is deliberately NOT part of the 100-metric scoring system
 * because gun rights are uniquely polarizing — "more gun freedom"
 * is maximum freedom to some and maximum danger to others.
 *
 * Returns factual gun law data only. No scores, no winners.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { requireFeature } from '../shared/entitlements.js';
import { callClaude } from '../shared/anthropic.js';
import { AI_MODELS } from '../shared/models.js';

// ============================================================================
// TYPES
// ============================================================================

interface GunLawCategory {
  label: string;
  cityA: string;
  cityB: string;
}

interface GunComparisonResponse {
  cityA: string;
  cityB: string;
  categories: GunLawCategory[];
  summary: string;
  disclaimer: string;
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ANTHROPIC_TIMEOUT_MS = 55000; // inside the route's 60-second limit

const GUN_LAW_CATEGORIES = [
  'Open Carry',
  'Concealed Carry',
  'Permit Requirements',
  'Assault Weapon Ban',
  'Magazine Capacity Limits',
  'Waiting Period',
  'Background Check Requirements',
  'Red Flag / ERPO Laws',
  'Stand Your Ground / Castle Doctrine',
  'Gun-Free Zones',
];

const SYSTEM_PROMPT = `You are a factual legal researcher. You will be given two cities and must compare their gun laws across specific categories.

RULES:
- Be STRICTLY FACTUAL. No opinions on whether gun freedom is good or bad.
- For each category, describe what the law actually says in each city/state/country.
- Keep each response to 1-2 sentences per city per category.
- If a city is outside the US, describe the national firearms laws that apply.
- Include the jurisdiction level (city, state, federal, national) where relevant.
- Do NOT declare a winner or suggest which is "better."

Respond in valid JSON matching this exact structure:
{
  "categories": [
    { "label": "Category Name", "cityA": "Description for city A", "cityB": "Description for city B" }
  ],
  "summary": "A 2-3 sentence factual summary of the key differences. No opinions."
}`;

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Paid plans only — this makes Anthropic API calls. Offered on Visual reports
  // (gammaReports) and Enhanced results (Sovereign, which includes gammaReports).
  const auth = (await requireFeature(req, res, 'gammaReports'))?.auth ?? null;
  if (!auth) return;

  try {
    const { cityA, cityB } = req.body || {};

    if (!cityA || !cityB) {
      res.status(400).json({ error: 'cityA and cityB are required' });
      return;
    }

    const userMessage = `Compare gun laws between "${cityA}" and "${cityB}" for these categories:\n${GUN_LAW_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

    const reply = await callClaude({
      model: AI_MODELS.writer.id,
      maxTokens: 8000, // thinking + the comparison JSON
      effort: 'low',
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      timeoutMs: ANTHROPIC_TIMEOUT_MS,
      label: 'gun-comparison',
    });

    if (!reply.ok) {
      console.error('[GUN-COMPARISON] Claude call failed:', reply.kind, reply.message);
      res.status(502).json({ error: 'Failed to fetch gun law comparison' });
      return;
    }

    const textContent = reply.text;

    // Parse JSON from response (handle markdown code blocks)
    let parsed: { categories: GunLawCategory[]; summary: string };
    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('[GUN-COMPARISON] JSON parse error:', parseErr);
      // Fallback: return raw text as summary
      parsed = {
        categories: GUN_LAW_CATEGORIES.map(label => ({
          label,
          cityA: 'Data unavailable',
          cityB: 'Data unavailable',
        })),
        summary: textContent.slice(0, 500),
      };
    }

    const result: GunComparisonResponse = {
      cityA,
      cityB,
      categories: parsed.categories,
      summary: parsed.summary,
      disclaimer: 'Gun rights data is presented factually without scoring. This comparison is intentionally excluded from the LIFE SCORE freedom index because the question of whether gun access represents more freedom or less freedom is deeply personal and politically polarizing.',
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('[GUN-COMPARISON] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate gun comparison',
    });
  }
}
