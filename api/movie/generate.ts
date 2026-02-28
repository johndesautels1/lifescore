/**
 * LIFE SCORE - InVideo Movie Generator
 * Stage 2 of the InVideo Moving Movie pipeline.
 *
 * POST /api/movie/generate — Submit screenplay to InVideo MCP for rendering
 * GET  /api/movie/generate?movieId=X — Check status / get video URL
 *
 * Integration with InVideo via their MCP server (https://mcp.invideo.io/sse).
 * Uses the generate-video-from-script tool to create 10-minute cinematic movies.
 *
 * Falls back to storing the generation prompt for manual InVideo paste
 * if the MCP connection is unavailable.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';
import { applyRateLimit } from '../shared/rateLimit.js';
import { fetchWithTimeout } from '../shared/fetchWithTimeout.js';
import type { Screenplay, ScreenplayScene } from './screenplay.js';

export const config = {
  maxDuration: 300,  // Vercel Pro: 5 min for MCP connection + submission
};

// ============================================================================
// SUPABASE CLIENT
// ============================================================================

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Developer bypass emails from env var (same as grok-generate.ts)
const DEV_BYPASS_EMAILS = (process.env.DEV_BYPASS_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// ============================================================================
// INVIDEO MCP INTEGRATION
// ============================================================================

/**
 * Build the full InVideo-ready prompt from the structured screenplay.
 * Converts our JSON screenplay into the natural language prompt format
 * that InVideo's generate-video-from-script tool expects.
 */
function buildInVideoPromptFromScreenplay(
  screenplay: Screenplay,
  winnerCity: string,
  loserCity: string
): string {
  const { meta, scenes, productionNotes } = screenplay;

  const scenePrompts = scenes.map((scene: ScreenplayScene) => {
    return `--- ${scene.title.toUpperCase()} (${scene.timeStart} – ${scene.timeEnd}) ---
${scene.act}
Duration: ${scene.durationSeconds} seconds
Mood: ${scene.mood}
Music: ${scene.musicDirection}
Color Grade: ${scene.colorGrade}

VISUAL DIRECTION:
${scene.visualDirection}

VOICEOVER (2nd person — speaking directly to viewer):
"${scene.voiceover}"

ON-SCREEN TEXT:
${scene.onScreenText.map(t => `  • ${t}`).join('\n')}

STOCK FOOTAGE KEYWORDS: ${scene.stockKeywords.join(', ')}
${scene.primaryCategory ? `PRIMARY FREEDOM CATEGORY: ${scene.primaryCategory}` : ''}`;
  }).join('\n\n');

  return `
================================================================================
LIFE SCORE™ MOVING MOVIE — 10-MINUTE CINEMATIC SCREENPLAY
================================================================================

TITLE: ${meta.title}
SUBTITLE: ${meta.subtitle}
DURATION: EXACTLY 10 MINUTES (10:00)
SCENES: 12
WORD COUNT: ~${meta.totalWordCount} words voiceover

WINNER CITY: ${winnerCity}
LOSER CITY: ${loserCity}

STYLE: Cinematic, emotional, documentary-style
ASPECT RATIO: 16:9 (landscape)
QUALITY: 4K cinematic with color grading
MUSIC: ${meta.musicOverall}
VOICE: Warm, professional narrator — ALL 2ND PERSON ("you" / "your")

⚠️ CRITICAL PRODUCTION RULES:
1. SAME couple/protagonist in EVERY scene (casting continuity).
2. Scores shown on screen ONCE (Scene 5 only). After that, say "your LIFE SCORE."
3. ALL narration is 2nd person. NEVER use "they" or "the couple."
4. City-specific visuals — real landmarks, recognizable locations. NOT generic.
5. FREEDOM is the theme — weave it throughout every scene.
6. NEVER use the viewer's real name — always say "you" / "your" (stock footage actors, not the real person).

================================================================================
SCENE-BY-SCENE SCREENPLAY
================================================================================

${scenePrompts}

================================================================================
PRODUCTION NOTES
================================================================================

CASTING: ${productionNotes.castingContinuity}
COLOR ARC: ${productionNotes.colorGradingArc}
SCORES: ${productionNotes.scoreMention}
CTA: ${productionNotes.ctaText}
DISCLAIMER: ${productionNotes.disclaimer}

BRANDING:
  Company: Clues Intelligence LTD
  Product: LIFE SCORE™
  Accent Color: #D4AF37 (gold)
  Website: Cluesnomads.com
  Font: Modern sans-serif

================================================================================
`.trim();
}

/**
 * Call InVideo MCP server to generate a video.
 *
 * The InVideo MCP server exposes a generate-video-from-script tool
 * that accepts script, topic, and vibe parameters.
 *
 * We use a direct HTTP approach to the MCP SSE endpoint.
 */
async function submitToInVideoMCP(
  screenplay: Screenplay,
  winnerCity: string,
  loserCity: string
): Promise<{ videoId?: string; editUrl?: string; videoUrl?: string; status: string }> {
  const fullPrompt = buildInVideoPromptFromScreenplay(screenplay, winnerCity, loserCity);

  // The InVideo MCP server uses SSE at https://mcp.invideo.io/sse
  // We'll use the Streamable HTTP transport pattern
  const mcpEndpoint = process.env.INVIDEO_MCP_URL || 'https://mcp.invideo.io/mcp';

  try {
    // MCP protocol: Send a tools/call request
    // InVideo's generate-video-from-script requires ALL 5 parameters:
    // script, topic, vibe, targetAudience, platform
    const mcpRequest = {
      jsonrpc: '2.0',
      id: `lifescore-movie-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: 'generate-video-from-script',
        arguments: {
          script: fullPrompt,
          topic: `Freedom journey: ${winnerCity} vs ${loserCity} — LIFE SCORE 100 freedom metrics comparison`,
          vibe: 'cinematic, emotional, documentary, orchestral music, 2nd person narration, premium 4K quality',
          targetAudience: 'Adults 25-55 considering relocation, digital nomads, remote workers, freedom-seekers comparing cities for quality of life and personal liberty',
          platform: 'youtube',
        },
      },
    };

    const response = await fetchWithTimeout(
      mcpEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          ...(process.env.INVIDEO_API_KEY ? { 'Authorization': `Bearer ${process.env.INVIDEO_API_KEY}` } : {}),
        },
        body: JSON.stringify(mcpRequest),
      },
      280000 // 280s — just under Vercel Pro 300s limit for MCP submission
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MOVIE-GENERATE] InVideo MCP error:', response.status, errorText);
      throw new Error(`InVideo MCP returned ${response.status}: ${errorText}`);
    }

    const mcpResponse = await response.json();

    // Parse MCP response — the tool result contains the video info
    const result = mcpResponse.result?.content?.[0]?.text || mcpResponse.result || '';
    let parsed: Record<string, string> = {};
    try {
      parsed = typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      // Result might be a plain text URL or status message
      parsed = { status: 'submitted', message: String(result) };
    }

    return {
      videoId: parsed.video_id || parsed.videoId || parsed.id,
      editUrl: parsed.edit_url || parsed.editUrl || parsed.url,
      videoUrl: parsed.video_url || parsed.videoUrl,
      status: parsed.status || 'submitted',
    };
  } catch (error) {
    console.error('[MOVIE-GENERATE] InVideo MCP connection failed:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Return the prompt for manual use — the system is designed to work
    // even when InVideo MCP is unavailable.
    // Log the specific error so admins can diagnose (env vars, network, etc.)
    console.warn('[MOVIE-GENERATE] Falling back to screenplay_ready. Error:', errorMsg);
    console.warn('[MOVIE-GENERATE] Check: INVIDEO_MCP_URL and INVIDEO_API_KEY env vars');

    return {
      status: 'prompt_ready',
      error: 'Video service temporarily unavailable',
    };
  }
}

// ============================================================================
// TIER ACCESS CHECK — Moving Movies require SOVEREIGN tier
// (Same pattern as api/video/grok-generate.ts)
// ============================================================================

async function checkMovieTierAccess(userId: string): Promise<{
  allowed: boolean;
  tier: string;
  reason?: string;
}> {
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tier, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn('[MOVIE-GENERATE] Could not fetch user profile:', profileError?.message);
      return { allowed: false, tier: 'free', reason: 'Could not verify user tier' };
    }

    // Developer bypass — grant enterprise (SOVEREIGN) access to specified emails
    const userEmail = profile.email?.toLowerCase() || '';
    const isDeveloper = userEmail && DEV_BYPASS_EMAILS.includes(userEmail);
    if (isDeveloper) {
      console.log('[MOVIE-GENERATE] Developer bypass active for:', profile.email);
      return { allowed: true, tier: 'enterprise' };
    }

    const tier = profile.tier || 'free';
    if (tier !== 'enterprise') {
      return {
        allowed: false,
        tier,
        reason: `Moving Movies require SOVEREIGN tier. Current tier: ${tier.toUpperCase()}`,
      };
    }

    return { allowed: true, tier };
  } catch (error) {
    console.error('[MOVIE-GENERATE] Tier check error:', error);
    return { allowed: false, tier: 'unknown', reason: 'Tier check failed' };
  }
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app', { methods: 'GET, POST, OPTIONS' })) return;

  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── TIER GATING: SOVEREIGN only ──────────────────────────────────────
  const tierAccess = await checkMovieTierAccess(auth.userId);
  if (!tierAccess.allowed) {
    console.log('[MOVIE-GENERATE] Access denied for user:', auth.userId, tierAccess.reason);
    res.status(403).json({
      error: 'Access denied',
      reason: tierAccess.reason,
      tier: tierAccess.tier,
      upgradeRequired: true,
    });
    return;
  }
  console.log('[MOVIE-GENERATE] Access granted, tier:', tierAccess.tier);

  // ── GET: Check movie status ────────────────────────────────────────
  if (req.method === 'GET') {
    if (!applyRateLimit(req.headers, 'movie-status', 'standard', res)) return;

    const { movieId } = req.query;
    if (!movieId) {
      res.status(400).json({ error: 'movieId required' });
      return;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('movie_videos')
        .select('*')
        .eq('id', movieId as string)
        .single();

      if (error) {
        res.status(404).json({ error: 'Movie not found' });
        return;
      }

      res.status(200).json({
        status: data.status,
        videoUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
        editUrl: data.invideo_edit_url,
        durationSeconds: data.duration_seconds,
        screenplay: data.screenplay,
        generationPrompt: data.generation_prompt,
        winnerCity: data.winner_city,
        loserCity: data.loser_city,
        createdAt: data.created_at,
        completedAt: data.completed_at,
      });
    } catch (error) {
      console.error('[MOVIE-STATUS] Error:', error);
      res.status(500).json({ error: 'Status check failed' });
    }
    return;
  }

  // ── POST: Generate movie ───────────────────────────────────────────
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!applyRateLimit(req.headers, 'movie-generate', 'heavy', res)) return;

  try {
    const { screenplay, winnerCity, loserCity, winnerCountry, loserCountry,
            winnerScore, loserScore } = req.body;

    if (!screenplay || !winnerCity || !loserCity) {
      res.status(400).json({ error: 'screenplay, winnerCity, and loserCity are required' });
      return;
    }

    // Check for cached movie
    const { data: cached } = await supabaseAdmin.rpc('find_cached_movie', {
      p_winner_city: winnerCity,
      p_loser_city: loserCity,
    });

    if (cached && cached.length > 0 && cached[0].video_url) {
      console.log('[MOVIE-GENERATE] Cache hit for:', winnerCity, 'vs', loserCity);
      res.status(200).json({
        success: true,
        cached: true,
        movie: {
          id: cached[0].id,
          videoUrl: cached[0].video_url,
          thumbnailUrl: cached[0].thumbnail_url,
          status: 'completed',
          durationSeconds: cached[0].duration_seconds,
        },
      });
      return;
    }

    // Check for in-progress generation for same city pair
    const { data: inProgress } = await supabaseAdmin
      .from('movie_videos')
      .select('id, status, created_at')
      .eq('winner_city', winnerCity.toLowerCase())
      .eq('loser_city', loserCity.toLowerCase())
      .in('status', ['generating_screenplay', 'screenplay_ready', 'submitting_to_invideo', 'rendering'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (inProgress && inProgress.length > 0) {
      const age = Date.now() - new Date(inProgress[0].created_at).getTime();
      // If less than 30 minutes old, treat as still in progress
      if (age < 30 * 60 * 1000) {
        res.status(200).json({
          success: true,
          cached: false,
          inProgress: true,
          movie: { id: inProgress[0].id, status: inProgress[0].status },
        });
        return;
      }
    }

    // Build the full InVideo prompt from screenplay
    const generationPrompt = buildInVideoPromptFromScreenplay(
      screenplay as Screenplay,
      winnerCity,
      loserCity
    );

    // Create movie record
    const { data: movieRecord, error: insertError } = await supabaseAdmin
      .from('movie_videos')
      .insert({
        winner_city: winnerCity.toLowerCase(),
        loser_city: loserCity.toLowerCase(),
        winner_country: winnerCountry || null,
        loser_country: loserCountry || null,
        winner_score: winnerScore || null,
        loser_score: loserScore || null,
        screenplay,
        screenplay_word_count: screenplay.meta?.totalWordCount || null,
        generation_prompt: generationPrompt,
        generated_by: auth.userId,
        status: 'submitting_to_invideo',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[MOVIE-GENERATE] DB insert error:', insertError);
      res.status(500).json({ error: 'Failed to create movie record' });
      return;
    }

    console.log('[MOVIE-GENERATE] Created movie record:', movieRecord.id);

    // Submit to InVideo MCP
    const invideoResult = await submitToInVideoMCP(
      screenplay as Screenplay,
      winnerCity,
      loserCity
    );

    console.log('[MOVIE-GENERATE] InVideo result:', invideoResult);

    // Update record with InVideo response
    const newStatus = invideoResult.videoUrl
      ? 'completed'
      : invideoResult.videoId
        ? 'rendering'
        : invideoResult.status === 'prompt_ready'
          ? 'screenplay_ready'
          : 'rendering';

    const updateData: Record<string, unknown> = {
      status: newStatus,
      invideo_video_id: invideoResult.videoId || null,
      invideo_edit_url: invideoResult.editUrl || null,
      error: invideoResult.error || null,
    };

    if (invideoResult.videoUrl) {
      updateData.video_url = invideoResult.videoUrl;
      updateData.completed_at = new Date().toISOString();
    }

    await supabaseAdmin
      .from('movie_videos')
      .update(updateData)
      .eq('id', movieRecord.id);

    res.status(200).json({
      success: true,
      cached: false,
      movie: {
        id: movieRecord.id,
        status: newStatus,
        videoUrl: invideoResult.videoUrl || null,
        editUrl: invideoResult.editUrl || null,
        videoId: invideoResult.videoId || null,
        generationPrompt,
      },
    });
  } catch (error) {
    console.error('[MOVIE-GENERATE] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Movie generation failed',
    });
  }
}
