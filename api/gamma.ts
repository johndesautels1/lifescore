/**
 * LIFE SCORE™ Gamma API Endpoint
 * Vercel Serverless Function for generating visual reports
 *
 * POST - Create new generation from template
 * GET  - Check generation status
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ============================================================================
// CONSTANTS
// ============================================================================

const GAMMA_API_BASE = 'https://public-api.gamma.app/v1.0';
const GAMMA_TIMEOUT_MS = 30000;  // 30 seconds for API calls

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
  exportUrl?: string; // PPTX/PDF export URL from Gamma API
  pdfUrl?: string;
  pptxUrl?: string;
  error?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Fetch with timeout using AbortController
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
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
}

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
      const gammaDocUrl = status.gammaUrl || status.url;
      const exportUrl = status.exportUrl;
      
      res.status(200).json({
        generationId: status.id,
        status: status.status,
        url: gammaDocUrl,
        pdfUrl: exportUrl?.includes('.pdf') ? exportUrl : status.pdfUrl,
        pptxUrl: exportUrl?.includes('.pptx') ? exportUrl : status.pptxUrl,
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
