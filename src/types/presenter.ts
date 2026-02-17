/**
 * LIFE SCORE™ Report Presenter Types
 * Type definitions for the Olivia video presenter feature
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

// ============================================================================
// PRESENTER SEGMENT
// ============================================================================

/**
 * A single narration segment for Olivia to present
 */
export interface PresenterSegment {
  id: string;
  title: string;                 // Display title (e.g. "Overall Winner")
  narration: string;             // Text Olivia will speak
  durationEstimateMs: number;    // Rough estimate for progress tracking
  category: 'intro' | 'winner' | 'category' | 'highlights' | 'consensus' | 'conclusion';
}

/**
 * Full presentation script
 */
export interface PresentationScript {
  segments: PresenterSegment[];
  totalDurationEstimateMs: number;
  city1: string;
  city2: string;
  isEnhanced: boolean;
}

// ============================================================================
// PRESENTER STATE
// ============================================================================

export type PresenterStatus =
  | 'idle'           // Not started
  | 'loading'        // Building script / connecting avatar
  | 'presenting'     // Olivia is speaking
  | 'paused'         // User paused
  | 'segment-break'  // Between segments
  | 'completed'      // All segments done
  | 'error';         // Something went wrong

export interface PresenterState {
  status: PresenterStatus;
  currentSegmentIndex: number;
  segments: PresenterSegment[];
  error?: string;
  avatarConnected: boolean;
  ttsOnly: boolean;              // Fallback: audio-only if avatar fails
}

// ============================================================================
// PRESENTER VIEW MODE
// ============================================================================

export type ReportViewMode = 'read' | 'live' | 'video';

// ============================================================================
// VIDEO GENERATION (Pre-rendered HeyGen video)
// ============================================================================

export type VideoGenerationStatus =
  | 'idle'
  | 'generating'      // Submitted to HeyGen, waiting
  | 'processing'      // HeyGen is rendering
  | 'completed'       // Video ready
  | 'failed';

export interface VideoGenerationState {
  status: VideoGenerationStatus;
  videoId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  progress: number;       // 0-100 estimated
  error?: string;
}

/**
 * HeyGen video generate request (sent to our API proxy)
 */
export interface HeyGenVideoRequest {
  action: 'generate' | 'status';
  videoId?: string;       // For status checks
  script?: string;        // Full narration script
  avatarId?: string;      // Override default avatar
  voiceId?: string;       // Override default voice
  title?: string;         // Video title for metadata
}

/**
 * HeyGen video generate response (from our API proxy)
 */
export interface HeyGenVideoResponse {
  videoId?: string;
  status: VideoGenerationStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  error?: string;
}
