/**
 * LIFE SCORE - Persist Video to Supabase Storage
 *
 * Downloads a video from a temporary provider CDN (Replicate, Kling, Minimax)
 * and uploads it to Supabase Storage for permanent public access.
 *
 * Provider CDN URLs typically expire in 24-48 hours. This module ensures
 * videos are stored permanently in Supabase Storage buckets.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { createClient } from '@supabase/supabase-js';

const DOWNLOAD_TIMEOUT_MS = 30000; // 30 seconds to download from provider CDN
const UPLOAD_TIMEOUT_MS = 30000;   // 30 seconds to upload to Supabase Storage

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

/**
 * Check if a URL is already a permanent Supabase Storage URL.
 * If so, no need to re-persist.
 */
function isSupabaseUrl(url: string): boolean {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  return !!supabaseUrl && url.startsWith(supabaseUrl);
}

/**
 * Download video from a temporary provider URL, upload to Supabase Storage,
 * and return the permanent public URL.
 *
 * @param providerUrl - Temporary URL from Replicate, Kling, Minimax, etc.
 * @param bucket - Supabase Storage bucket name (e.g. 'judge-videos', 'court-order-videos')
 * @param filePath - Path within the bucket (e.g. 'abc123-1706000000.mp4')
 * @returns Permanent Supabase public URL, or the original URL if persistence fails
 */
export async function persistVideoToStorage(
  providerUrl: string,
  bucket: string,
  filePath: string
): Promise<string> {
  // Skip if already a permanent Supabase URL
  if (isSupabaseUrl(providerUrl)) {
    console.log('[PERSIST-VIDEO] URL is already permanent Supabase URL, skipping');
    return providerUrl;
  }

  console.log('[PERSIST-VIDEO] Downloading from provider CDN:', providerUrl.slice(0, 80) + '...');
  console.log('[PERSIST-VIDEO] Target bucket:', bucket, 'path:', filePath);

  try {
    // Step 1: Download video from provider CDN
    const downloadController = new AbortController();
    const downloadTimeout = setTimeout(() => downloadController.abort(), DOWNLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(providerUrl, {
        signal: downloadController.signal,
      });
      clearTimeout(downloadTimeout);
    } catch (err) {
      clearTimeout(downloadTimeout);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PERSIST-VIDEO] Download failed:', msg);
      // Return original URL as fallback - it may still be valid for a while
      return providerUrl;
    }

    if (!response.ok) {
      console.error('[PERSIST-VIDEO] Download HTTP error:', response.status, response.statusText);
      return providerUrl;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const sizeKB = Math.round(buffer.length / 1024);

    console.log('[PERSIST-VIDEO] Downloaded:', sizeKB, 'KB');

    if (buffer.length === 0) {
      console.error('[PERSIST-VIDEO] Downloaded file is empty, keeping provider URL');
      return providerUrl;
    }

    // Step 2: Upload to Supabase Storage
    const uploadController = new AbortController();
    const uploadTimeout = setTimeout(() => uploadController.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, buffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      clearTimeout(uploadTimeout);

      if (uploadError) {
        console.error('[PERSIST-VIDEO] Upload error:', uploadError.message);
        return providerUrl;
      }
    } catch (err) {
      clearTimeout(uploadTimeout);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PERSIST-VIDEO] Upload failed:', msg);
      return providerUrl;
    }

    // Step 3: Get permanent public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const permanentUrl = publicUrlData.publicUrl;
    console.log('[PERSIST-VIDEO] Persisted successfully:', permanentUrl);

    return permanentUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PERSIST-VIDEO] Unexpected error:', msg);
    // Return original URL as fallback
    return providerUrl;
  }
}

/**
 * Non-blocking version of persistVideoToStorage.
 * Fires the download+upload in the background and calls onComplete when done.
 * Returns immediately so the API response is not delayed.
 *
 * @param providerUrl - Temporary URL from provider CDN
 * @param bucket - Supabase Storage bucket name
 * @param filePath - Path within the bucket
 * @param onComplete - Callback with the permanent URL (or original on failure)
 */
export function persistVideoInBackground(
  providerUrl: string,
  bucket: string,
  filePath: string,
  onComplete: (permanentUrl: string) => void
): void {
  // Skip if already permanent
  if (isSupabaseUrl(providerUrl)) {
    onComplete(providerUrl);
    return;
  }

  persistVideoToStorage(providerUrl, bucket, filePath)
    .then((permanentUrl) => {
      onComplete(permanentUrl);
    })
    .catch((err) => {
      console.error('[PERSIST-VIDEO] Background persistence failed:', err);
      onComplete(providerUrl); // Fallback to original
    });
}
