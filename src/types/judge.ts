/**
 * LIFE SCORE - Judge Pre-generation Types
 *
 * Shared types for background Judge Report and Video pre-generation.
 * Used by judgePregenService.ts, JudgeTab.tsx, and related hooks.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

// ============================================================================
// PRE-GENERATION STATUS TYPES
// ============================================================================

export type PregenReportStatus = 'idle' | 'generating' | 'ready' | 'error';
export type PregenVideoStatus = 'idle' | 'generating' | 'ready' | 'error';

export interface PregenStatus {
  reportStatus: PregenReportStatus;
  videoStatus: PregenVideoStatus;
  reportId?: string;
  videoUrl?: string;
  error?: string;
}

// ============================================================================
// DATABASE RECORD TYPES (matching Supabase tables)
// ============================================================================

export interface JudgeReportRecord {
  id: string;
  user_id: string | null;
  report_id: string;
  city1: string;
  city2: string;
  city1_score: number | null;
  city1_trend: string | null;
  city2_score: number | null;
  city2_trend: string | null;
  winner: string | null;
  winner_score: number | null;
  margin: number | null;
  key_findings: unknown[] | null;
  category_analysis: unknown[] | null;
  verdict: string | null;
  full_report: Record<string, unknown> | null;
  video_id: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvatarVideoRecord {
  id: string;
  comparison_id: string;
  video_url: string;
  audio_url?: string;
  script: string;
  city1: string;
  city2: string;
  winner: string;
  winner_score?: number;
  loser_score?: number;
  replicate_prediction_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  duration_seconds?: number;
  created_at: string;
  completed_at?: string;
  error?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CheckReportStatusRequest {
  comparisonId: string;
}

export interface CheckReportStatusResponse {
  exists: boolean;
  status: PregenReportStatus;
  report?: JudgeReportRecord;
  error?: string;
}

export interface CheckVideoStatusRequest {
  comparisonId: string;
}

export interface CheckVideoStatusResponse {
  exists: boolean;
  status: PregenVideoStatus;
  video?: AvatarVideoRecord;
  error?: string;
}

// ============================================================================
// PRE-GENERATION TRIGGER TYPES
// ============================================================================

export interface PregenTriggerData {
  comparisonId: string;
  city1: string;
  city2: string;
  city1Country: string;
  city2Country: string;
  city1Score: number;
  city2Score: number;
  winner: 'city1' | 'city2' | 'tie';
  userId: string;
}

export interface PregenReportRequest {
  comparisonResult: unknown; // EnhancedComparisonResult or ComparisonResult
  userId: string;
}

export interface PregenVideoRequest {
  comparisonId: string;
  script: string;
  city1: string;
  city2: string;
  winner: string;
  winnerScore: number;
  loserScore: number;
}
