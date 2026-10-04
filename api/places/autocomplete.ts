/**
 * LIFE SCORE - search for a city beyond the built-in list (Google Places).
 *
 * POST /api/places/autocomplete  { "input": "Tbilisi" }
 *   → { configured: true, cities: [{ placeId, city, region?, country }] }
 *   → { configured: false, cities: [] } when GOOGLE_PLACES_API_KEY is not set
 *
 * The city picker calls this only when the user asks to "search everywhere"
 * (never on each keystroke), signed in. The typed text is all Google receives
 * (src/legal/subProcessors.ts). John, 4 Oct 2026: compare any two cities in
 * the world.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../shared/cors.js';
import { applyRateLimit } from '../shared/rateLimit.js';
import { requireAuth } from '../shared/auth.js';
import { asRecord, text } from '../shared/jsonRead.js';
import { placesConfigured, searchPlaceCities } from '../shared/googlePlaces.js';

/** The longest search text accepted. */
const MAX_INPUT_CHARS = 100;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req.headers, 'places-autocomplete', 'standard', res)) return;
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // Printable text only (no line breaks or other control characters), trimmed and bounded
  const input = (text(asRecord(req.body).input) ?? '').trim();
  const hasControl = [...input].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127);
  if (hasControl || input.length < 2 || input.length > MAX_INPUT_CHARS) {
    res.status(400).json({ error: `input must be 2-${MAX_INPUT_CHARS} characters` });
    return;
  }

  if (!placesConfigured()) {
    res.status(200).json({ configured: false, cities: [] });
    return;
  }

  const result = await searchPlaceCities(input);
  if (!result.ok) {
    console.error(`[places] ${result.kind}${result.status ? ` ${result.status}` : ''}: ${result.message}`);
    res.status(502).json({ error: 'City search is unavailable right now', configured: true, cities: [] });
    return;
  }
  res.status(200).json({ configured: true, cities: result.cities });
}
