/**
 * LIFE SCORE™ Gamma API Endpoint
 * Vercel Serverless Function for generating visual reports
 *
 * POST - Create new generation from template
 * GET  - Check generation status (+ persist exports to Supabase Storage)
 *
 * When a generation completes with PDF/PPTX export URLs, this endpoint
 * immediately downloads and persists them to Supabase Storage. Export URLs
 * from Gamma's CDN expire after hours/days — permanent storage URLs don't.
 * This follows the same pattern as persistVideo.ts for judge/court-order videos.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { applyRateLimit } from './shared/rateLimit.js';
import { handleCors } from './shared/cors.js';
import { requireAuth } from './shared/auth.js';
import { fetchWithTimeout } from './shared/fetchWithTimeout.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const GAMMA_API_BASE = 'https://public-api.gamma.app/v1.0';
const GAMMA_TIMEOUT_MS = 60000;  // 60 seconds for API calls
const PERSIST_TIMEOUT_MS = 30000; // 30 seconds for download + upload
const STORAGE_BUCKET = 'gamma-exports'; // Dedicated public bucket for PDF/PPTX exports

// ============================================================================
// TYPES
// ============================================================================

interface GammaTemplateRequest {
  gammaId: string;
  prompt: string;
  themeId?: string;
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx';
  imageOptions?: {
    source?: string;
    model?: string;
    style?: string;
  };
  sharingOptions?: {
    workspaceAccess?: string;
    externalAccess?: string;
  };
}

interface GammaGenerationResponse {
  generationId: string;
  warnings?: string;
}

interface GammaStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  url?: string;
  gammaUrl?: string;  // Actual property name from Gamma API
  docUrl?: string;    // Alternative field name
  documentUrl?: string; // Another possible field name
  link?: string;      // Yet another possibility
  exportUrl?: string; // PPTX/PDF export URL from Gamma API
  pdfUrl?: string;
  pptxUrl?: string;
  error?: string;
}

interface PersistedExport {
  publicUrl: string;
  storagePath: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get Gamma API key from environment
 */
function getGammaApiKey(): string {
  const apiKey = process.env.GAMMA_API_KEY;
  if (!apiKey) {
    throw new Error('GAMMA_API_KEY not configured');
  }
  return apiKey;
}

/**
 * Get Gamma template ID from environment
 */
function getTemplateId(): string {
  const templateId = process.env.GAMMA_TEMPLATE_ID;
  if (!templateId) {
    throw new Error('GAMMA_TEMPLATE_ID not configured');
  }
  return templateId;
}

/**
 * Get Supabase admin client for server-side Storage uploads
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn('[GAMMA] Supabase not configured for export persistence');
    return null;
  }

  return createClient(url, serviceKey);
}

// ============================================================================
// EXPORT PERSISTENCE (Industry best practice: materialize ephemeral CDN URLs)
// ============================================================================

/**
 * Download a Gamma export (PDF/PPTX) from its CDN URL and upload to
 * permanent Supabase Storage. Returns the permanent public URL and path.
 *
 * Same pattern as api/shared/persistVideo.ts — download immediately before
 * the CDN URL expires, upload to Supabase Storage for permanent access.
 */
async function persistGammaExport(
  exportUrl: string,
  generationId: string,
  format: 'pdf' | 'pptx',
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<PersistedExport | null> {
  const storagePath = `${generationId}.${format}`;
  const contentType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

  try {
    // Step 1: Download from Gamma CDN
    console.log(`[GAMMA] Persisting ${format.toUpperCase()} export:`, exportUrl.substring(0, 80) + '...');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PERSIST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(exportUrl, { signal: controller.signal });
      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : 'Download failed';
      console.error(`[GAMMA] ${format.toUpperCase()} download failed:`, msg);
      return null;
    }

    if (!response.ok) {
      console.error(`[GAMMA] ${format.toUpperCase()} download HTTP error:`, response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[GAMMA] Downloaded ${format.toUpperCase()}:`, buffer.length, 'bytes');

    if (buffer.length < 1000) {
      console.error(`[GAMMA] ${format.toUpperCase()} content too small — likely expired URL`);
      return null;
    }

    // Step 2: Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: true, // Idempotent — safe to call on repeated polls
        cacheControl: '31536000', // 1 year cache (content is immutable per generationId)
      });

    if (uploadError) {
      console.error(`[GAMMA] ${format.toUpperCase()} upload error:`, uploadError.message);
      return null;
    }

    // Step 3: Get permanent public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`[GAMMA] ${format.toUpperCase()} persisted:`, publicUrlData.publicUrl);
    return { publicUrl: publicUrlData.publicUrl, storagePath };

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[GAMMA] ${format.toUpperCase()} persistence error:`, msg);
    return null;
  }
}

// ============================================================================
// GAMMA API CALLS
// ============================================================================

/**
 * Create generation from template
 */
async function createFromTemplate(
  prompt: string,
  exportAs?: 'pdf' | 'pptx'
): Promise<GammaGenerationResponse> {
  const apiKey = getGammaApiKey();
  const templateId = getTemplateId();

  const requestBody: GammaTemplateRequest = {
    gammaId: templateId,
    prompt: prompt,
    exportAs: exportAs || 'pdf',
    // Note: imageOptions.source is not allowed for from-template endpoint
    // Images will use template defaults or AI generation based on template settings
    sharingOptions: {
      workspaceAccess: 'view',
      externalAccess: 'view'
    }
  };

  // Add theme ID if configured (skip if it looks like an API key by mistake)
  const themeId = process.env.GAMMA_THEME_ID;
  if (themeId && !themeId.startsWith('sk-')) {
    requestBody.themeId = themeId;
  }

  // Add folder ID if configured
  const folderId = process.env.GAMMA_FOLDER_ID;
  if (folderId) {
    requestBody.folderIds = [folderId];
  }

  console.log('[GAMMA] Creating generation from template:', templateId);
  console.log('[GAMMA] Prompt length:', prompt.length, 'chars');

  const response = await fetchWithTimeout(
    `${GAMMA_API_BASE}/generations/from-template`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(requestBody),
    },
    GAMMA_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GAMMA] Create failed:', response.status, errorText);

    // Parse error message
    let errorMessage = `Gamma API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      // Use status-based message
      if (response.status === 401) errorMessage = 'Invalid Gamma API key';
      if (response.status === 403) errorMessage = 'No Gamma credits remaining';
      if (response.status === 429) errorMessage = 'Rate limited - try again later';
    }

    throw new Error(errorMessage);
  }

  const result = await response.json() as GammaGenerationResponse;
  console.log('[GAMMA] Generation started:', result.generationId);
  if (result.warnings) {
    console.warn('[GAMMA] Warnings:', result.warnings);
  }

  return result;
}

/**
 * Check generation status
 */
async function checkStatus(generationId: string): Promise<GammaStatusResponse> {
  const apiKey = getGammaApiKey();

  console.log('[GAMMA] Checking status for:', generationId);

  const response = await fetchWithTimeout(
    `${GAMMA_API_BASE}/generations/${encodeURIComponent(generationId)}`,
    {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
      },
    },
    GAMMA_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GAMMA] Status check failed:', response.status, errorText);

    if (response.status === 404) {
      throw new Error('Generation not found');
    }

    throw new Error(`Status check failed: ${response.status}`);
  }

  const result = await response.json() as GammaStatusResponse;
  console.log('[GAMMA] Status:', result.status);
  console.log('[GAMMA] Full response:', JSON.stringify(result, null, 2));

  return result;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS - restricted to same app (requires auth)
  if (handleCors(req, res, 'same-app', { methods: 'GET, POST, OPTIONS' })) return;

  // Rate limiting - light preset for report generation
  if (!applyRateLimit(req.headers, 'gamma', 'light', res)) {
    return; // 429 already sent
  }

  // Require authentication — uses Gamma API credits
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    // POST - Create new generation
    if (req.method === 'POST') {
      const { prompt, exportAs } = req.body || {};

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'prompt is required' });
        return;
      }

      if (prompt.length > 100000) {
        res.status(400).json({ error: 'prompt exceeds 100,000 character limit' });
        return;
      }

      const result = await createFromTemplate(prompt, exportAs);

      res.status(200).json({
        generationId: result.generationId,
        status: 'pending',
        warnings: result.warnings,
        // Cost tracking - Gamma charges per generation
        usage: {
          generationsUsed: 1,
          // Note: Gamma pricing varies by plan; this is for tracking, not billing
        }
      });
      return;
    }

    // GET - Check status
    if (req.method === 'GET') {
      const generationId = req.query.generationId as string;

      if (!generationId) {
        res.status(400).json({ error: 'generationId is required' });
        return;
      }

      const status = await checkStatus(generationId);

      // Map Gamma's response fields to our expected fields
      // Try all possible field names that Gamma might use for the document URL
      const gammaDocUrl = status.gammaUrl || status.url || status.docUrl || status.documentUrl || status.link;
      const exportUrl = status.exportUrl;

      // Log for debugging if URL is missing when completed
      if (status.status === 'completed' && !gammaDocUrl) {
        console.error('[GAMMA] WARNING: Completed but no URL found! Full response:', JSON.stringify(status, null, 2));
      }

      // Resolve export URLs
      const pdfUrl = exportUrl?.includes('.pdf') ? exportUrl : status.pdfUrl;
      const pptxUrl = exportUrl?.includes('.pptx') ? exportUrl : status.pptxUrl;

      // ====================================================================
      // PERSIST EXPORTS TO SUPABASE STORAGE (on completion)
      // Gamma CDN URLs expire — download immediately and store permanently.
      // Uses upsert:true so repeated polls are idempotent (no duplicate uploads).
      // If persistence fails, we still return the original CDN URLs as fallback.
      // ====================================================================
      let pdfStoragePath: string | undefined;
      let pdfPermanentUrl: string | undefined;
      let pptxStoragePath: string | undefined;
      let pptxPermanentUrl: string | undefined;

      if (status.status === 'completed' && (pdfUrl || pptxUrl)) {
        const supabaseAdmin = getSupabaseAdmin();

        if (supabaseAdmin) {
          // Persist PDF and PPTX in parallel for speed
          const [pdfResult, pptxResult] = await Promise.all([
            pdfUrl ? persistGammaExport(pdfUrl, generationId, 'pdf', supabaseAdmin) : null,
            pptxUrl ? persistGammaExport(pptxUrl, generationId, 'pptx', supabaseAdmin) : null,
          ]);

          if (pdfResult) {
            pdfPermanentUrl = pdfResult.publicUrl;
            pdfStoragePath = pdfResult.storagePath;
            console.log('[GAMMA] PDF persisted to permanent storage');
          }

          if (pptxResult) {
            pptxPermanentUrl = pptxResult.publicUrl;
            pptxStoragePath = pptxResult.storagePath;
            console.log('[GAMMA] PPTX persisted to permanent storage');
          }
        }
      }

      res.status(200).json({
        generationId: status.id || generationId,
        status: status.status,
        url: gammaDocUrl,
        // Return permanent Storage URLs if available, else original CDN URLs
        pdfUrl: pdfPermanentUrl || pdfUrl,
        pptxUrl: pptxPermanentUrl || pptxUrl,
        // Storage paths for database persistence
        pdfStoragePath,
        pptxStoragePath,
        error: status.error,
      });
      return;
    }

    // Method not allowed
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[GAMMA] Handler error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
}
