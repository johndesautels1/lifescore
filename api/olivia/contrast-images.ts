/**
 * Olivia Contrast Images API
 *
 * Generates AI contrast images using Flux (via Replicate) to visualize
 * the lived experience differences between two cities for specific metrics.
 *
 * Images are downloaded from Replicate and stored permanently in Supabase
 * Storage so URLs never expire (Replicate CDN URLs expire after ~1 hour).
 *
 * Storage path: contrast-images/{cache_key}_a.webp / _b.webp
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import { requireAuth } from '../shared/auth.js';

// Replicate API configuration
const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const FLUX_MODEL = 'black-forest-labs/flux-schnell'; // Fast, cheap model

// Supabase Storage bucket for contrast images
const STORAGE_BUCKET = 'contrast-images';

interface ContrastImageRequest {
  topic: string;
  metricId: string;
  cityA: {
    name: string;
    score: number;
    context: string;
  };
  cityB: {
    name: string;
    score: number;
    context: string;
  };
  conversationContext?: string;
}

interface ContrastImageResponse {
  cityAImage: {
    url: string;
    caption: string;
  };
  cityBImage: {
    url: string;
    caption: string;
  };
  topic: string;
  cached: boolean;
}

// Initialize Supabase for caching + storage
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

// Generate cache key for the image pair
// Sort cities alphabetically so "Austin vs Denver" and "Denver vs Austin"
// share the same cache key — contrast images are symmetric and order-independent
const getCacheKey = (cityA: string, cityB: string, metricId: string): string => {
  const [a, b] = [cityA.toLowerCase().replace(/\s+/g, '_'), cityB.toLowerCase().replace(/\s+/g, '_')].sort();
  return `contrast_${a}_${b}_${metricId}`;
};

// Get the public URL for a file in Supabase Storage
function getStoragePublicUrl(supabaseUrl: string, storagePath: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`;
}

// Download an image from a URL and return as Buffer
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/webp';
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, contentType };
}

// Upload an image to Supabase Storage and return the public URL
async function uploadToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return null;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      cacheControl: '31536000', // 1 year cache (immutable content)
      upsert: true, // Overwrite if regenerated
    });

  if (error) {
    console.error(`[contrast-images] Storage upload failed for ${storagePath}:`, error.message);
    return null;
  }

  return getStoragePublicUrl(supabaseUrl, storagePath);
}

// Download from Replicate and persist to Supabase Storage
async function persistImage(
  replicateUrl: string,
  storagePath: string
): Promise<string> {
  try {
    const { buffer, contentType } = await downloadImage(replicateUrl);
    const permanentUrl = await uploadToStorage(storagePath, buffer, contentType);

    if (permanentUrl) {
      console.log(`[contrast-images] Persisted to storage: ${storagePath}`);
      return permanentUrl;
    }
  } catch (err) {
    console.error(`[contrast-images] Persist failed, falling back to Replicate URL:`, err);
  }

  // Fallback: return the Replicate URL (will expire, but at least works short-term)
  return replicateUrl;
}

// Check cache for existing images
async function checkCache(cacheKey: string): Promise<ContrastImageResponse | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('contrast_image_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    // Check if cache is still valid (30 days)
    const cacheAge = Date.now() - new Date(data.created_at).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (cacheAge > thirtyDays) {
      // Cache expired — delete the storage files and the cache row
      await cleanupCacheEntry(supabase, cacheKey, data);
      return null;
    }

    return {
      cityAImage: { url: data.city_a_url, caption: data.city_a_caption },
      cityBImage: { url: data.city_b_url, caption: data.city_b_caption },
      topic: data.topic,
      cached: true,
    };
  } catch {
    return null;
  }
}

// Clean up expired cache entry and its storage files
async function cleanupCacheEntry(
  supabase: ReturnType<typeof createClient>,
  cacheKey: string,
  data: { city_a_storage_path?: string; city_b_storage_path?: string }
): Promise<void> {
  try {
    // Delete storage files if they exist
    const pathsToDelete = [data.city_a_storage_path, data.city_b_storage_path].filter(Boolean) as string[];
    if (pathsToDelete.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(pathsToDelete);
    }

    // Delete the cache row
    await supabase.from('contrast_image_cache').delete().eq('cache_key', cacheKey);
  } catch (err) {
    console.error('[contrast-images] Cache cleanup failed:', err);
  }
}

// Save to cache (now includes storage paths)
async function saveToCache(
  cacheKey: string,
  response: ContrastImageResponse,
  storagePaths: { cityA: string; cityB: string }
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('contrast_image_cache').upsert({
      cache_key: cacheKey,
      city_a_url: response.cityAImage.url,
      city_a_caption: response.cityAImage.caption,
      city_a_storage_path: storagePaths.cityA,
      city_b_url: response.cityBImage.url,
      city_b_caption: response.cityBImage.caption,
      city_b_storage_path: storagePaths.cityB,
      topic: response.topic,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[contrast-images] Cache save failed:', err);
  }
}

// Generate image using Flux via Replicate
async function generateFluxImage(prompt: string): Promise<string> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  // Start the prediction
  const createResponse = await fetch(`${REPLICATE_API_URL}/models/${FLUX_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${replicateToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 80,
      },
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
  }

  const prediction = await createResponse.json();

  // Poll for completion (Flux Schnell is fast, usually 5-10 seconds)
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds max

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(prediction.urls.get, {
      headers: {
        'Authorization': `Bearer ${replicateToken}`,
      },
    });

    if (!statusResponse.ok) {
      throw new Error(`Failed to check prediction status: ${statusResponse.status}`);
    }

    const status = await statusResponse.json();

    if (status.status === 'succeeded') {
      // Flux returns array of URLs
      const imageUrl = Array.isArray(status.output) ? status.output[0] : status.output;
      return imageUrl;
    }

    if (status.status === 'failed') {
      throw new Error(`Image generation failed: ${status.error || 'Unknown error'}`);
    }

    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  throw new Error('Image generation timed out');
}

// Build Flux prompt for positive scenario (high score city)
function buildPositivePrompt(topic: string, cityName: string, context: string): string {
  return `Photorealistic scene in ${cityName}. ${context}.
A person looking relaxed and happy, enjoying everyday freedom.
Warm natural lighting, modern urban setting, lifestyle photography style.
No text, no logos, no watermarks. Safe for all audiences.`;
}

// Build Flux prompt for negative scenario (low score city)
function buildNegativePrompt(topic: string, cityName: string, context: string): string {
  return `Photorealistic scene in ${cityName}. ${context}.
A person looking concerned or restricted, facing bureaucratic challenges.
Cooler lighting, more formal or institutional setting, documentary photography style.
No text, no logos, no watermarks. Safe for all audiences. No graphic content.`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS — restricted to same-app (was open '*', security fix)
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // JWT auth — reject unauthenticated requests
  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const body = req.body as ContrastImageRequest;

    // Validate request
    if (!body.topic || !body.metricId || !body.cityA || !body.cityB) {
      res.status(400).json({
        error: 'Missing required fields: topic, metricId, cityA, cityB'
      });
      return;
    }

    console.log(`[contrast-images] Generating images for ${body.topic}: ${body.cityA.name} vs ${body.cityB.name}`);

    // Check cache first
    const cacheKey = getCacheKey(body.cityA.name, body.cityB.name, body.metricId);
    const cached = await checkCache(cacheKey);

    if (cached) {
      console.log(`[contrast-images] Cache hit for ${cacheKey}`);
      res.status(200).json(cached);
      return;
    }

    // Determine which city has better score (higher = more freedom)
    const cityAIsBetter = body.cityA.score >= body.cityB.score;

    const positiveCity = cityAIsBetter ? body.cityA : body.cityB;
    const negativeCity = cityAIsBetter ? body.cityB : body.cityA;

    // Build prompts
    const positivePrompt = buildPositivePrompt(
      body.topic,
      positiveCity.name,
      positiveCity.context
    );
    const negativePrompt = buildNegativePrompt(
      body.topic,
      negativeCity.name,
      negativeCity.context
    );

    // Generate both images in parallel via Replicate
    const [positiveReplicateUrl, negativeReplicateUrl] = await Promise.all([
      generateFluxImage(positivePrompt),
      generateFluxImage(negativePrompt),
    ]);

    // Storage paths for permanent storage
    const cityAStoragePath = `${cacheKey}_a.webp`;
    const cityBStoragePath = `${cacheKey}_b.webp`;

    // Download from Replicate and upload to Supabase Storage (in parallel)
    const cityAReplicateUrl = cityAIsBetter ? positiveReplicateUrl : negativeReplicateUrl;
    const cityBReplicateUrl = cityAIsBetter ? negativeReplicateUrl : positiveReplicateUrl;

    const [cityAPermanentUrl, cityBPermanentUrl] = await Promise.all([
      persistImage(cityAReplicateUrl, cityAStoragePath),
      persistImage(cityBReplicateUrl, cityBStoragePath),
    ]);

    // Build response with permanent Supabase Storage URLs
    const response: ContrastImageResponse = {
      cityAImage: {
        url: cityAPermanentUrl,
        caption: cityAIsBetter
          ? `Freedom and ease in ${body.cityA.name}`
          : `Restrictions in ${body.cityA.name}`,
      },
      cityBImage: {
        url: cityBPermanentUrl,
        caption: cityAIsBetter
          ? `Restrictions in ${body.cityB.name}`
          : `Freedom and ease in ${body.cityB.name}`,
      },
      topic: body.topic,
      cached: false,
    };

    // Save to cache with storage paths for future cleanup
    await saveToCache(cacheKey, response, {
      cityA: cityAStoragePath,
      cityB: cityBStoragePath,
    });

    console.log(`[contrast-images] Successfully generated and persisted images for ${body.topic}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('[contrast-images] Error:', error);
    res.status(500).json({
      error: 'Failed to generate contrast images',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
