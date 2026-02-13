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

export type ReportViewMode = 'read' | 'presenter';
