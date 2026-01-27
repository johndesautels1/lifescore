/**
 * LIFE SCORE - Grok Video Generation Types
 *
 * Types for Grok Imagine video generation (primary) and Replicate fallback.
 * Used for "See Your New Life" and "Court Order" video features.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

// ============================================================================
// VIDEO TYPE ENUMS
// ============================================================================

export type GrokVideoType = 'winner_mood' | 'loser_mood' | 'perfect_life';

export type GrokVideoStatus =
  | 'idle'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type CityType = 'beach' | 'mountain' | 'urban' | 'desert' | 'general';

export type VideoProvider = 'grok' | 'replicate';

// ============================================================================
// GROK VIDEO TYPES
// ============================================================================

export interface GrokVideo {
  id: string;
  userId: string;
  comparisonId: string;
  cityName: string;
  videoType: GrokVideoType;
  prompt: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  status: GrokVideoStatus;
  provider: VideoProvider;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface GrokVideoPair {
  winner: GrokVideo | null;
  loser: GrokVideo | null;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GenerateGrokVideoRequest {
  userId: string;
  comparisonId: string;
  cityName: string;
  videoType: GrokVideoType;
  cityType?: CityType;
  isWinner?: boolean;
  // For reuse - check if video exists for these cities
  city1Name?: string;
  city2Name?: string;
}

export interface GenerateGrokVideoResponse {
  success: boolean;
  video?: GrokVideo;
  cached?: boolean;
  reused?: boolean; // Video was reused from another user's generation
  error?: string;
}

export interface GrokVideoStatusRequest {
  videoId: string;
  predictionId?: string; // For Replicate fallback
}

export interface GrokVideoStatusResponse {
  success: boolean;
  video?: GrokVideo;
  error?: string;
}

export interface GenerateNewLifeVideosRequest {
  userId: string;
  comparisonId: string;
  winnerCity: string;
  loserCity: string;
  winnerCityType?: CityType;
  loserCityType?: CityType;
}

export interface GenerateNewLifeVideosResponse {
  success: boolean;
  videos?: GrokVideoPair;
  cached?: boolean;
  error?: string;
}

export interface GenerateCourtOrderVideoRequest {
  userId: string;
  comparisonId: string;
  winnerCity: string;
  cityType?: CityType;
}

export interface GenerateCourtOrderVideoResponse {
  success: boolean;
  video?: GrokVideo;
  cached?: boolean;
  error?: string;
}

// ============================================================================
// GROK API TYPES (Primary Provider)
// ============================================================================

export interface GrokVideoGenerateInput {
  prompt: string;
  duration?: number; // 6-15 seconds
  style?: 'cinematic' | 'realistic' | 'artistic';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
}

export interface GrokVideoGenerateResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  duration_seconds?: number;
  error?: string;
}

// ============================================================================
// REPLICATE FALLBACK TYPES
// ============================================================================

export interface ReplicateVideoInput {
  prompt: string;
  num_frames?: number;
  fps?: number;
  guidance_scale?: number;
  num_inference_steps?: number;
}

export interface ReplicateVideoPrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// CITY TYPE DETECTION
// ============================================================================

export interface CityTypeKeywords {
  beach: string[];
  mountain: string[];
  urban: string[];
  desert: string[];
}

export const CITY_TYPE_KEYWORDS: CityTypeKeywords = {
  beach: ['beach', 'coast', 'ocean', 'shore', 'tropical', 'island', 'bay', 'harbor', 'pier', 'seaside'],
  mountain: ['mountain', 'alpine', 'ski', 'elevation', 'rocky', 'peak', 'summit', 'valley', 'highland'],
  urban: ['downtown', 'metro', 'city center', 'skyline', 'metropolitan', 'urban', 'midtown'],
  desert: ['desert', 'arid', 'southwest', 'canyon', 'mesa', 'dry', 'phoenix', 'vegas', 'tucson'],
};

// ============================================================================
// VIDEO PROMPT TEMPLATES
// ============================================================================

export interface VideoPromptTemplates {
  winner_mood: string;
  loser_mood: string;
  perfect_life: {
    beach: string;
    mountain: string;
    urban: string;
    desert: string;
    general: string;
  };
}

export const VIDEO_PROMPT_TEMPLATES: VideoPromptTemplates = {
  winner_mood: `Happy person enjoying freedom in [CITY_NAME]. Sunny day, relaxed atmosphere, minimal government presence, people freely going about their business, vibrant local economy, low stress environment. 8 seconds, cinematic quality.`,

  loser_mood: `Stressed person in [CITY_NAME] overwhelmed by regulations. Government buildings, bureaucratic offices, long lines, paperwork piling up, frustrated citizens, heavy tax burden visible, restricted freedoms. 8 seconds, cinematic quality.`,

  perfect_life: {
    beach: `Crystal white sand beach at golden hour sunset, gentle waves crashing, palm trees swaying, person relaxing in paradise, [CITY_NAME] coastline, ultimate freedom and peace. 10 seconds, cinematic 4K quality.`,

    mountain: `Cozy cabin overlooking lush green valley and pristine lake, person enjoying hot chocolate on deck, snow-capped peaks in distance, [CITY_NAME] mountain serenity, fresh air and freedom. 10 seconds, cinematic 4K quality.`,

    urban: `Rooftop bar at sunset overlooking [CITY_NAME] skyline, person toasting to success, city lights beginning to glow, vibrant nightlife energy, cosmopolitan freedom and opportunity. 10 seconds, cinematic 4K quality.`,

    desert: `Desert sunset with dramatic red rock formations near [CITY_NAME], person on scenic overlook, wide open spaces, endless horizon, ultimate freedom and adventure. 10 seconds, cinematic 4K quality.`,

    general: `Beautiful scenic view of [CITY_NAME] at golden hour, person enjoying the moment of freedom and new beginnings, peaceful atmosphere, cinematic quality. 10 seconds.`,
  },
};

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseGrokVideoReturn {
  video: GrokVideo | null;
  videoPair: GrokVideoPair | null;
  status: GrokVideoStatus;
  isGenerating: boolean;
  isReady: boolean;
  progress: string;
  generateNewLifeVideos: (request: GenerateNewLifeVideosRequest) => Promise<void>;
  generateCourtOrderVideo: (request: GenerateCourtOrderVideoRequest) => Promise<void>;
  checkStatus: (videoId: string) => Promise<void>;
  reset: () => void;
  error: string | null;
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface GrokVideoRecord {
  id: string;
  user_id: string;
  comparison_id: string;
  city_name: string;
  video_type: GrokVideoType;
  prompt: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  status: GrokVideoStatus;
  provider: VideoProvider;
  error_message: string | null;
  prediction_id: string | null; // For Replicate fallback
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// UTILITY FUNCTIONS (Type Guards)
// ============================================================================

export function isGrokVideoComplete(video: GrokVideo | null): video is GrokVideo & { videoUrl: string } {
  return video !== null && video.status === 'completed' && !!video.videoUrl;
}

export function isGrokVideoPairComplete(pair: GrokVideoPair | null): boolean {
  return pair !== null && isGrokVideoComplete(pair.winner) && isGrokVideoComplete(pair.loser);
}
