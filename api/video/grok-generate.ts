/**
 * LIFE SCORE - Grok Video Generation API
 *
 * Generates videos using Grok Imagine API with Replicate fallback.
 * Supports "New Life Videos" (winner/loser pair) and "Court Order" (perfect life).
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { handleCors } from '../shared/cors.js';
import crypto from 'crypto';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const config = {
  maxDuration: 240, // 4 minutes for sequential video generation (loser + winner)
};

// Grok API configuration
const GROK_API_URL = process.env.GROK_API_URL || 'https://api.x.ai/v1';
const GROK_VIDEO_ENDPOINT = '/videos/generations'; // TBD - confirm exact endpoint

// Kling AI - Primary video generation (high quality, 5-10 sec videos with sound)
const KLING_API_URL = 'https://api-singapore.klingai.com';
const KLING_MODEL = 'kling-v2-6'; // Latest model with sound support

// Replicate fallback - text-to-video model (if Kling fails)
const REPLICATE_API_URL = 'https://api.replicate.com/v1';
// Use Minimax Video-01 for high-quality text-to-video generation
const REPLICATE_VIDEO_MODEL = 'minimax/video-01';

// Supabase client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

// Developer bypass emails - grants enterprise (SOVEREIGN) access
const DEV_BYPASS_EMAILS = (process.env.DEV_BYPASS_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// Hardcoded fallback for developer bypass (in case env var not set in Vercel)
const HARDCODED_BYPASS_EMAILS = ['brokerpinellas@gmail.com'];

// ============================================================================
// TYPES
// ============================================================================

type VideoType = 'winner_mood' | 'loser_mood' | 'perfect_life';
type CityType = 'beach' | 'mountain' | 'urban' | 'desert' | 'european' | 'tropical' | 'general';

interface NewLifeVideosRequest {
  action: 'new_life_videos';
  userId: string;
  comparisonId: string;
  winnerCity: string;
  loserCity: string;
  winnerCityType?: CityType;
  loserCityType?: CityType;
  forceRegenerate?: boolean;
}

interface CourtOrderVideoRequest {
  action: 'court_order_video';
  userId: string;
  comparisonId: string;
  winnerCity: string;
  cityType?: CityType;
}

type GenerateRequest = NewLifeVideosRequest | CourtOrderVideoRequest;

interface GrokVideoRecord {
  id: string;
  user_id: string;
  comparison_id: string;
  city_name: string;
  video_type: VideoType;
  prompt: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  status: string;
  provider: string;
  error_message: string | null;
  prediction_id: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// PROMPT GENERATION
// ============================================================================

function generatePrompt(cityName: string, videoType: VideoType, cityType: CityType = 'general'): string {
  // Get city-specific details for more accurate depiction
  const cityDetails = getCityDetails(cityName);

  const templates = {
    // WINNER: Paradise, freedom, prosperity, joy
    winner_mood: `Cinematic video of a happy, successful person experiencing ultimate freedom in ${cityName}. ${cityDetails.landmark ? `Famous ${cityDetails.landmark} visible in background.` : ''} Golden hour lighting, warm colors, person smiling genuinely, walking freely without restrictions. ${cityDetails.vibe || 'Vibrant atmosphere'}, locals friendly and relaxed, outdoor cafes with people laughing, clean streets, prosperous small businesses thriving. No visible bureaucracy, no lines, no stress. The person takes a deep breath of fresh air, arms open wide embracing liberty. Birds flying freely overhead. Text-free, no watermarks. 8 seconds, cinematic 4K quality, warm color grading.`,

    // LOSER: Oppressive, over-regulated, dystopian, stressed
    loser_mood: `Cinematic video of a stressed, overwhelmed person trapped in over-regulated ${cityName}. ${cityDetails.landmark ? `${cityDetails.landmark} looms ominously in grey background.` : ''} Cold, desaturated colors, overcast sky. Person looking frustrated, drowning in paperwork and forms. Long queues at government offices, security cameras everywhere, permit signs on every corner. Police presence visible, people rushing anxiously, no one smiling. Expensive parking meters, tax collection notices, "PROHIBITED" and "RESTRICTED" signs visible. The person checks their wallet - empty. Bureaucratic nightmare atmosphere, Orwellian undertones. Red tape literally tangling around them metaphorically. Text-free, no watermarks. 8 seconds, cinematic 4K quality, cold desaturated color grading.`,

    // PERFECT LIFE: Dream lifestyle in winning city
    perfect_life: {
      beach: `Cinematic paradise video: Person living their dream life in ${cityName}. ${cityDetails.landmark ? `${cityDetails.landmark} in distance.` : ''} Crystal clear turquoise water, pristine white sand beach at golden hour. Person relaxing in luxury beach chair, cocktail in hand, genuine smile of contentment. Palm trees swaying gently, yacht visible on horizon, dolphins jumping in distance. Zero stress, complete freedom, financial independence achieved. Warm tropical breeze, soft waves lapping shore. This is what escaping overregulation looks like. Text-free, no watermarks. 10 seconds, cinematic 4K, saturated warm colors.`,

      mountain: `Cinematic paradise video: Person living their dream life near ${cityName}. ${cityDetails.landmark ? `${cityDetails.landmark} visible.` : ''} Luxury mountain cabin with floor-to-ceiling windows overlooking pristine valley. Person on deck with hot coffee, wrapped in cozy blanket, breathing fresh mountain air. Snow-capped peaks glowing pink at sunrise, crystal clear lake below, eagles soaring. Complete peace, no government intrusion, true privacy and freedom. Fireplace smoke rising from chimney. This is what escaping overregulation looks like. Text-free, no watermarks. 10 seconds, cinematic 4K, crisp natural colors.`,

      urban: `Cinematic paradise video: Person living their dream life in ${cityName}. ${cityDetails.landmark ? `Iconic ${cityDetails.landmark} in background.` : ''} Stunning penthouse rooftop at sunset, person in elegant attire toasting champagne. City skyline glittering below, private infinity pool, modern luxury furnishings. Success achieved through freedom and opportunity. Vibrant nightlife energy beginning, city lights twinkling on. No bureaucratic obstacles, just pure achievement. Helicopter landing pad nearby. This is what thriving in a free city looks like. Text-free, no watermarks. 10 seconds, cinematic 4K, rich contrast lighting.`,

      desert: `Cinematic paradise video: Person living their dream life near ${cityName}. ${cityDetails.landmark ? `${cityDetails.landmark} visible.` : ''} Dramatic desert sunset, red and orange rock formations glowing. Person on luxury overlook terrace, modern desert architecture home behind them. Endless horizon, complete solitude by choice, zero restrictions. Convertible sports car parked nearby, open road beckoning. Starry sky beginning to appear. Ultimate freedom and adventure, self-reliance rewarded. This is what escaping overregulation looks like. Text-free, no watermarks. 10 seconds, cinematic 4K, dramatic warm colors.`,

      european: `Cinematic paradise video: Person living their dream life in ${cityName}. ${cityDetails.landmark ? `Beautiful ${cityDetails.landmark} in background.` : ''} Charming cobblestone street at golden hour, person at outdoor café with espresso, genuinely content smile. Historic architecture beautifully preserved, flowers in window boxes, church bells ringing softly. Local market with fresh produce, artisan shops, no chain stores. Community feeling, people greeting each other warmly. Vespa scooter parked nearby. Old world charm meets modern freedom. Text-free, no watermarks. 10 seconds, cinematic 4K, warm European color grading.`,

      tropical: `Cinematic paradise video: Person living their dream life in ${cityName}. ${cityDetails.landmark ? `${cityDetails.landmark} visible.` : ''} Lush tropical paradise, person in private villa with infinity pool overlooking jungle and ocean. Exotic birds, waterfalls nearby, hammock swaying. Fresh tropical fruit on table, gentle warm breeze. Complete escape from western bureaucracy, tax-free living, genuine relaxation. Staff bringing drinks, no worries visible on face. This is what financial and personal freedom looks like. Text-free, no watermarks. 10 seconds, cinematic 4K, lush saturated colors.`,

      general: `Cinematic paradise video: Person living their dream life in ${cityName}. ${cityDetails.landmark ? `${cityDetails.landmark} in background.` : ''} Golden hour, stunning scenic view of the city at its most beautiful. Person genuinely happy, successful, free. No stress, no bureaucratic burden, just pure contentment. Taking in the view, deep satisfying breath, arms open to embrace their new life. This is what choosing freedom looks like. Warm, inviting atmosphere, prosperity visible everywhere. Text-free, no watermarks. 10 seconds, cinematic 4K quality.`,
    },
  };

  if (videoType === 'perfect_life') {
    return templates.perfect_life[cityType] || templates.perfect_life.general;
  }

  return templates[videoType];
}

// City-specific details for accurate depictions
interface CityDetails {
  landmark?: string;
  vibe?: string;
  region: 'us' | 'europe' | 'asia' | 'latinam' | 'oceania' | 'other';
}

function getCityDetails(cityName: string): CityDetails {
  const nameLower = cityName.toLowerCase();

  // US Cities
  const usCities: Record<string, CityDetails> = {
    'miami': { landmark: 'Art Deco buildings of South Beach', vibe: 'Latin-infused beach party energy', region: 'us' },
    'tampa': { landmark: 'Tampa Riverwalk and Bayshore Boulevard', vibe: 'Relaxed Florida sunshine lifestyle', region: 'us' },
    'austin': { landmark: 'Texas State Capitol and Lady Bird Lake', vibe: 'Live music and tech startup energy', region: 'us' },
    'nashville': { landmark: 'Broadway honky-tonks and Ryman Auditorium', vibe: 'Country music and southern hospitality', region: 'us' },
    'denver': { landmark: 'Rocky Mountains and Red Rocks Amphitheatre', vibe: 'Outdoor adventure and craft beer culture', region: 'us' },
    'san diego': { landmark: 'Coronado Bridge and La Jolla Cove', vibe: 'Perfect weather beach lifestyle', region: 'us' },
    'phoenix': { landmark: 'Camelback Mountain and Sonoran Desert', vibe: 'Desert oasis and golf paradise', region: 'us' },
    'las vegas': { landmark: 'Las Vegas Strip and Bellagio Fountains', vibe: 'Entertainment capital energy', region: 'us' },
    'new york': { landmark: 'Statue of Liberty and Manhattan skyline', vibe: 'Fast-paced ambitious energy', region: 'us' },
    'los angeles': { landmark: 'Hollywood Sign and Santa Monica Pier', vibe: 'Entertainment industry glamour', region: 'us' },
    'chicago': { landmark: 'Cloud Gate Bean and Lake Michigan', vibe: 'Architecture and deep dish culture', region: 'us' },
    'san francisco': { landmark: 'Golden Gate Bridge', vibe: 'Tech innovation and steep hills', region: 'us' },
    'seattle': { landmark: 'Space Needle and Pike Place Market', vibe: 'Coffee culture and tech hub', region: 'us' },
    'boston': { landmark: 'Fenway Park and Freedom Trail', vibe: 'Historic American pride', region: 'us' },
    'new orleans': { landmark: 'French Quarter and St. Louis Cathedral', vibe: 'Jazz and Cajun celebration', region: 'us' },
    'houston': { landmark: 'Houston Space Center and downtown skyline', vibe: 'Energy industry prosperity', region: 'us' },
    'dallas': { landmark: 'Reunion Tower and AT&T Stadium', vibe: 'Big Texas business energy', region: 'us' },
    'atlanta': { landmark: 'Georgia Aquarium and Centennial Park', vibe: 'Southern business hub', region: 'us' },
    'orlando': { landmark: 'Theme park magic and palm trees', vibe: 'Family entertainment paradise', region: 'us' },
    'charleston': { landmark: 'Rainbow Row and historic plantations', vibe: 'Southern charm and hospitality', region: 'us' },
    'savannah': { landmark: 'Forsyth Park fountain and moss-draped oaks', vibe: 'Gothic southern elegance', region: 'us' },
    'honolulu': { landmark: 'Diamond Head and Waikiki Beach', vibe: 'Island paradise aloha spirit', region: 'us' },
    'anchorage': { landmark: 'Denali and Northern Lights', vibe: 'Last frontier wilderness', region: 'us' },
    'portland': { landmark: 'Mount Hood and Powell\'s Books', vibe: 'Quirky indie culture', region: 'us' },
    'salt lake': { landmark: 'Mormon Temple and Wasatch Mountains', vibe: 'Outdoor recreation paradise', region: 'us' },
  };

  // European Cities
  const europeCities: Record<string, CityDetails> = {
    'london': { landmark: 'Big Ben and Tower Bridge', vibe: 'Historic royal grandeur', region: 'europe' },
    'paris': { landmark: 'Eiffel Tower and Champs-Élysées', vibe: 'Romantic artistic elegance', region: 'europe' },
    'amsterdam': { landmark: 'Canal houses and bicycles', vibe: 'Liberal cycling culture', region: 'europe' },
    'barcelona': { landmark: 'Sagrada Familia and La Rambla', vibe: 'Mediterranean beach party', region: 'europe' },
    'madrid': { landmark: 'Royal Palace and Plaza Mayor', vibe: 'Spanish passion and nightlife', region: 'europe' },
    'rome': { landmark: 'Colosseum and Vatican', vibe: 'Ancient empire grandeur', region: 'europe' },
    'milan': { landmark: 'Duomo Cathedral and fashion district', vibe: 'High fashion sophistication', region: 'europe' },
    'florence': { landmark: 'Ponte Vecchio and Duomo', vibe: 'Renaissance art paradise', region: 'europe' },
    'venice': { landmark: 'Grand Canal and St. Mark\'s Square', vibe: 'Romantic waterway magic', region: 'europe' },
    'berlin': { landmark: 'Brandenburg Gate and Berlin Wall', vibe: 'Edgy artistic rebirth', region: 'europe' },
    'munich': { landmark: 'Marienplatz and beer gardens', vibe: 'Bavarian beer culture', region: 'europe' },
    'vienna': { landmark: 'Schönbrunn Palace and opera house', vibe: 'Classical music elegance', region: 'europe' },
    'prague': { landmark: 'Charles Bridge and Prague Castle', vibe: 'Fairy tale Gothic charm', region: 'europe' },
    'budapest': { landmark: 'Parliament Building and thermal baths', vibe: 'Danube elegance', region: 'europe' },
    'lisbon': { landmark: 'Belém Tower and yellow trams', vibe: 'Fado music melancholy beauty', region: 'europe' },
    'porto': { landmark: 'Dom Luís Bridge and port wine cellars', vibe: 'Port wine riverside charm', region: 'europe' },
    'dublin': { landmark: 'Temple Bar and Trinity College', vibe: 'Irish pub warmth', region: 'europe' },
    'edinburgh': { landmark: 'Edinburgh Castle and Royal Mile', vibe: 'Scottish highland mystery', region: 'europe' },
    'copenhagen': { landmark: 'Nyhavn and Little Mermaid', vibe: 'Hygge cozy design', region: 'europe' },
    'stockholm': { landmark: 'Gamla Stan and archipelago', vibe: 'Scandinavian sleek design', region: 'europe' },
    'oslo': { landmark: 'Opera House and fjords', vibe: 'Nordic nature meets modern', region: 'europe' },
    'helsinki': { landmark: 'Helsinki Cathedral and saunas', vibe: 'Finnish design minimalism', region: 'europe' },
    'zurich': { landmark: 'Lake Zurich and Alps backdrop', vibe: 'Swiss precision wealth', region: 'europe' },
    'geneva': { landmark: 'Jet d\'Eau fountain and UN headquarters', vibe: 'International diplomacy elegance', region: 'europe' },
    'brussels': { landmark: 'Grand Place and Atomium', vibe: 'EU bureaucratic center', region: 'europe' },
    'athens': { landmark: 'Acropolis and Parthenon', vibe: 'Ancient democracy birthplace', region: 'europe' },
    'santorini': { landmark: 'Blue domed churches and caldera', vibe: 'Greek island paradise', region: 'europe' },
    'nice': { landmark: 'Promenade des Anglais and azure coast', vibe: 'French Riviera glamour', region: 'europe' },
    'monaco': { landmark: 'Monte Carlo Casino and yacht harbor', vibe: 'Ultra-wealthy tax haven', region: 'europe' },
    'dubrovnik': { landmark: 'Old Town walls and Adriatic Sea', vibe: 'Game of Thrones medieval beauty', region: 'europe' },
  };

  // Check US cities
  for (const [city, details] of Object.entries(usCities)) {
    if (nameLower.includes(city)) {
      return details;
    }
  }

  // Check European cities
  for (const [city, details] of Object.entries(europeCities)) {
    if (nameLower.includes(city)) {
      return details;
    }
  }

  // Default
  return { region: 'other' };
}

function detectCityType(cityName: string): CityType {
  const nameLower = cityName.toLowerCase();

  // First check if it's a known European city - use 'european' type for perfect_life
  const europeanCities = [
    'london', 'paris', 'amsterdam', 'barcelona', 'madrid', 'rome', 'milan', 'florence',
    'venice', 'berlin', 'munich', 'vienna', 'prague', 'budapest', 'lisbon', 'porto',
    'dublin', 'edinburgh', 'copenhagen', 'stockholm', 'oslo', 'helsinki', 'zurich',
    'geneva', 'brussels', 'athens', 'nice', 'monaco', 'dubrovnik', 'krakow', 'warsaw'
  ];

  if (europeanCities.some(city => nameLower.includes(city))) {
    return 'european' as CityType;
  }

  // Tropical destinations
  const tropicalCities = [
    'honolulu', 'hawaii', 'cancun', 'puerto vallarta', 'cabo', 'bahamas', 'jamaica',
    'barbados', 'aruba', 'curacao', 'st. lucia', 'turks', 'caicos', 'bali', 'phuket',
    'maldives', 'fiji', 'tahiti', 'mauritius', 'seychelles', 'caribbean', 'key west'
  ];

  if (tropicalCities.some(city => nameLower.includes(city))) {
    return 'tropical' as CityType;
  }

  // Greek islands special case
  if (nameLower.includes('santorini') || nameLower.includes('mykonos') || nameLower.includes('crete')) {
    return 'beach' as CityType;
  }

  const keywords = {
    beach: [
      'beach', 'coast', 'ocean', 'shore', 'seaside', 'bay', 'harbor', 'pier',
      'miami', 'san diego', 'santa monica', 'malibu', 'tampa', 'clearwater',
      'fort lauderdale', 'naples', 'sarasota', 'jacksonville', 'virginia beach',
      'outer banks', 'hilton head', 'myrtle beach', 'galveston', 'corpus christi'
    ],
    mountain: [
      'mountain', 'alpine', 'ski', 'rocky', 'peak', 'summit', 'valley', 'highland',
      'denver', 'boulder', 'aspen', 'vail', 'park city', 'salt lake', 'telluride',
      'breckenridge', 'steamboat', 'jackson hole', 'big sky', 'lake tahoe', 'reno',
      'flagstaff', 'santa fe', 'taos', 'asheville', 'gatlinburg', 'pigeon forge'
    ],
    urban: [
      'downtown', 'metro', 'city center', 'skyline', 'metropolitan', 'midtown',
      'new york', 'chicago', 'los angeles', 'san francisco', 'seattle', 'boston',
      'philadelphia', 'washington', 'atlanta', 'dallas', 'houston', 'detroit',
      'minneapolis', 'st. louis', 'baltimore', 'cleveland', 'pittsburgh', 'charlotte'
    ],
    desert: [
      'desert', 'arid', 'southwest', 'canyon', 'mesa',
      'phoenix', 'vegas', 'tucson', 'scottsdale', 'albuquerque', 'sedona',
      'palm springs', 'joshua tree', 'death valley', 'moab', 'st. george'
    ],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => nameLower.includes(word))) {
      return type as CityType;
    }
  }

  return 'general';
}

function generateCacheKey(cityName: string, videoType: VideoType): string {
  const data = `${cityName.toLowerCase()}-${videoType}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

// ============================================================================
// VIDEO GENERATION - GROK PRIMARY
// ============================================================================

async function generateWithGrok(prompt: string): Promise<{ predictionId: string; status: string } | null> {
  const grokApiKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

  if (!grokApiKey) {
    console.log('[GROK-VIDEO] No Grok API key, skipping Grok provider');
    return null;
  }

  try {
    console.log('[GROK-VIDEO] Attempting Grok video generation...');

    const response = await fetch(`${GROK_API_URL}${GROK_VIDEO_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: 10, // 10 seconds
        style: 'cinematic',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[GROK-VIDEO] Grok API error:', response.status, errorText);
      return null; // Fall back to Replicate
    }

    const result = await response.json();
    console.log('[GROK-VIDEO] Grok generation started:', result.id);

    return {
      predictionId: result.id,
      status: result.status || 'processing',
    };
  } catch (error) {
    console.warn('[GROK-VIDEO] Grok generation failed:', error);
    return null; // Fall back to Replicate
  }
}

// ============================================================================
// VIDEO GENERATION - KLING AI (Primary - High Quality)
// ============================================================================

/**
 * Generate JWT token for Kling API authentication
 * Uses HS256 algorithm per Kling API docs
 */
function generateKlingJWT(): string | null {
  const accessKey = process.env.KLING_VIDEO_API_KEY;
  const secretKey = process.env.KLING_VIDEO_SECRET;

  if (!accessKey || !secretKey) {
    console.log('[KLING-VIDEO] No Kling API credentials configured');
    return null;
  }

  // JWT Header
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30 minutes validity
    nbf: now - 5     // Valid from 5 seconds ago
  };

  // Base64URL encode
  const base64UrlEncode = (obj: object): string => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);

  // Create signature using HMAC-SHA256
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Generate video using Kling AI API
 * Returns task_id for polling, or null if failed
 */
async function generateWithKling(prompt: string, durationSeconds: number = 10): Promise<{ predictionId: string; status: string } | null> {
  const token = generateKlingJWT();

  if (!token) {
    return null;
  }

  try {
    console.log('[KLING-VIDEO] Attempting Kling video generation...');

    const response = await fetch(`${KLING_API_URL}/v1/videos/text2video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model_name: KLING_MODEL,
        prompt: prompt.slice(0, 2500), // Max 2500 chars
        duration: String(durationSeconds <= 5 ? 5 : 10), // "5" or "10"
        aspect_ratio: '16:9',
        mode: 'std', // Standard mode (cost-effective)
        // Note: sound requires 'pro' mode on kling-v2-6; std mode does not support sound
        // See: Kling API error 1201 - "model/mode(kling-v2-6/std) is not supported with sound on"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[KLING-VIDEO] Kling API error:', response.status, errorText);
      return null; // Fall back to Replicate
    }

    const result = await response.json();

    if (result.code !== 0) {
      console.warn('[KLING-VIDEO] Kling API returned error:', result.code, result.message);
      return null;
    }

    console.log('[KLING-VIDEO] Kling generation started:', result.data.task_id);

    return {
      predictionId: result.data.task_id,
      status: result.data.task_status || 'submitted',
    };
  } catch (error) {
    console.warn('[KLING-VIDEO] Kling generation failed:', error);
    return null; // Fall back to Replicate
  }
}

// ============================================================================
// VIDEO GENERATION - REPLICATE FALLBACK
// ============================================================================

async function generateWithReplicate(prompt: string): Promise<{ predictionId: string; status: string }> {
  const replicateToken = process.env.REPLICATE_API_TOKEN;

  if (!replicateToken) {
    throw new Error('No video generation provider available (REPLICATE_API_TOKEN required)');
  }

  console.log('[GROK-VIDEO] Using Replicate Minimax Video-01 for text-to-video generation');

  // Use Minimax Video-01 - high quality text-to-video model
  // API: POST /models/{model}/predictions
  const response = await fetch(`${REPLICATE_API_URL}/models/${REPLICATE_VIDEO_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${replicateToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=5', // Wait up to 5 seconds for fast responses
    },
    body: JSON.stringify({
      input: {
        prompt: prompt.slice(0, 2000), // Minimax accepts up to 2000 chars
        prompt_optimizer: true, // Let Minimax enhance the prompt
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GROK-VIDEO] Replicate Minimax error:', response.status, errorText);
    throw new Error(`Replicate video generation failed: ${response.status} - ${errorText}`);
  }

  const prediction = await response.json();
  console.log('[GROK-VIDEO] Replicate Minimax prediction started:', prediction.id);

  return {
    predictionId: prediction.id,
    status: prediction.status || 'processing',
  };
}

// ============================================================================
// TIER ACCESS & USAGE TRACKING
// ============================================================================

interface TierLimits {
  grokVideos: number;
}

const TIER_LIMITS: Record<string, TierLimits> = {
  free: { grokVideos: 0 },       // No access
  pro: { grokVideos: 0 },        // No access (Sovereign only)
  enterprise: { grokVideos: -1 }, // Unlimited
};

/**
 * Get user's tier and check if they have grok video access
 */
async function checkUserTierAccess(userId: string): Promise<{
  allowed: boolean;
  tier: string;
  limit: number;
  used: number;
  remaining: number;
  reason?: string;
}> {
  try {
    // Get user profile to check tier AND email (for developer bypass)
    // FIX 2026-01-29: Use maybeSingle() to avoid "Cannot coerce" error
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tier, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      console.warn('[GROK-VIDEO] Could not fetch user profile:', profileError?.message);
      return {
        allowed: false,
        tier: 'free',
        limit: 0,
        used: 0,
        remaining: 0,
        reason: 'Could not verify user tier',
      };
    }

    // Developer bypass - grant enterprise (SOVEREIGN) access to specified emails
    // Check both env var list AND hardcoded fallback for reliability
    const userEmail = profile.email?.toLowerCase() || '';
    const isDeveloper = userEmail && (
      DEV_BYPASS_EMAILS.includes(userEmail) ||
      HARDCODED_BYPASS_EMAILS.includes(userEmail)
    );
    if (isDeveloper) {
      console.log('[GROK-VIDEO] 🔓 Developer bypass active for:', profile.email);
    }

    const tier = isDeveloper ? 'enterprise' : (profile.tier || 'free');
    const tierLimits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const limit = tierLimits.grokVideos;

    // If limit is 0, no access at this tier
    if (limit === 0) {
      return {
        allowed: false,
        tier,
        limit: 0,
        used: 0,
        remaining: 0,
        reason: `Grok videos require SOVEREIGN tier. Current tier: ${tier.toUpperCase()}`,
      };
    }

    // If limit is -1, unlimited access
    if (limit === -1) {
      return {
        allowed: true,
        tier,
        limit: -1,
        used: 0,
        remaining: -1,
      };
    }

    // Check current usage for this billing period
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // FIX 2026-01-29: Use maybeSingle() - usage record may not exist yet
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('usage_tracking')
      .select('grok_videos')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .maybeSingle();

    const used = usage?.grok_videos || 0;
    const remaining = limit - used;

    if (remaining <= 0) {
      return {
        allowed: false,
        tier,
        limit,
        used,
        remaining: 0,
        reason: `Grok video limit reached (${used}/${limit} this month)`,
      };
    }

    return {
      allowed: true,
      tier,
      limit,
      used,
      remaining,
    };
  } catch (err) {
    console.error('[GROK-VIDEO] Tier check error:', err);
    return {
      allowed: false,
      tier: 'free',
      limit: 0,
      used: 0,
      remaining: 0,
      reason: 'Error checking tier access',
    };
  }
}

/**
 * Increment grok_videos usage count (call only for NON-CACHED generations)
 * Count: 1 for new_life_videos pair, 1 for court_order_video
 */
async function incrementUsage(userId: string): Promise<boolean> {
  try {
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    // Check if record exists
    // FIX 2026-01-29: Use maybeSingle() - record may not exist yet
    const { data: existing } = await supabaseAdmin
      .from('usage_tracking')
      .select('id, grok_videos')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabaseAdmin
        .from('usage_tracking')
        .update({ grok_videos: (existing.grok_videos || 0) + 1 })
        .eq('id', existing.id);

      if (error) {
        console.error('[GROK-VIDEO] Usage update error:', error.message);
        return false;
      }
    } else {
      // Insert new record
      const { error } = await supabaseAdmin
        .from('usage_tracking')
        .insert({
          user_id: userId,
          period_start: periodStart,
          period_end: periodEnd,
          grok_videos: 1,
        });

      if (error) {
        console.error('[GROK-VIDEO] Usage insert error:', error.message);
        return false;
      }
    }

    console.log('[GROK-VIDEO] Usage incremented for user:', userId);
    return true;
  } catch (err) {
    console.error('[GROK-VIDEO] Usage increment failed:', err);
    return false;
  }
}

// ============================================================================
// DATABASE HELPERS
// ============================================================================

async function checkCache(cityName: string, videoType: VideoType): Promise<GrokVideoRecord | null> {
  const cacheKey = generateCacheKey(cityName, videoType);

  try {
    const { data, error } = await supabaseAdmin
      .from('grok_videos')
      .select('*')
      .eq('city_name', cityName.toLowerCase())
      .eq('video_type', videoType)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[GROK-VIDEO] Cache check error:', error.message);
      return null;
    }

    // Replicate delivery URLs expire after ~24h — only invalidate if actually old
    if (data?.video_url?.includes('replicate.delivery') && data.created_at) {
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
      if (ageMs > TWENTY_HOURS_MS) {
        console.log('[GROK-VIDEO] Cache hit has expired Replicate URL (age:', Math.round(ageMs / 3600000), 'h), marking failed');
        await supabaseAdmin
          .from('grok_videos')
          .update({ status: 'failed', error_message: 'Replicate URL expired (~24h)' })
          .eq('id', data.id);
        return null;
      }
      console.log('[GROK-VIDEO] Cache hit with fresh Replicate URL (age:', Math.round(ageMs / 3600000), 'h)');
    }

    // Skip cache entries with no video URL (incomplete records)
    if (data && !data.video_url) {
      console.log('[GROK-VIDEO] Cache hit has no video URL, forcing regeneration');
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[GROK-VIDEO] Cache check failed:', err);
    return null;
  }
}

async function checkProcessing(userId: string, comparisonId: string, videoType: VideoType, forceRegenerate: boolean = false): Promise<GrokVideoRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('grok_videos')
      .select('*')
      .eq('user_id', userId)
      .eq('comparison_id', comparisonId)
      .eq('video_type', videoType)
      .in('status', ['pending', 'processing'])
      .maybeSingle();

    if (error) {
      console.warn('[GROK-VIDEO] Processing check error:', error.message);
      return null;
    }

    if (!data) return null;

    // FIX: If force regenerate requested, mark any existing processing record as failed
    if (forceRegenerate) {
      console.log('[GROK-VIDEO] Force regenerate requested, marking existing record as failed:', data.id);
      await supabaseAdmin
        .from('grok_videos')
        .update({ status: 'failed', error_message: 'Superseded by force regeneration' })
        .eq('id', data.id);
      return null;
    }

    // FIX: Reduced stale timeout from 10 min to 3 min (dead generations)
    if (data.created_at) {
      const ageMs = Date.now() - new Date(data.created_at).getTime();
      if (ageMs > 3 * 60 * 1000) {
        console.log('[GROK-VIDEO] Stale processing record (', Math.round(ageMs / 60000), 'min old), marking failed');
        await supabaseAdmin
          .from('grok_videos')
          .update({ status: 'failed', error_message: 'Generation timed out (stale)' })
          .eq('id', data.id);
        return null;
      }
    }

    return data;
  } catch (err) {
    console.warn('[GROK-VIDEO] Processing check failed:', err);
    return null;
  }
}

async function insertVideoRecord(record: Partial<GrokVideoRecord>): Promise<GrokVideoRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('grok_videos')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.warn('[GROK-VIDEO] Insert error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[GROK-VIDEO] Insert failed:', err);
    return null;
  }
}

// ============================================================================
// VIDEO GENERATION ORCHESTRATION
// ============================================================================

async function generateSingleVideo(
  userId: string,
  comparisonId: string,
  cityName: string,
  videoType: VideoType,
  cityType: CityType,
  forceRegenerate: boolean = false
): Promise<{
  video: Partial<GrokVideoRecord>;
  cached: boolean;
  reused: boolean;
}> {
  // Check cache first (reuse across users for same city) - skip if forcing regeneration
  if (!forceRegenerate) {
    const cached = await checkCache(cityName, videoType);
    if (cached) {
      console.log('[GROK-VIDEO] Cache hit for:', cityName, videoType);
      return { video: cached, cached: true, reused: cached.user_id !== userId };
    }
  }

  // Check if already processing for this user (force flag will clear stale records)
  const processing = await checkProcessing(userId, comparisonId, videoType, forceRegenerate);
  if (processing) {
    console.log('[GROK-VIDEO] Already processing for:', cityName, videoType);
    return { video: processing, cached: false, reused: false };
  }

  // Generate prompt
  const prompt = generatePrompt(cityName, videoType, cityType);
  const durationSec = videoType === 'perfect_life' ? 10 : 8;

  // Try Kling first (high quality with sound), then Replicate fallback
  // Note: Grok video API doesn't exist publicly, so we skip it
  let result = await generateWithKling(prompt, durationSec);
  let provider = 'kling';

  if (!result) {
    console.log('[VIDEO] Kling unavailable (missing credentials or API error), trying Replicate...');

    try {
      result = await generateWithReplicate(prompt);
      provider = 'replicate';
    } catch (replicateError) {
      console.error('[VIDEO] Replicate also failed:', replicateError);
      throw new Error(`No video provider available. Kling: missing credentials. Replicate: ${replicateError instanceof Error ? replicateError.message : 'unknown error'}`);
    }
  }

  // Insert record
  const record = await insertVideoRecord({
    user_id: userId,
    comparison_id: comparisonId,
    city_name: cityName.toLowerCase(),
    video_type: videoType,
    prompt,
    video_url: null,
    thumbnail_url: null,
    duration_seconds: videoType === 'perfect_life' ? 10 : 8,
    status: 'processing',
    provider,
    error_message: null,
    prediction_id: result.predictionId,
    created_at: new Date().toISOString(),
    completed_at: null,
  });

  return {
    video: record || {
      id: result.predictionId,
      user_id: userId,
      comparison_id: comparisonId,
      city_name: cityName.toLowerCase(),
      video_type: videoType,
      prompt,
      status: 'processing',
      provider,
      prediction_id: result.predictionId,
      created_at: new Date().toISOString(),
    },
    cached: false,
    reused: false,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleCors(req, res, 'same-app')) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as GenerateRequest;

  if (!body.action || !body.userId || !body.comparisonId) {
    res.status(400).json({
      error: 'Missing required fields',
      required: ['action', 'userId', 'comparisonId'],
    });
    return;
  }

  try {
    // ========================================================================
    // TIER ACCESS CHECK (applies to all actions)
    // ========================================================================
    const tierAccess = await checkUserTierAccess(body.userId);

    if (!tierAccess.allowed) {
      console.log('[GROK-VIDEO] Access denied for user:', body.userId, tierAccess.reason);
      res.status(403).json({
        error: 'Access denied',
        reason: tierAccess.reason,
        tier: tierAccess.tier,
        limit: tierAccess.limit,
        used: tierAccess.used,
        remaining: tierAccess.remaining,
        upgradeRequired: true,
      });
      return;
    }

    console.log('[GROK-VIDEO] Access granted for user:', body.userId, 'tier:', tierAccess.tier);

    // ========================================================================
    // NEW LIFE VIDEOS (Winner + Loser pair)
    // ========================================================================
    if (body.action === 'new_life_videos') {
      const { winnerCity, loserCity, winnerCityType, loserCityType, forceRegenerate } = body as NewLifeVideosRequest;

      if (!winnerCity || !loserCity) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['winnerCity', 'loserCity'],
        });
        return;
      }

      console.log('[GROK-VIDEO] Generating New Life videos:', winnerCity, 'vs', loserCity, forceRegenerate ? '(FORCE REGEN)' : '');

      // Generate videos sequentially (loser first, then winner) to prevent Vercel 120s timeout
      // Parallel Promise.all was causing both Kling submissions to race the clock and timeout at ~73%
      const loserResult = await generateSingleVideo(
        body.userId,
        body.comparisonId,
        loserCity,
        'loser_mood',
        loserCityType || detectCityType(loserCity),
        !!forceRegenerate
      );

      const winnerResult = await generateSingleVideo(
        body.userId,
        body.comparisonId,
        winnerCity,
        'winner_mood',
        winnerCityType || detectCityType(winnerCity),
        !!forceRegenerate
      );

      // Increment usage: count 1 for the winner+loser pair (only if NOT fully cached)
      const fullyFromCache = winnerResult.cached && loserResult.cached;
      if (!fullyFromCache) {
        await incrementUsage(body.userId);
        console.log('[GROK-VIDEO] Usage counted: 1 for new_life_videos pair');
      } else {
        console.log('[GROK-VIDEO] No usage counted - fully cached');
      }

      res.status(200).json({
        success: true,
        cached: fullyFromCache,
        usageCounted: !fullyFromCache,
        videos: {
          winner: {
            id: winnerResult.video.id,
            userId: winnerResult.video.user_id,
            comparisonId: winnerResult.video.comparison_id,
            cityName: winnerResult.video.city_name,
            videoType: 'winner_mood',
            prompt: winnerResult.video.prompt,
            videoUrl: winnerResult.video.video_url,
            thumbnailUrl: winnerResult.video.thumbnail_url,
            durationSeconds: winnerResult.video.duration_seconds || 8,
            status: winnerResult.video.status,
            provider: winnerResult.video.provider,
            errorMessage: winnerResult.video.error_message,
            createdAt: winnerResult.video.created_at,
            completedAt: winnerResult.video.completed_at,
          },
          loser: {
            id: loserResult.video.id,
            userId: loserResult.video.user_id,
            comparisonId: loserResult.video.comparison_id,
            cityName: loserResult.video.city_name,
            videoType: 'loser_mood',
            prompt: loserResult.video.prompt,
            videoUrl: loserResult.video.video_url,
            thumbnailUrl: loserResult.video.thumbnail_url,
            durationSeconds: loserResult.video.duration_seconds || 8,
            status: loserResult.video.status,
            provider: loserResult.video.provider,
            errorMessage: loserResult.video.error_message,
            createdAt: loserResult.video.created_at,
            completedAt: loserResult.video.completed_at,
          },
        },
      });
      return;
    }

    // ========================================================================
    // COURT ORDER VIDEO (Perfect Life)
    // ========================================================================
    if (body.action === 'court_order_video') {
      const { winnerCity, cityType } = body as CourtOrderVideoRequest;

      if (!winnerCity) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['winnerCity'],
        });
        return;
      }

      console.log('[GROK-VIDEO] Generating Court Order video for:', winnerCity);

      const result = await generateSingleVideo(
        body.userId,
        body.comparisonId,
        winnerCity,
        'perfect_life',
        cityType || detectCityType(winnerCity)
      );

      // Increment usage: count 1 for court order (only if NOT cached)
      if (!result.cached) {
        await incrementUsage(body.userId);
        console.log('[GROK-VIDEO] Usage counted: 1 for court_order_video');
      } else {
        console.log('[GROK-VIDEO] No usage counted - cached');
      }

      res.status(200).json({
        success: true,
        cached: result.cached,
        usageCounted: !result.cached,
        video: {
          id: result.video.id,
          userId: result.video.user_id,
          comparisonId: result.video.comparison_id,
          cityName: result.video.city_name,
          videoType: 'perfect_life',
          prompt: result.video.prompt,
          videoUrl: result.video.video_url,
          thumbnailUrl: result.video.thumbnail_url,
          durationSeconds: result.video.duration_seconds || 10,
          status: result.video.status,
          provider: result.video.provider,
          errorMessage: result.video.error_message,
          createdAt: result.video.created_at,
          completedAt: result.video.completed_at,
        },
      });
      return;
    }

    // Unknown action
    res.status(400).json({
      error: 'Unknown action',
      validActions: ['new_life_videos', 'court_order_video'],
    });
  } catch (error) {
    console.error('[GROK-VIDEO] Error:', error);

    // Provide more specific error info for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isCredentialsError = errorMessage.includes('missing credentials') ||
                               errorMessage.includes('REPLICATE_API_TOKEN') ||
                               errorMessage.includes('No video provider');

    res.status(500).json({
      error: 'Failed to generate video',
      message: errorMessage,
      hint: isCredentialsError
        ? 'Video provider credentials not configured. Please add KLING_VIDEO_API_KEY + KLING_VIDEO_SECRET or REPLICATE_API_TOKEN to Vercel environment variables.'
        : 'Please try again or contact support.',
    });
  }
}
