/**
 * LIFE SCORE Database Types - Feature Tables
 * Clues Intelligence LTD © 2025
 *
 * Consent, Avatar, Judge, Quota, Contrast, Prompts, InVideo, Manual Access
 */

// ============================================================================
// CONSENT LOGS (GDPR)
// ============================================================================

export interface ConsentLog {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  consent_type: string;
  consent_action: 'granted' | 'denied' | 'withdrawn';
  consent_categories: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  page_url: string | null;
  policy_version: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ConsentLogInsert {
  user_id?: string | null;
  anonymous_id?: string | null;
  consent_type: string;
  consent_action: 'granted' | 'denied' | 'withdrawn';
  consent_categories?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  page_url?: string | null;
  policy_version?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

// ============================================================================
// AVATAR VIDEOS
// ============================================================================

export interface AvatarVideo {
  id: string;
  comparison_id: string;
  city1: string;
  city2: string;
  winner: string;
  winner_score: number | null;
  loser_score: number | null;
  script: string;
  audio_url: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  replicate_prediction_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// JUDGE REPORTS (DB TABLE — distinct from frontend JudgeReport interface)
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

// ============================================================================
// API QUOTA SETTINGS
// ============================================================================

export type QuotaType = 'dollars' | 'tokens' | 'characters' | 'credits' | 'requests' | 'seconds';
export type AlertLevel = 'yellow' | 'orange' | 'red' | 'exceeded';

export interface ApiQuotaSetting {
  id: string;
  provider_key: string;
  display_name: string;
  icon: string | null;
  quota_type: QuotaType;
  monthly_limit: number;
  warning_yellow: number;
  warning_orange: number;
  warning_red: number;
  current_usage: number;
  usage_month: string;
  alerts_enabled: boolean;
  last_alert_level: AlertLevel | null;
  last_alert_sent_at: string | null;
  fallback_provider_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONTRAST IMAGE CACHE
// ============================================================================

export interface ContrastImageCache {
  id: string;
  cache_key: string;
  city_a_url: string | null;
  city_a_caption: string | null;
  city_b_url: string | null;
  city_b_caption: string | null;
  topic: string | null;
  created_at: string;
  expires_at: string;
}

// ============================================================================
// APP PROMPTS
// ============================================================================

export interface AppPrompt {
  id: string;
  category: string;
  prompt_key: string;
  display_name: string;
  prompt_text: string;
  description: string | null;
  version: number;
  last_edited_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INVIDEO OVERRIDES
// ============================================================================

export interface InVideoOverride {
  id: string;
  comparison_id: string | null;
  city_name: string;
  video_url: string;
  video_title: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  uploaded_by: string | null;
  is_active: boolean;
  generation_prompt: string | null;
  source: 'manual' | 'api';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// AUTHORIZED MANUAL ACCESS
// ============================================================================

export interface AuthorizedManualAccess {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  added_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
