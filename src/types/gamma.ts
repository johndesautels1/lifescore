/**
 * LIFE SCORE™ Gamma API Types
 * Type definitions for Gamma presentation generation
 */

// ============================================================================
// GAMMA API REQUEST TYPES
// ============================================================================

/**
 * Text generation options
 */
export interface GammaTextOptions {
  amount?: 'brief' | 'medium' | 'detailed' | 'extensive';
  tone?: string;      // 1-500 chars, e.g., "professional, data-driven"
  audience?: string;  // 1-500 chars, e.g., "digital nomads, expats"
  language?: string;  // e.g., "en"
}

/**
 * Image generation options
 */
export interface GammaImageOptions {
  source?: 'aiGenerated' | 'unsplash' | 'noImages' | 'pictographic';
  model?:
    | 'flux-1-quick'       // 2 credits - Flux Fast 1.1
    | 'imagen-3-flash'     // 2 credits - Imagen 3 Fast
    | 'flux-1-pro'         // 8 credits - Flux Pro
    | 'imagen-3-pro'       // 8 credits - Imagen 3
    | 'imagen-4-pro'       // 20 credits - Imagen 4 (recommended)
    | 'ideogram-v3'        // 20 credits - Ideogram 3
    | 'recraft-v3';        // 20 credits - Recraft
  style?: string;  // 1-500 chars, e.g., "professional infographics"
}

/**
 * Card/slide options
 */
export interface GammaCardOptions {
  dimensions?: 'fluid' | '16x9' | '4x3';
  headerFooter?: {
    topRight?: { type: 'image'; source: 'custom'; src: string; size: 'sm' | 'md' | 'lg' };
    bottomRight?: { type: 'cardNumber' };
    bottomLeft?: { type: 'text'; value: string };
    hideFromFirstCard?: boolean;
  };
}

/**
 * Sharing options
 */
export interface GammaSharingOptions {
  workspaceAccess?: 'view' | 'comment' | 'edit' | 'fullAccess';
  externalAccess?: 'noAccess' | 'view' | 'comment' | 'edit';
}

/**
 * Request body for POST /generations (create from scratch)
 */
export interface GammaGenerationRequest {
  inputText: string;                          // Required: 1-100,000 tokens
  textMode: 'generate' | 'condense' | 'preserve';  // Required
  format?: 'presentation' | 'document' | 'webpage' | 'social';
  themeId?: string;
  numCards?: number;                          // Pro: 1-60, Ultra: 1-75
  cardSplit?: 'auto' | 'inputTextBreaks';
  additionalInstructions?: string;            // 1-2000 chars
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx';
  textOptions?: GammaTextOptions;
  imageOptions?: GammaImageOptions;
  cardOptions?: GammaCardOptions;
  sharingOptions?: GammaSharingOptions;
}

/**
 * Request body for POST /generations/from-template (RECOMMENDED)
 */
export interface GammaTemplateRequest {
  gammaId: string;                            // Required: Template ID
  prompt: string;                             // Required: Data + instructions (1-100,000 tokens)
  themeId?: string;                           // Override template theme
  folderIds?: string[];
  exportAs?: 'pdf' | 'pptx';
  imageOptions?: GammaImageOptions;
  sharingOptions?: GammaSharingOptions;
}

// ============================================================================
// GAMMA API RESPONSE TYPES
// ============================================================================

/**
 * Generation status values
 */
export type GammaGenerationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Response from POST /generations or /generations/from-template
 */
export interface GammaGenerationResponse {
  generationId: string;
  warnings?: string;
}

/**
 * Response from GET /generations/{id}
 */
export interface GammaStatusResponse {
  id: string;
  status: GammaGenerationStatus;
  url?: string;           // Link to editable gamma (when completed)
  pdfUrl?: string;        // PDF download URL (when completed + requested)
  pptxUrl?: string;       // PPTX download URL (when completed + requested)
  error?: string;         // Error message (when failed)
}

/**
 * Theme object from GET /themes
 */
export interface GammaTheme {
  id: string;
  name: string;
  // Additional fields may exist
}

/**
 * Folder object from GET /folders
 */
export interface GammaFolder {
  id: string;
  name: string;
  // Additional fields may exist
}

/**
 * Paginated response for list endpoints
 */
export interface GammaPaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
}

// ============================================================================
// GAMMA API ERROR TYPES
// ============================================================================

export interface GammaErrorResponse {
  message: string;
  statusCode: number;
}

/**
 * Error code meanings:
 * 400 - Invalid parameters
 * 401 - Invalid API key
 * 403 - No credits left
 * 404 - Generation ID not found
 * 422 - Failed to generate (empty output)
 * 429 - Rate limited
 * 500 - Server error
 * 502 - Gateway error
 */

// ============================================================================
// LIFE SCORE VISUAL REPORT TYPES
// ============================================================================

/**
 * Visual report generation request (client to our API)
 */
export interface VisualReportRequest {
  comparisonId: string;
  exportFormat?: 'pdf' | 'pptx';
}

/**
 * Visual report generation response
 */
export interface VisualReportResponse {
  generationId: string;
  status: GammaGenerationStatus;
  url?: string;
  pdfUrl?: string;
  pptxUrl?: string;
  pdfStoragePath?: string;
  pptxStoragePath?: string;
  error?: string;
}

/**
 * Visual report state for UI
 */
export interface VisualReportState {
  status: 'idle' | 'generating' | 'polling' | 'completed' | 'error';
  generationId?: string;
  gammaUrl?: string;
  pdfUrl?: string;
  pptxUrl?: string;
  pdfStoragePath?: string;
  pptxStoragePath?: string;
  error?: string;
  progress?: number;  // 0-100 for progress bar
  statusMessage?: string;  // Progressive status message for enhanced reports
}
