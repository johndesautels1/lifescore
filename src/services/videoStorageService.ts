/**
 * LIFE SCORE - Video Storage Service
 * Handles uploading user videos to Supabase Storage.
 *
 * Storage path: user-videos/{userId}/{comparisonId}-{timestamp}.{ext}
 * Bucket is public for reads, RLS-controlled for writes.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { supabase, isSupabaseConfigured, withRetry } from '../lib/supabase';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_BUCKET = 'user-videos';
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

// ============================================================================
// TYPES
// ============================================================================

export interface VideoUploadResult {
  storagePath: string;
  publicUrl: string;
}

export interface VideoUploadProgress {
  phase: 'validating' | 'uploading' | 'complete' | 'error';
  message: string;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported format: ${file.type || 'unknown'}. Use MP4, WebM, MOV, AVI, or MKV.`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File too large (${sizeMB}MB). Maximum is ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  return { valid: true };
}

// ============================================================================
// UPLOAD
// ============================================================================

/**
 * Upload a user video to Supabase Storage.
 *
 * @param userId - The authenticated user's ID
 * @param comparisonId - The comparison this video belongs to
 * @param file - The video file to upload
 * @param onProgress - Optional progress callback
 * @returns The storage path and public URL
 */
export async function uploadUserVideo(
  userId: string,
  comparisonId: string,
  file: File,
  onProgress?: (progress: VideoUploadProgress) => void
): Promise<VideoUploadResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database not configured. Video upload requires Supabase.');
  }

  // Validate
  onProgress?.({ phase: 'validating', message: 'Checking video file...' });
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Build storage path: {userId}/{comparisonId}-{timestamp}.{ext}
  const ext = getFileExtension(file);
  const timestamp = Date.now();
  const storagePath = `${userId}/${comparisonId}-${timestamp}.${ext}`;

  // Upload
  onProgress?.({ phase: 'uploading', message: 'Uploading video...' });
  console.log('[VideoStorage] Uploading to:', storagePath, `(${(file.size / (1024 * 1024)).toFixed(1)}MB)`);

  const { error: uploadError } = await withRetry(
    () => supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year cache (immutable content)
        upsert: false,
      }),
    {
      timeoutMs: 120000, // 2 minutes for large videos
      operationName: 'Upload user video',
      maxRetries: 2,
    }
  );

  if (uploadError) {
    console.error('[VideoStorage] Upload failed:', uploadError);
    // FIX: Provide user-friendly message for Supabase bucket size limit
    const msg = uploadError.message || '';
    if (msg.includes('exceeded') && msg.includes('size')) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`Video too large (${sizeMB}MB). Supabase storage limit exceeded. Try compressing the video or using a shorter clip (under 50MB).`);
    }
    throw new Error(`Upload failed: ${msg}`);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get video URL after upload');
  }

  console.log('[VideoStorage] Upload complete:', urlData.publicUrl);
  onProgress?.({ phase: 'complete', message: 'Video uploaded!' });

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
  };
}

// ============================================================================
// RETRIEVAL
// ============================================================================

/**
 * Get the public URL for a stored video by its storage path.
 */
export function getVideoPublicUrl(storagePath: string): string | null {
  if (!storagePath) return null;

  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data?.publicUrl || null;
}

// ============================================================================
// DELETION
// ============================================================================

/**
 * Delete a user video from Supabase Storage.
 */
export async function deleteUserVideo(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured() || !storagePath) return;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error('[VideoStorage] Delete failed:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }

  console.log('[VideoStorage] Deleted:', storagePath);
}

// ============================================================================
// HELPERS
// ============================================================================

function getFileExtension(file: File): string {
  // Try from filename first
  const nameExt = file.name.split('.').pop()?.toLowerCase();
  if (nameExt && ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(nameExt)) {
    return nameExt;
  }

  // Fallback from MIME type
  const mimeMap: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
  };

  return mimeMap[file.type] || 'mp4';
}
