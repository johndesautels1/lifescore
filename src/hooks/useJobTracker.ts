/**
 * LIFE SCORE - useJobTracker Hook
 * Creates and tracks jobs in the Supabase jobs table.
 * Used by trigger components to create fire-and-forget jobs.
 *
 * Clues Intelligence LTD
 */

import { useCallback } from 'react';
import { supabase, isSupabaseConfigured, getAuthHeaders } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { JobType, NotifyChannel } from '../types/database';

export interface CreateJobParams {
  type: JobType;
  payload: Record<string, unknown>;
  notifyVia: NotifyChannel[];
}

export interface UseJobTrackerReturn {
  createJob: (params: CreateJobParams) => Promise<string | null>;
  updateJobStatus: (jobId: string, status: string, result?: Record<string, unknown>, errorMessage?: string) => Promise<void>;
  completeJobAndNotify: (jobId: string, result: Record<string, unknown>, title: string, message: string, link?: string) => Promise<void>;
}

export function useJobTracker(): UseJobTrackerReturn {
  const { user } = useAuth();

  /**
   * Insert a new job row into the jobs table.
   * Returns the job ID or null on failure.
   */
  const createJob = useCallback(async (params: CreateJobParams): Promise<string | null> => {
    if (!user?.id || !isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          type: params.type,
          status: 'queued',
          payload: params.payload,
          notify_via: params.notifyVia,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[JobTracker] Create error:', error.message);
        return null;
      }

      console.log('[JobTracker] Job created:', data.id, params.type);
      return data.id;
    } catch (err) {
      console.error('[JobTracker] Create exception:', err);
      return null;
    }
  }, [user?.id]);

  /**
   * Update a job's status (called from API endpoints or client-side polling).
   */
  const updateJobStatus = useCallback(async (
    jobId: string,
    status: string,
    result?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<void> => {
    if (!user?.id || !isSupabaseConfigured()) return;

    try {
      const update: Record<string, unknown> = { status };
      if (result) update.result = result;
      if (errorMessage) update.error_message = errorMessage;

      const { error } = await supabase
        .from('jobs')
        .update(update)
        .eq('id', jobId)
        .eq('user_id', user.id);

      if (error) {
        console.error('[JobTracker] Update error:', error.message);
      }
    } catch (err) {
      console.error('[JobTracker] Update exception:', err);
    }
  }, [user?.id]);

  /**
   * Mark a job as completed and fire the notify endpoint.
   * This is called from the client when a long-running task finishes.
   */
  const completeJobAndNotify = useCallback(async (
    jobId: string,
    result: Record<string, unknown>,
    title: string,
    message: string,
    link?: string
  ): Promise<void> => {
    if (!user?.id || !isSupabaseConfigured()) return;

    try {
      // 1. Update job to completed
      const { data: jobData } = await supabase
        .from('jobs')
        .update({ status: 'completed', result })
        .eq('id', jobId)
        .eq('user_id', user.id)
        .select('notify_via')
        .single();

      const channels = jobData?.notify_via || ['in_app'];

      // 2. Call /api/notify to send notifications
      const authHeaders = await getAuthHeaders();
      await fetch('/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          jobId,
          userId: user.id,
          title,
          message,
          link,
          channels,
          email: user.email,
        }),
      });

      console.log('[JobTracker] Job completed + notified:', jobId);
    } catch (err) {
      console.error('[JobTracker] completeJobAndNotify exception:', err);
    }
  }, [user?.id, user?.email]);

  return { createJob, updateJobStatus, completeJobAndNotify };
}
