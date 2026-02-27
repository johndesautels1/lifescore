/**
 * LIFE SCORE Database Types - Reports
 * Clues Intelligence LTD © 2025
 *
 * Report storage, sharing, and access logging
 */

// ============================================================================
// REPORTS STORAGE (Session 16 - Database Architecture Upgrade)
// ============================================================================

export type ReportType = 'standard' | 'enhanced';
export type ReportStatus = 'generating' | 'completed' | 'failed';
export type ReportAccessType = 'view' | 'download' | 'share' | 'embed';

export interface Report {
  id: string;
  user_id: string;
  report_type: ReportType;
  version: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  score_difference: number;
  gamma_doc_id: string | null;
  gamma_url: string | null;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  pptx_storage_path: string | null;
  html_storage_path: string | null;
  status: ReportStatus;
  generation_started_at: string;
  generation_completed_at: string | null;
  generation_duration_seconds: number | null;
  page_count: number | null;
  total_metrics: number;
  llm_consensus_confidence: number | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface ReportInsert {
  user_id: string;
  report_type?: ReportType;
  version?: string;
  city1_name: string;
  city1_country: string;
  city2_name: string;
  city2_country: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  score_difference: number;
  gamma_doc_id?: string | null;
  gamma_url?: string | null;
  pdf_url?: string | null;
  pdf_storage_path?: string | null;
  pptx_storage_path?: string | null;
  html_storage_path?: string | null;
  status?: ReportStatus;
  generation_duration_seconds?: number | null;
  page_count?: number | null;
  llm_consensus_confidence?: number | null;
}

export interface ReportUpdate {
  report_type?: ReportType;
  version?: string;
  gamma_doc_id?: string | null;
  gamma_url?: string | null;
  pdf_url?: string | null;
  pdf_storage_path?: string | null;
  pptx_storage_path?: string | null;
  html_storage_path?: string | null;
  status?: ReportStatus;
  generation_completed_at?: string | null;
  generation_duration_seconds?: number | null;
  page_count?: number | null;
  llm_consensus_confidence?: number | null;
}

export interface ReportAccessLog {
  id: string;
  report_id: string;
  user_id: string | null;
  accessed_at: string;
  access_type: ReportAccessType;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  share_token: string | null;
}

export interface ReportAccessLogInsert {
  report_id: string;
  user_id?: string | null;
  access_type: ReportAccessType;
  ip_address?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  share_token?: string | null;
}

export interface ReportShare {
  id: string;
  report_id: string;
  shared_by: string;
  share_token: string;
  expires_at: string | null;
  max_views: number | null;
  view_count: number;
  requires_email: boolean;
  allowed_emails: string[] | null;
  password_hash: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

export interface ReportShareInsert {
  report_id: string;
  shared_by: string;
  share_token: string;
  expires_at?: string | null;
  max_views?: number | null;
  requires_email?: boolean;
  allowed_emails?: string[] | null;
  password_hash?: string | null;
}

export interface ReportShareUpdate {
  expires_at?: string | null;
  max_views?: number | null;
  view_count?: number;
  requires_email?: boolean;
  allowed_emails?: string[] | null;
  password_hash?: string | null;
  last_accessed_at?: string | null;
}

/**
 * Report with HTML content loaded from storage
 */
export interface ReportWithHtml extends Report {
  html: string;
}

/**
 * Summary for user's report dashboard
 */
export interface ReportSummary {
  id: string;
  report_type: ReportType;
  city1_name: string;
  city2_name: string;
  winner: string;
  winner_score: number;
  loser_score: number;
  page_count: number | null;
  created_at: string;
  status: ReportStatus;
}
