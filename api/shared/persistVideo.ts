/**
 * LIFE SCORE - Persist Video to Supabase Storage
 * Supports judge-videos and court-order-videos buckets
 *
 * Downloads a video from a temporary provider CDN URL (Replicate, Kling, etc.)
 * and uploads it to permanent Supabase Storage. Returns the permanent public URL.
 *
 * Provider CDN URLs expire (Replicate ~1h, Kling varies). This function must be
 * called immediately when a provider reports completion (via webhook or polling)
 * before the URL expires.
 *
 * Used by:
 *  - Judge's Verdict (avatar_videos) → 'judge-videos' bucket
 *  - Court Order Videos (grok_videos) → 'court-order-videos' bucket
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { createClient } from '@supabase/supabase-js';

const DEFAULT_STORAGE_BUCKET = 'judge-videos';
const DOWNLOAD_TIMEOUT_MS = 120000; // 120s to download large video files from provider CDN
const UPLOAD_TIMEOUT_MS = 120000;   // 120s to upload large video files to Supabase

/**
 * Download video from a provider CDN and upload to Supabase Storage.
 *
 * @param providerUrl   Temporary provider CDN URL (expires after hours)
 * @param comparisonId  Unique identifier for the filename
 * @param supabaseAdmin Supabase client with service_role key
 * @param bucket        Storage bucket name (default: 'judge-videos')
 * @returns Object with permanent public URL and storage path, or null on failure
 */
export async function persistVideoToStorage(
  providerUrl: string,
  comparisonId: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  bucket: string = DEFAULT_STORAGE_BUCKET
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const storagePath = `${comparisonId}.mp4`;

  try {
    // Step 1: Download video from provider CDN
    console.log('[persistVideo] Downloading from provider CDN:', providerUrl.substring(0, 80) + '...', '→ bucket:', bucket);

    const downloadController = new AbortController();
    const downloadTimeout = setTimeout(() => downloadController.abort(), DOWNLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(providerUrl, { signal: downloadController.signal });
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
        .from(bucket)
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
      .from(bucket)
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
