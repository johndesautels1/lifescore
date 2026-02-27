/**
 * LIFE SCORE Database Types - Jobs & Notifications
 * Clues Intelligence LTD © 2025
 */

// ============================================================================
// JOBS (Fire-and-Forget Notification System)
// ============================================================================

export type JobType = 'comparison' | 'judge_verdict' | 'court_order' | 'gamma_report' | 'freedom_tour';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'notified' | 'failed';
export type NotifyChannel = 'email' | 'sms' | 'in_app';

export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  notify_via: NotifyChannel[];
  notified_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobInsert {
  user_id: string;
  type: JobType;
  status?: JobStatus;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  notify_via?: NotifyChannel[];
  error_message?: string | null;
}

export interface JobUpdate {
  status?: JobStatus;
  result?: Record<string, unknown> | null;
  notify_via?: NotifyChannel[];
  notified_at?: string | null;
  error_message?: string | null;
}

// ============================================================================
// NOTIFICATIONS (In-App Bell + Email Records)
// ============================================================================

export type NotificationType = 'email' | 'sms' | 'in_app';

export interface Notification {
  id: string;
  user_id: string;
  job_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  job_id?: string | null;
  type?: NotificationType;
  title: string;
  message?: string | null;
  read?: boolean;
  link?: string | null;
}

export interface NotificationUpdate {
  read?: boolean;
}
