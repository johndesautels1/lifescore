/**
 * LIFE SCORE - Persist Replicate Video to Supabase Storage
 *
 * Downloads a video from a temporary Replicate CDN URL and uploads it to
 * permanent Supabase Storage. Returns the permanent public URL.
 *
 * Replicate delivery URLs expire after ~1 hour. This function must be
 * called immediately when Replicate reports completion (via webhook or
 * polling) before the URL expires.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { createClient } from '@supabase/supabase-js';

const STORAGE_BUCKET = 'judge-videos';
const DOWNLOAD_TIMEOUT_MS = 30000; // 30s to download from Replicate
const UPLOAD_TIMEOUT_MS = 30000;   // 30s to upload to Supabase

/**
 * Download video from Replicate CDN and upload to Supabase Storage.
 *
 * @param replicateUrl  Temporary Replicate delivery URL (expires ~1h)
 * @param comparisonId  Unique comparison identifier for the filename
 * @param supabaseAdmin Supabase client with service_role key
 * @returns Object with permanent public URL and storage path, or null on failure
 */
export async function persistVideoToStorage(
  replicateUrl: string,
  comparisonId: string,
  supabaseAdmin: ReturnType<typeof createClient>
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const storagePath = `${comparisonId}.mp4`;

  try {
    // Step 1: Download video from Replicate CDN
    console.log('[persistVideo] Downloading from Replicate:', replicateUrl.substring(0, 80) + '...');

    const downloadController = new AbortController();
    const downloadTimeout = setTimeout(() => downloadController.abort(), DOWNLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(replicateUrl, { signal: downloadController.signal });
      clearTimeout(downloadTimeout);
    } catch (err) {
      clearTimeout(downloadTimeout);
      const msg = err instanceof Error ? err.message : 'Unknown download error';
      console.error('[persistVideo] Download failed:', msg);
      return null;
    }

    if (!response.ok) {
      console.error('[persistVideo] Download HTTP error:', response.status, response.statusText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('[persistVideo] Downloaded:', buffer.length, 'bytes');

    if (buffer.length < 1000) {
      // Likely an error page, not a real video
      console.error('[persistVideo] Downloaded content too small, likely expired URL');
      return null;
    }

    // Step 2: Upload to Supabase Storage
    console.log('[persistVideo] Uploading to Supabase Storage:', storagePath);

    const uploadController = new AbortController();
    const uploadTimeout = setTimeout(() => uploadController.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'video/mp4',
          upsert: true, // Overwrite if exists (re-generation)
          cacheControl: '31536000', // 1 year cache (content is immutable per comparisonId)
        });

      clearTimeout(uploadTimeout);

      if (uploadError) {
        console.error('[persistVideo] Upload error:', uploadError.message);
        return null;
      }
    } catch (err) {
      clearTimeout(uploadTimeout);
      const msg = err instanceof Error ? err.message : 'Unknown upload error';
      console.error('[persistVideo] Upload failed:', msg);
      return null;
    }

    // Step 3: Get permanent public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log('[persistVideo] Persisted successfully:', publicUrl);

    return { publicUrl, storagePath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[persistVideo] Unexpected error:', msg);
    return null;
  }
}
