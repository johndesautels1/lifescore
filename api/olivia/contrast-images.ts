/**
 * Olivia Contrast Images API
 *
 * Generates AI contrast images using Flux (via Replicate) to visualize
 * the lived experience differences between two cities for specific metrics.
 *
 * Example: Cannabis legality metric
 * - City A (legal): Person enjoying coffee in a sunny cafe
 * - City B (illegal): Person looking worried near warning signs
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Replicate API configuration
const REPLICATE_API_URL = 'https://api.replicate.com/v1';
const FLUX_MODEL = 'black-forest-labs/flux-schnell'; // Fast, cheap model

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

// Initialize Supabase for caching
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

// Generate cache key for the image pair
const getCacheKey = (cityA: string, cityB: string, metricId: string): string => {
  return `contrast_${cityA.toLowerCase().replace(/\s+/g, '_')}_${cityB.toLowerCase().replace(/\s+/g, '_')}_${metricId}`;
};

// Check cache for existing images
async function checkCache(cacheKey: string): Promise<ContrastImageResponse | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('contrast_image_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single();

    if (error || !data) return null;

    // Check if cache is still valid (30 days)
    const cacheAge = Date.now() - new Date(data.created_at).getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    if (cacheAge > thirtyDays) {
      // Cache expired, delete it
      await supabase.from('contrast_image_cache').delete().eq('cache_key', cacheKey);
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

// Save to cache
async function saveToCache(
  cacheKey: string,
  response: ContrastImageResponse
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('contrast_image_cache').upsert({
      cache_key: cacheKey,
      city_a_url: response.cityAImage.url,
      city_a_caption: response.cityAImage.caption,
      city_b_url: response.cityBImage.url,
      city_b_caption: response.cityBImage.caption,
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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

    // Generate both images in parallel
    const [positiveUrl, negativeUrl] = await Promise.all([
      generateFluxImage(positivePrompt),
      generateFluxImage(negativePrompt),
    ]);

    // Build response with images assigned to correct cities
    const response: ContrastImageResponse = {
      cityAImage: {
        url: cityAIsBetter ? positiveUrl : negativeUrl,
        caption: cityAIsBetter
          ? `Freedom and ease in ${body.cityA.name}`
          : `Restrictions in ${body.cityA.name}`,
      },
      cityBImage: {
        url: cityAIsBetter ? negativeUrl : positiveUrl,
        caption: cityAIsBetter
          ? `Restrictions in ${body.cityB.name}`
          : `Freedom and ease in ${body.cityB.name}`,
      },
      topic: body.topic,
      cached: false,
    };

    // Save to cache for future requests
    await saveToCache(cacheKey, response);

    console.log(`[contrast-images] Successfully generated images for ${body.topic}`);
    res.status(200).json(response);

  } catch (error) {
    console.error('[contrast-images] Error:', error);
    res.status(500).json({
      error: 'Failed to generate contrast images',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
